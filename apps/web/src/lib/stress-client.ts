// Policy testing (pilot: CS-1001 only). Mirrors apps/api/src/routes/policy-testing.ts (the /stress routes).
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type StressScenario = { id: string; title: string; version: number; last: { id: string; gaps: number; at: string; outdated: boolean } | null }
export type StressPolicy = { id: string; name: string; scenarios: StressScenario[] }
export type StressElsewhere = { policy_id: string; policy_name: string; verdict: 'covered' | 'partly'; quote: string }
export type StressPoint = { id: string; text: string; verdict: 'covered' | 'partly' | 'missing'; quote: string; quote_checked: boolean; note: string; suggested_wording: string; source_label: string; source_url: string; elsewhere?: StressElsewhere[] }
export type StressResult = { id: string; policy_id: string; policy_name: string; scenario_id: string; scenario_title: string; scenario_version: number; points: StressPoint[]; summary: string; gaps: number; created_at: string }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/stress${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new Error(body?.error?.message ?? `Something went wrong (${res.status}).`)
  return body.data as T
}

export type Band = 'strong' | 'good' | 'attention' | 'none'
export type ClarityFinding = { quote: string; type: string; type_label: string; issue: string; suggestion: string }
export type ClarityMetrics = { words: number; sentences: number; avg_sentence_words: number; long_sentence_pct: number; passive_pct: number; reading_ease: number }
export type ClarityCheck = { key: string; label: string; count: number; band: Band }
export type ClarityResult = { id: string; policy_id: string; policy_name: string; findings: ClarityFinding[]; metrics: ClarityMetrics; band: Band; checks: ClarityCheck[]; readability: { band: Band; detail: string } | null; suppressed?: number; finding_count: number; summary: string; created_at: string }
export type PreStep = { step: number; label: string; done: boolean; detail: string; note?: boolean }
export type ClarityPolicy = { id: string; name: string; ready: boolean; waiting: string[]; steps: PreStep[]; last: { id: string; band: Band; findings: number; at: string } | null }
export type HealthCheck = { key: string; label: string; count: number; band: Band }
export type TestingResult = { id: string; scenario_id: string; title: string; at: string; covered: number; total: number; elsewhere: number; gaps: number; scenario_changed: boolean; policy_changed: boolean }
export type TestingInfo = { available: Array<{ id: string; title: string }>; results: TestingResult[]; changes: number; last_change_at: string | null; stale: number }
export type HealthDim = { key: string; label: string; band: Band; value?: number | null; detail: string; href: string; last_run: string | null; checks?: HealthCheck[]; readability?: { band: Band; detail: string }; testing?: TestingInfo }
export type HealthFix = { dim: string; text: string; href: string; gain: number }
export type HealthLast = { id: string; score: number; band: Band; at: string; stale: boolean; fixes: HealthFix[] }
export type PolicyHealth = { id: string; name: string; overall: Band; score: number | null; assessed: number; dims: HealthDim[]; fixes: HealthFix[]; ready: boolean; waiting: string[]; steps: PreStep[]; last_check: HealthLast | null }
export type HealthPlan = { policy: { id: string; name: string }; scenarios: Array<{ id: string; title: string }>; credits: { clarity: number; stress: number; total: number } }
export type HealthCheckResult = { id: string; score: number; band: Band; assessed: number; dims: HealthDim[]; fixes: HealthFix[]; at: string }

export const stress = {
  meta: (token: string) => call<{ enabled: boolean }>('/meta', token),
  library: (token: string) => call<{ policies: StressPolicy[] }>('/library', token),
  result: (token: string, id: string) => call<{ result: StressResult }>(`/result/${encodeURIComponent(id)}`, token),
  clarityLibrary: (token: string) => call<{ policies: ClarityPolicy[] }>('/clarity/library', token),
  clarityResult: (token: string, id: string) => call<{ result: ClarityResult }>(`/clarity/result/${encodeURIComponent(id)}`, token),
  clarityRun: (token: string, policy_id: string, force = false) => call<{ result: ClarityResult }>('/clarity/run', token, { method: 'POST', body: JSON.stringify({ policy_id, force }) }),
  healthPlan: (token: string, policy_id: string) => call<HealthPlan>(`/health/plan?policy_id=${encodeURIComponent(policy_id)}`, token),
  healthSnapshot: (token: string, policy_id: string, included_stress: boolean) => call<{ check: HealthCheckResult }>('/health/snapshot', token, { method: 'POST', body: JSON.stringify({ policy_id, included_stress }) }),
  health: (token: string) => call<{ policies: PolicyHealth[]; weights: Record<string, number> }>('/health', token),
  run: (token: string, policy_id: string, scenario_id: string) => call<{ result: StressResult }>('/run', token, { method: 'POST', body: JSON.stringify({ policy_id, scenario_id }) }),
}

// One request per page, not one per badge: the Policies page shows a health badge for every policy, and the API allows 100 requests a minute per person.
let metaCache: { token: string; at: number; p: Promise<boolean> } | null = null
function metaOnce(token: string): Promise<boolean> {
  if (!metaCache || metaCache.token !== token || Date.now() - metaCache.at > 60_000) metaCache = { token, at: Date.now(), p: stress.meta(token).then(m => m.enabled).catch(() => false) }
  return metaCache.p
}

/** Whether the pilot is on for this account. Remembered for the visit so the menu does not flicker, and asked of the server once however many components use it. */
export function useStressMeta(): { enabled: boolean | null } {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [enabled, setEnabled] = useState<boolean | null>(null)
  useEffect(() => {
    if (!token) return
    try { const c = window.sessionStorage.getItem('cs-stress-meta'); if (c) setEnabled(c === '1') } catch { /* ignore */ }
    let live = true
    metaOnce(token).then(on => { if (live) { setEnabled(on); try { window.sessionStorage.setItem('cs-stress-meta', on ? '1' : '0') } catch { /* ignore */ } } })
    return () => { live = false }
  }, [token])
  return { enabled }
}
