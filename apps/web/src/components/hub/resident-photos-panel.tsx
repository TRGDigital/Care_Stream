'use client'

// Staff hub, "This is me" topic: a small strip of approved photos for the people the home supports, tap to enlarge.
// The API only sends approved photos of living residents. Each picture loads through a private link that lasts about five minutes,
// so the list is fetched again every four minutes while the panel is open. Photos are not part of the assistant's answers.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Camera, ChevronDown, ChevronUp, X } from 'lucide-react'
import { createResidentsClient, photoSrc, type HubPhoto, type HubResident } from '@/lib/residents-api'

export function ResidentPhotosPanel({ token, context = '' }: { token: string; context?: string }) {
  const client = useMemo(() => createResidentsClient(token), [token])
  const [residents, setResidents] = useState<HubResident[]>([])
  const [open, setOpen] = useState(false)
  const [who, setWho] = useState<string | null>(null)
  const [find, setFind] = useState('')
  const [followed, setFollowed] = useState('')
  const [big, setBig] = useState<{ photo: HubPhoto; name: string } | null>(null)

  const load = useCallback(() => {
    client.hub()
      .then(d => setResidents((d.residents ?? []).filter(r => (r.photos ?? []).length > 0)))
      .catch(() => { /* photos are optional: stay quiet if the plan or table is not ready */ })
  }, [client])

  useEffect(() => {
    load()
    const t = setInterval(load, 4 * 60 * 1000)
    return () => clearInterval(t)
  }, [load])

  useEffect(() => {
    if (!big) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setBig(null) }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [big])

  // Follow the conversation: when the chat names a person who has photos, show that person (the most recent mention wins).
  useEffect(() => {
    if (!context || residents.length === 0 || context === followed) return
    const text = context.toLowerCase()
    let best: { id: string; at: number } | null = null
    for (const r of residents) {
      for (const n of [r.preferred_name, r.first_name, r.display_name]) {
        if (!n || n.trim().length < 2) continue
        const re = new RegExp(`\\b${n.trim().toLowerCase().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
        let m: RegExpExecArray | null
        while ((m = re.exec(text))) if (!best || m.index > best.at) best = { id: r.id, at: m.index }
      }
    }
    setFollowed(context)
    if (best) { setWho(best.id); setOpen(true) }
  }, [context, residents, followed])

  if (residents.length === 0) return null
  const many = residents.length > 1
  const current = residents.find(r => r.id === who) ?? (many ? null : residents[0])
  const name = current ? (current.preferred_name || current.first_name) : ''
  const total = residents.reduce((n, r) => n + r.photos.length, 0)

  return (
    <div className="flex-shrink-0 border-b border-gray-100 bg-white px-4 py-2">
      <div className="mx-auto max-w-6xl">
        <button type="button" onClick={() => setOpen(o => !o)} aria-expanded={open}
          className="flex w-full items-center justify-between gap-2 text-left text-xs font-medium text-teal">
          <span className="flex items-center gap-1.5"><Camera size={13} aria-hidden="true" /> Photos of the people you support ({total})</span>
          {open ? <ChevronUp size={14} aria-hidden="true" /> : <ChevronDown size={14} aria-hidden="true" />}
        </button>

        {open && (
          <div className="mt-2 space-y-2 pb-1">
            {many && (
              <div className="space-y-1.5">
                <input value={find} onChange={e => setFind(e.target.value)} placeholder="Find a person" aria-label="Find a person"
                  className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-teal focus:outline-none focus:ring-2 focus:ring-teal/30 sm:w-64" />
                <div className="flex flex-wrap gap-1.5" role="group" aria-label="Choose a person">
                  {residents
                    .filter(r => !find.trim() || `${r.preferred_name ?? ''} ${r.first_name} ${r.display_name}`.toLowerCase().includes(find.trim().toLowerCase()))
                    .slice(0, 12)
                    .map(r => (
                      <button key={r.id} type="button" aria-pressed={r.id === current?.id} onClick={() => setWho(r.id)}
                        className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium ${r.id === current?.id ? 'border-teal bg-teal/10 text-teal' : 'border-gray-200 text-neutral-mid hover:border-teal/40'}`}>
                        {r.preferred_name || r.first_name} {r.photos.length > 0 ? `(${r.photos.length})` : ''}
                      </button>
                    ))}
                </div>
                {!current && <p className="text-xs text-neutral-mid">Choose a person to see their photos, or ask about them by name and they will appear here.</p>}
              </div>
            )}
            {current && <ul className="flex gap-3 overflow-x-auto pb-1" aria-label={`Photos of ${name}`}>
              {current.photos.map(p => (
                <li key={p.id} className="w-32 shrink-0">
                  <button type="button" onClick={() => setBig({ photo: p, name })} className="block w-full overflow-hidden rounded-lg border border-gray-200 hover:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40"
                    aria-label={`Enlarge photo${p.caption ? `: ${p.caption}` : ` of ${name}`}`}>
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={photoSrc(p.url)} alt={p.caption || `Photo of ${name}`} loading="lazy" className="aspect-square w-full object-cover" />
                  </button>
                  {p.caption && <p className="mt-1 line-clamp-2 text-xs text-neutral-mid">{p.caption}</p>}
                </li>
              ))}
            </ul>}
          </div>
        )}
      </div>

      {big && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setBig(null) }}>
          <div role="dialog" aria-modal="true" aria-label={`Photo of ${big.name}`} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-2 flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-neutral-dark">{big.name}</p>
              <button type="button" onClick={() => setBig(null)} aria-label="Close photo" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc(big.photo.url)} alt={big.photo.caption || `Photo of ${big.name}`} className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg object-contain" />
            {big.photo.caption && <p className="mt-3 text-base text-neutral-dark">{big.photo.caption}</p>}
            {big.photo.people_note && <p className="mt-1 text-sm text-neutral-mid">In the photo: {big.photo.people_note}</p>}
          </div>
        </div>
      )}
    </div>
  )
}

