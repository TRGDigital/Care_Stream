// Resident (or client) funding and fees. LOCKED data: only administrators see it (managers only if the account switches that on). It is deliberately
// separate from the "This is me" profile: nothing here is read by the staff hub, family links, the assistant's knowledge sync, exports or emails.
// There is no Prisma model for the table, on purpose: it is read and written with plain SQL in this file only, so no query that loads a resident can
// pull it in. A test (resident-funding.test.ts) fails if any other file mentions the table or its fields.

import { prisma } from '../db/client'
import { isManagerJobRole } from './care-manager'

const q = () => prisma as any

export const FEE_MODELS = ['weekly', 'hourly', 'live_in', 'supported_living', 'placement'] as const
export type FeeModel = (typeof FEE_MODELS)[number]
export const FUNDING_TYPES = ['self', 'part_self', 'council', 'nhs_chc', 'direct_payment', 'other'] as const
export type FundingType = (typeof FUNDING_TYPES)[number]
export const FUNDING_LABEL: Record<FundingType, string> = {
  self: 'Self funded', part_self: 'Part self funded', council: 'Council funded', nhs_chc: 'NHS continuing healthcare', direct_payment: 'Direct payment or personal budget', other: 'Other',
}
export const MODEL_LABEL: Record<FeeModel, string> = {
  weekly: 'Weekly fee', hourly: 'Hourly rate', live_in: 'Live-in rate', supported_living: 'Supported living hours', placement: 'Placement fee',
}

/** The fee model that suits a service, from the free text Facility Type in Settings. The administrator can override it for any person. */
export function feeModelForFacility(facilityType?: string | null): FeeModel {
  const t = String(facilityType ?? '').toLowerCase()
  if (t.includes('live-in') || t.includes('live in')) return 'live_in'
  if (t.includes('domiciliary') || t.includes('home care') || t.includes('homecare')) return 'hourly'
  if (t.includes('supported living')) return 'supported_living'
  if (t.includes('children')) return 'placement'
  return 'weekly'
}

// ── Money and dates ────────────────────────────────────────────────────────────
export const round2 = (n: number) => Math.round(n * 100) / 100
const num = (v: unknown): number | null => { if (v === null || v === undefined || v === '') return null; const n = Number(v); return Number.isFinite(n) ? n : null }
const money = (v: unknown, max = 100000): number | null | 'bad' => { const n = num(v); if (n === null) return null; return n < 0 || n > max ? 'bad' : round2(n) }
const DATE = /^\d{4}-\d{2}-\d{2}$/
const date = (v: unknown): string | null | 'bad' => { if (v === null || v === undefined || v === '') return null; return DATE.test(String(v)) && !isNaN(+new Date(String(v) + 'T00:00:00Z')) ? String(v) : 'bad' }
const text = (v: unknown, max: number): string | null => { const s = String(v ?? '').replace(/\s+/g, ' ').trim(); return s ? s.slice(0, max) : null }

export interface FundingInput {
  fee_model: FeeModel; funding_type: FundingType
  weekly_fee: number | null; council_name: string | null; council_contribution: number | null; family_contribution: number | null; fnc_contribution: number | null
  hourly_rate_weekday: number | null; hourly_rate_weekend: number | null; hourly_rate_bank_holiday: number | null; hourly_rate_night: number | null
  planned_hours_per_week: number | null; visits_per_week: number | null; visit_minutes: number | null; daily_rate: number | null; placing_authority: string | null
  last_review_date: string | null; last_increase_date: string | null; next_review_date: string | null; note: string | null
}

