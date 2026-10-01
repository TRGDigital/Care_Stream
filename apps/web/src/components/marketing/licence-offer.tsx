'use client'

import { useEffect, useState } from 'react'
import { activeOffer, type LicenceOffer } from '@/lib/offers'
import './licence-offer.css'

// Whole days left, counted to the offer's end. Shown only in the final week, when it is a
// real reason to act; before that the end date alone says it.
function daysLeft(o: LicenceOffer, now: number) {
  return Math.ceil((Date.parse(o.ends) - now) / 86_400_000)
}

// The offer card that sits under a course's buy box. Rendered for the server's clock, then
// re-checked in the browser so a cached page stops showing it once the offer has ended.
export function LicenceOfferCard({ slug, compact = false }: { slug: string; compact?: boolean }) {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { setNow(Date.now()) }, [])
  const o = activeOffer(slug, now)
  if (!o) return null
  const left = daysLeft(o, now)
  return (
    <aside className={`lofr${compact ? ' compact' : ''}`} aria-label={o.label}>
      <svg className="lofr-ic" viewBox="0 0 48 48" aria-hidden="true">
        <path d="M24 13c-2-4 1-7 4-8" fill="none" stroke="#5B8C3A" strokeWidth="3" strokeLinecap="round" />
        <ellipse cx="17" cy="29" rx="10" ry="13" fill="#E8792B" />
        <ellipse cx="31" cy="29" rx="10" ry="13" fill="#E8792B" />
        <ellipse cx="24" cy="29" rx="9" ry="14" fill="#F28C38" />
        <path d="M17 26l4 3h-6zM31 26l-4 3h6zM17 35c4 3 10 3 14 0l-3 1-2-2-2 2-2-2-2 2z" fill="#2A1B12" />
      </svg>
      <div className="lofr-tx">
        <span className="lofr-lb">{o.label}</span>
        <b className="lofr-hd">{o.headline}</b>
        <div className="lofr-price">
          <b>{o.effectivePrice}</b>
          <span>per staff member <s>{o.normalPrice}</s></span>
        </div>
        <p className="lofr-multi">{o.multiText}</p>
        {!compact && <p>{o.reason}</p>}
        <span className="lofr-end">
          {o.endsText}{left <= 7 ? ` · ${left === 1 ? 'last day' : `${left} days left`}` : ''}
        </span>
      </div>
    </aside>
  )
}
