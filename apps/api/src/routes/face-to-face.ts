// Face-to-face (group/in-person) training tracking.
//
// Admins log the monthly in-person sessions they run: the topic (a training
// module), the date, who delivered it, and which staff were allocated. Later they
// mark who attended/missed, and can send the digital "my training" module to a
// chosen group (typically those who missed) as a catch-up.
//
// This is a SEPARATE attendance/evidence record — it does not change the digital
// training matrix. Supports backfilling past sessions and planning future ones.

import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { notifyStaffAllocation, getUsers } from '../lib/notify'
import { sendFaceToFaceReminderEmail } from '../services/email/outbound'
import { checkFeature, PlanLimitError } from '../lib/plan-limits'
import { evidenceUploadMiddleware } from '../middleware/upload'
import { uploadEvidenceFile, uploadCertificateFile, downloadFile, deleteFile } from '../services/storage/s3'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'

export const faceToFaceRouter = Router()

// Face-to-face training (and the combined matrix) is a Professional/Enterprise
// feature. Gate the entire router so Starter tenants cannot reach any endpoint.
faceToFaceRouter.use(async (req: Request, res: Response, next) => {
  try { await checkFeature((req as any).user.tenant_id, 'has_face_to_face'); next() }
  catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } next(e) }
})

const tid = (req: Request) => (req as any).user.tenant_id
const uid = (req: Request) => (req as any).user.sub
const STATUSES = ['allocated', 'attended', 'absent']

// A module is "ready to send" only once it has been built: either a scenario lesson
// (learning_content.sections) or at least one question with answer options. Empty
// My Training shells must not be assignable, or staff get an unusable module.
function moduleIsReady(m: any): boolean {
  const hasLesson = Array.isArray(m?.learning_content?.sections) && m.learning_content.sections.length > 0
  const qs = Array.isArray(m?.questions) ? m.questions : []
  const hasUsableQuestion = qs.some((q: any) => q && Array.isArray(q.options) && q.options.length > 0)
  return hasLesson || hasUsableQuestion
}

// ─── GET /face-to-face/modules ────────────────────────────────────────────────
// Topic options for the session form: the tenant's own modules plus published
// platform standard modules (the same set that can be assigned as digital training).
faceToFaceRouter.get('/modules', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const modules = await (prisma as any).trainingModule.findMany({
      where:  { is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] },
      select: { id: true, name: true, category: true, questions: true, learning_content: true },
      orderBy: { name: 'asc' },
    })
    // De-duplicate by name (a tenant copy + the standard library can both exist) —
    // prefer the tenant's own copy. Flag whether each module is built/ready to send.
    const seen = new Set<string>()
    const out: any[] = []
    for (const m of modules as any[]) {
      const k = (m.name ?? '').toLowerCase().trim()
      if (seen.has(k)) continue
      seen.add(k)
      out.push({ id: m.id, name: m.name, category: m.category, ready: moduleIsReady(m) })
    }
    ok(res, { modules: out })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// Shape one session row with attendance counts for the calendar.
// Session length in whole hours, clamped to the 1-5 range the form offers.
function clampDuration(v: any): number {
  const n = Math.round(Number(v))
  return Number.isFinite(n) ? Math.min(5, Math.max(1, n)) : 1
}

// "HH:MM" 24h time, or null.
function cleanTime(v: any): string | null {
  if (typeof v !== 'string') return null
  const m = /^([01]?\d|2[0-3]):([0-5]\d)$/.exec(v.trim())
  return m ? `${m[1].padStart(2, '0')}:${m[2]}` : null
}
// Positive capacity int (cap 999), or null.
function cleanCapacity(v: any): number | null {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? Math.min(999, n) : null
}
function cleanText(v: any, max: number): string | null {
  return typeof v === 'string' && v.trim() ? v.trim().slice(0, max) : null
}
// Renewal period in months (1-60), or null for "no expiry".
function cleanMonths(v: any): number | null {
  const n = Math.round(Number(v))
  return Number.isFinite(n) && n > 0 ? Math.min(60, n) : null
}
// Extract the raw base64 from a data URI. jsPDF emits prefixes like
// "data:application/pdf;filename=generated.pdf;base64,..." (note the extra
// ;filename= segment), so we take everything after the LAST "base64," rather
// than matching a fixed prefix — otherwise the prefix is decoded as bytes and
// the file is corrupt ("Failed to load PDF document").
function dataUriToBase64(s: string): string {
  const i = s.lastIndexOf('base64,')
  return i >= 0 ? s.slice(i + 'base64,'.length) : s
}

// Same calendar day-of-month, n months on (UTC). Clamps to month length (e.g. 31 Jan -> 28/29 Feb).
function addMonthsUTC(d: Date, n: number): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate()
  const target = new Date(Date.UTC(y, m + n, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)))
}

function summariseSession(s: any) {
  const att = s.attendance ?? []
  return {
    id: s.id,
    module_id: s.module_id,
    title: s.title,
    session_date: s.session_date,
    delivered_by_user_id: s.delivered_by_user_id,
    delivered_by_name: s.delivered_by_name,
    duration_hours: s.duration_hours ?? 1,
    start_time: s.start_time ?? null,
    end_time: s.end_time ?? null,
    location: s.location ?? null,
    capacity: s.capacity ?? null,
    series_id: s.series_id ?? null,
    renews_after_months: s.renews_after_months ?? null,
    notes: s.notes ?? null,
    reminder_sent_at: s.reminder_sent_at ?? null,
    allocated: att.length,
    attended: att.filter((a: any) => a.status === 'attended').length,
    absent:   att.filter((a: any) => a.status === 'absent').length,
    unmarked: att.filter((a: any) => a.status === 'allocated').length,
    evidence_count: (s.evidence ?? []).length,
  }
}