/** Cleans what the form sent. Returns the cleaned values or a plain message. Only the fields that belong to the chosen fee model are kept. */
export function cleanFunding(body: any): { ok: true; value: FundingInput } | { ok: false; error: string } {
  const fee_model = FEE_MODELS.includes(body?.fee_model) ? body.fee_model as FeeModel : null
  const funding_type = FUNDING_TYPES.includes(body?.funding_type) ? body.funding_type as FundingType : null
  if (!fee_model) return { ok: false, error: 'Choose how this person is charged.' }
  if (!funding_type) return { ok: false, error: 'Choose how this person is funded.' }
  const bad = (label: string) => ({ ok: false as const, error: `${label} is not valid.` })
  const m = (k: string, label: string, max?: number) => { const v = money(body?.[k], max); return v === 'bad' ? label : v }
  const fields: Record<string, any> = {}
  for (const [k, label, max] of [
    ['weekly_fee', 'The weekly fee', 20000], ['council_contribution', 'The council contribution', 20000], ['family_contribution', 'The family contribution', 20000], ['fnc_contribution', 'The nursing care contribution', 20000],
    ['hourly_rate_weekday', 'The weekday hourly rate', 500], ['hourly_rate_weekend', 'The weekend hourly rate', 500], ['hourly_rate_bank_holiday', 'The bank holiday hourly rate', 500], ['hourly_rate_night', 'The night hourly rate', 500],
    ['daily_rate', 'The daily rate', 5000],
  ] as Array<[string, string, number]>) { const v = m(k, label, max); if (typeof v === 'string') return bad(v); fields[k] = v }
  const planned = num(body?.planned_hours_per_week); if (planned !== null && (planned < 0 || planned > 168)) return bad('The planned hours a week')
  const visits = num(body?.visits_per_week); if (visits !== null && (!Number.isInteger(visits) || visits < 0 || visits > 100)) return bad('The visits a week')
  const mins = num(body?.visit_minutes); if (mins !== null && (!Number.isInteger(mins) || mins < 5 || mins > 720)) return bad('The visit length')
  const dates: Record<string, string | null> = {}
  for (const k of ['last_review_date', 'last_increase_date', 'next_review_date']) { const v = date(body?.[k]); if (v === 'bad') return bad('A date'); dates[k] = v }
  const keep = <T,>(model: FeeModel[], v: T): T | null => (model.includes(fee_model) ? v : null)
  const funded = funding_type !== 'self'
  const value: FundingInput = {
    fee_model, funding_type,
    weekly_fee: keep(['weekly', 'live_in', 'supported_living', 'placement'], fields.weekly_fee),
    council_name: funded ? text(body?.council_name, 120) : null,
    council_contribution: funded ? fields.council_contribution : null,
    family_contribution: funding_type === 'part_self' || funding_type === 'council' ? fields.family_contribution : null,
    fnc_contribution: fee_model === 'weekly' && funded ? fields.fnc_contribution : null,
    hourly_rate_weekday: keep(['hourly', 'supported_living'], fields.hourly_rate_weekday),
    hourly_rate_weekend: keep(['hourly', 'supported_living'], fields.hourly_rate_weekend),
    hourly_rate_bank_holiday: keep(['hourly', 'supported_living'], fields.hourly_rate_bank_holiday),
    hourly_rate_night: keep(['hourly'], fields.hourly_rate_night),
    planned_hours_per_week: keep(['hourly', 'supported_living'], planned),
    visits_per_week: keep(['hourly'], visits), visit_minutes: keep(['hourly'], mins),
    daily_rate: keep(['live_in'], fields.daily_rate),
    placing_authority: keep(['placement'], text(body?.placing_authority, 120)),
    last_review_date: dates.last_review_date, last_increase_date: dates.last_increase_date, next_review_date: dates.next_review_date,
    note: text(body?.note, 200),
  }
  return { ok: true, value }
}

/** The money coming in each week. Estimates for hourly care: hours times the rates, with 5 weekday and 2 weekend days unless visits are given. */
export function weeklyValue(f: Pick<FundingInput, 'fee_model' | 'weekly_fee' | 'hourly_rate_weekday' | 'hourly_rate_weekend' | 'planned_hours_per_week' | 'visits_per_week' | 'visit_minutes' | 'daily_rate'>): { amount: number | null; estimate: boolean; how: string } {
  if (f.fee_model === 'live_in') {
    if (f.weekly_fee != null) return { amount: round2(f.weekly_fee), estimate: false, how: 'The weekly fee.' }
    if (f.daily_rate != null) return { amount: round2(f.daily_rate * 7), estimate: true, how: 'The daily rate times 7 days.' }
    return { amount: null, estimate: false, how: '' }
  }
  if (f.fee_model === 'hourly' || f.fee_model === 'supported_living') {
    const hours = f.fee_model === 'hourly' && f.visits_per_week != null && f.visit_minutes != null ? (f.visits_per_week * f.visit_minutes) / 60 : f.planned_hours_per_week
    if (f.fee_model === 'supported_living' && f.weekly_fee != null && hours == null) return { amount: round2(f.weekly_fee), estimate: false, how: 'The weekly fee.' }
    const wd = f.hourly_rate_weekday, we = f.hourly_rate_weekend ?? f.hourly_rate_weekday
    if (hours == null || wd == null) return { amount: null, estimate: true, how: 'Needs the planned hours and the weekday rate.' }
    const weekdayShare = 5 / 7, weekendShare = 2 / 7
    const amount = round2(hours * (wd * weekdayShare + (we ?? wd) * weekendShare))
    return { amount, estimate: true, how: `${round2(hours)} hours a week at ${wd.toFixed(2)} on weekdays and ${(we ?? wd).toFixed(2)} at weekends (5 weekday and 2 weekend days assumed). An estimate.` }
  }
  return f.weekly_fee != null ? { amount: round2(f.weekly_fee), estimate: false, how: 'The weekly fee.' } : { amount: null, estimate: false, how: '' }
}

