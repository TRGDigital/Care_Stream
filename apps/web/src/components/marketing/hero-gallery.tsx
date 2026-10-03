'use client'

import { useEffect, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { fi } from '@/lib/funnel-insights'
import './hero-gallery.css'

// The course page's hero as a product gallery, like a shop's product photos: the main picture and
// a row of thumbnails underneath, each opening a real view of the product (the course in another
// language, the certificate, the manager's dashboard). Static: nothing moves on its own.

export interface GallerySlide { key: string; label: string; thumb: ReactNode; body: ReactNode }

export function HeroGallery({ slides }: { slides: GallerySlide[] }) {
  const [i, setI] = useState(0)
  const slide = slides[i] ?? slides[0]
  if (!slide) return null
  return (
    <div className="hg">
      <div className="hg-main" aria-live="polite">{slide.body}</div>
      {slides.length > 1 && (
        <div className="hg-thumbs" role="tablist" aria-label="Product views">
          {slides.map((s, n) => (
            <button key={s.key} type="button" role="tab" aria-selected={n === i} className={n === i ? 'on' : ''}
                    data-fi={`gallery-${s.key}`} onClick={() => setI(n)}>
              <span className="hg-thumb">{s.thumb}</span>
              <span className="hg-label">{s.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}

type Lesson = { heading: string; body: string }

/** The demo lesson in English and each saved translation, switchable, as the learner sees it. */
export function LanguageSlide({ langs }: { langs: { code: string; name: string; lesson: Lesson }[] }) {
  const [code, setCode] = useState(langs.find(l => l.code !== 'eng')?.code ?? langs[0]?.code)
  const cur = langs.find(l => l.code === code) ?? langs[0]
  if (!cur) return null
  const paras = cur.lesson.body.split(/\n+/).map(t => t.trim()).filter(Boolean).slice(0, 2)
  return (
    <div className="hg-lang">
      <div className="hg-lang-bar">
        <span>Your staff choose their language</span>
        <div>
          {langs.map(l => (
            <button key={l.code} type="button" className={l.code === code ? 'on' : ''} onClick={() => setCode(l.code)}>{l.name}</button>
          ))}
        </div>
      </div>
      <div className="hg-lang-card" lang={cur.code === 'pol' ? 'pl' : cur.code === 'hin' ? 'hi' : 'en'}>
        <h3>{cur.lesson.heading}</h3>
        {paras.map((p, n) => <p key={n}>{p.length > 420 ? `${p.slice(0, 420).replace(/\s+\S*$/, '')}…` : p}</p>)}
      </div>
      <p className="hg-foot">A real lesson from this course. Over 60 languages are available in the hub.</p>
    </div>
  )
}

/** "Try before you buy": opens the same live lesson and question as the page's demo, in an overlay. */
export function TryBeforeYouBuy({ slug, children }: { slug: string; children: ReactNode }) {
  const [open, setOpen] = useState(false)
  // Add to basket inside the demo opens the cart drawer: close this first so the drawer shows.
  useEffect(() => {
    const closeForCart = () => setOpen(false)
    window.addEventListener('cs-buy-drawer', closeForCart)
    return () => window.removeEventListener('cs-buy-drawer', closeForCart)
  }, [])
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  }, [open])
  return (
    <>
      <button type="button" className="hg-try" data-fi="try-demo"
              onClick={() => { setOpen(true); fi('cta', { funnel: 'training', option: slug, label: 'try-before-you-buy' }) }}>
        <span aria-hidden="true">▶</span> Try before you buy <small>a real lesson and question, 2 minutes</small>
      </button>
      {open && createPortal(
        <div className="hg-overlay" onClick={e => { if (e.target === e.currentTarget) setOpen(false) }}>
          <div className="hg-dialog mpage-v2" role="dialog" aria-modal="true" aria-label="Try a real lesson">
            <button type="button" className="hg-close" aria-label="Close" onClick={() => setOpen(false)}>×</button>
            <div className="mpe-demo">{children}</div>
          </div>
        </div>,
        document.body,
      )}
    </>
  )
}
