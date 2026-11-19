// Pure search: no React, no network. Score a query against feature entries and guide text.
// Order of value: exact title, title words, the words people type, the one line description, then guide text.
import type { FeatureEntry } from './features'
import { variants } from './query'

export type GuideEntry = { id: string; title: string; summary: string; text: string; blocks: Array<{ title: string; text: string }> }
export type Hit =
  | { kind: 'feature'; score: number; entry: FeatureEntry }
  | { kind: 'guide'; score: number; guide: GuideEntry; block?: string; snippet: string }

const STOP = new Set(['the', 'a', 'an', 'to', 'of', 'for', 'and', 'or', 'in', 'on', 'my', 'i', 'how', 'do', 'can', 'where', 'is', 'it', 'we', 'our', 'what', 'with', 'into', 'at', 'be'])
export const norm = (s: string) => s.toLowerCase().replace(/[’']/g, '').replace(/[^a-z0-9]+/g, ' ').trim()
// Light stemming so "invites", "inviting", "invited" meet "invite".
const stem = (w: string) => w.length > 4 ? w.replace(/(ing|ed|es|s)$/, '') : w.replace(/s$/, '')
export const tokens = (s: string) => norm(s).split(' ').filter(w => w && !STOP.has(w)).map(stem)

// One typo is forgiven in a word of 4 or more letters, two in a word of 9 or more ("incentivs", "supervison").
function near(a: string, b: string): boolean {
  const max = a.length >= 9 ? 2 : a.length >= 4 ? 1 : 0
  if (!max || Math.abs(a.length - b.length) > max || a[0] !== b[0]) return false   // same first letter: people rarely get that wrong
  const prev = Array.from({ length: b.length + 1 }, (_, j) => j)
  for (let i = 1; i <= a.length; i++) {
    let diag = prev[0]; prev[0] = i; let best = prev[0]
    for (let j = 1; j <= b.length; j++) {
      const tmp = prev[j]
      prev[j] = Math.min(prev[j] + 1, prev[j - 1] + 1, diag + (a[i - 1] === b[j - 1] ? 0 : 1))
      diag = tmp; if (prev[j] < best) best = prev[j]
    }
    if (best > max) return false
  }
  return prev[b.length] <= max
}

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
    else if (w.length >= 3 && [...h.t].some(x => x.startsWith(w) || (x.length >= 6 && w.startsWith(x)))) hits += wt * 0.6
    else if (w.length >= 4 && [...h.t].some(x => near(w, x))) hits += wt * 0.5
  }
  if (hits === 0) return 0
  const cover = hits / total
  if (qt.length > 1 && cover < 0.5) return 0
  let s = cover * weight
  if (h.n === q) s += weight
  else if (h.n.includes(q)) s += weight * 0.5
  return s
}

// The same search for each spelling of the query (abbreviations swapped for what they stand for), best score wins.
export function searchFeatures(query: string, features: FeatureEntry[]): Array<{ entry: FeatureEntry; score: number }> {
  if (IDF.size === 0) setIdf(features)
  const best = new Map<string, { entry: FeatureEntry; score: number }>()
  variants(query).forEach((v, i) => {
    for (const r of searchFeaturesOne(v, features)) {
      const s = i === 0 ? r.score : r.score * 0.92
      const cur = best.get(r.entry.id)
      if (!cur || s > cur.score) best.set(r.entry.id, { entry: r.entry, score: s })
    }
  })
  return [...best.values()].sort((a, b) => b.score - a.score)
}

function searchFeaturesOne(query: string, features: FeatureEntry[]): Array<{ entry: FeatureEntry; score: number }> {
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
  const best = new Map<string, Extract<Hit, { kind: 'guide' }>>()
  variants(query).forEach((v, i) => {
    for (const r of searchGuidesOne(v, guides)) {
      const s = i === 0 ? r.score : r.score * 0.92
      const key = r.guide.id + (r.block ?? '')
      const cur = best.get(key)
      if (!cur || s > cur.score) best.set(key, { ...r, score: s })
    }
  })
  return [...best.values()].sort((a, b) => b.score - a.score)
}

function searchGuidesOne(query: string, guides: GuideEntry[]): Array<Extract<Hit, { kind: 'guide' }>> {
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
