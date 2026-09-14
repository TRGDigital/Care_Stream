import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { downloadFile } from '../services/storage/s3'
import { ok, err } from '../lib/response'
import { USE_CASES, USE_CASE_POST_LIMIT, isUseCaseSlug, useCaseLabel } from '../lib/use-cases'

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
  // Edge-cache briefly for perf, but keep the stale window short so edits in the
  // admin appear on /blog within ~1-2 min (was s-maxage=300 + SWR=86400, which
  // could serve a stale listing for up to 24h on a low-traffic blog).
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { posts })
})

// GET /public/blog/posts/:slug — a single published post (full content)
publicBlogRouter.get('/posts/:slug', async (req: Request, res: Response) => {
  const post = await (prisma as any).blogPost.findFirst({
    where:   { slug: req.params.slug, status: 'published' },
    include: { author: { select: { name: true, title: true, photo_url: true, bio: true, linkedin_url: true } } },
  })
  if (!post) { err(res, 'NOT_FOUND', 'Post not found.', 404); return }
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { post })
})

// GET /public/blog/posts/:slug/related — up to 3 published posts in the same
// category (topic cluster), newest first, back-filled with other recent posts
// so the section is never empty. Powers internal interlinking on the article page.
publicBlogRouter.get('/posts/:slug/related', async (req: Request, res: Response) => {
  const CARD = {
    slug: true, title: true, excerpt: true, category: true,
    read_time_minutes: true, feature_image_url: true, publication_date: true,
  }
  const current = await (prisma as any).blogPost.findFirst({
    where: { slug: req.params.slug, status: 'published' },
    select: { category: true },
  })
  if (!current) { ok(res, { posts: [] }); return }

  const sameCategory = await (prisma as any).blogPost.findMany({
    where:   { status: 'published', category: current.category, slug: { not: req.params.slug } },
    orderBy: [{ publication_date: 'desc' }, { created_at: 'desc' }],
    take:    3,
    select:  CARD,
  })

  let posts = sameCategory
  if (posts.length < 3) {
    const seen = new Set([req.params.slug, ...posts.map((p: any) => p.slug)])
    const fillers = await (prisma as any).blogPost.findMany({
      where:   { status: 'published', slug: { notIn: [...seen] } },
      orderBy: [{ publication_date: 'desc' }, { created_at: 'desc' }],
      take:    3 - posts.length,
      select:  CARD,
    })
    posts = [...posts, ...fillers]
  }

  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { posts })
})

// GET /public/blog/use-cases/:slug — the posts allocated to one /uses page.
//
// The allocation is made by hand in the console (Blog -> post -> User case), stored on
// blog_posts.use_case_slugs, and capped at three because that is what the page shows. This
// is the read side of that: the /uses/<slug> page asks for its own three and renders them.
//
// Deliberately NOT back-filled with recent posts the way /related is. A related block at the
// foot of an article can take any nearby post and still be useful; a user case page is a
// specific argument, and padding it with whatever was published last would put unrelated
// writing under a heading that promises otherwise. Nine of the fourteen user cases have no
// posts allocated yet, so an empty list is a normal answer and the page hides the block.
publicBlogRouter.get('/use-cases/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug ?? '')
  if (!isUseCaseSlug(slug)) { err(res, 'NOT_FOUND', 'Unknown user case.', 404); return }

  const posts = await (prisma as any).blogPost.findMany({
    where:   { status: 'published', use_case_slugs: { has: slug } },
    orderBy: [{ publication_date: 'desc' }, { created_at: 'desc' }],
    take:    USE_CASE_POST_LIMIT,
    select: {
      slug: true, title: true, excerpt: true, category: true,
      read_time_minutes: true, feature_image_url: true, publication_date: true,
    },
  })
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { useCase: { slug, label: useCaseLabel(slug) }, posts })
})

// GET /public/blog/use-cases — every user case with its allocated posts, in one call.
// The theme build and any page that needs more than one case fetch this rather than making
// fourteen round trips.
publicBlogRouter.get('/use-cases', async (_req: Request, res: Response) => {
  const posts = await (prisma as any).blogPost.findMany({
    where:   { status: 'published', use_case_slugs: { isEmpty: false } },
    orderBy: [{ publication_date: 'desc' }, { created_at: 'desc' }],
    select: {
      slug: true, title: true, excerpt: true, category: true,
      read_time_minutes: true, feature_image_url: true, publication_date: true,
      use_case_slugs: true,
    },
  })
  const useCases = USE_CASES.map(uc => ({
    slug:  uc.slug,
    label: uc.label,
    posts: posts
      .filter((p: any) => (p.use_case_slugs ?? []).includes(uc.slug))
      .slice(0, USE_CASE_POST_LIMIT)
      .map(({ use_case_slugs, ...card }: any) => card),
  }))
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { useCases, limit: USE_CASE_POST_LIMIT })
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
