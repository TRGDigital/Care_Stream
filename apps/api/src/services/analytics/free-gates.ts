// Gap analysis rules that only apply to Free tenants. Each function is a no op for any other tier.

import { prisma } from '../../db/client'
import { PlanLimitError } from '../../lib/plan-limits'
import { counterTake, monthKey } from '../../lib/free-tier'
import { freeEvent } from '../../lib/free-events'

export const FREE_DETAIL_TASTER = 3

type Section = 'coverage' | 'out_of_date' | 'wording' | 'consistency'

async function isFree(tenantId: string): Promise<boolean> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
  return t?.tier === 'free'
}

/** Re-run rule: a Free tenant can start a section again only when a policy was added or published
 *  since that section last ran, plus one forced re-run per section per calendar month (which also
 *  picks up regulation updates). The first ever run is always allowed. Resuming an interrupted run
 *  never calls start, so it never counts. Throws 409-style PlanLimitError FREE_NOTHING_CHANGED. */
export async function assertFreeRerun(tenantId: string, section: Section): Promise<void> {
  if (!(await isFree(tenantId))) return
  const run = await (prisma as any).gapsSectionRun.findUnique({ where: { tenant_id_section: { tenant_id: tenantId, section } } })
  if (!run) { void freeEvent(tenantId, 'free_gap_run', { section, first: true }); return }
  const ranAt: Date = run.ran_at
  const [published, added] = await Promise.all([
    (prisma as any).policyDocument.count({ where: { tenant_id: tenantId, published_at: { gt: ranAt } } }).catch(() => 0),
    (prisma as any).policy.count({ where: { tenant_id: tenantId, status: 'active', created_at: { gt: ranAt } } }),
  ])
  if (published + added > 0) { void freeEvent(tenantId, 'free_gap_run', { section, reason: 'policy_changed' }); return }
  if (await counterTake(tenantId, `rerun:${section}`, 1, monthKey())) { void freeEvent(tenantId, 'free_gap_run', { section, reason: 'monthly' }); return }
  void freeEvent(tenantId, 'free_limit_hit', { kind: 'rerun_cap', section })
  throw new PlanLimitError('FREE_NOTHING_CHANGED',
    'Your policies have not changed since this last ran. Add or update a policy to run it again, or try again next month. Your results are still here.')
}

/** The "what to add" drill in is paid, with a taster of 3 lifetime. A detail that is already
 *  generated and cached is free to open again. Regenerating (force) is paid. */
export async function assertFreeDetailAllowed(tenantId: string, referenceKey: string, force: boolean): Promise<void> {
  if (!(await isFree(tenantId))) return
  const locked = () => { void freeEvent(tenantId, 'free_limit_hit', { kind: 'detail_paid_only' }); return new PlanLimitError('FREE_DETAIL_LOCKED',
    'The example wording for each gap is part of the paid plans. Your free account includes 3 examples, and you have used them. Your results are still here.') }
  if (force) throw locked()
  const cached = await (prisma as any).gapDetailCache.findFirst({ where: { tenant_id: tenantId, reference_key: referenceKey }, select: { reference_key: true } }).catch(() => null)
  if (cached) return
  if (!(await counterTake(tenantId, 'gap_detail_taster', FREE_DETAIL_TASTER))) throw locked()
  void freeEvent(tenantId, 'free_gap_detail_taster', {})
}
