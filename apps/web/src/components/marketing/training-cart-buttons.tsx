'use client'

import Link from 'next/link'
import { useCart } from '@/lib/cart-store'
import { gbp } from '@/lib/training-commerce'
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
    <Link className="mcart" href="/buy">
      <Cart /> <span>View basket</span> <span className="count">{totalQty}</span>
      <span>{gbp(pct ? net : gross)}</span>
    </Link>
  )
}
