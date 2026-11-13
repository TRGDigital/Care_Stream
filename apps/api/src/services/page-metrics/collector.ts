// Daily job: Search Console and GA4 into page_metrics / page_query_metrics for every blog post and
// collection URL. Search Console data lags about two days, so each run re-reads the last `days`
// (default 7) and upserts; the first run can backfill with ?days=90.
import { prisma } from '../../db/client'
import { gscQuery, ga4Pages, googleConfigured } from './google'

const iso = (d: Date) => d.toISOString().slice(0, 10)
const daysAgo = (n: number) => iso(new Date(Date.now() - n * 86_400_000))

/** /blog/slug or /collection/slug from a full URL or path; null for anything else. */
export function pageKey(u: string): { path: string; kind: 'blog' | 'collection'; slug: string } | null {
  const m = u.replace(/^https?:\/\/[^/]+/i, '').split(/[?#]/)[0].replace(/\/+$/, '').match(/^\/(blog|collection)\/([^/]+)$/)
  return m ? { path: `/${m[1]}/${m[2]}`, kind: m[1] as 'blog' | 'collection', slug: m[2] } : null
}

type Row = { url: string; date: string; kind: string; slug: string; impressions: number; clicks: number; position: number | null; sessions: number; engaged_seconds: number }

async function upsertRows(rows: Row[]) {
  for (let i = 0; i < rows.length; i += 400) {
    const chunk = rows.slice(i, i + 400)
    const values: string[] = []; const args: any[] = []
    chunk.forEach((r, j) => {
      const b = j * 9
      values.push(`($${b + 1},$${b + 2}::date,$${b + 3},$${b + 4},$${b + 5},$${b + 6},$${b + 7},$${b + 8},$${b + 9})`)
      args.push(r.url, r.date, r.kind, r.slug, r.impressions, r.clicks, r.position, r.sessions, r.engaged_seconds)
    })
    await (prisma as any).$executeRawUnsafe(
      `INSERT INTO page_metrics (url, date, kind, slug, impressions, clicks, position, sessions, engaged_seconds) VALUES ${values.join(',')}
       ON CONFLICT (url, date) DO UPDATE SET impressions = EXCLUDED.impressions, clicks = EXCLUDED.clicks, position = EXCLUDED.position,
         sessions = EXCLUDED.sessions, engaged_seconds = EXCLUDED.engaged_seconds`, ...args)
  }
}

export async function collectPageMetrics(days = 7, opts: { ga4Only?: boolean } = {}): Promise<Record<string, unknown>> {
  if (!googleConfigured()) return { skipped: 'GOOGLE_ANALYTICS_SA_JSON is not set' }
  // Search Console keeps 16 months, so a backfill can reach back to when the oldest post went up.
  const start = daysAgo(Math.min(Math.max(days, 1), 480)); const end = daysAgo(0)
  const map = new Map<string, Row>()
  const get = (path: string, date: string) => {
    const k = pageKey(path); if (!k) return null
    const key = `${k.path}|${date}`
    if (!map.has(key)) map.set(key, { url: k.path, date, kind: k.kind, slug: k.slug, impressions: 0, clicks: 0, position: null, sessions: 0, engaged_seconds: 0 })
    return map.get(key)!
  }
  const gsc = opts.ga4Only ? [] : await gscQuery(start, end, ['page', 'date'])
  for (const r of gsc) { const row = get(r.keys[0], r.keys[1]); if (row) { row.impressions += r.impressions; row.clicks += r.clicks; row.position = r.position } }
  let ga4Rows = 0
  let ga4Error = ''
  try {
    for (const r of await ga4Pages(start, end)) {
      const d = `${r.date.slice(0, 4)}-${r.date.slice(4, 6)}-${r.date.slice(6, 8)}`
      const row = get(r.path, d); if (row) { row.sessions += r.sessions; row.engaged_seconds += r.engaged; ga4Rows++ }
    }
  } catch (e: any) { ga4Error = String(e?.message ?? e).slice(0, 300); console.error('[page-metrics] GA4 failed (Search Console data still saved)', e) }
  if (opts.ga4Only) {
    // Fill sessions and engagement only; never overwrite the Search Console columns.
    for (const r of map.values()) await (prisma as any).$executeRawUnsafe(`INSERT INTO page_metrics (url, date, kind, slug, sessions, engaged_seconds) VALUES ($1,$2::date,$3,$4,$5,$6) ON CONFLICT (url, date) DO UPDATE SET sessions = EXCLUDED.sessions, engaged_seconds = EXCLUDED.engaged_seconds`, r.url, r.date, r.kind, r.slug, r.sessions, r.engaged_seconds)
    return { mode: 'ga4_only', from: start, to: end, ga4_rows: ga4Rows, ...(ga4Error ? { ga4_error: ga4Error } : {}) }
  }
  await upsertRows([...map.values()])

  // Queries each page appears for: the last 28 days, top 20 per page, replacing this window.
  const qStart = daysAgo(28)
  const qrows = await gscQuery(qStart, end, ['page', 'query'])
  const byPage = new Map<string, Array<{ query: string; impressions: number; clicks: number; position: number }>>()
  for (const r of qrows) {
    const k = pageKey(r.keys[0]); if (!k) continue
    const list = byPage.get(k.path) ?? []; list.push({ query: r.keys[1].slice(0, 200), impressions: r.impressions, clicks: r.clicks, position: r.position }); byPage.set(k.path, list)
  }
  await (prisma as any).$executeRawUnsafe(`DELETE FROM page_query_metrics WHERE window_end <= (CURRENT_DATE - 45)`)
  await (prisma as any).$executeRawUnsafe(`DELETE FROM page_query_metrics WHERE window_end = $1::date`, end)
  const qvals: any[] = []
  for (const [url, list] of byPage) for (const q of list.sort((a, b) => b.impressions - a.impressions).slice(0, 20)) qvals.push({ url, ...q })
  for (let i = 0; i < qvals.length; i += 400) {
    const chunk = qvals.slice(i, i + 400); const values: string[] = []; const args: any[] = []
    chunk.forEach((r, j) => { const b = j * 6; values.push(`($${b + 1},$${b + 2},$${b + 3}::date,$${b + 4},$${b + 5},$${b + 6})`); args.push(r.url, r.query, end, r.impressions, r.clicks, r.position) })
    await (prisma as any).$executeRawUnsafe(`INSERT INTO page_query_metrics (url, query, window_end, impressions, clicks, position) VALUES ${values.join(',')} ON CONFLICT DO NOTHING`, ...args)
  }
  return { from: start, to: end, page_days: map.size, ga4_rows: ga4Rows, ...(ga4Error ? { ga4_error: ga4Error } : {}), query_rows: qvals.length }
}
