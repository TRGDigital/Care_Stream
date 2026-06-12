'use client'

/* eslint-disable @next/next/no-img-element */
import { useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const LEGAL = [
  { path: '/privacy', label: 'Privacy' },
  { path: '/terms', label: 'Terms & conditions' },
  { path: '/cookies', label: 'Cookie policy' },
] as const

type Legal = (typeof LEGAL)[number]

export function LpFooter() {
  const year = 2026
  const [active, setActive] = useState<Legal | null>(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!active) return
    let cancelled = false
    setLoading(true); setHtml('')
    fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(active.path)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(b => { if (!cancelled) setHtml(b?.data?.page?.content || '<p>This policy is being updated. Please check back soon.</p>') })
      .catch(() => { if (!cancelled) setHtml('<p>Unable to load this policy right now.</p>') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [active])

  useEffect(() => {
    if (!active) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setActive(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [active])

  return (
    <footer className="bg-neutral-dark py-12 text-cream">
      <div className="mx-auto flex max-w-content flex-col gap-8 px-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <img src="/logo-white.png" alt="CareStreamAI" className="h-9 w-auto" />
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-cream/60">Suite Ra01, 195-197 Wood Street, London, E17 3NU</p>
          <p className="mt-3 text-xs text-cream/40">© {year} CareStreamAI Limited. Registered with the ICO.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/70">
          {LEGAL.map(l => (
            <button key={l.path} type="button" onClick={() => setActive(l)} className="hover:text-cream">{l.label}</button>
          ))}
        </nav>
      </div>

      {active && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={active.label}
          className="fixed inset-0 z-[100] flex items-start justify-center overflow-y-auto bg-neutral-dark/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setActive(null)}
        >
          <div className="relative my-8 w-full max-w-2xl rounded-lg bg-white shadow-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-cream-line px-6 py-4">
              <h2 className="font-display text-xl font-medium text-neutral-dark">{active.label}</h2>
              <button type="button" aria-label="Close" onClick={() => setActive(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-mid hover:bg-cream-warm hover:text-neutral-dark">
                <X size={18} />
              </button>
            </div>
            <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
              {loading ? (
                <div className="flex items-center gap-2 text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading…</div>
              ) : (
                <div className="prose prose-neutral max-w-none prose-headings:text-neutral-dark prose-a:text-teal" dangerouslySetInnerHTML={{ __html: html }} />
              )}
            </div>
          </div>
        </div>
      )}
    </footer>
  )
}
