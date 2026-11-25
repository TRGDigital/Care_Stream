// The tools the Ask CareStream agents can call. EVERY tool is read only and scoped to one account. A tool returns data, a plain "method" line the agent must show
// when it does a calculation, and the sources it used. Pay rates and funding are administrators only (the whole feature is). Sickness and health notes are not
// available to any tool: there is no loader for them under services/ask (a test checks).
import { round2, paySummary, payGaps, compareNlw, belowMinimumImpact, percentRiseCost, holidayLiability, feeUplift, bankHolidayExtra, blendedRate, weeklyCost, moneyFromWeekly, nlwFor, bandForAge, BAND_LABEL, type NlwRow, type CostPerson } from './calc'
import { loadStaff, loadCredentialsDue, holidayYearRows, whoIsOff, bankHolidaysWithPay, ukToday, addDays, weekOf, facilityOf, type StaffRow } from './data'
import { figuresFor, ownSource, type AskSource } from './sources'
import { fundingAggregate, fundingForNamedPerson } from './funding-bridge'
import { ENTITLEMENT_TOOLS } from './entitlement-tools'
import { LETTER_TOOLS } from './letter-tools'
import { NEWSLETTER_TOOLS } from './newsletter-tools'
import { QUALITY_TOOLS } from './tools-quality'
import { FINANCE_TOOLS } from './tools-finance'
import { ACTION_TOOLS } from './actions/tools-actions'
import { KNOWLEDGE_TOOLS } from './tools-knowledge'

export interface ToolContext { tenantId: string; userId: string; today: string; conversationId?: string | null; collectProposal?: (id: string) => void; role?: 'admin' | 'manager'; moneyOk?: boolean }
export interface ToolResult { data: unknown; method?: string; sources: AskSource[] }
export interface AskTool {
  name: string
  description: string
  input_schema: { type: 'object'; properties: Record<string, any>; required?: string[] }
  run: (ctx: ToolContext, input: any) => Promise<ToolResult>
}

const OWN = (label: string, ctx: ToolContext) => ownSource(`${label} (CareStream records)`, ctx.today)
const pct = (n: any, d = 0) => { const v = Number(n); return Number.isFinite(v) ? v : d }
const clampDays = (v: any, d: number, max: number) => Math.max(1, Math.min(max, Math.round(pct(v, d))))
const onCost = (input: any) => Math.max(0, Math.min(60, pct(input?.on_cost_percent, 0)))
const DEFAULT_ON_COST_NOTE = 'On costs (employer National Insurance, pension and so on) were not included unless the administrator gave a percentage.'

function costPeople(staff: StaffRow[]): CostPerson[] { return staff.map(s => ({ name: s.name, job_role: s.job_role, age: s.age, weekday_rate: s.weekday_rate, weekend_rate: s.weekend_rate, weekly_hours: s.contracted })) }

async function nlwRows(): Promise<{ current: NlwRow | null; upcoming: NlwRow | null; sources: AskSource[]; figure: any }> {
  const { figures, sources } = await figuresFor(['nlw'])
  const f = figures[0]
  const v = f?.value
  return { current: v?.current ?? null, upcoming: v?.upcoming?.[0] ?? null, sources, figure: f }
}

const onCostProp = { on_cost_percent: { type: 'number', description: 'Employer on costs as a percentage of pay (for example employer National Insurance and pension). Only use a number the administrator gave. Omit if not given.' } }

