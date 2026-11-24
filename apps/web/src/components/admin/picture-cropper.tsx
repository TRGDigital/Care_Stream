'use client'

// Position a picture before it is saved. The person drags the photo inside a round frame (that is how it will show everywhere) and zooms with a slider.
// Zoomed all the way out the whole photo fits inside the frame, so nothing has to be cut off. The result is a square JPEG, so the server has nothing left to crop.

import { useCallback, useEffect, useRef, useState } from 'react'
import { Loader2, ZoomIn, ZoomOut } from 'lucide-react'

const FRAME = 280        // the round frame on screen, in pixels
const OUT = 800          // the saved picture, in pixels

export function PictureCropper({ file, onCancel, onDone }: { file: File; onCancel: () => void; onDone: (cropped: File) => void }) {
  const [src, setSrc] = useState<string | null>(null)
  const [nat, setNat] = useState<{ w: number; h: number } | null>(null)
  const [zoom, setZoom] = useState(1)           // 0 = the whole photo fits, 1 = the frame is filled, up to 4
  const [pos, setPos] = useState({ x: 0, y: 0 })  // the photo's centre, relative to the frame's centre, in frame pixels
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null)
  const dlg = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const url = URL.createObjectURL(file); setSrc(url)
    const img = new Image(); img.onload = () => setNat({ w: img.naturalWidth, h: img.naturalHeight }); img.onerror = () => setError('That picture could not be opened. Please choose another.'); img.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // The scale that fits the whole photo inside the frame, and the scale that fills the frame; the slider moves between them and on to 4x the fill.
  const fit = nat ? FRAME / Math.max(nat.w, nat.h) : 1
  const fill = nat ? FRAME / Math.min(nat.w, nat.h) : 1
  const scale = zoom <= 1 ? fit + (fill - fit) * zoom : fill * (1 + (zoom - 1) * 1)   // zoom 1 = fill, 2 = twice the fill
  const clamp = useCallback((p: { x: number; y: number }, s: number) => {
    if (!nat) return p
    const w = nat.w * s, h = nat.h * s
    // Keep the photo covering the frame when it is bigger than the frame, and centred when it is smaller.
    const mx = Math.max(0, (w - FRAME) / 2), my = Math.max(0, (h - FRAME) / 2)
    return { x: Math.min(mx, Math.max(-mx, p.x)), y: Math.min(my, Math.max(-my, p.y)) }
  }, [nat])
  useEffect(() => { setPos(p => clamp(p, scale)) }, [scale, clamp])

  useEffect(() => {
    dlg.current?.focus()
    const k = (e: KeyboardEvent) => {
      if (e.key === 'Escape') { onCancel(); return }
      const step = e.shiftKey ? 20 : 6
      const d = e.key === 'ArrowLeft' ? [-step, 0] : e.key === 'ArrowRight' ? [step, 0] : e.key === 'ArrowUp' ? [0, -step] : e.key === 'ArrowDown' ? [0, step] : null
      if (d && !(e.target instanceof HTMLInputElement)) { e.preventDefault(); setPos(p => clamp({ x: p.x + d[0], y: p.y + d[1] }, scale)) }
    }
    document.addEventListener('keydown', k); return () => document.removeEventListener('keydown', k)
  }, [onCancel, clamp, scale])

  function down(e: React.PointerEvent) { (e.target as Element).setPointerCapture?.(e.pointerId); drag.current = { x: e.clientX, y: e.clientY, px: pos.x, py: pos.y } }
  function move(e: React.PointerEvent) { const d = drag.current; if (d) setPos(clamp({ x: d.px + (e.clientX - d.x), y: d.py + (e.clientY - d.y) }, scale)) }
  function up() { drag.current = null }

  async function save() {
    if (!nat || !src || busy) return
    setBusy(true); setError('')
    try {
      const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('load')); i.src = src })
      const canvas = document.createElement('canvas'); canvas.width = OUT; canvas.height = OUT
      const ctx = canvas.getContext('2d'); if (!ctx) throw new Error('canvas')
      ctx.fillStyle = '#f3f4f6'; ctx.fillRect(0, 0, OUT, OUT)   // soft grey shows only if the whole photo was fitted and it is not square
      const k = OUT / FRAME
      const w = nat.w * scale * k, h = nat.h * scale * k
      ctx.drawImage(img, OUT / 2 + pos.x * k - w / 2, OUT / 2 + pos.y * k - h / 2, w, h)
      const blob: Blob | null = await new Promise(r => canvas.toBlob(r, 'image/jpeg', 0.9))
      if (!blob) throw new Error('blob')
      onDone(new File([blob], 'picture.jpg', { type: 'image/jpeg' }))
    } catch { setError('The picture could not be prepared. Please try another one.'); setBusy(false) }
  }

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onCancel() }}>
      <div ref={dlg} tabIndex={-1} role="dialog" aria-modal="true" aria-label="Position your picture" className="w-full max-w-sm rounded-2xl bg-white p-5 shadow-2xl outline-none">
        <h2 className="text-base font-bold text-neutral-dark">Position the picture</h2>
        <p className="mt-1 text-sm text-neutral-mid">Drag the photo to move it. Use the slider to zoom. Slide fully to the left to fit the whole photo.</p>
        <div className="mt-4 flex justify-center">
          <div onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up}
            className="relative cursor-grab touch-none select-none overflow-hidden rounded-full border border-gray-300 bg-gray-100 active:cursor-grabbing" style={{ width: FRAME, height: FRAME }} aria-label="Photo, drag to move">
            {src && nat && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={src} alt="" draggable={false} style={{ position: 'absolute', left: '50%', top: '50%', width: nat.w * scale, height: nat.h * scale, maxWidth: 'none', transform: `translate(calc(-50% + ${pos.x}px), calc(-50% + ${pos.y}px))` }} />
            )}
            {!nat && !error && <span className="absolute inset-0 flex items-center justify-center text-neutral-mid"><Loader2 className="animate-spin" size={20} /></span>}
          </div>
        </div>
        <div className="mt-4 flex items-center gap-2">
          <ZoomOut size={16} className="text-neutral-mid" aria-hidden="true" />
          <input type="range" min={0} max={3} step={0.02} value={zoom} onChange={e => setZoom(Number(e.target.value))} aria-label="Zoom" className="w-full accent-teal" />
          <ZoomIn size={16} className="text-neutral-mid" aria-hidden="true" />
        </div>
        {error && <p role="alert" className="mt-2 text-sm text-red-700">{error}</p>}
        <div className="mt-4 flex justify-end gap-2">
          <button type="button" onClick={onCancel} className="rounded-lg px-3 py-2 text-sm font-medium text-neutral-mid hover:text-neutral-dark">Cancel</button>
          <button type="button" onClick={save} disabled={!nat || busy} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">{busy && <Loader2 size={14} className="animate-spin" />} Use this picture</button>
        </div>
      </div>
    </div>
  )
}
