// Typed fetch client for the CareStreamAI API.
// All requests attach the NextAuth access token as Bearer.
// Response envelope: { success, data } | { success: false, error: { code, message } }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Turn a relative API asset path (e.g. /public/training/image/uuid.webp) into a
// fully-qualified URL the browser can load. Passes through absolute URLs.
export function apiAssetUrl(path?: string | null): string | null {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`
}

export interface StaffContact {
  login_url:       string
  inbound_email:   string | null
}

// Monthly annual-training-module allocation usage (the per-plan licence pool).
export interface LicenseUsage {
  used:      number
  limit:     number | null   // null = unlimited (Enterprise)
  remaining: number | null
  resets_at: string
}

// Plan feature flags + licence usage, used to grey out / unlock features.
export interface PlanFeatures {
  plan_name:              string | null
  price_monthly_pence:    number | null
  price_annual_pence:     number | null
  has_advanced_analytics: boolean
  has_cqc_report:         boolean
  has_gap_detection:      boolean
  has_face_to_face:       boolean
  has_custom_audits:      boolean
  has_effectiveness:      boolean
  has_training_impact:    boolean
  has_workforce_compliance: boolean
  annual_license:         LicenseUsage
}

// A workforce compliance credential (DBS / right to work / registration / reference).
export interface Credential {
  present:    boolean
  reference:  string | null
  issued_at:  string | null
  expires_at: string | null
  notes:      string | null
  status:     string
  document:   { name: string; type: string; size: number; uploaded_at: string } | null
}

// Supervision / appraisal: the derived latest+next cell, and a full record.
export interface SupCell { last_on: string | null; conducted_by: string | null; next_on: string | null; next_due: string | null; status: string }
export interface SupRecord { id: string; type: string; held_on: string; conducted_by: string | null; next_due: string | null; notes: string | null }

export interface TranslationSuggestion {
  id: string
  lang_code: string
  lang_name: string
  source_text: string
  machine_text: string
  suggested_text: string
  content_kind: string
  context_label: string
  status: 'pending' | 'approved' | 'rejected'
  suggested_by_name: string
  reviewed_by: string
  reviewed_at: string | null
  created_at: string
  updated_at: string
}

export interface Citation {
  policy_id:         string
  policy_name:       string
  version:           number
  document_category: string
}

// A CareStream-provided reference (platform Knowledge Base guidance) that helped
// ground an answer — surfaced as a labelled source, with no policy to open.
export interface SeedSource {
  name: string
}

// An external regulation/reference (from /platform/regulations) that the grounding
// policies quote — surfaced as a labelled source linking to the official text.
export interface ReferenceSource {
  name: string
  url?: string
}

// A manually-added home knowledge entry that grounded an answer — surfaced as
// its own labelled source, distinct from CareStream platform guidance.
export interface ManualSource {
  name: string
}

export interface KnowledgeEntry {
  id:                 string
  tenant_id:          string
  question:           string
  answer:             string
  source_type:        string
  source_id:          string | null
  source_name:        string
  knowledge_category: string
  vector_id:          string | null
  approved:           boolean
  approved_at:        string | null
  approved_by:        string | null
  created_at:         string
  updated_at:         string
}

export interface QueryResponse {
  queryId:            string | null
  responseHtml:       string
  intentType:         string
  citations:          Citation[]
  seedSources?:       SeedSource[]
  manualSources?:     ManualSource[]
  referenceSources?:  ReferenceSource[]
  noMatch:            boolean
  languageDetected:   string
  responseTimeMs:     number
  suggestedQuestions?: string[]
}

async function apiFetch<T>(
  path:    string,
  token:   string,
  options: RequestInit = {},
): Promise<T> {
  const isFormData = options.body instanceof FormData
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      ...(isFormData ? {} : { 'Content-Type': 'application/json' }),
      Authorization: `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined ?? {}),
    },
  })
  const body = await res.json()
  if (res.status === 401) {
    if (typeof window !== 'undefined') window.location.href = '/login'
    throw new Error('Session expired. Please sign in again.')
  }
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? `API error ${res.status}`)
  }
  return body.data as T
}

