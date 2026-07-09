// On-demand deep-dive for a partial/gap regulation (Professional+ only).
//
// Turns a coverage verdict into something actionable:
//   • covered_quotes  — exact sentences in the evidence policy that address the
//     regulation, so the UI can highlight them in the policy preview.
//   • requirements    — the checklist of what the regulation requires, each marked
//     missing or already_covered, with example wording to add for the missing ones.
//
// The non-negotiable safeguard: BEFORE we ever recommend adding a requirement, we
// verify it against the WHOLE policy corpus (not just the evidence policy). If the
// requirement is already addressed anywhere in the tenant's library we suppress the
// suggestion and say which policy covers it — we never tell a home to add something
// it already holds elsewhere. If every requirement turns out covered, we correct the
// cached verdict to "covered".

import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'
import { callClaude } from '../ai/claude'
import { downloadExtractedText } from '../storage/s3'

const SONNET = 'claude-sonnet-4-5'
const MAX_REQUIREMENTS = 8
const POLICY_TEXT_CAP = 12000
const DISCLAIMER =
  'Example wording to review, adapt and approve for your service. This is guidance, not legal or compliance advice.'

export type GapRequirement = {
  requirement:         string
  status:              'missing' | 'already_covered'
  already_covered_in?: string | null
  suggested_addition?: string | null
}

export type GapDetail = {
  reference_key:     string
  official_name:     string
  original_status:   'partial' | 'gap'
  effective_status:  'partial' | 'gap' | 'covered'
  evidence_policy:   { id: string; name: string } | null
  covered_quotes:    string[]
  requirements:      GapRequirement[]
  disclaimer:        string
  generated_at:      string
}

const parseJson = (text: string): any => {
  const s = text.indexOf('{'); const a = text.lastIndexOf('}')
  return JSON.parse(text.slice(s, a + 1))
}

