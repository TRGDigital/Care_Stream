// Content-based regulation coverage — candidate-selection edition.
//
// Earlier this did a pure "regulation → top-5 nearest chunks" vector sweep and asked
// Claude to judge coverage from those 5 excerpts. Near-neighbour regulations poisoned
// each other's samples: a Mental Health Act 1983 query pulled Mental Capacity Act / DoLS
// chunks (its nearest neighbours) and the home's actual MHA policy never surfaced, so a
// held policy was reported as a gap.
//
// Now, for each active regulation we:
//   1. CANDIDATE-SELECT the home's policies whose title/type match the regulation's
//      curated signals (expected_policy_titles, match_terms, official_name).
//   2. RETRIEVE a diversified excerpt set — one best chunk per DISTINCT policy from a
//      wide vector pass, PLUS a targeted per-policy pull for any candidate the wide pass
//      missed, so the candidate's own content always reaches the judge.
//   3. JUDGE from those excerpts, with the regulation's `distinguish_from` list injected
//      as an explicit "do not count these as coverage" boundary.
// Results are cached in regulation_coverage and read by GET /analytics/gaps.

import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'
import { callClaude } from '../ai/claude'
import { mapLimit } from '../../lib/translate'
import { facilityTypeToSetting } from '../../lib/care-setting'
import { resolveServiceProfile, regulationAppliesToTenant } from '../../lib/service-triggers'

const HAIKU = 'claude-haiku-4-5-20251001'

// Editable in the platform console (/prompts, usage "regulation_coverage"). Placeholders:
// {{official_name}}, {{summary}}, {{care_home_context}}, {{excerpts}}.
// The `distinguish_from` boundary is appended programmatically after this template is
// filled, so it applies even to an older edited prompt that predates the field.
export const DEFAULT_REGULATION_COVERAGE_PROMPT = `You are a UK care-home compliance auditor. Judge ONLY from the policy extracts provided whether this care home has a policy that substantively addresses the regulation. Do not rely on outside knowledge or assume coverage that is not shown in the extracts.

REGULATION: {{official_name}}
WHAT IT REQUIRES: {{summary}}
IN A CARE HOME: {{care_home_context}}

POLICY EXTRACTS FROM THIS HOME (each tagged with its policy title):
{{excerpts}}

Decide how well this home's policies address the regulation:
- "covered"  — a policy clearly and substantively addresses it
- "partial"  — the topic is touched on but is incomplete for what the regulation requires
- "gap"      — it is not addressed in these extracts

Pick the single policy title that best evidences your decision (or leave empty for a gap).

Respond with ONLY minified JSON, no markdown or preamble:
{"status":"covered|partial|gap","confidence":0-100,"policy":"<best-matching policy title, or empty>","reason":"<one short sentence>"}`

// Read the live prompt from the DB (falls back to the default if not yet seeded).
async function getCoveragePrompt(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: 'regulation_coverage' } })
    return (row?.content as string) || DEFAULT_REGULATION_COVERAGE_PROMPT
  } catch {
    return DEFAULT_REGULATION_COVERAGE_PROMPT
  }
}

const fillTemplate = (tpl: string, vars: Record<string, string>): string =>
  Object.entries(vars).reduce((s, [k, v]) => s.split(`{{${k}}}`).join(v ?? ''), tpl)

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

// ─── Candidate selection helpers ──────────────────────────────────────────────

const STOP = new Set([
  'policy', 'policies', 'procedure', 'procedures', 'care', 'home', 'homes', 'staff',
  'the', 'of', 'in', 'and', 'for', 'to', 'a', 'an', 'our', 'guidance', 'guideline',
  'guidelines', 'management', 'service', 'services', 'setting', 'settings', 'act',
])

