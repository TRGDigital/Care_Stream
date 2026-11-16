// What we know about a sign up at the moment it happens: the IP address, a rough location, the device, and where the person came from.
// Stored on tenants.signup_meta (shown on the platform client page) and written into the new account alert email.
import type { Request } from 'express'

export type SignupAttribution = {
  referrer?: string; utm_source?: string; utm_medium?: string; utm_campaign?: string; utm_content?: string; utm_term?: string; gclid?: boolean; landing?: string
}
export type SignupMeta = {
  ip: string | null
  country?: string | null; region?: string | null; city?: string | null
  user_agent?: string | null
  source?: string | null; track?: string | null; course?: string | null; care_setting?: string | null
  growth_ref?: string | null
  referrer?: string | null; utm_source?: string | null; utm_medium?: string | null; utm_campaign?: string | null; utm_content?: string | null; gclid?: boolean
  landing?: string | null
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

export function buildSignupMeta(req: Request, d: { source?: string; track?: string; course?: string; care_setting?: string; growth_ref?: string | null; attribution?: SignupAttribution }): SignupMeta {
  const a = d.attribution ?? {}
  const base = {
    growth_ref: d.growth_ref ?? null, source: d.source ?? null, course: d.course ?? null,
    utm_source: clip(a.utm_source, 100), utm_medium: clip(a.utm_medium, 100), utm_campaign: clip(a.utm_campaign, 100), utm_content: clip(a.utm_content, 100),
    gclid: !!a.gclid, referrer: clip(a.referrer, 200), landing: clip(a.landing, 200),
  }
  return {
    ip: cleanIp(req.ip),
    country: header(req, 'x-vercel-ip-country'), region: decode(header(req, 'x-vercel-ip-country-region')), city: decode(header(req, 'x-vercel-ip-city')),
    user_agent: clip(req.headers['user-agent'], 300),
    track: d.track ?? null, care_setting: d.care_setting ?? null,
    ...base,
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
