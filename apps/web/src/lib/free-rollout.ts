// Whether the Free plan is shown on the public pages (pricing, llms.txt, agent tools, schema).
//
// Dark by default. `?free=1` shows it on /pricing for review without changing anything for the
// public; `?free=0` hides it again. To launch: set FREE_LIVE to true here (one line) after the API
// has FREE_TIER_ENABLED=true, so the Free card never points at a signup that is still closed.
// Modelled on lib/v2-rollout.ts.

export const FREE_LIVE = true

type Params = Record<string, string | string[] | undefined> | undefined

export async function freeLive(params?: Params | Promise<Params>): Promise<boolean> {
  const sp = await params
  const raw = sp?.free
  const v = Array.isArray(raw) ? raw[0] : raw
  if (v === '0') return false
  if (v === '1') return true
  return FREE_LIVE
}
