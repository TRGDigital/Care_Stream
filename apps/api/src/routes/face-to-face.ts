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
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { notifyStaffAllocation } from '../lib/notify'

export const faceToFaceRouter = Router()

const tid = (req: Request) => (req as any).user.tenant_id
const uid = (req: Request) => (req as any).user.sub
const STATUSES = ['allocated', 'attended', 'absent']

// ─── GET /face-to-face/modules ────────────────────────────────────────────────
// Topic options for the session form: the tenant's own modules plus published
// platform standard modules (the same set that can be assigned as digital training).
faceToFaceRouter.get('/modules', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const modules = await (prisma as any).trainingModule.findMany({
      where:  { is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] },
      select: { id: true, name: true, category: true },
      orderBy: { name: 'asc' },
    })
    // De-duplicate by name (a tenant copy + the standard library can both exist) —
    // prefer the tenant's own copy.
    const seen = new Set<string>()
    const out: any[] = []
    for (const m of modules as any[]) {
      const k = (m.name ?? '').toLowerCase().trim()
      if (seen.has(k)) continue
      seen.add(k); out.push(m)
    }
    ok(res, { modules: out })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// Shape one session row with attendance counts for the calendar.
function summariseSession(s: any) {
  const att = s.attendance ?? []
  return {
    id: s.id,
    module_id: s.module_id,
    title: s.title,
    session_date: s.session_date,
    delivered_by_user_id: s.delivered_by_user_id,
    delivered_by_name: s.delivered_by_name,
    notes: s.notes ?? null,
    allocated: att.length,
    attended: att.filter((a: any) => a.status === 'attended').length,
    absent:   att.filter((a: any) => a.status === 'absent').length,
    unmarked: att.filter((a: any) => a.status === 'allocated').length,
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
      include: { attendance: { select: { status: true } } },
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
      include: { attendance: true },
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
      module_assigned_at: a.module_assigned_at,
    })).sort((a: any, b: any) => a.name.localeCompare(b.name))

    ok(res, {
      session: {
        ...summariseSession(s),
        delivered_by_name_resolved: s.delivered_by_user_id ? (uMap.get(s.delivered_by_user_id)?.name ?? null) : s.delivered_by_name,
        attendance,
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

    const session = await (prisma as any).faceToFaceSession.create({
      data: {
        tenant_id: tenantId,
        module_id: moduleId,
        title: title.slice(0, 200),
        session_date: date,
        delivered_by_user_id: b.delivered_by_user_id ? String(b.delivered_by_user_id) : null,
        delivered_by_name: typeof b.delivered_by_name === 'string' && b.delivered_by_name.trim() ? b.delivered_by_name.trim().slice(0, 160) : null,
        notes: typeof b.notes === 'string' && b.notes.trim() ? b.notes.trim().slice(0, 2000) : null,
        created_by: uid(req),
        attendance: validAttendees.length ? { create: validAttendees.map((id: string) => ({ tenant_id: tenantId, user_id: id })) } : undefined,
      },
    })
    ok(res, { session: { id: session.id } })
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
// body: { marks: [{ user_id, status }] }  — status in allocated|attended|absent
faceToFaceRouter.post('/sessions/:id/attendance', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const marks = Array.isArray(req.body?.marks) ? req.body.marks : []
  try {
    const session = await (prisma as any).faceToFaceSession.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId }, select: { id: true } })
    if (!session) { err(res, 'NOT_FOUND', 'Session not found.', 404); return }

    for (const m of marks) {
      const status = STATUSES.includes(m?.status) ? m.status : null
      if (!status || !m?.user_id) continue
      await (prisma as any).faceToFaceAttendance.updateMany({
        where: { session_id: session.id, user_id: String(m.user_id) },
        data:  { status },
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
      (prisma as any).trainingModule.findFirst({ where: { id: session.module_id, is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] }, select: { id: true, source: true } }),
    ])
    const validUserIds: string[] = (members as any[]).map(m => m.id)
    if (!module) { err(res, 'NO_MODULE', 'The training module is no longer available to assign.', 400); return }
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

    const by_staff = [...byStaff.values()]
      .filter(s => s.missed > 0 || s.assigned > 0)
      .sort((a, b) => (b.missed - a.missed) || (b.assigned_incomplete - a.assigned_incomplete))

    ok(res, {
      summary: { sessions: (sessions as any[]).length, allocations: totalAlloc, attended: totalAttended, missed: totalMissed, modules_assigned: assignedCount, assigned_incomplete: assignedIncomplete },
      by_staff,
    })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})
