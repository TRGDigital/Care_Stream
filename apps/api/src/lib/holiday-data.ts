// Holiday tracking: reading and writing (settings, the roster, bookings, balances, the matrix and the hub messages).
// Every function tolerates the tables not existing yet (the SQL is run by the owner after the code ships): a missing table is "not switched on yet".
import { prisma } from '../db/client'
import { writeAuditLog } from './audit'
import { isManagerJobRole } from './care-manager'
import { SUPPORT_BANK_HOLIDAYS } from '../data/support-chat-bank-holidays'
import { staffPhotoUrls } from './staff-photos'
import {
  type Unit, type DayRow, type OffRow, type Part, type MonthlyFigure, balanceFor, carryInFor, monthsOfYear, yearRange, yearContaining, bankMultiplier, DEFAULT_BANK_MULTIPLIER, BANK_MULTIPLIERS, ukToday, valueOf, normalisePart, shiftHoursFor, halfShift, MAX_HOURS_PER_DAY,
} from './holiday-math'
import { cleanBlocked, evaluateRequest, type Blocked, type RuleIssue, type YearState } from './holiday-rules'

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
  blocked_dates: Blocked[]
}
export const DEFAULT_SETTINGS: HolidaySettingsView = { year_start: { month: 1, day: 1 }, year_start_source: 'default', carry_over: false, manager_approval: false, max_off: null, bank_default_multiplier: DEFAULT_BANK_MULTIPLIER, bank_overrides: {}, blocked_dates: [] }

