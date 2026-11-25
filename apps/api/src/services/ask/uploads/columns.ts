// Works out what each column of a cleaned sheet means (a person's name, an hourly rate, hours, an invoice total, a supplier, a date) from the header words, and what
// the whole file is (a payroll, a list of invoices, or something else). Deterministic: the same file always reads the same way, and the administrator can see it.
import { toNumber, type Sheet } from './sheet'

export type DocKind = 'payroll' | 'invoice' | 'other'
export interface Roles { name: number | null; rate: number | null; rate_weekend: number | null; hours: number | null; contracted_hours: number | null; gross: number | null; job: number | null; supplier: number | null; amount: number | null; date: number | null; description: number | null }
export interface Detected { kind: DocKind; roles: Roles; name_columns: number[]; sheet: Sheet }
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9£]+/g, ' ').trim()
const numericShare = (sheet: Sheet, i: number) => { const v = sheet.rows.map(r => r[i] ?? '').filter(x => x !== ''); return v.length ? v.filter(x => toNumber(x) != null).length / v.length : 0 }

function best(sheet: Sheet, tests: Array<[RegExp, number]>, opts: { numeric?: boolean; not?: RegExp; taken?: Set<number> } = {}): number | null {
  let top = -1, at: number | null = null
  sheet.headers.forEach((h, i) => {
    if (opts.taken?.has(i)) return
    const n = norm(h)
    if (opts.not?.test(n)) return
    if (opts.numeric && numericShare(sheet, i) < 0.6) return
    for (const [re, score] of tests) if (re.test(n) && score > top) { top = score; at = i }
  })
  return at
}

/** Merges "First name" and "Surname" columns into one "Name" column when there is no single name column. */
export function combineNames(sheet: Sheet): Sheet {
  const hs = sheet.headers.map(norm)
  if (hs.some(h => /^(employee |staff |full |worker )?name$|^employee$|^staff member$|^worker$/.test(h))) return sheet
  const first = hs.findIndex(h => /^(first|given|forename)( name)?s?$/.test(h)), last = hs.findIndex(h => /^(last|family|surname)( name)?$/.test(h))
  if (first < 0 || last < 0) return sheet
  return { ...sheet, headers: [...sheet.headers, 'Name'], rows: sheet.rows.map(r => [...r, `${r[first] ?? ''} ${r[last] ?? ''}`.trim()]) }
}

export function detect(input: Sheet): Detected {
  const sheet = combineNames(input)
  const taken = new Set<number>()
  const take = (i: number | null) => { if (i != null) taken.add(i); return i }
  const name = take(best(sheet, [[/^(employee |staff |full |worker )?name$/, 5], [/^(employee|staff member|worker)$/, 4], [/\bname\b/, 2]], { not: /supplier|company|vendor|payee|business|bank|account|course|item/ }))
  const rate = take(best(sheet, [[/^(hourly rate|rate per hour|hourly pay|pay rate|basic rate|rate of pay|hourly)$/, 6], [/hourly|per hour|rate per hour|£ ?h\b/, 4], [/\brate\b/, 2]], { numeric: true, not: /overtime|weekend|bank holiday|night|sleep|holiday rate/ }))
  const rateWeekend = take(best(sheet, [[/weekend|saturday|sunday/, 3]], { numeric: true }))
  const contracted = take(best(sheet, [[/contract/, 4]], { numeric: true, not: /rate|pay/ }))
  const hours = take(best(sheet, [[/^(hours|hrs|total hours|hours worked|worked hours|hours paid|paid hours)$/, 6], [/\b(hours|hrs)\b/, 3]], { numeric: true, not: /contract|rate|overtime|holiday|sick|leave/ }))
  const gross = take(best(sheet, [[/^(gross pay|gross|total pay|gross wages|total gross)$/, 6], [/gross|total pay|earnings|wages/, 3]], { numeric: true }))
  const job = take(best(sheet, [[/^(job role|job title|role|position|job|title|grade)$/, 5], [/job|role|position|department/, 2]]))
  const supplier = take(best(sheet, [[/^(supplier|vendor|payee|company|from)$/, 6], [/supplier|vendor|payee|company|merchant|invoice from/, 4]]))
  const amount = take(best(sheet, [[/^(invoice total|total|amount|total amount|amount due|gross total|net total|invoice amount|value)$/, 6], [/total|amount|net|value|cost|price|£/, 2]], { numeric: true, not: /vat|tax|hours|rate|qty|quantity|unit/ }))
  const date = take(best(sheet, [[/^(invoice date|date|period|month|period end|date of invoice)$/, 6], [/date|period|month/, 3]]))
  const description = best(sheet, [[/^(description|item|details|product)$/, 4]], { not: /note/ })
  const kind: DocKind = name != null && (rate != null || (gross != null && hours != null)) ? 'payroll' : amount != null && (supplier != null || date != null) && name == null ? 'invoice' : amount != null && supplier != null ? 'invoice' : 'other'
  return { kind, roles: { name, rate, rate_weekend: rateWeekend, hours, contracted_hours: contracted, gross, job, supplier, amount, date, description }, name_columns: name != null ? [name] : [], sheet }
}

// ── Invoice rows ──────────────────────────────────────────────────────────────────────
export interface InvoiceLine { supplier: string; amount: number; date: string | null }
const toIso = (s: string): string | null => {
  const t = s.trim()
  let m = /^(\d{4})-(\d{2})-(\d{2})/.exec(t); if (m) return `${m[1]}-${m[2]}-${m[3]}`
  m = /^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})$/.exec(t); if (m) return `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`
  return null
}
export function invoiceLines(d: Detected, fallbackSupplier = 'Supplier'): InvoiceLine[] {
  const { roles, sheet } = d
  if (roles.amount == null) return []
  const out: InvoiceLine[] = []
  for (const r of sheet.rows) {
    const amount = toNumber(r[roles.amount]); if (amount == null) continue
    out.push({ supplier: (roles.supplier != null ? r[roles.supplier] : '') || fallbackSupplier, amount, date: roles.date != null ? toIso(r[roles.date] ?? '') : null })
  }
  return out
}

/** Best effort totals from the text of an invoice (PDF or Word): lines that say total or amount due with a pound amount. The administrator is told to check them. */
export function textTotals(text: string): Array<{ label: string; amount: number }> {
  const out: Array<{ label: string; amount: number }> = []
  for (const line of text.split(/\r?\n/)) {
    const m = /\b(invoice total|total due|amount due|balance due|total payable|grand total|total)\b[^\d£-]*£?\s*(-?\d{1,3}(?:,\d{3})*(?:\.\d{2})|-?\d+\.\d{2})/i.exec(line)
    if (m && !/\b(vat|sub ?total)\b/i.test(m[1]) && !/\bvat\b/i.test(line.slice(0, m.index))) out.push({ label: m[1].toLowerCase(), amount: Number(m[2].replace(/,/g, '')) })
  }
  return out.slice(0, 8)
}
export function textPeriod(text: string): { from: string | null; to: string | null } {
  const dates = [...text.matchAll(/\b(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})\b|\b(\d{4})-(\d{2})-(\d{2})\b/g)].map(m => m[4] ? `${m[4]}-${m[5]}-${m[6]}` : `${m[3]}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`).filter(d => d >= '2000-01-01' && d <= '2100-01-01').sort()
  return { from: dates[0] ?? null, to: dates[dates.length - 1] ?? null }
}
