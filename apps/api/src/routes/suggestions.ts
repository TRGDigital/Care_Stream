// CareStream Suggestions — a deterministic rules engine that reads the tenant's
// live account state and returns prioritised guidance for the console.
//
// GET  /suggestions             → { suggestions: [...], total } (priority 1 = most important)
// POST /suggestions/:key/dismiss → { dismissed: true } (tenant-wide, hides the rule for 30 days)
//
// Ordering: category priority compliance < training < engagement < onboarding
// < features < setup; within a category the fixed rule order below. Everything
// is computed from cheap count/group queries in one Promise.all — no AI calls.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { getAnnualLicenseUsage, getAiCreditUsage } from '../lib/plan-limits'
import { policiesDueForReview } from '../services/analytics/policy-adoption'

export const suggestionsRouter = Router()

type Category = 'setup' | 'compliance' | 'training' | 'engagement' | 'onboarding' | 'features'

interface Suggestion {
  key:       string
  category:  Category
  priority:  number
  title:     string
  body:      string
  cta_label: string
  href:      string
}

const DAY = 86_400_000
const DISMISS_DAYS = 30

// Every rule key the engine can emit (also validates the dismiss endpoint).
const RULE_KEYS = new Set([
  'setup_incomplete', 'publish_pending', 'gaps_stale', 'policies_due_review',
  'pipeline_unfinished', 'supervisions_overdue', 'appraisals_overdue', 'workforce_records',
  'training_not_started', 'training_expired', 'staff_no_training', 'allocation_unused',
  'staff_not_in_hub', 'hub_quiet', 'staff_no_role',
  'roles_without_onboarding', 'onboarding_stalled',
  'cqc_prep_unused', 'no_audit_this_month', 'f2f_unused', 'credits_low',
])

// Rules the training-only gateway tier still gets (everything else needs full CareStream).
const TRAINING_ONLY_KEYS = new Set([
  'training_not_started', 'training_expired', 'allocation_unused', 'staff_not_in_hub', 'staff_no_role',
])

const SECTION_LABELS: Record<string, string> = {
  coverage:    'regulation coverage',
  out_of_date: 'out of date',
  wording:     'CQC wording',
  consistency: 'consistency',
}

const PIPELINE_CHECK_LABELS: Record<string, string> = {
  out_of_date: 'the out of date check',
  consistency: 'the consistency check',
  wording:     'the CQC wording check',
}

// "a", "a or b", "a, b or c"
function joinOr(items: string[]): string {
  if (items.length <= 1) return items[0] ?? ''
  return `${items.slice(0, -1).join(', ')} or ${items[items.length - 1]}`
}

// Workforce credential types + status derivation — mirrors routes/workforce.ts.
const CREDENTIAL_TYPES = ['dbs', 'right_to_work', 'passport', 'professional_registration', 'reference'] as const

function credentialStatus(type: string, present: boolean, expiresAt: Date | null, now: number): string {
  if (!present) return 'missing' // reference "outstanding" also counts as missing in the register summary
  if (type === 'reference') return 'valid'
  if (!expiresAt) return 'valid'
  const ms = new Date(expiresAt).getTime()
  if (ms < now) return 'expired'
  return (ms - now) / DAY <= 30 ? 'expiring' : 'valid'
}

// Supervision/appraisal cell status — mirrors buildCell in routes/workforce.ts
// (we only need overdue vs none here).
function supervisionStatus(records: Array<{ held_on: Date; next_due: Date | null }>, now: number): string {
  if (!records.length) return 'none'
  const sorted = records.slice().sort((a, b) => new Date(b.held_on).getTime() - new Date(a.held_on).getTime())
  const past     = sorted.find(r => new Date(r.held_on).getTime() <= now) ?? null
  const upcoming = sorted.some(r => new Date(r.held_on).getTime() > now)
  const nextDue  = past?.next_due ?? sorted[0]?.next_due ?? null
  if (upcoming) return 'booked'
  if (nextDue) {
    const ms = new Date(nextDue).getTime() - now
    return ms < 0 ? 'overdue' : (ms <= 30 * DAY ? 'due_soon' : 'ok')
  }
  return past ? 'ok' : 'none'
}

