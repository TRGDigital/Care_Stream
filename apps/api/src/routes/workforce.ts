// Workforce compliance register (Enterprise).
//
// A single place to record each staff member's "safe to work" credentials
// (DBS, right to work, professional registration, references) with dates and an
// uploaded document, and see at a glance what is valid, expiring, expired or
// missing. Status is computed from expires_at at read time (not stored).
// Documents are content-validated + malware-scanned (reusing the evidence
// pipeline) and stored in S3.

import { Router, Request, Response } from 'express'
import { isSupervisionRoute } from '../lib/supervision-routes'
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { getTenantId } from '../db/tenant-context'
import { checkFeature, PlanLimitError } from '../lib/plan-limits'
import { evidenceUploadMiddleware } from '../middleware/upload'
import { uploadCredentialFile, downloadFile, deleteFile } from '../services/storage/s3'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { detectEvidenceType, SAFE_EVIDENCE_TYPES } from '../lib/evidence-file'
import { notifyUsers } from '../lib/notify'
import { sendTrainingUpdateEmail } from '../services/email/outbound'
import { updateContent } from '../services/email/person-content'
import { recordNotices } from '../services/staff-notices'
import { staffPhotoUrls } from '../lib/staff-photos'
// Loaded when needed: lib/supervision-training reaches training-matrix, which imports this file, so a top level import would be a cycle.
const stl = () => import('../lib/supervision-training')

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function fmtLong(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export const workforceRouter = Router()

// Admin-only. Supervisions and appraisals are on Starter, Professional and Enterprise (has_supervisions); everything else here, the
// credentials register and the training and supervision link, stays on Enterprise (has_workforce_compliance).
// requireAuth is applied globally before this router is mounted.
workforceRouter.use(requireAdmin)
workforceRouter.use(async (req: Request, res: Response, next) => {
  try { await checkFeature((req as any).user.tenant_id, isSupervisionRoute(req.path) ? 'has_supervisions' : 'has_workforce_compliance'); next() }
  catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } next(e) }
})

// CORE types are expected for every member of staff: a missing one is red and counts in the register summary and the Training Matrix's
// "Safe to work" column. EXTRA types only apply to some staff (drivers, sponsored workers, a contract on file), so they are never "missing":
// they show a dash until recorded, then follow the same valid / expiring / expired rules. CREDENTIAL_TYPES stays the core list on purpose,
// because the matrix and suggestions import it and must not turn red for a licence a care assistant does not need.
export const CREDENTIAL_TYPES = ['dbs', 'right_to_work', 'passport', 'professional_registration', 'reference'] as const
export const EXTRA_CREDENTIAL_TYPES = ['visa', 'driving_licence', 'business_insurance', 'mot', 'contract'] as const
export const ALL_CREDENTIAL_TYPES = [...CREDENTIAL_TYPES, ...EXTRA_CREDENTIAL_TYPES] as const
type CredType = typeof ALL_CREDENTIAL_TYPES[number]
const isExtra = (type: string) => (EXTRA_CREDENTIAL_TYPES as readonly string[]).includes(type)
const REGISTRATION_BODIES = ['NMC', 'GPhC', 'HCPC', 'GMC', 'Social Work England', 'Other']

// Traffic-light status for a credential of a given type.
//   reference: received (present) | outstanding (missing)
//   others:    missing | expired | expiring (≤30 days) | valid
function statusFor(type: string, present: boolean, expiresAt: Date | null): string {
  if (!present) return isExtra(type) ? 'none' : type === 'reference' ? 'outstanding' : 'missing'
  if (type === 'reference') return 'received'
  if (!expiresAt) return 'valid'
  const ms = new Date(expiresAt).getTime()
  const now = Date.now()
  if (ms < now) return 'expired'
  return (ms - now) / 86_400_000 <= 30 ? 'expiring' : 'valid'
}

// The Training Matrix's "Safe to work" column uses the same rules as this register.
export const credentialStatus = statusFor

