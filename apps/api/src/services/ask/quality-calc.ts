// Pure calculations for the quality and compliance agents (Analytics, CQC analytics, CQC prep, Audits, Governance reports). No database, no network: the tools load the rows
// and pass them in, so every figure here is easy to test with fixtures. Nothing here ever sees a date of birth, a contact detail or health information.
import { addDays, weekStart } from '../../lib/holiday-math'

const r1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
const iso = (d: Date | string) => (d instanceof Date ? d : new Date(d)).toISOString().slice(0, 10)
const pctOf = (n: number, d: number) => (d > 0 ? r1((n / d) * 100) : null)

// ── Analytics: how the team uses CareStream ───────────────────────────────────────────────────────────────────────
export interface QueryRow { user_id: string | null; channel: string; no_match: boolean; response_time_ms: number | null; feedback: string | null; created_at: Date | string; shared_device_id?: string | null; category?: string | null; text?: string }

/** Whole weeks (Monday start) between two dates, each with a count of the dates that fall in it. */
export function weeklyBuckets(dates: Array<Date | string>, from: string, to: string): Array<{ week_starting: string; count: number }> {
  const out = new Map<string, number>()
  for (let w = weekStart(from); w <= to; w = addDays(w, 7)) out.set(w, 0)
  for (const d of dates) { const w = weekStart(iso(d)); if (out.has(w)) out.set(w, (out.get(w) ?? 0) + 1) }
  return [...out].map(([week_starting, count]) => ({ week_starting, count }))
}

export function changePercent(current: number, previous: number): number | null {
  if (!Number.isFinite(current) || !Number.isFinite(previous) || previous === 0) return null
  return r1(((current - previous) / previous) * 100)
}

export function summariseUsage(rows: QueryRow[], prevRows: QueryRow[], activeStaff: number, windowDays: number, today: string) {
  const from = addDays(today, -(windowDays - 1))
  const channels = new Map<string, number>()
  for (const r of rows) channels.set(r.channel || 'chat', (channels.get(r.channel || 'chat') ?? 0) + 1)
  const askers = new Set(rows.filter(r => r.user_id).map(r => r.user_id as string))
  const timed = rows.map(r => r.response_time_ms).filter((v): v is number => typeof v === 'number' && v > 0)
  const noMatch = rows.filter(r => r.no_match).length
  const shared = rows.filter(r => r.shared_device_id).length
  return {
    window: { from, to: today, days: windowDays },
    total_questions: rows.length,
    previous_period_total: prevRows.length,
    change_percent: changePercent(rows.length, prevRows.length),
    by_channel: [...channels].map(([channel, count]) => ({ channel, count })).sort((a, b) => b.count - a.count),
    per_week: weeklyBuckets(rows.map(r => r.created_at), from, today),
    staff_who_asked: askers.size,
    active_staff: activeStaff,
    adoption_percent: pctOf(askers.size, activeStaff),
    no_answer_found: noMatch,
    no_answer_percent: pctOf(noMatch, rows.length),
    average_response_seconds: timed.length ? r1(timed.reduce((s, v) => s + v, 0) / timed.length / 1000) : null,
    feedback: { positive: rows.filter(r => r.feedback === 'positive').length, negative: rows.filter(r => r.feedback === 'negative').length },
    asked_on_shared_tablets_percent: pctOf(shared, rows.length),
  }
}

/** The most common values, with counts, largest first. Empty values are left out. */
export function topCounts(values: Array<string | null | undefined>, limit = 10): Array<{ value: string; count: number }> {
  const m = new Map<string, number>()
  for (const v of values) { const k = (v ?? '').trim(); if (k) m.set(k, (m.get(k) ?? 0) + 1) }
  return [...m].map(([value, count]) => ({ value, count })).sort((a, b) => b.count - a.count || a.value.localeCompare(b.value)).slice(0, Math.max(1, limit))
}

