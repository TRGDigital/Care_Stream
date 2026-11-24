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
export interface AskConversation { id: string; agent_id: string; title: string; updated_at: string | null }
export interface AskDocument { id: string; type: string; title: string; status: string; updated_at: string | null }

export const ask = {
  meta: (t: string) => call<{ enabled: boolean; ready: boolean; agents: AskAgent[] }>('/ask/meta', t),
  chat: (t: string, b: { agent_id: string; conversation_id?: string | null; message: string }) =>
    call<{ conversation_id: string; message: AskMessage; tools_used: string[] }>('/ask/chat', t, { method: 'POST', body: JSON.stringify(b) }),
  conversations: (t: string) => call<{ conversations: AskConversation[] }>('/ask/conversations', t),
  conversation: (t: string, id: string) => call<{ conversation: AskConversation; messages: AskMessage[] }>(`/ask/conversations/${encodeURIComponent(id)}`, t),
  rename: (t: string, id: string, title: string) => call<{ renamed: boolean }>(`/ask/conversations/${encodeURIComponent(id)}`, t, { method: 'PATCH', body: JSON.stringify({ title }) }),
  remove: (t: string, id: string) => call<{ deleted: boolean }>(`/ask/conversations/${encodeURIComponent(id)}`, t, { method: 'DELETE' }),
  documents: (t: string) => call<{ documents: AskDocument[] }>('/ask/documents', t),
  document: (t: string, id: string) => call<{ document: { id: string; type: string; title: string; body: string; status: string; version: number; updated_at: string | null } }>(`/ask/documents/${encodeURIComponent(id)}`, t),
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
