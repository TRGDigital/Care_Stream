'use client'

// Add, replace or delete MY signature. Two ways to add it: draw it (mouse, trackpad or finger) or upload a photo of it (cleaned in the browser: the paper becomes see through and the empty
// margins are trimmed). A preview shows it at the bottom of a sample letter, the way it will print. The picture is saved as a small PNG and used only when I choose "Sign with my signature".

import { useCallback, useEffect, useRef, useState } from 'react'
import { useSession } from 'next-auth/react'
import { Loader2, PenLine, Trash2, Undo2, Upload, Eraser } from 'lucide-react'
import { signatures, type SignatureMeta } from '@/lib/letterhead-client'
import { fitWithin, hasEnoughInk, trimBounds, whiteToTransparent } from '@/lib/signature-image'

const PAD_W = 560, PAD_H = 190
type Pt = { x: number; y: number }

function SignaturePad({ onChange }: { onChange: (png: string | null) => void }) {
  const canvas = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<Pt[][]>([])
  const live = useRef<Pt[] | null>(null)
  const [count, setCount] = useState(0)
  const dpr = typeof window !== 'undefined' ? Math.min(2, window.devicePixelRatio || 1) : 1

  const draw = useCallback(() => {
    const c = canvas.current; if (!c) return
    const ctx = c.getContext('2d'); if (!ctx) return
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    ctx.clearRect(0, 0, PAD_W, PAD_H)
    ctx.lineCap = 'round'; ctx.lineJoin = 'round'; ctx.lineWidth = 2.6; ctx.strokeStyle = '#14213d'
    for (const s of [...strokes.current, ...(live.current ? [live.current] : [])]) {
      if (s.length === 1) { ctx.beginPath(); ctx.arc(s[0].x, s[0].y, 1.3, 0, Math.PI * 2); ctx.fillStyle = '#14213d'; ctx.fill(); continue }
      ctx.beginPath(); ctx.moveTo(s[0].x, s[0].y)
      for (let i = 1; i < s.length - 1; i++) { const mx = (s[i].x + s[i + 1].x) / 2, my = (s[i].y + s[i + 1].y) / 2; ctx.quadraticCurveTo(s[i].x, s[i].y, mx, my) }   // smooth curves through the points
      const last = s[s.length - 1]; ctx.lineTo(last.x, last.y); ctx.stroke()
    }
  }, [dpr])

  useEffect(() => { const c = canvas.current; if (c) { c.width = PAD_W * dpr; c.height = PAD_H * dpr; draw() } }, [dpr, draw])

  const emit = useCallback(() => {
    const c = canvas.current; if (!c) return
    if (strokes.current.length === 0) { onChange(null); return }
    const ctx = c.getContext('2d')!; const img = ctx.getImageData(0, 0, c.width, c.height)
    if (!hasEnoughInk(img)) { onChange(null); return }
    const b = trimBounds(img, 8 * dpr); if (!b) { onChange(null); return }
    const out = document.createElement('canvas'); const s = fitWithin(b.w, b.h, 600); out.width = s.w; out.height = s.h
    out.getContext('2d')!.drawImage(c, b.x, b.y, b.w, b.h, 0, 0, s.w, s.h)
    onChange(out.toDataURL('image/png'))
  }, [dpr, onChange])

  const pos = (e: React.PointerEvent): Pt => { const r = canvas.current!.getBoundingClientRect(); return { x: ((e.clientX - r.left) / r.width) * PAD_W, y: ((e.clientY - r.top) / r.height) * PAD_H } }
  function down(e: React.PointerEvent) { e.preventDefault(); (e.target as Element).setPointerCapture?.(e.pointerId); live.current = [pos(e)]; draw() }
  function move(e: React.PointerEvent) { if (!live.current) return; live.current.push(pos(e)); draw() }
  function up() { if (!live.current) return; strokes.current.push(live.current); live.current = null; setCount(strokes.current.length); draw(); emit() }
  const undo = () => { strokes.current.pop(); setCount(strokes.current.length); draw(); emit() }
  const clear = () => { strokes.current = []; live.current = null; setCount(0); draw(); onChange(null) }

  return (
    <div>
      <div className="rounded-xl border border-gray-300 bg-white p-2">
        <canvas ref={canvas} onPointerDown={down} onPointerMove={move} onPointerUp={up} onPointerCancel={up} aria-label="Signature pad. Draw your signature here."
          className="block h-auto w-full touch-none cursor-crosshair rounded-lg bg-[linear-gradient(transparent_calc(100%-34px),#e5e7eb_calc(100%-34px),#e5e7eb_calc(100%-33px),transparent_calc(100%-33px))]" style={{ aspectRatio: `${PAD_W} / ${PAD_H}` }} />
      </div>
      <div className="mt-2 flex gap-2">
        <button type="button" onClick={undo} disabled={count === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-light disabled:opacity-40"><Undo2 size={14} aria-hidden="true" /> Undo</button>
        <button type="button" onClick={clear} disabled={count === 0} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium hover:bg-neutral-light disabled:opacity-40"><Eraser size={14} aria-hidden="true" /> Clear</button>
      </div>
    </div>
  )
}

/** A photo of a signature on paper, cleaned: scaled, paper made see through, margins trimmed. Resolves to a PNG data URL, or throws a plain message. */
export async function cleanPhoto(file: File): Promise<string> {
  if (!/^image\/(png|jpe?g)$/i.test(file.type)) throw new Error('Please choose a PNG or JPEG picture.')
  if (file.size > 8 * 1024 * 1024) throw new Error('That picture is too big. Please choose one under 8 MB.')
  const url = URL.createObjectURL(file)
  try {
    const img = await new Promise<HTMLImageElement>((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('That picture could not be opened.')); i.src = url })
    const s = fitWithin(img.naturalWidth, img.naturalHeight, 1400)
    const c = document.createElement('canvas'); c.width = s.w; c.height = s.h
    const ctx = c.getContext('2d')!; ctx.drawImage(img, 0, 0, s.w, s.h)
    const data = ctx.getImageData(0, 0, s.w, s.h)
    whiteToTransparent(data)
    ctx.putImageData(data, 0, 0)
    const b = trimBounds(data, 10)
    if (!b || !hasEnoughInk(data)) throw new Error('We could not find a signature in that picture. Use dark ink on plain white paper, in good light.')
    const out = document.createElement('canvas'); const f = fitWithin(b.w, b.h, 600); out.width = f.w; out.height = f.h
    out.getContext('2d')!.drawImage(c, b.x, b.y, b.w, b.h, 0, 0, f.w, f.h)
    return out.toDataURL('image/png')
  } finally { URL.revokeObjectURL(url) }
}

