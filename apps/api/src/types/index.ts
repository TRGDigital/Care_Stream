// §9 — Core domain types matching the PostgreSQL schema

export type SubscriptionStatus = 'active' | 'trialling' | 'past_due' | 'cancelled'
export type UserRole = 'admin' | 'staff'
export type PolicyStatus = 'active' | 'processing' | 'archived' | 'superseded'
export type DocumentCategory = 'internal_policy' | 'staff_handbook' | 'external_regulation'
export type QueryChannel = 'chat' | 'email'

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
  last_login_at: Date | null
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
  handbook_metadata: HandbookMetadata | null
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
  policy_ids_cited: string[]
  language_detected: string
  response_time_ms: number
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
