'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { X } from 'lucide-react'
import type { LpPage } from '@/lib/lp/types'
import { LpForm } from './lp-form'
import { track } from '@/lib/lp/tracker'

const Ctx = createContext<{ openForm: () => void } | null>(null)

export function useLpOverlay() {
  return useContext(Ctx) ?? { openForm: () => {} }
}

// Every "Book a demo" CTA opens the enquiry form as a centred pop-up overlay
// (quicker than scrolling back to the hero form).
export function LpFormOverlayProvider({ page, children }: { page: LpPage; children: React.ReactNode }) {
  const [open, setOpen] = useState(false)
  const openForm = () => { track('cta_click'); setOpen(true) }

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [open])

  return (
    <Ctx.Provider value={{ openForm }}>
      {children}
      {open && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Book a demo"
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-neutral-dark/55 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setOpen(false)}
        >
          <div className="relative my-8 w-full max-w-lg" onClick={e => e.stopPropagation()}>
            <button
              type="button"
              aria-label="Close"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 flex h-9 w-9 items-center justify-center rounded-full bg-white/90 text-neutral-mid hover:bg-white hover:text-neutral-dark"
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

// CTA that opens the enquiry form overlay.
export function LpCta({ className, children }: { className?: string; children: React.ReactNode }) {
  const { openForm } = useLpOverlay()
  return <button type="button" onClick={openForm} className={className}>{children}</button>
}
