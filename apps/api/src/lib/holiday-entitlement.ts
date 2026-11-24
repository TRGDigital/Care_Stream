// Holiday entitlement for starters, leavers and part time staff. PURE: no database, no network, no clock. Dates are UK style strings (YYYY-MM-DD).
//
// The rules follow GOV.UK (fetched and read on 24 November 2026; re-check them if GOV.UK changes):
//   https://www.gov.uk/holiday-entitlement-rights                                   (the guide: entitlement, calculating leave, holiday pay, leaving)
//   https://www.gov.uk/holiday-entitlement-rights/calculate-leave-entitlement       (starters, the accrual system, irregular hours and part year workers)
//   https://www.gov.uk/holiday-entitlement-rights/taking-holiday-before-leaving-a-job   (leavers: untaken statutory leave must be paid)
//   https://www.gov.uk/calculate-your-holiday-entitlement                           (the official calculator, an interactive tool with no API; used here as the cross check)
// What GOV.UK says, in short:
//   * Statutory leave is 5.6 weeks a year, limited to 28 days. A 5 day week is 28 days; 3 days a week is 16.8 days (3 x 5.6); 6 days a week is still 28.
//   * A starter part way through the leave year gets part of the year's leave. Under the accrual system a worker gets one twelfth of their leave in each month, and a
//     worker who starts part way through a month can accrue one twelfth from their first day. Example: 28 days, leave year from 1 January, start on 13 January: January
//     gives 28 / 12 = 2.33, rounded UP to the nearest half day = 2.5 days. Alternatively the employer may work the first month out pro rata by days.
//     After the third month: 28 / 12 x 3 = 7 days.
//   * Irregular hours and part year workers (leave years starting after 31 March 2024) accrue 12.07 percent of the hours worked in each pay period, rounded up to the nearest
//     hour if the entitlement is 0.5 of an hour or more. Example: 30 hours worked, paid weekly: 30 x 12.07 / 100 = 3.621, which is 4 hours.
//   * Leavers build up leave to their last day. The only time someone can be paid instead of taking statutory leave is when they leave, and untaken statutory leave must be
//     paid. Money must not be taken from final pay for leave taken in excess unless that was agreed beforehand in writing.
//   * Carry over is a matter for the contract, so it is not modelled here.
// The calculator gives the STATUTORY minimum and a pro rata of the CONTRACTUAL allowance the admin types in. It is a helper, not legal advice.

export type Unit = 'hours' | 'days'
export type PartYearMethod = 'monthly' | 'exact_days'
export type RoundTo = 'half_day' | 'tenth_hour' | 'none'

export const STATUTORY_WEEKS = 5.6
export const STATUTORY_CAP_DAYS = 28
export const IRREGULAR_HOURS_RATE = 0.1207   // 12.07 percent

const GOVUK_CALCULATOR = 'https://www.gov.uk/calculate-your-holiday-entitlement'
const BASE_CAVEATS = [
  `Not covered here: compressed hours, annualised hours, shift patterns, term time workers and workers whose hours change every week. For those, use the GOV.UK holiday entitlement calculator: ${GOVUK_CALCULATOR}`,
  'Rolled up holiday pay (adding holiday pay into the hourly rate) is not allowed for workers on regular hours.',
  'Carry over of unused leave is set by the contract and is not worked out here.',
]

