// Pure calculations for the people development agents (training, CPD, onboarding, compliance, incentives). No database here: the loaders live in tools-people.ts and pass
// plain rows in, so every rule below can be tested with fixtures. Dates are YYYY-MM-DD strings (UK days). Nothing here reads or returns contact details or dates of birth.

export const round1 = (n: number) => Math.round((n + Number.EPSILON) * 10) / 10
export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const pctOf = (part: number, whole: number) => (whole > 0 ? Math.round((part / whole) * 100) : null)
export const dayDiff = (from: string, to: string) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86_400_000)
export const addDaysTo = (d: string, n: number) => new Date(Date.parse(d + 'T00:00:00Z') + n * 86_400_000).toISOString().slice(0, 10)
export const median = (xs: number[]) => { if (!xs.length) return null; const s = [...xs].sort((a, b) => a - b); const m = Math.floor(s.length / 2); return s.length % 2 ? s[m] : round2((s[m - 1] + s[m]) / 2) }

// ── Training and CPD enrolments ──────────────────────────────────────────────────────────────────────────────────────────────────
export interface EnrolRow {
  user_id: string; name: string; job_role: string | null
  module_id: string; module_name: string; category?: string | null
  status: string                       // not_started | in_progress | complete | expired
  created_at: string                   // when it was assigned
  completed_at: string | null; due_date: string | null; expires_at: string | null
  cpd: boolean; duration_minutes: number | null; learn_seconds: number
}
export type EnrolState = 'complete' | 'expired' | 'overdue' | 'in_progress' | 'not_started'

/** The state of one enrolment on a day. Same rules as the training matrix: complete but past its expiry is expired, not complete and past its due date is overdue. */
export function enrolState(e: Pick<EnrolRow, 'status' | 'due_date' | 'expires_at'>, today: string): EnrolState {
  if (e.status === 'expired') return 'expired'
  if (e.status === 'complete') return e.expires_at && e.expires_at < today ? 'expired' : 'complete'
  if (e.due_date && e.due_date < today) return 'overdue'
  return e.status === 'in_progress' ? 'in_progress' : 'not_started'
}

/** Renewals create new rows, so the newest enrolment for a person and module is the live one. */
export function latestPerPersonModule(rows: EnrolRow[]): EnrolRow[] {
  const m = new Map<string, EnrolRow>()
  for (const r of rows) { const k = `${r.user_id}|${r.module_id}`; const cur = m.get(k); if (!cur || r.created_at > cur.created_at) m.set(k, r) }
  return [...m.values()]
}

export interface StateCounts { assigned: number; complete: number; in_progress: number; not_started: number; overdue: number; expired: number }
const blank = (): StateCounts => ({ assigned: 0, complete: 0, in_progress: 0, not_started: 0, overdue: 0, expired: 0 })
const bump = (c: StateCounts, s: EnrolState) => { c.assigned++; c[s]++ }

export function trainingOverview(rows: EnrolRow[], today: string) {
  const c = blank(); for (const r of rows) bump(c, enrolState(r, today))
  return { ...c, completion_percent: pctOf(c.complete, c.assigned), people: new Set(rows.map(r => r.user_id)).size, courses: new Set(rows.map(r => r.module_id)).size }
}

export function completionByModule(rows: EnrolRow[], today: string) {
  const m = new Map<string, { module: string; c: StateCounts }>()
  for (const r of rows) { const e = m.get(r.module_id) ?? { module: r.module_name, c: blank() }; bump(e.c, enrolState(r, today)); m.set(r.module_id, e) }
  return [...m.values()].map(e => ({ course: e.module, ...e.c, completion_percent: pctOf(e.c.complete, e.c.assigned) })).sort((a, b) => (a.completion_percent ?? 101) - (b.completion_percent ?? 101) || b.assigned - a.assigned)
}

export function completionByPerson(rows: EnrolRow[], today: string) {
  const m = new Map<string, { name: string; job_role: string | null; c: StateCounts }>()
  for (const r of rows) { const e = m.get(r.user_id) ?? { name: r.name, job_role: r.job_role, c: blank() }; bump(e.c, enrolState(r, today)); m.set(r.user_id, e) }
  return [...m.values()].map(e => ({ name: e.name, job_role: e.job_role, ...e.c, completion_percent: pctOf(e.c.complete, e.c.assigned) })).sort((a, b) => (a.completion_percent ?? 101) - (b.completion_percent ?? 101) || b.overdue - a.overdue || a.name.localeCompare(b.name))
}

