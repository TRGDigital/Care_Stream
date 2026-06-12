'use client'

/* eslint-disable @next/next/no-img-element */
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { X, Loader2 } from 'lucide-react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TITLES: Record<string, string> = {
  '/privacy': 'Privacy policy',
  '/terms': 'Terms & conditions',
  '/cookies': 'Cookie policy',
}

const Ctx = createContext<{ openLegal: (path: string) => void } | null>(null)

export function useLpLegal() {
  return useContext(Ctx) ?? { openLegal: () => {} }
}

// Shared legal-overlay provider. Any descendant (footer links, the form consent
// line, …) can call openLegal(path) to show the policy as an on-page overlay,
// pulling the real content from /public/site-pages.
export function LpLegalProvider({ children }: { children: React.ReactNode }) {
  const [path, setPath] = useState<string | null>(null)
  const [html, setHtml] = useState('')
  const [loading, setLoading] = useState(false)
  const openLegal = useCallback((p: string) => setPath(p), [])

  useEffect(() => {
    if (!path) return
    let cancelled = false
    setLoading(true); setHtml('')
    fetch(`${API_URL}/public/site-pages?path=${encodeURIComponent(path)}`)
      .then(r => (r.ok ? r.json() : null))
      .then(b => { if (!cancelled) setHtml(b?.data?.page?.content || '<p>This policy is being updated. Please check back soon.</p>') })
      .catch(() => { if (!cancelled) setHtml('<p>Unable to load this policy right now. Please email hello@carestreamai.com.</p>') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [path])

  useEffect(() => {
    if (!path) return
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setPath(null) }
    document.addEventListener('keydown', onKey)
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    return () => { document.removeEventListener('keydown', onKey); document.body.style.overflow = prev }
  }, [path])

  return (
    <Ctx.Provider value={{ openLegal }}>
      {children}
      {path && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={TITLES[path] ?? 'Policy'}
          className="fixed inset-0 z-[110] flex items-start justify-center overflow-y-auto bg-neutral-dark/60 p-4 backdrop-blur-sm sm:items-center"
          onClick={() => setPath(null)}
        >
          <div className="relative my-8 w-full max-w-2xl rounded-lg bg-white shadow-card" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b border-cream-line px-6 py-4">
              <h2 className="font-display text-xl font-medium text-neutral-dark">{TITLES[path] ?? 'Policy'}</h2>
              <button type="button" aria-label="Close" onClick={() => setPath(null)} className="flex h-9 w-9 items-center justify-center rounded-full text-neutral-mid hover:bg-cream-warm hover:text-neutral-dark">
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
    </Ctx.Provider>
  )
}

export function LpFooter() {
  const { openLegal } = useLpLegal()
  const year = 2026
  const links: [string, string][] = [
    ['/privacy', 'Privacy'],
    ['/terms', 'Terms & conditions'],
    ['/cookies', 'Cookie policy'],
  ]
  return (
    <footer className="bg-neutral-dark py-12 text-cream">
      <div className="mx-auto flex max-w-content flex-col gap-8 px-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <img src="/logo-white.png" alt="CareStreamAI" className="h-9 w-auto" />
          <p className="mt-4 max-w-xs text-xs leading-relaxed text-cream/60">Suite Ra01, 195-197 Wood Street, London, E17 3NU</p>
          <p className="mt-3 text-xs text-cream/40">© {year} CareStreamAI Limited. Registered with the ICO.</p>
        </div>
        <nav className="flex flex-wrap gap-x-6 gap-y-2 text-sm text-cream/70">
          {links.map(([path, label]) => (
            <button key={path} type="button" onClick={() => openLegal(path)} className="hover:text-cream">{label}</button>
          ))}
        </nav>
      </div>
    </footer>
  )
}
