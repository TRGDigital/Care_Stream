// Typed fetch client for the CareStreamAI API.
// All requests attach the NextAuth access token as Bearer.
// Response envelope: { success, data } | { success: false, error: { code, message } }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface StaffContact {
  login_url:       string
  inbound_email:   string | null
  whatsapp_number: string | null
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
      invite: (data: { email: string; name: string; role: string; job_role?: string; specialisms?: string[]; phone_number?: string; shift_type?: 'any' | 'day' | 'night'; first_language?: string; second_language?: string; comms_always_first_language?: boolean; new_starter?: boolean }) =>
        apiFetch<{ user: any; temp_password: string; contact: StaffContact; onboarding_enrolled?: number; new_starter?: boolean }>('/users/invite', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      update: (id: string, data: { name?: string; job_role?: string | null; specialisms?: string[]; role?: string; phone_number?: string | null; shift_type?: 'any' | 'day' | 'night'; first_language?: string; second_language?: string | null; comms_always_first_language?: boolean }) =>
        apiFetch<{ user: any }>(`/users/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deactivate: (id: string) =>
        apiFetch<{ deactivated: boolean }>(`/users/${id}/deactivate`, token, { method: 'POST' }),
      reactivate: (id: string) =>
        apiFetch<{ reactivated: boolean }>(`/users/${id}/reactivate`, token, { method: 'POST' }),
      resetPassword: (id: string) =>
        apiFetch<{ user: { id: string; name: string; email: string }; temp_password: string; contact: StaffContact }>(
          `/users/${id}/reset-password`, token, { method: 'POST' }
        ),
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
    },

    settings: {
      get: () => apiFetch<{ inbound_email: string; account_number: string; policy_sections: string[]; email_allowlist: string[]; phone_allowlist: string[]; facility_type: string; logo_url: string | null; email_preferences: Record<string, boolean>; staff_roles: string[]; specialist_roles: string[]; response_style: 'standard' | 'concise'; languages?: Array<{ code: string; name: string }>; default_language_codes?: string[] }>('/settings', token),
      update: (data: { email_allowlist?: string[]; phone_allowlist?: string[]; facility_type?: string; email_preferences?: Record<string, boolean>; staff_roles?: string[]; specialist_roles?: string[]; policy_sections?: string[]; response_style?: 'standard' | 'concise'; add_language?: string; remove_language?: string }) =>
        apiFetch<{ email_allowlist: string[]; phone_allowlist: string[]; facility_type: string; email_preferences: Record<string, boolean>; staff_roles: string[]; specialist_roles: string[]; policy_sections: string[]; response_style: 'standard' | 'concise'; languages?: Array<{ code: string; name: string }>; added_language?: { code: string; name: string; resolved: boolean } | null }>('/settings', token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
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
      myEnrollments: () =>
        apiFetch<{ enrollments: any[] }>('/onboarding/my', token),
      completeStep: (enrollmentId: string, stepId: string, data?: { answer_text?: string }) =>
        apiFetch<{ progress: any; enrollment_complete: boolean }>(
          `/onboarding/enrollments/${enrollmentId}/steps/${stepId}/complete`,
          token, { method: 'POST', body: JSON.stringify(data ?? {}) }
        ),
    },

    training: {
      modules: () =>
        apiFetch<{ modules: Array<{ id: string; slug: string; name: string; description: string; category: string; sort_order: number; questions: Array<{ id: string; text: string }> }> }>('/training/modules', token),

      compliance: () =>
        apiFetch<{
          users: Array<{ id: string; name: string; email: string; job_role: string | null }>
          enrollments: Array<{
            id: string; user_id: string; module_id: string; status: string
            completed_at: string | null; expires_at: string | null
            certificate_url: string | null; due_date: string | null
            daysUntilExpiry: number | null
            module: { id: string; slug: string; name: string; category: string; sort_order: number }
          }>
        }>('/training/compliance', token),

      enroll: (data: { user_ids: string[]; module_ids: string[]; due_date?: string }) =>
        apiFetch<{ enrolled: number }>('/training/enroll', token, { method: 'POST', body: JSON.stringify(data) }),

      getEnrollment: (id: string) =>
        apiFetch<{ enrollment: any }>(`/training/enrollments/${id}`, token),

      saveAnswer: (enrollmentId: string, data: { question_id: string; answer_text: string }) =>
        apiFetch<{ saved: boolean; is_correct: boolean; correct_option: number | null }>(
          `/training/enrollments/${enrollmentId}/answer`, token, { method: 'POST', body: JSON.stringify(data) }
        ),

      complete: (enrollmentId: string, data?: { certificate_url?: string }) =>
        apiFetch<{ enrollment: any }>(`/training/enrollments/${enrollmentId}/complete`, token, { method: 'POST', body: JSON.stringify(data ?? {}) }),

      myEnrollments: () =>
        apiFetch<{ enrollments: any[] }>('/training/my-enrollments', token),

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
      deactivate: (id: string) =>
        apiFetch<{ success: boolean }>(`/cqc-questions/${id}`, token, { method: 'DELETE' }),
      deliver: (id: string, data: { user_ids: string[]; channel?: string }) =>
        apiFetch<{ delivered: number }>(`/cqc-questions/${id}/deliver`, token, { method: 'POST', body: JSON.stringify(data) }),
      deliveries: () =>
        apiFetch<{ deliveries: any[] }>('/cqc-questions/deliveries', token),
      myDeliveries: () =>
        apiFetch<{ deliveries: any[] }>('/cqc-questions/my-deliveries', token),
      submitAnswer: (deliveryId: string, answer_text: string) =>
        apiFetch<{ delivery: any; score: number; feedback: string }>(`/cqc-questions/deliveries/${deliveryId}/answer`, token, { method: 'POST', body: JSON.stringify({ answer_text }) }),
    },

    audits: {
      templates: () => apiFetch<{ templates: any[] }>('/audits/templates', token),
      createTemplate: (data: any) => apiFetch<{ template: any }>('/audits/templates', token, { method: 'POST', body: JSON.stringify(data) }),
      runs: (params?: { status?: string; template_id?: string }) => {
        const qs = new URLSearchParams()
        if (params?.status)      qs.set('status',      params.status)
        if (params?.template_id) qs.set('template_id', params.template_id)
        return apiFetch<{ runs: any[] }>(`/audits/runs${qs.toString() ? '?' + qs : ''}`, token)
      },
      createRun: (data: { template_id: string; audit_month: string; auditor_name?: string; auditor_role?: string }) =>
        apiFetch<{ run: any }>('/audits/runs', token, { method: 'POST', body: JSON.stringify(data) }),
      getRun: (id: string) => apiFetch<{ run: any }>(`/audits/runs/${id}`, token),
      updateRun: (id: string, data: any) => apiFetch<{ run: any }>(`/audits/runs/${id}`, token, { method: 'PUT', body: JSON.stringify(data) }),
      saveAnswers: (id: string, answers: Array<{ question_id: string; answer_yn?: boolean | null; outcome_text?: string | null; actions_text?: string | null }>) =>
        apiFetch<{ saved: number }>(`/audits/runs/${id}/answers`, token, { method: 'POST', body: JSON.stringify({ answers }) }),
      complete: (id: string) => apiFetch<{ run: any; recommendations: string }>(`/audits/runs/${id}/complete`, token, { method: 'POST' }),
      report: (id: string) => apiFetch<{ report: any }>(`/audits/runs/${id}/report`, token),
      stats: () => apiFetch<{
        total: number; completed: number; in_progress: number
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
      counts: () => apiFetch<{ training: number; induction: number; cqc: number }>('/me/counts', token),
    },

    analytics: {
      get: () => apiFetch<any>('/analytics', token),
      training: () => apiFetch<any>('/analytics/training', token),
      staffRisk: () => apiFetch<{ staff: Array<{ id: string; name: string; job_role: string | null; flags: Array<{ level: 'high' | 'medium'; kind: string; label: string }>; severity: number }>; summary: { total_flagged: number; high: number } }>('/analytics/staff-risk', token),
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
        coverage_score:    number
        unanswered_themes: Array<{ theme: string; count: number; sample_questions: string[] }>
        regulation_gaps:   Array<{ reference_key: string; official_name: string; summary: string; care_home_context: string; covered: boolean }>
        meta: { no_match_total: number; days_analysed: number; regulations_total: number; regulations_covered: number }
      }>('/analytics/gaps', token),
    },
  }
}
