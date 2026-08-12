'use client'

import { useSyncExternalStore } from 'react'
import { UNIT_PENCE, orderTotals } from './training-commerce'

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

export const cart = {
  add(item: Omit<CartItem, 'qty'> & { qty?: number }) {
    const qty = Math.max(1, Math.min(500, item.qty ?? 1))
    const existing = items.find((i) => i.slug === item.slug)
    if (existing) items = items.map((i) => (i.slug === item.slug ? { ...i, qty: Math.min(500, i.qty + qty) } : i))
    else items = [...items, { slug: item.slug, title: item.title, qty, unitPence: item.unitPence ?? UNIT_PENCE }]
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
  const totalQty = list.reduce((s, i) => s + i.qty, 0)
  const totals = orderTotals(totalQty)
  return { items: list, totalQty, ...totals, cart }
}
