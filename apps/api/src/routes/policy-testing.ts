import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin, requireAdmin } from '../middleware/auth'
import { checkAiCreditLimit, logAiCredit, PlanLimitError } from '../lib/plan-limits'
import { policyTestingEnabled } from '../lib/policy-testing-pilot'
import { downloadExtractedText } from '../services/storage/s3'
import { isPolicyDocument } from '../lib/document-kind'
import { analyseClarity, clarityStatus, loadProtectedTexts, overlapsProtected } from '../services/policy-testing/clarity'
import { loadHealth, HEALTH_WEIGHTS } from '../services/policy-testing/health'
import type { Dim } from '../services/policy-testing/health'
import {
  POLICY_TYPES, policyTypeLabel, policyMatchesType, runStressTest, draftScenarios,
  STRESS_JUDGE_USAGE, SCENARIO_DRAFTER_USAGE, approvalProblems, type ExpectedPoint,
} from '../services/policy-testing/stress'

// Policy testing (pilot, CS-1001 only).
//   /admin/policy-testing   the platform owner's tab: scenario library, the judging map and the results
//   /stress                 an account's page: test one of its policies against an approved scenario

export const policyTestingAdminRouter = Router()
export const stressRouter = Router()

// ── Platform owner ───────────────────────────────────────────────────────────

policyTestingAdminRouter.use(requirePlatformAdmin)

/** Points saved before they carried a regulation take the scenario's only regulation, so they are judged the same way as new ones. */
const withRegKey = (points: ExpectedPoint[], keys: string[]): ExpectedPoint[] => (points ?? []).map(p => ({ ...p, regulation_key: p.regulation_key || (keys.length === 1 ? keys[0] : '') }))

/** Clean the points a person typed or the drafter returned: ids p1..pn, each with its source. */
function cleanPoints(input: any): ExpectedPoint[] {
  const list = Array.isArray(input) ? input : []
  return list.map((p: any, i: number) => ({
    id: `p${i + 1}`,
    text: String(p?.text ?? '').trim().slice(0, 500),
    source_label: String(p?.source_label ?? '').trim().slice(0, 200),
    source_url: /^https:\/\/\S+$/.test(String(p?.source_url ?? '').trim()) ? String(p.source_url).trim().slice(0, 500) : '',
    regulation_key: String(p?.regulation_key ?? '').trim().slice(0, 120),
    source_text: String(p?.source_text ?? '').trim().slice(0, 500),
  })).filter((p: ExpectedPoint) => p.text.length >= 8).slice(0, 15)
}
const strs = (v: any, max = 20) => (Array.isArray(v) ? v : []).map((x: any) => String(x ?? '').trim()).filter(Boolean).slice(0, max)

