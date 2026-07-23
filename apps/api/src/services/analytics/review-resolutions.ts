import { prisma } from '../../db/client'

// "Mark as updated" resolutions for the out-of-date (lint) and CQC-wording sections.
// A resolution hides a policy from its section list until the next full (re)scan of that
// section clears it, so anything still flagged re-surfaces. Coverage uses GapRemediation
// and cross-policy consistency uses PolicyConsistency.dismissed instead.

export type ReviewSection = 'out_of_date' | 'wording'

// The set of policy_ids the tenant has marked updated for a section.
export async function resolvedPolicyIds(tenantId: string, section: ReviewSection): Promise<Set<string>> {
  const rows = await (prisma as any).policyReviewResolution
    .findMany({ where: { tenant_id: tenantId, section }, select: { policy_id: true } })
    .catch(() => [])
  return new Set((rows as any[]).map(r => r.policy_id))
}

export async function resolveSection(tenantId: string, policyId: string, section: ReviewSection, resolvedBy?: string | null): Promise<void> {
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
