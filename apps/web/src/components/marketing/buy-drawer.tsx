'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { BuyForm } from './buy-form'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import { reportPageView } from '@/lib/google-ads'
import './buy-page-v2.css'
import './buy-drawer.css'

// "Buy now" on a course page opens the buy panel as a drawer over the page, like a Shopify cart
// drawer, instead of going to /buy/<slug>. It is the same form as the buy page (BuyForm, theme
// variant), so the licences, offer, add-on, terms and checkout cannot drift apart. The /buy/
// pages stay published for search; they are just no longer a step in the purchase.
//
// While it is open the address is /staff-training/<slug>/cart, so Google Ads audiences can be built
// on "URL contains /cart" (the page view is sent to Google Ads with consent). Back closes it, and
// the /cart address opens straight into it if loaded or shared.

type Cpd = { sections: number; duration: string } | null

const STEPS = ['Your order', 'Your details', 'Secure payment']

export function BuyDrawer({ slug, moduleName, unitPence, cpd = null }: {
  slug: string; moduleName: string; unitPence: number
  /** Only for a CPD Certified course: shows the small CPD banner. */
  cpd?: Cpd
}) {
  const [open, setOpen] = useState<{ qty: number; n: number } | null>(null)
  const [progress, setProgress] = useState({ details: false, agreed: false })
  const pushed = useRef(false)
  const base = `/staff-training/${slug}`

  const show = useCallback((qty: number) => {
    setProgress({ details: false, agreed: false })
    setOpen(o => ({ qty: Math.max(1, qty || 1), n: (o?.n ?? 0) + 1 }))
    if (!location.pathname.endsWith('/cart')) {
      history.pushState({ csCart: true }, '', `${base}/cart${location.search}`)
      pushed.current = true
    }
    reportPageView(location.href)
  }, [base])

  const close = useCallback(() => {
    setOpen(null)
    if (!location.pathname.endsWith('/cart')) return
    if (pushed.current) { pushed.current = false; history.back() }
    else history.replaceState(null, '', `${base}${location.search}`)
  }, [base])

  useEffect(() => {
    const w = window as unknown as { __csBuyDrawer?: string }
    w.__csBuyDrawer = slug
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; qty: number }>).detail
      if (d?.slug === slug) show(d.qty)
    }
    // Back (or forward) moves between the page and its /cart address.
    const onPop = () => {
      if (location.pathname.endsWith('/cart')) setOpen(o => o ?? { qty: 1, n: 1 })
      else { pushed.current = false; setOpen(null) }
    }
    window.addEventListener('cs-buy-drawer', onOpen)
    window.addEventListener('popstate', onPop)
    // Arriving on /cart (a reload, a shared link): open straight away.
    if (location.pathname.endsWith('/cart')) {
      const q = Number(new URLSearchParams(location.search).get('qty'))
      setOpen({ qty: Number.isFinite(q) && q >= 1 ? q : 1, n: 1 })
      reportPageView(location.href)
    }
    return () => {
      window.removeEventListener('cs-buy-drawer', onOpen)
      window.removeEventListener('popstate', onPop)
      if (w.__csBuyDrawer === slug) delete w.__csBuyDrawer
    }
  }, [slug, show])

  // Esc closes it; the page behind does not scroll while it is open.
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  }, [open, close])

  const onProgress = useCallback((p: { details: boolean; agreed: boolean }) => {
    setProgress(prev => (prev.details === p.details && prev.agreed === p.agreed ? prev : p))
  }, [])

  if (!open) return null
  // Step 1 is done on opening; 2 once the service and a valid email are in; 3 once the terms are agreed.
  const done = 1 + (progress.details ? 1 : 0) + (progress.details && progress.agreed ? 1 : 0)
  return createPortal(
    <div className="bd-overlay" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <aside className="bd-panel" role="dialog" aria-modal="true" aria-label={`Buy ${moduleName}`}>
        <header className="bd-head">
          <div><b>Your order</b><span>{moduleName}</span></div>
          <button type="button" className="bd-close" aria-label="Close" onClick={close}>×</button>
        </header>
        <ol className="bd-steps" aria-label="Checkout progress">
          {STEPS.map((s, i) => (
            <li key={s} className={i < done ? 'done' : i === done ? 'now' : ''}>
              <span className="n">{i < done ? '✓' : i + 1}</span><span className="t">{s}</span>
            </li>
          ))}
          <i className="bd-bar" style={{ ['--p' as string]: `${(done / STEPS.length) * 100}%` }} aria-hidden="true" />
        </ol>
        <div className="bd-body bypage-v2">
          {cpd && (
            // The CPD Certified mark exactly as supplied (lib/cpd.ts), on this certified course only.
            <div className="bd-cpd">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified, The CPD Certification Service" />
              <div><b>CPD Certified course</b><span>Certified by The CPD Certification Service. {cpd.sections} sections, about {cpd.duration}, and a certificate for every learner.</span></div>
            </div>
          )}
          <div className="bybuy">
            <BuyForm key={open.n} slug={slug} moduleName={moduleName} unitPence={unitPence} variant="theme"
                     initialQty={open.qty} onProgress={onProgress} />
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