// ── Step 1: identify the regulation's requirements + (for partial) what the ──────
//            evidence policy already evidences.
//
// The requirement checklist comes from the regulation's CURATED `required_elements`
// when present (authoritative, consistent, traceable). Only when a regulation has no
// curated checklist do we fall back to model-derived requirements — and even then we
// bind the model strictly to the regulation description, not outside knowledge.
async function identify(reg: any, evidenceText: string | null): Promise<{ covered_quotes: string[]; requirements: { requirement: string; in_policy: boolean }[] }> {
  const curated: string[] = Array.isArray(reg.required_elements) ? reg.required_elements.filter(Boolean).slice(0, MAX_REQUIREMENTS) : []

  // ── Partial: check the evidence policy against the requirement checklist. ──
  if (evidenceText) {
    const checklistBlock = curated.length
      ? `Assess THIS policy against each of the required elements below. Do not add or invent requirements beyond this list.\nREQUIRED ELEMENTS:\n${curated.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      : `Break the regulation into up to ${MAX_REQUIREMENTS} concrete, distinct requirements a compliant care-home policy must address. Base these ONLY on the regulation description above — do not rely on outside knowledge.`

    const user = `REGULATION: ${reg.official_name}
WHAT IT REQUIRES: ${reg.summary}
IN A CARE HOME: ${reg.care_home_context}
PRACTICAL MEANING: ${reg.practical_meaning}

THE HOME'S POLICY THAT PARTLY COVERS THIS (verbatim text):
"""
${evidenceText.slice(0, POLICY_TEXT_CAP)}
"""

${checklistBlock}

For each requirement, decide whether THIS policy text substantively addresses it. Also quote up to 6 exact sentences from the policy (verbatim, copied character-for-character) that evidence the parts it does cover.

Respond with ONLY minified JSON${curated.length ? ' — keep the requirement text identical to the list above and in the same order' : ''}:
{"covered_quotes":["<verbatim sentence>"],"requirements":[{"requirement":"<requirement>","in_policy":true|false}]}`
    const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 1500 })
    const p = parseJson(text)
    return {
      covered_quotes: Array.isArray(p.covered_quotes) ? p.covered_quotes.filter((q: any) => typeof q === 'string').slice(0, 8) : [],
      requirements:   Array.isArray(p.requirements) ? p.requirements.slice(0, MAX_REQUIREMENTS).map((r: any) => ({ requirement: String(r.requirement ?? ''), in_policy: !!r.in_policy })).filter((r: any) => r.requirement) : [],
    }
  }

  // ── Full gap: no evidence policy. Use the curated checklist verbatim if present. ──
  if (curated.length) {
    return { covered_quotes: [], requirements: curated.map(e => ({ requirement: e, in_policy: false })) }
  }
  const user = `REGULATION: ${reg.official_name}
WHAT IT REQUIRES: ${reg.summary}
IN A CARE HOME: ${reg.care_home_context}
PRACTICAL MEANING: ${reg.practical_meaning}

The home has no policy that addresses this regulation. List up to ${MAX_REQUIREMENTS} concrete, distinct requirements a compliant care-home policy must contain. Base these ONLY on the regulation description above — do not rely on outside knowledge.

Respond with ONLY minified JSON:
{"requirements":[{"requirement":"<one specific requirement>"}]}`
  const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 1200 })
  const p = parseJson(text)
  return {
    covered_quotes: [],
    requirements: Array.isArray(p.requirements) ? p.requirements.slice(0, MAX_REQUIREMENTS).map((r: any) => ({ requirement: String(r.requirement ?? ''), in_policy: false })).filter((r: any) => r.requirement) : [],
  }
}

// ── Step 2: verify each candidate-missing requirement against the WHOLE corpus, ──
//            and for the genuinely-absent ones, draft example wording.
async function verifyAndSuggest(
  reg: any,
  candidates: string[],
  namespace: string,
  nameById: Map<string, string>,
): Promise<{ requirement: string; already_covered: boolean; covered_in: string | null; suggested_addition: string | null }[]> {
  if (!candidates.length) return []

  // Corpus-wide semantic search — one query per requirement, across ALL policies.
  const embs = await embedTexts(candidates)
  const blocks = await Promise.all(candidates.map(async (requirement, i) => {
    const matches = await queryVectors(namespace, embs[i], 6)
    const seen = new Set<string>()
    const excerpts: string[] = []
    for (const m of matches) {
      const pid = String(m.metadata.policy_id ?? '')
      const name = nameById.get(pid) ?? 'a policy'
      const key = pid + ':' + (m.metadata.chunk_index ?? '')
      if (seen.has(key)) continue
      seen.add(key)
      excerpts.push(`(${name}) ${String(m.metadata.chunk_text ?? '').slice(0, 500)}`)
      if (excerpts.length >= 4) break
    }
    return { requirement, excerpts }
  }))

  const payload = blocks.map((b, i) => `[${i + 1}] REQUIREMENT: ${b.requirement}\nEXCERPTS FROM THE HOME'S POLICIES:\n${b.excerpts.length ? b.excerpts.join('\n') : '(no related content found in any policy)'}`).join('\n\n')

  const user = `Regulation: ${reg.official_name} — ${reg.summary}

For each requirement below, the excerpts are the most relevant passages found across ALL of this home's uploaded policies. For each one:
- If the excerpts show the requirement is ALREADY substantively addressed in one of the home's policies, set already_covered=true and name that policy in covered_in. Do NOT then suggest wording.
- Otherwise set already_covered=false and write concise example wording (2 to 4 sentences) the home could add to a policy to meet the requirement. Ground it in the requirement; keep it practical and care-home specific.

${payload}

Respond with ONLY minified JSON — an array in the same order:
{"results":[{"already_covered":true|false,"covered_in":"<policy name or empty>","suggested_addition":"<example wording or empty>"}]}`

  const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 2500 })
  const p = parseJson(text)
  const results = Array.isArray(p.results) ? p.results : []
  return candidates.map((requirement, i) => {
    const r = results[i] ?? {}
    const already = !!r.already_covered
    return {
      requirement,
      already_covered: already,
      covered_in: already ? (String(r.covered_in ?? '').trim() || null) : null,
      suggested_addition: already ? null : (String(r.suggested_addition ?? '').trim() || null),
    }
  })
}

