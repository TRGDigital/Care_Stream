'use client'

import { useEffect, useState } from 'react'
import { useOffers, licenceOffer, licenceEffectivePence, policyOffer, endsText, money, money2, type Offer } from '@/lib/offers'
import { UNIT_PENCE } from '@/lib/training-commerce'
import './licence-offer.css'

// The offer cards and the sticky-bar chip, for whichever offer the calendar has running. Every
// offer brings its own badge, headline and "how it works" line; the price line is worked out
// from its mechanic. Nothing renders when no offer covers the product.

function useLeft(o: Offer | null) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { setNow(Date.now()) }, [])
  return o ? Math.ceil((Date.parse(o.ends_at) - now) / 86_400_000) : 0
}

// Whole days left, shown only in the final week, when it is a real reason to act.
function Ends({ o }: { o: Offer }) {
  const left = useLeft(o)
  return (
    <span className="lofr-end">
      {endsText(o)}{left <= 7 ? ` · ${left <= 1 ? 'last day' : `${left} days left`}` : ''}
    </span>
  )
}

function Card({ o, price, compact, cta }: {
  o: Offer; price?: React.ReactNode; compact?: boolean; cta?: { href: string; label: string }
}) {
  return (
    <aside className={`lofr${compact ? ' compact' : ''}`} aria-label={o.label ?? o.name}>
      <span className="lofr-emoji" aria-hidden="true">🎃</span>
      <div className="lofr-tx">
        <span className="lofr-lb">{o.label ?? o.name}</span>
        {o.headline && <b className="lofr-hd">{o.headline}</b>}
        {price}
        {o.multi_text && <p className="lofr-multi">{o.multi_text}</p>}
        {cta && <a className="lofr-cta" href={cta.href}>{cta.label}</a>}
        <Ends o={o} />
      </div>
    </aside>
  )
}

/** Under a course's buy box. */
export function LicenceOfferCard({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const o = licenceOffer(useOffers(), slug)
  if (!o) return null
  const each = licenceEffectivePence(o, UNIT_PENCE)
  return (
    <Card o={o} compact={compact} price={each < UNIT_PENCE ? (
      <div className="lofr-price"><b>{money2(each)}</b><span>per staff member <s>{money2(UNIT_PENCE)}</s></span></div>
    ) : null} />
  )
}

/** Under a policy's (or pack's) buy box, or in the basket (no slug: the policy offer running). */
export function PolicyOfferCard({ slug, pricePence, compact = false, cta }: {
  slug?: string; pricePence?: number; compact?: boolean; cta?: { href: string; label: string }
}) {
  const offers = useOffers()
  const o = slug ? policyOffer(offers, slug)
    : offers.find(x => x.range === 'policies' || x.range === 'both') ?? null
  if (!o) return null
  return <Card o={o} compact={compact} cta={cta} price={pricePence ? <PolicyPrice o={o} price={pricePence} /> : null} />
}

function PolicyPrice({ o, price }: { o: Offer; price: number }) {
  const p = o.params || {}
  if (o.kind === 'group_free') {
    const g = Math.max(2, Number(p.group) || 2)
    return g === 2
      ? <div className="lofr-price"><b>{money(price)}</b><span>for two policies</span></div>
      : <div className="lofr-price"><b>{g} for {g - 1}</b><span>policies</span></div>
  }
  if (o.kind === 'percent_off') {
    const now = Math.round(price * (1 - (Number(p.pct) || 0) / 100))
    return <div className="lofr-price"><b>{money2(now)}</b><span>{Number(p.pct)}% off <s>{money(price)}</s></span></div>
  }
  if (o.kind === 'amount_off') {
    return <div className="lofr-price"><b>{money(Math.max(0, price - (Number(p.pence) || 0)))}</b><span><s>{money(price)}</s></span></div>
  }
  if (o.kind === 'pack_bonus') {
    return <div className="lofr-price"><b>+{Number(p.free) || 0} free</b><span>policies with the pack</span></div>
  }
  return null
}

/** In the dark bar that slides in at the top of a course or policy page once its buy box has
 *  scrolled away. */
export function OfferBarChip({ slug, policy = false }: { slug: string; policy?: boolean }) {
  const offers = useOffers()
  const o = policy ? policyOffer(offers, slug) : licenceOffer(offers, slug)
  if (!o) return null
  const each = !policy ? licenceEffectivePence(o, UNIT_PENCE) : UNIT_PENCE
  const end = new Date(`${o.ends_on}T12:00:00Z`).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', timeZone: 'Europe/London' })
  return (
    <span className="lofr-chip">
      <span className="lofr-chip-ic" aria-hidden="true">🎃</span>
      <span className="lofr-chip-tx">
        <b>{o.label ?? o.name}</b>
        <span>{o.headline ?? ''}{!policy && each < UNIT_PENCE ? `: ${money2(each)} each` : ''} · ends {end}</span>
      </span>
    </span>
  )
}

/** On the /care-policies list: the offer on a pack if one is running, otherwise the policy offer. */
export function PolicyListOffer({ bundles }: { bundles: { key: string; price_pence: number }[] }) {
  const offers = useOffers()
  for (const b of bundles) {
    const o = policyOffer(offers, `bundle:${b.key}`)
    if (o && o.kind !== 'group_free' && o.kind !== 'gift') return <div className="lofr-list"><Card o={o} price={<PolicyPrice o={o} price={b.price_pence} />} /></div>
  }
  const o = offers.find(x => x.range === 'policies' || x.range === 'both')
  return o ? <div className="lofr-list"><Card o={o} /></div> : null
}
