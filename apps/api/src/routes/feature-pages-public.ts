import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

// Public, unauthenticated DB-driven feature pages (the /pricing feature list).
// Only ever returns status='published'. Mounted before requireAuth in app.ts.
// Feature pages are platform-level (no tenant_id), so no tenant scoping applies.

export const publicFeaturePagesRouter = Router()

// GET /public/feature-pages — published feature pages (for /pricing links + sitemap)
publicFeaturePagesRouter.get('/', async (_req: Request, res: Response) => {
  const featurePages = await (prisma as any).featurePage.findMany({
    where:   { status: 'published' },
    select:  { slug: true, title: true, updated_at: true },
    orderBy: [{ sort: 'asc' }, { title: 'asc' }],
  })
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { featurePages })
})

// GET /public/feature-pages/:slug — a single published feature page, in full
publicFeaturePagesRouter.get('/:slug', async (req: Request, res: Response) => {
  const featurePage = await (prisma as any).featurePage.findFirst({
    where:  { slug: String(req.params.slug), status: 'published' },
    select: {
      slug: true, title: true, meta_title: true, meta_description: true, og_image_url: true,
      content: true, faqs: true, updated_at: true,
    },
  })
  if (!featurePage) { err(res, 'NOT_FOUND', 'Feature page not found.', 404); return }
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { featurePage })
})
