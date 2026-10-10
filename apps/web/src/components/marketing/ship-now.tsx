'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { SHIP_NOW, isPaidLanding, sn } from '@/lib/ship-now'
import { useCart } from '@/lib/cart-store'
import { fi, fiAttribution } from '@/lib/funnel-insights'
import './ship-now.css'

// The "ship now" batch's page level switches (lib/ship-now.ts). Rendered once by the marketing
// layout; does nothing at all unless SHIP_NOW is on.
//
// ?shipdemo=1  puts .shipdemo on <html> for the visit, which turns on the yellow review highlight.
// Google Ads   a landing URL with gclid (or utm_source=google&utm_medium=cpc) is remembered for the
//              visit in memory only (window, no cookie, no storage, like window.__fis), and on the
//              course, CPD collection and basket pages <html> gets .ppc-strip: the header keeps the
//              logo, the basket and "Questions? Talk to us", the footer keeps contact, terms and
//              privacy. Organic visitors, and search engines, get the full navigation as before.

type W = Window & { __csPpc?: boolean; __csShipDemo?: boolean }

const STRIP = /^\/(staff-training\/(?!team-pricing)[a-z0-9-]+(\/cart)?|basket)\/?$/

export function ShipNowRoot() {
  const pathname = usePathname()
  useEffect(() => {
    if (!SHIP_NOW) return
    const w = window as W
    const q = new URLSearchParams(location.search)
    if (q.get('shipdemo') === '1') w.__csShipDemo = true
    if (q.get('shipdemo') === '0') w.__csShipDemo = false
    if (isPaidLanding(location.search)) w.__csPpc = true
    const html = document.documentElement
    html.classList.toggle('shipdemo', !!w.__csShipDemo)
    html.classList.toggle('ppc-strip', !!w.__csPpc && STRIP.test(pathname ?? ''))
  }, [pathname])
  return null
}

const CartIcon = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <circle cx="9.5" cy="19" r="1.4" /><circle cx="17" cy="19" r="1.4" /><path d="M3 4h2.2l2.3 10.5h10.2L20 7.5H6" />
  </svg>
)

/** The header's two links for Google Ads visitors (hidden by CSS for everyone else). "Talk to us"
 *  opens the contact form over the page, so an ad visitor never leaves the landing page; it stays
 *  a real link to /contact for a modified click or a browser without JavaScript. */
