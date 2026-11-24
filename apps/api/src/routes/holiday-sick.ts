// Sickness recording for the holiday pilot (CS-1001). ADMINISTRATORS ONLY: mounted under /holiday/admin/sick, behind the pilot gate and requireAdmin. Sickness is health
// information, so it is never returned by a hub, approver, clash or week route, never changes a holiday balance, and every add, change, report view and download is audited.
import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { staffPhotoUrls } from '../lib/staff-photos'
import { addDays, ukToday } from '../lib/holiday-math'
import { approvedDays, audit as holidayAudit, isMissingTable, loadRoster, withUserLock } from '../lib/holiday-data'
import { createSpell, deleteSpell, loadSpell, loadSpells, sickTablesReady, updateSpell } from '../lib/sick-data'
import { effectiveDays, holidayOverlap, isYmd, monthCsv, sicknessReport, summaryCsv, dayByDayCsv, validateSpell, type MonthEntry } from '../lib/sick-math'

const p = () => prisma as any
const tenantOf = (req: Request): string => (req as any).user.tenant_id
const userOf = (req: Request): string => (req as any).user.sub
const notReady = (res: Response) => err(res, 'NOT_SET_UP', 'Sickness recording is not switched on yet.', 503)

export interface SickDeps {
  actorOf: (req: Request) => Promise<{ id: string; name: string }>
  tellPerson: (o: any) => Promise<void>
  unitOf: (tenantId: string, userId: string) => Promise<'hours' | 'days'>
  daysOfRequest: (requestId: string) => Promise<Array<{ day: string; hours: number; part?: any }>>
}

const log = (tenantId: string, actorId: string, event: 'sickness_added' | 'sickness_edited' | 'sickness_ended' | 'sickness_removed' | 'sickness_report_viewed' | 'sickness_downloaded', entityId: string, metadata: Record<string, unknown> = {}) =>
  void writeAuditLog({ tenant_id: tenantId, user_id: actorId, event_type: event, entity_type: 'sick_spell', entity_id: entityId, metadata })

const monthOk = (m: unknown): m is string => typeof m === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(m)
const lastOfMonth = (m: string) => addDays(`${Number(m.slice(5)) === 12 ? Number(m.slice(0, 4)) + 1 : m.slice(0, 4)}-${String(Number(m.slice(5)) === 12 ? 1 : Number(m.slice(5)) + 1).padStart(2, '0')}-01`, -1)

