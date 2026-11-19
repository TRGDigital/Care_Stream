'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { SiteImage } from '@/components/site-image'

// "Why should I use CareStream?": the published scenario pages as a snapping carousel, one
// scenario at a time (picture, a short snippet and a link), with arrows and dots. The slides
// come from the repository's published scenarios, so a draft never reaches this component.

export interface WhySlide { slug: string; title: string; snippet: string; image: string; alt: string }

const Chevron = ({ dir }: { dir: 'l' | 'r' }) => (
  <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
    <path d={dir === 'l' ? 'M14.5 5.5 8 12l6.5 6.5' : 'M9.5 5.5 16 12l-6.5 6.5'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
)

export function HomeWhy({ slides, eyebrow, heading }: { slides: WhySlide[]; eyebrow: string; heading: string }) {
  const track = useRef<HTMLDivElement>(null)
  const [active, setActive] = useState(0)
  const many = slides.length > 1

  const go = useCallback((i: number) => {
    const el = track.current
    if (!el) return
    const n = Math.max(0, Math.min(slides.length - 1, i))
    el.scrollTo({ left: n * el.clientWidth, behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' })
  }, [slides.length])

  useEffect(() => {
    const el = track.current
    if (!el) return
    const onScroll = () => setActive(Math.round(el.scrollLeft / Math.max(1, el.clientWidth)))
    el.addEventListener('scroll', onScroll, { passive: true })
    return () => el.removeEventListener('scroll', onScroll)
  }, [])

  return (
    <div className="wrap why-sc">
      <div className="why-head">
        <div>
          <p className="eyebrow">{eyebrow}</p>
          <h2>{heading}</h2>
        </div>
        {many && (
          <div className="why-arrows" aria-label="Scenarios">
            <button type="button" onClick={() => go(active - 1)} disabled={active === 0} aria-label="Previous scenario"><Chevron dir="l" /></button>
            <button type="button" onClick={() => go(active + 1)} disabled={active === slides.length - 1} aria-label="Next scenario"><Chevron dir="r" /></button>
          </div>
        )}
      </div>
      <div className="why-track" ref={track} tabIndex={0} aria-roledescription="carousel" aria-label="Why should I use CareStream?">
        {slides.map((s, i) => (
          <article className="why-slide" key={s.slug} aria-label={`${i + 1} of ${slides.length}`}>
            <Link href={`/scenarios/${s.slug}`} className="why-img" tabIndex={-1} aria-hidden="true"><SiteImage src={s.image} alt="" /></Link>
            <div className="why-copy">
              <h3>{s.title}</h3>
              <p>{s.snippet}</p>
              <Link href={`/scenarios/${s.slug}`} className="why-link">Read the scenario <svg viewBox="0 0 14 14" fill="none" aria-hidden="true"><path d="M3 7h8M7.5 3.5 11 7l-3.5 3.5" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" /></svg></Link>
              {many && <p className="why-count" aria-hidden="true">{i + 1} of {slides.length}</p>}
            </div>
          </article>
        ))}
      </div>
      {many && (
        <div className="why-dots" role="tablist" aria-label="Choose a scenario">
          {slides.map((s, i) => (
            <button type="button" key={s.slug} role="tab" aria-selected={i === active} aria-label={`Scenario ${i + 1}`} className={i === active ? 'on' : ''} onClick={() => go(i)} />
          ))}
        </div>
      )}
    </div>
  )
}
