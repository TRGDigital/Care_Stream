// The Holiday agent's entitlement tools: the part year and leaver calculator (lib/holiday-entitlement.ts, built on the GOV.UK rules) as read only tools. The sums are
// done in code and each result carries its plain English working ("steps") and what it does not cover ("caveats") for the agent to show.
import type { AskTool } from './tools'
import { ownSource } from './sources'
import { loadStaff, holidaySettings, ukToday } from './data'
import { loadLeaverInputs, leaverFigures } from '../../lib/holiday-leaver'
import { statutoryEntitlement, partYearEntitlement, compareWithStatutory, irregularHoursAccrual, holidayOwedOnLeaving, leaveYearFor, type Unit } from '../../lib/holiday-entitlement'

const YMD = /^\d{4}-\d{2}-\d{2}$/
const isYmd = (s: any): s is string => YMD.test(String(s ?? ''))
const num = (v: any): number | null => { const n = Number(v); return v === null || v === undefined || v === '' || !Number.isFinite(n) ? null : n }
const GOV = { label: 'GOV.UK: holiday entitlement', as_of: null, url: 'https://www.gov.uk/holiday-entitlement-rights' }
const OWN = (label: string, today: string) => ownSource(`${label} (CareStream records)`, today)
const fail = (message: string) => ({ data: { error: message }, sources: [] })