export const TOOLS: AskTool[] = [
  // ── Staff ────────────────────────────────────────────────────────────────────────────
  {
    name: 'staff_roster',
    description: 'The active staff: name, job role, start date, years of service, contracted hours a week and holiday unit. Optionally filter by job role text. No contact details, pay or dates of birth.',
    input_schema: { type: 'object', properties: { job_role: { type: 'string', description: 'Only people whose job role contains this text.' } } },
    async run(ctx, input) {
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).filter(s => !input?.job_role || (s.job_role ?? '').toLowerCase().includes(String(input.job_role).toLowerCase()))
      return { data: { count: staff.length, people: staff.map(s => ({ name: s.name, job_role: s.job_role, start_date: s.start_date, years_of_service: s.years_service, contracted_hours_per_week: s.contracted, holiday_unit: s.unit })) }, sources: [OWN('Staff records', ctx)] }
    },
  },
  {
    name: 'staff_summary',
    description: 'Headcount, headcount by job role, total contracted hours and length of service bands for the active staff.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const staff = await loadStaff(ctx.tenantId, ctx.today)
      const byRole = new Map<string, { count: number; hours: number }>()
      for (const s of staff) { const k = s.job_role ?? 'No job role recorded'; const e = byRole.get(k) ?? { count: 0, hours: 0 }; e.count++; e.hours += s.contracted ?? 0; byRole.set(k, e) }
      const band = (y: number | null) => (y == null ? 'no start date' : y < 1 ? 'under 1 year' : y < 3 ? '1 to 3 years' : y < 5 ? '3 to 5 years' : '5 years or more')
      const bands: Record<string, number> = {}
      for (const s of staff) { const b = band(s.years_service); bands[b] = (bands[b] ?? 0) + 1 }
      const hours = round2(staff.reduce((s, x) => s + (x.contracted ?? 0), 0))
      return { data: { headcount: staff.length, total_contracted_hours_per_week: hours, by_job_role: [...byRole].map(([role, e]) => ({ role, count: e.count, contracted_hours: round2(e.hours) })), length_of_service: bands }, method: 'Counted from active staff records. Archived people, shared tablets and agency workers are not included.', sources: [OWN('Staff records', ctx)] }
    },
  },
  {
    name: 'staff_credentials_due',
    description: 'DBS, right to work and professional registration checks that have expired or expire within a number of days. Names, type and date only.',
    input_schema: { type: 'object', properties: { within_days: { type: 'number', description: 'Look ahead this many days (default 90, maximum 365).' } } },
    async run(ctx, input) {
      const list = await loadCredentialsDue(ctx.tenantId, clampDays(input?.within_days, 90, 365), ctx.today)
      return { data: { count: list.length, items: list }, sources: [OWN('Workforce compliance register', ctx)] }
    },
  },
  {
    name: 'staff_record_gaps',
    description: 'Which active staff are missing key details: start date, contracted hours, holiday allowance, pay rate or date of birth (needed for minimum wage age bands).',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const staff = await loadStaff(ctx.tenantId, ctx.today)
      const names = (f: (s: StaffRow) => boolean) => staff.filter(f).map(s => s.name)
      return { data: { people_checked: staff.length, no_start_date: names(s => !s.start_date), no_contracted_hours: names(s => s.contracted == null), no_holiday_allowance: names(s => s.allowance == null), no_pay_rate: names(s => s.weekday_rate == null && s.weekend_rate == null), no_date_of_birth: names(s => s.age == null) }, sources: [OWN('Staff records', ctx)] }
    },
  },
  {
    name: 'staff_cost',
    description: 'What the staff cost each week, month and year from their contracted hours and pay rates, in total and by job role. Pay rates are administrators only. Weekday and weekend rates are blended assuming 2 of every 7 hours fall at weekends unless a different weekend share is given.',
    input_schema: { type: 'object', properties: { weekend_share_percent: { type: 'number', description: 'Share of hours worked at weekends, 0 to 100 (default 28.6, which is 2 days of 7).' }, ...onCostProp } },
    async run(ctx, input) {
      const share = input?.weekend_share_percent != null ? Math.max(0, Math.min(100, pct(input.weekend_share_percent))) / 100 : 2 / 7
      const oc = onCost(input), staff = await loadStaff(ctx.tenantId, ctx.today)
      let weekly = 0; const by = new Map<string, number>(); const skipped: string[] = []
      for (const s of staff) {
        const rate = blendedRate(s, share)
        if (rate == null || s.contracted == null) { skipped.push(s.name); continue }
        const w = weeklyCost(rate, s.contracted, oc); weekly += w; by.set(s.job_role ?? 'No job role recorded', (by.get(s.job_role ?? 'No job role recorded') ?? 0) + w)
      }
      return { data: { total: moneyFromWeekly(weekly), by_job_role: [...by].map(([role, w]) => ({ role, ...moneyFromWeekly(w) })), people_costed: staff.length - skipped.length, not_costed_missing_rate_or_hours: skipped, assumptions: { weekend_share_of_hours: round2(share * 100), on_cost_percent: oc, note: oc ? null : DEFAULT_ON_COST_NOTE } }, method: `Weekly cost = contracted hours x blended hourly rate${oc ? ` x (1 + ${oc}% on costs)` : ''}. Blended rate = weekday rate x ${round2((1 - share) * 100)}% + weekend rate x ${round2(share * 100)}%. Yearly = weekly x 52.14.`, sources: [OWN('Staff pay rates and contracted hours', ctx)] }
    },
  },

  // ── Holiday ──────────────────────────────────────────────────────────────────────────
  {
    name: 'holiday_balances',
    description: 'Each active person\'s holiday for the holiday year: allowance, carried over, taken, booked (approved, still to come), remaining and percent taken. Optionally for a date inside another holiday year.',
    input_schema: { type: 'object', properties: { date: { type: 'string', description: 'A date (YYYY-MM-DD) inside the holiday year wanted. Default today.' } } },
    async run(ctx, input) {
      const y = await holidayYearRows(ctx.tenantId, /^\d{4}-\d{2}-\d{2}$/.test(String(input?.date ?? '')) ? input.date : ctx.today)
      return { data: { holiday_year: y.label, from: y.from, to: y.to, carry_over_on: y.settings.carry_over, people: y.rows.map(r => ({ name: r.name, job_role: r.job_role, unit: r.unit, entitlement: r.entitlement, carried_over: r.carry_in, taken: r.taken, booked: r.booked, remaining: r.remaining, percent_taken: r.percent_taken })) }, method: 'Only approved holiday counts. Taken is on or before today, booked is after today. Remaining = entitlement (plus carried over) minus taken minus booked.', sources: [OWN('Holiday records', ctx)] }
    },
  },
  {
    name: 'holiday_over_allowance',
    description: 'People whose remaining holiday is below zero, and people with none left, for the current holiday year.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const y = await holidayYearRows(ctx.tenantId, ctx.today)
      const pick = (f: (r: any) => boolean) => y.rows.filter(f).map(r => ({ name: r.name, unit: r.unit, remaining: r.remaining, entitlement: r.entitlement }))
      return { data: { holiday_year: y.label, over_allowance: pick(r => r.remaining < 0), none_left: pick(r => r.remaining === 0 && r.entitlement > 0), no_allowance_set: y.rows.filter(r => r.allowance == null).map(r => r.name) }, sources: [OWN('Holiday records', ctx)] }
    },
  },
  {
    name: 'holiday_who_is_off',
    description: 'Who is off on holiday (approved) or has asked (pending) between two dates, day by day. Maximum 93 days.',
    input_schema: { type: 'object', properties: { from: { type: 'string', description: 'YYYY-MM-DD' }, to: { type: 'string', description: 'YYYY-MM-DD' } }, required: ['from', 'to'] },
    async run(ctx, input) {
      const ok = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s))
      if (!ok(input?.from) || !ok(input?.to) || input.to < input.from) return { data: { error: 'Please give a valid from and to date.' }, sources: [] }
      return { data: { from: input.from, to: input.to, entries: await whoIsOff(ctx.tenantId, input.from, input.to) }, sources: [OWN('Holiday records', ctx)] }
    },
  },
  {
    name: 'holiday_busiest_weeks',
    description: 'For a date range, the number of people off in each Monday to Sunday week (approved and pending counted separately), busiest first.',
    input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' } }, required: ['from', 'to'] },
    async run(ctx, input) {
      const ok = (s: any) => /^\d{4}-\d{2}-\d{2}$/.test(String(s))
      if (!ok(input?.from) || !ok(input?.to) || input.to < input.from) return { data: { error: 'Please give a valid from and to date.' }, sources: [] }
      const rows = await whoIsOff(ctx.tenantId, input.from, input.to)
      const weeks = new Map<string, { approved: Set<string>; pending: Set<string>; person_days: number }>()
      for (const r of rows) { const w = weekOf(r.day); const e = weeks.get(w) ?? { approved: new Set(), pending: new Set(), person_days: 0 }; (r.status === 'approved' ? e.approved : e.pending).add(r.name); e.person_days++; weeks.set(w, e) }
      const list = [...weeks].map(([week_starting, e]) => ({ week_starting, people_approved: e.approved.size, people_pending: e.pending.size, person_days: e.person_days })).sort((a, b) => b.people_approved + b.people_pending - (a.people_approved + a.people_pending))
      return { data: { weeks: list.slice(0, 20) }, method: 'People are counted once per week however many days they are off.', sources: [OWN('Holiday records', ctx)] }
    },
  },
  {
    name: 'holiday_liability',
    description: 'The estimated value of holiday still to be taken this holiday year: hours left x the weekday pay rate (days left are turned into hours with a usual shift of contracted hours divided by 5). An estimate, not an accounting figure.',
    input_schema: { type: 'object', properties: { ...onCostProp } },
    async run(ctx, input) {
      const y = await holidayYearRows(ctx.tenantId, ctx.today), staff = new Map((await loadStaff(ctx.tenantId, ctx.today)).map(s => [s.name, s]))
      const oc = onCost(input)
      const r = holidayLiability(y.rows.map(row => ({ name: row.name, unit: row.unit, remaining: row.remaining, weekday_rate: staff.get(row.name)?.weekday_rate ?? null, contracted: row.contracted })), oc)
      return { data: { holiday_year: y.label, total_value: r.total, total_hours_left: r.hours, per_person: r.rows, people_without_pay_rate: r.missing_rate, assumptions: { on_cost_percent: oc, note: oc ? null : DEFAULT_ON_COST_NOTE } }, method: 'Value = holiday hours left x weekday hourly rate' + (oc ? ` x (1 + ${oc}%)` : '') + '. Days left are converted using contracted hours divided by 5 for a usual shift. This is an estimate.', sources: [OWN('Holiday records and staff pay rates', ctx)] }
    },
  },
  {
    name: 'bank_holiday_pay',
    description: 'The bank holidays in a date range with the pay multiplier the account has set, and optionally the extra pay for a given number of people working a bank holiday for a number of hours at a given hourly rate.',
    input_schema: { type: 'object', properties: { from: { type: 'string' }, to: { type: 'string' }, people: { type: 'number' }, hours_each: { type: 'number' }, hourly_rate: { type: 'number' }, ...onCostProp } },
    async run(ctx, input) {
      const settings = (await holidayYearRows(ctx.tenantId, ctx.today)).settings
      const from = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.from ?? '')) ? input.from : ctx.today, to = /^\d{4}-\d{2}-\d{2}$/.test(String(input?.to ?? '')) ? input.to : addDays(from, 365)
      const list = bankHolidaysWithPay(settings, from, to)
      const oc = onCost(input)
      const calc = input?.people && input?.hours_each && input?.hourly_rate ? list.map(b => ({ date: b.date, name: b.name, multiplier: b.multiplier, extra_cost: bankHolidayExtra(pct(input.hourly_rate), pct(input.hours_each), b.multiplier, pct(input.people), oc) })) : null
      return { data: { bank_holidays: list, extra_cost_per_bank_holiday: calc }, method: calc ? `Extra cost = hourly rate x hours x (multiplier minus 1) x people${oc ? ` x (1 + ${oc}%)` : ''}. The normal pay for the hours is not counted here, only the extra.` : undefined, sources: [OWN('Bank holiday pay settings', ctx), ...(await figuresFor(['bank_holidays'])).sources] }
    },
  },

  // ── Pay and inflation ────────────────────────────────────────────────────────────────
  {
    name: 'get_figures',
    description: 'Official reference figures, each with the date it applies from and a warning if it is out of date or could not be confirmed. keys: nlw (National Living Wage and minimum wage by age band, with the next rate if announced), cpi, cpih (inflation), cpi_food (food price inflation, the annual rate), road_fuel (weekly UK pump prices, petrol and diesel pence per litre), homecare_private_rate (England median private hourly price for home care), homecare_min_price (Homecare Association minimum price per hour), council_homecare_rate (median hourly rate councils pay for external home care), care_food_cost (council cost of care benchmark for food per resident per week, in the prices of the exercise year: bring it to today with cpi_food and say so), ssp (statutory sick pay), mileage (HMRC mileage rates), bank_holidays, real_living_wage.',
    input_schema: { type: 'object', properties: { keys: { type: 'array', items: { type: 'string', enum: ['nlw', 'cpi', 'cpih', 'cpi_food', 'road_fuel', 'homecare_private_rate', 'homecare_min_price', 'council_homecare_rate', 'care_food_cost', 'ssp', 'mileage', 'bank_holidays', 'real_living_wage'] } } }, required: ['keys'] },
    async run(_ctx, input) {
      const keys: string[] = Array.isArray(input?.keys) ? input.keys.map(String) : []
      const r = await figuresFor(keys)
      return { data: { figures: r.figures }, method: 'A figure with usable false could not be confirmed: say so, and do not quote it as fact.', sources: r.sources }
    },
  },
  {
    name: 'nlw_impact',
    description: 'What it costs to raise everyone paid below a National Living Wage or minimum wage rate up to it, using each person\'s date of birth for their age band, their pay rate and contracted hours. target: "current" (the rate in force) or "next" (the next announced rate).',
    input_schema: { type: 'object', properties: { target: { type: 'string', enum: ['current', 'next'] }, ...onCostProp } },
    async run(ctx, input) {
      const rates = await nlwRows()
      const row = input?.target === 'current' ? rates.current : (rates.upcoming ?? null)
      if (!rates.figure?.usable || !row) return { data: { error: input?.target === 'current' ? 'The current National Living Wage figure could not be confirmed.' : 'No next National Living Wage rate has been announced, or the figure could not be confirmed.', figure: rates.figure ?? null }, sources: rates.sources }
      const oc = onCost(input), staff = await loadStaff(ctx.tenantId, ctx.today)
      const r = belowMinimumImpact(costPeople(staff), row, oc)
      return { data: { target_rates: { age21: row.age21, age18to20: row.age18to20, under18: row.under18, from: (row as any).from ?? null }, people_below: r.affected, people_not_checked: r.skipped, people_checked: r.people_checked, extra_cost: r.cost, assumptions: { on_cost_percent: oc, note: oc ? null : DEFAULT_ON_COST_NOTE, blended_rate: 'Weekday and weekend rates blended with 2 of 7 hours at weekends' } }, method: 'For each person paid below the rate for their age band: (rate minus their blended hourly rate) x contracted hours' + (oc ? ` x (1 + ${oc}% on costs)` : '') + '. Added up per week, then per month (x 52.14 / 12) and per year (x 52.14).', sources: [...rates.sources, OWN('Staff pay rates, hours and ages', ctx)] }
    },
  },
  {
    name: 'pay_rise_cost',
    description: 'The cost of giving everyone a percentage pay rise: current weekly, monthly and yearly pay cost, the extra, and the total after, from pay rates and contracted hours.',
    input_schema: { type: 'object', properties: { percent: { type: 'number', description: 'The rise, for example 4.5' }, ...onCostProp }, required: ['percent'] },
    async run(ctx, input) {
      const p = Math.max(0, Math.min(50, pct(input?.percent))), oc = onCost(input)
      const r = percentRiseCost(costPeople(await loadStaff(ctx.tenantId, ctx.today)), p, oc)
      return { data: { rise_percent: p, ...r, assumptions: { on_cost_percent: oc, note: oc ? null : DEFAULT_ON_COST_NOTE } }, method: `Extra = current pay cost x ${p}%. Pay cost = contracted hours x blended hourly rate${oc ? ` x (1 + ${oc}%)` : ''}, yearly = weekly x 52.14.`, sources: [OWN('Staff pay rates and contracted hours', ctx)] }
    },
  },
  {
    name: 'pay_review_table',
    description: 'A table of costs for several possible pay rises (for example 3, 4, 5 and 6 percent) so the options can be compared.',
    input_schema: { type: 'object', properties: { percents: { type: 'array', items: { type: 'number' } }, ...onCostProp }, required: ['percents'] },
    async run(ctx, input) {
      const list = (Array.isArray(input?.percents) ? input.percents : []).slice(0, 8).map((n: any) => Math.max(0, Math.min(50, pct(n))))
      const oc = onCost(input), people = costPeople(await loadStaff(ctx.tenantId, ctx.today))
      return { data: { options: list.map((p: number) => { const r = percentRiseCost(people, p, oc); return { rise_percent: p, extra_per_week: r.extra.per_week, extra_per_month: r.extra.per_month, extra_per_year: r.extra.per_year, new_yearly_pay_cost: r.after.per_year } }), assumptions: { on_cost_percent: oc, note: oc ? null : DEFAULT_ON_COST_NOTE } }, method: 'Each option: extra = current pay cost x percentage. Yearly = weekly x 52.14.', sources: [OWN('Staff pay rates and contracted hours', ctx)] }
    },
  },
  {
    name: 'fee_uplift_needed',
    description: 'How far fees need to rise to cover an extra weekly cost (for example from nlw_impact or pay_rise_cost): the percentage on weekly income from fees, and the pound rise per charged hour for hourly care. Uses resident funding totals only (no individual figures).',
    input_schema: { type: 'object', properties: { extra_per_week: { type: 'number' } }, required: ['extra_per_week'] },
    async run(ctx, input) {
      const extra = Math.max(0, pct(input?.extra_per_week))
      const f = await fundingAggregate(ctx.tenantId, ctx.today)
      if (!f.ready) return { data: { error: 'Funding and fees are not switched on, so there is no fee income to compare with.' }, sources: [] }
      const hourlyIncome = 0
      const r = feeUplift(extra, f.weekly_income, f.hourly_hours_per_week)
      return { data: { extra_cost_per_week: extra, weekly_income_recorded: f.weekly_income, people_with_fees_recorded: f.people, hourly_care_hours_per_week: f.hourly_hours_per_week, ...r, note: 'Income includes estimates for hourly clients where hours and rates were recorded. It covers only people whose funding has been entered.' }, method: 'Fee rise needed = extra weekly cost divided by weekly fee income (as a percentage). Hourly rise = extra weekly cost divided by hourly care hours per week.', sources: [OWN('Resident funding totals (locked, administrators only)', ctx)] }
    },
  },
  {
    name: 'funding_summary',
    description: 'Resident or client funding totals: weekly income, average fee by funding type, the funding mix and reviews due. Totals only, no names. Administrators only.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const f = await fundingAggregate(ctx.tenantId, ctx.today)
      if (!f.ready) return { data: { error: 'Funding and fees are not switched on.' }, sources: [] }
      return { data: f, sources: [OWN('Resident funding totals (locked, administrators only)', ctx)] }
    },
  },
  {
    name: 'funding_for_person',
    description: 'One named current resident\'s funding and fee figures. ONLY use this when the administrator has named that person in their question. Every use is recorded in the audit log.',
    input_schema: { type: 'object', properties: { name: { type: 'string', description: 'The resident\'s name as the administrator gave it.' } }, required: ['name'] },
    async run(ctx, input) {
      const r = await fundingForNamedPerson({ tenantId: ctx.tenantId, userId: ctx.userId, name: String(input?.name ?? '') })
      return { data: r, sources: [OWN('Resident funding (locked, administrators only)', ctx)] }
    },
  },
  // ── Pay analysis (administrators only: they can see pay rates in the staff form, so the agent can too; staff never can) ──────────────────────────────────────
  {
    name: 'pay_summary',
    description: 'THE tool for "what is the average hourly rate we pay", median, lowest, highest, pay bands and pay by job role. Weekday, weekend and a blended rate across active staff, with how many people have no rate recorded. Names are only listed for people without a rate. Use this first for any question about average or typical pay.',
    input_schema: { type: 'object', properties: { weekend_share_percent: { type: 'number', description: 'Share of hours worked at weekends for the blended rate, 0 to 100 (default 28.6).' }, band_width: { type: 'number', enum: [0.5, 1], description: 'Width of each pay band in pounds (default 1).' } } },
    async run(ctx, input) {
      const share = input?.weekend_share_percent != null ? Math.max(0, Math.min(100, pct(input.weekend_share_percent))) / 100 : 2 / 7
      const people = costPeople(await loadStaff(ctx.tenantId, ctx.today))
      const r = paySummary(people, share, input?.band_width === 0.5 ? 0.5 : 1)
      return { data: { ...r, assumptions: { weekend_share_of_hours_for_blended_rate: round2(share * 100) } }, method: `Averages are across active staff who have a pay rate recorded (${r.people_with_rate} of ${r.people_total}). The blended rate is the weekday rate x ${round2((1 - share) * 100)}% plus the weekend rate x ${round2(share * 100)}%. It is a simple average per person, not weighted by hours.`, sources: [OWN('Staff pay rates (locked, administrators only)', ctx)] }
    },
  },
  {
    name: 'pay_list',
    description: 'A table of each active person with their job role, weekday and weekend hourly rate, blended rate and contracted hours, sorted. Use for "who is paid the least or most", or the pay of one job role. Administrators only. No dates of birth or contact details.',
    input_schema: { type: 'object', properties: { job_role: { type: 'string', description: 'Only people whose job role contains this text.' }, sort: { type: 'string', enum: ['lowest_first', 'highest_first', 'name'] }, limit: { type: 'number', description: 'Maximum rows (default 60, maximum 200).' } } },
    async run(ctx, input) {
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).filter(s => !input?.job_role || (s.job_role ?? '').toLowerCase().includes(String(input.job_role).toLowerCase()))
      const rows = staff.map(s => ({ name: s.name, job_role: s.job_role, weekday_rate: s.weekday_rate, weekend_rate: s.weekend_rate, blended_rate: blendedRate(s), contracted_hours_per_week: s.contracted }))
      const key = (r: { blended_rate: number | null }) => r.blended_rate
      const sorted = input?.sort === 'name' ? rows.sort((a, b) => a.name.localeCompare(b.name)) : rows.sort((a, b) => ((key(a) ?? Infinity) - (key(b) ?? Infinity)) * (input?.sort === 'highest_first' ? -1 : 1))
      const limit = Math.max(1, Math.min(200, Math.round(pct(input?.limit, 60))))
      return { data: { count: rows.length, shown: Math.min(limit, rows.length), people: sorted.slice(0, limit) }, method: 'Blended rate = weekday rate x 5/7 plus weekend rate x 2/7 unless only one rate is recorded. People with no rate are listed last.', sources: [OWN('Staff pay rates (locked, administrators only)', ctx)] }
    },
  },
  {
    name: 'pay_gaps',
    description: 'Pay problems and differences: people paid below the current National Living Wage or minimum wage for their age band, people in the same job role on different rates, and people whose pay is far from their role average (by a percentage the administrator can set).',
    input_schema: { type: 'object', properties: { threshold_percent: { type: 'number', description: 'How far from the role average counts as unusual (default 10).' } } },
    async run(ctx, input) {
      const rates = await nlwRows(), people = costPeople(await loadStaff(ctx.tenantId, ctx.today))
      const usable = !!rates.figure?.usable && !!rates.current
      const r = payGaps(people, usable ? rates.current : null, Math.max(1, Math.min(100, pct(input?.threshold_percent, 10))))
      return { data: { ...r, minimum_wage_check: usable ? { rates: { age21: rates.current!.age21, age18to20: rates.current!.age18to20, under18: rates.current!.under18, from: (rates.current as any).from ?? null } } : { error: 'The current National Living Wage figure could not be confirmed, so the minimum wage check was skipped.' } }, method: 'Minimum wage check uses the LOWER of each person\'s weekday and weekend rate against the rate for their age band (age is worked out from the date of birth, which is not shown). Role averages are blended rates and only roles with 3 or more people are checked for unusual pay.', sources: [...rates.sources, OWN('Staff pay rates (locked, administrators only)', ctx)] }
    },
  },
  {
    name: 'pay_compare_nlw',
    description: 'How far above or below the National Living Wage or minimum wage each person is paid (headroom), for the current rate or the announced next rate. Smallest headroom first, with totals.',
    input_schema: { type: 'object', properties: { target: { type: 'string', enum: ['current', 'next'] } } },
    async run(ctx, input) {
      const rates = await nlwRows()
      const row = input?.target === 'next' ? rates.upcoming : rates.current
      if (!rates.figure?.usable || !row) return { data: { error: input?.target === 'next' ? 'No next National Living Wage rate has been announced in the data, or it could not be confirmed.' : 'The current National Living Wage figure could not be confirmed.' }, sources: rates.sources }
      const r = compareNlw(costPeople(await loadStaff(ctx.tenantId, ctx.today)), row)
      return { data: { target: input?.target === 'next' ? 'next' : 'current', rates: { age21: row.age21, age18to20: row.age18to20, under18: row.under18, from: (row as any).from ?? null }, ...r }, method: 'Headroom = the person\'s lower hourly rate minus the minimum for their age band. Negative means below the minimum.', sources: [...rates.sources, OWN('Staff pay rates (locked, administrators only)', ctx)] }
    },
  },
  ...ENTITLEMENT_TOOLS,
  ...LETTER_TOOLS,
  ...NEWSLETTER_TOOLS,
  ...QUALITY_TOOLS,
  ...FINANCE_TOOLS,   // Finance and pay, Complaints and incidents (tools-finance.ts, tools-incidents.ts)
  ...ACTION_TOOLS,
  ...KNOWLEDGE_TOOLS,
  {
    name: 'care_setting',
    description: 'The type of service this account runs (the Facility Type), to word answers correctly.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: { facility_type: await facilityOf(ctx.tenantId) || 'not set' }, sources: [] } },
  },
]

export const toolByName = (n: string) => TOOLS.find(t => t.name === n)
export { ukToday }

import { PEOPLE_TOOLS } from './tools-people'; TOOLS.push(...PEOPLE_TOOLS)   // people development tools (training, CPD, onboarding, compliance, incentives)
