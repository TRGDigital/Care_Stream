'use client'

import { useEffect, useRef } from 'react'
import type { WhoPanel } from '@/lib/who-its-for-data'

// The jump nav above the twenty-two setting panels.
//
// Every panel is rendered in the document, exactly as the theme does it, so the pills only
// jump and track position. Nothing here hides content from a crawler.
//
// Two behaviours, both of which the ported stylesheet already carries rules for:
//   .wfpill.on   marks the setting you are currently scrolled into
//   .wfpills.can-l / .can-r  fade an end only when there is something to scroll to on that
//                            side, so the row reads as a scroller rather than as a pill that
//                            has been cut in half.
export function WhoItsForPills({ panels }: { panels: WhoPanel[] }) {
  const bar = useRef<HTMLElement>(null)

  useEffect(() => {
    const el = bar.current
    if (!el) return
    const pills = Array.from(el.querySelectorAll<HTMLAnchorElement>('.wfpill'))
    if (!pills.length) return
    const secs = pills.map(a => document.querySelector<HTMLElement>(a.getAttribute('href') || ''))

    const edges = () => {
      el.classList.toggle('can-l', el.scrollLeft > 4)
      el.classList.toggle('can-r', el.scrollLeft + el.clientWidth < el.scrollWidth - 4)
    }

    const mark = () => {
      const y = window.scrollY + 220
      let cur = -1
      secs.forEach((s, i) => { if (s && s.offsetTop <= y) cur = i })
      pills.forEach((a, i) => a.classList.toggle('on', i === cur))
      if (cur >= 0) {
        const r = pills[cur].getBoundingClientRect()
        const b = el.getBoundingClientRect()
        if (r.left < b.left || r.right > b.right) el.scrollLeft += r.left - b.left - 16
      }
      edges()
    }

    window.addEventListener('scroll', mark, { passive: true })
    window.addEventListener('resize', edges, { passive: true })
    el.addEventListener('scroll', edges, { passive: true })
    mark()
    return () => {
      window.removeEventListener('scroll', mark)
      window.removeEventListener('resize', edges)
      el.removeEventListener('scroll', edges)
    }
  }, [])

  return (
    <nav className="wfpills" aria-label="Jump to a care setting" ref={bar}>
      {panels.map(p => (
        <a className="wfpill" href={`#${p.id}`} key={p.id}>{p.title}</a>
      ))}
    </nav>
  )
}
