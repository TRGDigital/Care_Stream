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
    'Ignore general aims, principles and boilerplate. Return at most 25 of the most comparison-worthy claims.',
    '',
    'Return ONLY JSON: {"claims":[{"topic":"...","statement":"...","quote":"...","kind":"..."}]}',
    '',
    'POLICY TEXT:',
    text.slice(0, 24000),
  ].join('\n')
}

const KINDS = new Set<ClaimKind>(['timeframe', 'role', 'location', 'frequency', 'threshold', 'escalation', 'definition', 'other'])

// Extract (and cache) the claims for one policy. Returns the claims, or [] if no text / on failure.
export async function extractPolicyClaims(tenantId: string, policy: { id: string; name: string }): Promise<PolicyClaim[]> {
  const text = await downloadExtractedText(tenantId, policy.id).catch(() => null)
  if (!text || text.trim().length < 200) return []
  const hash = createHash('sha256').update(text).digest('hex')

  const cached = await (prisma as any).policyClaim.findUnique({ where: { tenant_id_policy_id: { tenant_id: tenantId, policy_id: policy.id } } }).catch(() => null)
  if (cached && cached.content_hash === hash) return (cached.claims as PolicyClaim[]) ?? []

  await checkAiCreditLimit(tenantId)   // throws PlanLimitError → 402 in the route
  let claims: PolicyClaim[] = []
  try {
    const out = await callClaude(EXTRACT_SYSTEM, extractPrompt(policy.name, text), { model: HAIKU, maxTokens: 2000, temperature: 0 })
    const parsed = JSON.parse(out.slice(out.indexOf('{'), out.lastIndexOf('}') + 1))
    claims = (Array.isArray(parsed.claims) ? parsed.claims : [])
      .map((c: any) => ({ topic: String(c.topic ?? '').trim(), statement: String(c.statement ?? '').trim(), quote: String(c.quote ?? '').trim(), kind: (KINDS.has(c.kind) ? c.kind : 'other') as ClaimKind }))
      .filter((c: PolicyClaim) => c.topic && c.statement)
      .slice(0, 25)
  } catch (e: any) {
    console.error('[consistency] claim extraction failed', policy.id, e?.message)
    return (cached?.claims as PolicyClaim[]) ?? []
  }

  await (prisma as any).policyClaim.upsert({
    where:  { tenant_id_policy_id: { tenant_id: tenantId, policy_id: policy.id } },
    update: { policy_name: policy.name, content_hash: hash, claims, extracted_at: new Date() },
    create: { tenant_id: tenantId, policy_id: policy.id, policy_name: policy.name, content_hash: hash, claims },
  }).catch(() => {})
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

// Which policies (that appear in a comparison set) still need claim extraction? Batched so the
// route can run it with progress rather than holding one long request open.
export async function pendingClaimPolicies(tenantId: string): Promise<Array<{ id: string; name: string }>> {
  const sets = await getCachedSets(tenantId)
  const inSet = new Map<string, string>()
  for (const s of sets) for (const p of s.policies) inSet.set(p.id, p.name)
  if (inSet.size === 0) return []
  const cached = await (prisma as any).policyClaim.findMany({ where: { tenant_id: tenantId, policy_id: { in: [...inSet.keys()] } }, select: { policy_id: true } })
  const have = new Set((cached as any[]).map(c => c.policy_id))
  // We can't cheaply know here whether a cached copy is stale (hash) without the text, so we treat
  // "has a row" as done for batching; extractPolicyClaims re-checks the hash and skips if unchanged.
  return [...inSet.entries()].filter(([id]) => !have.has(id)).map(([id, name]) => ({ id, name }))
}

export async function extractClaimsBatch(tenantId: string, batch: Array<{ id: string; name: string }>): Promise<void> {
  await mapLimit(batch, 3, (p) => extractPolicyClaims(tenantId, p).catch(() => []))
}
