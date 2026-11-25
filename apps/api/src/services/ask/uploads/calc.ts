// The sums for uploaded files. All plain code: the model never works out a figure, it explains these results. Money is rounded to pence at the end of each sum.
import { round2, nlwFor, bandForAge, BAND_LABEL, WEEKS_PER_YEAR, type NlwRow } from '../calc'

export interface PayRow { row: number; name: string; rate: number | null; hours: number | null }
export interface StaffLite { id: string; name: string; job_role: string | null; age: number | null; weekday_rate: number | null; weekend_rate: number | null; contracted: number | null }
export type Mapping = Record<string, string | null>

const TOL = 0.005

/** The file's hourly rate against the weekday rate CareStream holds, for each person who was matched. Nothing is changed anywhere. */
export function comparePayroll(rows: PayRow[], mapping: Mapping, staff: StaffLite[]) {
  const byId = new Map(staff.map(s => [s.id, s]))
  const seen = new Set<string>()
  const same: string[] = [], differ: Array<{ name: string; file_rate: number; carestream_rate: number; difference: number; direction: 'file higher' | 'file lower'; hours_in_file: number | null; effect_for_hours_in_file: number | null; carestream_weekend_rate: number | null }> = []
  const noFileRate: string[] = [], noStoredRate: string[] = [], onlyInFile: string[] = []
  for (const r of rows) {
    const id = mapping[String(r.row)]
    if (!id) { onlyInFile.push(r.name); continue }
    const s = byId.get(id); if (!s) { onlyInFile.push(r.name); continue }
    seen.add(id)
    if (r.rate == null) { noFileRate.push(s.name); continue }
    if (s.weekday_rate == null) { noStoredRate.push(s.name); continue }
    const diff = round2(r.rate - s.weekday_rate)
    if (Math.abs(diff) < TOL) { same.push(s.name); continue }
    differ.push({ name: s.name, file_rate: round2(r.rate), carestream_rate: round2(s.weekday_rate), difference: diff, direction: diff > 0 ? 'file higher' : 'file lower', hours_in_file: r.hours, effect_for_hours_in_file: r.hours != null ? round2(diff * r.hours) : null, carestream_weekend_rate: s.weekend_rate })
  }
  differ.sort((a, b) => Math.abs(b.difference) - Math.abs(a.difference))
  const onlyInCareStream = staff.filter(s => !seen.has(s.id)).map(s => s.name)
  const withHours = differ.filter(d => d.effect_for_hours_in_file != null)
  return {
    compared: same.length + differ.length, same: same.length, differ, no_rate_in_file: noFileRate, no_rate_in_carestream: noStoredRate,
    only_in_file: onlyInFile, only_in_carestream: onlyInCareStream,
    totals: { file_higher: differ.filter(d => d.difference > 0).length, file_lower: differ.filter(d => d.difference < 0).length, net_effect_for_hours_in_file: withHours.length ? round2(withHours.reduce((s, d) => s + (d.effect_for_hours_in_file as number), 0)) : null, people_with_hours: withHours.length },
  }
}

/** The file re-priced at a minimum wage row. Only people paid below the rate for their age band move up to it. Age comes from CareStream (never from the file). */
export function repricePayroll(rows: PayRow[], mapping: Mapping, staff: StaffLite[], target: NlwRow, current: NlwRow | null, onCostPct = 0) {
  const byId = new Map(staff.map(s => [s.id, s]))
  const fileHasHours = rows.some(r => r.hours != null)
  const below: Array<{ name: string; band: string; age_band_rate: number; file_rate: number; rise_per_hour: number; hours: number | null; extra_cost: number | null }> = []
  const cannotCheck: string[] = [], noRate: string[] = []
  let atOrAbove = 0, extra = 0, hoursBelow = 0
  const alreadyBelowNow: Array<{ name: string; file_rate: number; current_rate: number }> = []
  for (const r of rows) {
    const id = mapping[String(r.row)]; const s = id ? byId.get(id) : undefined
    if (!s) continue
    if (r.rate == null) { noRate.push(s.name); continue }
    if (s.age == null) { cannotCheck.push(s.name); continue }
    const band = bandForAge(s.age), t = nlwFor(target, s.age)
    if (current) { const c = nlwFor(current, s.age); if (r.rate + TOL < c) alreadyBelowNow.push({ name: s.name, file_rate: round2(r.rate), current_rate: c }) }
    if (r.rate + TOL >= t) { atOrAbove++; continue }
    const rise = round2(t - r.rate)
    const hours = fileHasHours ? r.hours : (s.contracted ?? null)
    const cost = hours != null ? round2(rise * hours * (1 + onCostPct / 100)) : null
    if (cost != null) { extra += cost; hoursBelow += hours as number }
    below.push({ name: s.name, band: BAND_LABEL[band], age_band_rate: t, file_rate: round2(r.rate), rise_per_hour: rise, hours, extra_cost: cost })
  }
  below.sort((a, b) => b.rise_per_hour - a.rise_per_hour)
  const basis = fileHasHours ? 'hours_in_file' : 'contracted_weekly_hours'
  const total = round2(extra)
  return {
    people_below_target: below, count_below: below.length, at_or_above: atOrAbove, cannot_check_age_missing: cannotCheck, no_rate_in_file: noRate, already_below_current_rate: alreadyBelowNow,
    hours_basis: basis, hours_of_people_below: round2(hoursBelow), extra_cost: total, on_cost_percent: onCostPct,
    extra_cost_period: basis === 'hours_in_file' ? 'for the hours in the file' : 'per week (contracted hours)',
    extra_cost_per_year: basis === 'contracted_weekly_hours' ? round2(total * WEEKS_PER_YEAR) : null,
  }
}

