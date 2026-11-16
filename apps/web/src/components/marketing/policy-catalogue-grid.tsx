'use client'

import { useState } from 'react'
import Link from 'next/link'
import { AddToBasket, SavePolicy, BasketPill } from './policy-basket'
import type { PolicyProduct } from './care-policies-index-v2'
import { POLICY_SERVICE_LABEL } from '@/lib/service-labels'
import { FocusOnHash } from './focus-on-hash'

// The /care-policies card grid with the training library's search above it.
//
// EVERY policy stays in the page and the ones outside the search are hidden rather than left
// out, as on /staff-training: rendering only the matches would drop the rest from the server
// HTML, and with them the only links a crawler has to those policy pages.
const money = (p: number) => `£${p % 100 === 0 ? p / 100 : (p / 100).toFixed(2)}`

export function PolicyCatalogueGrid({ products }: { products: PolicyProduct[] }) {
  const [query, setQuery] = useState('')
  const [service, setService] = useState('all')
  const q = query.trim().toLowerCase()
  // A policy with no services is general: it shows under every service.
  const counts: Record<string, number> = {}
  for (const p of products) for (const s of p.services ?? []) counts[s] = (counts[s] ?? 0) + 1
  const serviceKeys = Object.keys(POLICY_SERVICE_LABEL).filter(k => counts[k])
  const inService = (p: PolicyProduct) => service === 'all' || !(p.services?.length) || p.services.includes(service)
  const matches = (p: PolicyProduct) =>
    inService(p) && (!q || p.title.toLowerCase().includes(q) || (p.description ?? '').toLowerCase().includes(q))
  const count = products.filter(matches).length

  return (
    <>
      {/* "Search the policies" in the hero lands here with the cursor in the box, as on /care-audits and /staff-training. */}
      <FocusOnHash id="policy-search" scrollTo="policy-library" />
      <label className="pcsearch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
             strokeLinecap="round" aria-hidden="true"><circle cx="11" cy="11" r="6.5" /><path d="M16 16l4 4" /></svg>
        <input id="policy-search" type="search" value={query} onChange={e => setQuery(e.target.value)}
               placeholder="Search care policies, e.g. safeguarding, fire safety…"
               aria-label="Search care policies" />
      </label>
      {serviceKeys.length > 0 && (
        <div className="pcchips" role="group" aria-label="Filter policies by care service" style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '0 0 18px' }}>
          {[{ k: 'all', label: `All services (${products.length})` }, ...serviceKeys.map(k => ({ k, label: `${POLICY_SERVICE_LABEL[k]} (${counts[k]})` }))].map(c => (
            <button key={c.k} type="button" onClick={() => setService(c.k)} aria-pressed={service === c.k}
              style={{ border: '1px solid ' + (service === c.k ? 'var(--accent,#7B3FBF)' : 'var(--line,#E2DDE9)'), background: service === c.k ? 'var(--accent,#7B3FBF)' : '#fff',
                       color: service === c.k ? '#fff' : 'inherit', borderRadius: 999, padding: '6px 14px', fontSize: '.86rem', fontWeight: 600, cursor: 'pointer' }}>
              {c.label}
            </button>
          ))}
        </div>
      )}
      {q && count > 0 && (
        <p className="pcnote" role="status" aria-live="polite">
          {`${count} ${count === 1 ? 'policy matches' : 'policies match'} "${query}".`}
        </p>
      )}

      {/* The same cards as the collection pages, borrowing their styles by sitting in their
          scope, so the two cannot drift apart. */}
      <div className="clpage-v2 pccards">
        <div className="clgrid">
          {products.map(p => {
            const href = `/care-policies/${p.slug}`
            return (
              <div className="clcard" key={p.slug} hidden={!matches(p)}>
                <Link className="tl" href={href}>
                  <span className="clshot">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    {p.image_url && <img src={p.image_url} alt="" loading="lazy" />}
                  </span>
                </Link>
                <div className="in">
                  <Link className="tl" href={href}><b>{p.title}</b></Link>
                  <p>{p.description ?? ''}</p>
                  <div className="foot">
                    <em>{money(p.price_pence)}</em><i>{p.meta ?? ''}</i>
                  </div>
                  <div className="clbuy">
                    <AddToBasket className="clbuy-add"
                      item={{ slug: p.slug, title: p.title, price_pence: p.price_pence }} />
                    <SavePolicy className="clbuy-save" slug={p.slug} title={p.title} />
                  </div>
                </div>
              </div>
            )
          })}
        </div>
        <p className="pcempty" role="status" hidden={count > 0}>
          No policies match that. Try a broader term, or take a pack above.
        </p>
        {/* The checkout pill the collection pages show once something is in the basket. */}
        <BasketPill />
      </div>
    </>
  )
}
