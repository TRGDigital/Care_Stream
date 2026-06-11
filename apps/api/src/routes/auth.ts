import { Router, Request, Response } from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { prisma } from '../db/client'
import { hashPassword, verifyPassword } from '../services/auth/password'
import { generateAccessToken, verifyAccessToken } from '../services/auth/tokens'
import { issueRefreshToken, rotateRefreshToken } from '../lib/refresh-tokens'
import { writeAuditLog } from '../lib/audit'
import { ok, err } from '../lib/response'
import { siteUrl } from '../lib/urls'
import { authLimiter } from '../middleware/rateLimiter'
import { isAccountLocked } from '../middleware/auth'
import { seedTenantKnowledge } from '../services/knowledge/seeder'
import { sendVerificationEmail, sendPasswordResetEmail, sendStaffLoginLinkEmail, sendNewTenantNotification } from '../services/email/outbound'
import { createLoginLink, consumeLoginToken, mintLoginToken } from '../lib/login-tokens'

const VERIFICATION_EXPIRY_MS = 24 * 60 * 60 * 1000 // 24 hours
const AUTO_LOGIN_TTL_MS      = 15 * 60 * 1000       // verify-email auto-login token: 15 min

function generateVerificationToken(): string {
  return crypto.randomBytes(32).toString('hex')
}

export const authRouter = Router()

// All auth routes get the tighter rate limit (10 req/min per §11.1)
authRouter.use(authLimiter)

// ─── Slug generation ─────────────────────────────────────────────────────────

