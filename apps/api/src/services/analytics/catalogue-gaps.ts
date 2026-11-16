// Which policies from OUR catalogue does this client not appear to hold?
//
// A different question from missing-policies.ts, which asks what the LAW requires that no policy answers. That cannot
// find most of the catalogue: a policy such as Falls Prevention sits under Regulation 12, which a home usually "partly
// covers" through some other policy, so the regulation is never a gap and the missing policy is never named.
//
// This asks the product question: for each policy we sell that suits this service, does the client hold a policy about
// that SUBJECT? One cheap model call judges a batch of catalogue policies against the full list of the client's policy
// names and types, by meaning rather than by wording (the earlier title string match failed on "Concerns And Complaints
// Policy" against "Complaints Policy"; a model reads those as the same subject).
//
// Costs Anthropic credit (small: Haiku, titles only), so it is run on request and never on opening a page. Nothing is
// stored: each batch returns its slice and the page accumulates them.

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { embedTexts } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'
import { facilityTypeToSetting } from '../../lib/care-setting'
import { POLICY_PRODUCT_SERVICES } from '../../data/policy-product-services'
import { isPolicyDocument } from '../../lib/document-kind'

const HAIKU = 'claude-haiku-4-5-20251001'
export const BATCH_SIZE = 12

// The service keys a care setting is sold under (the same keys the policies and audits are tagged with).
const SETTING_SERVICES: Record<string, string[]> = {
  'residential-care': ['care_homes', 'dementia', 'extra_care'],
  'nursing-homes': ['nursing', 'care_homes', 'dementia'],
  'domiciliary-care': ['home_care'],
  'live-in-care': ['live_in', 'home_care'],
  'complex-care': ['supported_living', 'ld_autism', 'nursing'],
  'shared-lives': ['shared_lives', 'supported_living'],
  'substance-misuse': ['substance_misuse', 'mental_health'],
  'hospices': ['hospices'],
  'independent-hospitals': ['private_hospitals', 'clinics', 'mental_health'],
  'gp-practices': ['gp_practices', 'clinics'],
  'dental-practices': ['dentistry'],
}

export type CatalogueGapItem = {
  slug: string; title: string; price_pence: number; description: string
  /** true: the client holds a policy on this subject; false: they appear not to. */
  held: boolean
  /** The client's policy that covers the subject, when held. */
  held_by: string | null
  /** Policies added to the catalogue in the 2026 expansion (everything not in the original 66). */
  is_new: boolean
}
export type CatalogueGapBatch = {
  total: number; offset: number; next_offset: number | null
  setting: string; client_policies: number
  items: CatalogueGapItem[]
}

async function candidates(tenantId: string) {
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } })
  const setting = facilityTypeToSetting(tenant?.facility_type)
  const mine = new Set(SETTING_SERVICES[setting] ?? [])
  const rows: Array<{ slug: string; title: string; price_pence: number; description: string | null; sort_order: number }> =
    await (prisma as any).policyProduct.findMany({
      where: { active: true, taster: false }, orderBy: [{ sort_order: 'asc' }, { title: 'asc' }],
      select: { slug: true, title: true, price_pence: true, description: true, sort_order: true },
    })
  // A policy with no service tag is general (the original catalogue): it suits everyone. A tagged one suits its services.
  const list = rows.filter(r => {
    const tags = POLICY_PRODUCT_SERVICES[r.slug]
    return !tags || tags.length === 0 || tags.some(t => mine.has(t))
  })
  return { setting, list }
}

async function clientPolicyNames(tenantId: string): Promise<string[]> {
  const rows: Array<{ name: string; policy_type: string | null; filename: string }> = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' }, select: { name: true, policy_type: true, filename: true },
  })
  const seen = new Set<string>(); const out: string[] = []
  for (const r of rows) {
    if (!isPolicyDocument(r.name)) continue
    const label = r.policy_type && r.policy_type.toLowerCase() !== r.name.toLowerCase() ? `${r.name} [type: ${r.policy_type}]` : r.name
    const k = label.toLowerCase(); if (seen.has(k)) continue
    seen.add(k); out.push(label)
  }
  return out.sort((a, b) => a.localeCompare(b))
}

