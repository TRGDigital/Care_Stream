// Policy health (pilot, CS-1001): a roll up of what CareStream already knows about each policy, shown as bands with the reason, never a single made up number.
// Six dimensions (staff readability sits inside clarity and precision). Each says Strong, Good or Needs attention, or "not yet assessed" when the analysis behind it has not run. The overall band uses the weights below,
// counting only the dimensions assessed, and needs at least three of them.

import { prisma } from '../../db/client'
import { isPolicyDocument } from '../../lib/document-kind'
import { clarityStatus, HEALTH_CHECKS, type Band, type CheckResult } from './clarity'
import { policyMatchesType } from './stress'

export type DimKey = 'coverage' | 'uptodate' | 'consistency' | 'wording' | 'clarity' | 'practical'
export const HEALTH_WEIGHTS: Record<DimKey, number> = { coverage: 25, uptodate: 15, consistency: 15, wording: 10, clarity: 20, practical: 15 }
export const DIM_LABEL: Record<DimKey, string> = {
  coverage: 'Regulation coverage', uptodate: 'Up to date', consistency: 'Cross-policy consistency', wording: 'CQC wording', clarity: 'Clarity and precision', practical: 'Policy testing',
}
export type TestingResult = { id: string; scenario_id: string; title: string; at: string; covered: number; total: number; elsewhere: number; gaps: number; scenario_changed: boolean; policy_changed: boolean }
export type TestingInfo = { available: Array<{ id: string; title: string }>; results: TestingResult[]; changes: number; last_change_at: string | null; stale: number }
export type Dim = {
  key: DimKey; label: string; band: Band; value?: number | null; detail: string; href: string
  /** When the analysis behind this dimension was last run (null if it has not been). */
  last_run: string | null
  /** The seven clarity checks, when clarity has been run. */
  checks?: CheckResult[]
  /** Staff readability: measured when clarity is run, so it sits inside Clarity and precision. */
  readability?: { band: Band; detail: string }
  /** Policy testing: what is set up for this policy, what has been run, and what has changed because of it. */
  testing?: TestingInfo
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
    practical: d => (d.testing && d.testing.stale > 0 ? 'Test this policy again, it has changed since the last policy test' : d.testing && d.testing.available.length > d.testing.results.length ? 'Run the policy tests that are set up for this policy' : 'Cover the points no policy in your library covers yet'),
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

/** What the Gaps page shows for steps 1 to 4, per policy, taken from the same functions that draw those steps, so the health row can never disagree with Gaps.
 *  Loaded lazily so the pure scoring rules above can be tested on their own. */
export type GapViews = {
  coverageRun: string | null; coverageCovered: Map<string, number>; coverageOpen: Map<string, number>
  lintRows: Set<string>; lintIssues: Map<string, number>; lintRun: Map<string, string>; reviewState: Map<string, string>
  consAnalysed: boolean; consRun: string | null; conflictsBy: Map<string, number>
  wordingRows: Set<string>; wordingCount: Map<string, number>; wordingRun: Map<string, string>
}

export async function loadGapViews(tenantId: string): Promise<GapViews> {
  const [{ getTenantLint }, { getConsistency }, { getPolicyWordingAlignment, WORDING_FAILED_MESSAGE }, { facilityTypeToSetting }, { resolveServiceProfile, regulationAppliesToTenant }] = await Promise.all([
    import('../analytics/policy-lint'), import('../analytics/policy-consistency'), import('../analytics/saf'), import('../../lib/care-setting'), import('../../lib/service-triggers'),
  ])
  const iso = (d: any) => (d ? new Date(d).toISOString() : null)
  const [lint, lintRaw, cons, wording, wordingRaw, regs, coverage, tenant, details, remediations] = await Promise.all([
    getTenantLint(tenantId).catch(() => null),
    (prisma as any).policyLintResult.findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, scanned_at: true } }).catch(() => []),
    getConsistency(tenantId).catch(() => null),
    getPolicyWordingAlignment(tenantId).catch(() => null),
    (prisma as any).policyWordingAlignment.findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, message: true, analysed_at: true } }).catch(() => []),
    (prisma as any).externalRegulation.findMany({ where: { is_active: true }, select: { reference_key: true, applies_to_settings: true, required_triggers: true } }).catch(() => []),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { reference_key: true, status: true, evidence_policy_id: true, analysed_at: true } }).catch(() => []),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true, service_profile: true } }).catch(() => null),
    (prisma as any).gapDetailCache.findMany({ where: { tenant_id: tenantId }, select: { reference_key: true, payload: true } }).catch(() => []),
    (prisma as any).gapRemediation.findMany({ where: { tenant_id: tenantId }, select: { reference_key: true } }).catch(() => []),
  ])

  // Step 1: the regulations in scope for this service, not already completed, that are only partly covered; each counts against the policy that owns the subject and any policy its fixes route to.
  const setting = facilityTypeToSetting(tenant?.facility_type)
  const profile = resolveServiceProfile(setting, (tenant?.service_profile ?? {}) as Record<string, unknown>)
  const inScope = new Set<string>((regs as any[]).filter(r => regulationAppliesToTenant(r, setting, profile)).map(r => r.reference_key))
  const completed = new Set<string>((remediations as any[]).map(r => r.reference_key))
  const targets = new Map<string, string[]>()
  for (const d of details as any[]) { const tp = (d?.payload as any)?.target_policies; if (Array.isArray(tp)) targets.set(d.reference_key, tp.map((t: any) => t?.id).filter(Boolean)) }
  const coverageCovered = new Map<string, number>(), coverageOpen = new Map<string, number>()
  for (const c of coverage as any[]) {
    if (!inScope.has(c.reference_key) || completed.has(c.reference_key)) continue
    if (c.status === 'covered' && c.evidence_policy_id) coverageCovered.set(c.evidence_policy_id, (coverageCovered.get(c.evidence_policy_id) ?? 0) + 1)
    if (c.status === 'partial') for (const id of new Set([c.evidence_policy_id, ...(targets.get(c.reference_key) ?? [])].filter(Boolean) as string[])) coverageOpen.set(id, (coverageOpen.get(id) ?? 0) + 1)
  }
  const coverageRun = iso((coverage as any[]).reduce((m: any, c: any) => (!m || new Date(c.analysed_at) > new Date(m) ? c.analysed_at : m), null))

  // Step 2: the content findings the Out-of-date step lists (review dates are shown separately there, ignored findings and policies marked updated are left out).
  const lintIssues = new Map<string, number>()
  for (const p of (lint?.policies ?? []) as any[]) lintIssues.set(p.policy_id, (p.findings ?? []).filter((f: any) => f.kind !== 'review_currency' && !f.ignored).length)
  const reviewState = new Map<string, string>(((lint?.review_currency?.policies ?? []) as any[]).map(r => [r.policy_id, r.state]))

  // Step 3: the conflicts the consistency step lists (dismissed ones and review date ones are left out).
  const conflictsBy = new Map<string, number>()
  for (const c of (cons?.conflicts ?? []) as any[]) for (const id of new Set((c.positions ?? []).map((x: any) => x.policy_id))) conflictsBy.set(id as string, (conflictsBy.get(id as string) ?? 0) + 1)

  // Step 4: the CQC wording the wording step lists (policies marked updated are left out).
  const wordingCount = new Map<string, number>(((wording?.policies ?? []) as any[]).map(w => [w.policy_id, Array.isArray(w.alignments) ? w.alignments.length : 0]))
  const ok = (wordingRaw as any[]).filter(w => w.message !== WORDING_FAILED_MESSAGE)   // a failed check is not a run

  return {
    coverageRun, coverageCovered, coverageOpen,
    lintRows: new Set((lintRaw as any[]).map(l => l.policy_id)), lintIssues, lintRun: new Map((lintRaw as any[]).map(l => [l.policy_id, iso(l.scanned_at)!])), reviewState,
    consAnalysed: !!cons?.analysed, consRun: cons?.analysed_at ?? null, conflictsBy,
    wordingRows: new Set(ok.map(w => w.policy_id)), wordingCount, wordingRun: new Map(ok.map(w => [w.policy_id, iso(w.analysed_at)!])),
  }
}

