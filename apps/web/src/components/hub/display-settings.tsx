'use client'

// Display settings — accessibility controls for the staff hub only.
// A font-size stepper (scales the document root font-size, which scales every
// rem-based Tailwind size in the hub) and a high-contrast toggle. Both persist
// to localStorage and are applied to <html> immediately. The (portal) layout
// re-applies the saved prefs on load and clears them on unmount, so nothing
// leaks into the admin console (which lives outside the portal).

import { useState, useEffect, useRef } from 'react'
import { Type, Contrast, Check } from 'lucide-react'

// ─── Storage keys + scale levels (shared with the layout applier) ──────────────

export const FONT_SCALE_KEY = 'cs-hub-font-scale'
export const CONTRAST_KEY   = 'cs-hub-contrast'

// Allowed font-scale values (percent, as strings). 100 is the default.
export const FONT_SCALES = ['100', '112.5', '125', '137.5'] as const
export type FontScale = (typeof FONT_SCALES)[number]

const SCALE_LABELS: Record<FontScale, { short: string; name: string }> = {
  '100':   { short: 'A',   name: 'Default' },
  '112.5': { short: 'A+',  name: 'Large' },
  '125':   { short: 'A++', name: 'Larger' },
  '137.5': { short: 'A+++', name: 'Largest' },
}

// ─── Apply / read helpers (also used by the layout on load + cleanup) ──────────

export function applyFontScale(scale: FontScale) {
  if (typeof document === 'undefined') return
  // 100% is the default — clear the inline style rather than pin it.
  document.documentElement.style.fontSize = scale === '100' ? '' : `${scale}%`
}

export function applyContrast(on: boolean) {
  if (typeof document === 'undefined') return
  if (on) document.documentElement.setAttribute('data-hub-contrast', '1')
  else document.documentElement.removeAttribute('data-hub-contrast')
}

export function readSavedFontScale(): FontScale {
  try {
    const v = localStorage.getItem(FONT_SCALE_KEY)
    if (v && (FONT_SCALES as readonly string[]).includes(v)) return v as FontScale
  } catch { /* ignore */ }
  return '100'
}

export function readSavedContrast(): boolean {
  try {
    return localStorage.getItem(CONTRAST_KEY) === '1'
  } catch { /* ignore */ }
  return false
}

// ─── Control ───────────────────────────────────────────────────────────────────

export function DisplaySettings() {
  const [open, setOpen]         = useState(false)
  const [scale, setScale]       = useState<FontScale>('100')
  const [contrast, setContrast] = useState(false)
  // Fixed-position popover coords, computed from the button so it escapes the
  // sidebar's overflow clipping (which was cutting the panel off).
  const [pos, setPos]           = useState<{ top?: number; bottom?: number; left: number }>({ top: 0, left: 0 })
  const ref    = useRef<HTMLDivElement>(null)
  const btnRef = useRef<HTMLButtonElement>(null)

  // Anchor the panel to the button: open downward when there's room, upward
  // otherwise, and keep it within the viewport horizontally.
  function toggleOpen() {
    if (open) { setOpen(false); return }
    const r = btnRef.current?.getBoundingClientRect()
    if (r) {
      const PANEL_H = 260, PANEL_W = 240, GAP = 8
      const left = Math.min(r.left, window.innerWidth - PANEL_W - 12)
      if (window.innerHeight - r.bottom >= PANEL_H + GAP) setPos({ top: r.bottom + GAP, left })
      else setPos({ bottom: window.innerHeight - r.top + GAP, left })
    }
    setOpen(true)
  }

  // Hydrate from localStorage on mount (the layout has already applied these to
  // <html>; here we just sync the control's own state to match).
  useEffect(() => {
    setScale(readSavedFontScale())
    setContrast(readSavedContrast())
  }, [])

  // Close the popover on outside click or Escape.
  useEffect(() => {
    if (!open) return
    function onDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false)
    }
    document.addEventListener('mousedown', onDown)
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('mousedown', onDown)
      document.removeEventListener('keydown', onKey)
    }
  }, [open])

  function chooseScale(next: FontScale) {
    setScale(next)
    applyFontScale(next)
    try { localStorage.setItem(FONT_SCALE_KEY, next) } catch { /* ignore */ }
  }

  function toggleContrast() {
    const next = !contrast
    setContrast(next)
    applyContrast(next)
    try { localStorage.setItem(CONTRAST_KEY, next ? '1' : '0') } catch { /* ignore */ }
  }

  return (
    <div ref={ref}>
      <button
        ref={btnRef}
        onClick={toggleOpen}
        aria-haspopup="dialog"
        aria-expanded={open}
        className={`flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors ${open ? 'bg-teal/10 text-teal' : 'text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'}`}
      >
        <Type size={15} />
        Display
      </button>

      {open && (
        <div
          role="dialog"
          aria-label="Display settings"
          style={{ top: pos.top, bottom: pos.bottom, left: pos.left }}
          className="fixed z-[60] w-60 rounded-xl border border-gray-200 bg-white p-3 shadow-elevated"
        >
          {/* Font size stepper */}
          <div>
            <p className="mb-1.5 flex items-center gap-1.5 px-1 text-xs font-semibold uppercase tracking-wide text-neutral-mid">
              <Type size={11} /> Text size
            </p>
            <div className="grid grid-cols-4 gap-1" role="group" aria-label="Text size">
              {FONT_SCALES.map(s => {
                const active = scale === s
                return (
                  <button
                    key={s}
                    onClick={() => chooseScale(s)}
                    aria-pressed={active}
                    title={SCALE_LABELS[s].name}
                    className={`flex items-center justify-center rounded-md border py-1.5 font-semibold leading-none transition-colors ${active ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark'}`}
                  >
                    {SCALE_LABELS[s].short}
                  </button>
                )
              })}
            </div>
            <p className="mt-1 px-1 text-[11px] text-neutral-mid">{SCALE_LABELS[scale].name}</p>
          </div>

          {/* High-contrast toggle */}
          <div className="mt-3 border-t border-gray-100 pt-3">
            <button
              onClick={toggleContrast}
              role="switch"
              aria-checked={contrast}
              className="flex w-full items-center gap-2 rounded-md px-1 py-1 text-sm font-medium text-neutral-dark hover:bg-neutral-light"
            >
              <Contrast size={15} className={contrast ? 'text-teal' : 'text-neutral-mid'} />
              <span className="flex-1 text-left">High contrast</span>
              <span
                className={`relative inline-flex h-5 w-9 shrink-0 items-center rounded-full transition-colors ${contrast ? 'bg-teal' : 'bg-gray-300'}`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition-transform ${contrast ? 'translate-x-4' : 'translate-x-0.5'}`}
                />
              </span>
            </button>
            <p className="mt-1 flex items-center gap-1 px-1 text-[11px] text-neutral-mid">
              {contrast ? <><Check size={11} className="text-teal" /> Stronger text and borders</> : 'Darkens faint text and borders'}
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
