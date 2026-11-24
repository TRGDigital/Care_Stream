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

// ── Staff newsletter facts (counts and first names only: never pay, sickness, or anything negative about a named person) ─────────────────────────────────────────────
/** People who started in the last N days: name, job role and start date, for a welcome. */
export async function loadNewStarters(tenantId: string, withinDays: number, today = ukToday()) {
  const from = addDays(today, -Math.max(1, Math.min(180, withinDays)))
  return (await loadStaff(tenantId, today)).filter(s => s.start_date && s.start_date >= from && s.start_date <= today).map(s => ({ name: s.name, job_role: s.job_role, start_date: s.start_date! }))
}
/** Birthdays this month: first name and day of the month only (no age, no year). Only when the account has the staff birthday greeting switched on, which is how an account says it is happy to mark birthdays. */
export async function loadBirthdaysThisMonth(tenantId: string, today = ukToday()): Promise<{ enabled: boolean; people: Array<{ first_name: string; day: number }> }> {
  let on = true
  try { const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { email_preferences: true } }); const prefs = (t?.email_preferences as Record<string, boolean> | null) ?? {}; on = typeof prefs.staff_birthday_emails === 'boolean' ? prefs.staff_birthday_emails : true } catch { on = false }
  if (!on) return { enabled: false, people: [] }
  const roster = await loadRoster(tenantId)
  let det: any[] = []
  try { det = await db.staffDetail.findMany({ where: { tenant_id: tenantId, user_id: { in: roster.map(r => r.id) }, date_of_birth: { not: null } }, select: { user_id: true, date_of_birth: true } }) } catch { det = [] }
  const month = today.slice(5, 7), names = new Map(roster.map(r => [r.id, r.name]))
  const people = det.map(d => ({ id: d.user_id, iso: day(d.date_of_birth)! })).filter(x => x.iso && x.iso.slice(5, 7) === month).map(x => ({ first_name: (names.get(x.id) ?? '').split(/\s+/)[0], day: Number(x.iso.slice(8, 10)) })).filter(p => p.first_name).sort((a, b) => a.day - b.day)
  return { enabled: true, people }
}
/** Training completed in the last N days: how many, and which courses (counts only, no names). */
export async function loadTrainingCompletions(tenantId: string, withinDays: number, today = ukToday()) {
  const since = new Date(addDays(today, -Math.max(1, Math.min(180, withinDays))) + 'T00:00:00Z')
  let rows: any[] = []
  try { rows = await db.trainingEnrollment.groupBy({ by: ['module_id'], where: { tenant_id: tenantId, completed_at: { gte: since } }, _count: { _all: true } }) } catch { return { total: 0, courses: [] as Array<{ course: string; completed: number }> } }
  let mods: any[] = []
  try { mods = await db.trainingModule.findMany({ where: { id: { in: rows.map(r => r.module_id) } }, select: { id: true, name: true } }) } catch { mods = [] }
  const name = new Map(mods.map(m => [m.id, String(m.name)]))
  const courses = rows.map(r => ({ course: name.get(r.module_id) ?? 'A course', completed: Number(r._count?._all ?? 0) })).sort((a, b) => b.completed - a.completed).slice(0, 8)
  return { total: courses.reduce((s, c) => s + c.completed, 0), courses }
}
