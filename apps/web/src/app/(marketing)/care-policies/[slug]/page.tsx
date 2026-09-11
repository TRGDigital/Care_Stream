import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import {
  ShieldCheck, CheckCircle2, FileText, Scale, RefreshCw, UserCheck, Star, Package,
} from 'lucide-react'
import { JsonLd } from '@/components/json-ld'

// The policy shop's product page — ONE page perfected before rollout (Len, 11 Sept).
// Structure mirrors /staff-training/[slug]: hero with the intake demo as the focal
// card on the right, then the legislation we analyse below. Hero and section imagery
// use the training-page theme; Len is producing a hero image per page — drop it in at
// HERO_IMAGE below when ready.
//
// Only the slugs in LAUNCH_SLUGS render; everything else 404s until we deliberately
// roll pages out. Adding a page later = adding its slug here.
const LAUNCH_SLUGS = ['safeguarding-adults']

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const HERO_IMAGE = '/images/care-provider-hero.jpg'   // same theme as the training pages

type ShopProduct = {
  product: {
    slug: string; title: string; description: string; price_pence: number; taster: boolean
    intake_fields: Array<{ key: string; label: string; help: string | null; shared: boolean }>
  }
  bundles: Array<{ key: string; title: string; price_pence: number }>
  regulations: Array<{ reference_key: string; official_name: string; summary: string; required_elements_count: number }>
}

async function getProduct(slug: string): Promise<ShopProduct | null> {
  try {
    const res = await fetch(`${API_URL}/public/policy-shop/products/${encodeURIComponent(slug)}`, { next: { revalidate: 300 } })
    if (!res.ok) return null
    return (await res.json()).data as ShopProduct
  } catch { return null }
}