const norm = (s: string): string => (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// Meaningful tokens: keep words of length >= 3 (minus stopwords) and any pure number
// (so "7", "117", "1983" survive — they are strong discriminators for a regulation).
function tokenSet(s: string): Set<string> {
  const out = new Set<string>()
  for (const t of norm(s).split(' ')) {
    if (!t) continue
    if (/^\d+$/.test(t)) { out.add(t); continue }
    if (t.length >= 3 && !STOP.has(t)) out.add(t)
  }
  return out
}

// Fraction of `needle` tokens present in `haystack`.
function overlapRatio(needle: Set<string>, haystack: Set<string>): number {
  if (!needle.size) return 0
  let hit = 0
  for (const t of needle) if (haystack.has(t)) hit++
  return hit / needle.size
}

// A multi-word match term "hits" a policy when all its meaningful tokens are in the title.
function termHits(matchTerms: string[], policyTokens: Set<string>): number {
  let hits = 0
  for (const term of matchTerms) {
    const tt = tokenSet(term)
    if (tt.size && [...tt].every(t => policyTokens.has(t))) hits++
  }
  return hits
}

type Reg = {
  reference_key: string; official_name: string; summary: string; care_home_context: string
  match_terms: string[]; distinguish_from: string[]; expected_policy_titles: string[]
  applies_to_settings: string[]; required_triggers: string[]
}
type Pol = { id: string; name: string; tokens: Set<string> }

// Score a policy as a candidate for a regulation. Recall-oriented on purpose — the judge
// applies precision with the distinguish_from boundary. Returns 0 when clearly unrelated.
function candidateScore(reg: Reg, pol: Pol): number {
  const nameTokens = tokenSet(reg.official_name)
  const nameScore  = overlapRatio(nameTokens, pol.tokens)

  let titleScore = 0
  for (const t of reg.expected_policy_titles) titleScore = Math.max(titleScore, overlapRatio(tokenSet(t), pol.tokens))

  const hits = termHits(reg.match_terms, pol.tokens)

  // Any strong single signal qualifies; otherwise a weighted blend.
  if (titleScore >= 0.6 || nameScore >= 0.75 || hits >= 2) {
    return Math.max(titleScore, nameScore, Math.min(1, hits / 2)) + 0.001
  }
  return 0.6 * titleScore + 0.4 * nameScore + Math.min(0.3, 0.15 * hits)
}

const CANDIDATE_MIN = 0.5   // below this a policy is not a candidate
const MAX_CANDIDATES = 4    // per regulation, top-scoring
const WIDE_K = 20           // diversified vector pass depth
const MAX_EXCERPT_POLICIES = 10

// Analyse every active regulation against a tenant's policy corpus and cache the result.
export async function analyseRegulationCoverage(tenantId: string): Promise<CoverageRow[]> {
  const allRegulations: Reg[] = await (prisma as any).externalRegulation.findMany({
    where:  { is_active: true },
    select: {
      reference_key: true, official_name: true, summary: true, care_home_context: true,
      match_terms: true, distinguish_from: true, expected_policy_titles: true,
      applies_to_settings: true, required_triggers: true,
    },
  })
  if (!allRegulations.length) return []

  // Only analyse regulations that actually apply to THIS service — scoped by the
  // tenant's care setting and its self-declared service profile. Out-of-scope regs
  // never become gaps (we don't recommend, e.g., a Mental Health Act policy to a
  // service that doesn't support people under the Act).
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { facility_type: true, service_profile: true },
  })
  const setting = facilityTypeToSetting(tenant?.facility_type)
  const profile = resolveServiceProfile(setting, (tenant?.service_profile ?? {}) as Record<string, unknown>)
  const regulations = allRegulations.filter(r => regulationAppliesToTenant(r, setting, profile))
  if (!regulations.length) return []

  // The home's active policies, tokenised once for candidate matching.
  const policyRows = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
  })
  const policies: Pol[] = (policyRows as any[]).map(p => ({ id: p.id, name: p.name, tokens: tokenSet(p.name) }))
  const nameById = new Map(policies.map(p => [p.id, p.name]))

  const namespace = getTenantNamespace(tenantId)

  // Batch all the regulation queries through the embedder in one pass.
  const queryTexts = regulations.map(r => `${r.official_name}. ${r.summary} ${r.care_home_context}`.slice(0, 1500))
  const embeddings = await embedTexts(queryTexts)

  // One DB read for the (editable) judging prompt, reused for every regulation.
  const promptTemplate = await getCoveragePrompt()

  const rows: CoverageRow[] = await mapLimit(regulations, 5, async (reg: Reg, i: number) => {
    const fallback: CoverageRow = {
      reference_key: reg.reference_key, status: 'gap', confidence: 0,
      evidence_policy_id: null, evidence_policy_name: null,
      reason: 'No policy content addressing this was found.',
    }
    try {
      const emb = embeddings[i]

      // 1. Candidate policies by curated title/term/name signal.
      const candidates = policies
        .map(p => ({ p, score: candidateScore(reg, p) }))
        .filter(c => c.score >= CANDIDATE_MIN)
        .sort((a, b) => b.score - a.score)
        .slice(0, MAX_CANDIDATES)
        .map(c => c.p)
      const candidateIds = new Set(candidates.map(c => c.id))

      // 2. Diversified wide pass — best chunk per DISTINCT policy.
      const wide = await queryVectors(namespace, emb, WIDE_K)
      const bestByPolicy = new Map<string, { policy_id: string; title: string; text: string; score: number }>()
      for (const m of wide) {
        const pid = String(m.metadata.policy_id ?? '')
        if (!pid) continue
        const title = nameById.get(pid) ?? policyTitle(m.metadata.source_filename)
        const text  = String(m.metadata.chunk_text ?? '')
        const score = m.score ?? 0
        const prev  = bestByPolicy.get(pid)
        if (!prev || score > prev.score) bestByPolicy.set(pid, { policy_id: pid, title, text, score })
      }

      // 3. Targeted pull for any candidate the wide pass missed, so its content is seen.
      const missing = candidates.filter(c => !bestByPolicy.has(c.id))
      await Promise.all(missing.map(async c => {
        const hit = await queryVectors(namespace, emb, 2, { policy_id: c.id })
        if (hit.length) {
          const m = hit[0]
          bestByPolicy.set(c.id, {
            policy_id: c.id, title: nameById.get(c.id) ?? policyTitle(m.metadata.source_filename),
            text: String(m.metadata.chunk_text ?? ''), score: m.score ?? 0,
          })
        }
      }))

      if (!bestByPolicy.size) return fallback

      // 4. Order excerpts: candidates first (by vector score), then remaining diversified.
      const all = [...bestByPolicy.values()]
      const ordered = [
        ...all.filter(x => candidateIds.has(x.policy_id)).sort((a, b) => b.score - a.score),
        ...all.filter(x => !candidateIds.has(x.policy_id)).sort((a, b) => b.score - a.score),
      ].slice(0, MAX_EXCERPT_POLICIES)

      const excerpts = ordered
        .map((x, j) => `[${j + 1}] (${x.title}) ${x.text.slice(0, 700)}`)
        .join('\n\n')

      let user = fillTemplate(promptTemplate, {
        official_name:     reg.official_name,
        summary:           reg.summary,
        care_home_context: reg.care_home_context,
        excerpts,
      })
      // Inject the disambiguation boundary regardless of the (editable) template shape.
      if (reg.distinguish_from?.length) {
        user += `\n\nDO NOT COUNT AS COVERAGE — these are different, related regulations that must not be confused with ${reg.official_name}: ${reg.distinguish_from.join('; ')}. A policy that only addresses those does NOT cover ${reg.official_name}.`
      }

      const text = await callClaude('Respond only with valid JSON.', user, { model: HAIKU, maxTokens: 250 })
      const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
      const status: CoverageRow['status'] = ['covered', 'partial', 'gap'].includes(parsed.status) ? parsed.status : 'gap'
      const evidence = ordered.find(x => x.title === parsed.policy) ?? ordered[0]

      return {
        reference_key:        reg.reference_key,
        status,
        confidence:           typeof parsed.confidence === 'number' ? Math.max(0, Math.min(100, Math.round(parsed.confidence))) : null,
        evidence_policy_id:   status === 'gap' ? null : (evidence?.policy_id ?? null),
        evidence_policy_name: status === 'gap' ? null : (evidence?.title ?? null),
        reason:               typeof parsed.reason === 'string' ? parsed.reason.slice(0, 300) : null,
      }
    } catch {
      return fallback
    }
  })

  // Replace this tenant's cached coverage atomically, and clear the on-demand
  // gap detail cache so re-opened drill-ins reflect the fresh analysis.
  const now = new Date()
  await prisma.$transaction([
    (prisma as any).gapDetailCache.deleteMany({ where: { tenant_id: tenantId } }),
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
