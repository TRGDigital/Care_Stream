// Holiday tracking and booking (PILOT: account CS-1001 only, see lib/holiday-pilot.ts; every route but /meta answers 404 for any other account).
//   /holiday/meta                          who am I here: switched on, admin, can decide, settings the hub needs
//   /holiday/me, POST /holiday/requests    my balance and requests; ask for days; cancel a pending request
//   /holiday/approvals + decisions         the approver's list with who else is off; approve, reject, edit or remove an approved booking
//   /holiday/admin/...                     administrators: matrix, calendar, settings, per person details (pay rates), import
// Staff and approvers use the same routes as the admin page for decisions; the approver check follows the policy approvals pattern (admins always,
// managers when 'Manager approval' is on in Settings). Pay rates are administrators only and never leave the /holiday/admin routes.
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { holidayPilotEnabled } from '../lib/holiday-pilot'
import {
  addDays, bankMultiplier, BANK_MULTIPLIERS, clashesFor, defaultDayHours, parseImportCsv, ukToday, validateDays, yearContaining, yearRange, MAX_HOURS_PER_DAY, type DayRow, type OffRow,
} from '../lib/holiday-math'
import {
  approvedDays, approversFor, audit, bankHolidaysWithPay, buildMatrix, canDecide, holidayTablesReady, isMissingTable, loadRoster, loadSettings, personBalance, postHubMessage,
  type HolidaySettingsView,
} from '../lib/holiday-data'
import { holidayMessage, hoursLabel, HOLIDAY_NOTE_MAX, type HolidayEmailKind } from '../services/email/holiday-content'
import { sendHolidayEmail } from '../services/email/outbound'

const p = () => prisma as any
const tenantOf = (req: Request): string => (req as any).user.tenant_id
const userOf = (req: Request): string => (req as any).user.sub
const roleOf = (req: Request): string => (req as any).user.role
const notReady = (res: Response) => err(res, 'NOT_SET_UP', 'Holiday tracking is not switched on yet.', 503)
const iso = (d: any) => (d ? new Date(d).toISOString() : null)
const ymd = (d: any) => new Date(d).toISOString().slice(0, 10)
const note = (v: unknown) => { const t = String(v ?? '').replace(/\s+\n/g, '\n').trim(); return t ? t.slice(0, HOLIDAY_NOTE_MAX) : null }
const dayDate = (s: string) => new Date(s + 'T00:00:00Z')

export const holidayRouter = Router()

// ── Who am I here ────────────────────────────────────────────────────────────────────────
holidayRouter.get('/meta', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  if (!(await holidayPilotEnabled(tenantId))) { ok(res, { enabled: false }); return }
  const settings = await loadSettings(tenantId)
  const decide = await canDecide(tenantId, userOf(req), roleOf(req), settings)
  let pending = 0, ready = true
  try { if (decide) pending = await p().holidayRequest.count({ where: { tenant_id: tenantId, status: 'pending' } }) } catch { ready = false }
  if (ready) ready = await holidayTablesReady()
  ok(res, {
    enabled: true, ready, is_admin: roleOf(req) === 'admin', can_decide: decide, pending_count: pending,
    max_hours_per_day: MAX_HOURS_PER_DAY, today: ukToday(),
    settings: { year_start: settings.year_start, carry_over: settings.carry_over, manager_approval: settings.manager_approval },
  })
})

// Everything below is the pilot only (404 for any other account).
export async function pilotGate(req: Request, res: Response, next: NextFunction) {
  try { if (!(await holidayPilotEnabled(tenantOf(req)))) { err(res, 'NOT_FOUND', 'Not found.', 404); return } next() } catch { err(res, 'NOT_FOUND', 'Not found.', 404) }
}
holidayRouter.use(pilotGate)