// ─── GET /face-to-face/sessions?from=&to= ─────────────────────────────────────
faceToFaceRouter.get('/sessions', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const where: any = { tenant_id: tenantId }
    const from = req.query.from ? new Date(String(req.query.from)) : null
    const to   = req.query.to   ? new Date(String(req.query.to))   : null
    if (from || to) where.session_date = { ...(from ? { gte: from } : {}), ...(to ? { lte: to } : {}) }

    const sessions = await (prisma as any).faceToFaceSession.findMany({
      where, orderBy: { session_date: 'asc' },
      include: { attendance: { select: { status: true } }, evidence: { select: { id: true } } },
    })
    ok(res, { sessions: (sessions as any[]).map(summariseSession) })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── GET /face-to-face/sessions/:id ───────────────────────────────────────────
faceToFaceRouter.get('/sessions/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const s = await (prisma as any).faceToFaceSession.findFirst({
      where: { id: String(req.params.id), tenant_id: tenantId },
      include: { attendance: true, evidence: true },
    })
    if (!s) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }

    // Resolve attendee + trainer names.
    const userIds = [...new Set([...(s.attendance ?? []).map((a: any) => a.user_id), s.delivered_by_user_id].filter(Boolean))]
    const users = userIds.length
      ? await (prisma as any).user.findMany({ where: { id: { in: userIds }, tenant_id: tenantId }, select: { id: true, name: true, job_role: true } })
      : []
    const uMap = new Map((users as any[]).map(u => [u.id, u]))

    const attendance = (s.attendance ?? []).map((a: any) => ({
      user_id: a.user_id,
      name: uMap.get(a.user_id)?.name ?? 'Unknown',
      job_role: uMap.get(a.user_id)?.job_role ?? null,
      status: a.status,
      owed_pay: a.owed_pay,
      competency: a.competency ?? 'not_assessed',
      module_assigned_at: a.module_assigned_at,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))

    const evidence = (s.evidence ?? []).map((e: any) => ({ id: e.id, file_name: e.file_name, file_type: e.file_type, size_bytes: e.size_bytes, scan_status: e.scan_status ?? 'skipped', created_at: e.created_at }))
      .sort((a: any, b: any) => String(b.created_at).localeCompare(String(a.created_at)))

    // Certificates already issued for this session (so the UI can mark who has one).
    const certs = await (prisma as any).faceToFaceCertificate.findMany({ where: { tenant_id: tenantId, session_id: s.id }, select: { id: true, user_id: true, created_at: true } })
    const certByUser: Record<string, { id: string; created_at: Date }> = {}
    for (const c of certs as any[]) certByUser[c.user_id] = { id: c.id, created_at: c.created_at }

    ok(res, {
      session: {
        ...summariseSession(s),
        delivered_by_name_resolved: s.delivered_by_user_id ? (uMap.get(s.delivered_by_user_id)?.name ?? null) : s.delivered_by_name,
        attendance: attendance.map((a: any) => ({ ...a, certificate_id: certByUser[a.user_id]?.id ?? null })),
        evidence,
      },
    })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── POST /face-to-face/sessions ──────────────────────────────────────────────
// body: { module_id?, title?, session_date, delivered_by_user_id?, delivered_by_name?, notes?, attendee_ids? }
faceToFaceRouter.post('/sessions', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const b = req.body ?? {}
  if (!b.session_date) { err(res, 'VALIDATION_ERROR', 'A session date is required.'); return }
  const date = new Date(String(b.session_date))
  if (isNaN(date.getTime())) { err(res, 'VALIDATION_ERROR', 'Invalid session date.'); return }

  try {
    // Snapshot the topic title from the chosen module (or accept a free title).
    let title = typeof b.title === 'string' ? b.title.trim() : ''
    let moduleId: string | null = null
    if (b.module_id) {
      const m = await (prisma as any).trainingModule.findFirst({
        where: { id: String(b.module_id), is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null }] },
        select: { id: true, name: true },
      })
      if (m) { moduleId = m.id; if (!title) title = m.name }
    }
    if (!title) { err(res, 'VALIDATION_ERROR', 'Choose a training topic or enter a title.'); return }

    const attendeeIds: string[] = Array.isArray(b.attendee_ids) ? b.attendee_ids.map(String) : []
    const validAttendees = attendeeIds.length
      ? (await (prisma as any).user.findMany({ where: { id: { in: attendeeIds }, tenant_id: tenantId }, select: { id: true } })).map((u: any) => u.id)
      : []
    // Per-attendee "owed pay" flag for payroll (ticked = attended off shift, owed the hours; default unticked = on shift, not owed).
    const owedPaySet = new Set<string>(Array.isArray(b.owed_pay_ids) ? b.owed_pay_ids.map(String) : [])

    // Optional recurring series: create the first session plus this many further
    // monthly copies (same details + attendees), grouped by a shared series_id.
    const repeatMonths = Math.min(11, Math.max(0, Math.round(Number(b.repeat_monthly)) || 0))
    const seriesId = repeatMonths > 0 ? randomUUID() : null

    const baseData = {
      tenant_id: tenantId,
      module_id: moduleId,
      title: title.slice(0, 200),
      delivered_by_user_id: b.delivered_by_user_id ? String(b.delivered_by_user_id) : null,
      delivered_by_name: cleanText(b.delivered_by_name, 160),
      duration_hours: clampDuration(b.duration_hours),
      start_time: cleanTime(b.start_time),
      end_time: cleanTime(b.end_time),
      location: cleanText(b.location, 160),
      capacity: cleanCapacity(b.capacity),
      series_id: seriesId,
      renews_after_months: cleanMonths(b.renews_after_months),
      notes: cleanText(b.notes, 2000),
      created_by: uid(req),
    }
    const mkAttendance = () => (validAttendees.length
      ? { create: validAttendees.map((id: string) => ({ tenant_id: tenantId, user_id: id, owed_pay: owedPaySet.has(id) })) }
      : undefined)

    const first = await (prisma as any).faceToFaceSession.create({
      data: { ...baseData, session_date: date, attendance: mkAttendance() },
    })
    for (let i = 1; i <= repeatMonths; i++) {
      await (prisma as any).faceToFaceSession.create({
        data: { ...baseData, session_date: addMonthsUTC(date, i), attendance: mkAttendance() },
      })
    }
    ok(res, { session: { id: first.id }, series_count: repeatMonths + 1 })
  } catch (e: any) { err(res, 'CREATE_FAILED', e.message, 500) }
})

