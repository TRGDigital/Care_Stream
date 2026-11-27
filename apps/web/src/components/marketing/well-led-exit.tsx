'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { usePathname } from 'next/navigation'
import { X } from 'lucide-react'
import { HUB_PATH, showsWellLedBanner, statementFor, topicForPath } from '@/lib/well-led'

// The CQC Well-led exit popup: a visitor reading a Well-led page who is about to leave is offered a short demo request.
// Once a visit, never twice in 14 days, never again for 90 days once they have asked. It owns the exit for these pages, so the email
// capture overlay's exit question stays away (see window.__csWlExit and the shared session flags). Light and white; the copy says
// evidence FOR Well-led, never a rating. Same lead as the /demo form, so it lands wherever demo requests land.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const SEEN_KEY = 'cs_wl_exit_seen'       // localStorage: { at, done }
const SHOWN_SESSION = 'cs-wl-exit'        // sessionStorage: shown this visit
const MIN_MS = 8000                       // not before they have had a proper look
const REPEAT_DAYS = 14
const DONE_DAYS = 90

const store = {
  get(): { at: number; done: boolean } | null { try { return JSON.parse(localStorage.getItem(SEEN_KEY) || 'null') } catch { return null } },
  set(done: boolean) { try { localStorage.setItem(SEEN_KEY, JSON.stringify({ at: Date.now(), done })) } catch { /* blocked */ } },
}
const sess = (k: string, set = false) => { try { if (set) sessionStorage.setItem(k, '1'); return sessionStorage.getItem(k) === '1' } catch { return false } }
const isMobile = () => typeof window !== 'undefined' && window.matchMedia('(pointer: coarse)').matches

/** Pages that get it: where the Well-led banner shows, and the overview. Never the demo page itself. */
export function showsWellLedExit(pathname: string): boolean {
  const p = pathname.replace(/\/+$/, '')
  if (p === HUB_PATH) return true
  return showsWellLedBanner(p)
}

function suppressed(): boolean {
  if (sess(SHOWN_SESSION) || sess('cs-cap-exit') || sess('cs-exitq')) return true
  const s = store.get()
  if (!s) return false
  return Date.now() - s.at < (s.done ? DONE_DAYS : REPEAT_DAYS) * 86400000
}

type Values = { name: string; email: string; organisation: string; phone: string }

