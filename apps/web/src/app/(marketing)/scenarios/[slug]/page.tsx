import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { PageBreadcrumbJsonLd } from '@/components/page-breadcrumb-json-ld'
import { KeywordHighlighter } from '@/components/marketing/keyword-highlighter'
import { ScenarioPageView } from '@/components/marketing/scenario-page'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
import { DEFAULT_OG_IMAGE, absoluteImage } from '@/lib/page-meta'
import { plainText } from '@/lib/scenarios'
import { getScenarioReadNext } from '@/lib/scenario-readnext'
import { publishedScenarios } from '@/data/scenarios'
import { getPublishedScenarioAsync } from '@/lib/scenarios-db'

export const revalidate = 300
// Pages published from the platform after the last deploy are rendered on first visit and cached for five minutes.
export const dynamicParams = true

export function generateStaticParams() {
  return publishedScenarios().map(s => ({ slug: s.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const s = await getPublishedScenarioAsync(slug)
  if (!s) return { title: 'Not found' }
  const image = absoluteImage(s.image) || DEFAULT_OG_IMAGE
  return {
    title: { absolute: s.meta_title },
    description: s.meta_description,
    alternates: { canonical: `${SITE_URL}/scenarios/${slug}` },
    openGraph: { type: 'website', title: s.meta_title, description: s.meta_description, url: `${SITE_URL}/scenarios/${slug}`, images: [image] },
    twitter: { card: 'summary_large_image', title: s.meta_title, description: s.meta_description, images: [image] },
  }
}

export default async function ScenarioRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const s = await getPublishedScenarioAsync(slug)
  if (!s) notFound()
  const readNext = await getScenarioReadNext(s.read_next)
  const faqs = s.faqs.groups.flatMap(g => g.items).map(f => ({ question: f.q, answer: plainText(f.a) }))
  return (
    <>
      <PageBreadcrumbJsonLd trail={[{ name: 'Scenarios', path: '/scenarios' }, { name: plainText(s.title), path: `/scenarios/${slug}` }]} />
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}
      <ScenarioPageView s={s} readNext={readNext} />
      <KeywordHighlighter slug={s.slug} keywords={{ primary: s.primary_keyword, secondary: s.secondary_keywords }} />
    </>
  )
}
