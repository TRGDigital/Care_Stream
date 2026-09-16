'use client'

import { useEffect } from 'react'

// Shows a page's sticky bar once its anchor (the hero buy panel) has scrolled up out of view, as
// the theme's script does: `on` goes on the bar when the anchor's bottom edge is above the top of
// the viewport. An IntersectionObserver and a scroll listener both end in the same check, because
// the observer alone can miss a fast jump.
export function StickyBarReveal({ bar, anchor }: { bar: string; anchor: string }) {
  useEffect(() => {
    const barEl = document.querySelector(bar)
    const anchorEl = document.querySelector(anchor)
    if (!barEl || !anchorEl) return
    const sync = () => barEl.classList.toggle('on', anchorEl.getBoundingClientRect().bottom < 0)
    const io = 'IntersectionObserver' in window ? new IntersectionObserver(sync, { threshold: 0 }) : null
    io?.observe(anchorEl)
    addEventListener('scroll', sync, { passive: true })
    addEventListener('resize', sync, { passive: true })
    sync()
    return () => {
      io?.disconnect()
      removeEventListener('scroll', sync)
      removeEventListener('resize', sync)
    }
  }, [bar, anchor])
  return null
}
