'use client'

import { OfferLine } from './offer-line'
import { useState } from 'react'
import { useOffers, licenceDeal, licenceOffer, licenceEffectivePence, endsText, money2, totalFor, paidForTotal } from '@/lib/offers'
import { BuyNowLink, TrainingAddTextLink, TrainingSaveButton } from './training-cart-buttons'
import { SHIP_NOW, sn, gbp2, withVat } from '@/lib/ship-now'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'

// The buying half of a course page laid out like a shop product page: the live offer stated in
// full beside the price ("applied automatically"), the old price struck through, the number of
// licences the buyer RECEIVES (2 for 1 shows 2), Buy now and the basket. Prices are worked out
// with the same rules checkout uses; Buy now carries the paid count to the buy page.
export function ModuleBuyPanel({ slug, title, unitPence, duration, cpd = false, fresh, sfc }: {
  slug: string; title: string; unitPence: number
  /** Ship now (lib/ship-now.ts): the course length ("1 hour 30 minutes"), shown beside the price. */
  duration?: string
  /** Ship now: a CPD Certified course (training_modules.cpd_accredited), for the mark under the button. */
  cpd?: boolean
  /** Ship now: the freshness line, only where the course content supports it. */
  fresh?: string
  /** Ship now: the Skills for Care line (text only, never their logo). */
  sfc?: string
}) {
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
        <OfferLine offer={offer} funnel="training" />
      )}
      <div className="mpe-price">
        {headline < unitPence && <s>{money2(unitPence)}</s>}
        <b>{money2(headline)}</b>
        <span>per staff member{fromQty ? ` on ${fromQty}+ licences` : ''}, one-off</span>
        {offer && <em className="mpe-badge">Offer applied</em>}
      </div>
      {SHIP_NOW && (
        <span className="sn-vat" {...sn('vat', 'VAT clarity')}>
          <b>{gbp2(headline)} + VAT</b> ({gbp2(withVat(headline).inc)} inc VAT) per staff member
        </span>
      )}
      {SHIP_NOW && duration && (
        <div className="sn-meta" {...sn('duration-certificate', 'Duration and certificate')}>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><circle cx="12" cy="12" r="8.5" /><path d="M12 7v5.5l3.5 2" /></svg>About {duration} to complete</span>
          <span><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M4 12.5 9.5 18 20 6.5" /></svg>Instant certificate on completion</span>
        </div>
      )}
      {SHIP_NOW && fresh && <p className="sn-fresh" {...sn('freshness', 'Freshness line')}>{fresh}</p>}

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
      {SHIP_NOW && (
        <p className="sn-each" {...sn('per-learner-total', 'Per learner and total')}>
          {total} {total === 1 ? 'licence' : 'licences'}: <b>{money2(perStaff)}</b> per learner, <b>{money2(cost)}</b> total + VAT ({money2(withVat(cost).inc)} inc VAT)
        </p>
      )}

      <p className="mpe-stock">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
        Instant access: your team can start today, in 60+ languages
      </p>

      <div className="mrow">
        <BuyNowLink slug={slug} qty={paid} className="add" label={`Add to basket · ${money2(cost)}`} position="hero_panel" price={money2(cost)} />
        <TrainingSaveButton slug={slug} title={title} />
      </div>
      <TrainingAddTextLink slug={slug} title={title} unitPence={unitPence} />
      {SHIP_NOW && cpd && (
        // The CPD Certified mark exactly as supplied (lib/cpd.ts): unaltered, its own proportions,
        // nothing added to it, and only on a course The CPD Certification Service has certified.
        <div className="sn-cpd" {...sn('cpd-badge', 'CPD mark under the button')}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified, The CPD Certification Service" />
          <span><b>CPD Certified course</b>Certified by The CPD Certification Service</span>
        </div>
      )}
      {SHIP_NOW && sfc && <p className="sn-sfc" {...sn('skills-for-care-wording', 'Skills for Care wording')}>{sfc}</p>}
    </div>
  )
}
