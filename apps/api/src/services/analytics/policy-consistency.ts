// ─── Phase 4b: cross-policy consistency — clustering + claim extraction ──────────
//
// Foundation for detecting contradictions BETWEEN policies. Two cheap steps set up the
// (expensive) detection in 4c:
//   1. buildComparisonSets — group policies that could contradict, so we never compare all
//      O(N²) pairs. Two kinds: NEAR-DUPLICATE/DRIFT pairs (same policy that drifted apart, via
//      the content-signature sketch) and TOPIC clusters (policies about the same subject, via
//      lightweight title+section embeddings — crosses sections).
//   2. extractPolicyClaims — one cheap Haiku pass per policy pulls the specific, checkable
//      claims (timeframes, roles, locations, definitions, escalation, thresholds), cached and
//      re-run only when the policy text changes. Only policies that appear in a comparison set
//      are extracted, so the AI cost is bounded to what can actually conflict.

import { createHash } from 'crypto'
import { prisma } from '../../db/client'
import { downloadExtractedText } from '../storage/s3'
import { callClaude } from '../ai/claude'
import { checkAiCreditLimit, logAiCredit } from '../../lib/plan-limits'
import { embedTexts } from '../rag/embedder'
import { contentSimilarity, asSignature } from '../../lib/content-similarity'
import { mapLimit } from '../../lib/translate'
import { isPolicyDocument } from '../../lib/document-kind'

const HAIKU = 'claude-haiku-4-5-20251001'

// Similar enough to be "the same policy" (so a drift is worth checking), but the exact-duplicate
// detector flags at 0.85 — drifted copies sit below that, which is exactly what we want.
const DRIFT_MIN = 0.4
// Title+section topic relatedness (cosine) for grouping policies on the same subject.
const TOPIC_MIN = 0.72
const MAX_CLUSTER = 14        // clusters larger than this are too broad to compare usefully

export type ClaimKind = 'timeframe' | 'role' | 'location' | 'frequency' | 'threshold' | 'escalation' | 'definition' | 'other'
export interface PolicyClaim { topic: string; statement: string; quote: string; kind: ClaimKind }

export interface ComparisonSet {
  id:        string
  type:      'duplicate' | 'topic'
  label:     string
  policies:  Array<{ id: string; name: string }>
}

type PolicyRow = { id: string; name: string; section: string | null; content_signature: unknown }

// ── Clustering ───────────────────────────────────────────────────────────────────

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  return na && nb ? dot / (Math.sqrt(na) * Math.sqrt(nb)) : 0
}

// Union-find components over a set of edges.
function components(ids: string[], edges: Array<[string, string]>): string[][] {
  const parent = new Map(ids.map(id => [id, id]))
  const find = (x: string): string => { while (parent.get(x) !== x) { parent.set(x, parent.get(parent.get(x)!)!); x = parent.get(x)! } return x }
  const union = (a: string, b: string) => { parent.set(find(a), find(b)) }
  for (const [a, b] of edges) if (parent.has(a) && parent.has(b)) union(a, b)
  const groups = new Map<string, string[]>()
  for (const id of ids) { const r = find(id); if (!groups.has(r)) groups.set(r, []); groups.get(r)!.push(id) }
  return [...groups.values()]
}

