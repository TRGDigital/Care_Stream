'use client'

// Draw on a photo before it is uploaded: a pen, arrows and circles in a few colours, with undo.
// "Use photo" returns the marked-up image; "Use without drawing" returns the original file.

import { useEffect, useRef, useState } from 'react'
import { ArrowUpRight, Circle, Loader2, PenLine, Undo2, X } from 'lucide-react'
import { clsx } from 'clsx'

type Tool = 'pen' | 'arrow' | 'circle'
type Shape = { tool: Tool; colour: string; points: Array<{ x: number; y: number }> }
const COLOURS = ['#ef4444', '#facc15', '#22c55e', '#ffffff']
const MAX_SIDE = 1800

export function PhotoAnnotator({ file, onDone, onCancel }: { file: File; onDone: (f: File) => void; onCancel: () => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const img = useRef<HTMLImageElement | null>(null)
  const [tool, setTool] = useState<Tool>('arrow')
  const [colour, setColour] = useState(COLOURS[0])
  const [shapes, setShapes] = useState<Shape[]>([])
  const current = useRef<Shape | null>(null)
  const [ready, setReady] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const url = URL.createObjectURL(file)
    const i = new Image()
    i.onload = () => {
      const scale = Math.min(1, MAX_SIDE / Math.max(i.naturalWidth, i.naturalHeight))
      const c = canvas.current!
      c.width = Math.round(i.naturalWidth * scale)
      c.height = Math.round(i.naturalHeight * scale)
      img.current = i
      setReady(true)
    }
    i.src = url
    return () => URL.revokeObjectURL(url)
  }, [file])

  // Line width relative to the image, so marks read the same on small and large photos.
  const width = () => Math.max(4, Math.round((canvas.current?.width ?? 1000) / 220))

  function paint(list: Shape[]) {
    const c = canvas.current, i = img.current
    if (!c || !i) return
    const ctx = c.getContext('2d')!
    ctx.drawImage(i, 0, 0, c.width, c.height)
    for (const s of list) {
      if (s.points.length < 1) continue
      ctx.strokeStyle = s.colour; ctx.fillStyle = s.colour; ctx.lineWidth = width(); ctx.lineCap = 'round'; ctx.lineJoin = 'round'
      const a = s.points[0], b = s.points[s.points.length - 1]
      if (s.tool === 'pen') {
        ctx.beginPath(); ctx.moveTo(a.x, a.y); for (const p of s.points) ctx.lineTo(p.x, p.y); ctx.stroke()
      } else if (s.tool === 'circle') {
        ctx.beginPath(); ctx.ellipse((a.x + b.x) / 2, (a.y + b.y) / 2, Math.abs(b.x - a.x) / 2, Math.abs(b.y - a.y) / 2, 0, 0, Math.PI * 2); ctx.stroke()
      } else {
        const angle = Math.atan2(b.y - a.y, b.x - a.x), head = width() * 4
        ctx.beginPath(); ctx.moveTo(a.x, a.y); ctx.lineTo(b.x, b.y); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(b.x, b.y)
        ctx.lineTo(b.x - head * Math.cos(angle - Math.PI / 6), b.y - head * Math.sin(angle - Math.PI / 6))
        ctx.lineTo(b.x - head * Math.cos(angle + Math.PI / 6), b.y - head * Math.sin(angle + Math.PI / 6))
        ctx.closePath(); ctx.fill()
      }
    }
  }
  useEffect(() => { if (ready) paint(shapes) }, [ready, shapes]) // eslint-disable-line react-hooks/exhaustive-deps

  const point = (e: React.PointerEvent<HTMLCanvasElement>) => {
    const r = e.currentTarget.getBoundingClientRect()
    return { x: ((e.clientX - r.left) / r.width) * e.currentTarget.width, y: ((e.clientY - r.top) / r.height) * e.currentTarget.height }
  }
  function down(e: React.PointerEvent<HTMLCanvasElement>) {
    e.currentTarget.setPointerCapture(e.pointerId)
    current.current = { tool, colour, points: [point(e)] }
  }
  function move(e: React.PointerEvent<HTMLCanvasElement>) {
    const s = current.current
    if (!s) return
    const p = point(e)
    s.points = s.tool === 'pen' ? [...s.points, p] : [s.points[0], p]
    paint([...shapes, s])
  }
  function up() {
    const s = current.current
    current.current = null
    if (s && s.points.length > 1) setShapes(prev => [...prev, s])
  }

  function save() {
    if (!shapes.length) { onDone(file); return }
    setSaving(true)
    canvas.current!.toBlob(blob => {
      setSaving(false)
      if (!blob) { onDone(file); return }
      onDone(new File([blob], file.name.replace(/\.[a-z0-9]+$/i, '') + '-marked.jpg', { type: 'image/jpeg' }))
    }, 'image/jpeg', 0.9)
  }

  const toolBtn = (t: Tool, icon: React.ReactNode, label: string) => (
    <button type="button" onClick={() => setTool(t)} aria-label={label} title={label}
      className={clsx('flex h-9 w-9 items-center justify-center rounded-lg', tool === t ? 'bg-teal text-white' : 'bg-white/10 text-white hover:bg-white/20')}>{icon}</button>
  )

  return (
    <div className="fixed inset-0 z-[60] flex flex-col bg-black">
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-2">
        <div className="flex items-center gap-1.5">
          {toolBtn('arrow', <ArrowUpRight size={17} />, 'Arrow')}
          {toolBtn('circle', <Circle size={17} />, 'Circle')}
          {toolBtn('pen', <PenLine size={17} />, 'Draw')}
          <span className="mx-1 h-6 w-px bg-white/20" />
          {COLOURS.map(c => (
            <button key={c} type="button" onClick={() => setColour(c)} aria-label={`Colour ${c}`}
              className={clsx('h-7 w-7 rounded-full border-2', colour === c ? 'border-white' : 'border-transparent')} style={{ background: c }} />
          ))}
          <span className="mx-1 h-6 w-px bg-white/20" />
          <button type="button" onClick={() => setShapes(s => s.slice(0, -1))} disabled={!shapes.length} aria-label="Undo" title="Undo"
            className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 text-white hover:bg-white/20 disabled:opacity-30"><Undo2 size={17} /></button>
        </div>
        <button type="button" onClick={onCancel} aria-label="Cancel" className="flex h-9 w-9 items-center justify-center rounded-lg text-white hover:bg-white/10"><X size={18} /></button>
      </div>
      <div className="flex min-h-0 flex-1 items-center justify-center p-3">
        {!ready && <Loader2 className="animate-spin text-white" />}
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerLeave={up}
          style={{ touchAction: 'none' }} className={clsx('max-h-full max-w-full cursor-crosshair rounded', !ready && 'hidden')} />
      </div>
      <div className="flex flex-wrap items-center justify-end gap-2 px-3 py-3">
        <p className="mr-auto text-xs text-white/70">Mark up the photo to show exactly where the issue or the fix is.</p>
        <button type="button" onClick={() => onDone(file)} className="rounded-lg border border-white/30 px-3 py-2 text-sm text-white hover:bg-white/10">Use without drawing</button>
        <button type="button" onClick={save} disabled={!ready || saving} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-50">
          {saving && <Loader2 size={14} className="animate-spin" />} Use photo
        </button>
      </div>
    </div>
  )
}
