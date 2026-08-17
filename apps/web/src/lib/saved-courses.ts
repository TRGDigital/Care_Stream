'use client'

import { useSyncExternalStore } from 'react'

// A tiny localStorage-backed "saved courses" list — the same shape as the cart
// store, but with no quantities or pricing. Visitors who aren't ready to buy can
// bookmark a course and come back to it from the basket page.
//
// Only the slug and title are stored: every link (course page, buy page) is
// derived from the slug, so a saved entry can never go stale against a route change.

export type SavedCourse = { slug: string; title: string }

const KEY = 'cs_saved_courses'
let items: SavedCourse[] = []
const listeners = new Set<() => void>()

function load() {
  if (typeof window === 'undefined') return
  try {
    const raw = window.localStorage.getItem(KEY)
    const parsed = raw ? JSON.parse(raw) : []
    // Tolerate entries written by earlier versions (which also carried an href).
    items = Array.isArray(parsed)
      ? parsed.filter((i) => i && typeof i.slug === 'string').map((i) => ({ slug: i.slug, title: String(i.title ?? i.slug) }))
      : []
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

export const savedCourses = {
  add(item: SavedCourse) {
    if (items.some((i) => i.slug === item.slug)) return
    items = [...items, { slug: item.slug, title: item.title }]
    persist()
  },
  remove(slug: string) {
    items = items.filter((i) => i.slug !== slug)
    persist()
  },
  toggle(item: SavedCourse) {
    if (items.some((i) => i.slug === item.slug)) savedCourses.remove(item.slug)
    else savedCourses.add(item)
  },
  snapshot() {
    return items
  },
}

const EMPTY: SavedCourse[] = []

export function useSavedCourses() {
  const list = useSyncExternalStore(
    (cb) => { listeners.add(cb); return () => listeners.delete(cb) },
    () => items,
    () => EMPTY,
  )
  return { items: list, isSaved: (slug: string) => list.some((i) => i.slug === slug), savedCourses }
}
