'use client'

import { useState } from 'react'
import { useOffers, licenceDeal, licenceOffer, licenceEffectivePence, endsText, money2 } from '@/lib/offers'
import { BuyNowLink, TrainingAddTextLink, TrainingSaveButton } from './training-cart-buttons'

// The buying half of a course page laid out like a shop product page: the live offer stated in
// full beside the price ("applied automatically"), the old price struck through, a licence count,
// Buy now and the basket. Prices shown are worked out with the same rules checkout uses.
export function ModuleBuyPanel({ slug, title, unitPence }: { slug: string; title: string; unitPence: number }) {
  const offers = useOffers()
  const [qty, setQty] = useState(1)
  const setQ = (n: number) => setQty(Math.max(1, Math.min(500, Math.floor(n) || 1)))
  const offer = licenceOffer(offers, slug)
  const deal = licenceDeal(offers, slug, qty)
  const each = deal.pct ? Math.round(unitPence * (1 - deal.pct / 100)) : unitPence
  const total = each * qty
  const perStaff = deal.free ? Math.floor(total / (qty + deal.free)) : each
  // The headline price is what one staff member costs under the offer at its best, the same
  // figure the offer card shows (2 for 1: half; 3 for 2: two thirds; % off: the reduced price).
  const headline = offer ? licenceEffectivePence(offer, unitPence) : unitPence
  const fromQty = offer?.kind === 'percent_off' && Number(offer.params.minQty) > 1 ? Number(offer.params.minQty) : 0

  return (
    <div className="mpe-buy mbuy">
      {offer && (
        <div className="mpe-offerline">
          <span className="mpe-offer-emoji" aria-hidden="true">🎃</span>
          <p><b>{offer.label}: {offer.headline}.</b> {endsText(offer)}. Applied automatically at checkout.</p>
        </div>
      )}
      <div className="mpe-price">
        {headline < unitPence && <s>{money2(unitPence)}</s>}
        <b>{money2(headline)}</b>
        <span>per staff member{fromQty ? ` on ${fromQty}+ licences` : ''}</span>
        {offer && <em className="mpe-badge">Offer applied</em>}
      </div>
      <p className="mpe-sub">One-off payment, no subscription. Bulk discounts from 10+ licences.</p>

      <div className="mpe-qty">
        <label htmlFor="mpe-q">Licences</label>
        <div className="mpe-step">
          <button type="button" onClick={() => setQ(qty - 1)} aria-label="Fewer licences">−</button>
          <input id="mpe-q" type="number" min={1} max={500} value={qty} onChange={e => setQ(parseInt(e.target.value || '1', 10))} />
          <button type="button" onClick={() => setQ(qty + 1)} aria-label="More licences">+</button>
        </div>
        <span className="mpe-qtynote">
          {deal.free > 0
            ? <>You receive <b>{qty + deal.free} licences</b> for {money2(total)}</>
            : <>{money2(total)} for {qty} {qty === 1 ? 'licence' : 'licences'}</>}
          {deal.free > 0 || deal.pct > 0 ? <> · {money2(perStaff)} each</> : null}
        </span>
      </div>

      <p className="mpe-stock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        Instant access: your team can start today, in over 60 languages
      </p>

      <div className="mrow">
        <BuyNowLink slug={slug} qty={qty} className="add" label={`Buy now · ${money2(total)}`} />
        <TrainingSaveButton slug={slug} title={title} />
      </div>
      <TrainingAddTextLink slug={slug} title={title} unitPence={unitPence} />
    </div>
  )
}