/** Part self funded and council funded: the contributions should add up to the weekly fee. A gentle check, never a block. */
export function contributionCheck(f: Pick<FundingInput, 'fee_model' | 'funding_type' | 'weekly_fee' | 'council_contribution' | 'family_contribution' | 'fnc_contribution'>): { ok: boolean; total: number; difference: number } | null {
  if (f.fee_model !== 'weekly' || !f.weekly_fee || !(f.funding_type === 'part_self' || f.funding_type === 'council')) return null
  const total = round2((f.council_contribution ?? 0) + (f.family_contribution ?? 0) + (f.fnc_contribution ?? 0))
  const difference = round2(f.weekly_fee - total)
  return { ok: Math.abs(difference) < 0.005, total, difference }
}

// ── Who may see it ─────────────────────────────────────────────────────────────
/** Administrators always. A manager (care manager or registered manager) only when the account has switched that on. Staff never. */
export function canSeeFunding(role: string | null | undefined, jobRole: string | null | undefined, managersCanSee: boolean): boolean {
  if (role === 'admin') return true
  return role === 'staff' && managersCanSee && isManagerJobRole(jobRole)
}

// ── Storage (plain SQL, this file only) ────────────────────────────────────────
export const COLS = ['fee_model', 'funding_type', 'weekly_fee', 'council_name', 'council_contribution', 'family_contribution', 'fnc_contribution', 'hourly_rate_weekday', 'hourly_rate_weekend',
  'hourly_rate_bank_holiday', 'hourly_rate_night', 'planned_hours_per_week', 'visits_per_week', 'visit_minutes', 'daily_rate', 'placing_authority', 'last_review_date', 'last_increase_date', 'next_review_date', 'note'] as const

export async function fundingTablesReady(): Promise<boolean> {
  try { await q().$queryRawUnsafe('select 1 from resident_funding limit 1'); return true } catch { return false }
}

export async function managersCanSee(tenantId: string): Promise<boolean> {
  try { const r: any[] = await q().$queryRawUnsafe('select managers_can_see from resident_funding_settings where tenant_id = $1', tenantId); return !!r[0]?.managers_can_see } catch { return false }
}
export async function setManagersCanSee(tenantId: string, on: boolean): Promise<void> {
  await q().$executeRawUnsafe('insert into resident_funding_settings (tenant_id, managers_can_see, updated_at) values ($1, $2, now()) on conflict (tenant_id) do update set managers_can_see = excluded.managers_can_see, updated_at = now()', tenantId, on)
}

const dtoOf = (r: any) => {
  const o: Record<string, any> = { id: r.id, resident_id: r.resident_id, updated_at: r.updated_at ? new Date(r.updated_at).toISOString() : null }
  for (const c of COLS) {
    const v = r[c]
    o[c] = v === null || v === undefined ? null : c.endsWith('_date') ? new Date(v).toISOString().slice(0, 10) : (typeof v === 'string' && /^-?\d+(\.\d+)?$/.test(v) && !['fee_model', 'funding_type', 'council_name', 'placing_authority', 'note'].includes(c)) ? Number(v) : v
  }
  const w = weeklyValue(o as any); o.weekly_value = w.amount; o.weekly_value_estimate = w.estimate; o.weekly_value_how = w.how
  o.contribution_check = contributionCheck(o as any)
  return o
}

