// Content-based regulation coverage — two-question edition.
//
// History, because it explains every guard in here. The first version matched on policy
// NAMES; it called a held policy covered on a title coincidence. The second did a pure
// "regulation → top-5 nearest chunks" vector sweep; near-neighbour regulations poisoned each
// other's samples (a Mental Health Act query pulled Mental Capacity Act chunks) so real
// policies were reported as gaps. The third kept that sweep but bolted on three tightening
// layers — "BE STRICT", "when in doubt choose gap", and a skeptic that had to confirm every
// non-gap verdict from a 1,000-character excerpt. Those layers over-corrected badly: on a
// 361-policy library the page came back 0 covered / 42 partial / 33 gap, calling DoLS,
// Safeguarding and the Mental Capacity Act gaps while the policies sat in the library. The
// cause was not the model. It was asking a completeness question ("does this meet all twelve
// required elements?") from about 2% of a document, with instructions to fail when unsure.
//
// So we now ask TWO questions, in order, each with evidence that can actually answer it:
//   1. SUBJECT (Haiku) — "is there a policy whose subject IS this regulation?" Evidence is,
//      per shortlisted policy, its title, its opening (where a policy declares itself) and
//      its best-matching passages. The regulation's `distinguish_from` list is injected so
//      an MHA policy still cannot satisfy the MCA. A "gap" now means one thing only: no
//      policy in the library is about this. Nothing else can produce a gap.
//   2. ELEMENTS (Sonnet) — only for a policy that passed question 1, read the WHOLE policy
//      against the regulation's curated `required_elements`. All met → covered. Some missing
//      → partial, and the reason says which, so the row is actionable rather than a shrug.
//
// The skeptic is gone: its job (rejecting wrong-subject matches) is done by title
// shortlisting plus question 1, and it was the direct cause of 22 of the 33 false gaps.
// Cost is unchanged at two AI calls per regulation.
//
// A "partial" here means "the policy that owns this subject is missing elements". The
// drill-in (gap-detail.ts) then checks whether another policy in the library covers those
// elements and promotes to covered if so — that promotion already existed and still writes
// back, so summary and drill-in agree.
//
// Results are cached in regulation_coverage and read by GET /analytics/gaps.

import { prisma } from '../../db/client'
import { embedTexts } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'
import { callClaude } from '../ai/claude'
import { downloadExtractedText } from '../storage/s3'
import { mapLimit } from '../../lib/translate'
import { facilityTypeToSetting } from '../../lib/care-setting'
import { resolveServiceProfile, regulationAppliesToTenant } from '../../lib/service-triggers'
import { isPolicyDocument } from '../../lib/document-kind'

const HAIKU = 'claude-haiku-4-5-20251001'
const SONNET = 'claude-sonnet-4-5'

// How much of a policy the elements pass reads. Policies in a commercial pack run to tens of
// thousands of characters; the old 12k cap was itself a source of false "missing element".
const POLICY_TEXT_CAP = 60_000

// Question 1: SUBJECT. Editable in the platform console (/prompts, usage
// "regulation_coverage"). Placeholders: {{official_name}}, {{summary}}, {{care_home_context}},
// {{expected_titles}}, {{documents}}. The `distinguish_from` boundary is appended
// programmatically after the template is filled, so it applies even to an edited prompt.
export const DEFAULT_REGULATION_COVERAGE_PROMPT = `You are a UK care-home compliance auditor. Decide whether this care home HOLDS A POLICY WHOSE SUBJECT IS the regulation below. This is a question about what each document is ABOUT, not about whether it is complete — completeness is judged separately.

REGULATION: {{official_name}}
WHAT IT IS ABOUT: {{summary}}
IN A CARE HOME: {{care_home_context}}
A POLICY ON THIS SUBJECT IS TYPICALLY CALLED: {{expected_titles}}

DOCUMENTS FROM THIS HOME (title, opening text, and the passages most relevant to the regulation):
{{documents}}

Rules:
- "direct": the document's subject IS this regulation. Its title or opening declares it, or the regulation is the document's main purpose.
- "section": no document is dedicated to it, but one contains a substantial dedicated section on it (several paragraphs of provisions), not a passing mention.
- "none": no document is about it. A document that merely cites the regulation, shares generic words, or is about a different regulation is "none".

Answer "direct" or "section" when a document genuinely is about the subject EVEN IF it looks incomplete. Pick the single best document and copy its title exactly.

Respond with ONLY minified JSON, no markdown or preamble:
{"relevance":"direct|section|none","policy":"<exact title, or empty>","why":"<one short sentence>"}`