// ── Public entry point ───────────────────────────────────────────────────────
export async function getGapDetail(tenantId: string, referenceKey: string, force = false): Promise<GapDetail> {
  if (!force) {
    const cached = await (prisma as any).gapDetailCache.findUnique({
      where: { tenant_id_reference_key: { tenant_id: tenantId, reference_key: referenceKey } },
    }).catch(() => null)
    if (cached?.payload) return cached.payload as GapDetail
  }

  const reg = await (prisma as any).externalRegulation.findUnique({
    where:  { reference_key: referenceKey },
    select: { official_name: true, summary: true, care_home_context: true, practical_meaning: true, required_elements: true },
  })
  if (!reg) throw new Error('Regulation not found')

  const cov = await (prisma as any).regulationCoverage.findUnique({
    where: { tenant_id_reference_key: { tenant_id: tenantId, reference_key: referenceKey } },
  })
  const originalStatus: 'partial' | 'gap' = cov?.status === 'partial' ? 'partial' : 'gap'

  // Policy name lookup for corpus verification.
  const policyRows = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true },
  })
  const nameById = new Map((policyRows as any[]).map(p => [p.id, p.name]))

  // Evidence policy (partial only).
  let evidencePolicy: { id: string; name: string } | null = null
  let evidenceText: string | null = null
  if (originalStatus === 'partial' && cov?.evidence_policy_id) {
    evidencePolicy = { id: cov.evidence_policy_id, name: cov.evidence_policy_name ?? nameById.get(cov.evidence_policy_id) ?? 'the policy' }
    evidenceText = await downloadExtractedText(tenantId, cov.evidence_policy_id).catch(() => null)
  }

  const namespace = getTenantNamespace(tenantId)

  // 1. Identify requirements (+ what the evidence policy already evidences).
  const ident = await identify(reg, evidenceText)

  // Requirements the evidence policy already covers → already_covered (in this policy).
  const inPolicy: GapRequirement[] = ident.requirements
    .filter(r => r.in_policy)
    .map(r => ({ requirement: r.requirement, status: 'already_covered', already_covered_in: evidencePolicy?.name ?? null, suggested_addition: null }))

  // 2. Verify the rest against the whole corpus, and draft wording for the truly-missing.
  const candidates = ident.requirements.filter(r => !r.in_policy).map(r => r.requirement)
  const verified = await verifyAndSuggest(reg, candidates, namespace, nameById)

  const verifiedReqs: GapRequirement[] = verified.map(v => v.already_covered
    ? { requirement: v.requirement, status: 'already_covered', already_covered_in: v.covered_in, suggested_addition: null }
    : { requirement: v.requirement, status: 'missing', already_covered_in: null, suggested_addition: v.suggested_addition })

  const requirements = [...inPolicy, ...verifiedReqs]
  const missingCount = requirements.filter(r => r.status === 'missing').length

  // Verdict correction: nothing left to add → it's actually covered across the library.
  const effectiveStatus: GapDetail['effective_status'] = missingCount === 0 ? 'covered' : originalStatus
  if (missingCount === 0) {
    const coveredIn = requirements.find(r => r.already_covered_in)?.already_covered_in ?? evidencePolicy?.name ?? null
    await (prisma as any).regulationCoverage.update({
      where: { tenant_id_reference_key: { tenant_id: tenantId, reference_key: referenceKey } },
      data:  { status: 'covered', evidence_policy_name: coveredIn ?? undefined, reason: 'Verified as covered across your policy library.' },
    }).catch(() => {})
  }

  const detail: GapDetail = {
    reference_key:    referenceKey,
    official_name:    reg.official_name,
    original_status:  originalStatus,
    effective_status: effectiveStatus,
    evidence_policy:  evidencePolicy,
    covered_quotes:   ident.covered_quotes,
    requirements,
    disclaimer:       DISCLAIMER,
    generated_at:     new Date().toISOString(),
  }

  await (prisma as any).gapDetailCache.upsert({
    where:  { tenant_id_reference_key: { tenant_id: tenantId, reference_key: referenceKey } },
    update: { payload: detail, created_at: new Date() },
    create: { tenant_id: tenantId, reference_key: referenceKey, payload: detail },
  }).catch(() => {})

  return detail
}
