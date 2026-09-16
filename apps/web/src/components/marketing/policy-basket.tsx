'use client'

import { useCallback, useEffect, useState } from 'react'

// The basket and the save control on a policy page. A policy is a TOGGLE, not a quantity: you
// buy one copy of your own Safeguarding Adults Policy or none.
//
// Both lists live in this browser only. There is no policy checkout yet, so "Checkout" goes to
// the contact page carrying what was collected, which is exactly where the single Buy button
// on the current live page goes. A control that collects and then hands off is honest; one
// that collects into nothing is not.

const KEY_BASKET = 'cs_policy_basket'
const KEY_SAVED = 'cs_policy_saved'

export interface BasketItem { slug: string; title: string; price_pence: number }

type Store = Record<string, BasketItem>

function read(key: string): Store {
  // Private windows and blocked site data both throw rather than return null.
  try { return JSON.parse(localStorage.getItem(key) || '{}') || {} } catch { return {} }
}

function write(key: string, value: Store) {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* nothing to do */ }
}

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

/** Broadcast within the tab: localStorage's own `storage` event only fires in OTHER tabs, so
 *  the pill would not notice a button in this one. */
const CHANGED = 'cs-policy-basket-changed'
const announce = () => window.dispatchEvent(new Event(CHANGED))

function useStore(key: string) {
  const [store, setStore] = useState<Store>({})
  useEffect(() => {
    const sync = () => setStore(read(key))
    sync()
    window.addEventListener(CHANGED, sync)
    window.addEventListener('storage', sync)
    return () => {
      window.removeEventListener(CHANGED, sync)
      window.removeEventListener('storage', sync)
    }
  }, [key])
  return store
}

const CartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9" cy="20" r="1.4" /><circle cx="18" cy="20" r="1.4" />
    <path d="M3 4h2.2l2.3 11.2h11l1.8-7.9H6" />
  </svg>
)

const HeartIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"
       strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M12 20.3 4.6 13a4.6 4.6 0 0 1 6.5-6.5l.9.9.9-.9A4.6 4.6 0 1 1 19.4 13z" />
  </svg>
)

export function AddToBasket({ item, className = '' }: { item: BasketItem; className?: string }) {
  const store = useStore(KEY_BASKET)
  const inBasket = !!store[item.slug]
  const toggle = useCallback(() => {
    const next = read(KEY_BASKET)
    if (next[item.slug]) delete next[item.slug]
    else next[item.slug] = item
    write(KEY_BASKET, next)
    announce()
  }, [item])

  return (
    <button type="button" className={`pcadd ${className}`.trim()} onClick={toggle}
            data-in={inBasket ? '1' : undefined}
            aria-pressed={inBasket}>
      <CartIcon /> {inBasket ? 'In your basket' : 'Add to basket'}
    </button>
  )
}

export function SavePolicy({ slug, title, className = '' }: {
  slug: string; title: string; className?: string
}) {
  const store = useStore(KEY_SAVED)
  const saved = !!store[slug]
  const toggle = useCallback(() => {
    const next = read(KEY_SAVED)
    if (next[slug]) delete next[slug]
    else next[slug] = { slug, title, price_pence: 0 }
    write(KEY_SAVED, next)
    announce()
  }, [slug, title])

  return (
    <button type="button" className={`pcsave ${className}`.trim()} onClick={toggle} aria-pressed={saved}
            title={saved ? 'Saved for later' : 'Save this policy for later'}
            aria-label={`${saved ? 'Remove' : 'Save'} ${title} ${saved ? 'from' : 'for'} later`}>
      <HeartIcon />
    </button>
  )
}

/** The pill, bottom right. Hidden entirely while the basket is empty. */
export function BasketPill() {
  const store = useStore(KEY_BASKET)
  const items = Object.values(store)
  const total = items.reduce((n, i) => n + (i.price_pence || 0), 0)
  const about = items.length === 1 ? items[0].title : 'Policy basket'

  return (
    <div className={`pcbasket${items.length ? ' on' : ''}`} hidden={!items.length}>
      <span>
        <b>{money(total)}</b>
        <span className="n">{items.length} {items.length === 1 ? 'policy' : 'policies'}</span>
      </span>
      <a href={`/contact?about=${encodeURIComponent(about)}`}>Checkout</a>
    </div>
  )
}

/** The bar that appears once the buy card has scrolled past. */
export function StickyBuyBar({ item, image }: { item: BasketItem; image: string | null }) {
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const card = document.querySelector('.pcbuycard')
    if (!card) return
    const io = new IntersectionObserver(([e]) => setShown(!e.isIntersecting && e.boundingClientRect.top < 0))
    io.observe(card)
    return () => io.disconnect()
  }, [])

  return (
    // No `hidden` here: the bar slides in on the `on` class, and hiding it outright would
    // cancel the transition the stylesheet defines.
    <div className={`pcstick${shown ? ' on' : ''}`}>
      <div className="pcstick-in">
        {image && <span className="thumb"><img src={image} alt="" /></span>}
        <span className="who">
          <b>{item.title}</b>
          <span className="meta">{money(item.price_pence)} one-off<i>·</i>Delivered within 2 working days</span>
        </span>
        <SavePolicy slug={item.slug} title={item.title} />
        <AddToBasket item={item} />
      </div>
    </div>
  )
}
