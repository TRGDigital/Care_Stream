import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { hashPassword, verifyPassword } from '../services/auth/password'
import { generateAccessToken, generateRefreshToken, verifyRefreshToken } from '../services/auth/tokens'
import { writeAuditLog } from '../lib/audit'
import { ok, err } from '../lib/response'
import { authLimiter } from '../middleware/rateLimiter'
import { isAccountLocked } from '../middleware/auth'

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
        email_domain: slug,           // policies@{slug}.carestreamai.co.uk
        subscription_status: 'trialling',
        plan_id: plan_id ?? null,
        branding_signoff: `The ${org_name} Team`,
      },
    })

    const user = await tx.user.create({
      data: {
        tenant_id: tenant.id,
        email,
        name,
        role: 'admin',
        password_hash,
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

  const accessToken  = generateAccessToken({ sub: user.id, tenant_id: tenant.id, role: 'admin' })
  const refreshToken = generateRefreshToken(user.id)

  ok(res, {
    access_token:  accessToken,
    refresh_token: refreshToken,
    user: {
      id:        user.id,
      name:      user.name,
      email:     user.email,
      role:      user.role,
      tenant_id: tenant.id,
    },
    tenant: {
      id:   tenant.id,
      name: tenant.name,
      slug: tenant.slug,
    },
  }, 201)
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
    include: { tenant: { select: { id: true, name: true, slug: true, subscription_status: true } } },
  })

  // Return generic message — do not reveal whether the email exists
  if (!user) {
    err(res, 'INVALID_CREDENTIALS', 'Invalid email or password.', 401)
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

  // Success — reset failure counters and record login
  await (prisma as any).user.update({
    where: { id: user.id },
    data: {
      failed_login_attempts: 0,
      locked_until: null,
      last_login_at: new Date(),
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
  const refreshToken = generateRefreshToken(user.id)

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

  let userId: string
  try {
    const payload = verifyRefreshToken(parsed.data.refresh_token)
    userId = payload.sub
  } catch {
    err(res, 'INVALID_TOKEN', 'Refresh token is invalid or expired.', 401)
    return
  }

  // Look up user to confirm they still exist and are not locked
  const user = await (prisma as any).user.findUnique({
    where: { id: userId },
    select: { id: true, tenant_id: true, role: true, locked_until: true },
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

  ok(res, { access_token: accessToken })
})
