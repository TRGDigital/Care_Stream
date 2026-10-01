'use client'

import { useState } from 'react'
import { useOffers, licenceDeal, licenceOffer, licenceEffectivePence, endsText, money2, totalFor, paidForTotal } from '@/lib/offers'
import { BuyNowLink, TrainingAddTextLink, TrainingSaveButton } from './training-cart-buttons'

// The buying half of a course page laid out like a shop product page: the live offer stated in
// full beside the price ("applied automatically"), the old price struck through, the number of
// licences the buyer RECEIVES (2 for 1 shows 2), Buy now and the basket. Prices are worked out
// with the same rules checkout uses; Buy now carries the paid count to the buy page.
export function ModuleBuyPanel({ slug, title, unitPence }: { slug: string; title: string; unitPence: number }) {
  const offers = useOffers()
  const [paid, setPaid] = useState(1)
  const setP = (n: number) => setPaid(Math.max(1, Math.min(500, Math.floor(n) || 1)))
  const offer = licenceOffer(offers, slug)
  const deal = licenceDeal(offers, slug, paid)
  const total = totalFor(offers, slug, paid)
  const each = deal.pct ? Math.round(unitPence * (1 - deal.pct / 100)) : unitPence
  const cost = each * paid
  const perStaff = Math.floor(cost / total)
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
        <span>per staff member{fromQty ? ` on ${fromQty}+ licences` : ''}, one-off</span>
        {offer && <em className="mpe-badge">Offer applied</em>}
      </div>

      <div className="mpe-qty">
        <label htmlFor="mpe-q">Licences</label>
        <div className="mpe-step">
          <button type="button" onClick={() => setP(paid - 1)} aria-label="Fewer licences">−</button>
          <input id="mpe-q" type="number" min={1} max={1000} value={total}
                 onChange={e => setP(paidForTotal(offers, slug, parseInt(e.target.value || '1', 10)))} />
          <button type="button" onClick={() => setP(paid + 1)} aria-label="More licences">+</button>
        </div>
        <span className="mpe-qtynote">
          {deal.free > 0
            ? <><b>{paid} paid + {deal.free} free</b> · {money2(perStaff)} each</>
            : <>{money2(each)} each{deal.pct ? ` (${deal.pct}% off)` : ''}</>}
        </span>
      </div>

      <p className="mpe-stock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        Instant access: your team can start today, in 60+ languages
      </p>

      <div className="mrow">
        <BuyNowLink slug={slug} qty={paid} className="add" label={`Buy now · ${money2(cost)}`} />
        <TrainingSaveButton slug={slug} title={title} />
      </div>
      <TrainingAddTextLink slug={slug} title={title} unitPence={unitPence} />
    </div>
  )
}