export async function getFunding(tenantId: string, residentId: string) {
  const r: any[] = await q().$queryRawUnsafe('select * from resident_funding where tenant_id = $1 and resident_id = $2', tenantId, residentId)
  return r[0] ? dtoOf(r[0]) : null
}

export async function saveFunding(tenantId: string, residentId: string, v: FundingInput, userId: string): Promise<{ created: boolean; row: any }> {
  const exists: any[] = await q().$queryRawUnsafe('select id from resident_funding where tenant_id = $1 and resident_id = $2', tenantId, residentId)
  const vals = COLS.map(c => (v as any)[c])
  if (exists[0]) {
    const sets = COLS.map((c, i) => `${c} = $${i + 3}`).join(', ')
    await q().$executeRawUnsafe(`update resident_funding set ${sets}, updated_by = $${COLS.length + 3}, updated_at = now() where tenant_id = $1 and resident_id = $2`, tenantId, residentId, ...vals, userId)
  } else {
    const names = COLS.join(', '), marks = COLS.map((_, i) => `$${i + 4}`).join(', ')
    await q().$executeRawUnsafe(`insert into resident_funding (tenant_id, resident_id, updated_by, ${names}) values ($1, $2, $3, ${marks})`, tenantId, residentId, userId, ...vals)
  }
  return { created: !exists[0], row: await getFunding(tenantId, residentId) }
}

export async function deleteFunding(tenantId: string, residentId: string): Promise<number> {
  try { return Number(await q().$executeRawUnsafe('delete from resident_funding where tenant_id = $1 and resident_id = $2', tenantId, residentId)) } catch { return 0 }
}

/** The summary: totals computed in code from the rows, never per person. */
export interface SummaryRow { resident_id: string; funding_type: FundingType; fee_model: FeeModel; weekly_value: number | null; next_review_date: string | null }
export function summarise(rows: SummaryRow[], today: string, residentsWithoutFunding = 0) {
  const priced = rows.filter(r => r.weekly_value != null)
  const total = round2(priced.reduce((s, r) => s + (r.weekly_value as number), 0))
  const byType = FUNDING_TYPES.map(t => {
    const rs = rows.filter(r => r.funding_type === t), ps = rs.filter(r => r.weekly_value != null)
    return { funding_type: t, label: FUNDING_LABEL[t], count: rs.length, percent: rows.length ? Math.round((rs.length / rows.length) * 1000) / 10 : 0, average_weekly: ps.length ? round2(ps.reduce((s, r) => s + (r.weekly_value as number), 0) / ps.length) : null }
  }).filter(t => t.count > 0)
  const in30 = new Date(today + 'T00:00:00Z'); in30.setUTCDate(in30.getUTCDate() + 30)
  const limit = in30.toISOString().slice(0, 10)
  const reviewDue = rows.filter(r => r.next_review_date && r.next_review_date <= limit).length
  return { people: rows.length, without_funding: residentsWithoutFunding, weekly_income: total, by_type: byType, review_due_30_days: reviewDue, estimates_included: rows.some(r => r.fee_model === 'hourly' || r.fee_model === 'supported_living') }
}

export async function loadSummaryRows(tenantId: string): Promise<SummaryRow[]> {
  const rows: any[] = await q().$queryRawUnsafe('select * from resident_funding where tenant_id = $1', tenantId)
  return rows.map(r => { const d = dtoOf(r); return { resident_id: d.resident_id, funding_type: d.funding_type, fee_model: d.fee_model, weekly_value: d.weekly_value, next_review_date: d.next_review_date } })
}

/** Totals for Ask CareStream: counts, totals and averages only, no names and no individual figures. Includes the hourly care hours planned per week, so a fee uplift can be worked out. */
export async function askAggregates(tenantId: string, today: string) {
  const rows = await loadSummaryRows(tenantId)
  const s = summarise(rows, today, 0)
  const h: any[] = await q().$queryRawUnsafe("select coalesce(sum(planned_hours_per_week),0) as hours from resident_funding where tenant_id = $1 and fee_model = 'hourly'", tenantId)
  return { ...s, hourly_hours_per_week: round2(Number(h[0]?.hours ?? 0)) }
}