export function createApiClient(token: string) {
  return {
    query: {
      send: (data: { query_text: string; policy_id?: string; staff_name?: string; document_category?: 'internal_policy' | 'staff_handbook' | 'training_module' | 'cqc_report' | 'audit_report' | 'business_continuity'; chat_session_id?: string; language?: string; conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }> }) =>
        apiFetch<QueryResponse>('/query', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params) : ''
        return apiFetch<any>(`/query${qs}`, token)
      },
      session: (sessionId: string) =>
        apiFetch<{ messages: any[] }>(`/query/session/${sessionId}`, token),
      deleteSession: (sessionId: string) =>
        apiFetch<{ deleted: boolean }>(`/query/session/${sessionId}/delete`, token, { method: 'PATCH' }),
      feedback: (queryId: string, rating: 'positive' | 'negative') =>
        apiFetch<{ saved: boolean }>(`/query/${queryId}/feedback`, token, { method: 'POST', body: JSON.stringify({ rating }) }),
      // Translate the starter questions into the staff member's first language.
      suggested: (questions: string[]) =>
        apiFetch<{ questions: string[] }>('/query/suggested', token, { method: 'POST', body: JSON.stringify({ questions }) }),
      // Role-linked, rotating starter questions for a new chat in the given topic.
      starters: (category: string) =>
        apiFetch<{ questions: string[] }>(`/query/starters?category=${encodeURIComponent(category)}`, token),
      // Re-render an already-generated answer in another language (for the chat
      // language toggle) — works both directions, including back to English.
      translate: (html: string, language: string) =>
        apiFetch<{ html: string }>('/query/translate', token, { method: 'POST', body: JSON.stringify({ html, language }) }),
      // Stream the answer paragraph by paragraph (SSE). Calls onParagraph as each block
      // arrives, then onDone with the final payload (citations, suggestions, etc.).
      stream: async (
        data: { query_text: string; policy_id?: string; staff_name?: string; document_category?: 'internal_policy' | 'staff_handbook' | 'training_module' | 'cqc_report' | 'audit_report' | 'business_continuity'; chat_session_id?: string; language?: string; conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }> },
        handlers: { onParagraph: (html: string) => void; onDone: (d: { html: string; citations?: Citation[]; seedSources?: SeedSource[]; manualSources?: ManualSource[]; referenceSources?: ReferenceSource[]; suggestedQuestions?: string[]; queryId?: string; languageDetected?: string; noMatch?: boolean }) => void; onError: (msg: string) => void },
      ): Promise<void> => {
        const res = await fetch(`${API_URL}/query/stream`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify(data),
        })
        if (res.status === 401) { if (typeof window !== 'undefined') window.location.href = '/login'; throw new Error('Session expired.') }
        if (!res.ok || !res.body) { handlers.onError('Could not start the answer.'); return }
        const reader = res.body.getReader()
        const decoder = new TextDecoder()
        let buf = ''
        for (;;) {
          const { done, value } = await reader.read()
          if (done) break
          buf += decoder.decode(value, { stream: true })
          let i: number
          while ((i = buf.indexOf('\n\n')) !== -1) {
            const raw = buf.slice(0, i); buf = buf.slice(i + 2)
            const line = raw.startsWith('data: ') ? raw.slice(6) : raw.trim()
            if (!line) continue
            let ev: { type?: string; html?: string; error?: string; [k: string]: unknown }
            try { ev = JSON.parse(line) } catch { continue }
            if (ev.type === 'paragraph' && ev.html) handlers.onParagraph(ev.html)
            else if (ev.type === 'done') handlers.onDone(ev as never)
            else if (ev.type === 'error') handlers.onError(String(ev.error ?? 'Something went wrong.'))
          }
        }
      },
    },

    policies: {
      list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params) : ''
        return apiFetch<any>(`/policies${qs}`, token)
      },
      upload: (formData: FormData) =>
        fetch(`${API_URL}/policies`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        }).then(r => r.json()),
      archive: (id: string) =>
        apiFetch<any>(`/policies/${id}`, token, { method: 'DELETE' }),
      update: (id: string, data: { generic_onboarding?: boolean }) =>
        apiFetch<{ policy: any }>(`/policies/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      version: (id: string, formData: FormData) =>
        fetch(`${API_URL}/policies/${id}/version`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        }).then(r => r.json()),
      bulkUpload: (formData: FormData) =>
        fetch(`${API_URL}/policies/bulk`, {
          method:  'POST',
          headers: { Authorization: `Bearer ${token}` },
          body:    formData,
        }).then(r => r.json()).then((b: any) => b?.data ?? null),  // unwrap { results, errors, skipped, total }
      check: (files: Array<{ filename: string; name: string; hash: string }>) =>
        apiFetch<{ checks: Array<{ filename: string; classification: 'new' | 'exact_duplicate' | 'name_match'; existing?: { id: string; name: string; version: number } }> }>(
          '/policies/check', token, { method: 'POST', body: JSON.stringify({ files }) }
        ),
      retry: (id: string) =>
        apiFetch<any>(`/policies/${id}/retry`, token, { method: 'POST' }),
      permanentDelete: (id: string) =>
        apiFetch<any>(`/policies/${id}/delete`, token, { method: 'POST' }),
      duplicates: () =>
        apiFetch<{ duplicates: Array<{ id: string; name: string; document_category: string; version: number; created_at: string; score: number; match: { id: string; name: string; version: number; created_at: string; status: string } }> }>(
          '/policies/duplicates', token
        ),
      resolveDuplicate: (id: string, action: 'keep_both' | 'replace' | 'cancel') =>
        apiFetch<{ resolved: boolean; action: string }>(`/policies/${id}/duplicate/resolve`, token, { method: 'POST', body: JSON.stringify({ action }) }),
      similarNamed: () =>
        apiFetch<{ notes: Array<{ id: string; name: string; matched_name: string; content_pct: number | null }> }>('/policies/similar-named', token),
      dismissSimilarNamed: (id: string) =>
        apiFetch<{ dismissed: boolean }>(`/policies/${id}/similar-named/dismiss`, token, { method: 'POST' }),
      backfillSignatures: (limit = 40) =>
        apiFetch<{ done: number; remaining: number }>('/policies/backfill-signatures', token, { method: 'POST', body: JSON.stringify({ limit }) }),
      preview: (id: string) =>
        apiFetch<{ policy_id: string; name: string; status: string; cached: boolean; html: string; raw: string; has_raw: boolean }>(`/policies/${id}/preview`, token),
    },

    users: {
      list: () => apiFetch<any>('/users', token),
      get: (id: string) =>
        apiFetch<{
          user: any
          training: Array<{ id: string; status: string; completed_at: string | null; due_date: string | null; expires_at: string | null; module_id: string; module_name: string; category: string }>
          onboarding: Array<{ id: string; completed_at: string | null; due_date: string | null; enrolled_at: string | null; flow_id: string; flow_name: string; flow_kind: string; care_setting: string | null; total_steps: number; completed_steps: number }>
        }>(`/users/${id}`, token),
      record: (id: string) => apiFetch<any>(`/users/${id}/record`, token),
      remind: (id: string) => apiFetch<{ reminded: boolean; modules: number }>(`/users/${id}/remind`, token, { method: 'POST' }),
      markFollowedUp: (id: string, note?: string) => apiFetch<{ reviewed: boolean; at: string; by: string | null }>(`/users/${id}/follow-up/review`, token, { method: 'POST', body: JSON.stringify({ note }) }),
      markPractical: (id: string, enrollmentId: string, data: { signed: boolean; note?: string }) =>
        apiFetch<{ practical: { practical_signed: boolean; practical_signed_by: string | null; practical_signed_at: string | null; practical_note: string | null } }>(`/users/${id}/annual-training/${enrollmentId}/practical`, token, { method: 'POST', body: JSON.stringify(data) }),
      invite: (data: { email: string; name: string; role: string; job_role?: string; specialisms?: string[]; audit_template_ids?: string[]; phone_number?: string; shift_type?: 'any' | 'day' | 'night'; training_hourly_rate?: number | null; first_language?: string; second_language?: string; comms_always_first_language?: boolean; allow_language_switching?: boolean; new_starter?: boolean }) =>
        apiFetch<{ user: any; temp_password: string; contact: StaffContact; onboarding_enrolled?: number; new_starter?: boolean }>('/users/invite', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      update: (id: string, data: { name?: string; job_role?: string | null; specialisms?: string[]; role?: string; audit_template_ids?: string[]; phone_number?: string | null; shift_type?: 'any' | 'day' | 'night'; training_hourly_rate?: number | null; first_language?: string; second_language?: string | null; comms_always_first_language?: boolean; allow_language_switching?: boolean; can_suggest_translations?: boolean }) =>
        apiFetch<{ user: any }>(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deactivate: (id: string) =>
        apiFetch<{ deactivated: boolean }>(`/users/${id}/deactivate`, token, { method: 'POST' }),
      reactivate: (id: string) =>
        apiFetch<{ reactivated: boolean }>(`/users/${id}/reactivate`, token, { method: 'POST' }),
      resetPassword: (id: string) =>
        apiFetch<{ user: { id: string; name: string; email: string }; temp_password: string; contact: StaffContact }>(
          `/users/${id}/reset-password`, token, { method: 'POST' }
        ),
      loginLink: (id: string, sendEmail: boolean) =>
        apiFetch<{ url: string; expires_at: string; emailed: boolean }>(`/users/${id}/login-link`, token, {
          method: 'POST', body: JSON.stringify({ send_email: sendEmail }),
        }),
      sendCredentials: (id: string, tempPassword: string) =>
        apiFetch<{ sent: boolean }>(`/users/${id}/send-credentials`, token, {
          method: 'POST',
          body:   JSON.stringify({ temp_password: tempPassword }),
        }),
    },

    billing: {
      portal: () => apiFetch<{ url: string }>('/billing/portal', token),
      summary: () => apiFetch<{
        plan_name:            string | null
        subscription_status:  string
        price_monthly_pence:  number | null
        price_annual_pence:   number | null
        monthly_query_limit:  number | null
        has_stripe:           boolean
        next_billing_date:    string | null
        current_period_start: string | null
        current_period_end:   string | null
        billing_interval:     string | null
        cancel_at_period_end?: boolean
        features:             PlanFeatures
      }>('/billing/summary', token),
      invoices: () => apiFetch<{ invoices: Array<{
        id:           string
        date:         string
        description:  string
        amount_pence: number
        status:       string
        pdf_url:      string | null
        hosted_url:   string | null
      }> }>('/billing/invoices', token),
      plans: () => apiFetch<{ plans: Array<{
        id: string; name: string; price_monthly_pence: number; price_annual_pence: number | null; monthly_query_limit: number
        max_policies: number | null; max_staff_users: number | null; max_handbooks: number | null
        max_manual_knowledge_entries: number | null; monthly_ai_credit_limit: number | null; monthly_annual_license_limit: number | null
        has_advanced_analytics: boolean; has_cqc_report: boolean; has_gap_detection: boolean
        has_face_to_face: boolean; has_custom_audits: boolean; has_effectiveness: boolean; has_training_impact: boolean
      }> }>('/billing/plans', token),
      checkout: (plan_id: string, interval: 'month' | 'year' = 'month') =>
        apiFetch<{ url: string }>('/billing/checkout', token, { method: 'POST', body: JSON.stringify({ plan_id, interval }) }),
      sync: () =>
        apiFetch<{ needs_billing: boolean; subscription_status: string | null }>('/billing/sync', token, { method: 'POST' }),
      closeAccount: () =>
        apiFetch<{ closed: boolean; deactivated_users: number }>('/billing/close-account', token, { method: 'POST' }),
    },

    settings: {
      get: () => apiFetch<{ inbound_email: string; account_number: string; policy_sections: string[]; policy_categories: string[]; email_allowlist: string[]; phone_allowlist: string[]; facility_type: string; service_profile: Record<string, boolean>; service_triggers: Array<{ key: string; label: string; desc: string }>; logo_url: string | null; email_preferences: Record<string, boolean>; staff_roles: string[]; specialist_roles: string[]; response_style: 'standard' | 'concise'; branding_signoff: string; languages?: Array<{ code: string; name: string }>; default_language_codes?: string[]; language_catalog?: Array<{ code: string; name: string }>; translation_glossary?: Array<{ term: string; keep: boolean; note: string }>; glossary_excludes?: string[]; platform_glossary?: Array<{ term: string; keep: boolean; note: string }>; translation_suggestions_auto_approve?: boolean; room_count?: number }>('/settings', token),
      update: (data: { email_allowlist?: string[]; phone_allowlist?: string[]; facility_type?: string; service_profile?: Record<string, boolean>; email_preferences?: Record<string, boolean>; staff_roles?: string[]; specialist_roles?: string[]; policy_sections?: string[]; policy_categories?: string[]; response_style?: 'standard' | 'concise'; branding_signoff?: string; add_language?: string; remove_language?: string; translation_glossary?: Array<{ term: string; keep?: boolean; note?: string; exclude?: boolean }>; translation_suggestions_auto_approve?: boolean; room_count?: number }) =>
        apiFetch<{ email_allowlist: string[]; phone_allowlist: string[]; facility_type: string; email_preferences: Record<string, boolean>; staff_roles: string[]; specialist_roles: string[]; policy_sections: string[]; policy_categories: string[]; response_style: 'standard' | 'concise'; languages?: Array<{ code: string; name: string }>; added_language?: { code: string; name: string; resolved: boolean } | null; translation_glossary?: Array<{ term: string; keep: boolean; note: string }>; glossary_excludes?: string[]; room_count?: number }>('/settings', token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
      sendKnowledgeGapDigest: () =>
        apiFetch<{ digest_sent: boolean; refreshers: number }>('/settings/knowledge-gap-digest/send', token, { method: 'POST' }),
      translationSuggestions: (status?: string) =>
        apiFetch<{ suggestions: TranslationSuggestion[]; pending_count: number }>(`/translation-suggestions${status ? `?status=${status}` : ''}`, token),
      reviewTranslationSuggestion: (id: string, data: { action?: 'approve' | 'reject' | 'pending'; suggested_text?: string }) =>
        apiFetch<{ suggestion: TranslationSuggestion }>(`/translation-suggestions/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deleteTranslationSuggestion: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/translation-suggestions/${id}`, token, { method: 'DELETE' }),
      sendComplianceExpiryAlerts: () =>
        apiFetch<{ sent: boolean; expiring: number; expired: number; recipients: number; passport_staff: number }>('/settings/compliance-expiry/send', token, { method: 'POST' }),
      uploadLogo: (file: File) => {
        const form = new FormData()
        form.append('logo', file)
        return apiFetch<{ logo_url: string }>('/settings/logo', token, {
          method:  'POST',
          body:    form,
          headers: {},  // let browser set Content-Type with boundary
        })
      },
      deleteLogo: () =>
        apiFetch<{ logo_url: null }>('/settings/logo', token, { method: 'DELETE' }),
    },

    knowledge: {
      list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params) : ''
        return apiFetch<{ entries: KnowledgeEntry[]; total: number; page: number; limit: number }>(`/knowledge${qs}`, token)
      },
      create: (data: { question: string; answer: string; source_name?: string; knowledge_category?: string }) =>
        apiFetch<KnowledgeEntry>('/knowledge', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      update: (id: string, data: { question?: string; answer?: string; source_name?: string; knowledge_category?: string }) =>
        apiFetch<KnowledgeEntry>(`/knowledge/${id}`, token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
      delete: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/knowledge/${id}`, token, { method: 'DELETE' }),
      generate: (policyId: string) =>
        apiFetch<{ policy_id: string; entries_generated: number }>(`/knowledge/generate/${policyId}`, token, { method: 'POST' }),
      generateAll: () =>
        apiFetch<{ generated: number; policies: number }>('/knowledge/generate-all', token, { method: 'POST' }),
      deleteForPolicy: (policyId: string) =>
        apiFetch<{ deleted: boolean }>(`/knowledge/policy/${policyId}`, token, { method: 'DELETE' }),
      approve: (id: string) =>
        apiFetch<KnowledgeEntry>(`/knowledge/${id}/approve`, token, { method: 'PATCH' }),
      dedup: () =>
        apiFetch<{ removed: number; remaining: number }>('/knowledge/dedup', token, { method: 'POST' }),
    },

    sites: {
      list: () =>
        apiFetch<{
          sites: Array<{
            id: string; name: string; slug: string
            subscription_status: string; is_current: boolean; is_root: boolean
          }>
          group_root_id: string
        }>('/sites', token),

      create: (data: { name: string }) =>
        apiFetch<{ tenant: { id: string; name: string; slug: string }; access_token: string; refresh_token: string }>(
          '/sites', token, { method: 'POST', body: JSON.stringify(data) }
        ),

      switch: (tenantId: string) =>
        apiFetch<{ access_token: string; refresh_token: string; tenant: { id: string; name: string }; user: { id: string; name: string; email: string } }>(
          '/auth/switch-site', token, { method: 'POST', body: JSON.stringify({ tenant_id: tenantId }) }
        ),

      overview: () =>
        apiFetch<{
          group_root_id: string
          current_tenant_id: string
          is_group: boolean
          summary: { sites: number; staff: number; training_pct: number | null; onboarding_pct: number | null; audit_pct: number | null; overall_pct: number | null }
          sites: Array<{
            id: string; name: string; account_number: string; subscription_status: string
            is_current: boolean; is_root: boolean; staff: number
            training:   { complete: number; total: number; pct: number | null }
            onboarding: { complete: number; total: number; overdue: number; pct: number | null }
            audits:     { completed: number; total: number; pct: number | null }
            overdue: number; overall_pct: number | null
          }>
        }>('/sites/overview', token),
    },

    workforce: {
      register: () =>
        apiFetch<{
          types: string[]
          total_staff: number
          summary: { valid: number; expiring: number; expired: number; missing: number; documents: number }
          staff: Array<{ id: string; name: string; job_role: string | null; credentials: Record<string, Credential> }>
        }>('/workforce/register', token),
      staff: (userId: string) =>
        apiFetch<{ user: { id: string; name: string; job_role: string | null }; types: string[]; credentials: Record<string, Credential> }>(`/workforce/staff/${userId}`, token),
      saveCredential: (userId: string, type: string, data: { reference?: string; issued_at?: string | null; expires_at?: string | null; notes?: string }) =>
        apiFetch<{ credential: Credential }>(`/workforce/staff/${userId}/credentials/${type}`, token, { method: 'PUT', body: JSON.stringify(data) }),
      deleteCredential: (userId: string, type: string) =>
        apiFetch<{ deleted: boolean }>(`/workforce/staff/${userId}/credentials/${type}`, token, { method: 'DELETE' }),
      uploadDocument: (userId: string, type: string, file: File) => {
        const fd = new FormData(); fd.append('file', file)
        return apiFetch<{ credential: Credential }>(`/workforce/staff/${userId}/credentials/${type}/document`, token, { method: 'POST', body: fd })
      },
      documentUrl: (userId: string, type: string) => `${API_URL}/workforce/staff/${userId}/credentials/${type}/document`,
      downloadDocument: async (userId: string, type: string): Promise<Blob> => {
        const r = await fetch(`${API_URL}/workforce/staff/${userId}/credentials/${type}/document`, { headers: { Authorization: `Bearer ${token}` } })
        if (!r.ok) throw new Error('Could not fetch the document.')
        return r.blob()
      },
      deleteDocument: (userId: string, type: string) =>
        apiFetch<{ deleted: boolean }>(`/workforce/staff/${userId}/credentials/${type}/document`, token, { method: 'DELETE' }),
      supervisions: () =>
        apiFetch<{
          types: string[]; total_staff: number
          summary: { supervisions_overdue: number; appraisals_overdue: number; no_supervision: number; no_appraisal: number }
          staff: Array<{ id: string; name: string; job_role: string | null; supervision: SupCell; appraisal: SupCell }>
        }>('/workforce/supervisions', token),
      staffSupervisions: (userId: string) =>
        apiFetch<{ user: { id: string; name: string; job_role: string | null }; records: SupRecord[] }>(`/workforce/staff/${userId}/supervisions`, token),
      addSupervision: (userId: string, data: { type: string; held_on: string; conducted_by?: string; next_due?: string | null; notes?: string }) =>
        apiFetch<{ record: SupRecord }>(`/workforce/staff/${userId}/supervisions`, token, { method: 'POST', body: JSON.stringify(data) }),
      deleteSupervision: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/workforce/supervisions/${id}`, token, { method: 'DELETE' }),
    },

    onboarding: {
      listFlows: () =>
        apiFetch<{ flows: any[] }>('/onboarding/flows', token),
      listTemplates: () =>
        apiFetch<{ templates: Array<{ id: string; name: string; description: string | null; flow_kind: string; job_roles: string[]; step_count: number; read_count: number; question_count: number; already_adopted: boolean }> }>('/onboarding/templates', token),
      adoptTemplate: (id: string) =>
        apiFetch<{ flow: any; unmapped: number }>(`/onboarding/templates/${id}/adopt`, token, { method: 'POST' }),
      // Generic onboarding policies → allocatable one-step read-policy flows.
      listGenericPolicies: () =>
        apiFetch<{ policies: Array<{ id: string; name: string; document_category: string; already_adopted: boolean }> }>('/onboarding/generic-policies', token),
      adoptGenericPolicy: (policyId: string) =>
        apiFetch<{ flow: any; already: boolean }>(`/onboarding/generic-policies/${policyId}/adopt`, token, { method: 'POST' }),
      createFlow: (data: { name: string; description?: string; job_roles?: string[]; steps?: Array<{ title: string; type: string; policy_id?: string; policy_section?: string | null; question?: string; options?: string[]; correct_option?: number | null }> }) =>
        apiFetch<{ flow: any }>('/onboarding/flows', token, { method: 'POST', body: JSON.stringify(data) }),
      questionFeedback: (data: { flow_id?: string; step_id?: string; question: string; rating: 'good' | 'not_relevant' | 'not_good'; comment?: string }) =>
        apiFetch<{ recorded: boolean }>('/onboarding/question-feedback', token, { method: 'POST', body: JSON.stringify(data) }),
      updateFlow: (id: string, data: { name?: string; description?: string; job_roles?: string[]; is_active?: boolean; steps?: Array<{ title: string; type: string; policy_id?: string; policy_section?: string | null; question?: string; options?: string[]; correct_option?: number | null }> }) =>
        apiFetch<{ flow: any }>(`/onboarding/flows/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deleteFlow: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/onboarding/flows/${id}`, token, { method: 'DELETE' }),
      generateQuestions: (policy_id: string, count = 3) =>
        apiFetch<{ questions: Array<{ question: string; options: string[]; correct_option: number }> }>(
          '/onboarding/generate-questions', token, { method: 'POST', body: JSON.stringify({ policy_id, count }) }
        ),
      enroll: (flowId: string, data: { user_ids: string[]; due_date?: string }) =>
        apiFetch<{ enrolled: number }>(`/onboarding/flows/${flowId}/enroll`, token, { method: 'POST', body: JSON.stringify(data) }),
      flowProgress: (flowId: string) =>
        apiFetch<{ flow: any; enrollments: any[] }>(`/onboarding/flows/${flowId}/progress`, token),
      matrix: () =>
        apiFetch<{
          flows: Array<{ id: string; name: string; flow_kind: string }>
          staff: Array<{ user_id: string; name: string; job_role: string | null; cells: Record<string, { status: 'complete' | 'in_progress' | 'not_started' | 'overdue'; steps_done: number; steps_total: number }> }>
        }>('/onboarding/matrix', token),
      myEnrollments: (lang?: '2') =>
        apiFetch<{ enrollments: any[]; lang_code?: string; can_suggest?: boolean }>(`/onboarding/my${lang ? `?lang=${lang}` : ''}`, token),
      completeStep: (enrollmentId: string, stepId: string, data?: { answer_text?: string }) =>
        apiFetch<{ progress: any; enrollment_complete: boolean }>(
          `/onboarding/enrollments/${enrollmentId}/steps/${stepId}/complete`,
          token, { method: 'POST', body: JSON.stringify(data ?? {}) }
        ),
    },

    training: {
      modules: () =>
        apiFetch<{ modules: Array<{ id: string; slug: string; name: string; description: string; category: string; sort_order: number; illustration_url: string | null; questions: Array<{ id: string; text: string }> }> }>('/training/modules', token),
      archivedModules: () =>
        apiFetch<{ modules: any[] }>('/training/modules/archived', token),
      setModuleArchived: (id: string, archived: boolean) =>
        apiFetch<{ module: any }>(`/training/modules/${id}/archive`, token, { method: 'POST', body: JSON.stringify({ archived }) }),

      compliance: () =>
        apiFetch<{
          users: Array<{ id: string; name: string; email: string; job_role: string | null }>
          enrollments: Array<{
            id: string; user_id: string; module_id: string; status: string
            completed_at: string | null; expires_at: string | null
            certificate_url: string | null; due_date: string | null
            daysUntilExpiry: number | null
            module: { id: string; slug: string; name: string; category: string; sort_order: number; source?: string; requires_practical?: boolean }
          }>
        }>('/training/compliance', token),

      enroll: (data: { user_ids: string[]; module_ids: string[]; due_date?: string }) =>
        apiFetch<{ enrolled: number }>('/training/enroll', token, { method: 'POST', body: JSON.stringify(data) }),

      // ── Training licences (training-only tier) ──
      licences: () => apiFetch<{
        licences: Array<{ id: string; module_slug: string; module_name: string; price_pence: number; currency: string; purchased_at: string; renewal_due_at: string; status: string; allocated_to: { id: string; name: string; email: string } | null }>
        staff: Array<{ id: string; name: string; email: string }>
        summary: { total: number; allocated: number; available: number; spent_pence: number }
      }>('/training/licences', token),
      purchases: () => apiFetch<{
        purchases: Array<{ stripe_payment_id: string | null; module_slug: string; module_name: string; currency: string; unit_pence: number; quantity: number; total_pence: number; purchased_at: string; renewal_due_at: string; status: string; receipt_url: string | null }>
      }>('/training/purchases', token),
      allocateLicence: (id: string, userId: string) =>
        apiFetch<{ allocated: boolean }>(`/training/licences/${id}/allocate`, token, { method: 'POST', body: JSON.stringify({ user_id: userId }) }),
      deallocateLicence: (id: string) =>
        apiFetch<{ deallocated: boolean }>(`/training/licences/${id}/deallocate`, token, { method: 'POST' }),

      // ── Annual training (AI catalogue) ──
      catalogue: () => apiFetch<{
        groups: Record<string, string>
        topics: Array<{ id: string; title: string; group_key: string; default_frequency: string; requires_practical: boolean; image_key: string | null; aliases: string[]; archived?: boolean; module: null | { id: string; name: string; approved: boolean; frequency: string; requires_practical: boolean; pass_mark: number; question_count: number; illustration_url: string | null }; standard_module: null | { id: string; name: string; approved: boolean; frequency: string; requires_practical: boolean; pass_mark: number; question_count: number; illustration_url: string | null } }>
      }>('/training/catalogue', token),
      generateModule: (topicId: string) =>
        apiFetch<{ module: any }>('/training/catalogue/generate', token, { method: 'POST', body: JSON.stringify({ topic_id: topicId }) }),
      setTopicArchived: (id: string, archived: boolean) =>
        apiFetch<{ topic_id: string; archived: boolean }>(`/training/catalogue/topics/${id}/archive`, token, { method: 'POST', body: JSON.stringify({ archived }) }),
      aiUsage: () => apiFetch<{ credits: { used: number; limit: number | null; remaining: number | null; resets_at: string }; queries: { used: number; limit: number | null; remaining: number | null; resets_at: string } }>('/training/ai-usage', token),
      moduleFull: (id: string) => apiFetch<{ module: any }>(`/training/modules/${id}/full`, token),
      standardModuleFull: (id: string) => apiFetch<{ module: {
        name: string; frequency: string | null; pass_mark: number | null; requires_practical: boolean; duration_minutes: number | null
        summary: string | null; outcomes: string[]; key_points: string[]
        sections: Array<{ heading: string; body: string; image_url: string | null }>
        questions: Array<{ text: string; options: string[]; correct: number | null; explanation: string | null }>
        standards: string[]; illustration_url: string | null
      } }>(`/training/standard-modules/${id}/full`, token),
      updateModule: (id: string, data: any) =>
        apiFetch<{ module: any }>(`/training/modules/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      approveModule: (id: string, approved = true) =>
        apiFetch<{ module: any }>(`/training/modules/${id}/approve`, token, { method: 'POST', body: JSON.stringify({ approved }) }),
      generateModuleImage: (id: string) =>
        apiFetch<{ illustration_url: string | null }>(`/training/modules/${id}/generate-image`, token, { method: 'POST' }),
      generateSectionImage: (id: string, index: number) =>
        apiFetch<{ image_url: string | null }>(`/training/modules/${id}/sections/${index}/generate-image`, token, { method: 'POST' }),

      getEnrollment: (id: string) =>
        apiFetch<{ enrollment: any }>(`/training/enrollments/${id}`, token),

      saveAnswer: (enrollmentId: string, data: { question_id: string; answer_text: string }) =>
        apiFetch<{ saved: boolean; is_correct: boolean; correct_option: number | null }>(
          `/training/enrollments/${enrollmentId}/answer`, token, { method: 'POST', body: JSON.stringify(data) }
        ),

      complete: (enrollmentId: string, data?: { certificate_url?: string }) =>
        apiFetch<{ enrollment: any }>(`/training/enrollments/${enrollmentId}/complete`, token, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      myEnrollments: (lang?: '2') =>
        apiFetch<{ enrollments: any[]; lang_code?: string; can_suggest?: boolean }>(`/training/my-enrollments${lang ? `?lang=${lang}` : ''}`, token),

      removeEnrollment: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/training/enrollments/${id}`, token, { method: 'DELETE' }),
      reset: (enrollmentId: string) =>
        apiFetch<{ enrollment: any }>(`/training/enrollments/${enrollmentId}/reset`, token, { method: 'POST' }),

      getSettings: () =>
        apiFetch<{ settings: { notifications_enabled?: boolean; notify_90d?: boolean; notify_30d?: boolean; notify_7d?: boolean; notify_manager?: boolean; question_trigger?: 'auto' | 'on_contact' } }>('/training/settings', token),

      updateSettings: (data: { notifications_enabled?: boolean; notify_90d?: boolean; notify_30d?: boolean; notify_7d?: boolean; notify_manager?: boolean; question_trigger?: 'auto' | 'on_contact' }) =>
        apiFetch<{ settings: any }>('/training/settings', token, { method: 'PATCH', body: JSON.stringify(data) }),

      updateModuleQuestions: (moduleId: string, questions: Array<{ id: string; text: string; options?: string[]; correct?: number }>) =>
        apiFetch<{ module: any }>(`/training/modules/${moduleId}/questions`, token, { method: 'PATCH', body: JSON.stringify({ questions }) }),

      lockModule: (moduleId: string) =>
        apiFetch<{ module: any }>(`/training/modules/${moduleId}/lock`, token, { method: 'POST' }),

      unlockModule: (moduleId: string) =>
        apiFetch<{ module: any }>(`/training/modules/${moduleId}/unlock`, token, { method: 'POST' }),

      moduleVersions: (moduleId: string) =>
        apiFetch<{ versions: Array<{ id: string; module_id: string; version: number; questions: any[]; created_at: string; created_by: string | null }> }>(
          `/training/modules/${moduleId}/versions`, token
        ),
      // All version history for the tenant's modules in one browser-cached call (keyed by module id).
      allModuleVersions: () =>
        apiFetch<{ versions: Record<string, Array<{ id: string; module_id: string; version: number; questions: any[]; created_at: string; created_by: string | null }>> }>(
          '/training/versions', token
        ),

      generateQuestions: (moduleId: string, count = 8) =>
        apiFetch<{ questions: Array<{ id: string; text: string; options: string[]; correct: number }> }>(
          `/training/modules/${moduleId}/generate-questions`, token, { method: 'POST', body: JSON.stringify({ count }) }
        ),

      generateLesson: (moduleId: string) =>
        apiFetch<{ module: any; reused_images: boolean }>(
          `/training/modules/${moduleId}/generate-lesson`, token, { method: 'POST' }
        ),

      modulePreview: (id: string) => apiFetch<{ module: {
        name: string; frequency: string | null; pass_mark: number | null; requires_practical: boolean; duration_minutes: number | null
        summary: string | null; outcomes: string[]; key_points: string[]
        sections: Array<{ heading: string; body: string; image_url: string | null }>
        questions: Array<{ text: string; options: string[]; correct: number | null; explanation: string | null }>
        standards: string[]; illustration_url: string | null
      } }>(`/training/modules/${id}/preview`, token),

      generateAnswers: (moduleId: string, questions: Array<{ id: string; text: string }>) =>
        apiFetch<{ questions: Array<{ id: string; text: string; options: string[]; correct: number }> }>(
          `/training/modules/${moduleId}/generate-answers`, token, { method: 'POST', body: JSON.stringify({ questions }) }
        ),

      deliveryRules: () =>
        apiFetch<{ rules: any[] }>('/training/delivery-rules', token),

      createDeliveryRule: (data: {
        name: string; module_id?: string; target_audience?: string; target_user_ids?: string[]
        days_of_week?: number[]; send_time?: string; questions_per_send?: number
        frequency_cap_day?: number | null; frequency_cap_week?: number | null
      }) =>
        apiFetch<{ rule: any }>('/training/delivery-rules', token, { method: 'POST', body: JSON.stringify(data) }),

      updateDeliveryRule: (id: string, data: Partial<{
        name: string; module_id: string | null; target_audience: string; target_user_ids: string[]
        days_of_week: number[]; send_time: string | null; questions_per_send: number
        frequency_cap_day: number | null; frequency_cap_week: number | null; is_active: boolean
      }>) =>
        apiFetch<{ rule: any }>(`/training/delivery-rules/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),

      deleteDeliveryRule: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/training/delivery-rules/${id}`, token, { method: 'DELETE' }),

      triggerRule: (id: string) =>
        apiFetch<{ sent_to: number; staff_names: string[] }>(`/training/delivery-rules/${id}/trigger`, token, { method: 'POST' }),

      manualSend: (data: { module_id: string; target_audience: string; target_user_ids?: string[]; questions_per_send?: number }) =>
        apiFetch<{ sent_to: number; staff_names: string[] }>('/training/manual-send', token, { method: 'POST', body: JSON.stringify(data) }),

      returnToWork: (data: { user_id: string; module_id?: string; notes?: string }) =>
        apiFetch<{ triggered: boolean; staff_name: string }>('/training/return-to-work', token, { method: 'POST', body: JSON.stringify(data) }),

      postIncident: (data: { module_id: string; target_audience: string; target_user_ids?: string[]; incident_description: string }) =>
        apiFetch<{ sent_to: number; staff_names: string[] }>('/training/post-incident', token, { method: 'POST', body: JSON.stringify(data) }),

      sendLog: (limit = 50) =>
        apiFetch<{ logs: any[] }>(`/training/send-log?limit=${limit}`, token),
    },

    cqcQuestions: {
      list: () =>
        apiFetch<{ questions: any[] }>('/cqc-questions', token),
      create: (data: { domain: string; question: string; model_answer: string }) =>
        apiFetch<{ question: any }>('/cqc-questions', token, { method: 'POST', body: JSON.stringify(data) }),
      generate: (data: { domain: string; topic: string }) =>
        apiFetch<{ question: string; model_answer: string; domain: string }>('/cqc-questions/generate', token, { method: 'POST', body: JSON.stringify(data) }),
      generateBatch: (data: { domain?: string; count: number; topic?: string }) =>
        apiFetch<{ questions: any[]; credits_used: number }>('/cqc-questions/generate-batch', token, { method: 'POST', body: JSON.stringify(data) }),
      deactivate: (id: string) =>
        apiFetch<{ success: boolean }>(`/cqc-questions/${id}`, token, { method: 'DELETE' }),
      deliver: (id: string, data: { user_ids: string[]; channel?: string }) =>
        apiFetch<{ delivered: number; skipped: number }>(`/cqc-questions/${id}/deliver`, token, { method: 'POST', body: JSON.stringify(data) }),
      retry: (deliveryId: string) =>
        apiFetch<{ delivery: any }>(`/cqc-questions/deliveries/${deliveryId}/retry`, token, { method: 'POST' }),
      deliveries: () =>
        apiFetch<{ deliveries: any[] }>('/cqc-questions/deliveries', token),
      myDeliveries: (lang?: '2') =>
        apiFetch<{ deliveries: any[]; lang_code?: string; can_suggest?: boolean }>(`/cqc-questions/my-deliveries${lang ? `?lang=${lang}` : ''}`, token),
      submitAnswer: (deliveryId: string, answer_text: string, lang?: '2') =>
        apiFetch<{ delivery: any; score: number; feedback: string; model_answer: string | null }>(`/cqc-questions/deliveries/${deliveryId}/answer`, token, { method: 'POST', body: JSON.stringify({ answer_text, ...(lang ? { lang } : {}) }) }),
    },

    featureRequests: {
      create: (title: string, details: string) =>
        apiFetch<{ id: string }>('/feature-requests', token, { method: 'POST', body: JSON.stringify({ title, details }) }),
    },

    audits: {
      templates: () => apiFetch<{ templates: any[]; rooms: string[] }>('/audits/templates', token),
      createTemplate: (data: any) => apiFetch<{ template: any }>('/audits/templates', token, { method: 'POST', body: JSON.stringify(data) }),
      updateTemplateModules: (id: string, module_ids: string[]) => apiFetch<{ updated: boolean }>(`/audits/templates/${id}`, token, { method: 'PATCH', body: JSON.stringify({ module_ids }) }),
      deleteTemplate: (id: string) => apiFetch<{ deleted: boolean }>(`/audits/templates/${id}`, token, { method: 'DELETE' }),
      addRoom: (room: string) => apiFetch<{ rooms: string[] }>('/audits/rooms', token, { method: 'POST', body: JSON.stringify({ room }) }),
      runs: (params?: { status?: string; template_id?: string }) => {
        const qs = new URLSearchParams()
        if (params?.status)      qs.set('status',      params.status)
        if (params?.template_id) qs.set('template_id', params.template_id)
        return apiFetch<{ runs: any[] }>(`/audits/runs${qs.toString() ? '?' + qs : ''}`, token)
      },
      createRun: (data: { template_id: string; audit_month: string; auditor_name?: string; auditor_role?: string; room_number?: string }) =>
        apiFetch<{ run: any }>('/audits/runs', token, { method: 'POST', body: JSON.stringify(data) }),
      getRun: (id: string) => apiFetch<{ run: any }>(`/audits/runs/${id}`, token),
      updateRun: (id: string, data: any) => apiFetch<{ run: any }>(`/audits/runs/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
      saveAnswers: (id: string, answers: Array<{ question_id: string; answer_yn?: boolean | null; outcome_text?: string | null; actions_text?: string | null }>) =>
        apiFetch<{ saved: number }>(`/audits/runs/${id}/answers`, token, { method: 'POST', body: JSON.stringify({ answers }) }),
      complete: (id: string) => apiFetch<{ run: any; recommendations: string }>(`/audits/runs/${id}/complete`, token, { method: 'POST' }),
      report: (id: string) => apiFetch<{ report: any }>(`/audits/runs/${id}/report`, token),
      stats: () => apiFetch<{
        total: number; completed: number; in_progress: number
        due: number; due_list: Array<{ id: string; name: string; frequency: string }>; completed_this_month: number
        by_frequency: Record<string, { completed: number; in_progress: number; last_completed: string | null }>
      }>('/audits/stats', token),
    },

    // Audit log for confirmed, agent-initiated mutations (WebMCP Phase 3).
    agentActions: {
      log: (data: { tool_name: string; summary: string; confirmed: boolean; status?: 'ok' | 'error' | 'declined'; path?: string }) =>
        apiFetch<{ logged: boolean }>('/agent-actions', token, { method: 'POST', body: JSON.stringify(data) }),
    },

    me: {
      moduleReviews: () => apiFetch<{ reviews: Array<{ module_id: string; notes: string | null; status: string }> }>('/me/module-reviews', token),
      saveModuleReview: (module_id: string, data: { notes?: string; status?: string }) =>
        apiFetch<{ saved: boolean }>('/me/module-reviews', token, { method: 'POST', body: JSON.stringify({ module_id, ...data }) }),
      progress: () => apiFetch<any>('/me/progress', token),
      profile: () => apiFetch<{ first_language: string; second_language: string | null; second_language_name: string | null; comms_always_first_language: boolean; allow_language_switching: boolean; can_suggest_translations: boolean }>('/me/profile', token),
      suggestTranslation: (data: { source_text: string; suggested_text: string; lang_code: string; machine_text?: string; content_kind?: string; context_label?: string }) =>
        apiFetch<{ status: 'pending' | 'approved' }>('/me/translation-suggestion', token, { method: 'POST', body: JSON.stringify(data) }),
      counts: () => apiFetch<{ training: number; induction: number; cqc: number; followup: number; annual: number; audits: number }>('/me/counts', token),
      policyApprovals: () => apiFetch<{ is_manager: boolean; policies: Array<{ policy_id: string; name: string; version: string; changes: number; submitted_at: string }>; published: Array<{ policy_id: string; name: string; version: string; published_at: string; published_by: string }>; returned: Array<{ policy_id: string; name: string; version: string; returned_at: string; returned_by: string }>; awaiting_external: Array<{ policy_id: string; name: string; version: string; sent: boolean; reviewer_name: string }> }>('/me/policy-approvals', token),
      policyApprovalDetail: (policyId: string) => apiFetch<{ policy_name: string; version: string; html: string; changes: Array<{ id: string; reference_key: string; requirement: string; placement: string; old_text: string; new_text: string; section_title: string; applied_by: string; applied_at: string; published: boolean; manager_feedback: string }>; show_role_names: boolean; role_names: Record<string, string[]> }>(`/me/policy-approvals/${encodeURIComponent(policyId)}`, token),
      approvePolicyAsManager: (policyId: string) => apiFetch<{ status: string; version?: string }>(`/me/policy-approvals/${encodeURIComponent(policyId)}/approve`, token, { method: 'POST' }),
      rejectPolicyAsManager: (policyId: string, comment: string, feedback: Array<{ change_id: string; note: string }> = []) => apiFetch<{ status: string }>(`/me/policy-approvals/${encodeURIComponent(policyId)}/reject`, token, { method: 'POST', body: JSON.stringify({ comment, feedback }) }),
      documentCategories: () => apiFetch<{ available: string[] }>('/me/document-categories', token),
      pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
        apiFetch<{ subscribed: boolean }>('/me/push/subscribe', token, { method: 'POST', body: JSON.stringify(sub) }),
      pushUnsubscribe: (endpoint: string) =>
        apiFetch<{ subscribed: boolean }>('/me/push/unsubscribe', token, { method: 'POST', body: JSON.stringify({ endpoint }) }),
      annualTraining: {
        list: (lang?: '2') => apiFetch<{ items: Array<{ enrollment_id: string; module_id: string; name: string; frequency: string; requires_practical: boolean; group_key: string | null; image_key: string | null; status: string; completed_at: string | null; expires_at: string | null; due_date: string | null; state: string }> }>(`/me/annual-training${lang ? `?lang=${lang}` : ''}`, token),
        get: (id: string, lang?: '2') => apiFetch<{ name: string; pass_mark: number; requires_practical: boolean; frequency: string; duration_minutes: number | null; illustration_url: string | null; learning: { summary: string; outcomes: string[]; key_points: string[]; sections: Array<{ id: string; heading: string; body: string; scenario: { situation: string; prompt: string; answer: string }; check: { question: string; options: string[]; correct: number } }> }; questions: Array<{ id: string; text: string; options: string[] }>; policies: Array<{ policy_id: string; title: string }>; answers: Array<{ question_id: string; answer_text: string; is_correct: boolean }>; status: string; lang_code?: string; can_suggest?: boolean; source_questions?: Array<{ text: string; options: string[] }>; source_sections?: Array<{ heading: string; body: string; situation: string; prompt: string; answer: string; check_question: string; check_options: string[] }>; source_overview?: { summary: string; outcomes: string[]; key_points: string[] } }>(`/me/annual-training/${id}${lang ? `?lang=${lang}` : ''}`, token),
        submit: (id: string) => apiFetch<{ passed: boolean; score: number; correct: number; total: number; pass_mark: number }>(`/me/annual-training/${id}/submit`, token, { method: 'POST' }),
        certificate: (id: string) => apiFetch<{ staff_name: string; module_name: string; org_name: string; logo_url: string | null; completed_at: string; expires_at: string | null; frequency: string; requires_practical: boolean; score: number; independently_reviewed: boolean; cpd: { accredited: boolean; hours: number | null; provider_number: string | null } }>(`/me/annual-training/${id}/certificate`, token),
        recordLearnTime: (id: string, seconds: number) => apiFetch<{ recorded: number }>(`/me/annual-training/${id}/learn-time`, token, { method: 'POST', body: JSON.stringify({ seconds }) }),
        evaluate: (id: string, data: { confidence: number | null; usefulness: number | null; comment?: string }) => apiFetch<{ saved: boolean }>(`/me/annual-training/${id}/evaluate`, token, { method: 'POST', body: JSON.stringify(data) }),
      },
      followUp: (lang?: '2') => apiFetch<{ items: Array<{ source: 'training' | 'induction'; enrollment_id: string; ref: string; topic: string; text: string; options: string[]; image_url: string | null }> }>(`/me/follow-up${lang ? `?lang=${lang}` : ''}`, token),
      followUpLesson: (p: { source: string; ref: string; enrollment_id: string; lang?: '2' }) =>
        apiFetch<{ lesson: { why: string; key_points: string[]; scenario: { situation: string; prompt: string; answer: string }; check: { question: string; options: string[] }; policy_id?: string | null; policy_title?: string | null }; lang: string }>(`/me/follow-up/lesson?source=${encodeURIComponent(p.source)}&ref=${encodeURIComponent(p.ref)}&enrollment_id=${encodeURIComponent(p.enrollment_id)}${p.lang ? `&lang=${p.lang}` : ''}`, token),
      followUpLessonAnswer: (data: { source: string; ref: string; enrollment_id: string; selected: number }) =>
        apiFetch<{ correct: boolean; resolved?: boolean; correct_option: number }>('/me/follow-up/lesson/answer', token, { method: 'POST', body: JSON.stringify(data) }),
      followUpResolved: (data: { source: string; ref: string; method: 'learn' | 'retry'; label?: string }) =>
        apiFetch<{ logged: boolean }>('/me/follow-up/resolved', token, { method: 'POST', body: JSON.stringify(data) }),
      recordLanguageSwitch: (data: { area: 'training' | 'annual' | 'induction' | 'followup' | 'cqc' | 'chat'; set_ref?: string; set_name?: string }) =>
        apiFetch<{ logged: boolean }>('/me/language-switch', token, { method: 'POST', body: JSON.stringify(data) }),
      rateTraining: (data: { area: 'training' | 'annual' | 'followup' | 'cqc'; ref?: string; confidence?: number; usefulness?: number; comment?: string }) =>
        apiFetch<{ saved: boolean }>('/me/training-rating', token, { method: 'POST', body: JSON.stringify(data) }),
      policy: (policyId: string, lang?: '2') => apiFetch<{ policy_id: string; title: string; content: string; lang: string; html?: boolean; processing?: boolean; translation_pending?: boolean }>(`/me/policy/${policyId}${lang ? `?lang=${lang}` : ''}`, token),
      policyQuestions: (policyId: string) => apiFetch<{ questions: string[] }>(`/me/policy/${policyId}/questions`, token),
      recordRead: (data: { policy_id: string; step_id?: string; enrollment_id?: string; seconds_spent: number; max_scroll_pct: number; reached_end: boolean; marked_read: boolean; lang: string }) =>
        apiFetch<{ recorded: boolean }>('/me/policy/read', token, { method: 'POST', body: JSON.stringify(data) }),
      savedPolicies: () => apiFetch<{ saved: Array<{ policy_id: string; title: string; saved_at: string }> }>('/me/saved-policies', token),
      savePolicy: (policyId: string) => apiFetch<{ saved: boolean }>('/me/saved-policies', token, { method: 'POST', body: JSON.stringify({ policy_id: policyId }) }),
      unsavePolicy: (policyId: string) => apiFetch<{ removed: boolean }>(`/me/saved-policies/${policyId}`, token, { method: 'DELETE' }),
      supervisions: () => apiFetch<{ enabled: boolean; records: SupRecord[] }>('/me/supervisions', token),
    },

    faceToFace: {
      modules: () => apiFetch<{ modules: Array<{ id: string; name: string; category: string; ready: boolean }> }>('/face-to-face/modules', token),
      sessions: (from?: string, to?: string) => {
        const qs = new URLSearchParams()
        if (from) qs.set('from', from)
        if (to)   qs.set('to', to)
        return apiFetch<{ sessions: Array<{ id: string; module_id: string | null; title: string; session_date: string; delivered_by_user_id: string | null; delivered_by_name: string | null; duration_hours: number; start_time: string | null; end_time: string | null; location: string | null; capacity: number | null; series_id: string | null; renews_after_months: number | null; notes: string | null; allocated: number; attended: number; absent: number; unmarked: number }> }>(`/face-to-face/sessions${qs.toString() ? '?' + qs : ''}`, token)
      },
      session: (id: string) => apiFetch<{ session: any }>(`/face-to-face/sessions/${id}`, token),
      createSession: (data: { module_id?: string; title?: string; session_date: string; delivered_by_user_id?: string; delivered_by_name?: string; duration_hours?: number; start_time?: string | null; end_time?: string | null; location?: string | null; capacity?: number | null; renews_after_months?: number | null; repeat_monthly?: number; notes?: string; attendee_ids?: string[]; owed_pay_ids?: string[] }) =>
        apiFetch<{ session: { id: string }; series_count?: number }>('/face-to-face/sessions', token, { method: 'POST', body: JSON.stringify(data) }),
      updateSession: (id: string, data: { module_id?: string | null; title?: string; session_date?: string; delivered_by_user_id?: string | null; delivered_by_name?: string | null; duration_hours?: number; start_time?: string | null; end_time?: string | null; location?: string | null; capacity?: number | null; renews_after_months?: number | null; notes?: string | null; attendee_ids?: string[]; owed_pay_ids?: string[] }) =>
        apiFetch<{ updated: boolean }>(`/face-to-face/sessions/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      trainingMonth: (month: string) => apiFetch<{
        month: string
        f2f:    Array<{ session_id: string; date: string; title: string; duration_hours: number; start_time: string | null; end_time: string | null; location: string | null; attendees: Array<{ user_id: string; name: string; status: string; owed_pay: boolean; hourly_rate: number | null }> }>
        adhoc:  Array<{ user_id: string; name: string; title: string; allocated_at: string; completed_at: string | null; status: string }>
        annual: Array<{ user_id: string; name: string; title: string; allocated_at: string; completed_at: string | null; status: string }>
      }>(`/face-to-face/training-month?month=${encodeURIComponent(month)}`, token),
      // Same shape as trainingMonth, but over an explicit inclusive date range (weekly payroll).
      trainingRange: (from: string, to: string) => apiFetch<{
        month: string; period: string
        f2f:    Array<{ session_id: string; date: string; title: string; duration_hours: number; start_time: string | null; end_time: string | null; location: string | null; attendees: Array<{ user_id: string; name: string; status: string; owed_pay: boolean; hourly_rate: number | null }> }>
        adhoc:  Array<{ user_id: string; name: string; title: string; allocated_at: string; completed_at: string | null; status: string }>
        annual: Array<{ user_id: string; name: string; title: string; allocated_at: string; completed_at: string | null; status: string }>
      }>(`/face-to-face/training-month?from=${encodeURIComponent(from)}&to=${encodeURIComponent(to)}`, token),
      payrollEmail: (to: string, month_label: string, pdf_base64: string) =>
        apiFetch<{ sent: string }>('/face-to-face/payroll/email', token, { method: 'POST', body: JSON.stringify({ to, month_label, pdf_base64 }) }),
      matrix: () => apiFetch<{
        topics: Array<{ key: string; label: string; module_id: string | null }>
        staff:  Array<{ user_id: string; name: string; job_role: string | null; cells: Array<{ topic_key: string; status: 'in_date' | 'due_soon' | 'overdue' | 'missing' | 'none'; last_date: string | null; valid_until: string | null }> }>
        mandatory: Array<{ id: string; job_role: string; module_id: string; module_name: string }>
        summary: { overdue: number; due_soon: number; missing: number }
      }>('/face-to-face/matrix', token),
      mandatory: () => apiFetch<{ items: Array<{ id: string; job_role: string; module_id: string; module_name: string }> }>('/face-to-face/mandatory', token),
      setMandatory: (items: Array<{ job_role: string; module_id: string }>) =>
        apiFetch<{ count: number }>('/face-to-face/mandatory', token, { method: 'PUT', body: JSON.stringify({ items }) }),
      deleteSession: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/face-to-face/sessions/${id}`, token, { method: 'DELETE' }),
      markAttendance: (id: string, marks: Array<{ user_id: string; status?: 'allocated' | 'attended' | 'absent'; competency?: 'not_assessed' | 'competent' | 'not_yet_competent' }>) =>
        apiFetch<{ updated: boolean }>(`/face-to-face/sessions/${id}/attendance`, token, { method: 'POST', body: JSON.stringify({ marks }) }),
      uploadEvidence: (id: string, file: File) => {
        const fd = new FormData(); fd.append('file', file)
        return apiFetch<{ evidence: { id: string; file_name: string; file_type: string; size_bytes: number; created_at: string } }>(`/face-to-face/sessions/${id}/evidence`, token, { method: 'POST', body: fd })
      },
      downloadEvidence: async (evidenceId: string): Promise<Blob> => {
        const r = await fetch(`${API_URL}/face-to-face/evidence/${evidenceId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!r.ok) throw new Error('Could not fetch the file.')
        return r.blob()
      },
      deleteEvidence: (evidenceId: string) =>
        apiFetch<{ deleted: boolean }>(`/face-to-face/evidence/${evidenceId}`, token, { method: 'DELETE' }),
      // Every evidence file across all sessions, each tagged with its session.
      listEvidence: () =>
        apiFetch<{ evidence: Array<{ id: string; file_name: string; file_type: string; size_bytes: number; scan_status: string; created_at: string; session_id: string; session_title: string; session_date: string | null }> }>(`/face-to-face/evidence`, token),
      // Stored completion certificates (issued only for attended staff).
      issueCertificate: (sessionId: string, user_id: string, pdf_base64: string) =>
        apiFetch<{ certificate: { id: string; user_id: string; title: string } }>(`/face-to-face/sessions/${sessionId}/certificate`, token, { method: 'POST', body: JSON.stringify({ user_id, pdf_base64 }) }),
      certificates: (user_id?: string) =>
        apiFetch<{ certificates: Array<{ id: string; user_id: string; user_name: string; title: string; session_date: string; competency: string; file_name: string; created_at: string }> }>(`/face-to-face/certificates${user_id ? `?user_id=${encodeURIComponent(user_id)}` : ''}`, token),
      downloadCertificate: async (certificateId: string): Promise<Blob> => {
        const r = await fetch(`${API_URL}/face-to-face/certificate/${certificateId}`, { headers: { Authorization: `Bearer ${token}` } })
        if (!r.ok) throw new Error('Could not fetch the certificate.')
        return r.blob()
      },
      deleteCertificate: (certificateId: string) =>
        apiFetch<{ deleted: boolean }>(`/face-to-face/certificate/${certificateId}`, token, { method: 'DELETE' }),
      assignModule: (id: string, user_ids: string[]) =>
        apiFetch<{ assigned: number; newly_enrolled: number }>(`/face-to-face/sessions/${id}/assign-module`, token, { method: 'POST', body: JSON.stringify({ user_ids }) }),
      remind: (id: string, user_ids?: string[]) =>
        apiFetch<{ sent: number; reminder_sent_at: string }>(`/face-to-face/sessions/${id}/remind`, token, { method: 'POST', body: JSON.stringify(user_ids ? { user_ids } : {}) }),
      unmarked: () => apiFetch<{ sessions: Array<{ id: string; title: string; session_date: string; people: Array<{ user_id: string; name: string; job_role: string | null }> }> }>('/face-to-face/unmarked', token),
      analytics: () => apiFetch<{
        summary: { sessions: number; allocations: number; attended: number; missed: number; modules_assigned: number; assigned_incomplete: number; certificates: number }
        by_staff: Array<{ user_id: string; name: string; job_role: string | null; allocated: number; attended: number; missed: number; assigned: number; assigned_incomplete: number; certificates: number; missed_sessions: Array<{ session_id: string; title: string; date: string; module_assigned: boolean; completion: string | null }> }>
        certificates: Array<{ id: string; user_id: string; user_name: string; title: string; session_date: string; competency: string; created_at: string }>
      }>('/face-to-face/analytics', token),
    },

    analytics: {
      get: () => apiFetch<any>('/analytics', token),
      training: () => apiFetch<any>('/analytics/training', token),
      staffRisk: () => apiFetch<{ staff: Array<{ id: string; name: string; job_role: string | null; flags: Array<{ level: 'high' | 'medium'; kind: string; label: string }>; severity: number }>; summary: { total_flagged: number; high: number } }>('/analytics/staff-risk', token),
      policyReading: () => apiFetch<{
        summary: { total_sessions: number; staff_count: number; avg_seconds: number | null; avg_scroll_pct: number | null; pct_reached_end: number | null }
        by_policy: Array<{ policy_id: string; title: string; sessions: number; avg_seconds: number; avg_scroll_pct: number; pct_reached_end: number }>
      }>('/analytics/policy-reading', token),
      inductionPerformance: () => apiFetch<{
        summary: { total_answered: number; correct: number; pct_correct: number | null; staff_answered: number }
        weak_questions: Array<{ question: string; answered: number; incorrect: number; incorrect_rate: number }>
      }>('/analytics/induction-performance', token),
      followUp: () => apiFetch<{
        staff: Array<{ id: string; name: string; job_role: string | null; training_gaps: number; induction_gaps: number; total_gaps: number; unreviewed: number }>
        summary: { total: number; total_gaps: number }
      }>('/analytics/follow-up', token),
      annualTraining: () => apiFetch<{
        summary: { modules_published: number; staff: number; assigned: number; completed: number; renewal_due: number; practical_due: number; completion_pct: number | null }
        by_module: Array<{ id: string; name: string; requires_practical: boolean; assigned: number; completed: number; avg_score: number | null; completion_pct: number }>
      }>('/analytics/annual-training', token),
      knowledgeGaps: () => apiFetch<{
        summary: { open_gaps: number; open_training: number; open_induction: number; staff_with_gaps: number; resolved_30d: number; resolved_7d: number; learn: number; retry: number; engaged_pct: number | null }
        top_missed: Array<{ source: 'training' | 'induction'; topic: string; question: string; miss_count: number; staff_count: number }>
        weak_topics: Array<{ source: 'training' | 'induction'; topic: string; gaps: number; staff: number }>
        recent_resolutions: Array<{ user: string; source: 'training' | 'induction'; method: 'learn' | 'retry'; label: string | null; when: string }>
        trend: Array<{ date: string; open_gaps: number; open_training: number; open_induction: number; resolved_7d: number }>
      }>('/analytics/knowledge-gaps', token),
      dailyActivity: (days = 30) =>
        apiFetch<{ series: Array<{ date: string; chat: number; email: number; whatsapp: number }>; days: number }>(
          `/analytics/daily-activity?days=${days}`, token
        ),
      cqcReport: (dateFrom?: string, dateTo?: string) => {
        const qs = new URLSearchParams()
        if (dateFrom) qs.set('date_from', dateFrom)
        if (dateTo)   qs.set('date_to',   dateTo)
        return apiFetch<any>(`/analytics/cqc-report${qs.toString() ? '?' + qs : ''}`, token)
      },
      cqcPrep: () => apiFetch<{
        summary: { total_sent: number; total_answered: number; pending: number; avg_score: number | null; pct_80_plus: number | null }
        by_domain: Array<{ domain: string; total_sent: number; total_answered: number; avg_score: number | null }>
        staff_performance: Array<{ user_id: string; name: string; job_role: string | null; total_answered: number; avg_score: number; by_domain: Record<string, number | null> }>
      }>('/analytics/cqc-prep', token),
      trainingGaps: () => apiFetch<{
        question_gaps:  Array<{ question_id: string; question_text: string; module_id: string; module_name: string; total: number; incorrect: number; incorrect_rate: number }>
        staff_gaps:     Array<{ user_id: string; user_name: string; job_role: string | null; module_id: string; module_name: string; module_category: string; status: string; total_answers: number; incorrect: number; incorrect_rate: number; weak_questions: string[] }>
        module_summary: Array<{ module_id: string; module_name: string; category: string; total_answers: number; incorrect: number; incorrect_rate: number; gap_count: number }>
      }>('/analytics/training-gaps', token),

      gaps: () => apiFetch<{
        coverage_score:    number | null
        analysed:          boolean
        analysed_at:       string | null
        unanswered_themes: Array<{ theme: string; count: number; sample_questions: string[] }>
        regulation_gaps:   Array<{ reference_key: string; official_name: string; summary: string; care_home_context: string; status: 'covered' | 'partial' | 'gap' | 'unknown'; covered: boolean; confidence: number | null; evidence_policy_id: string | null; evidence_policy_name: string | null; reason: string | null; target_policies?: Array<{ id: string | null; name: string; count: number }>; target_policy?: { id: string | null; name: string } | null }>
        regulation_alerts: Array<{ id: string; reference_key: string; official_name: string; changed_fields: string[]; created_at: string }>
        remediation_acknowledged: boolean
        remediation_disclaimer: string
        completed_keys: string[]
        completed_gaps: Array<{ reference_key: string; official_name: string; completed_at: string; completed_by_name: string | null; status: 'covered' | 'partial' | 'gap' | 'unknown' }>
        meta: { no_match_total: number; days_analysed: number; regulations_total: number; regulations_covered: number; regulations_partial: number; regulations_gap: number }
      }>('/analytics/gaps', token),
      dismissGapAlert: (id: string) => apiFetch<{ dismissed: boolean }>(`/analytics/gaps/alerts/${encodeURIComponent(id)}/dismiss`, token, { method: 'POST' }),
      acknowledgeRemediation: () => apiFetch<{ acknowledged: boolean }>('/analytics/gaps/acknowledge-remediation', token, { method: 'POST' }),
      completeGap: (referenceKey: string) => apiFetch<{ completed: boolean }>(`/analytics/gaps/${encodeURIComponent(referenceKey)}/complete`, token, { method: 'POST' }),
      reopenGap: (referenceKey: string) => apiFetch<{ reopened: boolean }>(`/analytics/gaps/${encodeURIComponent(referenceKey)}/reopen`, token, { method: 'POST' }),
      analyseGaps: () => apiFetch<{ analysed_at: string; regulations_total: number; regulations_covered: number; regulations_partial: number; regulations_gap: number }>('/analytics/gaps/analyse', token, { method: 'POST' }),
      analyseGapsStart: () => apiFetch<{ total: number }>('/analytics/gaps/analyse/start', token, { method: 'POST' }),
      analyseGapsBatch: () => apiFetch<{ done: number; analysed: number; total: number; remaining: number }>('/analytics/gaps/analyse/batch', token, { method: 'POST' }),
      pregenerateGaps: () => apiFetch<{ generated: number; remaining: number }>('/analytics/gaps/pregenerate', token, { method: 'POST' }),
      // Policy lint (out-of-date content) — deterministic, zero-AI.
      policyLint: () => apiFetch<{
        scanned: boolean
        scanned_at: string | null
        policies_scanned: number
        policies_with_issues: number
        high_findings: number
        medium_findings: number
        policies: Array<{
          policy_id: string; policy_name: string; score: number; scanned_at: string
          findings: Array<{ signal_key: string; category: string; severity: 'high' | 'medium' | 'low'; label: string; detail: string; superseded_by: string | null; kind: 'text' | 'structure' | 'review_currency'; count: number; terms: string[]; samples: Array<{ match: string; index: number }> }>
        }>
      }>('/analytics/policy-lint', token),
      policyLintScan: () => apiFetch<{ scanned: number; with_issues: number }>('/analytics/policy-lint/scan', token, { method: 'POST' }),
      // Cross-policy consistency (Phase 4).
      consistency: () => apiFetch<{
        analysed: boolean
        analysed_at: string | null
        sets: number
        high: number
        conflicts: Array<{
          id: string; key: string; set_type: 'duplicate' | 'topic'; set_label: string
          topic: string; summary: string; severity: 'high' | 'medium' | 'low'
          positions: Array<{ policy_id: string; policy_name: string; statement: string; quote: string }>
        }>
      }>('/analytics/consistency', token),
      consistencyStart: () => apiFetch<{ sets: number; duplicate_sets: number; topic_sets: number; to_extract: number }>('/analytics/consistency/scan/start', token, { method: 'POST' }),
      consistencyBatch: () => apiFetch<{ extracted: number; remaining: number }>('/analytics/consistency/scan/batch', token, { method: 'POST' }),
      consistencyDetect: () => apiFetch<{ conflicts: number; sets: number }>('/analytics/consistency/detect', token, { method: 'POST' }),
      consistencyDismiss: (key: string) => apiFetch<{ dismissed: boolean }>('/analytics/consistency/dismiss', token, { method: 'POST', body: JSON.stringify({ key }) }),
      gapDetail: (referenceKey: string, force = false) => apiFetch<{
        reference_key:    string
        official_name:    string
        original_status:  'partial' | 'gap'
        effective_status: 'partial' | 'gap' | 'covered'
        authority_basis:  'statutory' | 'advisory'
        source_urls:      string[]
        evidence_policy:  { id: string; name: string } | null
        target_policy:    { id: string; name: string } | null
        target_policies?: Array<{ id: string | null; name: string; count: number }>
        suggested_new_policy_title: string | null
        highlight_quotes: string[]
        highlight_placements?: Array<'amend' | 'add_under_heading' | 'new_section'>
        highlight_labels?: string[]
        requirements:     Array<{ requirement: string; status: 'missing' | 'already_covered'; already_covered_in?: string | null; suggested_addition?: string | null; location_quote?: string | null; match_index?: number | null; placement?: 'amend' | 'add_under_heading' | 'new_section' | null; section_title?: string | null; target_policy_id?: string | null; target_policy_name?: string | null }>
        disclaimer:       string
        generated_at:     string
      }>(`/analytics/gaps/${encodeURIComponent(referenceKey)}/detail${force ? '?force=1' : ''}`, token, { method: 'POST' }),
      gapTrainingModule: (referenceKey: string) => apiFetch<{ module: { id: string; name: string; slug: string } }>(`/analytics/gaps/${encodeURIComponent(referenceKey)}/training-module`, token, { method: 'POST' }),
      gapOnboarding: (referenceKey: string) => apiFetch<{ flow: { id: string; name: string }; already: boolean }>(`/analytics/gaps/${encodeURIComponent(referenceKey)}/onboarding`, token, { method: 'POST' }),
      safAlignment: (referenceKey: string, policyId: string, force = false) => apiFetch<{ statements: Array<{ reference_key: string; name: string; we_statement: string }>; target_policy: { id: string; name: string } | null; alignments: Array<{ focus: string; placement: 'add_under_heading' | 'new_section'; anchor: string; section_title: string; wording: string }>; message: string }>(`/analytics/gaps/${encodeURIComponent(referenceKey)}/saf-alignment`, token, { method: 'POST', body: JSON.stringify({ policy_id: policyId, force }) }),
      adoptionContext: () => apiFetch<{ enabled: boolean; variables: Array<{ key: string; label: string; value: string }>; role_holders: Array<{ key: string; role: string; candidates: string[] }>; role_names: Record<string, string[]>; show_role_names: boolean; logo_url: string | null; home_name: string; address: string; registered_manager: string; default_approver: string; review_cycle_months: string; version_scheme: string; require_manager_approval: boolean; require_external_approval: boolean }>('/analytics/gaps/adoption-context', token),
      adoptSuggestion: (body: { policy_id: string; reference_key: string; requirement: string; placement: string; old_text: string; new_text: string; section_title?: string }) =>
        apiFetch<{ applied: boolean; pending: number; document_id: string; change_id: string }>('/analytics/gaps/adopt', token, { method: 'POST', body: JSON.stringify(body) }),
      policyDocument: (policyId: string) => apiFetch<{ document: { id: string; policy_id: string; draft_content: string; original_content: string; published_content: string; version: string; published_at: string | null; published_by: string } | null; changes: Array<{ id: string; reference_key: string; requirement: string; placement: string; old_text: string; new_text: string; section_title: string; applied_by: string; applied_at: string; published: boolean; manager_feedback: string; feedback_resolved: boolean }> }>(`/analytics/gaps/policy-document/${encodeURIComponent(policyId)}`, token),
      policyDocumentsSummary: () => apiFetch<{ documents: Array<{ policy_id: string; pending: number; version: string; published_at: string | null; approval_status: string; external_name: string; external_sent_at: string | null }> }>('/analytics/gaps/policy-documents-summary', token),
      policyApprovalsOverview: () => apiFetch<{ documents: Array<{ policy_id: string; name: string; version: string; approval_status: string; published_at: string | null; updated_at: string | null; pending: number; external_name: string; trail: Array<{ stage: string; decision: string; approver_name: string; created_at: string; comment: string }> }>; summary: { total: number; published: number; in_progress: number }; health: { policies_total: number; coverage_score: number | null; regs_total: number; regs_covered: number; regs_partial: number; regs_gap: number; review_tracked: number; review_due: number } }>('/analytics/gaps/approvals-overview', token),
      safCoverage: () => apiFetch<{ key_questions: Array<{ q: string; label: string; score: number | null; covered: number; partial: number; gap: number; statements: Array<{ number: number; reference_key: string; name: string; we_statement: string; status: 'covered' | 'partial' | 'gap' | 'not_assessed'; covered: number; partial: number; gap: number; not_assessed: number; assessed: number; score: number | null; expectation_cues: string[]; expected_policies: string[]; regulations: Array<{ reference_key: string; official_name: string; status: string }> }> }>; summary: { statements: number; covered: number; partial: number; gap: number; score: number | null } }>('/analytics/gaps/saf-coverage', token),
      revertPolicyChange: (changeId: string) => apiFetch<{ pending: number }>(`/analytics/gaps/policy-change/${encodeURIComponent(changeId)}/revert`, token, { method: 'POST' }),
      editPolicyChange: (changeId: string, newText: string, sectionTitle?: string) => apiFetch<{ pending: number }>(`/analytics/gaps/policy-change/${encodeURIComponent(changeId)}`, token, { method: 'PATCH', body: JSON.stringify({ new_text: newText, section_title: sectionTitle }) }),
      publishPolicyDocument: (policyId: string) => apiFetch<{ version: string; published: number; reindexed: boolean }>(`/analytics/gaps/policy-document/${encodeURIComponent(policyId)}/publish`, token, { method: 'POST' }),
      policyApprovals: (policyId: string) => apiFetch<{ status: string; external_name: string; external_email: string; external_token: string | null; external_sent_at: string | null; approvals: Array<{ id: string; stage: string; decision: string; approver_name: string; approver_email: string; comment: string; created_at: string }> }>(`/analytics/gaps/policy-approvals/${encodeURIComponent(policyId)}`, token),
      submitPolicyForApproval: (policyId: string) => apiFetch<{ status: string; version?: string; token?: string }>(`/analytics/gaps/policy-document/${encodeURIComponent(policyId)}/submit`, token, { method: 'POST' }),
      managerApprovePolicy: (policyId: string) => apiFetch<{ status: string; version?: string; token?: string }>(`/analytics/gaps/policy-document/${encodeURIComponent(policyId)}/manager-approve`, token, { method: 'POST' }),
      rejectPolicy: (policyId: string, comment: string) => apiFetch<{ status: string }>(`/analytics/gaps/policy-document/${encodeURIComponent(policyId)}/reject`, token, { method: 'POST', body: JSON.stringify({ comment }) }),
      setExternalReviewer: (policyId: string, name: string, email: string) => apiFetch<{ token: string }>(`/analytics/gaps/policy-document/${encodeURIComponent(policyId)}/external-recipient`, token, { method: 'POST', body: JSON.stringify({ name, email }) }),
      engagement: () => apiFetch<{
        wau: { active: number; total_staff: number; pct: number | null }
        logged_in_7d: number
        trend: Array<{ week_start: string; active: number; pct: number; channels: { chat: number; whatsapp: number; email: number; voice: number } }>
        channels: { chat: number; whatsapp: number; email: number; voice: number; total: number; hub_pct: number | null }
      }>('/analytics/engagement', token),
      effectiveness: () => apiFetch<{
        headline: { gaps_put_right: number; open_gaps: number; resolution_rate: number | null; engaged_pct: number | null; resolved_30d: number }
        loop: { learn: number; retry: number; resolved_7d: number; resolved_30d: number; trend: Array<{ week_start: string; resolved: number }> }
        mastery: { assigned: number; completed: number; completion_pct: number | null; avg_assessment_score: number | null; answers: number }
        reaction: { responses: number; avg_confidence_pct: number | null; avg_usefulness_pct: number | null }
        cqc: { evaluated: number; retried: number; avg_first_score: number | null; avg_latest_score: number | null; avg_improvement: number | null }
        language: { second_lang_users: number; with: { staff: number; completion_pct: number | null; avg_score: number | null }; without: { staff: number; completion_pct: number | null; avg_score: number | null } }
      }>('/analytics/effectiveness', token),
      trainingImpact: () => apiFetch<{
        audits: Array<{
          template_id: string; name: string; runs: number
          modules: Array<{ id: string; name: string }>
          timeline: Array<{ month: string; audit_score: number | null; completion_pct: number | null }>
          first_score: number | null; latest_score: number | null; score_change: number | null; current_completion_pct: number | null
        }>
      }>('/analytics/training-impact', token),
      languageSwitches: () => apiFetch<{
        summary: { total_switches: number; staff_count: number; set_count: number; days: number }
        by_area: Array<{ area: string; label: string; count: number }>
        by_language: Array<{ lang: string; lang_name: string; count: number; staff_count: number }>
        by_set: Array<{ area: string; area_label: string; set_name: string; switch_count: number; staff_count: number; last_at: string }>
        by_staff: Array<{ user_id: string; name: string; job_role: string | null; total: number; languages: string[]; sets: Array<{ area: string; set_name: string; count: number; last_at: string }> }>
      }>('/analytics/language-switches', token),
    },
  }
}
