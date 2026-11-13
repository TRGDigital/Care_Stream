// Per page performance (the Performance panel) and the Update queue, from page_metrics,
// page_query_metrics, page_events, RalfyIndex submissions and sign ups by source.
import { prisma } from '../../db/client'
import { decide, type Win, type Verdict } from './verdict'

const DAY = 86_400_000
const SITE = 'https://www.carestreamai.com'
const CHECKPOINTS = [14, 30, 45, 85]
const day = (d: Date) => d.toISOString().slice(0, 10)
const startOfDay = (d: Date) => new Date(day(d) + 'T00:00:00Z')

type M = { date: Date; impressions: number; clicks: number; position: number | null; sessions: number; engaged_seconds: number }

function agg(rows: M[], from: Date, to: Date): Win & { engaged: number; ctr: number } {
  let imp = 0, clicks = 0, posW = 0, sessions = 0, engaged = 0
  for (const r of rows) {
    const t = r.date.getTime()
    if (t < from.getTime() || t > to.getTime()) continue
    imp += r.impressions; clicks += r.clicks; sessions += r.sessions; engaged += r.engaged_seconds
    if (r.position !== null) posW += r.position * r.impressions
  }
  return { impressions: imp, clicks, position: imp > 0 ? Math.round((posW / imp) * 10) / 10 : null, sessions, engaged, ctr: imp > 0 ? clicks / imp : 0 }
}

async function pageRecord(kind: string, slug: string) {
  if (kind === 'collection') {
    const c = await (prisma as any).collection.findUnique({ where: { slug } })
    return c && { title: c.title, status: c.status, published_at: c.status === 'published' ? c.created_at : null, updated_at: c.updated_at, created_at: c.created_at, primary_keyword: c.primary_keyword, secondary_keywords: c.secondary_keywords ?? [], topic_cluster: c.topic_cluster, path: `/collection/${slug}` }
  }
  const p = await (prisma as any).blogPost.findUnique({ where: { slug } })
  return p && { title: p.title, status: p.status, published_at: p.publication_date ?? (p.status === 'published' ? p.created_at : null), updated_at: p.updated_at, created_at: p.created_at, primary_keyword: p.primary_keyword, secondary_keywords: p.secondary_keywords ?? [], topic_cluster: p.topic_cluster, path: `/blog/${slug}` }
}

/** Baseline for the day 14/30/45/85 checkpoints: the later of publication and the last refresh. */
async function anchorFor(path: string, publishedAt: Date | null): Promise<{ anchor: Date; label: 'published' | 'refreshed' }> {
  const ev = await (prisma as any).pageEvent.findFirst({ where: { url: path, kind: { in: ['published', 'refreshed'] } }, orderBy: { created_at: 'desc' } })
  const pub = publishedAt ? new Date(publishedAt) : null
  if (ev && (!pub || ev.created_at > pub)) return { anchor: startOfDay(ev.created_at), label: ev.kind === 'refreshed' ? 'refreshed' : 'published' }
  return { anchor: startOfDay(pub ?? new Date()), label: 'published' }
}

