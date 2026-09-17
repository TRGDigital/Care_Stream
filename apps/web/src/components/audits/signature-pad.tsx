'use client'

// A drawn signature. Works with a finger, stylus or mouse; reports a PNG data URL (or null when cleared).

import { useEffect, useRef, useState } from 'react'
import { Eraser } from 'lucide-react'

export function SignaturePad({ onChange, height = 140, disabled }: { onChange: (dataUrl: string | null) => void; height?: number; disabled?: boolean }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const last = useRef<{ x: number; y: number } | null>(null)
  const [empty, setEmpty] = useState(true)
  const hasInk = useRef(false)   // state lags a stroke behind; the ref is current

  // Size the drawing surface to the element at device pixel ratio, so strokes stay sharp.
  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ratio = Math.max(1, window.devicePixelRatio || 1)
    const rect = c.getBoundingClientRect()
    c.width = Math.round(rect.width * ratio)
    c.height = Math.round(height * ratio)
    const ctx = c.getContext('2d')!
    ctx.scale(ratio, ratio)
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.strokeStyle = '#111827'
  }, [height])

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: e.clientX - r.left, y: e.clientY - r.top }
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    if (disabled) return
    e.currentTarget.setPointerCapture(e.pointerId)
    drawing.current = true
    last.current = point(e)
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    if (!drawing.current || !last.current) return
    const ctx = canvas.current!.getContext('2d')!
    const p = point(e)
    ctx.beginPath(); ctx.moveTo(last.current.x, last.current.y); ctx.lineTo(p.x, p.y); ctx.stroke()
    last.current = p
    if (!hasInk.current) { hasInk.current = true; setEmpty(false) }
  }
  function up() {
    if (!drawing.current) return
    drawing.current = false
    last.current = null
    onChange(hasInk.current ? canvas.current!.toDataURL('image/png') : null)
  }
  function clear() {
    const c = canvas.current!
    c.getContext('2d')!.clearRect(0, 0, c.width, c.height)
    hasInk.current = false
    setEmpty(true)
    onChange(null)
  }

  return (
    <div>
      <div className="relative rounded-lg border border-gray-300 bg-white">
        <canvas ref={canvas} style={{ height, touchAction: 'none' }} className="block w-full cursor-crosshair rounded-lg"
          onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up} aria-label="Signature box" />
        {empty && <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-sm text-gray-300">Sign here</span>}
        <span className="pointer-events-none absolute bottom-6 left-4 right-4 border-b border-dashed border-gray-200" />
      </div>
      <button type="button" onClick={clear} disabled={disabled || empty} className="mt-1 inline-flex items-center gap-1 text-xs text-neutral-mid hover:text-neutral-dark disabled:opacity-40">
        <Eraser size={12} /> Clear
      </button>
    </div>
  )
}
