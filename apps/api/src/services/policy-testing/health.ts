// Policy health (pilot, CS-1001): a roll up of what CareStream already knows about each policy, shown as bands with the reason, never a single made up number.
// Six dimensions (staff readability sits inside clarity and precision). Each says Strong, Good or Needs attention, or "not yet assessed" when the analysis behind it has not run. The overall band uses the weights below,
// counting only the dimensions assessed, and needs at least three of them.

import { prisma } from '../../db/client'
import { isPolicyDocument } from '../../lib/document-kind'
import { readabilityBand, checkBands, clarityDimBand, HEALTH_CHECKS, type Band, type Metrics, type CheckResult } from './clarity'

export type DimKey = 'coverage' | 'uptodate' | 'consistency' | 'wording' | 'clarity' | 'practical'
export const HEALTH_WEIGHTS: Record<DimKey, number> = { coverage: 25, uptodate: 15, consistency: 15, wording: 10, clarity: 20, practical: 15 }
export const DIM_LABEL: Record<DimKey, string> = {
  coverage: 'Regulation coverage', uptodate: 'Up to date', consistency: 'Cross-policy consistency', wording: 'CQC wording', clarity: 'Clarity and precision', practical: 'Policy testing',
}
export type Dim = {
  key: DimKey; label: string; band: Band; value?: number | null; detail: string; href: string
  /** When the analysis behind this dimension was last run (null if it has not been). */
  last_run: string | null
  /** The seven clarity checks, when clarity has been run. */
  checks?: CheckResult[]
  /** Staff readability: measured when clarity is run, so it sits inside Clarity and precision. */
  readability?: { band: Band; detail: string }
}
const VALUE: Record<Exclude<Band, 'none'>, number> = { strong: 100, good: 70, attention: 30 }

export const bandValue = (b: Band): number | null => (b === 'none' ? null : VALUE[b])
export const bandOfScore = (score: number): Band => (score >= 85 ? 'strong' : score >= 60 ? 'good' : 'attention')

/** The score out of 100: each assessed dimension is Strong (100), Good (70) or Needs attention (30), weighted, over the dimensions assessed. Only once at least three are assessed. */
export function scoreOf(dims: Array<{ key: DimKey; band: Band }>): { score: number | null; band: Band; assessed: number } {
  const done = dims.filter(d => d.band !== 'none')
  if (done.length < 3) return { score: null, band: 'none', assessed: done.length }
  const total = done.reduce((n, d) => n + HEALTH_WEIGHTS[d.key], 0)
  const score = Math.round(done.reduce((n, d) => n + HEALTH_WEIGHTS[d.key] * VALUE[d.band as Exclude<Band, 'none'>], 0) / total)
  return { score, band: bandOfScore(score), assessed: done.length }
}
/** The overall band from the dimensions (the same rule as the score). */
export const overallBand = (dims: Array<{ key: DimKey; band: Band }>): { band: Band; assessed: number } => { const r = scoreOf(dims); return { band: r.band, assessed: r.assessed } }

export type Fix = { dim: DimKey; text: string; href: string; gain: number }
/** The few things that would raise the score most: the weight of a dimension times how far it is from Strong, biggest first. */
export function topFixes(dims: Dim[], limit = 3): Fix[] {
  const act: Record<DimKey, (d: Dim) => string> = {
    coverage: () => 'Close the open regulation gaps for this policy',
    uptodate: () => 'Update the out of date terms',
    consistency: () => 'Resolve the conflicts with your other policies',
    clarity: d => { const worst = [...(d.checks ?? [])].filter(c => c.count > 0).sort((a, b) => b.count - a.count)[0]; return worst ? `Rewrite the unclear passages, starting with ${worst.label.toLowerCase()} (${worst.count})` : 'Rewrite the unclear passages' },
    practical: () => 'Cover the points no policy in your library covers yet',
    wording: () => 'Review the CQC wording suggestions for this policy',
  }
  return dims
    .filter(d => d.band === 'attention' || d.band === 'good')
    .map(d => ({ dim: d.key, text: act[d.key](d), href: d.href, gain: HEALTH_WEIGHTS[d.key] * (100 - (bandValue(d.band) ?? 100)) }))
    .sort((a, b) => b.gain - a.gain).slice(0, limit)
}

/** Share of the policy's evidence regulations that are fully covered. */
export function coverageBand(covered: number, partial: number): Band {
  const n = covered + partial
  if (n === 0) return 'none'
  return partial === 0 ? 'strong' : partial / n <= 0.25 ? 'good' : 'attention'
}
export const practicalBand = (gaps: number, points: number): Band => (points === 0 ? 'none' : gaps === 0 ? 'strong' : gaps / points <= 0.2 ? 'good' : 'attention')

