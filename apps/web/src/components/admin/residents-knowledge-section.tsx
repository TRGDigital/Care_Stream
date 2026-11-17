'use client'

import { useEffect, useMemo } from 'react'
import { ChevronRight, Heart } from 'lucide-react'
import { createResidentsClient } from '@/lib/residents-api'
import { useCachedQuery } from '@/lib/use-cached-query'
import { persistentCache } from '@/lib/page-cache'

// The "Residents (N)" group on the Knowledge page, in the same place as Manual entries and From uploaded policies.
// Shows each current resident by name; clicking one opens the Residents overlay on that person. Hidden on plans without the feature
// and when there are no residents yet. Shares its cache keys with the overlay, so opening it is instant.
export function ResidentsKnowledgeSection({ token, userId, onOpen }: { token: string; userId: string; onOpen: (id: string) => void }) {
  const client = useMemo(() => createResidentsClient(token), [token])
  const meta = useCachedQuery(`residents-meta-${userId}`, () => client.meta())
  const enabled = meta.data?.enabled === true
  const current = useCachedQuery(`residents-list-current-${userId}`, () => client.list('current'), { enabled })
  const residents = [...(current.data?.residents ?? [])].sort((a, b) =>
    `${a.preferred_name || a.first_name} ${a.last_name}`.localeCompare(`${b.preferred_name || b.first_name} ${b.last_name}`, 'en-GB'))
  const total = meta.data?.sections?.length ?? 11

  // Warm each resident's full profile in the background (same keys the overlay uses), so opening someone is instant even the first time.
  // The overlay still re-fetches when it opens, so what you see is fresh. A small cap keeps this cheap for big homes.
  useEffect(() => {
    if (!enabled || !current.data) return
    let cancelled = false
    ;(async () => {
      for (const r of current.data!.residents.slice(0, 25)) {
        if (cancelled) return
        const key = `resident-detail-${userId}-${r.id}`
        if (persistentCache.get(key) !== undefined) continue
        try { const d = await client.get(r.id); if (!cancelled) persistentCache.set(key, d) } catch { /* the overlay will load it when opened */ }
      }
    })()
    return () => { cancelled = true }
  }, [enabled, current.data, client, userId])

  if (!enabled || residents.length === 0) return null

  return (
    <section aria-label="Residents">
      <h2 className="mb-3 text-sm font-semibold uppercase tracking-wide text-teal">Residents ({residents.length})</h2>
      <ul className="space-y-2">
        {residents.map(r => (
          <li key={r.id}>
            <button type="button" onClick={() => onOpen(r.id)}
              className="flex w-full items-center gap-3 rounded-lg border border-teal/30 bg-teal/10 px-4 py-3 text-left transition-colors hover:border-teal/60 hover:bg-teal/15 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-teal text-white"><Heart size={16} aria-hidden /></span>
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-semibold text-neutral-dark">{r.preferred_name || r.first_name} {r.last_name}</span>
                <span className="block truncate text-xs text-neutral-dark/70">
                  {r.room ? `Room ${r.room} · ` : ''}{r.filled_count} of {total} sections filled
                </span>
              </span>
              {r.pending_count > 0 && (
                <span className="shrink-0 rounded-full bg-amber-100 px-2 py-0.5 text-[11px] font-semibold text-amber-800">{r.pending_count} waiting</span>
              )}
              <ChevronRight size={16} className="shrink-0 text-teal" aria-hidden />
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}
