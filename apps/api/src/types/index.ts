// §9 — Core domain types matching the PostgreSQL schema

export type SubscriptionStatus = 'active' | 'trialling' | 'past_due' | 'cancelled'
export type UserRole = 'admin' | 'staff'
export type PolicyStatus = 'active' | 'processing' | 'archived' | 'superseded'
export type DocumentCategory = 'internal_policy' | 'staff_handbook' | 'external_regulation'
export type QueryChannel = 'chat' | 'email'
export type IntentType = 'summary' | 'full_policy' | 'follow_up'

export interface Plan {
  id: string
  name: string
  monthly_query_limit: number
  has_advanced_analytics: boolean
  has_cqc_report: boolean
  price_monthly_pence: number
  is_active: boolean
}

export interface Tenant {
  id: string
  name: string
  slug: string
  email_domain: string
  stripe_customer_id: string | null
  subscription_status: SubscriptionStatus
  plan_id: string | null
  branding_signoff: string
  created_at: Date
}

export interface User {
  id: string
  tenant_id: string
  email: string
  name: string
  role: UserRole
  failed_login_attempts: number
  locked_until: Date | null
  last_login_at: Date | null
  created_at: Date
}

export interface Policy {
  id: string
  tenant_id: string
  name: string
  filename: string
  s3_key: string
  document_category: DocumentCategory
  version: number
  status: PolicyStatus
  tags: string[]
  uploaded_by: string
  pinecone_namespace: string | null
  handbook_metadata: HandbookMetadata | null
  review_interval_days: number | null
  last_reviewed_at: Date | null
  superseded_by: string | null
  created_at: Date
  updated_at: Date
}

export interface HandbookMetadata {
  chapter_count: number
  chapter_map: ChapterMapEntry[]
  toc_detected: boolean
  total_chunks: number
  chapter_index_namespace: string
}

export interface ChapterMapEntry {
  chapter_title: string
  page_start: number
  page_end: number
  chunk_ids: string[]
}

export interface QueryRecord {
  id: string
  tenant_id: string
  user_id: string | null
  channel: QueryChannel
  query_text: string
  response_text: string
  intent_type: IntentType
  document_category_queried: DocumentCategory | null
  policy_ids_cited: string[]
  no_match: boolean
  language_detected: string            // ISO 639-3 code
  response_time_ms: number
  created_at: Date
}

export interface EmailSession {
  id: string
  tenant_id: string
  user_id: string
  thread_id: string
  subject: string
  messages: EmailMessage[]
  last_message_at: Date
  expires_at: Date
  created_at: Date
}

export interface EmailMessage {
  role: 'user' | 'assistant'
  content: string
  timestamp: string
  policy_ids_cited: string[]
}

export interface ExternalRegulation {
  id: string
  reference_key: string
  official_name: string
  also_known_as: string[]
  summary: string
  care_home_context: string
  care_company_interaction: string
  practical_meaning: string
  source_urls: string[]
  pinecone_vector_id: string | null
  last_synced_at: Date | null
  is_active: boolean
}

export interface AuditLog {
  id: string
  tenant_id: string | null
  user_id: string | null
  event_type: string
  entity_type: string
  entity_id: string
  metadata: Record<string, unknown>
  created_at: Date
}

// §12.2 — API response envelope
export interface ApiResponse<T> {
  success: true
  data: T
  meta: { request_id: string; timestamp: string }
}

export interface ApiError {
  success: false
  error: { code: string; message: string }
}
