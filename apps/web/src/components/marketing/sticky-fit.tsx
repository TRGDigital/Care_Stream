'use client'

import { useEffect } from 'react'

// A sticky column taller than the window: sets its `top` so it pins as soon as its BOTTOM is in
// view (the shop product page pattern), and at the usual offset when it fits. Nothing in the
// column is ever out of reach.
export function StickyFit({ selector, offset = 82, gap = 16 }: { selector: string; offset?: number; gap?: number }) {
  useEffect(() => {
    const el = document.querySelector<HTMLElement>(selector)
    if (!el) return
    const fit = () => {
      const h = el.offsetHeight
      el.style.top = `${Math.min(offset, window.innerHeight - h - gap)}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(el)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [selector, offset, gap])
  return null
}
