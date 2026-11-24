// The rules a holiday request must pass, with no database (Len, 24 Nov 2026). A staff request can NEVER break them. An administrator, or a manager who decides requests,
// can approve, book or change a booking that breaks a rule only by choosing "Allow over the allowance" and writing a reason (never for booking beyond next year).
//   1. Balance: what is left = this year's allowance (incl. carry over) minus approved (taken and booked, incl. figures loaded from the spreadsheet) minus PENDING requests.
//      A request over what is left is refused and told exactly how much can still be booked. Zero left: "You have no holiday left to book".
//   2. Year boundary: days are split by holiday year and each year is checked against its own allowance. Next year counts its basic allowance only (carry over cannot be
//      known yet). Booking further ahead than next year is refused.
//   3. Maximum people off on one day (a setting) counts approved and pending people. 4. Blocked dates (a setting).
import { type DayRow, type OffRow, type Unit, valueOf, yearContaining, yearRange, addDays, isYmd } from './holiday-math'

const round2 = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number) => (Number.isInteger(n) ? String(n) : String(round2(n)))
const unitWord = (u: Unit, n: number) => (u === 'days' ? (n === 1 ? 'day' : 'days') : (n === 1 ? 'hour' : 'hours'))
export const niceDay = (ymd: string) => new Date(ymd + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' })
const shortDay = (ymd: string) => new Date(ymd + 'T00:00:00Z').toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' })

export interface Blocked { from: string; to: string; reason: string }
export interface YearState {
  year: number; label: string
  allowance_set: boolean      // an allowance has been typed on the staff record
  entitlement: number         // allowance + carry in
  used: number                // approved days (taken + booked) and figures loaded from the spreadsheet
  pending: number             // other requests still waiting, held back
  future: boolean             // a year after the current one: carry over cannot be known yet
}
export type IssueCode = 'balance' | 'max_off' | 'blocked' | 'too_far' | 'overlap'
export interface RuleIssue { code: IssueCode; message: string; overridable: boolean; day?: string; year?: number }

/** What is left to ask for in a year. */
export const availableIn = (s: YearState): number => Math.max(0, round2(s.entitlement - s.used - s.pending))

/** Cleans the blocked dates a settings form sends: real dates, from not after to, a short reason, at most 50. */
export function cleanBlocked(input: unknown): Blocked[] {
  if (!Array.isArray(input)) return []
  const out: Blocked[] = []
  for (const r of input.slice(0, 50)) {
    const from = String((r as any)?.from ?? ''), to = String((r as any)?.to ?? (r as any)?.from ?? '')
    if (!isYmd(from) || !isYmd(to) || to < from) continue
    out.push({ from, to, reason: String((r as any)?.reason ?? '').replace(/\s+/g, ' ').trim().slice(0, 120) || 'Not available for holiday' })
  }
  return out.sort((a, b) => a.from.localeCompare(b.from))
}

/** "3 to 6 March" style text for a list of days. */
export function dayList(days: string[]): string {
  const ds = [...new Set(days)].sort()
  const runs: string[][] = []
  for (const d of ds) { const l = runs[runs.length - 1]; if (l && addDays(l[l.length - 1], 1) === d) l.push(d); else runs.push([d]) }
  const text = runs.slice(0, 3).map(r => (r.length === 1 ? shortDay(r[0]) : `${shortDay(r[0])} to ${shortDay(r[r.length - 1])}`)).join(', ')
  return runs.length > 3 ? `${text} and more` : text
}

export function evaluateRequest(o: {
  days: DayRow[]; unit: Unit; today: string; month: number; day: number
  years: Record<number, YearState>
  others: OffRow[]                  // other people's approved and pending days (not this person, not this request)
  maxOff: number | null; blocked: Blocked[]; carryOver: boolean
}): RuleIssue[] {
  const issues: RuleIssue[] = []
  const current = yearContaining(o.today, o.month, o.day)
  const byYear = new Map<number, DayRow[]>()
  for (const d of o.days) { const y = yearContaining(d.day, o.month, o.day); byYear.set(y, [...(byYear.get(y) ?? []), d]) }

  // Further ahead than next year: refused for everyone.
  const nextLabel = yearRange(current + 1, o.month, o.day).label
  for (const [y, ds] of byYear) if (y > current + 1) issues.push({ code: 'too_far', overridable: false, year: y, day: ds[0].day, message: `You can book up to the end of ${nextLabel}. ${niceDay(ds[0].day)} is further ahead.` })

  // The balance, year by year.
  const multi = [...byYear.keys()].filter(y => y <= current + 1).length > 1
  for (const [y, ds] of [...byYear].sort((a, b) => a[0] - b[0])) {
    if (y > current + 1) continue
    const st = o.years[y]; if (!st) continue
    const asked = round2(ds.reduce((s, d) => s + valueOf(d, o.unit), 0))
    const left = availableIn(st)
    const suffix = multi || st.future ? ` for ${st.label}` : ''
    const futureNote = st.future ? ` For next year only your basic allowance counts${o.carryOver ? '; any holiday carried over is added at the year end' : ''}.` : ''
    if (!st.allowance_set) issues.push({ code: 'balance', overridable: true, year: y, message: `Your holiday allowance has not been set up yet${suffix}. Please ask your manager.` })
    else if (left <= 0) issues.push({ code: 'balance', overridable: true, year: y, message: `You have no holiday left to book${suffix}.${futureNote}` })
    else if (asked > left) issues.push({ code: 'balance', overridable: true, year: y, message: `You have ${fmt(left)} ${unitWord(o.unit, left)} left${suffix}. This request is ${fmt(asked)} ${unitWord(o.unit, asked)}. Please shorten it.${futureNote}` })
  }

  // Too many people off on a day (approved and pending count; each person once).
  if (o.maxOff != null) {
    const per = new Map<string, Set<string>>()
    for (const r of o.others) { const s = per.get(r.day) ?? new Set<string>(); s.add(r.user_id); per.set(r.day, s) }
    for (const d of o.days.map(x => x.day).sort()) if ((per.get(d)?.size ?? 0) >= o.maxOff) issues.push({ code: 'max_off', overridable: true, day: d, message: `Too many people are already off on ${niceDay(d)}.` })
  }

  // Blocked dates.
  for (const b of o.blocked) {
    const hit = o.days.map(x => x.day).filter(d => d >= b.from && d <= b.to)
    if (hit.length) issues.push({ code: 'blocked', overridable: true, day: hit[0], message: `You cannot book holiday on ${dayList(hit)}: ${b.reason}` })
  }
  return issues
}

export type GateResult = { ok: true; override: boolean; overBalance: boolean } | { ok: false; reason: 'rules' | 'needs_note' | 'refused'; issues: RuleIssue[]; canOverride: boolean }
/** Whether a request with these issues may go ahead: staff never; an approver only with the override ticked and a reason of a few words. */
export function gate(issues: RuleIssue[], who: { approver: boolean; override: boolean; note: string | null }): GateResult {
  if (issues.length === 0) return { ok: true, override: false, overBalance: false }
  const refusable = issues.some(i => !i.overridable)
  if (!who.approver || refusable) return { ok: false, reason: refusable ? 'refused' : 'rules', issues, canOverride: who.approver && !refusable }
  if (!who.override) return { ok: false, reason: 'rules', issues, canOverride: true }
  if (!who.note || who.note.trim().length < 3) return { ok: false, reason: 'needs_note', issues, canOverride: true }
  return { ok: true, override: true, overBalance: issues.some(i => i.code === 'balance') }
}

/** The check and the write happen under one lock for the person, so two requests sent at the same moment cannot both pass the balance check. */
export interface Locker { lock<R>(key: string, fn: () => Promise<R>): Promise<R> }
export async function reserve<T>(io: Locker, key: string, check: () => Promise<RuleIssue[]>, who: { approver: boolean; override: boolean; note: string | null }, write: (g: Extract<GateResult, { ok: true }>, issues: RuleIssue[]) => Promise<T>)
  : Promise<{ ok: true; value: T; issues: RuleIssue[]; gate: Extract<GateResult, { ok: true }> } | Extract<GateResult, { ok: false }>> {
  return io.lock(key, async () => {
    const issues = await check()
    const g = gate(issues, who)
    if (!g.ok) return g
    const value = await write(g, issues)
    return { ok: true as const, value, issues, gate: g }
  })
}