export async function buildComparisonSets(tenantId: string): Promise<ComparisonSet[]> {
  const policies = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true, section: true, content_signature: true },
  }) as PolicyRow[]
  if (policies.length < 2) return []
  const nameById = new Map(policies.map(p => [p.id, p.name]))

  // 1. Near-duplicate / drift pairs from the content-signature sketch (no S3, no AI).
  const sigs = policies.map(p => ({ id: p.id, sig: asSignature(p.content_signature) })).filter(x => x.sig)
  const dupEdges: Array<[string, string]> = []
  for (let i = 0; i < sigs.length; i++) {
    for (let j = i + 1; j < sigs.length; j++) {
      if (contentSimilarity(sigs[i].sig, sigs[j].sig) >= DRIFT_MIN) dupEdges.push([sigs[i].id, sigs[j].id])
    }
  }
  const dupGroups = components(sigs.map(s => s.id), dupEdges).filter(g => g.length >= 2 && g.length <= MAX_CLUSTER)
  const dupMembers = new Set(dupGroups.flat())

  // 2. Topic clusters from lightweight title+section embeddings (crosses sections).
  const embInput = policies.map(p => `${p.name}. ${p.section ?? ''}`.trim())
  let topicGroups: string[][] = []
  try {
    const embs = await embedTexts(embInput)
    const topicEdges: Array<[string, string]> = []
    for (let i = 0; i < policies.length; i++) {
      for (let j = i + 1; j < policies.length; j++) {
        if (cosine(embs[i], embs[j]) >= TOPIC_MIN) topicEdges.push([policies[i].id, policies[j].id])
      }
    }
    topicGroups = components(policies.map(p => p.id), topicEdges)
      .filter(g => g.length >= 2 && g.length <= MAX_CLUSTER)
      // A pure near-duplicate group is already covered as a 'duplicate' set — only keep topic
      // groups that add policies beyond the duplicate members.
      .filter(g => g.some(id => !dupMembers.has(id)))
  } catch (e: any) {
    console.error('[consistency] topic embedding failed:', e?.message)
  }

  const stem = (names: string[]) => {
    const words = names.map(n => n.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(Boolean))
    const common = words.reduce((acc, ws) => acc.filter(w => ws.includes(w)), words[0] ?? [])
    return common.filter(w => w.length >= 4 && !['policy','care','home','homes'].includes(w)).slice(0, 4).join(' ')
  }

  const sets: ComparisonSet[] = []
  dupGroups.forEach((g, i) => {
    const names = g.map(id => nameById.get(id) ?? '')
    sets.push({ id: `dup-${i}`, type: 'duplicate', label: stem(names) || 'Near-duplicate policies', policies: g.map(id => ({ id, name: nameById.get(id) ?? '' })) })
  })
  topicGroups.forEach((g, i) => {
    const secs = policies.filter(p => g.includes(p.id)).map(p => p.section).filter(Boolean)
    const label = stem(g.map(id => nameById.get(id) ?? '')) || (secs[0] as string) || 'Related policies'
    sets.push({ id: `topic-${i}`, type: 'topic', label, policies: g.map(id => ({ id, name: nameById.get(id) ?? '' })) })
  })
  return sets
}

// ── Claim extraction ───────────────────────────────────────────────────────────

const EXTRACT_SYSTEM =
  'You extract specific, checkable factual claims from a UK care-home policy so they can be compared against OTHER policies for contradictions. Only extract concrete, verifiable statements that could conflict with another policy — never general aims, principles or boilerplate.'

function extractPrompt(name: string, text: string): string {
  return [
    `Policy: ${name}`,
    '',
    'From the policy text below, list every specific, checkable claim of these kinds:',
    '- timeframe: a deadline or timeframe (e.g. "report within 24 hours", "reviewed annually")',
    '- role: who is responsible for a specific duty (e.g. "the Registered Manager informs the HSE")',
    '- location: where something is kept or done (e.g. "full sharps boxes stored in the nurses’ clinic")',
    '- frequency: how often something happens',
    '- threshold: a numeric threshold or limit',
    '- escalation: who to report/notify/refer to (and any order)',
    '- definition: a defined term and its definition',
    '',
    'For each claim return: topic (a SHORT canonical phrase describing what the claim is about, worded so the SAME topic in another policy would match — e.g. "storing full sharps boxes awaiting collection"), statement (the claim, a few words), quote (a short VERBATIM excerpt copied exactly from the policy), kind (one of the above).',
    'If a value is an unfilled template placeholder (e.g. [designated storage location]), still include it and note in statement that it is unfilled.',
    'Do NOT extract the policy’s own review date, review cycle/frequency, version date or version number — that is tracked separately and is never a cross-policy conflict.',
    'Ignore general aims, principles and boilerplate. Return at most 25 of the most comparison-worthy claims.',
    '',
    'Return ONLY JSON: {"claims":[{"topic":"...","statement":"...","quote":"...","kind":"..."}]}',
    '',
    'POLICY TEXT:',
    text.slice(0, 24000),
  ].join('\n')
}

const KINDS = new Set<ClaimKind>(['timeframe', 'role', 'location', 'frequency', 'threshold', 'escalation', 'definition', 'other'])

