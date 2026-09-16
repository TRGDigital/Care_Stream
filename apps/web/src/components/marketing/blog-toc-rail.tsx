'use client'

import { useEffect, useState } from 'react'
import type { TocHeading } from '@/lib/blog-toc'

// The contents rail beside a post (the theme's .cs-toc), lighting the section being read. As in
// the theme: an IntersectionObserver band near the top of the viewport is the reading line, the
// last heading to enter it wins, and a scroll listener catches anything the observer misses.

const decode = (s: string) =>
  s.replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"')
    .replace(/&#39;|&rsquo;|&lsquo;/g, '’').replace(/&nbsp;/g, ' ')

export function BlogTocRail({ headings }: { headings: TocHeading[] }) {
  const [on, setOn] = useState(headings[0]?.id ?? '')
  const minLevel = Math.min(...headings.map(h => h.level))

  useEffect(() => {
    const targets = headings.map(h => document.getElementById(h.id)).filter((el): el is HTMLElement => !!el)
    if (!targets.length) return
    let io: IntersectionObserver | null = null
    if ('IntersectionObserver' in window) {
      io = new IntersectionObserver(entries => {
        const entered = entries.filter(e => e.isIntersecting)
        if (entered.length) setOn((entered[entered.length - 1].target as HTMLElement).id)
      }, { rootMargin: '-150px 0px -78% 0px', threshold: 0 })
      targets.forEach(el => io!.observe(el))
    }
    const onScroll = () => {
      let current = targets[0]
      for (const t of targets) if (t.getBoundingClientRect().top <= 150) current = t
      setOn(current.id)
    }
    addEventListener('scroll', onScroll, { passive: true })
    return () => { io?.disconnect(); removeEventListener('scroll', onScroll) }
  }, [headings])

  return (
    <nav className="cs-toc" aria-label="Table of contents">
      <p className="cs-toc-title">On this page</p>
      <ul className="cs-toc-list">
        {headings.map(h => (
          <li key={h.id} className={`cs-toc-item cs-toc-l${h.level - minLevel}${on === h.id ? ' on' : ''}`}>
            <a href={`#${h.id}`}>{decode(h.text)}</a>
          </li>
        ))}
      </ul>
    </nav>
  )
}
