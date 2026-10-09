'use client'

import { useOffers, offersNow, licenceOffer } from '@/lib/offers'
import { licenceLinePence } from '@/lib/basket-value'
import './licence-offer.css'
import Link from 'next/link'
import { useCart } from '@/lib/cart-store'
import { gbp } from '@/lib/training-commerce'
import { fi } from '@/lib/funnel-insights'
import { SaveCourseButton } from './save-course-button'
import { useCtaTest } from '@/lib/cta-tests'

// The TRAINING cart's controls, in the rebuilt theme's markup, for pages outside the training
// library itself: the training collection pages.
//
// Those pages first rendered the POLICY basket's buttons on training modules, so "Add to basket"
// put a training course into the policy basket, which checks out somewhere else entirely. The
// rendered class diff caught it: the theme's training cards use `add` and `tsave` with a
// `mcart` link, and the page was emitting `pcadd`, `pcsave` and `pcbasket`.

const Cart = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" />
    <path d="M3 4h2.2l2.3 10.5h10.2L20 7.5H6" />
  </svg>
)

/** Add a module to the training cart, then step the quantity once it is in. */
export function TrainingAddButton({ slug, title, unitPence, className = '', label = 'Add to basket', position }: {
  slug: string; title: string; unitPence: number; className?: string
  /** The theme's closing band reads "Add to basket · £25.99". */
  label?: string
  /** Which button this is on the page, sent with the click (Funnel Insights › Buttons). */
  position?: string
}) {
  const { items, cart } = useCart()
  const inCart = items.find(i => i.slug === slug)
  if (inCart) {
    return (
      <span className={`add ${className}`.trim()}>
        <button type="button" aria-label="Fewer" onClick={() => cart.setQty(slug, inCart.qty - 1)}>&minus;</button>
        {inCart.qty} in basket
        <button type="button" aria-label="More" onClick={() => cart.setQty(slug, inCart.qty + 1)}>+</button>
      </span>
    )
  }
  return (
    <button type="button" className={`add ${className}`.trim()}
            onClick={() => cart.add({ slug, title, unitPence }, position)}>
      <Cart /> {label}
    </button>
  )
}

export function TrainingSaveButton({ slug, title, className = '' }: {
  slug: string; title: string; className?: string
}) {
  return <SaveCourseButton variant="theme" slug={slug} title={title} className={`tsave ${className}`.trim()} />
}

/** The floating "View basket" link, with the licence count and the discounted total from the
 *  cart store, so it cannot disagree with the checkout. Hidden while the cart is empty. */
export function TrainingCartLink() {
  const { totalQty, gross, pct, net, bundleLearners, bundleListPence } = useCart()
  if (!totalQty && !bundleLearners) return null
  return (
    // /basket, the app's basket and checkout: /buy on its own is not a page (theme's link).
    <Link className="mcart" href="/basket">
      <Cart /> <span>View basket</span> <span className="count">{totalQty + bundleLearners}</span>
      <span>{gbp((pct ? net : gross) + bundleListPence)}</span>
    </Link>
  )
}

/** The page's main action: straight to this course's purchase page with one licence set.
 *  Logged as its own event so PPC traffic that buys directly can be told apart from the basket. */
export function BuyNowLink({ slug, className = '', label = 'Add to basket', qty = 1, position, price }: {
  slug: string; className?: string; label?: string; qty?: number
  /** Which button this is on the page (hero_panel, sticky_bar, closing_section...), sent with the
   *  click and used by Funnel Insights button tests. */
  position?: string
  /** The price shown on the button, for a test's {price} wording. */
  price?: string
}) {
  // While an offer is live on this course the button takes the offer's orange.
  const offers = useOffers()
  const cls = licenceOffer(offers, slug) ? `${className} offerbtn`.trim() : className
  const test = useCtaTest('training', position || '', price)
  return (
    <Link className={cls} href={`/buy/${slug}?qty=${qty}`} style={test?.style}
          onClick={e => {
            fi('buy_now_click', { funnel: 'training', option: slug, qty, position, cta_test: test?.test, cta_variant: test?.variant, value_pence: licenceLinePence(offers, slug, qty) })
            // On a course page the buy panel opens as a drawer over the page (buy-drawer.tsx);
            // the link to /buy/ stays for anywhere without one, and for search engines.
            if ((window as unknown as { __csBuyDrawer?: string }).__csBuyDrawer === slug) {
              e.preventDefault()
              window.dispatchEvent(new CustomEvent('cs-buy-drawer', { detail: { slug, qty } }))
            }
          }}>
      {test?.label ?? label}
    </Link>
  )
}

/** Under the main button: how many of this course are already in the training basket. */
export function TrainingAddTextLink({ slug, className = '' }: {
  slug: string; title: string; unitPence: number; className?: string
}) {
  // Only says what is already in the basket: the main button reads "Add to basket" and opens the
  // cart, so an "or add to basket" link here would repeat it.
  const { items } = useCart()
  const inCart = items.find(i => i.slug === slug)
  if (!inCart) return null
  return (
    <p className={`textadd ${className}`.trim()}>
      {inCart.qty} in your basket &middot; <Link href="/basket">View basket</Link>
    </p>
  )
}

/** For any other link to /buy/<slug>: opens the course page's buy drawer instead, when there is one. */
export function openBuyDrawer(e: { preventDefault: () => void }, href: string, position?: string) {
  const m = href.match(/^\/buy\/([a-z0-9-]+)(?:\?qty=(\d+))?/)
  if (m && position) fi('buy_now_click', { funnel: 'training', option: m[1], qty: Number(m[2]) || 1, position, value_pence: licenceLinePence(offersNow(), m[1], Number(m[2]) || 1) })
  if (!m || (window as unknown as { __csBuyDrawer?: string }).__csBuyDrawer !== m[1]) return
  e.preventDefault()
  window.dispatchEvent(new CustomEvent('cs-buy-drawer', { detail: { slug: m[1], qty: Number(m[2]) || 1 } }))
}