export interface DueItem { name: string; job_role: string | null; course: string; kind: 'overdue' | 'due_soon' | 'expired' | 'expiring'; date: string; days: number }
/** Overdue and due soon (not complete) plus expired and expiring soon (complete but about to lapse), by person and course. days is negative when it is in the past. */
export function dueAndOverdue(rows: EnrolRow[], today: string, withinDays: number): DueItem[] {
  const to = addDaysTo(today, withinDays), out: DueItem[] = []
  for (const r of rows) {
    const st = enrolState(r, today)
    if (st === 'overdue' && r.due_date) out.push({ name: r.name, job_role: r.job_role, course: r.module_name, kind: 'overdue', date: r.due_date, days: dayDiff(today, r.due_date) })
    else if ((st === 'in_progress' || st === 'not_started') && r.due_date && r.due_date <= to) out.push({ name: r.name, job_role: r.job_role, course: r.module_name, kind: 'due_soon', date: r.due_date, days: dayDiff(today, r.due_date) })
    else if (st === 'expired' && r.expires_at) out.push({ name: r.name, job_role: r.job_role, course: r.module_name, kind: 'expired', date: r.expires_at, days: dayDiff(today, r.expires_at) })
    else if (st === 'complete' && r.expires_at && r.expires_at <= to) out.push({ name: r.name, job_role: r.job_role, course: r.module_name, kind: 'expiring', date: r.expires_at, days: dayDiff(today, r.expires_at) })
  }
  return out.sort((a, b) => a.days - b.days || a.name.localeCompare(b.name))
}

/** Assigned but never started, and how long ago it was assigned. */
export function notStarted(rows: EnrolRow[], today: string, minDaysAssigned: number) {
  return rows.filter(r => r.status === 'not_started')
    .map(r => ({ name: r.name, job_role: r.job_role, course: r.module_name, assigned_on: r.created_at.slice(0, 10), days_since_assigned: dayDiff(r.created_at.slice(0, 10), today), due_date: r.due_date }))
    .filter(r => r.days_since_assigned >= minDaysAssigned).sort((a, b) => b.days_since_assigned - a.days_since_assigned)
}

/** Days from being assigned to completing, per course (average and median), and the active learning time recorded. */
export function completionTime(rows: EnrolRow[]) {
  const m = new Map<string, { course: string; days: number[]; mins: number[] }>()
  for (const r of rows) {
    if (!r.completed_at) continue
    const e = m.get(r.module_id) ?? { course: r.module_name, days: [], mins: [] }
    e.days.push(Math.max(0, dayDiff(r.created_at.slice(0, 10), r.completed_at.slice(0, 10))))
    if (r.learn_seconds > 0) e.mins.push(r.learn_seconds / 60)
    m.set(r.module_id, e)
  }
  const per = [...m.values()].map(e => ({ course: e.course, completed: e.days.length, average_days_to_complete: round1(e.days.reduce((s, x) => s + x, 0) / e.days.length), median_days_to_complete: median(e.days), average_learning_minutes: e.mins.length ? Math.round(e.mins.reduce((s, x) => s + x, 0) / e.mins.length) : null }))
  const all = [...m.values()].flatMap(e => e.days)
  return { overall: all.length ? { completed: all.length, average_days_to_complete: round1(all.reduce((s, x) => s + x, 0) / all.length), median_days_to_complete: median(all) } : null, by_course: per.sort((a, b) => b.average_days_to_complete - a.average_days_to_complete) }
}

// ── CPD ───────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
/** CPD hours for CPD certified courses completed in a period: the course's estimated learning time (minutes divided by 60). Courses without an estimate are listed, not guessed. */
export function cpdHours(rows: EnrolRow[], from: string, to: string) {
  const done = rows.filter(r => r.cpd && r.completed_at && r.completed_at.slice(0, 10) >= from && r.completed_at.slice(0, 10) <= to)
  const per = new Map<string, { name: string; job_role: string | null; courses: number; hours: number }>()
  const noEstimate = new Set<string>()
  for (const r of done) {
    const e = per.get(r.user_id) ?? { name: r.name, job_role: r.job_role, courses: 0, hours: 0 }
    e.courses++
    if (r.duration_minutes && r.duration_minutes > 0) e.hours += r.duration_minutes / 60; else noEstimate.add(r.module_name)
    per.set(r.user_id, e)
  }
  const people = [...per.values()].map(e => ({ ...e, hours: round2(e.hours) })).sort((a, b) => b.hours - a.hours || a.name.localeCompare(b.name))
  return { period: { from, to }, completions: done.length, total_hours: round2(people.reduce((s, p) => s + p.hours, 0)), people, courses_without_time_estimate: [...noEstimate] }
}