// ── Shapes ───────────────────────────────────────────────────────────────────────────────
function shapeRequest(r: any, days: any[], names: Map<string, string>) {
  const ds = days.filter(d => d.request_id === r.id).map(d => ({ day: ymd(d.day), hours: Number(d.hours) })).sort((a, b) => a.day.localeCompare(b.day))
  return {
    id: r.id, user_id: r.user_id, name: names.get(r.user_id) ?? 'Former member of staff', status: r.status, total_hours: Number(r.total_hours), total_days: r.total_days,
    note: r.note ?? null, decision_note: r.decision_note ?? null, source: r.source, requested_at: iso(r.requested_at), decided_by_name: r.decided_by_name ?? null, decided_at: iso(r.decided_at),
    days: ds, from: ds[0]?.day ?? null, to: ds[ds.length - 1]?.day ?? null,
  }
}
async function loadRequests(tenantId: string, where: Record<string, unknown>, take = 200) {
  const reqs = await p().holidayRequest.findMany({ where: { tenant_id: tenantId, ...where }, orderBy: { requested_at: 'desc' }, take })
  const days = reqs.length ? await p().holidayDay.findMany({ where: { request_id: { in: reqs.map((r: any) => r.id) } } }) : []
  const users = await p().user.findMany({ where: { id: { in: [...new Set(reqs.map((r: any) => r.user_id))] as string[] }, tenant_id: tenantId }, select: { id: true, name: true } })
  const names = new Map<string, string>(users.map((u: any) => [u.id, u.name]))
  return reqs.map((r: any) => shapeRequest(r, days, names))
}
const labelFor = (unit: 'hours' | 'days', hours: number, days: number) => hoursLabel(hours, unit, days)

/** Who else is off (approved) or has asked (pending) on the given days, for the approver's decision. */
async function othersFor(tenantId: string, days: string[], excludeRequestId?: string): Promise<OffRow[]> {
  if (!days.length) return []
  const rows = await p().holidayDay.findMany({ where: { tenant_id: tenantId, status: { in: ['approved', 'pending'] }, day: { in: days.map(dayDate) }, ...(excludeRequestId ? { request_id: { not: excludeRequestId } } : {}) }, select: { user_id: true, day: true, hours: true, status: true } })
  const users = await p().user.findMany({ where: { id: { in: [...new Set(rows.map((r: any) => r.user_id))] as string[] }, tenant_id: tenantId }, select: { id: true, name: true } })
  const names = new Map<string, string>(users.map((u: any) => [u.id, u.name]))
  return rows.map((r: any) => ({ day: ymd(r.day), user_id: r.user_id, name: names.get(r.user_id) ?? 'A colleague', status: r.status, hours: Number(r.hours) }))
}

async function orgName(tenantId: string) { return (await p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } }))?.name ?? 'Your service' }

/** Email and hub message for a decision or a change (never throws). */
async function tellPerson(o: { tenantId: string; kind: Exclude<HolidayEmailKind, 'requested'>; request: any; days: DayRow[]; approver: { id: string; name: string }; unit: 'hours' | 'days'; note: string | null }) {
  try {
    const person = await p().user.findFirst({ where: { id: o.request.user_id, tenant_id: o.tenantId }, select: { id: true, name: true, email: true } })
    if (!person) return
    const total = labelFor(o.unit, o.days.reduce((s, d) => s + d.hours, 0), o.days.length)
    const input = { kind: o.kind, personName: person.name, approverName: o.approver.name, days: o.days.map(d => d.day), totalLabel: total, note: o.note }
    const msg = holidayMessage(input)
    await postHubMessage({ tenantId: o.tenantId, fromUserId: o.approver.id, fromName: o.approver.name, toUserId: person.id, title: msg.title, body: msg.body })
    if (person.email) await sendHolidayEmail({ to: person.email, name: person.name, orgName: await orgName(o.tenantId), actorUserId: o.approver.id, ...input }).catch((e: any) => console.error('[holiday] email failed:', String(e?.message ?? e).slice(0, 120)))
  } catch (e: any) { console.error('[holiday] could not tell the person:', String(e?.message ?? e).slice(0, 120)) }
}

