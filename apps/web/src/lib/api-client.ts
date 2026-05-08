// Typed fetch client for the CareStreamAI API.
// All requests attach the NextAuth access token as Bearer.
// Response envelope: { success, data } | { success: false, error: { code, message } }

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

export interface Citation {
  policy_id:         string
  policy_name:       string
  version:           number
  document_category: string
}

export interface KnowledgeEntry {
  id:          string
  tenant_id:   string
  question:    string
  answer:      string
  source_type: string
  source_id:   string | null
  source_name: string
  vector_id:   string | null
  approved:    boolean
  approved_at: string | null
  approved_by: string | null
  created_at:  string
  updated_at:  string
}

export interface QueryResponse {
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
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization:  `Bearer ${token}`,
      ...(options.headers as Record<string, string> | undefined ?? {}),
    },
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? `API error ${res.status}`)
  }
  return body.data as T
}

export function createApiClient(token: string) {
  return {
    query: {
      send: (data: { query_text: string; policy_id?: string; staff_name?: string; document_category?: 'internal_policy' | 'staff_handbook'; chat_session_id?: string; conversation_history?: Array<{ role: 'user' | 'assistant'; content: string }> }) =>
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
        }).then(r => r.json()),
      retry: (id: string) =>
        apiFetch<any>(`/policies/${id}/retry`, token, { method: 'POST' }),
      permanentDelete: (id: string) =>
        apiFetch<any>(`/policies/${id}/delete`, token, { method: 'POST' }),
    },

    users: {
      list: () => apiFetch<any>('/users', token),
      invite: (data: { email: string; name: string; role: string }) =>
        apiFetch<any>('/users/invite', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
    },

    billing: {
      portal: () => apiFetch<{ url: string }>('/billing/portal', token),
    },

    settings: {
      get: () => apiFetch<{ inbound_email: string; email_allowlist: string[]; facility_type: string }>('/settings', token),
      update: (data: { email_allowlist?: string[]; facility_type?: string }) =>
        apiFetch<{ email_allowlist: string[]; facility_type: string }>('/settings', token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
    },

    knowledge: {
      list: (params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params) : ''
        return apiFetch<{ entries: KnowledgeEntry[]; total: number; page: number; limit: number }>(`/knowledge${qs}`, token)
      },
      create: (data: { question: string; answer: string; source_name?: string }) =>
        apiFetch<KnowledgeEntry>('/knowledge', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      update: (id: string, data: { question?: string; answer?: string; source_name?: string }) =>
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

    analytics: {
      get: () => apiFetch<any>('/analytics', token),
      cqcReport: (dateFrom?: string, dateTo?: string) => {
        const qs = new URLSearchParams()
        if (dateFrom) qs.set('date_from', dateFrom)
        if (dateTo)   qs.set('date_to',   dateTo)
        return apiFetch<any>(`/analytics/cqc-report${qs.toString() ? '?' + qs : ''}`, token)
      },
    },
  }
}
