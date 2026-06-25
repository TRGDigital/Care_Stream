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

export interface Citation {
  policy_id:         string
  policy_name:       string
  version:           number
  document_category: string
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
      // Stream the answer paragraph by paragraph (SSE). Calls onParagraph as each block
      // arrives, then onDone with the final payload (citations, suggestions, etc.).
      stream: async (
        data: { query_text: string; policy_id?: string; staff_name?: string; document_category?: 'internal_policy' | 'staff_handbook' | 'training_module' | 'cqc_report' | 'audit_report' | 'business_continuity'; chat_session_id?: string; language?: string; conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }> },
        handlers: { onParagraph: (html: string) => void; onDone: (d: { html: string; citations?: Citation[]; suggestedQuestions?: string[]; queryId?: string; languageDetected?: string; noMatch?: boolean }) => void; onError: (msg: string) => void },
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
      invite: (data: { email: string; name: string; role: string; job_role?: string; specialisms?: string[]; audit_template_ids?: string[]; phone_number?: string; shift_type?: 'any' | 'day' | 'night'; first_language?: string; second_language?: string; comms_always_first_language?: boolean; allow_language_switching?: boolean; new_starter?: boolean }) =>
        apiFetch<{ user: any; temp_password: string; contact: StaffContact; onboarding_enrolled?: number; new_starter?: boolean }>('/users/invite', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      update: (id: string, data: { name?: string; job_role?: string | null; specialisms?: string[]; role?: string; audit_template_ids?: string[]; phone_number?: string | null; shift_type?: 'any' | 'day' | 'night'; first_language?: string; second_language?: string | null; comms_always_first_language?: boolean; allow_language_switching?: boolean }) =>
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
        monthly_query_limit:  number | null
        has_stripe:           boolean
        next_billing_date:    string | null
        current_period_start: string | null
        current_period_end:   string | null
        billing_interval:     string | null
        cancel_at_period_end?: boolean
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
        id: string; name: string; price_monthly_pence: number; monthly_query_limit: number
        max_policies: number | null; max_staff_users: number | null; max_handbooks: number | null
        max_manual_knowledge_entries: number | null; monthly_ai_credit_limit: number | null
        has_advanced_analytics: boolean; has_cqc_report: boolean; has_gap_detection: boolean
      }> }>('/billing/plans', token),
      checkout: (plan_id: string) =>
        apiFetch<{ url: string }>('/billing/checkout', token, { method: 'POST', body: JSON.stringify({ plan_id }) }),
      sync: () =>
        apiFetch<{ needs_billing: boolean; subscription_status: string | null }>('/billing/sync', token, { method: 'POST' }),
    },

    settings: {
      get: () => apiFetch<{ inbound_email: string; account_number: string; policy_sections: string[]; policy_categories: string[]; email_allowlist: string[]; phone_allowlist: string[]; facility_type: string; logo_url: string | null; email_preferences: Record<string, boolean>; staff_roles: string[]; specialist_roles: string[]; response_style: 'standard' | 'concise'; branding_signoff: string; languages?: Array<{ code: string; name: string }>; default_language_codes?: string[]; room_count?: number }>('/settings', token),
      update: (data: { email_allowlist?: string[]; phone_allowlist?: string[]; facility_type?: string; email_preferences?: Record<string, boolean>; staff_roles?: string[]; specialist_roles?: string[]; policy_sections?: string[]; policy_categories?: string[]; response_style?: 'standard' | 'concise'; branding_signoff?: string; add_language?: string; remove_language?: string; room_count?: number }) =>
        apiFetch<{ email_allowlist: string[]; phone_allowlist: string[]; facility_type: string; email_preferences: Record<string, boolean>; staff_roles: string[]; specialist_roles: string[]; policy_sections: string[]; policy_categories: string[]; response_style: 'standard' | 'concise'; languages?: Array<{ code: string; name: string }>; added_language?: { code: string; name: string; resolved: boolean } | null; room_count?: number }>('/settings', token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
      sendKnowledgeGapDigest: () =>
        apiFetch<{ digest_sent: boolean; refreshers: number }>('/settings/knowledge-gap-digest/send', token, { method: 'POST' }),
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
    },

    onboarding: {
      listFlows: () =>
        apiFetch<{ flows: any[] }>('/onboarding/flows', token),
      listTemplates: () =>
        apiFetch<{ templates: Array<{ id: string; name: string; description: string | null; flow_kind: string; job_roles: string[]; step_count: number; read_count: number; question_count: number; already_adopted: boolean }> }>('/onboarding/templates', token),
      adoptTemplate: (id: string) =>
        apiFetch<{ flow: any; unmapped: number }>(`/onboarding/templates/${id}/adopt`, token, { method: 'POST' }),
      createFlow: (data: { name: string; description?: string; job_roles?: string[]; steps?: Array<{ title: string; type: string; policy_id?: string; policy_section?: string | null; question?: string; options?: string[]; correct_option?: number | null }> }) =>
        apiFetch<{ flow: any }>('/onboarding/flows', token, { method: 'POST', body: JSON.stringify(data) }),
      updateFlow: (id: string, data: { name?: string; description?: string; job_roles?: string[]; is_active?: boolean; steps?: Array<{ title: string; type: string; policy_id?: string; policy_section?: string | null; question?: string; options?: string[]; correct_option?: number | null }> }) =>
        apiFetch<{ flow: any }>(`/onboarding/flows/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deleteFlow: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/onboarding/flows/${id}`, token, { method: 'DELETE' }),
      enroll: (flowId: string, data: { user_ids: string[]; due_date?: string }) =>
        apiFetch<{ enrolled: number }>(`/onboarding/flows/${flowId}/enroll`, token, { method: 'POST', body: JSON.stringify(data) }),
      flowProgress: (flowId: string) =>
        apiFetch<{ flow: any; enrollments: any[] }>(`/onboarding/flows/${flowId}/progress`, token),
      myEnrollments: (lang?: '2') =>
        apiFetch<{ enrollments: any[] }>(`/onboarding/my${lang ? `?lang=${lang}` : ''}`, token),
      completeStep: (enrollmentId: string, stepId: string, data?: { answer_text?: string }) =>
        apiFetch<{ progress: any; enrollment_complete: boolean }>(
          `/onboarding/enrollments/${enrollmentId}/steps/${stepId}/complete`,
          token, { method: 'POST', body: JSON.stringify(data ?? {}) }
        ),
    },

    training: {
      modules: () =>
        apiFetch<{ modules: Array<{ id: string; slug: string; name: string; description: string; category: string; sort_order: number; illustration_url: string | null; questions: Array<{ id: string; text: string }> }> }>('/training/modules', token),

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
        topics: Array<{ id: string; title: string; group_key: string; default_frequency: string; requires_practical: boolean; image_key: string | null; aliases: string[]; module: null | { id: string; name: string; approved: boolean; frequency: string; requires_practical: boolean; pass_mark: number; question_count: number; illustration_url: string | null }; standard_module: null | { id: string; name: string; approved: boolean; frequency: string; requires_practical: boolean; pass_mark: number; question_count: number; illustration_url: string | null } }>
      }>('/training/catalogue', token),
      generateModule: (topicId: string) =>
        apiFetch<{ module: any }>('/training/catalogue/generate', token, { method: 'POST', body: JSON.stringify({ topic_id: topicId }) }),
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
        apiFetch<{ enrollments: any[] }>(`/training/my-enrollments${lang ? `?lang=${lang}` : ''}`, token),

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
        apiFetch<{ deliveries: any[] }>(`/cqc-questions/my-deliveries${lang ? `?lang=${lang}` : ''}`, token),
      submitAnswer: (deliveryId: string, answer_text: string) =>
        apiFetch<{ delivery: any; score: number; feedback: string; model_answer: string | null }>(`/cqc-questions/deliveries/${deliveryId}/answer`, token, { method: 'POST', body: JSON.stringify({ answer_text }) }),
    },

    audits: {
      templates: () => apiFetch<{ templates: any[]; rooms: string[] }>('/audits/templates', token),
      createTemplate: (data: any) => apiFetch<{ template: any }>('/audits/templates', token, { method: 'POST', body: JSON.stringify(data) }),
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
      progress: () => apiFetch<any>('/me/progress', token),
      profile: () => apiFetch<{ first_language: string; second_language: string | null; second_language_name: string | null; comms_always_first_language: boolean; allow_language_switching: boolean }>('/me/profile', token),
      counts: () => apiFetch<{ training: number; induction: number; cqc: number; followup: number; annual: number; audits: number }>('/me/counts', token),
      pushSubscribe: (sub: { endpoint: string; keys: { p256dh: string; auth: string } }) =>
        apiFetch<{ subscribed: boolean }>('/me/push/subscribe', token, { method: 'POST', body: JSON.stringify(sub) }),
      pushUnsubscribe: (endpoint: string) =>
        apiFetch<{ subscribed: boolean }>('/me/push/unsubscribe', token, { method: 'POST', body: JSON.stringify({ endpoint }) }),
      annualTraining: {
        list: (lang?: '2') => apiFetch<{ items: Array<{ enrollment_id: string; module_id: string; name: string; frequency: string; requires_practical: boolean; group_key: string | null; image_key: string | null; status: string; completed_at: string | null; expires_at: string | null; due_date: string | null; state: string }> }>(`/me/annual-training${lang ? `?lang=${lang}` : ''}`, token),
        get: (id: string, lang?: '2') => apiFetch<{ name: string; pass_mark: number; requires_practical: boolean; frequency: string; duration_minutes: number | null; illustration_url: string | null; learning: { summary: string; outcomes: string[]; key_points: string[]; sections: Array<{ id: string; heading: string; body: string; scenario: { situation: string; prompt: string; answer: string }; check: { question: string; options: string[]; correct: number } }> }; questions: Array<{ id: string; text: string; options: string[] }>; policies: Array<{ policy_id: string; title: string }>; answers: Array<{ question_id: string; answer_text: string; is_correct: boolean }>; status: string }>(`/me/annual-training/${id}${lang ? `?lang=${lang}` : ''}`, token),
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
      recordLanguageSwitch: (data: { area: 'training' | 'annual' | 'induction' | 'followup' | 'cqc'; set_ref?: string; set_name?: string }) =>
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
    },

    faceToFace: {
      modules: () => apiFetch<{ modules: Array<{ id: string; name: string; category: string; ready: boolean }> }>('/face-to-face/modules', token),
      sessions: (from?: string, to?: string) => {
        const qs = new URLSearchParams()
        if (from) qs.set('from', from)
        if (to)   qs.set('to', to)
        return apiFetch<{ sessions: Array<{ id: string; module_id: string | null; title: string; session_date: string; delivered_by_user_id: string | null; delivered_by_name: string | null; notes: string | null; allocated: number; attended: number; absent: number; unmarked: number }> }>(`/face-to-face/sessions${qs.toString() ? '?' + qs : ''}`, token)
      },
      session: (id: string) => apiFetch<{ session: any }>(`/face-to-face/sessions/${id}`, token),
      createSession: (data: { module_id?: string; title?: string; session_date: string; delivered_by_user_id?: string; delivered_by_name?: string; notes?: string; attendee_ids?: string[] }) =>
        apiFetch<{ session: { id: string } }>('/face-to-face/sessions', token, { method: 'POST', body: JSON.stringify(data) }),
      updateSession: (id: string, data: { module_id?: string | null; title?: string; session_date?: string; delivered_by_user_id?: string | null; delivered_by_name?: string | null; notes?: string | null; attendee_ids?: string[] }) =>
        apiFetch<{ updated: boolean }>(`/face-to-face/sessions/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deleteSession: (id: string) =>
        apiFetch<{ deleted: boolean }>(`/face-to-face/sessions/${id}`, token, { method: 'DELETE' }),
      markAttendance: (id: string, marks: Array<{ user_id: string; status: 'allocated' | 'attended' | 'absent' }>) =>
        apiFetch<{ updated: boolean }>(`/face-to-face/sessions/${id}/attendance`, token, { method: 'POST', body: JSON.stringify({ marks }) }),
      assignModule: (id: string, user_ids: string[]) =>
        apiFetch<{ assigned: number; newly_enrolled: number }>(`/face-to-face/sessions/${id}/assign-module`, token, { method: 'POST', body: JSON.stringify({ user_ids }) }),
      remind: (id: string, user_ids?: string[]) =>
        apiFetch<{ sent: number; reminder_sent_at: string }>(`/face-to-face/sessions/${id}/remind`, token, { method: 'POST', body: JSON.stringify(user_ids ? { user_ids } : {}) }),
      unmarked: () => apiFetch<{ sessions: Array<{ id: string; title: string; session_date: string; people: Array<{ user_id: string; name: string; job_role: string | null }> }> }>('/face-to-face/unmarked', token),
      analytics: () => apiFetch<{
        summary: { sessions: number; allocations: number; attended: number; missed: number; modules_assigned: number; assigned_incomplete: number }
        by_staff: Array<{ user_id: string; name: string; job_role: string | null; allocated: number; attended: number; missed: number; assigned: number; assigned_incomplete: number; missed_sessions: Array<{ session_id: string; title: string; date: string; module_assigned: boolean; completion: string | null }> }>
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
        regulation_gaps:   Array<{ reference_key: string; official_name: string; summary: string; care_home_context: string; status: 'covered' | 'partial' | 'gap' | 'unknown'; covered: boolean; confidence: number | null; evidence_policy_id: string | null; evidence_policy_name: string | null; reason: string | null }>
        meta: { no_match_total: number; days_analysed: number; regulations_total: number; regulations_covered: number; regulations_partial: number; regulations_gap: number }
      }>('/analytics/gaps', token),
      analyseGaps: () => apiFetch<{ analysed_at: string; regulations_total: number; regulations_covered: number; regulations_partial: number; regulations_gap: number }>('/analytics/gaps/analyse', token, { method: 'POST' }),
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
