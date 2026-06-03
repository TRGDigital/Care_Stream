import { Pinecone } from '@pinecone-database/pinecone'
import type { DocumentCategory } from '../../types'

// §3.1 / §4.1.1 / §10.5 — Pinecone namespace isolation and vector operations.
//
// Namespace scheme (all within a single Pinecone index):
//   Active tenant policies    → tenant_{tenantId}
//   Tenant handbook chapters  → tenant_{tenantId}_chapters   (§4.6.2)
//   Version staging           → tenant_{tenantId}_staging_{policyId}  (§10.5)
//   Platform regulations      → platform_regulations  (§6.2, read-only from tenant pipeline)
//
// Vector ID scheme:
//   Policy chunk   → {policyId}_c{chunkIndex}
//   Chapter index  → {policyId}_ch{chapterIndex}
//
// The staging approach for atomic version swap (§10.5):
//   1. New version vectors are upserted to the staging namespace.
//   2. activateStagedVectors() fetches them and re-upserts into the active namespace.
//   3. Old version vectors are then deleted by ID prefix.
//   4. Staging namespace is deleted.
//   The active namespace is never empty during the transition.

const pc         = new Pinecone({ apiKey: process.env.PINECONE_API_KEY! })
const INDEX_NAME = (process.env.PINECONE_INDEX ?? process.env.PINECONE_INDEX_NAME)!

function getIndex() {
  return pc.index(INDEX_NAME)
}

// ─── Namespace helpers ─────────────────────────────────────────────────────────

export function getTenantNamespace(tenantId: string): string {
  return `tenant_${tenantId}`
}

export function getStagingNamespace(tenantId: string, policyId: string): string {
  return `tenant_${tenantId}_staging_${policyId}`
}

export function getHandbookChapterNamespace(tenantId: string): string {
  return `tenant_${tenantId}_chapters`
}

export function getKnowledgeNamespace(tenantId: string): string {
  return `tenant_${tenantId}_knowledge`
}

export const PLATFORM_REGULATIONS_NAMESPACE = 'platform_regulations'

// ─── Vector types ──────────────────────────────────────────────────────────────

export interface PolicyVectorMetadata extends Record<string, unknown> {
  policy_id:          string
  tenant_id:          string
  document_category:  DocumentCategory
  chunk_index:        number
  source_filename:    string
  chunk_text:         string
  version:            number
  regulations_cited?: string[]
  chapter_title?:     string
  section_heading?:   string
}

export interface PolicyVector {
  id:       string
  values:   number[]
  metadata: PolicyVectorMetadata
}

export interface ChapterVectorMetadata extends Record<string, unknown> {
  policy_id:      string
  tenant_id:      string
  chapter_index:  number
  chapter_title:  string
  chunk_ids:      string[]
}

export interface ChapterVector {
  id:       string
  values:   number[]
  metadata: ChapterVectorMetadata
}