// ── Onboarding ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface OnboardRow { name: string; job_role: string | null; flow: string; enrolled_at: string; due_date: string | null; completed_at: string | null; steps_total: number; steps_done: number }
export type OnboardState = 'complete' | 'overdue' | 'behind' | 'on_track' | 'not_started'
/** Behind means more than a quarter of the time to the due date has passed beyond the share of steps done. Overdue means the due date has passed. */
export function onboardState(r: OnboardRow, today: string): { state: OnboardState; percent: number | null } {
  const percent = pctOf(r.steps_done, r.steps_total)
  if (r.completed_at || (r.steps_total > 0 && r.steps_done >= r.steps_total)) return { state: 'complete', percent: 100 }
  if (r.due_date && r.due_date < today) return { state: 'overdue', percent }
  if (r.steps_done === 0) return { state: 'not_started', percent: 0 }
  if (r.due_date) {
    const span = dayDiff(r.enrolled_at.slice(0, 10), r.due_date), used = dayDiff(r.enrolled_at.slice(0, 10), today)
    if (span > 0 && used / span - (percent ?? 0) / 100 > 0.25) return { state: 'behind', percent }
  }
  return { state: 'on_track', percent }
}
export function onboardingProgress(rows: OnboardRow[], today: string) {
  return rows.map(r => { const s = onboardState(r, today); return { name: r.name, job_role: r.job_role, flow: r.flow, enrolled_on: r.enrolled_at.slice(0, 10), due_date: r.due_date, steps_done: r.steps_done, steps_total: r.steps_total, percent_complete: s.percent, state: s.state } })
    .sort((a, b) => ORDER[a.state] - ORDER[b.state] || (a.percent_complete ?? 0) - (b.percent_complete ?? 0))
}
const ORDER: Record<OnboardState, number> = { overdue: 0, behind: 1, not_started: 2, on_track: 3, complete: 4 }

// ── Compliance (credentials, supervisions, probation) ─────────────────────────────────────────────────────────────────────────────────
export type ExpiryBucket = 'expired' | 'within_30' | 'days_31_to_60' | 'days_61_to_90' | 'later'
export function expiryBucket(expires: string, today: string): ExpiryBucket {
  const d = dayDiff(today, expires)
  return d < 0 ? 'expired' : d <= 30 ? 'within_30' : d <= 60 ? 'days_31_to_60' : d <= 90 ? 'days_61_to_90' : 'later'
}
export interface CredRow { name: string; job_role: string | null; type: string; expires: string | null }
export function credentialExpiries(rows: CredRow[], today: string, withinDays: number) {
  const items = rows.filter(r => r.expires && dayDiff(today, r.expires) <= withinDays).map(r => ({ name: r.name, job_role: r.job_role, type: r.type, expires: r.expires!, days: dayDiff(today, r.expires!), bucket: expiryBucket(r.expires!, today) })).sort((a, b) => a.days - b.days || a.name.localeCompare(b.name))
  const counts: Record<string, Record<ExpiryBucket, number>> = {}
  for (const i of items) { const t = (counts[i.type] ??= { expired: 0, within_30: 0, days_31_to_60: 0, days_61_to_90: 0, later: 0 }); t[i.bucket]++ }
  return { count: items.length, counts_by_type: counts, items }
}

/** Average days between held sessions for one person (needs at least two). */
export function meanGapDays(heldOn: string[]): number | null {
  const s = [...heldOn].sort()
  if (s.length < 2) return null
  let sum = 0; for (let i = 1; i < s.length; i++) sum += dayDiff(s[i - 1], s[i])
  return Math.round(sum / (s.length - 1))
}

export type ProbationState = 'on_probation' | 'ending_within_30_days' | 'ended'
export function probationState(endsOn: string, today: string): ProbationState {
  if (endsOn < today) return 'ended'
  return dayDiff(today, endsOn) <= 30 ? 'ending_within_30_days' : 'on_probation'
}

// ── Incentives ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface LedgerRow { user_id: string; name: string; event: string; points: number }
export function pointsByPerson(rows: LedgerRow[]) {
  const m = new Map<string, { name: string; points: number; entries: number }>()
  for (const r of rows) { const e = m.get(r.user_id) ?? { name: r.name, points: 0, entries: 0 }; e.points += r.points; e.entries++; m.set(r.user_id, e) }
  return [...m.values()].sort((a, b) => b.points - a.points || a.name.localeCompare(b.name))
}
export function pointsByEvent(rows: LedgerRow[]) {
  const m = new Map<string, { event: string; points: number; entries: number }>()
  for (const r of rows) { const e = m.get(r.event) ?? { event: r.event, points: 0, entries: 0 }; e.points += r.points; e.entries++; m.set(r.event, e) }
  return [...m.values()].sort((a, b) => b.points - a.points)
}
export interface ClaimRow { status: string; value_pence: number | null }
export function claimsSummary(rows: ClaimRow[]) {
  const by: Record<string, { count: number; value_pounds: number }> = {}
  for (const r of rows) { const e = (by[r.status] ??= { count: 0, value_pounds: 0 }); e.count++; e.value_pounds = round2(e.value_pounds + (r.value_pence ?? 0) / 100) }
  const committed = round2((['approved', 'given'] as const).reduce((s, k) => s + (by[k]?.value_pounds ?? 0), 0))
  return { total_claims: rows.length, by_status: by, committed_value_pounds: committed }
}
