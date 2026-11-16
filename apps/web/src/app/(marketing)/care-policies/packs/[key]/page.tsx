import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import { pageMetadata } from '@/lib/page-meta'
import { JsonLd } from '@/components/json-ld'
import { faqPageSchema, breadcrumbSchema, SITE_URL, SITE_NAME } from '@/lib/schema'
import { POLICY_PACKS } from '@/lib/policy-packs'
import { KeywordHighlighter } from '@/components/marketing/keyword-highlighter'
import { AddToBasket, PackLink, BasketPill } from '@/components/marketing/policy-basket'
import { HomeFaq } from '@/components/marketing/home-faq'
import '@/components/marketing/service-page-v2.css'
import '@/components/marketing/collection-page-v2.css'

// A policy pack's page: what is in it, who it is for and what it saves against buying the policies one by one.
// Copy and researched keywords for the newer packs come from lib/policy-packs.ts (generated from the pack
// specs); the original six packs have no spec, so their page is built from the shop's own description and
// members. Prices, members and the saving always come from the shop, never from the copy.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const money = (p: number) => `£${p % 100 === 0 ? p / 100 : (p / 100).toFixed(2)}`

interface Member { slug: string; title: string; price_pence: number; description: string; meta?: string }
interface PackData {
  bundle: { key: string; title: string; description: string; price_pence: number }
  products: Member[]
  individual_total_pence: number
  other_packs: Array<{ key: string; title: string; price_pence: number; description: string }>
}

async function getPack(key: string): Promise<PackData | null> {
  const url = `${API_URL}/public/policy-shop/bundles/${encodeURIComponent(key)}`
  for (let attempt = 0; attempt < 2; attempt++) {
    const res = await fetch(url, attempt ? { cache: 'no-store' } : { next: { revalidate: 300 } }).catch(() => null)
    if (res?.status === 404) return null
    if (res?.ok) return (await res.json()).data as PackData
    if (!attempt) await new Promise(r => setTimeout(r, 1500))
  }
  throw new Error(`Pack ${key}: the API did not answer; not treating it as missing`)
}

export async function generateMetadata({ params }: { params: Promise<{ key: string }> }): Promise<Metadata> {
  const { key } = await params
  const info = POLICY_PACKS[key]
  const data = await getPack(key)
  if (!data) return {}
  return pageMetadata(`/care-policies/packs/${key}`, {
    title: info ? `${info.seo_title} | CareStreamAI` : `${data.bundle.title} | CareStreamAI`,
    description: info?.meta_description ?? `${data.bundle.description} ${money(data.bundle.price_pence)} for the pack.`,
  })
}