export async function catalogueGapsBatch(tenantId: string, offset: number): Promise<CatalogueGapBatch> {
  const { setting, list } = await candidates(tenantId)
  const names = await clientPolicyNames(tenantId)
  const slice = list.slice(offset, offset + BATCH_SIZE)
  const next = offset + BATCH_SIZE < list.length ? offset + BATCH_SIZE : null
  if (!slice.length) return { total: list.length, offset, next_offset: null, setting, client_policies: names.length, items: [] }

  const system = 'You judge whether a care provider already holds a policy on a given subject. Respond only with valid JSON.'
  const user = `A care provider's policy library (name, and sometimes the type a classifier gave it):
${names.map((n, i) => `${i + 1}. ${n}`).join('\n')}

For EACH catalogue policy below, decide whether the provider already holds a policy whose SUBJECT is the same, judging by meaning, not wording ("Concerns and Complaints Policy" is the same subject as "Complaints Policy"). A policy that only mentions the topic in passing, or is on a neighbouring subject, does NOT count. When unsure, say it is not held: a missed match only costs a sales email, a false match hides a real gap.

CATALOGUE POLICIES:
${slice.map((p, i) => `${i + 1}. ${p.title}: ${p.description ?? ''}`).join('\n')}

Return JSON: {"results":[{"n":1,"held":true,"held_by":"the exact name of the provider's policy from the list, or null"}, ...]} with one entry per catalogue policy, in order.`

  let parsed: Array<{ n: number; held: boolean; held_by: string | null }> = []
  try {
    const raw = await callClaude(system, user, { model: HAIKU, maxTokens: 1500, temperature: 0, feature: 'catalogue_gap' })
    const m = raw.match(/\{[\s\S]*\}/)
    parsed = JSON.parse(m ? m[0] : raw).results ?? []
  } catch (e) {
    throw new Error('The comparison could not be read. Try this batch again.')
  }
  const byN = new Map(parsed.map(r => [Number(r.n), r]))
  // The original catalogue is the first 66 rows by sort order; everything after is the 2026 expansion.
  const items: CatalogueGapItem[] = slice.map((p, i) => {
    const r = byN.get(i + 1)
    const held = !!r?.held
    return {
      slug: p.slug, title: p.title, price_pence: p.price_pence, description: p.description ?? '',
      held, held_by: held ? (r?.held_by ?? null) : null, is_new: p.sort_order >= 66,
    }
  })
  return { total: list.length, offset, next_offset: next, setting, client_policies: names.length, items }
}

// ─── Evidence: what, in the client's own policy text, speaks to a subject? ────────────────────────────────────────
//
// The comparison above judges by policy NAMES, which is quick but can be wrong in both directions: a policy with a plain
// name can hold a whole section on the subject, and a name can sound right while the text never covers it. Before
// telling a client "you are missing X", this reads what their policies actually say. It searches their policy text for
// the subject and returns the policies that mention it with the passages, so a person can see at a glance whether the
// subject is covered in full, covered inside another policy, or not at all.
export type EvidencePolicy = {
  policy_id: string; name: string
  /** Best similarity of any passage in this policy to the subject (0 to 1). */
  best_score: number
  /** How many of the returned passages contain one of the subject's key terms in plain words. */
  term_hits: number
  excerpts: Array<{ score: number; heading: string | null; text: string; has_term: boolean }>
}
export type EvidenceReport = {
  query: string; terms: string[]
  /** Policies whose own NAME contains a key term. */
  name_matches: Array<{ policy_id: string; name: string }>
  policies: EvidencePolicy[]
}