// ─── PATCH /face-to-face/sessions/:id ─────────────────────────────────────────
faceToFaceRouter.patch('/sessions/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const b = req.body ?? {}
  try {
    const existing = await (prisma as any).faceToFaceSession.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
    if (!existing) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }

    const data: any = {}
    if (b.session_date !== undefined) { const d = new Date(String(b.session_date)); if (!isNaN(d.getTime())) data.session_date = d }
    if (b.notes !== undefined) data.notes = typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim().slice(0, 2000) : null
    if (b.delivered_by_user_id !== undefined) data.delivered_by_user_id = b.delivered_by_user_id ? String(b.delivered_by_user_id) : null
    if (b.delivered_by_name !== undefined) data.delivered_by_name = typeof b.delivered_by_name === 'string' && b.delivered_by_name.trim() ? b.delivered_by_name.trim().slice(0, 160) : null
    if (b.duration_hours !== undefined) data.duration_hours = clampDuration(b.duration_hours)
    if (b.start_time !== undefined) data.start_time = cleanTime(b.start_time)
    if (b.end_time !== undefined) data.end_time = cleanTime(b.end_time)
    if (b.location !== undefined) data.location = cleanText(b.location, 160)
    if (b.capacity !== undefined) data.capacity = cleanCapacity(b.capacity)
    if (b.renews_after_months !== undefined) data.renews_after_months = cleanMonths(b.renews_after_months)
    if (b.module_id !== undefined) {
      if (b.module_id) {
        const m = await (prisma as any).trainingModule.findFirst({ where: { id: String(b.module_id), is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true } })
        if (m) { data.module_id = m.id; if (typeof b.title !== 'string' || !b.title.trim()) data.title = m.name }
      } else { data.module_id = null }
    }
    if (typeof b.title === 'string' && b.title.trim()) data.title = b.title.trim().slice(0, 200)

    await (prisma as any).faceToFaceSession.update({ where: { id: existing.id }, data })

    // Optionally replace the allocated attendee set (keeps existing rows' statuses).
    if (Array.isArray(b.attendee_ids)) {
      const want = new Set((await (prisma as any).user.findMany({ where: { id: { in: b.attendee_ids.map(String) }, tenant_id: tenantId }, select: { id: true } })).map((u: any) => u.id))
      const current = await (prisma as any).faceToFaceAttendance.findMany({ where: { session_id: existing.id }, select: { user_id: true } })
      const have = new Set((current as any[]).map(c => c.user_id))
      const toAdd = [...want].filter(id => !have.has(id))
      const toRemove = [...have].filter(id => !want.has(id))
      if (toAdd.length) await (prisma as any).faceToFaceAttendance.createMany({ data: toAdd.map(id => ({ tenant_id: tenantId, session_id: existing.id, user_id: id })), skipDuplicates: true })
      if (toRemove.length) await (prisma as any).faceToFaceAttendance.deleteMany({ where: { session_id: existing.id, user_id: { in: toRemove } } })
    }

    // Update the per-attendee owed-pay flags when provided.
    if (Array.isArray(b.owed_pay_ids)) {
      const owedPay = new Set((b.owed_pay_ids as any[]).map(String))
      const rows = await (prisma as any).faceToFaceAttendance.findMany({ where: { session_id: existing.id }, select: { id: true, user_id: true } })
      for (const r of rows as any[]) {
        await (prisma as any).faceToFaceAttendance.update({ where: { id: r.id }, data: { owed_pay: owedPay.has(r.user_id) } })
      }
    }
    ok(res, { updated: true })
  } catch (e: any) { err(res, 'UPDATE_FAILED', e.message, 500) }
})

// ─── DELETE /face-to-face/sessions/:id ────────────────────────────────────────
faceToFaceRouter.delete('/sessions/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const existing = await (prisma as any).faceToFaceSession.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
    if (!existing) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }
    await (prisma as any).faceToFaceSession.delete({ where: { id: existing.id } })
    ok(res, { deleted: true })
  } catch (e: any) { err(res, 'DELETE_FAILED', e.message, 500) }
})

// ─── POST /face-to-face/sessions/:id/attendance ───────────────────────────────
// body: { marks: [{ user_id, status?, competency? }] } — status in allocated|attended|absent;
// competency in not_assessed|competent|not_yet_competent. Either field may be set per mark.
const COMPETENCIES = ['not_assessed', 'competent', 'not_yet_competent']
faceToFaceRouter.post('/sessions/:id/attendance', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const marks = Array.isArray(req.body?.marks) ? req.body.marks : []
  try {
    const session = await (prisma as any).faceToFaceSession.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
    if (!session) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }

    for (const m of marks) {
      if (!m?.user_id) continue
      const data: any = {}
      if (STATUSES.includes(m?.status)) data.status = m.status
      if (COMPETENCIES.includes(m?.competency)) data.competency = m.competency
      if (Object.keys(data).length === 0) continue
      await (prisma as any).faceToFaceAttendance.updateMany({
        where: { session_id: session.id, user_id: String(m.user_id) },
        data,
      })
    }
    ok(res, { updated: true })
  } catch (e: any) { err(res, 'UPDATE_FAILED', e.message, 500) }
})