// A POLICY's own review date / review cycle / version date is per-policy metadata (CareStream
// tracks it separately), so it's never a genuine cross-policy conflict — exclude it.
const REVIEW_META = /\bre(view|newal)\s*(date|cycle|frequenc|schedule|interval|period|due)\b|\bnext (review|renewal)\b|\bpolicy renewal\b|\bre(view|new)ed\s+(annually|every|monthly|yearly|biennially|each)\b|\bdate of (issue|review|renewal|next)\b|\bversion\s+(date|number|control)\b/i
const isReviewMetaClaim = (c: { topic: string; statement: string }) => REVIEW_META.test(`${c.topic} ${c.statement}`)

// The model is asked for verbatim quotes but sometimes paraphrases. Ground a quote to a REAL
// sentence from the policy (highest word overlap) so it can be highlighted and replaced exactly.
const normQ = (s: string) => (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()
function groundQuote(quote: string, text: string): string {
  const q = normQ(quote)
  if (q.length < 8) return quote
  if (normQ(text).includes(q)) return quote   // already verbatim (modulo whitespace/quotes)
  const qWords = new Set(q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4))
  if (qWords.size < 2) return quote
  let best = quote, bestScore = 0
  for (const s of text.split(/(?<=[.!?])\s+|\n+/)) {
    const st = s.trim()
    if (st.length < 20) continue
    const sw = new Set(normQ(st).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4))
    let hits = 0
    for (const w of qWords) if (sw.has(w)) hits++
    const score = hits / qWords.size
    if (score > bestScore) { bestScore = score; best = st }
  }
  return bestScore >= 0.6 ? best.slice(0, 300) : quote
}

// Extract (and cache) the claims for one policy. ALWAYS writes a cache row — even when there is
// no usable text or the AI call fails — so the policy leaves the pending queue and the scan
// terminates (otherwise a policy that can't be read would be retried forever). Credit limiting is
// enforced at the batch route, so a hit limit stops the run cleanly instead of looping.
export async function extractPolicyClaims(tenantId: string, policy: { id: string; name: string }): Promise<PolicyClaim[]> {
  const writeRow = (content_hash: string, claims: PolicyClaim[]) =>
    (prisma as any).policyClaim.upsert({
      where:  { tenant_id_policy_id: { tenant_id: tenantId, policy_id: policy.id } },
      update: { policy_name: policy.name, content_hash, claims, extracted_at: new Date() },
      create: { tenant_id: tenantId, policy_id: policy.id, policy_name: policy.name, content_hash, claims },
    }).catch(() => {})

  const text = await downloadExtractedText(tenantId, policy.id).catch(() => null)
  if (!text || text.trim().length < 200) { await writeRow('no-text', []); return [] }
  const hash = createHash('sha256').update(text).digest('hex')

  const cached = await (prisma as any).policyClaim.findUnique({ where: { tenant_id_policy_id: { tenant_id: tenantId, policy_id: policy.id } } }).catch(() => null)
  if (cached && cached.content_hash === hash) return (cached.claims as PolicyClaim[]) ?? []

  let claims: PolicyClaim[] = []
  try {
    const out = await callClaude(EXTRACT_SYSTEM, extractPrompt(policy.name, text), { model: HAIKU, maxTokens: 2000, temperature: 0, feature: 'policy_consistency' })
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    claims = (Array.isArray(parsed.claims) ? parsed.claims : [])
      .map((c: any) => ({ topic: String(c.topic ?? '').trim(), statement: String(c.statement ?? '').trim(), quote: groundQuote(String(c.quote ?? '').trim(), text), kind: (KINDS.has(c.kind) ? c.kind : 'other') as ClaimKind }))
      .filter((c: PolicyClaim) => c.topic && c.statement && !isReviewMetaClaim(c))
      .slice(0, 25)
  } catch (e: any) {
    console.error('[consistency] claim extraction failed', policy.id, e?.message)
    await writeRow(hash, [])   // mark attempted so the run terminates; a later re-scan can retry
    return []
  }

  await writeRow(hash, claims)
  await logAiCredit(tenantId, 'policy_claims', policy.id)
  return claims
}

// Build the comparison sets and cache them for the tenant (so batches don't recompute).
export async function buildAndCacheSets(tenantId: string): Promise<ComparisonSet[]> {
  const sets = await buildComparisonSets(tenantId)
  await (prisma as any).policyConsistency.upsert({
    where:  { tenant_id: tenantId },
    update: { sets, built_at: new Date() },
    create: { tenant_id: tenantId, sets, built_at: new Date() },
  }).catch(() => {})
  return sets
}

