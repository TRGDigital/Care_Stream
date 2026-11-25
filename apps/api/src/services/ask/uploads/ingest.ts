// Turns an uploaded file into the CLEANED copy that is kept: sensitive columns and personal identifiers removed, the columns' meanings worked out. The original file
// bytes are never stored; only this cleaned copy is, in private storage, and only until the retention the account chose.
import { readUpload, type Sheet } from './sheet'
import { stripSensitive, scrubText, type Dropped } from './sensitive'
import { detect, textTotals, textPeriod, type DocKind, type Roles } from './columns'

export interface Stored {
  v: 1; filename: string; kind: 'spreadsheet' | 'document'; doc_kind: DocKind
  sheet_name?: string; headers: string[]; rows: string[][]; roles: Roles; dropped: Dropped[]; sheets_found?: number; title_rows_skipped?: number
  text?: string; text_totals?: Array<{ label: string; amount: number }>; text_period?: { from: string | null; to: string | null }; removed_in_text?: number
}
export type Ingested = { ok: true; stored: Stored; ext: string } | { ok: false; reason: string }

export async function ingest(buf: Buffer, filename: string, thisYear?: number): Promise<Ingested> {
  const p = await readUpload(buf, filename)
  if (!p.ok) return p
  if (p.kind === 'document') {
    const s = scrubText(p.text)
    const totals = textTotals(s.text)
    return { ok: true, ext: p.ext, stored: { v: 1, filename, kind: 'document', doc_kind: totals.length ? 'invoice' : 'other', headers: [], rows: [], roles: emptyRoles(), dropped: [], text: s.text.slice(0, 40000), text_totals: totals, text_period: textPeriod(s.text), removed_in_text: s.removed } }
  }
  // The first sheet that reads as payroll or invoices, otherwise the first one.
  const cleaned = p.sheets.map(sh => { const c = stripSensitive(sh, thisYear); return { ...c, d: detect(c.sheet) } })
  const pick = cleaned.find(c => c.d.kind !== 'other') ?? cleaned[0]
  const sh: Sheet = pick.d.sheet
  return { ok: true, ext: p.ext, stored: { v: 1, filename, kind: 'spreadsheet', doc_kind: pick.d.kind, sheet_name: sh.name, headers: sh.headers, rows: sh.rows, roles: pick.d.roles, dropped: pick.dropped, sheets_found: p.sheets.length, title_rows_skipped: sh.title_rows_skipped } }
}
export const emptyRoles = (): Roles => ({ name: null, rate: null, rate_weekend: null, hours: null, contracted_hours: null, gross: null, job: null, supplier: null, amount: null, date: null, description: null, allowance: null, taken: null, remaining: null, course: null, completed: null, expiry: null })

/** Which columns mean what, for the screen and for the assistant. */
export function columnSummary(s: Stored) {
  const roleOf = new Map<number, string>()
  for (const [role, i] of Object.entries(s.roles)) if (i != null) roleOf.set(i as number, role.replace(/_/g, ' '))
  return s.headers.map((h, i) => ({ name: h, meaning: roleOf.get(i) ?? null }))
}
