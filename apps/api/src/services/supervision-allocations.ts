// Allocating resources off a completed supervision's agreed actions. Each agreed action can
// optionally allocate one of three things to the supervised staff member — a training module,
// an induction (onboarding) flow, or a CQC prep question — so it lands in their hub in the same
// place, and with the same notifications, as if an admin had allocated it directly.
//
// These mirror the enrol logic in routes/training.ts, routes/onboarding.ts and
// routes/cqc-staff-questions.ts, but for a single staff member and are safe to call again on
// re-save: an existing enrolment/delivery is skipped rather than duplicated.

import { prisma } from '../db/client'
import { notifyStaffAllocation, notifyUsers } from '../lib/notify'
import { sendProactiveTrainingQuestions } from './training/proactive'
import { sendOnboardingUpdateEmail, sendCqcPrepEmail } from './email/outbound'
import { sendPushToUsers } from '../lib/push'
import { callClaude } from './ai/claude'
import { checkAnnualLicenseLimit, PlanLimitError } from '../lib/plan-limits'
import { siteUrl } from '../lib/urls'

export type AllocationType = 'training' | 'induction' | 'cqc'
export type AllocationResult = { allocated: boolean; skipped?: boolean; error?: string }

// Enrol the staff member on an ad-hoc training module (creates a TrainingEnrollment).
async function allocateTraining(tenantId: string, userId: string, moduleId: string, assignedByUserId: string): Promise<AllocationResult> {
  const mod = await (prisma as any).trainingModule.findFirst({
    where:  { id: moduleId, is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] },
    select: { id: true, source: true },
  }).catch(() => null)
  if (!mod) return { allocated: false, error: 'Module not found.' }

  const existing = await (prisma as any).trainingEnrollment.findFirst({
    where:  { tenant_id: tenantId, user_id: userId, module_id: moduleId, status: { not: 'expired' } },
    select: { id: true },
  }).catch(() => null)
  if (existing) return { allocated: false, skipped: true }

  // AI-generated (annual) modules consume the plan's allocation quota; ad-hoc modules don't.
  if (mod.source === 'ai_generated') {
    try { await checkAnnualLicenseLimit(tenantId, 1) }
    catch (e: any) { if (e instanceof PlanLimitError) return { allocated: false, error: e.message }; throw e }
  }

  await (prisma as any).trainingEnrollment.create({
    data: { tenant_id: tenantId, user_id: userId, module_id: moduleId, status: 'not_started', assigned_by: assignedByUserId },
  })
  const kind = mod.source === 'ai_generated' ? 'annual_training' : 'training'
  notifyStaffAllocation(tenantId, [userId], kind as any).catch(e => console.error('[sup-alloc] training email:', e))
  sendProactiveTrainingQuestions(tenantId, [userId], [moduleId]).catch(e => console.error('[sup-alloc] proactive:', e))
  return { allocated: true }
}

// Enrol the staff member on an induction (onboarding) flow.
async function allocateInduction(tenantId: string, userId: string, flowId: string): Promise<AllocationResult> {
  const flow = await (prisma as any).onboardingFlow.findFirst({ where: { id: flowId, tenant_id: tenantId }, include: { steps: true } }).catch(() => null)
  if (!flow) return { allocated: false, error: 'Induction flow not found.' }
  const unmapped = (flow.steps as any[]).filter(s => s.type === 'read_policy' && !s.policy_id).length
  if (unmapped > 0) return { allocated: false, error: 'This induction flow has read-policy steps that are not linked to a policy yet.' }

  await (prisma as any).onboardingEnrollment.upsert({
    where:  { flow_id_user_id: { flow_id: flowId, user_id: userId } },
    update: {},
    create: { tenant_id: tenantId, flow_id: flowId, user_id: userId },
  })
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
  const portalUrl = siteUrl()
  notifyUsers(tenantId, 'onboarding_updates', [userId], (email, name) =>
    sendOnboardingUpdateEmail({
      to: email, name, orgName: tenant?.name ?? '',
      subject: `You have been enrolled on an onboarding flow — ${tenant?.name ?? 'CareStreamAI'}`,
      bodyHtml: `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
          You have been enrolled on the <strong>${flow.name}</strong> induction flow following your supervision.
        </p>
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
          Log in to the portal to get started and complete your induction steps.
        </p>`,
      portalUrl,
    })
  ).catch(e => console.error('[sup-alloc] induction email:', e))
  return { allocated: true }
}

// Deliver a CQC prep question to the staff member (creates a CqcStaffDelivery).
async function allocateCqc(tenantId: string, userId: string, questionId: string): Promise<AllocationResult> {
  const q = await (prisma as any).cqcStaffQuestion.findFirst({ where: { id: questionId, tenant_id: tenantId, is_active: true } }).catch(() => null)
  if (!q) return { allocated: false, error: 'CQC prep question not found.' }

  const already = await (prisma as any).cqcStaffDelivery.findFirst({ where: { tenant_id: tenantId, question_id: q.id, user_id: userId }, select: { id: true } }).catch(() => null)
  if (already) return { allocated: false, skipped: true }

  // Rephrase so staff cannot memorise exact wording (falls back to the original on any AI error).
  const rephrased = await callClaude(
    'You are a CQC interview preparation assistant. Rephrase questions slightly to test the same knowledge without allowing rote memorisation.',
    `Rephrase the following CQC inspector question in a slightly different way that tests the same knowledge and competency. Keep it open-ended and realistic. Return only the rephrased question, nothing else.

Original: ${q.question}`,
    { maxTokens: 200 },
  ).catch(() => q.question as string)

  await (prisma as any).cqcStaffDelivery.create({
    data: { tenant_id: tenantId, question_id: q.id, user_id: userId, rephrased_q: rephrased, channel: 'portal' },
  })
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
  notifyUsers(tenantId, 'cqc_staff_prep', [userId], (email, name) =>
    sendCqcPrepEmail({ to: email, name, orgName: tenant?.name ?? '', questionCount: 1, portalUrl: siteUrl() })
  ).catch(e => console.error('[sup-alloc] cqc email:', e))
  sendPushToUsers([userId], { title: 'New CQC practice question', body: 'Tap to answer a quick CQC inspector-style question.', url: '/cqc', tag: 'cqc-prep' }).catch(() => {})
  return { allocated: true }
}

// Dispatch one agreed-action allocation to the right handler.
export async function allocateFromSupervision(
  tenantId: string, superviseeUserId: string, conductorUserId: string,
  type: AllocationType, itemId: string,
): Promise<AllocationResult> {
  if (!itemId) return { allocated: false, error: 'Nothing selected.' }
  if (type === 'training')  return allocateTraining(tenantId, superviseeUserId, itemId, conductorUserId)
  if (type === 'induction') return allocateInduction(tenantId, superviseeUserId, itemId)
  if (type === 'cqc')       return allocateCqc(tenantId, superviseeUserId, itemId)
  return { allocated: false, error: 'Unknown allocation type.' }
}
