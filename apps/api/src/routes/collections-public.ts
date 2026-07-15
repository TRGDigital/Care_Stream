import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

// Public, unauthenticated collection landing pages (ecommerce-style SEO pages).
// Only ever returns status='published' collections. Mounted before requireAuth in
// app.ts. Collections are platform-level (no tenant_id), so no tenant scoping.

export const publicCollectionsRouter = Router()

// GET /public/collections — published collections (for the index + sitemap)
publicCollectionsRouter.get('/', async (_req: Request, res: Response) => {
  const collections = await (prisma as any).collection.findMany({
    where:   { status: 'published' },
    select:  { slug: true, title: true, meta_description: true, intro: true, images: true, updated_at: true },
    orderBy: { updated_at: 'desc' },
  })
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { collections })
})

// GET /public/collections/:slug — a single published collection, in full
publicCollectionsRouter.get('/:slug', async (req: Request, res: Response) => {
  const collection = await (prisma as any).collection.findFirst({
    where:  { slug: String(req.params.slug), status: 'published' },
    select: {
      slug: true, title: true, meta_title: true, meta_description: true, og_image_url: true,
      intro: true, images: true, body: true, links: true, faqs: true, updated_at: true,
    },
  })
  if (!collection) { err(res, 'NOT_FOUND', 'Collection not found.', 404); return }
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { collection })
})
