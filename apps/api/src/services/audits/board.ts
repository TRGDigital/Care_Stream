// The audits calendar and matrix: what is due on which day, and which audits each month have and have not been done.
//
// Which audits are on the board: only the ones the home has SCHEDULED (any assignment) or has added to it by hand.
// Completed audits fill the cells whether or not they were scheduled (matched by audit and month), so existing history
// shows straight away for the audits on the board. An audit the home has never touched is not listed until they add it.
// "Not done" is only called for audits that should happen at least monthly, and only from the month the audit was
// scheduled or added, so nothing is shown as missed that the home never expected to do.

import { prisma } from '../../db/client'
import { startOfDayUTC, isOverdue } from './assignments'

const db = prisma as any
const mkey = (d: Date) => `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
const monthStart = (y: number, m: number) => new Date(Date.UTC(y, m, 1))
const dayKey = (d: Date) => d.toISOString().slice(0, 10)

export type CellState = 'done' | 'in_progress' | 'overdue' | 'due' | 'missed' | 'not_done' | 'none'
export type BoardRow = {
  template_id: string; name: string; frequency: string; source: 'scheduled' | 'added' | 'both'
  cells: Record<string, { state: CellState; done: number; open: number }>
}
export type BoardEntry = {
  date: string; template_id: string; name: string
  status: 'done' | 'overdue' | 'due' | 'in_progress' | 'missed'
  assignee: string | null; assignment_id: string | null; run_id: string | null
}
export type Board = {
  month: string; months: string[]
  rows: BoardRow[]; entries: BoardEntry[]
  counts: { overdue: number; due_this_month: number; done_this_month: number }
}

export async function boardIds(tenantId: string): Promise<Array<{ template_id: string; added_at: string }>> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { training_settings: true } })
  const list = (t?.training_settings as any)?.audit_board
  return Array.isArray(list) ? list.filter((x: any) => x && typeof x.template_id === 'string') : []
}

async function saveBoardIds(tenantId: string, list: Array<{ template_id: string; added_at: string }>) {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { training_settings: true } })
  const current = (t?.training_settings as any) ?? {}
  await db.tenant.update({ where: { id: tenantId }, data: { training_settings: { ...current, audit_board: list } } })
}

export async function addToBoard(tenantId: string, templateId: string) {
  const list = await boardIds(tenantId)
  if (list.some(x => x.template_id === templateId)) return
  await saveBoardIds(tenantId, [...list, { template_id: templateId, added_at: new Date().toISOString() }])
}
export async function removeFromBoard(tenantId: string, templateId: string) {
  await saveBoardIds(tenantId, (await boardIds(tenantId)).filter(x => x.template_id !== templateId))
}

export async function buildBoard(tenantId: string, monthParam?: string): Promise<Board> {
  const now = new Date()
  const m = /^(\d{4})-(\d{2})$/.exec(monthParam ?? '')
  const sel = m ? monthStart(Number(m[1]), Number(m[2]) - 1) : monthStart(now.getUTCFullYear(), now.getUTCMonth())
  // Matrix window: six months ending at the selected month.
  const months: string[] = []
  for (let i = 5; i >= 0; i--) months.push(mkey(monthStart(sel.getUTCFullYear(), sel.getUTCMonth() - i)))
  const winStart = monthStart(sel.getUTCFullYear(), sel.getUTCMonth() - 5)
  const winEnd = monthStart(sel.getUTCFullYear(), sel.getUTCMonth() + 1)   // exclusive
  const today = startOfDayUTC(now)

  const [assignAll, added] = await Promise.all([
    db.auditAssignment.findMany({
      where: { tenant_id: tenantId, status: { not: 'cancelled' } },
      select: { id: true, template_id: true, assigned_user_id: true, due_date: true, status: true, run_id: true, completed_at: true },
      orderBy: { due_date: 'asc' }, take: 5000,
    }),
    boardIds(tenantId),
  ])
  const scheduledIds = new Set<string>((assignAll as any[]).map(a => a.template_id))
  const addedMap = new Map(added.map(a => [a.template_id, a.added_at]))
  const ids = [...new Set<string>([...scheduledIds, ...addedMap.keys()])]
  if (!ids.length) return { month: mkey(sel), months, rows: [], entries: [], counts: { overdue: 0, due_this_month: 0, done_this_month: 0 } }

  const [templates, runs] = await Promise.all([
    db.auditTemplate.findMany({ where: { id: { in: ids }, is_active: true }, select: { id: true, name: true, frequency: true } }),
    db.auditRun.findMany({
      where: { tenant_id: tenantId, template_id: { in: ids }, audit_month: { gte: winStart, lt: winEnd } },
      select: { id: true, template_id: true, audit_month: true, status: true, completed_at: true },
    }),
  ])
  const users = await db.user.findMany({ where: { id: { in: [...new Set<string>((assignAll as any[]).map(a => a.assigned_user_id))] } }, select: { id: true, name: true } })
  const userName = new Map<string, string>((users as any[]).map(u => [u.id, u.name]))
  const tmplName = new Map<string, string>((templates as any[]).map(t => [t.id, t.name]))

  const firstSeen = new Map<string, Date>()   // when the home started tracking each audit
  for (const a of assignAll as any[]) { const d = new Date(a.due_date); if (!firstSeen.has(a.template_id) || d < firstSeen.get(a.template_id)!) firstSeen.set(a.template_id, d) }
  for (const [tid, at] of addedMap) { const d = new Date(at); if (!firstSeen.has(tid) || d < firstSeen.get(tid)!) firstSeen.set(tid, d) }

  const rows: BoardRow[] = (templates as any[]).map(t => {
    const cells: BoardRow['cells'] = {}
    const since = firstSeen.get(t.id)
    const expected = ['daily', 'weekly', 'monthly'].includes(t.frequency)
    for (const mk of months) {
      const done = (runs as any[]).filter(r => r.template_id === t.id && mkey(new Date(r.audit_month)) === mk && r.status === 'completed').length
      const prog = (runs as any[]).filter(r => r.template_id === t.id && mkey(new Date(r.audit_month)) === mk && r.status !== 'completed').length
      const inMonth = (assignAll as any[]).filter(a => a.template_id === t.id && mkey(new Date(a.due_date)) === mk)
      const openA = inMonth.filter(a => a.status === 'open')
      let state: CellState = 'none'
      if (done > 0) state = 'done'
      else if (openA.some(a => isOverdue(a, today))) state = 'overdue'
      else if (prog > 0) state = 'in_progress'
      else if (openA.length) state = 'due'
      else if (inMonth.some(a => a.status === 'missed')) state = 'missed'
      else if (expected && since && mk >= mkey(since) && mk <= mkey(now)) state = 'not_done'
      cells[mk] = { state, done, open: openA.length }
    }
    const sched = scheduledIds.has(t.id), add = addedMap.has(t.id)
    return { template_id: t.id, name: t.name, frequency: t.frequency, source: (sched && add ? 'both' : sched ? 'scheduled' : 'added') as BoardRow['source'], cells }
  }).sort((a, b) => a.name.localeCompare(b.name))

  // Calendar entries for the selected month.
  const mk = mkey(sel)
  const entries: BoardEntry[] = []
  const linkedRuns = new Set<string>()
  for (const a of assignAll as any[]) {
    if (!tmplName.has(a.template_id) || mkey(new Date(a.due_date)) !== mk) continue
    if (a.run_id) linkedRuns.add(a.run_id)
    const status: BoardEntry['status'] = a.status === 'completed' ? 'done' : a.status === 'missed' ? 'missed' : isOverdue(a, today) ? 'overdue' : 'due'
    entries.push({ date: dayKey(new Date(a.due_date)), template_id: a.template_id, name: tmplName.get(a.template_id)!, status, assignee: userName.get(a.assigned_user_id) ?? null, assignment_id: a.id, run_id: a.run_id ?? null })
  }
  for (const r of runs as any[]) {
    if (linkedRuns.has(r.id) || !tmplName.has(r.template_id)) continue
    const when = new Date(r.completed_at ?? r.audit_month)
    if (mkey(when) !== mk) continue
    entries.push({ date: dayKey(when), template_id: r.template_id, name: tmplName.get(r.template_id)!, status: r.status === 'completed' ? 'done' : 'in_progress', assignee: null, assignment_id: null, run_id: r.id })
  }
  entries.sort((a, b) => a.date.localeCompare(b.date) || a.name.localeCompare(b.name))
  const counts = {
    overdue: entries.filter(e => e.status === 'overdue').length,
    due_this_month: entries.filter(e => e.status === 'due' || e.status === 'overdue').length,
    done_this_month: entries.filter(e => e.status === 'done').length,
  }
  return { month: mk, months, rows, entries, counts }
}
