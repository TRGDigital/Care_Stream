'use client'

import { useEffect } from 'react'
import { initTracker, track } from '@/lib/lp/tracker'

// Initialises the tracker, logs the page view, and fires scroll-depth events.
export function LpTracking({ pageId }: { pageId: string }) {
  useEffect(() => {
    initTracker(pageId)
    track('page_view')
    const fired = new Set<number>()
    const onScroll = () => {
      const el = document.documentElement
      const max = el.scrollHeight - el.clientHeight
      if (max <= 0) return
      const pct = Math.min(100, Math.round((el.scrollTop / max) * 100))
      for (const t of [25, 50, 75, 100]) {
        if (pct >= t && !fired.has(t)) { fired.add(t); track(`scroll_${t}`) }
      }
    }
    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [pageId])
  return null
}
