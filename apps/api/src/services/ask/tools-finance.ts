// The Finance and pay tools, and the Complaints and incidents tools (tools-incidents.ts), added to the registry in tools.ts with ONE line.
// Every tool is read only, administrator only (the whole feature is), scoped to one account. The sums are done here in code, never by the model, and each tool returns a
// plain "method" the agent must show and the assumptions it made. Resident funding is reached only through funding-bridge.ts (totals, never a person's own figures unless
// the administrator names them, which funding_for_person already audit logs). Staff pay and fees are LOCKED data: the wording says so.
import type { AskTool, ToolContext } from './tools'
import { round2, blendedRate, weeklyCost, moneyFromWeekly, bankHolidayExtra, WEEKS_PER_YEAR, type CostPerson, type Money } from './calc'
import { loadStaff, holidayYearRows, bankHolidaysWithPay, addDays, type StaffRow } from './data'
import { ownSource } from './sources'
import { fundingAggregate, fundingReviewFigures } from './funding-bridge'
import { INCIDENT_TOOLS } from './tools-incidents'

const OWN = (label: string, ctx: ToolContext) => ownSource(`${label} (CareStream records)`, ctx.today)
const LOCKED = 'Locked data: administrators only. Staff never see it.'
const NOT_PROFIT = 'This is NOT profit. Staff cost is only one part of the cost of running a service: food, utilities, premises, agency staff, management, registration, insurance and other costs are not in CareStream and are not counted here.'
const pct = (n: any, d = 0) => { const v = Number(n); return Number.isFinite(v) ? v : d }
const onCost = (input: any) => Math.max(0, Math.min(60, pct(input?.on_cost_percent, 0)))
const shareOf = (input: any) => (input?.weekend_share_percent != null ? Math.max(0, Math.min(100, pct(input.weekend_share_percent))) / 100 : 2 / 7)
const ON_COST_NOTE = 'On costs (employer National Insurance, pension and so on) were not included unless the administrator gave a percentage.'
const onCostProp = { on_cost_percent: { type: 'number', description: 'Employer on costs as a percentage of pay. Only use a number the administrator gave. Omit it otherwise.' } }
const weekendProp = { weekend_share_percent: { type: 'number', description: 'Share of hours worked at weekends, 0 to 100 (default 28.6, which is 2 days of 7).' } }

const costPeople = (staff: StaffRow[]): CostPerson[] => staff.map(s => ({ name: s.name, job_role: s.job_role, age: s.age, weekday_rate: s.weekday_rate, weekend_rate: s.weekend_rate, weekly_hours: s.contracted }))

// ── Pure calculators (tested with fixtures) ───────────────────────────────────────────────
/** What the staff cost each week: contracted hours x blended hourly rate (+ on costs). People without a rate or hours are listed, not guessed. */
export function staffWeeklyCost(people: CostPerson[], weekendShare = 2 / 7, onCostPct = 0) {
  let weekly = 0, counted = 0
  const skipped: string[] = []
  for (const p of people) {
    const rate = blendedRate(p, weekendShare)
    if (rate == null || p.weekly_hours == null) { skipped.push(p.name); continue }
    weekly += weeklyCost(rate, p.weekly_hours, onCostPct); counted++
  }
  return { weekly, counted, skipped }
}

const per = (m: Money) => ({ per_week: m.per_week, per_month: m.per_month, per_year: m.per_year })

/** Income against staff cost. The gap is income minus staff cost ONLY: it is not profit. */
export function financeOverview(o: { weeklyIncome: number; residentsWithFee: number; residentsWithoutFee: number; staffWeekly: number }) {
  const gap = o.weeklyIncome - o.staffWeekly
  return {
    income: per(moneyFromWeekly(o.weeklyIncome)),
    staff_cost: per(moneyFromWeekly(o.staffWeekly)),
    income_less_staff_cost: per(moneyFromWeekly(gap)),
    staff_cost_percent_of_income: o.weeklyIncome > 0 ? round2((o.staffWeekly / o.weeklyIncome) * 100) : null,
    residents_with_a_fee_recorded: o.residentsWithFee,
    residents_without_a_fee_recorded: o.residentsWithoutFee,
    staff_cost_per_resident_per_week: o.residentsWithFee > 0 ? round2(o.staffWeekly / o.residentsWithFee) : null,
    average_fee_per_resident_per_week: o.residentsWithFee > 0 ? round2(o.weeklyIncome / o.residentsWithFee) : null,
  }
}

