import Link from 'next/link'
import { notFound } from 'next/navigation'
import type { Metadata } from 'next'
import { BlogFaqs } from '@/components/marketing/blog-faqs'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema, SITE_URL } from '@/lib/schema'
import { CollectionIntro } from '@/components/marketing/collection-intro'

// An ecommerce-style collection page: copy, the six products it sells, deeper copy, FAQs,
// sibling links, then the services banner. The order is the order a visitor needs it in.
// Someone arrives from "care home fire safety policy", and the page has to answer the
// search, show what is for sale, and give them somewhere else to go.
//
// The copy above the grid is short on purpose and clamps to two lines. A wall of text
// before the products is how a collection page loses the person who already knew what they
// wanted; the depth sits below the grid, where the people who scroll will read it.
//
// Prices and images come from the catalogue at request time, never from the collection
// record. A price written into the page goes stale the first time one changes, and a page
// quoting a figure the checkout disagrees with costs the sale it exists to make.

export const revalidate = 60

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface CollectionLink { label: string; url: string }
interface Faq { question: string; answer: string }
interface CollectionProduct {
  slug: string
  title: string
  description: string
  price_pence: number
  meta: string
  href: string
  image_url: string | null
}
interface Collection {
  slug: string
  title: string
  eyebrow: string
  kind: 'policies' | 'training'
  meta_title: string | null
  meta_description: string | null
  og_image_url: string | null
  intro: string
  body: string
  links: CollectionLink[]
  faqs: Faq[]
  products: CollectionProduct[]
}

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

