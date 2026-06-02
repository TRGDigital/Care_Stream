import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

// Public, unauthenticated SEO metadata for marketing site pages.
// Only ever returns status='published' pages. Mounted before requireAuth in app.ts.
// Site pages are platform-level (no tenant_id), so no tenant scoping applies.

export const publicPagesRouter = Router()

// GET /public/site-pages/footer — published pages flagged to show in the site footer
publicPagesRouter.get('/footer', async (_req: Request, res: Response) => {
  const pages = await (prisma as any).sitePage.findMany({
    where:   { is_footer_page: true, status: 'published' },
    select:  { path: true, title: true, footer_group: true, footer_label: true, footer_sort: true },
    orderBy: { footer_sort: 'asc' },
  })
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { pages })
})

// GET /public/site-pages?path=/help/... — SEO meta for a single published page
publicPagesRouter.get('/', async (req: Request, res: Response) => {
  const path = String(req.query.path ?? '').trim()
  if (!path) { err(res, 'MISSING_PATH', 'path is required', 400); return }
  const page = await (prisma as any).sitePage.findFirst({
    where:  { path, status: 'published' },
    select: {
      path:           true,
      title:          true,
      description:    true,
      og_title:       true,
      og_description: true,
      og_image_url:   true,
      faqs:           true,
      content:        true,
    },
  })
  if (!page) { err(res, 'NOT_FOUND', 'Page not found.', 404); return }
  // Public, rarely-changing content — let Vercel's edge cache it (stale-while-revalidate).
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { page })
})