// ── Invoices and cost per resident per day ────────────────────────────────────────────
export interface Invoice { supplier: string; amount: number; from?: string | null; to?: string | null }
export const daysInclusive = (from: string, to: string) => Math.round((Date.parse(to + 'T00:00:00Z') - Date.parse(from + 'T00:00:00Z')) / 86400000) + 1

export interface FoodBenchmark { low_gbp_week: number; high_gbp_week: number; price_year: string; councils?: number; index_base?: number; index_latest?: number; index_latest_month?: string }
/** The council benchmark brought to today with the food price index, when the register holds both index values. Otherwise it is left in its own prices and says so. */
export function bringForward(b: FoodBenchmark) {
  const factor = b.index_base && b.index_latest && b.index_base > 0 ? b.index_latest / b.index_base : null
  return {
    in_price_year: { low_week: round2(b.low_gbp_week), high_week: round2(b.high_gbp_week), low_day: round2(b.low_gbp_week / 7), high_day: round2(b.high_gbp_week / 7), price_year: b.price_year },
    brought_forward: factor ? { factor: Math.round(factor * 10000) / 10000, to: b.index_latest_month ?? 'the latest month in the register', low_week: round2(b.low_gbp_week * factor), high_week: round2(b.high_gbp_week * factor), low_day: round2((b.low_gbp_week * factor) / 7), high_day: round2((b.high_gbp_week * factor) / 7) } : null,
  }
}

export function costPerResidentDay(o: { invoices: Invoice[]; from: string; to: string; residents: number; benchmark?: FoodBenchmark | null }) {
  const days = daysInclusive(o.from, o.to)
  if (!(days >= 1) || days > 400) return { error: 'The period is not a sensible length (1 to 400 days).' }
  if (!(o.residents > 0)) return { error: 'The number of residents must be more than zero.' }
  const total = round2(o.invoices.reduce((s, i) => s + i.amount, 0))
  const bySupplier = new Map<string, number>()
  for (const i of o.invoices) bySupplier.set(i.supplier, (bySupplier.get(i.supplier) ?? 0) + i.amount)
  const residentDays = o.residents * days
  const perDay = total / residentDays
  const out: any = {
    period: { from: o.from, to: o.to, days }, residents_used: o.residents, resident_days: round2(residentDays), total_spend: total,
    by_supplier: [...bySupplier].map(([supplier, amount]) => ({ supplier, amount: round2(amount), share_percent: total ? round2((amount / total) * 100) : 0 })).sort((a, b) => b.amount - a.amount),
    per_resident_per_day: round2(perDay), per_resident_per_week: round2(perDay * 7), benchmark: null,
  }
  if (o.benchmark) {
    const bf = bringForward(o.benchmark)
    const range = bf.brought_forward ?? { low_week: bf.in_price_year.low_week, high_week: bf.in_price_year.high_week }
    const wk = out.per_resident_per_week
    out.benchmark = { ...bf, compared_with: bf.brought_forward ? 'the benchmark brought forward to today' : 'the benchmark in its own prices (not brought forward)', position: wk < range.low_week ? 'below the benchmark range' : wk > range.high_week ? 'above the benchmark range' : 'within the benchmark range', difference_from_low_week: round2(wk - range.low_week), difference_from_high_week: round2(wk - range.high_week) }
  }
  return out
}
