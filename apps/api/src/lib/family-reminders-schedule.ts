// Family reminders: the pure schedule rules and the signed "stop" token. No database, so it is unit tested
// (npx tsx src/lib/family-reminders.test.ts).
//
// A "contact" is one family invite (name, email, relationship). Each contact can have a cadence (weekly, fortnightly, monthly),
// a preferred weekday and a pause date. Rules:
//   - A reminder is sent by the daily job when the contact's next_due_at has arrived.
//   - Never more than one reminder per contact in 6 days (MIN_GAP_DAYS), whatever the cadence or weekday.
//   - After 3 unanswered reminders in a row (MAX_UNANSWERED) the job stops and a manager is told. A reply resets the count.
//   - All dates are whole days in UK time, held as midnight UTC of that calendar date.

import { createHmac, timingSafeEqual } from 'crypto'

export const CADENCES = ['off', 'weekly', 'fortnightly', 'monthly'] as const
export type Cadence = typeof CADENCES[number]
export const MIN_GAP_DAYS = 6
export const MAX_UNANSWERED = 3
const DAY = 86400000

export const isCadence = (v: unknown): v is Cadence => typeof v === 'string' && (CADENCES as readonly string[]).includes(v)

/** The UK calendar date of an instant, as midnight UTC of that date. */
export function londonDay(d: Date): Date {
  const parts = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d)
  return new Date(`${parts}T00:00:00.000Z`)
}
export const addDays = (d: Date, n: number) => new Date(d.getTime() + n * DAY)
export const dayDiff = (a: Date, b: Date) => Math.round((b.getTime() - a.getTime()) / DAY)

/** Same day of the month next month, or the last day of that month when it is shorter (31 Jan gives 28 Feb). */
export function addMonth(d: Date): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate()
  const lastOfNext = new Date(Date.UTC(y, m + 2, 0)).getUTCDate()
  return new Date(Date.UTC(y, m + 1, Math.min(day, lastOfNext)))
}

/** The first date on or after d that falls on the weekday (0 Sunday to 6 Saturday). No weekday means d itself. */
export function alignToWeekday(d: Date, weekday: number | null | undefined): Date {
  if (weekday === null || weekday === undefined || weekday < 0 || weekday > 6) return d
  return addDays(d, (weekday - d.getUTCDay() + 7) % 7)
}

function addPeriod(d: Date, cadence: Cadence): Date {
  return cadence === 'weekly' ? addDays(d, 7) : cadence === 'fortnightly' ? addDays(d, 14) : addMonth(d)
}

/**
 * When the next reminder is due. lastContact is the last reminder (or, before any reminder, the invite) sent to them, as a UK day, or null.
 * lastReminder is the last reminder only. The date is never before tomorrow, never before the pause ends, never within MIN_GAP_DAYS
 * of the last reminder, and lands on the preferred weekday when there is one. Returns null when the cadence is off.
 */
export function nextDueDate(o: { cadence: Cadence; weekday?: number | null; lastContact?: Date | null; lastReminder?: Date | null; today: Date; pausedUntil?: Date | null }): Date | null {
  if (o.cadence === 'off') return null
  let base = o.lastContact ? addPeriod(o.lastContact, o.cadence) : o.today
  const floors = [addDays(o.today, 1)]
  if (o.pausedUntil) floors.push(o.pausedUntil)
  if (o.lastReminder) floors.push(addDays(o.lastReminder, MIN_GAP_DAYS))
  for (const f of floors) if (f > base) base = f
  return alignToWeekday(base, o.weekday)
}

export type Decision = { action: 'send' | 'wait' | 'schedule' | 'stalled'; unanswered: number }

/**
 * What the daily job does for one contact. replied means they submitted something since the last reminder went out (which resets the count).
 * "schedule" means a due date needs working out (none stored yet, or they replied after reminders had stalled).
 */
export function decide(o: {
  cadence: Cadence; nextDueAt: Date | null; pausedUntil: Date | null; lastSentAt: Date | null; unanswered: number; replied: boolean; today: Date
}): Decision {
  const unanswered = o.replied ? 0 : o.unanswered
  if (o.cadence === 'off') return { action: 'wait', unanswered }
  if (unanswered >= MAX_UNANSWERED) return { action: 'stalled', unanswered }
  if (o.pausedUntil && o.pausedUntil > o.today) return { action: 'wait', unanswered }
  if (!o.nextDueAt) return { action: 'schedule', unanswered }
  if (londonDay(o.nextDueAt) > o.today) return { action: 'wait', unanswered }
  if (o.lastSentAt && dayDiff(londonDay(o.lastSentAt), o.today) < MIN_GAP_DAYS) return { action: 'wait', unanswered }
  return { action: 'send', unanswered }
}

// ─── The one click "Stop these reminders" token ────────────────────────────────
// Signed (HMAC) rather than stored, so a link in an old email keeps working after later reminders. It names one reminder setting
// and nothing else; stopping needs no sign in because the only thing it can do is switch reminders off.
const secret = () => (process.env.JWT_SECRET ? `${process.env.JWT_SECRET}:family-reminder-stop` : '')
const sig = (id: string) => createHmac('sha256', secret()).update(`stop|${id}`).digest('base64url')

/** null when no signing secret is configured: the caller must not send an email without a working stop link. */
export function signStopToken(settingId: string): string | null {
  return secret() ? `${settingId}.${sig(settingId)}` : null
}

export function verifyStopToken(token: string): string | null {
  if (!secret() || typeof token !== 'string' || token.length > 120) return null
  const i = token.indexOf('.')
  if (i < 1) return null
  const id = token.slice(0, i), given = token.slice(i + 1)
  if (!/^[A-Za-z0-9-]{8,64}$/.test(id)) return null
  const a = Buffer.from(given), b = Buffer.from(sig(id))
  return a.length === b.length && timingSafeEqual(a, b) ? id : null
}
