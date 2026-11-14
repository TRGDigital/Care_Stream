import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { AUDIT_PAGES, AUDIT_PAGE_BY_SLUG } from '@/lib/audit-pages'
import { AuditProductPage } from '@/components/marketing/audit-product-page'

// One product page per audit that has a data file in lib/audit-pages. Anything else is a 404.
export const dynamicParams = false
export function generateStaticParams() {
  return AUDIT_PAGES.map(p => ({ slug: p.slug }))
}

export function generateMetadata({ params }: { params: { slug: string } }): Metadata {
  const p = AUDIT_PAGE_BY_SLUG.get(params.slug)
  if (!p) return {}
  const url = `https://www.carestreamai.com/care-audits/${p.slug}`
  return {
    title: p.seo_title,
    description: p.meta_description,
    alternates: { canonical: url },
    openGraph: { type: 'website', title: p.seo_title, description: p.meta_description, url },
  }
}

export default function AuditPage({ params }: { params: { slug: string } }) {
  const p = AUDIT_PAGE_BY_SLUG.get(params.slug)
  if (!p) notFound()
  return <AuditProductPage page={p} />
}
