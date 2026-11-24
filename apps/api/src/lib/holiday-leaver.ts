// What a leaver has earned, taken and is owed at their last day, worked out with the holiday entitlement calculator (GOV.UK rules). One place, used by the Holiday agent
// and by the leaving and resignation letters, so the figures can never disagree. leaverFigures is pure (easy to test); loadLeaverInputs reads the records.
import { partYearEntitlement, holidayOwedOnLeaving, leaveYearFor, type Unit, type PartYearMethod } from './holiday-entitlement'

export interface LeaverDay { day: string; hours: number; part?: string }
export interface LeaverInput {
  unit: Unit; allowance: number; contracted: number | null; startDate?: string | null
  leaveYear: { start: string; end: string }; leavingDate: string; days: LeaverDay[]
  /** Weekday hourly rate (pay is administrators only; callers must be admin guarded). */
  hourlyRate?: number | null; method?: PartYearMethod
}
const r2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

/** Holiday counted in the person's unit: hours add up, days count 1 (half a day for AM or PM). */
const count = (unit: Unit, list: LeaverDay[]) => r2(unit === 'days' ? list.reduce((s, d) => s + (d.part && d.part !== 'full' ? 0.5 : 1), 0) : list.reduce((s, d) => s + Number(d.hours), 0))

export function leaverFigures(i: LeaverInput) {
  const upTo = i.days.filter(d => d.day <= i.leavingDate), after = i.days.filter(d => d.day > i.leavingDate)
  const start = i.startDate && i.startDate > i.leaveYear.start ? i.startDate : undefined
  const hoursPerDay = i.contracted != null && i.contracted > 0 ? i.contracted / 5 : undefined
  const earned = partYearEntitlement({ annual: i.allowance, unit: i.unit, leaveYearStart: i.leaveYear.start, leaveYearEnd: i.leaveYear.end, startDate: start, leavingDate: i.leavingDate, method: i.method ?? 'monthly', hoursPerDay })
  const taken = count(i.unit, upTo), bookedAfter = count(i.unit, after)
  const rate = i.hourlyRate ?? undefined
  const owed = holidayOwedOnLeaving({ unit: i.unit, entitlementToLeavingDate: earned.entitlement, taken, bookedAfterLeaving: bookedAfter, ...(i.unit === 'hours' ? { hourlyRate: rate } : { dayRate: rate != null && i.contracted ? r2(rate * (i.contracted / 5)) : undefined }) })
  return {
    earned: earned.entitlement, taken, bookedAfter, owed: owed.owed, overTaken: owed.overTaken, owedPounds: owed.owedPounds ?? null, hourlyRate: rate ?? null,
    balance: r2(earned.entitlement - taken), working: [...earned.steps, ...owed.steps], caveats: [...earned.caveats, ...owed.caveats],
  }
}

/** Reads the person's allowance, unit, start date, approved days in the leave year and weekday rate. Returns null when the person or their allowance is missing. */
export async function loadLeaverInputs(tenantId: string, userId: string, leavingDate: string, method?: PartYearMethod): Promise<(LeaverInput & { name: string }) | null> {
  const { loadRoster, loadSettings, approvedDays } = await import('./holiday-data')
  const { prisma } = await import('../db/client')
  const person = (await loadRoster(tenantId)).find(r => r.id === userId)
  if (!person || person.allowance == null) return null
  const settings = await loadSettings(tenantId)
  const year = leaveYearFor(leavingDate, settings.year_start.month, settings.year_start.day)
  const days = (await approvedDays(tenantId, year.start, year.end, [userId])).filter(d => d.user_id === userId).map(d => ({ day: d.day, hours: Number(d.hours), part: (d as any).part }))
  let rate: number | null = null
  try { const h = await (prisma as any).holidayStaff.findFirst({ where: { user_id: userId, tenant_id: tenantId }, select: { weekday_rate: true } }); rate = h?.weekday_rate != null ? Number(h.weekday_rate) : null } catch { rate = null }
  return { name: person.name, unit: person.unit, allowance: person.allowance, contracted: person.contracted, startDate: person.start_date, leaveYear: { start: year.start, end: year.end }, leavingDate, days, hourlyRate: rate, method }
}
