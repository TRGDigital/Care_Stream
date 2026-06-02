'use client'

import { useEffect, useState } from 'react'
import { Loader2, Check } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

interface ImageAlt { id: string; src: string; alt: string }

export function AltTagsPanel({ token }: { token: string }) {
  const [images, setImages]       = useState<ImageAlt[]>([])
  const [drafts, setDrafts]       = useState<Record<string, string>>({})
  const [loading, setLoading]     = useState(true)
  const [savingSrc, setSavingSrc] = useState<string | null>(null)
  const [savedSrc, setSavedSrc]   = useState<string | null>(null)

  useEffect(() => {
    if (!token) return
    ;(async () => {
      try {
        const res  = await fetch(`${API_URL}/admin/image-alts`, { headers: { Authorization: `Bearer ${token}` } })
        const body = await res.json()
        const imgs: ImageAlt[] = body?.data?.images ?? []
        setImages(imgs)
        setDrafts(Object.fromEntries(imgs.map(i => [i.src, i.alt])))
      } finally {
        setLoading(false)
      }
    })()
  }, [token])

  async function save(src: string) {
    setSavingSrc(src); setSavedSrc(null)
    try {
      await fetch(`${API_URL}/admin/image-alts`, {
        method:  'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body:    JSON.stringify({ src, alt: drafts[src] ?? '' }),
      })
      setImages(imgs => imgs.map(i => i.src === src ? { ...i, alt: drafts[src] ?? '' } : i))
      setSavedSrc(src)
      setTimeout(() => setSavedSrc(s => s === src ? null : s), 2000)
    } finally {
      setSavingSrc(null)
    }
  }

  if (loading) {
    return <div className="py-12 text-center text-sm text-neutral-mid"><Loader2 className="mr-1 inline animate-spin" size={16} /> Loading images…</div>
  }

  return (
    <div className="space-y-3">
      <p className="text-sm text-neutral-mid">
        Alt text for every static image on the site. Good alt text describes the image for screen
        readers and search engines (SEO). Saved changes appear on the live site within a minute.
      </p>
      <div className="divide-y divide-gray-100 overflow-hidden rounded-xl border border-gray-200 bg-white">
        {images.map(img => {
          const dirty = (drafts[img.src] ?? '') !== img.alt
          return (
            <div key={img.src} className="flex items-center gap-4 p-4">
              {/\.(jpe?g|png|webp|gif|svg)$/i.test(img.src) ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={img.src} alt={drafts[img.src] ?? ''} className="h-14 w-20 shrink-0 rounded border bg-neutral-light object-cover" />
              ) : (
                <div className="flex h-14 w-20 shrink-0 items-center justify-center rounded border bg-neutral-light text-[10px] font-semibold uppercase tracking-wide text-neutral-mid">Mock-up</div>
              )}
              <div className="min-w-0 flex-1">
                <p className="mb-1 truncate font-mono text-xs text-neutral-mid">{img.src}</p>
                <div className="flex gap-2">
                  <input
                    value={drafts[img.src] ?? ''}
                    onChange={e => setDrafts(d => ({ ...d, [img.src]: e.target.value }))}
                    placeholder="Describe this image…"
                    className="w-full rounded-md border border-gray-200 px-3 py-2 text-sm focus:border-teal focus:outline-none focus:ring-1 focus:ring-teal"
                  />
                  <button
                    type="button"
                    onClick={() => save(img.src)}
                    disabled={savingSrc === img.src || !dirty}
                    className="flex shrink-0 items-center gap-1.5 rounded-md bg-teal px-4 py-2 text-sm font-medium text-white hover:bg-teal-dark disabled:opacity-50"
                  >
                    {savingSrc === img.src ? <Loader2 size={14} className="animate-spin" /> : savedSrc === img.src ? <Check size={14} /> : null}
                    {savedSrc === img.src ? 'Saved' : 'Save'}
                  </button>
                </div>
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
