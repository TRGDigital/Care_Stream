// Deterministic, formatted diff of a policy's ORIGINAL text vs its DRAFT, for the Out-of-date
// drill-in. No AI and no fuzzy matching: replaced/added wording shows green, removed wording is
// struck through — so tenants see exactly what changed on every policy, every time. Pure string ops.

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// Letterhead / extraction-junk lines dropped from BOTH sides (unchanged noise that hurts readability).
const JUNK: RegExp[] = [
  /description automatically generated/i,
  /^registered (office|charity|number)/i,
  /^telephone[:\s]/i,
  /^www\./i,
  /^[\w.+-]+@[\w.-]+\.[a-z]{2,}$/i,            // bare email line
  /\b[A-Z]{1,2}\d[A-Z\d]?\s*\d[A-Z]{2}\b/,     // UK postcode
  /^a .+ (with|and|on|in) .+$/i,               // image alt, e.g. "A green house with a fence"
  /^(page\s*)?\d+\s*$/i,                        // lone page number
]
const isJunk = (line: string) => { const t = line.trim(); return !t || JUNK.some(re => re.test(t)) }

// Remove inline URLs / emails and tidy the phrasing left behind ("(available at …)", stray spaces).
const stripUrls = (l: string) => l
  .replace(/\(?\s*(?:available (?:at|from)|see|visit|source)?\s*:?\s*(?:https?:\/\/|www\.)\S+\s*\)?/gi, ' ')
  .replace(/\S+@\S+\.[a-z]{2,}/gi, ' ')
  .replace(/\s{2,}/g, ' ')
  .replace(/\s+([.,;:)])/g, '$1')
  .trim()

// A short line with no ending punctuation reads as a heading in extracted policy text.
const isHeading = (t: string) =>
  t.length > 0 && t.length <= 90 && t.split(/\s+/).length <= 12 && !/[.,:;]$/.test(t) && /^[A-Z0-9(]/.test(t)

// A list item: bullet (•, -, *) or an enumerator (1. / 1) / a) ). Returns whether it's ordered + the
// text after the marker; null if the line isn't a list item.
function listItem(t: string): { ordered: boolean; rest: string } | null {
  let m = t.match(/^\s*\(?(\d{1,3}|[a-z])[.)]\s+(.+)$/i)
  if (m) return { ordered: /\d/.test(m[1]!), rest: m[2]! }
  m = t.match(/^\s*[•▪‣◦·*]\s+(.+)$/)
  if (m) return { ordered: false, rest: m[1]! }
  m = t.match(/^\s*[-–—]\s+(.+)$/)
  if (m) return { ordered: false, rest: m[1]! }
  return null
}

// Normalise a line: strip URLs, a stray leading page number glued to a heading ("445Mental"), space.
const normLine = (l: string) => stripUrls(l.replace(/^\s*\d{1,4}(?=[A-Z])/, '').replace(/\s+/g, ' ').trim())

const toLines = (text: string): string[] =>
  (text || '').split(/\r?\n/).map(normLine).filter(l => l && !isJunk(l))

type DiffOp<T> = { type: 'equal' | 'del' | 'ins'; a?: T; b?: T }

// Longest-common-subsequence diff. Sizes here are small (a few hundred lines, ~100 tokens/line).
function lcsDiff<T>(a: T[], b: T[], eq: (x: T, y: T) => boolean): DiffOp<T>[] {
  const n = a.length, m = b.length
  const dp: Uint32Array[] = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--)
    for (let j = m - 1; j >= 0; j--)
      dp[i]![j] = eq(a[i]!, b[j]!) ? dp[i + 1]![j + 1]! + 1 : Math.max(dp[i + 1]![j]!, dp[i]![j + 1]!)
  const out: DiffOp<T>[] = []
  let i = 0, j = 0
  while (i < n && j < m) {
    if (eq(a[i]!, b[j]!)) { out.push({ type: 'equal', a: a[i], b: b[j] }); i++; j++ }
    else if (dp[i + 1]![j]! >= dp[i]![j + 1]!) { out.push({ type: 'del', a: a[i] }); i++ }
    else { out.push({ type: 'ins', b: b[j] }); j++ }
  }
  while (i < n) out.push({ type: 'del', a: a[i++] })
  while (j < m) out.push({ type: 'ins', b: b[j++] })
  return out
}

const DEL = 'text-decoration:line-through;background:#fef2f2;color:#b91c1c;border-radius:2px'
const INS = 'background:#dcfce7;color:#166534;text-decoration:none;border-radius:2px;padding:0 1px'

