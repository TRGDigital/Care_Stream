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

export const persistentCache = {
  get<T>(key: string): T | undefined {
    const mem = store.get(key)
    if (mem !== undefined) return mem as T
    if (typeof window === 'undefined') return undefined
    try {
      const raw = localStorage.getItem(PREFIX + key)
      if (!raw) return undefined
      const v = JSON.parse(raw)
      store.set(key, v)        // promote to memory for the rest of this session
      return v as T
    } catch { return undefined }
  },
  set<T>(key: string, value: T): void {
    store.set(key, value)
    if (typeof window === 'undefined') return
    try { localStorage.setItem(PREFIX + key, JSON.stringify(value)) } catch { /* quota — in-memory still works */ }
  },
}

// Build a user-scoped cache key for a hub view, e.g. hubKey('followup', email).
export const hubKey = (name: string, userId: string) => `hub-${name}-${userId}`
