import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ShieldCheck, CheckCircle2, FileText, Scale, Star,
} from 'lucide-react'
import { JsonLd } from '@/components/json-ld'
import { PolicyIntakeGame } from '@/components/marketing/policy-intake-game'
import { HomeFaq, type Faq } from '@/components/marketing/home-faq'

// The policy shop's product page — ONE page perfected before rollout (Len, 11 Sept).
// Structure mirrors /staff-training/[slug]: hero with the intake demo as the focal
// card on the right, then the legislation we analyse below. Hero and section imagery
// use the training-page theme; Len is producing a hero image per page — drop it in at
// HERO_IMAGE below when ready.
//
// Every policy on sale gets a page.
//
// This was one hand-kept slug while the template was being perfected. A hardcoded list is
// the wrong shape now: the catalogue is the thing that decides what we sell, and a list in
// the front end drifts the first time a product is added or withdrawn. The pages are built
// from the live catalogue instead.
//
// The fallback is the original single slug rather than an empty list, because a build that
// cannot reach the API should ship the page we know is right rather than silently 404 the
// whole shop.
const FALLBACK_SLUGS = ['safeguarding-adults']

async function saleableSlugs(): Promise<string[]> {
  try {
    const res = await fetch(`${API_URL}/public/policy-shop/catalogue`, { next: { revalidate: 3600 } })
    if (!res.ok) return FALLBACK_SLUGS
    const products = (await res.json()).data?.products as Array<{ slug: string }> | undefined
    return products?.length ? products.map(p => p.slug) : FALLBACK_SLUGS
  } catch { return FALLBACK_SLUGS }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const HERO_IMAGE = '/images/care-provider-hero.jpg'   // same theme as the training pages

type ShopProduct = {
  product: {
    slug: string; title: string; description: string; price_pence: number; taster: boolean
    intake_fields: Array<{ key: string; label: string; help: string | null; shared: boolean }>
    /** What we ask about their service AFTER the sale, derived from this policy's
     *  regulations. Shown, never asked here: nine questions at checkout is a purchase,
     *  forty-four is a decision to come back later. */
    personalisation_questions?: Array<{ key: string; label: string; help: string | null }>
  }
  bundles: Array<{ key: string; title: string; price_pence: number }>
  regulations: Array<{ reference_key: string; official_name: string; summary: string; required_elements_count: number; key_facts: string[] }>
  related: Array<{ slug: string; title: string; description: string; price_pence: number; taster: boolean }>
}

async function getProduct(slug: string): Promise<ShopProduct | null> {
  try {
    const res = await fetch(`${API_URL}/public/policy-shop/products/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return (await res.json()).data as ShopProduct
  } catch { return null }
}

export async function generateStaticParams() {
  return (await saleableSlugs()).map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  const data = await getProduct(slug)
  if (!data) return {}
  const price = `£${(data.product.price_pence / 100).toFixed(0)}`
  return {
    title: `${data.product.title} | Written for your service | CareStream AI`,
    description: `A ${data.product.title} written for your organisation, checked by a person, and kept updated when the law changes. ${price}, delivered within 2 working days of your details.`,
  }
}

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

export default async function PolicyProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  // On sale or not is decided by the catalogue: getProduct returning null is the 404.
  const data = await getProduct(slug)
  if (!data) notFound()
  // Deploys build web and api in parallel, so this page can be prerendered against
  // an API one version behind. Every list is defaulted so version skew can never
  // crash the build; the missing data simply appears at the next revalidation.
  const product = data.product
  const bundles = data.bundles ?? []
  const regulations = (data.regulations ?? []).map(r => ({ ...r, key_facts: r.key_facts ?? [] }))
  const related = data.related ?? []

  const heroBullets = [
    'Written for your organisation, not a template with your logo on it',
    'Read and approved by a person before it carries your name',
    'Verified against every required element of the legislation below',
    'Kept updated when the law changes, so it never quietly goes stale',
  ]
  const personalisation = product.personalisation_questions ?? []
  const sharedFields = product.intake_fields.filter(f => f.shared)
  const specificFields = product.intake_fields.filter(f => !f.shared)
  const starterBundle = bundles.find(b => b.key === 'statutory-starter')

  const faqs: Faq[] = [
    { question: `What exactly do I receive?`, answer: `A complete ${product.title} written for your organisation, in your dashboard and as a print-ready PDF on your own letterhead. It names your service, your registration details and your leads, because you gave us them.` },
    { question: 'Is this a template?', answer: `No. Each policy is written for the organisation buying it, structured from the legislation itself, verified against ${regulations.reduce((n, r) => n + r.required_elements_count, 0) || 'every'} required regulatory elements, and read by a person before it carries your name.` },
    { question: 'How quickly will I get it?', answer: 'Within 2 working days of you completing the short questions above. Most arrive sooner.' },
    { question: 'What happens when the law changes?', answer: 'We monitor UK care legislation continuously. When something affecting this policy changes, your copy is updated and you are told what changed and why. The first year of updates is included, then £12 a year per policy.' },
    { question: 'Can I edit the policy myself?', answer: 'No, and deliberately so: we stand behind every word we approve. If something needs changing, tell us and we amend and re-verify it, so it always remains a document we can both defend to an inspector.' },
    { question: 'What if I need more than one policy?', answer: `Most services do. The Statutory Starter Pack covers the twenty policies every CQC-registered service is expected to hold${starterBundle ? ` for ${money(starterBundle.price_pence)}` : ''}, and the Complete Policy Library covers all 65.` },
  ]

  const productJson = {
    '@context': 'https://schema.org', '@type': 'Product',
    name: product.title,
    description: product.description,
    offers: { '@type': 'Offer', priceCurrency: 'GBP', price: (product.price_pence / 100).toFixed(2), availability: 'https://schema.org/PreOrder' },
  }

  return (
    <>
      <JsonLd data={productJson} />
      {/* ── Hero — care photo bled into white, the intake demo as the focal card ── */}
      <section className="relative overflow-hidden bg-white">
        <div aria-hidden className="pointer-events-none absolute inset-0 hidden overflow-hidden lg:block">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={HERO_IMAGE} alt="" className="absolute inset-x-0 top-0 h-[72rem] w-full object-cover object-[40%_12%]" />
          <div className="absolute inset-0 bg-gradient-to-r from-white/55 via-white/90 to-white" />
        </div>
        <div className="relative mx-auto max-w-content px-6 py-14 md:py-20">
          <div className="grid items-start gap-12 lg:grid-cols-[1fr_1.05fr] lg:gap-14">
            <div>
              <div className="mb-4 flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-mid">
                <Link href="/care-policies" className="hover:text-teal">Care Policies</Link>
                <span>/</span>
                <span className="text-neutral-dark">{product.title}</span>
              </div>
              <div className="mb-5 flex flex-wrap items-center gap-2.5">
                <span className="inline-flex items-center gap-2 rounded-full bg-teal-light px-3 py-1 text-xs font-bold uppercase tracking-widest text-teal">
                  <ShieldCheck size={14} /> Personalised · Human-reviewed · Kept updated
                </span>
              </div>
              <h1 className="mb-6 max-w-xl text-4xl font-extrabold leading-[1.05] tracking-tight text-neutral-dark md:text-5xl lg:text-6xl">
                A {product.title} written for your service
              </h1>
              <ul className="mb-8 space-y-3">
                {heroBullets.map(b => (
                  <li key={b} className="flex items-start gap-3 text-neutral-dark">
                    <CheckCircle2 size={20} className="mt-0.5 flex-shrink-0 text-teal" />
                    <span className="leading-relaxed">{b}</span>
                  </li>
                ))}
              </ul>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link href={`/contact?about=${encodeURIComponent(product.title)}`} className="rounded-btn bg-blue-600 px-8 py-4 text-center text-sm font-semibold text-white shadow-lg shadow-blue-600/25 transition-colors hover:bg-blue-700">
                  Buy this policy · {money(product.price_pence)}
                </Link>
                <Link href="/demo" className="rounded-btn border-2 border-gray-200 px-8 py-4 text-center text-sm font-semibold text-neutral-dark transition-colors hover:border-teal hover:text-teal">
                  Book a demo
                </Link>
              </div>
              <p className="mt-3 text-sm text-neutral-mid">
                One-off, first year of updates included. Delivered within <span className="font-bold text-neutral-dark">2 working days</span> of your details.
                {starterBundle && <> Also in the <span className="font-semibold text-neutral-dark">{starterBundle.title}</span>, 20 policies for {money(starterBundle.price_pence)}.</>}
              </p>
              <div className="mt-6 flex items-center gap-2 text-sm text-neutral-mid">
                <span className="flex gap-0.5">{[0, 1, 2, 3, 4].map(i => <Star key={i} size={15} className="fill-amber-brand text-amber-brand" />)}</span>
                Trusted by UK care providers
              </div>
            </div>

            {/* The gamified intake IS the buying journey: image-led start screen, one
                question per step with progress, the Buy button as the finale. Shared
                fields first (the identity everyone has to hand), then this policy's own. */}
            <PolicyIntakeGame
              slug={product.slug}
              title={product.title}
              pricePence={product.price_pence}
              fields={[...sharedFields, ...specificFields]}
              buyHref={`/contact?about=${encodeURIComponent(product.title)}`}
            />
          </div>
        </div>
      </section>

      {/* ── The legislation, as numbered sections with key facts and imagery ── */}
      <section className="bg-neutral-light/40 py-16">
        <div className="mx-auto max-w-content px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal">Built from the law, checked against the law</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-neutral-dark">
            The legislation, CQC standards and law we analyse to write it
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-mid">
            Your {product.title} is structured from these regulations, then verified against every
            required element of each one before a person signs it off.
          </p>
          <div className="mt-10 space-y-12">
            {regulations.map((r, i) => (
              <div key={r.reference_key} className={`grid items-center gap-8 lg:grid-cols-2 ${i % 2 === 1 ? 'lg:[&>*:first-child]:order-2' : ''}`}>
                <div>
                  <p className="text-4xl font-extrabold text-teal/30">{String(i + 1).padStart(2, '0')}</p>
                  <h3 className="mt-1 text-xl font-extrabold text-neutral-dark">{r.official_name}</h3>
                  <ul className="mt-4 space-y-2.5">
                    {r.key_facts.map(fact => (
                      <li key={fact} className="flex items-start gap-2.5 text-sm leading-relaxed text-neutral-dark">
                        <CheckCircle2 size={17} className="mt-0.5 flex-shrink-0 text-teal" />
                        <span>{fact}</span>
                      </li>
                    ))}
                  </ul>
                  {r.required_elements_count > 0 && (
                    <p className="mt-4 inline-flex items-center gap-1.5 rounded-full bg-teal-light/40 px-2.5 py-1 text-xs font-semibold text-teal">
                      <ShieldCheck size={12} /> {r.required_elements_count} required elements verified in your policy
                    </p>
                  )}
                </div>
                {/* IMAGE SLOT: per-regulation artwork from Len, training-page theme. */}
                <div className="flex aspect-[16/10] w-full items-center justify-center rounded-2xl bg-teal-gradient shadow-card">
                  <div className="text-center text-white/90">
                    <Scale size={36} className="mx-auto mb-2" />
                    <p className="text-xs font-semibold">[ Image — {r.official_name} ]</p>
                  </div>
                </div>
              </div>
            ))}
            {regulations.length === 0 && (
              <p className="text-sm text-neutral-mid">Regulation mapping for this policy is being finalised.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── What we ask, so nothing is assumed ──
          The strongest thing we can say about these policies is also the most literal.
          Everyone else sells a template with a find and replace on the home name; this
          lists the actual questions THIS policy will ask, served from the same mapping the
          writer and the coverage judge use, so the page cannot promise something the
          pipeline does not do. */}
      {personalisation.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-content px-6">
            <p className="text-xs font-bold uppercase tracking-[0.13em] text-teal">Written for your service</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-dark">
              What we ask you, so none of it is assumed.
            </h2>
            <p className="mt-3 max-w-3xl text-neutral-mid">
              Most policy packs are one document sold to everyone with a find and replace on the
              home name. Your {product.title} is written from the legislation above and from your
              answers to the questions below. Where you have told us something, it says so. Where
              you have not, it sets out what must happen rather than claiming you already do it.
            </p>

            <div className="mt-8 grid gap-4 sm:grid-cols-2">
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <span className="inline-block rounded-full bg-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.11em] text-teal">
                  Before you pay
                </span>
                <p className="mt-3 text-lg font-bold text-neutral-dark">{product.intake_fields.length} quick questions</p>
                <p className="mt-1 text-sm text-neutral-mid">
                  Your registered name, address, CQC numbers and who holds the key roles. About
                  three minutes. Nothing else is asked before you buy.
                </p>
              </div>
              <div className="rounded-2xl border border-gray-200 bg-white p-6">
                <span className="inline-block rounded-full bg-teal/10 px-3 py-1 text-[11px] font-bold uppercase tracking-[0.11em] text-teal">
                  After you buy
                </span>
                <p className="mt-3 text-lg font-bold text-neutral-dark">{personalisation.length} about your service</p>
                <p className="mt-1 text-sm text-neutral-mid">
                  Asked once in your own account and used across every policy you own, so a second
                  policy never asks you the same thing twice.
                </p>
              </div>
            </div>

            <ul className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
              {personalisation.map(q => (
                <li key={q.key} className="flex items-start gap-2.5 rounded-xl border border-gray-200 bg-white p-4">
                  <svg viewBox="0 0 24 24" className="mt-0.5 h-4 w-4 shrink-0 stroke-teal" fill="none" strokeWidth={2.4} strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 12.5 9.5 18 20 6.5" />
                  </svg>
                  <span>
                    <span className="block text-sm font-semibold text-neutral-dark">{q.label}</span>
                    {q.help && <span className="mt-1 block text-xs text-neutral-mid">{q.help}</span>}
                  </span>
                </li>
              ))}
            </ul>

            <p className="mt-6 max-w-3xl text-sm text-neutral-mid">
              <span className="font-semibold text-neutral-dark">Why it matters.</span> A policy that
              claims you assess your premises annually, when you never have, is not a harmless
              overstatement. It is a signed statement handed to your inspector. We would rather write
              what you must do than guess what you already do.
            </p>
          </div>
        </section>
      )}

      {/* ── FAQs about the policy ── */}
      <HomeFaq faqs={faqs} />

      {/* ── Why choose CareStream (policies edition) ── */}
      <section className="bg-neutral-light/40 py-16">
        <div className="mx-auto max-w-content px-6">
          <h2 className="text-3xl font-extrabold tracking-tight text-neutral-dark">Why choose CareStream?</h2>
          <p className="mt-2 max-w-2xl text-neutral-mid">
            Policies built for the care sector, written the way an inspector expects to read them.
          </p>
          <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            {[
              '65 care policies, one platform',
              'Written for your service, never a template',
              'Verified against every required element of the law',
              'Read by a person before it carries your name',
              'Kept up to date with UK care regulations',
              'Branded, print-ready PDF on your letterhead',
              'Delivered within 2 working days of your details',
              'Part of the full CareStream platform when you are ready',
            ].map(b => (
              <div key={b} className="flex items-start gap-2.5 rounded-xl border border-gray-100 bg-white p-4 shadow-card">
                <CheckCircle2 size={18} className="mt-0.5 flex-shrink-0 text-teal" />
                <span className="text-sm font-medium leading-relaxed text-neutral-dark">{b}</span>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Related policies ── */}
      {related.length > 0 && (
        <section className="bg-white py-16">
          <div className="mx-auto max-w-content px-6">
            <p className="text-xs font-bold uppercase tracking-widest text-teal">Related policies</p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-neutral-dark">More policies your service may need</h2>
            <p className="mt-2 max-w-2xl text-neutral-mid">
              More statutory and operational policies CareStream writes for your service, personalised,
              human-reviewed and kept updated, exactly like this one.
            </p>
            <div className="mt-8 grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {related.map(rp => {
                const launched = true   // every policy on sale has a page
                return (
                  <div key={rp.slug} className="flex flex-col overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-card">
                    {/* IMAGE SLOT: per-policy card image from Len, training-card theme. */}
                    <div className="flex aspect-[16/9] w-full items-center justify-center bg-teal-gradient">
                      <div className="text-center text-white/90">
                        <FileText size={28} className="mx-auto mb-1.5" />
                        <p className="text-[11px] font-semibold">[ Image — {rp.title} ]</p>
                      </div>
                    </div>
                    <div className="flex flex-1 flex-col p-5">
                      <h3 className="text-base font-bold text-neutral-dark">{rp.title}</h3>
                      <p className="mt-1.5 line-clamp-2 flex-1 text-sm leading-relaxed text-neutral-mid">{rp.description}</p>
                      <div className="mt-4 flex items-center justify-between gap-3">
                        <span className="text-lg font-extrabold text-neutral-dark">{money(rp.price_pence)}</span>
                        <Link href={`/contact?about=${encodeURIComponent(rp.title)}`} className="rounded-btn bg-blue-600 px-4 py-2 text-xs font-bold text-white hover:bg-blue-700">
                          Buy now
                        </Link>
                      </div>
                      {launched ? (
                        <Link href={`/care-policies/${rp.slug}`} className="mt-3 text-xs font-semibold text-teal hover:underline">
                          See this policy in full →
                        </Link>
                      ) : (
                        <p className="mt-3 text-xs text-neutral-mid">Full page coming soon</p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        </section>
      )}

    </>
  )
}
