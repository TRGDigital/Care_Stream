// Matches the names in an uploaded file to the people in CareStream. Plain rules, no guessing: a name that matches exactly (in either order, with or without a middle
// name) is matched; a near miss or a clash is "ambiguous" and an unknown name is "unmatched". The administrator completes the table and confirms it before any figure is used.
export interface Person { id: string; name: string }
export type MatchStatus = 'matched' | 'ambiguous' | 'unmatched'
export interface MatchRow { row: number; file_name: string; status: MatchStatus; staff_id: string | null; candidates: Person[] }

const TITLES = new Set(['mr', 'mrs', 'ms', 'miss', 'mx', 'dr', 'prof'])
export function tokens(name: string): string[] {
  let n = name.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
  if (n.includes(',')) { const [last, first] = n.split(',', 2); n = `${first} ${last}` }
  return n.replace(/[^a-z\s'-]/g, ' ').replace(/['-]/g, '').split(/\s+/).filter(t => t && !TITLES.has(t))
}
function distance(a: string, b: string): number {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)])
  for (let j = 1; j <= b.length; j++) d[0][j] = j
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1))
  return d[a.length][b.length]
}
function strong(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  if (a.join(' ') === b.join(' ')) return true
  if ([...a].sort().join(' ') === [...b].sort().join(' ')) return true
  return a.length >= 2 && b.length >= 2 && a[0] === b[0] && a[a.length - 1] === b[b.length - 1]
}
function weak(a: string[], b: string[]): boolean {
  if (!a.length || !b.length) return false
  const al = a[a.length - 1], bl = b[b.length - 1]
  if (a.length >= 2 && b.length >= 2 && al === bl && (a[0][0] === b[0][0] || a[0].startsWith(b[0]) || b[0].startsWith(a[0]))) return true
  if (a.length >= 2 && b.length >= 2 && a[0] === b[0] && distance(al, bl) <= 1) return true
  return distance(a.join(' '), b.join(' ')) <= 2 && a.join(' ').length > 5
}

export function matchPeople(fileNames: string[], staff: Person[]): MatchRow[] {
  const toks = staff.map(s => ({ s, t: tokens(s.name) }))
  return fileNames.map((raw, row) => {
    const t = tokens(raw)
    if (!t.length) return { row, file_name: raw, status: 'unmatched' as const, staff_id: null, candidates: [] }
    const s = toks.filter(x => strong(t, x.t)).map(x => x.s)
    if (s.length === 1) return { row, file_name: raw, status: 'matched' as const, staff_id: s[0].id, candidates: [] }
    if (s.length > 1) return { row, file_name: raw, status: 'ambiguous' as const, staff_id: null, candidates: s.slice(0, 6) }
    const w = toks.filter(x => weak(t, x.t)).map(x => x.s).slice(0, 6)
    return { row, file_name: raw, status: w.length ? 'ambiguous' as const : 'unmatched' as const, staff_id: null, candidates: w }
  })
}

/** What the administrator has chosen for each row: a staff id, or null for "leave out". Returns what is still open, and the final mapping when nothing is. */
export function resolveChoices(rows: MatchRow[], choices: Record<string, string | null | undefined>, validIds: Set<string>): { open: number[]; invalid: number[]; mapping: Record<string, string | null> } {
  const mapping: Record<string, string | null> = {}, open: number[] = [], invalid: number[] = []
  for (const r of rows) {
    const c = choices[String(r.row)]
    if (c === undefined) { if (r.status === 'matched' && r.staff_id) mapping[String(r.row)] = r.staff_id; else open.push(r.row); continue }
    if (c === null || c === 'skip') { mapping[String(r.row)] = null; continue }
    if (!validIds.has(c)) { invalid.push(r.row); continue }
    mapping[String(r.row)] = c
  }
  return { open, invalid, mapping }
}
