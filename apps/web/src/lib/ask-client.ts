// Ask CareStream (apps/api/src/routes/ask.ts): administrators on the pilot account only. Every call is a plain authenticated request.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export class AskError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }
async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new AskError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export type AgentStatus = 'ready' | 'shell' | 'soon'
export interface AskAgent { id: string; name: string; blurb: string; icon: string; status: AgentStatus; starters: string[]; shell_message: string | null }
export interface AskSource { label: string; as_of: string | null; warning?: string | null; url?: string | null }
export interface AskMessage { id: string; role: 'user' | 'assistant'; content: string; sources?: AskSource[]; created_at?: string | null }
export type ActionStatus = 'proposed' | 'confirmed' | 'cancelled' | 'expired' | 'failed' | 'done'
export interface ActionPerson { id: string; name: string; job_role: string | null; photo_url: string | null; has_email?: boolean }
export interface AskActionCard {
  id: string; type: 'send_staff_notification' | 'remind_unread_notification' | 'allocate_training' | 'send_training_reminders'; label: string; status: ActionStatus
  expires_at: string; created_at: string; recipients: ActionPerson[]; suggested: string[]; max_recipients: number; result: any; summary: string; notes: string[]
  title?: string; body?: string; email?: boolean; email_allowed?: boolean; all_staff?: boolean; personalised?: string[]; unknown_fields?: string[]
  preview?: { for_name: string; title: string; body: string } | null
  notification_title?: string; courses?: string[]; due_date?: string | null; skipped?: Array<{ user_id: string; name: string; course: string; reason: string }>
  scope?: string; within_days?: number; items?: Array<{ user_id: string; name: string; courses: string[] }>
}
export interface AskSettingsView { actions_enabled: boolean; notifications_enabled: boolean; training_enabled: boolean; emails_enabled: boolean; max_recipients: number; min_gap_minutes: number; managers_can_use: boolean }
export interface AskConversation { id: string; agent_id: string; title: string; updated_at: string | null }
export interface AskDocument { id: string; type: string; title: string; status: string; mine?: boolean; staff_name?: string | null; updated_at: string | null }
export interface AskDocActions { needs_approval: boolean; edit: boolean; submit: boolean; approve: boolean; return: boolean; reopen: boolean; share: Array<'pdf' | 'email' | 'notification'> }
export interface AskDocField { key: string; label: string; type: string; required: boolean; choices: Array<{ value: string; label: string }> | null }
export interface AskDocFull {
  id: string; type: string; title: string; body: string; status: string; version: number; updated_at: string | null; mine: boolean; created_by: string
  staff_name: string | null; internal_only?: boolean; checklist: string[]; references: Array<{ label: string; url: string }>; shared: Array<{ method: string; at: string }>
  values?: Record<string, string | number>; fields?: AskDocField[]; actions: AskDocActions; data?: { review_note?: { note: string; at: string } } | null
}
export interface AskApproval { id: string; type: string; title: string; staff_name: string | null; mine: boolean; updated_at: string | null }

