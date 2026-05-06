'use client'

import { useRef, useEffect, useState } from 'react'

export { MOCKUPS } from './mockup-data'

interface MockupProps {
  src: string
  nativeWidth?: number
  nativeHeight?: number
  className?: string
}

export function Mockup({ src, nativeWidth = 960, nativeHeight = 680, className = '' }: MockupProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const [scale, setScale] = useState<number | null>(null)

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const update = () => {
      const w = el.offsetWidth
      if (w > 0) setScale(w / nativeWidth)
    }

    update()
    const ro = new ResizeObserver(update)
    ro.observe(el)
    return () => ro.disconnect()
  }, [nativeWidth])

  // Set src via ref to sidestep React's SSR iframe src suppression
  useEffect(() => {
    if (iframeRef.current && scale !== null) {
      iframeRef.current.src = src
    }
  }, [src, scale])

  const displayHeight = scale !== null ? Math.round(nativeHeight * scale) : Math.round(nativeHeight * 0.52)

  return (
    <div
      ref={containerRef}
      className={`w-full overflow-hidden rounded-2xl shadow-elevated bg-[#e8eeee] ${className}`}
      style={{ height: displayHeight }}
    >
      {scale !== null && (
        <iframe
          ref={iframeRef}
          scrolling="no"
          title="Product mockup"
          style={{
            width: nativeWidth,
            height: nativeHeight,
            border: 'none',
            transform: `scale(${scale})`,
            transformOrigin: 'top left',
            pointerEvents: 'none',
            display: 'block',
          }}
        />
      )}
    </div>
  )
}