policyTestingAdminRouter.get('/overview', async (_req: Request, res: Response) => {
  try {
    const [scenarios, regs, results] = await Promise.all([
      (prisma as any).policyScenario.findMany({ orderBy: [{ status: 'asc' }, { created_at: 'desc' }] }),
      (prisma as any).externalRegulation.findMany({ where: { is_active: true }, select: { reference_key: true, official_name: true, authority_basis: true, summary: true, required_elements: true, authoritative_requirements: true, source_urls: true }, orderBy: { official_name: 'asc' } }),
      (prisma as any).policyStressResult.groupBy({ by: ['scenario_id'], _count: { _all: true }, _avg: { gaps: true } }).catch(() => []),
    ])
    const stats = new Map<string, any>((results as any[]).map(r => [r.scenario_id, r]))
    const prompts = await (prisma as any).aiPrompt.findMany({ where: { usage: { in: [STRESS_JUDGE_USAGE, SCENARIO_DRAFTER_USAGE] } }, select: { usage: true, label: true, updated_at: true } }).catch(() => [])
    const regByKey = new Map<string, any>((regs as any[]).map(r => [r.reference_key, r]))
    ok(res, {
      types: POLICY_TYPES.map(t => ({ key: t.key, label: t.label, group: t.group })),
      prompts,
      judge_usage: STRESS_JUDGE_USAGE, drafter_usage: SCENARIO_DRAFTER_USAGE,
      regulations: (regs as any[]).map(r => ({
        reference_key: r.reference_key, official_name: r.official_name, authority_basis: r.authority_basis,
        required_count: (r.required_elements ?? []).length, has_requirements: String(r.authoritative_requirements ?? '').trim().length >= 40,
        scenario_count: (scenarios as any[]).filter(s => (s.regulation_keys ?? []).includes(r.reference_key)).length,
        source_urls: r.source_urls ?? [], required_elements: r.required_elements ?? [],
      })),
      scenarios: (scenarios as any[]).map(s => ({
        ...s,
        problems: approvalProblems({ description: s.description, policy_types: s.policy_types ?? [], expected_points: withRegKey((s.expected_points ?? []) as ExpectedPoint[], s.regulation_keys ?? []) }),
        // The regulation records the scenario rests on, as held in /platform/regulations (the source of truth). Points saved before they carried a regulation fall back to the scenario's only regulation.
        regulations: (s.regulation_keys ?? []).map((k: string) => ({
          reference_key: k, official_name: regByKey.get(k)?.official_name ?? k, authority_basis: regByKey.get(k)?.authority_basis ?? '', summary: regByKey.get(k)?.summary ?? '',
          required_elements: regByKey.get(k)?.required_elements ?? [], source_urls: regByKey.get(k)?.source_urls ?? [],
        })),
        expected_points: ((s.expected_points ?? []) as ExpectedPoint[]).map(p => ({ ...p, regulation_key: p.regulation_key || ((s.regulation_keys ?? []).length === 1 ? s.regulation_keys[0] : '') })),
        runs: stats.get(s.id)?._count?._all ?? 0, avg_gaps: stats.get(s.id)?._avg?.gaps ?? null,
      })),
    })
  } catch (e: any) { err(res, 'OVERVIEW_FAILED', e?.message ?? 'Could not load policy testing.', 500) }
})

policyTestingAdminRouter.post('/scenarios', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const title = String(b.title ?? '').trim().slice(0, 160)
  if (title.length < 5) { err(res, 'VALIDATION_ERROR', 'Give the scenario a title.', 400); return }
  const row = await (prisma as any).policyScenario.create({ data: {
    title, description: String(b.description ?? '').trim().slice(0, 1200), policy_types: strs(b.policy_types), settings: strs(b.settings),
    regulation_keys: strs(b.regulation_keys), expected_points: cleanPoints(b.expected_points), extra_instructions: String(b.extra_instructions ?? '').trim().slice(0, 1500), status: 'draft',
  } })
  ok(res, { scenario: row })
})

policyTestingAdminRouter.put('/scenarios/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const cur = await (prisma as any).policyScenario.findUnique({ where: { id } })
  if (!cur) { err(res, 'NOT_FOUND', 'Scenario not found.', 404); return }
  const b = req.body ?? {}
  const points = b.expected_points !== undefined ? cleanPoints(b.expected_points) : (cur.expected_points as ExpectedPoint[])
  const changed = JSON.stringify(points) !== JSON.stringify(cur.expected_points) || (b.description !== undefined && String(b.description).trim() !== cur.description)
  const row = await (prisma as any).policyScenario.update({ where: { id }, data: {
    ...(b.title !== undefined ? { title: String(b.title).trim().slice(0, 160) } : {}),
    ...(b.description !== undefined ? { description: String(b.description).trim().slice(0, 1200) } : {}),
    ...(b.policy_types !== undefined ? { policy_types: strs(b.policy_types) } : {}),
    ...(b.settings !== undefined ? { settings: strs(b.settings) } : {}),
    ...(b.regulation_keys !== undefined ? { regulation_keys: strs(b.regulation_keys) } : {}),
    ...(b.extra_instructions !== undefined ? { extra_instructions: String(b.extra_instructions).trim().slice(0, 1500) } : {}),
    expected_points: points,
    ...(changed ? { version: cur.version + 1 } : {}),   // a changed scenario is a new version, so a result can always be traced to the version it was run on
  } })
  ok(res, { scenario: row })
})

