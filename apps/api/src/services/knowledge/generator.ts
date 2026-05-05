// Knowledge Base generator — extracts Q&A pairs from policy text using Claude,
// stores them in the KnowledgeEntry table, and embeds them in Pinecone.
//
// Called automatically after a policy is ingested (source_type='policy')
// or manually via the admin API for individual entries (source_type='manual').

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { embedTexts } from '../rag/embedder'
import { downloadExtractedText } from '../storage/s3'
import {
  upsertKnowledgeVectors,
  deleteKnowledgeVectorsBySource,
  type KnowledgeVector,
} from '../vector/pinecone'

// ─── Claude prompt ────────────────────────────────────────────────────────────

const EXTRACTION_SYSTEM = `You are a knowledge extraction assistant for a UK care home policy system.
Given the full text of a care home policy document, extract between 5 and 15 specific, factual Q&A pairs
that staff would genuinely want to know.

Rules:
- Questions must be specific and concrete (not "What is this policy about?").
- Answers must come directly from the document — do not invent or generalise.
- Focus on practical information: procedures, thresholds, responsibilities, timescales, colour codes, contact details, etc.
- Include home-specific details whenever they appear (named roles, named people, specific numbers, specific locations).
- Do not include questions that simply summarise the policy's existence or purpose.
- Output ONLY a JSON array of objects with "question" and "answer" keys.
- No markdown, no preamble, no explanation — raw JSON array only.

Example format:
[{"question":"What colour mop should be used in the kitchen?","answer":"Yellow mops are designated for kitchen use only."},{"question":"How often must medication records be audited?","answer":"Medication records must be audited monthly by the registered manager."}]`

// ─── Types ────────────────────────────────────────────────────────────────────

interface QAPair {
  question: string
  answer:   string
}

// ─── Internal helpers ─────────────────────────────────────────────────────────

async function extractQAPairs(policyText: string): Promise<QAPair[]> {
  const truncated = policyText.slice(0, 60_000) // ~45k tokens — well within context
  const raw = await callClaude(EXTRACTION_SYSTEM, truncated, {
    maxTokens:   2048,
    temperature: 0.1,
  })

  // Strip any accidental markdown fence
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []
    return parsed
      .filter((p: any) => typeof p.question === 'string' && typeof p.answer === 'string')
      .slice(0, 15)
  } catch {
    console.warn('[knowledge] Failed to parse Q&A JSON from Claude')
    return []
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Generate and store knowledge entries for one policy.
// Idempotent: deletes existing entries for this policy before re-generating.
export async function generateKnowledgeForPolicy(
  tenantId:   string,
  policyId:   string,
  policyName: string,
): Promise<void> {
  console.log(`[knowledge] Generating Q&A for policy=${policyId} tenant=${tenantId}`)

  // Remove stale entries for this policy
  await deleteKnowledgeForPolicy(tenantId, policyId)

  // Fetch extracted policy text
  const rawText = await downloadExtractedText(tenantId, policyId)
  if (!rawText || rawText.trim().length < 200) {
    console.warn(`[knowledge] Policy ${policyId} has insufficient text — skipping generation`)
    return
  }

  // Ask Claude to extract Q&A pairs
  const pairs = await extractQAPairs(rawText)
  if (pairs.length === 0) {
    console.warn(`[knowledge] No Q&A pairs extracted for policy=${policyId}`)
    return
  }

  // Create DB rows first to get IDs
  const created = await Promise.all(
    pairs.map(pair =>
      (prisma as any).knowledgeEntry.create({
        data: {
          tenant_id:   tenantId,
          question:    pair.question,
          answer:      pair.answer,
          source_type: 'policy',
          source_id:   policyId,
          source_name: policyName,
        },
      }),
    ),
  )

  // Embed questions (we embed the question text for retrieval)
  const embeddings = await embedTexts(created.map((e: any) => e.question))

  // Build Pinecone vectors
  const vectors: KnowledgeVector[] = created.map((entry: any, i: number) => ({
    id:     `kb_${entry.id}`,
    values: embeddings[i],
    metadata: {
      tenant_id:   tenantId,
      entry_id:    entry.id,
      question:    entry.question,
      answer:      entry.answer,
      source_type: 'policy',
      source_id:   policyId,
      source_name: policyName,
    },
  }))

  await upsertKnowledgeVectors(tenantId, vectors)

  // Write vector_id back to each DB row
  await Promise.all(
    created.map((entry: any, i: number) =>
      (prisma as any).knowledgeEntry.update({
        where: { id: entry.id },
        data:  { vector_id: vectors[i].id },
      }),
    ),
  )

  console.log(`[knowledge] Created ${created.length} entries for policy=${policyId}`)
}

// Generate knowledge for all active policies in a tenant (bulk backfill).
export async function generateKnowledgeForAllPolicies(tenantId: string): Promise<{ generated: number; policies: number }> {
  const policies = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
  })

  let totalGenerated = 0
  for (const policy of policies) {
    try {
      await generateKnowledgeForPolicy(tenantId, policy.id as string, policy.name as string)
      const count = await (prisma as any).knowledgeEntry.count({
        where: { tenant_id: tenantId, source_id: policy.id },
      })
      totalGenerated += count
    } catch (e) {
      console.error(`[knowledge] Error generating for policy=${policy.id}: ${String(e)}`)
    }
  }

  return { generated: totalGenerated, policies: policies.length }
}

// Remove all knowledge entries (DB + Pinecone) derived from a specific policy.
export async function deleteKnowledgeForPolicy(tenantId: string, policyId: string): Promise<void> {
  // Delete from Pinecone by source
  try {
    await deleteKnowledgeVectorsBySource(tenantId, policyId)
  } catch (e) {
    console.warn(`[knowledge] Pinecone delete failed for policy=${policyId}: ${String(e)}`)
  }

  // Delete from DB
  await (prisma as any).knowledgeEntry.deleteMany({
    where: { tenant_id: tenantId, source_id: policyId, source_type: 'policy' },
  })
}

// Embed a single manual entry and store its vector_id.
export async function embedManualEntry(
  tenantId: string,
  entryId:  string,
  question: string,
  answer:   string,
  sourceName: string,
): Promise<string> {
  const [embedding] = await embedTexts([question])
  const vectorId = `kb_${entryId}`

  await upsertKnowledgeVectors(tenantId, [{
    id:     vectorId,
    values: embedding,
    metadata: {
      tenant_id:   tenantId,
      entry_id:    entryId,
      question,
      answer,
      source_type: 'manual',
      source_name: sourceName,
    },
  }])

  return vectorId
}
