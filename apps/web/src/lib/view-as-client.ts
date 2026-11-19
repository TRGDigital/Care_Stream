'use client'

// "View hub as": start and end. Signing in as the staff member replaces the admin's session in this browser, so the admin gets back
// with a one time return token (kept in this tab's sessionStorage only), which signs them back in through the normal magic link route.
import { signIn } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'

const KEY = 'cs-view-as-return'
type Back = { token: string; at: number; page: string }

export async function startViewAs(adminToken: string, userId: string, mode: 'view' | 'act'): Promise<void> {
  const r = await createApiClient(adminToken).users.viewAs(userId, mode)
  try { sessionStorage.setItem(KEY, JSON.stringify({ token: r.return_token, at: Date.now(), page: window.location.pathname } satisfies Back)) } catch { /* the banner then sends them to sign in */ }
  const res = await signIn('credentials', {
    redirect: false, mode: 'switch', access_token: r.access_token, refresh_token: 'view-as-no-refresh',
    tenant_name: r.tenant_name, user_name: r.user.name, user_email: r.user.email, tier: r.tier,
  })
  if (res?.error) throw new Error('Could not open their hub.')
  window.location.href = '/chat'
}

/** Leave the view: log it, then sign back in as the admin and return to the page they were on. */
export async function endViewAs(viewToken: string | undefined): Promise<void> {
  if (viewToken) await createApiClient(viewToken).me.endViewAs().catch(() => {})
  let back: Back | null = null
  try { back = JSON.parse(sessionStorage.getItem(KEY) ?? 'null') } catch { back = null }
  try { sessionStorage.removeItem(KEY) } catch { /* ignore */ }
  if (back?.token) {
    const res = await signIn('credentials', { redirect: false, mode: 'magic', token: back.token })
    if (!res?.error) { window.location.href = back.page || '/staff'; return }
  }
  window.location.href = '/login'
}
