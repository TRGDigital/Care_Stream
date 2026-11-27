// Policy testing (pilot: CS-1001 only). Mirrors apps/api/src/routes/policy-testing.ts (the /stress routes).
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type StressScenario = { id: string; title: string; version: number; last: { id: string; gaps: number; at: string; outdated: boolean } | null }
export type StressPolicy = { id: string; name: string; scenarios: StressScenario[] }
export type StressPoint = { id: string; text: string; verdict: 'covered' | 'partly' | 'missing'; quote: string; quote_checked: boolean; note: string; suggested_wording: string; source_label: string; source_url: string }
export type StressResult = { id: string; policy_id: string; policy_name: string; scenario_id: string; scenario_title: string; scenario_version: number; points: StressPoint[]; summary: string; gaps: number; created_at: string }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/stress${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new Error(body?.error?.message ?? `Something went wrong (${res.status}).`)
  return body.data as T
}

export const stress = {
  meta: (token: string) => call<{ enabled: boolean }>('/meta', token),
  library: (token: string) => call<{ policies: StressPolicy[] }>('/library', token),
  result: (token: string, id: string) => call<{ result: StressResult }>(`/result/${encodeURIComponent(id)}`, token),
  run: (token: string, policy_id: string, scenario_id: string) => call<{ result: StressResult }>('/run', token, { method: 'POST', body: JSON.stringify({ policy_id, scenario_id }) }),
}

/** Whether the pilot is on for this account. Remembered for the visit so the menu does not flicker. */
export function useStressMeta(): { enabled: boolean | null } {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    if (!token) return
    try { const c = window.sessionStorage.getItem('cs-stress-meta'); if (c) setEnabled(c === '1') } catch { /* ignore */ }
    let live = true
    stress.meta(token).then(m => { if (live) { setEnabled(m.enabled); try { window.sessionStorage.setItem('cs-stress-meta', m.enabled ? '1' : '0') } catch { /* ignore */ } } }).catch(() => { if (live) setEnabled(false) })
    return () => { live = false }
  }, [token])
  return { enabled }
}