/** How many residents at the current average fee cover the staff cost, and the occupancy that means if the number of places is given. Staff cost only. */
export function breakEven(o: { staffWeekly: number; weeklyIncome: number; residentsWithFee: number; capacity?: number | null }) {
  const avg = o.residentsWithFee > 0 ? o.weeklyIncome / o.residentsWithFee : null
  if (!avg || avg <= 0) return { average_fee_per_resident_per_week: null, residents_needed_to_cover_staff_cost: null, current_residents: o.residentsWithFee, shortfall_or_surplus_residents: null, occupancy_needed_percent: null, current_occupancy_percent: null }
  const needed = Math.ceil(o.staffWeekly / avg)
  const cap = o.capacity && o.capacity > 0 ? o.capacity : null
  return {
    average_fee_per_resident_per_week: round2(avg),
    residents_needed_to_cover_staff_cost: needed,
    current_residents: o.residentsWithFee,
    shortfall_or_surplus_residents: o.residentsWithFee - needed,   // negative = short
    occupancy_needed_percent: cap ? round2((needed / cap) * 100) : null,
    current_occupancy_percent: cap ? round2((o.residentsWithFee / cap) * 100) : null,
  }
}

export interface IncomeByType { funding_type: string; label: string; weekly_total: number }
const PRIVATE = new Set(['self', 'part_self'])
/** What an X percent rise in fees would bring in: on all income, and on privately funded income only (councils and the NHS set their own rates). */
export function upliftIncome(byType: IncomeByType[], percent: number) {
  const p = Math.max(0, Math.min(50, percent))
  const all = byType.reduce((s, t) => s + t.weekly_total, 0)
  const priv = byType.filter(t => PRIVATE.has(t.funding_type)).reduce((s, t) => s + t.weekly_total, 0)
  return {
    rise_percent: p,
    if_every_fee_rises: per(moneyFromWeekly((all * p) / 100)),
    if_only_self_and_part_self_funded_rise: per(moneyFromWeekly((priv * p) / 100)),
    by_funding_type: byType.map(t => ({ label: t.label, weekly_income: round2(t.weekly_total), extra_per_week: round2((t.weekly_total * p) / 100), extra_per_year: round2(((t.weekly_total * p) / 100) * WEEKS_PER_YEAR) })),
  }
}

/** The extra a weekend rate costs: (weekend rate minus weekday rate, when higher) x contracted hours x the weekend share. */
export function weekendPremium(people: CostPerson[], weekendShare = 2 / 7, onCostPct = 0) {
  let weekly = 0, counted = 0
  const skipped: string[] = []
  for (const p of people) {
    if (p.weekday_rate == null || p.weekend_rate == null || p.weekly_hours == null) { skipped.push(p.name); continue }
    const diff = p.weekend_rate - p.weekday_rate
    counted++
    if (diff > 0) weekly += diff * p.weekly_hours * weekendShare * (1 + onCostPct / 100)
  }
  return { weekly, counted, skipped }
}