// The placeholder that tells us a stored prompt was written for THIS judge. An older edited
// prompt (built around {{excerpts}} and a covered/partial/gap verdict) cannot drive the
// subject question, so we ignore it rather than silently filling a template that no longer
// fits — that would reintroduce the very failure this rewrite fixes.
const SUBJECT_PROMPT_MARKER = '{{documents}}'

// Read the live prompt from the DB, falling back to the default when there is no row or the
// stored row predates this judge.
async function getCoveragePrompt(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: 'regulation_coverage' } })
    const stored = row?.content as string | undefined
    return stored && stored.includes(SUBJECT_PROMPT_MARKER) ? stored : DEFAULT_REGULATION_COVERAGE_PROMPT
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

export type Reg = {
  reference_key: string; official_name: string; summary: string; care_home_context: string
  match_terms: string[]; distinguish_from: string[]; expected_policy_titles: string[]
  applies_to_settings: string[]; required_triggers: string[]; required_elements: string[]
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
const WIDE_K = 24           // diversified vector pass depth
const MAX_SHORTLIST = 8     // documents shown to the subject question
const CHUNKS_PER_DOC = 2    // best-matching passages per shortlisted document
// Semantic relevance floor: a NON-candidate policy (one with no curated title/term signal)
// only reaches the subject question if its best chunk is at least this cosine-similar to the
// regulation. Below that it is topically unrelated. Candidates always pass — a title/term
// match is itself a strong signal — and the subject question applies the precision.
const RELEVANCE_FLOOR = 0.3
const COVERAGE_BATCH = 12   // regulations analysed per batched request
const MAX_ELEMENTS = 12     // curated required_elements assessed per regulation

// Resolve the regulations that actually apply to THIS service — scoped by the tenant's
// care setting and its self-declared service profile. Out-of-scope regs never become
// gaps (we don't recommend, e.g., a Mental Health Act policy to a service that doesn't
// support people under the Act).
export async function getScopedRegulations(tenantId: string): Promise<Reg[]> {
  const allRegulations: Reg[] = await (prisma as any).externalRegulation.findMany({
    where:  { is_active: true },
    select: {
      reference_key: true, official_name: true, summary: true, care_home_context: true,
      match_terms: true, distinguish_from: true, expected_policy_titles: true,
      applies_to_settings: true, required_triggers: true, required_elements: true,
    },
  })
  if (!allRegulations.length) return []
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { facility_type: true, service_profile: true },
  })
  const setting = facilityTypeToSetting(tenant?.facility_type)
  const profile = resolveServiceProfile(setting, (tenant?.service_profile ?? {}) as Record<string, unknown>)
  return allRegulations.filter(r => regulationAppliesToTenant(r, setting, profile))
}

type Excerpt = { policy_id: string; title: string; text: string; score: number }

// Full policy text, memoised for the life of one batch so a policy shortlisted for several
// regulations is fetched from storage once.
function makeTextLoader(tenantId: string) {
  const cache = new Map<string, Promise<string | null>>()
  return (policyId: string): Promise<string | null> => {
    if (!cache.has(policyId)) cache.set(policyId, downloadExtractedText(tenantId, policyId).catch(() => null))
    return cache.get(policyId)!
  }
}

type ElementFinding = { requirement: string; met: boolean; note: string }

// QUESTION 2 — completeness. Does the policy that owns this subject meet the regulation's
// curated required elements? Reads the WHOLE policy (to POLICY_TEXT_CAP), because this is the
// question the old judge could never answer honestly from a 700-character excerpt.
// Returns [] when there are no curated elements or the call fails; the caller treats that as
// "the policy exists and is on the subject", never as evidence of a gap.
async function assessElements(reg: Reg, policyName: string, policyText: string): Promise<ElementFinding[]> {
  const elements = (reg.required_elements ?? []).filter(Boolean).slice(0, MAX_ELEMENTS)
  if (!elements.length || !policyText.trim()) return []
  const user = `REGULATION: ${reg.official_name}
WHAT IT REQUIRES: ${String(reg.summary ?? '').slice(0, 1500)}

REQUIRED ELEMENTS:
${elements.map((e, i) => `${i + 1}. ${e}`).join('\n')}

THE HOME'S POLICY "${policyName}" (verbatim, may be truncated):
"""
${policyText.slice(0, POLICY_TEXT_CAP)}
"""

For EACH required element decide whether THIS policy substantively addresses it. "met" needs actual provisions (who does what, when, how), not a bare mention of the topic. If an element applies only in a circumstance that the policy states does not apply to this home (for example tenancies, supported living, or a service it does not provide), treat it as met and say so in the note. Do not add or invent elements. Keep the same order.

Respond with ONLY minified JSON: {"elements":[{"n":1,"met":true|false,"note":"<short: what the policy provides, or what is missing>"}]}`
  try {
    const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 1800, temperature: 0, feature: 'regulation_coverage' })
    const parsed = JSON.parse(text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1))
    const out: ElementFinding[] = elements.map(e => ({ requirement: e, met: false, note: '' }))
    for (const r of (Array.isArray(parsed.elements) ? parsed.elements : [])) {
      const i = Number(r.n) - 1
      if (out[i]) { out[i].met = !!r.met; out[i].note = String(r.note ?? '').slice(0, 200) }
    }
    return out
  } catch {
    return []
  }
}

