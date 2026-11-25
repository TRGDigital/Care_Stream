// Dates in the Ask panel. HOUSE RULE 12: wherever a date is asked for, the administrator picks it from a date picker, never types it. The picker gives an ISO date (2026-12-08);
// newsletters keep the readable form ("Monday 8 December 2026"), so these helpers go between the two. Pure functions, tested.

const MONTHS = ['january', 'february', 'march', 'april', 'may', 'june', 'july', 'august', 'september', 'october', 'november', 'december']
const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December']
const WEEKDAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const pad = (n: number) => String(n).padStart(2, '0')

/** A real calendar date from year, month (1 to 12) and day, or null (30 February is not a date). */
function real(y: number, m: number, d: number): string | null {
  const t = new Date(Date.UTC(y, m - 1, d))
  return t.getUTCFullYear() === y && t.getUTCMonth() === m - 1 && t.getUTCDate() === d ? `${y}-${pad(m)}-${pad(d)}` : null
}

/** Today in the browser's own calendar as 2026-11-25. */
export function todayIso(now: Date = new Date()): string { return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}` }

/** "2026-12-08" to "Monday 8 December 2026" (UK order, weekday first). Anything that is not a real ISO date comes back as an empty string. */
export function toLongDate(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(iso ?? '').trim())
  if (!m || !real(+m[1], +m[2], +m[3])) return ''
  const t = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]))
  return `${WEEKDAYS[t.getUTCDay()]} ${+m[3]} ${MONTH_NAMES[+m[2] - 1]} ${m[1]}`
}

/** The other way: "Monday 8 December 2026", "8 December", "8th Dec 2026" or "08/12/2026" to an ISO date, or null when it is not a date. A missing year means the year given (default this year). */
export function fromLongDate(text: string | null | undefined, year: number = new Date().getFullYear()): string | null {
  const t = String(text ?? '').trim().toLowerCase().replace(/,/g, ' ').replace(/\s+/g, ' ')
  if (!t) return null
  let m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(t); if (m) return real(+m[1], +m[2], +m[3])
  m = /^(\d{1,2})[\/.](\d{1,2})[\/.](\d{4})$/.exec(t); if (m) return real(+m[3], +m[2], +m[1])
  m = /^(?:(?:mon|tue|wed|thu|fri|sat|sun)[a-z]*\s+)?(\d{1,2})(?:st|nd|rd|th)?\s+(?:of\s+)?([a-z]{3,9})(?:\s+(\d{4}))?$/.exec(t)
  if (!m) return null
  const mi = MONTHS.findIndex(n => n === m![2] || (m![2].length >= 3 && n.startsWith(m![2])))
  return mi < 0 ? null : real(m[3] ? +m[3] : year, mi + 1, +m[1])
}

/** True when the stored text is something the picker can show (empty counts: nothing picked yet). */
export const isPickable = (text: string | null | undefined) => !String(text ?? '').trim() || fromLongDate(text) !== null

/** Strip the bold, italic and underline marks, then cut at a word boundary with an ellipsis, for one line summaries in lists. */
export function plainSummary(text: string | null | undefined, max = 90): string {
  const t = String(text ?? '').replace(/\*\*|__|<\/?u>/g, '').replace(/(^|[\s(])[*_]([^*_\s][^*_]*?)[*_](?=[\s).,;:!?]|$)/g, '$1$2').replace(/\s+/g, ' ').trim()
  if (t.length <= max) return t
  const cut = t.slice(0, max); const sp = cut.lastIndexOf(' ')
  return `${(sp > max * 0.5 ? cut.slice(0, sp) : cut).replace(/[\s,;:.\-]+$/, '')}…`
}
