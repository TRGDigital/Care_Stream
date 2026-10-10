'use client'

import { OfferLine } from './offer-line'
import { useState } from 'react'
import { useOffers, licenceDeal, licenceOffer, licenceEffectivePence, endsText, money2, totalFor, paidForTotal, offerEmoji } from '@/lib/offers'
import { BuyNowLink, TrainingAddTextLink, TrainingSaveButton } from './training-cart-buttons'
import { SHIP_NOW, sn, withVat } from '@/lib/ship-now'
import { discountPctForQty } from '@/lib/training-commerce'
import type { Offer } from '@/lib/offer-rules'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'

// The buying half of a course page laid out like a shop product page: the live offer stated in
// full beside the price ("applied automatically"), the old price struck through, the number of
// licences the buyer RECEIVES (2 for 1 shows 2), Buy now and the basket. Prices are worked out
// with the same rules checkout uses; Buy now carries the paid count to the buy page.
export function ModuleBuyPanel({ slug, title, unitPence, duration, cpd = false, fresh, sfc, offerLine = true }: {
  slug: string; title: string; unitPence: number
  /** Ship now (lib/ship-now.ts): the course length ("1 hour 30 minutes"), shown beside the price. */
  duration?: string
  /** Ship now: a CPD Certified course (training_modules.cpd_accredited), for the mark under the button. */
  cpd?: boolean
  /** Ship now: the freshness line, only where the course content supports it. */
  fresh?: string
  /** Ship now: the Skills for Care line (text only, never their logo). */
  sfc?: string
  /** Ship now: the panel's own offer line. Off in Test 1 B, which states the offer higher up. */
  offerLine?: boolean
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

  if (SHIP_NOW) {
    // The decluttered price block (Len, 10 Oct 2026), each fact once: the price + VAT, one offer
    // line, the licences, the total with VAT, the button, then a row of ticks. The sums are the
    // checkout's: the offer, and the team discount on the paid licences when it is bigger.
    const pct = Math.max(deal.pct, discountPctForQty(paid))
    const unit = pct ? Math.round(unitPence * (1 - pct / 100)) : unitPence
    const pay = unit * paid
    const learner = Math.floor(pay / total)
    const v = withVat(pay)
    const Tick = () => <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12l5 5L20 7" /></svg>
    return (
      <div className="mpe-buy mbuy sn-buy">
        <div className="mpe-price" {...sn('vat', 'Price + VAT')}>
          {headline < unitPence && <s>{money2(unitPence)}</s>}
          <b>{money2(headline)}</b><strong className="sn-plusvat">+ VAT</strong>
          <span>per staff member{fromQty ? ` on ${fromQty}+ licences` : ''}, one-off</span>
        </div>
        {offer && offerLine && (
          <p className="sn-offer" {...sn('offer-line', 'One offer line')}>
            <span aria-hidden="true">{offerEmoji(offer)}</span> <b>{offer.label ?? offer.name}: {offerShort(offer)}</b> <small>{endsText(offer)}</small>
          </p>
        )}

        <div className="mpe-qty sn-qty">
          <div className="mpe-step">
            <button type="button" onClick={() => setP(paid - 1)} aria-label="Fewer licences">−</button>
            <input id="mpe-q" type="number" min={1} max={1000} value={total} aria-label="Licences"
                   onChange={e => setP(paidForTotal(offers, slug, parseInt(e.target.value || '1', 10)))} />
            <button type="button" onClick={() => setP(paid + 1)} aria-label="More licences">+</button>
          </div>
          <label htmlFor="mpe-q">{total === 1 ? 'licence' : 'licences'}</label>
          {deal.free > 0 && <span className="sn-hint">({paid} paid + {deal.free} free)</span>}
        </div>

        <div className="sn-total" {...sn('per-learner-total', 'Total with VAT')}>
          <p><span>Total</span> <b>{money2(pay)} + VAT</b> <span>({money2(v.inc)} inc VAT)</span></p>
          {learner !== headline && <p className="sn-learner">{total} licences: {money2(learner)} each</p>}
        </div>

        <div className="mrow">
          <BuyNowLink slug={slug} qty={paid} className="add" label="Add to basket" position="hero_panel" price={money2(pay)} />
          <TrainingSaveButton slug={slug} title={title} />
        </div>
        <TrainingAddTextLink slug={slug} title={title} unitPence={unitPence} />
        <ul className="sn-ticks" {...sn('duration-certificate', 'Duration, certificate, updated')}>
          {duration && <li><Tick />About {duration}</li>}
          <li><Tick />Instant certificate</li>
          {fresh && <li><Tick />{fresh}</li>}
        </ul>
        {cpd && (
          // The CPD Certified mark exactly as supplied (lib/cpd.ts): unaltered, its own proportions,
          // nothing added to it, and only on a course The CPD Certification Service has certified.
          <div className="sn-cpd" {...sn('cpd-badge', 'CPD mark under the button')}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified, The CPD Certification Service" />
            <span><b>CPD Certified course</b>Certified by The CPD Certification Service</span>
          </div>
        )}
        {sfc && <p className="sn-sfc" {...sn('skills-for-care-wording', 'Skills for Care wording')}>{sfc}</p>}
      </div>
    )
  }

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
        <BuyNowLink slug={slug} qty={paid} className="add" label={`Add to basket · ${money2(cost)}`} position="hero_panel" price={money2(cost)} />
        <TrainingSaveButton slug={slug} title={title} />
      </div>
      <TrainingAddTextLink slug={slug} title={title} unitPence={unitPence} />
    </div>
  )
}

const WORDS = ['zero', 'one', 'two', 'three', 'four', 'five', 'six', 'seven', 'eight', 'nine', 'ten']
const word = (n: number) => WORDS[n] ?? String(n)

/** The live offer in a few words, from its rules: "buy one, get one free", "20% off". */
function offerShort(o: Offer): string {
  if (o.kind === 'free_units') {
    const buy = Math.max(1, Math.floor(Number(o.params.buy) || 1)), free = Math.max(1, Math.floor(Number(o.params.free) || 1))
    return `buy ${word(buy)}, get ${word(free)} free`
  }
  if (o.kind === 'percent_off') {
    const min = Math.floor(Number(o.params.minQty) || 0)
    return `${Math.floor(Number(o.params.pct) || 0)}% off${min > 1 ? ` on ${min} or more` : ''}`
  }
  return o.headline ?? ''
}