// Trim the leading boilerplate off a curated element so several fit in the reason line.
const shortRequirement = (s: string) =>
  s.replace(/^(the )?policy must (require|state|establish|contain|specify|include|define|prohibit|identify|mandate|ensure)?\s*/i, '')
   .replace(/^(a|an|the)\s+/i, '')
   .slice(0, 110)

// Analyse a SINGLE regulation against the tenant's policy corpus. Pure (no writes) so it can
// be run in batches. Two questions in order: is a policy ABOUT this (subject), and if so does
// it meet the curated required elements (completeness). Only the first can produce a gap.
async function analyseOne(
  reg: Reg, emb: number[], policies: Pol[], nameById: Map<string, string>,
  namespace: string, promptTemplate: string, loadText: (id: string) => Promise<string | null>,
): Promise<CoverageRow> {
  const noPolicy = (reason: string): CoverageRow => ({
    reference_key: reg.reference_key, status: 'gap', confidence: null,
    evidence_policy_id: null, evidence_policy_name: null, reason: reason.slice(0, 300),
  })
  try {
    // 1. Shortlist: curated title/term/name candidates first, then vector neighbours that
    //    clear the semantic floor.
    const candidates = policies
      .map(p => ({ p, score: candidateScore(reg, p) }))
      .filter(c => c.score >= CANDIDATE_MIN)
      .sort((a, b) => b.score - a.score)
      .slice(0, MAX_CANDIDATES)
      .map(c => c.p)
    const candidateIds = new Set(candidates.map(c => c.id))

    const chunks = new Map<string, Excerpt[]>()
    const add = (pid: string, title: string, text: string, score: number) => {
      const arr = chunks.get(pid) ?? []
      arr.push({ policy_id: pid, title, text, score })
      chunks.set(pid, arr)
    }
    for (const m of await queryVectors(namespace, emb, WIDE_K)) {
      const pid = String(m.metadata.policy_id ?? '')
      if (!pid) continue
      add(pid, nameById.get(pid) ?? policyTitle(m.metadata.source_filename), String(m.metadata.chunk_text ?? ''), m.score ?? 0)
    }
    // Targeted pull for any curated candidate the wide pass missed, so its content is seen.
    await Promise.all(candidates.filter(c => !chunks.has(c.id)).map(async c => {
      for (const m of await queryVectors(namespace, emb, CHUNKS_PER_DOC, { policy_id: c.id })) {
        add(c.id, nameById.get(c.id) ?? policyTitle(m.metadata.source_filename), String(m.metadata.chunk_text ?? ''), m.score ?? 0)
      }
    }))

    const bestScore = (pid: string) => Math.max(0, ...(chunks.get(pid) ?? []).map(c => c.score))
    const shortlist = [...chunks.keys()]
      // Forms, specimen letters, exam papers and charts live in the same library but can
      // never BE the subject of a regulation. Offering one as evidence is how an answer
      // sheet came to be named as coverage.
      .filter(pid => isPolicyDocument(nameById.get(pid) ?? ''))
      .filter(pid => candidateIds.has(pid) || bestScore(pid) >= RELEVANCE_FLOOR)
      .sort((a, b) => (Number(candidateIds.has(b)) - Number(candidateIds.has(a))) || (bestScore(b) - bestScore(a)))
      .slice(0, MAX_SHORTLIST)

    if (!shortlist.length) return noPolicy('No policy in the library is about this.')

    // 2. QUESTION 1 — subject. Per document: title, opening, best-matching passages.
    const documents = await Promise.all(shortlist.map(async (pid, i) => {
      const full = await loadText(pid)
      const passages = (chunks.get(pid) ?? [])
        .sort((a, b) => b.score - a.score).slice(0, CHUNKS_PER_DOC)
        .map(c => c.text.slice(0, 1600)).join('\n...\n')
      return [
        `[${i + 1}] TITLE: ${nameById.get(pid) ?? ''}`,
        `OPENING: ${(full ?? '').slice(0, 1500).replace(/\s+/g, ' ')}`,
        `MOST RELEVANT PASSAGES: ${passages.replace(/[ \t]+/g, ' ')}`,
      ].join('\n')
    }))

    let user = fillTemplate(promptTemplate, {
      official_name:     reg.official_name,
      summary:           String(reg.summary ?? '').slice(0, 1200),
      care_home_context: String(reg.care_home_context ?? '').slice(0, 800),
      expected_titles:   (reg.expected_policy_titles ?? []).join(' / ') || '(no typical title)',
      documents:         documents.join('\n\n'),
    })
    // Inject the disambiguation boundary regardless of the (editable) template shape.
    if (reg.distinguish_from?.length) {
      user += `\n\nDO NOT COUNT these as the same subject — they are different, related regulations that must not be confused with ${reg.official_name}: ${reg.distinguish_from.join('; ')}. A document about those is "none".`
    }

    const raw = await callClaude('Respond only with valid JSON.', user, { model: HAIKU, maxTokens: 250, temperature: 0, feature: 'regulation_coverage' })
    const parsed = JSON.parse(raw.slice(raw.indexOf('{'), raw.lastIndexOf('}') + 1))
    const relevance: string = ['direct', 'section'].includes(parsed.relevance) ? parsed.relevance : 'none'
    const why = typeof parsed.why === 'string' ? parsed.why.trim() : ''

    if (relevance === 'none') return noPolicy(why || 'No policy in the library is about this.')

    const named = String(parsed.policy ?? '').trim().toLowerCase()
    const evidenceId = shortlist.find(pid => (nameById.get(pid) ?? '').trim().toLowerCase() === named) ?? shortlist[0]
    const evidenceName = nameById.get(evidenceId) ?? ''
    const base = {
      reference_key:        reg.reference_key,
      evidence_policy_id:   evidenceId,
      evidence_policy_name: evidenceName,
    }

    // 3. QUESTION 2 — completeness, against the whole policy.
    const fullText = (await loadText(evidenceId)) ?? (chunks.get(evidenceId) ?? []).map(c => c.text).join('\n')
    const findings = await assessElements(reg, evidenceName, fullText)

    if (!findings.length) {
      // No curated elements to assess, or the elements pass failed. What we can honestly say
      // is that a policy on this subject exists.
      return { ...base, status: 'covered', confidence: null, reason: (why || `${evidenceName} addresses this.`).slice(0, 300) }
    }
    const missing = findings.filter(f => !f.met)
    const confidence = Math.round(((findings.length - missing.length) / findings.length) * 100)
    if (!missing.length) {
      return { ...base, status: 'covered', confidence, reason: `${evidenceName} addresses all ${findings.length} required elements.`.slice(0, 300) }
    }
    const listed = missing.slice(0, 3).map(m => shortRequirement(m.requirement)).join('; ')
    const more = missing.length > 3 ? ` (and ${missing.length - 3} more)` : ''
    return {
      ...base, status: 'partial', confidence,
      reason: `${evidenceName} covers ${findings.length - missing.length} of ${findings.length} required elements. Still to add: ${listed}${more}`.slice(0, 300),
    }
  } catch {
    // An error is not evidence of a gap. Say so plainly, so a re-run is the obvious action
    // rather than the home believing it has no policy.
    return noPolicy('This could not be analysed. Run the analysis again to retry it.')
  }
}

