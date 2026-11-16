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
