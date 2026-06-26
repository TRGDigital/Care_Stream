// Typed fetch client for the CareStreamAI platform admin API (/admin/*).
// Uses a static Bearer token obtained at login — separate from tenant JWTs.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Fully-qualify a relative API asset path (e.g. /public/training/image/uuid.webp).
export function platformAssetUrl(path?: string | null): string | null {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`
}

export interface TrainingSeoIndex {
  pages:  Array<{ path: string; title: string; description: string }>
  images: Array<{ src: string; alt: string }>   // src is API-relative
}

// Public (no-auth) index of the standard training module pages and their images,
// used to populate the Pages and Alt Tags tabs with editable rows.
export async function fetchTrainingSeoIndex(): Promise<TrainingSeoIndex> {
  try {
    const res = await fetch(`${API_URL}/public/training/seo-index`)
    if (res.ok) {
      const body = await res.json()
      return { pages: body?.data?.pages ?? [], images: body?.data?.images ?? [] }
    }
  } catch {
    // ignore — tabs just show the existing entries
  }
  return { pages: [], images: [] }
}

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

export async function platformLogin(email: string, password: string): Promise<string> {
  const res = await fetch(`${API_URL}/admin/login`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json' },
    body:    JSON.stringify({ email, password }),
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
  indexedPageCount?: number
  indexBalance?:     number | null
}

export interface AgentEventsData {
  total:       number
  last7Days:   number
  last30Days:  number
  mutations:   number
  byTool:      Array<{ tool: string; count: number }>
  recent:      Array<{
    id: string; tool_name: string; source: string; path: string | null; status: string; created_at: string
    mutation?: boolean; confirmed?: boolean | null; summary?: string | null; tenant_id?: string | null
  }>
}

export interface LeadsData {
  total:    number
  newCount: number
  leads:    Array<{
    id: string; type: string; name: string; email: string
    organisation: string | null; role: string | null; phone: string | null; homes: string | null
    subject: string | null; message: string | null; source: string; status: string; created_at: string
  }>
}

export interface PlanLimits {
  name:                         string
  price_monthly_pence?:         number | null
  price_annual_pence?:          number | null
  monthly_query_limit:          number
  monthly_annual_license_limit?: number | null
  max_policies:                 number | null
  max_staff_users:              number | null
  max_handbooks:                number | null
  max_manual_knowledge_entries: number | null
  has_gap_detection:            boolean
  has_face_to_face?:            boolean
  has_custom_audits?:           boolean
  has_effectiveness?:           boolean
  has_training_impact?:         boolean
}

export interface TenantSummary {
  id:                  string
  account_number:      string
  name:                string
  slug:                string
  tier:                string   // "full" | "training_only"
  subscription_status: string
  created_at:          string
  plan:                PlanLimits | null
  sub_tenant_count:    number
  stats: {
    policyCount:          number
    handbookCount:        number
    knowledgeCount:       number
    manualKnowledgeCount: number
    queryCount:           number
    activeUserCount:      number
    queriesThisMonth:     number
    annualLicensesUsed?:  number
    annualLicenseLimit?:  number | null
  }
}

export interface TenantInsights {
  vectors: {
    namespaces: Array<{ name: string; label: string; count: number }>
    total: number
    available: boolean
  }
  storage: { objects: number; bytes: number; available: boolean }
  queries: { total: number; last30: number }
  costs: {
    pinecone_usd: number
    s3_usd: number
    ai_usd: number
    embed_onetime: number
    total_monthly_usd: number
    ai_measured?: boolean
    ai_costed_queries?: number
    ai_uncosted_queries?: number
    ai_input_tokens?: number
    ai_output_tokens?: number
    note: string
  }
}

export interface PlatformCosts {
  period_days: number
  ai: {
    usd: number
    measured: boolean
    costed_queries: number
    uncosted_queries: number
    total_queries: number
    input_tokens: number
    output_tokens: number
  }
  pinecone: { usd: number; vectors: number; namespaces: number; available: boolean }
  s3:       { usd: number; bytes: number; objects: number; available: boolean }
  email:    { usd: number; sends: number; reply_emails: number; training_sends: number }
  total_monthly_usd: number
  note: string
}

export interface TenantDetail {
  tenant:               TenantSummary & { email_domain: string; branding_signoff: string }
  policies:             any[]
  recentQueries:        any[]
  knowledgeCount:       number
  manualKnowledgeCount: number
  userCount:            number
  queriesThisMonth:     number
  handbookCount:        number
  annual_license?: {
    used:      number
    limit:     number | null
    remaining: number | null
  }
  storage?: {
    bucket:          string | null
    region:          string
    prefix:          string
    policies_prefix: string
  }
  training_licences?: Array<{
    module_slug:    string
    module_name:    string
    total:          number
    allocated:      number
    price_pence:    number
    purchased_at:   string
    renewal_due_at: string
    allocations:    Array<{ name: string; email: string | null }>
  }>
}

export interface AuditFreqStats {
  completed:    number
  in_progress:  number
  last_completed: string | null
}

export interface TenantAuditStats {
  total:        number
  completed:    number
  in_progress:  number
  by_frequency: Record<string, AuditFreqStats>
}

export interface BlogAuthor {
  id:         string
  name:       string
  title:      string | null
  photo_url:  string | null
  bio:        string | null
  created_at: string
}

export interface BlogPost {
  id:                    string
  title:                 string
  slug:                  string
  excerpt:               string | null
  meta_title:            string | null
  meta_description:      string | null
  feature_image_url:     string | null
  feature_image_alt:     string | null
  og_image_url:          string | null
  content:               string
  author_id:             string | null
  category:              string
  publication_date:      string | null
  status:                string
  is_featured:           boolean
  read_time_minutes:     number
  cta_text:              string | null
  cta_url:               string | null
  special_message:       string | null
  special_message_color: string | null
  key_info_title:        string | null
  key_info_content:      string | null
  faqs:                  Array<{ question: string; answer: string }> | null
  created_at:            string
  updated_at:            string
  author:                { id: string; name: string; photo_url: string | null } | null
}

export interface SitePage {
  id:             string
  path:           string
  title:          string
  description:    string | null
  og_title:       string | null
  og_description: string | null
  og_image_url:   string | null
  is_footer_page: boolean
  footer_group:   string | null
  footer_label:   string | null
  footer_sort:    number
  page_type:      string
  status:         string
  faqs:           Array<{ question: string; answer: string }>
  content:        string
  created_at:     string
  updated_at:     string
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

export interface TrainingSeed {
  id:                       string
  slug:                     string
  training_type:            string
  also_known_as:            string[]
  summary:                  string
  care_context:             string
  care_company_interaction: string
  practical_meaning:        string
  source_urls:              string[]
  is_active:                boolean
  care_setting:             string | null   // setting of the matching topic (NULL = universal)
  care_setting_label:       string | null   // human label for the setting tag
  created_at:               string
  updated_at:               string
}

export interface CqcSeed {
  id:                string
  slug:              string
  framework_area:    string
  also_known_as:     string[]
  description:       string
  inspector_focus:   string
  evidence_expected: string
  rating_indicators: string
  source_urls:       string[]
  is_active:         boolean
  created_at:        string
  updated_at:        string
}

export interface AuditSeedQuestion {
  id:            string
  question_text: string
  question_type: string
  question_order: number
}

export interface AuditSeedSection {
  id:            string
  title:         string
  section_order: number
  questions:     AuditSeedQuestion[]
}

export interface AuditSeedTemplate {
  id:          string
  name:        string
  description: string | null
  frequency:   string
  sections:    AuditSeedSection[]
}

export interface UsageData {
  tenantUsage:         Array<{ tenant_id: string; tenant_name: string; query_count: number }>
  dailySeries:         Array<{ date: string; count: number }>
  totalLast30:         number
  noMatchRatePercent:  number
}

export interface RevenueData {
  summary: {
    mrr_pence:       number
    arr_pence:       number
    active_count:    number
    trialling_count: number
    past_due_count:  number
    cancelled_count: number
    total_count:     number
  }
  plan_breakdown: Array<{
    plan_name:        string
    plan_price_pence: number
    active_count:     number
    trialling_count:  number
    mrr_pence:        number
  }>
  clients: Array<{
    id:                  string
    name:                string
    plan_name:           string | null
    plan_price_pence:    number | null
    subscription_status: string
    stripe_customer_id:  string | null
    created_at:          string
  }>
  stripe_connected:  boolean
  monthly_series:    Array<{ month: string; revenue_pence: number }>
  daily_series:      Array<{ date: string; revenue_pence: number }>
}

export interface OutputRecord {
  id: string
  query_text: string
  response_text: string
  no_match: boolean
  feedback: 'positive' | 'negative' | null
  response_time_ms: number
  language_detected: string
  created_at: string
  user_name: string | null
}

export interface PromptVersion {
  id: string
  label: string
  content: string
  saved_at: string
}

export interface FeedbackStat {
  category: string
  total: number
  positive: number
  negative: number
  unrated: number
  positive_pct: number | null
}

export async function uploadBlogImage(token: string, file: File): Promise<string> {
  const form = new FormData()
  form.append('image', file)
  const res = await fetch(`${API_URL}/admin/blog/upload-image`, {
    method:  'POST',
    headers: { Authorization: `Bearer ${token}` },
    body:    form,
  })
  const body = await res.json()
  if (!res.ok || !body.success) throw new Error(body.error?.message ?? `Upload failed ${res.status}`)
  return body.data.url as string
}

// ─── Prospects (outbound CQC-sourced lead universe) ──────────────────────────
export type ProspectSegment = 'rescue' | 'protect' | 'maintain' | 'defend' | 'unrated'

export interface ProviderLead {
  id: string
  source_id: string
  slug: string | null
  name: string
  setting: string | null
  town: string | null
  county: string | null
  region: string | null
  postcode: string | null
  phone: string | null
  email: string | null
  website: string | null
  cqc_rating: string | null
  cqc_safe_rating: string | null
  cqc_effective_rating: string | null
  cqc_caring_rating: string | null
  cqc_responsive_rating: string | null
  cqc_well_led_rating: string | null
  cqc_inspection_date: string | null
  cqc_report_url: string | null
  segment: ProspectSegment
  score: number
  lead_angle_key: string | null
  lead_angle_label: string | null
  failing_domains: string[]
  why_now: string | null
  status: string
  owner: string | null
  notes: string | null
  last_contacted_at: string | null
  next_action_at: string | null
  ai_draft_subject: string | null
  ai_draft_body: string | null
  ai_draft_sources: string | null
  ai_drafted_at: string | null
  contact_name: string | null
  contact_role: string | null
  enriched_email: string | null
  enrichment_source: string | null
  company_number: string | null
  enriched_at: string | null
  synced_at: string
}

export interface ProspectsListData {
  rows: ProviderLead[]
  total: number
  page: number
  pageSize: number
  segmentCounts: Record<string, number>
}

export interface ProspectFilters {
  segment?: ProspectSegment
  status?: string
  setting?: string
  region?: string
  rating?: string
  q?: string
  sort?: 'score' | 'inspected' | 'name'
  page?: number
  pageSize?: number
}

export interface ProspectsMeta {
  regions: string[]
  settings: string[]
  statuses: string[]
  segments: Array<{ key: ProspectSegment; label: string; tagline: string }>
}

export interface ProspectSyncResult {
  fetched: number
  upserted: number
  bySegment: Record<string, number>
  durationMs: number
}

export function createPlatformClient(token: string) {
  return {
    stats: () =>
      adminFetch<PlatformStats>('/stats', token),

    prospects: {
      list: (f: ProspectFilters = {}) => {
        const qs = new URLSearchParams()
        Object.entries(f).forEach(([k, v]) => { if (v !== undefined && v !== '') qs.set(k, String(v)) })
        const q = qs.toString()
        return adminFetch<ProspectsListData>(`/prospects${q ? `?${q}` : ''}`, token)
      },
      filters: () => adminFetch<ProspectsMeta>('/prospects/filters', token),
      get: (id: string) => adminFetch<{ lead: ProviderLead; draft: { subject: string; body: string } }>(`/prospects/${id}`, token),
      update: (id: string, data: { status?: string; owner?: string | null; notes?: string | null; next_action_at?: string | null }) =>
        adminFetch<{ lead: ProviderLead }>(`/prospects/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      draftAi: (id: string) =>
        adminFetch<{ subject: string; body: string; sources: 'cqc-report' | 'signals' }>(`/prospects/${id}/draft-ai`, token, { method: 'POST' }),
      enrich: (id: string) =>
        adminFetch<{ result: { contactName: string | null; contactRole: string | null; email: string | null; companyNumber: string | null; source: string; notes: string | null }; lead: ProviderLead }>(`/prospects/${id}/enrich`, token, { method: 'POST' }),
      sync: () => adminFetch<ProspectSyncResult>('/prospects/sync', token, { method: 'POST' }),
    },

    cpdReviews: () => adminFetch<{
      modules: Array<{ id: string; name: string; group_key: string | null; duration_minutes: number | null; pass_mark: number | null; approved: boolean; status: string; notes: string | null; reviewer_name: string | null; updated_at: string | null }>
      counts: Record<string, number>; total: number
    }>('/cpd-reviews', token),

    featureRequests: {
      list: () => adminFetch<{
        requests: Array<{ id: string; tenant_id: string; tenant_name: string | null; submitter_name: string | null; submitter_email: string | null; title: string; details: string; status: string; created_at: string }>
        counts: Record<string, number>; total: number
      }>('/feature-requests', token),
      updateStatus: (id: string, status: string) =>
        adminFetch<{ updated: boolean }>(`/feature-requests/${id}`, token, { method: 'PATCH', body: JSON.stringify({ status }) }),
    },

    onboarding: {
      emails: (plan: string) => adminFetch<{ plan: string; emails: Array<{
        id: string; plan: string; day_index: number; subject: string; preheader: string
        from_email: string | null; badge: string | null; headline: string | null; image: string | null
        stats: { sent: number; delivered: number; opened: number; clicked: number; bounced: number; delivered_pct: number | null; open_pct: number | null; click_pct: number | null; first_sent_at: string | null }
      }> }>(`/onboarding/emails?plan=${encodeURIComponent(plan)}`, token),
      update: (id: string, data: { subject?: string; preheader?: string; from_email?: string }) =>
        adminFetch<{ id: string }>(`/onboarding/emails/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      preview: (id: string) => adminFetch<{ html: string; subject: string }>(`/onboarding/emails/${id}/preview`, token),
      test: (id: string, to: string) => adminFetch<{ sent: string }>(`/onboarding/emails/${id}/test`, token, { method: 'POST', body: JSON.stringify({ to }) }),
      forTenant: (id: string) => adminFetch<{
        enrolment: { plan: string; start_date: string; status: string } | null
        sends: Array<{ day_index: number; email_id: string | null; subject: string; recipient_email: string; status: string; sent_at: string | null; delivered_at: string | null; first_opened_at: string | null; open_count: number; first_clicked_at: string | null; click_count: number }>
        summary: { sent: number; delivered: number; opened: number; clicked: number; bounced: number; delivered_pct: number | null; open_pct: number | null; click_pct: number | null }
      }>(`/tenants/${id}/onboarding`, token),
    },

    standardTraining: {
      catalogue: () => adminFetch<{
        groups: Record<string, string>
        settings: Array<{ key: string; label: string }>
        topics: Array<{ id: string; title: string; group_key: string; care_setting: string | null; default_frequency: string; requires_practical: boolean; aliases: string[]; module: null | { id: string; name: string; approved: boolean; approved_at: string | null; created_at: string; frequency: string; requires_practical: boolean; pass_mark: number; duration_minutes: number | null; question_count: number; illustration_url: string | null; image_count: number; image_slots: number; standards_count: number; attested_by_name: string | null; attested_by_role: string | null; attested_at: string | null; qa_hard_fails: number; qa_warnings: number; review_status: string | null; review_changes_open: number } }>
      }>('/standard-training', token),
      generate: (topicId: string) => adminFetch<{ module: any }>('/standard-training/generate', token, { method: 'POST', body: JSON.stringify({ topic_id: topicId }) }),
      neutralise: (moduleId: string) => adminFetch<{ module: any }>(`/standard-training/modules/${moduleId}/neutralise`, token, { method: 'POST' }),
      moduleFull: (id: string) => adminFetch<{
        module: any
        question_history: { used_count: number; prior_versions: number; last_regenerated_at: string | null; review_due: boolean; review_due_at: string | null; interval_months: number }
        qa: { checks: Array<{ key: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }>; hard_fails: number; warnings: number; ok_to_approve: boolean }
        standards_catalogue: Array<{ framework: string; label: string; items: Array<{ code: string; label: string }> }>
        review_links: Array<{ id: string; status: string; created_at: string; expires_at: string; reviewer_name: string | null; reviewer_role: string | null; reviewer_org: string | null; decision: string | null; comments: string | null; decided_at: string | null; stale: boolean; item_feedback: Array<{ ref: string; label: string; status: string; note: string; resolved: boolean }> | null }>
      }>(`/standard-training/modules/${id}/full`, token),
      updateModule: (id: string, data: any) => adminFetch<{ module: any }>(`/standard-training/modules/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      approveModule: (id: string, opts: { approved?: boolean; reviewer_name?: string; reviewer_role?: string; external_link_id?: string } = {}) => adminFetch<{ module: any }>(`/standard-training/modules/${id}/approve`, token, { method: 'POST', body: JSON.stringify({ approved: opts.approved !== false, reviewer_name: opts.reviewer_name, reviewer_role: opts.reviewer_role, external_link_id: opts.external_link_id }) }),
      createReviewLink: (id: string) => adminFetch<{ token: string; password: string; expires_at: string; path: string }>(`/standard-training/modules/${id}/review-link`, token, { method: 'POST' }),
      revokeReviewLink: (linkId: string) => adminFetch<{ revoked: boolean }>(`/standard-training/review-links/${linkId}/revoke`, token, { method: 'POST' }),
      resolveReviewItem: (linkId: string, ref: string, resolved: boolean) => adminFetch<{ item_feedback: any[] }>(`/standard-training/review-links/${linkId}/resolve`, token, { method: 'POST', body: JSON.stringify({ ref, resolved }) }),
      generateImage: (id: string) => adminFetch<{ illustration_url: string | null }>(`/standard-training/modules/${id}/generate-image`, token, { method: 'POST' }),
      generateSectionImage: (id: string, index: number) => adminFetch<{ image_url: string | null }>(`/standard-training/modules/${id}/sections/${index}/generate-image`, token, { method: 'POST' }),
      regenerateQuestions: (id: string) => adminFetch<{ module: any; generated: number; avoided: number }>(`/standard-training/modules/${id}/regenerate-questions`, token, { method: 'POST' }),
      setShare: (id: string, data: { enabled: boolean; password?: string }) => adminFetch<{ share_enabled: boolean; share_token: string | null; share_password: string | null; share_url: string | null }>(`/standard-training/modules/${id}/share`, token, { method: 'POST', body: JSON.stringify(data) }),
    },

    tenants: {
      list: () =>
        adminFetch<{ tenants: TenantSummary[]; total: number }>('/tenants', token),
      get: (id: string) =>
        adminFetch<TenantDetail>(`/tenants/${id}`, token),
      invoices: (id: string) => adminFetch<{
        invoices: Array<{ id: string; date: string; description: string; amount_pence: number; status: string; pdf_url: string | null; hosted_url: string | null }>
        next_billing_date: string | null
        billing_interval: string | null
        total_paid_pence: number
        monthly_pence: number | null
        currency: string
        subscription_status: string
        trial_ends_at: string | null
        plan_name: string | null
      }>(`/tenants/${id}/invoices`, token),
      aiUsage: (id: string) => adminFetch<{
        credits: { used: number; limit: number | null; remaining: number | null; resets_at: string; by_action: Record<string, number> }
        other_ai: Record<string, number>
        queries: { used: number; limit: number | null; remaining: number | null; resets_at: string }
        annual_training: { modules: Array<{ id: string; name: string; tailored: boolean; assigned: number; completed: number }>; tailored: number; standard: number }
      }>(`/tenants/${id}/ai-usage`, token),
      queries: (id: string, params?: Record<string, string>) => {
        const qs = params ? '?' + new URLSearchParams(params) : ''
        return adminFetch<any>(`/tenants/${id}/queries${qs}`, token)
      },
      sessionMessages: (id: string, sessionId: string) =>
        adminFetch<{ messages: any[] }>(`/tenants/${id}/sessions/${sessionId}`, token),

      staff: (id: string) =>
        adminFetch<{ users: Array<{
          id: string; name: string; email: string; role: string; job_role: string | null
          is_active: boolean; created_at: string; first_login_at: string | null; last_login_at: string | null
        }>; total: number }>(`/tenants/${id}/staff`, token),

      resetStaffPassword: (tenantId: string, userId: string) =>
        adminFetch<{ user: { id: string; name: string; email: string }; temp_password: string }>(
          `/tenants/${tenantId}/staff/${userId}/reset-password`, token, { method: 'POST' }
        ),

      sendStaffCredentials: (tenantId: string, userId: string, tempPassword: string) =>
        adminFetch<{ sent: boolean }>(`/tenants/${tenantId}/staff/${userId}/send-credentials`, token, {
          method: 'POST', body: JSON.stringify({ temp_password: tempPassword }),
        }),

      deactivateStaff: (tenantId: string, userId: string) =>
        adminFetch<{ deactivated: boolean }>(`/tenants/${tenantId}/staff/${userId}/deactivate`, token, { method: 'POST' }),

      resetPolicies: (id: string) =>
        adminFetch<{ policies_deleted: number; knowledge_deleted: number; files_deleted: number }>(
          `/tenants/${id}/policies/reset`, token, { method: 'POST' }
        ),

      insights: (id: string) =>
        adminFetch<TenantInsights>(`/tenants/${id}/insights`, token),

      // Mint a one-time sign-in link to open the client's own dashboard.
      openAccount: (id: string, userId?: string) =>
        adminFetch<{ url: string; signed_in_as: { id: string; name: string; email: string } }>(
          `/tenants/${id}/open-account`, token, { method: 'POST', body: JSON.stringify(userId ? { user_id: userId } : {}) }
        ),

      costs: () => adminFetch<PlatformCosts>(`/costs`, token),

      reactivateStaff: (tenantId: string, userId: string) =>
        adminFetch<{ reactivated: boolean }>(`/tenants/${tenantId}/staff/${userId}/reactivate`, token, { method: 'POST' }),
      subTenants: (id: string) =>
        adminFetch<{ sub_tenants: Array<{ id: string; name: string; slug: string; subscription_status: string; created_at: string }>; total: number }>(
          `/tenants/${id}/sub-tenants`, token
        ),

      createSubTenant: (id: string, data: { name: string }) =>
        adminFetch<{ tenant: { id: string; name: string; slug: string } }>(
          `/tenants/${id}/sub-tenants`, token, { method: 'POST', body: JSON.stringify(data) }
        ),

      auditStats: (id: string) =>
        adminFetch<TenantAuditStats>(`/tenants/${id}/audit-stats`, token),

      analytics: (id: string) =>
        adminFetch<any>(`/tenants/${id}/analytics`, token),
      cqcReport: (id: string, dateFrom?: string, dateTo?: string) => {
        const qs = new URLSearchParams()
        if (dateFrom) qs.set('date_from', dateFrom)
        if (dateTo)   qs.set('date_to',   dateTo)
        return adminFetch<any>(`/tenants/${id}/analytics/cqc-report${qs.toString() ? '?' + qs : ''}`, token)
      },
    },

    cqcPrepSummary: () =>
      adminFetch<{
        summary:    { total_sent: number; total_answered: number; avg_score: number | null; tenants_active: number }
        by_domain:  Array<{ domain: string; total_answered: number; avg_score: number | null }>
        by_tenant:  Array<{ tenant_id: string; name: string; total_sent: number; total_answered: number; avg_score: number | null }>
      }>('/cqc-prep/summary', token),

    auditSummary: () =>
      adminFetch<{
        summary:      { total: number; completed: number; in_progress: number; tenants_active: number }
        by_frequency: Array<{ frequency: string; completed: number; in_progress: number; last_completed: string | null }>
        by_tenant:    Array<{ tenant_id: string; tenant_name: string; completed: number; in_progress: number }>
      }>('/audits/summary', token),

    usage: () =>
      adminFetch<UsageData>('/usage', token),

    revenue: () =>
      adminFetch<RevenueData>('/revenue', token),

    agentEvents: () =>
      adminFetch<AgentEventsData>('/agent-events', token),

    leads: () =>
      adminFetch<LeadsData>('/leads', token),

    dailyActivity: (days = 30) =>
      adminFetch<{ series: Array<{ date: string; chat: number; email: number; whatsapp: number }>; days: number }>(
        `/daily-activity?days=${days}`, token
      ),

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

    auditSeeds: {
      list: () =>
        adminFetch<{ templates: AuditSeedTemplate[]; total: number }>('/audit-seeds', token),
    },

    trainingSeeds: {
      list: () =>
        adminFetch<{ seeds: TrainingSeed[]; total: number }>('/training-seeds', token),
      create: (data: Partial<TrainingSeed>) =>
        adminFetch<TrainingSeed>('/training-seeds', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<TrainingSeed>) =>
        adminFetch<TrainingSeed>(`/training-seeds/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/training-seeds/${id}`, token, { method: 'DELETE' }),
    },

    cqcSeeds: {
      list: () =>
        adminFetch<{ seeds: CqcSeed[]; total: number }>('/cqc-seeds', token),
      create: (data: Partial<CqcSeed>) =>
        adminFetch<CqcSeed>('/cqc-seeds', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<CqcSeed>) =>
        adminFetch<CqcSeed>(`/cqc-seeds/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/cqc-seeds/${id}`, token, { method: 'DELETE' }),
      syncSheet: () =>
        adminFetch<{ synced_at: string; total_rows: number; upserted: number; unchanged: number; errors: string[] }>(
          '/cqc-seeds/sync-sheet', token, { method: 'POST' }
        ),
      populateSheet: () =>
        adminFetch<{ written: number; errors: string[] }>(
          '/cqc-seeds/populate-sheet', token, { method: 'POST' }
        ),
    },

    blog: {
      posts: () =>
        adminFetch<{ posts: BlogPost[]; total: number }>('/blog/posts', token),
      createPost: (data: Partial<BlogPost>) =>
        adminFetch<{ post: BlogPost }>('/blog/posts', token, { method: 'POST', body: JSON.stringify(data) }),
      updatePost: (id: string, data: Partial<BlogPost>) =>
        adminFetch<{ post: BlogPost }>(`/blog/posts/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deletePost: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/blog/posts/${id}`, token, { method: 'DELETE' }),

      authors: () =>
        adminFetch<{ authors: BlogAuthor[]; total: number }>('/blog/authors', token),
      createAuthor: (data: Partial<BlogAuthor>) =>
        adminFetch<{ author: BlogAuthor }>('/blog/authors', token, { method: 'POST', body: JSON.stringify(data) }),
      updateAuthor: (id: string, data: Partial<BlogAuthor>) =>
        adminFetch<{ author: BlogAuthor }>(`/blog/authors/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      deleteAuthor: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/blog/authors/${id}`, token, { method: 'DELETE' }),
    },

    sitePages: {
      list: () =>
        adminFetch<{ pages: SitePage[] }>('/site-pages', token),
      upsert: (data: Partial<SitePage> & { path: string }) =>
        adminFetch<{ page: SitePage }>('/site-pages', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<SitePage>) =>
        adminFetch<{ page: SitePage }>(`/site-pages/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/site-pages/${id}`, token, { method: 'DELETE' }),
    },

    prompts: {
      list: () =>
        adminFetch<{ prompts: Array<{ id: string; usage: string; label: string; content: string; updated_at: string }> }>('/prompts', token),
      create: (data: { usage: string; label?: string; content: string }) =>
        adminFetch<{ id: string; usage: string; label: string; content: string; updated_at: string }>('/prompts', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: { label?: string; content?: string }) =>
        adminFetch<{ id: string; usage: string; label: string; content: string; updated_at: string }>(`/prompts/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      promptOutputs: (usage: string, limit = 30, tenantId?: string) => {
        const qs = new URLSearchParams({ limit: String(limit) })
        if (tenantId) qs.set('tenant_id', tenantId)
        return adminFetch<{ outputs: OutputRecord[] }>(`/prompts/outputs/${usage}?${qs}`, token)
      },
      promptVersions: (promptId: string) =>
        adminFetch<{ versions: PromptVersion[] }>(`/prompts/${promptId}/versions`, token),
      feedbackStats: (tenantId?: string) => {
        const qs = tenantId ? `?tenant_id=${tenantId}` : ''
        return adminFetch<{ stats: FeedbackStat[] }>(`/prompts/feedback-stats${qs}`, token)
      },
    },

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

    onboardingTemplates: {
      list: () => adminFetch<{ flows: OnboardingTemplate[] }>('/onboarding-templates', token),
      create: (data: { name: string; description?: string; job_roles?: string[]; flow_kind?: string; care_setting?: string | null; difficulties?: string[] }) =>
        adminFetch<{ flow: OnboardingTemplate }>('/onboarding-templates', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<{ name: string; description: string | null; job_roles: string[]; flow_kind: string; care_setting: string | null; difficulties: string[]; is_active: boolean; steps: OnboardingTemplateStep[] }>) =>
        adminFetch<{ flow: OnboardingTemplate }>(`/onboarding-templates/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/onboarding-templates/${id}`, token, { method: 'DELETE' }),
      aiDraft: (id: string, keep?: OnboardingTemplateStep[]) =>
        adminFetch<{ flow: OnboardingTemplate }>(`/onboarding-templates/${id}/ai-draft`, token, { method: 'POST', body: keep ? JSON.stringify({ keep }) : undefined }),
      seedRoles: (setting?: string) =>
        adminFetch<{ created: number }>(`/onboarding-templates/seed-roles${setting ? `?setting=${setting}` : ''}`, token, { method: 'POST' }),
    },

    policySeeds: {
      list: () => adminFetch<{ seeds: PolicySeedMeta[] }>('/policy-seeds', token),
      get: (id: string) => adminFetch<{ seed: PolicySeed }>(`/policy-seeds/${id}`, token),
      update: (id: string, data: Partial<{ section: string | null; title: string; content: string; reviewed: boolean }>) =>
        adminFetch<{ seed: PolicySeed }>(`/policy-seeds/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id: string) => adminFetch<{ deleted: boolean }>(`/policy-seeds/${id}`, token, { method: 'DELETE' }),
      importBatch: (tenantId: string, limit = 4, setting?: string) =>
        adminFetch<{ imported: number; remaining: number; total: number; already: number; setting: string }>(
          `/policy-seeds/import/${tenantId}?limit=${limit}${setting ? `&setting=${setting}` : ''}`, token, { method: 'POST' }),
      aiClean: (id: string) =>
        adminFetch<{ seed: PolicySeed }>(`/policy-seeds/${id}/ai-clean`, token, { method: 'POST' }),
    },
  }
}

export interface PolicySeedMeta {
  id:                string
  care_setting:      string | null
  section:           string | null
  title:             string
  document_category: string
  reviewed:          boolean
  source_policy_id:  string | null
  updated_at:        string
  char_count:        number
}

export interface PolicySeed extends PolicySeedMeta {
  content:          string
  source_tenant_id: string | null
}

export interface OnboardingTemplateStep {
  id?:             string
  order:           number
  title:           string
  type:            'read_policy' | 'answer_question'
  policy_section?: string | null
  question?:       string | null
  options?:        string[]
  correct_option?: number | null
  locked?:         boolean
}

export interface OnboardingTemplate {
  id:           string
  name:         string
  description:  string | null
  job_roles:    string[]
  flow_kind:    'primary' | 'secondary'
  care_setting: string | null
  difficulties: string[]
  is_active:    boolean
  steps:        OnboardingTemplateStep[]
}