export interface StaffLite { id: string; job_role: string | null }
/** Usage by job role without naming anyone: how many people in the role asked, how many questions, and how many in the role have never asked in the window. */
export function usageByRole(rows: QueryRow[], staff: StaffLite[]) {
  const roleOf = new Map(staff.map(s => [s.id, s.job_role ?? 'No job role recorded']))
  const roles = new Map<string, { staff: number; askers: Set<string>; questions: number }>()
  for (const s of staff) { const k = s.job_role ?? 'No job role recorded'; const e = roles.get(k) ?? { staff: 0, askers: new Set<string>(), questions: 0 }; e.staff++; roles.set(k, e) }
  for (const r of rows) {
    if (!r.user_id || !roleOf.has(r.user_id)) continue
    const e = roles.get(roleOf.get(r.user_id)!)!; e.questions++; e.askers.add(r.user_id)
  }
  return [...roles].map(([role, e]) => ({ role, staff: e.staff, asked: e.askers.size, never_asked: e.staff - e.askers.size, questions: e.questions, adoption_percent: pctOf(e.askers.size, e.staff) })).sort((a, b) => b.questions - a.questions)
}

/** Question text can contain a name or a phone number typed by staff: take out anything that looks like contact details and keep it short. */
export function redactContact(text: string, max = 160): string {
  const t = String(text ?? '')
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[email removed]')
    .replace(/(?:\+?44|0)(?:\s?\d){9,10}\b/g, '[phone removed]')
    .replace(/\s+/g, ' ').trim()
  return t.length > max ? `${t.slice(0, max - 1)}…` : t
}

// ── CQC prep: staff questions and how they answered ───────────────────────────────────────────────────────────────────
export interface DeliveryRow { user_id: string; question_id: string; domain: string; job_role: string | null; status: string; score: number | null; first_score: number | null; attempts: number; sent_at: Date | string; answered_at: Date | string | null }
export const DOMAINS = ['safe', 'effective', 'caring', 'responsive', 'well_led'] as const
export const DOMAIN_LABEL: Record<string, string> = { safe: 'Safe', effective: 'Effective', caring: 'Caring', responsive: 'Responsive', well_led: 'Well-led' }
const avg = (v: number[]) => (v.length ? r1(v.reduce((s, x) => s + x, 0) / v.length) : null)

export function summariseDeliveries(rows: DeliveryRow[], activeStaffIds: string[], today: string, chaseAfterDays = 14) {
  const sent = rows.length
  const answered = rows.filter(r => r.status === 'answered' || r.status === 'evaluated').length
  const evaluated = rows.filter(r => r.status === 'evaluated')
  const pending = rows.filter(r => r.status === 'pending')
  const old = pending.filter(r => Date.parse(iso(r.sent_at)) <= Date.parse(addDays(today, -chaseAfterDays)))
  const retried = evaluated.filter(r => r.attempts > 1 && r.score != null && r.first_score != null)
  const byDomain = DOMAINS.map(d => {
    const rs = rows.filter(r => r.domain === d), ev = rs.filter(r => r.status === 'evaluated' && r.score != null)
    return { domain: d, label: DOMAIN_LABEL[d], sent: rs.length, answered: rs.filter(r => r.status !== 'pending').length, average_score: avg(ev.map(r => r.score as number)) }
  })
  const roles = new Map<string, DeliveryRow[]>()
  for (const r of rows) { const k = r.job_role ?? 'No job role recorded'; roles.set(k, [...(roles.get(k) ?? []), r]) }
  const byRole = [...roles].map(([role, rs]) => ({ role, sent: rs.length, answered: rs.filter(r => r.status !== 'pending').length, average_score: avg(rs.filter(r => r.status === 'evaluated' && r.score != null).map(r => r.score as number)) })).sort((a, b) => b.sent - a.sent)
  const reached = new Set(evaluated.map(r => r.user_id))
  return {
    sent, answered, answered_percent: pctOf(answered, sent), evaluated: evaluated.length, pending: pending.length, pending_over_days: { days: chaseAfterDays, count: old.length },
    average_score: avg(evaluated.map(r => r.score).filter((v): v is number => v != null)),
    average_first_attempt_score: avg(evaluated.map(r => r.first_score).filter((v): v is number => v != null)),
    improvement_after_retry: retried.length ? { people_retried: new Set(retried.map(r => r.user_id)).size, average_gain: r1(retried.reduce((s, r) => s + ((r.score as number) - (r.first_score as number)), 0) / retried.length) } : null,
    by_domain: byDomain, by_job_role: byRole,
    staff_with_a_scored_answer: reached.size, active_staff: activeStaffIds.length, staff_coverage_percent: pctOf([...reached].filter(id => activeStaffIds.includes(id)).length, activeStaffIds.length),
    staff_with_none_sent: activeStaffIds.filter(id => !rows.some(r => r.user_id === id)).length,
  }
}

