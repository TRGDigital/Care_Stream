'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'

// "Related articles": three cards in view, arrows either side to scroll through the rest. The cards are
// ordinary server rendered links, so they are all in the HTML; this only adds the arrows and snapping.
export function RelatedScroller({ children }: { children: ReactNode }) {
  const track = useRef<HTMLDivElement>(null)
  const [edge, setEdge] = useState({ start: true, end: false })

  const update = useCallback(() => {
    const el = track.current
    if (!el) return
    setEdge({ start: el.scrollLeft <= 4, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 4 })
  }, [])

  useEffect(() => {
    update()
    const el = track.current
    if (!el) return
    el.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => { el.removeEventListener('scroll', update); window.removeEventListener('resize', update) }
  }, [update])

  const go = (dir: -1 | 1) => {
    const el = track.current
    if (!el) return
    // One "page" is the visible cards; overshoot is clipped by the browser at the ends.
    el.scrollBy({ left: dir * (el.clientWidth + 26), behavior: 'smooth' })
  }

  return (
    <div className="brel-wrap">
      <button type="button" className="brel-arrow prev" aria-label="Previous articles" onClick={() => go(-1)} disabled={edge.start}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M15 5l-7 7 7 7" /></svg>
      </button>
      <div className="brel-track" ref={track}>{children}</div>
      <button type="button" className="brel-arrow next" aria-label="Next articles" onClick={() => go(1)} disabled={edge.end}>
        <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M9 5l7 7-7 7" /></svg>
      </button>
    </div>
  )
}
