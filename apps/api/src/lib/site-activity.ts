// What visitors do on the public site, for /platform/site-activity. Rows come from site_visits (one per page view, only for visitors who
// accepted analytics cookies). summariseSiteActivity is pure and tested; loadSiteActivity reads the rows and the real counts
// (accounts created, demo requests, contact enquiries) that include everyone, whether they accepted cookies or not.
import { prisma } from '../db/client'

const DAY = 86_400_000
export const londonDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

export type VisitRow = {
  id: string; visitor_id: string | null; session_id: string | null; path: string; referrer: string | null; utm_source: string | null; device: string | null
  is_return: boolean; started_at: Date | string; active_seconds: number; max_scroll_pct: number; interactions: number
  clicks: any; conversions: string[]; next_path: string | null
}

const CONV_LABEL: Record<string, string> = {
  email_entered: 'Started typing an email address', signup_click: 'Clicked sign up or start free trial', signup_submitted: 'Submitted the sign up form',
  demo_click: 'Clicked book a demo', demo_submitted: 'Submitted the demo form', contact_click: 'Clicked email or phone', form_submit: 'Submitted another form',
  cta_click: 'Clicked a main button', chat_opened: 'Opened the website chat',
}
const KEY_CONVERSIONS = ['signup_click', 'email_entered', 'signup_submitted', 'demo_click', 'demo_submitted', 'contact_click', 'chat_opened']

const who = (r: VisitRow) => r.visitor_id || r.session_id || r.id
const avg = (xs: number[]) => (xs.length ? Math.round(xs.reduce((a, b) => a + b, 0) / xs.length) : 0)
const pct = (n: number, d: number) => (d > 0 ? Math.round((n / d) * 100) : 0)
const sourceOf = (r: VisitRow) => (r.utm_source ? `${r.utm_source} (campaign)` : r.referrer || 'Direct')

export type SiteActivity = ReturnType<typeof summariseSiteActivity>

export function summariseSiteActivity(rows: VisitRow[], now: Date = new Date(), days = 7) {
  const visitors = new Set(rows.map(who))
  const sessions = new Map<string, VisitRow[]>()
  for (const r of rows) { const k = r.session_id || r.id; sessions.set(k, [...(sessions.get(k) ?? []), r]) }
  for (const v of sessions.values()) v.sort((a, b) => new Date(a.started_at).getTime() - new Date(b.started_at).getTime())

  // A bounce: one page, under 10 seconds of real use, nothing clicked or typed.
  const bounced = [...sessions.values()].filter(v => v.length === 1 && v[0].active_seconds < 10 && v[0].interactions === 0 && v[0].conversions.length === 0).length
  const returning = new Set(rows.filter(r => r.is_return).map(who)).size

  // Funnel: distinct visitors who got as far as each step.
  const hit = (f: (r: VisitRow) => boolean) => new Set(rows.filter(f).map(who)).size
  const funnel = [
    { key: 'visited', label: 'Visited the site', visitors: visitors.size },
    { key: 'pricing', label: 'Looked at pricing', visitors: hit(r => r.path === '/pricing') },
    ...KEY_CONVERSIONS.filter(k => k !== 'chat_opened' && k !== 'contact_click').map(k => ({ key: k, label: CONV_LABEL[k], visitors: hit(r => r.conversions.includes(k)) })),
  ]
  const conversions = Object.keys(CONV_LABEL).map(k => ({ key: k, label: CONV_LABEL[k], visitors: hit(r => r.conversions.includes(k)), events: rows.filter(r => r.conversions.includes(k)).length })).filter(c => c.events > 0)

  // Pages
  const byPage = new Map<string, VisitRow[]>()
  for (const r of rows) byPage.set(r.path, [...(byPage.get(r.path) ?? []), r])
  const pages = [...byPage.entries()].map(([path, rs]) => {
    const vis = new Set(rs.map(who)).size, conv = rs.filter(r => r.conversions.some(c => KEY_CONVERSIONS.includes(c))).length
    return { path, views: rs.length, visitors: vis, avg_active_seconds: avg(rs.map(r => r.active_seconds)), avg_scroll_pct: avg(rs.map(r => r.max_scroll_pct)), conversions: conv, conv_rate: pct(conv, rs.length) }
  }).sort((a, b) => b.views - a.views).slice(0, 30)

  // Clicks
  const click = new Map<string, { label: string; href: string | null; count: number; pages: Set<string> }>()
  for (const r of rows) for (const c of Array.isArray(r.clicks) ? r.clicks : []) {
    const k = `${c.l}|${c.h ?? ''}`; const cur = click.get(k) ?? { label: c.l, href: c.h ?? null, count: 0, pages: new Set<string>() }
    cur.count++; cur.pages.add(r.path); click.set(k, cur)
  }
  const clicks = [...click.values()].map(c => ({ label: c.label, href: c.href, count: c.count, pages: c.pages.size })).sort((a, b) => b.count - a.count).slice(0, 25)

  // Where visitors come from
  const src = new Map<string, Set<string>>()
  for (const [, v] of sessions) { const s = sourceOf(v[0]); const set = src.get(s) ?? new Set<string>(); set.add(who(v[0])); src.set(s, set) }
  const referrers = [...src.entries()].map(([source, set]) => ({ source, visitors: set.size })).sort((a, b) => b.visitors - a.visitors).slice(0, 12)
  const devices = { mobile: 0, tablet: 0, desktop: 0, unknown: 0 } as Record<string, number>
  for (const [, v] of sessions) devices[v[0].device && v[0].device in devices ? v[0].device : 'unknown']++

  // Day by day
  const daily: Array<{ day: string; visitors: number; page_views: number; conversions: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const day = londonDay(new Date(now.getTime() - i * DAY)), rs = rows.filter(r => londonDay(r.started_at) === day)
    daily.push({ day, visitors: new Set(rs.map(who)).size, page_views: rs.length, conversions: rs.filter(r => r.conversions.some(c => ['signup_submitted', 'demo_submitted', 'signup_click', 'demo_click'].includes(c))).length })
  }

  // Recent journeys: the newest sessions, each page in order with how long they spent and what they did
  const recent = [...sessions.entries()].map(([id, v]) => ({ id, started_at: new Date(v[0].started_at).toISOString(), device: v[0].device, source: sourceOf(v[0]), returning: v[0].is_return,
    visitor: who(v[0]).slice(0, 6), conversions: [...new Set(v.flatMap(r => r.conversions))].map(c => CONV_LABEL[c] ?? c),
    pages: v.map(r => ({ path: r.path, active_seconds: r.active_seconds, scroll_pct: r.max_scroll_pct, clicks: (Array.isArray(r.clicks) ? r.clicks : []).slice(0, 5).map((c: any) => c.l) })) }))
    .sort((a, b) => b.started_at.localeCompare(a.started_at)).slice(0, 30)

  const liveSince = now.getTime() - 30 * 60_000
  return {
    totals: { visitors: visitors.size, sessions: sessions.size, page_views: rows.length, avg_active_seconds: avg(rows.map(r => r.active_seconds)), bounce_pct: pct(bounced, sessions.size), returning_pct: pct(returning, visitors.size), pages_per_session: sessions.size ? Math.round((rows.length / sessions.size) * 10) / 10 : 0 },
    live_visitors: new Set(rows.filter(r => new Date(r.started_at).getTime() >= liveSince).map(who)).size,
    funnel, conversions, pages, clicks, referrers, devices, daily, recent,
  }
}

