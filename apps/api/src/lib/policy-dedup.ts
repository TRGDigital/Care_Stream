// Policy near-duplicate detection. Compares a newly-ingested policy's content
// against the tenant's other active policies (by text, not filename) and flags it
// when it looks like the same document under a different name. The tenant then
// resolves the flag (keep both / replace / discard) from the Policies page.

import { prisma } from '../db/client'
import { downloadExtractedText } from '../services/storage/s3'
import { contentSignature, contentSimilarity, asSignature, DUPLICATE_THRESHOLD } from './content-similarity'

export { contentSignature, DUPLICATE_THRESHOLD }

// Ingestion runs INLINE on serverless, so the upload response waits for detection.
// Keep the inline backfill small so uploads stay fast; the rest of the library is
// warmed separately via backfillSignatures() (a background loop from the Policies
// page), so coverage builds without ever blocking an upload.
const INLINE_BACKFILL_CAP = 25

// Backfill content signatures for a tenant's active policies that don't have one
// yet (uploaded before the feature). Bounded; returns how many remain so a caller
// can loop. Pure hashing — no AI cost.
export async function backfillSignatures(tenantId: string, limit: number): Promise<{ done: number; remaining: number }> {
  const rows = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active' },
    select: { id: true, content_signature: true },
  }) as Array<{ id: string; content_signature: unknown }>
  const pending = rows.filter(r => !asSignature(r.content_signature)).map(r => r.id)
  const batch = pending.slice(0, limit)
  let done = 0
  await mapPool(batch, 6, async (id) => {
    const text = await downloadExtractedText(tenantId, id).catch(() => null)
    if (!text) return
    await (prisma as any).policy.update({ where: { id }, data: { content_signature: contentSignature(text) as any } }).catch(() => {})
    done++
  })
  return { done, remaining: Math.max(0, pending.length - batch.length) }
}

// Run async work with bounded concurrency (backfill runs inline during upload).
async function mapPool<T>(items: T[], limit: number, fn: (item: T) => Promise<void>): Promise<void> {
  let i = 0
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (i < items.length) { const idx = i++; await fn(items[idx]) }
  }))
}

// Words that carry no distinguishing meaning in a policy title — a shared word
// from this set never counts as "similarly named".
const NAME_STOPWORDS = new Set([
  'policy', 'policies', 'procedure', 'procedures', 'guidance', 'statement', 'form',
  'and', 'the', 'of', 'for', 'to', 'in', 'on', 'at', 'a', 'an', 'our', 'your',
  'use', 'using', 'general', 'management', 'managing', 'staff', 'care', 'home', 'homes',
  'house', 'service', 'services', 'copy', 'draft', 'version', 'new', 'updated',
])

// Distinctive words in a policy name (≥4 chars, not a stopword).
function nameKeywords(name: string): Set<string> {
  return new Set(
    (name || '').toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, ' ').split(/\s+/)
      .filter(w => w.length >= 4 && !NAME_STOPWORDS.has(w)),
  )
}

export async function detectContentDuplicate(opts: {
  tenantId: string
  policyId: string
  documentCategory: string
  signature: number[]
}): Promise<{ matched: boolean; matchId?: string; score?: number }> {
  const { tenantId, policyId, documentCategory, signature } = opts
  if (!signature?.length) return { matched: false }

  const self = await (prisma as any).policy.findUnique({ where: { id: policyId }, select: { name: true } })
  const myKeywords = nameKeywords(self?.name ?? '')

  // Candidates: other active policies of the same type for this tenant.
  const candidates = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active', document_category: documentCategory, NOT: { id: policyId } },
    select: { id: true, name: true, content_signature: true },
  }) as Array<{ id: string; name: string; content_signature: unknown }>

  // Backfill signatures for candidates that don't have one yet (uploaded before
  // the feature). We PRIORITISE policies whose NAME resembles the new one — those
  // are the likely duplicates — so an exact/near duplicate is always compared even
  // though the inline budget is small. Low concurrency to stay gentle on the DB
  // connection pool (ingestion is inline on serverless).
  const missing = candidates.filter(c => !asSignature(c.content_signature))
  const shares = (n: string) => { const ck = nameKeywords(n); for (const w of myKeywords) if (ck.has(w)) return true; return false }
  const nameSimilar = missing.filter(c => shares(c.name))
  const others      = missing.filter(c => !shares(c.name))
  const needBackfill = [...nameSimilar, ...others].slice(0, Math.max(INLINE_BACKFILL_CAP, nameSimilar.length))
  await mapPool(needBackfill, 3, async (c) => {
    const text = await downloadExtractedText(tenantId, c.id).catch(() => null)
    if (!text) return
    const sig = contentSignature(text)
    c.content_signature = sig
    await (prisma as any).policy.update({ where: { id: c.id }, data: { content_signature: sig as any } }).catch(() => {})
  })

  // Best content match above the threshold, and the closest similarly-named (but
  // content-distinct) policy in one pass.
  let best: { id: string; score: number } | null = null
  let sameName: { id: string; name: string; shared: number; score: number } | null = null
  for (const c of candidates) {
    const sig = asSignature(c.content_signature)
    const score = sig ? contentSimilarity(signature, sig) : 0
    if (sig && score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) best = { id: c.id, score }
    // Similarly named = shares a distinctive keyword AND isn't a content duplicate.
    if (score < DUPLICATE_THRESHOLD && myKeywords.size) {
      const ck = nameKeywords(c.name)
      let shared = 0
      for (const w of myKeywords) if (ck.has(w)) shared++
      if (shared > 0 && (!sameName || shared > sameName.shared || (shared === sameName.shared && score > sameName.score))) {
        sameName = { id: c.id, name: c.name, shared, score }
      }
    }
  }

  if (best) {
    await (prisma as any).policy.update({
      where: { id: policyId },
      data:  { duplicate_of: best.id, duplicate_score: best.score, duplicate_status: 'flagged', similar_named_status: 'none', similar_named_note: undefined as any },
    }).catch(() => {})
    console.log(`[dedup] policy ${policyId} flagged as ${(best.score * 100).toFixed(0)}% match of ${best.id}`)
    return { matched: true, matchId: best.id, score: best.score }
  }

  // Not a duplicate — but if a similarly-named policy exists, note it so the tenant
  // sees we checked and deliberately kept both (with the content match score).
  if (sameName) {
    await (prisma as any).policy.update({
      where: { id: policyId },
      data:  {
        similar_named_status: 'noted',
        similar_named_note:   { policy_id: sameName.id, name: sameName.name, content_pct: Math.round(sameName.score * 100) } as any,
      },
    }).catch(() => {})
    console.log(`[dedup] policy ${policyId} noted as similarly-named to ${sameName.id} (${Math.round(sameName.score * 100)}% content)`)
  }
  return { matched: false }
}