export async function getCachedSets(tenantId: string): Promise<ComparisonSet[]> {
  const row = await (prisma as any).policyConsistency.findUnique({ where: { tenant_id: tenantId }, select: { sets: true } }).catch(() => null)
  return (row?.sets as ComparisonSet[]) ?? []
}

// Every active POLICY document is a claim source, not only those in a title-based comparison
// set. Contradictions do not respect policy titles: the subject access deadline in the GDPR
// employee-data policy contradicts the one in the Privacy Policy, and no title cluster ever
// put those two together. Forms, specimen letters, exam papers and charts are excluded — a
// blank form's "value" is a field to be filled in, not a commitment that can contradict.
export async function claimSourcePolicies(tenantId: string): Promise<Array<{ id: string; name: string }>> {
  const rows = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true },
  })
  return (rows as any[]).filter(p => isPolicyDocument(p.name ?? '')).map(p => ({ id: p.id, name: p.name as string }))
}

// Which policies still need claim extraction? Batched so the route can run it with progress
// rather than holding one long request open.
export async function pendingClaimPolicies(tenantId: string): Promise<Array<{ id: string; name: string }>> {
  const sources = await claimSourcePolicies(tenantId)
  if (!sources.length) return []
  const cached = await (prisma as any).policyClaim.findMany({
    where: { tenant_id: tenantId, policy_id: { in: sources.map(s => s.id) } }, select: { policy_id: true },
  })
  const have = new Set((cached as any[]).map(c => c.policy_id))
  // We can't cheaply know here whether a cached copy is stale (hash) without the text, so we treat
  // "has a row" as done for batching; extractPolicyClaims re-checks the hash and skips if unchanged.
  return sources.filter(s => !have.has(s.id))
}

export async function extractClaimsBatch(tenantId: string, batch: Array<{ id: string; name: string }>): Promise<void> {
  await mapLimit(batch, 3, (p) => extractPolicyClaims(tenantId, p).catch(() => []))
}

// Read-only progress snapshot for resumable runs: how many claim-source policies already have
// extracted claims. Counts only — no AI. Used by GET /analytics/gaps/run-state so an
// interrupted run can offer "Resume" without re-extracting cached claims.
export async function consistencyRunState(tenantId: string): Promise<{ total: number; analysed: number; remaining: number }> {
  const sources = await claimSourcePolicies(tenantId)
  const total = sources.length
  if (!total) return { total: 0, analysed: 0, remaining: 0 }
  const cached = await (prisma as any).policyClaim.findMany({
    where: { tenant_id: tenantId, policy_id: { in: sources.map(s => s.id) } }, select: { policy_id: true },
  })
  const have = new Set((cached as any[]).map((c: any) => c.policy_id))
  const analysed = sources.filter(s => have.has(s.id)).length
  return { total, analysed, remaining: total - analysed }
}

// ── Conflict detection (Phase 4c) ────────────────────────────────────────────────

export interface ConflictPosition { policy_id: string; policy_name: string; statement: string; quote: string }
export interface PolicyConflict {
  id:         string
  set_type:   'duplicate' | 'topic'
  set_label:  string
  topic:      string
  summary:    string
  severity:   'high' | 'medium' | 'low'
  resolution: string        // one reconciled wording to replace the conflicting passage in EVERY policy
  positions:  ConflictPosition[]
  // Set by the verification pass.
  kind?:        'legal' | 'organisational'  // is the correct value fixed by law, or the home's to choose?
  legal_value?: string                       // for 'legal': what the law actually requires
  why?:         string                       // why this survived verification, in one sentence
}

const DETECT_SYSTEM =
  'You compare policies from the SAME UK care service to find GENUINE contradictions — where two or more policies give DIFFERENT, INCOMPATIBLE instructions about the SAME specific point. You are strict: report only real conflicts, never a difference of wording, scope, or level of detail. A false conflict is worse than a missed one.'

const VERIFY_SYSTEM =
  'You are a strict second reviewer of a reported contradiction between policies of one UK care service. You read the FULL passages and decide whether the two policies really address the same point and really disagree. Respond only with valid JSON.'

