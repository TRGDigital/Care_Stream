// Letterhead and company details, and personal signatures (apps/api/src/routes/letterhead.ts and signatures.ts). Pilot: shown only when the API answers; everyone else gets a 404 and sees nothing.
import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
export class LetterheadError extends Error { constructor(public code: string, message: string, public status: number) { super(message) } }

export interface Details {
  trading_name: string | null; legal_name: string | null; address_line1: string | null; address_line2: string | null; town: string | null; county: string | null; postcode: string | null
  phone: string | null; email: string | null; website: string | null; company_number: string | null; registered_in: string | null; registered_in_other: string | null
  registered_office_same: boolean; registered_office: string | null; vat_number: string | null; cqc_provider_id: string | null; cqc_location_id: string | null; ico_number: string | null
  footer_line: string | null; logo_align: 'left' | 'centre'
}
export interface LetterheadState { table_ready: boolean; details: Details; display_name: string; has_logo: boolean; missing: string[]; registered_in_options: string[] }
export interface SignatureMeta { allowed?: boolean; table_ready?: boolean; name?: string; job_role?: string; has: boolean; width: number | null; height: number | null; updated_at: string | null }

async function call<T>(base: string, path: string, token: string, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${base}${path}`, { ...init, headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}`, ...(init.headers ?? {}) } })
  let body: any = null
  try { body = await res.json() } catch { /* not json */ }
  if (!res.ok || !body?.success) throw new LetterheadError(body?.error?.code ?? 'ERROR', body?.error?.message ?? `Something went wrong (${res.status}).`, res.status)
  return body.data as T
}

export const letterhead = {
  get: (t: string) => call<LetterheadState>('/letterhead', '', t),
  preview: (t: string, d: Partial<Details>) => call<{ html: string; css: string; missing: string[] }>('/letterhead', '/preview', t, { method: 'POST', body: JSON.stringify(d) }),
  save: (t: string, d: Partial<Details>) => call<{ saved: boolean; details: Details; missing: string[] }>('/letterhead', '', t, { method: 'PUT', body: JSON.stringify(d) }),
}

export const signatures = {
  me: (t: string) => call<SignatureMeta>('/signatures', '/me', t),
  save: (t: string, image: string) => call<SignatureMeta & { saved: boolean }>('/signatures', '/me', t, { method: 'PUT', body: JSON.stringify({ image }) }),
  remove: (t: string) => call<{ deleted: boolean }>('/signatures', '/me', t, { method: 'DELETE' }),
  list: (t: string) => call<{ signatures: Array<{ user_id: string; name: string; job_role: string | null; updated_at: string }> }>('/signatures', '', t),
  removeFor: (t: string, userId: string) => call<{ deleted: boolean }>('/signatures', `/${encodeURIComponent(userId)}`, t, { method: 'DELETE' }),
  /** MY picture, as an object URL for my own editor preview. Never cached. */
  async image(t: string): Promise<string | null> {
    const res = await fetch(`${API_URL}/signatures/me/image`, { headers: { Authorization: `Bearer ${t}` }, cache: 'no-store' })
    if (!res.ok) return null
    return URL.createObjectURL(await res.blob())
  },
}

/** Is the letterhead feature on for this person's account (the pilot)? null while loading. */
export function useLetterheadAvailable(): boolean | null {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [on, setOn] = useState<boolean | null>(null)
  useEffect(() => {
    if (!token) return
    let live = true
    letterhead.get(token).then(() => { if (live) setOn(true) }).catch(() => { if (live) setOn(false) })
    return () => { live = false }
  }, [token])
  return on
}

/** Can this person add a signature (an administrator or a manager on a pilot account)? null while loading. */
export function useSignatureAvailable(): { on: boolean | null; meta: SignatureMeta | null; reload: () => void } {
  const { data: session } = useSession()
  const token = (session as any)?.accessToken as string | undefined
  const [state, setState] = useState<{ on: boolean | null; meta: SignatureMeta | null }>({ on: null, meta: null })
  const [n, setN] = useState(0)
  useEffect(() => {
    if (!token) return
    let live = true
    signatures.me(token).then(m => { if (live) setState({ on: true, meta: m }) }).catch(() => { if (live) setState({ on: false, meta: null }) })
    return () => { live = false }
  }, [token, n])
  return { ...state, reload: () => setN(x => x + 1) }
}
