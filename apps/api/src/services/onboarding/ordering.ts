// Cross-plan onboarding-email ordering.
//
// Plans are cumulative: Starter's core emails also appear in Professional and
// Enterprise; the Pro block also appears in Enterprise. Each email has a stable
// `template_key` (shared across plans) and a single canonical `sort_order`. A
// plan "owns" an email if it is the lowest plan that contains it. The editor
// only shows a plan its OWN emails; reordering an owned email flows up to every
// plan that contains it, because they share the key + sort_order.

import { prisma } from '../../db/client'

export type PlanKey = 'starter' | 'professional' | 'enterprise'
export const PLAN_RANK: Record<PlanKey, number> = { starter: 0, professional: 1, enterprise: 2 }

type Row = { id: string; plan: string; template_key: string | null; sort_order: number | null }

// Which plan introduces each template_key (the lowest-rank plan that has it).
export async function ownerByKey(): Promise<Map<string, PlanKey>> {
  const rows: Row[] = await (prisma as any).onboardingEmail.findMany({ select: { plan: true, template_key: true } })
  const owner = new Map<string, PlanKey>()
  for (const r of rows) {
    if (!r.template_key) continue
    const plan = r.plan as PlanKey
    const cur = owner.get(r.template_key)
    if (cur == null || PLAN_RANK[plan] < PLAN_RANK[cur]) owner.set(r.template_key, plan)
  }
  return owner
}

// Recompute day_index for every plan from sort_order (two-phase to avoid the
// (plan, day_index) unique constraint mid-update).
export async function recomputeDayIndex(): Promise<void> {
  const rows: Row[] = await (prisma as any).onboardingEmail.findMany({ select: { id: true, plan: true, sort_order: true } })
  const byPlan = new Map<string, Row[]>()
  for (const r of rows) {
    const arr = byPlan.get(r.plan) ?? []
    arr.push(r)
    byPlan.set(r.plan, arr)
  }
  const finals: Array<{ id: string; day_index: number }> = []
  for (const list of byPlan.values()) {
    list.sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
    list.forEach((r, i) => finals.push({ id: r.id, day_index: i + 1 }))
  }
  await (prisma as any).$transaction([
    ...finals.map((f) => (prisma as any).onboardingEmail.update({ where: { id: f.id }, data: { day_index: -f.day_index } })),
    ...finals.map((f) => (prisma as any).onboardingEmail.update({ where: { id: f.id }, data: { day_index: f.day_index } })),
  ])
}

// Emails a plan OWNS (introduces), in send order, with their day_index in that plan.
export async function ownedEmails(plan: PlanKey): Promise<any[]> {
  const owner = await ownerByKey()
  const rows = await (prisma as any).onboardingEmail.findMany({ where: { plan }, orderBy: { day_index: 'asc' } })
  return rows.filter((r: any) => r.template_key && owner.get(r.template_key) === plan)
}

// Reorder a plan's owned emails. `ids` = the owned email ids in the new order.
// Their template_keys are re-spaced within their current sort_order band, so
// they stay inside their block (and above/below neighbouring blocks), then every
// plan's day_index is recomputed.
export async function reorderOwned(plan: PlanKey, ids: string[]): Promise<void> {
  const owner = await ownerByKey()
  const rows = await (prisma as any).onboardingEmail.findMany({
    where: { id: { in: ids } }, select: { id: true, plan: true, template_key: true, sort_order: true },
  })
  const byId = new Map<string, Row>(rows.map((r: Row) => [r.id, r]))
  // Validate: every id belongs to `plan` and is owned by it.
  for (const id of ids) {
    const r = byId.get(id)
    if (!r || r.plan !== plan || !r.template_key || owner.get(r.template_key) !== plan) {
      throw new Error('ids must be this plan\'s own emails')
    }
  }
  const sorts = rows.map((r: Row) => r.sort_order ?? 0)
  const min = Math.min(...sorts)
  const max = Math.max(...sorts)
  const n = ids.length
  const step = n > 1 ? (max - min) / (n - 1) : 0

  for (let i = 0; i < n; i++) {
    const key = byId.get(ids[i])!.template_key!
    const newSort = Math.round(min + step * i)
    await (prisma as any).onboardingEmail.updateMany({ where: { template_key: key }, data: { sort_order: newSort } })
  }
  await recomputeDayIndex()
}
