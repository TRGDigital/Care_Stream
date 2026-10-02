'use client'

import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { BuyForm } from './buy-form'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import { reportPageView } from '@/lib/google-ads'
import './buy-page-v2.css'
import './buy-drawer.css'

// The cart drawer: "Buy now" on a course or policy page opens the purchase as a drawer over the
// page, like a Shopify cart drawer, instead of going to a separate page. Courses show the buy page's
// form (BuyForm); policies show the policy basket (policy-drawer.tsx). The old pages stay published.
//
// While it is open the address is <page>/cart, so Google Ads audiences can be built on "URL contains
// /cart" (the page view is sent to Google Ads with consent). Back closes it, and the /cart address
// opens straight into it if loaded or shared.

type Progress = { details: boolean; agreed: boolean }
type Open = { qty: number; n: number }

const STEPS = ['Your order', 'Your details', 'Secure payment']

export function CartDrawer({ slug, base, flag, event, title, subtitle, top, children }: {
  slug: string
  /** The page the drawer belongs to, e.g. /staff-training/care-certificate. */
  base: string
  /** The window flag the page's Buy now checks, and the event it fires. */
  flag: '__csBuyDrawer' | '__csPolicyDrawer'
  event: string
  title: string; subtitle: string
  top?: ReactNode
  children: (o: Open & { onProgress: (p: Progress) => void }) => ReactNode
}) {
  const [open, setOpen] = useState<Open | null>(null)
  const [progress, setProgress] = useState<Progress>({ details: false, agreed: false })
  const pushed = useRef(false)

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
    const w = window as unknown as Record<string, string | undefined>
    w[flag] = slug
    const onOpen = (e: Event) => {
      const d = (e as CustomEvent<{ slug: string; qty?: number }>).detail
      if (d?.slug === slug) show(d.qty ?? 1)
    }
    // Back (or forward) moves between the page and its /cart address.
    const onPop = () => {
      if (location.pathname.endsWith('/cart')) setOpen(o => o ?? { qty: 1, n: 1 })
      else { pushed.current = false; setOpen(null) }
    }
    window.addEventListener(event, onOpen)
    window.addEventListener('popstate', onPop)
    // Arriving on /cart (a reload, a shared link): open straight away.
    if (location.pathname.endsWith('/cart')) {
      const q = Number(new URLSearchParams(location.search).get('qty'))
      setOpen({ qty: Number.isFinite(q) && q >= 1 ? q : 1, n: 1 })
      reportPageView(location.href)
    }
    return () => {
      window.removeEventListener(event, onOpen)
      window.removeEventListener('popstate', onPop)
      if (w[flag] === slug) delete w[flag]
    }
  }, [slug, flag, event, show])

  // Esc closes it; the page behind does not scroll while it is open.
  useEffect(() => {
    if (!open) return
    const key = (e: KeyboardEvent) => { if (e.key === 'Escape') close() }
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', key)
    return () => { document.body.style.overflow = prev; window.removeEventListener('keydown', key) }
  }, [open, close])

  const onProgress = useCallback((p: Progress) => {
    setProgress(prev => (prev.details === p.details && prev.agreed === p.agreed ? prev : p))
  }, [])

  if (!open) return null
  // Step 1 is done on opening; 2 once the details are in; then payment is next.
  const done = 1 + (progress.details ? 1 : 0)
  return createPortal(
    <div className="bd-overlay" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <aside className="bd-panel" role="dialog" aria-modal="true" aria-label={title}>
        <header className="bd-head">
          <div><b>{title}</b><span>{subtitle}</span></div>
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
          {top}
          {children({ ...open, onProgress })}
          <p className="bd-terms">
            By continuing to checkout, you agree to CareStream&apos;s <a href="/terms" target="_blank" rel="noopener">Terms and Conditions</a>
            {' '}and acknowledge the <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a>.
          </p>
        </div>
      </aside>
    </div>,
    document.body,
  )
}

type Cpd = { sections: number; duration: string } | null

/** The course page's drawer: the buy page's form, with the CPD banner on a certified course. */
export function BuyDrawer({ slug, moduleName, unitPence, cpd = null }: {
  slug: string; moduleName: string; unitPence: number
  /** Only for a CPD Certified course: shows the small CPD banner. */
  cpd?: Cpd
}) {
  return (
    <CartDrawer slug={slug} base={`/staff-training/${slug}`} flag="__csBuyDrawer" event="cs-buy-drawer"
                title="Your order" subtitle={moduleName}
                top={cpd && (
                  // The CPD Certified mark exactly as supplied (lib/cpd.ts), on this certified course only.
                  <div className="bd-cpd">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={CPD_CERTIFIED_LOGO} alt="CPD Certified, The CPD Certification Service" />
                    <div><b>CPD Certified course</b><span>Certified by The CPD Certification Service. {cpd.sections} sections, about {cpd.duration}, and a certificate for every learner.</span></div>
                  </div>
                )}>
      {o => (
        <div className="bybuy">
          <BuyForm key={o.n} slug={slug} moduleName={moduleName} unitPence={unitPence} variant="theme"
                   initialQty={o.qty} onProgress={o.onProgress} termsBelow />
        </div>
      )}
    </CartDrawer>
  )
}
