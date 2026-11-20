// Family reminders: types for the manager screens, and the public "Stop these reminders" call.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type ReminderCadence = 'off' | 'weekly' | 'fortnightly' | 'monthly'

export const CADENCE_LABELS: Record<ReminderCadence, string> = {
  off: 'No reminders', weekly: 'Every week', fortnightly: 'Every two weeks', monthly: 'Every month',
}
/** 0 is Sunday, to match the API. Shown Monday first. */
export const WEEKDAYS: Array<{ value: number; label: string }> = [
  { value: 1, label: 'Monday' }, { value: 2, label: 'Tuesday' }, { value: 3, label: 'Wednesday' }, { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' }, { value: 6, label: 'Saturday' }, { value: 0, label: 'Sunday' },
]

export interface ReminderSetting {
  invite_id: string
  cadence: ReminderCadence
  weekday: number | null
  paused_until: string | null     // YYYY-MM-DD
  next_due_at: string | null
  last_sent_at: string | null
  last_reply_at: string | null
  unanswered_count: number
  /** True once reminders have stopped because the last 3 went unanswered. */
  stalled: boolean
  stopped_by_family: boolean
}

export interface ReminderList { ready: boolean; reminders: ReminderSetting[] }
export interface ReminderInput { cadence: ReminderCadence; weekday?: number | null; paused_until?: string | null }

/** The "Stop these reminders" page calls this once when it opens. No sign in: the signed link is the key. */
export async function stopFamilyReminders(token: string): Promise<{ stopped: boolean; resident_name: string; home_name: string }> {
  const res = await fetch(`${API_URL}/public/family/stop/${encodeURIComponent(token)}`, { method: 'POST', headers: { 'Content-Type': 'application/json' } })
  let body: any = null
  try { body = await res.json() } catch { /* leave null */ }
  if (!res.ok || !body?.success) {
    const e: any = new Error(body?.error?.message ?? `Request failed (${res.status})`)
    e.status = res.status
    throw e
  }
  return body.data
}
