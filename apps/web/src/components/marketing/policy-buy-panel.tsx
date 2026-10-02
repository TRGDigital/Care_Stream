'use client'

import { OfferLine } from './offer-line'
import { useOffers, policyOffer, endsText, money2 } from '@/lib/offers'
import { AddToBasketText, BuyNowPolicy, SavePolicy } from './policy-basket'

const money = (p: number) => `£${(p / 100).toFixed(p % 100 ? 2 : 0)}`

// The buying half of a policy page laid out like a shop product page: the live offer stated in
// full ("applied automatically"), the price (struck through where an offer lowers it), what the
// offer means for this policy, Buy now and the basket. Checkout prices it with the same rules.
export function PolicyBuyPanel({ item }: { item: { slug: string; title: string; price_pence: number } }) {
  const offers = useOffers()
  const o = policyOffer(offers, item.slug)
  const p = o?.params ?? {}
  const price = item.price_pence
  const now = o?.kind === 'percent_off' ? Math.round(price * (1 - (Number(p.pct) || 0) / 100))
    : o?.kind === 'amount_off' ? Math.max(0, price - (Number(p.pence) || 0)) : price
  const group = o?.kind === 'group_free' ? Math.max(2, Number(p.group) || 2) : 0

  return (
    <div className="mpe-buy pcbuycard">
      {o && (
        <OfferLine offer={o} funnel="policies" />
      )}
      <div className="mpe-price">
        {now < price && <s>{money(price)}</s>}
        <b>{now % 100 ? money2(now) : money(now)}</b>
        <span>one-off, for your policy</span>
        {o && <em className="mpe-badge">Offer applied</em>}
      </div>
      {group === 2 && <p className="mpe-dealnote">Add a second policy at {money(price)} or less and it is free: two policies for {money(price)}.</p>}
      {group > 2 && <p className="mpe-dealnote">Buy any {group - 1} policies and the {group === 3 ? '3rd' : `${group}th`} is free.</p>}
      {o?.kind === 'gift' && o.multi_text && <p className="mpe-dealnote">{o.multi_text}</p>}
      {o?.kind === 'pack_bonus' && o.multi_text && <p className="mpe-dealnote">{o.multi_text}</p>}

      <p className="mpe-stock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        Delivered within 2 working days of your answers
      </p>
      <div className="pcbuyrow">
        <BuyNowPolicy item={item} />
        <SavePolicy slug={item.slug} title={item.title} />
      </div>
      <AddToBasketText item={item} />
    </div>
  )
}
