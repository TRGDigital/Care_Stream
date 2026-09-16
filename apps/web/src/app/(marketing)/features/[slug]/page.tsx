import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema, serviceSchema, SITE_URL } from '@/lib/schema'
import { DEFAULT_OG_IMAGE, absoluteImage } from '@/lib/page-meta'
import { heroImageFor } from '@/lib/hero-images'
import { previewParam } from '@/lib/preview'
import { FeaturePageV2, type FeatureV2Content } from '@/components/marketing/feature-page-v2'
import { WebChatPageV2 } from '@/components/marketing/web-chat-page-v2'
import {
  FeatureSimplePage,
  featureContentFromData,
  type FeaturePageContent,
} from '@/components/marketing/feature-page'
import { isV2 } from '@/lib/v2-rollout'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface Faq { question: string; answer: string }
interface FeaturePage {
  slug: string
  title: string
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  content: FeaturePageContent
  faqs: Faq[]
}

async function getFeaturePage(slug: string): Promise<FeaturePage | null> {
  try {
    const q = await previewParam()
    const res = await fetch(`${API_URL}/public/feature-pages/${slug}${q}`,
      q ? { cache: 'no-store' } : { next: { revalidate: 60 } })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.data?.featurePage ?? null) as FeaturePage | null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const fp = await getFeaturePage(slug)
  if (!fp) return { title: 'Feature not found' }
  const title = fp.meta_title || `${fp.title} | CareStreamAI`
  const description = fp.meta_description || fp.content?.intro || ''
  // This route builds its own metadata rather than going through pageMetadata(), so it did
  // not pick up the hero fallback and all 43 feature pages shared the one branded card.
  // Same chain as everywhere else: the Pages value, then the page's hero, then the card.
  const image = absoluteImage(fp.og_image_url) || absoluteImage(heroImageFor(`/features/${fp.slug}`)) || DEFAULT_OG_IMAGE
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/features/${fp.slug}` },
    openGraph: {
    type: 'website',
      title,
      description,
      url: `${SITE_URL}/features/${fp.slug}`,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

async function getRelatedFeatures(currentSlug: string): Promise<Array<{ slug: string; title: string }>> {
  try {
    const res = await fetch(`${API_URL}/public/feature-pages`, { next: { revalidate: 900 } })
    if (!res.ok) return []
    const items = ((await res.json())?.data?.featurePages ?? []) as Array<{ slug: string; title: string }>
    // Include static (non-DB) feature pages in the pool so they also receive
    // dofollow links rather than being orphaned with a single incoming link.
    const STATIC_FEATURES = [{ slug: 'web-chat-interface', title: 'Web chat interface' }]
    const known = new Set(items.map((f) => f.slug))
    const list = [...items.filter((f) => f.slug), ...STATIC_FEATURES.filter((f) => !known.has(f.slug))]
    const i = list.findIndex((f) => f.slug === currentSlug)
    // Take the next 6 after this page, wrapping — so links distribute across the set.
    const start = i >= 0 ? i + 1 : 0
    const picked: Array<{ slug: string; title: string }> = []
    for (let k = 0; k < list.length && picked.length < 6; k++) {
      const f = list[(start + k) % list.length]
      if (f.slug !== currentSlug) picked.push(f)
    }
    return picked
  } catch {
    return []
  }
}

export default async function DbFeaturePage(
  { params, searchParams }: {
    params: Promise<{ slug: string }>
    searchParams: Promise<Record<string, string | string[] | undefined>>
  },
) {
  const { slug } = await params
  const fp = await getFeaturePage(slug)
  if (!fp) notFound()

  // The rebuilt theme template is opt-in with ?v2=1 until it is signed off. Switching the live
  // pages on merge is exactly the kind of change that has to be looked at before it happens,
  // not after; this way the new design can be read on any real page, with its real content,
  // while the live page is untouched. Flipping it is then a one-line change.
  //
  // EXCEPT for cluster pages, which always use it. A cluster is an assembly of its child
  // capabilities and holds no body content of its own, so the old template renders its hero
  // and then an empty "What it is" section. That is not a preference about design, it is a
  // page with nothing on it, and the eight of them are live. The new template is the only one
  // that can render this page type at all.
  const sp = await searchParams
  const caps = (fp.content as { capabilities?: string[] } | null)?.capabilities ?? []

  // One page the theme hand-built with its own design rather than the shared feature layout.
  // It reads the same feature_pages.content as every other feature page; only the markup
  // differs, so its copy stays where all the other feature copy is.
  if (await isV2('features', sp) && slug === 'web-chat-interface') {
    return (
      <WebChatPageV2 page={{
        title: fp.title,
        content: (fp.content ?? {}) as FeatureV2Content & { stepImages?: string[] },
        faqs: Array.isArray(fp.faqs) ? fp.faqs : [],
      }} />
    )
  }

  if (await isV2('features', sp) || caps.length > 0) {
    const [children, relatedV2] = await Promise.all([
      Promise.all(caps.map(getFeaturePage)).then(r => r.filter(Boolean)),
      getRelatedFeatures(slug),
    ])
    return (
      <FeaturePageV2 page={{
        slug,
        title: fp.title,
        content: (fp.content ?? {}) as FeatureV2Content,
        faqs: Array.isArray(fp.faqs) ? fp.faqs : [],
        // A cluster's questions are its children's questions, grouped under each capability,
        // so the children have to bring their own faqs across and not just their content.
        capabilities: children.map(c => ({
          slug: c!.slug, title: c!.title, content: (c!.content ?? {}) as FeatureV2Content,
          faqs: Array.isArray(c!.faqs) ? c!.faqs : [],
        })),
        related: relatedV2,
      }} />
    )
  }

  const faqs = Array.isArray(fp.faqs) ? fp.faqs.filter(f => f.question && f.answer) : []
  const content = featureContentFromData(fp.title, fp.content, faqs)
  const related = await getRelatedFeatures(slug)

  return (
    <>
      <JsonLd data={serviceSchema({
        name: fp.title,
        description: fp.meta_description || `${fp.title} — part of the CareStreamAI compliance platform for UK care providers.`,
        path: `/features/${slug}`,
      })} />
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}
      <FeatureSimplePage content={content} />
      {related.length > 0 && (
        <section className="bg-neutral-light py-16">
          <div className="mx-auto max-w-content px-6">
            <h2 className="mb-2 text-2xl font-extrabold text-neutral-dark md:text-3xl">Explore more features</h2>
            <p className="mb-8 max-w-2xl text-neutral-mid">More of what the CareStream compliance platform does for UK care providers.</p>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {related.map((r) => (
                <Link
                  key={r.slug}
                  href={`/features/${r.slug}`}
                  className="group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white p-5 transition-colors hover:border-teal"
                >
                  <span className="font-semibold text-neutral-dark group-hover:text-teal">{r.title}</span>
                  <ArrowRight size={16} className="shrink-0 text-neutral-mid group-hover:text-teal" />
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  )
}