/** The signature at the foot of a sample letter, the way it will print. */
function SamplePreview({ src, name, role }: { src: string | null; name: string; role: string }) {
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-4 text-sm text-neutral-dark" aria-label="Preview on a sample letter">
      <p className="text-xs text-neutral-mid">Preview on a letter</p>
      <p className="mt-2">Yours sincerely,</p>
      <div className="my-1.5 flex h-[68px] items-center">
        {src
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={src} alt="Your signature" className="max-h-[68px] max-w-[227px] object-contain" />
          : <span className="text-xs italic text-neutral-mid">Your signature will show here</span>}
      </div>
      <p className="font-bold">{name || 'Your name'}</p>
      {role && <p className="text-xs text-neutral-mid">{role}</p>}
    </div>
  )
}

export function SignatureEditor({ name, role, meta, onChanged }: { name: string; role: string; meta: SignatureMeta | null; onChanged: () => void }) {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [mode, setMode] = useState<'draw' | 'upload'>('draw')
  const [pending, setPending] = useState<string | null>(null)
  const [current, setCurrent] = useState<string | null>(null)
  const [busy, setBusy] = useState<'save' | 'delete' | 'photo' | null>(null)
  const [error, setError] = useState(''); const [done, setDone] = useState('')
  const [confirmDelete, setConfirmDelete] = useState(false)
  const fileRef = useRef<HTMLInputElement>(null)

  // My saved picture, for my own preview only (an authenticated, never cached request).
  useEffect(() => {
    if (!token || !meta?.has) { setCurrent(null); return }
    let url: string | null = null, live = true
    signatures.image(token).then(u => { url = u; if (live) setCurrent(u) })
    return () => { live = false; if (url) URL.revokeObjectURL(url) }
  }, [token, meta?.has, meta?.updated_at])

  async function pickFile(f: File | undefined) {
    if (!f) return
    setError(''); setDone(''); setBusy('photo')
    try { setPending(await cleanPhoto(f)) } catch (e: any) { setPending(null); setError(e?.message || 'That picture could not be used.') } finally { setBusy(null); if (fileRef.current) fileRef.current.value = '' }
  }
  async function save() {
    if (!token || !pending) return
    setBusy('save'); setError(''); setDone('')
    try { await signatures.save(token, pending); setDone('Your signature is saved.'); setPending(null); onChanged() } catch (e: any) { setError(e?.message || 'It could not be saved. Please try again.') } finally { setBusy(null) }
  }
  async function remove() {
    if (!token) return
    setBusy('delete'); setError(''); setDone('')
    try { await signatures.remove(token); setDone('Your signature has been deleted.'); setConfirmDelete(false); onChanged() } catch (e: any) { setError(e?.message || 'It could not be deleted. Please try again.') } finally { setBusy(null) }
  }
  const onPad = useCallback((p: string | null) => { setPending(p); setDone('') }, [])
  const shown = pending ?? current

  return (
    <div className="space-y-4">
      <p className="text-sm text-neutral-mid">Add your signature to use on letters and reports you approve or send. It is only used when you choose <strong>Sign with my signature</strong>. Nobody else can see or use it.</p>
      <div className="flex gap-1 rounded-lg bg-neutral-light p-1 text-sm" role="tablist" aria-label="How to add your signature">
        {([['draw', 'Draw it', PenLine], ['upload', 'Upload a photo', Upload]] as const).map(([k, l, Icon]) => (
          <button key={k} type="button" role="tab" aria-selected={mode === k} onClick={() => { setMode(k); setPending(null); setError('') }}
            className={`flex flex-1 items-center justify-center gap-1.5 rounded-md px-3 py-2 font-medium ${mode === k ? 'bg-white text-teal shadow-sm' : 'text-neutral-mid'}`}><Icon size={14} aria-hidden="true" /> {l}</button>
        ))}
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div>
          {mode === 'draw' ? <SignaturePad onChange={onPad} /> : (
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-gray-300 bg-white px-4 py-8 text-center text-sm text-neutral-mid hover:border-teal">
                {busy === 'photo' ? <Loader2 className="animate-spin" size={20} /> : <Upload size={20} aria-hidden="true" />}
                <span>Choose a PNG or JPEG photo of your signature</span>
                <span className="text-xs">Dark ink on plain white paper works best. We make the paper see through and trim the edges.</span>
                <input ref={fileRef} type="file" accept="image/png,image/jpeg" className="sr-only" onChange={e => pickFile(e.target.files?.[0])} />
              </label>
            </div>
          )}
        </div>
        <SamplePreview src={shown} name={name} role={role} />
      </div>
      {error && <p className="text-sm text-red-700" role="alert">{error}</p>}
      {done && <p className="rounded-lg bg-green-50 px-3 py-2 text-sm text-green-800" role="status">{done}</p>}
      <div className="flex flex-wrap items-center gap-2">
        <button type="button" onClick={save} disabled={!pending || busy !== null} className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-sm font-semibold text-white hover:bg-teal-dark disabled:opacity-50">
          {busy === 'save' && <Loader2 size={14} className="animate-spin" />} {meta?.has ? 'Replace my signature' : 'Save my signature'}
        </button>
        {meta?.has && !confirmDelete && <button type="button" onClick={() => setConfirmDelete(true)} disabled={busy !== null} className="inline-flex items-center gap-1.5 rounded-lg border border-red-300 px-3 py-2 text-sm font-medium text-red-700 hover:bg-red-50"><Trash2 size={14} aria-hidden="true" /> Delete my signature</button>}
        {confirmDelete && <span className="inline-flex items-center gap-2 text-sm">Delete it? <button type="button" onClick={remove} className="rounded-md bg-red-600 px-2.5 py-1 font-semibold text-white hover:bg-red-700">Yes, delete</button><button type="button" onClick={() => setConfirmDelete(false)} className="px-2 py-1 text-neutral-mid">Keep it</button></span>}
      </div>
    </div>
  )
}
