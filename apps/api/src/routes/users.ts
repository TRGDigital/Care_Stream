// §7.3 — Users routes: staff list, invite, deactivate, reset password.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { hashPassword } from '../services/auth/password'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { sendStaffWelcomeEmail } from '../services/email/outbound'
import { checkUserLimit, PlanLimitError } from '../lib/plan-limits'
import crypto from 'crypto'

export const usersRouter = Router()

// All /users routes are admin-only
usersRouter.use(requireAdmin)

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const LOGIN_URL = `${process.env.WEB_URL ?? process.env.FRONTEND_URL ?? 'https://care-stream-web.vercel.app'}/login`
const PLATFORM_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER ?? ''

// The three ways a staff member reaches CareStream — shown on the credentials
// overlay and in the welcome email. WhatsApp uses the tenant's dedicated number,
// falling back to the shared platform number.
function tenantContact(tenant: { slug: string; twilio_whatsapp_number?: string | null }) {
  return {
    login_url:       LOGIN_URL,
    inbound_email:   `policies@${tenant.slug}.${INBOUND_DOMAIN}`,
    whatsapp_number: tenant.twilio_whatsapp_number || PLATFORM_WHATSAPP_NUMBER || null,
  }
}

// ─── GET /users ───────────────────────────────────────────────────────────────

usersRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const users = await (prisma as any).user.findMany({
    where:   { tenant_id: tenantId },
    select:  {
      id: true, name: true, email: true, role: true, job_role: true, phone_number: true,
      shift_type: true, first_language: true, second_language: true,
      is_active: true, created_at: true, first_login_at: true, last_login_at: true,
    },
    orderBy: { created_at: 'asc' },
  })

  ok(res, { users, total: users.length })
})

// ─── POST /users/invite ───────────────────────────────────────────────────────

const InviteSchema = z.object({
  name:            z.string().min(1).max(100),
  email:           z.string().email(),
  role:            z.enum(['admin', 'staff']).default('staff'),
  job_role:        z.string().max(100).optional(),
  phone_number:    z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format, e.g. +447911123456').optional(),
  shift_type:      z.enum(['any', 'day', 'night']).default('any'),
  first_language:  z.string().length(3).default('eng'),
  second_language: z.string().length(3).optional(),
  new_starter:     z.boolean().optional(),   // true → auto-enrol into matching onboarding flows
})

usersRouter.post('/invite', async (req: Request, res: Response) => {
  const parsed = InviteSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { name, email, role, job_role, phone_number, shift_type, first_language, second_language, new_starter } = parsed.data
  const tenantId = req.user!.tenant_id

  try {
    await checkUserLimit(tenantId)
  } catch (e) {
    if (e instanceof PlanLimitError) {
      err(res, e.code, e.message, 403)
      return
    }
    throw e
  }

  const existing = await (prisma as any).user.findUnique({ where: { email } })
  if (existing) {
    err(res, 'EMAIL_IN_USE', 'A user with that email address already exists.')
    return
  }

  // Check phone number isn't already registered to another user in this tenant
  if (phone_number) {
    const phoneExists = await (prisma as any).user.findFirst({
      where: { tenant_id: tenantId, phone_number },
    })
    if (phoneExists) {
      err(res, 'PHONE_IN_USE', 'That WhatsApp number is already registered to another staff member.')
      return
    }
  }

  const tempPassword = crypto.randomBytes(10).toString('base64url')
  const passwordHash = await hashPassword(tempPassword)

  const user = await (prisma as any).user.create({
    data: {
      tenant_id:     tenantId,
      name,
      email,
      role,
      job_role:        job_role ?? null,
      phone_number:    phone_number ?? null,
      shift_type:      shift_type ?? 'any',
      first_language:  first_language ?? 'eng',
      second_language: second_language ?? null,
      password_hash:   passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, job_role: true, phone_number: true, shift_type: true, first_language: true, second_language: true, created_at: true },
  })

  // Add the phone number to the tenant's WhatsApp allowlist
  if (phone_number) {
    const tenant = await (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: { phone_allowlist: true },
    })
    const allowlist: string[] = tenant?.phone_allowlist ?? []
    if (!allowlist.includes(phone_number)) {
      await (prisma as any).tenant.update({
        where: { id: tenantId },
        data:  { phone_allowlist: [...allowlist, phone_number] },
      })
    }
  }

  // Add the email to the tenant's approved-sender allowlist (so admins don't have
  // to add it again in Settings). Stored lowercase to match Settings normalisation.
  {
    const lower = email.toLowerCase()
    const tenant = await (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: { email_allowlist: true },
    })
    const allowlist: string[] = tenant?.email_allowlist ?? []
    if (!allowlist.some(e => e.toLowerCase() === lower)) {
      await (prisma as any).tenant.update({
        where: { id: tenantId },
        data:  { email_allowlist: [...allowlist, lower] },
      })
    }
  }

  // New starter → auto-enrol into active onboarding flows that match their job
  // role (or flows that apply to all roles). Saves setting up enrolment manually.
  let onboardingEnrolled = 0
  if (new_starter) {
    const flows = await (prisma as any).onboardingFlow.findMany({
      where:  { tenant_id: tenantId, is_active: true },
      select: { id: true, job_roles: true },
    })
    const matched = (flows as any[]).filter(f =>
      !Array.isArray(f.job_roles) || f.job_roles.length === 0 || (job_role && f.job_roles.includes(job_role))
    )
    if (matched.length > 0) {
      await (prisma as any).onboardingEnrollment.createMany({
        data: matched.map(f => ({ tenant_id: tenantId, flow_id: f.id, user_id: user.id })),
        skipDuplicates: true,
      })
      onboardingEnrolled = matched.length
    }
  }

  const contactTenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true, twilio_whatsapp_number: true },
  })

  ok(res, {
    user,
    temp_password:      tempPassword,
    onboarding_enrolled: onboardingEnrolled,
    new_starter:        !!new_starter,
    contact:            contactTenant ? tenantContact(contactTenant) : { login_url: LOGIN_URL, inbound_email: null, whatsapp_number: null },
  }, 201)
})