export async function getPagePerformance(kind: string, slug: string) {
  const rec = await pageRecord(kind, slug)
  if (!rec) return null
  const today = startOfDay(new Date())
  const { anchor, label } = await anchorFor(rec.path, rec.published_at)
  const ageDays = Math.max(0, Math.floor((today.getTime() - anchor.getTime()) / DAY))

  const rows: M[] = await (prisma as any).pageMetric.findMany({ where: { url: rec.path, date: { gte: new Date(today.getTime() - 200 * DAY) } }, orderBy: { date: 'asc' } })
  const submitted = await (prisma as any).ralfyIndexSubmission.findMany({ where: { url: `${SITE}${rec.path}` }, orderBy: { created_at: 'asc' }, select: { status: true, created_at: true, credits_used: true } })
  const signupSource = kind === 'blog' ? `blog-${slug}` : `collection-${slug}`
  const signupRows = await (prisma as any).signupAttempt.findMany({ where: { source: signupSource, outcome: 'created' }, select: { created_at: true } })
  const signupsIn = (a: Date, b: Date) => signupRows.filter((s: any) => s.created_at >= a && new Date(s.created_at).getTime() <= b.getTime() + DAY).length

  const windows = CHECKPOINTS.map(n => {
    const end = new Date(Math.min(anchor.getTime() + (n - 1) * DAY, today.getTime()))
    const a = agg(rows, anchor, end)
    return { days: n, complete: today.getTime() >= anchor.getTime() + (n - 1) * DAY, from: day(anchor), to: day(end), ...a, signups: signupsIn(anchor, end) }
  })

  const cur = agg(rows, new Date(today.getTime() - 27 * DAY), today)
  const prevEnd = new Date(today.getTime() - 28 * DAY)
  const prev = ageDays >= 56 ? agg(rows, new Date(prevEnd.getTime() - 27 * DAY), prevEnd) : null
  const latest = await (prisma as any).pageQueryMetric.findFirst({ where: { url: rec.path }, orderBy: { window_end: 'desc' }, select: { window_end: true } })
  const queries = latest ? await (prisma as any).pageQueryMetric.findMany({ where: { url: rec.path, window_end: latest.window_end }, orderBy: { impressions: 'desc' }, take: 15 }) : []

  // Peers in the same topic cluster over the same 28 days: is this page ahead or behind its neighbours?
  let clusterAvg: number | null = null
  if (rec.topic_cluster) {
    const peers = [
      ...(await (prisma as any).blogPost.findMany({ where: { topic_cluster: rec.topic_cluster, status: 'published', slug: { not: slug } }, select: { slug: true } })).map((x: any) => `/blog/${x.slug}`),
      ...(await (prisma as any).collection.findMany({ where: { topic_cluster: rec.topic_cluster, status: 'published', slug: { not: slug } }, select: { slug: true } })).map((x: any) => `/collection/${x.slug}`),
    ]
    if (peers.length) {
      const pm: any[] = await (prisma as any).pageMetric.findMany({ where: { url: { in: peers }, date: { gte: new Date(today.getTime() - 27 * DAY) } }, select: { impressions: true } })
      clusterAvg = Math.round(pm.reduce((s, r) => s + r.impressions, 0) / peers.length)
    }
  }

  const verdict: Verdict = decide({
    ageDays, submitted: submitted.some((s: any) => s.status === 'submitted'), cur, prev,
    signups: signupsIn(new Date(today.getTime() - 27 * DAY), today),
    topQueries: queries.map((q: any) => ({ query: q.query, impressions: q.impressions, position: q.position })),
  })
  const primary = rec.primary_keyword ? queries.find((q: any) => q.query.toLowerCase() === String(rec.primary_keyword).toLowerCase()) : null

  return {
    page: { kind, slug, path: rec.path, title: rec.title, status: rec.status, primary_keyword: rec.primary_keyword, topic_cluster: rec.topic_cluster },
    baseline: { date: day(anchor), label, age_days: ageDays },
    windows, last28: cur, prev28: prev, cluster_avg_impressions_28d: clusterAvg,
    primary_keyword_position: primary ? { position: Math.round(primary.position * 10) / 10, impressions: primary.impressions } : null,
    series: rows.filter(r => r.date.getTime() >= today.getTime() - 89 * DAY).map(r => ({ date: day(r.date), impressions: r.impressions, clicks: r.clicks, position: r.position })),
    queries: queries.map((q: any) => ({ query: q.query, impressions: q.impressions, clicks: q.clicks, position: q.position === null ? null : Math.round(q.position * 10) / 10 })),
    indexing: { submissions: submitted.length, first: submitted[0]?.created_at ?? null, last: submitted[submitted.length - 1]?.created_at ?? null, ok: submitted.some((s: any) => s.status === 'submitted'), failed: submitted.filter((s: any) => s.status === 'failed').length },
    signups: { total: signupRows.length, last28: signupsIn(new Date(today.getTime() - 27 * DAY), today) },
    verdict,
    has_data: rows.length > 0,
  }
}

