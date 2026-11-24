// The words of the holiday emails and hub messages. Pure, so it is tested and shared by the emails, the hub message and the previews.
// Dates read like "Mon 2 Dec" and runs of days are joined ("Mon 2 Dec to Fri 6 Dec"). No dashes, plain English.
const esc = (s: unknown) => String(s ?? '').replace(/[<>&"']/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', "'": '&#39;' }[c] as string))
const DOW = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

export type HolidayEmailKind = 'requested' | 'approved' | 'rejected' | 'edited' | 'removed'

export function niceDate(ymd: string, withYear = false): string {
  const d = new Date(ymd + 'T00:00:00Z')
  return `${DOW[d.getUTCDay()]} ${d.getUTCDate()} ${MON[d.getUTCMonth()]}${withYear ? ' ' + d.getUTCFullYear() : ''}`
}

/** "Mon 2 Dec to Fri 6 Dec" for a run of consecutive days; separate runs are joined with commas. */
export function describeDays(days: string[]): string {
  const sorted = [...new Set(days)].sort()
  if (!sorted.length) return 'no days'
  const runs: string[][] = []
  for (const d of sorted) {
    const last = runs[runs.length - 1]
    if (last) { const next = new Date(last[last.length - 1] + 'T00:00:00Z'); next.setUTCDate(next.getUTCDate() + 1); if (next.toISOString().slice(0, 10) === d) { last.push(d); continue } }
    runs.push([d])
  }
  const withYear = new Set(sorted.map(d => d.slice(0, 4))).size > 1 || sorted[0].slice(0, 4) !== String(new Date().getUTCFullYear())
  return runs.map(r => r.length === 1 ? niceDate(r[0], withYear) : `${niceDate(r[0])} to ${niceDate(r[r.length - 1], withYear)}`).join(', ')
}

export const hoursLabel = (hours: number, unit: 'hours' | 'days', days: number) => unit === 'days' ? `${days} ${days === 1 ? 'day' : 'days'}` : `${hours} ${hours === 1 ? 'hour' : 'hours'}`

export interface HolidayEmailInput {
  kind: HolidayEmailKind
  personName: string          // the staff member the holiday is for
  approverName: string
  days: string[]
  totalLabel: string          // for example "24 hours" or "3 days"
  note?: string | null        // the person's note (requested) or the approver's note (rejected, edited, removed)
}

export function holidayHeadline(i: HolidayEmailInput): string {
  switch (i.kind) {
    case 'requested': return `${i.personName} has asked for holiday`
    case 'approved':  return `${i.approverName} has approved your holiday`
    case 'rejected':  return `${i.approverName} has not been able to approve your holiday`
    case 'edited':    return `${i.approverName} has changed your holiday`
    case 'removed':   return `${i.approverName} has removed your holiday`
  }
}

export function holidaySubject(i: HolidayEmailInput): string {
  const when = describeDays(i.days)
  switch (i.kind) {
    case 'requested': return `Holiday request from ${i.personName}: ${when}`
    case 'approved':  return `Your holiday is approved: ${when}`
    case 'rejected':  return `Your holiday on ${when} has been disapproved`
    case 'edited':    return `Your holiday has been changed: ${when}`
    case 'removed':   return `Your holiday on ${when} has been disapproved`
  }
}

export function holidayIntro(i: HolidayEmailInput): string {
  switch (i.kind) {
    case 'requested': return 'It is waiting for you in CareStream. You can see who else is off on those days before you decide.'
    case 'approved':  return 'It is in your holiday record in the hub.'
    case 'rejected':  return 'The request was not approved. Your holiday balance has not been used.'
    case 'edited':    return 'The booking was changed after it was approved. Please check the new dates and hours.'
    case 'removed':   return 'This booking was approved but has now been taken off. Your holiday balance has been put back.'
  }
}

export function holidayButton(kind: HolidayEmailKind): { label: string; path: string } {
  return kind === 'requested' ? { label: 'Review the request', path: '/holiday-requests' } : { label: 'Open my holidays', path: '/my-holidays' }
}

const P = (t: string, last = false) => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 ${last ? 0 : 12}px">${t}</p>`
const LABEL = 'color:#5E4D70;font-size:12px;text-transform:uppercase;letter-spacing:.04em'

/** The card inside the email (and the body of the hub message, as plain text via holidayMessageText). */
export function holidayCardHtml(i: HolidayEmailInput): string {
  const noteLabel = i.kind === 'requested' ? `${esc(i.personName)} wrote` : `${esc(i.approverName)} wrote`
  return `<p style="${LABEL};margin:0 0 4px">Days</p>${P(`<strong>${esc(describeDays(i.days))}</strong>`)}`
    + `<p style="${LABEL};margin:0 0 4px">Total</p>${P(esc(i.totalLabel), !i.note)}`
    + (i.note ? `<p style="${LABEL};margin:0 0 4px">${noteLabel}</p>${P(esc(i.note), true)}` : '')
}

export const HOLIDAY_NOTE_MAX = 500

/** The hub message (a staff notification) that goes with a decision: a title and a plain text body. */
export function holidayMessage(i: HolidayEmailInput): { title: string; body: string } {
  const when = describeDays(i.days)
  const title = i.kind === 'approved' ? `Your holiday is approved: ${when}`
    : i.kind === 'edited' ? `Your holiday has been changed: ${when}`
    : `Your holiday on ${when} has been disapproved`
  const lines = [`${i.approverName} ${i.kind === 'approved' ? 'approved' : i.kind === 'edited' ? 'changed' : i.kind === 'removed' ? 'removed' : 'did not approve'} your holiday.`, `Days: ${when}`, `Total: ${i.totalLabel}`]
  if (i.note) lines.push('', `Note from ${i.approverName}: ${i.note}`)
  lines.push('', i.kind === 'approved' ? 'You can see it in My holidays.' : i.kind === 'edited' ? 'Please check the new dates in My holidays.' : 'Your holiday balance has not been used. You can ask again from My holidays.')
  return { title: title.slice(0, 120), body: lines.join('\n') }
}
