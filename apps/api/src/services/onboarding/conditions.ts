// Send-time predicates for campaign emails.
//
// The plan drip is purely time-based: day 5 arrives, day 5 sends. Product
// campaigns cannot work that way. Telling someone their licence is sitting
// unallocated is useful on Tuesday and wrong on Wednesday if they allocated it
// on Tuesday night, and a policy cannot be introduced before it has been
// written.
//
// So each campaign email may carry a condition, checked at the moment of
// sending, and a rule for what to do when it is false:
//
//   skip — this email no longer applies; move past it and never send it
//   wait — the sequence holds here until it is true, up to hold_max_days
//
// Predicates are deliberately cheap: one indexed query each, no AI, no joins
// beyond the tenant. They run per enrolment per day.

import { prisma } from '../../db/client'

export type ConditionResult = boolean

/** Every predicate a campaign email may name. Unknown names evaluate true, so a
 *  typo can never silently hold a whole sequence. */
const PREDICATES: Record<string, (tenantId: string) => Promise<ConditionResult>> = {
  // ─── Training shop ──────────────────────────────────────────────────────────

  /** True while at least one purchased licence is still allocated to nobody. */
  licence_unallocated: async (tenantId) => {
    const n = await (prisma as any).trainingLicense.count({
      where: { tenant_id: tenantId, status: 'active', user_id: null },
    })
    return n > 0
  },

  /** True once every purchased licence has someone against it. */
  licence_allocated: async (tenantId) => {
    const n = await (prisma as any).trainingLicense.count({
      where: { tenant_id: tenantId, status: 'active', user_id: null },
    })
    return n === 0
  },

  /** True once somebody has actually finished a module. */
  training_completed: async (tenantId) => {
    const n = await (prisma as any).trainingEnrollment.count({
      where: { tenant_id: tenantId, completed_at: { not: null } },
    })
    return n > 0
  },

  /** True while a licence has been allocated but nobody has finished anything. */
  training_not_started: async (tenantId) => {
    const [allocated, done] = await Promise.all([
      (prisma as any).trainingLicense.count({ where: { tenant_id: tenantId, status: 'active', user_id: { not: null } } }),
      (prisma as any).trainingEnrollment.count({ where: { tenant_id: tenantId, completed_at: { not: null } } }),
    ])
    return allocated > 0 && done === 0
  },

  // ─── Policy shop ────────────────────────────────────────────────────────────

  /** True while a paid policy is still waiting on the buyer's intake answers.
   *  Nothing can be written until this is done, which makes it the single most
   *  useful thing to chase. */
  policy_intake_outstanding: async (tenantId) => {
    const n = await (prisma as any).policyPurchase.count({
      where: { tenant_id: tenantId, status: { notIn: ['refunded'] }, intake_completed_at: null },
    })
    return n > 0
  },

  /** True while an order sits in the product's own `awaiting_details` state.
   *
   *  This is the state the rest of the product keys on: writing is refused while
   *  an order is in it ("the client has not supplied N required details yet"),
   *  and it flips to `paid` the moment the last answer lands. Preferred over
   *  inferring from intake_completed_at, because it is the same fact the
   *  platform's own nudge button uses. */
  policy_awaiting_details: async (tenantId) => {
    const n = await (prisma as any).policyPurchase.count({
      where: { tenant_id: tenantId, status: 'awaiting_details' },
    })
    return n > 0
  },

  /** True once the policy has been written and is ready to read. */
  policy_drafted: async (tenantId) => {
    const n = await (prisma as any).policyPurchase.count({
      where: { tenant_id: tenantId, status: { in: ['drafted', 'approved'] } },
    })
    return n > 0
  },

  /** True once a person has approved it into the library. */
  policy_approved: async (tenantId) => {
    const n = await (prisma as any).policyPurchase.count({
      where: { tenant_id: tenantId, approved_at: { not: null } },
    })
    return n > 0
  },

  /** True while the buyer has bought exactly one policy. Suppresses the "buy the
   *  rest" email for someone who has already bought several. */
  policy_single_purchase: async (tenantId) => {
    const n = await (prisma as any).policyPurchase.count({
      where: { tenant_id: tenantId, status: { notIn: ['refunded'] } },
    })
    return n === 1
  },

  // ─── Shared ─────────────────────────────────────────────────────────────────

  /** True while the buyer is still on a product-only tenant rather than full
   *  CareStream. Stops us selling a licence to somebody who already bought one.
   *  `tier` is the marker the shops set: training_only / policies_only, against
   *  'full' for a real CareStream tenant. */
  no_plan_yet: async (tenantId) => {
    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { tier: true } })
    return t?.tier === 'training_only' || t?.tier === 'policies_only'
  },
}

/** Evaluate a named condition.
 *
 *  `errored` matters, because the safe answer depends on what the email does
 *  when the condition is unmet. A SKIP email that cannot decide should send: the
 *  worst case is a nudge somebody did not need. A WAIT email that cannot decide
 *  must NOT send, because the worst case there is telling a buyer their policy
 *  is ready when it has not been written. The dispatcher picks accordingly.
 *
 *  An unknown name is not an error, it is a no-op: a typo in a condition should
 *  never hold a whole sequence. */
export async function evaluateCondition(
  name: string | null | undefined,
  tenantId: string,
): Promise<{ met: boolean; errored: boolean }> {
  if (!name) return { met: true, errored: false }
  const fn = PREDICATES[name]
  if (!fn) return { met: true, errored: false }
  try {
    return { met: await fn(tenantId), errored: false }
  } catch (e: any) {
    console.error(`[onboarding/conditions] ${name} failed for ${tenantId}:`, e?.message ?? e)
    return { met: false, errored: true }
  }
}

export const CONDITION_NAMES = Object.keys(PREDICATES)