// Shape a stored credential row (or null) into the API response for one type.
function shapeCredential(type: string, row: any) {
  return {
    present:    !!row,
    reference:  row?.reference ?? null,
    issued_at:  row?.issued_at ?? null,
    expires_at: row?.expires_at ?? null,
    notes:      row?.notes ?? null,
    registration_body:   row?.registration_body ?? null,
    sponsorship_ends_at: row?.sponsorship_ends_at ?? null,
    status:     statusFor(type, !!row, row?.expires_at ?? null),
    document:   row?.evidence_key
      ? { name: row.evidence_name, type: row.evidence_type, size: row.evidence_size, uploaded_at: row.evidence_uploaded_at }
      : null,
  }
}

async function findCredential(tenantId: string, userId: string, type: string) {
  return (prisma as any).staffCredential.findFirst({ where: { tenant_id: tenantId, user_id: userId, type } })
}
async function requireStaff(tenantId: string, userId: string) {
  return (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true } })
}

// GET /workforce/register — the staff × credentials grid + a group summary.
workforceRouter.get('/register', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const [users, creds] = await Promise.all([
    // Agency workers are excluded: their DBS, right to work and registration are held by the
    // AGENCY, so they would sit permanently red on a register the home cannot fill in. Their
    // agency's assurance is the evidence, not a certificate in this grid.
    (prisma as any).user.findMany({
      where:   { tenant_id: tenantId, is_active: true, is_agency: false },
      select:  { id: true, name: true, job_role: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).staffCredential.findMany({ where: { tenant_id: tenantId } }),
  ])
  // staff_details may not exist yet (SQL not run): the grid still works, the personal flags are simply all empty.
  const detailRows: any[] = await (prisma as any).staffDetail.findMany({ where: { tenant_id: tenantId } }).catch(() => [])
  const detailsByUser = new Map<string, any>(detailRows.map((d: any) => [d.user_id, d]))
  const photos = await staffPhotoUrls(tenantId, users.map((u: any) => u.id))   // own table: a missing one just means no pictures

  const byUser = new Map<string, Record<string, any>>()
  for (const c of creds) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, {})
    byUser.get(c.user_id)![c.type] = c
  }

  const summary = { valid: 0, expiring: 0, expired: 0, missing: 0, documents: 0 }
  const staff = users.map((u: any) => {
    const credentials: Record<string, any> = {}
    for (const type of ALL_CREDENTIAL_TYPES) {
      const shaped = shapeCredential(type, byUser.get(u.id)?.[type] ?? null)
      credentials[type] = shaped
      if (shaped.status === 'none') continue   // an extra that does not apply to this person
      if      (shaped.status === 'expired')                               summary.expired++
      else if (shaped.status === 'expiring')                              summary.expiring++
      else if (shaped.status === 'valid' || shaped.status === 'received') summary.valid++
      else                                                                summary.missing++  // missing | outstanding
      if (shaped.document) summary.documents++
    }
    const d = detailsByUser.get(u.id)
    // Flags only (no date of birth or phone numbers in the grid): which of the personal sections have been filled in.
    const details = { dob: !!d?.date_of_birth, emergency: !!(d?.emergency_name && d?.emergency_phone), next_of_kin: !!d?.nok_name, contract: !!d?.contract_type, holiday: d?.holiday_entitlement != null }
    return { id: u.id, name: u.name, job_role: u.job_role, photo_url: photos.get(u.id) ?? null, credentials, details }
  })

  ok(res, { types: ALL_CREDENTIAL_TYPES, core_types: CREDENTIAL_TYPES, staff, summary, total_staff: users.length })
})

// GET /workforce/staff/:userId — one staff member's credentials (for the record page).
workforceRouter.get('/staff/:userId', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const user = await (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true, job_role: true } })
  if (!user) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const creds = await (prisma as any).staffCredential.findMany({ where: { tenant_id: tenantId, user_id: userId } })
  const byType = new Map<string, any>(creds.map((c: any) => [c.type, c]))
  const credentials: Record<string, any> = {}
  for (const type of ALL_CREDENTIAL_TYPES) credentials[type] = shapeCredential(type, byType.get(type) ?? null)
  ok(res, { user, types: ALL_CREDENTIAL_TYPES, credentials })
})