export default async function PackPage({ params }: { params: Promise<{ key: string }> }) {
  const { key } = await params
  const data = await getPack(key)
  if (!data) notFound()
  const info = POLICY_PACKS[key]
  const { bundle, products } = data
  const saving = Math.max(0, data.individual_total_pence - bundle.price_pence)
  const pct = data.individual_total_pence ? Math.round((saving / data.individual_total_pence) * 100) : 0
  const bySlug = new Map(products.map(p => [p.slug, p]))
  // The copy groups the members under headings; any member the copy does not mention (a policy added to the pack
  // later) goes in a final group, so nothing the buyer gets is left off the page.
  const named = new Set((info?.cro.groups ?? []).flatMap(g => g.policies))
  const groups = [
    ...(info?.cro.groups ?? []).map(g => ({ heading: g.heading, items: g.policies.map(s => bySlug.get(s)).filter((m): m is Member => !!m) })),
    ...(info && products.some(p => !named.has(p.slug)) ? [{ heading: 'Also in this pack', items: products.filter(p => !named.has(p.slug)) }] : []),
  ].filter(g => g.items.length)
  if (!groups.length) groups.push({ heading: `The ${products.length} policies in this pack`, items: products })
  const faqs = info?.faqs ?? [
    { question: 'What is in this pack?', answer: `${products.length} policies, each written for your organisation from a short set of questions and read by a person before it carries your name.` },
    { question: 'How quickly will I get it?', answer: 'Within 2 working days of you completing the short questions.' },
    { question: 'What if it is not right for my service?', answer: 'Tell us within fourteen days and we refund it in full.' },
  ]

  return (
    <div className="svpage-v2" data-page="care-policies">
      <JsonLd data={breadcrumbSchema([{ name: 'Care policies', path: '/care-policies' }, { name: bundle.title, path: `/care-policies/packs/${key}` }])} />
      <JsonLd data={faqPageSchema(faqs)} />
      <JsonLd data={{
        '@context': 'https://schema.org', '@type': 'Product', '@id': `${SITE_URL}/care-policies/packs/${key}#product`,
        name: bundle.title, description: info?.meta_description ?? bundle.description, url: `${SITE_URL}/care-policies/packs/${key}`,
        sku: `pack-${key}`, category: 'Care policies and procedures', brand: { '@type': 'Brand', name: SITE_NAME },
        offers: { '@type': 'Offer', priceCurrency: 'GBP', price: (bundle.price_pence / 100).toFixed(2), availability: 'https://schema.org/InStock', url: `${SITE_URL}/care-policies/packs/${key}` },
      }} />

      <section className="svhero">
        <div className="svwrap">
          <nav aria-label="Breadcrumb" style={{ fontSize: '.85rem', color: 'var(--muted)', marginBottom: 14 }}>
            <Link href="/care-policies">Care policies</Link> / {bundle.title}
          </nav>
          <span className="uc-eyebrow">Policy pack · {products.length} policies</span>
          <h1>{info?.title ?? bundle.title}</h1>
          {(info?.intro ? info.intro.split(/\n\s*\n/) : [bundle.description]).map((t, i) => <p key={i}>{t}</p>)}
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 14, flexWrap: 'wrap', margin: '18px 0 6px' }}>
            <b style={{ fontSize: '2.2rem', letterSpacing: '-.03em' }}>{money(bundle.price_pence)}</b>
            {saving > 0 && <span style={{ color: 'var(--muted)' }}>one-off for all {products.length}. Bought separately: <s>{money(data.individual_total_pence)}</s>. You save {money(saving)} ({pct}%).</span>}
          </div>
          <div className="svactions">
            <PackLink className="svbtn solid" pack={bundle}>Buy the pack · {money(bundle.price_pence)}</PackLink>
            <a className="svbtn ghost" href="#in-the-pack">See what is inside</a>
          </div>
          <p style={{ fontSize: '.85rem', color: 'var(--muted)', marginTop: 12 }}>Every policy is written for your service, read by a person before it carries your name, and delivered within 2 working days of your answers. Fourteen day refund.</p>
        </div>
      </section>

      {info && (
        <section className="pccat">
          <div className="pccat-in">
            <p className="eb">Who it is for</p>
            <h2>{info.cro.whoFor.replace(/^Perfect for /, 'Perfect for ')}</h2>
            <ul style={{ margin: '14px 0 0', paddingLeft: 20, lineHeight: 1.7 }}>{info.cro.benefits.map(b => <li key={b}>{b}</li>)}</ul>
            <div className="pcpacks" style={{ marginTop: 26 }}>
              {info.cro.moments.map(m => <div className="pcpack" key={m.title}><b>{m.title}</b><span>{m.body}</span></div>)}
            </div>
          </div>
        </section>
      )}

      <section className="pccat" id="in-the-pack">
        <div className="pccat-in">
          <p className="eb">What is in the pack</p>
          <h2>The {products.length} policies in the {bundle.title}</h2>
          {groups.map(g => (
            <div key={g.heading} style={{ marginTop: 28 }}>
              <h3 style={{ fontSize: '1.15rem', letterSpacing: '-.02em', marginBottom: 12 }}>{g.heading}</h3>
              <div className="clpage-v2 pccards">
                <div className="clgrid">
                  {g.items.map(p => (
                    <div className="clcard" key={p.slug}>
                      <Link className="tl" href={`/care-policies/${p.slug}`}>
                        <span className="clshot">{/* eslint-disable-next-line @next/next/no-img-element */}<img src={`/images/care-policies/${p.slug}/1.webp`} alt="" loading="lazy" /></span>
                      </Link>
                      <div className="in">
                        <Link className="tl" href={`/care-policies/${p.slug}`}><b>{p.title}</b></Link>
                        <p>{p.description}</p>
                        <div className="foot"><em>{money(p.price_pence)} alone</em><i>{p.meta ?? ''}</i></div>
                        <div className="clbuy"><AddToBasket className="clbuy-add" item={{ slug: p.slug, title: p.title, price_pence: p.price_pence }} /></div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          ))}
          <BasketPill />
        </div>
      </section>

      <section className="pccat">
        <div className="pccat-in">
          <p className="eb">Questions</p>
          <h2>About the {bundle.title}</h2>
          <HomeFaq faqs={faqs} />
          {data.other_packs.length > 0 && (
            <>
              <h3 style={{ margin: '34px 0 14px' }}>Other policy packs</h3>
              <div className="pcpacks">
                {data.other_packs.map(o => (
                  <Link className="pcpack" key={o.key} href={`/care-policies/packs/${o.key}`}>
                    <b>{o.title}</b><em>{money(o.price_pence)}</em><span>{o.description}</span>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </section>
      {info && <KeywordHighlighter slug={key} keywords={{ primary: info.primary.keyword, secondary: info.secondary.map(k => k.keyword) }} />}
    </div>
  )
}