// ── date helpers (UTC, so daylight saving never moves a day) ───────────────────────────────────────────────────────
const pad = (n: number) => String(n).padStart(2, '0')
const isYmd = (s: unknown): s is string => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s) && !Number.isNaN(Date.parse(s + 'T00:00:00Z')) && new Date(s + 'T00:00:00Z').toISOString().slice(0, 10) === s
const toDate = (s: string) => new Date(s + 'T00:00:00Z')
const fromDate = (d: Date) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`
export const addDays = (s: string, n: number) => { const d = toDate(s); d.setUTCDate(d.getUTCDate() + n); return fromDate(d) }
/** Whole days from a to b, counting both ends (the same day is 1). */
export const daysInclusive = (a: string, b: string) => Math.round((toDate(b).getTime() - toDate(a).getTime()) / 86_400_000) + 1
function addMonths(s: string, n: number): string {
  const d = toDate(s); const day = d.getUTCDate()
  d.setUTCDate(1); d.setUTCMonth(d.getUTCMonth() + n)
  const last = new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth() + 1, 0)).getUTCDate()
  d.setUTCDate(Math.min(day, last))
  return fromDate(d)
}
const clean = (n: number) => Math.round(n * 1e6) / 1e6

/** Round UP to a multiple of step, guarding against floating point noise (2.5000000001 must stay 2.5). */
function roundUp(x: number, step: number): number {
  if (!(step > 0)) return x
  const q = clean(x / step)
  return clean(Math.ceil(q - 1e-9) * step) || 0   // || 0 turns a negative zero into zero
}
const money = (n: number) => Math.round(n * 100) / 100
const fmt = (n: number, dp = 2) => String(Math.round(n * 10 ** dp) / 10 ** dp)
const unitWord = (u: Unit, n: number) => (u === 'hours' ? (n === 1 ? 'hour' : 'hours') : (n === 1 ? 'day' : 'days'))

// ── leave year ─────────────────────────────────────────────────────────────────────────────────────────────────────
/** The leave year that contains a date, for a year that starts on the given month and day (default 1 January). */
export function leaveYearFor(date: string, yearStartMonth = 1, yearStartDay = 1): { start: string; end: string; label: string } {
  if (!isYmd(date)) throw new Error('The date must be written as YYYY-MM-DD.')
  const y = Number(date.slice(0, 4))
  const startThisYear = `${y}-${pad(yearStartMonth)}-${pad(yearStartDay)}`
  const start = date >= startThisYear ? startThisYear : `${y - 1}-${pad(yearStartMonth)}-${pad(yearStartDay)}`
  const end = addDays(addMonths(start, 12), -1)
  return { start, end, label: start.slice(0, 4) === end.slice(0, 4) ? start.slice(0, 4) : `${start.slice(0, 4)} to ${end.slice(0, 4)}` }
}

// ── statutory minimum ──────────────────────────────────────────────────────────────────────────────────────────────
export interface StatutoryResult { weeks: number; hours?: number; days?: number; capped: boolean; steps: string[]; caveats: string[] }

/** The statutory minimum for a full leave year: 5.6 weeks of the person's working week, limited to 28 days. */
export function statutoryEntitlement(o: { hoursPerWeek?: number; daysPerWeek?: number }): StatutoryResult {
  const { hoursPerWeek, daysPerWeek } = o
  if (hoursPerWeek == null && daysPerWeek == null) throw new Error('Give the hours a week, the days a week, or both.')
  for (const v of [hoursPerWeek, daysPerWeek]) if (v != null && !(v > 0 && Number.isFinite(v))) throw new Error('Hours and days a week must be more than zero.')
  const steps: string[] = []
  const out: StatutoryResult = { weeks: STATUTORY_WEEKS, capped: false, steps, caveats: [...BASE_CAVEATS] }
  if (daysPerWeek != null) {
    const raw = clean(STATUTORY_WEEKS * daysPerWeek)
    out.days = Math.min(raw, STATUTORY_CAP_DAYS)
    out.capped = raw > STATUTORY_CAP_DAYS
    steps.push(`${fmt(daysPerWeek)} ${unitWord('days', daysPerWeek)} a week x ${STATUTORY_WEEKS} weeks = ${fmt(raw)} days.`)
    if (out.capped) steps.push(`Statutory leave is limited to ${STATUTORY_CAP_DAYS} days, so the minimum is ${STATUTORY_CAP_DAYS} days.`)
  }
  if (hoursPerWeek != null) {
    const raw = clean(STATUTORY_WEEKS * hoursPerWeek)
    steps.push(`${fmt(hoursPerWeek)} hours a week x ${STATUTORY_WEEKS} weeks = ${fmt(raw)} hours.`)
    if (daysPerWeek != null) {
      // The 28 day limit expressed in hours uses the length of the person's usual day.
      const capHours = clean(STATUTORY_CAP_DAYS * (hoursPerWeek / daysPerWeek))
      out.hours = Math.min(raw, capHours)
      if (raw > capHours) steps.push(`The 28 day limit is ${fmt(capHours)} hours for this working pattern, so the minimum is ${fmt(capHours)} hours.`)
    } else {
      out.hours = raw
      out.caveats.push('The 28 day limit could not be applied to the hours because the days worked each week were not given.')
    }
  }
  return out
}

export interface CompareResult { ok: boolean; shortfall: number; message: string }
/** Is the contractual allowance at least the statutory minimum? Both numbers must be in the same unit. */
export function compareWithStatutory(contractual: number, statutory: number, unit: Unit = 'hours'): CompareResult {
  if (!(contractual >= 0) || !(statutory >= 0)) throw new Error('The amounts must be zero or more.')
  const shortfall = clean(Math.max(0, statutory - contractual))
  return shortfall > 0
    ? { ok: false, shortfall, message: `The contractual allowance of ${fmt(contractual)} ${unitWord(unit, contractual)} is ${fmt(shortfall)} ${unitWord(unit, shortfall)} below the statutory minimum of ${fmt(statutory)} ${unitWord(unit, statutory)}. The statutory minimum applies.` }
    : { ok: true, shortfall: 0, message: `The contractual allowance of ${fmt(contractual)} ${unitWord(unit, contractual)} meets the statutory minimum of ${fmt(statutory)} ${unitWord(unit, statutory)}.` }
}

// ── starters and leavers ───────────────────────────────────────────────────────────────────────────────────────────
export interface PartYearInput {
  /** The full year allowance (contractual or statutory), in the given unit. */
  annual: number
  unit: Unit
  leaveYearStart: string
  leaveYearEnd: string
  startDate?: string
  leavingDate?: string
  /** monthly: one twelfth for each month (GOV.UK's accrual system, the default). exact_days: the share of the leave year's days they were employed. */
  method?: PartYearMethod
  /** Rounding is always UP. half_day rounds up to half a day (for hours it needs hoursPerDay); tenth_hour to 0.1; none keeps two decimals. */
  roundTo?: RoundTo
  /** The length of the person's usual day in hours, needed to round hours to a half day. */
  hoursPerDay?: number
}
export interface PartYearResult {
  entitlement: number
  unit: Unit
  fraction: number            // the share of the full year allowance, 0 to 1
  method: PartYearMethod
  methodLabel: string
  months?: number             // monthly method: months of leave (a part month counts as a fraction, a starting month counts in full)
  daysEmployed: number
  daysInLeaveYear: number
  unrounded: number
  roundedTo: RoundTo
  steps: string[]             // plain English working, for the agent to show
  caveats: string[]
}

export function partYearEntitlement(i: PartYearInput): PartYearResult {
  const method: PartYearMethod = i.method ?? 'monthly'
  let roundTo: RoundTo = i.roundTo ?? (i.unit === 'days' ? 'half_day' : 'tenth_hour')
  if (!(i.annual >= 0) || !Number.isFinite(i.annual)) throw new Error('The yearly allowance must be zero or more.')
  for (const [k, v] of [['leave year start', i.leaveYearStart], ['leave year end', i.leaveYearEnd]] as const) if (!isYmd(v)) throw new Error(`The ${k} must be written as YYYY-MM-DD.`)
  if (i.leaveYearEnd < i.leaveYearStart) throw new Error('The leave year must end after it starts.')
  if (i.startDate != null && !isYmd(i.startDate)) throw new Error('The start date must be written as YYYY-MM-DD.')
  if (i.leavingDate != null && !isYmd(i.leavingDate)) throw new Error('The leaving date must be written as YYYY-MM-DD.')
  if (i.startDate && i.leavingDate && i.leavingDate < i.startDate) throw new Error('The leaving date is before the start date.')

  const caveats = [...BASE_CAVEATS]
  const steps: string[] = []
  const yearDays = daysInclusive(i.leaveYearStart, i.leaveYearEnd)
  // The period they were employed inside this leave year.
  const from = i.startDate && i.startDate > i.leaveYearStart ? i.startDate : i.leaveYearStart
  const to = i.leavingDate && i.leavingDate < i.leaveYearEnd ? i.leavingDate : i.leaveYearEnd
  const employed = from <= to ? daysInclusive(from, to) : 0
  steps.push(`Leave year: ${i.leaveYearStart} to ${i.leaveYearEnd} (${yearDays} days). Full year allowance: ${fmt(i.annual)} ${unitWord(i.unit, i.annual)}.`)
  if (i.startDate) steps.push(`Started on ${i.startDate}${i.startDate <= i.leaveYearStart ? ', before this leave year began, so the whole year counts from the start.' : '.'}`)
  if (i.leavingDate) steps.push(`Leaving on ${i.leavingDate}${i.leavingDate >= i.leaveYearEnd ? ', after this leave year ends, so the whole year counts to the end.' : '.'}`)

  let fraction = 0
  let months: number | undefined
  let label: string
  if (employed === 0) {
    steps.push('They were not employed at any point in this leave year, so the entitlement is nil.')
    label = method === 'monthly' ? 'One twelfth for each month' : 'Share of the days in the leave year'
  } else if (method === 'monthly') {
    // One twelfth for each month of the leave year. A month they start in counts in full (they accrue one twelfth from their first day, per GOV.UK).
    // A month they leave in counts in full if they are still employed on its last day, otherwise by the days they worked in it (GOV.UK does not say, so this follows the pro rata rule).
    let m = 0
    const parts: string[] = []
    for (let k = 0; k < 12; k++) {
      const ps = addMonths(i.leaveYearStart, k)
      const pe = k === 11 ? i.leaveYearEnd : addDays(addMonths(i.leaveYearStart, k + 1), -1)
      if (to < ps || from > pe) continue
      const len = daysInclusive(ps, pe)
      const frac = to >= pe ? 1 : daysInclusive(from > ps ? from : ps, to) / len
      m += frac
      if (frac < 1) parts.push(`${ps.slice(0, 7)} counts ${fmt(frac, 3)}`)
    }
    months = m
    fraction = m / 12
    label = 'One twelfth of the allowance for each month (GOV.UK accrual system)'
    steps.push(`Months of leave: ${fmt(months, 3)}${parts.length ? ` (${parts.join('; ')})` : ''}. A month they start in counts in full.`)
    steps.push(`${fmt(i.annual)} / 12 x ${fmt(months, 3)} = ${fmt(i.annual * fraction, 3)} ${unitWord(i.unit, 2)}.`)
  } else {
    fraction = employed / yearDays
    label = 'Share of the days in the leave year (pro rata by days)'
    steps.push(`Days employed in the leave year: ${employed} of ${yearDays}.`)
    steps.push(`${fmt(i.annual)} x ${employed} / ${yearDays} = ${fmt(i.annual * fraction, 3)} ${unitWord(i.unit, 2)}.`)
  }

  const unrounded = i.annual * fraction
  let entitlement = unrounded
  if (roundTo === 'half_day') {
    if (i.unit === 'days') { entitlement = roundUp(unrounded, 0.5); steps.push(`Rounded UP to the nearest half day: ${fmt(entitlement)} days.`) }
    else if (i.hoursPerDay && i.hoursPerDay > 0) { entitlement = roundUp(unrounded, i.hoursPerDay / 2); steps.push(`Rounded UP to the nearest half day (${fmt(i.hoursPerDay / 2)} hours): ${fmt(entitlement)} hours.`) }
    else { roundTo = 'tenth_hour'; entitlement = roundUp(unrounded, 0.1); caveats.push('A half day for hours needs the length of the usual day (hoursPerDay), so it was rounded up to the nearest tenth of an hour instead.'); steps.push(`Rounded UP to the nearest tenth of an hour: ${fmt(entitlement)} hours.`) }
  } else if (roundTo === 'tenth_hour') {
    entitlement = roundUp(unrounded, 0.1); steps.push(`Rounded UP to the nearest tenth: ${fmt(entitlement)} ${unitWord(i.unit, 2)}.`)
  } else {
    entitlement = Math.round(unrounded * 100) / 100; steps.push(`Not rounded up (kept to two decimal places): ${fmt(entitlement)} ${unitWord(i.unit, 2)}.`)
  }
  if (method === 'monthly') caveats.push('GOV.UK lets the employer work the first month out pro rata by days instead of giving a full twelfth. Choose the exact days method to see that.')
  return { entitlement, unit: i.unit, fraction: clean(fraction), method, methodLabel: label, ...(months != null ? { months: clean(months) } : {}), daysEmployed: employed, daysInLeaveYear: yearDays, unrounded: clean(unrounded), roundedTo: roundTo, steps, caveats }
}

// ── irregular hours and part year workers ──────────────────────────────────────────────────────────────────────────
export interface IrregularResult { accruedExact: number; accruedHours: number; perPayPeriod?: number[]; steps: string[]; caveats: string[] }
/**
 * Leave accrued by someone on irregular hours or who works part of the year (leave years starting after 31 March 2024): 12.07 percent of the hours worked in each pay
 * period, rounded up to the nearest hour when the entitlement is 0.5 of an hour or more. Give the hours for one pay period, or a list of pay periods (each is rounded).
 * GOV.UK does not say what to do below half an hour, so those are rounded down to the nearest hour here and the exact figure is returned as well.
 */
export function irregularHoursAccrual(o: { hoursWorked?: number; payPeriodsHours?: number[] }): IrregularResult {
  const periods = o.payPeriodsHours ?? (o.hoursWorked != null ? [o.hoursWorked] : null)
  if (!periods || periods.length === 0) throw new Error('Give the hours worked in a pay period.')
  if (periods.some(h => !(h >= 0) || !Number.isFinite(h))) throw new Error('Hours worked must be zero or more.')
  const steps: string[] = []
  const per = periods.map(h => {
    const exact = clean(h * IRREGULAR_HOURS_RATE)
    const whole = Math.floor(exact)
    const rounded = exact - whole >= 0.5 - 1e-9 ? whole + 1 : whole
    steps.push(`${fmt(h)} hours worked x 12.07% = ${fmt(exact, 3)} hours, which is ${rounded} ${unitWord('hours', rounded)} of leave.`)
    return { exact, rounded }
  })
  const accruedExact = clean(per.reduce((s, p) => s + p.exact, 0))
  const accruedHours = per.reduce((s, p) => s + p.rounded, 0)
  if (periods.length > 1) steps.push(`Total across ${periods.length} pay periods: ${accruedHours} hours.`)
  steps.push('The leave can be taken from the next pay period.')
  return { accruedExact, accruedHours, ...(periods.length > 1 ? { perPayPeriod: per.map(p => p.rounded) } : {}), steps, caveats: [...BASE_CAVEATS, 'GOV.UK says to round up to the nearest hour when the entitlement is 0.5 of an hour or more. Amounts below half an hour are rounded down here; the exact figure is also given.'] }
}

// ── leavers ────────────────────────────────────────────────────────────────────────────────────────────────────────
export interface OwedOnLeavingResult {
  unit: Unit
  owed: number                // untaken leave to pay for (zero if none)
  overTaken: number           // leave taken beyond what was earned (zero if none)
  owedPounds?: number
  cancelledBooked: number     // approved leave booked after the leaving date: cancelled, never counted as taken
  steps: string[]
  caveats: string[]
}
/**
 * What to pay a leaver for untaken leave. entitlementToLeavingDate is the leave earned up to the last day (see partYearEntitlement with the leaving date),
 * taken is leave actually taken up to the last day. Leave booked AFTER the last day is cancelled and does not count as taken.
 * Money is hours x hourly rate (or days x day rate), to the penny. A person who took more than they earned is reported, not deducted: GOV.UK says the employer must not take
 * money from final pay unless that was agreed beforehand in writing.
 */
export function holidayOwedOnLeaving(o: { unit: Unit; entitlementToLeavingDate: number; taken: number; bookedAfterLeaving?: number; hourlyRate?: number; dayRate?: number }): OwedOnLeavingResult {
  for (const [k, v] of [['entitlement', o.entitlementToLeavingDate], ['taken', o.taken], ['booked after leaving', o.bookedAfterLeaving ?? 0]] as const) if (!(v >= 0) || !Number.isFinite(v)) throw new Error(`The ${k} must be zero or more.`)
  const steps: string[] = []
  const cancelled = o.bookedAfterLeaving ?? 0
  const diff = clean(o.entitlementToLeavingDate - o.taken)
  const owed = Math.max(0, diff)
  const over = Math.max(0, -diff)
  steps.push(`Leave earned to the last day: ${fmt(o.entitlementToLeavingDate)} ${unitWord(o.unit, 2)}. Taken: ${fmt(o.taken)}.`)
  if (cancelled > 0) steps.push(`${fmt(cancelled)} ${unitWord(o.unit, cancelled)} booked after the last day is cancelled and does not count as taken.`)
  steps.push(owed > 0 ? `Untaken leave to pay for: ${fmt(owed)} ${unitWord(o.unit, owed)}.` : over > 0 ? `They took ${fmt(over)} ${unitWord(o.unit, over)} more than they earned. Nothing is owed.` : 'All the leave earned has been taken. Nothing is owed.')
  const caveats = [...BASE_CAVEATS]
  if (over > 0) caveats.push('Do not take money from final pay for leave taken in excess unless that was agreed beforehand in writing (GOV.UK).')
  caveats.push('Untaken statutory leave must be paid on leaving, even after dismissal for gross misconduct. Pay above the statutory minimum can follow separate arrangements in the contract.')
  let owedPounds: number | undefined
  const rate = o.unit === 'hours' ? o.hourlyRate : o.dayRate
  if (rate != null) {
    if (!(rate >= 0) || !Number.isFinite(rate)) throw new Error('The rate must be zero or more.')
    owedPounds = money(owed * rate)
    steps.push(`${fmt(owed)} ${o.unit === 'hours' ? 'hours' : 'days'} x £${rate.toFixed(2)} = £${owedPounds.toFixed(2)}.`)
    caveats.push('Holiday pay is a week\'s pay for each week of leave. For people whose pay varies, GOV.UK says to use an average over the last 52 weeks, so check the rate used here is right for them.')
  }
  return { unit: o.unit, owed: clean(owed), overTaken: clean(over), ...(owedPounds != null ? { owedPounds } : {}), cancelledBooked: cancelled, steps, caveats }
}