/** The questions staff find hardest: lowest average score, with how many people answered. No people are named. */
export function weakestQuestions(rows: Array<{ question_id: string; question: string; domain: string; score: number | null; status: string }>, limit = 8, minAnswers = 2) {
  const by = new Map<string, { question: string; domain: string; scores: number[] }>()
  for (const r of rows) {
    if (r.status !== 'evaluated' || r.score == null) continue
    const e = by.get(r.question_id) ?? { question: r.question, domain: r.domain, scores: [] }; e.scores.push(r.score); by.set(r.question_id, e)
  }
  return [...by.values()].filter(e => e.scores.length >= minAnswers).map(e => ({ question: e.question, domain: DOMAIN_LABEL[e.domain] ?? e.domain, answers: e.scores.length, average_score: avg(e.scores) as number })).sort((a, b) => a.average_score - b.average_score).slice(0, limit)
}

// ── Audits ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface ActionRow { status: string; priority: string; due_date: Date | string | null; created_at: Date | string; done_at: Date | string | null; verified_result: string | null; extension_status: string | null }
export function summariseActions(rows: ActionRow[], today: string) {
  const open = rows.filter(a => a.status !== 'done')
  const overdue = open.filter(a => a.due_date && iso(a.due_date) < today)
  const done = rows.filter(a => a.status === 'done' && a.done_at)
  const days = done.map(a => (Date.parse(iso(a.done_at as any)) - Date.parse(iso(a.created_at))) / 86_400_000).filter(d => d >= 0)
  const priorities = ['immediate', 'priority', 'monitor']
  return {
    raised: rows.length, done: done.length, open: open.length, in_progress: rows.filter(a => a.status === 'in_progress').length,
    overdue: overdue.length, overdue_percent_of_open: pctOf(overdue.length, open.length),
    closure_percent: pctOf(done.length, rows.length),
    average_days_to_close: days.length ? r1(days.reduce((s, d) => s + d, 0) / days.length) : null,
    open_by_priority: priorities.map(p => ({ priority: p, open: open.filter(a => a.priority === p).length, overdue: overdue.filter(a => a.priority === p).length })),
    checked_at_next_audit: { fixed: rows.filter(a => a.verified_result === 'fixed').length, not_fixed: rows.filter(a => a.verified_result === 'not_fixed').length },
    extension_requests_waiting: rows.filter(a => a.extension_status === 'pending').length,
  }
}

export interface AssignmentRow { audit_name: string; status: string; due_date: Date | string; assignee_role?: string | null; assignee_name?: string | null }
/** Open audits past their due date, by audit, with the days overdue. Names of people are only included when asked for. */
export function overdueAssignments(rows: AssignmentRow[], today: string, includeNames = false) {
  const list = rows.filter(a => a.status === 'open' && iso(a.due_date) < today).map(a => ({ audit: a.audit_name, due: iso(a.due_date), days_overdue: Math.round((Date.parse(today) - Date.parse(iso(a.due_date))) / 86_400_000), ...(includeNames ? { assigned_to: a.assignee_name ?? null } : { assigned_role: a.assignee_role ?? null }) })).sort((a, b) => b.days_overdue - a.days_overdue)
  const byAudit = topCounts(list.map(l => l.audit), 12).map(x => ({ audit: x.value, overdue: x.count }))
  return { count: list.length, by_audit: byAudit, oldest_first: list.slice(0, 25), contains_names: includeNames }
}