async function generateUniqueSlug(orgName: string): Promise<string> {
  const base = orgName
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .slice(0, 48)

  // Check for uniqueness; append counter if taken
  let slug = base
  let counter = 1
  while (await (prisma as any).tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${counter}`
    counter++
  }
  return slug
}

// ─── POST /auth/register ─────────────────────────────────────────────────────
// §3.2 — Creates a new tenant + admin user in a single transaction.
// Sets subscription_status to 'trialling'. Pinecone namespace provisioning
// is queued asynchronously (handled when first policy is uploaded in v1).

const RegisterSchema = z.object({
  org_name:  z.string().min(2).max(100),
  name:      z.string().min(1).max(100),
  email:     z.string().email(),
  password:  z.string().min(8),
  plan_id:   z.string().uuid().optional(),
})

authRouter.post('/register', async (req: Request, res: Response) => {
  const parsed = RegisterSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { org_name, name, email, password, plan_id } = parsed.data

  // Check email not already in use
  const existing = await (prisma as any).user.findUnique({ where: { email } })
  if (existing) {
    err(res, 'EMAIL_IN_USE', 'An account with this email address already exists.', 409)
    return
  }

  const verificationToken   = generateVerificationToken()
  const verificationExpires = new Date(Date.now() + VERIFICATION_EXPIRY_MS)

  const [slug, password_hash] = await Promise.all([
    generateUniqueSlug(org_name),
    hashPassword(password),
  ])

  // Create tenant + admin user atomically
  const { tenant, user } = await (prisma as any).$transaction(async (tx: any) => {
    const tenant = await tx.tenant.create({
      data: {
        name: org_name,
        slug,
        email_domain: slug,
        subscription_status: 'trialling',
        plan_id: plan_id ?? null,
        branding_signoff: 'The CareStream Team',
      },
    })

    const user = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        email,
        name,
        role: 'admin',
        password_hash,
        email_verified:                false,
        verification_token:             verificationToken,
        verification_token_expires_at:  verificationExpires,
      },
    })

    return { tenant, user }
  })

  await writeAuditLog({
    tenant_id: tenant.id,
    user_id: user.id,
    event_type: 'tenant_registered',
    entity_type: 'tenant',
    entity_id: tenant.id,
    metadata: { org_name, slug, plan_id: plan_id ?? null },
  })

  // Send verification email — awaited so it completes before the serverless function exits
  const webUrl = siteUrl()
  const verificationUrl = `${webUrl}/verify-email?token=${verificationToken}`
  try {
    await sendVerificationEmail(email, name, verificationUrl)
  } catch (e) {
    console.error('[register] Failed to send verification email:', e)
  }

  // Notify the platform owner of the new account.
  try {
    const plan = plan_id ? await (prisma as any).plan.findUnique({ where: { id: plan_id }, select: { name: true } }).catch(() => null) : null
    await sendNewTenantNotification({
      orgName: tenant.name, adminName: name, adminEmail: email,
      accountNumber: tenant.account_number, slug: tenant.slug, planName: plan?.name ?? null,
    })
  } catch (e) {
    console.error('[register] new-account notification failed:', e)
  }

  ok(res, { email_verification_required: true, email }, 201)
})

// ─── POST /auth/login ─────────────────────────────────────────────────────────
// §11.1 — Verifies credentials, issues JWT pair.
// Brute-force protection: increments failed_login_attempts; locks after 5.
// Lockout duration: 30 minutes.

const LoginSchema = z.object({
  email:    z.string().email(),
  password: z.string().min(1),
})

const LOCKOUT_THRESHOLD = 5
const LOCKOUT_DURATION_MS = 30 * 60 * 1000

authRouter.post('/login', async (req: Request, res: Response) => {
  const parsed = LoginSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { email, password } = parsed.data

  const user = await (prisma as any).user.findUnique({
    where: { email },
    include: { tenant: { select: { id: true, name: true, slug: true, subscription_status: true, stripe_subscription_id: true } } },
  })

  // Return generic message — do not reveal whether the email exists
  if (!user) {
    err(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    return
  }

  if (user.is_active === false) {
    err(res, 'ACCOUNT_DEACTIVATED', 'This account has been deactivated. Please contact your administrator.', 403)
    return
  }

  if (!user.email_verified) {
    err(res, 'EMAIL_NOT_VERIFIED', 'Please verify your email address before signing in. Check your inbox for a verification link.', 403)
    return
  }

  if (isAccountLocked(user.locked_until)) {
    await writeAuditLog({
      tenant_id: user.tenant_id,
      user_id: user.id,
      event_type: 'login_failed',
      entity_type: 'user',
      entity_id: user.id,
      metadata: { reason: 'account_locked', email },
    })
    err(res, 'ACCOUNT_LOCKED', 'Account is temporarily locked due to too many failed attempts. Please try again later.', 403)
    return
  }

  const passwordValid = await verifyPassword(password, user.password_hash)

  if (!passwordValid) {
    const attempts = user.failed_login_attempts + 1
    const shouldLock = attempts >= LOCKOUT_THRESHOLD

    await (prisma as any).user.update({
      where: { id: user.id },
      data: {
        failed_login_attempts: attempts,
        locked_until: shouldLock ? new Date(Date.now() + LOCKOUT_DURATION_MS) : null,
      },
    })

    await writeAuditLog({
      tenant_id: user.tenant_id,
      user_id: user.id,
      event_type: shouldLock ? 'account_locked' : 'login_failed',
      entity_type: 'user',
      entity_id: user.id,
      metadata: { attempt: attempts, locked: shouldLock },
    })

    if (shouldLock) {
      err(res, 'ACCOUNT_LOCKED', 'Too many failed attempts. Account locked for 30 minutes.', 403)
    } else {
      err(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401)
    }
    return
  }

  // Success — reset failure counters and record login timestamps
  const now = new Date()
  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      locked_until:          null,
      last_login_at:         now,
      // first_login_at is written once and never overwritten
      ...(user.first_login_at ? {} : { first_login_at: now }),
    },
  })

  await writeAuditLog({
    tenant_id: user.tenant_id,
    user_id: user.id,
    event_type: 'login',
    entity_type: 'user',
    entity_id: user.id,
  })

  const accessToken  = generateAccessToken({ sub: user.id, tenant_id: user.tenant_id, role: user.role })
  const refreshToken = await issueRefreshToken(user.id)

  ok(res, {
    access_token:  accessToken,
    refresh_token: refreshToken,
    user: {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      tenant_id: user.tenant_id,
    },
    tenant: {
      id:                  user.tenant.id,
      name:                user.tenant.name,
      slug:                user.tenant.slug,
      subscription_status: user.tenant.subscription_status,
    },
  })
})

// Shared success path — record login, audit, issue tokens, respond. `user` must
// include its `tenant` relation. Reused by password login and magic-link sign-in.
async function respondWithSession(res: Response, user: any): Promise<void> {
  const now = new Date()
  await (prisma as any).user.update({
    where: { id: user.id },
    data:  { failed_login_attempts: 0, locked_until: null, last_login_at: now, ...(user.first_login_at ? {} : { first_login_at: now }) },
  })
  await writeAuditLog({ tenant_id: user.tenant_id, user_id: user.id, event_type: 'login', entity_type: 'user', entity_id: user.id })
  // Hard gate for the card-up-front trial: a tenant that hasn't started a Stripe
  // subscription yet (and isn't already active) must add a card before using the app.
  const needsBilling = user.tenant.subscription_status !== 'active' && !user.tenant.stripe_subscription_id
  // "Staff + Audits": this member can conduct audits in the hub.
  const auditAccess = user.role === 'admin' || (Array.isArray(user.audit_template_ids) && user.audit_template_ids.length > 0)
  ok(res, {
    access_token:  generateAccessToken({ sub: user.id, tenant_id: user.tenant_id, role: user.role }),
    refresh_token: await issueRefreshToken(user.id),
    needs_billing: needsBilling,
    audit_access:  auditAccess,
    user:   { id: user.id, name: user.name, email: user.email, role: user.role, tenant_id: user.tenant_id },
    tenant: { id: user.tenant.id, name: user.tenant.name, slug: user.tenant.slug, subscription_status: user.tenant.subscription_status },
  })
}

// ─── POST /auth/magic-link/request ───────────────────────────────────────────
// Staff-initiated: "email me a sign-in link". Always responds success (no email
// enumeration); only sends when the email maps to an active account.
const MAGIC_REQUEST_TTL_MIN = 30
authRouter.post('/magic-link/request', async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!email) { err(res, 'INVALID', 'Email is required', 400); return }
  try {
    const user = await (prisma as any).user.findUnique({ where: { email }, select: { id: true, tenant_id: true, is_active: true, email: true, name: true } })
    if (user && user.is_active !== false) {
      const link = await createLoginLink(user.id, user.tenant_id, MAGIC_REQUEST_TTL_MIN * 60_000)
      await sendStaffLoginLinkEmail({ to: user.email, name: user.name, link, expiresMins: MAGIC_REQUEST_TTL_MIN }).catch(e => console.error('[magic/request] email', e))
    }
  } catch (e) { console.error('[magic/request]', e) }
  ok(res, { sent: true })
})

// ─── POST /auth/magic-link/verify ─────────────────────────────────────────────
// Consume a sign-in token (from a magic link or QR) and start a session.
authRouter.post('/magic-link/verify', async (req: Request, res: Response) => {
  const token = String(req.body?.token ?? '')
  const consumed = await consumeLoginToken(token)
  if (!consumed) { err(res, 'INVALID_TOKEN', 'This sign-in link is invalid or has expired.', 401); return }
  const user = await (prisma as any).user.findUnique({
    where:   { id: consumed.user_id },
    include: { tenant: { select: { id: true, name: true, slug: true, subscription_status: true, stripe_subscription_id: true } } },
  })
  if (!user || user.is_active === false) { err(res, 'INVALID_TOKEN', 'This sign-in link is no longer valid.', 401); return }
  await respondWithSession(res, user)
})

// ─── GET /auth/verify-email?token=xxx ────────────────────────────────────────

authRouter.get('/verify-email', async (req: Request, res: Response) => {
  const token = req.query.token as string | undefined
  if (!token) {
    err(res, 'VALIDATION_ERROR', 'Verification token is required.')
    return
  }

  const user = await (prisma as any).user.findFirst({
    where: { verification_token: token },
  })

  if (!user) {
    err(res, 'INVALID_TOKEN', 'Verification link is invalid or has already been used.', 400)
    return
  }

  if (user.email_verified) {
    ok(res, { already_verified: true })
    return
  }

  if (user.verification_token_expires_at && new Date() > new Date(user.verification_token_expires_at)) {
    err(res, 'TOKEN_EXPIRED', 'Verification link has expired. Please request a new one.', 400)
    return
  }

  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      email_verified:                true,
      verification_token:             null,
      verification_token_expires_at:  null,
    },
  })

  // Mint a short-lived one-time login token so the web app can log the user straight
  // in (no separate password step). Consumed via POST /auth/magic-link/verify.
  const loginToken = await mintLoginToken(user.id, user.tenant_id, AUTO_LOGIN_TTL_MS)
  ok(res, { verified: true, login_token: loginToken })
})

// ─── POST /auth/resend-verification ──────────────────────────────────────────

authRouter.post('/resend-verification', async (req: Request, res: Response) => {
  const { email } = req.body ?? {}
  if (!email) {
    err(res, 'VALIDATION_ERROR', 'Email address is required.')
    return
  }

  const user = await (prisma as any).user.findUnique({ where: { email } })

  // Return success even if user not found — prevents email enumeration
  if (!user || user.email_verified) {
    ok(res, { sent: true })
    return
  }

  const token   = generateVerificationToken()
  const expires = new Date(Date.now() + VERIFICATION_EXPIRY_MS)

  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      verification_token:            token,
      verification_token_expires_at: expires,
    },
  })

  const webUrl = siteUrl()
  const verificationUrl = `${webUrl}/verify-email?token=${token}`
  try {
    await sendVerificationEmail(email, user.name, verificationUrl)
  } catch (e) {
    console.error('[resend-verification] Failed to send email:', e)
  }

  ok(res, { sent: true })
})

// ─── POST /auth/forgot-password ──────────────────────────────────────────────

authRouter.post('/forgot-password', async (req: Request, res: Response) => {
  const { email } = req.body ?? {}
  if (!email) {
    err(res, 'VALIDATION_ERROR', 'Email address is required.')
    return
  }

  const user = await (prisma as any).user.findUnique({ where: { email } })

  // Always return success — prevents email enumeration
  if (!user) {
    ok(res, { sent: true })
    return
  }

  const token   = generateVerificationToken()
  const expires = new Date(Date.now() + 60 * 60 * 1000) // 1 hour

  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      password_reset_token:            token,
      password_reset_token_expires_at: expires,
    },
  })

  const webUrl = siteUrl()
  const resetUrl = `${webUrl}/reset-password?token=${token}`

  try {
    await sendPasswordResetEmail(email, user.name, resetUrl)
  } catch (e) {
    console.error('[forgot-password] Failed to send email:', e)
  }

  ok(res, { sent: true })
})

// ─── POST /auth/reset-password ────────────────────────────────────────────────

const ResetPasswordSchema = z.object({
  token:    z.string().min(1),
  password: z.string().min(8),
})

authRouter.post('/reset-password', async (req: Request, res: Response) => {
  const parsed = ResetPasswordSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { token, password } = parsed.data

  const user = await (prisma as any).user.findFirst({
    where: { password_reset_token: token },
  })

  if (!user) {
    err(res, 'INVALID_TOKEN', 'Reset link is invalid or has already been used.', 400)
    return
  }

  if (user.password_reset_token_expires_at && new Date() > new Date(user.password_reset_token_expires_at)) {
    err(res, 'TOKEN_EXPIRED', 'Reset link has expired. Please request a new one.', 400)
    return
  }

  const password_hash = await hashPassword(password)

  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      password_hash,
      password_reset_token:            null,
      password_reset_token_expires_at: null,
      failed_login_attempts:           0,
      locked_until:                    null,
    },
  })

  ok(res, { reset: true })
})

// ─── POST /auth/refresh ───────────────────────────────────────────────────────
// §11.1 — Verifies refresh token and issues a new access token.
// The refresh token itself is not rotated in v1 (stateless design).

const RefreshSchema = z.object({
  refresh_token: z.string().min(1),
})

authRouter.post('/refresh', async (req: Request, res: Response) => {
  const parsed = RefreshSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', 'refresh_token is required.')
    return
  }

  // Validate + rotate the refresh token (issues a fresh one; reuse = theft → revoke).
  const rotated = await rotateRefreshToken(parsed.data.refresh_token)
  if (!rotated) {
    err(res, 'INVALID_TOKEN', 'Refresh token is invalid or expired.', 401)
    return
  }

  // Confirm the user still exists and isn't locked.
  const user = await (prisma as any).user.findUnique({
    where: { id: rotated.userId },
    select: {
      id: true, tenant_id: true, role: true, locked_until: true, audit_template_ids: true,
      tenant: { select: { subscription_status: true, stripe_subscription_id: true } },
    },
  })

  if (!user || isAccountLocked(user.locked_until)) {
    err(res, 'INVALID_TOKEN', 'Refresh token is invalid or expired.', 401)
    return
  }

  const accessToken = generateAccessToken({
    sub: user.id,
    tenant_id: user.tenant_id,
    role: user.role,
  })

  // Re-evaluate the billing gate on every refresh so it clears once a card is added.
  const needsBilling = user.tenant?.subscription_status !== 'active' && !user.tenant?.stripe_subscription_id
  const auditAccess = user.role === 'admin' || (Array.isArray(user.audit_template_ids) && user.audit_template_ids.length > 0)

  ok(res, { access_token: accessToken, refresh_token: rotated.refreshToken, needs_billing: needsBilling, audit_access: auditAccess })
})

// ─── POST /auth/switch-site ───────────────────────────────────────────────────
// Multi-site: lets a group admin switch context to another site in their group.
// Validates the calling JWT, checks group membership, issues new JWT pair.

authRouter.post('/switch-site', async (req: Request, res: Response) => {
  const authorization = req.headers.authorization
  if (!authorization?.startsWith('Bearer ')) {
    err(res, 'MISSING_TOKEN', 'Authentication required.', 401); return
  }

  let payload: ReturnType<typeof verifyAccessToken>
  try {
    payload = verifyAccessToken(authorization.slice(7))
  } catch {
    err(res, 'INVALID_TOKEN', 'Token is invalid or expired.', 401); return
  }

  if (payload.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required.', 403); return
  }

  const { tenant_id } = req.body ?? {}
  if (!tenant_id) {
    err(res, 'VALIDATION_ERROR', 'tenant_id is required.'); return
  }

  const [currentTenant, targetTenant] = await Promise.all([
    (prisma as any).tenant.findUnique({ where: { id: payload.tenant_id }, select: { id: true, parent_tenant_id: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenant_id }, select: { id: true, name: true, parent_tenant_id: true } }),
  ])

  if (!targetTenant) { err(res, 'NOT_FOUND', 'Target site not found.', 404); return }

  // Group root for each tenant (parent_tenant_id ?? own id)
  const currentRoot = currentTenant?.parent_tenant_id ?? payload.tenant_id
  const targetRoot  = targetTenant.parent_tenant_id ?? tenant_id

  if (currentRoot !== targetRoot) {
    err(res, 'FORBIDDEN', 'Target site is not in the same group.', 403); return
  }

  if (tenant_id === payload.tenant_id) {
    err(res, 'VALIDATION_ERROR', 'Already on this site.', 400); return
  }

  const user = await (prisma as any).user.findUnique({
    where:  { id: payload.sub },
    select: { id: true, name: true, email: true },
  })

  const accessToken  = generateAccessToken({ sub: payload.sub, tenant_id, role: 'admin' })
  const refreshToken = await issueRefreshToken(payload.sub)

  ok(res, {
    access_token:  accessToken,
    refresh_token: refreshToken,
    tenant: { id: targetTenant.id, name: targetTenant.name },
    user:   user ?? { id: payload.sub, name: '', email: '' },
  })
})
