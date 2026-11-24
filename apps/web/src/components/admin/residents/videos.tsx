'use client'

// Video messages in the Residents overlay. VideoApprovals sits in the Approvals tab (family videos waiting for a decision: preview, edit the
// title, approve or reject). VideoManager sits under the profile: the videos staff can play, adding one yourself (approved at once),
// deleting, and who has played them recently. Videos are private: each is loaded through a link that lasts about ten minutes, so if one has
// run out the player asks for a fresh set once.

import { useEffect, useRef, useState } from 'react'
import { Check, Clapperboard, Languages, Loader2, Mic, Pencil, Play, Trash2, Upload, X } from 'lucide-react'
import { photoSrc, type ResidentDetail, type ResidentVideo, type VideoTranscript } from '@/lib/residents-api'
import { fmtDuration, uploadVideoInChunks } from '@/lib/video-upload'
import { ErrorBox, Field, inputCls, btnPrimary, btnSecondary, btnDangerOutline, errMsg, fmtDate } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>
const TITLE_MAX = 60
const NOTE_MAX = 280
const MAX_MB = 150
const EXT = /\.(mp4|m4v|mov|webm|3gp|3g2)$/i

export function Player({ video, onExpired, className }: { video: ResidentVideo; onExpired: () => void; className?: string }) {
  const retried = useRef(false)
  if (!video.video_url) {
    return (
      <div className={`flex items-center justify-center bg-gray-50 text-sm text-neutral-mid ${className ?? ''}`} role="status">
        {video.state === 'processing' ? <span className="flex items-center gap-2"><Loader2 size={16} className="animate-spin" /> Processing</span> : 'No preview'}
      </div>
    )
  }
  const failed = () => { if (!retried.current) { retried.current = true; onExpired() } }
  if (video.media_kind === 'audio') {
    // A voice note: just a player, no picture.
    return (
      <div className="flex w-full items-center rounded-lg border border-gray-200 bg-gray-50 p-2">
        <audio controls preload="metadata" src={photoSrc(video.video_url)} aria-label={video.title || 'Voice note'} className="h-11 w-full" onError={failed} />
      </div>
    )
  }
  return (
    <video controls playsInline preload="metadata" poster={photoSrc(video.poster_url)} src={photoSrc(video.video_url)} aria-label={video.title || 'Video message'}
      className={`bg-gray-100 object-contain ${className ?? ''}`} onError={failed} />
  )
}

/** What to call an item in words: a video message or a voice note. */
export const kindName = (v: { media_kind?: string }) => (v.media_kind === 'audio' ? 'Voice note' : 'Video message')
const sender = (v: ResidentVideo) => (v.source === 'manager' ? `Added by ${v.uploaded_by_name}` : `From ${v.uploaded_by_name}${v.relationship ? `, ${v.relationship}` : ''}`)

/**
 * "What is said": the speech in a video as text, for the manager only. Machine generated and labelled so. While a transcript is pending the
 * panel asks the API every few seconds (the API checks the job when asked, there is no background worker). Approving or rejecting never
 * waits for it. The manager can correct the English text and choose whether staff see it under the video.
 */
