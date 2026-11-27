// Policy health (pilot, CS-1001): a roll up of what CareStream already knows about each policy, shown as bands with the reason, never a single made up number.
// Six dimensions. Each says Strong, Good or Needs attention, or "not yet assessed" when the analysis behind it has not run. The overall band uses the weights below,
// counting only the dimensions assessed, and needs at least three of them.

import { prisma } from '../../db/client'
import { isPolicyDocument } from '../../lib/document-kind'
import { readabilityBand, type Band, type Metrics } from './clarity'

export type DimKey = 'coverage' | 'uptodate' | 'consistency' | 'clarity' | 'practical' | 'readability'
export const HEALTH_WEIGHTS: Record<DimKey, number> = { coverage: 25, uptodate: 15, consistency: 15, clarity: 20, practical: 15, readability: 10 }
export const DIM_LABEL: Record<DimKey, string> = {
  coverage: 'Regulatory coverage', uptodate: 'Up to date', consistency: 'Consistency with your other policies', clarity: 'Clarity and precision', practical: 'Practical use (stress tests)', readability: 'Staff readability',
}
export type Dim = { key: DimKey; label: string; band: Band; detail: string; href: string }
const VALUE: Record<Exclude<Band, 'none'>, number> = { strong: 100, good: 70, attention: 30 }

/** The overall band from the dimensions: weighted over those assessed, and only once at least three are. */
export function overallBand(dims: Array<{ key: DimKey; band: Band }>): { band: Band; assessed: number } {
  const done = dims.filter(d => d.band !== 'none')
  if (done.length < 3) return { band: 'none', assessed: done.length }
  const total = done.reduce((n, d) => n + HEALTH_WEIGHTS[d.key], 0)
  const score = done.reduce((n, d) => n + HEALTH_WEIGHTS[d.key] * VALUE[d.band as Exclude<Band, 'none'>], 0) / total
  return { band: score >= 85 ? 'strong' : score >= 60 ? 'good' : 'attention', assessed: done.length }
}

/** Share of the policy's evidence regulations that are fully covered. */
export function coverageBand(covered: number, partial: number): Band {
  const n = covered + partial
  if (n === 0) return 'none'
  return partial === 0 ? 'strong' : partial / n <= 0.25 ? 'good' : 'attention'
}
export const practicalBand = (gaps: number, points: number): Band => (points === 0 ? 'none' : gaps === 0 ? 'strong' : gaps / points <= 0.2 ? 'good' : 'attention')

export type PolicyHealth = { id: string; name: string; overall: Band; assessed: number; dims: Dim[]; ready: boolean; waiting: string[] }