/** The account's holiday settings. The year start: this module's own setting, else the workforce register's saved year start, else 1 January. */
export async function loadSettings(tenantId: string): Promise<HolidaySettingsView> {
  const base = await loadSettingsBase(tenantId)
  return { ...base, blocked_dates: await loadBlockedDates(tenantId) }
}
async function loadSettingsBase(tenantId: string): Promise<Omit<HolidaySettingsView, 'blocked_dates'>> {
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

// ── Columns added by 2026-11-25_holiday_balance_rules.sql ───────────────────────────────────
// They are read and written with plain SQL (not through the Prisma models) so that every existing query keeps working before that SQL has been run:
// a missing column simply means "the default" (a full day, no exception, no blocked dates).
const rawRows = async (sql: string, ...params: unknown[]): Promise<any[]> => { try { return await p().$queryRawUnsafe(sql, ...params) } catch { return [] } }

export async function loadBlockedDates(tenantId: string): Promise<Blocked[]> {
  const r = await rawRows('select blocked_dates from holiday_settings where tenant_id = $1', tenantId)
  return cleanBlocked(r[0]?.blocked_dates)
}
/** Saves the blocked dates. Throws when the column is missing (the SQL has not been run) so the settings form can say so. */
export async function saveBlockedDates(tenantId: string, list: Blocked[]): Promise<void> {
  await p().$executeRawUnsafe('update holiday_settings set blocked_dates = $1::jsonb where tenant_id = $2', JSON.stringify(list), tenantId)
}
/** Days that are not a full day (AM, PM or part), for a date range: a map of "requestId|day" to the part. */
async function nonFullParts(tenantId: string, from: string, to: string, status?: string): Promise<Map<string, Part>> {
  const rows = await rawRows(`select request_id, to_char(day, 'YYYY-MM-DD') as day, part from holiday_days where tenant_id = $1 and day between $2::date and $3::date and part <> 'full'${status ? ' and status = $4' : ''}`, ...(status ? [tenantId, from, to, status] : [tenantId, from, to]))
  return new Map(rows.map((r: any) => [`${r.request_id}|${r.day}`, normalisePart(r.part)]))
}
export async function savePartsFor(requestId: string, days: DayRow[]): Promise<void> {
  for (const d of days) {
    if (!d.part || d.part === 'full') continue
    try { await p().$executeRawUnsafe('update holiday_days set part = $1 where request_id = $2 and day = $3::date', d.part, requestId, d.day) } catch { /* column not there yet: the day stays a full day */ }
  }
}
/** The exception flags of some requests: { over_allowance, over_allowance_note }, by request id. */
export async function loadOver(requestIds: string[]): Promise<Map<string, { over: boolean; note: string | null }>> {
  if (!requestIds.length) return new Map()
  const rows = await rawRows('select id, over_allowance, over_allowance_note from holiday_requests where id = any($1::text[])', requestIds)
  return new Map(rows.map((r: any) => [r.id, { over: !!r.over_allowance, note: r.over_allowance_note ?? null }]))
}
export async function saveOver(requestId: string, over: boolean, note: string | null): Promise<void> {
  try { await p().$executeRawUnsafe('update holiday_requests set over_allowance = $1, over_allowance_note = $2 where id = $3', over, note, requestId) } catch { /* column not there yet */ }
}
export async function loadPartsForRequests(requestIds: string[]): Promise<Map<string, Part>> {
  if (!requestIds.length) return new Map()
  const rows = await rawRows(`select request_id, to_char(day, 'YYYY-MM-DD') as day, part from holiday_days where request_id = any($1::text[]) and part <> 'full'`, requestIds)
  return new Map(rows.map((r: any) => [`${r.request_id}|${r.day}`, normalisePart(r.part)]))
}

/** Serialises everything that checks and then changes ONE person's holiday: a transaction that holds a database lock for them until it ends. Two requests sent at the same
 *  moment queue here, so the second is checked after the first is saved and cannot both pass the balance check. */
export async function withUserLock<R>(userId: string, fn: () => Promise<R>): Promise<R> {
  return p().$transaction(async (tx: any) => {
    await tx.$queryRawUnsafe('select 1 as ok from (select pg_advisory_xact_lock(hashtext($1))) t', `holiday:${userId}`)
    return fn()
  }, { maxWait: 10_000, timeout: 30_000 })
}

export async function holidayTablesReady(): Promise<boolean> {
  try { await p().holidayRequest.findFirst({ select: { id: true } }); await p().holidayDay.findFirst({ select: { id: true } }); return true } catch { return false }
}

export interface RosterPerson {
  id: string; name: string; email: string | null; job_role: string | null; role: string
  unit: Unit; allowance: number | null; contracted: number | null; start_date: string | null
  /** Allocation for the rest of the year they start in (same unit). Used only for the holiday year containing start_date. */
  first_year_allowance?: number | null
}
/** The allowance that applies to one holiday year: the part year figure in the year a person starts, otherwise the full yearly allocation. */
export function allowanceForYear(person: { allowance: number | null; first_year_allowance?: number | null; start_date: string | null }, range: { from: string; to: string }): number | null {
  const f = person.first_year_allowance
  if (f != null && person.start_date && person.start_date >= range.from && person.start_date <= range.to) return f
  return person.allowance
}
/** Active staff (not archived, not a shared tablet, not agency) with their holiday allowance and unit from the staff record. Pay rates are NOT here. */
export async function loadRoster(tenantId: string): Promise<RosterPerson[]> {
  const users = await p().user.findMany({ where: { tenant_id: tenantId, is_active: true, is_shared: false, is_agency: false }, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, job_role: true, role: true } })
  const ids = users.map((u: any) => u.id)
  let details: any[] = [], hs: any[] = []
  try { details = await p().staffDetail.findMany({ where: { user_id: { in: ids } }, select: { user_id: true, holiday_entitlement: true, holiday_unit: true, contract_hours_per_week: true } }) } catch { details = [] }
  try { hs = await p().holidayStaff.findMany({ where: { user_id: { in: ids } }, select: { user_id: true, start_date: true } }) } catch { hs = [] }
  const d = new Map<string, any>(details.map(x => [x.user_id, x])), h = new Map<string, any>(hs.map(x => [x.user_id, x]))
  const fy = new Map<string, number>((await rawRows('select user_id, first_year_allowance from holiday_staff where user_id = any($1::text[]) and first_year_allowance is not null', ids)).map((r: any) => [r.user_id, Number(r.first_year_allowance)]))
  return users.map((u: any) => ({
    id: u.id, name: u.name, email: u.email ?? null, job_role: u.job_role ?? null, role: u.role,
    unit: d.get(u.id)?.holiday_unit === 'hours' ? 'hours' : 'days',
    allowance: d.get(u.id)?.holiday_entitlement != null ? Number(d.get(u.id).holiday_entitlement) : null,
    contracted: d.get(u.id)?.contract_hours_per_week != null ? Number(d.get(u.id).contract_hours_per_week) : null,
    start_date: h.get(u.id)?.start_date ? new Date(h.get(u.id).start_date).toISOString().slice(0, 10) : null,
    first_year_allowance: fy.get(u.id) ?? null,
  }))
}