async function getCollection(slug: string): Promise<Collection | null> {
  try {
    const res = await fetch(`${API_URL}/public/collections/${slug}`, { next: { revalidate: 60 } })
    if (!res.ok) return null
    return ((await res.json())?.data?.collection ?? null) as Collection | null
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
  const image = c.og_image_url || c.products?.[0]?.image_url || undefined
  return {
    title: { absolute: title },
    description,
    alternates: { canonical: `${SITE_URL}/collection/${c.slug}` },
    openGraph: {
      type: 'website', title, description,
      url: `${SITE_URL}/collection/${c.slug}`,
      ...(image ? { images: [image] } : {}),
    },
    ...(image ? { twitter: { card: 'summary_large_image', title, description, images: [image] } } : {}),
  }
}

export default async function CollectionPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const c = await getCollection(slug)
  if (!c) notFound()

  const links = Array.isArray(c.links) ? c.links.filter(l => l.label && l.url) : []
  const faqs = Array.isArray(c.faqs) ? c.faqs.filter(f => f.question && f.answer) : []
  const products = Array.isArray(c.products) ? c.products : []
  const isTraining = c.kind === 'training'

  return (
    <>
      {faqs.length > 0 && <JsonLd data={faqPageSchema(faqs)} />}

      {/* ── Copy above the grid ── */}
      <section className="bg-white pt-14 pb-4">
        <div className="mx-auto max-w-content px-6">
          <p className="text-xs font-bold uppercase tracking-[0.13em] text-teal">{c.eyebrow}</p>
          <h1 className="mt-2 max-w-4xl text-4xl font-extrabold leading-tight tracking-tight text-neutral-dark md:text-5xl">
            {c.title}
          </h1>
          {c.intro && <CollectionIntro html={c.intro} />}

          <ul className="mt-5 flex flex-wrap gap-x-6 gap-y-2">
            {[`${products.length} in this collection`,
              'Written for your service, not a template',
              isTraining ? 'Recorded against the standard it satisfies'
                         : 'Checked against the law before it carries your name',
            ].map(t => (
              <li key={t} className="flex items-center gap-2 text-sm text-neutral-mid">
                <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 shrink-0 stroke-teal" fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                {t}
              </li>
            ))}
          </ul>

          {links.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {links.map((l, i) => (
                <Link key={i} href={l.url}
                  className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm text-neutral-dark transition hover:border-teal">
                  {l.label}
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* ── The grid. Three per row so a product is big enough to read. ── */}
      {products.length > 0 && (
        <section className="bg-white pb-14">
          <div className="mx-auto max-w-content px-6">
            <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {products.map(p => (
                <div key={p.slug} className="flex flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition hover:border-teal hover:shadow-card">
                  <Link href={p.href} className="block aspect-[16/9] overflow-hidden bg-neutral-light">
                    {p.image_url
                      ? <img src={p.image_url} alt="" className="h-full w-full object-cover" />
                      : <span className="flex h-full items-center justify-center text-[11px] uppercase tracking-widest text-neutral-mid">No image</span>}
                  </Link>
                  <div className="flex flex-1 flex-col p-5">
                    <Link href={p.href} className="text-lg font-bold leading-snug text-neutral-dark hover:text-teal">
                      {p.title}
                    </Link>
                    {/* Clamped: a policy description is a line and a module summary is a
                        paragraph, and an uneven grid reads as a broken one. */}
                    <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-neutral-mid">{p.description}</p>
                    <div className="mt-4 flex items-baseline justify-between">
                      <span className="text-xl font-extrabold tracking-tight text-neutral-dark">{money(p.price_pence)}</span>
                      <span className="text-xs text-neutral-mid">{p.meta}</span>
                    </div>
                    <Link href={p.href}
                      className="mt-4 inline-flex items-center justify-center gap-2 rounded-xl bg-neutral-dark px-4 py-3 text-sm font-semibold text-white transition hover:opacity-90">
                      <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
                        <path d="M3 4h2.2l2.3 10.5h10.2L20 7.5H6" />
                      </svg>
                      {isTraining ? 'View module' : 'View policy'}
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {/* ── The depth, below the grid ── */}
      {c.body && (
        <section className="border-y border-gray-100 bg-neutral-light/40 py-14">
          <div className="mx-auto max-w-content px-6">
            <div
              className="prose max-w-none text-neutral-mid prose-headings:text-neutral-dark prose-a:text-teal prose-a:no-underline hover:prose-a:underline"
              dangerouslySetInnerHTML={{ __html: c.body }}
            />
          </div>
        </section>
      )}

      {faqs.length > 0 && <BlogFaqs faqs={faqs} />}

      {/* ── The services banner: the one place we talk about ourselves ── */}
      <section className="bg-white py-14">
        <div className="mx-auto max-w-content px-6">
          <div className="grid gap-8 rounded-3xl bg-gradient-to-br from-[#2B1B47] to-[#4A2D7A] p-10 text-white lg:grid-cols-[1.4fr_1fr] lg:items-center">
            <div>
              <h2 className="text-2xl font-extrabold tracking-tight md:text-3xl">
                {isTraining ? 'Training is one part of it.' : 'Policies are one part of it.'}
              </h2>
              <p className="mt-3 max-w-2xl text-white/80">
                CareStream is the compliance system underneath: your policies, your staff training,
                your audits and your evidence, kept current and ready for the day somebody asks to
                see them.
              </p>
              <div className="mt-5 flex flex-wrap gap-3">
                <Link href="/pricing" className="rounded-xl bg-white px-5 py-3 text-sm font-bold text-[#2B1B47]">See pricing</Link>
                <Link href="/book-a-demo" className="rounded-xl border border-white/30 px-5 py-3 text-sm font-semibold text-white">Book a demo</Link>
              </div>
            </div>
            <ul className="space-y-3">
              {['Policies written and kept updated for you',
                'Staff training that records itself against the standard',
                'Gap analysis showing what you are missing before an inspector does',
                'Everything in one place, for one price'].map(t => (
                <li key={t} className="flex items-start gap-2.5 text-sm text-white/90">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 stroke-white" fill="none" strokeWidth={2.6} strokeLinecap="round" strokeLinejoin="round"><path d="M4 12.5 9.5 18 20 6.5" /></svg>
                  {t}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>
    </>
  )
}
