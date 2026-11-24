'use client'

// The voice note box on the public family page. A family member can record a short voice note right here in the browser (up to two
// minutes), listen back, keep it or record it again, or upload a recording they already have. It goes up in chunks through our own API,
// is processed there, and is held privately for the home manager to approve before the care team can hear it. The link is the key, so
// there is no sign in. If the microphone is blocked or the browser cannot record, the upload still works.

import { useCallback, useEffect, useRef, useState } from 'react'
import { AlertCircle, CheckCircle2, FolderOpen, Loader2, Mic, Square, Trash2, RotateCcw, Check } from 'lucide-react'
import {
  deleteFamilyVideo, familyVideoComplete, familyVideoStart, familyVideoStatus, familyVideoTitle, photoSrc, type FamilyVideo,
} from '@/lib/residents-api'
import { fmtDuration, uploadVideoInChunks } from '@/lib/video-upload'

const FIELD = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const BIG_BTN = 'flex min-h-[56px] flex-1 items-center justify-center gap-2 rounded-xl px-5 py-3 text-base font-semibold'
const EXT = /\.(m4a|mp4|aac|mp3|wav|ogg|oga|opus|webm|3gp|amr|caf)$/i

type Active = { sent: number; total: number; phase: 'uploading' | 'processing' }
type Rec = { phase: 'idle' } | { phase: 'recording'; seconds: number } | { phase: 'review'; file: File; url: string; seconds: number }

/** The recording format this browser can make: Safari records MP4 audio, Chrome and Firefox record WebM (Opus) or Ogg. null = it cannot record. */
export function pickRecorderType(): { mime: string; ext: string } | null {
  if (typeof window === 'undefined' || typeof (window as any).MediaRecorder === 'undefined' || !navigator.mediaDevices?.getUserMedia) return null
  const MR = (window as any).MediaRecorder
  for (const [mime, ext] of [['audio/mp4', 'm4a'], ['audio/webm;codecs=opus', 'webm'], ['audio/webm', 'webm'], ['audio/ogg;codecs=opus', 'ogg']] as const) {
    try { if (MR.isTypeSupported(mime)) return { mime, ext } } catch { /* try the next */ }
  }
  return { mime: '', ext: 'webm' }   // let the browser choose its own
}

/** Reads an uploaded recording's length in the browser. null = the browser could not tell (a browser made recording often cannot). */
function audioSeconds(file: File): Promise<number | null> {
  return new Promise(resolve => {
    const a = document.createElement('audio'); const url = URL.createObjectURL(file)
    const done = (n: number | null) => { URL.revokeObjectURL(url); resolve(n) }
    a.preload = 'metadata'; a.onloadedmetadata = () => done(Number.isFinite(a.duration) ? a.duration : null); a.onerror = () => done(null)
    setTimeout(() => done(null), 8000)
    a.src = url
  })
}

