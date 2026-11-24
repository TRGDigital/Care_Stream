// My letters (the staff side): the letters an administrator shared in my hub. apps/api/src/routes/staff-letters.ts mounted at /me/letters.
const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export class LettersError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }

async function call<T>(path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new LettersError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export interface MyLetter {
  id: string; title: string; filename: string; size_bytes: number; signed: boolean; from: string; shared_at: string | null; read_at: string | null
  needs_acknowledgement: boolean; acknowledged_at: string | null
}

export const myLetters = {
  /** Whether to show the "My letters" menu item at all (only people who have been sent a letter), and the unread count for its badge. */
  meta: (t: string) => call<{ enabled: boolean; total: number; unread: number; needs_acknowledgement: number }>('/me/letters/meta', t),
  list: (t: string) => call<{ letters: MyLetter[] }>('/me/letters', t),
  get: (t: string, id: string) => call<{ letter: MyLetter }>(`/me/letters/${encodeURIComponent(id)}`, t),
  /** The letter a hub notification is about (null when it is not about a letter). */
  byNotification: (t: string, nid: string) => call<{ letter: MyLetter | null }>(`/me/letters/by-notification/${encodeURIComponent(nid)}`, t),
  read: (t: string, id: string) => call<{ read_at: string | null }>(`/me/letters/${encodeURIComponent(id)}/read`, t, { method: 'POST', body: '{}' }),
  acknowledge: (t: string, id: string) => call<{ acknowledged_at: string | null }>(`/me/letters/${encodeURIComponent(id)}/acknowledge`, t, { method: 'POST', body: '{}' }),
  /** The PDF as a blob address (the viewer, Print and Download all use it). The file is private: it needs the signed in token. */
  fileUrl: async (t: string, id: string): Promise<string> => {
    const res = await fetch(`${API_URL}/me/letters/${encodeURIComponent(id)}/file`, { headers: { Authorization: `Bearer ${t}` } })
    if (!res.ok) throw new LettersError('FETCH_FAILED', 'The letter could not be opened just now. Please try again.', res.status)
    return URL.createObjectURL(await res.blob())
  },
}

export const fmtLetterDate = (iso: string | null | undefined): string => (iso ? new Date(iso).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' }) : '')