policyTestingAdminRouter.patch('/scenarios/:id/status', async (req: Request, res: Response) => {
  const status = req.body?.status
  if (status !== 'approved' && status !== 'draft') { err(res, 'VALIDATION_ERROR', "status must be 'approved' or 'draft'.", 400); return }
  const id = String(req.params.id)
  const cur = await (prisma as any).policyScenario.findUnique({ where: { id } })
  if (!cur) { err(res, 'NOT_FOUND', 'Scenario not found.', 404); return }
  if (status === 'approved') {
    const problems = approvalProblems({ description: cur.description, policy_types: cur.policy_types ?? [], expected_points: withRegKey((cur.expected_points ?? []) as ExpectedPoint[], cur.regulation_keys ?? []) })
    if (problems.length) { err(res, 'NOT_READY', problems.join(' '), 400); return }
  }
  const row = await (prisma as any).policyScenario.update({ where: { id }, data: { status } })
  ok(res, { scenario: row })
})

policyTestingAdminRouter.delete('/scenarios/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const cur = await (prisma as any).policyScenario.findUnique({ where: { id } })
  if (!cur) { err(res, 'NOT_FOUND', 'Scenario not found.', 404); return }
  if (cur.status !== 'draft') { err(res, 'NOT_DRAFT', 'Only a draft can be deleted. Move it back to draft first.', 400); return }
  await (prisma as any).policyScenario.delete({ where: { id } })
  ok(res, { deleted: id })
})

// Draft scenarios from one regulation. Drafts only; the owner reviews every point and its source before approving.
policyTestingAdminRouter.post('/draft', async (req: Request, res: Response) => {
  const regulationKey = String(req.body?.regulation_key ?? '').trim(), policyType = String(req.body?.policy_type ?? '').trim()
  if (!regulationKey || !POLICY_TYPES.some(t => t.key === policyType)) { err(res, 'VALIDATION_ERROR', 'Choose a regulation and a policy type.', 400); return }
  const r = await draftScenarios({ regulationKey, policyType, count: Number(req.body?.count) || 2 })
  if (r.error) { err(res, 'DRAFT_FAILED', r.error, 422); return }
  ok(res, { created: r.created })
})

policyTestingAdminRouter.get('/results', async (_req: Request, res: Response) => {
  try {
    const rows = await (prisma as any).policyStressResult.findMany({ orderBy: { created_at: 'desc' }, take: 100 })
    const tenants = await (prisma as any).tenant.findMany({ where: { id: { in: [...new Set((rows as any[]).map(r => r.tenant_id))] } }, select: { id: true, account_number: true, name: true } }).catch(() => [])
    const tById = new Map<string, any>((tenants as any[]).map(t => [t.id, t]))
    ok(res, { results: (rows as any[]).map(r => ({
      id: r.id, created_at: r.created_at, account_number: tById.get(r.tenant_id)?.account_number ?? '', tenant_name: tById.get(r.tenant_id)?.name ?? '',
      policy_name: r.policy_name, scenario_id: r.scenario_id, scenario_title: r.scenario_title, scenario_version: r.scenario_version, gaps: r.gaps,
      points: r.points, summary: r.summary, prompt_hash: r.prompt_hash,
    })) })
  } catch (e: any) { err(res, 'RESULTS_FAILED', e?.message ?? 'Could not load results.', 500) }
})

// ── An account's page (pilot) ────────────────────────────────────────────────

stressRouter.get('/meta', requireAdmin, async (_req: Request, res: Response) => {
  ok(res, { enabled: await policyTestingEnabled(getTenantId()) })
})