const normName = (s: string) => (s || '').toLowerCase().replace(/\s+/g, ' ').trim()
const normText = (s: string) => (s || '').toLowerCase().replace(/[‘’]/g, "'").replace(/\s+/g, ' ').trim()

// The passage around a quote, so detection and verification read the claim IN CONTEXT rather
// than as a one-line paraphrase. Falls back to best-sentence overlap when the model's "quote"
// was not truly verbatim, and to the quote itself when the policy text is unavailable.
function passageAround(quote: string, text: string, window = 450): string {
  if (!text) return quote
  const q = normText(quote)
  let idx = q.length >= 8 ? normText(text).indexOf(q) : -1
  if (idx < 0) {
    const qWords = new Set(q.replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4))
    if (!qWords.size) return quote
    let best = -1, bestScore = 0, pos = 0
    for (const s of text.split(/(?<=[.!?])\s+|\n+/)) {
      const sw = new Set(normText(s).replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length >= 4))
      let hit = 0
      for (const w of qWords) if (sw.has(w)) hit++
      const score = hit / qWords.size
      if (score > bestScore) { bestScore = score; best = pos }
      pos += s.length + 1
    }
    if (bestScore < 0.5) return quote
    idx = best
  }
  return text.slice(Math.max(0, idx - window), Math.min(text.length, idx + q.length + window)).replace(/\s+/g, ' ')
}

// ── Claim-topic grouping ─────────────────────────────────────────────────────────
// Group every extracted claim by what it is ABOUT, across the whole library, instead of
// comparing whole policies that happen to share a title stem. Title clustering could never
// see that the subject-access deadline in one policy contradicts the one in another, because
// those two policies have nothing in common but the point in dispute.
const CLAIM_TOPIC_MIN = 0.80    // cosine on "topic: statement"
const MAX_GROUP_CLAIMS = 16     // beyond this a group is too broad to compare usefully

type IndexedClaim = PolicyClaim & { policy_id: string; policy_name: string }

async function buildClaimTopicGroups(claims: IndexedClaim[]): Promise<IndexedClaim[][]> {
  if (claims.length < 2) return []
  const vectors: number[][] = []
  for (let i = 0; i < claims.length; i += 200) {
    const slice = claims.slice(i, i + 200).map(c => `${c.topic}: ${c.statement}`.slice(0, 400))
    vectors.push(...await embedTexts(slice))
  }
  const parent = claims.map((_, i) => i)
  const find = (x: number): number => { while (parent[x] !== x) { parent[x] = parent[parent[x]]; x = parent[x] } return x }
  for (let i = 0; i < claims.length; i++) {
    for (let j = i + 1; j < claims.length; j++) {
      if (claims[i].policy_id === claims[j].policy_id) continue   // a policy cannot contradict itself
      if (find(i) === find(j)) continue
      if (cosine(vectors[i], vectors[j]) >= CLAIM_TOPIC_MIN) parent[find(i)] = find(j)
    }
  }
  const byRoot = new Map<number, number[]>()
  claims.forEach((_, i) => {
    const r = find(i)
    if (!byRoot.has(r)) byRoot.set(r, [])
    byRoot.get(r)!.push(i)
  })
  return [...byRoot.values()]
    .filter(g => new Set(g.map(i => claims[i].policy_id)).size >= 2)
    .map(g => g.slice(0, MAX_GROUP_CLAIMS).map(i => claims[i]))
}

