// Funnel events for the Free tier, written to the existing audit_logs table (event_type prefixed
// free_). Test tenants (feature_flags.is_test, made with the preview code) never write events, so
// Len's own testing stays out of every number. Fire and forget: an event can never break a request.
//
//   free_signup               tenant registered on the Free tier (metadata: domain class)
//   free_audit_completed      an audit finished on Free (metadata: n, recommendations locked)
//   free_policy_slot_claimed  a policy counted against the 5 (metadata: used, limit)
//   free_gap_run              a gap analysis section started (metadata: section)
//   free_gap_detail_taster    one of the 3 example wordings opened (metadata: n)
//   free_limit_hit            a limit stopped something (metadata: kind)
//   free_upgrade_click        the Upgrade button clicked (metadata: source)
//   free_upgraded             Free became a paid plan (metadata: plan, days_since_signup)
//   free_downgraded           a paid tenant fell back to Free

import { prisma } from '../db/client'

export type FreeEvent =
  | 'free_signup' | 'free_audit_completed' | 'free_policy_slot_claimed' | 'free_gap_run'
  | 'free_gap_detail_taster' | 'free_limit_hit' | 'free_upgrade_click' | 'free_upgraded' | 'free_downgraded'

export async function freeEvent(tenantId: string, event: FreeEvent, metadata: Record<string, unknown> = {}, userId?: string | null): Promise<void> {
  try {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { feature_flags: true } })
    if ((t?.feature_flags as any)?.is_test) return
    await (prisma as any).auditLog.create({
      data: { tenant_id: tenantId, user_id: userId ?? null, event_type: event, entity_type: 'tenant', entity_id: tenantId, metadata },
    })
  } catch (e) { console.error('[free-events] failed', event, e) }
}