export interface QueryResult {
  id:       string
  score:    number
  metadata: PolicyVectorMetadata
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

const BATCH_SIZE = 100

async function upsertBatched<T extends { id: string; values: number[]; metadata: Record<string, unknown> }>(
  namespace: string,
  vectors:   T[],
): Promise<void> {
  const ns = getIndex().namespace(namespace)
  for (let i = 0; i < vectors.length; i += BATCH_SIZE) {
    await ns.upsert(vectors.slice(i, i + BATCH_SIZE) as any)
  }
}

// Collect all vector IDs from a namespace that share a given ID prefix.
async function listIdsByPrefix(namespace: string, prefix: string): Promise<string[]> {
  const ns  = getIndex().namespace(namespace)
  const ids: string[] = []
  let token: string | undefined

  do {
    const resp = await ns.listPaginated({ prefix, ...(token ? { paginationToken: token } : {}) })
    for (const v of resp.vectors ?? []) {
      if (v.id) ids.push(v.id)
    }
    token = resp.pagination?.next
  } while (token)

  return ids
}

// ─── Policy vector operations ─────────────────────────────────────────────────

// Upsert new-version vectors into the staging namespace, keeping the active
// namespace untouched until activateStagedVectors() is called.
export async function upsertPolicyVectors(
  tenantId: string,
  policyId: string,
  vectors:  PolicyVector[],
): Promise<void> {
  const ns = getStagingNamespace(tenantId, policyId)
  await upsertBatched(ns, vectors)
  console.log(`[pinecone] Staged ${vectors.length} vectors → ${ns}`)
}

// Move staged vectors to the active namespace.
// Fetches vectors from staging (with values) and re-upserts to active,
// then deletes the staging namespace.
export async function activateStagedVectors(tenantId: string, policyId: string): Promise<void> {
  const index    = getIndex()
  const stagingNs = getStagingNamespace(tenantId, policyId)
  const activeNs  = getTenantNamespace(tenantId)
  const prefix    = `${policyId}_`

  const allIds = await listIdsByPrefix(stagingNs, prefix)
  if (allIds.length === 0) {
    console.warn(`[pinecone] activateStagedVectors: no staged vectors for policy=${policyId}`)
    return
  }

  // Fetch in batches, re-upsert to active namespace
  for (let i = 0; i < allIds.length; i += BATCH_SIZE) {
    const batchIds = allIds.slice(i, i + BATCH_SIZE)
    const fetched  = await index.namespace(stagingNs).fetch(batchIds)
    const records  = Object.values(fetched.records ?? {})
    if (records.length > 0) {
      await index.namespace(activeNs).upsert(records as any)
    }
  }

  // Staging namespace no longer needed
  await index.namespace(stagingNs).deleteAll()

  console.log(`[pinecone] Activated ${allIds.length} vectors for policy=${policyId} → ${activeNs}`)
}

// Wipe ALL of a tenant's policy + knowledge vectors (every namespace that holds
// content derived from their uploaded policies). Used by the platform "reset
// policies" action. Each deleteAll is best-effort — a namespace may not exist.
export async function deleteAllTenantPolicyVectors(tenantId: string): Promise<void> {
  const index = getIndex()
  const namespaces = [
    getTenantNamespace(tenantId),          // policy passage chunks
    getHandbookChapterNamespace(tenantId), // handbook chapter summaries
    getKnowledgeNamespace(tenantId),        // policy-derived knowledge entries
  ]
  for (const ns of namespaces) {
    try {
      await index.namespace(ns).deleteAll()
      console.log(`[pinecone] Cleared namespace ${ns}`)
    } catch (e) {
      console.warn(`[pinecone] deleteAll skipped for ${ns}: ${(e as Error)?.message}`)
    }
  }
}

// Delete all vectors for a specific policy_id from the active namespace.
// Uses ID prefix listing so no paid-tier filter capability is required.
export async function deletePolicyVectors(tenantId: string, policyId: string): Promise<void> {
  const ns  = getIndex().namespace(getTenantNamespace(tenantId))
  const ids = await listIdsByPrefix(getTenantNamespace(tenantId), `${policyId}_`)

  if (ids.length === 0) return

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    await ns.deleteMany(ids.slice(i, i + BATCH_SIZE))
  }

  console.log(`[pinecone] Deleted ${ids.length} vectors for policy=${policyId}`)
}

// ─── Handbook chapter index operations ────────────────────────────────────────

// Upsert chapter-level summary vectors for two-stage handbook retrieval (§4.6.3).
export async function upsertChapterVectors(tenantId: string, vectors: ChapterVector[]): Promise<void> {
  const ns = getHandbookChapterNamespace(tenantId)
  await upsertBatched(ns, vectors)
  console.log(`[pinecone] Upserted ${vectors.length} chapter vectors → ${ns}`)
}

// Delete chapter index vectors for a specific policy (e.g. on version swap or archive).
export async function deleteChapterVectors(tenantId: string, policyId: string): Promise<void> {
  const nsName = getHandbookChapterNamespace(tenantId)
  const ns     = getIndex().namespace(nsName)
  const ids    = await listIdsByPrefix(nsName, `${policyId}_ch`)

  if (ids.length === 0) return

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    await ns.deleteMany(ids.slice(i, i + BATCH_SIZE))
  }
}

// ─── Query operations (§4.1.2) ────────────────────────────────────────────────

export async function queryVectors(
  namespace: string,
  vector:    number[],
  topK:      number,
  filter?:   Record<string, unknown>,
): Promise<QueryResult[]> {
  const resp = await getIndex().namespace(namespace).query({
    vector,
    topK,
    includeMetadata: true,
    ...(filter ? { filter } : {}),
  })

  return (resp.matches ?? []).map(m => ({
    id:       m.id,
    score:    m.score ?? 0,
    metadata: m.metadata as PolicyVectorMetadata,
  }))
}