// ─── PATCH /users/:id ─────────────────────────────────────────────────────────

const UpdateSchema = z.object({
  name:            z.string().min(1).max(100).optional(),
  job_role:        z.string().max(100).nullable().optional(),
  role:            z.enum(['admin', 'staff']).optional(),
  phone_number:    z.string().regex(/^\+[1-9]\d{7,14}$/, 'Phone number must be in E.164 format, e.g. +447911123456').nullable().optional(),
  shift_type:      z.enum(['any', 'day', 'night']).optional(),
  first_language:  z.string().length(3).optional(),
  second_language: z.string().length(3).nullable().optional(),
})

usersRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const tenantId = req.user!.tenant_id
  const { id }   = req.params

  const existing = await (prisma as any).user.findUnique({
    where:  { id },
    select: { id: true, tenant_id: true, phone_number: true },
  })
  if (!existing || existing.tenant_id !== tenantId) {
    err(res, 'NOT_FOUND', 'User not found.', 404)
    return
  }

  const { phone_number } = parsed.data

  // If phone number is changing, validate uniqueness and update allowlist
  if (phone_number !== undefined && phone_number !== existing.phone_number) {
    if (phone_number) {
      const conflict = await (prisma as any).user.findFirst({
        where: { tenant_id: tenantId, phone_number, NOT: { id } },
      })
      if (conflict) {
        err(res, 'PHONE_IN_USE', 'That WhatsApp number is already registered to another staff member.')
        return
      }
    }

    // Update the tenant allowlist: remove old number, add new one
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId }, select: { phone_allowlist: true },
    })
    let allowlist: string[] = tenant?.phone_allowlist ?? []
    if (existing.phone_number) {
      allowlist = allowlist.filter((n: string) => n !== existing.phone_number)
    }
    if (phone_number) {
      allowlist = [...allowlist, phone_number]
    }
    await (prisma as any).tenant.update({
      where: { id: tenantId },
      data:  { phone_allowlist: allowlist },
    })
  }

  const updateData: Record<string, any> = {}
  if (parsed.data.name            !== undefined) updateData.name            = parsed.data.name
  if (parsed.data.job_role        !== undefined) updateData.job_role        = parsed.data.job_role
  if (parsed.data.role            !== undefined) updateData.role            = parsed.data.role
  if (parsed.data.phone_number    !== undefined) updateData.phone_number    = parsed.data.phone_number
  if (parsed.data.shift_type      !== undefined) updateData.shift_type      = parsed.data.shift_type
  if (parsed.data.first_language  !== undefined) updateData.first_language  = parsed.data.first_language
  if (parsed.data.second_language !== undefined) updateData.second_language = parsed.data.second_language

  const user = await (prisma as any).user.update({
    where:  { id },
    data:   updateData,
    select: { id: true, name: true, email: true, role: true, job_role: true, phone_number: true, shift_type: true, first_language: true, second_language: true, is_active: true, created_at: true, first_login_at: true, last_login_at: true },
  })

  ok(res, { user })
})