// ─── POST /face-to-face/sessions/:id/assign-module ────────────────────────────
// Send the session's digital training module to the chosen staff (a catch-up).
// body: { user_ids: [] }
faceToFaceRouter.post('/sessions/:id/assign-module', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const assignedBy = uid(req)
  const userIds: string[] = Array.isArray(req.body?.user_ids) ? req.body.user_ids.map(String) : []
  try {
    const session = await (prisma as any).faceToFaceSession.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true, module_id: true } })
    if (!session) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }
    if (!session.module_id) { err(res, 'NO_MODULE', 'This session has no linked training module to send.', 400); return }
    if (userIds.length === 0) { err(res, 'VALIDATION_ERROR', 'Select at least one staff member.'); return }

    const tier = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
    if (tier?.tier === 'training_only') { err(res, 'TRAINING_ONLY', 'Assign training by allocating a licence on the Licences page.', 403); return }

    // Only this tenant's staff, and only if the module is still assignable.
    const [members, module] = await Promise.all([
      (prisma as any).user.findMany({ where: { id: { in: userIds }, tenant_id: tenantId }, select: { id: true } }),
      (prisma as any).trainingModule.findFirst({ where: { id: session.module_id, is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] }, select: { id: true, source: true, questions: true, learning_content: true } }),
    ])
    const validUserIds: string[] = (members as any[]).map(m => m.id)
    if (!module) { err(res, 'NO_MODULE', 'The training module is no longer available to assign.', 400); return }
    // Block sending a module that hasn't been built yet (no lesson, no usable questions).
    if (!moduleIsReady(module)) { err(res, 'MODULE_NOT_READY', 'This training module hasn\'t been built yet — add a lesson or questions in Training → Modules & Questions before sending it.', 400); return }
    if (validUserIds.length === 0) { err(res, 'VALIDATION_ERROR', 'No valid recipients for this organisation.'); return }

    // Create the missing enrollments (skip those already enrolled and not expired).
    const existing = await (prisma as any).trainingEnrollment.findMany({
      where: { tenant_id: tenantId, user_id: { in: validUserIds }, module_id: module.id, status: { not: 'expired' } },
      select: { user_id: true },
    })
    const have = new Set((existing as any[]).map(e => e.user_id))
    const toCreate = validUserIds.filter(id => !have.has(id))
    if (toCreate.length) {
      await (prisma as any).trainingEnrollment.createMany({
        data: toCreate.map(id => ({ tenant_id: tenantId, user_id: id, module_id: module.id, status: 'not_started', assigned_by: assignedBy })),
        skipDuplicates: true,
      })
    }
    // Mark on the attendance record that they were sent the module off this session.
    await (prisma as any).faceToFaceAttendance.updateMany({
      where: { session_id: session.id, user_id: { in: validUserIds } },
      data:  { module_assigned_at: new Date() },
    })

    // Email the newly-assigned staff a hub link (fire-and-forget).
    if (toCreate.length) {
      const channel = module.source === 'ai_generated' ? 'annual_training' : 'training'
      notifyStaffAllocation(tenantId, toCreate, channel).catch(e => console.error('[face-to-face/assign] staff email error:', e))
    }
    ok(res, { assigned: validUserIds.length, newly_enrolled: toCreate.length })
  } catch (e: any) { err(res, 'ASSIGN_FAILED', e.message, 500) }
})

// ─── POST /face-to-face/sessions/:id/remind ───────────────────────────────────
// Admin-triggered (never automatic): email the allocated staff a reminder that
// they're booked into this session. Optional user_ids to limit who's emailed.
faceToFaceRouter.post('/sessions/:id/remind', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const only: string[] = Array.isArray(req.body?.user_ids) ? req.body.user_ids.map(String) : []
  try {
    const session = await (prisma as any).faceToFaceSession.findFirst({
      where: { id: String(req.params.id), tenant_id: tenantId },
      include: { attendance: { select: { user_id: true } } },
    })
    if (!session) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }

    let recipientIds: string[] = (session.attendance ?? []).map((a: any) => a.user_id)
    if (only.length) recipientIds = recipientIds.filter(id => only.includes(id))
    if (recipientIds.length === 0) { err(res, 'NO_RECIPIENTS', 'No allocated staff to remind.', 400); return }

    const [tenant, users] = await Promise.all([
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null),
      getUsers(recipientIds),
    ])
    // Resolve trainer + date labels for the email.
    const dateLabel = new Date(session.session_date).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
    let trainerLabel: string | null = session.delivered_by_name ?? null
    if (session.delivered_by_user_id) {
      const t = await (prisma as any).user.findUnique({ where: { id: session.delivered_by_user_id }, select: { name: true } }).catch(() => null)
      trainerLabel = t?.name ?? trainerLabel
    }

    await Promise.allSettled((users as any[]).map(u =>
      sendFaceToFaceReminderEmail({ to: u.email, name: u.name, orgName: tenant?.name ?? '', title: session.title, dateLabel, trainerLabel })
        .catch(e => console.error('[face-to-face/remind] email error:', e))
    ))
    await (prisma as any).faceToFaceSession.update({ where: { id: session.id }, data: { reminder_sent_at: new Date() } }).catch(() => {})
    ok(res, { sent: (users as any[]).length, reminder_sent_at: new Date().toISOString() })
  } catch (e: any) { err(res, 'REMIND_FAILED', e.message, 500) }
})

