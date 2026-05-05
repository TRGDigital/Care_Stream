import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

// Tenant settings: inbound email address + email allowlist.
// Mounted at /settings in app.ts, behind requireAuth + tenantGuard.
// Admin-only writes; reads are available to all authenticated users.

export const settingsRouter = Router()

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'

// ─── GET /settings ────────────────────────────────────────────────────────────

settingsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true, name: true, email_allowlist: true, facility_type: true },
  })

  if (!tenant) return err(res, 'NOT_FOUND', 'Tenant not found', 404)

  ok(res, {
    inbound_email:   `policies@${tenant.slug}.${INBOUND_DOMAIN}`,
    email_allowlist: tenant.email_allowlist as string[],
    facility_type:   tenant.facility_type as string,
  })
})

// ─── PATCH /settings ─────────────────────────────────────────────────────────
// Admin only. Replaces the full email allowlist.

settingsRouter.patch('/', async (req: Request, res: Response) => {
  const user     = (req as any).user
  const tenantId = user.tenant_id

  if (user.role !== 'admin') {
    return err(res, 'FORBIDDEN', 'Only admins can update settings', 403)
  }

  const { email_allowlist, facility_type } = req.body

  if (email_allowlist !== undefined && !Array.isArray(email_allowlist)) {
    return err(res, 'INVALID_INPUT', 'email_allowlist must be an array', 400)
  }

  if (facility_type !== undefined && (typeof facility_type !== 'string' || !facility_type.trim())) {
    return err(res, 'INVALID_INPUT', 'facility_type must be a non-empty string', 400)
  }

  const updateData: Record<string, unknown> = {}

  if (email_allowlist !== undefined) {
    const normalised = [
      ...new Set(
        (email_allowlist as unknown[])
          .filter(e => typeof e === 'string')
          .map(e => (e as string).trim().toLowerCase())
          .filter(Boolean),
      ),
    ]
    const emailRe = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    const invalid  = normalised.filter(e => !emailRe.test(e))
    if (invalid.length > 0) {
      return err(res, 'INVALID_EMAIL', `Invalid email addresses: ${invalid.join(', ')}`, 400)
    }
    updateData.email_allowlist = normalised
  }

  if (facility_type !== undefined) {
    updateData.facility_type = facility_type.trim().toLowerCase()
  }

  const updated = await (prisma as any).tenant.update({
    where: { id: tenantId },
    data:  updateData,
    select: { email_allowlist: true, facility_type: true },
  })

  ok(res, { email_allowlist: updated.email_allowlist, facility_type: updated.facility_type })
})
