import { Router, Request, Response } from 'express'
import multer from 'multer'
import sharp from 'sharp'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { effectiveSections } from '../lib/policy-sections'
import { effectiveStaffRoles, effectiveSpecialistRoles } from '../data/onboarding-roles'

// Tenant settings: inbound email address, email allowlist, logo, email preferences.
// Mounted at /settings in app.ts, behind requireAuth + tenantGuard.
// Admin-only writes; reads are available to all authenticated users.

export const settingsRouter = Router()

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'

// Default opt-in state for each email preference key.
// Service emails default on; marketing defaults off (GDPR explicit consent).
const EMAIL_PREF_DEFAULTS: Record<string, boolean> = {
  policy_updates:          true,
  monthly_usage_report:    true,
  knowledge_gap_digest:    true,
  plan_usage_warnings:     true,
  policy_review_reminders: true,
  staff_engagement_alerts: true,
  training_updates:        true,
  audit_updates:           true,
  cqc_staff_prep:          true,
  onboarding_updates:      true,
  monthly_invoice:         false,
  trg_product_updates:     false,
}

function mergePrefs(stored: unknown): Record<string, boolean> {
  const base = stored && typeof stored === 'object' ? stored as Record<string, unknown> : {}
  const result: Record<string, boolean> = {}
  for (const key of Object.keys(EMAIL_PREF_DEFAULTS)) {
    result[key] = typeof base[key] === 'boolean' ? (base[key] as boolean) : EMAIL_PREF_DEFAULTS[key]
  }
  return result
}

const LOGO_MAX_BYTES  = 2 * 1024 * 1024  // 2 MB
// SVG is intentionally excluded — SVGs can contain <script>, and the logo is
// stored as an inline data: URL, so an SVG logo is a stored-XSS vector.
const LOGO_MIME_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])

const logoUpload = multer({
  storage: multer.memoryStorage(),
  limits:  { fileSize: LOGO_MAX_BYTES },
  fileFilter: (_req, file, cb) => {
    if (!LOGO_MIME_TYPES.has(file.mimetype)) {
      cb(new Error('INVALID_FILE_TYPE'))
    } else {
      cb(null, true)
    }
  },
})

// ─── GET /settings ────────────────────────────────────────────────────────────

settingsRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { slug: true, name: true, account_number: true, email_allowlist: true, phone_allowlist: true, facility_type: true, response_style: true, logo_url: true, email_preferences: true, staff_roles: true, specialist_roles: true, policy_sections: true },
  })

  if (!tenant) return err(res, 'NOT_FOUND', 'Tenant not found', 404)

  ok(res, {
    inbound_email:      `policies@${tenant.slug}.${INBOUND_DOMAIN}`,
    account_number:     tenant.account_number as string,
    policy_sections:    effectiveSections(tenant.policy_sections as string[]),
    email_allowlist:    tenant.email_allowlist as string[],
    phone_allowlist:    (tenant.phone_allowlist as string[]) ?? [],
    facility_type:      tenant.facility_type as string,
    response_style:     (tenant.response_style as string) ?? 'standard',
    logo_url:           tenant.logo_url as string | null,
    email_preferences:  mergePrefs(tenant.email_preferences),
    staff_roles:        effectiveStaffRoles(tenant.staff_roles as string[]),
    specialist_roles:   effectiveSpecialistRoles(tenant.specialist_roles as string[]),
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

  const { email_allowlist, phone_allowlist, facility_type, response_style, email_preferences, staff_roles, specialist_roles, policy_sections } = req.body

  if (email_allowlist !== undefined && !Array.isArray(email_allowlist)) {
    return err(res, 'INVALID_INPUT', 'email_allowlist must be an array', 400)
  }

  if (phone_allowlist !== undefined && !Array.isArray(phone_allowlist)) {
    return err(res, 'INVALID_INPUT', 'phone_allowlist must be an array', 400)
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

  if (phone_allowlist !== undefined) {
    const normalised = [...new Set(
      (phone_allowlist as unknown[])
        .filter(p => typeof p === 'string')
        .map(p => (p as string).trim())
        .filter(Boolean),
    )]
    const phoneRe = /^\+[1-9]\d{7,14}$/
    const invalid = normalised.filter(p => !phoneRe.test(p))
    if (invalid.length > 0) {
      return err(res, 'INVALID_PHONE', `Invalid phone numbers (use international format, e.g. +447911123456): ${invalid.join(', ')}`, 400)
    }
    updateData.phone_allowlist = normalised
  }

  if (facility_type !== undefined) {
    updateData.facility_type = facility_type.trim().toLowerCase()
  }

  if (response_style !== undefined) {
    if (response_style !== 'standard' && response_style !== 'concise') {
      return err(res, 'INVALID_INPUT', 'response_style must be "standard" or "concise"', 400)
    }
    updateData.response_style = response_style
  }

  if (staff_roles !== undefined) {
    if (!Array.isArray(staff_roles)) {
      return err(res, 'INVALID_INPUT', 'staff_roles must be an array', 400)
    }
    const normalised = [...new Set(
      (staff_roles as unknown[])
        .filter(r => typeof r === 'string')
        .map(r => (r as string).trim())
        .filter(r => r.length > 0 && r.length <= 100),
    )]
    updateData.staff_roles = normalised
  }

  if (specialist_roles !== undefined) {
    if (!Array.isArray(specialist_roles)) {
      return err(res, 'INVALID_INPUT', 'specialist_roles must be an array', 400)
    }
    updateData.specialist_roles = [...new Set(
      (specialist_roles as unknown[])
        .filter(r => typeof r === 'string')
        .map(r => (r as string).trim())
        .filter(r => r.length > 0 && r.length <= 100),
    )]
  }

  if (policy_sections !== undefined) {
    if (!Array.isArray(policy_sections)) {
      return err(res, 'INVALID_INPUT', 'policy_sections must be an array', 400)
    }
    const normalised = [...new Set(
      (policy_sections as unknown[])
        .filter(s => typeof s === 'string')
        .map(s => (s as string).trim())
        .filter(s => s.length > 0 && s.length <= 100),
    )]
    updateData.policy_sections = normalised
  }

  if (email_preferences !== undefined) {
    if (typeof email_preferences !== 'object' || Array.isArray(email_preferences)) {
      return err(res, 'INVALID_INPUT', 'email_preferences must be an object', 400)
    }
    // Only accept known keys with boolean values
    const sanitised: Record<string, boolean> = {}
    for (const key of Object.keys(EMAIL_PREF_DEFAULTS)) {
      if (typeof email_preferences[key] === 'boolean') {
        sanitised[key] = email_preferences[key]
      }
    }
    updateData.email_preferences = sanitised
  }

  const updated = await (prisma as any).tenant.update({
    where: { id: tenantId },
    data:  updateData,
    select: { email_allowlist: true, phone_allowlist: true, facility_type: true, email_preferences: true, staff_roles: true, specialist_roles: true, policy_sections: true },
  })

  ok(res, {
    email_allowlist:   updated.email_allowlist,
    phone_allowlist:   updated.phone_allowlist ?? [],
    facility_type:     updated.facility_type,
    email_preferences: mergePrefs(updated.email_preferences),
    staff_roles:       effectiveStaffRoles(updated.staff_roles),
    specialist_roles:  effectiveSpecialistRoles(updated.specialist_roles),
    policy_sections:   effectiveSections(updated.policy_sections),
  })
})

// ─── POST /settings/logo ──────────────────────────────────────────────────────
// Upload or replace the tenant logo. Converts to base64 data URL and stores in DB.

settingsRouter.post('/logo', (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') {
    return err(res, 'FORBIDDEN', 'Only admins can update settings', 403)
  }

  logoUpload.single('logo')(req, res, async (multerErr: any) => {
    if (multerErr) {
      if (multerErr.message === 'INVALID_FILE_TYPE') {
        return err(res, 'INVALID_FILE_TYPE', 'Only PNG, JPEG, and WebP images are accepted.', 400)
      }
      if (multerErr.code === 'LIMIT_FILE_SIZE') {
        return err(res, 'FILE_TOO_LARGE', 'Logo must be under 2 MB.', 413)
      }
      return err(res, 'UPLOAD_ERROR', 'Upload failed.', 500)
    }

    const file = (req as any).file
    if (!file) return err(res, 'NO_FILE', 'No file provided.', 400)

    // Optimise the logo (upload rule): cap at 400px and re-encode as WebP
    // (preserves transparency) so the stored data URL stays small.
    let buffer = file.buffer as Buffer
    let mime   = file.mimetype as string
    try {
      buffer = await sharp(file.buffer)
        .rotate()
        .resize({ width: 400, height: 400, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: 85 })
        .toBuffer()
      mime = 'image/webp'
    } catch { /* keep the original bytes if optimisation fails */ }

    const dataUrl = `data:${mime};base64,${buffer.toString('base64')}`

    await (prisma as any).tenant.update({
      where: { id: user.tenant_id },
      data:  { logo_url: dataUrl },
    })

    ok(res, { logo_url: dataUrl })
  })
})

// ─── DELETE /settings/logo ────────────────────────────────────────────────────

settingsRouter.delete('/logo', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') {
    return err(res, 'FORBIDDEN', 'Only admins can update settings', 403)
  }

  await (prisma as any).tenant.update({
    where: { id: user.tenant_id },
    data:  { logo_url: null },
  })

  ok(res, { logo_url: null })
})
