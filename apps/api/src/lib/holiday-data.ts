// Holiday tracking: reading and writing (settings, the roster, bookings, balances, the matrix and the hub messages).
// Every function tolerates the tables not existing yet (the SQL is run by the owner after the code ships): a missing table is "not switched on yet".
import { prisma } from '../db/client'
import { writeAuditLog } from './audit'
import { isManagerJobRole } from './care-manager'
import { SUPPORT_BANK_HOLIDAYS } from '../data/support-chat-bank-holidays'
import { staffPhotoUrls } from './staff-photos'
import {
  type Unit, type DayRow, type MonthlyFigure, balanceFor, carryInFor, monthsOfYear, yearRange, yearContaining, bankMultiplier, DEFAULT_BANK_MULTIPLIER, BANK_MULTIPLIERS, ukToday,
} from './holiday-math'

const p = () => prisma as any
export const isMissingTable = (e: any) => e?.code === 'P2021' || /does not exist|relation .* does not exist/i.test(String(e?.message ?? ''))

export interface HolidaySettingsView {
  year_start: { month: number; day: number }
  year_start_source: 'holiday' | 'workforce' | 'default'
  carry_over: boolean
  manager_approval: boolean
  max_off: number | null
  bank_default_multiplier: number
  bank_overrides: Record<string, number>
}
export const DEFAULT_SETTINGS: HolidaySettingsView = { year_start: { month: 1, day: 1 }, year_start_source: 'default', carry_over: false, manager_approval: false, max_off: null, bank_default_multiplier: DEFAULT_BANK_MULTIPLIER, bank_overrides: {} }

/** The account's holiday settings. The year start: this module's own setting, else the workforce register's saved year start, else 1 January. */
export async function loadSettings(tenantId: string): Promise<HolidaySettingsView> {
  let row: any = null
  try { row = await p().holidaySettings.findUnique({ where: { tenant_id: tenantId } }) } catch { row = null }
  if (row) {
    return {
      year_start: { month: row.year_start_month, day: row.year_start_day }, year_start_source: 'holiday',
      carry_over: !!row.carry_over, manager_approval: !!row.manager_approval, max_off: row.max_off ?? null,
      bank_default_multiplier: Number(row.bank_default_multiplier) || DEFAULT_BANK_MULTIPLIER,
      bank_overrides: row.bank_overrides && typeof row.bank_overrides === 'object' ? row.bank_overrides : {},
    }
  }
  let wf: any = null
  try { wf = await p().workforceSettings.findUnique({ where: { tenant_id: tenantId } }) } catch { wf = null }
  if (wf) return { ...DEFAULT_SETTINGS, year_start: { month: wf.holiday_year_start_month, day: wf.holiday_year_start_day }, year_start_source: 'workforce' }
  return { ...DEFAULT_SETTINGS }
}

export async function holidayTablesReady(): Promise<boolean> {
  try { await p().holidayRequest.findFirst({ select: { id: true } }); await p().holidayDay.findFirst({ select: { id: true } }); return true } catch { return false }
}

export interface RosterPerson {
  id: string; name: string; email: string | null; job_role: string | null; role: string
  unit: Unit; allowance: number | null; contracted: number | null; start_date: string | null
}
/** Active staff (not archived, not a shared tablet, not agency) with their holiday allowance and unit from the staff record. Pay rates are NOT here. */
export async function loadRoster(tenantId: string): Promise<RosterPerson[]> {
  const users = await p().user.findMany({ where: { tenant_id: tenantId, is_active: true, is_shared: false, is_agency: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, job_role: true, role: true } })
  const ids = users.map((u: any) => u.id)
  let details: any[] = [], hs: any[] = []
  try { details = await p().staffDetail.findMany({ where: { user_id: { in: ids } }, select: { user_id: true, holiday_entitlement: true, holiday_unit: true, contract_hours_per_week: true } }) } catch { details = [] }
  try { hs = await p().holidayStaff.findMany({ where: { user_id: { in: ids } }, select: { user_id: true, start_date: true } }) } catch { hs = [] }
  const d = new Map<string, any>(details.map(x => [x.user_id, x])), h = new Map<string, any>(hs.map(x => [x.user_id, x]))
  return users.map((u: any) => ({
    id: u.id, name: u.name, email: u.email ?? null, job_role: u.job_role ?? null, role: u.role,
    unit: d.get(u.id)?.holiday_unit === 'hours' ? 'hours' : 'days',
    allowance: d.get(u.id)?.holiday_entitlement != null ? Number(d.get(u.id).holiday_entitlement) : null,
    contracted: d.get(u.id)?.contract_hours_per_week != null ? Number(d.get(u.id).contract_hours_per_week) : null,
    start_date: h.get(u.id)?.start_date ? new Date(h.get(u.id).start_date).toISOString().slice(0, 10) : null,
  }))
}

