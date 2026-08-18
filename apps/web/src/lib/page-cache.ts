// Tiny in-memory, per-session cache for admin page data. Lets pages show the
// last-loaded data instantly on re-navigation (no empty/loading flash) while
// they revalidate in the background — a lightweight stale-while-revalidate.
// Cleared on full page reload, so it never serves data across logins.
const store = new Map<string, unknown>()

export const pageCache = {
  get<T>(key: string): T | undefined {
    return store.get(key) as T | undefined
  },
  set<T>(key: string, value: T): void {
    store.set(key, value)
  },
  clear(): void {
    store.clear()
  },
}

// localStorage-backed stale-while-revalidate cache. Unlike pageCache it SURVIVES
// a full reload, so the first click of a hub view after a refresh still paints
// instantly from the last snapshot rather than showing a spinner while it fetches.
// In-memory first (fastest), then localStorage. Scope keys by user (hubKey) so a
// shared browser never shows one user's content to another.
const PREFIX = 'pc_'

// Snapshots older than this are treated as absent: painting data from hours ago
// is worse than a brief spinner, because it looks like the page is showing the
// wrong thing rather than loading.
const MAX_AGE_MS = 10 * 60 * 1000

// A hard reload is the user explicitly asking for current data, so a snapshot
// must NOT paint over it — otherwise they see old content, then a swap seconds
// later once the fetch lands, which reads as a bug. In-session navigation still
// paints instantly. Computed once per page load; falls back to allowing the
// cache where the Navigation Timing API is unavailable.
let reloadChecked = false
let isReload = false
export function wasHardReload(): boolean {
  if (reloadChecked) return isReload
  reloadChecked = true
  try {
    const nav = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined
    isReload = nav?.type === 'reload'
  } catch { isReload = false }
  return isReload
}

type Envelope<T> = { __pc: 1; t: number; v: T }
const isEnvelope = (x: any): x is Envelope<unknown> => !!x && typeof x === 'object' && x.__pc === 1

export const persistentCache = {
  get<T>(key: string): T | undefined {
    const mem = store.get(key)
    if (mem !== undefined) return mem as T
    if (typeof window === 'undefined') return undefined
    if (wasHardReload()) return undefined          // honour an explicit refresh
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return undefined
      const parsed = JSON.parse(raw)
      // Entries written before the envelope existed carry no timestamp, so their
      // age is unknowable — drop them and let the next write re-record properly.
      if (!isEnvelope(parsed)) { localStorage.removeItem(PREFIX + key); return undefined }
      if (Date.now() - parsed.t > MAX_AGE_MS) { localStorage.removeItem(PREFIX + key); return undefined }
      store.set(key, parsed.v)   // promote to memory for the rest of this session
      return parsed.v as T
    } catch { return undefined }
  },
  set<T>(key: string, value: T): void {
    store.set(key, value)
    if (typeof window === 'undefined') return
    const env: Envelope<T> = { __pc: 1, t: Date.now(), v: value }
    try { localStorage.setItem(PREFIX + key, JSON.stringify(env)) } catch { /* quota — in-memory still works */ }
  },
}

// Build a user-scoped cache key for a hub view, e.g. hubKey('followup', email).
export const hubKey = (name: string, userId: string) => `hub-${name}-${userId}`
