// Holiday tracking and booking (apps/api/src/routes/holiday.ts). PILOT: account CS-1001 only. Every control checks useHolidayMeta().enabled first.
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
export interface RuleIssue { code: 'balance' | 'max_off' | 'blocked' | 'too_far' | 'overlap'; message: string; overridable: boolean; day?: string; year?: number }
export class HolidayError extends Error { constructor(public code: string, message: string, public status: number, public issues: RuleIssue[] = [], public canOverride = false) { super(message) } }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new HolidayError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status, Array.isArray(body?.error?.issues) ? body.error.issues : [], !!body?.error?.can_override)
  return body.data as T
}
const J = (method: string, body?: unknown): RequestInit => ({ method, ...(body !== undefined ? { body: JSON.stringify(body) } : {}) })

export type Unit = 'hours' | 'days'
/** What part of a day is booked: the whole shift, the morning, the afternoon, or part of a day in hours of the person's choosing. */
export type Part = 'full' | 'am' | 'pm' | 'part'
export interface DayRow { day: string; hours: number; part?: Part }
export interface Override { override?: boolean; override_note?: string }
export interface Meta { enabled: boolean; /** The Holiday and pay boxes on the staff forms: on for every account's administrators, even where holiday tracking itself is still a pilot. */ staff_fields?: boolean; ready?: boolean; is_admin?: boolean; can_decide?: boolean; pending_count?: number; max_hours_per_day?: number; today?: string; settings?: { year_start: { month: number; day: number }; carry_over: boolean; manager_approval: boolean } }
export interface Balance { unit: Unit; allowance: number; carry_in: number; entitlement: number; taken: number; booked: number; used: number; remaining: number; percent_taken: number; by_month_taken: Record<string, number>; by_month_booked: Record<string, number> }
export interface Request { id: string; user_id: string; name: string; status: 'pending' | 'approved' | 'rejected' | 'cancelled'; total_hours: number; total_days: number; note: string | null; decision_note: string | null; source: string; requested_at: string | null; decided_by_name: string | null; decided_at: string | null; days: DayRow[]; from: string | null; to: string | null; over_allowance?: boolean; exception_note?: string | null }
export interface BankHoliday { date: string; name: string; multiplier: number }
export interface Me { tracked: boolean; unit?: Unit; year?: number; label?: string; from?: string; to?: string; balance?: Balance; default_hours?: number; requests?: Request[]; upcoming?: Array<DayRow & { request_id: string }>; bank_holidays?: BankHoliday[]; today?: string; pending?: number; available?: number; shift_hours?: number; half_hours?: number; max_hours?: number; max_off?: number | null; blocked_dates?: BlockedDate[]; carry_over?: boolean }
export interface BlockedDate { from: string; to: string; reason: string }
export interface CheckResult { ok: boolean; issues: RuleIssue[]; can_override: boolean }
export interface Person { id: string; name: string; job_role: string | null; unit: Unit; shift_hours: number; half_hours: number; default_hours: number }
export interface Clash { day: string; approved: Array<{ user_id: string; name: string; hours: number; part?: Part }>; pending: Array<{ user_id: string; name: string; hours: number; part?: Part }>; approved_count: number; over_limit: boolean }
export interface WeekOff { user_id: string; name: string; hours: number; status: 'approved' | 'pending'; part?: Part }
export interface WeekDay { day: string; off: WeekOff[] }
export interface WeekData { start: string; days: WeekDay[]; photos?: Record<string, string> }
export interface ApprovalItem extends Request { unit: Unit; clashes: Clash[] }
export interface MatrixRow { user_id: string; name: string; job_role: string | null; start_date: string | null; unit: Unit; allowance: number | null; carry_in: number; entitlement: number; contracted: number | null; taken_by_month: Record<string, number>; booked_by_month: Record<string, number>; imported_by_month?: Record<string, { taken: number; booked: number }>; photo_url?: string | null; taken: number; booked: number; remaining: number; percent_taken: number }
export interface Matrix { year: number; label: string; from: string; to: string; months: Array<{ key: string; label: string }>; rows: MatrixRow[]; today: string; carry_over: boolean }
export interface CalendarData { month: string; max_off: number | null; today: string; days: Array<{ day: string; user_id: string; name: string; job_role: string | null; photo_url?: string | null; hours: number; part?: Part }>; bank_holidays: BankHoliday[] }
export type SickKind = 'sick' | 'injury' | 'medical appointment'
export type Certificate = 'none' | 'self' | 'fit note'
export interface SickSpell { id: string; user_id: string; first_day: string; last_day: string | null; note: string | null; kind: SickKind; certificate: Certificate | null; return_to_work_done: boolean; hours_default: number; days: DayRow[] }
export interface SickEntry { day: string; user_id: string; name: string; job_role: string | null; photo_url?: string | null; hours: number; part?: Part; spell_id: string; kind: SickKind; open: boolean }
export interface SickPerson { id: string; name: string; job_role: string | null; photo_url: string | null; usual_hours: number }
export interface SickReport { from: string; to: string; rows: Array<{ user_id: string; name: string; job_role: string | null; spells: number; days: number; hours: number; first_day: string; last_day: string; certificate: string; return_to_work: string; still_off: boolean; bradford: number }>; totals: { people: number; spells: number; days: number; hours: number } }
export interface HolidaySettings { year_start: { month: number; day: number }; year_start_source: 'holiday' | 'workforce' | 'default'; carry_over: boolean; manager_approval: boolean; max_off: number | null; bank_default_multiplier: number; bank_overrides: Record<string, number>; blocked_dates?: BlockedDate[] }
export interface MatrixImportPreview { committed: boolean; matrix: true; figures?: number; problems?: Array<{ line: number; message: string }>; summary: { matrix: true; people_in_file: number; matched: number; unmatched: number; ambiguous: number; months: string[]; taken_total: number; booked_total: number; date_format: 'mdy' | 'dmy' | 'ambiguous'; problems: number; apply_details: boolean }; people: Array<{ line: number; name: string; user_id: string | null; matched_name: string | null; status: 'matched' | 'unmatched' | 'ambiguous'; taken_total: number; booked_total: number; months: number; change: { start_date: [string | null, string] | null; allowance: [number | null, number] | null; contracted: [number | null, number] | null; unit: [string, string] | null } | null }> }
export interface ImportPreview { committed: boolean; matrix?: false; requests?: number; summary: { rows: number; to_add: number; duplicates: number; errors: number }; rows?: Array<{ line: number; who: string; matched_name: string | null; day: string | null; hours: number | null; error: string | null; duplicate: boolean }> }

