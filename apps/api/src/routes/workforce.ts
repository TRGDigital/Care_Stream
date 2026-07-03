// Workforce compliance register (Enterprise).
//
// A single place to record each staff member's "safe to work" credentials
// (DBS, right to work, professional registration, references) with dates and an
// uploaded document, and see at a glance what is valid, expiring, expired or
// missing. Status is computed from expires_at at read time (not stored).
// Documents are content-validated + malware-scanned (reusing the evidence
// pipeline) and stored in S3.

import { Router, Request, Response } from 'express'
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

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function fmtLong(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })
}

export const workforceRouter = Router()

// Admin-only, and gated to plans that include the workforce compliance register
// (Enterprise). requireAuth is applied globally before this router is mounted.
workforceRouter.use(requireAdmin)
workforceRouter.use(async (req: Request, res: Response, next) => {
  try { await checkFeature((req as any).user.tenant_id, 'has_workforce_compliance'); next() }
  catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } next(e) }
})

const CREDENTIAL_TYPES = ['dbs', 'right_to_work', 'passport', 'professional_registration', 'reference'] as const
type CredType = typeof CREDENTIAL_TYPES[number]

// Traffic-light status for a credential of a given type.
//   reference: received (present) | outstanding (missing)
//   others:    missing | expired | expiring (≤30 days) | valid
function statusFor(type: string, present: boolean, expiresAt: Date | null): string {
  if (!present) return type === 'reference' ? 'outstanding' : 'missing'
  if (type === 'reference') return 'received'
  if (!expiresAt) return 'valid'
  const ms = new Date(expiresAt).getTime()
  const now = Date.now()
  if (ms < now) return 'expired'
  return (ms - now) / 86_400_000 <= 30 ? 'expiring' : 'valid'
}

// Shape a stored credential row (or null) into the API response for one type.
function shapeCredential(type: string, row: any) {
  return {
    present:    !!row,
    reference:  row?.reference ?? null,
    issued_at:  row?.issued_at ?? null,
    expires_at: row?.expires_at ?? null,
    notes:      row?.notes ?? null,
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
    (prisma as any).user.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      select:  { id: true, name: true, job_role: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).staffCredential.findMany({ where: { tenant_id: tenantId } }),
  ])

  const byUser = new Map<string, Record<string, any>>()
  for (const c of creds) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, {})
    byUser.get(c.user_id)![c.type] = c
  }

  const summary = { valid: 0, expiring: 0, expired: 0, missing: 0, documents: 0 }
  const staff = users.map((u: any) => {
    const credentials: Record<string, any> = {}
    for (const type of CREDENTIAL_TYPES) {
      const shaped = shapeCredential(type, byUser.get(u.id)?.[type] ?? null)
      credentials[type] = shaped
      if      (shaped.status === 'expired')                               summary.expired++
      else if (shaped.status === 'expiring')                              summary.expiring++
      else if (shaped.status === 'valid' || shaped.status === 'received') summary.valid++
      else                                                                summary.missing++  // missing | outstanding
      if (shaped.document) summary.documents++
    }
    return { id: u.id, name: u.name, job_role: u.job_role, credentials }
  })

  ok(res, { types: CREDENTIAL_TYPES, staff, summary, total_staff: users.length })
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
  for (const type of CREDENTIAL_TYPES) credentials[type] = shapeCredential(type, byType.get(type) ?? null)
  ok(res, { user, types: CREDENTIAL_TYPES, credentials })
})

// PUT /workforce/staff/:userId/credentials/:type — record/update one credential's details.
workforceRouter.put('/staff/:userId/credentials/:type', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const type   = String(req.params.type)
  if (!CREDENTIAL_TYPES.includes(type as CredType)) { err(res, 'VALIDATION_ERROR', 'Unknown credential type.'); return }
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }

  const { reference, issued_at, expires_at, notes } = req.body ?? {}
  const data = {
    reference:  reference?.toString().trim() || null,
    issued_at:  issued_at  ? new Date(issued_at)  : null,
    expires_at: expires_at ? new Date(expires_at) : null,
    notes:      notes?.toString().trim() || null,
  }

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
  if (!CREDENTIAL_TYPES.includes(type as CredType)) { err(res, 'VALIDATION_ERROR', 'Unknown credential type.'); return }
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
    (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, name: true, job_role: true }, orderBy: { name: 'asc' } }),
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
  const { type, held_on, conducted_by, next_due, notes } = req.body ?? {}
  if (!SUPERVISION_TYPES.includes(type)) { err(res, 'VALIDATION_ERROR', 'Type must be supervision or appraisal.'); return }
  if (!held_on) { err(res, 'VALIDATION_ERROR', 'A date is required.'); return }
  if (!(await requireStaff(tenantId, userId))) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
  const record = await (prisma as any).staffSupervision.create({
    data: {
      id: randomUUID(), tenant_id: tenantId, user_id: userId, type,
      held_on:      new Date(held_on),
      conducted_by: conducted_by?.toString().trim() || null,
      next_due:     next_due ? new Date(next_due) : null,
      notes:        notes?.toString().trim() || null,
    },
  })

  // Booking confirmation to the staff member for upcoming (today or future) sessions.
  const held = new Date(held_on)
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  if (held.getTime() >= startToday.getTime()) {
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const label = type === 'appraisal' ? 'appraisal' : 'supervision'
    const by = conducted_by?.toString().trim()
    const bodyHtml =
      `<p style="font-size:15px;margin:0 0 12px">Your ${label} has been booked for <strong>${fmtLong(held)}</strong>${by ? ` with ${escapeHtml(by)}` : ''}.</p>` +
      `<p style="font-size:14px;color:#666;margin:0">You'll get a reminder the day before. You can see it any time in your CareStream hub under <strong>Supervisions</strong>.</p>`
    notifyUsers(tenantId, 'supervision_updates', [userId], (email, name) =>
      sendTrainingUpdateEmail({ to: email, name, orgName: tenant?.name ?? 'Your service', subject: `Your ${label} is booked for ${fmtLong(held)}`, bodyHtml }),
    ).catch(() => {})
  }

  ok(res, { record })
})

// DELETE /workforce/supervisions/:id — remove a supervision/appraisal record.
workforceRouter.delete('/supervisions/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  await (prisma as any).staffSupervision.deleteMany({ where: { tenant_id: tenantId, id: String(req.params.id) } })
  ok(res, { deleted: true })
})
