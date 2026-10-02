'use client'

import { endsText, offerEmoji, type Offer } from '@/lib/offers'

/** The offer box the course and policy pages show under the title ("🎃 Halloween offer: Buy one
 *  licence, get the second free. Ends midnight, Saturday 31 October. Applied automatically at
 *  checkout."), shared so the page, its overlay and anything else always say the same thing. */
export function OfferLine({ offer, funnel, className = 'mpe-offerline' }: {
  offer: Offer; funnel: 'training' | 'policies'; className?: string
}) {
  return (
    <div className={className}>
      <span className="mpe-offer-emoji" aria-hidden="true">{offerEmoji(offer)}</span>
      <p><b>{offer.label}: {offer.headline}.</b> {endsText(offer)}. {funnel === 'training' ? 'Applied automatically at checkout.' : 'Applied automatically in your basket.'}</p>
    </div>
  )
}
