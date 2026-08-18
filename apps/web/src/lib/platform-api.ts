// Typed fetch client for the CareStreamAI platform admin API (/admin/*).
// Uses a static Bearer token obtained at login — separate from tenant JWTs.

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'

// Fully-qualify a relative API asset path (e.g. /public/training/image/uuid.webp).
export function platformAssetUrl(path?: string | null): string | null {
  if (!path) return null
  return /^https?:\/\//.test(path) ? path : `${API_URL}${path}`
}

export interface TrainingSeoIndex {
  pages:  Array<{ path: string; title: string; description: string; image: string | null }>  // image = hero, API-relative
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
  return localStorage.getItem(TOKEN_KEY)
}

export function setPlatformToken(token: string): void {
  localStorage.setItem(TOKEN_KEY, token)
}

export function clearPlatformToken(): void {
  localStorage.removeItem(TOKEN_KEY)
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

export interface AdoptionTenant {
  id:             string
  name:           string
  account_number: string
  tier:           string   // "full" | "training_only"
  plan_name:      string | null
  created_at:     string
  stages: {
    policies:    string | null   // earliest policy document uploaded
    staff:       string | null   // earliest staff user added
    analysis:    string | null   // first gaps analysis run
    publish:     string | null   // first policy publish
    staff_login: string | null   // first staff hub login
  }
}

export interface TenantSummary {
  id:                  string
  account_number:      string
  name:                string
  slug:                string
  tier:                string   // "full" | "training_only"
  subscription_status: string
  enterprise_discount?: boolean  // platform-allocated 20% Enterprise closing discount
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
    ai_calls?: number
    ai_input_tokens?: number
    ai_output_tokens?: number
    ai_by_feature?: Array<{ feature: string; calls: number; usd: number }>
    note: string
  }
}

