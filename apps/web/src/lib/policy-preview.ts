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

// Unify curly quotes/apostrophes and dash variants so a term matches regardless of typography.
const unifyChars = (s: string) => s
  .replace(/[‘’‚‛′`]/g, "'")
  .replace(/[“”„″]/g, '"')
  .replace(/[‐‑‒–—―−]/g, '-')

// A tolerant normalised phrase: unified typography, lower-cased, whitespace collapsed, trimmed.
const normPhrase = (t: string) => unifyChars(t).toLowerCase().replace(/\s+/g, ' ').trim()

// Build a normalised copy of a text-node string (unified, lower-cased, whitespace-collapsed) with
// a map from each normalised-char index back to its ORIGINAL index — so a tolerant match can be
// mapped back to the real span to highlight. Handles casing, extra/odd whitespace and typography.
function buildNorm(raw: string): { norm: string; map: number[] } {
  let norm = ''
  const map: number[] = []
  let inSpace = false
  const unified = unifyChars(raw)
  for (let i = 0; i < unified.length; i++) {
    const c = unified[i]
    if (/\s/.test(c)) {
      if (inSpace) continue          // collapse a whitespace run to one space
      norm += ' '; map.push(i); inSpace = true
    } else {
      norm += c.toLowerCase(); map.push(i); inSpace = false
    }
  }
  return { norm, map }
}

// Highlight EVERY occurrence of EVERY stale term (phrase + acronyms), numbered in DOCUMENT
// order so the badges read 1, 2, 3… down the page. Highlights only the words themselves (not the
// paragraph), so it's obvious exactly what changes. `termsPerFinding[k]` is finding k's distinct
// matched strings. Returns, per finding, its display number (document order), or -1 if it isn't
// found in the rendered policy — so the caller can number and order the left-hand list to match.
export function highlightStaleTerms(root: HTMLElement, termsPerFinding: string[][]): number[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let nd: Node | null
  while ((nd = walker.nextNode())) nodes.push(nd as Text)

  // Multi-word phrases are matched TOLERANTLY (casing, extra/odd whitespace incl. line breaks,
  // and curly quotes/dashes are all ignored) and mapped back to the real span; single
  // tokens/acronyms stay case-SENSITIVE so "PCT" never matches the word "pct". Non-overlapping
  // matches within one text node, resolving overlaps (e.g. "PCTs" over "PCT") by longest-first.
  const matchesIn = (raw: string): Array<{ fi: number; idx: number; len: number }> => {
    const { norm, map } = buildNorm(raw)
    const all: Array<{ fi: number; idx: number; len: number }> = []
    termsPerFinding.forEach((terms, fi) => {
      for (const t of terms) {
        if (!t || t.length < 2) continue
        if (/\s/.test(t)) {                          // phrase → tolerant, mapped back to original
          const nn = normPhrase(t)
          if (nn.length < 2) continue
          let from = 0, idx: number
          while ((idx = norm.indexOf(nn, from)) >= 0) {
            const oStart = map[idx], oEnd = map[idx + nn.length - 1] + 1
            all.push({ fi, idx: oStart, len: oEnd - oStart })
            from = idx + nn.length
          }
        } else {                                     // token/acronym → exact, case-sensitive
          let from = 0, idx: number
          while ((idx = raw.indexOf(t, from)) >= 0) { all.push({ fi, idx, len: t.length }); from = idx + t.length }
        }
      }
    })
    all.sort((a, b) => a.idx - b.idx || b.len - a.len)
    const kept: typeof all = []
    let lastEnd = -1
    for (const m of all) if (m.idx >= lastEnd) { kept.push(m); lastEnd = m.idx + m.len }
    return kept
  }

  // Pass 1: work out each finding's display number from the order it first appears.
  const displayNum = new Array(termsPerFinding.length).fill(-1)
  let next = 0
  for (const node of nodes) {
    for (const m of matchesIn(node.nodeValue ?? '')) {
      if (displayNum[m.fi] < 0) displayNum[m.fi] = next++
    }
  }

  // Pass 2: wrap every occurrence, coloured + badged by its finding's display number.
  for (const node of nodes) {
    const raw = node.nodeValue ?? ''
    const matches = matchesIn(raw)
    if (!matches.length) continue
    const frag = document.createDocumentFragment()
    let last = 0
    for (const m of matches) {
      const num = displayNum[m.fi]
      if (num < 0) continue
      if (m.idx > last) frag.appendChild(document.createTextNode(raw.slice(last, m.idx)))
      frag.appendChild(makeBadge(String(num + 1), 'bg-neutral-900 text-white'))
      const mark = document.createElement('mark')
      mark.className = `${quoteColour(num)} rounded px-0.5`
      mark.textContent = raw.slice(m.idx, m.idx + m.len)
      frag.appendChild(mark)
      last = m.idx + m.len
    }
    if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)))
    node.parentNode?.replaceChild(frag, node)
  }

  return displayNum
}
