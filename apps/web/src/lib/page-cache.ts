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
