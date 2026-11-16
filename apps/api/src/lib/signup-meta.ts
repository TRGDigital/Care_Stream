// What we know about a sign up at the moment it happens: the IP address, a rough location, the device, and where the person came from.
// Stored on tenants.signup_meta (shown on the platform client page) and written into the new account alert email.
import type { Request } from 'express'

export type SignupAttribution = {
  referrer?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; gclid?: boolean; landing?: string
  // Sent by the register page ONLY when the visitor accepted analytics cookies (the first visit and the visit count are remembered in their browser).
  timezone?: string
  visit?: { first_at?: string; first_landing?: string; visits?: number }
}
export type SignupMeta = {
  ip: string | null
  country?: string | null; region?: string | null; city?: string | null
  user_agent?: string | null
  source?: string | null; track?: string | null; course?: string | null; care_setting?: string | null
  growth_ref?: string | null
  referrer?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null; gclid?: boolean
  landing?: string | null
  // Silent context. language is read from the request; the rest only exists when the visitor accepted analytics cookies.
  language?: string | null
  timezone?: string | null
  first_visit_at?: string | null
  first_landing?: string | null
  visits?: number | null
  seconds_to_signup?: number | null
  came_from: string[]
  at: string
}

const clip = (s: unknown, n: number): string | null => { const v = String(s ?? '').trim(); return v ? v.slice(0, n) : null }
const header = (req: Request, name: string): string | null => { const v = req.headers[name]; return clip(Array.isArray(v) ? v[0] : v, 200) }
const decode = (s: string | null): string | null => { if (!s) return null; try { return decodeURIComponent(s) } catch { return s } }

/** An IPv4 address mapped into IPv6 ("::ffff:1.2.3.4") is shown as plain IPv4. */
export const cleanIp = (ip: string | null | undefined): string | null => {
  const v = String(ip ?? '').trim().replace(/^::ffff:/i, '')
  return v ? v.slice(0, 64) : null
}

/** Plain English lines for "where did they come from", most specific first. */
export function describeCameFrom(m: Pick<SignupMeta, 'growth_ref' | 'source' | 'utm_source' | 'utm_medium' | 'utm_campaign' | 'gclid' | 'referrer' | 'course' | 'landing'>): string[] {
  const out: string[] = []
  if (m.growth_ref) out.push(`A CareStream outreach email (Growth)${m.utm_campaign ? `, campaign ${m.utm_campaign}` : ''}`)
  if (m.gclid) out.push('A Google Ads click')
  const utm = [m.utm_source, m.utm_medium, m.utm_campaign].filter(Boolean).join(' / ')
  if (utm && !m.growth_ref) out.push(`Campaign link: ${utm}`)
  if (m.source) out.push(m.source.startsWith('blog-') ? `Blog post: ${m.source.slice(5)}` : `Sign up link on: ${m.source}`)
  if (m.course) out.push(`Free course: ${m.course}`)
  if (m.referrer) out.push(`Arrived from: ${m.referrer}`)
  if (!out.length) out.push(m.landing ? `Direct visit (landed on ${m.landing})` : 'Direct visit, no referrer')
  return out
}

