import Link from 'next/link'
import { CollectionIntro } from './collection-intro'
import { AddToBasket, SavePolicy, BasketPill } from './policy-basket'
import { TrainingAddButton, TrainingSaveButton, TrainingCartLink } from './training-cart-buttons'
import './collection-page-v2.css'

// The rebuilt /collection/[slug] pages.
//
// Reads the SAME collection record the current page reads, so this is a template change and
// not a content change. Prices and images still come from the catalogue at request time, never
// from the collection record: a price written into the page goes stale the first time one
// changes, and a page quoting a figure the checkout disagrees with costs the sale it exists to
// make.
//
// The theme's cards carry Add to basket and Save for later, which the current cards do not.
// Those are the app's own AddToBasket and SavePolicy, which already render the pcadd and pcsave
// markup the theme expects, so the basket behaviour is the real one rather than a lookalike.

export interface CollectionProduct {
  slug: string
  title: string
  description: string
  price_pence: number
  meta: string
  href: string
  image_url: string | null
}

export interface CollectionV2 {
  /** Which cart the products go into. A training course must never land in the policy
   *  basket, which checks out somewhere else entirely. */
  kind: 'policies' | 'training'
  title: string
  eyebrow: string
  intro: string
  body: string
  links: { label: string; url: string }[]
  faqs: { question: string; answer: string }[]
  products: CollectionProduct[]
}

export interface Copy { (key: string): string }

const money = (p: number) => `£${Math.round(p / 100)}`

const Mark = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

export function CollectionPageV2({ c, s }: { c: CollectionV2; s: Copy }) {
  const links = (c.links ?? []).filter(l => l.label && l.url)
  const faqs = (c.faqs ?? []).filter(f => f.question && f.answer)
  const products = c.products ?? []
  const training = c.kind === 'training'
  const noun = s('meta.noun') || 'in this collection'

  return (
    <div className="clpage-v2">
      <section className="clsec clhero">
        <div className="clwrap">
          <p className="eb">{c.eyebrow}</p>
          <h1>{c.title}</h1>
          {c.intro && <CollectionIntro html={c.intro} variant="theme" />}
          <div className="clmeta">
            <span><Mark />{products.length} {noun}</span>
            <span><Mark />{s('meta.line2')}</span>
            <span><Mark />{s('meta.line3')}</span>
          </div>
          {links.length > 0 && (
            <div className="cllinkrow">
              {links.map(l => <Link href={l.url} key={l.url}>{l.label}</Link>)}
            </div>
          )}
        </div>
      </section>

      {products.length > 0 && (
        <section className="clsec">
          <div className="clwrap">
            <div className="clgrid">
              {products.map(p => (
                <div className="clcard" key={p.slug}>
                  <Link className="tl" href={p.href}>
                    <span className="clshot">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      {p.image_url && <img src={p.image_url} alt="" />}
                    </span>
                  </Link>
                  <div className="in">
                    <Link className="tl" href={p.href}><b>{p.title}</b></Link>
                    <p>{p.description}</p>
                    <div className="foot">
                      <em>{money(p.price_pence)}</em><i>{p.meta}</i>
                    </div>
                    <div className="clbuy">
                      {training ? (
                        <>
                          <TrainingAddButton className="clbuy-add" slug={p.slug} title={p.title}
                                             unitPence={p.price_pence} />
                          <TrainingSaveButton className="clbuy-save" slug={p.slug} title={p.title} />
                        </>
                      ) : (
                        <>
                          <AddToBasket className="clbuy-add"
                            item={{ slug: p.slug, title: p.title, price_pence: p.price_pence }} />
                          <SavePolicy className="clbuy-save" slug={p.slug} title={p.title} />
                        </>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>
      )}

      {c.body && (
        <section className="clsec clbody">
          <div className="clwrap" dangerouslySetInnerHTML={{ __html: c.body }} />
        </section>
      )}

      {faqs.length > 0 && (
        <section className="clsec clfaq">
          <div className="clwrap">
            <h2>{c.title} FAQs</h2>
            {faqs.map((f, i) => (
              <details key={f.question} open={i === 0}>
                <summary>{f.question}</summary>
                <p>{f.answer}</p>
              </details>
            ))}
          </div>
        </section>
      )}

      {links.length > 0 && (
        <section className="clsec cllinks">
          <div className="clwrap">
            <h2>{s('links.h2')}</h2>
            <p className="sub">{s('links.sub')}</p>
            <div className="clchips">
              {links.map(l => (
                <Link className="clchip" href={l.url} key={l.url}>{l.label}</Link>
              ))}
            </div>
          </div>
        </section>
      )}

      <section className="clsec clcta">
        <div className="clwrap">
          <div className="clcta-in">
            <div>
              <h2>{s('cta.h2')}</h2>
              <p>{s('cta.lede')}</p>
              <div className="btns">
                <Link className="primary" href="/pricing">See pricing</Link>
                <Link className="ghost" href="/demo">Book a demo</Link>
              </div>
            </div>
            <ul>
              {[1, 2, 3, 4].map(n => s(`cta.point${n}`)).filter(Boolean).map(x => (
                <li key={x}><Mark />{x}</li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {training ? <TrainingCartLink /> : <BasketPill />}
    </div>
  )
}
