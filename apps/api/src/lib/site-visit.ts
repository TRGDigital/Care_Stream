// The public page-visit endpoint's input handling. Pure: a request body in, a clean row (or null) out. Anything from the browser is untrusted:
// every string is cut to length, numbers are clamped, conversions must be on the list, and nothing that could identify a person is kept
// (no IP, no query strings in paths or links, only the host of the referrer). Bots and non-public paths are dropped.
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
export const CONVERSIONS = ['email_entered', 'signup_click', 'signup_submitted', 'demo_click', 'demo_submitted', 'contact_click', 'form_submit', 'cta_click', 'chat_opened'] as const
const BOT = /bot|crawl|spider|slurp|preview|headless|lighthouse|pagespeed|gtmetrix|facebookexternalhit|embedly|monitor|uptime|curl\/|wget|python-requests|node-fetch|axios|go-http/i
// Application and operator areas are never recorded, even if the tracker were mounted there by mistake.
const PRIVATE_FIRST = new Set(['platform', 'admin', 'api', 'chat', 'dashboard', 'login', 'staff', 'billing', 'settings', 'family', 'auth', 'onboarding'])

const cut = (v: unknown, n: number): string | null => { const s = typeof v === 'string' ? v.trim() : ''; return s ? s.slice(0, n) : null }
const num = (v: unknown, max: number): number => { const n = Math.round(Number(v)); return Number.isFinite(n) ? Math.max(0, Math.min(max, n)) : 0 }
const when = (v: unknown, fallback: Date): Date => { const d = new Date(String(v ?? '')); return Number.isNaN(d.getTime()) || Math.abs(d.getTime() - Date.now()) > 2 * 86_400_000 ? fallback : d }

/** A path with no query string or fragment, starting with a slash, or null if it is not a public page. */
export function cleanPath(v: unknown): string | null {
  const s = cut(v, 300); if (!s || !s.startsWith('/')) return null
  const p = s.split(/[?#]/)[0].replace(/\/{2,}/g, '/')
  const first = p.split('/').filter(Boolean)[0]
  if (first && PRIVATE_FIRST.has(first.toLowerCase())) return null
  return (p.length > 1 ? p.replace(/\/+$/, '') : p).slice(0, 200) || '/'
}
const hostOf = (v: unknown): string | null => { const s = cut(v, 300); if (!s) return null; try { return new URL(s).hostname.replace(/^www\./, '').slice(0, 100) } catch { return null } }

export type CleanVisit = {
  id: string; visitor_id: string | null; session_id: string | null; path: string; page_type: string | null; referrer: string | null
  utm_source: string | null; utm_medium: string | null; utm_campaign: string | null; device: string | null; is_return: boolean
  started_at: Date; ended_at: Date | null; active_seconds: number; elapsed_seconds: number; max_scroll_pct: number; interactions: number
  clicks: Array<{ l: string; h: string | null }>; conversions: string[]; next_path: string | null
}

export function cleanVisit(body: any, userAgent: string | undefined, now: Date = new Date()): CleanVisit | null {
  if (!body || typeof body !== 'object') return null
  if (userAgent && BOT.test(userAgent)) return null
  const id = String(body.id ?? ''); if (!UUID.test(id)) return null
  const path = cleanPath(body.path); if (!path) return null
  const clicks = (Array.isArray(body.clicks) ? body.clicks : []).slice(0, 25).map((c: any) => ({ l: cut(c?.l, 40) ?? '', h: cleanPath(c?.h) ?? (cut(c?.h, 120)?.startsWith('http') ? hostOf(c.h) : (typeof c?.h === 'string' && /^(mailto|tel):/.test(c.h) ? c.h.split(':')[0] + ':' : null)) })).filter((c: { l: string }) => c.l)
  const conv = [...new Set((Array.isArray(body.conversions) ? body.conversions : []).map((c: unknown) => String(c)).filter((c: string) => (CONVERSIONS as readonly string[]).includes(c)))] as string[]
  const started = when(body.started_at, now)
  return {
    id, visitor_id: cut(body.visitor_id, 64), session_id: cut(body.session_id, 64), path, page_type: cut(body.page_type, 30),
    referrer: hostOf(body.referrer), utm_source: cut(body.utm_source, 60), utm_medium: cut(body.utm_medium, 60), utm_campaign: cut(body.utm_campaign, 80),
    device: ['mobile', 'tablet', 'desktop'].includes(String(body.device)) ? String(body.device) : null, is_return: body.is_return === true,
    started_at: started, ended_at: body.ended_at ? when(body.ended_at, now) : null,
    active_seconds: num(body.active_seconds, 4 * 3600), elapsed_seconds: num(body.elapsed_seconds, 24 * 3600), max_scroll_pct: num(body.max_scroll_pct, 100), interactions: num(body.interactions, 5000),
    clicks, conversions: conv, next_path: cleanPath(body.next_path),
  }
}
