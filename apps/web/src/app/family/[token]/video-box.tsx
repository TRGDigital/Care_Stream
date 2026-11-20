'use client'

// The video box on the public family page. A short video message (up to 60 seconds) goes up in chunks through our own API, is processed
// there, and can be previewed, titled and removed before Send. It stays private and is held for the home manager to approve before the
// care team can see it. The link is the key, so there is no sign in. If the signal drops, the upload carries on from the last good chunk.

import { useEffect, useRef, useState } from 'react'
import { Clapperboard, Loader2, Trash2, Clock, CheckCircle2, Video, FolderOpen, AlertCircle } from 'lucide-react'
import {
  deleteFamilyVideo, familyVideoComplete, familyVideoStart, familyVideoStatus, familyVideoTitle, photoSrc, type FamilyVideo,
} from '@/lib/residents-api'
import { fmtDuration, uploadVideoInChunks } from '@/lib/video-upload'

const FIELD = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const BIG_BTN = 'flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold'
const EXT = /\.(mp4|m4v|mov|webm|3gp|3g2)$/i

type Active = { name: string; sent: number; total: number; phase: 'uploading' | 'processing' }

/** Reads a clip's length in the browser, so an over long video is turned away before it is uploaded. null = the browser could not tell. */
function clipSeconds(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const v = document.createElement('video'); const url = URL.createObjectURL(file)
    const done = (n: number | null) => { URL.revokeObjectURL(url); resolve(n) }
    v.preload = 'metadata'; v.onloadedmetadata = () => done(Number.isFinite(v.duration) ? v.duration : null); v.onerror = () => done(null)
    setTimeout(() => done(null), 8000)
    v.src = url
  })
}