// PUT /workforce/staff/:userId/credentials/:type — record/update one credential's details.
workforceRouter.put('/staff/:userId/credentials/:type', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const type   = String(req.params.type)
  if (!ALL_CREDENTIAL_TYPES.includes(type as CredType)) { err(res, 'VALIDATION_ERROR', 'Unknown credential type.'); return }
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }

  const { reference, issued_at, expires_at, notes, registration_body, sponsorship_ends_at } = req.body ?? {}
  const data: any = {
    reference:  reference?.toString().trim() || null,
    issued_at:  issued_at  ? new Date(issued_at)  : null,
    expires_at: expires_at ? new Date(expires_at) : null,
    notes:      notes?.toString().trim() || null,
  }
  // Only the types that use them write these, so saving a DBS never touches the columns.
  if (type === 'professional_registration') data.registration_body = REGISTRATION_BODIES.includes(String(registration_body)) ? String(registration_body) : null
  if (type === 'visa') data.sponsorship_ends_at = sponsorship_ends_at ? new Date(sponsorship_ends_at) : null

  const existing = await findCredential(tenantId, userId, type)
  const cred = existing
    ? await (prisma as any).staffCredential.update({ where: { id: existing.id }, data })
    : await (prisma as any).staffCredential.create({ data: { id: randomUUID(), tenant_id: tenantId, user_id: userId, type, ...data } })

  ok(res, { credential: shapeCredential(type, cred) })
})

// DELETE /workforce/staff/:userId/credentials/:type — clear a credential (and its document).
workforceRouter.delete('/staff/:userId/credentials/:type', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const type   = String(req.params.type)
  const existing = await findCredential(tenantId, userId, type)
  if (existing?.evidence_key) await deleteFile(existing.evidence_key).catch(() => {})
  await (prisma as any).staffCredential.deleteMany({ where: { tenant_id: tenantId, user_id: userId, type } })
  ok(res, { deleted: true })
})

// POST /workforce/staff/:userId/credentials/:type/document — upload the document (multipart: field "file").
workforceRouter.post('/staff/:userId/credentials/:type/document', evidenceUploadMiddleware, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const type   = String(req.params.type)
  if (!ALL_CREDENTIAL_TYPES.includes(type as CredType)) { err(res, 'VALIDATION_ERROR', 'Unknown credential type.'); return }
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No file was uploaded.', 400); return }
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }

  try {
    // Validate the real bytes, then malware-scan (fail closed if the scanner is configured but errors).
    const detected = detectEvidenceType(file.buffer)
    if (!detected) { err(res, 'INVALID_FILE', 'That file is not a valid PDF or image, so it was not uploaded.', 400); return }
    const scan = await scanBuffer(file.buffer, file.originalname)
    if (scan.status === 'infected') { err(res, 'MALWARE_DETECTED', 'That file was flagged by the malware scanner and was not uploaded.', 400); return }
    if (scan.status === 'error' && scannerConfigured()) { err(res, 'SCAN_FAILED', 'The file could not be virus-scanned just now, so it was not uploaded. Please try again.', 503); return }

    const existing = await findCredential(tenantId, userId, type)
    if (existing?.evidence_key) await deleteFile(existing.evidence_key).catch(() => {})   // replace the old document

    const s3Key = await uploadCredentialFile({ tenantId, userId, key: `${type}-${randomUUID()}.${detected.ext}`, buffer: file.buffer, mimeType: detected.mime })
    const doc = {
      evidence_key:  s3Key,
      evidence_name: file.originalname.slice(0, 200),
      evidence_type: detected.mime,
      evidence_size: file.size ?? 0,
      evidence_uploaded_at: new Date(),
    }
    const cred = existing
      ? await (prisma as any).staffCredential.update({ where: { id: existing.id }, data: doc })
      : await (prisma as any).staffCredential.create({ data: { id: randomUUID(), tenant_id: tenantId, user_id: userId, type, ...doc } })
    ok(res, { credential: shapeCredential(type, cred) })
  } catch (e: any) { err(res, 'UPLOAD_FAILED', e?.message ?? 'Could not upload the file.', 500) }
})

