// Works through ANY number of items a few at a time (in order, one call after another), so a long list is never cut short and no AI reply is asked to carry more than it was tuned for.
export async function inBatches<T, R>(items: T[], size: number, run: (chunk: T[]) => Promise<R[]>): Promise<R[]> {
  const out: R[] = []
  for (let i = 0; i < items.length; i += size) out.push(...await run(items.slice(i, i + size)))
  return out
}

/** A text that fits in `size` characters comes back as ONE part, untouched (so everything under today's limits behaves exactly as before). A longer text is cut into overlapping parts,
 *  each ending at a paragraph break where it can, so nothing is ever read from only the first part. */
export function textWindows(text: string, size: number, overlap = 1500): string[] {
  const t = String(text ?? '')
  if (t.length <= size) return [t]
  const parts: string[] = []
  let start = 0
  while (start < t.length) {
    let end = Math.min(t.length, start + size)
    if (end < t.length) { const br = t.lastIndexOf('\n', end); if (br > start + size * 0.6) end = br }
    parts.push(t.slice(start, end))
    if (end >= t.length) break
    start = Math.max(end - overlap, start + 1)
  }
  return parts
}

/** A group of items compared against each other is compared as it is when it is small. A bigger one is NOT cut: it is split into pieces of half the size and every pair of pieces is
 *  compared together, so any two items meet in at least one comparison. */
export function splitForComparison<T>(group: T[], max: number): T[][] {
  if (group.length <= max) return [group]
  const size = Math.max(1, Math.floor(max / 2)), pieces: T[][] = []
  for (let i = 0; i < group.length; i += size) pieces.push(group.slice(i, i + size))
  const out: T[][] = []
  for (let a = 0; a < pieces.length; a++) for (let b = a + 1; b < pieces.length; b++) out.push([...pieces[a], ...pieces[b]])
  return out
}

/** The complete items of a JSON array that was cut off part-way (an answer that ran past its length limit). Each whole `{...}` after `"<key>":[` is kept, the unfinished last one is dropped.
 *  Returns [] when nothing whole can be found. Used only after a normal parse has already failed. */
export function wholeItemsOf(raw: string, key: string): any[] {
  const start = raw.indexOf(`"${key}"`)
  const open = start < 0 ? -1 : raw.indexOf('[', start)
  if (open < 0) return []
  const items: any[] = []
  let depth = 0, from = -1, inStr = false, esc = false
  for (let i = open + 1; i < raw.length; i++) {
    const ch = raw[i]
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
    if (ch === '"') { inStr = true; continue }
    if (ch === '{') { if (depth === 0) from = i; depth++ }
    else if (ch === '}') { depth--; if (depth === 0 && from >= 0) { try { items.push(JSON.parse(raw.slice(from, i + 1))) } catch { /* skip an unreadable item */ } from = -1 } }
    else if (ch === ']' && depth === 0) break
  }
  return items
}
