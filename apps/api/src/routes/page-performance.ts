// Search Console numbers per page for the Platform → Blog tabs.
//
//   POST /public/page-performance   Bearer FI_INGEST_SECRET (the nightly job) or a platform admin token: upsert a batch of pages
//   GET  /admin/page-performance    platform admin: every page (or ?prefix=/care-policies)
//
// The nightly script ~/traffic-reports/page_performance.py does the Search Console pull on the Mac with the
// existing traffic-reporting service account, so no Google credentials live on Vercel. Both calls tolerate the
// table not existing yet (it is created by a SQL file Len runs), so the platform pages keep working until it does.
import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'

export const pagePerformanceIngestRouter = Router()
export const pagePerformanceAdminRouter = Router()

const num = (v: unknown) => (Number.isFinite(Number(v)) ? Number(v) : 0)

// The nightly job sends FI_INGEST_SECRET; a signed-in platform admin may also load a batch by hand.
pagePerformanceIngestRouter.post('/', (req: Request, res: Response, next: NextFunction) => {
  const want = process.env.FI_INGEST_SECRET || ''
  const got = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (want && got === want) { next(); return }
  requirePlatformAdmin(req, res, next)
}, async (req: Request, res: Response) => {
  const rows: any[] = Array.isArray(req.body?.pages) ? req.body.pages : []
  if (!rows.length || rows.length > 3000) { res.status(400).json({ error: 'pages must hold 1 to 3000 rows' }); return }
  try {
    let saved = 0
    for (let i = 0; i < rows.length; i += 50) {
      await Promise.all(rows.slice(i, i + 50).map(async r => {
        const path = String(r.path ?? '')
        if (!/^\/[a-z0-9\-_/.]*$/i.test(path) || path.length > 300) return
        const data = {
          impressions: Math.round(num(r.impressions)), clicks: Math.round(num(r.clicks)), position: num(r.position),
          prev_impressions: Math.round(num(r.prev_impressions)), prev_clicks: Math.round(num(r.prev_clicks)), prev_position: num(r.prev_position),
          top_queries: Array.isArray(r.top_queries) ? r.top_queries.slice(0, 10) : [],
          period_end: new Date(String(r.period_end ?? new Date().toISOString().slice(0, 10))), updated_at: new Date(),
        }
        await (prisma as any).pagePerformance.upsert({ where: { path }, create: { path, ...data }, update: data })
        saved++
      }))
    }
    res.json({ saved })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'could not save' })
  }
})

pagePerformanceAdminRouter.use(requirePlatformAdmin)
pagePerformanceAdminRouter.get('/', async (req: Request, res: Response) => {
  try {
    const prefix = String(req.query.prefix ?? '')
    const rows = await (prisma as any).pagePerformance.findMany({
      where: prefix ? { path: { startsWith: prefix } } : {}, orderBy: { impressions: 'desc' }, take: 3000,
    })
    ok(res, { pages: rows, ready: true })
  } catch {
    // table not created yet: an empty answer, not an error, so the tabs still render
    ok(res, { pages: [], ready: false })
  }
})