const ymd = (d: any) => new Date(d).toISOString().slice(0, 10)

/** Approved days for people, between two dates (inclusive). */
export async function approvedDays(tenantId: string, from: string, to: string, userIds?: string[], excludeRequestId?: string): Promise<Array<DayRow & { user_id: string; request_id: string }>> {
  const rows = await p().holidayDay.findMany({
    where: { tenant_id: tenantId, status: 'approved', day: { gte: new Date(from + 'T00:00:00Z'), lte: new Date(to + 'T00:00:00Z') }, ...(userIds ? { user_id: { in: userIds } } : {}), ...(excludeRequestId ? { request_id: { not: excludeRequestId } } : {}) },
    select: { user_id: true, request_id: true, day: true, hours: true },
  })
  const parts = rows.length ? await nonFullParts(tenantId, from, to, 'approved') : new Map<string, Part>()
  return rows.map((r: any) => { const part = parts.get(`${r.request_id}|${ymd(r.day)}`); return { user_id: r.user_id, request_id: r.request_id, day: ymd(r.day), hours: Number(r.hours), ...(part ? { part } : {}) } })
}

/** Days still waiting for a decision, for one person between two dates. */
export async function pendingDays(tenantId: string, userId: string, from: string, to: string, excludeRequestId?: string): Promise<Array<DayRow & { request_id: string }>> {
  const rows = await p().holidayDay.findMany({
    where: { tenant_id: tenantId, user_id: userId, status: 'pending', day: { gte: new Date(from + 'T00:00:00Z'), lte: new Date(to + 'T00:00:00Z') }, ...(excludeRequestId ? { request_id: { not: excludeRequestId } } : {}) },
    select: { request_id: true, day: true, hours: true },
  })
  const parts = rows.length ? await nonFullParts(tenantId, from, to, 'pending') : new Map<string, Part>()
  return rows.map((r: any) => { const part = parts.get(`${r.request_id}|${ymd(r.day)}`); return { request_id: r.request_id, day: ymd(r.day), hours: Number(r.hours), ...(part ? { part } : {}) } })
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
  for (const d of all) { const l = by.get(d.user_id) ?? []; l.push({ day: d.day, hours: d.hours, ...(d.part ? { part: d.part } : {}) }); by.set(d.user_id, l) }
  const rows: MatrixRow[] = roster.map(r => {
    const days = by.get(r.id) ?? []
    const figs = totals.get(r.id) ?? []
    const carry = carryInFor({ year, allowance: r.allowance, unit: r.unit, days, month, day, carryOver: settings.carry_over, monthly: figs })
    const b = balanceFor({ allowance: allowanceForYear(r, range), unit: r.unit, carryIn: carry, days, range, today, monthly: figs })
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
  const days = (await approvedDays(tenantId, yearRange(year - 3, month, day).from, range.to, [person.id])).map(d => ({ day: d.day, hours: d.hours, ...(d.part ? { part: d.part } : {}) }))
  const figs = (await monthTotals(tenantId, [person.id])).get(person.id) ?? []
  const carry = carryInFor({ year, allowance: person.allowance, unit: person.unit, days, month, day, carryOver: settings.carry_over, monthly: figs })
  const balance = balanceFor({ allowance: allowanceForYear(person, range), unit: person.unit, carryIn: carry, days, range, today, monthly: figs })
  const pending = Math.round((await pendingDays(tenantId, person.id, range.from, range.to)).reduce((sum, d) => sum + valueOf(d, person.unit), 0) * 100) / 100
  return { range, balance, pending, available: Math.max(0, Math.round((balance.remaining - pending) * 100) / 100) }
}

/** What one holiday year looks like for the rules: allowance, what is approved, what is held by pending requests. `excludeRequestId` leaves out the request being decided or changed. */
export async function yearStateFor(tenantId: string, person: RosterPerson, year: number, settings: HolidaySettingsView, today: string, excludeRequestId?: string): Promise<YearState> {
  const { month, day } = settings.year_start
  const range = yearRange(year, month, day)
  const current = yearContaining(today, month, day)
  const approved = (await approvedDays(tenantId, yearRange(year - 3, month, day).from, range.to, [person.id], excludeRequestId))
  const figs = (await monthTotals(tenantId, [person.id])).get(person.id) ?? []
  // Carry over for a year that has not started cannot be known yet: only the basic allowance counts there.
  const carry = year > current ? 0 : carryInFor({ year, allowance: person.allowance, unit: person.unit, days: approved, month, day, carryOver: settings.carry_over, monthly: figs })
  const bal = balanceFor({ allowance: allowanceForYear(person, range), unit: person.unit, carryIn: carry, days: approved, range, today, monthly: figs })
  const pend = await pendingDays(tenantId, person.id, range.from, range.to, excludeRequestId)
  return { year, label: range.label, allowance_set: person.allowance != null, entitlement: bal.entitlement, used: bal.used, pending: Math.round(pend.reduce((sum, d) => sum + valueOf(d, person.unit), 0) * 100) / 100, future: year > current }
}

/** Everything a request is checked against, for one person and some days. Returns the issues (empty = the request is fine). */
export async function checkRequest(o: { tenantId: string; person: RosterPerson; days: DayRow[]; settings: HolidaySettingsView; today: string; excludeRequestId?: string }): Promise<RuleIssue[]> {
  const { month, day } = o.settings.year_start
  const years = [...new Set(o.days.map(d => yearContaining(d.day, month, day)))]
  const states: Record<number, YearState> = {}
  for (const y of years) states[y] = await yearStateFor(o.tenantId, o.person, y, o.settings, o.today, o.excludeRequestId)
  const dates = o.days.map(d => d.day).sort()
  const others = dates.length ? await othersOnDays(o.tenantId, dates, o.person.id, o.excludeRequestId) : []
  return evaluateRequest({ days: o.days, unit: o.person.unit, today: o.today, month, day, years: states, others, maxOff: o.settings.max_off, blocked: o.settings.blocked_dates, carryOver: o.settings.carry_over })
}

/** Other people's approved and pending days on some dates (for the clash lists and the people off rule). */
export async function othersOnDays(tenantId: string, days: string[], exceptUserId?: string, excludeRequestId?: string): Promise<OffRow[]> {
  if (!days.length) return []
  const rows = await p().holidayDay.findMany({
    where: { tenant_id: tenantId, status: { in: ['approved', 'pending'] }, day: { in: days.map(d => new Date(d + 'T00:00:00Z')) }, ...(excludeRequestId ? { request_id: { not: excludeRequestId } } : {}), ...(exceptUserId ? { user_id: { not: exceptUserId } } : {}) },
    select: { request_id: true, user_id: true, day: true, hours: true, status: true },
  })
  const sorted = [...days].sort()
  const parts = rows.length ? await nonFullParts(tenantId, sorted[0], sorted[sorted.length - 1]) : new Map<string, Part>()
  const users = await p().user.findMany({ where: { id: { in: [...new Set(rows.map((r: any) => r.user_id))] as string[] }, tenant_id: tenantId }, select: { id: true, name: true } })
  const names = new Map<string, string>(users.map((u: any) => [u.id, u.name]))
  return rows.map((r: any) => { const part = parts.get(`${r.request_id}|${ymd(r.day)}`); return { day: ymd(r.day), user_id: r.user_id, name: names.get(r.user_id) ?? 'A colleague', status: r.status, hours: Number(r.hours), ...(part ? { part } : {}) } })
}

/** What a person can choose for a day, from their usual shift. */
export function shiftInfo(contracted: number | null) { const shift = shiftHoursFor(contracted); return { shift_hours: shift, half_hours: halfShift(shift), max_hours: MAX_HOURS_PER_DAY } }

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
