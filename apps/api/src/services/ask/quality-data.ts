// Read only loaders for the quality and compliance agents. Every query names the account (tenantId) and only READS. Contact details and dates of birth are never selected, and
// nothing here touches the tables that hold health information. The calculations live in quality-calc.ts so they can be tested without a database.
import { prisma } from '../../db/client'
import { loadStaff, loadCredentialsDue, holidayYearRows, whoIsOff, weekOf, addDays, ukToday } from './data'
import { tenantInsights, scoreRuns } from '../audits/insights'
import { getAuditsDue } from '../audits/due'
import { getReadinessScore } from '../analytics/readiness'
import { summariseActions, summariseDeliveries, monthWindow, compare, attentionFlags, type QueryRow, type DeliveryRow, type ActionRow, type AssignmentRow } from './quality-calc'

const db = prisma as any
const midnight = (d: string) => new Date(d + 'T00:00:00Z')
const endOfDay = (d: string) => new Date(d + 'T23:59:59.999Z')

/** Staff questions asked in a window (any channel). Text is only returned when asked for, for the "no answer found" list. */
export async function loadQueries(tenantId: string, from: string, to: string, withText = false): Promise<Array<QueryRow & { policy_ids: string[] }>> {
  const rows: any[] = await db.queryRecord.findMany({
    where: { tenant_id: tenantId, created_at: { gte: midnight(from), lte: endOfDay(to) }, chat_deleted_at: null as any },
    select: { user_id: true, channel: true, no_match: true, response_time_ms: true, feedback: true, created_at: true, shared_device_id: true, document_category_queried: true, policy_ids_cited: true, ...(withText ? { query_text: true } : {}) },
    orderBy: { created_at: 'desc' }, take: 20000,
  }).catch(() => db.queryRecord.findMany({ where: { tenant_id: tenantId, created_at: { gte: midnight(from), lte: endOfDay(to) } }, select: { user_id: true, channel: true, no_match: true, response_time_ms: true, feedback: true, created_at: true, shared_device_id: true, document_category_queried: true, policy_ids_cited: true, ...(withText ? { query_text: true } : {}) }, take: 20000 }))
  return rows.map(r => ({ user_id: r.user_id, channel: r.channel, no_match: !!r.no_match, response_time_ms: r.response_time_ms, feedback: r.feedback, created_at: r.created_at, shared_device_id: r.shared_device_id, category: r.document_category_queried, text: r.query_text, policy_ids: r.policy_ids_cited ?? [] }))
}

export async function policyNames(tenantId: string, ids: string[]): Promise<Map<string, string>> {
  if (!ids.length) return new Map()
  const rows: any[] = await db.policy.findMany({ where: { tenant_id: tenantId, id: { in: ids } }, select: { id: true, name: true } }).catch(() => [])
  return new Map(rows.map(r => [r.id, String(r.name)]))
}

/** CQC staff question deliveries sent in a window, with the question's domain and the person's job role. */
export async function loadDeliveries(tenantId: string, from: string, to: string): Promise<{ rows: DeliveryRow[]; questionText: Map<string, string>; names: Map<string, string> }> {
  const staff = await loadStaff(tenantId)
  const roleOf = new Map(staff.map(s => [s.id, s.job_role])), nameOf = new Map(staff.map(s => [s.id, s.name]))
  const raw: any[] = await db.cqcStaffDelivery.findMany({
    where: { tenant_id: tenantId, sent_at: { gte: midnight(from), lte: endOfDay(to) }, user_id: { in: staff.map(s => s.id) } },
    select: { user_id: true, question_id: true, status: true, score: true, first_score: true, attempts: true, sent_at: true, answered_at: true, question: { select: { domain: true, question: true } } },
    take: 20000,
  }).catch(() => [])
  const text = new Map<string, string>()
  const rows: DeliveryRow[] = raw.map(r => { text.set(r.question_id, String(r.question?.question ?? '')); return { user_id: r.user_id, question_id: r.question_id, domain: String(r.question?.domain ?? ''), job_role: roleOf.get(r.user_id) ?? null, status: r.status, score: r.score, first_score: r.first_score, attempts: r.attempts ?? 1, sent_at: r.sent_at, answered_at: r.answered_at } })
  return { rows, questionText: text, names: nameOf }
}

export async function loadActions(tenantId: string, from: string): Promise<ActionRow[]> {
  const rows: any[] = await db.auditAction.findMany({
    where: { tenant_id: tenantId, OR: [{ created_at: { gte: midnight(from) } }, { status: { not: 'done' } }] },
    select: { status: true, priority: true, due_date: true, created_at: true, done_at: true, verified_result: true, extension_status: true }, take: 20000,
  }).catch(() => [])
  return rows
}

