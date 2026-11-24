// The holiday sums, with no database: holiday years, what is booked and what is taken, carry over, the monthly matrix, clashes and the CSV import.
// Dates are plain "YYYY-MM-DD" strings (no times, no time zones) so a booking is always the same day for everyone.
//
// Rules (Len, 24 Nov 2026):
//  - Only APPROVED days count. Booked = approved and after today; taken = approved and up to and including today (by date, no job).
//  - Staff are measured in hours or in days (their own unit). In days, every booked day counts as 1 day whatever its hours.
//  - Bank holidays are worked in care: they are never deducted, they only carry a pay multiplier (stored, not calculated).
//  - Carry over (setting): on = untaken holiday is added to next year's allowance; off = it is lost at the year end.

export const MAX_HOURS_PER_DAY = 13
export const MAX_DAYS_PER_REQUEST = 60

export type Unit = 'hours' | 'days'
export interface DayRow { day: string; hours: number }

// ── Dates ──────────────────────────────────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
export const isYmd = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s
export const toYmd = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
export const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return toYmd(d) }
export function eachDay(from: string, to: string): string[] { const out: string[] = []; for (let d = from, i = 0; d <= to && i < 400; d = addDays(d, 1), i++) out.push(d); return out }
/** 0 = Monday ... 6 = Sunday */
export const weekdayIndex = (s: string) => (new Date(s + 'T00:00:00Z').getUTCDay() + 6) % 7
export const isWeekend = (s: string) => weekdayIndex(s) >= 5
/** The Monday of the week (the week is 7 days, Monday to Sunday). */
export const weekStart = (s: string) => addDays(s, -weekdayIndex(s))
/** Today in the UK as a date string (the service runs on UK time). */
export function ukToday(now: Date = new Date()): string {
  const f = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now)
  return f
}

// ── Holiday years ──────────────────────────────────────────────────────────────────────────
export interface YearRange { year: number; from: string; to: string; label: string }   // from and to are both inclusive
/** The holiday year that STARTS in `year` for a year start of month/day. The default (1 January) gives the calendar year. */
export function yearRange(year: number, month = 1, day = 1): YearRange {
  const from = `${year}-${pad(month)}-${pad(day)}`
  const to = addDays(`${year + 1}-${pad(month)}-${pad(day)}`, -1)
  const label = month === 1 && day === 1 ? String(year) : `${year}/${String(year + 1).slice(2)}`
  return { year, from, to, label }
}
/** The year (by its starting calendar year) that contains a date. */
export function yearContaining(date: string, month = 1, day = 1): number {
  const y = Number(date.slice(0, 4))
  return date >= `${y}-${pad(month)}-${pad(day)}` ? y : y - 1
}
export interface MonthBucket { key: string; label: string; from: string; to: string }
/** The 12 months of a holiday year, starting at its first month. */
export function monthsOfYear(r: YearRange): MonthBucket[] {
  const out: MonthBucket[] = []
  const m0 = Number(r.from.slice(5, 7)), y0 = Number(r.from.slice(0, 4))
  const names = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
  for (let i = 0; i < 12; i++) {
    const m = ((m0 - 1 + i) % 12) + 1, y = y0 + Math.floor((m0 - 1 + i) / 12)
    const first = `${y}-${pad(m)}-01`
    const last = addDays(`${m === 12 ? y + 1 : y}-${pad(m === 12 ? 1 : m + 1)}-01`, -1)
    out.push({ key: `${y}-${pad(m)}`, label: `${names[m - 1]}-${String(y).slice(2)}`, from: first, to: last })
  }
  return out
}

// ── Balances ───────────────────────────────────────────────────────────────────────────────
const round2 = (n: number) => Math.round(n * 100) / 100
/** What one approved day counts for: its hours, or 1 when the person is measured in days. */
export const valueOf = (d: DayRow, unit: Unit) => (unit === 'days' ? 1 : d.hours)

export interface Balance {
  unit: Unit
  allowance: number            // the allocation typed on the staff record
  carry_in: number             // untaken holiday brought in from last year (0 when carry over is off)
  entitlement: number          // allowance + carry_in
  taken: number
  booked: number
  used: number                 // taken + booked
  remaining: number            // entitlement - used
  percent_taken: number        // taken / entitlement, 0 to 100
  by_month_taken: Record<string, number>
  by_month_booked: Record<string, number>
}

