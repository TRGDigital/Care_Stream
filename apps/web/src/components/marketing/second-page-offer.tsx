'use client'

import { useEffect, useMemo, useState } from 'react'
import { createPortal } from 'react-dom'
import { useOffers, licenceOffer, policyOffer, type Offer } from '@/lib/offers'
import { fiAttribution } from '@/lib/funnel-insights'
import { loadCampaigns, hasBasket, store, type Campaign, type SecondVariant } from './capture-overlay'
import './capture-overlay.css'

// A second, different overlay on the visitor's NEXT product page in the same visit, only for people
// who already reached the first one (saw it, closed it, or were held out as its control). Set up per
// campaign in Funnel Insights › Email capture › Second page; OFF unless that is switched to live.
//
// It never makes its own price. A variant either says something (kind 'message') or points at an
// offer by its key (kind 'offer'), and an 'offer' variant only appears when that same offer is live on
// this product right now, so the overlay can never contradict the page: the offer engine still
// decides who gets what (Care Certificate only for training, best price wins).
//
// The control share sees nothing and logs second_held_out at the same moment. ?second=preview shows
// it at once on any product page, for checking copy (?second=preview&secondv=E for a given variant).

const FI = 'https://trg-funnel-insights.vercel.app'

function report(c: Campaign, key: string, stage: 'second_shown' | 'second_held_out' | 'second_click' | 'second_closed', product: string) {
  try {
    const mobile = window.matchMedia?.('(pointer: coarse)').matches && window.innerWidth < 768
    fetch(`${FI}/api/capture-event`, {
      method: 'POST', keepalive: true, headers: { 'Content-Type': 'text/plain' },
      body: JSON.stringify({ site: 'carestream', campaign: c.id, variant: key, stage, in_test: true, page: location.pathname,
                             product, device: mobile ? 'mobile' : 'desktop', session: fiAttribution()?.session }),
    }).catch(() => {})
  } catch { /* never in the way */ }
}

export function SecondPageOffer({ funnel, product, title }: { funnel: 'training' | 'policies'; product: string; title: string }) {
  const offers = useOffers()
  const offer: Offer | null = useMemo(
    () => (funnel === 'training' ? licenceOffer(offers, product) : policyOffer(offers, product)), [offers, funnel, product])
  const [pick, setPick] = useState<{ c: Campaign; v: SecondVariant | null; seconds: number } | null>(null)
  const [open, setOpen] = useState(false)

  // Count product pages in this visit (once per page view).
  const [pageNo, setPageNo] = useState(0)
  useEffect(() => {
    let n = 1
    try { n = Number(sessionStorage.getItem('cs_pages') || '0') + 1; sessionStorage.setItem('cs_pages', String(n)) } catch { /* blocked */ }
    setPageNo(n)
  }, [])

  // Decide whether this page qualifies, and which variant (or the control) this visitor gets.
  useEffect(() => {
    if (!pageNo || pick) return
    const q = new URLSearchParams(location.search)
    const preview = q.get('second') === 'preview'
    const n = pageNo
    let firstAt: string | null = null, done = false
    try { firstAt = sessionStorage.getItem('cs-cap-first'); done = sessionStorage.getItem('cs-second-done') === '1' } catch { /* blocked */ }
    if (!preview && (n < 2 || !firstAt || firstAt === location.pathname || done || hasBasket() || store.get('cs_capture_signed', false))) return
    let alive = true
    loadCampaigns(preview).then(list => {
      if (!alive) return
      const c = list.find(x => x.funnel === funnel && (!x.pages?.length || x.pages.includes(product)))
      const sp = c?.second_page
      if (!c || !sp || (sp.status !== 'live' && !preview)) return
      // Only variants that are true on this page: a message, or an offer that is live on this product.
      const usable = (sp.variants || []).filter(v => v.kind === 'message' || (v.kind === 'offer' && !!v.offer_key && offer?.key === v.offer_key))
      const forced = q.get('secondv')
      let chosen: SecondVariant | null
      if (forced) chosen = usable.find(v => v.key === forced) ?? null
      else {
        const control = Math.max(0, sp.control ?? 0)
        const total = usable.reduce((t, v) => t + Math.max(0, v.weight), 0) + control
        if (!total || !usable.length) return
        let r = Math.random() * total
        chosen = usable.find(v => (r -= Math.max(0, v.weight)) < 0) ?? null   // falls through to the control
      }
      setPick({ c, v: chosen, seconds: preview ? 0 : Math.max(0, sp.seconds ?? 10) })
    })
    return () => { alive = false }
  }, [funnel, product, offer, pageNo, pick])

  // Trigger: active seconds on this page.
  useEffect(() => {
    if (!pick || open) return
    let s = 0
    const fire = () => {
      if (s < pick.seconds) return
      clearInterval(t)
      try { sessionStorage.setItem('cs-second-done', '1') } catch { /* blocked */ }
      if (!pick.v) { report(pick.c, 'X', 'second_held_out', product); return }
      setOpen(true)
      report(pick.c, pick.v.key, 'second_shown', product)
    }
    const t = setInterval(() => { if (document.visibilityState === 'visible') { s++; fire() } }, 1000)
    fire()
    return () => clearInterval(t)
  }, [pick, open, product])

  if (!open || !pick?.v) return null
  const v = pick.v
  const name = funnel === 'training' ? `${title} training` : title
  const fill = (s?: string) => (s || '')
    .replace(/\{product\}/g, name)
    .replace(/\{offer\}/g, offer?.label || offer?.name || '')
    .replace(/\{headline\}/g, (offer?.headline || '').replace(/\.$/, ''))
  const close = () => { report(pick.c, v.key, 'second_closed', product); setOpen(false) }
  const href = v.link && v.link.startsWith('/') ? v.link : funnel === 'training' ? `/buy/${product}?qty=1` : `/care-policies/${product}`
  return createPortal(
    <div className="co-overlay" role="dialog" aria-modal="true" aria-labelledby="co2-title" onClick={e => { if (e.target === e.currentTarget) close() }}>
      <div className="co-box noimg">
        <button type="button" className="co-close" aria-label="Close" onClick={close}>×</button>
        <div className="co-copy">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="co-logo" src="/logo-color.svg" alt="CareStream" />
          {v.eyebrow && <p className="co-eyebrow">{fill(v.eyebrow)}</p>}
          <h2 id="co2-title">{fill(v.headline)}</h2>
          {v.body && <p className="co-body">{fill(v.body)}</p>}
          <a className="co-btn" href={href} onClick={() => report(pick.c, v.key, 'second_click', product)}>{fill(v.button) || 'Continue'}</a>
          <button type="button" className="co-decline" onClick={close}>No thanks</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}