// ─── GET /face-to-face/unmarked ───────────────────────────────────────────────
// Sessions that have already happened (today or earlier) with staff still not
// marked attended or absent — a backfill safety net so admins don't miss anyone.
faceToFaceRouter.get('/unmarked', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const end = new Date(); end.setUTCHours(23, 59, 59, 999)
    const sessions = await (prisma as any).faceToFaceSession.findMany({
      where:  { tenant_id: tenantId, session_date: { lte: end }, attendance: { some: { status: 'allocated' } } },
      select: { id: true, title: true, session_date: true, attendance: { where: { status: 'allocated' }, select: { user_id: true } } },
      orderBy: { session_date: 'desc' },
    })
    const userIds = [...new Set((sessions as any[]).flatMap((s: any) => s.attendance.map((a: any) => a.user_id)))]
    const users = userIds.length
      ? await (prisma as any).user.findMany({ where: { id: { in: userIds }, tenant_id: tenantId }, select: { id: true, name: true, job_role: true } })
      : []
    const uMap = new Map((users as any[]).map(u => [u.id, u]))
    const out = (sessions as any[]).map((s: any) => ({
      id: s.id, title: s.title, session_date: s.session_date,
      people: s.attendance
        .map((a: any) => ({ user_id: a.user_id, name: uMap.get(a.user_id)?.name ?? 'Unknown', job_role: uMap.get(a.user_id)?.job_role ?? null }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name)),
    }))
    ok(res, { sessions: out })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── GET /face-to-face/analytics ──────────────────────────────────────────────
// Per-staff view for the Staff analytics tab: who missed sessions, who was sent the
// digital module as a result, and whether they've completed it.
faceToFaceRouter.get('/analytics', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const [sessions, users] = await Promise.all([
      (prisma as any).faceToFaceSession.findMany({
        where: { tenant_id: tenantId },
        select: { id: true, title: true, module_id: true, session_date: true, attendance: true },
        orderBy: { session_date: 'desc' },
      }),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId }, select: { id: true, name: true, job_role: true } }),
    ])
    const uMap = new Map((users as any[]).map(u => [u.id, u]))

    // Completion of assigned catch-up modules: look up the staff member's enrollment
    // for the session's module.
    const pairs = new Set<string>()
    for (const s of sessions as any[]) {
      if (!s.module_id) continue
      for (const a of s.attendance ?? []) if (a.module_assigned_at) pairs.add(`${a.user_id}:${s.module_id}`)
    }
    const enrByPair = new Map<string, string>()
    if (pairs.size) {
      const userIds = [...new Set([...pairs].map(p => p.split(':')[0]))]
      const modIds  = [...new Set([...sessions as any[]].map(s => s.module_id).filter(Boolean))]
      const enrs = await (prisma as any).trainingEnrollment.findMany({
        where: { tenant_id: tenantId, user_id: { in: userIds }, module_id: { in: modIds } },
        select: { user_id: true, module_id: true, status: true },
      })
      for (const e of enrs as any[]) enrByPair.set(`${e.user_id}:${e.module_id}`, e.status)
    }

    const byStaff = new Map<string, any>()
    let totalAlloc = 0, totalAttended = 0, totalMissed = 0, assignedCount = 0, assignedIncomplete = 0

    for (const s of sessions as any[]) {
      for (const a of s.attendance ?? []) {
        totalAlloc++
        if (a.status === 'attended') totalAttended++
        if (a.status === 'absent')   totalMissed++
        if (!byStaff.has(a.user_id)) {
          const u = uMap.get(a.user_id)
          byStaff.set(a.user_id, { user_id: a.user_id, name: u?.name ?? 'Unknown', job_role: u?.job_role ?? null, allocated: 0, attended: 0, missed: 0, assigned: 0, assigned_incomplete: 0, missed_sessions: [] })
        }
        const st = byStaff.get(a.user_id)
        st.allocated++
        if (a.status === 'attended') st.attended++
        if (a.status === 'absent')   st.missed++
        const assigned = !!a.module_assigned_at
        const completion = s.module_id ? (enrByPair.get(`${a.user_id}:${s.module_id}`) ?? null) : null
        if (assigned) { st.assigned++; assignedCount++; if (completion !== 'complete') { st.assigned_incomplete++; assignedIncomplete++ } }
        if (a.status === 'absent') {
          st.missed_sessions.push({ session_id: s.id, title: s.title, date: s.session_date, module_assigned: assigned, completion })
        }
      }
    }

    // Stored completion certificates: per-staff counts + the recent list.
    const certRows = await (prisma as any).faceToFaceCertificate.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' } })
    const certCountByUser = new Map<string, number>()
    for (const c of certRows as any[]) {
      certCountByUser.set(c.user_id, (certCountByUser.get(c.user_id) ?? 0) + 1)
      if (!byStaff.has(c.user_id)) {
        const u = uMap.get(c.user_id)
        byStaff.set(c.user_id, { user_id: c.user_id, name: u?.name ?? c.user_name, job_role: u?.job_role ?? null, allocated: 0, attended: 0, missed: 0, assigned: 0, assigned_incomplete: 0, missed_sessions: [] })
      }
    }
    for (const st of byStaff.values()) st.certificates = certCountByUser.get(st.user_id) ?? 0

    const by_staff = [...byStaff.values()]
      .filter(s => s.missed > 0 || s.assigned > 0 || s.certificates > 0)
      .sort((a, b) => (b.missed - a.missed) || (b.assigned_incomplete - a.assigned_incomplete) || (b.certificates - a.certificates))

    const certificates = (certRows as any[]).map(c => ({ id: c.id, user_id: c.user_id, user_name: c.user_name, title: c.title, session_date: c.session_date, competency: c.competency, created_at: c.created_at }))

    ok(res, {
      summary: { sessions: (sessions as any[]).length, allocations: totalAlloc, attended: totalAttended, missed: totalMissed, modules_assigned: assignedCount, assigned_incomplete: assignedIncomplete, certificates: certRows.length },
      by_staff,
      certificates,
    })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── GET /face-to-face/training-month?month=YYYY-MM ───────────────────────────
// Unified month view: F2F sessions (with per-attendee owed_pay) + adhoc + annual
// training allocated and/or completed in the month. Powers the calendar overlay
// and the payroll PDF.
faceToFaceRouter.get('/training-month', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  // Explicit date range (YYYY-MM-DD..YYYY-MM-DD, inclusive) takes precedence; this
  // powers the weekly payroll option. Otherwise fall back to a whole month.
  const fromM = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(req.query.from ?? ''))
  const toM   = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(req.query.to ?? ''))
  const mm = /^(\d{4})-(\d{2})$/.exec(String(req.query.month ?? ''))
  const now = new Date()
  const y  = mm ? +mm[1] : now.getUTCFullYear()
  const mo = mm ? +mm[2] - 1 : now.getUTCMonth()
  let start: Date, end: Date, periodLabel: string
  if (fromM && toM) {
    start = new Date(Date.UTC(+fromM[1], +fromM[2] - 1, +fromM[3]))
    end   = new Date(Date.UTC(+toM[1], +toM[2] - 1, +toM[3] + 1))   // inclusive of the 'to' day
    periodLabel = `${req.query.from}..${req.query.to}`
  } else {
    start = new Date(Date.UTC(y, mo, 1))
    end   = new Date(Date.UTC(y, mo + 1, 1))
    periodLabel = `${y}-${String(mo + 1).padStart(2, '0')}`
  }
  try {
    const [sessions, enrollments] = await Promise.all([
      (prisma as any).faceToFaceSession.findMany({ where: { tenant_id: tenantId, session_date: { gte: start, lt: end } }, include: { attendance: true }, orderBy: { session_date: 'asc' } }),
      (prisma as any).trainingEnrollment.findMany({
        where: { tenant_id: tenantId, OR: [{ created_at: { gte: start, lt: end } }, { completed_at: { gte: start, lt: end } }] },
        include: { module: { select: { name: true, source: true } } },
      }),
    ])
    const userIds = new Set<string>()
    for (const s of sessions as any[]) for (const a of (s.attendance ?? [])) userIds.add(a.user_id)
    for (const e of enrollments as any[]) userIds.add(e.user_id)
    const users = userIds.size ? await (prisma as any).user.findMany({ where: { id: { in: [...userIds] }, tenant_id: tenantId }, select: { id: true, name: true, job_role: true, training_hourly_rate: true } }) : []
    const uMap = new Map((users as any[]).map(u => [u.id, u]))
    const nm = (id: string) => uMap.get(id)?.name ?? 'Unknown'
    const rate = (id: string) => uMap.get(id)?.training_hourly_rate ?? null   // GBP pence or null

    const f2f = (sessions as any[]).map(s => ({
      session_id: s.id, date: s.session_date, title: s.title, duration_hours: s.duration_hours ?? 1,
      start_time: s.start_time ?? null, end_time: s.end_time ?? null, location: s.location ?? null,
      attendees: (s.attendance ?? []).map((a: any) => ({ user_id: a.user_id, name: nm(a.user_id), status: a.status, owed_pay: a.owed_pay, hourly_rate: rate(a.user_id) })).sort((a: any, b: any) => a.name.localeCompare(b.name)),
    }))
    const adhoc: any[] = [], annual: any[] = []
    for (const e of enrollments as any[]) {
      const row = { user_id: e.user_id, name: nm(e.user_id), title: e.module?.name ?? 'Training', allocated_at: e.created_at, completed_at: e.completed_at, status: e.status }
      if (e.module?.source === 'ai_generated') annual.push(row); else adhoc.push(row)
    }
    const sortRows = (a: any, b: any) => a.name.localeCompare(b.name) || a.title.localeCompare(b.title)
    ok(res, { month: `${y}-${String(mo + 1).padStart(2, '0')}`, period: periodLabel, f2f, adhoc: adhoc.sort(sortRows), annual: annual.sort(sortRows) })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── POST /face-to-face/payroll/email ─────────────────────────────────────────
// body: { to, month_label, pdf_base64 } — emails the generated PDF as an attachment.
faceToFaceRouter.post('/payroll/email', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const to        = String(req.body?.to ?? '').trim().toLowerCase()
  const monthLabel = String(req.body?.month_label ?? '').trim().slice(0, 40) || 'the selected month'
  const pdfBase64 = String(req.body?.pdf_base64 ?? '')
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { err(res, 'INVALID', 'A valid email address is required.', 400); return }
  if (!pdfBase64 || pdfBase64.length < 100) { err(res, 'INVALID', 'No PDF to send.', 400); return }
  try {
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const { sendF2FPayrollEmail } = await import('../services/email/outbound')
    await sendF2FPayrollEmail({ to, orgName: tenant?.name ?? 'Your service', monthLabel, pdfBase64: dataUriToBase64(pdfBase64) })
    ok(res, { sent: to })
  } catch (e: any) { err(res, 'SEND_FAILED', e?.message ?? 'Could not send the report.', 500) }
})

