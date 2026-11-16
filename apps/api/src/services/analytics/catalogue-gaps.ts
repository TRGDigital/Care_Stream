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
