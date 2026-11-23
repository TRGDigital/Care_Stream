'use client'

// Shared tablets, browser side: connecting from the printed QR, starting a personal session with a PIN, and coming back to the tablet.
// A personal session replaces this browser's session (like "view hub as"), so the one time return token is kept in this browser's
// localStorage (a tablet's own storage, never a personal phone) and used to get the tablet itself back on Done, idle, or a reload.
import { signIn } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'

const API = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const RETURN_KEY = 'cs-tablet-return'
export const IDLE_MS = 5 * 60_000        // a personal session ends after 5 minutes untouched
export const IDLE_WARN_MS = 60_000       // ...with a "Still there?" prompt for the last minute

async function pub<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${API}/public/tablet${path}`, { ...init, headers: { 'Content-Type': 'application/json', ...(init?.headers ?? {}) } })
  const body = await r.json().catch(() => null)
  if (!r.ok || !body?.success) throw Object.assign(new Error(body?.error?.message ?? 'Something went wrong. Please try again.'), { code: body?.error?.code })
  return body.data as T
}

export const connectApi = {
  info:   (key: string) => pub<{ home_name: string; blocked: boolean }>(`/${encodeURIComponent(key)}/info`),
  search: (key: string, q: string) => pub<{ people: Array<{ id: string; name: string; photo_url: string | null }> }>(`/${encodeURIComponent(key)}/search?q=${encodeURIComponent(q)}`),
  verify: (key: string, user_id: string, pin: string) => pub<{ ticket: string; person: { name: string }; tablets: Array<{ id: string; name: string; location: string | null; connected: boolean }> }>('/verify', { method: 'POST', body: JSON.stringify({ key, user_id, pin }) }),
  complete: (ticket: string, tablet_id: string) => pub<{ access_token: string; refresh_token: string; tenant_name: string; tablet: { id: string; name: string }; user: { id: string; name: string } }>('/complete', { method: 'POST', body: JSON.stringify({ ticket, tablet_id }) }),
}

async function signInAs(d: { access_token: string; refresh_token: string; tenant_name: string; user: { name: string } }) {
  const res = await signIn('credentials', { redirect: false, mode: 'switch', access_token: d.access_token, refresh_token: d.refresh_token, tenant_name: d.tenant_name, user_name: d.user.name, user_email: '' })
  if (res?.error) throw new Error('Could not sign in on this tablet.')
}

/** Finish connecting: this browser becomes the tablet. */
export async function connectTablet(ticket: string, tabletId: string): Promise<void> {
  const d = await connectApi.complete(ticket, tabletId)
  try { localStorage.removeItem(RETURN_KEY) } catch { /* ignore */ }
  await signInAs(d)
}

/** A staff member's PIN: start their own session on this tablet. */
export async function startPersonal(deviceToken: string, tenantName: string, userId: string, pin: string): Promise<void> {
  const r = await createApiClient(deviceToken).tablets.startPersonal(userId, pin)
  try { localStorage.setItem(RETURN_KEY, JSON.stringify({ token: r.return_token, at: Date.now() })) } catch { /* the tablet will need to be reconnected from the poster */ }
  await signInAs({ access_token: r.access_token, refresh_token: 'tablet-personal-no-refresh', tenant_name: tenantName, user: r.user })
}

export const hasReturnToken = (): boolean => { try { return !!localStorage.getItem(RETURN_KEY) } catch { return false } }

/** Done (or idle / expired): log the personal session and get the tablet itself back. Returns false if it could not be restored. */
export async function backToTablet(personalToken?: string): Promise<boolean> {
  if (personalToken) await createApiClient(personalToken).tablets.endPersonal().catch(() => {})
  let tok: string | null = null
  try { tok = JSON.parse(localStorage.getItem(RETURN_KEY) ?? 'null')?.token ?? null; localStorage.removeItem(RETURN_KEY) } catch { tok = null }
  if (!tok) return false
  try {
    const d = await pub<{ access_token: string; refresh_token: string; tenant_name: string; user: { name: string } }>('/return', { method: 'POST', body: JSON.stringify({ return_token: tok }) })
    await signInAs(d)
    return true
  } catch { return false }
}
