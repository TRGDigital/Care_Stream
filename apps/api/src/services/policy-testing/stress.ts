// Policy testing: a policy is tested against a real-world situation (a scenario). The scenario carries the points a good response must contain, each tied to the
// regulation or guidance it rests on. The AI only judges whether the POLICY TEXT says each point. It never invents what a good response is.
//
//   legislation (external_regulations)  ->  expected points (policy_scenarios)  ->  judge prompt (editable)  ->  policy text  ->  outcome (policy_stress_results)

import { createHash } from 'crypto'
import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { textWindows, inBatches } from '../analytics/in-batches'
import { mapLimit } from '../../lib/translate'
import { isPolicyDocument } from '../../lib/document-kind'

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
- "points": the things a good policy tells staff to do in that situation. Every point MUST be taken from, or directly supported by, the authoritative requirements or required elements you were given. Never add a requirement that those texts do not support. If the record gives too little to support a point, leave it out. Prefer 5 to 9 points, each one action or fact a policy must state. For each point give "text" (what the policy must say) and "from" (the wording of the requirement or required element it comes from, copied exactly from the record).

Return ONLY valid JSON, no code fences:
{ "scenarios": [ { "title": "", "description": "", "points": [ { "text": "", "from": "" } ] } ] }
British English. No dashes used as punctuation. Do not write clinical advice.`

/** The policy types a scenario can be for, and how a home's policy is matched to one: by its AI classified type or by its name. Grouped for the pickers. Keys never change once a scenario uses them. */
export type PolicyTypeDef = { key: string; label: string; group: string; match: RegExp }
const G = { safe: 'Safeguarding and rights', clin: 'Clinical and personal care', hs: 'Health, safety and premises', gov: 'Governance and records', work: 'Workforce', home: 'Home care and community', child: "Children's homes" } as const
const T = (group: string, key: string, label: string, match: RegExp): PolicyTypeDef => ({ group, key, label, match })
export const POLICY_TYPES: PolicyTypeDef[] = [
  // Safeguarding and rights
  T(G.safe, 'safeguarding', 'Safeguarding adults', /safeguard|abuse|adult protection/i),
  T(G.safe, 'capacity', 'Mental capacity, consent and DoLS', /mental capacity|\bmca\b|dols|deprivation of liberty|best interest|consent/i),
  T(G.safe, 'restraint', 'Restrictive practice and restraint', /restrain|restrictive practice|least restrictive|physical intervention/i),
  T(G.safe, 'pbs', 'Positive behaviour support', /positive behaviour|behaviours? that challenge/i),
  T(G.safe, 'whistleblowing', 'Whistleblowing and freedom to speak up', /whistle|speak up/i),
  T(G.safe, 'candour', 'Duty of candour', /candour/i),
  T(G.safe, 'dignity', 'Dignity, respect and person centred care', /dignity|person.?centred|respect/i),
  T(G.safe, 'equality', 'Equality, diversity and human rights', /equality|diversity|human rights|reasonable adjustment/i),
  T(G.safe, 'advocacy', 'Independent advocacy', /advocacy/i),
  T(G.safe, 'relationships', 'Relationships, sexuality and sexual safety', /relationship|sexual|intimacy/i),
  T(G.safe, 'hate_crime', 'Hate crime, mate crime and cuckooing', /hate crime|mate crime|cuckoo/i),
  T(G.safe, 'modern_slavery', 'Modern slavery and human trafficking', /modern slavery|trafficking/i),
  T(G.safe, 'prevent', 'Prevent and counter terrorism', /prevent\b|counter.?terror/i),
  T(G.safe, 'mha', 'Mental Health Act', /mental health act/i),
  T(G.safe, 'self_harm', 'Self harm, suicide and ligature risk', /self.?harm|suicide|ligature/i),
  // Clinical and personal care
  T(G.clin, 'falls', 'Falls', /\bfall(s|ing)?\b/i),
  T(G.clin, 'medication', 'Medication and medicines', /medic|drug|prescri|stomp|psychotropic/i),
  T(G.clin, 'controlled_drugs', 'Controlled drugs', /controlled drug/i),
  T(G.clin, 'pressure_ulcer', 'Pressure ulcers and skin integrity', /pressure ulcer|pressure sore|skin integrity/i),
  T(G.clin, 'wound', 'Wound care and tissue viability', /wound|tissue viability/i),
  T(G.clin, 'nutrition', 'Nutrition and hydration', /nutrition|hydration|malnutrition|weight/i),
  T(G.clin, 'dysphagia', 'Dysphagia, choking and modified diet', /dysphagia|chok|modified diet|swallow/i),
  T(G.clin, 'continence', 'Continence and catheter care', /continence|catheter/i),
  T(G.clin, 'diabetes', 'Diabetes care', /diabet|hypoglyc/i),
  T(G.clin, 'epilepsy', 'Epilepsy and seizures', /epilep|seizure/i),
  T(G.clin, 'enteral', 'Enteral feeding (PEG and NG)', /enteral|\bpeg\b|\bng\b|tube feed/i),
  T(G.clin, 'end_of_life', 'End of life and palliative care', /end of life|palliative|dying|last days|bereave|care after death/i),
  T(G.clin, 'resuscitation', 'Resuscitation and DNACPR', /resuscitat|dnacpr|respect\b/i),
  T(G.clin, 'deteriorating', 'Deteriorating resident and acute illness', /deteriorat|acute illness|sepsis|\bnews2?\b/i),
  T(G.clin, 'dementia', 'Dementia care', /dementia/i),
  T(G.clin, 'oral_health', 'Oral health', /oral health|mouth care|dental/i),
  T(G.clin, 'oxygen', 'Oxygen and medical gases', /oxygen|medical gas|ventilation/i),
  T(G.clin, 'tracheostomy', 'Tracheostomy care', /tracheostom/i),
  T(G.clin, 'syringe_driver', 'Syringe driver and anticipatory medicines', /syringe driver|anticipatory/i),
  T(G.clin, 'infection', 'Infection prevention and control', /infection|ipc\b|hand hygiene|\bppe\b/i),
  T(G.clin, 'outbreak', 'Outbreak management', /outbreak/i),
  T(G.clin, 'sharps', 'Sharps, inoculation injury and clinical waste', /sharps|inoculation|clinical waste|needlestick/i),
  T(G.clin, 'bed_rails', 'Bed rails', /bed rail/i),
  T(G.clin, 'moving_handling', 'Moving and handling', /moving and handling|manual handling|hoist/i),
  T(G.clin, 'ld_autism', 'Learning disability and autism', /learning disabilit|autism|mcgowan/i),
  T(G.clin, 'reablement', 'Rehabilitation and reablement', /rehabilitation|reablement/i),
  T(G.clin, 'missing_person', 'Missing person and absconding', /missing person|absconding|missing from|absence from support/i),
  T(G.clin, 'care_planning', 'Care planning and assessment', /care plan|assessment of needs|risk assessment|positive risk/i),
  // Health, safety and premises
  T(G.hs, 'fire', 'Fire safety', /\bfire\b/i),
  T(G.hs, 'evacuation', 'Evacuation', /evacuat/i),
  T(G.hs, 'health_safety', 'Health and safety', /health and safety|health & safety/i),
  T(G.hs, 'first_aid', 'First aid', /first aid/i),
  T(G.hs, 'coshh', 'COSHH', /coshh|hazardous substance/i),
  T(G.hs, 'legionella', 'Water safety and Legionella', /legionella|water safety|hot water/i),
  T(G.hs, 'gas_electrical', 'Gas and electrical safety', /gas safety|electrical|\bpat\b/i),
  T(G.hs, 'asbestos', 'Asbestos management', /asbestos/i),
  T(G.hs, 'equipment', 'Equipment and lifting (LOLER)', /equipment|loler|lifting/i),
  T(G.hs, 'premises', 'Premises and maintenance', /premises|maintenance|environment/i),
  T(G.hs, 'risk_management', 'Risk management', /risk management/i),
  T(G.hs, 'lone_working', 'Lone working', /lone working/i),
  T(G.hs, 'business_continuity', 'Business continuity', /business continuity|contingency|emergency plan/i),
  T(G.hs, 'smoking', 'Smoking, vaping and oxygen safety', /smoking|vaping/i),
  // Governance and records
  T(G.gov, 'complaints', 'Complaints', /complaint/i),
  T(G.gov, 'incidents', 'Incident and accident reporting', /incident|accident/i),
  T(G.gov, 'notifications', 'CQC notifications', /notification/i),
  T(G.gov, 'governance', 'Governance, quality assurance and audit', /governance|quality assurance|audit|clinical governance/i),
  T(G.gov, 'data_protection', 'Data protection and GDPR', /data protection|gdpr|information governance|caldicott|information sharing/i),
  T(G.gov, 'confidentiality', 'Confidentiality', /confidential/i),
  T(G.gov, 'records', 'Records management', /records? management|record keeping|case records/i),
  T(G.gov, 'social_media', 'Social media, phones and photography', /social media|mobile phone|photograph|cctv|surveillance/i),
  T(G.gov, 'fit_proper', 'Fit and proper persons', /fit and proper/i),
  T(G.gov, 'money_property', "Handling people's money and property", /money|valuables|property|belongings/i),
  T(G.gov, 'communication', 'Communication and accessible information', /communication|accessible information/i),
  T(G.gov, 'admissions', 'Admissions, transfer and discharge', /admission|discharge|transfer|pre.?admission/i),
  // Workforce
  T(G.work, 'recruitment', 'Safer recruitment and DBS', /recruit|dbs|safer recruitment/i),
  T(G.work, 'agency', 'Agency, bank and temporary staff', /agency|bank staff|temporary staff/i),
  T(G.work, 'supervision', 'Supervision and appraisal', /supervision|appraisal/i),
  T(G.work, 'training', 'Training and development', /training|induction|competenc/i),
  T(G.work, 'disciplinary', 'Disciplinary and grievance', /disciplinary|grievance/i),
  T(G.work, 'sickness', 'Sickness, absence and return to work', /sickness|absence|return to work/i),
  T(G.work, 'working_time', 'Working time', /working time/i),
  T(G.work, 'volunteers', 'Volunteers', /volunteer/i),
  T(G.work, 'conduct', 'Professional standards and conduct', /professional standards|conduct|bribery|gifts/i),
  T(G.work, 'staffing', 'Staffing and rota', /staffing|\brota\b/i),
  T(G.work, 'handover', 'Shift handover and clinical communication', /handover/i),
  T(G.work, 'driving', 'Driving and travel for work', /driving|vehicle|travel for work/i),
  // Home care and community
  T(G.home, 'missed_visits', 'Missed and late visits', /missed|late visit/i),
  T(G.home, 'no_access', 'No access and concern for welfare', /no access|concern for welfare/i),
  T(G.home, 'call_monitoring', 'Electronic call monitoring', /call monitoring|visit records/i),
  T(G.home, 'live_in', 'Live in care', /live.?in/i),
  T(G.home, 'key_safe', 'Key safe and access to the home', /key safe|access to the home|keys/i),
  T(G.home, 'respite', 'Respite and short break care', /respite|short break/i),
  T(G.home, 'shared_lives', 'Shared Lives', /shared lives/i),
  T(G.home, 'home_environment', 'Home environment risk assessment', /home environment/i),
  // Children's homes
  T(G.child, 'child_safeguarding', 'Safeguarding children and child protection', /safeguarding children|child protection|children and young people/i),
  T(G.child, 'child_exploitation', 'Child sexual and criminal exploitation', /child sexual|criminal exploitation|county lines|exploitation/i),
  T(G.child, 'child_behaviour', "Behaviour management and restraint (children's homes)", /behaviour management|children'?s homes/i),
  T(G.child, 'child_missing', "Missing from care (children's homes)", /missing from care/i),
  T(G.child, 'child_reg44', 'Regulation 44 visits and Regulation 45 review', /regulation 44|regulation 45|independent person/i),
]
export const policyTypeLabel = (k: string) => POLICY_TYPES.find(t => t.key === k)?.label ?? k

/** Does this policy (by name and its AI classified type) belong to the scenario's policy type? */
export function policyMatchesType(policy: { name?: string | null; policy_type?: string | null }, typeKey: string): boolean {
  const t = POLICY_TYPES.find(x => x.key === typeKey)
  if (!t) return false
  return t.match.test(`${policy.name ?? ''} ${policy.policy_type ?? ''}`)
}

/** One thing a good policy tells staff to do. It rests on a regulation record (regulation_key, in /platform/regulations) and, where known, the required element of that record it comes from (source_text). */
export type ExpectedPoint = { id: string; text: string; source_label: string; source_url: string; regulation_key?: string; source_text?: string }
export type Verdict = 'covered' | 'partly' | 'missing'
export type ElsewhereHit = { policy_id: string; policy_name: string; verdict: 'covered' | 'partly'; quote: string }
export type PointResult = { id: string; text: string; verdict: Verdict; quote: string; quote_checked: boolean; note: string; suggested_wording: string; source_label: string; source_url: string; elsewhere?: ElsewhereHit[] }

/** What a scenario needs before it can reach a home: three or more points, each with a source, a description, and a policy type. */
export function approvalProblems(s: { description: string; policy_types: string[]; expected_points: ExpectedPoint[] }): string[] {
  const out: string[] = []
  if (s.description.trim().length < 20) out.push('Add a description of the situation.')
  if (!s.policy_types.length) out.push('Choose a policy type.')
  if (s.expected_points.length < 3) out.push('Add at least three expected points.')
  if (s.expected_points.some(p => !p.source_label || !p.regulation_key)) out.push('Every expected point needs the regulation it comes from, chosen from the Regulations list.')
  return out
}


const wordsOf = (t: string) => new Set(norm(t).split(/[^a-z0-9']+/).filter(w => w.length > 3))
/** The required element of a regulation record that a point most closely matches (by shared words), or '' when none is close. Used when the drafter did not say which wording a point came from. */
export function bestElement(text: string, elements: string[]): string {
  const a = wordsOf(text); let best = '', score = 0
  for (const e of elements) {
    const b = wordsOf(e); if (!a.size || !b.size) continue
    let inter = 0; for (const w of a) if (b.has(w)) inter++
    const j = inter / (a.size + b.size - inter)
    if (j > score) { score = j; best = e }
  }
  return score >= 0.15 ? best : ''
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

// How a policy is read. The same way the gap analysis reads a policy for regulation coverage: the WHOLE policy, in overlapping parts when it is long (never cut off), the expected points in
// batches of POINTS_PER_CALL, a point counts as met if ANY part meets it, and a failed call means no verdict at all (never a verdict from half a policy or half a checklist).
const POLICY_PART_CHARS = 60_000
const POINTS_PER_CALL = 12
const RANK: Record<Verdict, number> = { missing: 0, partly: 1, covered: 2 }

/** The better of two readings of the same point (a later part of the policy may meet a point an earlier part did not). */
export const betterReading = (a: PointResult, b: PointResult): PointResult => (RANK[b.verdict] > RANK[a.verdict] ? b : a)

/** Points not covered anywhere in the library: not covered in this policy, and no other policy covers them either. "Partly" elsewhere does not close a gap. */
export const libraryGaps = (points: PointResult[]): number => points.filter(p => p.verdict !== 'covered' && !(p.elsewhere ?? []).some(e => e.verdict === 'covered')).length

type Scenario = { title: string; description: string; expected_points: ExpectedPoint[]; extra_instructions?: string }

async function judgeBatch(sys: string, policyName: string, partText: string, partNo: number, partsTotal: number, scenario: Scenario, points: ExpectedPoint[], other: boolean): Promise<{ points: PointResult[]; summary: string } | null> {
  const user = [
    `POLICY: ${policyName}`,
    other ? 'This is ANOTHER policy of the same service. Judge only whether THIS policy says each point; the situation below was written for a different policy.' : '',
    partsTotal > 1 ? `This is part ${partNo} of ${partsTotal} of a long policy. A point that is not in this part is "missing" for this part only; the other parts are read separately.` : '',
    '',
    `SITUATION: ${scenario.title}`,
    scenario.description,
    '',
    'EXPECTED POINTS:',
    ...points.map(p => `${p.id}. ${p.text}  (source: ${p.source_label})`),
    '',
    'POLICY TEXT:',
    partText,
  ].filter(l => l !== '').join('\n')
  try {
    const raw = await callClaude(sys, user, { maxTokens: 4000, temperature: 0.1, feature: 'policy_stress_test' })
    return parseJudge(raw, points, partText)
  } catch (e: any) {
    console.error('[policy-testing] judge failed:', e?.message ?? e)
    return null
  }
}

/** Read one whole policy against a list of points. Null when any call fails. */
export async function readPolicy(sys: string, policyName: string, policyText: string, scenario: Scenario, points: ExpectedPoint[], other = false): Promise<{ points: PointResult[]; summary: string | null } | null> {
  const windows = textWindows(policyText, POLICY_PART_CHARS)
  const best = new Map<string, PointResult>()
  let summary: string | null = null
  for (let w = 0; w < windows.length; w++) {
    let failed = false
    await inBatches(points, POINTS_PER_CALL, async chunk => {
      if (failed) return []
      const r = await judgeBatch(sys, policyName, windows[w], w + 1, windows.length, scenario, chunk, other)
      if (!r) { failed = true; return [] }
      for (const pt of r.points) { const cur = best.get(pt.id); best.set(pt.id, cur ? betterReading(cur, pt) : pt) }
      if (windows.length === 1 && points.length <= POINTS_PER_CALL) summary = r.summary
      return []
    })
    if (failed) return null
  }
  return { points: points.map(p => best.get(p.id)!).filter(Boolean), summary }
}

async function judgePrompt(scenario: Scenario): Promise<string> {
  const base = await promptFor(STRESS_JUDGE_USAGE, DEFAULT_STRESS_JUDGE_PROMPT)
  return scenario.extra_instructions?.trim() ? `${base}\n\nEXTRA INSTRUCTIONS FOR THIS SCENARIO\n${scenario.extra_instructions.trim()}` : base
}

/** Which OTHER policies in the library say the points this policy does not. Candidates come from a search of the whole library for each point; each candidate is then read in full, the same way. */
export async function findElsewhere(input: { tenantId: string; primaryPolicyId: string; sys: string; scenario: Scenario; points: ExpectedPoint[] }): Promise<{ checked: boolean; byPoint: Map<string, ElsewhereHit[]> }> {
  const byPoint = new Map<string, ElsewhereHit[]>()
  if (!input.points.length) return { checked: true, byPoint }
  try {
    // Loaded here so the pure parts of this file (the reading rules, the types, the matching) can be tested without the search and storage services starting up.
    const [{ embedTexts }, { queryVectors, getTenantNamespace }, { downloadExtractedText }] = await Promise.all([import('../rag/embedder'), import('../vector/pinecone'), import('../storage/s3')])
    const rows = await (prisma as any).policy.findMany({ where: { tenant_id: input.tenantId, status: 'active' }, select: { id: true, name: true } })
    const nameById = new Map<string, string>((rows as any[]).filter(r => r.id !== input.primaryPolicyId && isPolicyDocument(r.name ?? '')).map(r => [r.id, r.name as string]))
    if (!nameById.size) return { checked: true, byPoint }
    const namespace = getTenantNamespace(input.tenantId)
    const embeddings = await embedTexts(input.points.map(p => `${input.scenario.title}. ${p.text}`.slice(0, 1500)))
    const weight = new Map<string, number>()
    for (const emb of embeddings) for (const m of await queryVectors(namespace, emb, 12)) {
      const pid = String((m.metadata as any)?.policy_id ?? '')
      if (nameById.has(pid)) weight.set(pid, (weight.get(pid) ?? 0) + (m.score ?? 0))
    }
    const candidates = [...weight.entries()].sort((a, b) => b[1] - a[1]).slice(0, 6).map(([id]) => id)
    let failures = 0
    await mapLimit(candidates, 3, async (pid: string) => {
      const text = await downloadExtractedText(input.tenantId, pid).catch(() => null)
      if (!text || text.trim().length < 200) return
      const r = await readPolicy(input.sys, nameById.get(pid)!, text, input.scenario, input.points, true)
      if (!r) { failures++; return }
      for (const pt of r.points) {
        if (pt.verdict === 'missing' || !pt.quote_checked || !pt.quote) continue
        const list = byPoint.get(pt.id) ?? []
        list.push({ policy_id: pid, policy_name: nameById.get(pid)!, verdict: pt.verdict as 'covered' | 'partly', quote: pt.quote })
        byPoint.set(pt.id, list)
      }
    })
    for (const list of byPoint.values()) list.sort((a, b) => RANK[b.verdict] - RANK[a.verdict])
    return { checked: failures === 0, byPoint }
  } catch (e: any) {
    console.error('[policy-testing] other policies check failed:', e?.message ?? e)
    return { checked: false, byPoint }
  }
}

/** Test one policy against one scenario: read the whole policy, then look for what it lacks in the rest of the library. Returns null when the policy could not be read in full. */
export async function runStressTest(input: { tenantId: string; policyId: string; policyName: string; policyText: string; scenario: Scenario }): Promise<{ points: PointResult[]; summary: string; gaps: number; prompt_hash: string } | null> {
  const sys = await judgePrompt(input.scenario)
  const primary = await readPolicy(sys, input.policyName, input.policyText, input.scenario, input.scenario.expected_points)
  if (!primary) return null
  const notHere = primary.points.filter(p => p.verdict !== 'covered')
  const other = await findElsewhere({ tenantId: input.tenantId, primaryPolicyId: input.policyId, sys, scenario: input.scenario, points: input.scenario.expected_points.filter(ep => notHere.some(p => p.id === ep.id)) })
  const points = primary.points.map(p => ({ ...p, ...(other.byPoint.get(p.id)?.length ? { elsewhere: other.byPoint.get(p.id) } : {}) }))
  const gaps = libraryGaps(points)
  const n = points.length, covered = points.filter(p => p.verdict === 'covered').length
  const closed = notHere.filter(p => (other.byPoint.get(p.id) ?? []).some(e => e.verdict === 'covered')).length
  const summary = [
    primary.summary,
    `In this policy, ${covered} of ${n} points are covered.`,
    notHere.length ? `${closed} of the ${notHere.length} that are not covered here ${closed === 1 ? 'is' : 'are'} covered in other policies in your library, and ${gaps} ${gaps === 1 ? 'is' : 'are'} not covered anywhere.` : '',
    other.checked ? '' : 'Some other policies could not be checked this time.',
  ].filter(Boolean).join(' ')
  return { points, summary, gaps, prompt_hash: promptHash(sys) }
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
    // Points may come back as plain text (an older saved prompt) or as { text, from }. Each is tied to the wording of the regulation record it rests on: the drafter's own "from" if it is really in the record, otherwise the closest required element.
    const elements: string[] = (Array.isArray(reg.required_elements) ? reg.required_elements : []).map((x: any) => String(x))
    const pts = (Array.isArray(sc?.points) ? sc.points : []).map((x: any) => (typeof x === 'string' ? { text: x.trim(), from: '' } : { text: String(x?.text ?? '').trim(), from: String(x?.from ?? '').trim() })).filter((p: any) => p.text.length > 8).slice(0, 12)
    const title = String(sc?.title ?? '').trim().slice(0, 160)
    if (!title || pts.length < 3) continue
    const row = await (prisma as any).policyScenario.create({
      data: {
        title, description: String(sc?.description ?? '').trim().slice(0, 1200), policy_types: [input.policyType], regulation_keys: [input.regulationKey],
        expected_points: pts.map((p: any, i: number) => ({
          id: `p${i + 1}`, text: p.text, source_label: reg.official_name, source_url: sourceUrl, regulation_key: input.regulationKey,
          source_text: (p.from && norm(requirements).includes(norm(p.from)) ? p.from : bestElement(p.text, elements)).slice(0, 500),
        })),
        status: 'draft',
      },
    })
    created.push({ id: row.id, title })
  }
  return created.length ? { created } : { created: [], error: 'The drafter did not return a usable scenario. Please try again.' }
}
