import Link from 'next/link'
import type { Metadata } from 'next'
import { ArrowRight } from 'lucide-react'
import { SiteImage } from '@/components/site-image'
import { SITE_URL } from '@/lib/schema'

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface CollectionCard {
  slug: string
  title: string
  meta_description: string | null
  intro: string
  images: Array<{ url: string; alt: string }>
}

async function getCollections(): Promise<CollectionCard[]> {
  try {
    const res = await fetch(`${API_URL}/public/collections`, { next: { revalidate: 60 } })
    if (!res.ok) return []
    const body = await res.json()
    return (body?.data?.collections ?? []) as CollectionCard[]
  } catch {
    return []
  }
}

export const metadata: Metadata = {
  title: { absolute: 'Collections | CareStreamAI' },
  description: 'Browse our collections of guides and resources for care providers.',
  alternates: { canonical: `${SITE_URL}/collections` },
}

function stripHtml(html: string, max = 160): string {
  const text = html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
  return text.length > max ? `${text.slice(0, max).trimEnd()}…` : text
}

export default async function CollectionsIndexPage() {
  const collections = await getCollections()

  return (
    <section className="mx-auto max-w-content px-6 py-16 md:py-20">
      <h1 className="mb-3 text-4xl font-extrabold leading-tight text-neutral-dark md:text-5xl">Collections</h1>
      <p className="mb-12 max-w-2xl text-lg leading-relaxed text-neutral-mid">
        Curated guides and resources, grouped by topic.
      </p>

      {collections.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-300 bg-neutral-light/40 px-6 py-10 text-center text-sm text-neutral-mid">
          No collections yet. Check back soon.
        </p>
      ) : (
        <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
          {collections.map((c) => {
            const cover = c.images?.[0]?.url
            const summary = c.meta_description || stripHtml(c.intro || '')
            return (
              <Link
                key={c.slug}
                href={`/collections/${c.slug}`}
                className="group flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card transition-shadow hover:shadow-card-hover"
              >
                {cover && (
                  <div className="aspect-[16/10] w-full overflow-hidden">
                    <SiteImage src={cover} alt={c.images[0]?.alt ?? c.title} className="h-full w-full object-cover transition-transform group-hover:scale-[1.02]" />
                  </div>
                )}
                <div className="flex flex-1 flex-col p-5">
                  <h2 className="mb-2 text-lg font-bold text-neutral-dark">{c.title}</h2>
                  {summary && <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-neutral-mid">{summary}</p>}
                  <span className="mt-auto inline-flex items-center gap-1.5 text-sm font-semibold text-teal">
                    View collection <ArrowRight size={15} className="transition-transform group-hover:translate-x-0.5" />
                  </span>
                </div>
              </Link>
            )
          })}
        </div>
      )}
    </section>
  )
}
