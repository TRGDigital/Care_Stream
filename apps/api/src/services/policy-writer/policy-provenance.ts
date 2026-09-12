// Why a paid policy says what it says, and what it might still be missing.
//
// Two different jobs live here, and keeping them apart is the whole point.
//
// PROVENANCE is recorded fact. The regulations this policy was written against, their
// required elements, the CQC quality statements that sit on those regulations, and the
// verdict the coverage judge reached. Nothing here is generated at read time: it is the
// actual input to writePolicy and the actual output of verifyPaidPolicyDraft. A panel
// built only from this can be trusted, because it is reporting rather than reasoning.
//
// CHALLENGE is a second opinion, and it exists because provenance alone would be
// reassuring in exactly the wrong way. The coverage judge can only check the policy
// against the regulations the catalogue mapped to it. If that mapping is short, the
// policy passes with a gap nobody sees, and a provenance panel would faithfully report
// the short mapping as though it were the requirement. That is not a hypothetical: every
// product in the catalogue carried an empty mapping, and every policy sold "passed".
//
// So the challenge is asked the question cold. It is given the policy title and nothing
// else -- not the mapping, not the draft, not the regulations already chosen -- and asked
// what a policy on that subject must address. Its answer is then diffed against what was
// actually used. A model shown the existing mapping would ratify it; the value is entirely
// in withholding it.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'

const MODEL_SONNET = 'claude-sonnet-4-5-20250929'

export type ProvenanceElement = { text: string; met: boolean | null }

export type ProvenanceRegulation = {
  reference_key: string
  official_name: string
  authority_basis: string
  summary: string
  care_home_context: string
  practical_meaning: string
  source_urls: string[]
  required_elements: ProvenanceElement[]
  last_reviewed_at: string | null
  needs_update: boolean
}

export type ProvenanceQualityStatement = {
  reference_key: string
  key_question: string
  number: number
  name: string
  we_statement: string
  source_urls: string[]
  via: string[]            // which mapped regulations pull this statement in
}

export type PolicyProvenance = {
  purchase_id: string
  policy_title: string
  product_slug: string | null
  drafted_at: string | null
  drafted_by: string | null
  verified_at: string | null
  grounded: boolean        // false when nothing was mapped: the panel must say so loudly
  regulations: ProvenanceRegulation[]
  quality_statements: ProvenanceQualityStatement[]
  element_totals: { total: number; met: number; missing: number; unjudged: number }
}

/** Everything that actually went into this policy, as recorded. No model is called. */
export async function buildPolicyProvenance(purchaseId: string): Promise<PolicyProvenance> {
  const purchase = await (prisma as any).policyPurchase.findUnique({ where: { id: purchaseId } })
  if (!purchase) throw new Error('That order was not found')

  const keys: string[] = purchase.reference_keys ?? []
  const regs = keys.length
    ? await (prisma as any).externalRegulation.findMany({
        where: { reference_key: { in: keys } },
        select: {
          reference_key: true, official_name: true, authority_basis: true, summary: true,
          care_home_context: true, practical_meaning: true, source_urls: true,
          required_elements: true, last_reviewed_at: true, needs_update: true,
        },
      })
    : []

  // The judge records what it found MISSING. Everything else it was asked about was met,
  // so the met set is derivable rather than needing its own store. Where no judgement has
  // run the element is unjudged, which is not the same as met and must not look like it.
  const verdicts = new Map<string, Set<string>>()
  const judgedKeys = new Set<string>()
  for (const r of (purchase.verification?.checks?.coverage?.regulations ?? []) as any[]) {
    judgedKeys.add(String(r.reference_key))
    verdicts.set(String(r.reference_key), new Set((r.missing_elements ?? []).map(String)))
  }

  const totals = { total: 0, met: 0, missing: 0, unjudged: 0 }
  const regulations: ProvenanceRegulation[] = (regs as any[]).map(r => {
    const missing = verdicts.get(r.reference_key)
    const judged = judgedKeys.has(r.reference_key)
    const required_elements: ProvenanceElement[] = (r.required_elements ?? []).map((t: string) => {
      const met = judged ? !missing?.has(t) : null
      totals.total++
      if (met === true) totals.met++
      else if (met === false) totals.missing++
      else totals.unjudged++
      return { text: t, met }
    })
    return {
      reference_key: r.reference_key,
      official_name: r.official_name,
      authority_basis: r.authority_basis ?? 'statutory',
      summary: r.summary ?? '',
      care_home_context: r.care_home_context ?? '',
      practical_meaning: r.practical_meaning ?? '',
      source_urls: r.source_urls ?? [],
      required_elements,
      last_reviewed_at: r.last_reviewed_at ? new Date(r.last_reviewed_at).toISOString() : null,
      needs_update: r.needs_update === true,
    }
  })

  // CQC comes through the regulations, not through the policy title. quality_statements
  // carries an expected_policies list, but it is written in short informal names
  // ("Dignity & Respect") against our formal product titles, and matching on it reaches
  // one product in sixty-five. linked_regulations is a key join and is exact.
  const statements = keys.length
    ? await (prisma as any).qualityStatement.findMany({
        where: { is_active: true, linked_regulations: { hasSome: keys } },
        select: {
          reference_key: true, key_question: true, number: true, name: true,
          we_statement: true, source_urls: true, linked_regulations: true,
        },
        orderBy: [{ key_question: 'asc' }, { number: 'asc' }],
      })
    : []

  const quality_statements: ProvenanceQualityStatement[] = (statements as any[]).map(q => ({
    reference_key: q.reference_key,
    key_question: q.key_question,
    number: q.number,
    name: q.name,
    we_statement: q.we_statement ?? '',
    source_urls: q.source_urls ?? [],
    via: (q.linked_regulations ?? []).filter((k: string) => keys.includes(k)),
  }))

  return {
    purchase_id: purchase.id,
    policy_title: purchase.policy_title,
    product_slug: purchase.product_slug ?? null,
    drafted_at: purchase.drafted_at ? new Date(purchase.drafted_at).toISOString() : null,
    drafted_by: purchase.drafted_by ?? null,
    verified_at: purchase.verified_at ? new Date(purchase.verified_at).toISOString() : null,
    grounded: keys.length > 0,
    regulations,
    quality_statements,
    element_totals: totals,
  }
}