// ─── POST /users/:id/deactivate ───────────────────────────────────────────────
// Revokes login access. Does not delete the user or their query history.

usersRouter.post('/:id/deactivate', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const { id }   = req.params

  // Prevent admins from deactivating themselves (JWT identifies the user via `sub`)
  if (id === req.user!.sub) {
    err(res, 'FORBIDDEN', 'You cannot deactivate your own account.', 403)
    return
  }

  const user = await (prisma as any).user.findUnique({
    where:  { id },
    select: { id: true, tenant_id: true, is_active: true },
  })

  if (!user || user.tenant_id !== tenantId) {
    err(res, 'NOT_FOUND', 'User not found.', 404)
    return
  }

  await (prisma as any).user.update({
    where: { id },
    data:  { is_active: false },
  })

  ok(res, { deactivated: true })
})

// ─── POST /users/:id/reactivate ───────────────────────────────────────────────

usersRouter.post('/:id/reactivate', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const { id }   = req.params

  const user = await (prisma as any).user.findUnique({
    where:  { id },
    select: { id: true, tenant_id: true },
  })

  if (!user || user.tenant_id !== tenantId) {
    err(res, 'NOT_FOUND', 'User not found.', 404)
    return
  }

  await (prisma as any).user.update({
    where: { id },
    data:  { is_active: true },
  })

  ok(res, { reactivated: true })
})

// ─── POST /users/:id/send-credentials ────────────────────────────────────────
// Sends the staff member their login details by email.
// The temp_password is passed in the request body — it is never stored on the server,
// only used to compose the email in transit.

usersRouter.post('/:id/send-credentials', async (req: Request, res: Response) => {
  const tenantId    = req.user!.tenant_id
  const { id }      = req.params
  const { temp_password } = req.body

  if (!temp_password || typeof temp_password !== 'string') {
    err(res, 'VALIDATION_ERROR', 'temp_password is required.', 400)
    return
  }

  const user = await (prisma as any).user.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, tenant_id: true },
  })

  if (!user || user.tenant_id !== tenantId) {
    err(res, 'NOT_FOUND', 'User not found.', 404)
    return
  }

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { name: true, slug: true, twilio_whatsapp_number: true },
  })

  const contact = tenant ? tenantContact(tenant) : { login_url: LOGIN_URL, inbound_email: null, whatsapp_number: null }

  try {
    await sendStaffWelcomeEmail({
      to:             user.email as string,
      staffName:      user.name  as string,
      orgName:        tenant?.name ?? 'your organisation',
      tempPassword:   temp_password,
      portalUrl:      contact.login_url,
      inboundEmail:   contact.inbound_email,
      whatsappNumber: contact.whatsapp_number,
    })
    ok(res, { sent: true })
  } catch (e: any) {
    err(res, 'EMAIL_FAILED', e.message ?? 'Failed to send email.', 500)
  }
})

// ─── POST /users/:id/reset-password ──────────────────────────────────────────
// Generates a new temporary password and returns it to the admin.

usersRouter.post('/:id/reset-password', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const { id }   = req.params

  const user = await (prisma as any).user.findUnique({
    where:  { id },
    select: { id: true, name: true, email: true, tenant_id: true },
  })

  if (!user || user.tenant_id !== tenantId) {
    err(res, 'NOT_FOUND', 'User not found.', 404)
    return
  }

  const tempPassword = crypto.randomBytes(10).toString('base64url')
  const passwordHash = await hashPassword(tempPassword)

  await (prisma as any).user.update({
    where: { id },
    data:  { password_hash: passwordHash, failed_login_attempts: 0, locked_until: null },
  })

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true, twilio_whatsapp_number: true },
  })

  ok(res, {
    user:          { id: user.id, name: user.name, email: user.email },
    temp_password: tempPassword,
    contact:       tenant ? tenantContact(tenant) : { login_url: LOGIN_URL, inbound_email: null, whatsapp_number: null },
  })
})