// Start a fresh analysis: clear this tenant's cached coverage and the on-demand gap
// detail cache so re-opened drill-ins reflect the new run. Returns the in-scope total
// so the caller can drive a progress bar over the batches. The heavy per-regulation
// work is then done by analyseCoverageBatch, a batch at a time, so no single request is
// held open for minutes (which was timing out the gateway on large corpora).
export async function startCoverageAnalysis(tenantId: string): Promise<{ total: number }> {
  const regs = await getScopedRegulations(tenantId)
  await prisma.$transaction([
    (prisma as any).gapDetailCache.deleteMany({ where: { tenant_id: tenantId } }),
    (prisma as any).regulationCoverage.deleteMany({ where: { tenant_id: tenantId } }),
  ])
  return { total: regs.length }
}

export type CoverageProgress = { done: number; analysed: number; total: number; remaining: number }

// Read-only progress snapshot for resumable runs: how many in-scope regulations already
// have a coverage row. Counts only — never triggers any AI work. Used by
// GET /analytics/gaps/run-state so an interrupted client-driven run can offer "Resume"
// instead of a destructive fresh start.
export async function coverageRunState(tenantId: string): Promise<{ total: number; analysed: number; remaining: number }> {
  const regs = await getScopedRegulations(tenantId)
  const total = regs.length
  if (!total) return { total: 0, analysed: 0, remaining: 0 }
  const rows = await (prisma as any).regulationCoverage.findMany({
    where: { tenant_id: tenantId }, select: { reference_key: true },
  })
  const done = new Set((rows as any[]).map(r => r.reference_key))
  const analysed = regs.filter(r => done.has(r.reference_key)).length
  return { total, analysed, remaining: total - analysed }
}