export interface PlatformCosts {
  period_days: number
  ai: {
    usd: number
    measured: boolean
    calls: number
    input_tokens: number
    output_tokens: number
    by_feature: Array<{ feature: string; calls: number; usd: number }>
    by_tenant: Array<{ tenant_id: string | null; name: string; calls: number; usd: number }>
    daily: Array<{ day: string; usd: number; calls: number }>
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
  id:           string
  name:         string
  title:        string | null
  photo_url:    string | null
  bio:          string | null
  linkedin_url: string | null
  created_at:   string
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
  cta_type:              string | null
  special_message:       string | null
  special_message_color: string | null
  key_info_title:        string | null
  key_info_content:      string | null
  faqs:                  Array<{ question: string; answer: string }> | null
  sources:               Array<{ label: string; url: string }> | null
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
  content_updated: boolean
  content_slots:  Record<string, string>
  created_at:     string
  updated_at:     string
}

export interface CollectionImage { url: string; alt: string }
export interface CollectionLink  { label: string; url: string }

export interface Collection {
  id:               string
  slug:             string
  title:            string
  status:           string
  meta_title:       string | null
  meta_description: string | null
  og_image_url:     string | null
  intro:            string
  images:           CollectionImage[]
  body:             string
  links:            CollectionLink[]
  faqs:             Array<{ question: string; answer: string }>
  created_at:       string
  updated_at:       string
}

import type { FeaturePageContent } from '@/lib/feature-content'

export interface FeaturePage {
  id:               string
  slug:             string
  title:            string
  status:           string
  meta_title:       string | null
  meta_description: string | null
  og_image_url:     string | null
  content:          FeaturePageContent
  faqs:             Array<{ question: string; answer: string }>
  content_updated:  boolean
  sort:             number
  created_at:       string
  updated_at:       string
}

export interface GlossaryTerm {
  id:         string
  term:       string
  note:       string
  created_at: string
}

export interface QualityStatement {
  id:                  string
  reference_key:       string
  key_question:        string   // safe | effective | caring | responsive | well-led
  number:              number
  name:                string
  we_statement:        string
  expectation_cues:    string[]
  linked_regulations:  string[] // external_regulations.reference_key[]
  expected_policies:   string[]
  applies_to_settings: string[]
  is_active:           boolean
}

export interface PolicyLintSignal {
  id:            string
  signal_key:    string
  category:      string   // superseded_legislation | superseded_body | superseded_framework | time_bound | placeholder
  severity:      string   // high | medium | low
  label:         string
  detail:        string
  phrase_source: string | null   // regex source, compiled case-insensitive
  acronyms:      string[]         // matched case-sensitively as whole uppercase words
  superseded_by: string | null
  source_urls:   string[]         // authoritative page(s) evidencing the change (shown to tenants)
  is_active:     boolean
  approved:      boolean          // only approved signals are used by tenant scans
  approved_at:   string | null
  sort_order:    number
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
  match_terms:              string[]
  distinguish_from:         string[]
  expected_policy_titles:   string[]
  required_elements:        string[]
  authoritative_requirements: string
  authority_basis:          'statutory' | 'advisory'
  applies_to_settings:      string[]
  required_triggers:        string[]
  needs_update:             boolean
  review_note:              string
  last_reviewed_at:         string | null
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
  seed_reviewed?:    boolean       // platform: content-checked this seed
  seed_reviewed_at?: string | null
}

export interface ServiceRequest {
  id:               string
  tenant_id:        string
  tenant_name:      string | null
  tenant_cs_number: string | null
  submitter_name:   string | null
  submitter_email:  string | null
  message:          string
  image_s3_key:     string | null
  image_file_name:  string | null
  image_type:       string | null
  image_size_bytes: number | null
  status:           string
  created_at:       string
}

// Edit payload: id present = edit in place, id absent = create new.
export interface AuditSeedUpdate {
  name?:        string
  description?: string | null
  frequency?:   string
  sections: Array<{
    id?:    string
    title:  string
    questions: Array<{ id?: string; question_text: string; question_type: string }>
  }>
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

export function createPlatformClient(token: string) {
  return {
    stats: () =>
      adminFetch<PlatformStats>('/stats', token),

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

    serviceRequests: {
      list: (status?: string) =>
        adminFetch<{ requests: ServiceRequest[]; counts: Record<string, number>; total: number }>(
          `/service-requests${status && status !== 'all' ? `?status=${encodeURIComponent(status)}` : ''}`, token),
      updateStatus: (id: string, status: string) =>
        adminFetch<{ updated: boolean }>(`/service-requests/${id}`, token, { method: 'PATCH', body: JSON.stringify({ status }) }),
      // The image is admin-token protected, so fetch it into a blob for display.
      fetchImage: async (id: string): Promise<Blob> => {
        const res = await fetch(`${API_URL}/admin/service-requests/${id}/image`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) throw new Error('Could not load image')
        return res.blob()
      },
    },

    onboarding: {
      emails: (plan: string) => adminFetch<{ plan: string; emails: Array<{
        id: string; plan: string; day_index: number; subject: string; preheader: string
        from_email: string | null; badge: string | null; headline: string | null; image: string | null
        stats: { sent: number; delivered: number; opened: number; clicked: number; bounced: number; delivered_pct: number | null; open_pct: number | null; click_pct: number | null; first_sent_at: string | null }
      }> }>(`/onboarding/emails?plan=${encodeURIComponent(plan)}`, token),
      update: (id: string, data: { subject?: string; preheader?: string; from_email?: string }) =>
        adminFetch<{ id: string }>(`/onboarding/emails/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      reorder: (plan: string, ids: string[]) =>
        adminFetch<{ reordered: number }>(`/onboarding/emails/reorder`, token, { method: 'POST', body: JSON.stringify({ plan, ids }) }),
      preview: (id: string) => adminFetch<{ html: string; subject: string }>(`/onboarding/emails/${id}/preview`, token),
      test: (id: string, to: string) => adminFetch<{ sent: string }>(`/onboarding/emails/${id}/test`, token, { method: 'POST', body: JSON.stringify({ to }) }),
      enrolments: () => adminFetch<{ enrolments: Array<{ tenant_id: string; tenant_name: string | null; account_number: string | null; plan: string; start_date: string; status: string }> }>(`/onboarding/enrolments`, token),
      dispatchNow: (tenant_id?: string) => adminFetch<{ dateStr: string; enrolments: number; sent: number; skipped: number; failed: number; completed: number; skipped_reason?: string; reason?: string; due?: Array<{ tenant_id: string; plan: string; day: number; recipients: number }> }>(`/onboarding/dispatch-now`, token, { method: 'POST', body: JSON.stringify(tenant_id ? { tenant_id } : {}) }),
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
        topics: Array<{ id: string; title: string; group_key: string; care_setting: string | null; default_frequency: string; requires_practical: boolean; aliases: string[]; is_annual?: boolean; has_cpd_version?: boolean; cpd_module_id: string | null; module: null | { id: string; name: string; approved: boolean; approved_at: string | null; created_at: string; frequency: string; requires_practical: boolean; pass_mark: number; duration_minutes: number | null; question_count: number; illustration_url: string | null; image_count: number; image_slots: number; standards_count: number; attested_by_name: string | null; attested_by_role: string | null; attested_at: string | null; qa_hard_fails: number; qa_warnings: number; review_status: string | null; review_changes_open: number; tier: string } }>
        // The CPD shelf: deepened copies of pre-built modules, each with a derived
        // accreditation state (draft -> awaiting_cpd -> accredited).
        cpd_modules: Array<{ id: string; name: string; topic_id: string | null; topic_title: string; approved: boolean; approved_at: string | null; created_at: string; frequency: string; requires_practical: boolean; pass_mark: number; duration_minutes: number | null; question_count: number; illustration_url: string | null; image_count: number; image_slots: number; standards_count: number; attested_by_name: string | null; attested_by_role: string | null; attested_at: string | null; qa_hard_fails: number; qa_warnings: number; review_status: string | null; review_changes_open: number; tier: string; source_module_id: string | null; cpd_accredited: boolean; cpd_state: 'draft' | 'awaiting_cpd' | 'accredited' }>
      }>('/standard-training', token),
      // Duplicate a published pre-built module onto the CPD shelf as a draft copy.
      createCpdCopy: (moduleId: string) =>
        adminFetch<{ module: any }>(`/standard-training/modules/${moduleId}/create-cpd-copy`, token, { method: 'POST' }),
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
      // Drafts interactive activities from the module's own lesson sections. Returns
      // them for review — saving happens with the normal module update.
      // Pass a section index to draft one activity from THAT section's lesson text,
      // scenario and quick check; omit it to fill every empty section in one pass.
      draftActivities: (id: string, types?: Array<'order' | 'sort' | 'match'>, section?: number) =>
        adminFetch<{ activities: any[] }>(`/standard-training/modules/${id}/draft-activities`, token, { method: 'POST', body: JSON.stringify({ types, section }) }),
      regenerateQuestions: (id: string) => adminFetch<{ module: any; generated: number; avoided: number }>(`/standard-training/modules/${id}/regenerate-questions`, token, { method: 'POST' }),
      setShare: (id: string, data: { enabled: boolean; password?: string }) => adminFetch<{ share_enabled: boolean; share_token: string | null; share_password: string | null; share_url: string | null }>(`/standard-training/modules/${id}/share`, token, { method: 'POST', body: JSON.stringify(data) }),
      // Attest + publish every draft in one scope with a single named attestation.
      // include_annual defaults false, so the Annual Training (CPD) set is untouched.
      // Pass dry_run to preview exactly what would be approved and what would skip.
      bulkApprove: (data: { reviewer_name: string; reviewer_role: string; scope?: 'universal' | 'setting'; care_setting?: string; include_annual?: boolean; dry_run?: boolean }) =>
        adminFetch<{
          approved: Array<{ id: string; name: string }>
          skipped:  Array<{ id: string; name: string; reason: string }>
          excluded_annual: string[]
          total_candidates: number
          dry_run: boolean
        }>('/standard-training/bulk-approve', token, { method: 'POST', body: JSON.stringify(data) }),
      // Fill in the observed competency checklist on practical modules that have none,
      // from the curated library. Only writes learning_content.practical_checklist, so
      // it never un-publishes a module. Pass dry_run to preview.
      applyPracticalChecklists: (data: { scope?: 'universal' | 'setting' | 'all'; care_setting?: string; overwrite?: boolean; dry_run?: boolean } = {}) =>
        adminFetch<{
          updated: Array<{ id: string; name: string; items: number }>
          skipped: Array<{ id: string; name: string; reason: string }>
          no_checklist_available: string[]
          total_practical_modules: number
          library_size: number
          dry_run: boolean
        }>('/standard-training/practical-checklists/apply', token, { method: 'POST', body: JSON.stringify(data) }),
    },

    // Programmes = diplomas / pathways: an ordered set of published standard modules
    // behind one completion rule, one synoptic assessment and one certificate.
    standardProgrammes: {
      list: () => adminFetch<{
        groups: Record<string, string>
        settings: Array<{ key: string; label: string }>
        tenants: Array<{ id: string; name: string; account_number: string }>
        templates: Array<{ slug: string; name: string; kind: string; care_setting: string | null; unit_count: number; required_count: number }>
        programmes: Array<{
          id: string; slug: string; name: string; description: string; kind: string
          group_key: string | null; care_setting: string | null; is_active: boolean
          approved: boolean; approved_at: string | null
          attested_by_name: string | null; attested_by_role: string | null; attested_at: string | null
          cpd_accredited: boolean; independently_reviewed: boolean
          sequential: boolean; require_practical: boolean; require_reflection: boolean
          pilot_tenant_ids: string[]
          synoptic_count: number; synoptic_pass_mark: number
          renewal_months: number | null; price_pence: number | null
          unit_count: number; units_missing: number
          duration_minutes: number | null; cpd_hours: number | null
          outcomes_count: number; standards_count: number
          cpd_units: number; cpd_ready: boolean
          illustration_url: string | null
          qa_hard_fails: number; qa_warnings: number
          enrolled: number; completed: number
        }>
      }>('/standard-programmes', token),
      availableModules: () => adminFetch<{
        groups: Record<string, string>
        modules: Array<{ id: string; name: string; group_key: string | null; duration_minutes: number | null; requires_practical: boolean; cpd_accredited: boolean; attested_by_name: string | null }>
      }>('/standard-programmes/available-modules', token),
      full: (id: string) => adminFetch<{
        programme: any
        qa: { checks: Array<{ key: string; label: string; status: 'pass' | 'warn' | 'fail'; detail: string }>; hard_fails: number; warnings: number; ok_to_approve: boolean }
        standards_catalogue: Array<{ framework: string; label: string; items: Array<{ code: string; label: string }> }>
        groups: Record<string, string>
        settings: Array<{ key: string; label: string }>
      }>(`/standard-programmes/${id}/full`, token),
      create: (data: { name: string; description?: string; kind?: string; group_key?: string | null; care_setting?: string | null }) =>
        adminFetch<{ programme: any }>('/standard-programmes', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: any) =>
        adminFetch<{ programme: any }>(`/standard-programmes/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      setUnits: (id: string, units: Array<{ module_id: string; is_optional?: boolean }>) =>
        adminFetch<{ units: any[]; qa: any }>(`/standard-programmes/${id}/units`, token, { method: 'PUT', body: JSON.stringify({ units }) }),
      generateSynoptic: (id: string, count?: number) =>
        adminFetch<{ questions: Array<{ id: string; text: string; options: string[]; correct: number; draws_on: string[] }> }>(`/standard-programmes/${id}/synoptic/generate`, token, { method: 'POST', body: JSON.stringify({ count }) }),
      approve: (id: string, opts: { approved?: boolean; reviewer_name?: string; reviewer_role?: string } = {}) =>
        adminFetch<{ programme: any }>(`/standard-programmes/${id}/approve`, token, { method: 'POST', body: JSON.stringify({ approved: opts.approved !== false, reviewer_name: opts.reviewer_name, reviewer_role: opts.reviewer_role }) }),
      remove: (id: string) => adminFetch<{ deleted: boolean }>(`/standard-programmes/${id}`, token, { method: 'DELETE' }),
      // Assemble a programme from a named template, matching units against the
      // published library by title. Reports which units matched and which are missing.
      fromTemplate: (slug: string) => adminFetch<{
        programme: any
        matched: Array<{ wanted: string; used: string; module_id: string; is_optional: boolean }>
        missing: string[]
        replaced: boolean
      }>('/standard-programmes/from-template', token, { method: 'POST', body: JSON.stringify({ slug }) }),
    },

    basketAnalytics: () =>
      adminFetch<{ modules: Array<{ module_slug: string; adds: number; adds_30d: number; add_qty: number; checkouts: number; purchased: number; revenue_pence: number }>; totals: { adds: number; adds_30d: number; checkouts: number; purchased: number; revenue_pence: number } }>('/basket-analytics', token),
    adoption: () =>
      adminFetch<{ tenants: AdoptionTenant[] }>('/adoption', token),
    tenants: {
      list: () =>
        adminFetch<{ tenants: TenantSummary[]; total: number }>('/tenants', token),
      get: (id: string) =>
        adminFetch<TenantDetail>(`/tenants/${id}`, token),
      setEnterpriseDiscount: (id: string, enabled: boolean) =>
        adminFetch<{ tenant: { id: string; enterprise_discount: boolean } }>(`/tenants/${id}/enterprise-discount`, token, { method: 'PATCH', body: JSON.stringify({ enabled }) }),
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

      // Render a policy as staff see it (header/footer-stripped, formatted HTML)
      // plus the original extracted text, to verify the stripping.
      policyPreview: (tenantId: string, policyId: string) =>
        adminFetch<{ policy_id: string; name: string; status: string; cached: boolean; html: string; raw: string; has_raw: boolean }>(
          `/tenants/${tenantId}/policies/${policyId}/preview`, token
        ),

      insights: (id: string) =>
        adminFetch<TenantInsights>(`/tenants/${id}/insights`, token),

      gapUsage: (id: string) =>
        adminFetch<{
          setting: string; setting_label: string
          service_profile: Array<{ key: string; label: string; on: boolean }>
          in_scope_regulations: number
          analysed: boolean; analysed_at: string | null
          coverage: { score: number | null; covered: number; partial: number; gap: number; total: number }
          deep_dives: number; gap_training_modules: number; open_alerts: number
          remediation_ack: { at: string; by: string; version: string } | null
        }>(`/tenants/${id}/gap-usage`, token),

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
      update: (id: string, data: Partial<Regulation> & { notify_tenants?: boolean }) =>
        adminFetch<Regulation>(`/regulations/${id}`, token, {
          method: 'PATCH',
          body:   JSON.stringify(data),
        }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/regulations/${id}`, token, { method: 'DELETE' }),
      sync: () =>
        adminFetch<any>('/regulations/sync', token, { method: 'POST' }),
      generateChecklist: (id: string) =>
        adminFetch<{ required_elements: string[] }>(`/regulations/${id}/generate-checklist`, token, { method: 'POST' }),
      generateRequirements: (id: string) =>
        adminFetch<{ authoritative_requirements: string }>(`/regulations/${id}/generate-requirements`, token, { method: 'POST' }),
      versions: (id: string) =>
        adminFetch<{ versions: Array<{ id: string; changed_fields: string[]; material: boolean; created_at: string }> }>(`/regulations/${id}/versions`, token),
      checkSources: () =>
        adminFetch<{ regulations: number; urls_checked: number; changed: number; flagged: number; errors: number; flagged_regs: Array<{ reference_key: string; official_name: string; url: string }> }>('/regulations/check-sources', token, { method: 'POST' }),
    },

    qualityStatements: {
      list: () =>
        adminFetch<{ statements: QualityStatement[]; total: number }>('/quality-statements', token),
      create: (data: Partial<QualityStatement>) =>
        adminFetch<{ statement: QualityStatement }>('/quality-statements', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<QualityStatement>) =>
        adminFetch<{ statement: QualityStatement }>(`/quality-statements/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/quality-statements/${id}`, token, { method: 'DELETE' }),
    },

    policyLintSignals: {
      list: () =>
        adminFetch<{ signals: PolicyLintSignal[]; total: number }>('/policy-lint-signals', token),
      create: (data: Partial<PolicyLintSignal>) =>
        adminFetch<{ signal: PolicyLintSignal }>('/policy-lint-signals', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<PolicyLintSignal>) =>
        adminFetch<{ signal: PolicyLintSignal }>(`/policy-lint-signals/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/policy-lint-signals/${id}`, token, { method: 'DELETE' }),
      approve: (id: string) =>
        adminFetch<{ signal: PolicyLintSignal }>(`/policy-lint-signals/${id}/approve`, token, { method: 'POST' }),
      audit: (data: { phrase_source?: string | null; acronyms?: string[] }) =>
        adminFetch<{ corpus: number; policies_matched: number; occurrences: number; matches: Array<{ policy: string; count: number; snippets: string[] }> }>('/policy-lint-signals/audit', token, { method: 'POST', body: JSON.stringify(data) }),
    },

    glossary: {
      list: () =>
        adminFetch<{ terms: GlossaryTerm[]; total: number }>('/glossary', token),
      create: (data: { term: string; note?: string }) =>
        adminFetch<{ term: GlossaryTerm }>('/glossary', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: { term?: string; note?: string }) =>
        adminFetch<{ term: GlossaryTerm }>(`/glossary/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/glossary/${id}`, token, { method: 'DELETE' }),
    },

    auditSeeds: {
      list: () =>
        adminFetch<{ templates: AuditSeedTemplate[]; total: number }>('/audit-seeds', token),
      // Edit a shared seed template. Payload mirrors the template structure; sections
      // and questions keep their id where they exist (edited in place), new ones omit
      // it, and anything left out is soft-removed on the server.
      update: (id: string, data: AuditSeedUpdate) =>
        adminFetch<{ template: AuditSeedTemplate }>(`/audit-seeds/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      // Mark (or unmark) a seed template as content-checked.
      setReviewed: (id: string, reviewed: boolean) =>
        adminFetch<{ id: string; seed_reviewed: boolean; seed_reviewed_at: string | null }>(`/audit-seeds/${id}/reviewed`, token, { method: 'PATCH', body: JSON.stringify({ reviewed }) }),
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

    collections: {
      list: () =>
        adminFetch<{ collections: Collection[] }>('/collections', token),
      create: (data: Partial<Collection>) =>
        adminFetch<{ collection: Collection }>('/collections', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<Collection>) =>
        adminFetch<{ collection: Collection }>(`/collections/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/collections/${id}`, token, { method: 'DELETE' }),
    },

    featurePages: {
      list: () =>
        adminFetch<{ featurePages: FeaturePage[] }>('/feature-pages', token),
      create: (data: Partial<FeaturePage>) =>
        adminFetch<{ featurePage: FeaturePage }>('/feature-pages', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<FeaturePage>) =>
        adminFetch<{ featurePage: FeaturePage }>(`/feature-pages/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      delete: (id: string) =>
        adminFetch<{ deleted: boolean }>(`/feature-pages/${id}`, token, { method: 'DELETE' }),
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
      clone: (id: string, setting: string) =>
        adminFetch<{ skipped: boolean; flow: OnboardingTemplate }>(`/onboarding-templates/${id}/clone`, token, { method: 'POST', body: JSON.stringify({ setting }) }),
      feedback: (rating?: string) =>
        adminFetch<{ items: OnboardingFeedbackItem[]; summary: OnboardingFeedbackSummary[] }>(`/onboarding-templates/feedback${rating ? `?rating=${rating}` : ''}`, token),
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
    platformGlossary: {
      list: () => adminFetch<{ terms: GlossaryTerm[] }>('/platform-glossary', token),
      add: (data: { term: string; keep?: boolean; note?: string }) =>
        adminFetch<{ term: GlossaryTerm }>('/platform-glossary', token, { method: 'POST', body: JSON.stringify(data) }),
      update: (id: string, data: Partial<{ keep: boolean; note: string }>) =>
        adminFetch<{ term: GlossaryTerm }>(`/platform-glossary/${id}`, token, { method: 'PATCH', body: JSON.stringify(data) }),
      remove: (id: string) => adminFetch<{ deleted: boolean }>(`/platform-glossary/${id}`, token, { method: 'DELETE' }),
    },
    translationChanges: {
      list: (status?: string) =>
        adminFetch<{ changes: TranslationChange[]; counts: { total: number; pending: number; approved: number; rejected: number } }>(`/translation-changes${status ? `?status=${status}` : ''}`, token),
      remove: (id: string) => adminFetch<{ deleted: boolean }>(`/translation-changes/${id}`, token, { method: 'DELETE' }),
    },
    policyGaps: {
      clients: () =>
        adminFetch<{ clients: Array<{ id: string; name: string; account_number: string; setting: string; setting_label: string; policies: number; classified: number }> }>('/policy-gaps', token),
      classify: (tenantId: string) =>
        adminFetch<{ classified: number; remaining: number; total: number }>(`/policy-gaps/${tenantId}/classify`, token, { method: 'POST' }),
      report: (tenantId: string) =>
        adminFetch<{ tenant: { id: string; name: string; setting: string; setting_label: string }; peer_count: number; unclassified: number; have: string[]; missing: Array<{ type: string; peer_count: number; peer_pct: number }> }>(`/policy-gaps/${tenantId}`, token),
      matrix: (setting: string) =>
        adminFetch<{ setting: string; setting_label: string; client_count: number; type_count: number; types: Array<{ type: string; have_count: number; have_pct: number; missing: Array<{ id: string; name: string }> }>; clients: Array<{ id: string; name: string; have: number; missing: number }> }>(`/policy-gaps/matrix?setting=${encodeURIComponent(setting)}`, token),
      ignoreType: (name: string, care_setting?: string | null) =>
        adminFetch<{ ignored: boolean }>('/policy-gaps/types/ignore', token, { method: 'POST', body: JSON.stringify({ name, care_setting }) }),
    },
  }
}

export interface TranslationChange {
  id: string
  tenant_id: string
  tenant_name: string
  account_number: string
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

export interface GlossaryTerm {
  id: string
  term: string
  keep: boolean
  note: string
  created_at: string
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

export interface OnboardingFeedbackItem {
  id: string
  rating: 'good' | 'not_relevant' | 'not_good'
  question: string
  comment: string
  policy_section: string | null
  created_at: string
  template_id: string
  template_name: string
  template_role: string
  tenant_name: string
  by: string
}

export interface OnboardingFeedbackSummary {
  template_id: string
  template_name: string
  template_role: string
  good: number
  not_relevant: number
  not_good: number
  negative: number
  total: number
}
