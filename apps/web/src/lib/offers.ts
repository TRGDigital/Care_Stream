'use client'

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { isLive, type Offer } from './offer-rules'

export * from './offer-rules'

// The offers running on the shop, fetched by the marketing layout from the API (which syncs them
// hourly from the Funnel Insights offer calendar) and handed to every page through this context.
// Display only: checkout works the price out again on the server from the same rules.

const OffersContext = createContext<Offer[]>([])

export function OffersProvider({ offers, children }: { offers: Offer[]; children: ReactNode }) {
  return createElement(OffersContext.Provider, { value: offers }, children)
}

/** The offers live right now. Re-checked in the browser, so a page cached across midnight drops
 *  an offer that has ended and picks up the next one it already holds. */
export function useOffers(): Offer[] {
  const all = useContext(OffersContext)
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    setNow(Date.now())
    const t = setInterval(() => setNow(Date.now()), 60_000)
    return () => clearInterval(t)
  }, [])
  return all.filter(o => isLive(o, now))
}

export const money = (p: number) => `£${(p / 100).toFixed(p % 100 ? 2 : 0)}`
export const money2 = (p: number) => `£${(p / 100).toFixed(2)}`
