import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { clusterByKey } from '../data/collection-clusters'
import { shopImageUrl } from '../services/policy-shop/shopImage'

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

/** The six products a collection sells, priced and imaged from the live catalogue.
 *
 *  Resolved at read time rather than stored on the collection. A price copied into the page
 *  when it was written is a price that goes stale the first time one changes, and a
 *  collection page quoting a figure the checkout disagrees with costs the sale it was built
 *  to make. The cluster stores slugs; everything shown comes from the catalogue itself. */
// Same rule as the public training catalogue (routes/training-public.ts), so collection
// links resolve to the course page and basket items match checkout.
const topicSlug = (s: string): string =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')

async function productsFor(kind: string, clusterKey: string) {
  const cluster = clusterByKey(clusterKey)
  if (!cluster) return []

  if (kind === 'training') {
    const rows = await (prisma as any).trainingModule.findMany({
      where:  { tenant_id: null, tier: 'prebuilt', slug: { in: cluster.items } },
      select: { slug: true, name: true, description: true, image_key: true, topic_id: true },
    })
    // Clusters are curated by module slug (std-...), but the public course page, the
    // basket and checkout all key on the TOPIC slug (slugify(topic.title)). Linking the
    // module slug 404s and puts an unknown item in the basket.
    const topicIds = rows.map((r: any) => r.topic_id).filter(Boolean)
    const topics = topicIds.length
      ? await (prisma as any).trainingTopic.findMany({ where: { id: { in: topicIds } }, select: { id: true, title: true, shop_module_id: true } })
      : []
    const topicById = new Map((topics as any[]).map(t => [t.id, t]))
    const shopIds = (topics as any[]).map(t => t.shop_module_id).filter(Boolean)
    const accredited = new Set(shopIds.length
      ? ((await (prisma as any).trainingModule.findMany({ where: { id: { in: shopIds }, cpd_accredited: true }, select: { id: true } })) as any[]).map(m => m.id)
      : [])
    const by = new Map(rows.map((r: any) => [r.slug, r]))
    // Cluster order, not database order: the curation includes which one leads.
    return cluster.items.map(slug => by.get(slug)).filter(Boolean).map((m: any) => {
      const topic = topicById.get(m.topic_id) as any
      const slug = topic ? topicSlug(topic.title) : m.slug
      return {
        slug, title: topic?.title ?? m.name, description: m.description ?? '',
        price_pence: 2599,
        // Only a course CPD has actually certified may say so (CPD trademark rules).
        meta: topic?.shop_module_id && accredited.has(topic.shop_module_id) ? 'CPD Certified' : 'Online course',
        href: `/staff-training/${slug}`, image_url: shopImageUrl(m.image_key),
      }
    })
  }

  const rows = await (prisma as any).policyProduct.findMany({
    where:  { active: true, slug: { in: cluster.items } },
    select: { slug: true, title: true, description: true, price_pence: true, image_key: true, reference_keys: true },
  })
  const by = new Map(rows.map((r: any) => [r.slug, r]))
  return cluster.items.map(slug => by.get(slug)).filter(Boolean).map((p: any) => ({
    slug: p.slug, title: p.title, description: p.description,
    price_pence: p.price_pence,
    meta: `${(p.reference_keys ?? []).length} regulation${(p.reference_keys ?? []).length === 1 ? '' : 's'}`,
    href: `/care-policies/${p.slug}`, image_url: shopImageUrl(p.image_key),
  }))
}

// GET /public/collections/:slug — a single published collection, in full
publicCollectionsRouter.get('/:slug', async (req: Request, res: Response) => {
  const collection = await (prisma as any).collection.findFirst({
    where:  { slug: String(req.params.slug), status: 'published' },
    select: {
      slug: true, title: true, meta_title: true, meta_description: true, og_image_url: true,
      intro: true, images: true, body: true, links: true, faqs: true, updated_at: true,
      kind: true, cluster_key: true, eyebrow: true,
    },
  })
  if (!collection) { err(res, 'NOT_FOUND', 'Collection not found.', 404); return }
  const products = await productsFor(collection.kind, collection.cluster_key)
  res.setHeader('Cache-Control', 'public, max-age=60, s-maxage=300, stale-while-revalidate=86400')
  ok(res, { collection: { ...collection, products } })
})