export async function loadSiteActivity(days: number, now: Date = new Date()) {
  const d = Math.max(1, Math.min(90, Math.floor(days) || 7))
  const since = new Date(now.getTime() - d * DAY)
  const p = prisma as any
  const [rows, accounts, leads, firstSeen] = await Promise.all([
    p.siteVisit.findMany({ where: { started_at: { gte: since } }, orderBy: { started_at: 'desc' }, take: 60000,
      select: { id: true, visitor_id: true, session_id: true, path: true, referrer: true, utm_source: true, device: true, is_return: true, started_at: true, active_seconds: true, max_scroll_pct: true, interactions: true, clicks: true, conversions: true, next_path: true } }).catch(() => []),
    p.tenant.groupBy({ by: ['tier'], where: { created_at: { gte: since }, parent_tenant_id: null }, _count: { _all: true } }).catch(() => []),
    p.marketingLead.groupBy({ by: ['type'], where: { created_at: { gte: since } }, _count: { _all: true } }).catch(() => []),
    p.siteVisit.findFirst({ orderBy: { started_at: 'asc' }, select: { started_at: true } }).catch(() => null),
  ])
  const real = {
    accounts_created: (accounts as any[]).reduce((n, a) => n + a._count._all, 0),
    demo_requests: (leads as any[]).find(l => l.type === 'demo')?._count._all ?? 0,
    contact_enquiries: (leads as any[]).find(l => l.type === 'contact')?._count._all ?? 0,
  }
  // EVERY page view, with or without cookie consent: the anonymous head count (site_page_counts). Null until that table exists.
  const everyone = await loadEveryone(since, now)
  return { range_days: d, since: since.toISOString(), everyone, recording_since: firstSeen?.started_at ? new Date(firstSeen.started_at).toISOString() : null, real, ...summariseSiteActivity(rows as VisitRow[], now, Math.min(d, 31)) }
}


/** Anonymous counts for every visitor (no cookie, no id): total views, by day, the busiest pages, where visits came from and the device split. */
export async function loadEveryone(since: Date, now: Date = new Date()) {
  const p = prisma as any
  const from = londonDay(since), to = londonDay(now)
  try {
    const [byDay, byPage, bySource, byDevice] = await Promise.all([
      p.$queryRaw`select day::text as day, sum(views)::int as views from public.site_page_counts where day >= ${from}::date and day <= ${to}::date group by day order by day`,
      p.$queryRaw`select path, sum(views)::int as views from public.site_page_counts where day >= ${from}::date and day <= ${to}::date group by path order by views desc limit 25`,
      p.$queryRaw`select source, sum(views)::int as views from public.site_page_counts where day >= ${from}::date and day <= ${to}::date group by source order by views desc limit 15`,
      p.$queryRaw`select device, sum(views)::int as views from public.site_page_counts where day >= ${from}::date and day <= ${to}::date group by device order by views desc`,
    ])
    const total = (byDay as any[]).reduce((n, r) => n + Number(r.views), 0)
    const first = await p.$queryRaw`select min(day)::text as day from public.site_page_counts`
    return { total_views: total, by_day: byDay as Array<{ day: string; views: number }>, pages: byPage as Array<{ path: string; views: number }>, sources: bySource as Array<{ source: string; views: number }>, devices: byDevice as Array<{ device: string; views: number }>, counting_since: (first as any[])[0]?.day ?? null }
  } catch { return null }   // the table has not been created yet
}
