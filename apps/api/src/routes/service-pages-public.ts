import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { isServicePageSlug } from '../lib/service-pages'
import { verifyPreviewToken } from '../lib/preview-token'

// Public, unauthenticated read of the seven /our-services pages. They live at FLAT live URLs
// (/care-audits, /cqc-compliance and so on), not under the theme's /our-services/ prefix: no
// URL changes in this switchover.
//
// Only ever returns status='published', so a page being drafted in the console is invisible on
// the site until it is deliberately published. Mounted before requireAuth in app.ts.
//
// Platform-level marketing pages, so no tenant scoping applies.

export const publicServicePagesRouter = Router()

const CARD = {
  slug: true, title: true, meta_title: true, meta_description: true,
  og_image_url: true, hero_image_url: true, sort: true,
}

// GET /public/service-pages — the published pages, for the index and the sitemap.
publicServicePagesRouter.get('/', async (_req: Request, res: Response) => {
  const pages = await (prisma as any).servicePage.findMany({
    where:   { status: 'published' },
    orderBy: [{ sort: 'asc' }, { slug: 'asc' }],
    select:  { ...CARD, updated_at: true },
  })
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { pages })
})

// GET /public/service-pages/:slug — one page, with the body content.
publicServicePagesRouter.get('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '')
  // Checked against the canonical list first so an unknown slug is a cheap 404 rather than a
  // database round trip, and so the two lists cannot silently diverge.
  if (!isServicePageSlug(slug)) {
    err(res, 'NOT_FOUND', 'Unknown service page.', 404)
    return
  }

  // A valid preview token for THIS page lets the console see it before it is published.
  const preview = verifyPreviewToken(String(req.query.preview ?? ''), 'service-page', slug)
  const page = await (prisma as any).servicePage.findFirst({
    where:  preview ? { slug } : { slug, status: 'published' },
    select: { ...CARD, content: true, updated_at: true },
  })
  if (!page) { err(res, 'NOT_FOUND', 'Page not found.', 404); return }
  // Never let a preview response be cached at the edge, or a draft could be served to the next
  // visitor who asks for the published page.
  res.setHeader('Cache-Control', preview
    ? 'private, no-store'
    : 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { page })
})
