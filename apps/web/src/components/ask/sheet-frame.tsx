'use client'

// The A4 sheet of a newsletter, exactly as the server made it (the same page Save PDF and Print use): shown in a frame, scaled down to the width it has, with the height following,
// so there is never a scroll bar. HOUSE RULE 10: what you see is what you print. The page tells us whether it fits one page (a message from the fit step inside it).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

export interface SheetFit { mode: 'one' | 'two'; fits: boolean; scale: number; contentHeight: number; pageHeight: number; pages: number }
export const SHEET_PX = { portrait: { w: 794, h: 1123 }, landscape: { w: 1123, h: 794 } }

/** The height the frame needs: the page, or all of the content when it does not fit (nothing is ever cut off on screen). */
export function frameHeight(fit: SheetFit | null, orientation: 'portrait' | 'landscape'): number {
  const base = SHEET_PX[orientation].h
  if (!fit) return base
  if (fit.mode === 'two') return Math.max(base, Math.ceil(fit.contentHeight + 24))
  return fit.fits ? base : Math.max(base, Math.ceil(fit.contentHeight + 24))
}

export function SheetFrame({ html, orientation = 'portrait', onFit, title = 'The designed newsletter', className = '', fixedScale }: { html: string; orientation?: 'portrait' | 'landscape'; onFit?: (f: SheetFit) => void; title?: string; className?: string; fixedScale?: number }) {
  const outer = useRef<HTMLDivElement>(null), frame = useRef<HTMLIFrameElement>(null)
  const [fit, setFit] = useState<SheetFit | null>(null)
  const [w, setW] = useState(0)
  const { w: pw } = SHEET_PX[orientation]
  useLayoutEffect(() => {
    const m = () => setW(outer.current?.clientWidth ?? 0)
    m()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(m) : null
    if (ro && outer.current) ro.observe(outer.current)
    return () => ro?.disconnect()
  }, [])
  useEffect(() => {
    setFit(null)
    const on = (e: MessageEvent) => {
      if (e.source !== frame.current?.contentWindow) return
      const m = e.data
      if (m && m.type === 'cs-sheet-fit' && m.fit) { setFit(m.fit as SheetFit); onFit?.(m.fit as SheetFit) }
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [html])
  const h = frameHeight(fit, orientation)
  const scale = fixedScale ?? (w > 0 ? Math.min(1, w / pw) : 1)
  return (
    <div ref={outer} className={`w-full overflow-hidden bg-white shadow-sm ${className}`} style={{ height: h * scale }}>
      <iframe ref={frame} title={title} srcDoc={html} sandbox="allow-scripts" scrolling="no"
        style={{ width: pw, height: h, border: 0, display: 'block', transform: `scale(${scale})`, transformOrigin: 'top left', background: '#fff' }} />
    </div>
  )
}
