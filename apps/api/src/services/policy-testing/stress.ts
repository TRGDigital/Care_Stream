// Policy testing: a policy is tested against a real-world situation (a scenario). The scenario carries the points a good response must contain, each tied to the
// regulation or guidance it rests on. The AI only judges whether the POLICY TEXT says each point. It never invents what a good response is.
//
//   legislation (external_regulations)  ->  expected points (policy_scenarios)  ->  judge prompt (editable)  ->  policy text  ->  outcome (policy_stress_results)

import { createHash } from 'crypto'
import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'

export const STRESS_JUDGE_USAGE = 'policy_stress_judge'
export const SCENARIO_DRAFTER_USAGE = 'policy_scenario_drafter'

export const DEFAULT_STRESS_JUDGE_PROMPT = `You test one written policy of a UK care service against one real-world situation.

You are given the policy text, a short description of the situation, and a numbered list of EXPECTED POINTS: things a good policy tells staff to do in that situation. Each point comes from a regulation or guidance document.

For EVERY expected point decide whether the POLICY TEXT says it:
- "covered"  the policy says it clearly enough that a member of staff could act on it
- "partly"   the policy touches on it but is vague, incomplete or leaves out who, when or how
- "missing"  the policy does not say it

Rules:
- Judge only what the policy text says. Never judge the quality of anyone's care. Never say a service is unsafe or not compliant.
- For "covered" and "partly", "quote" must be the policy's own words, copied exactly (up to 300 characters). For "missing", leave "quote" empty.
- "note" is one plain sentence saying what is covered or what is absent. Name the specific duty, person, step or timescale.
- For "partly" and "missing", "suggested_wording" is a sentence or two in the style of a policy, ready to review. Use role names, never personal names. Do not invent timescales, telephone numbers, thresholds or duties that are not in the expected point. British English. No dashes used as punctuation.
- If the policy is silent because it is not the right policy for this situation, say so in "summary".

Return ONLY valid JSON, no code fences, in exactly this shape:
{
  "points": [ { "id": "p1", "verdict": "covered" | "partly" | "missing", "quote": "", "note": "", "suggested_wording": "" } ],
  "summary": "Two sentences at most: how well the policy responds to this situation and the most important gap."
}
Include every expected point exactly once, using its id.`

export const DEFAULT_SCENARIO_DRAFTER_PROMPT = `You draft test situations for UK care policies, from a regulation or standard.

You are given one regulation record (its name, whether it is statutory or advisory, its authoritative requirements, its required elements and its source addresses) and a policy type.

Propose scenarios: ordinary, realistic care moments where the regulation bites and a policy of that type must tell staff what to do. For each scenario give:
- "title": short, plain (for example "A resident is found on the floor overnight")
- "description": three to five sentences describing the moment. No names. No clinical detail beyond what is needed.
- "points": the things a good policy tells staff to do in that situation. Every point MUST be taken from, or directly supported by, the authoritative requirements or required elements you were given. Never add a requirement that those texts do not support. If the record gives too little to support a point, leave it out. Prefer 5 to 9 points, each one action or fact a policy must state.

Return ONLY valid JSON, no code fences:
{ "scenarios": [ { "title": "", "description": "", "points": ["", ""] } ] }
British English. No dashes used as punctuation. Do not write clinical advice.`

/** The policy types a scenario can be for, and how a home's policy is matched to one: by its AI classified type or by its name. Extend as scenarios are added. */
export const POLICY_TYPES: Array<{ key: string; label: string; match: RegExp }> = [
  { key: 'falls',          label: 'Falls',               match: /\bfall(s|ing)?\b/i },
  { key: 'medication',     label: 'Medication',          match: /medic|drug|prescri|controlled drug/i },
  { key: 'safeguarding',   label: 'Safeguarding',        match: /safeguard|abuse|adult protection|child protection/i },
  { key: 'infection',      label: 'Infection control',   match: /infection|outbreak|ipc\b/i },
  { key: 'fire',           label: 'Fire safety',         match: /\bfire\b|evacuat/i },
  { key: 'capacity',       label: 'Mental capacity',     match: /mental capacity|\bmca\b|dols|deprivation of liberty|best interest/i },
  { key: 'complaints',     label: 'Complaints',          match: /complaint|concerns? and/i },
  { key: 'recruitment',    label: 'Recruitment',         match: /recruit|dbs|safer recruitment/i },
]
export const policyTypeLabel = (k: string) => POLICY_TYPES.find(t => t.key === k)?.label ?? k

