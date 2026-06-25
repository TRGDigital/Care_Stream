// Plan limit enforcement helpers.
// Every function loads the tenant's plan once, checks a single constraint,
// and throws PlanLimitError if the constraint is violated.
// Routes catch PlanLimitError and return the appropriate HTTP error response.

import { prisma } from '../db/client'

// ─── Error class ──────────────────────────────────────────────────────────────

export class PlanLimitError extends Error {
  constructor(
    public readonly code: string,
    message: string,
  ) {
    super(message)
    this.name = 'PlanLimitError'
  }
}

// ─── Internal plan loader ─────────────────────────────────────────────────────

interface PlanData {
  monthly_query_limit:         number | null
  max_policies:                number | null
  max_staff_users:             number | null
  max_handbooks:               number | null
  max_manual_knowledge_entries: number | null
  has_advanced_analytics:      boolean
  has_cqc_report:              boolean
  has_gap_detection:           boolean
  has_face_to_face:            boolean
  has_custom_audits:           boolean
  has_effectiveness:           boolean
  has_training_impact:         boolean
  monthly_annual_license_limit: number | null
}

async function loadTenantPlan(tenantId: string): Promise<{
  plan:                PlanData | null
  subscription_status: string
}> {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: {
      subscription_status: true,
      plan: {
        select: {
          monthly_query_limit:         true,
          max_policies:                true,
          max_staff_users:             true,
          max_handbooks:               true,
          max_manual_knowledge_entries: true,
          has_advanced_analytics:      true,
          has_cqc_report:              true,
          has_gap_detection:           true,
          has_face_to_face:            true,
          has_custom_audits:           true,
          has_effectiveness:           true,
          has_training_impact:         true,
          monthly_annual_license_limit: true,
        },
      },
    },
  })
  return {
    plan:                tenant?.plan ?? null,
    subscription_status: (tenant?.subscription_status as string) ?? 'trialling',
  }
}

function assertNotCancelled(status: string): void {
  if (status === 'cancelled') {
    throw new PlanLimitError(
      'SUBSCRIPTION_CANCELLED',
      'Your subscription has been cancelled. Please contact support to reactivate your account.',
    )
  }
}

// ─── Public check functions ───────────────────────────────────────────────────

type Usage = { used: number; limit: number | null; remaining: number | null; resets_at: string }

function monthWindow() {
  const now = new Date()
  return { start: new Date(now.getFullYear(), now.getMonth(), 1), next: new Date(now.getFullYear(), now.getMonth() + 1, 1) }
}

// AI generation credits used this month vs the plan limit (training, CQC, onboarding…).
export async function getAiCreditUsage(tenantId: string): Promise<Usage> {
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { plan: { select: { monthly_ai_credit_limit: true } } } })
  const limit = (tenant?.plan?.monthly_ai_credit_limit ?? null) as number | null
  const { start, next } = monthWindow()
  const used = await (prisma as any).aiCreditLog.count({ where: { tenant_id: tenantId, billable: true, created_at: { gte: start } } })
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used), resets_at: next.toISOString() }
}

// Everyday Q&A queries used this month vs the plan limit (separate from credits).
export async function getQueryUsage(tenantId: string): Promise<Usage> {
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { plan: { select: { monthly_query_limit: true } } } })
  const limit = (tenant?.plan?.monthly_query_limit ?? null) as number | null
  const { start, next } = monthWindow()
  const used = await (prisma as any).queryRecord.count({ where: { tenant_id: tenantId, created_at: { gte: start } } })
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used), resets_at: next.toISOString() }
}

// Throw if the tenant has no remaining AI credits this month.
export async function checkAiCreditLimit(tenantId: string): Promise<void> {
  const { subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)
  const { used, limit } = await getAiCreditUsage(tenantId)
  if (limit !== null && used >= limit) {
    throw new PlanLimitError(
      'AI_CREDIT_LIMIT_REACHED',
      `You've used all ${limit} AI credits this month. Wait until the limit resets next month, or upgrade your plan. (Everyday questions aren't affected.)`,
    )
  }
}

export async function logAiCredit(tenantId: string, action: string, refId?: string | null): Promise<void> {
  await (prisma as any).aiCreditLog.create({ data: { tenant_id: tenantId, action, ref_id: refId ?? null, billable: true } }).catch(() => {})
}