export async function loadOpenAssignments(tenantId: string): Promise<AssignmentRow[]> {
  const staff = await loadStaff(tenantId)
  const by = new Map(staff.map(s => [s.id, s]))
  const rows: any[] = await db.auditAssignment.findMany({ where: { tenant_id: tenantId, status: 'open' }, select: { due_date: true, status: true, assigned_user_id: true, template: { select: { name: true } } }, take: 5000 }).catch(() => [])
  return rows.map(r => ({ audit_name: String(r.template?.name ?? 'Audit'), status: r.status, due_date: r.due_date, assignee_role: by.get(r.assigned_user_id)?.job_role ?? null, assignee_name: by.get(r.assigned_user_id)?.name ?? null }))
}

/** Training enrolments of active staff: completed in a window, and overdue today. Counts only. */
export async function trainingCounts(tenantId: string, from: string, to: string, today: string) {
  const staff = await loadStaff(tenantId)
  const ids = staff.map(s => s.id)
  const rows: any[] = await db.trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: { in: ids } }, select: { status: true, due_date: true, completed_at: true, expires_at: true }, take: 50000 }).catch(() => [])
  const inWindow = rows.filter(r => r.completed_at && new Date(r.completed_at) >= midnight(from) && new Date(r.completed_at) <= endOfDay(to)).length
  const overdue = rows.filter(r => (r.status === 'not_started' || r.status === 'in_progress') && r.due_date && new Date(r.due_date).toISOString().slice(0, 10) < today).length
  const expired = rows.filter(r => r.status === 'expired' || (r.expires_at && new Date(r.expires_at).toISOString().slice(0, 10) < today && r.status === 'complete')).length
  return { assigned: rows.length, completed_in_window: inWindow, overdue_now: overdue, expired_now: expired, complete_all_time: rows.filter(r => r.status === 'complete').length }
}

export async function regulationCoverageCounts(tenantId: string) {
  const rows: any[] = await db.regulationCoverage.groupBy({ by: ['status'], where: { tenant_id: tenantId }, _count: { _all: true }, _max: { analysed_at: true } }).catch(() => [])
  const get = (s: string) => Number(rows.find(r => r.status === s)?._count?._all ?? 0)
  const last = rows.map(r => r._max?.analysed_at).filter(Boolean).sort().pop()
  return { covered: get('covered'), partial: get('partial'), gap: get('gap'), last_analysed: last ? new Date(last).toISOString().slice(0, 10) : null }
}