export function VoiceBox({ token, resident, home, initial, max, maxSeconds, maxMb, titleMax, onCount, onBusy }: {
  token: string; resident: string; home: string; initial: FamilyVideo[]; max: number; maxSeconds: number; maxMb: number; titleMax: number
  onCount: (n: number) => void; onBusy: (busy: boolean) => void
}) {
  const [items, setItems] = useState<FamilyVideo[]>(initial.filter(v => v.status !== 'rejected'))
  const [active, setActive] = useState<Active | null>(null)
  const [error, setError] = useState('')
  const [rec, setRec] = useState<Rec>({ phase: 'idle' })
  const [canRecord, setCanRecord] = useState(true)
  const choose = useRef<HTMLInputElement>(null)
  const recorder = useRef<MediaRecorder | null>(null)
  const stream = useRef<MediaStream | null>(null)
  const timer = useRef<ReturnType<typeof setInterval> | null>(null)
  const started = useRef(0)
  const saveTimer = useRef<Record<string, ReturnType<typeof setTimeout>>>({})
  const kept = items.filter(i => i.state !== 'failed')
  const full = kept.length >= max
  const minutes = Math.round(maxSeconds / 60)

  useEffect(() => { setCanRecord(pickRecorderType() !== null) }, [])
  useEffect(() => { onCount(items.filter(i => i.state === 'ready').length) }, [items, onCount])
  useEffect(() => { onBusy(!!active || rec.phase === 'recording' || items.some(i => i.state === 'processing')) }, [active, rec.phase, items, onBusy])

  const stopTracks = useCallback(() => {
    if (timer.current) { clearInterval(timer.current); timer.current = null }
    stream.current?.getTracks().forEach(t => t.stop()); stream.current = null
  }, [])
  // Leaving the page must release the microphone, and a preview link must not be left behind.
  useEffect(() => () => { stopTracks(); try { if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop() } catch { /* already stopped */ } }, [stopTracks])
  useEffect(() => () => { if (rec.phase === 'review') URL.revokeObjectURL(rec.url) }, [rec])

  // A voice note that was still processing when the page opened: ask until it is done.
  useEffect(() => {
    const waiting = items.filter(i => i.state === 'processing' && !(active && active.phase === 'processing'))
    if (!waiting.length) return
    const t = setInterval(async () => {
      for (const w of waiting) { try { const r = await familyVideoStatus(token, w.id); setItems(cur => cur.map(c => (c.id === w.id ? r.video : c))) } catch { /* try again */ } }
    }, 3000)
    return () => clearInterval(t)
  }, [items, active, token])

  async function waitUntilSettled(id: string): Promise<FamilyVideo> {
    for (let i = 0; i < 100; i++) {
      await new Promise(r => setTimeout(r, 3000))
      try { const r = await familyVideoStatus(token, id); if (r.video.state === 'ready' || r.video.state === 'failed') return r.video } catch (e: any) { if (e?.status === 404 || e?.status === 410) throw e }
    }
    throw new Error('That voice note is taking longer than expected. Please try again with a shorter one.')
  }

  async function startRecording() {
    setError('')
    const type = pickRecorderType()
    if (!type) { setCanRecord(false); setError('Your browser cannot record here. You can upload a recording instead.'); return }
    try {
      const s = await navigator.mediaDevices.getUserMedia({ audio: true })
      stream.current = s
      const chunks: Blob[] = []
      const r = new MediaRecorder(s, type.mime ? { mimeType: type.mime } : undefined)
      recorder.current = r
      r.ondataavailable = e => { if (e.data && e.data.size > 0) chunks.push(e.data) }
      r.onstop = () => {
        const seconds = Math.min(maxSeconds, (Date.now() - started.current) / 1000)
        stopTracks()
        const mime = r.mimeType || type.mime || 'audio/webm'
        const ext = /mp4|aac/.test(mime) ? 'm4a' : /ogg/.test(mime) ? 'ogg' : 'webm'
        const blob = new Blob(chunks, { type: mime })
        if (blob.size < 800) { setRec({ phase: 'idle' }); setError('Nothing was recorded. Please check your microphone and try again.'); return }
        const file = new File([blob], `voice-note.${ext}`, { type: mime })
        setRec({ phase: 'review', file, url: URL.createObjectURL(blob), seconds })
      }
      started.current = Date.now()
      r.start(1000)
      setRec({ phase: 'recording', seconds: 0 })
      timer.current = setInterval(() => {
        const secs = (Date.now() - started.current) / 1000
        if (secs >= maxSeconds) { stopRecording(); return }
        setRec(cur => (cur.phase === 'recording' ? { phase: 'recording', seconds: secs } : cur))
      }, 250)
    } catch (e: any) {
      stopTracks()
      setRec({ phase: 'idle' })
      if (e?.name === 'NotAllowedError' || e?.name === 'SecurityError') setError('The microphone is blocked. Please allow it in your browser (look for the microphone or padlock beside the web address), then try again. Or upload a recording instead.')
      else if (e?.name === 'NotFoundError') setError('We could not find a microphone on this device. You can upload a recording instead.')
      else setError('We could not start the recording. You can try again, or upload a recording instead.')
    }
  }

  function stopRecording() {
    try { if (recorder.current && recorder.current.state !== 'inactive') recorder.current.stop() } catch { stopTracks(); setRec({ phase: 'idle' }) }
  }

  function discard() {
    if (rec.phase === 'review') URL.revokeObjectURL(rec.url)
    setRec({ phase: 'idle' }); setError('')
  }

  async function send(file: File) {
    if (active) return
    setError('')
    setActive({ sent: 0, total: file.size, phase: 'uploading' })
    let id = ''
    try {
      const out = await uploadVideoInChunks<FamilyVideo>(file, {
        start: async size => { const r = await familyVideoStart(token, { size, kind: 'audio' }); id = r.video.id; return { id: r.video.id, total: r.video.total_chunks, chunk: r.video.chunk_bytes } },
        received: async vid => (await familyVideoStatus(token, vid)).received,
        chunkPath: (vid, n) => `/public/family/${encodeURIComponent(token)}/videos/${encodeURIComponent(vid)}/chunk/${n}`,
        complete: async vid => {
          try { return (await familyVideoComplete(token, vid, {})).video }
          catch (e: any) { if (!e?.status) return waitUntilSettled(vid); throw e }   // the connection dropped while it was processing: it carries on
        },
      }, p => setActive({ sent: p.sent, total: p.total, phase: p.phase }))
      if (out.result.state === 'failed') { setError(out.result.error || 'That voice note could not be processed. Please try again with a shorter recording.'); try { await deleteFamilyVideo(token, out.id) } catch { /* swept later */ } }
      else { setItems(cur => [...cur, out.result]); if (rec.phase === 'review') URL.revokeObjectURL(rec.url); setRec({ phase: 'idle' }) }
    } catch (e: any) {
      if (id) { try { await deleteFamilyVideo(token, id) } catch { /* swept later */ } }
      if (e?.status === 410) setError('This link is no longer active. Please contact the home for a new one.')
      else if (e?.status === 429) setError('Too many attempts. Please wait a few minutes and try again.')
      else if (e?.network) setError('The connection was lost. Please check your signal and press Keep this one again.')
      else setError(e?.message || 'The voice note could not be added. Please try again.')
    } finally { setActive(null) }
  }

  async function pickFile(file: File | null) {
    if (choose.current) choose.current.value = ''
    if (!file || active) return
    setError('')
    if (!(file.type.startsWith('audio/') || EXT.test(file.name))) { setError('Please choose a voice recording from your phone or computer.'); return }
    if (file.size > maxMb * 1024 * 1024) { setError(`That recording is too big. Voice notes must be under ${maxMb} MB.`); return }
    const secs = await audioSeconds(file)
    if (secs !== null && secs > maxSeconds + 2) { setError(`That recording is longer than ${minutes} minutes. Please choose or record a shorter one.`); return }
    await send(file)
  }

  async function remove(id: string) {
    setError('')
    try { await deleteFamilyVideo(token, id); setItems(cur => cur.filter(i => i.id !== id)) }
    catch (e: any) { setError(e?.message || 'The voice note could not be removed. Please try again.') }
  }

  function rename(id: string, title: string) {
    setItems(cur => cur.map(c => (c.id === id ? { ...c, title } : c)))
    clearTimeout(saveTimer.current[id])
    saveTimer.current[id] = setTimeout(() => { familyVideoTitle(token, id, title).catch(() => { /* saved again on the next change */ }) }, 600)
  }

  async function refreshLinks(id: string) {
    try { const r = await familyVideoStatus(token, id); setItems(cur => cur.map(c => (c.id === id ? { ...c, video_url: r.video.video_url } : c))) } catch { /* leave it */ }
  }

  const pct = active ? Math.min(100, Math.round((active.sent / Math.max(1, active.total)) * 100)) : 0
  const left = rec.phase === 'recording' ? Math.max(0, Math.ceil(maxSeconds - rec.seconds)) : maxSeconds

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="fam-voice-title">
      <div>
        <h2 id="fam-voice-title" className="flex items-center gap-2 text-lg font-semibold leading-snug text-neutral-dark"><Mic size={20} className="text-teal" aria-hidden="true" /> A voice note for {resident}</h2>
        <p className="mt-1 text-base text-neutral-mid">Sometimes it is easier to say it than to write it. Record a few words in your own voice, such as a memory, a favourite song or how {resident} likes to be spoken to. Up to {minutes} minutes each, and you can share up to {max}.</p>
      </div>

      <p className="rounded-xl bg-neutral-light px-4 py-3 text-sm leading-relaxed text-neutral-dark">
        Only share a recording you are happy for the care team to play to {resident}. A manager listens to every voice note before staff can hear it, and it is removed if {resident} moves on. Please do not include medical details or anything private.
      </p>

      {kept.length > 0 && (
        <ul className="space-y-3" aria-label="Your voice notes">
          {kept.map(i => (
            <li key={i.id} className="space-y-3 rounded-xl border border-gray-200 p-3">
              {i.state === 'ready' && i.video_url ? (
                <audio controls preload="metadata" src={photoSrc(i.video_url)} onError={() => refreshLinks(i.id)} className="h-12 w-full" aria-label={i.title || `Voice note for ${resident}`} />
              ) : (
                <div className="flex min-h-[56px] items-center justify-center rounded-lg bg-gray-50 px-3 text-neutral-mid" role="status">
                  {i.state === 'processing' ? <span className="flex items-center gap-2 text-base"><Loader2 size={20} className="animate-spin text-teal" /> Processing your voice note</span>
                    : i.state === 'ready' ? <span className="text-center text-base">Your voice note would be played here. Nothing is kept in this demonstration.</span>
                    : <span className="flex items-center gap-2 text-center text-base"><AlertCircle size={20} className="text-amber-600" /> This upload was not finished. Please remove it and add the voice note again.</span>}
                </div>
              )}
              {i.state === 'ready' && (
                <div>
                  <label htmlFor={`fam-vn-${i.id}`} className="mb-1 block text-base font-medium text-neutral-dark">Title (optional)</label>
                  <input id={`fam-vn-${i.id}`} value={i.title ?? ''} maxLength={titleMax} onChange={e => rename(i.id, e.target.value)} placeholder="For example, A memory of the seaside" className={FIELD} />
                </div>
              )}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="flex items-center gap-1 text-sm text-neutral-mid">
                  {i.state === 'ready' ? <><CheckCircle2 size={14} className="text-green-600" aria-hidden="true" /> Ready{i.duration_seconds ? `, ${fmtDuration(i.duration_seconds)}` : ''}. Waiting for the manager to approve.</> : null}
                </p>
                <button type="button" onClick={() => remove(i.id)} className="inline-flex min-h-[44px] items-center gap-1.5 rounded-lg px-3 text-base font-medium text-red-700 hover:bg-red-50" aria-label={`Remove ${i.title || 'this voice note'}`}>
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
            {active.phase === 'processing' ? 'Processing your voice note. This can take a moment. Please keep this page open.' : `Uploading ${pct}%. Please keep this page open.`}
          </p>
          <div className="h-3 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${active.phase === 'processing' ? 100 : pct}%` }} /></div>
        </div>
      ) : full ? (
        <p className="text-base text-neutral-mid">You have added the most voice notes you can share ({max}).</p>
      ) : rec.phase === 'recording' ? (
        <div className="space-y-3 rounded-xl border border-red-200 bg-red-50 p-4">
          <p className="flex items-center gap-2 text-lg font-semibold text-neutral-dark" role="timer" aria-live="off">
            <span className="inline-block h-3 w-3 animate-pulse rounded-full bg-red-600" aria-hidden="true" />
            Recording {fmtDuration(rec.seconds)} <span className="text-base font-normal text-neutral-mid">of {fmtDuration(maxSeconds)}</span>
          </p>
          <p className="sr-only" aria-live="polite">{left <= 10 ? `${left} seconds left` : ''}</p>
          <div className="h-2 w-full overflow-hidden rounded-full bg-red-100" aria-hidden="true"><div className="h-full rounded-full bg-red-600" style={{ width: `${Math.min(100, (rec.seconds / maxSeconds) * 100)}%` }} /></div>
          <button type="button" onClick={stopRecording} className={`${BIG_BTN} w-full bg-red-600 text-white hover:bg-red-700`}><Square size={18} aria-hidden="true" /> Stop recording</button>
          <p className="text-sm text-neutral-mid">It stops by itself after {minutes} minutes.</p>
        </div>
      ) : rec.phase === 'review' ? (
        <div className="space-y-3 rounded-xl border border-teal/30 bg-teal/5 p-4">
          <p className="text-base font-medium text-neutral-dark">Listen back, then keep it or record it again. ({fmtDuration(rec.seconds)})</p>
          <audio controls src={rec.url} className="h-12 w-full" aria-label="Your recording" />
          <div className="flex flex-col gap-3 sm:flex-row">
            <button type="button" onClick={() => send(rec.file)} className={`${BIG_BTN} bg-teal text-white hover:bg-teal-dark`}><Check size={20} aria-hidden="true" /> Keep this one</button>
            <button type="button" onClick={() => { discard(); void startRecording() }} className={`${BIG_BTN} border border-teal text-teal hover:bg-teal/5`}><RotateCcw size={18} aria-hidden="true" /> Record again</button>
            <button type="button" onClick={discard} className={`${BIG_BTN} border border-gray-300 text-neutral-dark hover:bg-gray-50`}><Trash2 size={18} aria-hidden="true" /> Throw it away</button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="flex flex-col gap-3 sm:flex-row">
            {canRecord && (
              <button type="button" onClick={startRecording} className={`${BIG_BTN} bg-teal text-white hover:bg-teal-dark`}><Mic size={20} aria-hidden="true" /> Record a voice note</button>
            )}
            <label className={`${BIG_BTN} cursor-pointer border border-teal text-teal hover:bg-teal/5 focus-within:ring-2 focus-within:ring-teal/40`}>
              <FolderOpen size={20} aria-hidden="true" /> Upload a recording
              <input ref={choose} type="file" accept="audio/*" className="sr-only" onChange={e => pickFile(e.target.files?.[0] ?? null)} />
            </label>
          </div>
          {canRecord
            ? <p className="text-sm text-neutral-mid">Your browser will ask to use the microphone. It is only used while you are recording, and you can listen back before you keep it.</p>
            : <p className="text-sm text-neutral-mid">This browser cannot record from this page. Record a voice note with your phone&apos;s voice recorder app, then upload it here.</p>}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">{error}</p>}

      <p className="text-sm leading-relaxed text-neutral-mid">
        Privacy: your voice note is kept privately by {home} and never shown on a public page. Only the manager can hear it until it is approved, and then only the care team. You can remove it here until you press Send.
      </p>
    </section>
  )
}