export type LastCheck = { id: string; score: number; band: Band; at: string; stale: boolean; fixes: Fix[] }
export type PreStep = { step: number; label: string; done: boolean; detail: string }
export type PolicyHealth = { id: string; name: string; overall: Band; score: number | null; assessed: number; dims: Dim[]; fixes: Fix[]; ready: boolean; waiting: string[]; steps: PreStep[]; last_check: LastCheck | null }

export async function loadHealth(tenantId: string): Promise<PolicyHealth[]> {
  const [policies, coverage, lint, consistency, clarity, stress, checks, wording] = await Promise.all([
    (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true, version: true }, orderBy: { name: 'asc' } }),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { evidence_policy_id: true, status: true, analysed_at: true } }).catch(() => []),
    (prisma as any).policyLintResult.findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, findings: true, scanned_at: true } }).catch(() => []),
    (prisma as any).policyConsistency.findUnique({ where: { tenant_id: tenantId }, select: { conflicts: true, dismissed: true, analysed_at: true } }).catch(() => null),
    (prisma as any).policyClarityResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { policy_id: true, band: true, finding_count: true, metrics: true, summary: true, findings: true, created_at: true } }).catch(() => []),
    (prisma as any).policyStressResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { policy_id: true, scenario_id: true, points: true, gaps: true, created_at: true } }).catch(() => []),
    (prisma as any).policyHealthCheck.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { id: true, policy_id: true, policy_version: true, score: true, band: true, fixes: true, created_at: true } }).catch(() => []),
    (prisma as any).policyWordingAlignment.findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, alignments: true, has_suggestions: true, analysed_at: true } }).catch(() => []),
  ])
  const iso = (d: any) => (d ? new Date(d).toISOString() : null)
  const wordingBy = new Map<string, any>((wording as any[]).map(w => [w.policy_id, w]))
  const coverageRun = iso((coverage as any[]).reduce((m: any, c: any) => (!m || new Date(c.analysed_at) > new Date(m) ? c.analysed_at : m), null))   // the coverage analysis runs over the whole library
  const lastCheck = new Map<string, any>(); for (const c of checks as any[]) if (!lastCheck.has(c.policy_id)) lastCheck.set(c.policy_id, c)
  const dismissed = new Set<string>(Array.isArray(consistency?.dismissed) ? (consistency.dismissed as any[]).map(d => String(d?.id ?? d)) : [])
  const conflicts = (Array.isArray(consistency?.conflicts) ? consistency.conflicts : []).filter((c: any) => !dismissed.has(String(c?.id)))
  const lintRun = new Map<string, any>((lint as any[]).map(l => [l.policy_id, l.scanned_at]))
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
    // The seven checks always show; until clarity has been run each says so.
    const checks: CheckResult[] = cl ? checkBands(Array.isArray(cl.findings) ? cl.findings : [], metrics?.words ?? 0) : HEALTH_CHECKS.map(c => ({ ...c, count: 0, band: 'none' as Band }))

    const wa = wordingBy.get(p.id)
    const wordingN = wa?.has_suggestions && Array.isArray(wa.alignments) ? wa.alignments.length : 0
    const readability: { band: Band; detail: string } = metrics
      ? { band: readabilityBand(metrics), detail: `Average sentence ${metrics.avg_sentence_words} words, ${metrics.long_sentence_pct}% long sentences, ${metrics.passive_pct}% passive, reading ease ${metrics.reading_ease}.` }
      : { band: 'none', detail: 'Measured when clarity is run.' }
    // Staff readability sits inside clarity: it comes from the same read. A readability that needs attention stops clarity being called Strong.
    const clarityBandNow: Band = cl ? clarityDimBand((cl.band ?? 'none') as Band, checks) : 'none'
    const clarityFinal: Band = clarityBandNow === 'strong' && readability.band === 'attention' ? 'good' : clarityBandNow

    const dims: Dim[] = [
      { key: 'coverage', label: DIM_LABEL.coverage, band: coverageBand(covered, partial), href: '/gaps', last_run: coverageRun,
        detail: cov.length ? `${covered} of ${cov.length} regulations this policy answers are fully covered${partial ? `, ${partial} still have missing elements` : ''}.` : 'The gap analysis has not matched this policy to a regulation yet.' },
      { key: 'uptodate', label: DIM_LABEL.uptodate, band: lintN === undefined ? 'none' : lintN === 0 ? 'strong' : lintN <= 2 ? 'good' : 'attention', href: '/gaps', last_run: iso(lintRun.get(p.id)),
        detail: lintN === undefined ? 'Not checked yet.' : lintN === 0 ? 'No out of date terms found.' : `${lintN} out of date ${lintN === 1 ? 'term' : 'terms'} to update.` },
      { key: 'consistency', label: DIM_LABEL.consistency, band: consistency?.analysed_at ? (myConflicts === 0 ? 'strong' : myConflicts <= 1 ? 'good' : 'attention') : 'none', href: '/gaps', last_run: iso(consistency?.analysed_at),
        detail: consistency?.analysed_at ? (myConflicts === 0 ? 'No open conflicts with your other policies.' : `${myConflicts} open ${myConflicts === 1 ? 'conflict' : 'conflicts'} with other policies.`) : 'Cross-policy consistency has not been run yet.' },
      { key: 'wording', label: DIM_LABEL.wording, band: wa ? (wordingN === 0 ? 'strong' : wordingN <= 2 ? 'good' : 'attention') : 'none', href: '/gaps', last_run: iso(wa?.analysed_at),
        detail: wa ? (wordingN === 0 ? 'This policy reads in the way the CQC quality statements expect.' : `${wordingN} ${wordingN === 1 ? 'passage' : 'passages'} could be reworded to match the CQC quality statements.`) : 'The CQC wording analysis has not been run on this policy yet.' },
      { key: 'clarity', label: DIM_LABEL.clarity, band: clarityFinal, href: `/gaps?clarity=${p.id}`, last_run: iso(cl?.created_at), checks, readability,
        detail: cl ? `${cl.finding_count} ${cl.finding_count === 1 ? 'passage' : 'passages'} of unclear wording found. The seven checks and staff readability are below.` : 'Not run yet. Open step 5 on the Gaps page. The seven checks and staff readability fill in when it is run.' },
      { key: 'practical', label: DIM_LABEL.practical, band: practicalBand(stressGaps, stressPoints), href: '/stress-testing', last_run: iso(myStress.reduce((m: any, r: any) => (!m || new Date(r.created_at) > new Date(m) ? r.created_at : m), null)),
        detail: myStress.length ? `${myStress.length} ${myStress.length === 1 ? 'situation' : 'situations'} tested, ${stressGaps} ${stressGaps === 1 ? 'point' : 'points'} not covered anywhere in your library.` : 'No situations tested yet. Open Policy Testing.' },
    ]
    for (const d of dims) d.value = bandValue(d.band)
    const o = scoreOf(dims)
    const lc = lastCheck.get(p.id)
    // Ready for step 5 (clarity and precision): steps 1 to 4 have each been run for this policy and have nothing open.
    const steps: PreStep[] = [
      { step: 1, label: 'Regulation coverage', done: !!coverageRun && partial === 0, detail: !coverageRun ? 'Not run yet' : partial > 0 ? `${partial} open regulation ${partial === 1 ? 'gap' : 'gaps'}` : 'Nothing open' },
      { step: 2, label: 'Out-of-date content', done: lintN !== undefined && lintN === 0, detail: lintN === undefined ? 'Not run yet' : lintN > 0 ? `${lintN} out of date ${lintN === 1 ? 'term' : 'terms'}` : 'Nothing open' },
      { step: 3, label: 'Cross-policy consistency', done: !!consistency?.analysed_at && myConflicts === 0, detail: !consistency?.analysed_at ? 'Not run yet' : myConflicts > 0 ? `${myConflicts} open ${myConflicts === 1 ? 'conflict' : 'conflicts'}` : 'Nothing open' },
      { step: 4, label: 'CQC wording', done: !!wa && wordingN === 0, detail: !wa ? 'Not run yet' : wordingN > 0 ? `${wordingN} wording ${wordingN === 1 ? 'suggestion' : 'suggestions'}` : 'Nothing open' },
    ]
    const waiting = steps.filter(x => !x.done).map(x => `step ${x.step} ${x.label.toLowerCase()} (${x.detail.toLowerCase()})`)
    return {
      id: p.id, name: p.name, overall: o.band, score: o.score, assessed: o.assessed, dims, fixes: topFixes(dims), ready: waiting.length === 0, waiting, steps,
      last_check: lc ? { id: lc.id, score: lc.score, band: lc.band as Band, at: new Date(lc.created_at).toISOString(), stale: (lc.policy_version ?? 1) !== (p.version ?? 1), fixes: Array.isArray(lc.fixes) ? lc.fixes : [] } : null,
    }
  })
}
