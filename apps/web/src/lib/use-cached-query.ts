'use client'

// One rule for every admin page, tab and panel: NEVER blank the screen for data we have already seen.
//
//   const q = useCachedQuery(`admin-staff-${userId}`, () => api.staff.list())
//   q.data      the last result for this key, painted on the very first render when we have one
//   q.loading   true only when there is nothing to show yet (first ever visit)
//   q.refreshing true while a background re-fetch runs (show nothing, or a subtle hint at most)
//   q.reload()  re-fetch now (call after a save); q.setData(next) updates screen and cache together
//
// On every mount (page to page, tab to tab) it paints the cached value instantly, then re-fetches in the background and
// swaps in the fresh result. Backed by persistentCache: in memory for the session, plus localStorage so a refresh also
// paints instantly (a hard reload deliberately skips the stored copy, see page-cache.ts).
//
// KEY RULES: the key must contain everything that changes the answer (user id, the selected id, filters, month). Keys
// that omit the user id would show one person's data to another on a shared browser. Pass key = null to not fetch yet.

import { useCallback, useEffect, useRef, useState } from 'react'
import { persistentCache } from '@/lib/page-cache'

export function useCachedQuery<T>(key: string | null, fetcher: () => Promise<T>, opts: { enabled?: boolean } = {}) {
  const enabled = opts.enabled !== false && key !== null
  const read = (k: string | null) => (k ? persistentCache.get<T>(k) : undefined)
  const [data, setDataState] = useState<T | undefined>(() => read(key))
  const [loading, setLoading] = useState<boolean>(() => enabled && read(key) === undefined)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fetcherRef = useRef(fetcher); fetcherRef.current = fetcher
  const keyRef = useRef(key); keyRef.current = key
  const seq = useRef(0)

  const run = useCallback(async () => {
    const k = keyRef.current
    if (!k) return
    const mine = ++seq.current
    setRefreshing(true); setError(null)
    try {
      const v = await fetcherRef.current()
      if (mine !== seq.current || keyRef.current !== k) return          // a newer request or another key won
      persistentCache.set(k, v); setDataState(v)
    } catch (e: any) {
      if (mine === seq.current) setError(e?.message ?? 'Could not load')
    } finally {
      if (mine === seq.current) { setLoading(false); setRefreshing(false) }
    }
  }, [])

  // Key changed (or first mount): paint what we have for the new key at once, then refresh.
  useEffect(() => {
    if (!enabled) return
    const cached = read(key)
    setDataState(cached); setLoading(cached === undefined)
    run()
  }, [key, enabled]) // eslint-disable-line react-hooks/exhaustive-deps

  const setData = useCallback((next: T | ((prev: T | undefined) => T)) => {
    setDataState(prev => {
      const v = typeof next === 'function' ? (next as (p: T | undefined) => T)(prev) : next
      if (keyRef.current) persistentCache.set(keyRef.current, v)
      return v
    })
  }, [])

  return { data, loading, refreshing, error, reload: run, setData }
}