export async function evidenceFor(tenantId: string, query: string, terms: string[] = [], topK = 40): Promise<EvidenceReport> {
  const namespace = getTenantNamespace(tenantId)
  const [emb] = await embedTexts([query])
  const matches = await queryVectors(namespace, emb, topK)
  const re = terms.length ? new RegExp(terms.map(t => t.trim().replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).filter(Boolean).join('|'), 'i') : null

  const ids = [...new Set(matches.map(m => String(m.metadata.policy_id ?? '')).filter(Boolean))]
  const rows: Array<{ id: string; name: string; status: string }> = ids.length
    ? await (prisma as any).policy.findMany({ where: { tenant_id: tenantId, id: { in: ids } }, select: { id: true, name: true, status: true } })
    : []
  const nameOf = new Map(rows.filter(r => r.status === 'active').map(r => [r.id, r.name]))

  const byPolicy = new Map<string, EvidencePolicy>()
  for (const m of matches) {
    const pid = String(m.metadata.policy_id ?? ''); const name = nameOf.get(pid)
    if (!pid || !name) continue
    const text = String(m.metadata.chunk_text ?? '')
    const has = !!re && re.test(text)
    const cur = byPolicy.get(pid) ?? { policy_id: pid, name, best_score: 0, term_hits: 0, excerpts: [] }
    cur.best_score = Math.max(cur.best_score, m.score ?? 0)
    if (has) cur.term_hits++
    if (cur.excerpts.length < 3) cur.excerpts.push({ score: Math.round((m.score ?? 0) * 1000) / 1000, heading: (m.metadata.section_heading as string) ?? (m.metadata.chapter_title as string) ?? null, text: text.replace(/\s+/g, ' ').trim().slice(0, 600), has_term: has })
    byPolicy.set(pid, cur)
  }
  const policies = [...byPolicy.values()].sort((a, b) => b.term_hits - a.term_hits || b.best_score - a.best_score).slice(0, 12)

  let name_matches: Array<{ policy_id: string; name: string }> = []
  if (re) {
    const all: Array<{ id: string; name: string }> = await (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true } })
    name_matches = all.filter(p => re.test(p.name)).map(p => ({ policy_id: p.id, name: p.name }))
  }
  return { query, terms, name_matches, policies }
}

// ─── Verification: is it a real gap, or does a policy they hold already deal with it? ────────────────────────────────
//
// A gap is only worth telling a client about if it survives a close read of their own text. This reads the passages of
// the client's policies that speak to the subject and judges them against the elements a policy on that subject must
// contain. A dedicated policy that handles most elements is "covered". A section inside a broader policy is "covered
// elsewhere". A sentence or two that touch the subject are a "mention only". Nothing relevant is "not found".
// Only "mention only" and "not found" count as a gap we would put to a client.
// Every quote is checked by code against the real passages, so the model cannot invent evidence.
const SONNET = 'claude-sonnet-4-5'
export type GapVerdict = 'covered' | 'covered_elsewhere' | 'mention_only' | 'not_found'
export type GapVerification = {
  slug: string; title: string; verdict: GapVerdict; real_gap: boolean
  reasoning: string
  elements: Array<{ element: string; found: boolean; policy: string | null; quote: string | null }>
  evidence: Array<{ policy: string; quote: string }>
}