// GET /workforce/staff/:userId/credentials/:type/document — view/download the document.
workforceRouter.get('/staff/:userId/credentials/:type/document', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const cred = await findCredential(tenantId, String(req.params.userId), String(req.params.type))
  if (!cred?.evidence_key) { err(res, 'NOT_FOUND', 'No document found.', 404); return }
  try {
    const buf = await downloadFile(cred.evidence_key)
    // Only ever advertise a known-safe content type; sandbox the response so a bad byte stream cannot execute.
    const t = SAFE_EVIDENCE_TYPES.has(cred.evidence_type) ? cred.evidence_type : 'application/octet-stream'
    res.setHeader('Content-Type', t)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; object-src 'self'")
    res.setHeader('Cache-Control', 'private, no-store')
    const disposition = t === 'application/octet-stream' ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disposition}; filename="${(cred.evidence_name ?? 'document').replace(/[^a-zA-Z0-9._\- ]/g, '_')}"`)
    res.send(buf)
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not fetch the file.', 500) }
})

// DELETE /workforce/staff/:userId/credentials/:type/document — remove just the document.
workforceRouter.delete('/staff/:userId/credentials/:type/document', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const cred = await findCredential(tenantId, String(req.params.userId), String(req.params.type))
  if (cred?.evidence_key) {
    await deleteFile(cred.evidence_key).catch(() => {})
    await (prisma as any).staffCredential.update({
      where: { id: cred.id },
      data:  { evidence_key: null, evidence_name: null, evidence_type: null, evidence_size: null, evidence_uploaded_at: null },
    })
  }
  ok(res, { deleted: true })
})


// ─── Personal details, contract and holiday entitlement (admins only: this router is requireAdmin) ─────────────────
// Date of birth, emergency contact and next of kin are personal data. They are only ever returned by the two routes below, never in the
// register grid, and only to admins of the account (the dashboard area is admin only).

const CONTRACT_TYPES = ['permanent', 'fixed_term', 'bank', 'zero_hours']
const str = (v: unknown, max = 200) => { const t = (v ?? '').toString().trim(); return t ? t.slice(0, max) : null }
const dateOrNull = (v: unknown) => { if (!v) return null; const d = new Date(String(v)); return isNaN(d.getTime()) ? null : d }
const numOrNull = (v: unknown, max: number) => { if (v === '' || v == null) return null; const n = Number(v); return isFinite(n) && n >= 0 && n <= max ? n : null }

function shapeDetails(row: any) {
  return {
    date_of_birth: row?.date_of_birth ?? null,
    emergency: { name: row?.emergency_name ?? null, relationship: row?.emergency_relationship ?? null, phone: row?.emergency_phone ?? null, phone_alt: row?.emergency_phone_alt ?? null },
    next_of_kin: { name: row?.nok_name ?? null, relationship: row?.nok_relationship ?? null, phone: row?.nok_phone ?? null, address: row?.nok_address ?? null },
    contract: { type: row?.contract_type ?? null, hours_per_week: row?.contract_hours_per_week != null ? Number(row.contract_hours_per_week) : null, probation_ends_on: row?.probation_ends_on ?? null },
    holiday: { entitlement: row?.holiday_entitlement != null ? Number(row.holiday_entitlement) : null, unit: row?.holiday_unit ?? 'days', year_start: row?.holiday_year_start ?? null },
  }
}

async function getYearStart(tenantId: string) {
  const s = await (prisma as any).workforceSettings.findUnique({ where: { tenant_id: tenantId } }).catch(() => null)
  return { month: s?.holiday_year_start_month ?? 4, day: s?.holiday_year_start_day ?? 1 }
}

// The current holiday year for a start month/day, as ISO dates (the year runs from `from` up to the day before `to`).
export function holidayYear(now: Date, month: number, day: number) {
  const y = now.getUTCFullYear()
  const thisYearStart = new Date(Date.UTC(y, month - 1, day))
  const from = now.getTime() >= thisYearStart.getTime() ? thisYearStart : new Date(Date.UTC(y - 1, month - 1, day))
  const to = new Date(Date.UTC(from.getUTCFullYear() + 1, month - 1, day))
  return { from: from.toISOString().slice(0, 10), to: to.toISOString().slice(0, 10) }
}

// GET /workforce/staff/:userId/details
workforceRouter.get('/staff/:userId/details', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  try {
    const row = await (prisma as any).staffDetail.findUnique({ where: { user_id: userId } })
    if (row && row.tenant_id !== tenantId) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
    const ys = await getYearStart(tenantId)
    ok(res, { details: shapeDetails(row), account_year_start: ys, current_year: holidayYear(new Date(), row?.holiday_year_start ? new Date(row.holiday_year_start).getUTCMonth() + 1 : ys.month, row?.holiday_year_start ? new Date(row.holiday_year_start).getUTCDate() : ys.day) })
  } catch (e: any) { err(res, 'NOT_SET_UP', 'Personal details are not set up yet.', 503) }
})

// PUT /workforce/staff/:userId/details — any subset of sections; a section that is not sent is left alone.
workforceRouter.put('/staff/:userId/details', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const b = req.body ?? {}
  const data: any = {}
  if ('date_of_birth' in b) {
    const d = dateOrNull(b.date_of_birth)
    if (b.date_of_birth && (!d || d.getTime() > Date.now() || d.getUTCFullYear() < 1920)) { err(res, 'VALIDATION_ERROR', 'That date of birth does not look right.'); return }
    data.date_of_birth = d
  }
  if (b.emergency) Object.assign(data, { emergency_name: str(b.emergency.name), emergency_relationship: str(b.emergency.relationship, 60), emergency_phone: str(b.emergency.phone, 40), emergency_phone_alt: str(b.emergency.phone_alt, 40) })
  if (b.next_of_kin) Object.assign(data, { nok_name: str(b.next_of_kin.name), nok_relationship: str(b.next_of_kin.relationship, 60), nok_phone: str(b.next_of_kin.phone, 40), nok_address: str(b.next_of_kin.address, 400) })
  if (b.contract) {
    const t = str(b.contract.type, 30)
    if (t && !CONTRACT_TYPES.includes(t)) { err(res, 'VALIDATION_ERROR', 'Unknown contract type.'); return }
    Object.assign(data, { contract_type: t, contract_hours_per_week: numOrNull(b.contract.hours_per_week, 168), probation_ends_on: dateOrNull(b.contract.probation_ends_on) })
  }
  if (b.holiday) {
    const unit = b.holiday.unit === 'hours' ? 'hours' : 'days'
    Object.assign(data, { holiday_entitlement: numOrNull(b.holiday.entitlement, unit === 'hours' ? 3000 : 366), holiday_unit: unit, holiday_year_start: dateOrNull(b.holiday.year_start) })
  }
  try {
    const row = await (prisma as any).staffDetail.upsert({ where: { user_id: userId }, create: { id: randomUUID(), tenant_id: tenantId, user_id: userId, ...data }, update: data })
    ok(res, { details: shapeDetails(row) })
  } catch (e: any) { console.error('[workforce] details save failed:', e?.message ?? e); err(res, 'NOT_SET_UP', 'Personal details are not set up yet.', 503) }
})

// GET/PUT /workforce/settings — the account's holiday year start (month and day).
workforceRouter.get('/settings', async (_req: Request, res: Response) => {
  ok(res, { holiday_year_start: await getYearStart(getTenantId()) })
})
workforceRouter.put('/settings', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const month = Number(req.body?.holiday_year_start?.month), day = Number(req.body?.holiday_year_start?.day)
  const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > dim[month - 1]) { err(res, 'VALIDATION_ERROR', 'Choose a real month and day.'); return }
  try {
    await (prisma as any).workforceSettings.upsert({ where: { tenant_id: tenantId }, create: { tenant_id: tenantId, holiday_year_start_month: month, holiday_year_start_day: day }, update: { holiday_year_start_month: month, holiday_year_start_day: day } })
    ok(res, { holiday_year_start: { month, day } })
  } catch (e: any) { err(res, 'NOT_SET_UP', 'Workforce settings are not set up yet.', 503) }
})

// GET /workforce/birthdays — upcoming staff birthdays in the next 60 days (admins only; the grid itself never shows dates of birth).
workforceRouter.get('/birthdays', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const rows: any[] = await (prisma as any).staffDetail.findMany({ where: { tenant_id: tenantId, date_of_birth: { not: null } }, select: { user_id: true, date_of_birth: true } }).catch(() => [])
  if (!rows.length) { ok(res, { birthdays: [] }); return }
  const users = await (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true, is_agency: false, id: { in: rows.map(r => r.user_id) } }, select: { id: true, name: true } })
  const name = new Map<string, string>(users.map((u: any) => [u.id, u.name]))
  const { nextBirthday } = await import('../services/workforce/staffBirthdays')
  const today = new Date()
  const list = rows.filter(r => name.has(r.user_id)).map(r => {
    const next = nextBirthday(new Date(r.date_of_birth), today)
    return { user_id: r.user_id, name: name.get(r.user_id)!, on: next.date, in_days: next.days, turning: next.turning }
  }).filter(b => b.in_days <= 60).sort((a, b) => a.in_days - b.in_days)
  ok(res, { birthdays: list })
})

// ─── Supervisions & appraisals ─────────────────────────────────────────────────

const SUPERVISION_TYPES = ['supervision', 'appraisal'] as const

// Derive a staff member's supervision/appraisal cell from all their records for
// one type: the most recent past session, the earliest upcoming (booked) one,
// and a status. A future session is "booked"; otherwise the next-due date drives
// overdue / due-soon / ok; no records at all is "none".
function buildCell(records: any[]) {
  const now = Date.now()
  const sorted = records.slice().sort((a, b) => new Date(b.held_on).getTime() - new Date(a.held_on).getTime())  // desc
  const past     = sorted.find(r => new Date(r.held_on).getTime() <= now) ?? null
  const upcoming = sorted.filter(r => new Date(r.held_on).getTime() > now)
  const next_on  = upcoming.length ? upcoming[upcoming.length - 1] : null   // earliest future
  const next_due = past?.next_due ?? sorted[0]?.next_due ?? null

  let status = 'none'
  if (next_on)        status = 'booked'
  else if (next_due)  { const ms = new Date(next_due).getTime() - now; status = ms < 0 ? 'overdue' : (ms <= 30 * 86_400_000 ? 'due_soon' : 'ok') }
  else if (past)      status = 'ok'

  return {
    last_on:      past?.held_on ?? null,
    conducted_by: past?.conducted_by ?? null,
    next_on:      next_on?.held_on ?? null,
    next_due,
    status,
  }
}

// GET /workforce/supervisions — per staff, latest/next supervision and appraisal.
workforceRouter.get('/supervisions', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const [users, records] = await Promise.all([
    // Agency workers do not receive supervisions or appraisals, so listing them here would
    // show every one of them permanently overdue for something nobody intends to book.
    (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true, is_agency: false }, select: { id: true, name: true, job_role: true }, orderBy: { name: 'asc' } }),
    (prisma as any).staffSupervision.findMany({ where: { tenant_id: tenantId } }),
  ])
  const byUserType = new Map<string, any[]>()
  for (const r of records) { const k = `${r.user_id}|${r.type}`; (byUserType.get(k) ?? byUserType.set(k, []).get(k)!).push(r) }

  const summary = { supervisions_overdue: 0, appraisals_overdue: 0, no_supervision: 0, no_appraisal: 0 }
  const staff = users.map((u: any) => {
    const out: any = { id: u.id, name: u.name, job_role: u.job_role }
    for (const type of SUPERVISION_TYPES) {
      const cell = buildCell(byUserType.get(`${u.id}|${type}`) ?? [])
      out[type] = cell
      if (cell.status === 'overdue') { if (type === 'supervision') summary.supervisions_overdue++; else summary.appraisals_overdue++ }
      if (cell.status === 'none')    { if (type === 'supervision') summary.no_supervision++;    else summary.no_appraisal++ }
    }
    return out
  })
  ok(res, { types: SUPERVISION_TYPES, staff, summary, total_staff: users.length })
})

// GET /workforce/staff/:userId/supervisions — full history for one staff member.
workforceRouter.get('/staff/:userId/supervisions', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const user = await (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true, job_role: true } })
  if (!user) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const records = await (prisma as any).staffSupervision.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { held_on: 'desc' } })
  ok(res, { user, records })
})

// POST /workforce/staff/:userId/supervisions — log a supervision or appraisal.
workforceRouter.post('/staff/:userId/supervisions', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const { type, held_on, conducted_by, conducted_by_user_id, next_due, notes } = req.body ?? {}
  if (!SUPERVISION_TYPES.includes(type)) { err(res, 'VALIDATION_ERROR', 'Type must be supervision or appraisal.'); return }
  if (!held_on) { err(res, 'VALIDATION_ERROR', 'A date is required.'); return }
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }

  // Resolve the conductor: an admin picked from the list (conducted_by_user_id), whose name we
  // store for display. Falls back to the free-text name if no user was picked.
  let conductorId: string | null = null
  let conductorName: string | null = conducted_by?.toString().trim() || null
  if (conducted_by_user_id) {
    const c = await (prisma as any).user.findFirst({ where: { id: String(conducted_by_user_id), tenant_id: tenantId }, select: { id: true, name: true } })
    if (c) { conductorId = c.id; conductorName = c.name || conductorName }
  }

  const record = await (prisma as any).staffSupervision.create({
    data: {
      id: randomUUID(), tenant_id: tenantId, user_id: userId, type,
      held_on:      new Date(held_on),
      conducted_by: conductorName,
      conducted_by_user_id: conductorId,
      next_due:     next_due ? new Date(next_due) : null,
      notes:        notes?.toString().trim() || null,
    },
  })

  const held = new Date(held_on)
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  const isUpcoming = held.getTime() >= startToday.getTime()
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  const label = type === 'appraisal' ? 'appraisal' : 'supervision'

  // Booking confirmation to the staff member for upcoming (today or future) sessions.
  if (isUpcoming) {
    const bodyHtml =
      `<p style="font-size:15px;margin:0 0 12px">Your ${label} has been booked for <strong>${fmtLong(held)}</strong>${conductorName ? ` with ${escapeHtml(conductorName)}` : ''}.</p>` +
      `<p style="font-size:14px;color:#666;margin:0">You'll get a reminder the day before. You can see it any time in your CareStream hub under <strong>Supervisions</strong>.</p>`
    const bookedAction = `has booked your ${label} for ${fmtLong(held)}`
    await recordNotices({ tenantId, userIds: [userId], actorUserId: conductorId, kind: 'supervision_booked', build: n => updateContent(n, { personAction: bookedAction, bodyHtml, buttonLabel: 'View my supervisions', path: '/chat?view=supervisions' }) })
    notifyUsers(tenantId, 'supervision_updates', [userId], (email, name) =>
      sendTrainingUpdateEmail({ to: email, name, orgName: tenant?.name ?? 'Your service', subject: `Your ${label} is booked for ${fmtLong(held)}`, bodyHtml, actorUserId: conductorId, personAction: bookedAction, buttonLabel: 'View my supervisions', buttonPath: '/chat?view=supervisions' }),
    ).catch(() => {})
  }

  // Notify the conductor (an admin) that they are conducting this session — they'll complete the
  // recording form in their own hub under Supervisions.
  if (conductorId && conductorId !== userId) {
    const supervisee = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true } }).catch(() => null)
    const who = supervisee?.name || 'a staff member'
    const bodyHtml =
      `<p style="font-size:15px;margin:0 0 12px">You have been assigned to conduct a <strong>${label}</strong> for <strong>${escapeHtml(who)}</strong> on <strong>${fmtLong(held)}</strong>.</p>` +
      `<p style="font-size:14px;color:#666;margin:0">Complete the supervision recording form in your CareStream hub under <strong>Supervisions</strong>.</p>`
    notifyUsers(tenantId, 'supervision_updates', [conductorId], (email, name) =>
      sendTrainingUpdateEmail({ to: email, name, orgName: tenant?.name ?? 'Your service', subject: `You're conducting ${who}'s ${label} on ${fmtLong(held)}`, bodyHtml }),
    ).catch(() => {})
  }

  ok(res, { record })
})

