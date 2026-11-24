// When the live support chat is staffed, in one place: Monday to Friday, 9am to 5pm, UK time (Europe/London, so it follows British Summer Time).
// 09:00 is open, 17:00 is closed. UK bank holidays are NOT treated as closed (nobody has asked for it): see the note in the report. Change the numbers
// here and the hours text, the chat window and the inbox all follow. UK bank holidays (England and Wales, data/support-chat-bank-holidays.ts) are closed.

import { SUPPORT_BANK_HOLIDAYS } from '../data/support-chat-bank-holidays'

export const SUPPORT_HOURS = { timeZone: 'Europe/London', days: [1, 2, 3, 4, 5], startMinutes: 9 * 60, endMinutes: 17 * 60 } as const
export const AGENT_HEARTBEAT_SECONDS = 90          // someone is "manning" the inbox when they have said so and been seen this recently
export const STILL_WAITING_SECONDS = 180           // a live message nobody has answered for this long shows the "leave your details" prompt

const WEEKDAYS: Record<string, number> = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 }

/** The weekday (0 Sunday to 6 Saturday) and minutes since midnight in UK time for an instant. */
export function ukParts(d: Date): { weekday: number; minutes: number } {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: SUPPORT_HOURS.timeZone, weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(d)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  return { weekday: WEEKDAYS[get('weekday')] ?? 0, minutes: Number(get('hour')) * 60 + Number(get('minute')) }
}

/** The UK calendar date of an instant, as YYYY-MM-DD. */
export function ukDateKey(d: Date): string {
  const p = new Intl.DateTimeFormat('en-GB', { timeZone: SUPPORT_HOURS.timeZone, year: 'numeric', month: '2-digit', day: '2-digit' }).formatToParts(d)
  const g = (t: string) => p.find(x => x.type === t)?.value ?? ''
  return `${g('year')}-${g('month')}-${g('day')}`
}
export const bankHolidayName = (d: Date): string | null => SUPPORT_BANK_HOLIDAYS[ukDateKey(d)] ?? null

export function withinSupportHours(d: Date = new Date()): boolean {
  const { weekday, minutes } = ukParts(d)
  return (SUPPORT_HOURS.days as readonly number[]).includes(weekday) && !bankHolidayName(d) && minutes >= SUPPORT_HOURS.startMinutes && minutes < SUPPORT_HOURS.endMinutes
}

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
const isWorkingDay = (d: Date) => (SUPPORT_HOURS.days as readonly number[]).includes(ukParts(d).weekday) && !bankHolidayName(d)

export const hoursText = (): string => 'Monday to Friday, 9am to 5pm UK time'

/** "today at 9am", "tomorrow at 9am" or "Monday at 9am": when the team is next in (working days only, so weekends and bank holidays are skipped). */
export function nextOpeningText(d: Date = new Date()): string {
  const { minutes } = ukParts(d)
  if (isWorkingDay(d) && minutes < SUPPORT_HOURS.startMinutes) return 'today at 9am'
  for (let add = 1; add <= 14; add++) {
    const day = new Date(d.getTime() + add * 24 * 3600_000)   // a day later is the right calendar day in UK time to within the clock change hour, which only matters near midnight
    if (!isWorkingDay(day)) continue
    return add === 1 ? 'tomorrow at 9am' : `${DAY_NAMES[ukParts(day).weekday]} at 9am`
  }
  return 'Monday at 9am'
}

/** Why the team is not in at this moment, and what to tell the customer. null when they are in hours. */
export function closedMessage(d: Date = new Date()): { reason: 'bank_holiday' | 'weekend' | 'out_of_hours'; text: string } | null {
  if (withinSupportHours(d)) return null
  const next = nextOpeningText(d)
  const holiday = bankHolidayName(d)
  if (holiday) return { reason: 'bank_holiday', text: `We are closed today for the bank holiday (${holiday}) and back ${next}.` }
  const { weekday } = ukParts(d)
  if (!(SUPPORT_HOURS.days as readonly number[]).includes(weekday)) return { reason: 'weekend', text: `We are closed at the weekend and back ${next}.` }
  return { reason: 'out_of_hours', text: `We are closed for now and back ${next}.` }
}

export interface AgentSeen { online: boolean; last_seen_at: Date | string | null }

/** The team is online when it is inside hours AND at least one person has said they are online and been seen within the last 90 seconds. */
export function supportOnline(agents: AgentSeen[], now: Date = new Date()): boolean {
  if (!withinSupportHours(now)) return false
  return agents.some(a => a.online && a.last_seen_at && now.getTime() - new Date(a.last_seen_at).getTime() <= AGENT_HEARTBEAT_SECONDS * 1000)
}

/** A live chat whose last message is the customer's and has gone unanswered for three minutes while the team is meant to be online. */
export function stillWaiting(chat: { mode: string; status: string; last_customer_message_at?: Date | string | null; last_agent_message_at?: Date | string | null }, now: Date = new Date()): boolean {
  if (chat.mode !== 'live' || chat.status === 'closed' || !chat.last_customer_message_at) return false
  const c = new Date(chat.last_customer_message_at).getTime()
  const a = chat.last_agent_message_at ? new Date(chat.last_agent_message_at).getTime() : 0
  return a < c && now.getTime() - c >= STILL_WAITING_SECONDS * 1000
}
