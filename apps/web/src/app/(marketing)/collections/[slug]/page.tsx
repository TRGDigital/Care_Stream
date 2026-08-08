import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { BlogFaqs } from '@/components/marketing/blog-faqs'
import { SiteImage } from '@/components/site-image'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema } from '@/lib/schema'
import { SITE_URL } from '@/lib/schema'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface CollectionImage { url: string; alt: string }
interface CollectionLink { label: string; url: string }
interface Faq { question: string; answer: string }
interface Collection {
  slug: string
  title: string
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  intro: string
  images: CollectionImage[]
  body: string
  links: CollectionLink[]
  faqs: Faq[]
}

async function getCollection(slug: string): Promise<Collection | null> {
  try {
    const res = await fetch(`${API_URL}/public/collections/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    const body = await res.json()
    return (body?.data?.collection ?? null) as Collection | null
  } catch {
    return null
  }
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const c = await getCollection(slug)
  if (!c) return { title: 'Collection not found' }
  const title = c.meta_title || c.title
  const description = c.meta_description || ''
  const image = c.og_image_url || c.images?.[0]?.url
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/collections/${c.slug}` },
    openGraph: {
    type: 'website',
      title,
      description,
      url: `${SITE_URL}/collections/${c.slug}`,
      ...(image ? { images: [image] } : {}),
    },
    ...(image ? { twitter: { card: 'summary_large_image', title, description, images: [image] } } : {}),
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await getCollection(slug)
  if (!c) notFound()

  const images = Array.isArray(c.images) ? c.images.filter(i => i.url) : []
  const links = Array.isArray(c.links) ? c.links.filter(l => l.label && l.url) : []
  const faqs = Array.isArray(c.faqs) ? c.faqs.filter(f => f.question && f.answer) : []

  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}

      <article className="mx-auto max-w-content px-6 py-16 md:py-20">
        {/* Breadcrumb */}
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-neutral-mid">
          <Link href="/collections" className="hover:text-teal">Collections</Link>
          <span>/</span>
          <span className="text-neutral-dark">{c.title}</span>
        </div>

        {/* Heading + intro */}
        <h1 className="mb-5 max-w-3xl text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">
          {c.title}
        </h1>
        {c.intro && (
          <div
            className="prose prose-lg max-w-3xl text-neutral-mid prose-a:text-teal prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: c.intro }}
          />
        )}

        {/* Image grid */}
        {images.length > 0 && (
          <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {images.map((img, i) => (
              <div key={i} className="overflow-hidden rounded-2xl border border-gray-100 shadow-card">
                <div className="aspect-[4/3] w-full">
                  <SiteImage
                    src={img.url}
                    alt={img.alt}
                    fill={false}
                    className="h-full w-full object-cover"
                  />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Body content */}
        {c.body && (
          <div
            className="prose prose-lg mt-12 max-w-3xl text-neutral-mid prose-headings:font-bold prose-headings:text-neutral-dark prose-a:text-teal prose-a:no-underline hover:prose-a:underline"
            dangerouslySetInnerHTML={{ __html: c.body }}
          />
        )}

        {/* Page links */}
        {links.length > 0 && (
          <div className="mt-14 border-t border-gray-100 pt-10">
            <h2 className="mb-6 text-2xl font-extrabold text-neutral-dark">Explore more</h2>
            <div className="grid gap-3 sm:grid-cols-2">
              {links.map((l, i) => {
                const external = /^https?:\/\//.test(l.url)
                const className = 'group flex items-center justify-between gap-3 rounded-xl border border-gray-200 bg-white px-5 py-4 text-neutral-dark shadow-card transition-colors hover:border-teal/40 hover:bg-teal-light/30'
                const inner = (
                  <>
                    <span className="font-semibold">{l.label}</span>
                    <ArrowRight size={16} className="shrink-0 text-teal transition-transform group-hover:translate-x-0.5" />
                  </>
                )
                return external ? (
                  <a key={i} href={l.url} target="_blank" rel="noreferrer" className={className}>{inner}</a>
                ) : (
                  <Link key={i} href={l.url} className={className}>{inner}</Link>
                )
              })}
            </div>
          </div>
        )}

        {/* FAQs */}
        {faqs.length > 0 && <BlogFaqs faqs={faqs} />}
      </article>
    </>
  )
}