export async function verifyGap(tenantId: string, slug: string): Promise<GapVerification> {
  const product = await (prisma as any).policyProduct.findFirst({ where: { slug }, select: { title: true, description: true } })
  if (!product) throw new Error('That catalogue policy was not found')
  const namespace = getTenantNamespace(tenantId)
  const queries = [`${product.title}. ${product.description ?? ''}`, product.title]
  const embs = await embedTexts(queries)
  const seen = new Map<string, { policy_id: string; text: string; score: number }>()
  for (const emb of embs) {
    for (const m of await queryVectors(namespace, emb, 25)) {
      const pid = String(m.metadata.policy_id ?? ''); const text = String(m.metadata.chunk_text ?? '').replace(/\s+/g, ' ').trim()
      if (!pid || !text) continue
      const key = `${pid}:${m.metadata.chunk_index}`
      const cur = seen.get(key)
      if (!cur || (m.score ?? 0) > cur.score) seen.set(key, { policy_id: pid, text, score: m.score ?? 0 })
    }
  }
  const top = [...seen.values()].sort((a, b) => b.score - a.score).slice(0, 14)
  const rows: Array<{ id: string; name: string; status: string }> = top.length
    ? await (prisma as any).policy.findMany({ where: { tenant_id: tenantId, id: { in: [...new Set(top.map(t => t.policy_id))] } }, select: { id: true, name: true, status: true } })
    : []
  const nameOf = new Map(rows.filter(r => r.status === 'active').map(r => [r.id, r.name]))
  const passages = top.filter(t => nameOf.has(t.policy_id)).map(t => ({ policy: nameOf.get(t.policy_id)!, text: t.text.slice(0, 900) }))

  if (!passages.length) {
    return { slug, title: product.title, verdict: 'not_found', real_gap: true, reasoning: 'Nothing in their policy library speaks to this subject.', elements: [], evidence: [] }
  }

  const system = 'You are a careful UK adult social care compliance reviewer. You decide whether a care provider already has a policy covering a subject. Respond only with valid JSON.'
  const user = `SUBJECT OF THE POLICY WE SELL: ${product.title}
${product.description ?? ''}

Step 1. List the 5 to 7 essential elements a good policy on this subject must contain (for example: who is responsible, the risk assessment or decision process, the practical safeguards, training, recording, review, the law or guidance it follows).

Step 2. Below are passages from the provider's OWN policies. For each element, say whether the passages deal with it in substance (a rule, procedure or responsibility, not a passing mention). Quote the exact words (max 200 characters, copied exactly, no ellipsis) when found.

PASSAGES:
${passages.map((p, i) => `[${i + 1}] (from "${p.policy}") ${p.text}`).join('\n\n')}

Step 3. Give a verdict:
- "covered": one policy is mainly ABOUT this subject and deals with most of the elements.
- "covered_elsewhere": the subject is dealt with in substance as a section of a broader policy (most elements, or the core procedure).
- "mention_only": the subject is touched on in a sentence or two, or only a few elements, with no real procedure.
- "not_found": nothing relevant.
When genuinely unsure between two verdicts, choose the MORE covered one. A false gap told to a client is much worse than a missed one.

Return JSON: {"verdict":"...","reasoning":"two plain sentences a sales person could read to the client","elements":[{"element":"...","found":true,"passage":1,"quote":"exact words or null"}]}`

  const raw = await callClaude(system, user, { model: SONNET, maxTokens: 1800, temperature: 0, feature: 'catalogue_gap_verify' })
  const m = raw.match(/\{[\s\S]*\}/)
  let j: any
  try { j = JSON.parse(m ? m[0] : raw) } catch { throw new Error('The verification could not be read. Try again.') }
  const verdict: GapVerdict = (['covered', 'covered_elsewhere', 'mention_only', 'not_found'] as const).includes(j.verdict) ? j.verdict : 'covered_elsewhere'
  const norm = (t: string) => t.replace(/\s+/g, ' ').toLowerCase()
  const elements = (Array.isArray(j.elements) ? j.elements : []).slice(0, 8).map((e: any) => {
    const p = passages[Number(e.passage) - 1]
    const quote = typeof e.quote === 'string' && p && norm(p.text).includes(norm(e.quote)) ? e.quote : null
    // An element only counts as found if its quote really exists in that policy's text.
    return { element: String(e.element ?? ''), found: !!e.found && !!quote, policy: p?.policy ?? null, quote }
  })
  const evidence = elements.filter((e: any) => e.quote && e.policy).map((e: any) => ({ policy: e.policy as string, quote: e.quote as string })).slice(0, 5)
  // If the model claims covered but not a single quote could be verified, do not trust it as covered.
  const foundCount = elements.filter((e: any) => e.found).length
  const final: GapVerdict = (verdict === 'covered' || verdict === 'covered_elsewhere') && foundCount === 0 ? 'mention_only' : verdict
  return { slug, title: product.title, verdict: final, real_gap: final === 'mention_only' || final === 'not_found', reasoning: String(j.reasoning ?? ''), elements, evidence }
}