// ── Me (any signed in person) ────────────────────────────────────────────────────────────
holidayRouter.get('/me', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req), userId = userOf(req)
  try {
    const settings = await loadSettings(tenantId)
    const roster = (await loadRoster(tenantId)).find(r => r.id === userId)
    if (!roster) { ok(res, { tracked: false }); return }
    const today = ukToday()
    const year = Number(req.query.year) || yearContaining(today, settings.year_start.month, settings.year_start.day)
    const { range, balance } = await personBalance(tenantId, roster, year, settings, today)
    const requests = await loadRequests(tenantId, { user_id: userId }, 100)
    const upcoming = requests.filter(r => r.status === 'approved').flatMap(r => r.days.filter(d => d.day > today).map(d => ({ ...d, request_id: r.id }))).sort((a, b) => a.day.localeCompare(b.day)).slice(0, 30)
    ok(res, {
      tracked: true, unit: roster.unit, year, label: range.label, from: range.from, to: range.to, balance, default_hours: defaultDayHours(roster.contracted),
      requests, upcoming, bank_holidays: bankHolidaysWithPay(settings, range.from, range.to), today,
    })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load your holidays.', 500) }
})

async function overlapError(tenantId: string, userId: string, days: string[], exceptRequestId?: string): Promise<string | null> {
  const rows = await p().holidayDay.findMany({ where: { tenant_id: tenantId, user_id: userId, status: { in: ['approved', 'pending'] }, day: { in: days.map(dayDate) }, ...(exceptRequestId ? { request_id: { not: exceptRequestId } } : {}) }, select: { day: true } })
  return rows.length ? `You already have holiday on ${rows.map((r: any) => ymd(r.day)).sort().slice(0, 3).join(', ')}${rows.length > 3 ? ' and more' : ''}.` : null
}

async function createRequest(o: { tenantId: string; userId: string; days: DayRow[]; note: string | null; source: 'hub' | 'admin' | 'import'; status: 'pending' | 'approved'; actor: { id: string; name: string } }) {
  const total = o.days.reduce((s, d) => s + d.hours, 0)
  const r = await p().holidayRequest.create({ data: {
    tenant_id: o.tenantId, user_id: o.userId, status: o.status, total_hours: total, total_days: o.days.length, note: o.note, source: o.source, created_by: o.actor.id,
    ...(o.status === 'approved' ? { decided_by: o.actor.id, decided_by_name: o.actor.name, decided_at: new Date() } : {}),
  } })
  await p().holidayDay.createMany({ data: o.days.map(d => ({ request_id: r.id, tenant_id: o.tenantId, user_id: o.userId, day: dayDate(d.day), hours: d.hours, status: o.status })), skipDuplicates: true })
  return r
}

holidayRouter.post('/requests', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req), userId = userOf(req)
  try {
    const settings = await loadSettings(tenantId)
    const roster = await loadRoster(tenantId)
    const me = roster.find(r => r.id === userId)
    if (!me) { err(res, 'FORBIDDEN', 'Your holiday is not tracked here.', 403); return }
    const v = validateDays(req.body?.days, { today: ukToday() })
    if (!v.ok) { err(res, 'INVALID', v.error, 400); return }
    const clash = await overlapError(tenantId, userId, v.days.map(d => d.day))
    if (clash) { err(res, 'OVERLAP', clash, 409); return }
    const actor = { id: userId, name: me.name }
    const r = await createRequest({ tenantId, userId, days: v.days, note: note(req.body?.note), source: 'hub', status: 'pending', actor })
    audit(tenantId, userId, 'holiday_requested', r.id, { days: v.days.length, hours: v.total_hours })
    // Tell the people who decide (never blocks the request).
    void (async () => {
      try {
        const total = labelFor(me.unit, v.total_hours, v.days.length)
        const org = await orgName(tenantId)
        for (const a of await approversFor(tenantId, settings, userId)) {
          await sendHolidayEmail({ to: a.email, name: a.name, orgName: org, actorUserId: userId, kind: 'requested', personName: me.name, approverName: a.name, days: v.days.map(d => d.day), totalLabel: total, note: note(req.body?.note) }).catch(() => undefined)
        }
      } catch { /* the request is saved; the email is a courtesy */ }
    })()
    ok(res, { id: r.id, status: 'pending', total_hours: v.total_hours, days: v.days.length }, 201)
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save your request.', 500) }
})

