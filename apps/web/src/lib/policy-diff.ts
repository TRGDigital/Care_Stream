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

// A short line with no ending punctuation reads as a heading in extracted policy text.
const isHeading = (t: string) =>
  t.length > 0 && t.length <= 90 && t.split(/\s+/).length <= 12 && !/[.,:;]$/.test(t) && /^[A-Z0-9(]/.test(t)

// Normalise a line: strip a stray leading page number glued to a heading ("445Mental"), collapse space.
const normLine = (l: string) => l.replace(/^\s*\d{1,4}(?=[A-Z])/, '').replace(/\s+/g, ' ').trim()

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
    else if (op.type === 'del') { const t = op.a as string; if (t.trim()) html += `<del style="${DEL}">${escapeHtml(t)}</del>`; else html += escapeHtml(t) }
    else { const t = op.b as string; if (t.trim()) html += `<ins style="${INS}">${escapeHtml(t)}</ins>`; else html += escapeHtml(t) }
  }
  return html
}

const block = (text: string, inner: string) => (isHeading(text) ? `<h3>${inner}</h3>` : `<p>${inner}</p>`)

/**
 * Formatted HTML showing the difference between a policy's original text and its current draft:
 * unchanged content rendered normally, removed content struck through, replaced/added content green.
 * Deterministic — the same inputs always produce the same, correct result.
 */
export function buildPolicyDiffHtml(original: string, draft: string): string {
  const a = toLines(original), b = toLines(draft)
  const ops = lcsDiff(a, b, (x, y) => x === y)
  const html: string[] = []
  for (let k = 0; k < ops.length; k++) {
    const op = ops[k]!
    if (op.type === 'equal') { const t = op.a as string; html.push(block(t, escapeHtml(t))); continue }
    if (op.type === 'del') {
      // Collect a run of removals then any immediately-following additions (a replaced region).
      const dels: string[] = []
      while (k < ops.length && ops[k]!.type === 'del') dels.push(ops[k++]!.a as string)
      const inss: string[] = []
      while (k < ops.length && ops[k]!.type === 'ins') inss.push(ops[k++]!.b as string)
      k-- // the for-loop will re-increment
      if (dels.length === 1 && inss.length === 1) {
        html.push(block(inss[0]!, wordDiffHtml(dels[0]!, inss[0]!)))   // single-line change → word-level
      } else {
        for (const d of dels) html.push(block(d, `<del style="${DEL}">${escapeHtml(d)}</del>`))
        for (const s of inss) html.push(block(s, `<ins style="${INS}">${escapeHtml(s)}</ins>`))
      }
      continue
    }
    const t = op.b as string
    html.push(block(t, `<ins style="${INS}">${escapeHtml(t)}</ins>`))   // pure addition
  }
  return html.join('\n')
}