export function buildSickRouter(deps: SickDeps): Router {
  const r = Router()

  /** Names and job titles for anyone (including people who have since left), and pictures. */
  async function people(tenantId: string, ids: string[]) {
    const users = ids.length ? await p().user.findMany({ where: { tenant_id: tenantId, id: { in: ids } }, select: { id: true, name: true, job_role: true } }) : []
    const photos = await staffPhotoUrls(tenantId, ids)
    return { list: users.map((u: any) => ({ id: u.id, name: u.name, job_role: u.job_role ?? null })), photos }
  }

  // Who can be chosen in the overlay (active staff) with their usual shift hours.
  r.get('/people', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    try {
      const roster = await loadRoster(tenantId)
      const photos = await staffPhotoUrls(tenantId, roster.map(x => x.id))
      ok(res, { people: roster.map(x => ({ id: x.id, name: x.name, job_role: x.job_role, photo_url: photos.get(x.id) ?? null, usual_hours: x.contracted ? Math.min(13, Math.max(1, Math.round((x.contracted / 5) * 2) / 2)) : 8 })), today: ukToday() })
    } catch (e) { err(res, 'ERROR', 'Could not load the staff.', 500) }
  })

  // The calendar: every sick day in and around a month. Notes are NOT in this list (they are in the one spell, when an administrator opens it).
  r.get('/', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    const m = String(req.query.month ?? ukToday().slice(0, 7))
    if (!monthOk(m)) { err(res, 'INVALID', 'Choose a month.', 400); return }
    try {
      const from = addDays(`${m}-01`, -7), to = addDays(`${m}-01`, 40), today = ukToday()
      const spells = await loadSpells(tenantId, { from, to })
      const who = await people(tenantId, [...new Set(spells.map(s => s.user_id))])
      const byId = new Map<string, any>(who.list.map((u: any) => [u.id, u]))
      const days = spells.flatMap(s => effectiveDays(s, today).filter(d => d.day >= from && d.day <= to).map(d => ({
        day: d.day, user_id: s.user_id, name: byId.get(s.user_id)?.name ?? 'Former member of staff', job_role: byId.get(s.user_id)?.job_role ?? null,
        photo_url: who.photos.get(s.user_id) ?? null, hours: d.hours, part: d.part ?? 'full', spell_id: s.id, kind: s.kind, open: s.last_day === null,
      })))
      ok(res, { month: m, days })
    } catch (e) { isMissingTable(e) || !(await sickTablesReady()) ? notReady(res) : err(res, 'ERROR', 'Could not load sickness.', 500) }
  })

  // Before saving: which of these days are approved holiday for the person?
  r.post('/check', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    const userId = String(req.body?.user_id ?? '')
    const days = (Array.isArray(req.body?.days) ? req.body.days : []).filter(isYmd)
    if (!userId || !days.length) { ok(res, { overlap: [] }); return }
    try {
      const sorted = [...days].sort()
      const hol = await approvedDays(tenantId, sorted[0], sorted[sorted.length - 1], [userId])
      ok(res, { overlap: holidayOverlap(days, hol.map(h => ({ day: h.day, request_id: h.request_id, hours: h.hours }))) })
    } catch { ok(res, { overlap: [] }) }
  })

  r.get('/spells/:id', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    try {
      const s = await loadSpell(tenantId, String(req.params.id))
      if (!s) { err(res, 'NOT_FOUND', 'Not found.', 404); return }
      const who = await people(tenantId, [s.user_id])
      ok(res, { spell: s, name: who.list[0]?.name ?? 'Former member of staff', job_role: who.list[0]?.job_role ?? null, effective_days: effectiveDays(s, ukToday()) })
    } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that record.', 500) }
  })

  /** If the administrator chose "sickness replaces holiday", the sick days come out of the approved booking (hours go back to the balance) and the person is told. */
  async function replaceHoliday(tenantId: string, userId: string, days: string[], actor: { id: string; name: string }, reqUser: Request) {
    const sorted = [...days].sort()
    const hol = await approvedDays(tenantId, sorted[0], sorted[sorted.length - 1], [userId])
    const byReq = new Map<string, string[]>()
    for (const h of holidayOverlap(days, hol.map(x => ({ day: x.day, request_id: x.request_id, hours: x.hours })))) byReq.set(h.request_id, [...(byReq.get(h.request_id) ?? []), h.day])
    for (const [requestId, gone] of byReq) {
      await withUserLock(userId, async () => {
        const request = await p().holidayRequest.findFirst({ where: { id: requestId, tenant_id: tenantId, status: 'approved' } })
        if (!request) return
        await p().holidayDay.deleteMany({ where: { request_id: requestId, day: { in: gone.map(d => new Date(d + 'T00:00:00Z')) } } })
        const left = await deps.daysOfRequest(requestId)
        if (left.length === 0) {
          await p().holidayRequest.update({ where: { id: requestId }, data: { status: 'rejected', decision_note: 'Changed because of sickness.', decided_by: actor.id, decided_by_name: actor.name, decided_at: new Date(), total_hours: 0, total_days: 0 } })
        } else {
          await p().holidayRequest.update({ where: { id: requestId }, data: { total_hours: left.reduce((s, d) => s + d.hours, 0), total_days: left.length } })
        }
        holidayAudit(tenantId, actor.id, left.length === 0 ? 'holiday_removed' : 'holiday_edited', requestId, { for: userId, reason: 'sickness', days_removed: gone.length })
        await deps.tellPerson({ tenantId, kind: left.length === 0 ? 'removed' : 'edited', request, days: left, approver: actor, unit: await deps.unitOf(tenantId, userId), note: 'These days were changed because you were off sick, so the hours go back to your holiday balance.' })
      })
    }
    return byReq.size
  }

  r.post('/', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    const userId = String(req.body?.user_id ?? '')
    const v = validateSpell(req.body ?? {})
    if (!v.ok) { err(res, 'INVALID', v.error, 400); return }
    try {
      const person = (await loadRoster(tenantId)).find(x => x.id === userId)
      if (!person) { err(res, 'INVALID', 'Choose a person from the list.', 400); return }
      const actor = await deps.actorOf(req)
      const id = await createSpell(tenantId, userId, actor.id, v.spell)
      let replaced = 0
      if (req.body?.holiday === 'replace') replaced = await replaceHoliday(tenantId, userId, effectiveDays(v.spell, ukToday()).map(d => d.day), actor, req)
      log(tenantId, actor.id, 'sickness_added', id, { for: userId, days: v.spell.days.length, open: v.spell.last_day === null, holiday_replaced: replaced })
      ok(res, { id, holiday_requests_changed: replaced }, 201)
    } catch (e) { isMissingTable(e) || !(await sickTablesReady()) ? notReady(res) : err(res, 'ERROR', 'Could not save that.', 500) }
  })

  r.patch('/spells/:id', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    const v = validateSpell(req.body ?? {})
    if (!v.ok) { err(res, 'INVALID', v.error, 400); return }
    try {
      const cur = await loadSpell(tenantId, String(req.params.id))
      if (!cur) { err(res, 'NOT_FOUND', 'Not found.', 404); return }
      const actor = await deps.actorOf(req)
      await updateSpell(tenantId, cur.id, cur.user_id, v.spell)
      log(tenantId, actor.id, 'sickness_edited', cur.id, { for: cur.user_id, days: v.spell.days.length, open: v.spell.last_day === null })
      ok(res, { id: cur.id })
    } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save that.', 500) }
  })

  // The person is back: close an open spell. The last day defaults to yesterday, and the open ended days up to that day become real, stored days.
  r.post('/spells/:id/end', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req), today = ukToday()
    try {
      const cur = await loadSpell(tenantId, String(req.params.id))
      if (!cur) { err(res, 'NOT_FOUND', 'Not found.', 404); return }
      if (cur.last_day !== null) { err(res, 'NOT_OPEN', 'That record is already closed.', 409); return }
      const last = isYmd(req.body?.last_day) ? req.body.last_day : addDays(today, -1) < cur.first_day ? cur.first_day : addDays(today, -1)
      if (last < cur.first_day || last > today) { err(res, 'INVALID', 'The last day must be between the first day and today.', 400); return }
      const all = effectiveDays(cur, today).filter(d => d.day <= last)
      const v = validateSpell({ ...cur, still_off: false, last_day: last, days: all, return_to_work_done: req.body?.return_to_work_done === true ? true : cur.return_to_work_done }, today)
      if (!v.ok) { err(res, 'INVALID', v.error, 400); return }
      const actor = await deps.actorOf(req)
      await updateSpell(tenantId, cur.id, cur.user_id, v.spell)
      log(tenantId, actor.id, 'sickness_ended', cur.id, { for: cur.user_id, last_day: last, days: v.spell.days.length })
      ok(res, { id: cur.id, last_day: last })
    } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not close that record.', 500) }
  })

  r.delete('/spells/:id', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    try {
      const cur = await loadSpell(tenantId, String(req.params.id))
      if (!cur) { err(res, 'NOT_FOUND', 'Not found.', 404); return }
      const actor = await deps.actorOf(req)
      await deleteSpell(tenantId, cur.id)
      log(tenantId, actor.id, 'sickness_removed', cur.id, { for: cur.user_id })
      ok(res, { id: cur.id, removed: true })
    } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not remove that record.', 500) }
  })

  // The sickness report for chosen dates: JSON for the preview, CSV for the download (summary, or day by day).
  r.get('/report', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    const from = String(req.query.from ?? ''), to = String(req.query.to ?? '')
    if (!isYmd(from) || !isYmd(to) || to < from) { err(res, 'INVALID', 'Choose the dates for the report.', 400); return }
    if (addDays(from, 731) < to) { err(res, 'INVALID', 'Choose two years or less.', 400); return }
    const userId = typeof req.query.user_id === 'string' && req.query.user_id ? req.query.user_id : null
    const notes = req.query.notes === '1'
    try {
      const spells = await loadSpells(tenantId, { from, to, userId })
      const who = await people(tenantId, [...new Set(spells.map(s => s.user_id))])
      const rep = sicknessReport({ spells, people: who.list, from, to, userId })
      const actor = await deps.actorOf(req)
      if (req.query.format === 'csv') {
        const mode = req.query.view === 'days' ? 'days' : 'summary'
        const csv = mode === 'days' ? dayByDayCsv(rep, notes) : summaryCsv(rep)
        log(tenantId, actor.id, 'sickness_downloaded', `${from}..${to}`, { kind: mode, people: rep.totals.people, notes })
        res.setHeader('Content-Type', 'text/csv; charset=utf-8')
        res.setHeader('Content-Disposition', `attachment; filename="sickness-${mode === 'days' ? 'day-by-day-' : ''}${from}-to-${to}.csv"`)
        res.setHeader('Cache-Control', 'no-store')
        res.send(csv); return
      }
      log(tenantId, actor.id, 'sickness_report_viewed', `${from}..${to}`, { people: rep.totals.people })
      ok(res, { from, to, ...rep })
    } catch (e) { isMissingTable(e) || !(await sickTablesReady()) ? notReady(res) : err(res, 'ERROR', 'Could not make the report.', 500) }
  })

  // The whole month, holiday and sickness together, as a file for Excel.
  r.get('/month-csv', async (req: Request, res: Response) => {
    const tenantId = tenantOf(req)
    const m = String(req.query.month ?? '')
    if (!monthOk(m)) { err(res, 'INVALID', 'Choose a month.', 400); return }
    const notes = req.query.notes === '1', first = `${m}-01`, last = lastOfMonth(m), today = ukToday()
    try {
      const hol = await approvedDays(tenantId, first, last)
      const spells = await loadSpells(tenantId, { from: first, to: last }).catch(() => [])
      const who = await people(tenantId, [...new Set([...hol.map(h => h.user_id), ...spells.map(s => s.user_id)])])
      const byId = new Map<string, any>(who.list.map((u: any) => [u.id, u]))
      const nm = (id: string) => byId.get(id)?.name ?? 'Former member of staff'
      const entries: MonthEntry[] = [
        ...hol.map(h => ({ day: h.day, user_id: h.user_id, name: nm(h.user_id), job_role: byId.get(h.user_id)?.job_role ?? null, type: 'Holiday' as const, hours: h.hours, part: h.part ?? 'full', status: 'Approved' })),
        ...spells.flatMap(s => effectiveDays(s, today).map(d => ({ day: d.day, user_id: s.user_id, name: nm(s.user_id), job_role: byId.get(s.user_id)?.job_role ?? null, type: 'Sick' as const, hours: d.hours, part: d.part ?? 'full', status: s.last_day === null ? 'Still off' : 'Recorded', note: s.note }))),
      ]
      const actor = await deps.actorOf(req)
      log(tenantId, actor.id, 'sickness_downloaded', m, { kind: 'month', rows: entries.length, notes })
      res.setHeader('Content-Type', 'text/csv; charset=utf-8')
      res.setHeader('Content-Disposition', `attachment; filename="carestream-calendar-${m}.csv"`)
      res.setHeader('Cache-Control', 'no-store')
      res.send(monthCsv(m, entries, notes))
    } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not make the file.', 500) }
  })

  return r
}
