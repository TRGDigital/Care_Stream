// Resident funding and fees (apps/api/src/routes/resident-funding.ts). LOCKED, administrators only. PILOT: CS-1001. Nothing here is ever sent to the staff hub.
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
export type FeeModel = 'weekly' | 'hourly' | 'live_in' | 'supported_living' | 'placement'
export type FundingType = 'self' | 'part_self' | 'council' | 'nhs_chc' | 'direct_payment' | 'other'
export interface FundingMeta { enabled: boolean; ready: boolean; is_admin: boolean; managers_can_see: boolean; default_model: FeeModel; models: Array<{ key: FeeModel; label: string }>; funding_types: Array<{ key: FundingType; label: string }> }
export interface Funding {
  id: string; resident_id: string; fee_model: FeeModel; funding_type: FundingType; weekly_fee: number | null; council_name: string | null; council_contribution: number | null; family_contribution: number | null; fnc_contribution: number | null
  hourly_rate_weekday: number | null; hourly_rate_weekend: number | null; hourly_rate_bank_holiday: number | null; hourly_rate_night: number | null; planned_hours_per_week: number | null; visits_per_week: number | null; visit_minutes: number | null
  daily_rate: number | null; placing_authority: string | null; last_review_date: string | null; last_increase_date: string | null; next_review_date: string | null; note: string | null
  weekly_value: number | null; weekly_value_estimate: boolean; weekly_value_how: string; contribution_check: { ok: boolean; total: number; difference: number } | null
}
export interface FundingSummary { people: number; without_funding: number; weekly_income: number; by_type: Array<{ funding_type: FundingType; label: string; count: number; percent: number; average_weekly: number | null }>; review_due_30_days: number; estimates_included: boolean }
export class FundingError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/residents/funding${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new FundingError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export const funding = {
  meta: (t: string) => call<FundingMeta>('/meta', t),
  summary: (t: string) => call<FundingSummary>('/summary', t),
  get: (t: string, residentId: string) => call<{ funding: Funding | null }>(`/${encodeURIComponent(residentId)}`, t),
  save: (t: string, residentId: string, body: Record<string, unknown>) => call<{ funding: Funding }>(`/${encodeURIComponent(residentId)}`, t, { method: 'PUT', body: JSON.stringify(body) }),
  remove: (t: string, residentId: string) => call<{ deleted: boolean }>(`/${encodeURIComponent(residentId)}`, t, { method: 'DELETE' }),
  settings: (t: string) => call<{ managers_can_see: boolean }>('/settings', t),
  setSettings: (t: string, managers_can_see: boolean) => call<{ managers_can_see: boolean }>('/settings', t, { method: 'PUT', body: JSON.stringify({ managers_can_see }) }),
}

/** Whether the finance pilot is on for this person. Null while loading and for everyone outside the pilot (the API answers 404), so nothing shows. */
export function useFundingMeta(): FundingMeta | null {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const admin = (session as any)?.user?.role === 'admin'
  const [meta, setMeta] = useState<FundingMeta | null>(null)
  useEffect(() => {
    if (!token || !admin) return
    let live = true
    funding.meta(token).then(m => { if (live) setMeta(m) }).catch(() => { if (live) setMeta(null) })
    return () => { live = false }
  }, [token, admin])
  return meta
}

export const pounds = (n: number | null | undefined) => (n == null ? '' : `£${n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`)
