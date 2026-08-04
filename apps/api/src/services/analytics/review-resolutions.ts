import { prisma } from '../../db/client'

// "Mark as updated" resolutions for the out-of-date (lint) and CQC-wording sections.
// A resolution is DURABLE across re-scans (the admin's attestation is not lost): a policy
// only re-surfaces when its content changed after it was marked, or the mark is older than
// the policy's review interval. Coverage uses GapRemediation and cross-policy consistency
// uses PolicyConsistency.dismissed instead.

export type ReviewSection = 'out_of_date' | 'wording'

// The set of policy_ids whose "mark as updated" is still in force. A resolution lapses
// (and is lazily deleted) when the policy content changed after it was marked, or when
// it is older than the policy's review interval — so genuinely stale policies re-surface.
const RESOLUTION_GRACE_MS = 10_000 // our own review-date stamp bumps updated_at just before resolving

export async function resolvedPolicyIds(tenantId: string, section: ReviewSection): Promise<Set<string>> {
  const rows = await (prisma as any).policyReviewResolution
    .findMany({ where: { tenant_id: tenantId, section }, select: { policy_id: true, resolved_at: true } })
    .catch(() => [])
  if (!(rows as any[]).length) return new Set()

  const policies = await (prisma as any).policy
    .findMany({
      where:  { id: { in: (rows as any[]).map(r => r.policy_id) } },
      select: { id: true, updated_at: true, review_interval_days: true },
    })
    .catch(() => [])
  const byId = new Map((policies as any[]).map(p => [p.id, p]))

  const now = Date.now()
  const active = new Set<string>()
  const lapsed: string[] = []
  for (const r of rows as any[]) {
    const pol = byId.get(r.policy_id)
    const resolvedAt = new Date(r.resolved_at).getTime()
    const changedSince = pol && new Date(pol.updated_at).getTime() > resolvedAt + RESOLUTION_GRACE_MS
    const intervalDays = pol?.review_interval_days ?? 365
    const expired = resolvedAt + intervalDays * 86_400_000 < now
    if (!pol || changedSince || expired) lapsed.push(r.policy_id)
    else active.add(r.policy_id)
  }
  if (lapsed.length) {
    await (prisma as any).policyReviewResolution
      .deleteMany({ where: { tenant_id: tenantId, section, policy_id: { in: lapsed } } })
      .catch(() => {})
  }
  return active
}

export async function resolveSection(tenantId: string, policyId: string, section: ReviewSection, resolvedBy?: string | null): Promise<void> {
  // Marking as updated is a review: stamp the policy's review date FIRST so the
  // resulting updated_at bump lands inside the resolution's grace window.
  await (prisma as any).policy
    .update({ where: { id: policyId }, data: { last_reviewed_at: new Date() } })
    .catch(() => {})
  await (prisma as any).policyReviewResolution.upsert({
    where:  { tenant_id_policy_id_section: { tenant_id: tenantId, policy_id: policyId, section } },
    update: { resolved_at: new Date(), resolved_by: resolvedBy ?? null },
    create: { tenant_id: tenantId, policy_id: policyId, section, resolved_by: resolvedBy ?? null },
  })
}

export async function reopenSection(tenantId: string, policyId: string, section: ReviewSection): Promise<void> {
  await (prisma as any).policyReviewResolution
    .deleteMany({ where: { tenant_id: tenantId, policy_id: policyId, section } })
    .catch(() => {})
}

// Clear resolutions so a fresh scan re-surfaces anything still flagged. Pass policyIds to clear
// only specific policies (used by the dashboard "re-review these policies" action).
export async function clearResolutions(tenantId: string, section?: ReviewSection, policyIds?: string[]): Promise<void> {
  const where: any = { tenant_id: tenantId }
  if (section) where.section = section
  if (policyIds && policyIds.length) where.policy_id = { in: policyIds }
  await (prisma as any).policyReviewResolution.deleteMany({ where }).catch(() => {})
}

// The tenant's still-active resolutions with policy names — powers the
// "Recently updated" list on the gaps page.
export async function listResolutions(tenantId: string): Promise<Array<{ policy_id: string; policy_name: string; section: ReviewSection; resolved_by: string | null; resolved_at: string }>> {
  const rows = await (prisma as any).policyReviewResolution
    .findMany({ where: { tenant_id: tenantId }, orderBy: { resolved_at: 'desc' }, take: 100 })
    .catch(() => [])
  if (!(rows as any[]).length) return []
  const policies = await (prisma as any).policy
    .findMany({ where: { id: { in: (rows as any[]).map((r: any) => r.policy_id) } }, select: { id: true, name: true } })
    .catch(() => [])
  const names = new Map((policies as any[]).map((p: any) => [p.id, p.name]))
  return (rows as any[]).map((r: any) => ({
    policy_id: r.policy_id,
    policy_name: names.get(r.policy_id) ?? 'Policy',
    section: r.section,
    resolved_by: r.resolved_by ?? null,
    resolved_at: new Date(r.resolved_at).toISOString(),
  }))
}
