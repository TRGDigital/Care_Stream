'use client'

import { useEffect } from 'react'

// The product page's two columns scroll one after the other: the buy column on the right stays
// pinned under the header while the gallery on the left scrolls; once the gallery has ended it
// holds still and the right column scrolls on to its questions and certificate.
//
// Done with plain sticky positioning plus one number: the grid is made exactly tall enough that the
// right column is released at the moment the left one reaches its end. Desktop only; phones stack.
export function ScrollSequence({ root, offset = 82, gap = 16 }: { root: string; offset?: number; gap?: number }) {
  useEffect(() => {
    const grid = document.querySelector<HTMLElement>(root)
    const main = grid?.querySelector<HTMLElement>('.mpe-main')
    const gallery = grid?.querySelector<HTMLElement>('.mpe-gallery')
    const info = grid?.querySelector<HTMLElement>('.mpe-info')
    if (!grid || !gallery || !info) return
    const fit = () => {
      if (window.innerWidth <= 960) {
        grid.style.minHeight = ''; gallery.style.top = ''; info.style.top = ''
        return
      }
      const V = window.innerHeight
      const cs = getComputedStyle(grid)
      const padTop = parseFloat(cs.paddingTop) || 0, padBottom = parseFloat(cs.paddingBottom) || 0
      const rowGap = main && main.offsetHeight ? parseFloat(cs.rowGap) || 0 : 0
      const left = (main?.offsetHeight ?? 0) + rowGap + gallery.offsetHeight
      // Right: pinned at the top. Left: pinned once its end is in view.
      info.style.top = `${offset}px`
      gallery.style.top = `${Math.min(offset, V - gallery.offsetHeight - gap)}px`
      // Tall enough that the right column is let go when the left one ends.
      const needed = padTop + left - (V - gap) + offset + info.offsetHeight + padBottom
      grid.style.minHeight = `${Math.max(0, Math.ceil(needed))}px`
    }
    fit()
    const ro = new ResizeObserver(fit)
    ro.observe(gallery); ro.observe(info); if (main) ro.observe(main)
    window.addEventListener('resize', fit)
    return () => { ro.disconnect(); window.removeEventListener('resize', fit) }
  }, [root, offset, gap])
  return null
}
