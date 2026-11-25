// Sensitive columns are dropped the moment a file is read: bank and sort code and account numbers, National Insurance numbers, addresses, dates of birth, phone
// numbers, email addresses, health and sickness columns, other identity numbers and free text notes. They are never stored and never shown to the assistant.
// A column goes if its HEADER says so, or if its VALUES look like one of these (so a column called "Ref" full of NI numbers goes too).
import type { Sheet } from './sheet'

export interface Dropped { column: string; reason: string }
const norm = (h: string) => h.toLowerCase().replace(/[^a-z0-9£]+/g, ' ').trim()

const HEADER_RULES: Array<[string, RegExp]> = [
  ['bank details', /\b(bank|sort ?code|account (no|number|num)|acc ?(no|num)|iban|bic|swift|roll number)\b/],
  ['National Insurance number', /\b(nino|national insurance (no|number|num)|ni (no|number|num)|ni ?#)\b/],
  ['address', /\b(address|addr|street|postcode|post code|zip|town|city|county)\b/],
  ['date of birth or age', /\b(dob|date of birth|birth|born|birthday|age)\b/],
  ['phone number', /\b(phone|mobile|tel|telephone|contact number|cell)\b/],
  ['email address', /\b(email|e mail)\b/],
  ['health or sickness', /\b(sick|sickness|ssp|absence reason|medical|health|fit note|disability|maternity|paternity|smp|illness)\b/],
  ['identity number', /\b(passport|driving licen[cs]e|pension (no|number)|national id|utr|tax reference)\b/],
  ['free text notes', /\b(note|notes|comment|comments|remarks?)\b/],
]
const NI = /^[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]$/i
const SORT = /^\d{2}[- ]\d{2}[- ]\d{2}$/
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE = /^(\+44\s?|0)\d[\d\s]{8,11}$/
const IBAN = /^[A-Z]{2}\d{2}\s?[A-Z0-9]{4}[A-Z0-9\s]{7,30}$/
const POSTCODE = /^[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}$/i
const VALUE_RULES: Array<[string, (v: string) => boolean]> = [
  ['looks like National Insurance numbers', v => NI.test(v)],
  ['looks like sort codes', v => SORT.test(v)],
  ['looks like email addresses', v => EMAIL.test(v)],
  ['looks like phone numbers', v => PHONE.test(v) && v.replace(/\D/g, '').length >= 10 && !/\./.test(v)],
  ['looks like bank account numbers (IBAN)', v => IBAN.test(v) && /[A-Z]/i.test(v.slice(0, 2))],
  ['looks like postcodes', v => POSTCODE.test(v)],
]

/** Dates that could only be a birthday: a year between 1930 and 15 years ago. */
export function looksLikeBirthdays(values: string[], thisYear = new Date().getFullYear()): boolean {
  const dates = values.map(v => /^(\d{4})-\d{2}-\d{2}$/.exec(v) ?? /^\d{1,2}\/\d{1,2}\/(\d{4})$/.exec(v)).filter(Boolean) as RegExpExecArray[]
  if (dates.length < 2 || dates.length < values.length * 0.6) return false
  return dates.every(m => { const y = Number(m[1]); return y >= 1930 && y <= thisYear - 15 })
}

export function headerReason(header: string): string | null {
  const h = norm(header)
  // "Employer NI" and "NI deductions" are amounts, not numbers: only the explicit number headers (and NI like values) go.
  for (const [reason, re] of HEADER_RULES) if (re.test(h)) return reason
  return null
}

export function valueReason(values: string[], thisYear?: number): string | null {
  const filled = values.filter(v => v !== '')
  if (!filled.length) return null
  for (const [reason, test] of VALUE_RULES) if (filled.filter(test).length >= Math.max(1, Math.ceil(filled.length * 0.3))) return reason
  return looksLikeBirthdays(filled, thisYear) ? 'looks like dates of birth' : null
}

/** Returns the sheet without its sensitive columns, and a plain list of what was removed and why. */
export function stripSensitive(sheet: Sheet, thisYear?: number): { sheet: Sheet; dropped: Dropped[] } {
  const keep: number[] = [], dropped: Dropped[] = []
  sheet.headers.forEach((h, i) => {
    const reason = headerReason(h) ?? valueReason(sheet.rows.map(r => r[i] ?? ''), thisYear)
    if (reason) dropped.push({ column: h, reason }); else keep.push(i)
  })
  return { sheet: { ...sheet, headers: keep.map(i => sheet.headers[i]), rows: sheet.rows.map(r => keep.map(i => r[i] ?? '')) }, dropped }
}

/** Free text from a document: personal identifiers are replaced before it is kept. */
export function scrubText(text: string): { text: string; removed: number } {
  let removed = 0
  const sub = (re: RegExp, to: string) => { text = text.replace(re, () => { removed++; return to }) }
  sub(/\b[A-CEGHJ-PR-TW-Z]{2}\s?\d{2}\s?\d{2}\s?\d{2}\s?[A-D]\b/gi, '[NI number removed]')
  sub(/\b\d{2}[- ]\d{2}[- ]\d{2}\b(?=[^\n]{0,40}\b\d{8}\b)/g, '[bank details removed]')
  sub(/\b[A-Z]{2}\d{2}\s?[A-Z0-9]{4}(?:\s?[A-Z0-9]{4}){2,7}\b/g, '[IBAN removed]')
  sub(/[^\s@]+@[^\s@]+\.[A-Za-z]{2,}/g, '[email removed]')
  sub(/(?:\+44\s?|\b0)\d[\d ]{8,11}\b/g, '[phone removed]')
  sub(/\b[A-Z]{1,2}\d[A-Z\d]?\s?\d[A-Z]{2}\b/g, '[postcode removed]')
  return { text, removed }
}