export function WellLedExit() {
  const pathname = usePathname() || ''
  const eligible = showsWellLedExit(pathname)
  const [open, setOpen] = useState(false)
  const [done, setDone] = useState(false)
  const [error, setError] = useState('')
  const [busy, setBusy] = useState(false)
  const [v, setV] = useState<Values>({ name: '', email: '', organisation: '', phone: '' })
  const panelRef = useRef<HTMLDivElement>(null)
  const firstRef = useRef<HTMLInputElement>(null)
  const topic = topicForPath(pathname)
  const st = statementFor(topic)

  const show = useCallback(() => {
    if (suppressed()) return
    sess(SHOWN_SESSION, true)
    sess('cs-cap-exit', true)     // the email capture exit stays away for this visit
    sess('cs-exitq', true)
    store.set(false)
    setOpen(true)
  }, [])

  // Tell the email capture overlay this page's exit is ours (it checks the flag on mouse leave).
  useEffect(() => {
    if (!eligible) return
    ;(window as any).__csWlExit = true
    return () => { (window as any).__csWlExit = false }
  }, [eligible])

  // Desktop: the mouse leaves through the top of the window. Phones: after reading most of the page, a firm scroll back up.
  useEffect(() => {
    if (!eligible) return
    const start = Date.now()
    const ready = () => Date.now() - start >= MIN_MS
    const leave = (e: MouseEvent) => { if (e.clientY > 0 || e.relatedTarget || !ready() || isMobile()) return; show() }
    let maxY = 0, lastY = window.scrollY, upRun = 0
    const onScroll = () => {
      if (!isMobile() || !ready()) return
      const y = window.scrollY, h = document.documentElement.scrollHeight - window.innerHeight
      maxY = Math.max(maxY, y)
      upRun = y < lastY ? upRun + (lastY - y) : 0
      lastY = y
      if (h > 0 && maxY / h > 0.6 && upRun > 350) show()
    }
    document.addEventListener('mouseout', leave)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => { document.removeEventListener('mouseout', leave); window.removeEventListener('scroll', onScroll) }
  }, [eligible, show])

  const close = useCallback(() => { setOpen(false) }, [])

  useEffect(() => {
    if (!open) return
    const prev = document.activeElement as HTMLElement | null
    setTimeout(() => firstRef.current?.focus(), 60)
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
      if (e.key === 'Tab' && panelRef.current) {
        const f = Array.from(panelRef.current.querySelectorAll<HTMLElement>('a[href],button:not([disabled]),input,textarea')).filter(x => x.offsetParent !== null)
        if (!f.length) return
        const a = f[0], z = f[f.length - 1]
        if (e.shiftKey && document.activeElement === a) { e.preventDefault(); z.focus() }
        else if (!e.shiftKey && document.activeElement === z) { e.preventDefault(); a.focus() }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => { document.removeEventListener('keydown', onKey); if (prev && prev.isConnected) prev.focus() }
  }, [open, close])

  async function submit(e: React.FormEvent) {
    e.preventDefault()
    if (busy) return
    setBusy(true); setError('')
    try {
      const res = await fetch(`${API_URL}/public/marketing/leads`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'demo', source: 'web', name: v.name, email: v.email, organisation: v.organisation, phone: v.phone || undefined,
          subject: 'CQC Well-led popup',
          message: `Asked for a demo from the CQC Well-led exit popup on ${pathname} (${st.cqcName}).`,
        }),
      })
      if (!res.ok) throw new Error('failed')
      store.set(true)
      setDone(true)
    } catch {
      setError('Something went wrong. Please try again, or email hello@carestreamai.com.')
    } finally { setBusy(false) }
  }

  if (!eligible || !open) return null
  const input = 'w-full rounded-xl border border-gray-200 px-4 py-2.5 text-sm text-neutral-dark placeholder:text-gray-400 focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/20'
  return (
    <div className="fixed inset-0 z-[90] flex items-center justify-center bg-neutral-dark/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) close() }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="wlx-h" className="relative max-h-[92vh] w-full max-w-lg overflow-y-auto rounded-3xl border border-gray-100 bg-gradient-to-b from-white to-teal-light p-6 shadow-2xl md:p-8">
        <button type="button" onClick={close} aria-label="Close" className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-neutral-mid hover:bg-white"><X size={18} /></button>
        {done ? (
          <div role="status" className="py-6 text-center">
            <span className="inline-block rounded-full border border-teal bg-white px-3 py-1 text-xs font-semibold text-teal-dark">CQC Well-led</span>
            <h2 id="wlx-h" className="mt-3 text-2xl font-extrabold text-neutral-dark">Thank you, request received</h2>
            <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-neutral-mid">We will email you within one business day to agree a time for your walkthrough.</p>
            <button type="button" onClick={close} className="mt-6 rounded-full bg-teal px-6 py-3 text-sm font-semibold text-white hover:bg-teal-dark">Back to the page</button>
          </div>
        ) : (
          <>
            <span className="inline-block rounded-full border border-teal bg-white px-3 py-1 text-xs font-semibold text-teal-dark">CQC Well-led · {st.cqcName}</span>
            <h2 id="wlx-h" className="mt-3 pr-8 text-2xl font-extrabold leading-tight text-neutral-dark">Before you go: can you show CQC you are well led?</h2>
            <p className="mt-2 text-sm leading-relaxed text-neutral-mid">See how CareStream builds your Well-led evidence in a 30 minute walkthrough, using your own policies. No pressure, just the product.</p>
            <form onSubmit={submit} className="mt-5 space-y-3">
              <input ref={firstRef} className={input} name="name" type="text" required autoComplete="name" placeholder="Full name" aria-label="Full name" value={v.name} onChange={e => setV({ ...v, name: e.target.value })} />
              <input className={input} name="email" type="email" required autoComplete="email" placeholder="Work email" aria-label="Work email" value={v.email} onChange={e => setV({ ...v, email: e.target.value })} />
              <input className={input} name="organisation" type="text" required autoComplete="organization" placeholder="Your care service" aria-label="Your care service" value={v.organisation} onChange={e => setV({ ...v, organisation: e.target.value })} />
              <input className={input} name="phone" type="tel" autoComplete="tel" placeholder="Phone number (optional)" aria-label="Phone number, optional" value={v.phone} onChange={e => setV({ ...v, phone: e.target.value })} />
              {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
              <button type="submit" disabled={busy} className="w-full rounded-full bg-teal px-6 py-3 text-sm font-semibold text-white transition-colors hover:bg-teal-dark disabled:opacity-60">{busy ? 'Sending' : 'Book my demo'}</button>
            </form>
            <p className="mt-3 text-xs leading-relaxed text-neutral-mid">We reply within one business day. This is evidence for Well-led, not a rating: only CQC rates a service.</p>
            <button type="button" onClick={close} className="mt-2 text-xs font-semibold text-neutral-mid underline underline-offset-2 hover:text-neutral-dark">No thanks</button>
          </>
        )}
      </div>
    </div>
  )
}
