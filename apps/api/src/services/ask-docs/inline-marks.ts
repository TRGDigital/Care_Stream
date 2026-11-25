// HOUSE RULE 11, TEXT FORMATTING. Where bold, italic or underline is meant, a finished document shows real bold, italic or underline, never the marker characters.
// The stored text uses ONE small set of marks, read here once and drawn by every output (the designed screen sheet, Print, the PDF, Word, the hub and email, letters and reports):
//   **bold**        *italic* (or _italic_)        __underline__ (or <u>underline</u>)
// Marks can nest ("**bold and *italic***"). A lone star (a bullet at the start of a line is handled by the section readers before this runs, and " * " with spaces around it is
// plain text) is left alone. A marker that never closes ("**Callum") is DROPPED, so a finished document can never show stray stars or underscores. Plain code, no model, no browser.

export interface Run { text: string; b?: boolean; i?: boolean; u?: boolean }
type Kind = 'b' | 'i' | 'u'
interface Tok { t: 'text'; v: string }
interface Mark { t: 'mark'; kind: Kind; delim: string; canOpen: boolean; canClose: boolean }

const WORD = /[A-Za-z0-9À-ɏ]/
const isWord = (c: string | undefined) => !!c && WORD.test(c)
const isSpace = (c: string | undefined) => c === undefined || /\s/.test(c)

