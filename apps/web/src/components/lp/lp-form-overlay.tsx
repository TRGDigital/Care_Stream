'use client'

import { createContext, useContext } from 'react'
import type { LpPage } from '@/lib/lp/types'
import { track } from '@/lib/lp/tracker'

const Ctx = createContext<{ goToForm: () => void } | null>(null)

export function useLpOverlay() {
  return useContext(Ctx) ?? { goToForm: () => {} }
}

// The enquiry form lives in the hero on every viewport, so every CTA simply
// scrolls back up to it (no sticky rail, no mobile overlay).
export function LpFormOverlayProvider({ page: _page, children }: { page: LpPage; children: React.ReactNode }) {
  const goToForm = () => {
    track('cta_click')
    if (typeof document === 'undefined') return
    const el = document.getElementById('enquire')
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }
  return <Ctx.Provider value={{ goToForm }}>{children}</Ctx.Provider>
}

// CTA that scrolls to the hero enquiry form.
export function LpCta({ className, children }: { className?: string; children: React.ReactNode }) {
  const { goToForm } = useLpOverlay()
  return <button type="button" onClick={goToForm} className={className}>{children}</button>
}
