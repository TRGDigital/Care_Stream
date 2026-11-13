import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { downloadFile } from '../services/storage/s3'
import { ok, err } from '../lib/response'
import { clusterInfo, CLUSTER_LINK_CAP } from '../lib/topic-clusters'
import { verifyCollectionPreview } from '../lib/collection-preview'
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
      updated_at:        true,   // the sitemap's lastmod
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

// GET /public/blog/cluster/:cluster?exclude=slug  the related-content block for one topic cluster.
// Never more than CLUSTER_LINK_CAP links in total: the cluster's collections first, then the newest
// posts. When there are more pages than fit, the last slot becomes a link to the cluster hub.
async function clusterItems(cluster: string, exclude: string, includeDrafts = false) {
  const status = includeDrafts ? { in: ['published', 'draft'] } : 'published'
  const [collections, posts] = await Promise.all([
    (prisma as any).collection.findMany({
      where: { status, topic_cluster: cluster, slug: { not: exclude } },
      orderBy: { updated_at: 'desc' }, select: { slug: true, title: true, status: true },
    }),
    (prisma as any).blogPost.findMany({
      where: { status, topic_cluster: cluster, slug: { not: exclude } },
      orderBy: [{ publication_date: 'desc' }, { created_at: 'desc' }], select: { slug: true, title: true, status: true },
    }),
  ])
  return [
    ...collections.slice(0, 3).map((c: any) => ({ title: c.title, url: `/collection/${c.slug}`, kind: 'collection', draft: c.status !== 'published' })),
    ...posts.map((p: any) => ({ title: p.title, url: `/blog/${p.slug}`, kind: 'post', draft: p.status !== 'published' })),
    ...collections.slice(3).map((c: any) => ({ title: c.title, url: `/collection/${c.slug}`, kind: 'collection', draft: c.status !== 'published' })),
  ]
}

publicBlogRouter.get('/cluster/:cluster', async (req: Request, res: Response) => {
  const key = String(req.params.cluster).toLowerCase().replace(/[^a-z0-9-]/g, '')
  const exclude = String(req.query.exclude ?? '')
  // A valid signed preview link for the page being viewed also lists the cluster's drafts.
  const all = await clusterItems(key, exclude, verifyCollectionPreview(req.query.preview, exclude))
  // ?limit=6 for collection pages (fewer exits next to the buy buttons); never above the 10 link cap.
  const limit = Math.min(CLUSTER_LINK_CAP, Math.max(2, Number(req.query.limit) || CLUSTER_LINK_CAP))
  const more = all.length > limit
  const items = more ? all.slice(0, limit - 1) : all
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  ok(res, { cluster: clusterInfo(key), items, total: all.length, hub_url: more ? `/topics/${key}` : null })
})

// GET /public/blog/cluster/:cluster/all  every published page in the cluster (the hub page).
publicBlogRouter.get('/cluster/:cluster/all', async (req: Request, res: Response) => {
  const key = String(req.params.cluster).toLowerCase().replace(/[^a-z0-9-]/g, '')
  const items = await clusterItems(key, '')
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=300, stale-while-revalidate=600')
  ok(res, { cluster: clusterInfo(key), items })
})

// GET /public/blog/posts/:slug — a single published post (full content)
publicBlogRouter.get('/posts/:slug', async (req: Request, res: Response) => {
  const post = await (prisma as any).blogPost.findFirst({
    where:   { slug: req.params.slug, status: 'published' },
    include: { author: { select: { name: true, title: true, photo_url: true, bio: true, linkedin_url: true } } },
  })
  if (!post) { err(res, 'NOT_FOUND', 'Post not found.', 404); return }
  // The target keywords are our SEO working notes: platform only, never in the public API.
  const { primary_keyword: _pk, secondary_keywords: _sk, ...publicPost } = post
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { post: publicPost })
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