// ── Challenge ────────────────────────────────────────────────────────────────

export type ChallengeStatus = 'grounded' | 'missing_from_mapping' | 'not_in_library'

export type ChallengeItem = {
  name: string
  why: string
  basis: 'statutory' | 'guidance'
  matched_key: string | null
  status: ChallengeStatus
}

export type PolicyChallenge = {
  ran_at: string
  policy_title: string
  items: ChallengeItem[]
  summary: { grounded: number; missing_from_mapping: number; not_in_library: number }
}

const CHALLENGE_PROMPT = `You advise UK adult social care providers on policy compliance.

You will be given only the TITLE of a policy that a CQC-registered care service holds.
Name the UK legislation, regulations, statutory standards and recognised national guidance
that a policy with that title must address to be compliant and to stand up to inspection.

Rules:
- Judge the subject on its own merits. Name what the policy genuinely must cover, not what
  is merely adjacent. Between eight and fifteen items is typical for a care policy.
- Give the instrument its correct formal name (e.g. "Health and Social Care Act 2008
  (Regulated Activities) Regulations 2014 Regulation 13", "Mental Capacity Act 2005").
- basis is "statutory" where the law or a mandatory standard requires it, "guidance" for
  recognised good practice such as NICE guidelines or professional codes.
- why must say, in one sentence, what this instrument actually requires of the policy.
- British English.

Reply with JSON ONLY, no code fences:
{"items":[{"name":"...","why":"...","basis":"statutory"}]}`

/** Normalised form for comparing an instrument named in prose to one in our library. */
function norm(s: string): string {
  return s.toLowerCase()
    .replace(/\(.*?\)/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\b(the|of|and|for|a|an|in|on|to)\b/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

/** Does a named instrument correspond to one of our regulations? Names, then aliases. */
function matchRegulation(
  name: string,
  library: Array<{ reference_key: string; official_name: string; also_known_as: string[] }>,
): string | null {
  const n = norm(name)
  if (!n) return null
  for (const r of library) if (norm(r.official_name) === n) return r.reference_key
  for (const r of library) {
    for (const a of r.also_known_as ?? []) if (norm(a) === n) return r.reference_key
  }
  // Containment, longest candidate first so "Regulation 13" does not win over a fuller name.
  const cands = library
    .flatMap(r => [{ k: r.reference_key, t: norm(r.official_name) },
                   ...(r.also_known_as ?? []).map(a => ({ k: r.reference_key, t: norm(a) }))])
    .filter(c => c.t.length >= 6)
    .sort((a, b) => b.t.length - a.t.length)
  for (const c of cands) if (n.includes(c.t) || c.t.includes(n)) return c.k
  return null
}

/** A cold second opinion on what this policy should cover, diffed against what was used. */
export async function runPolicyChallenge(purchaseId: string): Promise<PolicyChallenge> {
  const purchase = await (prisma as any).policyPurchase.findUnique({ where: { id: purchaseId } })
  if (!purchase) throw new Error('That order was not found')

  // Deliberately the title only. Handing over the mapping, or the draft, turns an
  // independent check into a review of our own homework.
  const raw = (await callClaude(
    CHALLENGE_PROMPT,
    `POLICY TITLE: ${purchase.policy_title}\n\nThis policy is held by a CQC-registered adult social care service in England.`,
    { model: MODEL_SONNET, maxTokens: 3000, temperature: 0, feature: 'policy_challenge' },
  )).trim()

  let parsed: any
  try {
    parsed = JSON.parse(raw.replace(/^```(?:json)?\s*|\s*```$/g, ''))
  } catch (e: any) {
    // An unreadable answer is not an all-clear, and must never be recorded as one.
    throw new Error(`The challenge did not return a readable answer (${e?.message ?? 'parse error'})`)
  }

  const library = await (prisma as any).externalRegulation.findMany({
    select: { reference_key: true, official_name: true, also_known_as: true },
  })
  const mapped = new Set<string>(purchase.reference_keys ?? [])

  const seen = new Set<string>()
  const items: ChallengeItem[] = []
  for (const it of (parsed?.items ?? []) as any[]) {
    const name = String(it?.name ?? '').trim()
    if (!name || seen.has(norm(name))) continue
    seen.add(norm(name))
    const matched_key = matchRegulation(name, library as any[])
    items.push({
      name,
      why: String(it?.why ?? '').trim(),
      basis: it?.basis === 'guidance' ? 'guidance' : 'statutory',
      matched_key,
      status: matched_key
        ? (mapped.has(matched_key) ? 'grounded' : 'missing_from_mapping')
        : 'not_in_library',
    })
  }

  const challenge: PolicyChallenge = {
    ran_at: new Date().toISOString(),
    policy_title: purchase.policy_title,
    items,
    summary: {
      grounded:             items.filter(i => i.status === 'grounded').length,
      missing_from_mapping: items.filter(i => i.status === 'missing_from_mapping').length,
      not_in_library:       items.filter(i => i.status === 'not_in_library').length,
    },
  }

  await (prisma as any).policyPurchase.update({
    where: { id: purchaseId },
    data: { challenge, challenged_at: new Date() },
  })
  return challenge
}