// Track an AI action for per-tenant cost visibility WITHOUT counting toward the
// limit (translations, audit recommendations, remediation lessons, …).
export async function trackAiAction(tenantId: string, action: string, refId?: string | null): Promise<void> {
  await (prisma as any).aiCreditLog.create({ data: { tenant_id: tenantId, action, ref_id: refId ?? null, billable: false } }).catch(() => {})
}

// Check whether the tenant has capacity for another query this month.
export async function checkQueryLimit(tenantId: string): Promise<void> {
  const { plan, subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)

  const limit = plan?.monthly_query_limit ?? null
  if (limit === null) return  // unlimited plan

  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const count = await (prisma as any).queryRecord.count({
    where: { tenant_id: tenantId, created_at: { gte: thisMonthStart } },
  })

  if (count >= limit) {
    throw new PlanLimitError(
      'QUERY_LIMIT_REACHED',
      `Your organisation has reached its monthly query limit of ${limit.toLocaleString()}. ` +
      `The limit resets at the start of next month, or you can upgrade your plan.`,
    )
  }
}

// Check whether the tenant can upload another policy of the given category.
export async function checkPolicyLimit(
  tenantId: string,
  documentCategory: string,  // 'staff_handbook' uses the handbook limit; everything else (incl. custom categories) uses the policy limit
): Promise<void> {
  const { plan, subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)

  if (documentCategory === 'staff_handbook') {
    const max = plan?.max_handbooks ?? null
    if (max === null) return

    const count = await (prisma as any).policy.count({
      where: { tenant_id: tenantId, document_category: 'staff_handbook', status: { not: 'archived' } },
    })
    if (count >= max) {
      throw new PlanLimitError(
        'HANDBOOK_LIMIT_REACHED',
        `Your plan allows up to ${max} staff handbook${max === 1 ? '' : 's'}. ` +
        `Archive the existing handbook before uploading a replacement, or upgrade your plan.`,
      )
    }
  } else {
    const max = plan?.max_policies ?? null
    if (max === null) return

    const count = await (prisma as any).policy.count({
      where: { tenant_id: tenantId, document_category: 'internal_policy', status: { not: 'archived' } },
    })
    if (count >= max) {
      throw new PlanLimitError(
        'POLICY_LIMIT_REACHED',
        `Your plan allows up to ${max} policies. ` +
        `Archive existing policies to free up space, or upgrade your plan.`,
      )
    }
  }
}

// Returns the number of additional policies of the given category that can be
// added. Returns null if the plan is unlimited. Used by bulk upload to check
// capacity before processing any files.
export async function remainingPolicySlots(
  tenantId: string,
  documentCategory: string,  // 'staff_handbook' uses the handbook limit; everything else uses the policy limit
): Promise<number | null> {
  const { plan, subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)

  const max = documentCategory === 'staff_handbook'
    ? (plan?.max_handbooks ?? null)
    : (plan?.max_policies  ?? null)

  if (max === null) return null

  const count = await (prisma as any).policy.count({
    where: { tenant_id: tenantId, document_category: documentCategory, status: { not: 'archived' } },
  })

  return Math.max(0, max - count)
}

// Check whether the tenant can invite another staff member.
export async function checkUserLimit(tenantId: string): Promise<void> {
  const { plan, subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)

  const max = plan?.max_staff_users ?? null
  if (max === null) return

  const count = await (prisma as any).user.count({
    where: { tenant_id: tenantId, is_active: true },
  })
  if (count >= max) {
    throw new PlanLimitError(
      'USER_LIMIT_REACHED',
      `Your plan allows up to ${max} active staff members. ` +
      `Deactivate an existing member to free up a slot, or upgrade your plan.`,
    )
  }
}

// Check whether the tenant can add another manual knowledge entry.
export async function checkManualKnowledgeLimit(tenantId: string): Promise<void> {
  const { plan, subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)

  const max = plan?.max_manual_knowledge_entries ?? null
  if (max === null) return

  const count = await (prisma as any).knowledgeEntry.count({
    where: { tenant_id: tenantId, source_type: 'manual' },
  })
  if (count >= max) {
    throw new PlanLimitError(
      'KNOWLEDGE_LIMIT_REACHED',
      `Your plan allows up to ${max} manual knowledge entries. ` +
      `Delete existing entries to free up space, or upgrade your plan.`,
    )
  }
}

