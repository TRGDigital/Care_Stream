// Which policies does this client not have at all?
//
// Different question from the one /platform/policy-gaps asks today. That screen compares a
// tenant against its peers: what do other homes of this care setting hold that this one does
// not. Useful, but it only finds what somebody else happened to upload. This asks the
// question the law asks: for every regulation that applies to this service, is there a policy
// whose subject is that regulation, and if not, what should the policy be called.
//
// That is the exercise that found Gas Safety, Electrical Safety and Asbestos Management
// missing at Ferndale, none of which any peer held either.
//
// READ ONLY AND FREE. It derives everything from regulation_coverage rows that have already
// been analysed. Running the analysis itself costs Anthropic credit and is a separate,
// deliberate action; this function never triggers one. When coverage has never been run it
// says so rather than reporting "nothing missing", because those two look identical from the
// data and mean opposite things.

import { prisma } from '../../db/client'
import { getScopedRegulations, type Reg } from './regulation-coverage'

export type MissingPolicy = {
  /** Suggested title, taken from the regulation's curated expected_policy_titles. */
  title: string
  /** Every in-scope regulation left uncovered that this one policy would answer. */
  regulations: { reference_key: string; official_name: string }[]
}

export type MissingPolicyReport = {
  /** False when coverage has never been run for this tenant: the list below means nothing yet. */
  analysed: boolean
  analysed_at: string | null
  /** In-scope regulations, and how many of them have been analysed so far. */
  regulations_in_scope: number
  regulations_analysed: number
  counts: { covered: number; partial: number; gap: number }
  missing: MissingPolicy[]
}

/** Loose title match, so "Gas Safety Policy" and "gas-safety-policy-v3" are the same thing. */
function normalise(title: string): string {
  return title
    .toLowerCase()
    .replace(/\.[a-z0-9]{2,4}$/, '')
    .replace(/\bv?\d+(\.\d+)*\b/g, ' ')
    .replace(/\b(policy|procedure|and|the|of|for|our|20\d\d)\b/g, ' ')
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
}

/** The title to suggest for a regulation with no policy behind it. */
function suggestedTitle(reg: Reg): string {
  const curated = (reg.expected_policy_titles || []).map(t => String(t).trim()).filter(Boolean)
  if (curated.length) return curated[0]
  // No curated title. Fall back to the regulation's own name, which at least names the
  // subject, rather than inventing something that sounds official.
  const name = (reg.official_name || reg.reference_key || '').trim()
  return /policy$/i.test(name) ? name : `${name} Policy`
}

export async function missingPolicies(tenantId: string): Promise<MissingPolicyReport> {
  const [regs, coverage, policies] = await Promise.all([
    getScopedRegulations(tenantId),
    (prisma as any).regulationCoverage.findMany({
      where: { tenant_id: tenantId },
      select: { reference_key: true, status: true, analysed_at: true },
    }) as Promise<{ reference_key: string; status: string; analysed_at: Date }[]>,
    (prisma as any).policy.findMany({
      where: { tenant_id: tenantId, status: 'active' },
      select: { name: true, filename: true },
    }) as Promise<{ name: string; filename: string }[]>,
  ])

  const byKey = new Map(coverage.map(c => [c.reference_key, c]))
  const inScope = regs.filter(r => byKey.has(r.reference_key))
  const counts = { covered: 0, partial: 0, gap: 0 }
  for (const r of inScope) {
    const s = byKey.get(r.reference_key)!.status
    if (s === 'covered' || s === 'partial' || s === 'gap') counts[s]++
  }

  // Titles the tenant already holds, so a regulation judged a gap for some other reason does
  // not produce a "missing" policy they can see on their own shelf.
  const held = new Set<string>()
  for (const p of policies) {
    for (const t of [p.name, p.filename]) {
      const n = normalise(String(t || ''))
      if (n) held.add(n)
    }
  }

  // One entry per suggested title, carrying every regulation it would answer. Several
  // regulations often point at the same policy, and a client wants to buy one document, not
  // one per regulation.
  const grouped = new Map<string, MissingPolicy>()
  for (const reg of regs) {
    if (byKey.get(reg.reference_key)?.status !== 'gap') continue
    const title = suggestedTitle(reg)
    const key = normalise(title)
    if (!key || held.has(key)) continue
    if (!grouped.has(key)) grouped.set(key, { title, regulations: [] })
    grouped.get(key)!.regulations.push({ reference_key: reg.reference_key, official_name: reg.official_name })
  }

  const analysedAt = coverage.reduce<Date | null>(
    (max, c) => (!max || c.analysed_at > max ? c.analysed_at : max), null)

  return {
    analysed: coverage.length > 0,
    analysed_at: analysedAt ? analysedAt.toISOString() : null,
    regulations_in_scope: regs.length,
    regulations_analysed: inScope.length,
    counts,
    // Most regulations behind it first: that is the one worth writing soonest.
    missing: [...grouped.values()].sort((a, b) => b.regulations.length - a.regulations.length),
  }
}
