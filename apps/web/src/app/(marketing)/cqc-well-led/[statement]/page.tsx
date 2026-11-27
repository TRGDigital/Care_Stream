import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { PageBreadcrumbJsonLd } from '@/components/page-breadcrumb-json-ld'
import { WellLedPageView } from '@/components/marketing/well-led-page'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
import { WL_PAGES, wlPage } from '@/lib/well-led-pages'

export const dynamicParams = false
export function generateStaticParams() { return WL_PAGES.map(p => ({ statement: p.slug })) }

const plain = (h: string) => h.replace(/<[^>]+>/g, '')

export async function generateMetadata({ params }: { params: Promise<{ statement: string }> }): Promise<Metadata> {
  const { statement } = await params
  const p = wlPage(statement)
  if (!p) return { title: 'Not found' }
  const url = `${SITE_URL}/cqc-well-led/${p.slug}`
  return {
    title: { absolute: p.meta_title },
    description: p.meta_description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: p.meta_title, description: p.meta_description, url, images: [p.image] },
    twitter: { card: 'summary_large_image', title: p.meta_title, description: p.meta_description, images: [p.image] },
  }
}

export default async function WellLedStatementRoute({ params }: { params: Promise<{ statement: string }> }) {
  const { statement } = await params
  const p = wlPage(statement)
  if (!p) notFound()
  return (
    <>
      <PageBreadcrumbJsonLd trail={[{ name: 'CQC Well-led', path: '/cqc-well-led' }, { name: p.cqcName, path: `/cqc-well-led/${p.slug}` }]} />
      <JsonLd data={faqPageSchema(p.faqs.map(f => ({ question: f.q, answer: plain(f.a) })))} />
      <WellLedPageView p={p} />
    </>
  )
}
