'use client'

// Picture controls for staff:
//   StaffPictureField  the optional "Picture" choice in the add staff form (choose, preview, skip). The caller uploads it after the
//                      person is created.
//   StaffPictureBlock  a "Picture" block with the current avatar, Change and Remove. Used on the staff member's page and, for
//                      their own picture, in the hub ("Your picture").
// Both check the type and size in the browser first; the server checks the real file again.

import { useEffect, useRef, useState } from 'react'
import { Camera, Loader2, Trash2, X } from 'lucide-react'
import { StaffAvatar } from './staff-avatar'

export const PICTURE_MAX_BYTES = 5 * 1024 * 1024
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']
export const PICTURE_ACCEPT = 'image/jpeg,image/png,image/webp'

/** Returns a helpful message when the file cannot be used, or null when it is fine. */
export function validatePictureFile(file: File | undefined | null): string | null {
  if (!file) return 'Please choose a picture.'
  if (!OK_TYPES.includes(file.type)) return 'Please choose a JPEG, PNG or WebP picture. Phone photos in other formats can be saved as JPEG first.'
  if (file.size > PICTURE_MAX_BYTES) return `That picture is ${(file.size / 1024 / 1024).toFixed(1)} MB. Please choose one under 5 MB.`
  if (file.size === 0) return 'That file is empty. Please choose another picture.'
  return null
}

function friendly(e: unknown): string {
  const code = (e as any)?.code as string | undefined
  if (code === 'NOT_READY') return 'Pictures are being set up. Please try again shortly.'
  return (e as any)?.message || 'The picture could not be uploaded. Please try again.'
}

/** Optional picture choice for the add staff form. */
export function StaffPictureField({ name, file, onChange, disabled }: { name: string; file: File | null; onChange: (f: File | null) => void; disabled?: boolean }) {
  const [preview, setPreview] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const input = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!file) { setPreview(null); return }
    const url = URL.createObjectURL(file)
    setPreview(url)
    return () => URL.revokeObjectURL(url)
  }, [file])

  function pick(f: File | undefined) {
    if (!f) return
    const problem = validatePictureFile(f)
    setError(problem)
    if (!problem) onChange(f)
    if (input.current) input.current.value = ''
  }

  return (
    <div>
      <label htmlFor="staff-picture-add" className="mb-1 block text-xs font-medium text-neutral-mid">Picture <span className="font-normal">(optional)</span></label>
      <div className="flex items-center gap-3">
        {preview
          // eslint-disable-next-line @next/next/no-img-element
          ? <img src={preview} alt={`Chosen photo of ${name || 'the new staff member'}`} width={48} height={48} className="h-12 w-12 shrink-0 rounded-full border border-gray-200 object-cover" />
          : <StaffAvatar name={name || '?'} size={48} />}
        <div className="flex flex-wrap items-center gap-2">
          <input id="staff-picture-add" ref={input} type="file" accept={PICTURE_ACCEPT} disabled={disabled} className="sr-only" onChange={e => pick(e.target.files?.[0])} />
          <label htmlFor="staff-picture-add" className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-dark hover:border-teal hover:text-teal focus-within:ring-2 focus-within:ring-teal ${disabled ? 'pointer-events-none opacity-60' : ''}`}>
            <Camera size={13} /> {file ? 'Choose a different photo' : 'Choose a photo'}
          </label>
          {file && (
            <button type="button" onClick={() => { onChange(null); setError(null) }} disabled={disabled} className="inline-flex items-center gap-1 rounded-lg px-2 py-1.5 text-xs font-medium text-neutral-mid hover:text-neutral-dark">
              <X size={13} /> Skip
            </button>
          )}
        </div>
      </div>
      <p className="mt-1 text-[11px] text-neutral-mid">JPEG, PNG or WebP, up to 5 MB. You can skip this and add one later.</p>
      {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}

/** The picture block: avatar, Change, Remove. `onSet` and `onRemove` do the upload and return the new link (or null). */
export function StaffPictureBlock({ name, photoUrl, onSet, onRemove, onRefresh, idPrefix = 'staff-picture', who = 'their', size = 72 }: {
  name: string
  photoUrl: string | null | undefined
  onSet: (file: File) => Promise<string | null>
  onRemove: () => Promise<void>
  onRefresh?: () => void
  idPrefix?: string
  /** Wording in the confirm text, for example "your" in the hub. */
  who?: string
  size?: number
}) {
  const [busy, setBusy] = useState<'upload' | 'remove' | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [confirming, setConfirming] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const inputId = `${idPrefix}-file`

  async function choose(f: File | undefined) {
    if (!f) return
    const problem = validatePictureFile(f)
    if (input.current) input.current.value = ''
    if (problem) { setError(problem); return }
    setError(null); setBusy('upload')
    try { await onSet(f) } catch (e) { setError(friendly(e)) } finally { setBusy(null) }
  }
  async function remove() {
    setError(null); setBusy('remove'); setConfirming(false)
    try { await onRemove() } catch (e) { setError(friendly(e)) } finally { setBusy(null) }
  }

  return (
    <div>
      <div className="flex items-center gap-4">
        <div className="relative">
          <StaffAvatar name={name} photoUrl={photoUrl} size={size} onRefresh={onRefresh} />
          {busy && <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70" role="status" aria-label={busy === 'upload' ? 'Uploading picture' : 'Removing picture'}><Loader2 size={20} className="animate-spin text-teal" /></span>}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input id={inputId} ref={input} type="file" accept={PICTURE_ACCEPT} disabled={!!busy} className="sr-only" onChange={e => choose(e.target.files?.[0])} />
          <label htmlFor={inputId} className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-neutral-dark hover:border-teal hover:text-teal focus-within:ring-2 focus-within:ring-teal ${busy ? 'pointer-events-none opacity-60' : ''}`}>
            <Camera size={13} /> {photoUrl ? 'Change picture' : 'Add a picture'}
          </label>
          {photoUrl && !confirming && (
            <button type="button" onClick={() => setConfirming(true)} disabled={!!busy} className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-xs font-semibold text-rose-600 hover:border-rose-300 disabled:opacity-60">
              <Trash2 size={13} /> Remove
            </button>
          )}
          {confirming && (
            <span className="inline-flex items-center gap-2 text-xs text-neutral-dark">
              Remove {who} picture?
              <button type="button" onClick={remove} className="rounded-md bg-rose-600 px-2.5 py-1 font-semibold text-white hover:bg-rose-700">Yes, remove</button>
              <button type="button" onClick={() => setConfirming(false)} className="rounded-md px-2 py-1 font-medium text-neutral-mid hover:text-neutral-dark">Keep it</button>
            </span>
          )}
        </div>
      </div>
      <p className="mt-2 text-[11px] text-neutral-mid">JPEG, PNG or WebP, up to 5 MB. It is cropped to a square. Shown as initials when there is no picture.</p>
      {error && <p role="alert" className="mt-1 text-xs text-rose-600">{error}</p>}
    </div>
  )
}