holidayRouter.post('/requests/:id/cancel', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req), userId = userOf(req)
  try {
    const r = await p().holidayRequest.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId, user_id: userId } })
    if (!r) { err(res, 'NOT_FOUND', 'Request not found.', 404); return }
    if (r.status !== 'pending') { err(res, 'NOT_PENDING', 'Only a request that is still waiting can be cancelled. Ask your manager about approved holiday.', 409); return }
    await p().holidayRequest.update({ where: { id: r.id }, data: { status: 'cancelled', decided_at: new Date() } })
    await p().holidayDay.updateMany({ where: { request_id: r.id }, data: { status: 'cancelled' } })
    audit(tenantId, userId, 'holiday_cancelled', r.id, {})
    ok(res, { id: r.id, status: 'cancelled' })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not cancel that request.', 500) }
})

// ── Approvers (admins, and managers when Manager approval is on) ─────────────────────────
async function requireDecider(req: Request, res: Response, next: NextFunction) {
  try { if (await canDecide(tenantOf(req), userOf(req), roleOf(req))) { next(); return } err(res, 'FORBIDDEN', 'You cannot decide holiday requests.', 403) } catch { err(res, 'FORBIDDEN', 'You cannot decide holiday requests.', 403) }
}

holidayRouter.get('/approvals', requireDecider, async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const settings = await loadSettings(tenantId)
    const status = ['pending', 'approved', 'rejected', 'cancelled'].includes(String(req.query.status)) ? String(req.query.status) : 'pending'
    const list = await loadRequests(tenantId, { status }, status === 'pending' ? 200 : 60)
    const roster = await loadRoster(tenantId)
    const unit = new Map(roster.map(r => [r.id, r.unit]))
    const out = []
    for (const r of list) {
      const others = status === 'pending' || status === 'approved' ? await othersFor(tenantId, r.days.map(d => d.day), r.id) : []
      out.push({ ...r, unit: unit.get(r.user_id) ?? 'hours', clashes: clashesFor({ days: r.days.map(d => d.day), userId: r.user_id, others, maxOff: settings.max_off }).filter(c => c.approved.length || c.pending.length || c.over_limit) })
    }
    ok(res, { requests: out, max_off: settings.max_off })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load the requests.', 500) }
})

async function actorOf(req: Request) { const u = await p().user.findUnique({ where: { id: userOf(req) }, select: { id: true, name: true } }); return { id: userOf(req), name: u?.name ?? 'A manager' } }
async function unitOf(tenantId: string, userId: string): Promise<'hours' | 'days'> {
  const d = await p().staffDetail.findUnique({ where: { user_id: userId }, select: { holiday_unit: true } }).catch(() => null)
  return d?.holiday_unit === 'hours' ? 'hours' : 'days'
}
async function daysOfRequest(requestId: string): Promise<DayRow[]> {
  const rows = await p().holidayDay.findMany({ where: { request_id: requestId }, orderBy: { day: 'asc' } })
  return rows.map((d: any) => ({ day: ymd(d.day), hours: Number(d.hours) }))
}

