'use client'

import { useEffect, useState } from 'react'
import { X } from 'lucide-react'
import { DemoForm } from './demo-form'

// Mounted once in the marketing layout. Any click on a "Book a Demo" link
// (anything pointing at /demo) opens the booking form as an overlay instead of
// navigating, so the demo request is captured in context on every page. Direct
// navigation to /demo still works (no-JS fallback / shared links).
export function DemoModalRoot() {
  const [open, setOpen] = useState(false)

  // Intercept clicks on any /demo link, in the capture phase so we beat the
  // Next.js router. Modifier-clicks (new tab) are left to behave normally.
  useEffect(() => {
    function onClick(e: MouseEvent) {
      if (e.defaultPrevented) return
      if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button === 1) return
      const anchor = (e.target as HTMLElement | null)?.closest?.('a')
      if (!anchor) return
      let pathname = ''
      try { pathname = new URL(anchor.href).pathname } catch { return }
      if (pathname.replace(/\/+$/, '') !== '/demo') return
      e.preventDefault()
      e.stopPropagation()
      setOpen(true)
    }
    document.addEventListener('click', onClick, true)
    return () => document.removeEventListener('click', onClick, true)
  }, [])

  // Lock scroll + close on Escape while open.
  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prevOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = prevOverflow
    }
  }, [open])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Book a demo"
      className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
      onClick={() => setOpen(false)}
    >
      <div
        className="relative my-8 w-full max-w-lg rounded-2xl bg-white p-6 shadow-2xl sm:p-8"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={() => setOpen(false)}
          aria-label="Close"
          className="absolute right-4 top-4 flex h-9 w-9 items-center justify-center rounded-full text-neutral-mid transition-colors hover:bg-neutral-light hover:text-neutral-dark"
        >
          <X size={20} />
        </button>
        <div className="mb-6 pr-8">
          <p className="section-label mb-2 text-teal">Book a Demo</p>
          <h2 className="text-2xl font-extrabold leading-tight text-neutral-dark">See CareStream with your own policies.</h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-mid">
            Tell us a little about your service and we will arrange a 30 minute walkthrough.
          </p>
        </div>
        <DemoForm />
      </div>
    </div>
  )
}
