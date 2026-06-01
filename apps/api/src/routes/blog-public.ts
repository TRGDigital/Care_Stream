import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

// Public, unauthenticated blog endpoints for the marketing site (/blog).
// Only ever return status='published' posts. Mounted before requireAuth in app.ts.
// Blog posts are platform-level (no tenant_id), so no tenant scoping applies.

export const publicBlogRouter = Router()

// GET /public/blog/posts — published posts, newest first (card data for the listing)
publicBlogRouter.get('/posts', async (_req: Request, res: Response) => {
  const posts = await (prisma as any).blogPost.findMany({
    where:   { status: 'published' },
    orderBy: [{ publication_date: 'desc' }, { created_at: 'desc' }],
    select: {
      slug:              true,
      title:             true,
      excerpt:           true,
      category:          true,
      publication_date:  true,
      read_time_minutes: true,
      feature_image_url: true,
      is_featured:       true,
      author: { select: { name: true, photo_url: true } },
    },
  })
  ok(res, { posts })
})

// GET /public/blog/posts/:slug — a single published post (full content)
publicBlogRouter.get('/posts/:slug', async (req: Request, res: Response) => {
  const post = await (prisma as any).blogPost.findFirst({
    where:   { slug: req.params.slug, status: 'published' },
    include: { author: { select: { name: true, title: true, photo_url: true, bio: true } } },
  })
  if (!post) { err(res, 'NOT_FOUND', 'Post not found.', 404); return }
  ok(res, { post })
})