export function PpcHeaderLinks() {
  const { totalQty, bundleLearners } = useCart()
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLAnchorElement>(null)
  const close = useCallback(() => { setOpen(false); opener.current?.focus() }, [])
  if (!SHIP_NOW) return null
  const n = totalQty + bundleLearners
  return (
    <span className="ppc-only ppc-links" {...sn('ppc-strip', 'PPC header')}>
      <Link ref={opener} className="ppc-q" href={`/contact?about=${encodeURIComponent('Question from a course page')}`}
            onClick={e => {
              if (e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
              e.preventDefault()
              setOpen(true)
              fi('contact_open', { funnel: 'training', position: 'ppc_header', option: courseSlug() })
            }}>Questions? <b>Talk to us</b></Link>
      {open && <TalkToUs onClose={close} />}
      <Link className="ppc-basket" href="/basket" aria-label={`Basket, ${n} ${n === 1 ? 'licence' : 'licences'}`}>
        <CartIcon />{n > 0 && <span className="ppc-count">{n}</span>}
      </Link>
    </span>
  )
}

/** The footer's links for Google Ads visitors: contact, terms and privacy (hidden otherwise). */
export function PpcFooterLinks() {
  if (!SHIP_NOW) return null
  return (
    <nav className="ppc-only ppc-flinks" aria-label="Footer" {...sn('ppc-strip', 'PPC footer')}>
      <Link href="/contact">Contact us</Link>
      <Link href="/terms">Terms of Service</Link>
      <Link href="/privacy">Privacy Policy</Link>
    </nav>
  )
}

/** The course this page is about, from the address (/staff-training/<slug>), or the page path. */
function courseSlug(): string {
  const m = location.pathname.match(/^\/staff-training\/([a-z0-9-]+)/)
  return m ? m[1] : location.pathname
}

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea'

/** The contact form as an overlay. It posts to the SAME endpoint as the contact page form
 *  (/public/marketing/leads, type "contact"), so the enquiry is stored in marketing_leads and
 *  emailed to the team exactly like a contact page enquiry. The endpoint has no source or UTM
 *  fields, so, as the contact page does with ?about=, the context goes at the top of the message:
 *  the course page, the Google Ads source and campaign, and the number of staff. */
function TalkToUs({ onClose }: { onClose: () => void }) {
  const panel = useRef<HTMLDivElement>(null)
  const [f, setF] = useState({ name: '', email: '', phone: '', organisation: '', staff: '', message: '' })
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => setF(p => ({ ...p, [k]: e.target.value }))

  // Focus trap, Escape to close, the page behind held still.
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    panel.current?.querySelector<HTMLElement>('input')?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onClose(); return }
      if (e.key !== 'Tab' || !panel.current) return
      const items = Array.from(panel.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!items.length) return
      const first = items[0], last = items[items.length - 1]
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus() }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.body.style.overflow = prev; document.removeEventListener('keydown', onKey) }
  }, [onClose])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    if (!f.name.trim()) { setError('Please enter your name.'); return }
    if (!EMAIL.test(f.email.trim())) { setError('Please enter a valid email address.'); return }
    if (!f.message.trim()) { setError('Please tell us your question.'); return }
    setError(''); setBusy(true)
    const slug = courseSlug()
    const a = fiAttribution()
    const q = new URLSearchParams(location.search)
    const context = [
      `[About: Question from course page /staff-training/${slug}]`,
      `[Visit: source ${a?.source || q.get('utm_source') || 'unknown'}${a?.campaign || q.get('utm_campaign') ? `, campaign ${a?.campaign || q.get('utm_campaign')}` : ''}${a?.gclid || q.get('gclid') ? ', Google Ads click' : ''}]`,
      ...(f.staff ? [`[Staff to train: ${f.staff}]`] : []),
    ].join('\n')
    try {
      const res = await fetch(`${API_URL}/public/marketing/leads`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'contact', source: 'web', subject: 'Course page question',
          name: f.name.trim(), email: f.email.trim(), phone: f.phone.trim() || undefined,
          organisation: f.organisation.trim() || undefined,
          message: `${context}\n\n${f.message.trim()}`,
        }),
      })
      if (!res.ok) throw new Error('submit failed')
      fi('contact_submit', { funnel: 'training', position: 'ppc_header', option: slug })
      fi('lead', { funnel: 'training', label: `Course page question: ${slug}` })
      setSent(true)
    } catch {
      setError('Something went wrong, please try again, or email hello@carestreamai.com.')
    } finally {
      setBusy(false)
    }
  }

  return createPortal(
    <div className="tt-bd" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div ref={panel} className="tt-dlg" role="dialog" aria-modal="true" aria-labelledby="tt-h" {...sn('talk-to-us-overlay', 'Talk to us overlay')}>
        <button type="button" className="tt-x" aria-label="Close" onClick={onClose}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true"><path d="M6 6l12 12M18 6 6 18" /></svg>
        </button>
        <h2 id="tt-h">Questions? Talk to us</h2>
        {sent ? (
          <div className="tt-sent" role="status">
            <p><b>Thank you, we have your question.</b> A real person will reply by email within one working day.</p>
            <button type="button" className="tt-btn" onClick={onClose}>Back to the course</button>
          </div>
        ) : (
          <form onSubmit={submit} noValidate>
            <p className="tt-sub">Ask us anything about the course, pricing or paying by invoice. We reply within one working day.</p>
            <div className="tt-row">
              <label className="tt-f"><span>Your name</span><input value={f.name} onChange={set('name')} autoComplete="name" required /></label>
              <label className="tt-f"><span>Email</span><input type="email" value={f.email} onChange={set('email')} autoComplete="email" required /></label>
            </div>
            <div className="tt-row">
              <label className="tt-f"><span>Phone <i>(optional)</i></span><input type="tel" value={f.phone} onChange={set('phone')} autoComplete="tel" /></label>
              <label className="tt-f"><span>Care home or service <i>(optional)</i></span><input value={f.organisation} onChange={set('organisation')} autoComplete="organization" /></label>
            </div>
            <label className="tt-f"><span>How many staff? <i>(optional)</i></span>
              <select value={f.staff} onChange={set('staff')}>
                <option value="">Choose</option>
                <option>1 to 9</option><option>10 to 19</option><option>20 to 49</option><option>50 to 99</option><option>100 or more</option>
              </select>
            </label>
            <label className="tt-f"><span>Your question</span><textarea value={f.message} onChange={set('message')} rows={4} required /></label>
            {error && <p className="tt-err" role="alert">{error}</p>}
            <button type="submit" className="tt-btn" disabled={busy}>{busy ? 'Sending…' : 'Send my question'}</button>
            <p className="tt-note">We only use your details to answer you. <a href="/privacy" target="_blank" rel="noopener">Privacy Policy</a></p>
          </form>
        )}
      </div>
    </div>,
    document.body,
  )
}
