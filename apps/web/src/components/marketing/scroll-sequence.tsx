'use client'

import { useEffect } from 'react'

// The product page's two columns scroll one after the other, wherever the pointer is (it is the
// page that scrolls): the buy column on the right scrolls first while the left side (picture and
// gallery, .mpe-left) holds still under the header; once the right column's end is in view it
// holds there and the left side scrolls on.
//
// Plain sticky positioning plus one number: the grid is made exactly tall enough that the left
// side is released at the moment the right column reaches its end. Desktop only; phones stack.
export function ScrollSequence({ root, offset = 82, gap = 16 }: { root: string; offset?: number; gap?: number }) {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>(root)
    const left = grid?.querySelector<HTMLElement>('.mpe-left')
    const info = grid?.querySelector<HTMLElement>('.mpe-info')
    if (!grid || !left || !info) return
    const fit = () => {
      if (window.innerWidth <= 960) {
        grid.style.minHeight = ''; left.style.top = ''; info.style.top = ''
        return
      }
      const V = window.innerHeight
      const cs = getComputedStyle(grid)
      const padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0
      // Left: pinned at the top. Right: scrolls, then pinned once its end is in view.
      const infoTop = Math.min(offset, V - info.offsetHeight - gap)
      left.style.top = `${offset}px`
      info.style.top = `${infoTop}px`
      // Tall enough that the left side is let go when the right column ends.
      const needed = padTop + (offset - infoTop) + left.offsetHeight + padBottom
      grid.style.minHeight = `${Math.max(0, Math.ceil(needed))}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(left); ro.observe(info)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [root, offset, gap])
  return null
}