// ── Governance reports ───────────────────────────────────────────────────────────────────────────────────────────────
/** A month as YYYY-MM, its first and last day, and the month before it. */
export function monthWindow(month: string) {
  const [y, m] = month.split('-').map(Number)
  const first = `${y}-${String(m).padStart(2, '0')}-01`
  const next = new Date(Date.UTC(y, m, 1)), last = addDays(next.toISOString().slice(0, 10), -1)
  const prevDate = new Date(Date.UTC(y, m - 2, 1))
  return { month, from: first, to: last, previous: `${prevDate.getUTCFullYear()}-${String(prevDate.getUTCMonth() + 1).padStart(2, '0')}`, label: new Date(Date.UTC(y, m - 1, 1)).toLocaleDateString('en-GB', { month: 'long', year: 'numeric', timeZone: 'UTC' }) }
}
/** The last complete month before a date. */
export function lastCompleteMonth(today: string): string {
  const d = new Date(today + 'T00:00:00Z'); d.setUTCDate(1); d.setUTCDate(0)
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
}
export interface Compared { value: number | null; previous: number | null; change: number | null; direction: 'up' | 'down' | 'same' | 'unknown' }
export function compare(value: number | null, previous: number | null | undefined): Compared {
  if (value == null || previous == null) return { value, previous: previous ?? null, change: null, direction: 'unknown' }
  const change = r2(value - previous)
  return { value, previous, change, direction: change > 0 ? 'up' : change < 0 ? 'down' : 'same' }
}
/** What needs attention, as plain counts (never people). The agent turns these into a short list. */
export function attentionFlags(x: { credentials_expired: number; credentials_due_30: number; overdue_actions: number; overdue_audits: number; training_overdue: number; pending_holiday_requests: number; over_allowance: number; cqc_prep_pending_old: number; below_nlw?: number }): Array<{ level: 'high' | 'medium' | 'low'; text: string }> {
  const out: Array<{ level: 'high' | 'medium' | 'low'; text: string }> = []
  const add = (n: number | undefined, level: 'high' | 'medium' | 'low', one: string, many: string) => { if (n && n > 0) out.push({ level, text: n === 1 ? one : many.replace('{n}', String(n)) }) }
  add(x.credentials_expired, 'high', '1 staff check (DBS, right to work or registration) has expired.', '{n} staff checks (DBS, right to work or registration) have expired.')
  add(x.below_nlw, 'high', '1 person is paid below the National Living Wage for their age band.', '{n} people are paid below the National Living Wage for their age band.')
  add(x.overdue_actions, 'high', '1 audit action is overdue.', '{n} audit actions are overdue.')
  add(x.overdue_audits, 'medium', '1 audit is overdue.', '{n} audits are overdue.')
  add(x.training_overdue, 'medium', '1 training item is overdue.', '{n} training items are overdue.')
  add(x.credentials_due_30, 'medium', '1 staff check expires in the next 30 days.', '{n} staff checks expire in the next 30 days.')
  add(x.cqc_prep_pending_old, 'low', '1 CQC prep question has been waiting a long time for an answer.', '{n} CQC prep questions have been waiting a long time for an answer.')
  add(x.over_allowance, 'low', '1 person is over their holiday allowance.', '{n} people are over their holiday allowance.')
  add(x.pending_holiday_requests, 'low', '1 holiday request is waiting for a decision.', '{n} holiday requests are waiting for a decision.')
  return out
}