/** Splits text into plain pieces and candidate marker tokens. */
function tokenise(text: string): Array<Tok | Mark> {
  const out: Array<Tok | Mark> = []
  let buf = ''
  const flush = () => { if (buf) { out.push({ t: 'text', v: buf }); buf = '' } }
  const s = text
  for (let i = 0; i < s.length;) {
    const rest = s.slice(i)
    const prev = s[i - 1], two = s.slice(i, i + 2)
    if (/^<u>/i.test(rest)) { flush(); out.push({ t: 'mark', kind: 'u', delim: '<u>', canOpen: true, canClose: false }); i += 3; continue }
    if (/^<\/u>/i.test(rest)) { flush(); out.push({ t: 'mark', kind: 'u', delim: '</u>', canOpen: false, canClose: true }); i += 4; continue }
    if (s.slice(i, i + 3) === '***' || s.slice(i, i + 3) === '___') {
      // three in a row close an italic inside a bold ("**bold *italic***") or open both ("***both***"): the inner mark comes first when closing, last when opening
      const ch = s[i], closing = !isSpace(prev)
      const dbl = (canOpen: boolean, canClose: boolean): Mark => ({ t: 'mark', kind: ch === '*' ? 'b' : 'u', delim: ch + ch, canOpen, canClose })
      const sgl = (canOpen: boolean, canClose: boolean): Mark => ({ t: 'mark', kind: 'i', delim: ch, canOpen, canClose })
      flush()
      if (closing) { out.push(sgl(false, true), dbl(false, true)) } else { out.push(dbl(true, false), sgl(true, false)) }
      i += 3; continue
    }
    if (two === '**' || two === '__') {
      const next = s[i + 2]
      const canOpen = !isSpace(next), canClose = !isSpace(prev)
      if (canOpen || canClose) { flush(); out.push({ t: 'mark', kind: two === '**' ? 'b' : 'u', delim: two, canOpen, canClose }); i += 2; continue }
      buf += two; i += 2; continue
    }
    const c = s[i]
    if (c === '*' || c === '_') {
      const next = s[i + 1]
      // a single star or underscore is italic only when it hugs words: "*like this*", never " * " and never snake_case
      const canOpen = !isSpace(next) && (c === '*' ? !isWord(prev) || isSpace(prev) || /[(\["'“‘]/.test(prev ?? '') : !isWord(prev))
      const canClose = !isSpace(prev) && (c === '*' ? true : !isWord(next))
      if (canOpen || canClose) { flush(); out.push({ t: 'mark', kind: 'i', delim: c, canOpen, canClose }); i += 1; continue }
    }
    buf += c; i += 1
  }
  flush()
  return out
}

/** The runs of one paragraph: text with the bold, italic and underline it carries. Unmatched markers are dropped. */
export function parseMarks(text: string): Run[] {
  const toks = tokenise(String(text ?? ''))
  // pair the markers: an opener waits on a stack for a closer of the same delimiter
  const keep = new Map<number, 'open' | 'close'>()
  const stack: Array<{ idx: number; delim: string }> = []
  toks.forEach((tk, idx) => {
    if (tk.t !== 'mark') return
    const closeKey = tk.delim === '</u>' ? '<u>' : tk.delim
    const at = stack.map(x => x.delim).lastIndexOf(closeKey)
    if (tk.canClose && at >= 0 && tk.delim !== '<u>') { const o = stack[at]; stack.length = at; keep.set(o.idx, 'open'); keep.set(idx, 'close'); return }
    if (tk.canOpen) stack.push({ idx, delim: tk.delim })
  })
  const runs: Run[] = []
  const on: Record<Kind, number> = { b: 0, i: 0, u: 0 }
  for (let idx = 0; idx < toks.length; idx++) {
    const tk = toks[idx]
    if (tk.t === 'text') { if (tk.v) { const r: Run = { text: tk.v }; if (on.b) r.b = true; if (on.i) r.i = true; if (on.u) r.u = true; runs.push(r) }; continue }
    const m = keep.get(idx)
    if (m === 'open') on[tk.kind] += 1
    else if (m === 'close') on[tk.kind] = Math.max(0, on[tk.kind] - 1)
    else if (tk.delim.length === 1 && !tk.canOpen) { const r: Run = { text: tk.delim }; if (on.b) r.b = true; if (on.i) r.i = true; if (on.u) r.u = true; runs.push(r) }   // a lone star or underscore between words (5*2) is plain text
    // any other marker that never paired is dropped
  }
  // merge neighbours with the same look
  const merged: Run[] = []
  for (const r of runs) { const l = merged[merged.length - 1]; if (l && !!l.b === !!r.b && !!l.i === !!r.i && !!l.u === !!r.u) l.text += r.text; else merged.push({ ...r }) }
  return merged
}

/** The words with every mark removed (for measuring, lint, plain text, titles). */
export const stripMarks = (text: string): string => parseMarks(text).map(r => r.text).join('')
export const hasMarks = (text: string): boolean => parseMarks(text).some(r => r.b || r.i || r.u)

const escHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
/** One paragraph as email safe HTML: <strong>, <em> and <u> around the escaped words (inline tags only, no attributes). */
export function marksToHtml(text: string): string {
  return parseMarks(text).map(r => {
    let h = escHtml(r.text)
    if (r.u) h = `<u>${h}</u>`
    if (r.i) h = `<em>${h}</em>`
    if (r.b) h = `<strong>${h}</strong>`
    return h
  }).join('')
}

/** The pdfkit font for a run, given a family: Helvetica or Times. */
export function pdfFontFor(r: Run, family: 'Helvetica' | 'Times' = 'Helvetica'): string {
  if (family === 'Times') return r.b && r.i ? 'Times-BoldItalic' : r.b ? 'Times-Bold' : r.i ? 'Times-Italic' : 'Times-Roman'
  return r.b && r.i ? 'Helvetica-BoldOblique' : r.b ? 'Helvetica-Bold' : r.i ? 'Helvetica-Oblique' : 'Helvetica'
}

/** Draws marked text with pdfkit: runs of different fonts continue on the same line and wrap together. Returns nothing; the caller measures with `markedHeight`. */
export function drawMarked(doc: any, text: string, x: number, y: number, o: { width: number; size: number; color: string; lineGap?: number; family?: 'Helvetica' | 'Times'; safe?: (s: string) => string; baseItalic?: boolean; baseBold?: boolean; align?: string }): void {
  const runs = parseMarks(text).filter(r => r.text.length)
  const safe = o.safe ?? ((s: string) => s)
  if (!runs.length) return
  doc.fillColor(o.color).fontSize(o.size)
  runs.forEach((r, i) => {
    const rr: Run = { ...r, b: r.b || o.baseBold, i: r.i || o.baseItalic }
    doc.font(pdfFontFor(rr, o.family ?? 'Helvetica'))
    const last = i === runs.length - 1
    const opts: any = { continued: !last, underline: !!r.u, lineGap: o.lineGap ?? 0 }
    if (i === 0) doc.text(safe(r.text), x, y, { ...opts, width: o.width, align: o.align ?? 'left' })
    else doc.text(safe(r.text), opts)
  })
}

/** The height marked text takes, measured with the heaviest font that appears (bold is a little wider, so this never under measures). */
export function markedHeight(doc: any, text: string, o: { width: number; size: number; lineGap?: number; family?: 'Helvetica' | 'Times'; safe?: (s: string) => string; baseItalic?: boolean; baseBold?: boolean }): number {
  const runs = parseMarks(text)
  const bold = o.baseBold || runs.some(r => r.b)
  const italic = o.baseItalic || (!bold && runs.some(r => r.i))
  const font = pdfFontFor({ text: '', b: bold, i: italic && !bold }, o.family ?? 'Helvetica')
  doc.font(font).fontSize(o.size)
  const plain = runs.map(r => r.text).join('')
  return doc.heightOfString((o.safe ?? ((s: string) => s))(plain), { width: o.width, lineGap: o.lineGap ?? 0 })
}
