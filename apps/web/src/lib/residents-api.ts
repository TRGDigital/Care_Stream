// "This is me" resident profiles: types and API calls. Admin side (knowledge base overlay), hub side (staff tab)
// and the public family form all use this one file, so the three screens cannot drift from the API.
//
// Plans: Professional and Enterprise. Every call can answer 403 FEATURE_NOT_AVAILABLE on a lower plan.
// Family answers NEVER reach staff until an admin approves them (contribution status 'approved').

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export type ResidentStatus = 'living' | 'left' | 'deceased'
export type InviteStatus = 'sent' | 'opened' | 'submitted' | 'expired' | 'revoked'
export type ContributionStatus = 'pending' | 'approved' | 'rejected'

/** One section of a profile. Defined by the API (GET /residents/meta) so the labels live in one place. */
export interface ResidentSectionDef {
  key: string
  label: string        // "Likes"
  help: string         // hint for the admin writing it
  family_prompt: string // the question a family member is asked on the form
}

export interface ResidentArchiveState {
  confirmed_at: string | null
  confirmed_by: string | null
  family_contacts_removed_at: string | null
  memory_book: 'undecided' | 'shared' | 'declined'
  memory_book_at: string | null
  note: string | null
  /** Admins who hold the "resident archive" permission when the resident was archived (they get the task). */
  assignee_emails: string[]
}

export interface Resident {
  id: string
  first_name: string
  last_name: string
  preferred_name: string | null
  dob: string | null            // YYYY-MM-DD
  room: string | null
  status: ResidentStatus
  status_at: string | null      // date of death / leaving, set when archived
  sections: Record<string, string>   // approved content only, keyed by ResidentSectionDef.key
  filled_count: number          // sections with content (for a "profile is thin" hint)
  pending_count: number         // family answers waiting for approval
  invite_count: number
  updated_at: string
  archived_at: string | null
  retention_until: string | null // YYYY-MM-DD, seven years after archiving unless changed
  archive: ResidentArchiveState | null
}

export interface ResidentInvite {
  id: string
  email: string
  name: string
  relationship: string
  status: InviteStatus
  sent_at: string
  expires_at: string
  opened_at: string | null
  submitted_at: string | null
}

export interface ResidentContribution {
  id: string
  invite_id: string
  contributor_name: string
  relationship: string
  section_key: string
  text: string                  // exactly what the family member wrote
  status: ContributionStatus
  submitted_at: string
  decided_at: string | null
  decided_by: string | null
  approved_text: string | null  // what was published, if the admin edited it before approving
}

export interface ResidentDetail extends Resident {
  invites: ResidentInvite[]
  contributions: ResidentContribution[]
}

export interface ResidentInput {
  first_name: string
  last_name: string
  preferred_name?: string | null
  dob?: string | null
  room?: string | null
  sections?: Record<string, string>
}

/** What a staff member sees in the hub tab. Living residents only, approved content only. */
export interface HubResident {
  id: string
  display_name: string
  first_name: string
  preferred_name: string | null
  age: number | null
  room: string | null
  sections: Record<string, string>
  updated_at: string
}

/** What a family member sees on the public form. */
export interface FamilyForm {
  resident_name: string          // preferred name, else first name
  home_name: string
  invitee_name: string
  expires_at: string
  already_submitted: boolean
  sections: ResidentSectionDef[]
}

async function call<T>(path: string, token: string | null, init: RequestInit = {}): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}), ...(init.headers as Record<string, string> | undefined ?? {}) },
  })
  let body: any = null
  try { body = await res.json() } catch { /* leave null */ }
  if (res.status === 401 && token && typeof window !== 'undefined') {
    window.location.href = `/login?callbackUrl=${encodeURIComponent(window.location.pathname + window.location.search)}`
    throw new Error('Session expired. Please sign in again.')
  }
  if (!res.ok || !body?.success) {
    const e: any = new Error(body?.error?.message ?? `Request failed (${res.status})`)
    e.code = body?.error?.code; e.status = res.status
    throw e
  }
  return body.data as T
}

