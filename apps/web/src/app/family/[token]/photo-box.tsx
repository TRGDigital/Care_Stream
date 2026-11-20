'use client'

// The photo box on the public family page. A photo is uploaded as soon as it is added (one at a time), stays private, and is held for the
// home manager to approve before the care team can see it. The link is the key, so there is no sign in.

import { useRef, useState } from 'react'
import { Camera, Loader2, Trash2, Clock, CheckCircle2, ImageOff } from 'lucide-react'
import { deleteFamilyPhoto, photoSrc, uploadFamilyPhoto, type FamilyPhoto } from '@/lib/residents-api'

const FIELD = 'w-full rounded-xl border border-gray-300 bg-white px-4 py-3 text-base text-neutral-dark outline-none focus:border-teal focus:ring-2 focus:ring-teal/20'
const OK_TYPES = ['image/jpeg', 'image/png', 'image/webp']

type Item = FamilyPhoto & { preview?: string }

export function PhotoBox({ token, resident, home, initial, max, maxMb, captionMax, onCount }: {
  token: string; resident: string; home: string; initial: FamilyPhoto[]; max: number; maxMb: number; captionMax: number; onCount: (n: number) => void
}) {
  const [items, setItems] = useState<Item[]>(initial)
  const [file, setFile] = useState<File | null>(null)
  const [caption, setCaption] = useState('')
  const [people, setPeople] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const kept = items.filter(i => i.status !== 'rejected')
  const full = kept.length >= max

  function choose(f: File | null) {
    setError('')
    if (f && !OK_TYPES.includes(f.type)) { setFile(null); setError('Please choose a JPEG, PNG or WebP photo.'); if (input.current) input.current.value = ''; return }
    if (f && f.size > maxMb * 1024 * 1024) { setFile(null); setError(`That photo is too big. Each photo must be under ${maxMb} MB.`); if (input.current) input.current.value = ''; return }
    setFile(f)
  }

  async function add() {
    if (!file || busy) return
    setBusy(true); setError('')
    try {
      const { photo } = await uploadFamilyPhoto(token, file, caption.trim(), people.trim())
      const next = [...items, { ...photo, preview: URL.createObjectURL(file) }]
      setItems(next); onCount(next.filter(i => i.status !== 'rejected').length)
      setFile(null); setCaption(''); setPeople(''); if (input.current) input.current.value = ''
    } catch (e: any) {
      if (e?.status === 410) setError('This link is no longer active. Please contact the home for a new one.')
      else if (e?.status === 429) setError('Too many attempts. Please wait a few minutes and try again.')
      else setError(e?.message || 'The photo could not be added. Please try again.')
    } finally { setBusy(false) }
  }

  async function remove(id: string) {
    setError('')
    try {
      await deleteFamilyPhoto(token, id)
      const next = items.filter(i => i.id !== id)
      setItems(next); onCount(next.filter(i => i.status !== 'rejected').length)
    } catch (e: any) { setError(e?.message || 'The photo could not be removed. Please try again.') }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-gray-200 bg-white p-6 shadow-sm" aria-labelledby="fam-photos-title">
      <div>
        <h2 id="fam-photos-title" className="flex items-center gap-2 text-lg font-semibold leading-snug text-neutral-dark"><Camera size={20} className="text-teal" aria-hidden="true" /> Photos of {resident} (optional)</h2>
        <p className="mt-1 text-sm text-neutral-mid">Photos of {resident}, with family, friends, pets or places that matter to them, help the team start good conversations. You can share up to {max}.</p>
      </div>

      <p className="rounded-xl bg-neutral-light px-4 py-3 text-sm leading-relaxed text-neutral-dark">
        Only share photos you are happy for the care team to see. Please check anyone else in the photo is comfortable with it. A manager reviews every photo before staff see it, and photos are removed if the person moves on.
      </p>

      {items.length > 0 && (
        <ul className="grid grid-cols-2 gap-3 sm:grid-cols-3" aria-label="Your photos">
          {items.map(i => (
            <li key={i.id} className="overflow-hidden rounded-xl border border-gray-200">
              <div className="flex aspect-square items-center justify-center bg-gray-50">
                {i.preview || i.url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={i.preview || photoSrc(i.url)} alt={i.caption || `Photo of ${resident}`} className="h-full w-full object-cover" />
                ) : <ImageOff size={24} className="text-gray-400" aria-hidden="true" />}
              </div>
              <div className="space-y-1 p-2 text-sm">
                {i.caption && <p className="text-neutral-dark">{i.caption}</p>}
                <p className="flex items-center gap-1 text-xs text-neutral-mid">
                  {i.status === 'approved' ? <><CheckCircle2 size={12} className="text-green-600" aria-hidden="true" /> Approved</>
                    : i.status === 'rejected' ? 'Not used by the home'
                    : <><Clock size={12} aria-hidden="true" /> Waiting for the manager</>}
                </p>
                {i.status !== 'rejected' && (
                  <button type="button" onClick={() => remove(i.id)} className="inline-flex items-center gap-1 text-xs font-medium text-red-700 hover:underline" aria-label={`Remove photo${i.caption ? `: ${i.caption}` : ''}`}>
                    <Trash2 size={12} aria-hidden="true" /> Remove
                  </button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}

      {full ? (
        <p className="text-sm text-neutral-mid">You have added the most photos you can share ({max}).</p>
      ) : (
        <div className="space-y-3">
          <div>
            <label htmlFor="fam-photo-file" className="mb-1 block text-base font-medium text-neutral-dark">Choose a photo</label>
            <input id="fam-photo-file" ref={input} type="file" accept="image/jpeg,image/png,image/webp" onChange={e => choose(e.target.files?.[0] ?? null)}
              className="block w-full text-base text-neutral-dark file:mr-3 file:rounded-lg file:border-0 file:bg-teal file:px-4 file:py-2.5 file:text-base file:font-semibold file:text-white hover:file:bg-teal-dark" aria-describedby="fam-photo-hint" />
            <p id="fam-photo-hint" className="mt-1 text-sm text-neutral-mid">JPEG, PNG or WebP, up to {maxMb} MB each. Location details stored in a photo are removed.</p>
          </div>
          {file && (
            <>
              <div>
                <label htmlFor="fam-photo-caption" className="mb-1 block text-base font-medium text-neutral-dark">Caption (optional)</label>
                <input id="fam-photo-caption" value={caption} maxLength={captionMax} onChange={e => setCaption(e.target.value)} placeholder="For example, Our holiday in Whitby, 1974" className={FIELD} />
              </div>
              <div>
                <label htmlFor="fam-photo-people" className="mb-1 block text-base font-medium text-neutral-dark">Who is in this photo? (optional)</label>
                <input id="fam-photo-people" value={people} maxLength={captionMax} onChange={e => setPeople(e.target.value)} placeholder={`For example, ${resident} with her sister Joan`} className={FIELD} />
              </div>
              <button type="button" onClick={add} disabled={busy} className="flex min-h-[48px] items-center justify-center gap-2 rounded-xl border border-teal px-5 py-2.5 text-base font-semibold text-teal hover:bg-teal/5 disabled:opacity-50">
                {busy && <Loader2 size={16} className="animate-spin" />} Add this photo
              </button>
            </>
          )}
        </div>
      )}

      {error && <p role="alert" className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-base text-red-700">{error}</p>}

      <p className="text-sm leading-relaxed text-neutral-mid">
        Privacy: your photos are kept privately by {home} and never shown on a public page. Only the manager can see them until they are approved, and then only the care team. You can remove a photo here until you press Send. After that, ask {home}.
      </p>
    </section>
  )
}