export const holiday = {
  meta: (t: string) => call<Meta>('/holiday/meta', t),
  me: (t: string, year?: number) => call<Me>(`/holiday/me${year ? `?year=${year}` : ''}`, t),
  request: (t: string, o: { days: DayRow[]; note?: string }) => call<{ id: string }>('/holiday/requests', t, J('POST', o)),
  check: (t: string, o: { days: DayRow[]; user_id?: string; exclude_request_id?: string }) => call<CheckResult>('/holiday/requests/check', t, J('POST', o)),
  people: (t: string) => call<{ people: Person[] }>('/holiday/people', t),
  book: (t: string, o: { user_id: string; days: DayRow[]; note?: string } & Override) => call<{ id: string }>('/holiday/book', t, J('POST', o)),
  cancel: (t: string, id: string) => call<{ id: string }>(`/holiday/requests/${encodeURIComponent(id)}/cancel`, t, J('POST')),
  approvalsWeek: (t: string, start: string) => call<WeekData>(`/holiday/approvals/week?start=${start}`, t),
  approvals: (t: string, status = 'pending') => call<{ requests: ApprovalItem[]; max_off: number | null; photos?: Record<string, string> }>(`/holiday/approvals?status=${status}`, t),
  decide: (t: string, id: string, decision: 'approve' | 'reject', note?: string, ov?: Override) => call<{ id: string }>(`/holiday/requests/${encodeURIComponent(id)}/decision`, t, J('POST', { decision, note, ...ov })),
  edit: (t: string, id: string, days: DayRow[], note?: string, ov?: Override) => call<{ id: string }>(`/holiday/requests/${encodeURIComponent(id)}`, t, J('PATCH', { days, note, ...ov })),
  remove: (t: string, id: string, note?: string) => call<{ id: string }>(`/holiday/requests/${encodeURIComponent(id)}/remove`, t, J('POST', { note })),
  admin: {
    matrix: (t: string, year?: number) => call<Matrix>(`/holiday/admin/matrix${year ? `?year=${year}` : ''}`, t),
    calendar: (t: string, month: string) => call<CalendarData>(`/holiday/admin/calendar?month=${month}`, t),
    settings: (t: string) => call<{ settings: HolidaySettings; bank_holidays: BankHoliday[]; multiplier_choices: number[] }>('/holiday/admin/settings', t),
    saveSettings: (t: string, o: Partial<HolidaySettings>) => call<{ settings: HolidaySettings; bank_holidays: BankHoliday[] }>('/holiday/admin/settings', t, J('PUT', o)),
    staff: (t: string, id: string) => call<{ name: string; unit: Unit; allowance: number | null; contracted_hours: number | null; start_date: string | null; weekday_rate: number | null; weekend_rate: number | null }>(`/holiday/admin/staff/${encodeURIComponent(id)}`, t),
    saveStaff: (t: string, id: string, o: { start_date: string | null; weekday_rate: number | string | null; weekend_rate: number | string | null; unit?: Unit; allowance?: number | string | null; contracted_hours?: number | string | null }) => call<{ saved: boolean }>(`/holiday/admin/staff/${encodeURIComponent(id)}`, t, J('PUT', o)),
    personRequests: (t: string, userId: string, from: string, to: string) => call<{ requests: Request[]; imported?: Array<{ key: string; taken: number; booked: number }> }>(`/holiday/admin/person-requests?user_id=${encodeURIComponent(userId)}&from=${from}&to=${to}`, t),
    book: (t: string, o: { user_id: string; days: DayRow[]; note?: string }) => call<{ id: string }>('/holiday/admin/book', t, J('POST', o)),
    importCsv: (t: string, csv: string, commit: boolean, applyDetails = false) => call<ImportPreview | MatrixImportPreview>('/holiday/admin/import', t, J('POST', { csv, commit, apply_details: applyDetails })),
    templateUrl: `${API_URL}/holiday/admin/import/template`,
    // Sickness: administrators only (health information). Never used by the hub.
    sick: {
      people: (t: string) => call<{ people: SickPerson[]; today: string }>('/holiday/admin/sick/people', t),
      list: (t: string, month: string) => call<{ month: string; days: SickEntry[] }>(`/holiday/admin/sick?month=${month}`, t),
      check: (t: string, user_id: string, days: string[]) => call<{ overlap: Array<{ day: string; request_id: string; hours: number }> }>('/holiday/admin/sick/check', t, J('POST', { user_id, days })),
      spell: (t: string, id: string) => call<{ spell: SickSpell; name: string; job_role: string | null; effective_days: DayRow[] }>(`/holiday/admin/sick/spells/${encodeURIComponent(id)}`, t),
      create: (t: string, o: Record<string, unknown>) => call<{ id: string; holiday_requests_changed: number }>('/holiday/admin/sick', t, J('POST', o)),
      update: (t: string, id: string, o: Record<string, unknown>) => call<{ id: string }>(`/holiday/admin/sick/spells/${encodeURIComponent(id)}`, t, J('PATCH', o)),
      end: (t: string, id: string, o: { last_day?: string; return_to_work_done?: boolean } = {}) => call<{ id: string; last_day: string }>(`/holiday/admin/sick/spells/${encodeURIComponent(id)}/end`, t, J('POST', o)),
      remove: (t: string, id: string) => call<{ id: string }>(`/holiday/admin/sick/spells/${encodeURIComponent(id)}`, t, J('DELETE')),
      report: (t: string, from: string, to: string, userId?: string) => call<SickReport>(`/holiday/admin/sick/report?from=${from}&to=${to}${userId ? `&user_id=${encodeURIComponent(userId)}` : ''}`, t),
      /** Files: fetched with the sign in token and saved from the browser (a plain link cannot carry it). */
      download: async (t: string, path: string, fallbackName: string) => {
        const res = await fetch(`${API_URL}/holiday/admin/sick/${path}`, { headers: { Authorization: `Bearer ${t}` } })
        if (!res.ok) { let m = 'Could not make the file.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new HolidayError('ERROR', m, res.status) }
        const name = /filename="([^"]+)"/.exec(res.headers.get('Content-Disposition') ?? '')?.[1] ?? fallbackName
        const a = document.createElement('a'); a.href = URL.createObjectURL(await res.blob()); a.download = name; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(a.href)
      },
    },
  },
}

