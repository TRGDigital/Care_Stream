'use client'

import { useState } from 'react'
import Link from 'next/link'
import { PRICING, type PricingValue } from '@/lib/pricing-data'
import { PRICING_FEATURE_LINKS } from '@/lib/pricing-feature-links'
import './pricing-page-v2.css'
import './pricing-page-v2-extra.css'

// The rebuilt /pricing page.
//
// The plans, the fifty-two-row comparison table and the FAQs are GENERATED from the theme
// (lib/pricing-data.ts) rather than retyped. A hand-copied comparison table is how a tick ends
// up in the wrong column on the page that decides whether someone buys.
//
// A client component because of the monthly/annual switch. Both prices are in the markup
// either way, so the page is complete to a crawler with no JavaScript.

const Tick = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)

const Nope = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
       strokeLinecap="round" aria-hidden="true"><path d="M6 12h12" /></svg>
)

// Every comparison cell is a `val` td in the theme, whatever is inside it: the tick and the
// nope are spans within. Putting `val` on the text span instead left 129 of the 156 cells
// without the class that sizes and centres them.
function Cell({ value }: { value: PricingValue }) {
  if (value === true) return <td className="val"><span className="tick"><Tick /></span></td>
  if (value === false) {
    return <td className="val"><span className="nope" aria-label="not included" /></td>
  }
  return <td className="val">{value}</td>
}

export function PricingPageV2({ heading, lede }: { heading: string; lede: string }) {
  const [annual, setAnnual] = useState(false)

  return (
    <div className="ppage-v2">
      <section className="phero">
        <div className="pwrap phero-in">
          <span className="uc-eyebrow">Pricing</span>
          <h1>{heading}</h1>
          <p>{lede}</p>
          <div className="pswitch" role="group" aria-label="Billing period">
            <button type="button" onClick={() => setAnnual(false)} aria-pressed={!annual}>
              Monthly
            </button>
            <button type="button" onClick={() => setAnnual(true)} aria-pressed={annual}>
              Annual <span className="psave">2 months free</span>
            </button>
          </div>
        </div>
      </section>

      <section className="pplans">
        <div className="pwrap pplans-in">
          {PRICING.plans.map(p => (
            <div className={`pcard${p.highlight ? ' hi' : ''}`} key={p.name}>
              {p.badge && (
                <span className={`pbadge${p.badgeQuiet ? ' quiet' : ''}`}>{p.badge}</span>
              )}
              <h2>{p.name}</h2>
              <p className="line">{p.line}</p>
              {/* Both figures are always rendered; the switch only chooses which is shown, so
                  a crawler and a reader with no JavaScript still see the real prices. */}
              <div className="pprice">{annual ? p.annual : p.price}</div>
              <p className="pcap">{annual ? p.price : p.annual}</p>
              <Link className={`pcta ${p.highlight ? 'solid' : 'ghost'}`} href={p.ctaHref}>
                {p.ctaLabel}
              </Link>
              <ul className="pfeats">
                {p.features.map(f => (
                  <li className={f.more ? 'more' : undefined} key={f.text}><Tick />{f.text}</li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      </section>

      <section className="pcompare">
        <div className="pwrap pcompare-in">
          <div className="pcompare-head">
            <h2>Every feature, side by side</h2>
          </div>
          <div className="ptable-wrap">
            <table className="pt">
              <thead>
                <tr>
                  <th>Feature</th>
                  {PRICING.plans.map(p => (
                    <th className={`plan${p.highlight ? ' hi' : ''}`} key={p.name}>
                      <b>{p.name}</b><span>{p.price}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {PRICING.groups.map(g => (
                  <>
                    {g.group && (
                      <tr className="psec" key={g.group}>
                        <td colSpan={4}>{g.group}</td>
                      </tr>
                    )}
                    {g.rows.map(r => (
                      <tr key={`${g.group}-${r.label}`}>
                        <td>
                          {PRICING_FEATURE_LINKS[r.label] ? (
                            <Link className="pflink" href={PRICING_FEATURE_LINKS[r.label]!}>
                              {r.label}
                              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M7 17 17 7M9 7h8v8" /></svg>
                            </Link>
                          ) : r.label}
                        </td>
                        {r.values.map((v, i) => <Cell value={v} key={i} />)}
                      </tr>
                    ))}
                  </>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="pfaq">
        <div className="pwrap pfaq-in">
          <h2>Questions about pricing</h2>
          {PRICING.faqs.map(f => (
            <details className="pq" key={f.q}>
              <summary>{f.q}</summary>
              <div className="ans"><p>{f.a}</p></div>
            </details>
          ))}
        </div>
      </section>

      <section className="pend">
        <div className="pwrap pend-in">
          <h2>Start with your own policies</h2>
          <div className="row">
            <Link className="pcta solid" href="/register">Start free trial</Link>
            <Link className="pcta ghost" href="/demo">Book a demo</Link>
          </div>
        </div>
      </section>
    </div>
  )
}
