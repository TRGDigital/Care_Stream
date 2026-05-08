// Typed fetch client for the CareStreamAI platform admin API (/admin/*).
// Uses a static Bearer token obtained at login — separate from tenant JWTs.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

const TOKEN_KEY = 'platform_admin_token'

export function getPlatformToken(): string | null {
  if (typeof window === 'undefined') return null
  return sessionStorage.getItem(TOKEN_KEY)
}

export function setPlatformToken(token: string): void {
  sessionStorage.setItem(TOKEN_KEY, token)
}

export function clearPlatformToken(): void {
  sessionStorage.removeItem(TOKEN_KEY)
}

async function adminFetch<T>(
  path:    string,
  token:   string,
  options: RequestInit = {},
): Promise<T> {
  const res = await fetch(`${API_URL}/admin${path}`, {
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

// ─── Login ─────────────────────────────────────────────────────────────────────

export async function platformLogin(password: string): Promise<string> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ password }),
  })
  const body = await res.json()
  if (!res.ok || !body.success) {
    throw new Error(body.error?.message ?? 'Login failed')
  }
  return body.data.token as string
}

// ─── Platform API client ──────────────────────────────────────────────────────

export interface PlatformStats {
  tenantCount:       number
  activePolicyCount: number
  knowledgeCount:    number
  queryCount:        number
  regulationCount:   number
  queriesLast7Days:  number
  queriesLast30Days: number
}

export interface TenantSummary {
  id:                  string
  name:                string
  slug:                string
  subscription_status: string
  created_at:          string
  plan:                { name: string } | null
  stats: {
    policyCount:       number
    knowledgeCount:    number
    queryCount:        number
    userCount:         number
    queriesThisMonth:  number
  }
}

export interface TenantDetail {
  tenant:        TenantSummary & { plan: any; email_domain: string; branding_signoff: string }
  policies:      any[]
  recentQueries: any[]
  knowledgeCount: number
  userCount:      number
}

export interface Regulation {
  id:                       string
  reference_key:            string
  official_name:            string
  also_known_as:            string[]
  summary:                  string
  care_home_context:        string
  care_company_interaction: string
  practical_meaning:        string
  source_urls:              string[]
  is_active:                boolean
  pinecone_vector_id:       string | null
  last_synced_at:           string | null
}

export interface UsageData {
  tenantUsage:         Array<{ tenant_id: string; tenant_name: string; query_count: number }>
  dailySeries:         Array<{ date: string; count: number }>
  totalLast30:         number
  noMatchRatePercent:  number
}

export function createPlatformClient(token: string) {
  return {
    stats: () =>
      adminFetch<PlatformStats>('/stats', token),

    tenants: {
      list: () =>
        adminFetch<{ tenants: TenantSummary[]; total: number }>('/tenants', token),
      get: (id: string) =>
        adminFetch<TenantDetail>(`/tenants/${id}`, token),
      queries: (id: string, params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params) : ''
        return adminFetch<any>(`/tenants/${id}/queries${qs}`, token)
      },
      analytics: (id: string) =>
        adminFetch<any>(`/tenants/${id}/analytics`, token),
      cqcReport: (id: string, dateFrom?: string, dateTo?: string) => {
        const qs = new URLSearchParams()
        if (dateFrom) qs.set('date_from', dateFrom)
        if (dateTo)   qs.set('date_to',   dateTo)
        return adminFetch<any>(`/tenants/${id}/analytics/cqc-report${qs.toString() ? '?' + qs : ''}`, token)
      },
    },

    usage: () =>
      adminFetch<UsageData>('/usage', token),

    regulations: {
      list: () =>
        adminFetch<{ regulations: Regulation[]; total: number }>('/regulations', token),
      create: (data: Partial<Regulation>) =>
        adminFetch<Regulation>('/regulations', token, {
          method: 'POST',
          body:   JSON.stringify(data),
        }),
      update: (id: string, data: Partial<Regulation>) =>
        adminFetch<Regulation>(`/regulations/${id}`, token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/regulations/${id}`, token, { method: 'DELETE' }),
      sync: () =>
        adminFetch<any>('/regulations/sync', token, { method: 'POST' }),
    },

    prompts: () =>
      adminFetch<{ prompts: Array<{ id: string; label: string; content: string }> }>('/prompts', token),

    seeds: {
      list: () =>
        adminFetch<{
          seeds: Array<{
            slug:         string
            category:     string
            question:     string
            answer:       string
            source_name:  string
            seeded_count: number
            custom?:      boolean
          }>
          total:         number
          total_tenants: number
        }>('/knowledge-seeds', token),
      create: (data: { slug: string; category: string; question: string; answer: string; source_name: string }) =>
        adminFetch<{ id: string; slug: string; category: string; question: string; answer: string; source_name: string; custom: boolean }>(
          '/knowledge-seeds',
          token,
          { method: 'POST', body: JSON.stringify(data) },
        ),
      seedTenant: (tenantId: string) =>
        adminFetch<{ tenant_id: string; tenant_name: string; seeded: number; skipped: number }>(
          `/knowledge-seeds/seed-tenant/${tenantId}`,
          token,
          { method: 'POST' },
        ),
      seedAll: () =>
        adminFetch<{ tenants: number; total_seeded: number }>(
          '/knowledge-seeds/seed-all',
          token,
          { method: 'POST' },
        ),
    },
  }
}
