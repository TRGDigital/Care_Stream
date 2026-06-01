import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { downloadFile } from '../services/storage/s3'
import { ok, err } from '../lib/response'

const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
}

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
  // Public, rarely-changing content — let Vercel's edge cache it (stale-while-revalidate).
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { posts })
})

// GET /public/blog/posts/:slug — a single published post (full content)
publicBlogRouter.get('/posts/:slug', async (req: Request, res: Response) => {
  const post = await (prisma as any).blogPost.findFirst({
    where:   { slug: req.params.slug, status: 'published' },
    include: { author: { select: { name: true, title: true, photo_url: true, bio: true } } },
  })
  if (!post) { err(res, 'NOT_FOUND', 'Post not found.', 404); return }
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { post })
})

// GET /public/blog/image/:file — streams a blog image from private storage.
// Filenames are uuid.ext (set at upload), so the strict pattern blocks traversal.
// Long immutable cache lets Vercel's edge serve repeats without hitting the function.
publicBlogRouter.get('/image/:file', async (req: Request, res: Response) => {
  const file = String(req.params.file ?? '')
  if (!/^[a-f0-9-]+\.(png|jpe?g|webp|gif)$/i.test(file)) {
    res.status(400).end()
    return
  }
  const ext = file.split('.').pop()!.toLowerCase()
  try {
    const buffer = await downloadFile(`blog/images/${file}`)
    res.setHeader('Content-Type', IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    // helmet sets CORP: same-origin globally, which blocks the marketing site and
    // the admin console (different origin) from loading these images. Allow it.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(buffer)
  } catch {
    res.status(404).end()
  }
})