export async function loadHealth(tenantId: string): Promise<PolicyHealth[]> {
  const [policies, clarity, stress, checks, g, scenarios, docs] = await Promise.all([
    (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true, version: true, policy_type: true }, orderBy: { name: 'asc' } }),
    (prisma as any).policyClarityResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { policy_id: true, band: true, finding_count: true, metrics: true, summary: true, findings: true, created_at: true } }).catch(() => []),
    (prisma as any).policyStressResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { id: true, policy_id: true, scenario_id: true, scenario_title: true, scenario_version: true, points: true, gaps: true, created_at: true } }).catch(() => []),
    (prisma as any).policyHealthCheck.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { id: true, policy_id: true, policy_version: true, score: true, band: true, fixes: true, created_at: true } }).catch(() => []),
    loadGapViews(tenantId),
    (prisma as any).policyScenario.findMany({ where: { status: 'approved' }, select: { id: true, title: true, version: true, policy_types: true }, orderBy: { title: 'asc' } }).catch(() => []),
    (prisma as any).policyDocument.findMany({ where: { tenant_id: tenantId }, select: { id: true, policy_id: true } }).catch(() => []),
  ])
  // Changes adopted into each policy's draft, so a test result can say the policy has changed since, and health can say how many changes came from policy testing.
  const docToPolicy = new Map<string, string>((docs as any[]).map(d => [d.id, d.policy_id]))
  const changeRows = (docs as any[]).length ? await (prisma as any).policyDocumentChange.findMany({ where: { document_id: { in: (docs as any[]).map(d => d.id) }, reverted: false }, select: { document_id: true, reference_key: true, applied_at: true } }).catch(() => []) : []
  const changesBy = new Map<string, Array<{ ref: string; at: Date }>>()
  for (const c of changeRows as any[]) { const pid = docToPolicy.get(c.document_id); if (!pid) continue; const l = changesBy.get(pid) ?? []; l.push({ ref: String(c.reference_key ?? ''), at: new Date(c.applied_at) }); changesBy.set(pid, l) }
  const iso = (d: any) => (d ? new Date(d).toISOString() : null)
  const lastCheck = new Map<string, any>(); for (const c of checks as any[]) if (!lastCheck.has(c.policy_id)) lastCheck.set(c.policy_id, c)
  const clarityBy = new Map<string, any>(); for (const c of clarity as any[]) if (!clarityBy.has(c.policy_id)) clarityBy.set(c.policy_id, c)
  const stressLatest = new Map<string, any>(); for (const r of stress as any[]) { const k = `${r.policy_id}:${r.scenario_id}`; if (!stressLatest.has(k)) stressLatest.set(k, r) }

  return (policies as any[]).filter(p => isPolicyDocument(p.name ?? '')).map(p => {
    const covered = g.coverageCovered.get(p.id) ?? 0, partial = g.coverageOpen.get(p.id) ?? 0
    const lintN = g.lintRows.has(p.id) ? (g.lintIssues.get(p.id) ?? 0) : undefined
    const review = g.reviewState.get(p.id)
    const myConflicts = g.conflictsBy.get(p.id) ?? 0
    const wordingRan = g.wordingRows.has(p.id), wordingN = g.wordingCount.get(p.id) ?? 0
    const cl = clarityBy.get(p.id)
    const myStress = [...stressLatest.values()].filter(r => r.policy_id === p.id)
    const stressPoints = myStress.reduce((n, r) => n + (Array.isArray(r.points) ? r.points.length : 0), 0), stressGaps = myStress.reduce((n, r) => n + (r.gaps ?? 0), 0)
    // Policy testing: what is set up for this policy, what has been run, and what has changed because of it.
    const myChanges = changesBy.get(p.id) ?? []
    const available = (scenarios as any[]).filter(sc => (sc.policy_types ?? []).some((t: string) => policyMatchesType({ name: p.name, policy_type: p.policy_type }, t))).map(sc => ({ id: sc.id, title: sc.title, version: sc.version }))
    const availById = new Map(available.map(x => [x.id, x]))
    const testingResults: TestingResult[] = myStress.map((r: any) => {
      const pts: any[] = Array.isArray(r.points) ? r.points : []
      const notHere = pts.filter(x => x.verdict !== 'covered')
      return {
        id: r.id, scenario_id: r.scenario_id, title: r.scenario_title || availById.get(r.scenario_id)?.title || 'Situation', at: new Date(r.created_at).toISOString(),
        covered: pts.length - notHere.length, total: pts.length, elsewhere: notHere.filter(x => (x.elsewhere ?? []).some((e: any) => e.verdict === 'covered')).length, gaps: r.gaps ?? 0,
        scenario_changed: availById.has(r.scenario_id) && availById.get(r.scenario_id)!.version !== r.scenario_version,
        policy_changed: myChanges.some(c => c.at > new Date(r.created_at)),   // something was adopted into the policy after this test, so the result may be out of date
      }
    }).sort((a: TestingResult, b: TestingResult) => b.at.localeCompare(a.at))
    const testChanges = myChanges.filter(c => c.ref.startsWith('testing:'))
    const testing: TestingInfo = {
      available: available.map(x => ({ id: x.id, title: x.title })), results: testingResults, changes: testChanges.length,
      last_change_at: testChanges.length ? new Date(Math.max(...testChanges.map(c => c.at.getTime()))).toISOString() : null,
      stale: testingResults.filter(r => r.policy_changed || r.scenario_changed).length,
    }
    const testingDetail = available.length === 0 && testingResults.length === 0
      ? 'No policy testing is set up for this policy yet. Situations are added for each type of policy as they are approved.'
      : testingResults.length === 0
        ? `${available.length} ${available.length === 1 ? 'situation is' : 'situations are'} set up for this policy and none has been tested yet.`
        : `${testingResults.length} of ${Math.max(available.length, testingResults.length)} ${Math.max(available.length, testingResults.length) === 1 ? 'situation' : 'situations'} tested, ${stressGaps} ${stressGaps === 1 ? 'point' : 'points'} not covered anywhere in your library.`
          + (testing.changes > 0 ? ` ${testing.changes} ${testing.changes === 1 ? 'change has' : 'changes have'} been adopted into this policy because of policy testing.` : '')
          + (testing.stale > 0 ? ` ${testing.stale} ${testing.stale === 1 ? 'result is' : 'results are'} out of date because the policy or the situation has changed since, so test again.` : '')
    // Clarity as step 5 shows it: one shared function, so the two cannot disagree.
    const cs = clarityStatus(cl)
    const checks: CheckResult[] = cs ? cs.checks : HEALTH_CHECKS.map(c => ({ ...c, count: 0, band: 'none' as Band }))   // the seven checks always show; until clarity has been run each says so
    const readability = cs ? cs.readability : { band: 'none' as Band, detail: 'Measured when clarity is run.' }
    const clarityFinal: Band = cs ? cs.band : 'none'
    const reviewNote = review ? (review === 'overdue' ? ' Its review date is overdue (shown separately on the Gaps page).' : ' It has no review date set (shown separately on the Gaps page).') : ''

    const dims: Dim[] = [
      { key: 'coverage', label: DIM_LABEL.coverage, band: g.coverageRun ? coverageBand(covered, partial) : 'none', href: '/gaps', last_run: g.coverageRun,
        detail: g.coverageRun ? (partial > 0 ? `${partial} open regulation ${partial === 1 ? 'gap' : 'gaps'} for this policy on the Gaps page.` : covered > 0 ? `${covered} ${covered === 1 ? 'regulation' : 'regulations'} fully covered by this policy and nothing open.` : 'No regulation is open against this policy.') : 'The gap analysis has not been run yet.' },
      { key: 'uptodate', label: DIM_LABEL.uptodate, band: lintN === undefined ? 'none' : lintN === 0 ? 'strong' : lintN <= 2 ? 'good' : 'attention', href: '/gaps', last_run: g.lintRun.get(p.id) ?? null,
        detail: lintN === undefined ? 'Not checked yet.' : (lintN === 0 ? 'No out of date terms found.' : `${lintN} out of date ${lintN === 1 ? 'term' : 'terms'} to update.`) + reviewNote },
      { key: 'consistency', label: DIM_LABEL.consistency, band: g.consAnalysed ? (myConflicts === 0 ? 'strong' : myConflicts <= 1 ? 'good' : 'attention') : 'none', href: '/gaps', last_run: g.consRun,
        detail: g.consAnalysed ? (myConflicts === 0 ? 'No open conflicts with your other policies.' : `${myConflicts} open ${myConflicts === 1 ? 'conflict' : 'conflicts'} with other policies.`) : 'Cross-policy consistency has not been run yet.' },
      { key: 'wording', label: DIM_LABEL.wording, band: wordingRan ? (wordingN === 0 ? 'strong' : wordingN <= 2 ? 'good' : 'attention') : 'none', href: '/gaps', last_run: g.wordingRun.get(p.id) ?? null,
        detail: wordingRan ? (wordingN === 0 ? 'Nothing open: this policy reads in the way the CQC quality statements expect.' : `${wordingN} ${wordingN === 1 ? 'passage' : 'passages'} could be reworded to match the CQC quality statements.`) : 'The CQC wording analysis has not been run on this policy yet.' },
      { key: 'clarity', label: DIM_LABEL.clarity, band: clarityFinal, href: `/gaps?clarity=${p.id}`, last_run: iso(cl?.created_at), checks, readability,
        detail: cl ? `${cl.finding_count} ${cl.finding_count === 1 ? 'passage' : 'passages'} of unclear wording found. The seven checks and staff readability are below.` : 'Not run yet. Open step 5 on the Gaps page. The seven checks and staff readability fill in when it is run.' },
      { key: 'practical', label: DIM_LABEL.practical, band: practicalBand(stressGaps, stressPoints), href: `/stress-testing?policy=${p.id}`, last_run: iso(myStress.reduce((m: any, r: any) => (!m || new Date(r.created_at) > new Date(m) ? r.created_at : m), null)), testing, detail: testingDetail },
    ]
    for (const d of dims) d.value = bandValue(d.band)
    const o = scoreOf(dims)
    const lc = lastCheck.get(p.id)
    // Ready for step 5 (clarity and precision): steps 1 to 4 have each been run for this policy and have nothing open, exactly as the Gaps page shows them.
    const steps: PreStep[] = [
      { step: 1, label: 'Regulation coverage', done: !!g.coverageRun && partial === 0, detail: !g.coverageRun ? 'Not run yet' : partial > 0 ? `${partial} open regulation ${partial === 1 ? 'gap' : 'gaps'}` : 'Nothing open' },
      { step: 2, label: 'Out-of-date content', done: lintN !== undefined && lintN === 0, detail: lintN === undefined ? 'Not run yet' : lintN > 0 ? `${lintN} out of date ${lintN === 1 ? 'term' : 'terms'}` : 'Nothing open' },
      { step: 3, label: 'Cross-policy consistency', done: g.consAnalysed && myConflicts === 0, detail: !g.consAnalysed ? 'Not run yet' : myConflicts > 0 ? `${myConflicts} open ${myConflicts === 1 ? 'conflict' : 'conflicts'}` : 'Nothing open' },
      { step: 4, label: 'CQC wording', done: wordingRan && wordingN === 0, detail: !wordingRan ? 'Not run yet' : wordingN > 0 ? `${wordingN} wording ${wordingN === 1 ? 'suggestion' : 'suggestions'}` : 'Nothing open' },
    ]
    const waiting = steps.filter(x => !x.done).map(x => `step ${x.step} ${x.label.toLowerCase()} (${x.detail.toLowerCase()})`)
    return {
      id: p.id, name: p.name, overall: o.band, score: o.score, assessed: o.assessed, dims, fixes: topFixes(dims), ready: waiting.length === 0, waiting, steps,
      last_check: lc ? { id: lc.id, score: lc.score, band: lc.band as Band, at: new Date(lc.created_at).toISOString(), stale: (lc.policy_version ?? 1) !== (p.version ?? 1), fixes: Array.isArray(lc.fixes) ? lc.fixes : [] } : null,
    }
  })
}
