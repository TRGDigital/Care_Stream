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

// ── Global key-terminology glossary ──────────────────────────────────────────
// A curated guardrail (editable in the platform console) so the suggestion engine
// never drops or genericises important care-sector terms (e.g. "lasting power of
// attorney") when drafting or combining wording. One shared list, injected into the
// suggestion + amendment prompts.
type GlossaryTerm = { term: string; note: string }

async function getGlossary(): Promise<GlossaryTerm[]> {
  try {
    const rows = await (prisma as any).glossaryTerm.findMany({ orderBy: { term: 'asc' } })
    return (rows as any[]).map(r => ({ term: String(r.term), note: String(r.note ?? '') }))
  } catch {
    return []
  }
}

function glossaryBlock(glossary: GlossaryTerm[]): string {
  if (!glossary.length) return ''
  const lines = glossary.map(g => `- ${g.term}${g.note ? `: ${g.note}` : ''}`).join('\n')
  return `\n\nKEY TERMINOLOGY. Retain any of these that already appear in the existing wording, use the correct form when it is relevant to the requirement, and NEVER genericise, abbreviate away, or drop them:\n${lines}`
}

// ── Policy voice ──────────────────────────────────────────────────────────────
// Suggestions go straight into the home's own policy, so they must read like a policy,
// not a regulation. We mirror the target policy's own voice where we can, and fall back
// to a declarative default. A regulation says "the provider must ensure"; a policy says
// "we will" / "the service will" / "staff will".
const VOICE_RULES = `WRITE IN POLICY VOICE, NOT REGULATION VOICE. This wording goes straight into the home's own policy, so it must read like the rest of it:
- Use declarative statements. Prefer "will" (for example "we will", "the service will", "staff will"). Do NOT use "must", "shall", "should", "is required to", "needs to", "the provider must ensure" or "it is a requirement that" unless the policy sample below already uses that style.
- Use the same subject and person the policy uses (for example "we" and "our", "the service" or "the home", "staff", "the registered manager"). Do not write "the provider" or "the registered person".
- Match the policy's tense (present versus future).`

// A few representative sentences from the target policy, to show the model its subject,
// tense and modality so it can mirror them.
function buildVoiceSample(text: string | null): string {
  if (!text) return ''
  const sentences = text.replace(/\s+/g, ' ').split(/(?<=[.!?])\s+/).map(s => s.trim())
  const picked: string[] = []
  for (const s of sentences) {
    if (s.length < 30 || s.length > 240) continue
    if (/\b(will|must|shall|we|our|staff|the (service|home|manager|registered))\b/i.test(s)) {
      picked.push(s)
      if (picked.length >= 4) break
    }
  }
  return picked.join(' ')
}

function voiceBlock(sample: string): string {
  const base = `\n\n${VOICE_RULES}`
  return sample
    ? `${base}\n\nMATCH THE VOICE OF THIS POLICY (mirror its subject, tense and modality; if it says "will", keep "will"):\n"""${sample}"""`
    : `${base}\nNo policy sample is available, so default to declarative policy voice ("we will", "the service will", "staff will").`
}

export type Placement = 'amend' | 'add_under_heading' | 'new_section'

export type GapRequirement = {
  requirement:         string
  status:              'missing' | 'already_covered'
  already_covered_in?: string | null
  suggested_addition?: string | null
  // For a MISSING requirement: where in the target policy to add or amend it.
  location_quote?:     string | null   // verbatim policy sentence/heading to add near (or null = new section)
  match_index?:        number | null    // 1-based, in DOCUMENT order (top to bottom); links to the highlight
  placement?:          Placement | null // amend a sentence, add under a heading, or a brand-new section
}

export type GapDetail = {
  reference_key:     string
  official_name:     string
  original_status:   'partial' | 'gap'
  effective_status:  'partial' | 'gap' | 'covered'
  authority_basis:   'statutory' | 'advisory'   // legally required vs advised good practice
  source_urls:       string[]
  evidence_policy:   { id: string; name: string } | null
  target_policy:     { id: string; name: string } | null   // where to add the missing text (existing policy)
  suggested_new_policy_title: string | null                // when there's no existing policy to add to
  highlight_quotes:  string[]                               // policy passages to highlight = where to add/amend (document order)
  highlight_placements: Placement[]                          // aligned to highlight_quotes: 'amend' | 'add_under_heading'
  highlight_labels:  string[]                                // aligned to highlight_quotes: short requirement label for the inline marker
  requirements:      GapRequirement[]
  disclaimer:        string
  generated_at:      string
}