async function guard(res: Response): Promise<string | null> {
  const tenantId = getTenantId()
  if (!(await policyTestingEnabled(tenantId))) { err(res, 'NOT_AVAILABLE', 'This is not available for your account yet.', 404); return null }
  return tenantId
}

// The policies and the approved scenarios that fit each, with the latest result for each pair.
stressRouter.get('/library', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try {
    const [policies, scenarios, results] = await Promise.all([
      (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active' }, select: { id: true, name: true, policy_type: true }, orderBy: { name: 'asc' } }),
      (prisma as any).policyScenario.findMany({ where: { status: 'approved' }, orderBy: { title: 'asc' } }),
      (prisma as any).policyStressResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, take: 300 }),
    ])
    const latest = new Map<string, any>()
    for (const r of results as any[]) { const k = `${r.policy_id}:${r.scenario_id}`; if (!latest.has(k)) latest.set(k, r) }
    const docs = (policies as any[]).filter(p => isPolicyDocument(p.name ?? ''))
    const rows = docs.map(p => ({
      id: p.id, name: p.name,
      scenarios: (scenarios as any[]).filter(s => (s.policy_types ?? []).some((t: string) => policyMatchesType(p, t))).map(s => {
        const r = latest.get(`${p.id}:${s.id}`)
        return { id: s.id, title: s.title, version: s.version, last: r ? { id: r.id, gaps: r.gaps, at: r.created_at, outdated: r.scenario_version !== s.version } : null }
      }),
    })).filter(p => p.scenarios.length > 0)
    ok(res, { policies: rows, types: POLICY_TYPES.map(t => ({ key: t.key, label: t.label })) })
  } catch (e: any) { err(res, 'LIBRARY_FAILED', e?.message ?? 'Could not load policy testing.', 500) }
})

/** A policy test result as the page shows it: a suggestion that would rewrite wording an adopted change has already written or replaced is not put forward again. */
const shapeStress = async (row: any, tenantId: string) => {
  const prot = (await loadProtectedTexts(tenantId, row.policy_id)).get(row.policy_id) ?? []
  const points = (Array.isArray(row.points) ? row.points : []).map((p: any) => (p.quote && p.suggested_wording && overlapsProtected(p.quote, prot) ? { ...p, suggested_wording: '', suggestion_blocked: true } : p))
  return { ...row, points }
}

stressRouter.get('/result/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  const r = await (prisma as any).policyStressResult.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
  if (!r) { err(res, 'NOT_FOUND', 'Result not found.', 404); return }
  ok(res, { result: await shapeStress(r, tenantId) })
})

stressRouter.post('/run', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try {
    const policyId = String(req.body?.policy_id ?? ''), scenarioId = String(req.body?.scenario_id ?? '')
    const [policy, scenario] = await Promise.all([
      (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId, status: 'active' }, select: { id: true, name: true, policy_type: true } }),
      (prisma as any).policyScenario.findFirst({ where: { id: scenarioId, status: 'approved' } }),
    ])
    if (!policy || !scenario) { err(res, 'NOT_FOUND', 'That policy or scenario was not found.', 404); return }
    if (!(scenario.policy_types ?? []).some((t: string) => policyMatchesType(policy, t))) { err(res, 'NOT_MATCHED', 'That scenario is not for this kind of policy.', 400); return }
    const text = await downloadExtractedText(tenantId, policy.id).catch(() => null)
    if (!text || text.trim().length < 200) { err(res, 'NO_TEXT', 'The text of this policy could not be read, so it cannot be tested.', 422); return }
    await checkAiCreditLimit(tenantId)
    const j = await runStressTest({ tenantId, policyId: policy.id, policyName: policy.name, policyText: text, scenario: { title: scenario.title, description: scenario.description, expected_points: scenario.expected_points as ExpectedPoint[], extra_instructions: scenario.extra_instructions } })
    if (!j) { err(res, 'JUDGE_FAILED', 'The policy could not be read in full this time, so no result was recorded. Please try again.', 502); return }
    await logAiCredit(tenantId, 'policy_stress_test', null)
    const row = await (prisma as any).policyStressResult.create({ data: {
      tenant_id: tenantId, policy_id: policy.id, policy_name: policy.name, scenario_id: scenario.id, scenario_version: scenario.version, scenario_title: scenario.title,
      points: j.points, summary: j.summary, gaps: j.gaps, prompt_hash: j.prompt_hash, run_by: String((req as any).user?.id ?? ''),
    } })
    ok(res, { result: await shapeStress(row, tenantId) })
  } catch (e: any) {
    if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return }
    err(res, 'RUN_FAILED', 'The test could not be completed this time. Please try again.', 500)
  }
})

