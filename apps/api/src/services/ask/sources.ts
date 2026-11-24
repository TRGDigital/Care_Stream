// Sources for answers: every figure the agents quote says where it is from and how fresh it is. External figures come from the Data sources register
// (lib/data-sources.ts); a figure that is stale gets a warning, and one that failed its last check or needs review is NOT usable and is never quoted as fact.
import { SOURCES, toFigure, ymd, asOfText, type Figure } from '../../lib/data-sources'
import { dataSourcesDb } from '../../lib/data-sources-db'

export interface AskSource { label: string; as_of: string | null; warning?: string | null; url?: string | null }

export const ownSource = (label: string, asOf: string): AskSource => ({ label, as_of: asOf })

export function sourceFromFigure(f: Figure): AskSource {
  return { label: `${f.name} (${f.publisher})`, as_of: f.effective_from ?? (f.fetched_at ? f.fetched_at.slice(0, 10) : null), warning: f.warning, url: f.source_url }
}

/** Figures from the register, in the shape a tool returns. An unusable figure comes back with value null and a plain reason. */
export async function figuresFor(keys: string[], today = ymd(new Date())): Promise<{ figures: Array<{ key: string; name: string; value: any; as_of: string | null; stale: boolean; usable: boolean; note: string; warning: string | null }>; sources: AskSource[] }> {
  const rows = new Map((await dataSourcesDb.all()).map(r => [r.key, r]))
  const figures: any[] = [], sources: AskSource[] = []
  for (const key of keys) {
    const def = SOURCES.find(s => s.key === key)
    if (!def) continue
    const f = toFigure(def, rows.get(key) ?? null, today)
    figures.push({ key: f.key, name: f.name, value: f.usable ? f.value : null, as_of: f.effective_from, stale: f.stale, usable: f.usable, note: asOfText(f), warning: f.warning })
    sources.push(sourceFromFigure(f))
  }
  return { figures, sources }
}

export function formatSources(sources: AskSource[]): string[] {
  return sources.map(s => `${s.label}${s.as_of ? `, as of ${s.as_of}` : ''}${s.warning ? ` (warning: ${s.warning})` : ''}`)
}
export function dedupeSources(list: AskSource[]): AskSource[] {
  const seen = new Set<string>()
  return list.filter(s => { const k = `${s.label}|${s.as_of}`; if (seen.has(k)) return false; seen.add(k); return true })
}