export function TranscriptPanel({ client, residentId, video }: { client: Client; residentId: string; video: ResidentVideo }) {
  const [t, setT] = useState<VideoTranscript | null>(video.transcript ?? null)
  const [busy, setBusy] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')

  // A fresh load of the record brings a fresh transcript.
  useEffect(() => { setT(video.transcript ?? null) }, [video.transcript])

  useEffect(() => {
    if (t?.state !== 'pending') return
    let live = true
    const timer = setInterval(() => {
      client.videoTranscript(residentId, video.id).then(r => { if (live && r.transcript) setT(r.transcript) }).catch(() => { /* try again on the next tick */ })
    }, 4000)
    return () => { live = false; clearInterval(timer) }
  }, [t?.state, client, residentId, video.id])

  if (video.state !== 'ready') return null

  async function run<R>(fn: () => Promise<R>): Promise<R | undefined> {
    setBusy(true); setError('')
    try { return await fn() } catch (e) { setError(errMsg(e)); return undefined } finally { setBusy(false) }
  }
  const start = () => run(async () => { const r = await client.transcribeVideo(residentId, video.id); if (r.transcript) setT(r.transcript) })
  const save = () => run(async () => { const r = await client.updateTranscript(residentId, video.id, { edited_translation_text: draft.trim() || null }); setT(r.transcript); setEditing(false) })
  const share = (on: boolean) => run(async () => { const r = await client.updateTranscript(residentId, video.id, { show_to_staff: on }); setT(r.transcript) })

  const canRun = !t || t.state === 'failed' || t.state === 'no_speech' || t.state === 'not_available'
  return (
    <div className="rounded-lg border border-gray-200 bg-white p-3" aria-label={`What is said in this ${video.media_kind === 'audio' ? 'voice note' : 'video'}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Languages size={14} aria-hidden="true" /> What is said</h5>
        {t?.state === 'ready' && <span className="rounded-full bg-gray-100 px-2 py-0.5 text-xs text-neutral-mid">Machine generated</span>}
      </div>

      {t?.state === 'pending' && <p className="mt-2 flex items-center gap-2 text-sm text-neutral-mid" role="status"><Loader2 size={14} className="animate-spin" /> {t.message}</p>}
      {t && t.state !== 'pending' && t.state !== 'ready' && <p className="mt-2 text-sm text-neutral-mid" role="status">{t.message}</p>}
      {!t && <p className="mt-2 text-sm text-neutral-mid">Turn the speech in this {video.media_kind === 'audio' ? 'voice note' : 'video'} into text, and into English if it is another language, to help you decide. This is optional.</p>}
      {canRun && (
        <button type="button" className={`${btnSecondary} mt-2`} disabled={busy} onClick={start}>
          {busy ? <Loader2 size={14} className="animate-spin" /> : <Languages size={14} />} {t ? 'Try again' : 'Transcribe and translate'}
        </button>
      )}

      {t?.state === 'ready' && (
        <div className="mt-2 space-y-3 text-sm">
          <p className="text-neutral-dark">{t.language_name ? <>Language: <strong>{t.language_name}</strong></> : 'Language not identified'}{t.message ? <span className="text-neutral-mid">. {t.message}</span> : null}</p>
          <div>
            <p className="text-xs font-medium text-neutral-mid">{t.language_name && t.language_name !== 'English' ? `Original text (${t.language_name})` : 'Text'}</p>
            <p dir="auto" className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-line rounded bg-gray-50 p-2 text-neutral-dark">{t.original_text || ''}</p>
          </div>
          {t.translation !== null && (
            <div>
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium text-neutral-mid">English translation{t.edited ? `, edited by ${t.edited_by ?? 'a manager'}` : ''}</p>
                {!editing && <button type="button" className="inline-flex items-center gap-1 text-xs font-medium text-teal hover:underline" onClick={() => { setDraft(t.translation ?? ''); setEditing(true) }}><Pencil size={12} /> Edit translation</button>}
              </div>
              {editing ? (
                <div className="mt-1 space-y-2">
                  <textarea className={inputCls} rows={5} maxLength={10000} value={draft} onChange={e => setDraft(e.target.value)} aria-label="English translation" />
                  <div className="flex gap-2">
                    <button type="button" className={btnPrimary} disabled={busy} onClick={save}>{busy ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Save</button>
                    <button type="button" className={btnSecondary} disabled={busy} onClick={() => setEditing(false)}>Cancel</button>
                  </div>
                </div>
              ) : <p className="mt-0.5 max-h-40 overflow-y-auto whitespace-pre-line rounded bg-gray-50 p-2 text-neutral-dark">{t.translation}</p>}
            </div>
          )}
          <p className="text-xs text-neutral-mid">{t.label}</p>
          {t.can_share_with_staff && (
            <label className="flex items-start gap-2 text-sm text-neutral-dark">
              <input type="checkbox" className="mt-0.5 h-4 w-4" checked={t.show_to_staff} disabled={busy} onChange={e => share(e.target.checked)} />
              <span>Show the English text to staff when this {video.media_kind === 'audio' ? 'voice note' : 'video'} is played<span className="block text-xs text-neutral-mid">Staff see it under the video, labelled as a machine translation checked by a manager. It is only shown once the video is approved. Off by default.</span></span>
            </label>
          )}
        </div>
      )}
      {error && <div className="mt-2"><ErrorBox>{error}</ErrorBox></div>}
    </div>
  )
}

/** Family videos waiting for approval: preview, who sent it, an editable title and note, approve or reject. */
export function VideoApprovals({ client, resident, onChanged }: { client: Client; resident: ResidentDetail; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [titles, setTitles] = useState<Record<string, string>>({})
  const [notes, setNotes] = useState<Record<string, string>>({})
  const pending = (resident.videos ?? []).filter(v => v.status === 'pending' && v.state === 'ready')
  if (pending.length === 0) return null

  async function decide(v: ResidentVideo, decision: 'approve' | 'reject') {
    setBusyId(v.id); setError('')
    try {
      await client.decideVideo(resident.id, v.id, decision === 'approve' ? { decision, title: (titles[v.id] ?? v.title ?? '').trim(), note: (notes[v.id] ?? v.note ?? '').trim() } : { decision })
      onChanged()
    } catch (e) { setError(errMsg(e)) } finally { setBusyId(null) }
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40" aria-label="Videos and voice notes waiting for approval">
      <h4 className="flex items-center gap-2 border-b border-amber-200 px-4 py-2 text-sm font-semibold text-neutral-dark"><Clapperboard size={15} aria-hidden="true" /> Videos and voice notes waiting for approval ({pending.length})</h4>
      {error && <div className="p-3"><ErrorBox>{error}</ErrorBox></div>}
      <ul className="divide-y divide-amber-100">
        {pending.map(v => (
          <li key={v.id} className={`flex flex-col gap-3 px-4 py-3 ${v.media_kind === 'audio' ? '' : 'md:flex-row'}`}>
            {/* A voice note is just a player, so it sits on its own line above the details; a video keeps its picture beside them. */}
            <div className={v.media_kind === 'audio' ? 'w-full' : 'w-full shrink-0 md:w-72'}>
              {v.media_kind === 'audio' && <p className="mb-1.5 inline-flex items-center gap-1.5 rounded-full bg-purple-50 px-2.5 py-0.5 text-xs font-semibold text-purple-700"><Mic size={12} aria-hidden="true" /> Voice note</p>}
              <Player video={v} onExpired={onChanged} className="aspect-video w-full rounded-lg border border-gray-200" />
            </div>
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-neutral-mid">{sender(v)}, {fmtDate(v.submitted_at)}{v.duration_seconds ? `, ${fmtDuration(v.duration_seconds)}` : ''}</p>
              <Field label="Title (you can edit it before approving)" htmlFor={`vt-${v.id}`}>
                <input id={`vt-${v.id}`} className={inputCls} maxLength={TITLE_MAX} value={titles[v.id] ?? v.title ?? ''} onChange={e => setTitles(c => ({ ...c, [v.id]: e.target.value }))} />
              </Field>
              <Field label="Note for staff (optional)" htmlFor={`vn-${v.id}`} hint="For example, who is in it or what it is about. Staff and the hub chat use the title and note to find it.">
                <input id={`vn-${v.id}`} className={inputCls} maxLength={NOTE_MAX} value={notes[v.id] ?? v.note ?? ''} onChange={e => setNotes(c => ({ ...c, [v.id]: e.target.value }))} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={busyId !== null} onClick={() => decide(v, 'approve')}>
                  {busyId === v.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
                <button type="button" className={btnDangerOutline} disabled={busyId !== null} onClick={() => decide(v, 'reject')}><X size={14} /> Reject</button>
              </div>
              <p className="text-xs text-neutral-mid">Rejecting removes the {v.media_kind === 'audio' ? 'voice note' : 'video'} and any text taken from it from storage straight away.</p>
              <TranscriptPanel client={client} residentId={resident.id} video={v} />
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The videos staff can play, with delete, a form to add one yourself (approved at once), and who has played them lately. */
export function VideoManager({ client, resident, onChanged }: { client: Client; resident: ResidentDetail; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [title, setTitle] = useState('')
  const [note, setNote] = useState('')
  const [progress, setProgress] = useState<{ phase: 'uploading' | 'processing'; pct: number } | null>(null)
  const [delId, setDelId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const approved = (resident.videos ?? []).filter(v => v.status === 'approved')
  const plays = resident.video_plays ?? []

  function choose(f: File | null) {
    setError('')
    if (f && !(f.type.startsWith('video/') || EXT.test(f.name))) { setFile(null); setError('Please choose a video file (MP4, MOV, WebM or 3GP).'); if (input.current) input.current.value = ''; return }
    if (f && f.size > MAX_MB * 1024 * 1024) { setFile(null); setError(`Each video must be under ${MAX_MB} MB.`); if (input.current) input.current.value = ''; return }
    setFile(f)
  }

  async function add() {
    if (!file || progress) return
    setError(''); setProgress({ phase: 'uploading', pct: 0 })
    let videoId = ''
    try {
      await uploadVideoInChunks<ResidentVideo>(file, {
        start: async size => { const r = await client.videoStart(resident.id, { size, title: title.trim(), note: note.trim() }); videoId = r.video.id; return { id: r.video.id, total: r.total_chunks, chunk: r.chunk_bytes } },
        received: async id => (await client.videoStatus(resident.id, id)).received,
        chunkPath: (id, n) => `/residents/${resident.id}/videos/${id}/chunk/${n}`,
        token: client.token,
        complete: async id => (await client.videoComplete(resident.id, id, { title: title.trim() })).video,
      }, p => setProgress({ phase: p.phase, pct: Math.round((p.sent / Math.max(1, p.total)) * 100) }))
      setFile(null); setTitle(''); setNote(''); if (input.current) input.current.value = ''
      onChanged()
    } catch (e) {
      if (videoId) { try { await client.deleteVideo(resident.id, videoId) } catch { /* swept later */ } }
      setError(errMsg(e))
    } finally { setProgress(null) }
  }

  async function remove(v: ResidentVideo) {
    if (!window.confirm('Delete this video? It is removed from the hub and from storage.')) return
    setDelId(v.id); setError('')
    try { await client.deleteVideo(resident.id, v.id); onChanged() } catch (e) { setError(errMsg(e)) } finally { setDelId(null) }
  }

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 p-4" aria-label="Video messages and voice notes">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Clapperboard size={15} aria-hidden="true" /> Video messages and voice notes</h4>
        <p className="mt-1 text-sm text-neutral-mid">Approved videos can be played by staff from the hub, for example on a tablet. They are kept privately, are never watched or described by the assistant, and are deleted with the profile.</p>
      </div>
      {approved.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {approved.map(v => (
            <li key={v.id} className="overflow-hidden rounded-lg border border-gray-200">
              <Player video={v} onExpired={onChanged} className="aspect-video w-full" />
              <div className="space-y-1 p-2 text-xs text-neutral-mid">
                <p className="text-sm font-medium text-neutral-dark">{v.title || kindName(v)}{v.duration_seconds ? <span className="font-normal text-neutral-mid">, {fmtDuration(v.duration_seconds)}</span> : null}</p>
                {v.note && <p>{v.note}</p>}
                <p>{sender(v)}, {fmtDate(v.decided_at ?? v.submitted_at)}</p>
                <TranscriptPanel client={client} residentId={resident.id} video={v} />
                <button type="button" className="inline-flex items-center gap-1 font-medium text-red-700 hover:underline" disabled={delId === v.id} onClick={() => remove(v)} aria-label={`Delete video${v.title ? `: ${v.title}` : ''}`}>
                  {delId === v.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-neutral-mid">No videos yet.</p>}

      <div className="space-y-3 border-t border-gray-100 pt-3">
        <Field label="Add a video" htmlFor="rv-file" hint={`MP4, MOV, WebM or 3GP, up to 60 seconds and ${MAX_MB} MB. It is converted so it plays on any phone or tablet, and location details are removed. Approved at once.`}>
          <input id="rv-file" ref={input} type="file" accept="video/*" disabled={!!progress} onChange={e => choose(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-neutral-dark file:mr-3 file:rounded-lg file:border-0 file:bg-teal file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-dark" aria-describedby="rv-file-hint" />
        </Field>
        {file && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Title (optional)" htmlFor="rv-title"><input id="rv-title" className={inputCls} maxLength={TITLE_MAX} value={title} onChange={e => setTitle(e.target.value)} placeholder="For example, From Sarah, Sunday" /></Field>
              <Field label="Note for staff (optional)" htmlFor="rv-note"><input id="rv-note" className={inputCls} maxLength={NOTE_MAX} value={note} onChange={e => setNote(e.target.value)} /></Field>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" className={btnPrimary} disabled={!!progress} onClick={add}>{progress ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />} Add video</button>
              <button type="button" className={btnSecondary} disabled={!!progress} onClick={() => { setFile(null); if (input.current) input.current.value = '' }}>Cancel</button>
              {progress && <span className="text-sm text-neutral-mid" role="status">{progress.phase === 'processing' ? 'Processing, this can take a minute' : `Uploading ${progress.pct}%`}</span>}
            </div>
            {progress && <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200" aria-hidden="true"><div className="h-full rounded-full bg-teal transition-all" style={{ width: `${progress.phase === 'processing' ? 100 : progress.pct}%` }} /></div>}
          </>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
      </div>

      <div className="border-t border-gray-100 pt-3">
        <h5 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Play size={13} aria-hidden="true" /> Recently played</h5>
        {plays.length === 0 ? <p className="mt-1 text-sm text-neutral-mid">Nobody has played a video message yet.</p> : (
          <ul className="mt-1 divide-y divide-gray-100 text-sm">
            {plays.slice(0, 10).map(p => (
              <li key={p.id} className="flex flex-wrap justify-between gap-x-3 py-1.5">
                <span className="text-neutral-dark">{p.user_name} played {p.video_title ? `"${p.video_title}"` : 'a video message'}</span>
                <span className="text-xs text-neutral-mid">{new Date(p.played_at).toLocaleString('en-GB', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}