export const ENTITLEMENT_TOOLS: AskTool[] = [
  {
    name: 'statutory_minimum',
    description: 'The legal minimum paid holiday (5.6 weeks, capped at 28 days) for a person who works a regular number of hours or days a week. Give hours_per_week or days_per_week. Use for "what is the minimum we must give?".',
    input_schema: { type: 'object', properties: { hours_per_week: { type: 'number' }, days_per_week: { type: 'number' } } },
    async run(ctx, input) {
      const h = num(input?.hours_per_week), d = num(input?.days_per_week)
      if (h == null && d == null) return fail('Please give the hours a week or the days a week.')
      try { const r = statutoryEntitlement({ hoursPerWeek: h ?? undefined, daysPerWeek: d ?? undefined }); return { data: r, method: r.steps.join(' '), sources: [GOV] } } catch (e: any) { return fail(String(e?.message ?? e)) }
    },
  },
  {
    name: 'entitlement_for_starter_or_leaver',
    description: 'The holiday allowance for someone who starts or leaves part way through the leave year, worked out from their full year allowance (monthly method by default, as GOV.UK does, or exact days) and compared with the legal minimum. Needs annual_allowance and unit, and a start_date and/or leaving_date. Use staff_id (from find_staff) only to fill the hours a week and the leave year from their record.',
    input_schema: { type: 'object', properties: {
      annual_allowance: { type: 'number', description: 'The full year allowance in the unit given, for example 224 (hours).' },
      unit: { type: 'string', enum: ['hours', 'days'] },
      start_date: { type: 'string', description: 'YYYY-MM-DD, when they start (omit if they were already employed at the start of the leave year).' },
      leaving_date: { type: 'string', description: 'YYYY-MM-DD, their last day (omit if they are not leaving this leave year).' },
      leave_year_start: { type: 'string', description: 'YYYY-MM-DD, the first day of the leave year to use. Default: the leave year of the start date, else today, from the account setting.' },
      method: { type: 'string', enum: ['monthly', 'exact_days'] },
      hours_per_week: { type: 'number', description: 'Contracted hours a week, to compare with the legal minimum and to size a day.' },
      days_per_week: { type: 'number' },
    }, required: ['annual_allowance', 'unit'] },
    async run(ctx, input) {
      const annual = num(input?.annual_allowance), unit: Unit = input?.unit === 'days' ? 'days' : 'hours'
      if (annual == null || annual < 0) return fail('Please give the full year allowance.')
      const start = isYmd(input?.start_date) ? input.start_date : undefined, leaving = isYmd(input?.leaving_date) ? input.leaving_date : undefined
      if (!start && !leaving) return fail('Please give a start date or a leaving date.')
      const settings = await holidaySettings(ctx.tenantId)
      const anchor = isYmd(input?.leave_year_start) ? input.leave_year_start : (start ?? leaving ?? ctx.today)
      const ys = isYmd(input?.leave_year_start) ? { month: Number(input.leave_year_start.slice(5, 7)), day: Number(input.leave_year_start.slice(8, 10)) } : settings.year_start
      const year = leaveYearFor(isYmd(input?.leave_year_start) ? input.leave_year_start : anchor, ys.month, ys.day)
      const hpw = num(input?.hours_per_week)
      const hoursPerDay = hpw != null && hpw > 0 ? hpw / 5 : undefined
      try {
        const r = partYearEntitlement({ annual, unit, leaveYearStart: year.start, leaveYearEnd: year.end, startDate: start, leavingDate: leaving, method: input?.method === 'exact_days' ? 'exact_days' : 'monthly', hoursPerDay })
        let statutory: any = null, compare: any = null
        const dpw = num(input?.days_per_week)
        if (hpw != null || dpw != null) {
          const st = statutoryEntitlement({ hoursPerWeek: hpw ?? undefined, daysPerWeek: dpw ?? undefined })
          const full = unit === 'hours' ? st.hours : st.days
          if (full != null) {
            const stPart = partYearEntitlement({ annual: full, unit, leaveYearStart: year.start, leaveYearEnd: year.end, startDate: start, leavingDate: leaving, method: input?.method === 'exact_days' ? 'exact_days' : 'monthly', hoursPerDay })
            statutory = { full_year: full, for_this_period: stPart.entitlement, steps: st.steps }
            compare = compareWithStatutory(r.entitlement, stPart.entitlement, unit)
          }
        }
        return { data: { leave_year: { from: year.start, to: year.end }, allowance_for_this_period: r.entitlement, unit, method: r.methodLabel, working: r.steps, statutory_minimum: statutory, compared_with_statutory: compare, caveats: r.caveats }, method: r.steps.join(' '), sources: [GOV, OWN('Holiday year setting', ctx.today)] }
      } catch (e: any) { return fail(String(e?.message ?? e)) }
    },
  },
  {
    name: 'holiday_owed_on_leaving',
    description: 'What a leaver is owed for untaken holiday at their last day: leave earned to that date (from their allowance, part year), minus holiday taken up to it, valued at their hourly rate. Needs staff_id (from find_staff) and leaving_date. Booked holiday after the last day is treated as cancelled. Pay rates are administrators only, which this administrator is.',
    input_schema: { type: 'object', properties: { staff_id: { type: 'string' }, leaving_date: { type: 'string', description: 'YYYY-MM-DD, their last day.' }, method: { type: 'string', enum: ['monthly', 'exact_days'] } }, required: ['staff_id', 'leaving_date'] },
    async run(ctx, input) {
      if (!isYmd(input?.leaving_date)) return fail('Please give the last day as a date.')
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).find(s => s.id === String(input?.staff_id ?? ''))
      if (!staff) return fail('I could not find that person. Use find_staff first.')
      if (staff.allowance == null) return fail(`${staff.name} has no holiday allowance set up, so this cannot be worked out. Set it on their staff record first.`)
      try {
        const inputs = await loadLeaverInputs(ctx.tenantId, staff.id, input.leaving_date, input?.method === 'exact_days' ? 'exact_days' : 'monthly')
        if (!inputs) return fail('Their holiday details could not be read.')
        const f = leaverFigures(inputs)
        return { data: { person: staff.name, last_day: input.leaving_date, leave_year: inputs.leaveYear, unit: inputs.unit, full_year_allowance: inputs.allowance, earned_to_last_day: f.earned, taken_to_last_day: f.taken, booked_after_last_day_cancelled: f.bookedAfter, owed: f.owed, over_taken: f.overTaken, owed_pounds: f.owedPounds, hourly_rate_used: f.hourlyRate, working: f.working, caveats: f.caveats }, method: f.working.join(' '), sources: [GOV, OWN('Holiday and staff records', ctx.today)] }
      } catch (e: any) { return fail(String(e?.message ?? e)) }
    },
  },
  {
    name: 'irregular_hours_accrual',
    description: 'Holiday built up by someone on irregular hours or part year work: 12.07 percent of the hours worked in each pay period, rounded as GOV.UK says. Give hours_worked (one pay period) or pay_periods_hours (a list).',
    input_schema: { type: 'object', properties: { hours_worked: { type: 'number' }, pay_periods_hours: { type: 'array', items: { type: 'number' } } } },
    async run(_ctx, input) {
      try {
        const r = irregularHoursAccrual({ hoursWorked: num(input?.hours_worked) ?? undefined, payPeriodsHours: Array.isArray(input?.pay_periods_hours) ? input.pay_periods_hours.map(Number).filter(Number.isFinite) : undefined })
        return { data: r, method: r.steps.join(' '), sources: [GOV] }
      } catch (e: any) { return fail(String(e?.message ?? e)) }
    },
  },
]

export { ukToday }