export function balanceFor(o: { allowance: number | null; unit: Unit; carryIn?: number; days: DayRow[]; range: YearRange; today: string }): Balance {
  const allowance = o.allowance != null && isFinite(o.allowance) ? o.allowance : 0
  const carry_in = Math.max(0, o.carryIn ?? 0)
  const months = monthsOfYear(o.range)
  const taken: Record<string, number> = {}, booked: Record<string, number> = {}
  for (const m of months) { taken[m.key] = 0; booked[m.key] = 0 }
  let t = 0, b = 0
  for (const d of o.days) {
    if (d.day < o.range.from || d.day > o.range.to) continue
    const v = valueOf(d, o.unit)
    const key = d.day.slice(0, 7)
    if (d.day <= o.today) { t += v; if (key in taken) taken[key] += v } else { b += v; if (key in booked) booked[key] += v }
  }
  const entitlement = round2(allowance + carry_in)
  const used = round2(t + b)
  for (const k of Object.keys(taken)) { taken[k] = round2(taken[k]); booked[k] = round2(booked[k]) }
  return {
    unit: o.unit, allowance: round2(allowance), carry_in: round2(carry_in), entitlement,
    taken: round2(t), booked: round2(b), used, remaining: round2(entitlement - used),
    percent_taken: entitlement > 0 ? Math.round((t / entitlement) * 1000) / 10 : 0,
    by_month_taken: taken, by_month_booked: booked,
  }
}

/** Untaken holiday brought in from the years before `year`, when carry over is on (0 when it is off). Looks back at most `back` years. */
export function carryInFor(o: { year: number; allowance: number | null; unit: Unit; days: DayRow[]; month: number; day: number; carryOver: boolean; back?: number }): number {
  if (!o.carryOver) return 0
  const back = o.back ?? 3
  let carry = 0
  // Walk forward from the earliest year we look at, so each year's carry feeds the next.
  for (let y = o.year - back; y < o.year; y++) {
    const r = yearRange(y, o.month, o.day)
    const inYear = o.days.filter(d => d.day >= r.from && d.day <= r.to)
    if (inYear.length === 0 && carry === 0) continue   // nothing booked and nothing carried: the person was not tracked that year
    const used = inYear.reduce((s, d) => s + valueOf(d, o.unit), 0)
    carry = Math.max(0, (o.allowance ?? 0) + carry - used)
  }
  return round2(carry)
}

// ── Requests ───────────────────────────────────────────────────────────────────────────────
export interface RequestInput { days: Array<{ day: unknown; hours: unknown }> }
export function validateDays(input: RequestInput['days'], opts: { today: string; allowPast?: boolean }): { ok: true; days: DayRow[]; total_hours: number } | { ok: false; error: string } {
  if (!Array.isArray(input) || input.length === 0) return { ok: false, error: 'Please choose at least one day.' }
  if (input.length > MAX_DAYS_PER_REQUEST) return { ok: false, error: `A request can cover up to ${MAX_DAYS_PER_REQUEST} days. Please split it.` }
  const seen = new Set<string>(); const days: DayRow[] = []
  for (const r of input) {
    if (!isYmd(r?.day)) return { ok: false, error: 'One of the dates is not valid.' }
    const hours = Number(r.hours)
    if (!Number.isInteger(hours) || hours < 1 || hours > MAX_HOURS_PER_DAY) return { ok: false, error: `Hours for each day must be a whole number from 1 to ${MAX_HOURS_PER_DAY}.` }
    if (seen.has(r.day)) return { ok: false, error: 'A date appears twice.' }
    if (!opts.allowPast && r.day < addDays(opts.today, -1)) return { ok: false, error: 'You cannot request a day that has already passed. Ask your manager to add it.' }
    seen.add(r.day); days.push({ day: r.day, hours })
  }
  days.sort((a, b) => a.day.localeCompare(b.day))
  return { ok: true, days, total_hours: days.reduce((s, d) => s + d.hours, 0) }
}

/** The default hours for a booked day: contracted hours a week over 5, rounded, kept between 1 and 13 (8 when we do not know). */
export function defaultDayHours(contractedPerWeek: number | null | undefined): number {
  if (!contractedPerWeek || !isFinite(contractedPerWeek) || contractedPerWeek <= 0) return 8
  return Math.min(MAX_HOURS_PER_DAY, Math.max(1, Math.round(contractedPerWeek / 5)))
}

