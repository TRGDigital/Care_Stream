// Sign in reaches the API from THIS server (NextAuth), so the API would see our address, not the person's. This builds the headers that pass the real
// visitor's IP, rough location, device and how they opened CareStream along, proved genuine by a shared secret (CS_FORWARD_SECRET, also set on the API).
// With no secret configured it sends nothing, and the API falls back to what it can see (the old behaviour), so it can never block a sign in.

type HeaderBag = Record<string, string | string[] | undefined> | undefined

const one = (v: string | string[] | undefined): string => (Array.isArray(v) ? v[0] : v) ?? ''
const printable = (s: string, n: number) => s.replace(/[^\x20-\x7e]/g, '').trim().slice(0, n)

/** The page the person was on can also say they are using the installed web app (display-mode standalone): pass 'installed_web'. */
export function forwardHeaders(reqHeaders: HeaderBag, opts: { mode?: string; env?: Record<string, string | undefined> } = {}): Record<string, string> {
  const env = opts.env ?? process.env
  const secret = env.CS_FORWARD_SECRET
  if (!secret) return {}
  const h = (n: string) => one(reqHeaders?.[n])
  const out: Record<string, string> = { 'x-cs-forward-secret': secret }
  const ip = printable(h('x-forwarded-for').split(',')[0] || h('x-real-ip'), 64)
  if (ip) out['x-cs-client-ip'] = ip
  const set = (to: string, from: string, n: number) => { const v = printable(h(from), n); if (v) out[to] = v }
  set('x-cs-client-country', 'x-vercel-ip-country', 8)
  set('x-cs-client-region', 'x-vercel-ip-country-region', 40)
  set('x-cs-client-city', 'x-vercel-ip-city', 80)            // already URL encoded by Vercel
  set('x-cs-client-ua', 'user-agent', 300)
  const app = /(?:^|;\s*)cs_app=(android|ios)\b/.exec(h('cookie'))?.[1]
  if (app) out['x-cs-client-app'] = app
  if (opts.mode === 'installed_web') out['x-cs-client-mode'] = 'installed_web'
  return out
}

/** Browser side: is this page running as an installed web app? */
export const displayModeNow = (): 'installed_web' | 'browser' => {
  try { return window.matchMedia('(display-mode: standalone)').matches || (navigator as any).standalone === true ? 'installed_web' : 'browser' } catch { return 'browser' }
}