holidayRouter.post('/requests/:id/decision', requireDecider, async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  const decision = req.body?.decision === 'approve' ? 'approve' : req.body?.decision === 'reject' ? 'reject' : null
  if (!decision) { err(res, 'INVALID', 'Choose approve or reject.', 400); return }
  try {
    const r = await p().holidayRequest.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!r) { err(res, 'NOT_FOUND', 'Request not found.', 404); return }
    if (r.user_id === userOf(req) && roleOf(req) !== 'admin') { err(res, 'FORBIDDEN', 'You cannot decide your own request.', 403); return }
    if (r.status !== 'pending') { err(res, 'NOT_PENDING', 'That request has already been decided.', 409); return }
    const actor = await actorOf(req)
    const n = note(req.body?.note)
    const status = decision === 'approve' ? 'approved' : 'rejected'
    await p().holidayRequest.update({ where: { id: r.id }, data: { status, decision_note: n, decided_by: actor.id, decided_by_name: actor.name, decided_at: new Date() } })
    await p().holidayDay.updateMany({ where: { request_id: r.id }, data: { status } })
    audit(tenantId, actor.id, decision === 'approve' ? 'holiday_approved' : 'holiday_rejected', r.id, { for: r.user_id })
    await tellPerson({ tenantId, kind: decision === 'approve' ? 'approved' : 'rejected', request: r, days: await daysOfRequest(r.id), approver: actor, unit: await unitOf(tenantId, r.user_id), note: n })
    ok(res, { id: r.id, status })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save the decision.', 500) }
})

// Change an approved booking (dates or hours).
holidayRouter.patch('/requests/:id', requireDecider, async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const r = await p().holidayRequest.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!r) { err(res, 'NOT_FOUND', 'Request not found.', 404); return }
    if (r.status !== 'approved' && r.status !== 'pending') { err(res, 'NOT_EDITABLE', 'Only pending or approved holiday can be changed.', 409); return }
    const v = validateDays(req.body?.days, { today: ukToday(), allowPast: true })
    if (!v.ok) { err(res, 'INVALID', v.error, 400); return }
    const clash = await overlapError(tenantId, r.user_id, v.days.map(d => d.day), r.id)
    if (clash) { err(res, 'OVERLAP', clash, 409); return }
    const actor = await actorOf(req)
    const n = note(req.body?.note)
    await p().holidayDay.deleteMany({ where: { request_id: r.id } })
    await p().holidayDay.createMany({ data: v.days.map(d => ({ request_id: r.id, tenant_id: tenantId, user_id: r.user_id, day: dayDate(d.day), hours: d.hours, status: r.status })) })
    await p().holidayRequest.update({ where: { id: r.id }, data: { total_hours: v.total_hours, total_days: v.days.length, decision_note: n ?? r.decision_note } })
    audit(tenantId, actor.id, 'holiday_edited', r.id, { for: r.user_id, days: v.days.length, hours: v.total_hours })
    if (r.status === 'approved') await tellPerson({ tenantId, kind: 'edited', request: r, days: v.days, approver: actor, unit: await unitOf(tenantId, r.user_id), note: n })
    ok(res, { id: r.id, status: r.status, total_hours: v.total_hours, days: v.days.length })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not change that booking.', 500) }
})

// Remove (disapprove) an approved booking. The person is emailed and gets a hub message, with the approver's note when they add one.
holidayRouter.post('/requests/:id/remove', requireDecider, async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const r = await p().holidayRequest.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!r) { err(res, 'NOT_FOUND', 'Request not found.', 404); return }
    if (r.status !== 'approved') { err(res, 'NOT_APPROVED', 'Only approved holiday can be removed.', 409); return }
    const actor = await actorOf(req)
    const n = note(req.body?.note)
    const days = await daysOfRequest(r.id)
    await p().holidayRequest.update({ where: { id: r.id }, data: { status: 'rejected', decision_note: n, decided_by: actor.id, decided_by_name: actor.name, decided_at: new Date() } })
    await p().holidayDay.updateMany({ where: { request_id: r.id }, data: { status: 'rejected' } })
    audit(tenantId, actor.id, 'holiday_removed', r.id, { for: r.user_id, days: days.length })
    await tellPerson({ tenantId, kind: 'removed', request: r, days, approver: actor, unit: await unitOf(tenantId, r.user_id), note: n })
    ok(res, { id: r.id, status: 'rejected' })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not remove that booking.', 500) }
})