export const ask = {
  meta: (t: string) => call<{ enabled: boolean; ready: boolean; role?: 'admin' | 'manager'; agents: AskAgent[] }>('/ask/meta', t),
  chat: (t: string, b: { agent_id: string; conversation_id?: string | null; message: string; context?: { page: string; staffUserId?: string; residentId?: string; year?: number; month?: string } }) =>
    call<{ conversation_id: string; message: AskMessage; actions?: AskActionCard[]; tools_used: string[] }>('/ask/chat', t, { method: 'POST', body: JSON.stringify(b) }),
  conversations: (t: string) => call<{ conversations: AskConversation[] }>('/ask/conversations', t),
  conversation: (t: string, id: string) => call<{ conversation: AskConversation; messages: AskMessage[]; actions?: Array<{ message_id: string | null; card: AskActionCard }> }>(`/ask/conversations/${encodeURIComponent(id)}`, t),
  rename: (t: string, id: string, title: string) => call<{ renamed: boolean }>(`/ask/conversations/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify({ title }) }),
  remove: (t: string, id: string) => call<{ deleted: boolean }>(`/ask/conversations/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  actions: {
    settings: (t: string) => call<{ settings: AskSettingsView; ready: boolean }>('/ask/actions/settings', t),
    saveSettings: (t: string, b: Partial<AskSettingsView>) => call<{ settings: AskSettingsView }>('/ask/actions/settings', t, { method: 'PUT', body: JSON.stringify(b) }),
    staff: (t: string) => call<{ staff: ActionPerson[] }>('/ask/actions/staff', t),
    get: (t: string, id: string) => call<{ card: AskActionCard }>(`/ask/actions/${encodeURIComponent(id)}`, t),
    edit: (t: string, id: string, b: { title?: string; body?: string; user_ids?: string[]; due_date?: string | null; email?: boolean }) => call<{ card: AskActionCard }>(`/ask/actions/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify(b) }),
    confirm: (t: string, id: string) => call<{ card: AskActionCard; result: any }>(`/ask/actions/${encodeURIComponent(id)}/confirm`, t, { method: 'POST', body: '{}' }),
    cancel: (t: string, id: string) => call<{ cancelled: boolean }>(`/ask/actions/${encodeURIComponent(id)}/cancel`, t, { method: 'POST', body: '{}' }),
  },
  documents: (t: string) => call<{ documents: AskDocument[] }>('/ask/documents', t),
  document: (t: string, id: string) => call<{ document: AskDocFull }>(`/ask/documents/${encodeURIComponent(id)}`, t),
  approvals: (t: string) => call<{ approvals: AskApproval[] }>('/ask/approvals', t),
  editDocument: (t: string, id: string, b: { title?: string; body?: string; internal_only?: boolean; values?: Record<string, string | number> }) => call<{ saved: boolean; missing?: string[]; unreadable?: string[]; body?: string }>(`/ask/documents/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify(b) }),
  submit: (t: string, id: string) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/submit`, t, { method: 'POST', body: '{}' }),
  approve: (t: string, id: string, checklist_confirmed: boolean) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/approve`, t, { method: 'POST', body: JSON.stringify({ checklist_confirmed }) }),
  returnToDraft: (t: string, id: string, note?: string) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/return`, t, { method: 'POST', body: JSON.stringify({ note }) }),
  reopen: (t: string, id: string) => call<{ status: string }>(`/ask/documents/${encodeURIComponent(id)}/reopen`, t, { method: 'POST', body: '{}' }),
  share: (t: string, id: string, b: { method: 'email' | 'notification'; audience?: 'all' | 'selected'; user_ids?: string[] }) => call<{ shared: boolean; method: string }>(`/ask/documents/${encodeURIComponent(id)}/share`, t, { method: 'POST', body: JSON.stringify(b) }),
  /** Downloads the finished PDF (an approved document only) and saves it in the browser. */
  downloadPdf: async (t: string, id: string, fallbackName: string) => {
    const res = await fetch(`${API_URL}/ask/documents/${encodeURIComponent(id)}/pdf`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) { let m = 'The PDF could not be made just now.'; try { m = (await res.json())?.error?.message ?? m } catch { /* not json */ } throw new AskError('PDF_FAILED', m, res.status) }
    const url = URL.createObjectURL(await res.blob()); const a = document.createElement('a'); a.href = url; a.download = `${fallbackName.replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '-') || 'document'}.pdf`; a.click(); URL.revokeObjectURL(url)
  },
  save: (t: string, b: { type?: string; title: string; body: string; sources?: AskSource[] }) => call<{ id: string }>('/ask/documents', t, { method: 'POST', body: JSON.stringify(b) }),
  updateDocument: (t: string, id: string, b: { title?: string; body?: string }) => call<{ saved: boolean }>(`/ask/documents/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify(b) }),
  removeDocument: (t: string, id: string) => call<{ deleted: boolean }>(`/ask/documents/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
}

/** A notification draft the Notifications agent puts in a fenced block: pulled out so the screen can offer "Open in Notifications". */
export function parseNotificationDraft(text: string): { title: string; body: string } | null {
  const m = /```notification\s*\n([\s\S]*?)```/i.exec(text)
  if (!m) return null
  const t = /^TITLE:\s*(.+)$/im.exec(m[1]); const b = /^BODY:\s*\n?([\s\S]*)$/im.exec(m[1])
  if (!t || !b) return null
  return { title: t[1].trim().slice(0, 120), body: b[1].trim().slice(0, 2000) }
}
export const withoutDraftBlock = (text: string) => text.replace(/```notification[\s\S]*?```/gi, '').trim()
export const notificationsLink = (d: { title: string; body: string }) => `/notifications?title=${encodeURIComponent(d.title)}&body=${encodeURIComponent(d.body)}`