// ─── GET /face-to-face/matrix ─────────────────────────────────────────────────
// Compliance grid: each active staff member x each training topic, with a RAG
// status from their latest ATTENDED session and that topic's renewal period.
//   in_date  — attended and still valid (or no expiry set)
//   due_soon — valid but expires within 60 days
//   overdue  — past its renewal date
//   missing  — never attended a topic that's MANDATORY for their role
//   none     — never attended, not mandatory for their role
faceToFaceRouter.get('/matrix', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const [sessions, staff, mandatory] = await Promise.all([
      (prisma as any).faceToFaceSession.findMany({
        where: { tenant_id: tenantId },
        select: { module_id: true, title: true, session_date: true, renews_after_months: true,
                  attendance: { where: { status: 'attended' }, select: { user_id: true } } },
      }),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true, is_reviewer: false }, select: { id: true, name: true, job_role: true } }),
      (prisma as any).faceToFaceMandatory.findMany({ where: { tenant_id: tenantId } }),
    ])

    const topicKey = (module_id: string | null, title: string) => module_id ?? `t:${(title || '').trim().toLowerCase()}`
    const topicMeta = new Map<string, { label: string; module_id: string | null; latest: number }>()
    // best.get(userId).get(topicKey) = { date, renews }
    const best = new Map<string, Map<string, { date: Date; renews: number | null }>>()

    for (const s of sessions as any[]) {
      const key = topicKey(s.module_id, s.title)
      const ts = new Date(s.session_date).getTime()
      const meta = topicMeta.get(key)
      if (!meta || ts > meta.latest) topicMeta.set(key, { label: s.title || 'Training', module_id: s.module_id ?? null, latest: ts })
      for (const a of (s.attendance ?? [])) {
        let m = best.get(a.user_id); if (!m) { m = new Map(); best.set(a.user_id, m) }
        const cur = m.get(key)
        if (!cur || ts > cur.date.getTime()) m.set(key, { date: new Date(s.session_date), renews: s.renews_after_months ?? null })
      }
    }

    // Mandatory modules become topics too (so a never-run requirement still shows a column).
    const mandatoryByRole = new Map<string, Set<string>>()
    for (const m of mandatory as any[]) {
      if (!topicMeta.has(m.module_id)) topicMeta.set(m.module_id, { label: m.module_name, module_id: m.module_id, latest: 0 })
      let set = mandatoryByRole.get(m.job_role); if (!set) { set = new Set(); mandatoryByRole.set(m.job_role, set) }
      set.add(m.module_id)
    }

    const topics = [...topicMeta.entries()].map(([key, v]) => ({ key, label: v.label, module_id: v.module_id }))
      .sort((a, b) => a.label.localeCompare(b.label))

    const now = Date.now()
    const SOON_MS = 60 * 24 * 3600 * 1000
    const cellFor = (userId: string, t: { key: string; module_id: string | null }, jobRole: string | null) => {
      const rec = best.get(userId)?.get(t.key)
      if (rec) {
        if (rec.renews == null) return { topic_key: t.key, status: 'in_date', last_date: rec.date, valid_until: null }
        const validUntil = addMonthsUTC(rec.date, rec.renews)
        const vt = validUntil.getTime()
        const status = vt < now ? 'overdue' : (vt - now <= SOON_MS ? 'due_soon' : 'in_date')
        return { topic_key: t.key, status, last_date: rec.date, valid_until: validUntil }
      }
      const required = !!(t.module_id && mandatoryByRole.get(jobRole || '')?.has(t.module_id))
      return { topic_key: t.key, status: required ? 'missing' : 'none', last_date: null, valid_until: null }
    }

    const rows = (staff as any[])
      .map(u => ({ user_id: u.id, name: u.name, job_role: u.job_role ?? null, cells: topics.map(t => cellFor(u.id, t, u.job_role)) }))
      .sort((a, b) => a.name.localeCompare(b.name))

    let overdue = 0, due_soon = 0, missing = 0
    for (const r of rows) for (const c of r.cells) { if (c.status === 'overdue') overdue++; else if (c.status === 'due_soon') due_soon++; else if (c.status === 'missing') missing++ }

    ok(res, {
      topics, staff: rows,
      mandatory: (mandatory as any[]).map(m => ({ id: m.id, job_role: m.job_role, module_id: m.module_id, module_name: m.module_name })),
      summary: { overdue, due_soon, missing },
    })
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not build the matrix.', 500) }
})