// ── Clashes ────────────────────────────────────────────────────────────────────────────────
export interface OffRow { day: string; user_id: string; name: string; status: 'approved' | 'pending'; hours: number }
export interface DayClash { day: string; approved: Array<{ user_id: string; name: string; hours: number }>; pending: Array<{ user_id: string; name: string; hours: number }>; approved_count: number; over_limit: boolean }

/** For each requested day: who else is off (approved) and who else has asked (pending), and whether approving would go over the limit of people off at once. */
export function clashesFor(o: { days: string[]; userId: string; others: OffRow[]; maxOff: number | null }): DayClash[] {
  return o.days.map(day => {
    const on = o.others.filter(r => r.day === day && r.user_id !== o.userId)
    const approved = on.filter(r => r.status === 'approved').map(r => ({ user_id: r.user_id, name: r.name, hours: r.hours }))
    const pending = on.filter(r => r.status === 'pending').map(r => ({ user_id: r.user_id, name: r.name, hours: r.hours }))
    return { day, approved, pending, approved_count: approved.length, over_limit: o.maxOff != null && approved.length + 1 > o.maxOff }
  })
}

// ── Bank holidays (stored multiplier only, never deducted) ─────────────────────────────────
export const BANK_MULTIPLIERS = [1.25, 1.5, 1.75, 2, 2.5, 3]
export const DEFAULT_BANK_MULTIPLIER = 1.5
/** The multiplier for a bank holiday date: a per date override, else Christmas Day and Boxing Day at 2x, else the account default. */
export function bankMultiplier(date: string, name: string, def: number, overrides: Record<string, number> = {}): number {
  const o = overrides[date]
  if (typeof o === 'number' && BANK_MULTIPLIERS.includes(o)) return o
  if (/^(christmas day|boxing day)/i.test(name)) return 2
  return BANK_MULTIPLIERS.includes(def) ? def : DEFAULT_BANK_MULTIPLIER
}

// ── CSV import ─────────────────────────────────────────────────────────────────────────────
export interface ImportRow { line: number; who: string; day: string | null; hours: number | null; error: string | null }
const splitCsv = (line: string): string[] => {
  const out: string[] = []; let cur = '', q = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (q) { if (c === '"' && line[i + 1] === '"') { cur += '"'; i++ } else if (c === '"') q = false; else cur += c }
    else if (c === '"') q = true
    else if (c === ',') { out.push(cur); cur = '' }
    else cur += c
  }
  out.push(cur)
  return out.map(s => s.trim())
}
/** A date as 2026-03-04 or 04/03/2026 (day first, UK). */
export function parseDateCell(s: string): string | null {
  const t: string = s.trim()
  if (isYmd(t)) return t
  const m = String(s).trim().match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/)
  if (!m) return null
  const iso = `${m[3]}-${pad(Number(m[2]))}-${pad(Number(m[1]))}`
  return isYmd(iso) ? iso : null
}
/** Columns: email or name, date, hours (and an optional status, only "approved" is accepted). The first row is a header when it has no date. */
export function parseImportCsv(text: string): { rows: ImportRow[]; header: boolean } {
  const lines = String(text ?? '').replace(/^﻿/, '').split(/\r?\n/).filter(l => l.trim())
  const rows: ImportRow[] = []
  let header = false
  lines.forEach((raw, i) => {
    const c = splitCsv(raw)
    if (i === 0 && !parseDateCell(c[1] ?? '')) { header = true; return }
    const who = c[0] ?? '', day = parseDateCell(c[1] ?? '')
    const hoursRaw = c[2] ?? ''
    const hours = Number(hoursRaw)
    const status = (c[3] ?? 'approved').toLowerCase() || 'approved'
    let error: string | null = null
    if (!who) error = 'No email or name.'
    else if (!day) error = 'The date is not valid (use 2026-03-04 or 04/03/2026).'
    else if (!hoursRaw || !isFinite(hours) || hours <= 0 || hours > MAX_HOURS_PER_DAY || !Number.isInteger(hours)) error = `Hours must be a whole number from 1 to ${MAX_HOURS_PER_DAY}.`
    else if (status !== 'approved') error = 'Only approved bookings can be imported.'
    rows.push({ line: i + 1, who, day, hours: error ? null : hours, error })
  })
  return { rows, header }
}
