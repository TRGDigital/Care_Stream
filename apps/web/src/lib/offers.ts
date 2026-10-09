'use client'

import { createContext, createElement, useContext, useEffect, useState, type ReactNode } from 'react'
import { isLive, licenceDeal, type Offer } from './offer-rules'
import { offerLock } from './offer-lock'

export * from './offer-rules'

// The offers running on the shop, fetched by the marketing layout from the API (which syncs them
// hourly from the Funnel Insights offer calendar) and handed to every page through this context.
// Display only: checkout works the price out again on the server from the same rules.

const OffersContext = createContext<Offer[]>([])

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export function OffersProvider({ offers, children }: { offers: Offer[]; children: ReactNode }) {
  // An offer held on a personal link (lib/offer-lock.ts) joins the live ones in this browser.
  const [held, setHeld] = useState<Offer | null>(null)
  useEffect(() => {
    const load = () => {
      const token = offerLock()
      if (!token) return
      fetch(`${API_URL}/public/offers/lock/${token}`).then(r => r.json()).then(j => setHeld(j?.data?.offer ?? null)).catch(() => {})
    }
    load()
    window.addEventListener('cs-offer-lock', load)
    return () => window.removeEventListener('cs-offer-lock', load)
  }, [])
  const value = held && !offers.some(o => o.key === held.key && isLive(o)) ? [...offers, held] : offers
  current = value
  return createElement(OffersContext.Provider, { value }, children)
}

// The same offers for code outside React (the cart store, click handlers), so the value sent with
// a shop event is priced like the basket.
let current: Offer[] = []
export const offersNow = (): Offer[] => current.filter(o => isLive(o))

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

// Licence counts as the buyer sees them: the TOTAL they receive (2 for 1 shows 2, 4, 6). The
// stepper moves the paid count by one; a typed total is met with the fewest paid licences.
export function totalFor(offers: Offer[], slug: string, paid: number): number {
  return paid + licenceDeal(offers, slug, paid).free
}
export function paidForTotal(offers: Offer[], slug: string, total: number): number {
  let paid = 1
  while (paid < 500 && totalFor(offers, slug, paid) < total) paid++
  return paid
}

// The emoji beside an offer, from its badge or name, so each event in the calendar looks like
// itself (the pumpkin was fixed for Halloween). First match wins; anything new gets a gift.
const OFFER_EMOJI: [RegExp, string][] = [
  [/halloween/i, '🎃'], [/bonfire|firework|festival of lights|diwali/i, '🎆'], [/christmas|boxing day/i, '🎄'],
  [/new year/i, '🎉'], [/burns/i, '📜'], [/black friday/i, '🏷️'], [/small business/i, '🛍️'], [/valentine/i, '❤️'],
  [/pancake/i, '🥞'], [/mothering/i, '💐'], [/st patrick/i, '☘️'], [/st george/i, '🌹'], [/easter/i, '🐣'],
  [/spring/i, '🌷'], [/bank holiday/i, '🌤️'], [/nurses/i, '🩺'], [/carers/i, '💜'], [/wimbledon/i, '🎾'],
  [/heatwave/i, '🌡️'], [/summer|solstice|longest day/i, '☀️'], [/carnival/i, '🎊'],
  [/september|school|training year|intake/i, '🎒'], [/october|older persons/i, '🍂'], [/november|movember/i, '🍁'],
  [/new season|fashion/i, '✨'], [/data protection/i, '🔒'], [/cqc/i, '📋'],
]
export function offerEmoji(o: Pick<Offer, 'label' | 'name'> | null | undefined): string {
  const text = `${o?.label ?? ''} ${o?.name ?? ''}`
  return OFFER_EMOJI.find(([re]) => re.test(text))?.[1] ?? '🎁'
}