const ymd = (d: any) => new Date(d).toISOString().slice(0, 10)

/** Approved days for people, between two dates (inclusive). */
export async function approvedDays(tenantId: string, from: string, to: string, userIds?: string[]): Promise<Array<DayRow & { user_id: string; request_id: string }>> {
  const rows = await p().holidayDay.findMany({
    where: { tenant_id: tenantId, status: 'approved', day: { gte: new Date(from + 'T00:00:00Z'), lte: new Date(to + 'T00:00:00Z') }, ...(userIds ? { user_id: { in: userIds } } : {}) },
    select: { user_id: true, request_id: true, day: true, hours: true },
  })
  return rows.map((r: any) => ({ user_id: r.user_id, request_id: r.request_id, day: ymd(r.day), hours: Number(r.hours) }))
}

/** Monthly figures loaded from the old spreadsheet, by person. A missing table means there are none (the SQL may not have been run yet). */
export async function monthTotals(tenantId: string, userIds: string[]): Promise<Map<string, MonthlyFigure[]>> {
  const out = new Map<string, MonthlyFigure[]>()
  if (!userIds.length) return out
  try {
    const rows = await p().holidayMonthTotal.findMany({ where: { tenant_id: tenantId, user_id: { in: userIds } }, select: { user_id: true, year: true, month: true, taken_hours: true, booked_hours: true } })
    for (const r of rows) {
      const l = out.get(r.user_id) ?? []
      l.push({ key: `${r.year}-${String(r.month).padStart(2, '0')}`, taken: Number(r.taken_hours), booked: Number(r.booked_hours) })
      out.set(r.user_id, l)
    }
  } catch { /* table not created yet: no imported figures */ }
  return out
}

export interface MatrixRow {
  user_id: string; name: string; job_role: string | null; start_date: string | null; unit: Unit
  allowance: number | null; carry_in: number; entitlement: number; contracted: number | null
  taken_by_month: Record<string, number>; booked_by_month: Record<string, number>
  imported_by_month: Record<string, { taken: number; booked: number }>; photo_url: string | null
  taken: number; booked: number; remaining: number; percent_taken: number
}

/** The matrix for a holiday year: one row per active person, from their approved days. */
export async function buildMatrix(tenantId: string, year: number, settings: HolidaySettingsView, today = ukToday()) {
  const { month, day } = settings.year_start
  const range = yearRange(year, month, day)
  const roster = await loadRoster(tenantId)
  const earliest = yearRange(year - 3, month, day).from
  const all = await approvedDays(tenantId, earliest, range.to, roster.map(r => r.id))
  const totals = await monthTotals(tenantId, roster.map(r => r.id))
  const photos = await staffPhotoUrls(tenantId, roster.map(r => r.id))
  const by = new Map<string, DayRow[]>()
  for (const d of all) { const l = by.get(d.user_id) ?? []; l.push({ day: d.day, hours: d.hours }); by.set(d.user_id, l) }
  const rows: MatrixRow[] = roster.map(r => {
    const days = by.get(r.id) ?? []
    const figs = totals.get(r.id) ?? []
    const carry = carryInFor({ year, allowance: r.allowance, unit: r.unit, days, month, day, carryOver: settings.carry_over, monthly: figs })
    const b = balanceFor({ allowance: r.allowance, unit: r.unit, carryIn: carry, days, range, today, monthly: figs })
    const imported: Record<string, { taken: number; booked: number }> = {}
    for (const f of figs) if (f.key in b.by_month_taken) imported[f.key] = { taken: f.taken, booked: f.booked }
    return {
      user_id: r.id, name: r.name, job_role: r.job_role, start_date: r.start_date, unit: r.unit, allowance: r.allowance, carry_in: b.carry_in, entitlement: b.entitlement, contracted: r.contracted,
      taken_by_month: b.by_month_taken, booked_by_month: b.by_month_booked, imported_by_month: imported, photo_url: photos.get(r.id) ?? null, taken: b.taken, booked: b.booked, remaining: b.remaining, percent_taken: b.percent_taken,
    }
  })
  return { year, label: range.label, from: range.from, to: range.to, months: monthsOfYear(range), rows, today }
}