function detectPrompt(group: IndexedClaim[], passages: string[]): string {
  const items = group.map((c, i) => [
    `[${i + 1}] POLICY: ${c.policy_name}`,
    `    CLAIM (${c.kind}): ${c.topic} — ${c.statement}`,
    `    QUOTE: "${c.quote}"`,
    `    CONTEXT: ${passages[i]}`,
  ].join('\n')).join('\n\n')
  return [
    'Below are claims on ONE topic from several policies of the SAME care home, each with the surrounding passage. Find every GENUINE contradiction.',
    '',
    'A contradiction = the SAME specific point (same duty, timeframe, location, role, definition, threshold, same situation and scope) is given DIFFERENT, incompatible values in two or more of these policies, so that staff following one would breach the other.',
    '',
    'DO NOT report:',
    '- Wording or terminology differences ("residents" vs "people receiving care").',
    '- Compatible or overlapping statements ("30 days" vs "30 calendar days"; a shorter break inside a longer allowance; "enhanced DBS" vs "enhanced DBS plus barred list"; "the home" vs "the Registered Manager").',
    '- One policy simply saying more, less, or nothing on a point (silence is not a contradiction).',
    '- Different situations (day shift vs night shift; staff vs residents; a form vs the policy it implements).',
    '- An unfilled template placeholder with no competing value.',
    'When in any doubt, DO NOT report it.',
    '',
    'For each genuine contradiction return: topic (the point in dispute), summary (one sentence), severity (high|medium|low), and items (the numbers of the claims involved, at least two from DIFFERENT policies).',
    '',
    'CLAIMS ON THIS TOPIC:',
    items,
    '',
    'Return ONLY JSON: {"conflicts":[{"topic":"...","summary":"...","severity":"...","items":[1,2]}]}',
  ].join('\n')
}

// Every candidate must survive a second reader that sees the FULL passages. This is the step
// that removes "30 days vs 30 calendar days" and "day shift vs night shift" — of the 13
// conflicts on Ferndale's screen before this change, 12 failed here.
async function verifyConflict(c: PolicyConflict, textById: Map<string, string>): Promise<PolicyConflict | null> {
  const passages = c.positions.map((p, i) =>
    `[${i + 1}] ${p.policy_name}\nCLAIM: ${p.statement}\nPASSAGE: ${passageAround(p.quote, textById.get(p.policy_id) ?? '', 700)}`).join('\n\n')
  const user = `A first reviewer reported this contradiction between policies of the same care home:
POINT: ${c.topic}
SUMMARY: ${c.summary}

The FULL passages from each policy:
${passages}

Decide strictly, reading the passages rather than the summary:
1. same_point: do these passages address the SAME specific point — same duty, same situation, same scope? Different situations (day vs night shift, staff vs residents, one form vs the policy it implements, general statement vs specific case) are NOT the same point.
2. incompatible: if same_point, are the values genuinely incompatible, so that staff following one policy would breach the other? "30 days" vs "30 calendar days", a shorter break inside a longer allowance, or one policy being merely more specific, are COMPATIBLE.
3. kind: "legal" if the correct value is fixed by UK law or statutory guidance — put it in legal_value (e.g. "one calendar month for subject access requests, UK GDPR Article 12"). Otherwise "organisational": the home must choose.
4. why: one sentence.

Return ONLY JSON: {"same_point":true|false,"incompatible":true|false,"kind":"legal|organisational","legal_value":"<or empty>","why":"<one sentence>"}`
  try {
    const out = await callClaude(VERIFY_SYSTEM, user, { maxTokens: 400, temperature: 0, feature: 'policy_consistency' })
    const p = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    if (!(p?.same_point === true && p?.incompatible === true)) return null
    return {
      ...c,
      kind: p.kind === 'legal' ? 'legal' : 'organisational',
      legal_value: String(p.legal_value ?? '').trim().slice(0, 300),
      why: String(p.why ?? '').trim().slice(0, 300),
    }
  } catch (e: any) {
    console.error('[consistency] verification failed', c.id, e?.message)
    return null   // fail CLOSED: an unverified conflict is not shown to the client
  }
}

async function detectGroupConflicts(group: IndexedClaim[], gi: number, textById: Map<string, string>): Promise<PolicyConflict[]> {
  const passages = group.map(c => passageAround(c.quote, textById.get(c.policy_id) ?? '', 350))
  let parsed: any
  try {
    const out = await callClaude(DETECT_SYSTEM, detectPrompt(group, passages), { maxTokens: 1400, temperature: 0, feature: 'policy_consistency' })
    parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
  } catch (e: any) {
    console.error('[consistency] detection failed for group', gi, e?.message)
    return []
  }
  const out: PolicyConflict[] = []
  ;(Array.isArray(parsed?.conflicts) ? parsed.conflicts : []).forEach((c: any, i: number) => {
    const idx: number[] = (Array.isArray(c?.items) ? c.items : [])
      .map((n: any) => Number(n) - 1).filter((n: number) => Number.isInteger(n) && n >= 0 && n < group.length)
    const positions: ConflictPosition[] = idx.map(n => ({
      policy_id: group[n].policy_id, policy_name: group[n].policy_name,
      statement: group[n].statement, quote: group[n].quote,
    }))
    if (new Set(positions.map(p => p.policy_id)).size < 2) return
    out.push({
      id: `topic-${gi}-${i}`, set_type: 'topic', set_label: String(c?.topic ?? '').trim() || 'Related policies',
      topic: String(c?.topic ?? '').trim() || 'Inconsistency', summary: String(c?.summary ?? '').trim(),
      severity: ['high', 'medium', 'low'].includes(c?.severity) ? c.severity : 'medium',
      resolution: '', positions,
    })
  })
  return out
}

