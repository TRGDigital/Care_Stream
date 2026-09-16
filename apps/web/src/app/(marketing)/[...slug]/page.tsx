import { notFound } from 'next/navigation'
import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema } from '@/lib/schema'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface CmsFaq { question?: string | null; answer?: string | null }

// Renders any CMS page (managed in the platform Pages tab) that has body content,
// at its own path — so new content pages appear without adding a route each time.
async function fetchPage(path: string): Promise<{ title?: string; description?: string; content?: string; faqs?: CmsFaq[] | null } | null> {
  try {
    const res = await fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(path)}`, {
      next: { revalidate: 60 },
    })
    if (res.ok) {
      const body = await res.json()
      return body?.data?.page ?? null
    }
  } catch {
    // fall through
  }
  return null
}

const stripBrand = (t?: string) => (t || '').replace(/\s*\|\s*CareStream\s*$/i, '').trim()

function prettify(slug: string[]) {
  return slug.join(' ').replace(/[-_]/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase())
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const page = await fetchPage(path)
  return pageMetadata(path, {
    title: page?.title || `${prettify(slug)} | CareStream`,
    description: page?.description || '',
  })
}

export default async function CmsPage(
  { params, searchParams }: {
    params: Promise<{ slug: string[] }>
    searchParams?: Promise<Record<string, string | string[] | undefined>>
  },
) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const page = await fetchPage(path)

  // Only render published pages that actually have body content.
  if (!page || !page.content || !page.content.trim()) notFound()

  const faqs = (page.faqs ?? [])
    .filter((f): f is { question: string; answer: string } => Boolean(f?.question?.trim() && f?.answer?.trim()))

  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}
      {/* Opt-in with ?v2=1 until it is signed off. The stored body is the same either way:
          the flag changes the design and nothing about the words. This reaches
          /client-services-agreement, which is a CMS page rather than a route of its own. */}
      <ContentPage path={path} title={stripBrand(page.title) || prettify(slug)}
                   v2={(await searchParams)?.v2 === '1'} />
    </>
  )
}
