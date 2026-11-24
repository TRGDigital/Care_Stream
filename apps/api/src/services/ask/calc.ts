// The sums behind the Ask CareStream agents. The model never does arithmetic: it calls a tool, the tool calls these functions, and the answer carries the
// working ("method"). Pure, no database, easy to test.

export const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100
export const WEEKS_PER_YEAR = 365 / 7   // 52.14: used to turn a weekly cost into a yearly one

/** Whole years of age on a date (both as YYYY-MM-DD). */
export function ageOn(dob: string, on: string): number {
  const [y, m, d] = dob.split('-').map(Number), [ty, tm, td] = on.split('-').map(Number)
  let a = ty - y
  if (tm < m || (tm === m && td < d)) a--
  return a
}

export interface NlwRow { from?: string; age21: number; age18to20: number; under18: number; apprentice?: number }
export type NlwBand = 'age21' | 'age18to20' | 'under18'
export const BAND_LABEL: Record<NlwBand, string> = { age21: '21 and over', age18to20: '18 to 20', under18: 'under 18' }
/** Which National Living Wage or Minimum Wage band an age falls in. */
export function bandForAge(age: number): NlwBand { return age >= 21 ? 'age21' : age >= 18 ? 'age18to20' : 'under18' }
export const nlwFor = (row: NlwRow, age: number): number => row[bandForAge(age)]

export interface CostPerson { name: string; job_role: string | null; age: number | null; weekday_rate: number | null; weekend_rate: number | null; weekly_hours: number | null }
/** The hourly rate that counts for costing: weekday and weekend blended by how many hours fall at weekends (default 2 of 7 days). Labelled as an assumption wherever it is used. */
export function blendedRate(p: Pick<CostPerson, 'weekday_rate' | 'weekend_rate'>, weekendShare = 2 / 7): number | null {
  const wd = p.weekday_rate, we = p.weekend_rate
  if (wd == null && we == null) return null
  if (wd == null) return we
  if (we == null) return wd
  return round2(wd * (1 - weekendShare) + we * weekendShare)
}
export const weeklyCost = (rate: number, hours: number, onCostPct = 0) => rate * hours * (1 + onCostPct / 100)

export interface Money { per_week: number; per_month: number; per_year: number }
export function moneyFromWeekly(weekly: number): Money { return { per_week: round2(weekly), per_month: round2((weekly * WEEKS_PER_YEAR) / 12), per_year: round2(weekly * WEEKS_PER_YEAR) } }

/** What it costs to lift everybody who is paid below a target rate up to that rate (the legal minimum for their age band), with on costs. */
export function belowMinimumImpact(people: CostPerson[], target: NlwRow, onCostPct: number, weekendShare = 2 / 7) {
  const affected: Array<{ name: string; job_role: string | null; age: number; band: string; current_rate: number; target_rate: number; weekly_hours: number; extra_per_week: number }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  for (const p of people) {
    const rate = blendedRate(p, weekendShare)
    if (p.age == null) { skipped.push({ name: p.name, reason: 'no date of birth recorded, so the age band is not known' }); continue }
    if (rate == null) { skipped.push({ name: p.name, reason: 'no pay rate recorded' }); continue }
    if (p.weekly_hours == null) { skipped.push({ name: p.name, reason: 'no contracted hours recorded' }); continue }
    const t = nlwFor(target, p.age)
    if (rate < t) affected.push({ name: p.name, job_role: p.job_role, age: p.age, band: BAND_LABEL[bandForAge(p.age)], current_rate: rate, target_rate: t, weekly_hours: p.weekly_hours, extra_per_week: round2(weeklyCost(t - rate, p.weekly_hours, onCostPct)) })
  }
  const weekly = affected.reduce((s, a) => s + a.extra_per_week, 0)
  return { affected, skipped, cost: moneyFromWeekly(weekly), people_checked: people.length - skipped.length }
}

/** A flat percentage rise on every pay rate (and the on costs on top). */
export function percentRiseCost(people: CostPerson[], pct: number, onCostPct: number, weekendShare = 2 / 7) {
  let base = 0, counted = 0
  const skipped: string[] = []
  for (const p of people) {
    const rate = blendedRate(p, weekendShare)
    if (rate == null || p.weekly_hours == null) { skipped.push(p.name); continue }
    base += weeklyCost(rate, p.weekly_hours, onCostPct); counted++
  }
  const weekly = base * (pct / 100)
  return { people_counted: counted, skipped, current: moneyFromWeekly(base), extra: moneyFromWeekly(weekly), after: moneyFromWeekly(base + weekly) }
}