// ─── GET /suggestions ─────────────────────────────────────────────────────────

suggestionsRouter.get('/', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const tenant = await (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: {
        tier: true,
        plan: {
          select: {
            has_face_to_face:             true,
            has_workforce_compliance:     true,
            monthly_annual_license_limit: true,
            monthly_ai_credit_limit:      true,
          },
        },
      },
    })
    if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found.', 404); return }

    const trainingOnly = tenant.tier === 'training_only'
    const plan         = tenant.plan ?? null
    const hasWorkforce = !trainingOnly && !!plan?.has_workforce_compliance
    const hasF2F       = !trainingOnly && !!plan?.has_face_to_face
    const hasAllocation = plan?.monthly_annual_license_limit != null
    const hasCreditLimit = !trainingOnly && plan?.monthly_ai_credit_limit != null

    const nowMs      = Date.now()
    const now        = new Date(nowMs)
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const cut14      = new Date(nowMs - 14 * DAY)
    const cut21      = new Date(nowMs - 21 * DAY)
    const cut30      = new Date(nowMs - DISMISS_DAYS * DAY)

    const [
      dismissedRows,
      // shared staff counts (both tiers)
      staffActive, staffNeverLoggedIn, staffNoRole,
      // training (both tiers)
      trainingNotStarted, trainingExpiredGroups,
      annualUsage,
      // full tier only from here down (null on training_only)
      staffNoTraining,
      policyCount, gapsRuns, coverageCount, enrollmentTotal, flowCount, activeUserCount, queryTotal,
      queryRecent,
      pendingChangeGroups, publishedDocs, activePolicyDates,
      dueReview,
      roleGroups, activeFlows, incompleteOnboarding,
      cqcDeliveryCount, auditsThisMonth,
      f2fSessionCount,
      creditUsage,
      workforceUsers, supervisionRows, credentialRows,
    ] = await Promise.all([
      (prisma as any).suggestionDismissal.findMany({
        where:  { tenant_id: tenantId, dismissed_at: { gte: cut30 } },
        select: { rule_key: true },
      }),
      (prisma as any).user.count({ where: { tenant_id: tenantId, is_active: true, role: 'staff' } }),
      (prisma as any).user.count({ where: { tenant_id: tenantId, is_active: true, role: 'staff', first_login_at: null } }),
      (prisma as any).user.count({ where: { tenant_id: tenantId, is_active: true, role: 'staff', OR: [{ job_role: null }, { job_role: '' }] } }),
      (prisma as any).trainingEnrollment.count({
        where: { tenant_id: tenantId, status: { in: ['not_started', 'pending'] }, created_at: { lt: cut21 } },
      }),
      // Distinct staff with an expired enrollment. NB a renewed enrollment leaves the old
      // expired row behind, so this can slightly overcount mid-renewal — acceptable for a nudge.
      (prisma as any).trainingEnrollment.groupBy({
        by:    ['user_id'],
        where: { tenant_id: tenantId, OR: [{ status: 'expired' }, { expires_at: { lt: now } }] },
      }),
      hasAllocation ? getAnnualLicenseUsage(tenantId) : null,
      trainingOnly ? null : (prisma as any).user.count({
        where: { tenant_id: tenantId, is_active: true, role: 'staff', training_enrollments: { none: {} } },
      }),
      trainingOnly ? null : (prisma as any).policy.count({ where: { tenant_id: tenantId, status: { not: 'archived' } } }),
      trainingOnly ? null : (prisma as any).gapsSectionRun.findMany({ where: { tenant_id: tenantId } }),
      trainingOnly ? null : (prisma as any).regulationCoverage.count({ where: { tenant_id: tenantId } }),
      trainingOnly ? null : (prisma as any).trainingEnrollment.count({ where: { tenant_id: tenantId } }),
      trainingOnly ? null : (prisma as any).onboardingFlow.count({ where: { tenant_id: tenantId } }),
      trainingOnly ? null : (prisma as any).user.count({ where: { tenant_id: tenantId, is_active: true } }),
      trainingOnly ? null : (prisma as any).queryRecord.count({ where: { tenant_id: tenantId } }),
      trainingOnly ? null : (prisma as any).queryRecord.count({ where: { tenant_id: tenantId, created_at: { gte: cut14 } } }),
      trainingOnly ? null : (prisma as any).policyDocumentChange.groupBy({
        by:     ['document_id'],
        where:  { tenant_id: tenantId, published: false, reverted: false },
        _count: { _all: true },
      }),
      trainingOnly ? null : (prisma as any).policyDocument.findMany({
        where:  { tenant_id: tenantId, published_at: { not: null } },
        select: { published_at: true },
      }),
      trainingOnly ? null : (prisma as any).policy.findMany({
        where:  { tenant_id: tenantId, status: 'active' },
        select: { created_at: true },
      }),
      trainingOnly ? null : policiesDueForReview(tenantId),
      trainingOnly ? null : (prisma as any).user.groupBy({
        by:     ['job_role'],
        where:  { tenant_id: tenantId, is_active: true, role: 'staff', NOT: [{ job_role: null }, { job_role: '' }] },
        _count: { _all: true },
      }),
      trainingOnly ? null : (prisma as any).onboardingFlow.findMany({
        where:  { tenant_id: tenantId, is_active: true },
        select: { job_roles: true },
      }),
      trainingOnly ? null : (prisma as any).onboardingEnrollment.findMany({
        where:  { tenant_id: tenantId, completed_at: null },
        select: { id: true, user_id: true, enrolled_at: true },
      }),
      trainingOnly ? null : (prisma as any).cqcStaffDelivery.count({ where: { tenant_id: tenantId } }),
      trainingOnly ? null : (prisma as any).auditRun.count({ where: { tenant_id: tenantId, created_at: { gte: monthStart } } }),
      hasF2F ? (prisma as any).faceToFaceSession.count({ where: { tenant_id: tenantId } }) : null,
      hasCreditLimit ? getAiCreditUsage(tenantId) : null,
      hasWorkforce ? (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true } }) : null,
      hasWorkforce ? (prisma as any).staffSupervision.findMany({
        where:  { tenant_id: tenantId },
        select: { user_id: true, type: true, held_on: true, next_due: true },
      }) : null,
      hasWorkforce ? (prisma as any).staffCredential.findMany({
        where:  { tenant_id: tenantId },
        select: { user_id: true, type: true, expires_at: true },
      }) : null,
    ])

    // Rule 14 needs the latest progress per open onboarding enrollment (dependent query).
    let onboardingStalled = 0
    if (!trainingOnly && incompleteOnboarding && (incompleteOnboarding as any[]).length > 0) {
      const rows = incompleteOnboarding as any[]
      const prog = await (prisma as any).onboardingProgress.groupBy({
        by:    ['enrollment_id'],
        where: { enrollment_id: { in: rows.map(r => r.id) } },
        _max:  { completed_at: true },
      })
      const lastByEnrollment = new Map<string, Date | null>(
        (prog as any[]).map(p => [p.enrollment_id, p._max?.completed_at ?? null]),
      )
      const stalledUsers = new Set<string>()
      for (const e of rows) {
        const last = lastByEnrollment.get(e.id) ?? null
        const anchor = last ?? e.enrolled_at
        if (new Date(anchor).getTime() < cut14.getTime()) stalledUsers.add(e.user_id)
      }
      onboardingStalled = stalledUsers.size
    }

    const suggestions: Suggestion[] = []
    const push = (key: string, category: Category, title: string, body: string, cta_label: string, href: string) =>
      suggestions.push({ key, category, priority: 0, title, body, cta_label, href })

    // ── COMPLIANCE ────────────────────────────────────────────────────────────

    if (!trainingOnly) {
      // Rule 2 — adopted but unpublished changes
      const changeGroups = (pendingChangeGroups as any[]) ?? []
      const pendingChanges = changeGroups.reduce((sum, g) => sum + (g._count?._all ?? 0), 0)
      const pendingDocs    = changeGroups.length
      if (pendingChanges > 0) {
        push('publish_pending', 'compliance', 'Publish your adopted changes',
          `${pendingChanges} adopted ${pendingChanges === 1 ? 'change' : 'changes'} across ` +
          `${pendingDocs} ${pendingDocs === 1 ? 'policy' : 'policies'} ` +
          `${pendingChanges === 1 ? 'is' : 'are'} waiting to be approved and published. ` +
          'Analyses cannot see them until you publish.',
          'Review and publish', '/policies')
      }

      // Rule 3 — a gaps section is stale (mirrors GET /analytics/gaps/pipeline staleness)
      const runs   = (gapsRuns as any[]) ?? []
      const ranAt  = new Map<string, Date>(runs.map(r => [r.section, r.ran_at]))
      const docs   = (publishedDocs as any[]) ?? []
      const added  = (activePolicyDates as any[]) ?? []
      const staleSections: Array<{ section: string; count: number }> = []
      for (const section of ['coverage', 'out_of_date', 'wording', 'consistency']) {
        const ran = ranAt.get(section)
        if (!ran) continue
        const count = docs.filter(d => d.published_at > ran).length + added.filter(p => p.created_at > ran).length
        if (count > 0) staleSections.push({ section, count })
      }
      if (staleSections.length > 0) {
        const worst = staleSections.reduce((a, b) => (b.count > a.count ? b : a))
        push('gaps_stale', 'compliance', 'Your Gap Analysis is out of date',
          `${worst.count} ${worst.count === 1 ? 'policy has' : 'policies have'} changed since your ` +
          `${SECTION_LABELS[worst.section]} analysis last ran. Re-run it to see your improvement.`,
          'Re-run in Gaps', '/gaps')
      }

      // Rule 4 — policies due their scheduled review
      const due = (dueReview as any)?.policies?.length ?? 0
      if (due > 0) {
        push('policies_due_review', 'compliance', 'Policies due for review',
          `${due} ${due === 1 ? 'policy is due its' : 'policies are due their'} scheduled review.`,
          'Open Policies', '/policies')
      }

      // Rule 5 — coverage ran but the other pipeline checks never have
      if (ranAt.has('coverage')) {
        const missing = ['out_of_date', 'consistency', 'wording'].filter(s => !ranAt.has(s))
        if (missing.length > 0) {
          push('pipeline_unfinished', 'compliance', 'Finish the guided pipeline',
            `You have run regulation coverage but not ${joinOr(missing.map(s => PIPELINE_CHECK_LABELS[s]))}. ` +
            'Each check catches different problems.',
            'Open Gaps', '/gaps')
        }
      }

      // Rules 19-21 — workforce compliance (Enterprise plans only)
      if (hasWorkforce && workforceUsers) {
        const users = workforceUsers as any[]
        const byUserType = new Map<string, any[]>()
        for (const r of (supervisionRows as any[]) ?? []) {
          const k = `${r.user_id}|${r.type}`
          const arr = byUserType.get(k) ?? []
          if (arr.length === 0) byUserType.set(k, arr)
          arr.push(r)
        }
        let supervisionsOverdue = 0, appraisalsOverdue = 0, noSupervision = 0, noAppraisal = 0
        for (const u of users) {
          const s = supervisionStatus(byUserType.get(`${u.id}|supervision`) ?? [], nowMs)
          const a = supervisionStatus(byUserType.get(`${u.id}|appraisal`) ?? [], nowMs)
          if (s === 'overdue') supervisionsOverdue++
          if (s === 'none')    noSupervision++
          if (a === 'overdue') appraisalsOverdue++
          if (a === 'none')    noAppraisal++
        }

        // Rule 19 — supervisions overdue / never recorded
        if (supervisionsOverdue > 0 || noSupervision > 0) {
          let body: string
          if (supervisionsOverdue > 0 && noSupervision > 0) {
            body = `${supervisionsOverdue} staff ${supervisionsOverdue === 1 ? 'member is' : 'are'} overdue a supervision ` +
              `and ${noSupervision} ${noSupervision === 1 ? 'has' : 'have'} never had one recorded.`
          } else if (supervisionsOverdue > 0) {
            body = `${supervisionsOverdue} staff ${supervisionsOverdue === 1 ? 'member is' : 'are'} overdue a supervision.`
          } else {
            body = `${noSupervision} staff ${noSupervision === 1 ? 'member has' : 'have'} never had a supervision recorded.`
          }
          push('supervisions_overdue', 'compliance', 'Supervisions overdue',
            `${body} CQC expects regular, documented supervisions.`,
            'Open Supervisions', '/workforce?tab=supervisions')
        }

        // Rule 20 — appraisals overdue / never recorded
        if (appraisalsOverdue > 0 || noAppraisal > 0) {
          let body: string
          if (appraisalsOverdue > 0 && noAppraisal > 0) {
            body = `${appraisalsOverdue} staff ${appraisalsOverdue === 1 ? 'member is' : 'are'} overdue their annual appraisal ` +
              `and ${noAppraisal} ${noAppraisal === 1 ? 'has' : 'have'} never had one recorded.`
          } else if (appraisalsOverdue > 0) {
            body = `${appraisalsOverdue} staff ${appraisalsOverdue === 1 ? 'member is' : 'are'} overdue their annual appraisal.`
          } else {
            body = `${noAppraisal} staff ${noAppraisal === 1 ? 'member has' : 'have'} never had an appraisal recorded.`
          }
          push('appraisals_overdue', 'compliance', 'Appraisals overdue', body, 'Open Supervisions', '/workforce?tab=supervisions')
        }

        // Rule 21 — workforce register: expired / expiring / missing documents
        const credByUser = new Map<string, Map<string, any>>()
        for (const c of (credentialRows as any[]) ?? []) {
          if (!credByUser.has(c.user_id)) credByUser.set(c.user_id, new Map())
          credByUser.get(c.user_id)!.set(c.type, c)
        }
        let expired = 0, expiring = 0, missing = 0
        for (const u of users) {
          for (const type of CREDENTIAL_TYPES) {
            const row = credByUser.get(u.id)?.get(type) ?? null
            const status = credentialStatus(type, !!row, row?.expires_at ?? null, nowMs)
            if (status === 'expired')       expired++
            else if (status === 'expiring') expiring++
            else if (status === 'missing')  missing++
          }
        }
        if (expired > 0 || expiring > 0 || missing > 0) {
          const parts: string[] = []
          if (expired > 0)  parts.push(`${expired} ${parts.length === 0 ? (expired === 1 ? 'document has' : 'documents have') : (expired === 1 ? 'has' : 'have')} expired`)
          if (expiring > 0) parts.push(`${expiring} ${parts.length === 0 ? (expiring === 1 ? 'document expires' : 'documents expire') : (expiring === 1 ? 'expires' : 'expire')} within a month`)
          if (missing > 0)  parts.push(`${missing} ${parts.length === 0 ? (missing === 1 ? 'document is' : 'documents are') : (missing === 1 ? 'is' : 'are')} missing`)
          const list = parts.length === 1 ? parts[0] : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`
          const tail = missing > 0 ? 'from your workforce register' : 'in your workforce register'
          push('workforce_records', 'compliance', 'Workforce records need attention',
            `${list} ${tail}.`, 'Open Workforce Compliance', '/workforce')
        }
      }
    }

    // ── TRAINING ──────────────────────────────────────────────────────────────

    // Rule 6 — assigned but not started after 3 weeks
    if ((trainingNotStarted as number) > 0) {
      const n = trainingNotStarted as number
      push('training_not_started', 'training', 'Training not started',
        `${n} assigned ${n === 1 ? 'module has' : 'modules have'} not been started after 3 weeks. ` +
        'Send a reminder in one click.',
        'Open Training', '/training')
    }

    // Rule 7 — expired or overdue training
    const expiredStaff = ((trainingExpiredGroups as any[]) ?? []).length
    if (expiredStaff > 0) {
      push('training_expired', 'training', 'Expired or overdue training',
        `${expiredStaff} staff ${expiredStaff === 1 ? 'member has' : 'have'} expired statutory training.`,
        'Open Training', '/training')
    }

    // Rule 8 — active staff with no training at all (full tier)
    if (!trainingOnly && (staffNoTraining as number) > 0) {
      const n = staffNoTraining as number
      push('staff_no_training', 'training', 'Staff with no training',
        `${n} active staff ${n === 1 ? 'member has' : 'have'} no training assigned at all.`,
        'Assign training', '/training')
    }

    // Rule 9 — unused monthly annual-training allocation (skipped on unlimited plans)
    if (annualUsage && annualUsage.limit != null && (annualUsage.remaining ?? 0) > 0) {
      const unused = annualUsage.remaining as number
      push('allocation_unused', 'training', 'Unused monthly allocation',
        `Your plan includes ${annualUsage.limit} annual training allocations this month ` +
        `and ${unused} ${unused === 1 ? 'is' : 'are'} unused.`,
        'Open Training', '/training/annual')
    }

    // ── ENGAGEMENT ────────────────────────────────────────────────────────────

    // Rule 10 — staff who have never signed in (≥3 or ≥25% of staff)
    const neverIn = staffNeverLoggedIn as number
    const staffTotal = staffActive as number
    if (neverIn > 0 && staffTotal > 0 && (neverIn >= 3 || neverIn / staffTotal >= 0.25)) {
      push('staff_not_in_hub', 'engagement', 'Staff not in the hub',
        `${neverIn} of your ${staffTotal} staff ${neverIn === 1 ? 'has' : 'have'} never signed in. ` +
        'Email them passwordless links or print a QR sheet in one click.',
        'Open Staff', '/staff')
    }

    // Rule 11 — the hub has gone quiet (full tier)
    if (!trainingOnly && (queryRecent as number) === 0 && staffTotal >= 2 && (queryTotal as number) > 0) {
      push('hub_quiet', 'engagement', 'The hub has gone quiet',
        'Nobody has asked the assistant a question in two weeks. ' +
        'Staff who use it daily stay compliant without chasing.',
        'Hub adoption tips', '/guides')
    }

    // Rule 12 — active staff with no job role
    if ((staffNoRole as number) > 0) {
      const n = staffNoRole as number
      push('staff_no_role', 'engagement', 'Staff missing job roles',
        `${n} staff ${n === 1 ? 'member has' : 'have'} no job role set. ` +
        'Roles drive their training, onboarding and CQC practice questions.',
        'Open Staff', '/staff')
    }

    // ── ONBOARDING ────────────────────────────────────────────────────────────

    if (!trainingOnly) {
      // Rule 13 — a held job role with no active onboarding flow covering it
      const flows = (activeFlows as any[]) ?? []
      const coversAll = flows.some(f => (f.job_roles ?? []).length === 0)
      if (!coversAll) {
        const covered = new Set<string>(flows.flatMap(f => (f.job_roles ?? []) as string[]))
        const uncovered = ((roleGroups as any[]) ?? [])
          .filter(g => g.job_role && !covered.has(g.job_role))
          .sort((a, b) => (b._count?._all ?? 0) - (a._count?._all ?? 0))
        if (uncovered.length > 0) {
          const top = uncovered[0]
          const n = top._count?._all ?? 0
          push('roles_without_onboarding', 'onboarding', 'Roles without onboarding',
            `You have ${n} ${top.job_role} but no onboarding flow for that role. ` +
            'Adopt a ready-made flow in two clicks.',
            'Open Onboarding', '/onboarding')
        }
      }

      // Rule 14 — onboarding enrollments with no progress in 14+ days
      if (onboardingStalled > 0) {
        push('onboarding_stalled', 'onboarding', 'Onboarding stalled',
          `${onboardingStalled} staff ${onboardingStalled === 1 ? 'member has' : 'have'} made no onboarding progress in two weeks.`,
          'Open Onboarding', '/onboarding')
      }
    }

    // ── FEATURES ──────────────────────────────────────────────────────────────

    if (!trainingOnly) {
      // Rule 15 — CQC staff prep never used (any full tenant)
      if ((cqcDeliveryCount as number) === 0) {
        push('cqc_prep_unused', 'features', 'CQC Staff Prep unused',
          'Your plan includes CQC inspector practice questions and none have been sent yet. ' +
          'Staff who have practised interview answers show far better in inspections.',
          'Open CQC Staff Prep', '/cqc-questions')
      }

      // Rule 16 — no audit run this calendar month
      if ((auditsThisMonth as number) === 0) {
        push('no_audit_this_month', 'features', 'No audit this month',
          'You have not run a monthly audit yet this month.',
          'Open Monthly Audits', '/audits')
      }

      // Rule 17 — face-to-face included in the plan but never used
      if (hasF2F && (f2fSessionCount as number) === 0) {
        push('f2f_unused', 'features', 'Face-to-face training unused',
          'Plan face-to-face sessions and CareStream chases non-attenders with the digital catch-up module automatically.',
          'Open Face-to-face', '/training?tab=face_to_face')
      }

      // Rule 18 — AI credits running low (limited plans only)
      if (creditUsage && creditUsage.remaining != null && creditUsage.remaining < 5) {
        const n = creditUsage.remaining
        push('credits_low', 'features', 'AI credits running low',
          `You have ${n} AI ${n === 1 ? 'credit' : 'credits'} left this month.`,
          'Open Billing', '/billing')
      }
    }

    // ── SETUP (lowest category priority) ──────────────────────────────────────

    // Rule 1 — the 6-step setup checklist (full tier only)
    if (!trainingOnly) {
      const steps = [
        (policyCount as number) > 0,
        ((gapsRuns as any[]) ?? []).length > 0 || (coverageCount as number) > 0,
        (enrollmentTotal as number) > 0,
        (flowCount as number) > 0,
        (activeUserCount as number) > 1,
        (queryTotal as number) > 0,
      ]
      const done = steps.filter(Boolean).length
      if (done < steps.length) {
        push('setup_incomplete', 'setup', 'Finish setting up CareStream',
          `You have completed ${done} of 6 setup steps. Finish the rest to get the full value from your account.`,
          'Open the dashboard', '/dashboard')
      }
    }

    // ── Dismissals + final ordering ───────────────────────────────────────────

    const dismissed = new Set<string>(((dismissedRows as any[]) ?? []).map(d => d.rule_key))
    const visible = suggestions
      .filter(s => !dismissed.has(s.key))
      .filter(s => !trainingOnly || TRAINING_ONLY_KEYS.has(s.key))
      .map((s, i) => ({ ...s, priority: i + 1 }))

    ok(res, { suggestions: visible, total: visible.length })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── POST /suggestions/:key/dismiss ──────────────────────────────────────────
// Tenant-wide dismissal: the rule stays hidden for 30 days, then returns if
// still true. Re-dismissing refreshes the timestamp.

suggestionsRouter.post('/:key/dismiss', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const key = String(req.params.key)
  if (!RULE_KEYS.has(key)) { err(res, 'UNKNOWN_RULE', 'Unknown suggestion key.', 404); return }
  try {
    await (prisma as any).suggestionDismissal.upsert({
      where:  { tenant_id_rule_key: { tenant_id: tenantId, rule_key: key } },
      update: { dismissed_at: new Date() },
      create: { tenant_id: tenantId, rule_key: key },
    })
    ok(res, { dismissed: true })
  } catch (e: any) {
    err(res, 'DISMISS_FAILED', e.message, 500)
  }
})