// ─── GET/PUT /face-to-face/mandatory ──────────────────────────────────────────
// Mandatory-training-by-role config. PUT replaces the whole set.
faceToFaceRouter.get('/mandatory', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const items = await (prisma as any).faceToFaceMandatory.findMany({ where: { tenant_id: tenantId }, orderBy: [{ job_role: 'asc' }, { module_name: 'asc' }] })
    ok(res, { items: (items as any[]).map(m => ({ id: m.id, job_role: m.job_role, module_id: m.module_id, module_name: m.module_name })) })
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message, 500) }
})

faceToFaceRouter.put('/mandatory', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const raw = Array.isArray(req.body?.items) ? req.body.items : []
  try {
    // Validate the referenced modules and snapshot their names. Dedupe by role+module.
    const moduleIds = [...new Set(raw.map((r: any) => String(r.module_id)).filter(Boolean))]
    const modules = moduleIds.length
      ? await (prisma as any).trainingModule.findMany({ where: { id: { in: moduleIds }, OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true } })
      : []
    const nameById = new Map((modules as any[]).map(m => [m.id, m.name]))
    const seen = new Set<string>()
    const rows: any[] = []
    for (const r of raw) {
      const job_role = String(r.job_role ?? '').trim().slice(0, 100)
      const module_id = String(r.module_id ?? '')
      if (!job_role || !nameById.has(module_id)) continue
      const k = `${job_role}::${module_id}`
      if (seen.has(k)) continue
      seen.add(k)
      rows.push({ tenant_id: tenantId, job_role, module_id, module_name: nameById.get(module_id) })
    }
    await (prisma as any).$transaction([
      (prisma as any).faceToFaceMandatory.deleteMany({ where: { tenant_id: tenantId } }),
      ...(rows.length ? [(prisma as any).faceToFaceMandatory.createMany({ data: rows })] : []),
    ])
    ok(res, { count: rows.length })
  } catch (e: any) { err(res, 'SAVE_FAILED', e?.message ?? 'Could not save.', 500) }
})

// ─── Session evidence files (CQC: signed sheets, photos, trainer certs) ───────
// Hard cap on files per session (abuse / storage-bomb guard).
const MAX_EVIDENCE_PER_SESSION = 40

// Content sniffing: validate the ACTUAL bytes, never trust the browser-reported
// MIME or the filename extension. We only ever accept PDF + raster images, and we
// store/serve the canonical type we detected here. This blocks disguised payloads
// (e.g. an HTML/SVG/script file renamed .png) that could otherwise become stored
// XSS when served back from the API origin.
function detectEvidenceType(buf: Buffer): { mime: string; ext: string } | null {
  const b = buf
  const ascii = (i: number, s: string) => s.split('').every((c, k) => b[i + k] === c.charCodeAt(0))
  if (b.length >= 5 && ascii(0, '%PDF-')) return { mime: 'application/pdf', ext: 'pdf' }
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { mime: 'image/jpeg', ext: 'jpg' }
  if (b.length >= 8 && b[0] === 0x89 && ascii(1, 'PNG') && b[4] === 0x0d && b[5] === 0x0a && b[6] === 0x1a && b[7] === 0x0a) return { mime: 'image/png', ext: 'png' }
  if (b.length >= 6 && (ascii(0, 'GIF87a') || ascii(0, 'GIF89a'))) return { mime: 'image/gif', ext: 'gif' }
  if (b.length >= 12 && ascii(0, 'RIFF') && ascii(8, 'WEBP')) return { mime: 'image/webp', ext: 'webp' }
  if (b.length >= 12 && ascii(4, 'ftyp')) {
    const brand = b.toString('ascii', 8, 12)
    if (['heic', 'heix', 'heif', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1'].includes(brand)) return { mime: 'image/heic', ext: 'heic' }
  }
  return null
}

// POST /face-to-face/sessions/:id/evidence  (multipart: field "file")
faceToFaceRouter.post('/sessions/:id/evidence', requireAdmin, evidenceUploadMiddleware, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No file was uploaded.', 400); return }
  try {
    const session = await (prisma as any).faceToFaceSession.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
    if (!session) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }

    // Validate the real file content. Reject anything that isn't a genuine PDF/image,
    // regardless of the extension or claimed MIME the browser sent.
    const detected = detectEvidenceType(file.buffer)
    if (!detected) { err(res, 'INVALID_FILE', 'That file is not a valid PDF or image, so it was not uploaded.', 400); return }

    const count = await (prisma as any).faceToFaceEvidence.count({ where: { session_id: session.id } })
    if (count >= MAX_EVIDENCE_PER_SESSION) { err(res, 'TOO_MANY', `A session can hold up to ${MAX_EVIDENCE_PER_SESSION} evidence files. Delete some first.`, 400); return }

    // Malware scan (Cloudmersive when configured). Infected -> reject; if the scanner
    // is configured but errors -> fail closed (don't store an unscanned file).
    const scan = await scanBuffer(file.buffer, file.originalname)
    if (scan.status === 'infected') { err(res, 'MALWARE_DETECTED', 'That file was flagged by the malware scanner and was not uploaded.', 400); return }
    if (scan.status === 'error' && scannerConfigured()) { err(res, 'SCAN_FAILED', 'The file could not be virus-scanned just now, so it was not uploaded. Please try again.', 503); return }

    const key = `${randomUUID()}.${detected.ext}`
    const s3Key = await uploadEvidenceFile({ tenantId, sessionId: session.id, key, buffer: file.buffer, mimeType: detected.mime })
    const ev = await (prisma as any).faceToFaceEvidence.create({
      data: { tenant_id: tenantId, session_id: session.id, s3_key: s3Key, file_name: file.originalname.slice(0, 200), file_type: detected.mime, size_bytes: file.size ?? 0, scan_status: scan.status === 'clean' ? 'clean' : 'skipped', uploaded_by: uid(req) },
    })
    ok(res, { evidence: { id: ev.id, file_name: ev.file_name, file_type: ev.file_type, size_bytes: ev.size_bytes, scan_status: ev.scan_status, created_at: ev.created_at } })
  } catch (e: any) { err(res, 'UPLOAD_FAILED', e?.message ?? 'Could not upload the file.', 500) }
})

