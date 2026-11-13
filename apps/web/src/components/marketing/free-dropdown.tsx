'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FREE_LIVE } from '@/lib/free-rollout'
import { fi } from '@/lib/funnel-insights'
import { CPD_CERTIFIED_LOGO } from '@/lib/cpd'
import './free-dropdown.css'

// What a free CareStream account gives you, as a card that drops down under the header on every
// page load of the marketing site. It is in the page HTML on every request (only its visibility
// is decided in the browser), so crawlers and AI tools read the same text. It does not show to
// someone already signed in, or when the free plan is switched off (?free=0).

const ITEMS = [
  'Give every member of staff CPD certified training, free',
  'Track who has finished in your training matrix',
  'Run every audit template with your team',
  'Check your first 5 policies against CQC regulations',
  'Add as many staff logins as you need',
  'Certificates for every course, with access that never expires',
]

const Tick = () => (
  <svg viewBox="0 0 24 24" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5" /></svg>
)

const signedIn = () => /(?:^|;\s*)(?:__Secure-)?next-auth\.session-token(?:\.\d+)?=/.test(document.cookie)

export function FreeDropdown() {
  const [open, setOpen] = useState(false)
  // A mega menu open on top of the page: the dropdown steps aside (without being dismissed) and returns after.
  const [menu, setMenu] = useState(false)

  useEffect(() => {
    setMenu(!!(window as any).__csMegaOpen)
    const on = (e: Event) => setMenu(!!(e as CustomEvent).detail?.open)
    window.addEventListener('cs:mega', on)
    return () => window.removeEventListener('cs:mega', on)
  }, [])

  useEffect(() => {
    if (!FREE_LIVE) return
    try {
      if (new URLSearchParams(window.location.search).get('free') === '0') return
      if (signedIn()) return
    } catch { /* show it */ }
    const t = setTimeout(() => { setOpen(true); try { fi('free_dropdown_open', { funnel: 'free' }) } catch {} }, 700)
    return () => clearTimeout(t)
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [open])

  return (
    <div className="fdrop" data-open={open && !menu ? 'true' : 'false'}>
      <div className="fdrop-in">
        <section className="fdrop-card" aria-label="What you get with a free CareStream account">
          <button type="button" className="fdrop-x" aria-label="Close" onClick={() => setOpen(false)}>
            <svg viewBox="0 0 20 20" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" aria-hidden="true"><path d="M4 4l12 12M16 4 4 16" /></svg>
          </button>
          <h2 className="fdrop-title">Create your free CareStream account to:</h2>
          <ul className="fdrop-list">
            {ITEMS.map(t => <li key={t}><Tick /><span>{t}</span></li>)}
          </ul>
          <hr className="fdrop-rule" />
          <div className="fdrop-foot">
            <div className="fdrop-foot-copy">
              <p className="fdrop-sub">CPD training, audits and policy checks in one place</p>
              <p className="fdrop-note">Free for ever · No card needed · Upgrade any time and keep everything</p>
              <div className="fdrop-acts">
                <Link className="fdrop-btn solid" href="/register?tier=free&source=dropdown" data-fi="free-dropdown-register" onClick={() => setOpen(false)}>Create free account</Link>
                <Link className="fdrop-btn ghost" href="/pricing" data-fi="free-dropdown-pricing" onClick={() => setOpen(false)}>See what is included</Link>
              </div>
            </div>
            {/* The CPD Certified mark exactly as supplied: no border, recolour or added text (lib/cpd.ts). */}
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="fdrop-cpd" src={CPD_CERTIFIED_LOGO} alt="CPD Certified" />
          </div>
        </section>
      </div>
    </div>
  )
}