// Word-level diff of a single changed line → HTML with del/ins spans (so only the changed words show).
function wordDiffHtml(oldLine: string, newLine: string): string {
  const a = oldLine.split(/(\s+)/), b = newLine.split(/(\s+)/)
  const ops = lcsDiff(a, b, (x, y) => x === y)
  let html = ''
  for (const op of ops) {
    if (op.type === 'equal') html += escapeHtml(op.a as string)
    else if (op.type === 'del') { const t = op.a as string; html += t.trim() ? `<del style="${DEL}">${escapeHtml(t)}</del>` : escapeHtml(t) }
    else { const t = op.b as string; html += t.trim() ? `<ins style="${INS}">${escapeHtml(t)}</ins>` : escapeHtml(t) }
  }
  return html
}

type Kind = 'h' | 'p' | 'ol' | 'ul'
type Item = { kind: Kind; html: string; text: string }

const classify = (text: string): { kind: Kind; rest: string } => {
  const li = listItem(text)
  if (li) return { kind: li.ordered ? 'ol' : 'ul', rest: li.rest }
  if (isHeading(text)) return { kind: 'h', rest: text }
  return { kind: 'p', rest: text }
}

const mkItem = (text: string, wrap: 'none' | 'del' | 'ins'): Item => {
  const { kind, rest } = classify(text)
  const html = wrap === 'del' ? `<del style="${DEL}">${escapeHtml(rest)}</del>`
    : wrap === 'ins' ? `<ins style="${INS}">${escapeHtml(rest)}</ins>`
    : escapeHtml(rest)
  return { kind, html, text }
}

// A single line replaced by another → word-level diff, presented in the NEW line's block kind.
const mkChanged = (oldText: string, newText: string): Item => {
  const oldC = classify(oldText), newC = classify(newText)
  return { kind: newC.kind, html: wordDiffHtml(oldC.rest, newC.rest), text: newText }
}

// Many policy lists lose their bullet characters in text extraction — a lead-in line ending in ":"
// is followed by the items on their own lines. Promote those following short lines to bullet items
// until a prose paragraph (or heading) resumes, so the list reads as a list.
function inferColonLists(items: Item[]): void {
  let inList = false
  for (const it of items) {
    if (it.kind === 'ol' || it.kind === 'ul') { inList = false; continue }   // explicit list handles itself
    const t = it.text.trim()
    if (it.kind === 'h') { inList = false; continue }
    if (t.endsWith(':')) { inList = true; continue }                          // lead-in opens a list
    if (inList) {
      if (t.length > 0 && t.length <= 200) it.kind = 'ul'                      // short line → bullet item
      else inList = false                                                      // long prose → list ended
    }
  }
}

/**
 * Formatted HTML showing the difference between a policy's original text and its current draft:
 * unchanged content rendered normally, removed content struck through, replaced/added content green.
 * Headings and bullet/numbered lists are rebuilt, URLs stripped. Deterministic.
 */
export function buildPolicyDiffHtml(original: string, draft: string): string {
  const a = toLines(original), b = toLines(draft)
  const ops = lcsDiff(a, b, (x, y) => x === y)

  const items: Item[] = []
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!
    if (op.type === 'equal') { items.push(mkItem(op.a as string, 'none')); continue }
    if (op.type === 'del') {
      const dels: string[] = []
      while (k < ops.length && ops[k]!.type === 'del') dels.push(ops[k++]!.a as string)
      const inss: string[] = []
      while (k < ops.length && ops[k]!.type === 'ins') inss.push(ops[k++]!.b as string)
      k--
      if (dels.length === 1 && inss.length === 1) items.push(mkChanged(dels[0]!, inss[0]!))
      else { for (const d of dels) items.push(mkItem(d, 'del')); for (const s of inss) items.push(mkItem(s, 'ins')) }
      continue
    }
    items.push(mkItem(op.b as string, 'ins'))
  }

  inferColonLists(items)

  // Group consecutive list items of the same type into a single <ul>/<ol>.
  const out: string[] = []
  let i = 0
  while (i < items.length) {
    const kind = items[i]!.kind
    if (kind === 'ol' || kind === 'ul') {
      const lis: string[] = []
      while (i < items.length && items[i]!.kind === kind) lis.push(`<li>${items[i++]!.html}</li>`)
      out.push(`<${kind}>${lis.join('')}</${kind}>`)
    } else {
      out.push(`<${kind === 'h' ? 'h3' : 'p'}>${items[i++]!.html}</${kind === 'h' ? 'h3' : 'p'}>`)
    }
  }
  return out.join('\n')
}
