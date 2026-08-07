import type { Metadata } from 'next'
import Link from 'next/link'
import { ArrowRight } from 'lucide-react'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema, serviceSchema, SITE_URL } from '@/lib/schema'
import {
  FeatureSimplePage,
  featureContentFromData,
  type FeaturePageContent,
} from '@/components/marketing/feature-page'

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
    const res = await fetch(`${API_URL}/public/feature-pages/${slug}`, { next: { revalidate: 60 } })
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
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/features/${fp.slug}` },
    openGraph: {
      title,
      description,
      url: `${SITE_URL}/features/${fp.slug}`,
      ...(fp.og_image_url ? { images: [fp.og_image_url] } : {}),
    },
    ...(fp.og_image_url ? { twitter: { card: 'summary_large_image', title, description, images: [fp.og_image_url] } } : {}),
  }
}

async function getRelatedFeatures(currentSlug: string): Promise<Array<{ slug: string; title: string }>> {
  try {
    const res = await fetch(`${API_URL}/public/feature-pages`, { next: { revalidate: 900 } })
    if (!res.ok) return []
    const items = ((await res.json())?.data?.featurePages ?? []) as Array<{ slug: string; title: string }>
    const list = items.filter((f) => f.slug)
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

export default async function DbFeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fp = await getFeaturePage(slug)
  if (!fp) notFound()

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