/** Whether the holiday pilot is on for this account, and what the person can do. Remembered for the visit so menus do not flicker. */
export function useHolidayMeta(): { meta: Meta | null; refresh: () => void } {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [meta, setMeta] = useState<Meta | null>(null)
  const [tick, setTick] = useState(0)
  useEffect(() => {
    if (!token) return
    try { const c = window.sessionStorage.getItem('cs-holiday-meta'); if (c && tick === 0) setMeta(JSON.parse(c)) } catch { /* ignore */ }
    let live = true
    holiday.meta(token).then(m => { if (live) { setMeta(m); try { window.sessionStorage.setItem('cs-holiday-meta', JSON.stringify(m)) } catch { /* ignore */ } } }).catch(() => { if (live) setMeta({ enabled: false }) })
    return () => { live = false }
  }, [token, tick])
  return { meta, refresh: () => setTick(t => t + 1) }
}

// ── Small shared helpers ─────────────────────────────────────────────────────────────────
export const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
export const fmtNum = (n: number) => (Number.isInteger(n) ? String(n) : String(Math.round(n * 100) / 100))
export const unitWord = (u: Unit, n = 2) => (u === 'days' ? (n === 1 ? 'day' : 'days') : (n === 1 ? 'hour' : 'hours'))
export function niceDate(ymd: string, withYear = false): string {
  const d = new Date(ymd + 'T00:00:00Z')
  return d.toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', ...(withYear ? { year: 'numeric' } : {}), timeZone: 'UTC' })
}
export const addDays = (s: string, n: number) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10) }
export const eachDay = (from: string, to: string) => { const out: string[] = []; for (let d = from, i = 0; d <= to && i < 120; d = addDays(d, 1), i++) out.push(d); return out }
export const isWeekendDay = (s: string) => { const g = new Date(s + 'T00:00:00Z').getUTCDay(); return g === 0 || g === 6 }
export function describeRange(days: DayRow[] | string[]): string {
  const ds = (days as any[]).map(d => (typeof d === 'string' ? d : d.day)).sort()
  if (!ds.length) return ''
  const runs: string[][] = []
  for (const d of ds) { const l = runs[runs.length - 1]; if (l && addDays(l[l.length - 1], 1) === d) l.push(d); else runs.push([d]) }
  return runs.map(r => (r.length === 1 ? niceDate(r[0]) : `${niceDate(r[0])} to ${niceDate(r[r.length - 1])}`)).join(', ')
}

/** "Tue 3 Mar AM, Wed 4 Mar part day (2.4 hours)": the days in a request that are not a whole day, or an empty string. */
export function partNotes(days: DayRow[]): string {
  return days.filter(d => d.part && d.part !== 'full').map(d => `${niceDate(d.day)} ${d.part === 'am' ? 'AM' : d.part === 'pm' ? 'PM' : `part day (${fmtNum(d.hours)} ${d.hours === 1 ? 'hour' : 'hours'})`}`).join(', ')
}