// Analyse the next batch of not-yet-done in-scope regulations and upsert their coverage
// rows. Idempotent and resumable: it processes whichever in-scope regulations don't yet
// have a coverage row, so the frontend just loops until remaining === 0.
export async function analyseCoverageBatch(tenantId: string, batchSize = COVERAGE_BATCH): Promise<CoverageProgress> {
  const regs = await getScopedRegulations(tenantId)
  const total = regs.length
  if (!total) return { done: 0, analysed: 0, total: 0, remaining: 0 }

  const existing = await (prisma as any).regulationCoverage.findMany({
    where: { tenant_id: tenantId }, select: { reference_key: true },
  })
  const doneKeys = new Set((existing as any[]).map(e => e.reference_key))
  const todo = regs.filter(r => !doneKeys.has(r.reference_key)).slice(0, batchSize)
  if (!todo.length) return { done: 0, analysed: doneKeys.size, total, remaining: 0 }

  // The home's active policies, tokenised once for candidate matching.
  const policyRows = await (prisma as any).policy.findMany({
    where:  { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
  })
  const policies: Pol[] = (policyRows as any[]).map(p => ({ id: p.id, name: p.name, tokens: tokenSet(p.name) }))
  const nameById = new Map(policies.map(p => [p.id, p.name]))
  const namespace = getTenantNamespace(tenantId)
  const promptTemplate = await getCoveragePrompt()
  const loadText = makeTextLoader(tenantId)

  const queryTexts = todo.map(r => `${r.official_name}. ${r.summary} ${r.care_home_context}`.slice(0, 1500))
  const embeddings = await embedTexts(queryTexts)

  // Concurrency 3 (was 5): each regulation now reads whole policies, so the batch is bounded
  // by storage and model calls rather than by how many we can start at once.
  const rows = await mapLimit(todo, 3, (reg: Reg, i: number) =>
    analyseOne(reg, embeddings[i], policies, nameById, namespace, promptTemplate, loadText))

  const now = new Date()
  await Promise.all(rows.map(r =>
    (prisma as any).regulationCoverage.upsert({
      where:  { tenant_id_reference_key: { tenant_id: tenantId, reference_key: r.reference_key } },
      create: {
        tenant_id: tenantId, reference_key: r.reference_key, status: r.status, confidence: r.confidence,
        evidence_policy_id: r.evidence_policy_id, evidence_policy_name: r.evidence_policy_name, reason: r.reason, analysed_at: now,
      },
      update: {
        status: r.status, confidence: r.confidence,
        evidence_policy_id: r.evidence_policy_id, evidence_policy_name: r.evidence_policy_name, reason: r.reason, analysed_at: now,
        saf_alignment: null, saf_analysed_at: null,   // coverage changed → invalidate cached SAF wording alignment
      },
    })))

  const analysed = doneKeys.size + rows.length
  return { done: rows.length, analysed, total, remaining: Math.max(0, total - analysed) }
}

// Full synchronous run — kept for internal callers/back-compat. Clears, then loops the
// batches to completion, and returns every coverage row. Prefer the start + batch flow
// from the frontend so no single request runs for minutes.
export async function analyseRegulationCoverage(tenantId: string): Promise<CoverageRow[]> {
  await startCoverageAnalysis(tenantId)
  for (let guard = 0; guard < 200; guard++) {
    const p = await analyseCoverageBatch(tenantId)
    if (p.remaining <= 0) break
  }
  const rows = await (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId } })
  return (rows as any[]).map(r => ({
    reference_key: r.reference_key, status: r.status, confidence: r.confidence,
    evidence_policy_id: r.evidence_policy_id, evidence_policy_name: r.evidence_policy_name, reason: r.reason,
  }))
}
