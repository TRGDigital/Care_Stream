// Pure search: no React, no network. Score a query against feature entries and guide text.
// Order of value: exact title, title words, the words people type, the one line description, then guide text.
import type { FeatureEntry } from './features'

export type GuideEntry = { id: string; title: string; summary: string; text: string; blocks: Array<{ title: string; text: string }> }
export type Hit =
  | { kind: 'feature'; score: number; entry: FeatureEntry }
  | { kind: 'guide'; score: number; guide: GuideEntry; block?: string; snippet: string }

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'my', 'i', 'how', 'do', 'can', 'where', 'is', 'it', 'we', 'our', 'what', 'with', 'into', 'at', 'be'])
export const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
// Light stemming so "invites", "inviting", "invited" meet "invite".
const stem = (w: string) => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/s$/, '')
export const tokens = (s: string) => norm(s).split(' ').filter(w => w && !STOP.has(w)).map(stem)

function hay(s: string) { return { n: norm(s), t: new Set(tokens(s)) } }

// Rare words count for more: "dbs" should beat "check", which half the entries contain.
let IDF = new Map<string, number>()
export function setIdf(features: FeatureEntry[]) {
  const df = new Map<string, number>()
  for (const e of features) for (const w of new Set(tokens([e.title, e.about, ...e.words].join(' ')))) df.set(w, (df.get(w) ?? 0) + 1)
  IDF = new Map([...df].map(([w, n]) => [w, Math.log(1 + features.length / n)]))
}
const weightOf = (w: string) => IDF.get(w) ?? Math.log(1 + 60)

function scoreText(q: string, qt: string[], h: { n: string; t: Set<string> }, weight: number): number {
  if (!qt.length) return 0
  let hits = 0, total = 0
  for (const w of qt) {
    const wt = weightOf(w); total += wt
    if (h.t.has(w)) hits += wt
    else if (w.length >= 3 && [...h.t].some(x => x.startsWith(w) || (x.length >= 4 && w.startsWith(x)))) hits += wt * 0.6
  }
  if (hits === 0) return 0
  const cover = hits / total
  if (qt.length > 1 && cover < 0.5) return 0
  let s = cover * weight
  if (h.n === q) s += weight
  else if (h.n.includes(q)) s += weight * 0.5
  return s
}

export function searchFeatures(query: string, features: FeatureEntry[]): Array<{ entry: FeatureEntry; score: number }> {
  if (IDF.size === 0) setIdf(features)
  const q = norm(query), qt = tokens(query)
  if (!q) return []
  const out: Array<{ entry: FeatureEntry; score: number }> = []
  for (const e of features) {
    let s = scoreText(q, qt, hay(e.title), 10)
    for (const w of e.words) s = Math.max(s, scoreText(q, qt, hay(w), 8))
    s = Math.max(s, scoreText(q, qt, hay(e.about), 4))
    s = Math.max(s, scoreText(q, qt, hay(e.group), 1.5))
    if (s > 0) out.push({ entry: e, score: s })
  }
  return out.sort((a, b) => b.score - a.score)
}

export function snippetOf(text: string, qt: string[], len = 140): string {
  const low = text.toLowerCase()
  let at = -1
  for (const w of qt) { const i = low.indexOf(w.slice(0, Math.max(3, w.length - 1))); if (i >= 0 && (at < 0 || i < at)) at = i }
  if (at < 0) return text.slice(0, len).trim() + (text.length > len ? '…' : '')
  const from = Math.max(0, at - 40)
  return (from > 0 ? '…' : '') + text.slice(from, from + len).trim() + (from + len < text.length ? '…' : '')
}

export function searchGuides(query: string, guides: GuideEntry[]): Array<Extract<Hit, { kind: 'guide' }>> {
  const q = norm(query), qt = tokens(query)
  if (!q) return []
  const out: Array<Extract<Hit, { kind: 'guide' }>> = []
  for (const g of guides) {
    let best = scoreText(q, qt, hay(g.title), 6) + scoreText(q, qt, hay(g.summary), 3)
    let bestBlock: string | undefined
    let snippet = g.summary
    for (const b of g.blocks) {
      const s = scoreText(q, qt, hay(b.title), 5) + scoreText(q, qt, hay(b.text), 1.5)
      if (s > best) { best = s; bestBlock = b.title; snippet = snippetOf(b.text || g.summary, qt) }
    }
    if (best === 0) { const s = scoreText(q, qt, hay(g.text), 1); if (s > 0) { best = s; snippet = snippetOf(g.text, qt) } }
    if (best > 0) out.push({ kind: 'guide', score: best, guide: g, block: bestBlock, snippet })
  }
  return out.sort((a, b) => b.score - a.score)
}
