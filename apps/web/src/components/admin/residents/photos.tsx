'use client'

// Photos in the Residents overlay. PhotoApprovals sits in the Approvals tab (family photos waiting for a decision); PhotoManager sits under the
// profile (the photos staff can see, plus adding one yourself). Photos are private: each picture is loaded through a link that lasts about
// five minutes, so if one has expired the picture asks for a fresh set once.

import { useRef, useState } from 'react'
import { Camera, Check, ImageOff, Loader2, Trash2, X } from 'lucide-react'
import { photoSrc, type ResidentDetail, type ResidentPhoto } from '@/lib/residents-api'
import { ErrorBox, Field, inputCls, btnPrimary, btnSecondary, btnDangerOutline, errMsg, fmtDate } from './ui'

type Client = ReturnType<typeof import('@/lib/residents-api').createResidentsClient>
const CAPTION_MAX = 140

export function Thumb({ photo, onExpired, className }: { photo: ResidentPhoto; onExpired: () => void; className?: string }) {
  const retried = useRef(false)
  if (!photo.url) return <div className={`flex items-center justify-center bg-gray-50 ${className ?? ''}`}><ImageOff size={22} className="text-gray-400" aria-hidden="true" /></div>
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={photoSrc(photo.url)} alt={photo.caption || 'Resident photo'} loading="lazy" className={`object-cover ${className ?? ''}`}
      onError={() => { if (!retried.current) { retried.current = true; onExpired() } }} />
  )
}