// GET /face-to-face/evidence/:id  — authenticated stream of the file
const SAFE_EVIDENCE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/heic'])
faceToFaceRouter.get('/evidence/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const ev = await (prisma as any).faceToFaceEvidence.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!ev) { err(res, 'NOT_FOUND', 'File not found.', 404); return }
    const buf = await downloadFile(ev.s3_key)
    // Only ever advertise a known-safe content type; never echo a stored value that
    // might have been set before validation existed. Lock the browser down so even a
    // hypothetical bad byte stream cannot execute: no sniffing, sandboxed, no scripts.
    const type = SAFE_EVIDENCE_TYPES.has(ev.file_type) ? ev.file_type : 'application/octet-stream'
    res.setHeader('Content-Type', type)
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; object-src 'self'")
    res.setHeader('Cache-Control', 'private, no-store')
    // Images/PDF can preview inline; anything else is forced to download.
    const disposition = type === 'application/octet-stream' ? 'attachment' : 'inline'
    res.setHeader('Content-Disposition', `${disposition}; filename="${ev.file_name.replace(/[^a-zA-Z0-9._\- ]/g, '_')}"`)
    res.send(buf)
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not fetch the file.', 500) }
})

// DELETE /face-to-face/evidence/:id
faceToFaceRouter.delete('/evidence/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const ev = await (prisma as any).faceToFaceEvidence.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!ev) { err(res, 'NOT_FOUND', 'File not found.', 404); return }
    await deleteFile(ev.s3_key)
    await (prisma as any).faceToFaceEvidence.delete({ where: { id: ev.id } })
    ok(res, { deleted: true })
  } catch (e: any) { err(res, 'DELETE_FAILED', e?.message ?? 'Could not delete the file.', 500) }
})

// ─── Stored completion certificates ───────────────────────────────────────────
// POST /face-to-face/sessions/:id/certificate  body: { user_id, pdf_base64 }
// Issues (stores) a certificate for one attendee. The PDF is generated in the
// browser; we only store it once the person is marked ATTENDED (server-enforced).
faceToFaceRouter.post('/sessions/:id/certificate', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const userId = String(req.body?.user_id ?? '')
  const pdfBase64 = dataUriToBase64(String(req.body?.pdf_base64 ?? ''))
  if (!userId) { err(res, 'VALIDATION_ERROR', 'A staff member is required.', 400); return }
  if (!pdfBase64 || pdfBase64.length < 100) { err(res, 'INVALID', 'No certificate to store.', 400); return }
  try {
    const session = await (prisma as any).faceToFaceSession.findFirst({
      where: { id: String(req.params.id), tenant_id: tenantId },
      include: { attendance: { where: { user_id: userId } } },
    })
    if (!session) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }
    const att = (session.attendance ?? [])[0]
    if (!att) { err(res, 'NOT_ALLOCATED', 'That staff member was not allocated to this session.', 400); return }
    if (att.status !== 'attended') { err(res, 'NOT_ATTENDED', 'A certificate can only be issued once the staff member is marked as attended.', 400); return }

    const user = await (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { name: true } })
    const buffer = Buffer.from(pdfBase64, 'base64')

    // One certificate per person per session: replace any existing one.
    const existing = await (prisma as any).faceToFaceCertificate.findFirst({ where: { tenant_id: tenantId, session_id: session.id, user_id: userId } })
    const id = existing?.id ?? randomUUID()
    const s3Key = await uploadCertificateFile({ tenantId, certificateId: id, buffer })
    const fileName = `${(session.title || 'training').replace(/[^a-zA-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 80)}-certificate.pdf`
    const dataFields = {
      tenant_id: tenantId, session_id: session.id, user_id: userId,
      user_name: user?.name ?? 'Staff member', title: session.title, session_date: session.session_date,
      competency: att.competency ?? 'not_assessed', s3_key: s3Key, file_name: fileName, issued_by: uid(req),
    }
    if (existing) await (prisma as any).faceToFaceCertificate.update({ where: { id }, data: dataFields })
    else await (prisma as any).faceToFaceCertificate.create({ data: { id, ...dataFields } })

    ok(res, { certificate: { id, user_id: userId, title: session.title } })
  } catch (e: any) { err(res, 'ISSUE_FAILED', e?.message ?? 'Could not store the certificate.', 500) }
})

// GET /face-to-face/certificates?user_id=&limit=  — list stored certificates
faceToFaceRouter.get('/certificates', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const userId = req.query.user_id ? String(req.query.user_id) : null
  const limit = Math.min(500, Math.max(1, Number(req.query.limit) || 200))
  try {
    const where: any = { tenant_id: tenantId }
    if (userId) where.user_id = userId
    const rows = await (prisma as any).faceToFaceCertificate.findMany({ where, orderBy: { created_at: 'desc' }, take: limit })
    ok(res, { certificates: (rows as any[]).map(c => ({ id: c.id, user_id: c.user_id, user_name: c.user_name, title: c.title, session_date: c.session_date, competency: c.competency, file_name: c.file_name, created_at: c.created_at })) })
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not load certificates.', 500) }
})

// GET /face-to-face/certificate/:id  — authenticated PDF stream
faceToFaceRouter.get('/certificate/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const c = await (prisma as any).faceToFaceCertificate.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!c) { err(res, 'NOT_FOUND', 'Certificate not found.', 404); return }
    const buf = await downloadFile(c.s3_key)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; object-src 'self'")
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Disposition', `inline; filename="${c.file_name.replace(/[^a-zA-Z0-9._\- ]/g, '_')}"`)
    res.send(buf)
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not fetch the certificate.', 500) }
})

// DELETE /face-to-face/certificate/:id
faceToFaceRouter.delete('/certificate/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const c = await (prisma as any).faceToFaceCertificate.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!c) { err(res, 'NOT_FOUND', 'Certificate not found.', 404); return }
    await deleteFile(c.s3_key)
    await (prisma as any).faceToFaceCertificate.delete({ where: { id: c.id } })
    ok(res, { deleted: true })
  } catch (e: any) { err(res, 'DELETE_FAILED', e?.message ?? 'Could not delete the certificate.', 500) }
})
