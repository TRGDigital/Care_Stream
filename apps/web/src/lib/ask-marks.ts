// HOUSE RULE 11, TEXT FORMATTING, on the editing side: the Bold, Italic and Underline buttons (and Ctrl or Cmd B, I, U) wrap the selected words in the marks every output understands:
// **bold**, *italic*, __underline__. Pure functions, so they are easy to test. The server draws the real formatting (see services/ask-docs/inline-marks.ts).
export type MarkKind = 'bold' | 'italic' | 'underline'
export const DELIM: Record<MarkKind, string> = { bold: '**', italic: '*', underline: '__' }
export interface Edited { text: string; start: number; end: number }

/** Wraps the selection in the mark, or takes the mark off when the selection is already inside it. With nothing selected it opens an empty pair and puts the cursor inside. */
export function toggleMark(text: string, start: number, end: number, kind: MarkKind): Edited {
  const d = DELIM[kind], n = d.length
  const a = Math.max(0, Math.min(start, end)), b = Math.max(a, Math.max(start, end))
  const single = kind === 'italic'
  // is the selection already inside the mark? (an italic star must not be mistaken for half of a bold pair)
  const before = text.slice(a - n, a) === d && (!single || text[a - 2] !== '*')
  const after = text.slice(b, b + n) === d && (!single || text[b + 1] !== '*')
  if (a !== b && before && after) return { text: text.slice(0, a - n) + text.slice(a, b) + text.slice(b + n), start: a - n, end: b - n }
  const sel = text.slice(a, b)
  if (sel.length > 2 * n && sel.startsWith(d) && sel.endsWith(d) && (!single || (sel[1] !== '*' && sel[sel.length - 2] !== '*'))) { const inner = sel.slice(n, sel.length - n); return { text: text.slice(0, a) + inner + text.slice(b), start: a, end: a + inner.length } }
  if (a === b) return { text: text.slice(0, a) + d + d + text.slice(b), start: a + n, end: a + n }
  return { text: text.slice(0, a) + d + sel + d + text.slice(b), start: a + n, end: b + n }
}

/** Takes every mark out of the selection (or out of everything when nothing is selected). A line that starts with a star or a dash and a space is a bullet and keeps it. */
export function clearMarks(text: string, start: number, end: number): Edited {
  const whole = start === end
  const a = whole ? 0 : Math.min(start, end), b = whole ? text.length : Math.max(start, end)
  const strip = (s: string) => s.split('\n').map(line => { const m = /^(\s*[-*]\s+)([\s\S]*)$/.exec(line); const body = (m ? m[2] : line).replace(/\*\*|\*|__|<\/?u>/gi, ''); return (m ? m[1] : '') + body }).join('\n')
  const mid = strip(text.slice(a, b))
  return { text: text.slice(0, a) + mid + text.slice(b), start: a, end: a + mid.length }
}

/** Which mark a key press means (Ctrl or Cmd with B, I or U), or null. */
export function markForKey(e: { key: string; ctrlKey: boolean; metaKey: boolean; altKey?: boolean }): MarkKind | null {
  if (!(e.ctrlKey || e.metaKey) || e.altKey) return null
  const k = e.key.toLowerCase()
  return k === 'b' ? 'bold' : k === 'i' ? 'italic' : k === 'u' ? 'underline' : null
}