/** Family photos waiting for approval: thumbnail, who sent it, an editable caption, approve or reject. */
export function PhotoApprovals({ client, resident, onChanged }: { client: Client; resident: ResidentDetail; onChanged: () => void }) {
  const [busyId, setBusyId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [captions, setCaptions] = useState<Record<string, string>>({})
  const pending = (resident.photos ?? []).filter(p => p.status === 'pending')
  if (pending.length === 0) return null

  async function decide(p: ResidentPhoto, decision: 'approve' | 'reject') {
    setBusyId(p.id); setError('')
    try {
      await client.decidePhoto(resident.id, p.id, decision === 'approve' ? { decision, caption: (captions[p.id] ?? p.caption ?? '').trim() } : { decision })
      onChanged()
    } catch (e) { setError(errMsg(e)) } finally { setBusyId(null) }
  }

  return (
    <section className="rounded-lg border border-amber-200 bg-amber-50/40" aria-label="Photos waiting for approval">
      <h4 className="flex items-center gap-2 border-b border-amber-200 px-4 py-2 text-sm font-semibold text-neutral-dark"><Camera size={15} aria-hidden="true" /> Photos waiting for approval ({pending.length})</h4>
      {error && <div className="p-3"><ErrorBox>{error}</ErrorBox></div>}
      <ul className="divide-y divide-amber-100">
        {pending.map(p => (
          <li key={p.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row">
            <Thumb photo={p} onExpired={onChanged} className="h-40 w-full shrink-0 rounded-lg border border-gray-200 sm:w-40" />
            <div className="min-w-0 flex-1 space-y-2">
              <p className="text-xs text-neutral-mid">From <strong className="text-neutral-dark">{p.uploaded_by_name}</strong>{p.relationship ? `, ${p.relationship}` : ''}, {fmtDate(p.submitted_at)}</p>
              {p.people_note && <p className="text-sm text-neutral-dark"><span className="font-medium">Who is in it:</span> {p.people_note}</p>}
              <Field label="Caption (you can edit it before approving)" htmlFor={`pc-${p.id}`}>
                <input id={`pc-${p.id}`} className={inputCls} maxLength={CAPTION_MAX} value={captions[p.id] ?? p.caption ?? ''} onChange={e => setCaptions(c => ({ ...c, [p.id]: e.target.value }))} />
              </Field>
              <div className="flex flex-wrap gap-2">
                <button type="button" className={btnPrimary} disabled={busyId !== null} onClick={() => decide(p, 'approve')}>
                  {busyId === p.id ? <Loader2 size={14} className="animate-spin" /> : <Check size={14} />} Approve
                </button>
                <button type="button" className={btnDangerOutline} disabled={busyId !== null} onClick={() => decide(p, 'reject')}><X size={14} /> Reject</button>
              </div>
              <p className="text-xs text-neutral-mid">Rejecting removes the photo from storage.</p>
            </div>
          </li>
        ))}
      </ul>
    </section>
  )
}

/** The photos staff can see, with delete, and a form to add one yourself (approved at once). */
export function PhotoManager({ client, resident, onChanged }: { client: Client; resident: ResidentDetail; onChanged: () => void }) {
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [people, setPeople] = useState('')
  const [busy, setBusy] = useState(false)
  const [delId, setDelId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const approved = (resident.photos ?? []).filter(p => p.status === 'approved')

  function choose(f: File | null) {
    setError('')
    if (f && !['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) { setFile(null); setError('Please choose a JPEG, PNG or WebP photo.'); if (input.current) input.current.value = ''; return }
    if (f && f.size > 5 * 1024 * 1024) { setFile(null); setError('Each photo must be under 5 MB.'); if (input.current) input.current.value = ''; return }
    setFile(f)
  }
  async function add() {
    if (!file) return
    setBusy(true); setError('')
    try {
      await client.addPhoto(resident.id, file, caption.trim(), people.trim())
      setFile(null); setCaption(''); setPeople(''); if (input.current) input.current.value = ''
      onChanged()
    } catch (e) { setError(errMsg(e)) } finally { setBusy(false) }
  }
  async function remove(p: ResidentPhoto) {
    if (!window.confirm('Delete this photo? It is removed from the hub and from storage.')) return
    setDelId(p.id); setError('')
    try { await client.deletePhoto(resident.id, p.id); onChanged() } catch (e) { setError(errMsg(e)) } finally { setDelId(null) }
  }

  return (
    <section className="space-y-3 rounded-lg border border-gray-200 p-4" aria-label="Photos">
      <div>
        <h4 className="flex items-center gap-2 text-sm font-semibold text-neutral-dark"><Camera size={15} aria-hidden="true" /> Photos</h4>
        <p className="mt-1 text-sm text-neutral-mid">Approved photos show to staff in the hub, with their captions. They are kept privately, are not used by the assistant, and are deleted with the profile.</p>
      </div>
      {approved.length > 0 ? (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {approved.map(p => (
            <li key={p.id} className="overflow-hidden rounded-lg border border-gray-200">
              <Thumb photo={p} onExpired={onChanged} className="aspect-square w-full" />
              <div className="space-y-1 p-2 text-xs text-neutral-mid">
                {p.caption && <p className="text-sm text-neutral-dark">{p.caption}</p>}
                <p>{p.source === 'manager' ? `Added by ${p.uploaded_by_name}` : `From ${p.uploaded_by_name}${p.relationship ? `, ${p.relationship}` : ''}`}</p>
                <button type="button" className="inline-flex items-center gap-1 font-medium text-red-700 hover:underline" disabled={delId === p.id} onClick={() => remove(p)} aria-label={`Delete photo${p.caption ? `: ${p.caption}` : ''}`}>
                  {delId === p.id ? <Loader2 size={12} className="animate-spin" /> : <Trash2 size={12} />} Delete
                </button>
              </div>
            </li>
          ))}
        </ul>
      ) : <p className="text-sm text-neutral-mid">No photos yet.</p>}

      <div className="space-y-3 border-t border-gray-100 pt-3">
        <Field label="Add a photo" htmlFor="rp-file" hint="JPEG, PNG or WebP, up to 5 MB. Location details inside the photo are removed.">
          <input id="rp-file" ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => choose(e.target.files?.[0] ?? null)}
            className="block w-full text-sm text-neutral-dark file:mr-3 file:rounded-lg file:border-0 file:bg-teal file:px-3 file:py-2 file:text-sm file:font-medium file:text-white hover:file:bg-teal-dark" aria-describedby="rp-file-hint" />
        </Field>
        {file && (
          <>
            <div className="grid gap-3 sm:grid-cols-2">
              <Field label="Caption (optional)" htmlFor="rp-cap"><input id="rp-cap" className={inputCls} maxLength={CAPTION_MAX} value={caption} onChange={e => setCaption(e.target.value)} /></Field>
              <Field label="Who is in this photo? (optional)" htmlFor="rp-people"><input id="rp-people" className={inputCls} maxLength={CAPTION_MAX} value={people} onChange={e => setPeople(e.target.value)} /></Field>
            </div>
            <div className="flex gap-2">
              <button type="button" className={btnPrimary} disabled={busy} onClick={add}>{busy && <Loader2 size={14} className="animate-spin" />} Add photo</button>
              <button type="button" className={btnSecondary} disabled={busy} onClick={() => { setFile(null); if (input.current) input.current.value = '' }}>Cancel</button>
            </div>
          </>
        )}
        {error && <ErrorBox>{error}</ErrorBox>}
      </div>
    </section>
  )
}