export function VideoBox({ token, resident, home, initial, max, maxSeconds, maxMb, titleMax, onCount, onBusy }: {
  token: string; resident: string; home: string; initial: FamilyVideo[]; max: number; maxSeconds: number; maxMb: number; titleMax: number
  onCount: (n: number) => void; onBusy: (busy: boolean) => void
}) {
  const [items, setItems] = useState<FamilyVideo[]>(initial.filter(v => v.status !== 'rejected'))
  const [active, setActive] = useState<Active | null>(null)
  const [error, setError] = useState('')
  const record = useRef<HTMLInputElement>(null)
  const choose = useRef<HTMLInputElement>(null)
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const kept = items.filter(i => i.state !== 'failed')
  const full = kept.length >= max

  useEffect(() => { onCount(items.filter(i => i.state === 'ready').length) }, [items, onCount])
  useEffect(() => { onBusy(!!active || items.some(i => i.state === 'processing')) }, [active, items, onBusy])

  // A clip that was still processing when the page opened: ask until it is done.
  useEffect(() => {
    const waiting = items.filter(i => i.state === 'processing' && !(active && active.phase === 'processing'))
    if (!waiting.length) return
    const t = setInterval(async () => {
      for (const w of waiting) {
        try { const r = await familyVideoStatus(token, w.id); setItems(cur => cur.map(c => (c.id === w.id ? r.video : c))) } catch { /* try again */ }
      }
    }, 3000)
    return () => clearInterval(t)
  }, [items, active, token])

  async function waitUntilSettled(id: string): Promise<FamilyVideo> {
    for (let i = 0; i < 100; i++) {   // up to about 5 minutes
      await new Promise(r => setTimeout(r, 3000))
      try { const r = await familyVideoStatus(token, id); if (r.video.state === 'ready' || r.video.state === 'failed') return r.video } catch (e: any) { if (e?.status === 404 || e?.status === 410) throw e }
    }
    throw new Error('That video is taking longer than expected. Please try again with a shorter video.')
  }

  async function pick(file: File | null) {
    for (const r of [record, choose]) if (r.current) r.current.value = ''
    if (!file || active) return
    setError('')
    const looksLikeVideo = file.type.startsWith('video/') || EXT.test(file.name)
    if (!looksLikeVideo) { setError('Please choose a video from your phone.'); return }
    if (file.size > maxMb * 1024 * 1024) { setError(`That video is too big. Videos must be under ${maxMb} MB, which is about a minute from a phone.`); return }
    const secs = await clipSeconds(file)
    if (secs !== null && secs > maxSeconds + 2) { setError(`That video is longer than ${maxSeconds} seconds. Please choose or record a shorter one.`); return }

    setActive({ name: file.name, sent: 0, total: file.size, phase: 'uploading' })
    let videoId = ''
    try {
      const out = await uploadVideoInChunks<FamilyVideo>(file, {
        start: async size => { const r = await familyVideoStart(token, { size }); videoId = r.video.id; return { id: r.video.id, total: r.video.total_chunks, chunk: r.video.chunk_bytes } },
        received: async id => (await familyVideoStatus(token, id)).received,
        chunkPath: (id, n) => `/public/family/${encodeURIComponent(token)}/videos/${encodeURIComponent(id)}/chunk/${n}`,
        complete: async id => {
          try { return (await familyVideoComplete(token, id, {})).video }
          catch (e: any) {
            // The connection dropped while the clip was being processed: it carries on, so ask until it is done.
            if (!e?.status) return waitUntilSettled(id)
            throw e
          }
        },
      }, p => setActive({ name: file.name, sent: p.sent, total: p.total, phase: p.phase }))
      if (out.result.state === 'failed') { setError(out.result.error || 'That video could not be processed. Please try again with a shorter video.'); try { await deleteFamilyVideo(token, out.id) } catch { /* swept later */ } }
      else setItems(cur => [...cur, out.result])
    } catch (e: any) {
      if (videoId) { try { await deleteFamilyVideo(token, videoId) } catch { /* swept later */ } }
      if (e?.status === 410) setError('This link is no longer active. Please contact the home for a new one.')
      else if (e?.status === 429) setError('Too many attempts. Please wait a few minutes and try again.')
      else if (e?.network) setError('The connection was lost. Please check your signal and choose the video again.')
      else setError(e?.message || 'The video could not be added. Please try again.')
    } finally { setActive(null) }
  }

  async function remove(id: string) {
    setError('')
    try { await deleteFamilyVideo(token, id); setItems(cur => cur.filter(i => i.id !== id)) }
    catch (e: any) { setError(e?.message || 'The video could not be removed. Please try again.') }
  }

  function rename(id: string, title: string) {
    setItems(cur => cur.map(c => (c.id === id ? { ...c, title } : c)))
    clearTimeout(saveTimer.current[id])
    saveTimer.current[id] = setTimeout(() => { familyVideoTitle(token, id, title).catch(() => { /* saved again on the next change */ }) }, 600)
  }

  // A preview link lasts about ten minutes: if it has run out, ask for a fresh one once.
  async function refreshLinks(id: string) {
    try { const r = await familyVideoStatus(token, id); setItems(cur => cur.map(c => (c.id === id ? { ...c, video_url: r.video.video_url, poster_url: r.video.poster_url } : c))) } catch { /* leave it */ }
  }

  const pct = active ? Math.min(100, Math.round((active.sent / Math.max(1, active.total)) * 100)) : 0

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="fam-videos-title">
      <div>
        <h2 id="fam-videos-title" className="flex items-center gap-2 text-lg font-semibold leading-snug text-neutral-dark"><Clapperboard size={20} className="text-teal" aria-hidden="true" /> A video message for {resident} (optional)</h2>
        <p className="mt-1 text-base text-neutral-mid">A familiar face and voice can mean a lot. Record a short hello, or share a clip you already have. Up to {maxSeconds} seconds each, and you can share up to {max}.</p>
      </div>

      <p className="rounded-xl bg-neutral-light px-4 py-3 text-sm leading-relaxed text-neutral-dark">
        Only share a message you are happy for the care team to play to {resident}. A manager checks every video before staff see it, and it is removed if {resident} moves on. Please try to keep other people out of the picture unless they are happy to be in it. If you speak in a language other than English, the speech is turned into text and translated so a manager can understand it. Only the manager sees this unless they choose to share the English text with staff.
      </p>

      {kept.length > 0 && (
        <ul className="space-y-4" aria-label="Your videos">
          {kept.map(i => (
            <li key={i.id} className="space-y-3 rounded-xl border border-gray-200 p-3">
              {i.state === 'ready' && i.video_url ? (
                <video controls playsInline preload="metadata" poster={photoSrc(i.poster_url)} src={photoSrc(i.video_url)} onError={() => refreshLinks(i.id)}
                  className="aspect-video max-h-80 w-full rounded-lg bg-gray-100 object-contain" aria-label={i.title || `Video message for ${resident}`} />
              ) : (
                <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-gray-50 text-neutral-mid" role="status">
                  {i.state === 'processing' ? <span className="flex items-center gap-2 text-base"><Loader2 size={20} className="animate-spin text-teal" /> Processing your video</span>
                    : i.state === 'ready' ? <span className="px-4 text-center text-base">Your video would be shown here to preview. Nothing is kept in this demonstration.</span>
                    : <span className="flex items-center gap-2 px-4 text-center text-base"><AlertCircle size={20} className="text-amber-600" /> This upload was not finished. Please remove it and add the video again.</span>}
                </div>
              )}
              {i.state === 'ready' && (
                <div>
                  <label htmlFor={`fam-vt-${i.id}`} className="mb-1 block text-base font-medium text-neutral-dark">Title (optional)</label>
                  <input id={`fam-vt-${i.id}`} value={i.title ?? ''} maxLength={titleMax} onChange={e => rename(i.id, e.target.value)} placeholder="For example, From Sarah, Sunday" className={FIELD} />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1 text-sm text-neutral-mid">
                  {i.state === 'ready' ? <><CheckCircle2 size={14} className="text-green-600" aria-hidden="true" /> Ready{i.duration_seconds ? `, ${fmtDuration(i.duration_seconds)}` : ''}. Waiting for the manager once you press Send.</> : <><Clock size={14} aria-hidden="true" /> {i.state === 'processing' ? 'Processing' : 'Not finished'}</>}
                </p>
                <button type="button" onClick={() => remove(i.id)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-base font-medium text-red-700 hover:bg-red-50" aria-label={`Remove video${i.title ? `: ${i.title}` : ''}`}>
                  <Trash2 size={16} aria-hidden="true" /> Remove
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {active ? (
        <div className="space-y-2 rounded-xl border border-teal/30 bg-teal/5 p-4" role="status" aria-live="polite">
          <p className="flex items-center gap-2 text-base font-medium text-neutral-dark">
            <Loader2 size={18} className="animate-spin text-teal" aria-hidden="true" />
            {active.phase === 'processing' ? 'Processing your video. This can take a minute. Please keep this page open.' : `Uploading ${pct}%. Please keep this page open.`}
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${active.phase === 'processing' ? 100 : pct}%` }} /></div>
          <p className="text-sm text-neutral-mid">If your signal drops, the upload carries on when it comes back.</p>
        </div>
      ) : full ? (
        <p className="text-base text-neutral-mid">You have added the most videos you can share ({max}).</p>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            <label className={`${BIG_BTN} cursor-pointer bg-teal text-white hover:bg-teal-dark focus-within:ring-2 focus-within:ring-teal/40`}>
              <Video size={20} aria-hidden="true" /> Record a message
              <input ref={record} type="file" accept="video/*" capture="user" className="sr-only" onChange={e => pick(e.target.files?.[0] ?? null)} />
            </label>
            <label className={`${BIG_BTN} cursor-pointer border border-teal text-teal hover:bg-teal/5 focus-within:ring-2 focus-within:ring-teal/40`}>
              <FolderOpen size={20} aria-hidden="true" /> Choose a video
              <input ref={choose} type="file" accept="video/*" className="sr-only" onChange={e => pick(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          <p className="text-sm text-neutral-mid">Up to {maxSeconds} seconds. If you record one, hold your phone sideways if you can. Location details stored in a video are removed.</p>
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">{error}</p>}

      <p className="text-sm leading-relaxed text-neutral-mid">
        Privacy: your video is kept privately by {home} and never shown on a public page. Only the manager can see it until it is approved, and then only the care team. You can remove a video here until you press Send. After that, ask {home}.
      </p>
    </section>
  )
}