// ─── Platform regulation KB vectors (§6.2) ────────────────────────────────────
// Stored in the shared platform_regulations namespace — no tenant data.
// Vector ID: reg_{reference_key}  (e.g. reg_gdpr)
// Text embedded: summary + care_home_context + practical_meaning

export interface RegulationVector {
  id:       string    // reg_{reference_key}
  values:   number[]
  metadata: {
    reference_key: string
    official_name: string
  } & Record<string, unknown>
}

export async function upsertRegulationVectors(vectors: RegulationVector[]): Promise<void> {
  await upsertBatched(PLATFORM_REGULATIONS_NAMESPACE, vectors as any)
  console.log(`[pinecone] Upserted ${vectors.length} regulation vectors → ${PLATFORM_REGULATIONS_NAMESPACE}`)
}

export async function deleteRegulationVector(referenceKey: string): Promise<void> {
  await getIndex().namespace(PLATFORM_REGULATIONS_NAMESPACE).deleteMany([`reg_${referenceKey}`])
}

// ─── Knowledge base vector operations ────────────────────────────────────────

export interface KnowledgeVectorMetadata extends Record<string, unknown> {
  tenant_id:   string
  entry_id:    string   // KnowledgeEntry.id — used to back-reference the DB row
  question:    string
  answer:      string
  source_type: string   // 'policy' | 'manual'
  source_id?:  string
  source_name: string
}

export interface KnowledgeVector {
  id:       string       // kb_{entryId}
  values:   number[]
  metadata: KnowledgeVectorMetadata
}

export async function upsertKnowledgeVectors(tenantId: string, vectors: KnowledgeVector[]): Promise<void> {
  const ns = getKnowledgeNamespace(tenantId)
  await upsertBatched(ns, vectors as any)
  console.log(`[pinecone] Upserted ${vectors.length} knowledge vectors → ${ns}`)
}

export async function deleteKnowledgeVectors(tenantId: string, entryIds: string[]): Promise<void> {
  if (entryIds.length === 0) return
  const ns  = getIndex().namespace(getKnowledgeNamespace(tenantId))
  const ids = entryIds.map(id => `kb_${id}`)
  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    await ns.deleteMany(ids.slice(i, i + BATCH_SIZE))
  }
}

// Delete all knowledge vectors for a given source policy (on archive / re-ingestion).
export async function deleteKnowledgeVectorsBySource(tenantId: string, sourcePolicyId: string): Promise<void> {
  const nsName = getKnowledgeNamespace(tenantId)
  const ids    = await listIdsByPrefix(nsName, `kb_`)
  // We need to fetch to filter by source_id — use fetch in batches then filter
  const ns     = getIndex().namespace(nsName)
  const toDelete: string[] = []

  for (let i = 0; i < ids.length; i += BATCH_SIZE) {
    const batch   = ids.slice(i, i + BATCH_SIZE)
    const fetched = await ns.fetch(batch)
    for (const [id, rec] of Object.entries(fetched.records ?? {})) {
      if ((rec.metadata as any)?.source_id === sourcePolicyId) {
        toDelete.push(id)
      }
    }
  }

  if (toDelete.length === 0) return
  for (let i = 0; i < toDelete.length; i += BATCH_SIZE) {
    await ns.deleteMany(toDelete.slice(i, i + BATCH_SIZE))
  }
  console.log(`[pinecone] Deleted ${toDelete.length} knowledge vectors for source=${sourcePolicyId}`)
}

export interface KnowledgeQueryResult {
  id:       string
  score:    number
  metadata: KnowledgeVectorMetadata
}

export async function queryKnowledgeVectors(
  tenantId:  string,
  vector:    number[],
  topK:      number,
): Promise<KnowledgeQueryResult[]> {
  const ns   = getKnowledgeNamespace(tenantId)
  const resp = await getIndex().namespace(ns).query({
    vector,
    topK,
    includeMetadata: true,
  })
  return (resp.matches ?? []).map(m => ({
    id:       m.id,
    score:    m.score ?? 0,
    metadata: m.metadata as KnowledgeVectorMetadata,
  }))
}
