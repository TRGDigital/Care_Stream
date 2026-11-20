'use client'

// Video messages in the Residents overlay. VideoApprovals sits in the Approvals tab (family videos waiting for a decision: preview, edit the
// title, approve or reject). VideoManager sits under the profile: the videos staff can play, adding one yourself (approved at once),
// deleting, and who has played them recently. Videos are private: each is loaded through a link that lasts about ten minutes, so if one has
// run out the player asks for a fresh set once.

import { useRef, useState } from 'react'
import { Check, Clapperboard, Loader2, Play, Trash2, Upload, X } from 'lucide-react'
import { photoSrc, type ResidentDetail, type ResidentVideo } from '@/lib/residents-api'
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
  return (
    <video controls playsInline preload="metadata" poster={photoSrc(video.poster_url)} src={photoSrc(video.video_url)} aria-label={video.title || 'Video message'}
      className={`bg-gray-100 object-contain ${className ?? ''}`} onError={() => { if (!retried.current) { retried.current = true; onExpired() } }} />
  )
}

const sender = (v: ResidentVideo) => (v.source === 'manager' ? `Added by ${v.uploaded_by_name}` : `From ${v.uploaded_by_name}${v.relationship ? `, ${v.relationship}` : ''}`)

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
    <section className="rounded-lg border border-amber-200 bg-amber-50/40" aria-label="Videos waiting for approval">
      <h4 className="flex items-center gap-2 border-b border-amber-200 px-4 py-2 text-sm font-semibold text-neutral-dark"><Clapperboard size={15} aria-hidden="true" /> Videos waiting for approval ({pending.length})</h4>
      {error && <div className="p-3"><ErrorBox>{error}</ErrorBox></div>}
      <ul className="divide-y divide-amber-100">
        {pending.map(v => (
          <li key={v.id} className="flex flex-col gap-3 px-4 py-3 md:flex-row">
            <Player video={v} onExpired={onChanged} className="aspect-video w-full shrink-0 rounded-lg border border-gray-200 md:w-72" />
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
              <p className="text-xs text-neutral-mid">Rejecting removes the video from storage straight away.</p>
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
    <section className="space-y-3 rounded-lg border border-gray-200 p-4" aria-label="Video messages">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Clapperboard size={15} aria-hidden="true" /> Video messages</h4>
        <p className="mt-1 text-sm text-neutral-mid">Approved videos can be played by staff from the hub, for example on a tablet. They are kept privately, are never watched or described by the assistant, and are deleted with the profile.</p>
      </div>
      {approved.length > 0 ? (
        <ul className="grid gap-3 sm:grid-cols-2">
          {approved.map(v => (
            <li key={v.id} className="overflow-hidden rounded-lg border border-gray-200">
              <Player video={v} onExpired={onChanged} className="aspect-video w-full" />
              <div className="space-y-1 p-2 text-xs text-neutral-mid">
                <p className="text-sm font-medium text-neutral-dark">{v.title || 'Video message'}{v.duration_seconds ? <span className="font-normal text-neutral-mid">, {fmtDuration(v.duration_seconds)}</span> : null}</p>
                {v.note && <p>{v.note}</p>}
                <p>{sender(v)}, {fmtDate(v.decided_at ?? v.submitted_at)}</p>
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
