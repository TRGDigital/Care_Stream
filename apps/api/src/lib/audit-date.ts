// The day an audit was carried out, as YYYY-MM-DD. Never in the future, never more than two years back. Pure and shared by create and edit.
export function parseAuditDate(raw: unknown, now: Date = new Date()): { date: Date } | { error: string; code: string } {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(raw ?? ''))
  const d = m ? new Date(Date.UTC(+m[1], +m[2] - 1, +m[3])) : null
  if (!d || Number.isNaN(d.getTime()) || d.getUTCDate() !== +m![3]) return { error: 'That is not a valid audit date.', code: 'BAD_DATE' }
  const todayLondon = new Date(now.toLocaleDateString('en-CA', { timeZone: 'Europe/London' }) + 'T00:00:00Z')
  if (d.getTime() > todayLondon.getTime()) return { error: 'The audit date cannot be in the future.', code: 'FUTURE_DATE' }
  if (todayLondon.getTime() - d.getTime() > 730 * 86_400_000) return { error: 'The audit date cannot be more than two years ago.', code: 'DATE_TOO_OLD' }
  return { date: d }
}
/** The run's period start for a chosen day: the day itself for daily audits, the first of the month otherwise. */
export function periodFor(frequency: string | null | undefined, day: Date): Date {
  const p = new Date(day)
  if (frequency !== 'daily') p.setUTCDate(1)
  p.setUTCHours(0, 0, 0, 0)   // UTC, so it gives the same answer on the server and on a laptop in another time zone
  return p
}