// ── Administrators ───────────────────────────────────────────────────────────────────────
export const holidayAdminRouter = Router()
holidayAdminRouter.use(pilotGate)
holidayAdminRouter.use(requireAdmin)

holidayAdminRouter.get('/matrix', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const settings = await loadSettings(tenantId)
    const year = Number(req.query.year) || yearContaining(ukToday(), settings.year_start.month, settings.year_start.day)
    ok(res, { ...(await buildMatrix(tenantId, year, settings)), carry_over: settings.carry_over })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not build the matrix.', 500) }
})

// Who is off on which day in a month (approved only), the bank holidays, and the week summary inputs.
holidayAdminRouter.get('/calendar', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  const m = String(req.query.month ?? ukToday().slice(0, 7))
  if (!/^\d{4}-\d{2}$/.test(m)) { err(res, 'INVALID', 'Choose a month.', 400); return }
  try {
    const settings = await loadSettings(tenantId)
    const from = addDays(`${m}-01`, -7), to = addDays(`${m}-01`, 40)   // a little either side so the first and last weeks are complete
    const rows = await approvedDays(tenantId, from, to)
    const users = await p().user.findMany({ where: { tenant_id: tenantId, id: { in: [...new Set(rows.map(r => r.user_id))] } }, select: { id: true, name: true, job_role: true } })
    const names = new Map<string, any>(users.map((u: any) => [u.id, u]))
    ok(res, {
      month: m, max_off: settings.max_off, today: ukToday(),
      days: rows.map(r => ({ day: r.day, user_id: r.user_id, name: names.get(r.user_id)?.name ?? 'Former member of staff', job_role: names.get(r.user_id)?.job_role ?? null, hours: r.hours })),
      bank_holidays: bankHolidaysWithPay(settings, from, to),
    })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load the calendar.', 500) }
})

holidayAdminRouter.get('/settings', async (req: Request, res: Response) => {
  const s = await loadSettings(tenantOf(req))
  ok(res, { settings: s, bank_holidays: bankHolidaysWithPay(s), multiplier_choices: BANK_MULTIPLIERS })
})

holidayAdminRouter.put('/settings', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req), b = req.body ?? {}
  const cur = await loadSettings(tenantId)
  const dim = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
  const month = b.year_start ? Number(b.year_start.month) : cur.year_start.month, day = b.year_start ? Number(b.year_start.day) : cur.year_start.day
  if (!Number.isInteger(month) || !Number.isInteger(day) || month < 1 || month > 12 || day < 1 || day > dim[month - 1]) { err(res, 'INVALID', 'Choose a real month and day for the holiday year.', 400); return }
  const maxOff = b.max_off === '' || b.max_off === null || b.max_off === undefined ? (('max_off' in b) ? null : cur.max_off) : Number(b.max_off)
  if (maxOff !== null && (!Number.isInteger(maxOff) || maxOff < 1 || maxOff > 500)) { err(res, 'INVALID', 'The most people off at once must be a whole number, or blank for no limit.', 400); return }
  const def = b.bank_default_multiplier != null ? Number(b.bank_default_multiplier) : cur.bank_default_multiplier
  if (!BANK_MULTIPLIERS.includes(def)) { err(res, 'INVALID', 'Choose one of the listed bank holiday multipliers.', 400); return }
  const overrides: Record<string, number> = {}
  const src = b.bank_overrides && typeof b.bank_overrides === 'object' ? b.bank_overrides : cur.bank_overrides
  for (const [k, v] of Object.entries(src as Record<string, unknown>)) { if (/^\d{4}-\d{2}-\d{2}$/.test(k) && BANK_MULTIPLIERS.includes(Number(v))) overrides[k] = Number(v) }
  const data = {
    year_start_month: month, year_start_day: day, carry_over: b.carry_over != null ? !!b.carry_over : cur.carry_over,
    manager_approval: b.manager_approval != null ? !!b.manager_approval : cur.manager_approval, max_off: maxOff, bank_default_multiplier: def, bank_overrides: overrides,
  }
  try {
    await p().holidaySettings.upsert({ where: { tenant_id: tenantId }, create: { tenant_id: tenantId, ...data }, update: data })
    audit(tenantId, userOf(req), 'holiday_settings_changed', tenantId, { year_start: `${month}-${day}`, carry_over: data.carry_over, manager_approval: data.manager_approval, max_off: maxOff })
    const s = await loadSettings(tenantId)
    ok(res, { settings: s, bank_holidays: bankHolidaysWithPay(s) })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save the settings.', 500) }
})