// ── The tools ────────────────────────────────────────────────────────────────────────────
export const FINANCE_TOOLS: AskTool[] = [
  {
    name: 'finance_overview',
    description: 'The commercial picture in one go: fee income per week, month and year (from the fees recorded for residents), what the staff cost, income less staff cost, staff cost as a percentage of income, staff cost per resident per week and the average fee. Staff cost only: it is NOT profit. Locked data, administrators only.',
    input_schema: { type: 'object', properties: { ...weekendProp, ...onCostProp } },
    async run(ctx, input) {
      const f = await fundingAggregate(ctx.tenantId, ctx.today)
      if (!f.ready) return { data: { error: 'Funding and fees are not switched on, so there is no fee income to compare with.' }, sources: [] }
      const oc = onCost(input), share = shareOf(input)
      const sc = staffWeeklyCost(costPeople(await loadStaff(ctx.tenantId, ctx.today)), share, oc)
      const o = financeOverview({ weeklyIncome: f.weekly_income, residentsWithFee: f.people, residentsWithoutFee: f.without_funding, staffWeekly: sc.weekly })
      return {
        data: { ...o, people_costed: sc.counted, staff_not_costed_missing_rate_or_hours: sc.skipped, income_includes_estimates: f.estimates_included, warning: NOT_PROFIT, locked: LOCKED, assumptions: { weekend_share_of_hours: round2(share * 100), on_cost_percent: oc, note: oc ? null : ON_COST_NOTE } },
        method: `Income = the weekly fees recorded for residents (hourly care is an estimate from planned hours). Staff cost = contracted hours x blended hourly rate${oc ? ` x (1 + ${oc}%)` : ''}, blended assuming ${round2(share * 100)}% of hours at the weekend rate. Income less staff cost = income minus staff cost, and nothing else. Per year = per week x ${round2(WEEKS_PER_YEAR)}.`,
        sources: [OWN('Resident funding totals (locked, administrators only)', ctx), OWN('Staff pay rates and contracted hours (locked, administrators only)', ctx)],
      }
    },
  },
  {
    name: 'finance_break_even',
    description: 'How many residents, at the current average weekly fee, are needed to cover the staff cost (staff cost only, not total costs), compared with the number now, and the occupancy that means when the number of places is given. Locked data, administrators only.',
    input_schema: { type: 'object', properties: { places: { type: 'number', description: 'The number of places or beds. Only use a number the administrator gave.' }, ...weekendProp, ...onCostProp } },
    async run(ctx, input) {
      const f = await fundingAggregate(ctx.tenantId, ctx.today)
      if (!f.ready) return { data: { error: 'Funding and fees are not switched on.' }, sources: [] }
      const oc = onCost(input), share = shareOf(input)
      const sc = staffWeeklyCost(costPeople(await loadStaff(ctx.tenantId, ctx.today)), share, oc)
      const cap = input?.places != null ? Math.max(0, Math.min(2000, pct(input.places))) : null
      const r = breakEven({ staffWeekly: sc.weekly, weeklyIncome: f.weekly_income, residentsWithFee: f.people, capacity: cap })
      return {
        data: { ...r, staff_cost_per_week: round2(sc.weekly), places_used: cap, warning: `${NOT_PROFIT} Break even here means income covers staff cost only.`, locked: LOCKED, assumptions: { weekend_share_of_hours: round2(share * 100), on_cost_percent: oc, note: oc ? null : ON_COST_NOTE } },
        method: 'Residents needed = staff cost per week divided by the average weekly fee, rounded up. Occupancy needed = residents needed divided by the number of places.',
        sources: [OWN('Resident funding totals (locked, administrators only)', ctx), OWN('Staff pay rates and contracted hours (locked, administrators only)', ctx)],
      }
    },
  },
  {
    name: 'finance_fee_uplift_income',
    description: 'What a percentage rise in fees would bring in per week, month and year, on all income and on self funded and part self funded income only, with the split by funding type. Use it for "what would a 5 percent fee rise bring in". (To work out the rise NEEDED to cover a cost, use fee_uplift_needed.) Locked data, administrators only.',
    input_schema: { type: 'object', properties: { percent: { type: 'number', description: 'The fee rise, for example 5' } }, required: ['percent'] },
    async run(ctx, input) {
      const r = await fundingReviewFigures(ctx.tenantId, ctx.today)
      if (!r.ready) return { data: { error: 'Funding and fees are not switched on.' }, sources: [] }
      const u = upliftIncome(r.weekly_income_by_type.map(t => ({ funding_type: t.funding_type, label: t.label, weekly_total: t.weekly_total })), pct(input?.percent))
      return {
        data: { ...u, weekly_income_now: r.weekly_income_total, warning: 'Councils and the NHS usually set their own rates, so a rise on those fees needs their agreement. Part funded fees may include a fixed council amount. Treat the all income figure as the most that could be gained.', locked: LOCKED },
        method: `Extra = weekly income by funding type x ${Math.max(0, Math.min(50, pct(input?.percent)))}%. Per year = per week x ${round2(WEEKS_PER_YEAR)}.`,
        sources: [OWN('Resident funding totals (locked, administrators only)', ctx)],
      }
    },
  },
  {
    name: 'finance_fee_reviews',
    description: 'Fee review dates and fee increases: how many fee reviews are overdue or due in the next 30, 60 and 90 days, how many have no review date, the average and longest time since fees last went up, and the weekly income by funding type. Counts and totals only, no names. Locked data, administrators only.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const r = await fundingReviewFigures(ctx.tenantId, ctx.today)
      if (!r.ready) return { data: { error: 'Funding and fees are not switched on.' }, sources: [] }
      const { ready: _r, ...rest } = r
      return { data: { ...rest, locked: LOCKED }, method: 'Counts of recorded review and increase dates. Days since the last increase are counted to today. Only people with a date recorded are included in the averages.', sources: [OWN('Resident funding totals (locked, administrators only)', ctx)] }
    },
  },
  {
    name: 'finance_premiums',
    description: 'What premium pay costs: the extra a weekend rate costs per week and per year (weekend rate minus weekday rate, on the weekend share of contracted hours), and the extra for bank holidays over the next 12 months using the multipliers set in Settings, when the administrator says how many staff work a bank holiday and for how many hours. Locked data, administrators only.',
    input_schema: { type: 'object', properties: { staff_per_bank_holiday: { type: 'number', description: 'How many staff work each bank holiday. Only use a number the administrator gave.' }, hours_each: { type: 'number', description: 'Hours each of them works. Only use a number the administrator gave.' }, hourly_rate: { type: 'number', description: 'The base hourly rate for the bank holiday calculation. If omitted, the average weekday rate of staff with a rate is used.' }, ...weekendProp, ...onCostProp } },
    async run(ctx, input) {
      const staff = await loadStaff(ctx.tenantId, ctx.today), people = costPeople(staff)
      const oc = onCost(input), share = shareOf(input)
      const wk = weekendPremium(people, share, oc)
      const rates = staff.map(s => s.weekday_rate).filter((n): n is number => n != null)
      const avg = rates.length ? rates.reduce((s, n) => s + n, 0) / rates.length : null
      const rate = input?.hourly_rate != null ? pct(input.hourly_rate) : avg
      const settings = (await holidayYearRows(ctx.tenantId, ctx.today)).settings
      const list = bankHolidaysWithPay(settings, ctx.today, addDays(ctx.today, 365))
      const n = pct(input?.staff_per_bank_holiday), h = pct(input?.hours_each)
      const priced = rate && n > 0 && h > 0
      const days = list.map(b => ({ date: b.date, name: b.name, multiplier: b.multiplier, extra_cost: priced ? bankHolidayExtra(rate!, h, b.multiplier, n, oc) : null }))
      const total = priced ? round2(days.reduce((s, d) => s + (d.extra_cost ?? 0), 0)) : null
      return {
        data: { weekend: { people_with_both_rates: wk.counted, not_included_missing_a_rate_or_hours: wk.skipped, ...per(moneyFromWeekly(wk.weekly)) }, bank_holidays_next_12_months: days, bank_holiday_extra_total_next_12_months: total, bank_holiday_assumptions: priced ? { staff_per_bank_holiday: n, hours_each: h, base_hourly_rate: round2(rate!), rate_from: input?.hourly_rate != null ? 'the administrator' : 'the average weekday rate of staff with a rate' } : { note: 'Give the number of staff and hours worked on a bank holiday to price them.' }, locked: LOCKED, assumptions: { weekend_share_of_hours: round2(share * 100), on_cost_percent: oc, note: oc ? null : ON_COST_NOTE } },
        method: `Weekend premium = (weekend rate minus weekday rate, where higher) x contracted hours x ${round2(share * 100)}% x (1 + on costs). Bank holiday extra = base rate x hours x (multiplier minus 1) x staff for each bank holiday in the next 12 months; the normal pay for those hours is not counted.`,
        sources: [OWN('Staff pay rates and contracted hours (locked, administrators only)', ctx), OWN('Bank holiday pay multipliers set in Settings', ctx)],
      }
    },
  },
  ...INCIDENT_TOOLS,
]