// Lightweight title matcher (self-contained) for "which policy to add this to".
const STOPW = new Set(['policy','policies','procedure','the','of','in','and','for','a','an','our','care','home','homes','staff'])
function titleTokens(s: string): Set<string> {
  const out = new Set<string>()
  for (const t of (s || '').toLowerCase().replace(/[^a-z0-9]+/g, ' ').split(' ')) {
    if (!t) continue
    if (/^\d+$/.test(t)) { out.add(t); continue }
    if (t.length >= 3 && !STOPW.has(t)) out.add(t)
  }
  return out
}
// Generic policy-title words that must not, on their own, match one policy to another.
const WEAK_MATCH = new Set(['planning', 'plan', 'management', 'manage', 'procedure', 'process', 'general', 'records', 'record', 'information', 'guidance', 'framework', 'working', 'work', 'service', 'services', 'quality', 'assessment'])


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
async function identify(reg: any, evidenceText: string | null): Promise<{ requirements: { requirement: string; in_policy: boolean }[] }> {
  const curated: string[] = Array.isArray(reg.required_elements) ? reg.required_elements.filter(Boolean).slice(0, MAX_REQUIREMENTS) : []

  // ── Partial: check the evidence policy against the requirement checklist. ──
  if (evidenceText) {
    const checklistBlock = curated.length
      ? `Assess THIS policy against each of the required elements below. Do not add or invent requirements beyond this list.\nREQUIRED ELEMENTS:\n${curated.map((e, i) => `${i + 1}. ${e}`).join('\n')}`
      : reg.authoritative_requirements
        ? `Break the AUTHORITATIVE REQUIREMENTS below into up to ${MAX_REQUIREMENTS} concrete, distinct requirements and assess THIS policy against each. Do not add requirements beyond them.\nAUTHORITATIVE REQUIREMENTS:\n${reg.authoritative_requirements}`
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

For each requirement, decide whether THIS policy text substantively addresses it (in_policy true/false).

Respond with ONLY minified JSON${curated.length ? ' — keep the requirement text identical to the list above and in the same order' : ''}:
{"requirements":[{"requirement":"<requirement>","in_policy":true|false}]}`
    const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 1400 })
    const p = parseJson(text)
    const requirements = Array.isArray(p.requirements)
      ? p.requirements.slice(0, MAX_REQUIREMENTS).map((r: any) => ({ requirement: String(r.requirement ?? ''), in_policy: !!r.in_policy })).filter((r: any) => r.requirement)
      : []
    return { requirements }
  }

  // ── Full gap: no evidence policy. Use the curated checklist verbatim if present. ──
  if (curated.length) {
    return { requirements: curated.map(e => ({ requirement: e, in_policy: false })) }
  }
  const groundBlock = reg.authoritative_requirements
    ? `AUTHORITATIVE REQUIREMENTS:\n${reg.authoritative_requirements}`
    : `WHAT IT REQUIRES: ${reg.summary}\nIN A CARE HOME: ${reg.care_home_context}\nPRACTICAL MEANING: ${reg.practical_meaning}`
  const user = `REGULATION: ${reg.official_name}
${groundBlock}

The home has no policy that addresses this regulation. List up to ${MAX_REQUIREMENTS} concrete, distinct requirements a compliant care-home policy must contain. Base these ONLY on the ${reg.authoritative_requirements ? 'authoritative requirements' : 'regulation description'} above — do not rely on outside knowledge.

Respond with ONLY minified JSON:
{"requirements":[{"requirement":"<one specific requirement>"}]}`
  const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 1200 })
  const p = parseJson(text)
  return {
    requirements: Array.isArray(p.requirements) ? p.requirements.slice(0, MAX_REQUIREMENTS).map((r: any) => ({ requirement: String(r.requirement ?? ''), in_policy: false })).filter((r: any) => r.requirement) : [],
  }
}

// For each requirement being ADDED, find where in the target policy to add or amend
// it — a verbatim sentence/heading that's the best insertion/amendment point, or '' if
// it should be a brand-new section. Returned aligned to the input order.
type LocationHit = { quote: string; is_heading: boolean }

async function findLocations(policyText: string, missing: string[]): Promise<LocationHit[]> {
  const empty = (): LocationHit[] => missing.map(() => ({ quote: '', is_heading: false }))
  if (!missing.length || !policyText) return empty()
  const user = `Here is a UK care-home policy:
"""
${policyText.slice(0, POLICY_TEXT_CAP)}
"""

The following requirements are being ADDED to this policy. For EACH, identify the single best place IN THIS POLICY to add or amend it, following these rules in order:
- If there is a specific existing SENTENCE that should be amended, or that the new wording should sit directly beside, quote that sentence verbatim (character for character) and set "is_heading": false.
- Otherwise, if the right home for it is under an existing SECTION HEADING whose content does not yet cover this requirement (so a new subsection should be added BENEATH that heading), quote the heading line verbatim and set "is_heading": true.
- If there is no sensible existing place at all and it should be a brand-new section, return an empty quote.

Important:
- Give each requirement a DISTINCT anchor. Do not send two different requirements to the same sentence or the same heading; if the only fit for a second requirement is a place already used, return an empty quote for it instead (it becomes a new section).
- Avoid vague one-word headings such as "Implementation", "Introduction", "Scope", "Purpose" or "Policy" as anchors. Prefer a specific sentence; if you must use a heading, choose the most specific relevant one.
- Always prefer a body sentence to amend over a bare heading when a genuinely relevant sentence exists.
- Never invent text. Quotes must appear verbatim in the policy above.

REQUIREMENTS:
${missing.map((r, i) => `${i + 1}. ${r}`).join('\n')}

Respond with ONLY minified JSON, an array in the same order as the requirements:
{"locations":[{"quote":"<verbatim sentence or heading, or empty>","is_heading":true|false}]}`
  try {
    const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 1800 })
    const p = parseJson(text)
    const arr = Array.isArray(p.locations) ? p.locations : []
    return missing.map((_, i) => {
      const it = arr[i]
      if (it && typeof it === 'object') return { quote: String(it.quote ?? '').trim(), is_heading: !!it.is_heading }
      if (typeof it === 'string') return { quote: it.trim(), is_heading: false }  // tolerate the old flat-string shape
      return { quote: '', is_heading: false }
    })
  } catch {
    return empty()
  }
}

// ── Step 2b: for AMEND locations, rewrite the existing sentence into one improved ──
//             passage that KEEPS everything already there and folds in the requirement.
//             This is why an amendment reads as a richer version of the home's own
//             wording rather than a generic block that silently drops their specifics.
async function refineAmendments(
  items: { requirement: string; existing: string; suggestion: string | null }[],
  glossary: GlossaryTerm[],
  voiceSample: string,
): Promise<string[]> {
  if (!items.length) return []
  const payload = items.map((it, i) =>
    `[${i + 1}]\nEXISTING POLICY WORDING: "${it.existing}"\nMUST ALSO MEET THIS REQUIREMENT: ${it.requirement}${it.suggestion ? `\nDRAFT ADDITION (reference only): ${it.suggestion}` : ''}`
  ).join('\n\n')
  const user = `You are improving specific sentences in a UK care-home policy. For EACH item, rewrite the EXISTING POLICY WORDING into a single improved passage that:
- keeps EVERY specific detail already present (named roles, legal references, Act citations, defined terms),
- folds in what is needed to meet the requirement,
- keeps the voice, subject, tense and modality of the EXISTING POLICY WORDING (if it says "will", keep "will"; do not switch it to "must"),
- reads as one coherent passage the home can use to REPLACE the existing wording.
Never lose anything from the existing wording. Never invent facts. Keep it practical and specific to a care setting.${glossaryBlock(glossary)}${voiceBlock(voiceSample)}

${payload}

Respond with ONLY minified JSON, an array in the same order:
{"rewrites":["<combined improved passage>"]}`
  try {
    const text = await callClaude('Respond only with valid JSON.', user, { model: SONNET, maxTokens: 2600 })
    const p = parseJson(text)
    const arr = Array.isArray(p.rewrites) ? p.rewrites : []
    return items.map((it, i) => (typeof arr[i] === 'string' && arr[i].trim()) ? arr[i].trim() : (it.suggestion ?? ''))
  } catch {
    return items.map(it => it.suggestion ?? '')
  }
}

// ── Step 2: verify each candidate-missing requirement against the WHOLE corpus, ──
//            and for the genuinely-absent ones, draft example wording.
async function verifyAndSuggest(
  reg: any,
  candidates: string[],
  namespace: string,
  nameById: Map<string, string>,
  glossary: GlossaryTerm[],
  voiceSample: string,
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

${payload}${glossaryBlock(glossary)}${voiceBlock(voiceSample)}

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
    select: { official_name: true, summary: true, care_home_context: true, practical_meaning: true, required_elements: true, authoritative_requirements: true, authority_basis: true, source_urls: true, expected_policy_titles: true },
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

  // 1. Identify which requirements the target policy already addresses (in_policy) vs not.
  const ident = await identify(reg, evidenceText)

  // Requirements the evidence policy already covers → already_covered (plain, no
  // highlight — the focus of the highlights is where to ADD, not what's already there).
  const inPolicy: GapRequirement[] = ident.requirements
    .filter(r => r.in_policy)
    .map(r => ({ requirement: r.requirement, status: 'already_covered' as const, already_covered_in: evidencePolicy?.name ?? null, suggested_addition: null }))
  const inPolicyCount = inPolicy.length

  // Where to add the missing text: the evidence policy for a partial; for a gap, the best
  // title match among the home's policies (else "you'll need a new policy"). Resolved FIRST
  // so we can sample the target policy's voice and draft in it, not in regulation language.
  let targetPolicy: { id: string; name: string } | null = evidencePolicy
  let suggestedNewPolicyTitle: string | null = null
  if (!targetPolicy) {
    // Match a home's policy to add to — but ONLY on a strong, distinctive overlap.
    // A single generic word shared (e.g. "planning" between "Care Planning" and
    // "Emergency Planning") must NOT count, or we point people at the wrong policy.
    const targets = [...(reg.expected_policy_titles ?? []), reg.official_name].filter(Boolean).map((t: string) => titleTokens(t))
    let best: { id: string; name: string; score: number } | null = null
    for (const p of policyRows as any[]) {
      const pt = titleTokens(p.name)
      for (const target of targets) {
        if (!target.size) continue
        const shared = [...target].filter(x => pt.has(x))
        if (!shared.length) continue
        if (shared.length === 1 && WEAK_MATCH.has(shared[0])) continue   // one generic word isn't enough
        const score = shared.length / target.size
        if (score >= 0.5 && (!best || score > best.score)) best = { id: p.id, name: p.name, score }
      }
    }
    if (best) targetPolicy = { id: best.id, name: best.name }
    else suggestedNewPolicyTitle = (reg.expected_policy_titles?.[0] as string) ?? `${reg.official_name} Policy`
  }
  const targetText = evidenceText ?? (targetPolicy ? await downloadExtractedText(tenantId, targetPolicy.id).catch(() => null) : null)
  const voiceSample = buildVoiceSample(targetText)

  // 2. Verify the rest against the whole corpus, and draft wording for the truly-missing.
  //    The key-terminology glossary keeps the correct terms; the voice sample makes drafts
  //    read like this home's own policy ("we will", not "the provider must ensure").
  const glossary = await getGlossary()
  const candidates = ident.requirements.filter(r => !r.in_policy).map(r => r.requirement)
  const verified = await verifyAndSuggest(reg, candidates, namespace, nameById, glossary, voiceSample)

  const verifiedReqs: GapRequirement[] = verified.map(v => v.already_covered
    ? { requirement: v.requirement, status: 'already_covered', already_covered_in: v.covered_in, suggested_addition: null }
    : { requirement: v.requirement, status: 'missing', already_covered_in: null, suggested_addition: v.suggested_addition })

  const requirements = [...inPolicy, ...verifiedReqs]
  const missingReqs = requirements.filter(r => r.status === 'missing')
  const missingCount = missingReqs.length

  // 3. For each MISSING requirement, find WHERE in the target policy to add/amend it.
  //    Number the highlights in DOCUMENT order (top to bottom) so the badges the reader
  //    sees down the policy run 1, 2, 3, ... rather than in requirement order. A heading
  //    anchor is flagged so the UI can show "add a subsection below this heading" instead
  //    of implying the heading title itself is the fix.
  const highlightQuotes: string[] = []
  const highlightPlacements: Placement[] = []
  const highlightLabels: string[] = []
  if (missingReqs.length && targetText) {
    const hits = await findLocations(targetText, missingReqs.map(r => r.requirement))
    const lower = targetText.toLowerCase()
    const norm = (s: string) => s.toLowerCase().replace(/\s+/g, ' ').trim()
    // Keep only anchors that are ACTUALLY present in the policy (pos >= 0), so a number
    // never points at nothing. Dedupe AMEND anchors (two rewrites of one sentence makes
    // no sense) while allowing several items under the same heading. Whatever is left
    // over becomes a proper "new section" instead of a phantom highlight.
    const seenAmend = new Set<string>()
    const located = missingReqs
      .map((r, i) => ({ r, hit: hits[i] }))
      .filter(x => x.hit && x.hit.quote)
      .map(x => ({ r: x.r, hit: x.hit, pos: lower.indexOf(x.hit.quote.toLowerCase()) }))
      .filter(x => x.pos >= 0)
      .filter(x => {
        if (x.hit.is_heading) return true
        const k = norm(x.hit.quote)
        if (seenAmend.has(k)) return false
        seenAmend.add(k)
        return true
      })
      .sort((a, b) => a.pos - b.pos)
    // Assign sequential numbers in document order and build the aligned highlight arrays.
    located.forEach((x, k) => {
      const placement: Placement = x.hit.is_heading ? 'add_under_heading' : 'amend'
      x.r.match_index    = k + 1
      x.r.location_quote = x.hit.quote
      x.r.placement      = placement
      highlightQuotes.push(x.hit.quote)
      highlightPlacements.push(placement)
      highlightLabels.push(x.r.requirement.slice(0, 90))
    })
    // Anything without a kept anchor is a brand-new section. Number these too, CONTINUING
    // the sequence after the located items, and emit an aligned (empty-quote) entry so the
    // UI can show them a destination (a callout at the end of the policy) instead of
    // leaving them off the numbered plan entirely.
    const newReqs = missingReqs.filter(r => r.match_index == null)
    newReqs.forEach((r, j) => {
      r.match_index    = located.length + j + 1
      r.location_quote = null
      r.placement      = 'new_section'
      highlightQuotes.push('')
      highlightPlacements.push('new_section')
      highlightLabels.push(r.requirement.slice(0, 90))
    })

    // Combine-and-expand: rewrite each AMEND target from its existing wording so nothing
    // already in the policy is lost and the missing requirement is folded in, guarded by
    // the key-terminology glossary. Heading/new-section items keep their fresh wording.
    const amendReqs = located.filter(x => x.r.placement === 'amend').map(x => x.r)
    if (amendReqs.length) {
      const rewrites = await refineAmendments(
        amendReqs.map(r => ({ requirement: r.requirement, existing: r.location_quote as string, suggestion: r.suggested_addition ?? null })),
        glossary,
        voiceSample,
      )
      amendReqs.forEach((r, i) => { if (rewrites[i]) r.suggested_addition = rewrites[i] })
    }
  } else {
    // No target policy text to anchor against: everything is a numbered new section.
    missingReqs.forEach((r, j) => {
      r.match_index = j + 1
      r.placement   = 'new_section'
      highlightQuotes.push('')
      highlightPlacements.push('new_section')
      highlightLabels.push(r.requirement.slice(0, 90))
    })
  }

  // Verdict: nothing to add → covered across the library. A "partial" whose target
  // policy actually covers nothing is really a gap (the deep read has the final say).
  let effectiveStatus: GapDetail['effective_status'] = missingCount === 0 ? 'covered' : originalStatus
  if (effectiveStatus === 'partial' && inPolicyCount === 0) effectiveStatus = 'gap'
  if (effectiveStatus !== cov?.status) {
    const data: any = { status: effectiveStatus }
    if (effectiveStatus === 'covered') {
      data.evidence_policy_name = requirements.find(r => r.already_covered_in)?.already_covered_in ?? evidencePolicy?.name ?? undefined
      data.reason = 'Verified as covered across your policy library.'
    } else if (effectiveStatus === 'gap') {
      data.evidence_policy_id = null; data.evidence_policy_name = null
      data.reason = 'On a full read, this policy does not substantively cover the regulation.'
    }
    await (prisma as any).regulationCoverage.update({
      where: { tenant_id_reference_key: { tenant_id: tenantId, reference_key: referenceKey } }, data,
    }).catch(() => {})
  }

  const detail: GapDetail = {
    reference_key:    referenceKey,
    official_name:    reg.official_name,
    original_status:  originalStatus,
    effective_status: effectiveStatus,
    authority_basis:  reg.authority_basis === 'advisory' ? 'advisory' : 'statutory',
    source_urls:      (reg.source_urls ?? []).filter(Boolean),
    evidence_policy:  evidencePolicy,
    target_policy:    targetPolicy,
    suggested_new_policy_title: suggestedNewPolicyTitle,
    highlight_quotes: highlightQuotes,
    highlight_placements: highlightPlacements,
    highlight_labels: highlightLabels,
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