/** Everything for one governance month, as plain counts and trends. Figures only: the agent writes the words. */
export async function governanceSnapshot(tenantId: string, month: string, withCompare: boolean, today = ukToday()) {
  const w = monthWindow(month)
  const prev = monthWindow(w.previous)
  const staff = await loadStaff(tenantId, today)
  const ids = staff.map(s => s.id)
  const [qNow, qPrev, delNow, delPrev, actions, training, trainingPrev, creds, due, assignments, scoresAll, holidayRows, pending] = await Promise.all([
    loadQueries(tenantId, w.from, w.to), withCompare ? loadQueries(tenantId, prev.from, prev.to) : Promise.resolve([]),
    loadDeliveries(tenantId, w.from, w.to), withCompare ? loadDeliveries(tenantId, prev.from, prev.to) : Promise.resolve({ rows: [] as DeliveryRow[], questionText: new Map(), names: new Map() }),
    loadActions(tenantId, prev.from),
    trainingCounts(tenantId, w.from, w.to, today), withCompare ? trainingCounts(tenantId, prev.from, prev.to, today) : Promise.resolve(null),
    loadCredentialsDue(tenantId, 90, today).catch(() => [] as any[]),
    getAuditsDue(tenantId).catch(() => ({ due: [], inProgress: 0 })),
    loadOpenAssignments(tenantId),
    scoreRuns([tenantId], midnight(prev.from)).catch(() => []),
    holidayYearRows(tenantId, today).catch(() => null),
    db.holidayRequest.count({ where: { tenant_id: tenantId, status: 'pending' } }).catch(() => 0),
  ])

  const monthOfRun = (d: any) => new Date(d).toISOString().slice(0, 7)
  const runsIn = (m: string) => (scoresAll as any[]).filter(s => monthOfRun(s.completed_at) === m)
  const avgScore = (runs: any[]) => { const ok = runs.filter(r => r.pct != null); const t = ok.reduce((n, r) => n + r.total, 0); return t ? Math.round((ok.reduce((n, r) => n + r.pass, 0) / t) * 100) : null }
  const inMonth = (d: any, m: { from: string; to: string }) => !!d && new Date(d) >= midnight(m.from) && new Date(d) <= endOfDay(m.to)
  const raisedIn = (m: { from: string; to: string }) => actions.filter(a => inMonth(a.created_at, m)).length
  const closedIn = (m: { from: string; to: string }) => actions.filter(a => a.status === 'done' && inMonth(a.done_at, m)).length
  const answeredIn = (rows: DeliveryRow[]) => rows.filter(r => r.status !== 'pending').length
  const evalAvg = (rows: DeliveryRow[]) => { const v = rows.filter(r => r.status === 'evaluated' && r.score != null).map(r => r.score as number); return v.length ? Math.round(v.reduce((s, x) => s + x, 0) / v.length) : null }

  const actionsNow = summariseActions(actions, today)
  const overdueAudits = assignments.filter(a => a.status === 'open' && new Date(a.due_date).toISOString().slice(0, 10) < today).length
  const delSummary = summariseDeliveries(delNow.rows, ids, today)
  const expired = creds.filter((c: any) => c.status === 'expired').length
  const due30 = creds.filter((c: any) => c.status !== 'expired' && c.expires <= addDays(today, 30)).length

  const rowsHoliday: any[] = holidayRows?.rows ?? []
  const overAllowance = rowsHoliday.filter(r => r.remaining < 0).length
  const off = await whoIsOff(tenantId, today, addDays(today, 55)).catch(() => [] as any[])
  const weeks = new Map<string, Set<string>>()
  for (const r of off) if (r.status === 'approved') { const k = weekOf(r.day); weeks.set(k, (weeks.get(k) ?? new Set()).add(r.name)) }
  const busiest = [...weeks].map(([week_starting, s]) => ({ week_starting, people_off: s.size })).sort((a, b) => b.people_off - a.people_off).slice(0, 4)

  const cmp = (cur: number | null, p: number | null | undefined) => (withCompare ? compare(cur, p) : { value: cur, previous: null, change: null, direction: 'unknown' as const })
  const headline = {
    month: w.label,
    active_staff: staff.length,
    questions_asked: cmp(qNow.length, qPrev.length),
    audits_completed: cmp(runsIn(month).length, runsIn(w.previous).length),
    average_audit_score_percent: cmp(avgScore(runsIn(month)), avgScore(runsIn(w.previous))),
    audit_actions_raised: cmp(raisedIn(w), raisedIn(prev)),
    audit_actions_closed: cmp(closedIn(w), closedIn(prev)),
    training_completed: cmp(training.completed_in_window, trainingPrev?.completed_in_window),
    cqc_prep_answered: cmp(answeredIn(delNow.rows), answeredIn(delPrev.rows)),
  }
  const attention = attentionFlags({ credentials_expired: expired, credentials_due_30: due30, overdue_actions: actionsNow.overdue, overdue_audits: overdueAudits, training_overdue: training.overdue_now, pending_holiday_requests: Number(pending) || 0, over_allowance: overAllowance, cqc_prep_pending_old: delSummary.pending_over_days.count })
  return {
    window: { month: w.month, label: w.label, from: w.from, to: w.to, compared_with: withCompare ? prev.label : null },
    headline,
    training_and_compliance: { training_completed_in_month: training.completed_in_window, training_overdue_now: training.overdue_now, training_expired_now: training.expired_now, staff_checks_expired: expired, staff_checks_expiring_30_days: due30, cqc_prep: { sent_in_month: delSummary.sent, answered: delSummary.answered, average_score: evalAvg(delNow.rows), waiting_over_14_days: delSummary.pending_over_days.count } },
    audits_and_actions: { audits_completed: runsIn(month).length, average_score_percent: avgScore(runsIn(month)), audits_overdue_now: overdueAudits, audits_due_now: (due as any).due?.length ?? 0, actions: actionsNow },
    holiday_and_workforce: { headcount: staff.length, busiest_weeks_next_8: busiest, people_over_allowance: overAllowance, requests_waiting: Number(pending) || 0 },
    attention,
    history_note: withCompare ? 'Last month is compared only where the records keep history (questions, audits, actions, training completions and CQC prep). Headcount, overdue counts and holiday balances are as at today and are not compared.' : null,
  }
}

export { tenantInsights, getReadinessScore }