// ─── Training and supervisions, linked (behind the supervision_training flag; see lib/supervision-training.ts) ───
// GET /workforce/staff/:userId/training-brief?type=supervision|appraisal — what to know about this person's training before the meeting.
workforceRouter.get('/staff/:userId/training-brief', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const m = await stl()
  if (!(await m.supervisionTrainingEnabled(tenantId))) { err(res, 'NOT_AVAILABLE', 'Not available for this account.', 404); return }
  const userId = String(req.params.userId)
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const type = req.query.type === 'appraisal' ? 'appraisal' : 'supervision'
  const brief = await m.buildBrief(tenantId, userId, type)
  if (!brief) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  ok(res, { brief })
})

// GET /workforce/staff/:userId/training-detail?supervision_id= — the courses a supervision is about, in full (flag supervision_training).
workforceRouter.get('/staff/:userId/training-detail', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const m = await stl()
  if (!(await m.supervisionTrainingEnabled(tenantId))) { err(res, 'NOT_AVAILABLE', 'Not available for this account.', 404); return }
  const userId = String(req.params.userId)
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const sid = typeof req.query.supervision_id === 'string' && req.query.supervision_id ? req.query.supervision_id : null
  const detail = await m.buildTrainingDetail(tenantId, userId, sid)
  if (!detail) { err(res, 'NOT_FOUND', 'Not found.', 404); return }
  ok(res, { detail })
})