/** Does this policy (by name and its AI classified type) belong to the scenario's policy type? */
export function policyMatchesType(policy: { name?: string | null; policy_type?: string | null }, typeKey: string): boolean {
  const t = POLICY_TYPES.find(x => x.key === typeKey)
  if (!t) return false
  return t.match.test(`${policy.name ?? ''} ${policy.policy_type ?? ''}`)
}

export type ExpectedPoint = { id: string; text: string; source_label: string; source_url: string }
export type Verdict = 'covered' | 'partly' | 'missing'
export type PointResult = { id: string; text: string; verdict: Verdict; quote: string; quote_checked: boolean; note: string; suggested_wording: string; source_label: string; source_url: string }

/** What a scenario needs before it can reach a home: three or more points, each with a source, a description, and a policy type. */
export function approvalProblems(s: { description: string; policy_types: string[]; expected_points: ExpectedPoint[] }): string[] {
  const out: string[] = []
  if (s.description.trim().length < 20) out.push('Add a description of the situation.')
  if (!s.policy_types.length) out.push('Choose a policy type.')
  if (s.expected_points.length < 3) out.push('Add at least three expected points.')
  if (s.expected_points.some(p => !p.source_label)) out.push('Every expected point needs the regulation or guidance it comes from.')
  return out
}


async function promptFor(usage: string, fallback: string): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
    const stored = typeof row?.content === 'string' ? row.content.trim() : ''
    if (stored) return stored
  } catch { /* fall through */ }
  return fallback
}
export const promptHash = (p: string) => createHash('sha256').update(p).digest('hex').slice(0, 12)

const norm = (s: string) => s.toLowerCase().replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/\s+/g, ' ').trim()
/** A quote only counts if it really appears in the policy. */
export const quoteInText = (quote: string, text: string): boolean => !!quote && norm(text).includes(norm(quote))

/** Read the judge's answer. Every expected point must appear once; a quote that is not in the policy is dropped and the verdict is never "covered" without one. */
export function parseJudge(raw: string, points: ExpectedPoint[], policyText: string): { points: PointResult[]; summary: string } | null {
  let j: any
  try { j = JSON.parse(raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()) } catch { return null }
  if (!Array.isArray(j?.points)) return null
  const byId = new Map<string, any>(j.points.map((p: any) => [String(p?.id), p]))
  const out: PointResult[] = []
  for (const ep of points) {
    const p = byId.get(ep.id)
    if (!p) return null
    let verdict: Verdict = ['covered', 'partly', 'missing'].includes(p.verdict) ? p.verdict : 'missing'
    const quote = String(p.quote ?? '').slice(0, 400)
    const checked = verdict === 'missing' ? true : quoteInText(quote, policyText)
    if (verdict !== 'missing' && !checked) verdict = verdict === 'covered' ? 'partly' : verdict   // no verifiable words, so never "covered"
    out.push({
      id: ep.id, text: ep.text, verdict, quote: verdict === 'missing' || !checked ? '' : quote, quote_checked: checked,
      note: String(p.note ?? '').slice(0, 400), suggested_wording: verdict === 'covered' ? '' : String(p.suggested_wording ?? '').slice(0, 700),
      source_label: ep.source_label, source_url: ep.source_url,
    })
  }
  return { points: out, summary: String(j.summary ?? '').slice(0, 500) }
}

export const gapsIn = (points: Array<{ verdict: string }>) => points.filter(p => p.verdict !== 'covered').length

