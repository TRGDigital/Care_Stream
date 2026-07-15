import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
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

export default async function DbFeaturePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const fp = await getFeaturePage(slug)
  if (!fp) notFound()

  const faqs = Array.isArray(fp.faqs) ? fp.faqs.filter(f => f.question && f.answer) : []
  const content = featureContentFromData(fp.title, fp.content, faqs)

  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}
      <FeatureSimplePage content={content} />
    </>
  )
}