// Detect across claim-topic groups, verify every candidate against the full passages, and
// store only what survives.
export async function runDetection(tenantId: string): Promise<{ conflicts: number; sets: number }> {
  await checkAiCreditLimit(tenantId)
  const sources = await claimSourcePolicies(tenantId)
  const nameById = new Map(sources.map(s => [s.id, s.name]))
  const rows = await (prisma as any).policyClaim.findMany({
    where: { tenant_id: tenantId, policy_id: { in: sources.map(s => s.id) } },
    select: { policy_id: true, claims: true },
  })

  const claims: IndexedClaim[] = []
  for (const r of rows as any[]) {
    for (const c of ((r.claims as PolicyClaim[]) ?? [])) {
      if (isReviewMetaClaim(c) || !c.topic || !c.statement) continue
      claims.push({ ...c, policy_id: r.policy_id, policy_name: nameById.get(r.policy_id) ?? 'a policy' })
    }
  }

  const groups = await buildClaimTopicGroups(claims)
  if (!groups.length) {
    await (prisma as any).policyConsistency.upsert({
      where:  { tenant_id: tenantId },
      update: { conflicts: [], analysed_at: new Date() },
      create: { tenant_id: tenantId, conflicts: [], analysed_at: new Date() },
    }).catch(() => {})
    return { conflicts: 0, sets: 0 }
  }

  // Policy text for the passages, fetched once per policy that appears in any group.
  const needed = [...new Set(groups.flat().map(c => c.policy_id))]
  const textById = new Map<string, string>()
  await mapLimit(needed, 6, async (pid: string) => {
    const t = await downloadExtractedText(tenantId, pid).catch(() => null)
    if (t) textById.set(pid, t)
  })

  const candidates = (await mapLimit(groups, 3, (g: IndexedClaim[], i: number) =>
    detectGroupConflicts(g, i, textById).catch(() => []))).flat()

  const verified = (await mapLimit(candidates, 3, (c: PolicyConflict) =>
    verifyConflict(c, textById).catch(() => null))).filter(Boolean) as PolicyConflict[]

  const rank = { high: 0, medium: 1, low: 2 } as const
  const conflicts = verified
    // Belt-and-braces: drop any conflict that is really about a policy's own review date/cycle
    // or version, even if a review-date claim slipped past the claim-level filter.
    .filter(c => !REVIEW_META.test(`${c.topic} ${c.summary}`))
    .sort((a, b) => rank[a.severity] - rank[b.severity])

  if (candidates.length) await logAiCredit(tenantId, 'policy_consistency', `${groups.length}-groups`)

  await (prisma as any).policyConsistency.upsert({
    where:  { tenant_id: tenantId },
    update: { conflicts, analysed_at: new Date() },
    create: { tenant_id: tenantId, conflicts, analysed_at: new Date() },
  }).catch(() => {})
  return { conflicts: conflicts.length, sets: groups.length }
}

// A stable key for a conflict (topic + the policies involved) so a dismissal survives re-runs,
// even though the volatile per-run id changes.
export function conflictKey(c: PolicyConflict): string {
  return `${normName(c.topic)}::${[...new Set(c.positions.map(p => p.policy_id))].sort().join(',')}`
}

// ── On-demand reconciliation ──────────────────────────────────────────────────────
// A conflict detected before we started producing a reconciled wording has no `resolution`.
// The drill-in fetches one here on open — generated once and cached back into the stored
// conflict, so both new and older conflicts show a single "apply to both" wording.

const RECONCILE_SYSTEM =
  'You reconcile a contradiction between policies from ONE UK care service into a single correct wording that every one of those policies should adopt, so they stop disagreeing.'

