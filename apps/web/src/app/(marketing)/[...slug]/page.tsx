import { notFound } from 'next/navigation'
import { ContentPage } from '@/components/marketing/content-page'
import { pageMetadata } from '@/lib/page-meta'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Renders any CMS page (managed in the platform Pages tab) that has body content,
// at its own path — so new content pages appear without adding a route each time.
async function fetchPage(path: string): Promise<{ title?: string; description?: string; content?: string } | null> {
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

export default async function CmsPage({ params }: { params: Promise<{ slug: string[] }> }) {
  const { slug } = await params
  const path = '/' + slug.join('/')
  const page = await fetchPage(path)

  // Only render published pages that actually have body content.
  if (!page || !page.content || !page.content.trim()) notFound()

  return <ContentPage path={path} title={stripBrand(page.title) || prettify(slug)} />
}
