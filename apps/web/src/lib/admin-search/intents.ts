'use client'

// "Do this" links from admin search. A search result can carry an intent: ?do=add-staff, ?do=start-audit&template=<id>.
// A page registers the intents it can perform with useSearchIntent. On arrival the page reads ?do= (and removes it from the URL so a
// refresh does not repeat it). When the page is already open the search dispatches an event instead of navigating.
// An intent only OPENS a form. It never sends, saves or spends credit: the person presses the button themselves.
import { useEffect, useRef } from 'react'

export type IntentParams = Record<string, string>
// A handler returns 'keep' when it only prepared the ground (for example switched tab) and a child component will perform the intent.
export type IntentHandler = (p: IntentParams) => void | 'keep'

const EVENT = 'cs-intent'
let pending: { name: string; params: IntentParams } | null = null

/** Run an intent on the page that is already open. */
export function runIntent(name: string, params: IntentParams = {}) {
  pending = { name, params }
  window.dispatchEvent(new CustomEvent(EVENT, { detail: { name, params } }))
}

export function intentHref(path: string, name: string, params: IntentParams = {}): string {
  const q = new URLSearchParams({ do: name, ...params })
  return `${path}${path.includes('?') ? '&' : '?'}${q.toString()}`
}

function fromUrl(): { name: string; params: IntentParams } | null {
  const u = new URLSearchParams(window.location.search)
  const name = u.get('do')
  if (!name) return null
  const params: IntentParams = {}
  u.forEach((v, k) => { if (k !== 'do') params[k] = v })
  return { name, params }
}

function stripFromUrl() {
  const u = new URL(window.location.href)
  if (!u.searchParams.has('do')) return
  u.searchParams.delete('do')
  window.history.replaceState(null, '', u.pathname + (u.search ? u.search : '') + u.hash)
}

export function useSearchIntent(handlers: Record<string, IntentHandler>) {
  const ref = useRef(handlers)
  ref.current = handlers
  useEffect(() => {
    const take = (it: { name: string; params: IntentParams } | null, fromUrlNow: boolean) => {
      if (!it) return false
      const h = ref.current[it.name]
      if (!h) return false
      const r = h(it.params)
      if (r !== 'keep') { pending = null; if (fromUrlNow) stripFromUrl() }
      return true
    }
    take(fromUrl(), true) || (pending && take(pending, false))
    const onEvent = (e: Event) => { const d = (e as CustomEvent).detail; take({ name: d.name, params: d.params }, false) }
    window.addEventListener(EVENT, onEvent)
    return () => window.removeEventListener(EVENT, onEvent)
  }, [])
}