export function generateStaticParams() {
  return LAUNCH_SLUGS.map(slug => ({ slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params
  if (!LAUNCH_SLUGS.includes(slug)) return {}
  const data = await getProduct(slug)
  if (!data) return {}
  const price = `£${(data.product.price_pence / 100).toFixed(0)}`
  return {
    title: `${data.product.title} | Written for your service | CareStream AI`,
    description: `A ${data.product.title} written for your organisation, checked by a person, and kept updated when the law changes. ${price}, delivered within 2 working days of your details.`,
  }
}

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

// Example values for the intake demo card. Deliberately obviously-fictional.
const DEMO_VALUES: Record<string, string> = {
  company_legal_name: 'Meadowbrook Care Ltd',
  trading_name: 'Meadowbrook House',
  address: '14 Orchard Lane, York, YO1 7EX',
  cqc_provider_id: '1-101234567',
  cqc_location_id: '1-2098765432',
  registered_manager: 'Sarah Ellison',
  nominated_individual: 'David Okafor',
}

export default async function PolicyProductPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  if (!LAUNCH_SLUGS.includes(slug)) notFound()
  const data = await getProduct(slug)
  if (!data) notFound()
  const { product, bundles, regulations } = data

  const heroBullets = [
    'Written for your organisation, not a template with your logo on it',
    'Read and approved by a person before it carries your name',
    'Verified against every required element of the legislation below',
    'Kept updated when the law changes, so it never quietly goes stale',
  ]
  const sharedFields = product.intake_fields.filter(f => f.shared)
  const specificFields = product.intake_fields.filter(f => !f.shared)
  const starterBundle = bundles.find(b => b.key === 'statutory-starter')

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

            {/* The intake demo: exactly what we collect to write THEIR copy */}
            <div className="overflow-hidden rounded-2xl bg-white shadow-elevated ring-1 ring-gray-100">
              <div className="border-b border-gray-100 bg-teal-light/25 px-6 py-4">
                <p className="text-xs font-bold uppercase tracking-widest text-teal">What we collect to write yours</p>
                <p className="mt-1 text-sm text-neutral-mid">Takes about three minutes. Asked once, reused for every policy you buy.</p>
              </div>
              <div className="space-y-3 px-6 py-5">
                {sharedFields.map(f => (
                  <div key={f.key}>
                    <p className="mb-1 text-xs font-semibold text-neutral-dark">{f.label}</p>
                    <div className="rounded-md border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-neutral-mid">
                      {DEMO_VALUES[f.key] ?? f.help ?? '…'}
                    </div>
                  </div>
                ))}
                {specificFields.length > 0 && (
                  <div className="rounded-lg border border-teal/30 bg-teal-light/15 px-4 py-3">
                    <p className="mb-2 text-xs font-bold uppercase tracking-wide text-teal">Specific to this policy</p>
                    {specificFields.map(f => (
                      <div key={f.key} className="mb-2 last:mb-0">
                        <p className="mb-1 text-xs font-semibold text-neutral-dark">{f.label}</p>
                        <div className="rounded-md border border-teal/30 bg-white px-3 py-2 text-sm text-neutral-mid">{f.help ?? '…'}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <p className="border-t border-gray-100 px-6 py-3 text-xs text-neutral-mid">
                These details go into the document itself, so it reads as yours, because it is.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ── The legislation we analyse ── */}
      <section className="bg-neutral-light/40 py-16">
        <div className="mx-auto max-w-content px-6">
          <p className="text-xs font-bold uppercase tracking-widest text-teal">Built from the law, checked against the law</p>
          <h2 className="mt-2 max-w-2xl text-3xl font-extrabold tracking-tight text-neutral-dark">
            The legislation, CQC standards and guidance we analyse to write it
          </h2>
          <p className="mt-3 max-w-2xl text-neutral-mid">
            Your {product.title} is structured from the regulations themselves, then verified
            against every required element of each one before a person signs it off. If the law
            changes, your policy is updated and you are told what changed and why.
          </p>
          <div className="mt-8 grid gap-4 md:grid-cols-2">
            {regulations.map(r => (
              <div key={r.reference_key} className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
                <div className="mb-2 flex items-center gap-2">
                  <Scale size={16} className="shrink-0 text-teal" />
                  <h3 className="text-sm font-bold text-neutral-dark">{r.official_name}</h3>
                </div>
                {r.summary && <p className="text-sm leading-relaxed text-neutral-mid">{r.summary}</p>}
                {r.required_elements_count > 0 && (
                  <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-teal-light/40 px-2.5 py-1 text-xs font-semibold text-teal">
                    <ShieldCheck size={12} /> {r.required_elements_count} required elements verified
                  </p>
                )}
              </div>
            ))}
            {regulations.length === 0 && (
              <p className="text-sm text-neutral-mid">Regulation mapping for this policy is being finalised.</p>
            )}
          </div>
        </div>
      </section>

      {/* ── How it gets to you ── */}
      <section className="bg-white py-16">
        <div className="mx-auto max-w-content px-6">
          <h2 className="max-w-2xl text-3xl font-extrabold tracking-tight text-neutral-dark">From your details to a policy you can stand behind</h2>
          <div className="mt-8 grid gap-6 md:grid-cols-4">
            {[
              { Icon: FileText,  title: 'You give us the details', body: 'The short form above: who you are, your CQC registration, and the leads this policy names.' },
              { Icon: Scale,     title: 'We write it from the law', body: 'One section per required element of the legislation, in your name, with your people.' },
              { Icon: ShieldCheck, title: 'It is verified, then read', body: 'Automated checks against every required element, then a person reads it before it ships.' },
              { Icon: RefreshCw, title: 'It stays current', body: 'When legislation changes, your policy is updated and you are told what changed.' },
            ].map(s => (
              <div key={s.title} className="rounded-xl border border-gray-100 bg-white p-5 shadow-card">
                <s.Icon size={20} className="mb-3 text-teal" />
                <h3 className="mb-1.5 text-sm font-bold text-neutral-dark">{s.title}</h3>
                <p className="text-sm leading-relaxed text-neutral-mid">{s.body}</p>
              </div>
            ))}
          </div>
          {starterBundle && (
            <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl bg-teal-gradient px-8 py-7 text-white">
              <div className="flex items-center gap-3">
                <Package size={22} />
                <div>
                  <p className="text-lg font-bold">Need the full set? {starterBundle.title}</p>
                  <p className="text-sm text-white/85">The twenty policies every CQC-registered service is expected to hold, {money(starterBundle.price_pence)}.</p>
                </div>
              </div>
              <Link href="/contact?about=Statutory%20Starter%20Pack" className="rounded-btn bg-white px-6 py-3 text-sm font-semibold text-teal hover:bg-white/90">
                Talk to us
              </Link>
            </div>
          )}
          <p className="mt-8 flex items-center gap-2 text-sm text-neutral-mid">
            <UserCheck size={16} className="text-teal" />
            Read-only by design: we approve every document that carries your name, and we keep it correct.
          </p>
        </div>
      </section>
    </>
  )
}
