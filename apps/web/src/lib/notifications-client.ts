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

export interface FileItem { id: string; name: string; mime: string; size_bytes: number }
export const FILE_MAX_FILES = 5
export const FILE_MAX_BYTES = 4 * 1024 * 1024
export const FILE_MAX_TOTAL_BYTES = 20 * 1024 * 1024
export const FILE_ACCEPT = '.pdf,.docx,.xlsx,.pptx,.csv,.txt,.jpg,.jpeg,.png,.webp'
export const fmtSize = (n: number) => n >= 1024 * 1024 ? `${(n / 1024 / 1024).toFixed(1)} MB` : `${Math.max(1, Math.round(n / 1024))} KB`

export interface StaffOption { id: string; name: string; job_role: string | null; role: string }
export interface SentItem { withdrawn?: boolean; id: string; title: string; created_at: string; created_by_name: string; audience: 'all' | 'selected'; total: number; read: number; unread: number; label: string; file_count?: number }
export interface SentDetail { notification: SentItem & { files?: FileItem[]; body: string; last_reminded_at: string | null; can_remind_in_minutes: number }; people: Array<{ user_id: string; name: string; job_role: string | null; active: boolean; email_sent: boolean; read_at: string | null }> }
export interface SendResult { id: string; recipients: number; emailed: number; email_failed: number; dropped: number }

export interface MyItem { id: string; title: string; sender_name: string; sender_photo_url: string | null; created_at: string | null; read_at: string | null; body?: string; file_count?: number; files?: FileItem[] }

export const adminNotifications = {
  staff: (t: string) => call<{ staff: StaffOption[] }>('/notifications/staff', t),
  list: (t: string) => call<{ notifications: SentItem[] }>('/notifications', t),
  get: (t: string, id: string) => call<SentDetail>(`/notifications/${encodeURIComponent(id)}`, t),
  send: (t: string, o: { title: string; body: string; audience: 'all' | 'selected'; user_ids?: string[]; file_ids?: string[] }) => call<SendResult>('/notifications', t, { method: 'POST', body: JSON.stringify(o) }),
  /** One document, as a draft until the notification is sent. Reports progress as a number from 0 to 100. */
  uploadFile: (t: string, file: File, onProgress?: (pct: number) => void) => new Promise<FileItem>((resolve, reject) => {
    const xhr = new XMLHttpRequest(); const form = new FormData(); form.append('file', file)
    xhr.open('POST', `${API_URL}/notifications/files`); xhr.setRequestHeader('Authorization', `Bearer ${t}`)
    xhr.upload.onprogress = e => { if (e.lengthComputable) onProgress?.(Math.round((e.loaded / e.total) * 100)) }
    xhr.onerror = () => reject(new NotificationsError('NETWORK', 'The upload failed. Please check your connection and try again.', 0))
    xhr.onload = () => {
      let body: any = null; try { body = JSON.parse(xhr.responseText) } catch { /* not json */ }
      if (xhr.status >= 200 && xhr.status < 300 && body?.success) resolve(body.data.file as FileItem)
      else reject(new NotificationsError(body?.error?.code ?? 'ERROR', body?.error?.message ?? (xhr.status === 413 ? 'Each document can be up to 4 MB.' : `The upload failed (${xhr.status}).`), xhr.status))
    }
    xhr.send(form)
  }),
  removeFile: (t: string, id: string) => call<{ deleted: boolean }>(`/notifications/files/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  withdraw: (t: string, id: string) => call<{ withdrawn: boolean; recipients: number; read: number; email_note: string }>(`/notifications/${encodeURIComponent(id)}/withdraw`, t, { method: 'POST', body: '{}' }),
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

/** Fetches a document with the person's sign in (the files are private, so a plain link would not work) and returns a temporary address for the browser. */
export async function fetchFileBlobUrl(token: string, path: string): Promise<string> {
  const res = await fetch(`${API_URL}${path}`, { headers: { Authorization: `Bearer ${token}` } })
  if (!res.ok) { let m = 'Could not open that document.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new NotificationsError('FETCH_FAILED', m, res.status) }
  return URL.createObjectURL(await res.blob())
}
