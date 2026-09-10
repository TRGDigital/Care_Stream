// Which policies does this client not have at all?
//
// Different question from the one /platform/policy-gaps asks with its peer comparison. That
// finds what other homes of the same care setting happened to upload. This asks the question
// the law asks: for every regulation in scope for this service, is there a policy whose
// subject is that regulation.
//
// The answer comes from ONE source of evidence: the regulation coverage verdict, which is
// reached by reading the policies' text against the regulation. Nothing here matches on
// titles.
//
// An earlier version did. It kept a list of the titles a client already held and filtered
// those out, as a safety net against bad coverage data. That was a guess dressed as a check,
// and it failed exactly where a guess fails. Ferndale hold "Concerns And Complaints Policy"
// and the suggested title was "Complaints Policy"; the names did not match, so the policy
// they own was reported as missing. Same for "Speaking Up Whistleblowing Policy" against
// "Whistleblowing Policy", and "End Of Life Care In Care Homes Policy" against "End of Life
// Care Policy".
//
// The content judge does not have this problem. On a fresh run it matched Regulation 16 to
// "Concerns And Complaints Policy" on what the document says, not what it is called. So the
// title filter was removed rather than tuned: a second, weaker opinion could only ever
// overrule a stronger one.
//
// What replaces it is honesty about the evidence. A verdict is only as good as the run that
// produced it, so this reports whether the run is older than the client's own policies —
// but reporting that is not the same as hiding the finding. See `usable`.
//
// READ ONLY AND FREE. Derives everything from coverage rows already analysed; never starts a
// run, which costs Anthropic credit.

import { prisma } from '../../db/client'
import { getScopedRegulations, type Reg } from './regulation-coverage'

export type MissingPolicy = {
  /** Suggested title, taken from the regulation's curated expected_policy_titles. */
  title: string
  /** Every in-scope regulation left uncovered that this one policy would answer. */
  regulations: { reference_key: string; official_name: string }[]
}

export type MissingPolicyReport = {
  /** False when coverage has never run: the list means nothing yet, which is not the same as nothing missing. */
  analysed: boolean
  analysed_at: string | null
  /** True when the list is out of date in some way. `stale_reason` says how, in words fit to
   *  show the client. Dated is NOT the same as wrong: see `usable`. */
  stale: boolean
  stale_reason: string | null
  /** False only when the VERDICT ITSELF cannot be believed, and the list must not be shown.
   *
   *  These were one flag until Ferndale lost eleven real gaps. Their analysis ran at 07:27,
   *  a single unrelated policy was published at 10:16, and the whole list vanished — COSHH,
   *  Gas Safety, Electricity at Work and eight more that they genuinely do not hold.
   *
   *  "These regulations have no policy behind them" does not stop being true because someone
   *  edited a different policy. At worst one of them was just answered. Hiding the lot turns
   *  a small inaccuracy into a total loss of the finding, which is the worse error. */
  usable: boolean
  regulations_in_scope: number
  regulations_analysed: number
  counts: { covered: number; partial: number; gap: number }
  missing: MissingPolicy[]
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

/** Group by the policy that would answer them: one document, not one per regulation. */
function groupByTitle(regs: Reg[]): MissingPolicy[] {
  const grouped = new Map<string, MissingPolicy>()
  for (const reg of regs) {
    const title = suggestedTitle(reg)
    const key = title.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()
    if (!key) continue
    if (!grouped.has(key)) grouped.set(key, { title, regulations: [] })
    grouped.get(key)!.regulations.push({ reference_key: reg.reference_key, official_name: reg.official_name })
  }
  // Most regulations behind it first: that is the one worth writing soonest.
  return [...grouped.values()].sort((a, b) => b.regulations.length - a.regulations.length)
}

export async function missingPolicies(tenantId: string): Promise<MissingPolicyReport> {
  const [regs, coverage, newestPolicy, policyCount] = await Promise.all([
    getScopedRegulations(tenantId),
    (prisma as any).regulationCoverage.findMany({
      where: { tenant_id: tenantId },
      select: { reference_key: true, status: true, analysed_at: true },
    }) as Promise<{ reference_key: string; status: string; analysed_at: Date }[]>,
    (prisma as any).policy.findFirst({
      where: { tenant_id: tenantId, status: 'active' },
      orderBy: { updated_at: 'desc' },
      select: { updated_at: true },
    }) as Promise<{ updated_at: Date } | null>,
    (prisma as any).policy.count({ where: { tenant_id: tenantId, status: 'active' } }) as Promise<number>,
  ])

  const byKey = new Map(coverage.map(c => [c.reference_key, c]))
  const analysedRegs = regs.filter(r => byKey.has(r.reference_key))
  const counts = { covered: 0, partial: 0, gap: 0 }
  for (const r of analysedRegs) {
    const s = byKey.get(r.reference_key)!.status
    if (s === 'covered' || s === 'partial' || s === 'gap') counts[s]++
  }

  const analysedAt = coverage.reduce<Date | null>(
    (max, c) => (!max || c.analysed_at > max ? c.analysed_at : max), null)

  // Is this verdict worth showing?
  //
  // Three ways it is not. The policies have moved on since the run. The run never covered
  // every regulation in scope. Or every single regulation came back a gap on a library of
  // hundreds, which is arithmetically possible and practically never true: it is the
  // signature of a run made before the coverage judge was fixed, and Ferndale's 6 September
  // run looks exactly like that.
  let stale = false
  let staleReason: string | null = null
  let usable = true

  // Unusable: every regulation came back a gap across a library of hundreds. Arithmetically
  // possible, practically never true — it is the signature of a run made before the coverage
  // judge was fixed. Showing it would tell a home with 361 policies that it has none.
  if (coverage.length > 0 && counts.gap === analysedRegs.length && policyCount > 20) {
    stale = true
    usable = false
    staleReason = `Every regulation came back with no policy, across ${policyCount} policies. That is almost certainly an analysis made before the coverage judge was corrected. Re-run before trusting this.`

  // Dated, but still worth showing. The gaps found are real gaps; a later policy edit can
  // only ever have answered one of them, and an incomplete run still found what it found.
  } else if (analysedAt && newestPolicy && newestPolicy.updated_at > analysedAt) {
    stale = true
    staleReason = 'Your policies have changed since this analysis ran, so one of these may already be answered. Re-run the analysis to be sure.'
  } else if (coverage.length > 0 && analysedRegs.length < regs.length) {
    stale = true
    staleReason = `Only ${analysedRegs.length} of ${regs.length} regulations were analysed, so there may be more than this.`
  }

  return {
    analysed: coverage.length > 0,
    analysed_at: analysedAt ? analysedAt.toISOString() : null,
    stale,
    stale_reason: staleReason,
    usable,
    regulations_in_scope: regs.length,
    regulations_analysed: analysedRegs.length,
    counts,
    missing: groupByTitle(regs.filter(r => byKey.get(r.reference_key)?.status === 'gap')),
  }
}
