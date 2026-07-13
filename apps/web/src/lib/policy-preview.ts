// Shared policy-preview highlighting primitives, so the Regulation-coverage drill-in and the
// Out-of-date-content (lint) drill-in highlight and search the policy IDENTICALLY. Pure DOM
// helpers — no React — operating on a rendered policy preview root.

// Distinct highlight colours, one per matched passage (kept as full class strings so Tailwind
// includes them; teal is reserved for the search box).
export const QUOTE_PALETTE = ['bg-yellow-200', 'bg-sky-200', 'bg-green-200', 'bg-purple-200', 'bg-pink-200', 'bg-orange-200', 'bg-lime-200', 'bg-fuchsia-200']
export const quoteColour = (i: number) => QUOTE_PALETTE[i % QUOTE_PALETTE.length]

export const normText = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()

// Tolerant normalisation for anchor matching: unify curly quotes and dashes, then collapse space.
export const normMatch = (s: string) => (s || '')
  .toLowerCase()
  .replace(/[‘’‚‛′`]/g, "'")
  .replace(/[“”„″]/g, '"')
  .replace(/[‐-―−]/g, '-')
  .replace(/\s+/g, ' ')
  .trim()

// The distinctive words (>= 4 chars) of a string, for overlap scoring.
export const sigWords = (s: string): string[] =>
  [...new Set(normMatch(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4))]

// A small superscript pill badge (solid background + padding + right margin) so several
// badges on one block read as distinct chips rather than mashing together.
export function makeBadge(text: string, colour: string): HTMLElement {
  const badge = document.createElement('sup')
  badge.textContent = text
  badge.className = `mr-1 inline-block rounded px-1 text-[10px] font-bold leading-none ${colour}`
  return badge
}

// The smallest block (paragraph/bullet/cell) whose text contains the anchor, tolerant of
// quote/dash differences; falls back to the block sharing the most distinctive words (>= 0.6).
export function findBlock(root: HTMLElement, anchor: string): HTMLElement | null {
  const needle = normMatch(anchor)
  if (needle.length < 3) return null
  const blocks = Array.from(root.querySelectorAll('p,li,td,blockquote')) as HTMLElement[]
  let target: HTMLElement | null = null
  for (const b of blocks) {
    if (normMatch(b.textContent || '').includes(needle)) {
      if (!target || (b.textContent?.length ?? 0) < (target.textContent?.length ?? 0)) target = b
    }
  }
  if (target) return target

  const aw = sigWords(anchor)
  if (aw.length < 3) return null
  let best: HTMLElement | null = null; let bestScore = 0
  for (const b of blocks) {
    const bw = new Set(sigWords(b.textContent || ''))
    if (!bw.size) continue
    let hits = 0
    for (const w of aw) if (bw.has(w)) hits++
    const score = hits / aw.length
    if (score > bestScore) { bestScore = score; best = b }
  }
  return bestScore >= 0.6 ? best : null
}

// Highlight every occurrence of a plain search term in the rendered policy (text nodes only).
// Returns the match count. Used by the "search this policy" box.
export function highlightSearch(root: HTMLElement, term: string): number {
  const t = term.trim()
  if (t.length < 2) return 0
  const re = new RegExp(t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi')
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  let count = 0
  for (const node of nodes) {
    const raw = node.nodeValue ?? ''
    re.lastIndex = 0
    if (!re.test(raw)) continue
    re.lastIndex = 0
    const frag = document.createDocumentFragment()
    let last = 0, m: RegExpExecArray | null
    while ((m = re.exec(raw))) {
      if (m.index > last) frag.appendChild(document.createTextNode(raw.slice(last, m.index)))
      const mark = document.createElement('mark')
      mark.className = 'bg-teal-200 rounded px-0.5'
      mark.textContent = m[0]
      frag.appendChild(mark)
      last = m.index + m[0].length
      count++
      if (m.index === re.lastIndex) re.lastIndex++
    }
    if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)))
    node.parentNode?.replaceChild(frag, node)
  }
  return count
}

// Highlight ONLY the stale words (not the whole paragraph), with a numbered badge just before
// them, so it's obvious exactly what changes. Wraps the first occurrence of the verbatim phrase
// (case-sensitive; falls back to case-insensitive). Returns whether it was placed.
export function markStalePhrase(root: HTMLElement, phrase: string, i: number): boolean {
  const needle = (phrase || '').trim()
  if (needle.length < 2) return false
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let n: Node | null
  while ((n = walker.nextNode())) nodes.push(n as Text)
  for (const node of nodes) {
    const raw = node.nodeValue ?? ''
    let idx = raw.indexOf(needle)
    let matched = needle
    if (idx < 0) {   // fallback: case-insensitive, in case the rendered casing differs
      const m = new RegExp(needle.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i').exec(raw)
      if (m) { idx = m.index; matched = m[0] }
    }
    if (idx < 0) continue
    const frag = document.createDocumentFragment()
    if (idx > 0) frag.appendChild(document.createTextNode(raw.slice(0, idx)))
    frag.appendChild(makeBadge(String(i + 1), 'bg-neutral-900 text-white'))
    const mark = document.createElement('mark')
    mark.className = `${quoteColour(i)} rounded px-0.5`
    mark.textContent = matched
    frag.appendChild(mark)
    const after = idx + matched.length
    if (after < raw.length) frag.appendChild(document.createTextNode(raw.slice(after)))
    node.parentNode?.replaceChild(frag, node)
    return true
  }
  return false
}
