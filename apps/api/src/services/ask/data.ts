// Read only loaders for the Ask CareStream tools. Everything here is scoped to one account (tenantId is in every query) and only READS. Nothing about sickness or
// health notes is loaded anywhere under services/ask (a test checks). Contact details (emails, phone numbers) are never selected.
import { prisma } from '../../db/client'
import { ageOn, round2 } from './calc'
import { loadRoster, loadSettings, buildMatrix, othersOnDays, bankHolidaysWithPay, type HolidaySettingsView } from '../../lib/holiday-data'
import { ukToday, yearContaining, eachDay, addDays, weekStart } from '../../lib/holiday-math'

const db = prisma as any

export interface StaffRow {
  id: string; name: string; job_role: string | null; start_date: string | null; years_service: number | null
  contracted: number | null; unit: 'hours' | 'days'; allowance: number | null
  weekday_rate: number | null; weekend_rate: number | null; age: number | null
}

const num = (v: any) => (v == null ? null : Number(v))
const day = (v: any) => (v ? new Date(v).toISOString().slice(0, 10) : null)

/** Active staff (not archived, not a shared tablet, not agency) with their holiday and pay details. Age is worked out here and the date of birth itself is not passed on. */
export async function loadStaff(tenantId: string, today = ukToday()): Promise<StaffRow[]> {
  const roster = await loadRoster(tenantId)
  const ids = roster.map(r => r.id)
  let hs: any[] = [], det: any[] = []
  try { hs = await db.holidayStaff.findMany({ where: { tenant_id: tenantId, user_id: { in: ids } }, select: { user_id: true, weekday_rate: true, weekend_rate: true } }) } catch { hs = [] }
  try { det = await db.staffDetail.findMany({ where: { tenant_id: tenantId, user_id: { in: ids } }, select: { user_id: true, date_of_birth: true } }) } catch { det = [] }
  const h = new Map<string, any>(hs.map(x => [x.user_id, x])), d = new Map<string, any>(det.map(x => [x.user_id, x]))
  return roster.map(r => {
    const dob = day(d.get(r.id)?.date_of_birth)
    return {
      id: r.id, name: r.name, job_role: r.job_role, start_date: r.start_date,
      years_service: r.start_date ? round2((Date.parse(today) - Date.parse(r.start_date)) / (365.25 * 86400000)) : null,
      contracted: r.contracted, unit: r.unit, allowance: r.allowance,
      weekday_rate: num(h.get(r.id)?.weekday_rate), weekend_rate: num(h.get(r.id)?.weekend_rate), age: dob ? ageOn(dob, today) : null,
    }
  })
}

/** Credentials (DBS, right to work, professional registration) that have expired or expire within the window. Types and dates only: no reference numbers, no documents. */
export async function loadCredentialsDue(tenantId: string, withinDays: number, today = ukToday()) {
  const staff = new Map((await loadRoster(tenantId)).map(r => [r.id, r]))
  const to = addDays(today, Math.max(0, Math.min(365, withinDays)))
  let rows: any[] = []
  try { rows = await db.staffCredential.findMany({ where: { tenant_id: tenantId, user_id: { in: [...staff.keys()] }, expires_at: { not: null, lte: new Date(to + 'T23:59:59Z') } }, select: { user_id: true, type: true, expires_at: true }, orderBy: { expires_at: 'asc' } }) } catch { rows = [] }
  return rows.map(r => ({ name: staff.get(r.user_id)?.name ?? 'Unknown', job_role: staff.get(r.user_id)?.job_role ?? null, type: String(r.type), expires: day(r.expires_at)!, status: day(r.expires_at)! < today ? 'expired' : 'due' }))
}

export async function holidaySettings(tenantId: string): Promise<HolidaySettingsView> { return loadSettings(tenantId) }

/** The holiday matrix rows for the holiday year that contains a date (default today). */
export async function holidayYearRows(tenantId: string, date = ukToday()) {
  const settings = await loadSettings(tenantId)
  const year = yearContaining(date, settings.year_start.month, settings.year_start.day)
  const m = await buildMatrix(tenantId, year, settings, ukToday())
  return { settings, year, label: m.label, from: m.from, to: m.to, rows: m.rows }
}

/** Who is off (approved) or has asked (pending) between two dates. Names, days, hours and AM or PM only. */
export async function whoIsOff(tenantId: string, from: string, to: string) {
  const days = eachDay(from, to).slice(0, 93)
  const rows = await othersOnDays(tenantId, days)
  return rows.map(r => ({ day: r.day, name: r.name, status: r.status, hours: r.hours, part: r.part ?? 'full' }))
}

export function weekOf(date: string) { return weekStart(date) }
export { bankHolidaysWithPay, ukToday, eachDay, addDays }

/** The care setting label of the account (from Facility Type), for wording. */
export async function facilityOf(tenantId: string): Promise<string> {
  try { return String((await db.tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } }))?.facility_type ?? '') } catch { return '' }
}
