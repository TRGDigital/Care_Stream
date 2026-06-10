'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { LpPage } from '@/lib/lp/types'
import { LpForm } from './lp-form'
import { track } from '@/lib/lp/tracker'

const Ctx = createContext<{ goToForm: () => void } | null>(null)

export function useLpOverlay() {
  return useContext(Ctx) ?? { goToForm: () => {} }
}

// Provides goToForm(): desktop scrolls to the sticky form rail; mobile opens the
// form as an overlay (there is no inline form on mobile).
export function LpFormOverlayProvider({ page, children }: { page: LpPage; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  const goToForm = () => {
    track('cta_click')
    if (typeof window !== 'undefined' && window.matchMedia('(min-width: 1024px)').matches) {
      const el = document.getElementById('form')
      if (el) { el.scrollIntoView({ behavior: 'smooth', block: 'center' }); return }
    }
    setOpen(true)
  }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  return (
    <Ctx.Provider value={{ goToForm }}>
      {children}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Book a demo"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-black/50 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="relative my-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/80 text-neutral-mid hover:bg-white hover:text-neutral-dark"
            >
              <X size={18} />
            </button>
            <LpForm page={page} />
          </div>
        </div>
      )}
    </Ctx.Provider>
  )
}

// CTA that routes to the form: scroll-to-rail on desktop, overlay on mobile.
export function LpCta({ className, children }: { className?: string; children: React.ReactNode }) {
  const { goToForm } = useLpOverlay()
  return <button type="button" onClick={goToForm} className={className}>{children}</button>
}

// Mobile-only "Book a demo" band shown after sections.
export function LpMobileCta({ label = 'Book a demo' }: { label?: string }) {
  return (
    <div className="bg-neutral-light px-6 py-6 lg:hidden">
      <LpCta className="btn-amber block w-full rounded-btn py-4 text-center text-sm">{label}</LpCta>
    </div>
  )
}
