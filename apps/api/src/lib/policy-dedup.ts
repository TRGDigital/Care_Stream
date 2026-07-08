// Policy near-duplicate detection. Compares a newly-ingested policy's content
// against the tenant's other active policies (by text, not filename) and flags it
// when it looks like the same document under a different name. The tenant then
// resolves the flag (keep both / replace / discard) from the Policies page.

import { prisma } from '../db/client'
import { downloadExtractedText } from '../services/storage/s3'
import { contentSignature, contentSimilarity, asSignature, DUPLICATE_THRESHOLD } from './content-similarity'

export { contentSignature, DUPLICATE_THRESHOLD }

// Cap on how many existing policies we'll backfill a signature for in one pass, so
// detection stays bounded on very large libraries. Over successive uploads the
// whole library gets backfilled; a manual rebuild is also available.
const BACKFILL_CAP = 150

export async function detectContentDuplicate(opts: {
  tenantId: string
  policyId: string
  documentCategory: string
  signature: number[]
}): Promise<{ matched: boolean; matchId?: string; score?: number }> {
  const { tenantId, policyId, documentCategory, signature } = opts
  if (!signature?.length) return { matched: false }

  // Candidates: other active policies of the same type for this tenant.
  const candidates = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active', document_category: documentCategory, NOT: { id: policyId } },
    select: { id: true, name: true, content_signature: true },
  }) as Array<{ id: string; name: string; content_signature: unknown }>

  // Backfill signatures for existing policies that don't have one yet (uploaded
  // before this feature), so a duplicate of an older policy is still caught.
  let backfilled = 0
  for (const c of candidates) {
    if (asSignature(c.content_signature)) continue
    if (backfilled >= BACKFILL_CAP) break
    const text = await downloadExtractedText(tenantId, c.id).catch(() => null)
    if (!text) continue
    const sig = contentSignature(text)
    c.content_signature = sig
    backfilled++
    await (prisma as any).policy.update({ where: { id: c.id }, data: { content_signature: sig as any } }).catch(() => {})
  }

  // Best match above the threshold.
  let best: { id: string; score: number } | null = null
  for (const c of candidates) {
    const sig = asSignature(c.content_signature)
    if (!sig) continue
    const score = contentSimilarity(signature, sig)
    if (score >= DUPLICATE_THRESHOLD && (!best || score > best.score)) best = { id: c.id, score }
  }

  if (!best) return { matched: false }

  await (prisma as any).policy.update({
    where: { id: policyId },
    data:  { duplicate_of: best.id, duplicate_score: best.score, duplicate_status: 'flagged' },
  }).catch(() => {})

  console.log(`[dedup] policy ${policyId} flagged as ${(best.score * 100).toFixed(0)}% match of ${best.id}`)
  return { matched: true, matchId: best.id, score: best.score }
}