function reconcilePrompt(c: PolicyConflict): string {
  // Two different kinds of answer. Where the law fixes the value, say so and cite it. Where
  // it does not — who the Data Protection Officer is, how often appraisals happen — the home
  // must choose; a model picking one silently would put an invented decision into policies.
  const legal = c.kind === 'legal' && c.legal_value
    ? `The correct value is fixed by law or statutory guidance: ${c.legal_value}. Use that value and name the source in the wording.`
    : 'The correct value is NOT fixed by law — it is a decision for the service. Write the wording with the value the service must confirm shown in square brackets, for example [the Registered Manager] or [annually], so the manager fills it in and every policy then agrees. Do not invent or silently pick one of the existing values.'
  return [
    `Point in dispute: ${c.topic}`,
    c.summary ? `Summary: ${c.summary}` : '',
    c.why ? `Why this is a genuine conflict: ${c.why}` : '',
    '',
    'The policies currently say:',
    ...c.positions.map(p => `- ${p.policy_name}: ${p.statement}${p.quote ? ` | "${p.quote}"` : ''}`),
    '',
    legal,
    '',
    'Write ONE reconciled wording that should REPLACE the conflicting passage in EVERY one of these policies so they all agree. It must be self-contained (one or two clear sentences) and read naturally in any of them.',
    'Return ONLY JSON: {"resolution":"..."}',
  ].filter(Boolean).join('\n')
}

export async function resolveConflict(tenantId: string, key: string): Promise<{ resolution: string }> {
  const row = await (prisma as any).policyConsistency.findUnique({ where: { tenant_id: tenantId }, select: { conflicts: true } }).catch(() => null)
  const conflicts: PolicyConflict[] = Array.isArray(row?.conflicts) ? row.conflicts : []
  const idx = conflicts.findIndex(c => conflictKey(c) === key)
  if (idx < 0) return { resolution: '' }
  const c = conflicts[idx]
  if (c.resolution && c.resolution.trim()) return { resolution: c.resolution.trim() }

  await checkAiCreditLimit(tenantId)
  let resolution = ''
  try {
    const out = await callClaude(RECONCILE_SYSTEM, reconcilePrompt(c), { maxTokens: 600, temperature: 0, feature: 'policy_consistency' })
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    resolution = String(parsed?.resolution ?? '').trim()
  } catch (e: any) {
    console.error('[consistency] reconcile failed', key, e?.message)
    return { resolution: '' }
  }
  if (resolution) {
    conflicts[idx] = { ...c, resolution }
    await (prisma as any).policyConsistency.update({ where: { tenant_id: tenantId }, data: { conflicts } }).catch(() => {})
    await logAiCredit(tenantId, 'policy_consistency', key)
  }
  return { resolution }
}

export async function dismissConflict(tenantId: string, key: string): Promise<void> {
  const row = await (prisma as any).policyConsistency.findUnique({ where: { tenant_id: tenantId }, select: { dismissed: true } }).catch(() => null)
  const dismissed = new Set<string>(Array.isArray(row?.dismissed) ? row.dismissed : [])
  dismissed.add(key)
  await (prisma as any).policyConsistency.update({ where: { tenant_id: tenantId }, data: { dismissed: [...dismissed] } }).catch(() => {})
}

export async function getConsistency(tenantId: string) {
  const row = await (prisma as any).policyConsistency.findUnique({ where: { tenant_id: tenantId } }).catch(() => null)
  const dismissed = new Set<string>(Array.isArray(row?.dismissed) ? row.dismissed : [])
  const conflicts = ((row?.conflicts as PolicyConflict[]) ?? [])
    // Also filter review/renewal-date conflicts on READ, so a stored result from before this
    // exclusion existed still hides them without needing a re-run.
    .filter(c => !REVIEW_META.test(`${c.topic} ${c.summary}`))
    .map(c => ({ ...c, key: conflictKey(c) }))
    .filter(c => !dismissed.has(c.key))
  return {
    analysed:    !!row?.analysed_at,
    analysed_at: row?.analysed_at ? new Date(row.analysed_at).toISOString() : null,
    sets:        Array.isArray(row?.sets) ? row.sets.length : 0,
    high:        conflicts.filter(c => c.severity === 'high').length,
    conflicts,
  }
}