// Boolean plan features that can be gated.
export type PlanFeature =
  | 'has_gap_detection' | 'has_cqc_report' | 'has_advanced_analytics'
  | 'has_face_to_face' | 'has_custom_audits' | 'has_effectiveness' | 'has_training_impact'

// Which plan unlocks each feature — used for the upgrade message.
const FEATURE_TIER: Record<PlanFeature, string> = {
  has_gap_detection:      'Professional',
  has_cqc_report:         'Professional',
  has_advanced_analytics: 'Professional',
  has_face_to_face:       'Professional',
  has_custom_audits:      'Enterprise',
  has_effectiveness:      'Enterprise',
  has_training_impact:    'Enterprise',
}

// Check whether the tenant's plan includes a boolean feature.
export async function checkFeature(
  tenantId: string,
  feature: PlanFeature,
): Promise<void> {
  const { plan, subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)

  if (!plan?.[feature]) {
    throw new PlanLimitError(
      'FEATURE_NOT_AVAILABLE',
      `This feature is not included in your current plan. Upgrade to ${FEATURE_TIER[feature]} to access it.`,
    )
  }
}

// ─── Plan feature summary (for the dashboard / hub gating) ────────────────────

export interface PlanFeatures {
  plan_name:               string | null
  price_monthly_pence:     number | null
  price_annual_pence:      number | null
  has_advanced_analytics:  boolean
  has_cqc_report:          boolean
  has_gap_detection:       boolean
  has_face_to_face:        boolean
  has_custom_audits:       boolean
  has_effectiveness:       boolean
  has_training_impact:     boolean
  annual_license:          Usage  // monthly annual-module allocation quota
}

// Everything the front-end needs to grey out / unlock features and show usage.
export async function getPlanFeatures(tenantId: string): Promise<PlanFeatures> {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: {
      plan: {
        select: {
          name: true, price_monthly_pence: true, price_annual_pence: true,
          has_advanced_analytics: true, has_cqc_report: true, has_gap_detection: true,
          has_face_to_face: true, has_custom_audits: true, has_effectiveness: true, has_training_impact: true,
        },
      },
    },
  })
  const p = tenant?.plan ?? null
  return {
    plan_name:              p?.name ?? null,
    price_monthly_pence:    p?.price_monthly_pence ?? null,
    price_annual_pence:     p?.price_annual_pence ?? null,
    has_advanced_analytics: !!p?.has_advanced_analytics,
    has_cqc_report:         !!p?.has_cqc_report,
    has_gap_detection:      !!p?.has_gap_detection,
    has_face_to_face:       !!p?.has_face_to_face,
    has_custom_audits:      !!p?.has_custom_audits,
    has_effectiveness:      !!p?.has_effectiveness,
    has_training_impact:    !!p?.has_training_impact,
    annual_license:         await getAnnualLicenseUsage(tenantId),
  }
}

// ─── Annual-training-module allocations (monthly quota) ───────────────────────
// One allocation = one annual (ai_generated) module assigned to one staff member.
// The quota is a monthly pool: Starter 10, Professional 30, Enterprise unlimited.

export async function getAnnualLicenseUsage(tenantId: string): Promise<Usage> {
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { plan: { select: { monthly_annual_license_limit: true } } } })
  const limit = (tenant?.plan?.monthly_annual_license_limit ?? null) as number | null
  const { start, next } = monthWindow()
  const used = await (prisma as any).trainingEnrollment.count({
    where: { tenant_id: tenantId, created_at: { gte: start }, module: { source: 'ai_generated' } },
  })
  return { used, limit, remaining: limit === null ? null : Math.max(0, limit - used), resets_at: next.toISOString() }
}

// Throw if assigning `additional` annual allocations would exceed the monthly quota.
export async function checkAnnualLicenseLimit(tenantId: string, additional: number): Promise<void> {
  const { subscription_status } = await loadTenantPlan(tenantId)
  assertNotCancelled(subscription_status)
  const { used, limit } = await getAnnualLicenseUsage(tenantId)
  if (limit !== null && used + additional > limit) {
    const remaining = Math.max(0, limit - used)
    throw new PlanLimitError(
      'ANNUAL_LICENSE_LIMIT_REACHED',
      `Your plan includes ${limit} annual training allocations per month and you have ${remaining} left. ` +
      `This assignment needs ${additional}. The pool resets at the start of next month, or you can upgrade your plan.`,
    )
  }
}