// Print page and email of the same detail (admins; the email goes to an admin of the account only, the sender by default).
async function adminDetail(req: Request, res: Response) {
  const tenantId = getTenantId()
  const m = await stl()
  if (!(await m.supervisionTrainingEnabled(tenantId))) { err(res, 'NOT_AVAILABLE', 'Not available for this account.', 404); return null }
  const userId = String(req.params.userId)
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return null }
  const sid = typeof (req.query.supervision_id ?? req.body?.supervision_id) === 'string' && (req.query.supervision_id ?? req.body?.supervision_id) ? String(req.query.supervision_id ?? req.body?.supervision_id) : null
  const detail = await m.buildTrainingDetail(tenantId, userId, sid)
  if (!detail) { err(res, 'NOT_FOUND', 'Not found.', 404); return null }
  return { detail, tenantId, actorId: (req as any).user.sub as string }
}
workforceRouter.post('/staff/:userId/suggestions/action', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const m = await stl()
  if (!(await m.supervisionTrainingEnabled(tenantId))) { err(res, 'NOT_AVAILABLE', 'Not available for this account.', 404); return }
  const userId = String(req.params.userId)
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const sid = String(req.body?.supervision_id ?? '')
  const sup = sid ? await (prisma as any).staffSupervision.findFirst({ where: { id: sid, tenant_id: tenantId, user_id: userId }, select: { id: true } }) : null
  if (!sup) { err(res, 'VALIDATION_ERROR', 'Choose a supervision to add it to.', 400); return }
  const result = await m.addSuggestionAsAction(tenantId, userId, sup.id, String(req.body?.suggestion_id ?? ''))
  if (result === 'not_found') { err(res, 'NOT_FOUND', 'That suggestion is no longer available.', 404); return }
  ok(res, { result })
})