// A person's holiday details: start date and pay rates (administrators only) alongside the allowance, unit and contracted hours that already live on the staff record.
holidayAdminRouter.get('/staff/:userId', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req), userId = String(req.params.userId)
  try {
    const u = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true } })
    if (!u) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
    const [d, h] = await Promise.all([
      p().staffDetail.findUnique({ where: { user_id: userId } }).catch(() => null),
      p().holidayStaff.findUnique({ where: { user_id: userId } }),
    ])
    ok(res, {
      name: u.name, unit: d?.holiday_unit === 'hours' ? 'hours' : 'days', allowance: d?.holiday_entitlement != null ? Number(d.holiday_entitlement) : null,
      contracted_hours: d?.contract_hours_per_week != null ? Number(d.contract_hours_per_week) : null,
      start_date: h?.start_date ? ymd(h.start_date) : null, weekday_rate: h?.weekday_rate != null ? Number(h.weekday_rate) : null, weekend_rate: h?.weekend_rate != null ? Number(h.weekend_rate) : null,
    })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that person.', 500) }
})

const money = (v: unknown) => { if (v === '' || v == null) return null; const n = Number(v); return isFinite(n) && n >= 0 && n <= 9999 ? Math.round(n * 100) / 100 : undefined }
holidayAdminRouter.put('/staff/:userId', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req), userId = String(req.params.userId), b = req.body ?? {}
  try {
    const u = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true } })
    if (!u) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
    const wd = money(b.weekday_rate), we = money(b.weekend_rate)
    if (wd === undefined || we === undefined) { err(res, 'INVALID', 'Pay rates must be an amount of money.', 400); return }
    const start = b.start_date ? String(b.start_date).slice(0, 10) : null
    if (start && !/^\d{4}-\d{2}-\d{2}$/.test(start)) { err(res, 'INVALID', 'The start date is not valid.', 400); return }
    const data = { start_date: start ? dayDate(start) : null, weekday_rate: wd, weekend_rate: we }
    await p().holidayStaff.upsert({ where: { user_id: userId }, create: { user_id: userId, tenant_id: tenantId, ...data }, update: data })
    ok(res, { saved: true })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save that person.', 500) }
})

// An administrator books days for someone (approved at once).
holidayAdminRouter.post('/book', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const roster = await loadRoster(tenantId)
    const who = roster.find(r => r.id === String(req.body?.user_id))
    if (!who) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
    const v = validateDays(req.body?.days, { today: ukToday(), allowPast: true })
    if (!v.ok) { err(res, 'INVALID', v.error, 400); return }
    const clash = await overlapError(tenantId, who.id, v.days.map(d => d.day))
    if (clash) { err(res, 'OVERLAP', clash, 409); return }
    const actor = await actorOf(req)
    const r = await createRequest({ tenantId, userId: who.id, days: v.days, note: note(req.body?.note), source: 'admin', status: 'approved', actor })
    audit(tenantId, actor.id, 'holiday_approved', r.id, { for: who.id, booked_by_admin: true })
    await tellPerson({ tenantId, kind: 'approved', request: r, days: v.days, approver: actor, unit: who.unit, note: null })
    ok(res, { id: r.id, status: 'approved' }, 201)
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not book that holiday.', 500) }
})