const TZ_RE = /^[A-Za-z]+(?:\/[A-Za-z0-9_+-]+){0,2}$/
const LANG_RE = /^[A-Za-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/

/** The browser's preferred language from the request, e.g. "en-GB". */
export function languageOf(req: Request): string | null {
  const first = String(header(req, 'accept-language') ?? '').split(',')[0]?.split(';')[0]?.trim() ?? ''
  return LANG_RE.test(first) ? first : null
}

/** A tidy first-visit summary from what the browser sent: dates that cannot be right (the future, more than two years ago) are dropped. */
export function cleanVisit(v: SignupAttribution['visit'], now: Date = new Date()): { first_visit_at: string | null; first_landing: string | null; visits: number | null; seconds_to_signup: number | null } {
  const t = v?.first_at ? Date.parse(v.first_at) : NaN
  const okTime = Number.isFinite(t) && t <= now.getTime() + 5 * 60_000 && t >= now.getTime() - 2 * 365 * 86_400_000
  const visits = Number.isInteger(v?.visits) && (v!.visits as number) >= 1 && (v!.visits as number) <= 1000 ? (v!.visits as number) : null
  const landing = typeof v?.first_landing === 'string' && v.first_landing.startsWith('/') ? v.first_landing.slice(0, 200) : null
  return { first_visit_at: okTime ? new Date(t).toISOString() : null, first_landing: landing, visits, seconds_to_signup: okTime ? Math.max(0, Math.floor((now.getTime() - t) / 1000)) : null }
}

/** "same visit", "2 hours", "3 days 4 hours": how long before signing up they first visited. */
export function humanDuration(sec: number): string {
  if (sec < 30 * 60) return 'in the same visit'
  const d = Math.floor(sec / 86_400), h = Math.floor((sec % 86_400) / 3600)
  if (d === 0) return h <= 1 ? 'about an hour' : `${h} hours`
  return h > 0 ? `${d} day${d === 1 ? '' : 's'} ${h} hour${h === 1 ? '' : 's'}` : `${d} day${d === 1 ? '' : 's'}`
}

/** Plain English lines about the silent context, for the alert email. Missing pieces are simply left out. */
export function contextLines(m: Pick<SignupMeta, 'language' | 'timezone' | 'first_landing' | 'visits' | 'seconds_to_signup'>): Array<[string, string]> {
  const out: Array<[string, string]> = []
  if (m.language) out.push(['Browser language', m.language])
  if (m.timezone) out.push(['Timezone', m.timezone])
  if (m.first_landing) out.push(['First page they landed on', m.first_landing])
  if (m.visits) out.push(['Visits before sign up', `${m.visits} (including the sign up visit)`])
  if (m.seconds_to_signup != null) out.push(['First visit to sign up', humanDuration(m.seconds_to_signup)])
  return out
}

export function buildSignupMeta(req: Request, d: { source?: string; track?: string; course?: string; care_setting?: string; growth_ref?: string | null; attribution?: SignupAttribution }): SignupMeta {
  const a = d.attribution ?? {}
  const base = {
    growth_ref: d.growth_ref ?? null, source: d.source ?? null, course: d.course ?? null,
    utm_source: clip(a.utm_source, 100), utm_medium: clip(a.utm_medium, 100), utm_campaign: clip(a.utm_campaign, 100), utm_content: clip(a.utm_content, 100),
    gclid: !!a.gclid, referrer: clip(a.referrer, 200), landing: clip(a.landing, 200),
  }
  const visit = cleanVisit(a.visit)
  return {
    ip: cleanIp(req.ip),
    country: header(req, 'x-vercel-ip-country'), region: decode(header(req, 'x-vercel-ip-country-region')), city: decode(header(req, 'x-vercel-ip-city')),
    user_agent: clip(req.headers['user-agent'], 300),
    track: d.track ?? null, care_setting: d.care_setting ?? null,
    ...base,
    language: languageOf(req),
    timezone: a.timezone && TZ_RE.test(a.timezone) ? a.timezone.slice(0, 64) : null,
    ...visit,
    came_from: describeCameFrom(base),
    at: new Date().toISOString(),
  }
}

export const locationOf = (m: Pick<SignupMeta, 'city' | 'region' | 'country'>): string => [m.city, m.region, m.country].filter(Boolean).join(', ')

/** "Free", "Training only", or the paid plan on its trial. */
export function accountTypeLabel(tier: string, planName?: string | null): string {
  if (tier === 'free') return 'Free'
  if (tier === 'training_only') return 'Training only (pay per course)'
  return planName ? `Paid plan: ${planName} (trial)` : 'Paid plan (trial)'
}

/** Where a request came from: IP address, rough location (Vercel geo headers) and device. Used for the last login on a user. */
export type RequestOrigin = { ip: string | null; country: string | null; region: string | null; city: string | null; user_agent: string | null; at: string }
export function requestOrigin(req: Request): RequestOrigin {
  return {
    ip: cleanIp(req.ip),
    country: header(req, 'x-vercel-ip-country'), region: decode(header(req, 'x-vercel-ip-country-region')), city: decode(header(req, 'x-vercel-ip-city')),
    user_agent: clip(req.headers['user-agent'], 300),
    at: new Date().toISOString(),
  }
}