workforceRouter.get('/staff/:userId/training-detail/print', async (req: Request, res: Response) => {
  const x = await adminDetail(req, res); if (!x) return
  ok(res, { html: await (await import('../lib/supervision-training-share')).printPage(x.tenantId, x.actorId, x.detail) })
})
workforceRouter.post('/staff/:userId/training-detail/email', async (req: Request, res: Response) => {
  const x = await adminDetail(req, res); if (!x) return
  const r = await (await import('../lib/supervision-training-share')).emailDetail(x.tenantId, x.actorId, x.detail, typeof req.body?.to_user_id === 'string' ? req.body.to_user_id : null)
  if (!r.ok) { err(res, r.code, r.message, r.code === 'NOT_AN_ADMIN' ? 400 : 502); return }
  ok(res, { sent_to: r.to_name || r.to_email })
})

// POST /workforce/training-link { user_ids, module_id } — after training is allocated, also add it as an action on each person's next
// booked supervision. Only after the admin ticks the box on the assign screen: nothing is added automatically.
workforceRouter.post('/training-link', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const m = await stl()
  if (!(await m.supervisionTrainingEnabled(tenantId))) { err(res, 'NOT_AVAILABLE', 'Not available for this account.', 404); return }
  const ids = Array.isArray(req.body?.user_ids) ? [...new Set<string>(req.body.user_ids.map((x: unknown) => String(x)))].slice(0, 300) : []
  const moduleId = String(req.body?.module_id ?? '').trim()
  if (!ids.length || !moduleId) { err(res, 'VALIDATION_ERROR', 'user_ids and module_id are required.'); return }
  const results = await m.linkTrainingToNextSupervision(tenantId, ids, moduleId)
  ok(res, { results, linked: results.filter(r => r.result === 'linked').length })
})

// DELETE /workforce/supervisions/:id — remove a supervision/appraisal record.
workforceRouter.delete('/supervisions/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  await (prisma as any).staffSupervision.deleteMany({ where: { tenant_id: tenantId, id: String(req.params.id) } })
  ok(res, { deleted: true })
})