// ── Import of bookings that already exist (CSV: email or name, date, hours, status) ──────
holidayAdminRouter.get('/import/template', (_req: Request, res: Response) => {
  res.setHeader('Content-Type', 'text/csv; charset=utf-8'); res.setHeader('Content-Disposition', 'attachment; filename="holiday-import-template.csv"')
  res.send('email,date,hours,status\nsample.person@yourhome.co.uk,2026-03-04,8,approved\nsample.person@yourhome.co.uk,2026-03-05,8,approved\n')
})

holidayAdminRouter.post('/import', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  const csv = String(req.body?.csv ?? '')
  if (!csv.trim()) { err(res, 'INVALID', 'Paste or choose a CSV file first.', 400); return }
  if (csv.length > 400_000) { err(res, 'INVALID', 'That file is too large. Please split it.', 400); return }
  try {
    const roster = await loadRoster(tenantId)
    const byEmail = new Map(roster.filter(r => r.email).map(r => [String(r.email).toLowerCase(), r]))
    const byName = new Map<string, typeof roster>()
    for (const r of roster) { const k = r.name.trim().toLowerCase(); byName.set(k, [...(byName.get(k) ?? []), r]) }
    const { rows } = parseImportCsv(csv)
    const existing = await p().holidayDay.findMany({ where: { tenant_id: tenantId, status: { in: ['approved', 'pending'] } }, select: { user_id: true, day: true } })
    const have = new Set(existing.map((e: any) => `${e.user_id}|${ymd(e.day)}`))
    const seen = new Set<string>()
    const out = rows.map(r => {
      let person = byEmail.get(r.who.toLowerCase()) ?? null, error = r.error
      if (!person && !error) { const m = byName.get(r.who.trim().toLowerCase()) ?? []; if (m.length === 1) person = m[0]; else error = m.length > 1 ? 'More than one person has that name. Use their email.' : 'No active staff member matches that email or name.' }
      let duplicate = false
      if (person && r.day && !error) { const k = `${person.id}|${r.day}`; if (have.has(k) || seen.has(k)) duplicate = true; seen.add(k) }
      return { line: r.line, who: r.who, user_id: person?.id ?? null, matched_name: person?.name ?? null, day: r.day, hours: r.hours, error, duplicate }
    })
    const good = out.filter(r => !r.error && !r.duplicate && r.user_id && r.day && r.hours)
    const summary = { rows: out.length, to_add: good.length, duplicates: out.filter(r => r.duplicate).length, errors: out.filter(r => r.error).length }
    if (req.body?.commit !== true) { ok(res, { committed: false, summary, rows: out.slice(0, 500) }); return }
    if (summary.errors > 0) { err(res, 'HAS_ERRORS', 'Fix the rows with errors first, or remove them from the file.', 400); return }
    const actor = await actorOf(req)
    const byUser = new Map<string, DayRow[]>()
    for (const r of good) byUser.set(r.user_id!, [...(byUser.get(r.user_id!) ?? []), { day: r.day!, hours: r.hours! }])
    let requests = 0
    for (const [userId, days] of byUser) {
      for (let i = 0; i < days.length; i += 60) {
        const chunk = days.slice(i, i + 60)
        const r = await createRequest({ tenantId, userId, days: chunk, note: 'Imported', source: 'import', status: 'approved', actor })
        audit(tenantId, actor.id, 'holiday_imported', r.id, { for: userId, days: chunk.length }); requests++
      }
    }
    ok(res, { committed: true, summary, requests })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not import that file.', 500) }
})
