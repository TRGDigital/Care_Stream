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

// Highlight EVERY occurrence of EVERY stale term (phrase + acronyms), numbered in DOCUMENT order
// so the badges read 1, 2, 3… down the page. Matches ACROSS text nodes — the clean HTML preview
// splits phrases over markup (e.g. National <strong>Minimum</strong> Standards is three text
// nodes) — by normalising the whole rendered text and mapping a match back to the DOM range it
// spans. Phrases are matched tolerantly (casing, whitespace incl. line breaks, curly quotes and
// dashes all ignored); single tokens/acronyms stay case-sensitive and word-bounded so "PCT" never
// matches the word "pct". `termsPerFinding[k]` is finding k's distinct matched strings. Returns,
// per finding, its document-order display number, or -1 if it isn't present in the clean preview.
export function highlightStaleTerms(root: HTMLElement, termsPerFinding: string[][]): number[] {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT)
  const nodes: Text[] = []
  let nd: Node | null
  while ((nd = walker.nextNode())) nodes.push(nd as Text)

  // One normalised string across ALL text nodes, with a map from each normalised-char index back
  // to its source (node index + offset within that node's ORIGINAL value). Case is PRESERVED here
  // (so acronyms can match case-sensitively); phrases lower-case the copy below. unifyChars is a
  // 1:1 char swap, so offsets still line up with each node's real nodeValue for slicing.
  let norm = ''
  const pos: Array<{ ni: number; off: number }> = []
  let inSpace = true   // treat the start as if preceded by whitespace (trims leading space)
  for (let ni = 0; ni < nodes.length; ni++) {
    const raw = unifyChars(nodes[ni].nodeValue ?? '')
    for (let k = 0; k < raw.length; k++) {
      const c = raw[k]
      if (/\s/.test(c)) { if (inSpace) continue; norm += ' '; pos.push({ ni, off: k }); inSpace = true }
      else { norm += c; pos.push({ ni, off: k }); inSpace = false }
    }
    if (!inSpace) { norm += ' '; pos.push({ ni, off: raw.length }); inSpace = true }   // node boundary = whitespace
  }
  const lower = norm.toLowerCase()
  const N = norm.length
  const isBoundary = (i: number) => i < 0 || i >= N || !/[A-Za-z0-9]/.test(norm[i])

  // All matches in the shared normalised coordinate space.
  const all: Array<{ fi: number; s: number; e: number }> = []
  termsPerFinding.forEach((terms, fi) => {
    for (const t of terms) {
      if (!t || t.length < 2) continue
      if (/\s/.test(t)) {                                    // phrase → tolerant, case-insensitive
        const nn = normPhrase(t)
        if (nn.length < 2) continue
        let from = 0, idx: number
        while ((idx = lower.indexOf(nn, from)) >= 0) { all.push({ fi, s: idx, e: idx + nn.length }); from = idx + nn.length }
      } else {                                               // token/acronym → exact, word-bounded
        const tt = unifyChars(t)
        let from = 0, idx: number
        while ((idx = norm.indexOf(tt, from)) >= 0) {
          const e = idx + tt.length
          if (isBoundary(idx - 1) && isBoundary(e)) all.push({ fi, s: idx, e })
          from = idx + tt.length
        }
      }
    }
  })

  // Resolve overlaps (e.g. "PCTs" over "PCT") by earliest-then-longest, and number findings by the
  // order their first kept match appears.
  all.sort((a, b) => a.s - b.s || (b.e - b.s) - (a.e - a.s))
  const kept: typeof all = []
  let lastEnd = -1
  for (const m of all) if (m.s >= lastEnd) { kept.push(m); lastEnd = m.e }
  const displayNum = new Array(termsPerFinding.length).fill(-1)
  let next = 0
  for (const m of kept) if (displayNum[m.fi] < 0) displayNum[m.fi] = next++

  // Split each kept match into per-node segments (a match may span several text nodes). The badge
  // goes on the node where the match starts.
  const segs = new Map<number, Array<{ a: number; b: number; num: number; badge: boolean }>>()
  for (const m of kept) {
    const num = displayNum[m.fi]
    const start = pos[m.s], end = pos[m.e - 1]
    for (let ni = start.ni; ni <= end.ni; ni++) {
      const a = ni === start.ni ? start.off : 0
      const b = ni === end.ni ? end.off + 1 : (nodes[ni].nodeValue?.length ?? 0)
      if (b <= a) continue
      if (!segs.has(ni)) segs.set(ni, [])
      segs.get(ni)!.push({ a, b, num, badge: ni === start.ni })
    }
  }

  // Rebuild each affected node, wrapping its covered segments (using the ORIGINAL text for display).
  for (const [ni, list] of segs) {
    const node = nodes[ni]
    const raw = node.nodeValue ?? ''
    list.sort((x, y) => x.a - y.a)
    const frag = document.createDocumentFragment()
    let last = 0
    for (const seg of list) {
      if (seg.a > last) frag.appendChild(document.createTextNode(raw.slice(last, seg.a)))
      const mark = document.createElement('mark')
      mark.className = `${quoteColour(seg.num)} rounded px-0.5`
      mark.dataset.lint = String(seg.num)   // scroll anchor: querySelector returns the first in document order
      mark.textContent = raw.slice(seg.a, seg.b)
      frag.appendChild(mark)
      last = seg.b
    }
    if (last < raw.length) frag.appendChild(document.createTextNode(raw.slice(last)))
    node.parentNode?.replaceChild(frag, node)
  }

  return displayNum
}