export async function loadHealth(tenantId: string): Promise<PolicyHealth[]> {
  const [policies, coverage, lint, consistency, clarity, stress] = await Promise.all([
    (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true }, orderBy: { name: 'asc' } }),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { evidence_policy_id: true, status: true } }).catch(() => []),
    (prisma as any).policyLintResult.findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, findings: true } }).catch(() => []),
    (prisma as any).policyConsistency.findUnique({ where: { tenant_id: tenantId }, select: { conflicts: true, dismissed: true, analysed_at: true } }).catch(() => null),
    (prisma as any).policyClarityResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { policy_id: true, band: true, finding_count: true, metrics: true, summary: true } }).catch(() => []),
    (prisma as any).policyStressResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { policy_id: true, scenario_id: true, points: true, gaps: true } }).catch(() => []),
  ])
  const dismissed = new Set<string>(Array.isArray(consistency?.dismissed) ? (consistency.dismissed as any[]).map(d => String(d?.id ?? d)) : [])
  const conflicts = (Array.isArray(consistency?.conflicts) ? consistency.conflicts : []).filter((c: any) => !dismissed.has(String(c?.id)))
  const lintBy = new Map<string, number>((lint as any[]).map(l => [l.policy_id, Array.isArray(l.findings) ? l.findings.length : 0]))
  const clarityBy = new Map<string, any>(); for (const c of clarity as any[]) if (!clarityBy.has(c.policy_id)) clarityBy.set(c.policy_id, c)
  const stressLatest = new Map<string, any>(); for (const r of stress as any[]) { const k = `${r.policy_id}:${r.scenario_id}`; if (!stressLatest.has(k)) stressLatest.set(k, r) }

  return (policies as any[]).filter(p => isPolicyDocument(p.name ?? '')).map(p => {
    const cov = (coverage as any[]).filter(c => c.evidence_policy_id === p.id)
    const covered = cov.filter(c => c.status === 'covered').length, partial = cov.filter(c => c.status === 'partial').length
    const lintN = lintBy.get(p.id)
    const myConflicts = conflicts.filter((c: any) => (c.positions ?? []).some((x: any) => x.policy_id === p.id)).length
    const cl = clarityBy.get(p.id)
    const myStress = [...stressLatest.values()].filter(r => r.policy_id === p.id)
    const stressPoints = myStress.reduce((n, r) => n + (Array.isArray(r.points) ? r.points.length : 0), 0), stressGaps = myStress.reduce((n, r) => n + (r.gaps ?? 0), 0)
    const metrics: Metrics | null = cl?.metrics && Object.keys(cl.metrics).length ? cl.metrics : null

    const dims: Dim[] = [
      { key: 'coverage', label: DIM_LABEL.coverage, band: coverageBand(covered, partial), href: '/gaps',
        detail: cov.length ? `${covered} of ${cov.length} regulations this policy answers are fully covered${partial ? `, ${partial} still have missing elements` : ''}.` : 'The gap analysis has not matched this policy to a regulation yet.' },
      { key: 'uptodate', label: DIM_LABEL.uptodate, band: lintN === undefined ? 'none' : lintN === 0 ? 'strong' : lintN <= 2 ? 'good' : 'attention', href: '/gaps',
        detail: lintN === undefined ? 'Not checked yet.' : lintN === 0 ? 'No out of date terms found.' : `${lintN} out of date ${lintN === 1 ? 'term' : 'terms'} to update.` },
      { key: 'consistency', label: DIM_LABEL.consistency, band: consistency?.analysed_at ? (myConflicts === 0 ? 'strong' : myConflicts <= 1 ? 'good' : 'attention') : 'none', href: '/gaps',
        detail: consistency?.analysed_at ? (myConflicts === 0 ? 'No open conflicts with your other policies.' : `${myConflicts} open ${myConflicts === 1 ? 'conflict' : 'conflicts'} with other policies.`) : 'Cross policy consistency has not been run yet.' },
      { key: 'clarity', label: DIM_LABEL.clarity, band: (cl?.band ?? 'none') as Band, href: '/gaps',
        detail: cl ? `${cl.finding_count} ${cl.finding_count === 1 ? 'passage' : 'passages'} of unclear wording found.` : 'Not run yet. Open Policy clarity on the Gaps page.' },
      { key: 'practical', label: DIM_LABEL.practical, band: practicalBand(stressGaps, stressPoints), href: '/stress-testing',
        detail: myStress.length ? `${myStress.length} ${myStress.length === 1 ? 'situation' : 'situations'} tested, ${stressGaps} ${stressGaps === 1 ? 'point' : 'points'} not covered anywhere in your library.` : 'No situations tested yet. Open Policy Testing.' },
      { key: 'readability', label: DIM_LABEL.readability, band: metrics ? readabilityBand(metrics) : 'none', href: '/gaps',
        detail: metrics ? `Average sentence ${metrics.avg_sentence_words} words, ${metrics.long_sentence_pct}% long sentences, reading ease ${metrics.reading_ease}.` : 'Measured when clarity is run.' },
    ]
    const o = overallBand(dims)
    // Ready for clarity and testing: the regulation, up to date and consistency checks have run and found nothing open for this policy.
    const waiting: string[] = []
    if (!cov.length && !consistency?.analysed_at && lintN === undefined) waiting.push('Run the gap analysis first')
    if (partial > 0) waiting.push(`${partial} open regulation ${partial === 1 ? 'gap' : 'gaps'}`)
    if (lintN && lintN > 0) waiting.push(`${lintN} out of date ${lintN === 1 ? 'term' : 'terms'}`)
    if (myConflicts > 0) waiting.push(`${myConflicts} open ${myConflicts === 1 ? 'conflict' : 'conflicts'}`)
    return { id: p.id, name: p.name, overall: o.band, assessed: o.assessed, dims, ready: waiting.length === 0, waiting }
  })
}
