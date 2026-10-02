'use client'

// An offer held for a buyer on a personal link (email capture's lock-in): ?lock=<token> on any
// page is remembered in this browser until the hold ends, shown as a live offer, and sent with
// every checkout so the server applies it. The server decides whether the token is valid.

const KEY = 'cs_offer_lock'
const TOKEN = /^[a-f0-9]{32}$/

export function offerLock(): string | undefined {
  if (typeof window === 'undefined') return undefined
  try {
    const fromUrl = new URLSearchParams(window.location.search).get('lock')
    if (fromUrl && TOKEN.test(fromUrl)) {
      localStorage.setItem(KEY, JSON.stringify({ token: fromUrl, at: Date.now() }))
      return fromUrl
    }
    const saved = JSON.parse(localStorage.getItem(KEY) || 'null')
    // Holds last 30 days; anything older is stale whatever the server says.
    if (saved && TOKEN.test(saved.token) && Date.now() - saved.at < 31 * 86400000) return saved.token
  } catch { /* storage blocked */ }
  return undefined
}

/** Keep a lock handed back by the overlay, so the offer applies straight away. */
export function rememberLock(token: string) {
  try { if (TOKEN.test(token)) localStorage.setItem(KEY, JSON.stringify({ token, at: Date.now() })) } catch { /* storage blocked */ }
}