// Photos shown under a chat answer. Tap one to enlarge. The links last about five minutes, so a reopened chat does not keep them.
export function ChatPhotoRow({ photos }: { photos: Array<{ id: string; caption: string | null; people_note: string | null; url: string }> }) {
  const [big, setBig] = useState<(typeof photos)[number] | null>(null)
  return (
    <div className="mt-2 pl-10">
      <ul className="flex gap-3 overflow-x-auto pb-1" aria-label="Photos">
        {photos.map(p => (
          <li key={p.id} className="w-32 shrink-0">
            <button type="button" onClick={() => setBig(p)} aria-label={`Enlarge photo${p.caption ? `: ${p.caption}` : ''}`}
              className="block w-full overflow-hidden rounded-lg border border-gray-200 hover:border-teal focus:outline-none focus:ring-2 focus:ring-teal/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={photoSrc(p.url)} alt={p.caption || 'Photo'} loading="lazy" className="aspect-square w-full object-cover" />
            </button>
            {p.caption && <p className="mt-1 line-clamp-2 text-xs text-neutral-mid">{p.caption}</p>}
          </li>
        ))}
      </ul>
      {big && (
        <div className="fixed inset-0 z-[80] flex items-center justify-center bg-black/50 p-4" onMouseDown={e => { if (e.target === e.currentTarget) setBig(null) }}>
          <div role="dialog" aria-modal="true" aria-label="Photo" className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white p-4 shadow-xl">
            <div className="mb-2 flex justify-end">
              <button type="button" onClick={() => setBig(null)} aria-label="Close photo" className="rounded p-1 text-neutral-mid hover:bg-neutral-light"><X size={18} /></button>
            </div>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={photoSrc(big.url)} alt={big.caption || 'Photo'} className="mx-auto max-h-[65vh] w-auto max-w-full rounded-lg object-contain" />
            {big.caption && <p className="mt-3 text-base text-neutral-dark">{big.caption}</p>}
            {big.people_note && <p className="mt-1 text-sm text-neutral-mid">In the photo: {big.people_note}</p>}
          </div>
        </div>
      )}
    </div>
  )
}
