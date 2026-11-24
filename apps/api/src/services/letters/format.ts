// UK formatting for letters: dates, money and numbers. Written by hand (no Intl) so the output is the same on every machine and in tests.

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']

/** Reads 2026-04-01, 01/04/2026 (day first, UK) or a Date. Returns the ISO date, or null when it is not a real date. */
export function parseDate(v: unknown): string | null {
  if (v instanceof Date && !isNaN(v.getTime())) return v.toISOString().slice(0, 10)
  const s = String(v ?? '').trim()
  let y: number, m: number, d: number
  let r = /^(\d{4})-(\d{2})-(\d{2})(?:T.*)?$/.exec(s)
  if (r) { y = +r[1]; m = +r[2]; d = +r[3] } else {
    r = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(s)
    if (!r) return null
    d = +r[1]; m = +r[2]; y = +r[3]
  }
  const t = new Date(Date.UTC(y, m - 1, d))
  if (t.getUTCFullYear() !== y || t.getUTCMonth() !== m - 1 || t.getUTCDate() !== d) return null
  return `${String(y).padStart(4, '0')}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

/** 1 April 2026 */
export function fmtDate(iso: string | null | undefined): string {
  const p = parseDate(iso)
  if (!p) return ''
  const [y, m, d] = p.split('-').map(Number)
  return `${d} ${MONTHS[m - 1]} ${y}`
}

/** Reads 12.71, "12.71", "£1,250" ... Returns null when it is not a number. */
export function parseNumber(v: unknown): number | null {
  if (typeof v === 'number') return isFinite(v) ? v : null
  const s = String(v ?? '').replace(/[£,\s]/g, '')
  if (s === '' || !/^-?\d*\.?\d+$/.test(s)) return null
  const n = Number(s)
  return isFinite(n) ? n : null
}

/** £12.71 and £1,250.00 (always two decimals). */
export function fmtMoney(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return ''
  const neg = n < 0
  const [whole, dec] = Math.abs(Math.round(n * 100) / 100).toFixed(2).split('.')
  return `${neg ? '-' : ''}£${whole.replace(/\B(?=(\d{3})+(?!\d))/g, ',')}.${dec}`
}

/** 224, 109.2, 2.35 (no trailing zeros, at most two decimals). */
export function fmtNumber(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return ''
  const r = Math.round(n * 100) / 100
  return String(r)
}

/** 4.2% */
export function fmtPercent(n: number | null | undefined): string {
  if (n == null || !isFinite(n)) return ''
  return `${Math.round(n * 10) / 10}%`
}
