'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SiteImage } from '@/components/site-image'

// "The platform": thirteen product screens as a snapping carousel with a tab row above it.
//
// Ported from the theme's own script rather than reimplemented. Two things in it matter and
// are easy to lose:
//
// 1. The arrows move ONE slide, not a screenful. Len reported them jumping two or three at a
//    time on the preview; the fix is to step from whichever slide is currently nearest the
//    centre rather than scrolling by the track's width.
// 2. The nearest slide is marked `active` on scroll, which is what keeps the peeking
//    neighbours dimmed and the tabs in step.

export interface Slide {
  title: string
  body: string
  href: string
  image: string
  colour: string
}

export function HomeShowcase({ slides }: { slides: Slide[] }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)

  // Centre slide `i` in the track. Measured from the slide's own box, so it lands correctly
  // whatever the viewport does to the peeking neighbours.
  const go = useCallback((i: number) => {
    const el = track.current
    if (!el) return
    const n = Math.max(0, Math.min(slides.length - 1, i))
    const slide = el.children[n + 1] as HTMLElement | undefined   // +1: leading spacer
    if (!slide) return
    el.scrollTo({
      left: slide.offsetLeft - (el.clientWidth - slide.clientWidth) / 2,
      behavior: 'smooth',
    })
  }, [slides.length])

  useEffect(() => {
    const el = track.current
    if (!el) return
    let raf = 0
    const sync = () => {
      cancelAnimationFrame(raf)
      raf = requestAnimationFrame(() => {
        const mid = el.scrollLeft + el.clientWidth / 2
        let best = 0
        let dist = Infinity
        Array.from(el.children).forEach((c, i) => {
          if (i === 0 || i > slides.length) return           // skip the spacers
          const s = c as HTMLElement
          const d = Math.abs(s.offsetLeft + s.clientWidth / 2 - mid)
          if (d < dist) { dist = d; best = i - 1 }
        })
        setActive(best)
      })
    }
    el.addEventListener('scroll', sync, { passive: true })
    sync()
    return () => { el.removeEventListener('scroll', sync); cancelAnimationFrame(raf) }
  }, [slides.length])

  return (
    <>
      <div className="wrap">
        <div className="tabs" role="tablist">
          {slides.map((s, i) => (
            <button type="button" className="tab" role="tab" key={s.title}
                    aria-selected={i === active} onClick={() => go(i)}>
              {s.title}
            </button>
          ))}
        </div>
      </div>

      <div className="wrap" style={{ maxWidth: 'none', padding: 0 }}>
        <div className="track" ref={track}>
          {/* Spacers either side so the first and last slides can still sit centred. */}
          <div style={{ flex: '0 0 max(28px,calc((100vw - min(940px,88vw))/2 - 22px))' }}
               aria-hidden="true" />
          {slides.map((s, i) => (
            <div className={`slide${i === active ? ' active' : ''}`} key={s.title}>
              <div className="slide-head">
                <span className="slide-ico" style={{ background: s.colour }} />
                <div><h3>{s.title}</h3><p>{s.body}</p></div>
                <Link className="readmore" href={s.href}>Read more</Link>
              </div>
              <div className="shot"><SiteImage src={s.image} alt={s.title} /></div>
            </div>
          ))}
          <div style={{ flex: '0 0 max(28px,calc((100vw - min(940px,88vw))/2 - 22px))' }}
               aria-hidden="true" />
        </div>
      </div>

      <div className="wrap navrow">
        {/* One slide at a time, from wherever the track has actually settled. */}
        <button type="button" className="nav" onClick={() => go(active - 1)}
                aria-label="Previous">‹</button>
        <button type="button" className="nav" onClick={() => go(active + 1)}
                aria-label="Next">›</button>
      </div>
    </>
  )
}