// ── Policy clarity and precision (pilot) ─────────────────────────────────────

/** A clarity result as every screen shows it: the band, the seven checks and staff readability worked out by the shared function, never read raw from the row. */
const shapeClarity = async (row: any, tenantId: string) => {
  const prot = (await loadProtectedTexts(tenantId, row.policy_id)).get(row.policy_id) ?? []
  const cs = clarityStatus(row, prot)
  return { ...row, findings: cs ? cs.visible.map(v => (row.findings as any[]).find(f => f.quote === v.quote) ?? v) : row.findings, finding_count: cs?.findings ?? row.finding_count, suppressed: cs?.suppressed ?? 0, band: cs?.band ?? row.band, checks: cs?.checks ?? [], readability: cs?.readability ?? null }
}

stressRouter.get('/clarity/library', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try {
    const protectedBy = await loadProtectedTexts(tenantId)
    const [health, results] = await Promise.all([loadHealth(tenantId), (prisma as any).policyClarityResult.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, distinct: ['policy_id'], select: { id: true, policy_id: true, finding_count: true, findings: true, metrics: true, created_at: true } })])
    const latest = new Map<string, any>(); for (const r of results as any[]) latest.set(r.policy_id, r)
    ok(res, { policies: health.map(h => { const l = latest.get(h.id), cs = clarityStatus(l, protectedBy.get(h.id) ?? []); return { id: h.id, name: h.name, ready: h.ready, waiting: h.waiting, steps: h.steps, last: l && cs ? { id: l.id, band: cs.band, findings: cs.findings, at: l.created_at } : null } }) })
  } catch (e: any) { err(res, 'LIBRARY_FAILED', e?.message ?? 'Could not load policy clarity.', 500) }
})

stressRouter.get('/clarity/result/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  const r = await (prisma as any).policyClarityResult.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
  if (!r) { err(res, 'NOT_FOUND', 'Result not found.', 404); return }
  ok(res, { result: await shapeClarity(r, tenantId) })
})

// A policy that still has open regulation gaps, out of date terms or conflicts is not ready: rewriting wording that is about to change wastes effort. The administrator can run it anyway.
stressRouter.post('/clarity/run', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try {
    const policyId = String(req.body?.policy_id ?? '')
    const policy = await (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId, status: 'active' }, select: { id: true, name: true } })
    if (!policy) { err(res, 'NOT_FOUND', 'That policy was not found.', 404); return }
    if (req.body?.force !== true) {
      const h = (await loadHealth(tenantId)).find(x => x.id === policyId)
      if (h && !h.ready) { err(res, 'NOT_READY', `This policy is waiting for: ${h.waiting.join(', ')}. Fix those first, or run it anyway.`, 409); return }
    }
    const text = await downloadExtractedText(tenantId, policy.id).catch(() => null)
    if (!text || text.trim().length < 200) { err(res, 'NO_TEXT', 'The text of this policy could not be read, so it cannot be checked.', 422); return }
    await checkAiCreditLimit(tenantId)
    const j = await analyseClarity({ policyName: policy.name, policyText: text, protectedTexts: (await loadProtectedTexts(tenantId, policy.id)).get(policy.id) ?? [] })
    if (!j) { err(res, 'ANALYSIS_FAILED', 'The policy could not be read in full this time, so no result was recorded. Please try again.', 502); return }
    await logAiCredit(tenantId, 'policy_clarity', null)
    const row = await (prisma as any).policyClarityResult.create({ data: {
      tenant_id: tenantId, policy_id: policy.id, policy_name: policy.name, findings: j.findings, metrics: j.metrics, band: j.band, finding_count: j.findings.length,
      summary: j.summary, prompt_hash: j.prompt_hash, run_by: String((req as any).user?.id ?? ''),
    } })
    ok(res, { result: await shapeClarity(row, tenantId) })
  } catch (e: any) {
    if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return }
    err(res, 'RUN_FAILED', 'The check could not be completed this time. Please try again.', 500)
  }
})

