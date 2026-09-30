'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-store'
import { gbp } from '@/lib/training-commerce'
import { fi } from '@/lib/funnel-insights'
import { SaveCourseButton } from './save-course-button'

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
export function TrainingAddButton({ slug, title, unitPence, className = '', label = 'Add to basket' }: {
  slug: string; title: string; unitPence: number; className?: string
  /** The theme's closing band reads "Add to basket · £25.99". */
  label?: string
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
            onClick={() => cart.add({ slug, title, unitPence })}>
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
  const { totalQty, gross, pct, net } = useCart()
  if (!totalQty) return null
  return (
    // /basket, the app's basket and checkout: /buy on its own is not a page (theme's link).
    <Link className="mcart" href="/basket">
      <Cart /> <span>View basket</span> <span className="count">{totalQty}</span>
      <span>{gbp(pct ? net : gross)}</span>
    </Link>
  )
}

/** The page's main action: straight to this course's purchase page with one licence set.
 *  Logged as its own event so PPC traffic that buys directly can be told apart from the basket. */
export function BuyNowLink({ slug, className = '', label = 'Buy now' }: {
  slug: string; className?: string; label?: string
}) {
  return (
    <Link className={className} href={`/buy/${slug}?qty=1`}
          onClick={() => fi('buy_now_click', { funnel: 'training', option: slug, qty: 1 })}>
      {label}
    </Link>
  )
}

/** The secondary action under Buy now, as plain text: adds one licence to the training basket. */
export function TrainingAddTextLink({ slug, title, unitPence, className = '' }: {
  slug: string; title: string; unitPence: number; className?: string
}) {
  const { items, cart } = useCart()
  const inCart = items.find(i => i.slug === slug)
  if (inCart) {
    return (
      <p className={`textadd ${className}`.trim()}>
        {inCart.qty} in your basket &middot; <Link href="/basket">View basket</Link>
      </p>
    )
  }
  return (
    <p className={`textadd ${className}`.trim()}>
      or <button type="button" onClick={() => { cart.add({ slug, title, unitPence }); fi('add_to_basket', { funnel: 'training', option: slug, qty: 1 }) }}>add to basket</button>
    </p>
  )
}
