// Admin notifications to staff (apps/api/src/routes/notifications.ts): the admin side (/notifications) and the staff side (/me/notifications).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export class NotificationsError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new NotificationsError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export interface StaffOption { id: string; name: string; job_role: string | null; role: string }
export interface SentItem { id: string; title: string; created_at: string; created_by_name: string; audience: 'all' | 'selected'; total: number; read: number; unread: number; label: string }
export interface SentDetail { notification: SentItem & { body: string; last_reminded_at: string | null; can_remind_in_minutes: number }; people: Array<{ user_id: string; name: string; job_role: string | null; active: boolean; email_sent: boolean; read_at: string | null }> }
export interface SendResult { id: string; recipients: number; emailed: number; email_failed: number; dropped: number }

export interface MyItem { id: string; title: string; sender_name: string; sender_photo_url: string | null; created_at: string | null; read_at: string | null; body?: string }

export const adminNotifications = {
  staff: (t: string) => call<{ staff: StaffOption[] }>('/notifications/staff', t),
  list: (t: string) => call<{ notifications: SentItem[] }>('/notifications', t),
  get: (t: string, id: string) => call<SentDetail>(`/notifications/${encodeURIComponent(id)}`, t),
  send: (t: string, o: { title: string; body: string; audience: 'all' | 'selected'; user_ids?: string[] }) => call<SendResult>('/notifications', t, { method: 'POST', body: JSON.stringify(o) }),
  remind: (t: string, id: string) => call<{ reminded: number; emailed: number; email_failed: number }>(`/notifications/${encodeURIComponent(id)}/remind`, t, { method: 'POST' }),
}

export const myNotifications = {
  unread: (t: string) => call<{ count: number; notifications: MyItem[] }>('/me/notifications/unread', t),
  list: (t: string) => call<{ notifications: MyItem[] }>('/me/notifications', t),
  get: (t: string, id: string) => call<{ notification: MyItem & { body: string } }>(`/me/notifications/${encodeURIComponent(id)}`, t),
  markRead: (t: string, id: string) => call<{ read_at: string }>(`/me/notifications/${encodeURIComponent(id)}/read`, t, { method: 'POST' }),
}

export const TITLE_MAX = 120
export const BODY_MAX = 2000
export function fmtWhen(iso: string | null): string {
  if (!iso) return ''
  return new Date(iso).toLocaleString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
}
