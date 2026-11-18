// UK monthly search volumes (Google Keyword Planner) for the keywords on blog posts and collections.
//
// The nightly routines cannot reach Keyword Planner, so the research is done first and lands in the topic backlogs, where every
// primary and secondary keyword carries its volume. Those backlogs ship inside the content engine bundle, so any keyword a
// routine was given as a brief is resolved here with no manual step. data/keyword-volumes.json holds the older hand-pulled
// figures. A phrase missing from both has no Keyword Planner data (under 10 a month).
import fixed from '../data/keyword-volumes.json'
import bundle from '../data/content-engine/bundle.json'

let cache: Record<string, number> | null = null

const put = (m: Record<string, number>, k: unknown, v: unknown) => {
  if (typeof k === 'string' && typeof v === 'number' && v > 0) m[k.toLowerCase().trim()] = v
}

export function keywordVolumes(): Record<string, number> {
  if (cache) return cache
  const m: Record<string, number> = {}
  const files = ((bundle as any)?.files ?? {}) as Record<string, string>
  for (const [name, text] of Object.entries(files)) {
    if (!/^ledger\/topic-backlog.*\.json$/.test(name) && name !== 'ledger/collection-queue.json') continue
    try {
      const data = JSON.parse(text)
      const rows: any[] = Array.isArray(data) ? data : (data.queue ?? [])
      for (const r of rows) {
        put(m, r.primary_keyword, r.primary_volume ?? r.volume)
        for (const s of r.secondary_keywords ?? []) if (s && typeof s === 'object') put(m, s.keyword, s.volume)
      }
    } catch { /* a malformed ledger file must never break the admin screen */ }
  }
  for (const [k, v] of Object.entries((fixed as any).volumes ?? {})) put(m, k, v) // the pulled figures win
  cache = m
  return m
}