export interface HolidayPerson { name: string; unit: 'hours' | 'days'; remaining: number; weekday_rate: number | null; contracted: number | null }
/** The value of holiday still to be taken: hours left x the weekday rate (days left x a usual shift x the rate). An estimate, labelled so. */
export function holidayLiability(people: HolidayPerson[], onCostPct = 0) {
  let total = 0, hours = 0
  const missing: string[] = []
  const rows: Array<{ name: string; hours_left: number; rate: number; value: number }> = []
  for (const p of people) {
    if (p.remaining <= 0) continue
    if (p.weekday_rate == null) { missing.push(p.name); continue }
    const h = p.unit === 'hours' ? p.remaining : p.remaining * ((p.contracted ?? 40) / 5)
    const v = round2(h * p.weekday_rate * (1 + onCostPct / 100))
    rows.push({ name: p.name, hours_left: round2(h), rate: p.weekday_rate, value: v }); total += v; hours += h
  }
  return { rows, total: round2(total), hours: round2(hours), missing_rate: missing }
}

/** What the fees need to rise by to cover an extra weekly cost: the percentage on the weekly fee income, or the pounds per hour on hourly care. */
export function feeUplift(extraWeekly: number, weeklyIncome: number, hourlyChargedHoursPerWeek: number) {
  return {
    fee_rise_percent: weeklyIncome > 0 ? round2((extraWeekly / weeklyIncome) * 100) : null,
    hourly_rate_rise: hourlyChargedHoursPerWeek > 0 ? round2(extraWeekly / hourlyChargedHoursPerWeek) : null,
  }
}

/** The extra pay for working a bank holiday: hours x rate x (multiplier minus 1) x people. */
export function bankHolidayExtra(rate: number, hours: number, multiplier: number, people: number, onCostPct = 0) {
  return round2(rate * hours * (multiplier - 1) * people * (1 + onCostPct / 100))
}

// ── Pay analysis (administrators only): averages, bands, gaps and headroom over the legal minimum ────────────────────────────────────────────────────────────────────
export interface RateStats { count: number; average: number; median: number; lowest: number; highest: number }
export function median(a: number[]): number | null {
  if (!a.length) return null
  const s = [...a].sort((x, y) => x - y), m = Math.floor(s.length / 2)
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2
}
export function rateStats(rates: number[]): RateStats | null {
  const r = rates.filter(n => Number.isFinite(n))
  if (!r.length) return null
  return { count: r.length, average: round2(r.reduce((s, n) => s + n, 0) / r.length), median: round2(median(r)!), lowest: round2(Math.min(...r)), highest: round2(Math.max(...r)) }
}
/** How many people fall in each band of pay (width 0.5 or 1 pound), from the lowest band up. */
export function rateBands(rates: number[], width = 1): Array<{ from: number; to: number; label: string; count: number }> {
  const w = width === 0.5 ? 0.5 : 1
  const r = rates.filter(n => Number.isFinite(n))
  if (!r.length) return []
  const lo = Math.floor(Math.min(...r) / w) * w, hi = Math.floor(Math.max(...r) / w) * w
  const out: Array<{ from: number; to: number; label: string; count: number }> = []
  for (let from = lo; from <= hi + 1e-9; from = round2(from + w)) {
    const to = round2(from + w)
    out.push({ from, to, label: `£${from.toFixed(2)} to under £${to.toFixed(2)}`, count: r.filter(n => n >= from && n < to).length })
  }
  return out
}
const roleOf = (p: CostPerson) => p.job_role ?? 'No job role recorded'

/** Average, middle, lowest and highest pay across the people with a rate, overall and by job role, with a spread of bands. Weekday, weekend and the blended rate are reported. */
export function paySummary(people: CostPerson[], weekendShare = 2 / 7, bandWidth = 1) {
  const blended = people.map(p => ({ p, b: blendedRate(p, weekendShare) }))
  const withRate = blended.filter(x => x.b != null)
  const roles = new Map<string, number[]>()
  for (const x of withRate) { const k = roleOf(x.p); roles.set(k, [...(roles.get(k) ?? []), x.b!]) }
  return {
    people_total: people.length, people_with_rate: withRate.length, people_without_rate: blended.filter(x => x.b == null).map(x => x.p.name),
    weekday: rateStats(people.map(p => p.weekday_rate).filter((n): n is number => n != null)),
    weekend: rateStats(people.map(p => p.weekend_rate).filter((n): n is number => n != null)),
    blended: rateStats(withRate.map(x => x.b!)),
    bands: rateBands(withRate.map(x => x.b!), bandWidth),
    by_role: [...roles].map(([role, r]) => ({ role, ...rateStats(r)! })).sort((a, b) => b.average - a.average),
  }
}

