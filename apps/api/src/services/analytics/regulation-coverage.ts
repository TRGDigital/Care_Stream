// Content-based regulation coverage.
//
// Replaces the old name/tag substring match (which couldn't see inside policies and
// produced misleading "gaps"). For each active external regulation we:
//   1. embed a description of the regulation,
//   2. retrieve the tenant's most relevant policy passages from the vector index,
//   3. ask Claude to judge — from those passages ONLY — whether the home's policies
//      substantively cover the regulation (covered / partial / gap), with evidence.
// Results are cached in regulation_coverage and read by GET /analytics/gaps.

import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'
import { callClaude } from '../ai/claude'
import { mapLimit } from '../../lib/translate'

const HAIKU = 'claude-haiku-4-5-20251001'

export type CoverageRow = {
  reference_key:        string
  status:               'covered' | 'partial' | 'gap'
  confidence:           number | null
  evidence_policy_id:   string | null
  evidence_policy_name: string | null
  reason:               string | null
}

function policyTitle(filename?: string | null): string {
  if (!filename) return ''
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

// Analyse every active regulation against a tenant's policy corpus and cache the result.
export async function analyseRegulationCoverage(tenantId: string): Promise<CoverageRow[]> {
  const regulations = await (prisma as any).externalRegulation.findMany({
    where:  { is_active: true },
    select: { reference_key: true, official_name: true, summary: true, care_home_context: true },
  })
  if (!regulations.length) return []

  const namespace = getTenantNamespace(tenantId)

  // Batch all the regulation queries through the embedder in one pass.
  const queryTexts = (regulations as any[]).map(r =>
    `${r.official_name}. ${r.summary} ${r.care_home_context}`.slice(0, 1500))
  const embeddings = await embedTexts(queryTexts)

  const rows: CoverageRow[] = await mapLimit(regulations as any[], 5, async (reg: any, i: number) => {
    const fallback: CoverageRow = {
      reference_key: reg.reference_key, status: 'gap', confidence: 0,
      evidence_policy_id: null, evidence_policy_name: null,
      reason: 'No policy content addressing this was found.',
    }
    try {
      const matches = await queryVectors(namespace, embeddings[i], 5)
      if (!matches.length) return fallback

      const excerpts = matches
        .map((m, j) => `[${j + 1}] (${policyTitle(m.metadata.source_filename)}) ${String(m.metadata.chunk_text ?? '').slice(0, 700)}`)
        .join('\n\n')

      const sys = 'You are a UK care-home compliance auditor. Judge ONLY from the policy extracts provided whether the home has a policy that substantively addresses the regulation. Do not rely on outside knowledge or assume coverage that is not shown in the extracts.'
      const user = [
        `REGULATION: ${reg.official_name}`,
        `WHAT IT REQUIRES: ${reg.summary}`,
        `IN A CARE HOME: ${reg.care_home_context}`,
        '',
        `POLICY EXTRACTS FROM THIS HOME:`,
        excerpts,
        '',
        'Do this home\'s policies substantively address this regulation? "covered" = a policy clearly addresses it; "partial" = touched on but incomplete; "gap" = not addressed in these extracts.',
        'Reply with ONLY minified JSON: {"status":"covered|partial|gap","confidence":0-100,"policy":"<title of the best-matching extract, or empty>","reason":"<one short sentence>"}',
      ].join('\n')

      const text = await callClaude(sys, user, { model: HAIKU, maxTokens: 250 })
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
      const status: CoverageRow['status'] = ['covered', 'partial', 'gap'].includes(parsed.status) ? parsed.status : 'gap'
      const evidence = matches.find(m => policyTitle(m.metadata.source_filename) === parsed.policy) ?? matches[0]

      return {
        reference_key:        reg.reference_key,
        status,
        confidence:           typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : null,
        evidence_policy_id:   status === 'gap' ? null : (evidence?.metadata.policy_id ?? null),
        evidence_policy_name: status === 'gap' ? null : policyTitle(evidence?.metadata.source_filename),
        reason:               typeof parsed.reason === 'string' ? parsed.reason.slice(0, 300) : null,
      }
    } catch {
      return fallback
    }
  })

  // Replace this tenant's cached coverage atomically.
  const now = new Date()
  await prisma.$transaction([
    (prisma as any).regulationCoverage.deleteMany({ where: { tenant_id: tenantId } }),
    (prisma as any).regulationCoverage.createMany({
      data: rows.map(r => ({
        tenant_id: tenantId, reference_key: r.reference_key, status: r.status, confidence: r.confidence,
        evidence_policy_id: r.evidence_policy_id, evidence_policy_name: r.evidence_policy_name, reason: r.reason, analysed_at: now,
      })),
    }),
  ])

  return rows
}
