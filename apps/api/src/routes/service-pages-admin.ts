import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { queueWebsiteReindex } from '../services/website-chat/indexer'
import { requirePlatformAdmin } from '../middleware/auth'
import { SERVICE_PAGE_SLUGS, isServicePageSlug, servicePagePath } from '../lib/service-pages'
import { SERVICE_PAGE_SEEDS } from '../data/service-pages-seed'

// Console management of the seven /our-services pages (Blog -> Services). Their copy is
// expected to change over time, so it lives in the database rather than in the page component:
// an edit saved in the console is live within a minute, with no deploy.
export const servicePagesAdminRouter = Router()
servicePagesAdminRouter.use(requirePlatformAdmin)

// GET / — every service page, whether or not a row exists yet, so the console shows the ones
// still to be imported rather than silently listing only what is in the table.
servicePagesAdminRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await (prisma as any).servicePage.findMany({
    orderBy: [{ sort: 'asc' }, { slug: 'asc' }],
    select: {
      slug: true, title: true, status: true, meta_title: true, meta_description: true,
      og_image_url: true, hero_image_url: true, sort: true, updated_at: true,
    },
  })
  const bySlug = new Map(rows.map((r: any) => [r.slug, r]))
  const pages = SERVICE_PAGE_SLUGS.map((slug, i) => {
    const row = bySlug.get(slug) as any
    return row ? { ...row, exists: true }
               : { slug, exists: false, status: 'missing', sort: i }
  })
  ok(res, { pages })
})

// GET /:slug — the full record for the editor, including drafts.
servicePagesAdminRouter.get('/:slug', async (req: Request, res: Response) => {
  const page = await (prisma as any).servicePage.findUnique({ where: { slug: req.params.slug } })
  if (!page) { err(res, 'NOT_FOUND', 'Page not found.', 404); return }
  ok(res, { page })
})

// PUT /:slug — save an edit. Only the fields sent are written, so the editor can save one
// section without round-tripping the whole document and risking a field it did not render.
servicePagesAdminRouter.put('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '')
  if (!isServicePageSlug(slug)) { err(res, 'BAD_REQUEST', 'Unknown service page.', 400); return }

  const b = req.body ?? {}
  const data: Record<string, unknown> = {}
  for (const f of ['title', 'meta_title', 'meta_description', 'og_image_url', 'hero_image_url']) {
    if (typeof b[f] === 'string') data[f] = b[f]
  }
  if (b.content && typeof b.content === 'object') data.content = b.content
  if (b.status === 'draft' || b.status === 'published') data.status = b.status
  if (Number.isInteger(b.sort)) data.sort = b.sort
  if (!Object.keys(data).length) { err(res, 'BAD_REQUEST', 'Nothing to update.', 400); return }

  const page = await (prisma as any).servicePage.upsert({
    where:  { slug },
    update: data,
    create: { slug, ...data },
  })
  // The website chat re-reads the page once the change has reached the site.
  await queueWebsiteReindex(servicePagePath(slug))
  ok(res, { page })
})

// POST /seed — load the starting copy extracted from the content theme.
//
// Skips any page that already exists, because re-running this after someone has edited a page
// would throw their words away. `?overwrite=true` is the deliberate escape hatch for refreshing
// after a theme change, and the response says so.
servicePagesAdminRouter.post('/seed', async (req: Request, res: Response) => {
  const overwrite = String(req.query.overwrite ?? '') === 'true'
  const have = new Set(
    (await (prisma as any).servicePage.findMany({ select: { slug: true } }))
      .map((r: any) => r.slug),
  )

  const created: string[] = []
  const updated: string[] = []
  const skipped: string[] = []

  for (const s of SERVICE_PAGE_SEEDS) {
    if (have.has(s.slug) && !overwrite) { skipped.push(s.slug); continue }
    const data = {
      title: s.title, meta_title: s.meta_title, meta_description: s.meta_description,
      hero_image_url: s.hero_image_url, content: s.content, sort: s.sort,
    }
    await (prisma as any).servicePage.upsert({
      where:  { slug: s.slug },
      update: data,                          // status deliberately untouched on an update
      create: { slug: s.slug, status: 'draft', ...data },
    })
    ;(have.has(s.slug) ? updated : created).push(s.slug)
  }

  ok(res, {
    created, updated, skipped,
    note: skipped.length && !overwrite
      ? 'Existing pages were left alone so console edits are not lost. Re-run with ?overwrite=true to refresh them from the theme.'
      : undefined,
  })
})
