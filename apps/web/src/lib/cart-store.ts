'use client'

import { useSyncExternalStore } from 'react'
import { UNIT_PENCE, orderTotals } from './training-commerce'
import { BUNDLE_PREFIX } from './bundle-rules'
import { fi } from '@/lib/funnel-insights'

// A tiny localStorage-backed cart store — no provider needed. Holds one line per
// course (slug) with a quantity; volume discount is applied to the total quantity.

export type CartItem = { slug: string; title: string; qty: number; unitPence: number }

const KEY = 'cs_training_cart'
let items: CartItem[] = []
const listeners = new Set<() => void>()

function load() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(KEY)
    items = raw ? (JSON.parse(raw) as CartItem[]) : []
  } catch {
    items = []
  }
}
load()

function persist() {
  try { window.localStorage.setItem(KEY, JSON.stringify(items)) } catch {}
  listeners.forEach((l) => l())
}

// Keep tabs in sync.
if (typeof window !== 'undefined') {
  window.addEventListener('storage', (e) => { if (e.key === KEY) { load(); listeners.forEach((l) => l()) } })
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Fire-and-forget shop analytics (platform Basket Analytics). Never blocks the UI.
export function trackBasketEvent(kind: 'add' | 'checkout', moduleSlug: string, quantity = 1) {
  try {
    fetch(`${API_URL}/public/training/basket-event`, {
      method: 'POST',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ kind, module_slug: moduleSlug, quantity }),
    }).catch(() => {})
  } catch { /* analytics must never break the shop */ }
}

export const cart = {
  add(item: Omit<CartItem, 'qty'> & { qty?: number }, position?: string) {
    const qty = Math.max(1, Math.min(500, item.qty ?? 1))
    const existing = items.find((i) => i.slug === item.slug)
    if (existing) items = items.map((i) => (i.slug === item.slug ? { ...i, qty: Math.min(500, i.qty + qty) } : i))
    else items = [...items, { slug: item.slug, title: item.title, qty, unitPence: item.unitPence ?? UNIT_PENCE }]
    trackBasketEvent('add', item.slug, qty)
    fi('add_to_basket', { funnel: 'training', option: item.slug, label: item.title, qty, position })
    persist()
  },
  setQty(slug: string, qty: number) {
    const q = Math.max(1, Math.min(500, qty || 1))
    items = items.map((i) => (i.slug === slug ? { ...i, qty: q } : i))
    persist()
  },
  remove(slug: string) {
    items = items.filter((i) => i.slug !== slug)
    persist()
  },
  clear() {
    items = []
    persist()
  },
  snapshot() {
    return items
  },
}

const EMPTY: CartItem[] = []
export function useCart() {
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => items,
    () => EMPTY,
  )
  // CPD course bundles ("bundle:<key>", qty = learners) sit in the same store but are priced
  // apart (lib/bundle-rules.ts, best price wins): `items` and the team discount are single
  // courses only, `bundles` the bundle lines. bundleListPence is the bundles at their bundle price,
  // for a quick total where the live offers are not to hand.
  const singles = list.filter((i) => !i.slug.startsWith(BUNDLE_PREFIX))
  const bundles = list.filter((i) => i.slug.startsWith(BUNDLE_PREFIX))
  const totalQty = singles.reduce((s, i) => s + i.qty, 0)
  const totals = orderTotals(totalQty)
  const bundleLearners = bundles.reduce((s, i) => s + i.qty, 0)
  const bundleListPence = bundles.reduce((s, i) => s + i.qty * i.unitPence, 0)
  return { items: singles, bundles, totalQty, bundleLearners, bundleListPence, ...totals, cart }
}
