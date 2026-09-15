import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { JsonLd } from '@/components/json-ld'
import { PreviewBanner } from '@/components/marketing/preview-banner'
import { previewParam, isPreview } from '@/lib/preview'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
import { DEFAULT_OG_IMAGE, absoluteImage } from '@/lib/page-meta'
import {
  UserCasePageView,
  type UserCasePage,
  type ReadNextPost,
} from '@/components/marketing/user-case-page'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

async function getPage(slug: string): Promise<UserCasePage | null> {
  try {
    // In preview the token asks the API for the draft, and the response must not be cached:
    // a cached draft would be served to the next visitor asking for the published page.
    const q = await previewParam()
    const res = await fetch(`${API_URL}/public/user-cases/${slug}${q}`,
      q ? { cache: 'no-store' } : { next: { revalidate: 60 } })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.data?.page ?? null) as UserCasePage | null
  } catch {
    return null
  }
}

// The blog posts allocated to this user case in the console. A failure here must not take the
// page down with it: the argument the page makes stands on its own, and the reading list is an
// addition to it.
async function getReadNext(slug: string): Promise<ReadNextPost[]> {
  try {
    const res = await fetch(`${API_URL}/public/blog/use-cases/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const body = await res.json()
    return (body?.data?.posts ?? []) as ReadNextPost[]
  } catch {
    return []
  }
}

const plain = (s: string) => (s || '').replace(/<[^>]*>/g, '').trim()

export async function generateMetadata(
  { params }: { params: Promise<{ slug: string }> },
): Promise<Metadata> {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) return { title: 'Not found' }

  const p = page as UserCasePage & { meta_title?: string; meta_description?: string; og_image_url?: string }
  const title = p.meta_title || `${plain(page.title)} | CareStreamAI`
  const description = p.meta_description || page.content?.lede || ''
  // Same chain as the rest of the site: the value set by hand, then the page's own hero, then
  // the branded card.
  const image = absoluteImage(p.og_image_url) || absoluteImage(page.hero_image_url) || DEFAULT_OG_IMAGE

  return {
    title: { absolute: title },
    description,
    // A preview is an unpublished page. Even though the link is short-lived, it must never be
    // indexed if a crawler somehow follows one.
    ...(await isPreview() ? { robots: { index: false, follow: false } } : {}),
    alternates: { canonical: `${SITE_URL}/uses/${slug}` },
    openGraph: {
      type: 'website',
      title,
      description,
      url: `${SITE_URL}/uses/${slug}`,
      images: [image],
    },
    twitter: { card: 'summary_large_image', title, description, images: [image] },
  }
}

export default async function UserCaseRoute({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const page = await getPage(slug)
  if (!page) notFound()

  const readNext = await getReadNext(slug)
  // The page's own FAQs, flattened out of their display groups for the structured data, which
  // has no concept of a group.
  const faqs = (page.faqs ?? []).flatMap(g => g.items ?? [])
    .filter(f => f.question?.trim() && f.answer?.trim())

  const preview = await isPreview()
  return (
    <>
      {preview && <PreviewBanner path={`/uses/${slug}`} />}
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}
      <UserCasePageView page={page} readNext={readNext} />
    </>
  )
}
