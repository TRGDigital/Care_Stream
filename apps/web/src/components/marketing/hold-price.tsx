'use client'

import { useCaptureState, openCapture } from './capture-bus'
import './capture-overlay.css'

// "Not buying today? Hold £12.99 each until 11 November." with a Hold my price button, under Add to
// basket on course and policy pages. Opens the email capture overlay's hold form (origin 'hold').
// Only while the overlay says there is an offer to hold for this visitor (never for the control group,
// or once they have signed up). Phones get a shorter line so it fits beside the button.
export function HoldPrice({ price }: {
  /** The price per licence under the offer ("£12.99"); policies leave it out. */
  price?: string
}) {
  const { canHold } = useCaptureState()
  if (!canHold) return null
  const d = new Date(Date.now() + 30 * 86400000)
  const long = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'long' })
  const short = d.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })
  return (
    <div className="co-hold">
      <p>
        <b>Not buying today?</b>{' '}
        <span className="co-hold-long">{price ? `Hold ${price} each until ${long}.` : `Hold this offer until ${long}.`}</span>
        <span className="co-hold-short">{price ? `Hold ${price} until ${short}.` : `Hold it until ${short}.`}</span>
      </p>
      <button type="button" onClick={() => openCapture('hold')}>Hold my price</button>
    </div>
  )
}
