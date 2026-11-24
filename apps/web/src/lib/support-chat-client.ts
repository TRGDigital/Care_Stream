// The customer side of the live support chat (apps/api/src/routes/support-chat.ts).
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface ChatMsg { id: string; sender: 'customer' | 'agent' | 'system'; sender_name: string; body: string; created_at: string }
export interface ChatInfo { id: string; status: 'open' | 'waiting' | 'answered' | 'closed'; mode: 'live' | 'offline'; agent_online: boolean; still_waiting: boolean; created_at: string }
export interface ChatStatus { online: boolean; in_hours: boolean; hours_text: string; next_open: string | null; closed: { reason: string; text: string } | null; chat: ChatInfo | null }

export class ChatApiError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}/support-chat${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers as Record<string, string> | undefined ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new ChatApiError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export const supportChat = {
  status: (t: string) => call<ChatStatus>('/status', t),
  start: (t: string, message: string) => call<{ chat: ChatInfo; message: ChatMsg }>('/start', t, { method: 'POST', body: JSON.stringify({ message }) }),
  messages: (t: string, id: string, after?: string) => call<{ chat: ChatInfo; messages: ChatMsg[] }>(`/${id}/messages${after ? `?after=${encodeURIComponent(after)}` : ''}`, t),
  send: (t: string, id: string, body: string) => call<{ chat: ChatInfo; message: ChatMsg }>(`/${id}/messages`, t, { method: 'POST', body: JSON.stringify({ body }) }),
  close: (t: string, id: string) => call<{ chat: ChatInfo }>(`/${id}/close`, t, { method: 'POST' }),
  leaveMessage: (t: string, o: { message: string; name?: string; email?: string; chat_id?: string }) => call<{ chat: ChatInfo; message: ChatMsg }>('/offline', t, { method: 'POST', body: JSON.stringify(o) }),
}
