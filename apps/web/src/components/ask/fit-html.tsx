'use client'

// Shows a designed page (HTML made by the server, 640 wide) scaled down to the width it has, with its height following, so it never needs a scroll bar.
import { useLayoutEffect, useRef, useState } from 'react'

export function FitHtml({ html, width = 640, className = '' }: { html: string; width?: number; className?: string }) {
  const outer = useRef<HTMLDivElement>(null), inner = useRef<HTMLDivElement>(null)
  const [box, setBox] = useState<{ scale: number; h: number }>({ scale: 1, h: 0 })
  useLayoutEffect(() => {
    const measure = () => {
      const w = outer.current?.clientWidth ?? width, h = inner.current?.scrollHeight ?? 0
      const scale = w > 0 ? Math.min(1, w / width) : 1
      setBox({ scale, h: h * scale })
    }
    measure()
    const ro = typeof ResizeObserver !== 'undefined' ? new ResizeObserver(measure) : null
    if (ro) { if (outer.current) ro.observe(outer.current); if (inner.current) ro.observe(inner.current) }
    return () => ro?.disconnect()
  }, [html, width])
  return (
    <div ref={outer} className={`w-full overflow-hidden ${className}`} style={{ height: box.h || undefined }}>
      <div ref={inner} style={{ width, transform: `scale(${box.scale})`, transformOrigin: 'top left' }} dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