/** Every published page with its verdict, most valuable action first. */
export async function getUpdateQueue() {
  const today = startOfDay(new Date())
  const posts = await (prisma as any).blogPost.findMany({ where: { status: 'published' }, select: { slug: true, title: true, publication_date: true, created_at: true, primary_keyword: true, topic_cluster: true } })
  const cols = await (prisma as any).collection.findMany({ where: { status: 'published' }, select: { slug: true, title: true, created_at: true, primary_keyword: true, topic_cluster: true } })
  const pages = [
    ...posts.map((p: any) => ({ kind: 'blog', slug: p.slug, title: p.title, path: `/blog/${p.slug}`, published: p.publication_date ?? p.created_at, pk: p.primary_keyword, cluster: p.topic_cluster })),
    ...cols.map((c: any) => ({ kind: 'collection', slug: c.slug, title: c.title, path: `/collection/${c.slug}`, published: c.created_at, pk: c.primary_keyword, cluster: c.topic_cluster })),
  ]
  const rows: Array<M & { url: string }> = await (prisma as any).pageMetric.findMany({ where: { date: { gte: new Date(today.getTime() - 60 * DAY) } } })
  const byUrl = new Map<string, M[]>(); for (const r of rows) { const l = byUrl.get(r.url) ?? []; l.push(r); byUrl.set(r.url, l) }
  const events: any[] = await (prisma as any).pageEvent.findMany({ where: { kind: { in: ['published', 'refreshed'] } }, orderBy: { created_at: 'desc' } })
  const lastEvent = new Map<string, Date>(); for (const e of events) if (!lastEvent.has(e.url)) lastEvent.set(e.url, e.created_at)
  const subs: any[] = await (prisma as any).ralfyIndexSubmission.findMany({ where: { status: 'submitted' }, select: { url: true } })
  const submitted = new Set(subs.map(s => s.url))
  const sup: any[] = await (prisma as any).signupAttempt.findMany({ where: { source: { startsWith: 'blog-' }, outcome: 'created', created_at: { gte: new Date(today.getTime() - 28 * DAY) } }, select: { source: true } })
  const signups = new Map<string, number>(); for (const s of sup) signups.set(s.source, (signups.get(s.source) ?? 0) + 1)
  const qrows: any[] = await (prisma as any).pageQueryMetric.findMany({ where: { window_end: { gte: new Date(today.getTime() - 5 * DAY) } }, orderBy: { impressions: 'desc' } })
  const qBy = new Map<string, any[]>(); for (const q of qrows) { const l = qBy.get(q.url) ?? []; if (l.length < 5) l.push(q); qBy.set(q.url, l) }

  const out = pages.map(p => {
    const m = byUrl.get(p.path) ?? []
    const basePub = new Date(p.published); const ev = lastEvent.get(p.path)
    const anchor = startOfDay(ev && ev > basePub ? ev : basePub)
    const ageDays = Math.max(0, Math.floor((today.getTime() - anchor.getTime()) / DAY))
    const cur = agg(m, new Date(today.getTime() - 27 * DAY), today)
    const prev = ageDays >= 56 ? agg(m, new Date(today.getTime() - 55 * DAY), new Date(today.getTime() - 28 * DAY)) : null
    const v = decide({ ageDays, submitted: submitted.has(`${SITE}${p.path}`), cur, prev, signups: signups.get(`blog-${p.slug}`) ?? 0, topQueries: (qBy.get(p.path) ?? []).map(q => ({ query: q.query, impressions: q.impressions, position: q.position })) })
    return { kind: p.kind, slug: p.slug, title: p.title, primary_keyword: p.pk, topic_cluster: p.cluster, age_days: ageDays, impressions_28d: cur.impressions, clicks_28d: cur.clicks, position_28d: cur.position, sessions_28d: cur.sessions, signups_28d: signups.get(`blog-${p.slug}`) ?? 0, verdict: v }
  })
  return out.sort((a, b) => b.verdict.priority - a.verdict.priority || b.impressions_28d - a.impressions_28d)
}

export async function logPageEvent(path: string, kind: 'published' | 'refreshed', note?: string) {
  try { await (prisma as any).pageEvent.create({ data: { url: path, kind, note: note ?? null } }) } catch { /* bookkeeping never blocks a save */ }
}