/** One person's balance for a year. */
export async function personBalance(tenantId: string, person: RosterPerson, year: number, settings: HolidaySettingsView, today = ukToday()) {
  const { month, day } = settings.year_start
  const range = yearRange(year, month, day)
  const days = (await approvedDays(tenantId, yearRange(year - 3, month, day).from, range.to, [person.id])).map(d => ({ day: d.day, hours: d.hours }))
  const figs = (await monthTotals(tenantId, [person.id])).get(person.id) ?? []
  const carry = carryInFor({ year, allowance: person.allowance, unit: person.unit, days, month, day, carryOver: settings.carry_over, monthly: figs })
  return { range, balance: balanceFor({ allowance: person.allowance, unit: person.unit, carryIn: carry, days, range, today, monthly: figs }) }
}

/** England and Wales bank holidays with the pay multiplier the account has chosen. Stored and shown, never deducted. */
export function bankHolidaysWithPay(settings: HolidaySettingsView, from?: string, to?: string) {
  return Object.entries(SUPPORT_BANK_HOLIDAYS)
    .filter(([date]) => (!from || date >= from) && (!to || date <= to))
    .map(([date, name]) => ({ date, name, multiplier: bankMultiplier(date, name, settings.bank_default_multiplier, settings.bank_overrides) }))
}
export const BANK_MULTIPLIER_CHOICES = BANK_MULTIPLIERS

export { yearContaining }

// ── People who decide ──────────────────────────────────────────────────────────────────────
export async function canDecide(tenantId: string, userId: string, role: string, settings?: HolidaySettingsView): Promise<boolean> {
  if (role === 'admin') return true
  const s = settings ?? await loadSettings(tenantId)
  if (!s.manager_approval) return false
  const u = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId, is_active: true }, select: { job_role: true } })
  return isManagerJobRole(u?.job_role)
}

/** Who is told about a new request: the administrators, and the managers when manager approval is on (never the person asking). */
export async function approversFor(tenantId: string, settings: HolidaySettingsView, exceptUserId: string): Promise<Array<{ id: string; name: string; email: string }>> {
  const users = await p().user.findMany({ where: { tenant_id: tenantId, is_active: true, is_shared: false, is_agency: false }, select: { id: true, name: true, email: true, role: true, job_role: true } })
  return users.filter((u: any) => u.email && u.id !== exceptUserId && (u.role === 'admin' || (settings.manager_approval && isManagerJobRole(u.job_role))))
    .map((u: any) => ({ id: u.id, name: u.name, email: u.email }))
}

// ── The hub message (a staff notification) ─────────────────────────────────────────────────
/** Puts a message in the person's hub using the staff notifications system. Never throws: the email and the booking are what matter. */
export async function postHubMessage(o: { tenantId: string; fromUserId: string; fromName: string; toUserId: string; title: string; body: string }): Promise<void> {
  try {
    const n = await p().staffNotification.create({ data: { tenant_id: o.tenantId, title: o.title.slice(0, 120), body: o.body.slice(0, 2000), created_by: o.fromUserId, created_by_name: o.fromName, audience: 'selected' } })
    await p().staffNotificationRecipient.create({ data: { notification_id: n.id, tenant_id: o.tenantId, user_id: o.toUserId, email_sent_at: new Date() } })
  } catch (e: any) { console.error('[holiday] hub message not saved:', String(e?.message ?? e).slice(0, 120)) }
}

export const audit = (tenantId: string, userId: string | null, event: 'holiday_requested' | 'holiday_approved' | 'holiday_rejected' | 'holiday_cancelled' | 'holiday_edited' | 'holiday_removed' | 'holiday_imported' | 'holiday_settings_changed', entityId: string, metadata: Record<string, unknown> = {}) =>
  void writeAuditLog({ tenant_id: tenantId, user_id: userId, event_type: event, entity_type: 'holiday_request', entity_id: entityId, metadata })
