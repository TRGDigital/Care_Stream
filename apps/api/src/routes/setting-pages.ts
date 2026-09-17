import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { queueWebsiteReindex } from '../services/website-chat/indexer'
import { requirePlatformAdmin } from '../middleware/auth'
import { SETTING_PAGE_SEEDS } from '../data/setting-pages-seed'
import { verifyPreviewToken } from '../lib/preview-token'

// The 11 care-setting pages (/nursing-homes and the rest).
//
// Their copy used to live in apps/web/src/lib/settings/<slug>.ts, so changing a sentence meant
// a developer and a deploy. These endpoints put it where the console can reach it.
//
// The TypeScript configs stay in place as the fallback: the page renders from the database
// when a published row exists and from the config otherwise, so the site cannot go blank
// because a row is missing or the API is briefly unreachable.

const KNOWN = new Set(SETTING_PAGE_SEEDS.map(s => s.slug))

export const publicSettingPagesRouter = Router()

// GET /public/setting-pages/:slug — published only, so a page being edited is not visible
// until it is deliberately published.
publicSettingPagesRouter.get('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '')
  if (!KNOWN.has(slug)) { err(res, 'NOT_FOUND', 'Unknown care setting.', 404); return }

  const preview = verifyPreviewToken(String(req.query.preview ?? ''), 'setting', slug)
  const page = await (prisma as any).settingPage.findFirst({
    where:  preview ? { slug } : { slug, status: 'published' },
    select: { slug: true, label: true, config: true, updated_at: true },
  })
  if (!page) { err(res, 'NOT_FOUND', 'Page not found.', 404); return }
  res.setHeader('Cache-Control', preview
    ? 'private, no-store'
    : 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { page })
})

export const settingPagesAdminRouter = Router()
settingPagesAdminRouter.use(requirePlatformAdmin)

// GET / — every setting, including those with no row yet, so the console shows the whole
// family rather than only what happens to be in the table.
settingPagesAdminRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await (prisma as any).settingPage.findMany({
    orderBy: [{ sort: 'asc' }, { slug: 'asc' }],
    select:  { slug: true, label: true, status: true, sort: true, updated_at: true },
  })
  const bySlug = new Map(rows.map((r: any) => [r.slug, r]))
  const pages = SETTING_PAGE_SEEDS.map(s => {
    const row = bySlug.get(s.slug) as any
    return row
      ? { ...row, exists: true }
      : { slug: s.slug, label: s.label, sort: s.sort, status: 'missing', exists: false }
  })
  ok(res, { pages })
})

settingPagesAdminRouter.get('/:slug', async (req: Request, res: Response) => {
  const page = await (prisma as any).settingPage.findUnique({ where: { slug: req.params.slug } })
  if (!page) { err(res, 'NOT_FOUND', 'Page not found.', 404); return }
  ok(res, { page })
})

// PUT /:slug — save an edit. The whole config object is replaced, because the editor holds the
// page in memory and sends it back; partial merging of a deeply nested object would be a
// guessing game about which empty value means "cleared" and which means "not sent".
settingPagesAdminRouter.put('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '')
  if (!KNOWN.has(slug)) { err(res, 'BAD_REQUEST', 'Unknown care setting.', 400); return }

  const b = req.body ?? {}
  const data: Record<string, unknown> = {}
  if (b.config && typeof b.config === 'object') data.config = b.config
  if (typeof b.label === 'string') data.label = b.label
  if (b.status === 'draft' || b.status === 'published') data.status = b.status
  if (!Object.keys(data).length) { err(res, 'BAD_REQUEST', 'Nothing to update.', 400); return }

  const seed = SETTING_PAGE_SEEDS.find(s => s.slug === slug)!
  const page = await (prisma as any).settingPage.upsert({
    where:  { slug },
    update: data,
    create: { slug, label: seed.label, sort: seed.sort, config: seed.config, ...data },
  })
  // The website chat re-reads the page once the change has reached the site.
  await queueWebsiteReindex(`/${slug}`)
  ok(res, { page })
})

// POST /seed — import the copy currently in the TypeScript configs.
//
// Skips rows that already exist, because re-running after someone has edited a page in the
// console would discard their words; ?overwrite=true is the deliberate way to reset a page
// back to the code version. Created as draft, so nothing changes on the site until published.
settingPagesAdminRouter.post('/seed', async (req: Request, res: Response) => {
  const overwrite = String(req.query.overwrite ?? '') === 'true'
  const have = new Set<string>(
    (await (prisma as any).settingPage.findMany({ select: { slug: true } })).map((r: any) => r.slug),
  )

  const created: string[] = []
  const updated: string[] = []
  const skipped: string[] = []

  for (const s of SETTING_PAGE_SEEDS) {
    if (have.has(s.slug) && !overwrite) { skipped.push(s.slug); continue }
    const data = { label: s.label, sort: s.sort, config: s.config }
    await (prisma as any).settingPage.upsert({
      where:  { slug: s.slug },
      update: data,                      // status left alone on an update
      create: { slug: s.slug, status: 'draft', ...data },
    })
    ;(have.has(s.slug) ? updated : created).push(s.slug)
  }

  ok(res, {
    created, updated, skipped,
    note: skipped.length && !overwrite
      ? 'Existing pages were left alone so console edits are not lost. Re-run with ?overwrite=true to reset them to the code version.'
      : undefined,
  })
})