/** Test one policy against one scenario. Returns null when the model fails. */
export async function judgeScenario(input: {
  policyName: string; policyText: string
  scenario: { title: string; description: string; expected_points: ExpectedPoint[]; extra_instructions?: string }
}): Promise<{ points: PointResult[]; summary: string; prompt_hash: string } | null> {
  const base = await promptFor(STRESS_JUDGE_USAGE, DEFAULT_STRESS_JUDGE_PROMPT)
  const sys = input.scenario.extra_instructions?.trim() ? `${base}\n\nEXTRA INSTRUCTIONS FOR THIS SCENARIO\n${input.scenario.extra_instructions.trim()}` : base
  const text = input.policyText.slice(0, 80_000)
  const user = [
    `POLICY: ${input.policyName}`,
    '',
    `SITUATION: ${input.scenario.title}`,
    input.scenario.description,
    '',
    'EXPECTED POINTS:',
    ...input.scenario.expected_points.map(p => `${p.id}. ${p.text}  (source: ${p.source_label})`),
    '',
    'POLICY TEXT:',
    text,
  ].join('\n')
  try {
    const raw = await callClaude(sys, user, { maxTokens: 4000, temperature: 0.1, feature: 'policy_stress_test' })
    const parsed = parseJudge(raw, input.scenario.expected_points, text)
    return parsed ? { ...parsed, prompt_hash: promptHash(sys) } : null
  } catch (e: any) {
    console.error('[policy-testing] judge failed:', e?.message ?? e)
    return null
  }
}

/** Draft scenarios for one regulation. Each point is taken from the regulation record, and carries its name and first source address. Always saved as drafts. */
export async function draftScenarios(input: { regulationKey: string; policyType: string; count?: number }): Promise<{ created: Array<{ id: string; title: string }>; error?: string }> {
  const reg = await (prisma as any).externalRegulation.findUnique({ where: { reference_key: input.regulationKey } }).catch(() => null)
  if (!reg) return { created: [], error: 'That regulation was not found.' }
  const requirements = [String(reg.authoritative_requirements ?? '').trim(), ...(Array.isArray(reg.required_elements) ? reg.required_elements : [])].filter(Boolean).join('\n')
  if (requirements.length < 40) return { created: [], error: 'This regulation has no authoritative requirements or required elements recorded yet, so nothing can be drafted from it. Add them in Regulations first.' }
  const sys = await promptFor(SCENARIO_DRAFTER_USAGE, DEFAULT_SCENARIO_DRAFTER_PROMPT)
  const user = [
    `REGULATION: ${reg.official_name} (${reg.authority_basis === 'advisory' ? 'advisory good practice' : 'statutory'})`,
    `POLICY TYPE: ${policyTypeLabel(input.policyType)}`,
    `HOW MANY SCENARIOS: ${Math.min(Math.max(input.count ?? 2, 1), 3)}`,
    '',
    'AUTHORITATIVE REQUIREMENTS AND REQUIRED ELEMENTS:',
    requirements.slice(0, 12_000),
    '',
    `SOURCES: ${(reg.source_urls ?? []).join(', ') || 'none recorded'}`,
  ].join('\n')
  let j: any
  try {
    const raw = await callClaude(sys, user, { maxTokens: 3500, temperature: 0.3, feature: 'policy_scenario_drafter' })
    j = JSON.parse(raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim())
  } catch { return { created: [], error: 'The drafter could not produce scenarios this time. Please try again.' } }
  const list = Array.isArray(j?.scenarios) ? j.scenarios.slice(0, 3) : []
  const sourceUrl = (reg.source_urls ?? [])[0] ?? ''
  const created: Array<{ id: string; title: string }> = []
  for (const sc of list) {
    const pts: string[] = (Array.isArray(sc?.points) ? sc.points : []).map((x: any) => String(x ?? '').trim()).filter((x: string) => x.length > 8).slice(0, 12)
    const title = String(sc?.title ?? '').trim().slice(0, 160)
    if (!title || pts.length < 3) continue
    const row = await (prisma as any).policyScenario.create({
      data: {
        title, description: String(sc?.description ?? '').trim().slice(0, 1200), policy_types: [input.policyType], regulation_keys: [input.regulationKey],
        expected_points: pts.map((text, i) => ({ id: `p${i + 1}`, text, source_label: reg.official_name, source_url: sourceUrl })),
        status: 'draft',
      },
    })
    created.push({ id: row.id, title })
  }
  return created.length ? { created } : { created: [], error: 'The drafter did not return a usable scenario. Please try again.' }
}
