'use client'

import { usePathname } from 'next/navigation'
import { useCallback, useEffect, useRef, useState } from 'react'
import { DemoForm } from './demo-form'

// The theme's Book a demo overlay, with its behaviour. Every link to /demo on the site opens it
// instead of leaving the page; the links stay real anchors, so a modified click (new tab) and a
// browser without JavaScript still reach /demo. On /demo itself the form is already on the page,
// so the link scrolls to that instead.
//
// The theme's overlay does not submit. This one sends the same lead as the /demo form, through
// the same component.

const TICK = (
  <svg viewBox="0 0 24 24" fill="none" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
    <path d="M4 12.5 9.5 18 20 6.5" />
  </svg>
)
const FOCUSABLE = 'a[href],button:not([disabled]),input,select,textarea'

export function DemoDialog() {
  const [open, setOpen] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const panelRef = useRef<HTMLDivElement>(null)
  const openerRef = useRef<HTMLElement | null>(null)
  const pathname = usePathname()

  const close = useCallback(() => {
    setOpen(false)
    const opener = openerRef.current
    openerRef.current = null
    // A trigger inside a menu that has since closed cannot take focus: never leave focus on a
    // field inside the hidden dialog.
    if (opener && opener.isConnected && opener.offsetParent !== null) opener.focus()
    else if (panelRef.current?.contains(document.activeElement)) (document.activeElement as HTMLElement).blur()
  }, [])

  // Capture phase, so the click is claimed before a Next <Link> navigates.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented || e.button !== 0 || e.metaKey || e.ctrlKey || e.shiftKey || e.altKey) return
      const a = (e.target as Element | null)?.closest?.('a[href="/demo"],a[href="/book-a-demo"]') as HTMLAnchorElement | null
      if (!a || a.target === '_blank') return
      if (window.location.pathname.replace(/\/$/, '') === '/demo') {
        const f = document.querySelector('.dmform')
        if (f) {
          e.preventDefault()
          f.scrollIntoView({ block: 'center' })
          const i = f.querySelector('input')
          if (i) setTimeout(() => i.focus(), 320)
        }
        return
      }
      e.preventDefault()
      openerRef.current = a
      setOpen(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  useEffect(() => {
    if (!open) return
    document.body.classList.add('dlg-open')
    const first = panelRef.current?.querySelector<HTMLElement>('input,select,textarea')
    const t = setTimeout(() => first?.focus(), 60)
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') { close(); return }
      if (e.key !== 'Tab' || !panelRef.current) return
      const items = Array.from(panelRef.current.querySelectorAll<HTMLElement>(FOCUSABLE)).filter(el => el.offsetParent !== null)
      if (!items.length) return
      const firstEl = items[0], lastEl = items[items.length - 1]
      if (e.shiftKey && document.activeElement === firstEl) { e.preventDefault(); lastEl.focus() }
      else if (!e.shiftKey && document.activeElement === lastEl) { e.preventDefault(); firstEl.focus() }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      clearTimeout(t)
      document.body.classList.remove('dlg-open')
      document.removeEventListener('keydown', onKey)
    }
  }, [open, close])

  // A page change (the privacy link in the form, say) closes it.
  useEffect(() => { setOpen(false) }, [pathname])

  return (
    <div
      ref={wrapRef}
      className="dlgbd"
      data-open={open ? '' : undefined}
      aria-hidden={!open}
      onClick={e => { if (e.target === wrapRef.current) close() }}
    >
      <div ref={panelRef} className="dlg" role="dialog" aria-modal="true" aria-labelledby="dlgh">
        <button className="x" type="button" aria-label="Close" onClick={close}>
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" aria-hidden="true">
            <path d="M6 6l12 12M18 6 6 18" />
          </svg>
        </button>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img className="dlglogo" src="/logo-color.svg" alt="CareStream" width={115} height={30} />
        <h2 id="dlgh">Book a demo</h2>
        <p className="sub">
          A 30-minute walkthrough with our team, using your own policies if you share them in advance. No pressure, just the product.
        </p>
        <div className="dlgchips">
          <span>{TICK}30 minutes</span>
          <span>{TICK}Your own policies</span>
          <span>{TICK}No obligation</span>
        </div>
        <DemoForm variant="dialog" />
      </div>
    </div>
  )
}