export function createResidentsClient(token: string) {
  const j = (v: unknown) => JSON.stringify(v)
  return {
    /** Section definitions plus what this admin may do. enabled is false on plans without the feature. */
    meta: () => call<{ enabled: boolean; sections: ResidentSectionDef[]; can_manage_archive: boolean; retention_years: number }>('/residents/meta', token),
    /** scope 'current' = living residents; 'archived' = left or deceased (needs the resident archive permission). */
    list: (scope: 'current' | 'archived' = 'current') => call<{ residents: Resident[] }>(`/residents?scope=${scope}`, token),
    create: (data: ResidentInput) => call<Resident>('/residents', token, { method: 'POST', body: j(data) }),
    get: (id: string) => call<ResidentDetail>(`/residents/${id}`, token),
    update: (id: string, data: Partial<ResidentInput>) => call<Resident>(`/residents/${id}`, token, { method: 'PATCH', body: j(data) }),

    /** Marks the resident as having died or moved on. Immediately removes them from the hub and the assistant, cancels family links, and starts the archive task. */
    setStatus: (id: string, data: { status: 'left' | 'deceased'; date?: string; note?: string }) =>
      call<Resident>(`/residents/${id}/status`, token, { method: 'POST', body: j(data) }),

    invite: (id: string, data: { email: string; name: string; relationship: string }) =>
      call<ResidentInvite>(`/residents/${id}/invites`, token, { method: 'POST', body: j(data) }),
    resendInvite: (id: string, inviteId: string) => call<ResidentInvite>(`/residents/${id}/invites/${inviteId}/resend`, token, { method: 'POST' }),
    revokeInvite: (id: string, inviteId: string) => call<{ revoked: boolean }>(`/residents/${id}/invites/${inviteId}`, token, { method: 'DELETE' }),

    /** Approve (optionally with edited text) or reject one family answer. Approving publishes it to the hub. */
    decide: (id: string, contributionId: string, data: { decision: 'approve' | 'reject'; text?: string }) =>
      call<ResidentContribution>(`/residents/${id}/contributions/${contributionId}/decision`, token, { method: 'POST', body: j(data) }),

    // Archive actions (admins with the resident archive permission only)
    confirmArchive: (id: string, data: { memory_book: 'shared' | 'declined'; note?: string; remove_family_contacts?: boolean }) =>
      call<Resident>(`/residents/${id}/archive/confirm`, token, { method: 'POST', body: j(data) }),
    setRetention: (id: string, retention_until: string) =>
      call<Resident>(`/residents/${id}/archive/retention`, token, { method: 'POST', body: j({ retention_until }) }),
    /** Plain text copy of the profile, for a memory book or the record. Logged. */
    exportText: (id: string) => call<{ filename: string; text: string }>(`/residents/${id}/archive/export`, token),
    /** Permanent deletion of an archived profile. Before retention_until the API demands confirm and a reason. */
    deleteArchived: (id: string, data: { confirm: true; reason?: string }) =>
      call<{ deleted: boolean }>(`/residents/${id}`, token, { method: 'DELETE', body: j(data) }),
    archiveAccess: {
      get: () => call<{ admins: Array<{ id: string; name: string; email: string; has_access: boolean }> }>('/residents/archive-access', token),
      set: (user_ids: string[]) => call<{ saved: boolean }>('/residents/archive-access', token, { method: 'PUT', body: j({ user_ids }) }),
    },

    /** The staff view: living residents with approved content. enabled is false when the plan lacks it or there are no profiles. */
    hub: () => call<{ enabled: boolean; section_defs: ResidentSectionDef[]; residents: HubResident[] }>('/residents/hub', token),
  }
}

// Public family form (no sign in; the link token is the key)
export const getFamilyForm = (token: string) => call<FamilyForm>(`/public/family/${encodeURIComponent(token)}`, null)
export const submitFamilyForm = (token: string, data: { name: string; relationship: string; answers: Record<string, string> }) =>
  call<{ submitted: number }>(`/public/family/${encodeURIComponent(token)}`, null, { method: 'POST', body: JSON.stringify(data) })
