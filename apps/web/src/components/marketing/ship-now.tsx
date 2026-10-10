'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SHIP_NOW, isPaidLanding, sn } from '@/lib/ship-now'
import { useCart } from '@/lib/cart-store'
import './ship-now.css'

// The "ship now" batch's page level switches (lib/ship-now.ts). Rendered once by the marketing
// layout; does nothing at all unless SHIP_NOW is on.
//
// ?shipdemo=1  puts .shipdemo on <html> for the visit, which turns on the yellow review highlight.
// Google Ads   a landing URL with gclid (or utm_source=google&utm_medium=cpc) is remembered for the
//              visit in memory only (window, no cookie, no storage, like window.__fis), and on the
//              course, CPD collection and basket pages <html> gets .ppc-strip: the header keeps the
//              logo, the basket and "Questions? Talk to us", the footer keeps contact, terms and
//              privacy. Organic visitors, and search engines, get the full navigation as before.

type W = Window & { __csPpc?: boolean; __csShipDemo?: boolean }

const STRIP = /^\/(staff-training\/(?!team-pricing)[a-z0-9-]+(\/cart)?|basket)\/?$/

export function ShipNowRoot() {
  const pathname = usePathname()
  useEffect(() => {
    if (!SHIP_NOW) return
    const w = window as W
    const q = new URLSearchParams(location.search)
    if (q.get('shipdemo') === '1') w.__csShipDemo = true
    if (q.get('shipdemo') === '0') w.__csShipDemo = false
    if (isPaidLanding(location.search)) w.__csPpc = true
    const html = document.documentElement
    html.classList.toggle('shipdemo', !!w.__csShipDemo)
    html.classList.toggle('ppc-strip', !!w.__csPpc && STRIP.test(pathname ?? ''))
  }, [pathname])
  return null
}

const CartIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /><path d="M3 4h2.2l2.3 10.5h10.2L20 7.5H6" />
  </svg>
)

/** The header's two links for Google Ads visitors (hidden by CSS for everyone else). */
export function PpcHeaderLinks() {
  const { totalQty, bundleLearners } = useCart()
  if (!SHIP_NOW) return null
  const n = totalQty + bundleLearners
  return (
    <span className="ppc-only ppc-links" {...sn('ppc-strip', 'PPC header')}>
      <Link className="ppc-q" href={`/contact?about=${encodeURIComponent('Question from a course page')}`}>Questions? <b>Talk to us</b></Link>
      <Link className="ppc-basket" href="/basket" aria-label={`Basket, ${n} ${n === 1 ? 'licence' : 'licences'}`}>
        <CartIcon />{n > 0 && <span className="ppc-count">{n}</span>}
      </Link>
    </span>
  )
}

/** The footer's links for Google Ads visitors: contact, terms and privacy (hidden otherwise). */
export function PpcFooterLinks() {
  if (!SHIP_NOW) return null
  return (
    <nav className="ppc-only ppc-flinks" aria-label="Footer" {...sn('ppc-strip', 'PPC footer')}>
      <Link href="/contact">Contact us</Link>
      <Link href="/terms">Terms of Service</Link>
      <Link href="/privacy">Privacy Policy</Link>
    </nav>
  )
}
