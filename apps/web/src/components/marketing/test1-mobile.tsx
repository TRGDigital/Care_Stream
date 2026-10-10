'use client'

import { useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useOffers, licenceOffer, licenceDeal, licenceEffectivePence, money2, offerEmoji } from '@/lib/offers'
import { BuyNowLink } from './training-cart-buttons'
import type { Test1Variant } from '@/lib/ab-test1'
import { SHIP_NOW, sn, withVat } from '@/lib/ship-now'

// Test 1, headline first on mobile (lib/ab-test1.ts). Only variant B renders the offer line and the
// bottom bar; Test1Assign renders for both variants whenever the visit is in the test.

type W = Window & {
  __fiTest?: { test: string; variant: Test1Variant }
  /** The first assignment this tab saw, kept in memory only so a random split holds for the visit. */
  __fiTestMem?: Record<string, Test1Variant>
}

/** Exposes the assignment to Funnel Insights (window.__fiTest and <html data-fi-ab-*>; the meta tags
 *  are rendered by the page) and, for a random assignment, keeps the visit on its first variant. */
export function Test1Assign({ test, variant, forced }: { test: string; variant: Test1Variant; forced: boolean }) {
  const router = useRouter()
  useEffect(() => {
    const w = window as W
    const mem = (w.__fiTestMem ??= {})
    if (!forced && mem[test] && mem[test] !== variant) {
      // A later page view in the same tab drew the other variant: show the one this visit started on.
      const u = new URL(location.href)
      u.searchParams.set('ab', mem[test] === 'B' ? 't1b' : 't1a')
      router.replace(u.pathname + u.search + u.hash, { scroll: false })
      return
    }
    mem[test] ??= variant
    w.__fiTest = { test, variant }
    const html = document.documentElement
    html.dataset.fiAbTest = test
    html.dataset.fiAbVariant = variant
    return () => {
      if (w.__fiTest?.test === test) delete w.__fiTest
      delete html.dataset.fiAbTest
      delete html.dataset.fiAbVariant
    }
  }, [test, variant, forced, router])
  return null
}

/** One compact line for the live offer, near the top on phones. Nothing when no offer is running. */
export function Test1OfferLine({ slug }: { slug: string }) {
  const offers = useOffers()
  const o = licenceOffer(offers, slug)
  if (!o) return null
  const end = new Date(`${o.ends_on}T12:00:00Z`).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'Europe/London' })
  return (
    <p className="t1-offer">
      <span aria-hidden="true">{offerEmoji(o)}</span>
      <span className="t1-offer-tx"><b>{o.label ?? o.name}:</b> {o.headline ?? ''}. Ends {end}</span>
    </p>
  )
}

/** The bar along the bottom of a phone screen: price and Add to basket, shown only while the buy
 *  box is out of view. Same BuyNowLink as every other button, so the same buy_now_click event,
 *  value_pence and buy drawer (which sends Google Ads add_to_basket), at its own position. */
export function Test1StickyBar({ slug, unitPence, anchor }: { slug: string; unitPence: number; anchor: string }) {
  const offers = useOffers()
  const [on, setOn] = useState(false)
  const [lift, setLift] = useState(0)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = document.querySelector(anchor)
    if (!el) return
    const html = document.documentElement
    const mobile = matchMedia('(max-width:760px)')
    const sync = () => {
      const r = el.getBoundingClientRect()
      const visible = r.bottom > 0 && r.top < innerHeight
      const show = mobile.matches && !visible
      setOn(show)
      html.classList.toggle('t1-bar-on', show)
      // The phone cookie strip sits along the bottom too: the bar rides just above it.
      const banner = document.querySelector('[data-cookie-banner]')
      setLift(banner ? Math.round(banner.getBoundingClientRect().height) : 0)
      if (ref.current) html.style.setProperty('--t1-bar-h', `${ref.current.offsetHeight}px`)
    }
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(sync, { threshold: 0 }) : null
    io?.observe(el)
    addEventListener('scroll', sync, { passive: true })
    addEventListener('resize', sync, { passive: true })
    mobile.addEventListener?.('change', sync)
    const t = setInterval(sync, 1000) // the cookie strip comes and goes without a scroll
    sync()
    return () => {
      io?.disconnect()
      removeEventListener('scroll', sync)
      removeEventListener('resize', sync)
      mobile.removeEventListener?.('change', sync)
      clearInterval(t)
      html.classList.remove('t1-bar-on')
      html.style.removeProperty('--t1-bar-h')
    }
  }, [anchor])

  const offer = licenceOffer(offers, slug)
  const headline = offer ? licenceEffectivePence(offer, unitPence) : unitPence
  const fromQty = offer?.kind === 'percent_off' && Number(offer.params.minQty) > 1 ? Number(offer.params.minQty) : 0
  const deal = licenceDeal(offers, slug, 1)
  const cost = deal.pct ? Math.round(unitPence * (1 - deal.pct / 100)) : unitPence

  return (
    <div ref={ref} className={`t1bar${on ? ' on' : ''}`} style={lift ? { bottom: lift } : undefined} aria-hidden={!on}>
      <div className="t1bar-price">
        {headline < unitPence && <s>{money2(unitPence)}</s>}
        <b>{money2(headline)}</b>
        {SHIP_NOW && <strong className="sn-plusvat" {...sn('vat', 'VAT')}>+ VAT</strong>}
        <span>per staff member{fromQty ? ` on ${fromQty}+` : ''}{SHIP_NOW ? `, ${money2(withVat(headline).inc)} inc VAT` : ''}</span>
      </div>
      <BuyNowLink slug={slug} className="add" position="mobile_sticky_bar" price={money2(cost)} />
    </div>
  )
}