/** The lowest rate a person is paid (the legal minimum applies to every hour, so the lower of weekday and weekend counts). */
export const lowestRate = (p: Pick<CostPerson, 'weekday_rate' | 'weekend_rate'>): number | null => {
  const r = [p.weekday_rate, p.weekend_rate].filter((n): n is number => n != null)
  return r.length ? Math.min(...r) : null
}

/** People paid below the legal minimum for their age band, differences in pay inside one job role, and people whose pay is far from their role's average. */
export function payGaps(people: CostPerson[], nlw: NlwRow | null, thresholdPct = 10, weekendShare = 2 / 7) {
  const below: Array<{ name: string; job_role: string | null; band: string; lowest_rate: number; minimum: number; short_by: number }> = []
  const notChecked: Array<{ name: string; reason: string }> = []
  if (nlw) for (const p of people) {
    const lo = lowestRate(p)
    if (lo == null) { notChecked.push({ name: p.name, reason: 'no pay rate recorded' }); continue }
    if (p.age == null) { notChecked.push({ name: p.name, reason: 'no date of birth recorded, so the age band is not known' }); continue }
    const min = nlwFor(nlw, p.age)
    if (lo < min) below.push({ name: p.name, job_role: p.job_role, band: BAND_LABEL[bandForAge(p.age)], lowest_rate: lo, minimum: min, short_by: round2(min - lo) })
  }
  const byRole = new Map<string, Array<{ name: string; rate: number }>>()
  for (const p of people) { const b = blendedRate(p, weekendShare); if (b == null) continue; byRole.set(roleOf(p), [...(byRole.get(roleOf(p)) ?? []), { name: p.name, rate: b }]) }
  const sameRole: Array<{ role: string; people: number; lowest: number; highest: number; gap: number }> = []
  const outliers: Array<{ name: string; role: string; rate: number; role_average: number; difference_percent: number }> = []
  for (const [role, list] of byRole) {
    const rates = list.map(x => x.rate), lo = Math.min(...rates), hi = Math.max(...rates)
    if (list.length > 1 && hi - lo > 0.004) sameRole.push({ role, people: list.length, lowest: round2(lo), highest: round2(hi), gap: round2(hi - lo) })
    if (list.length >= 3) {
      const avg = rates.reduce((s, n) => s + n, 0) / rates.length
      for (const x of list) { const d = ((x.rate - avg) / avg) * 100; if (Math.abs(d) > thresholdPct) outliers.push({ name: x.name, role, rate: x.rate, role_average: round2(avg), difference_percent: round2(d) }) }
    }
  }
  return { below_minimum: below, not_checked: notChecked, same_role_differences: sameRole.sort((a, b) => b.gap - a.gap), outliers: outliers.sort((a, b) => Math.abs(b.difference_percent) - Math.abs(a.difference_percent)), threshold_percent: thresholdPct }
}

/** How far above (or below) the legal minimum each person is paid, and in total. Headroom is the lowest rate minus the minimum for their age band. */
export function compareNlw(people: CostPerson[], nlw: NlwRow) {
  const rows: Array<{ name: string; job_role: string | null; band: string; lowest_rate: number; minimum: number; headroom: number }> = []
  const skipped: Array<{ name: string; reason: string }> = []
  for (const p of people) {
    const lo = lowestRate(p)
    if (lo == null) { skipped.push({ name: p.name, reason: 'no pay rate recorded' }); continue }
    if (p.age == null) { skipped.push({ name: p.name, reason: 'no date of birth recorded, so the age band is not known' }); continue }
    const min = nlwFor(nlw, p.age)
    rows.push({ name: p.name, job_role: p.job_role, band: BAND_LABEL[bandForAge(p.age)], lowest_rate: lo, minimum: min, headroom: round2(lo - min) })
  }
  rows.sort((a, b) => a.headroom - b.headroom)
  const heads = rows.map(r => r.headroom)
  return {
    people_compared: rows.length, skipped,
    below_minimum: rows.filter(r => r.headroom < 0).length, within_50p: rows.filter(r => r.headroom >= 0 && r.headroom <= 0.5).length,
    average_headroom: heads.length ? round2(heads.reduce((s, n) => s + n, 0) / heads.length) : null, smallest_headroom: heads.length ? heads[0] : null,
    people: rows,
  }
}