// ── Policy health (pilot): the roll up ───────────────────────────────────────

stressRouter.get('/health', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try { ok(res, { policies: await loadHealth(tenantId), weights: HEALTH_WEIGHTS }) } catch (e: any) { err(res, 'HEALTH_FAILED', e?.message ?? 'Could not load policy health.', 500) }
})

// ── Run health check (pilot): one policy, everything that can be run for it ──
// The browser runs the steps one at a time (clarity, then each situation, then this snapshot) so each stays well inside the time limit and the person sees progress.
// Regulation coverage, out of date terms and consistency work across the whole library, so they use the latest results and say when they were last run.

stressRouter.get('/health/plan', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try {
    const policy = await (prisma as any).policy.findFirst({ where: { id: String(req.query.policy_id ?? ''), tenant_id: tenantId, status: 'active' }, select: { id: true, name: true, policy_type: true } })
    if (!policy) { err(res, 'NOT_FOUND', 'That policy was not found.', 404); return }
    const scenarios = (await (prisma as any).policyScenario.findMany({ where: { status: 'approved' }, select: { id: true, title: true, policy_types: true }, orderBy: { title: 'asc' } }))
      .filter((s: any) => (s.policy_types ?? []).some((t: string) => policyMatchesType(policy, t)))
    ok(res, { policy: { id: policy.id, name: policy.name }, scenarios: scenarios.map((s: any) => ({ id: s.id, title: s.title })), credits: { clarity: 1, stress: scenarios.length, total: 1 + scenarios.length } })
  } catch (e: any) { err(res, 'PLAN_FAILED', e?.message ?? 'Could not plan the health check.', 500) }
})

stressRouter.post('/health/snapshot', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = await guard(res); if (!tenantId) return
  try {
    const policyId = String(req.body?.policy_id ?? '')
    const policy = await (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId, status: 'active' }, select: { id: true, name: true, version: true } })
    const h = (await loadHealth(tenantId)).find(x => x.id === policyId)
    if (!policy || !h) { err(res, 'NOT_FOUND', 'That policy was not found.', 404); return }
    if (h.score === null) { err(res, 'NOT_ENOUGH', `Only ${h.assessed} of 6 checks could be assessed, and a score needs at least 3. Run the gap analysis on the Gaps page, then check again.`, 422); return }
    const row = await (prisma as any).policyHealthCheck.create({ data: {
      tenant_id: tenantId, policy_id: policy.id, policy_name: policy.name, policy_version: policy.version ?? 1, score: h.score, band: h.overall, assessed: h.assessed,
      dims: h.dims as Dim[], fixes: h.fixes, included_stress: req.body?.included_stress !== false, run_by: String((req as any).user?.id ?? ''),
    } })
    ok(res, { check: { id: row.id, score: row.score, band: row.band, assessed: row.assessed, dims: h.dims, fixes: h.fixes, at: row.created_at } })
  } catch (e: any) { err(res, 'SNAPSHOT_FAILED', e?.message ?? 'Could not work out the score.', 500) }
})
