import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import Anthropic from '@anthropic-ai/sdk'

export const onboardingRouter = Router()
onboardingRouter.use(requireAuth)

const ai = new Anthropic()

// ─── Admin: Flows CRUD ────────────────────────────────────────────────────────

// GET /onboarding/flows
onboardingRouter.get('/flows', requireAdmin, async (_req, res) => {
  try {
    const tenantId = getTenantId()
    const flows = await prisma.onboardingFlow.findMany({
      where:   { tenant_id: tenantId },
      include: {
        steps:       { orderBy: { order: 'asc' } },
        enrollments: { select: { id: true, completed_at: true } },
      },
      orderBy: { created_at: 'desc' },
    })
    res.json({ success: true, data: { flows } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// POST /onboarding/flows
onboardingRouter.post('/flows', requireAdmin, async (req, res) => {
  const { name, description, job_roles, steps } = req.body
  if (!name) return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'name is required' } })

  try {
    const tenantId = getTenantId()
    const flow = await prisma.onboardingFlow.create({
      data: {
        tenant_id:   tenantId,
        name,
        description: description ?? null,
        job_roles:   job_roles   ?? [],
        steps: steps?.length ? {
          create: (steps as any[]).map((s, i) => ({
            order:     i,
            title:     s.title,
            type:      s.type,
            policy_id: s.policy_id ?? null,
            question:  s.question  ?? null,
          })),
        } : undefined,
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    res.json({ success: true, data: { flow } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// PATCH /onboarding/flows/:id
onboardingRouter.patch('/flows/:id', requireAdmin, async (req, res) => {
  const { name, description, job_roles, is_active, steps } = req.body
  try {
    const tenantId = getTenantId()
    const id       = String(req.params.id)
    const existing = await prisma.onboardingFlow.findFirst({ where: { id, tenant_id: tenantId } })
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Flow not found' } })

    if (steps !== undefined) {
      await prisma.onboardingStep.deleteMany({ where: { flow_id: id } })
    }

    const flow = await prisma.onboardingFlow.update({
      where: { id },
      data:  {
        ...(name        !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(job_roles   !== undefined && { job_roles }),
        ...(is_active   !== undefined && { is_active }),
        ...(steps !== undefined && {
          steps: {
            create: (steps as any[]).map((s, i) => ({
              order:     i,
              title:     s.title,
              type:      s.type,
              policy_id: s.policy_id ?? null,
              question:  s.question  ?? null,
            })),
          },
        }),
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    res.json({ success: true, data: { flow } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// DELETE /onboarding/flows/:id
onboardingRouter.delete('/flows/:id', requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId()
    const id       = String(req.params.id)
    const existing = await prisma.onboardingFlow.findFirst({ where: { id, tenant_id: tenantId } })
    if (!existing) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Flow not found' } })
    await prisma.onboardingFlow.delete({ where: { id } })
    res.json({ success: true, data: { deleted: true } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// ─── Admin: Enrollments ───────────────────────────────────────────────────────

// POST /onboarding/flows/:id/enroll
onboardingRouter.post('/flows/:id/enroll', requireAdmin, async (req, res) => {
  const { user_ids, due_date } = req.body
  if (!Array.isArray(user_ids) || user_ids.length === 0)
    return res.status(400).json({ success: false, error: { code: 'MISSING_FIELD', message: 'user_ids array required' } })

  try {
    const tenantId = getTenantId()
    const id       = String(req.params.id)
    const flow = await prisma.onboardingFlow.findFirst({ where: { id, tenant_id: tenantId } })
    if (!flow) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Flow not found' } })

    const created = await Promise.all(
      (user_ids as string[]).map(uid =>
        prisma.onboardingEnrollment.upsert({
          where:  { flow_id_user_id: { flow_id: id, user_id: uid } },
          update: { due_date: due_date ? new Date(due_date) : null },
          create: {
            tenant_id: tenantId,
            flow_id:   id,
            user_id:   uid,
            due_date:  due_date ? new Date(due_date) : null,
          },
        })
      )
    )
    res.json({ success: true, data: { enrolled: created.length } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// GET /onboarding/flows/:id/progress
onboardingRouter.get('/flows/:id/progress', requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId()
    const id       = String(req.params.id)
    const flow = await prisma.onboardingFlow.findFirst({
      where:   { id, tenant_id: tenantId },
      include: { steps: { orderBy: { order: 'asc' } } },
    }) as any
    if (!flow) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Flow not found' } })

    const enrollments = await prisma.onboardingEnrollment.findMany({
      where:   { flow_id: id, tenant_id: tenantId },
      include: {
        user:     { select: { id: true, name: true, email: true, job_role: true } },
        progress: true,
      },
      orderBy: { enrolled_at: 'asc' },
    }) as any[]

    const result = enrollments.map((e: any) => ({
      enrollment_id: e.id,
      user:          e.user,
      enrolled_at:   e.enrolled_at,
      due_date:      e.due_date,
      completed_at:  e.completed_at,
      steps_total:   flow.steps.length,
      steps_done:    e.progress.filter((p: any) => p.completed_at).length,
      progress:      e.progress,
    }))

    res.json({ success: true, data: { flow: { id: flow.id, name: flow.name, steps: flow.steps }, enrollments: result } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// ─── Staff: My Induction ──────────────────────────────────────────────────────

// GET /onboarding/my
onboardingRouter.get('/my', async (req, res) => {
  try {
    const tenantId = getTenantId()
    const userId   = req.user!.sub

    const enrollments = await prisma.onboardingEnrollment.findMany({
      where:   { user_id: userId, tenant_id: tenantId },
      include: {
        flow:     { include: { steps: { orderBy: { order: 'asc' } } } },
        progress: true,
      },
      orderBy: { enrolled_at: 'asc' },
    })

    const result = enrollments.map(e => ({
      enrollment_id: e.id,
      flow_id:       e.flow_id,
      flow_name:     e.flow.name,
      enrolled_at:   e.enrolled_at,
      due_date:      e.due_date,
      completed_at:  e.completed_at,
      steps:         e.flow.steps.map(s => ({
        ...s,
        progress: e.progress.find(p => p.step_id === s.id) ?? null,
      })),
    }))

    res.json({ success: true, data: { enrollments: result } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// POST /onboarding/enrollments/:enrollmentId/steps/:stepId/complete
onboardingRouter.post('/enrollments/:enrollmentId/steps/:stepId/complete', async (req, res) => {
  const { answer_text } = req.body
  try {
    const tenantId = getTenantId()
    const userId   = req.user!.sub

    const enrollment = await prisma.onboardingEnrollment.findFirst({
      where:   { id: req.params.enrollmentId, user_id: userId, tenant_id: tenantId },
      include: { flow: { include: { steps: { orderBy: { order: 'asc' } } } } },
    })
    if (!enrollment) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Enrollment not found' } })

    const step = enrollment.flow.steps.find(s => s.id === req.params.stepId)
    if (!step) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Step not found' } })

    let answer_correct: boolean | null = null

    if (step.type === 'answer_question' && step.question && answer_text) {
      const msg = await ai.messages.create({
        model:      'claude-haiku-4-5-20251001',
        max_tokens: 10,
        messages:   [{
          role:    'user',
          content: `Question: "${step.question}"\nStaff answer: "${answer_text}"\n\nIs this answer correct or broadly acceptable? Reply with only "yes" or "no".`,
        }],
      })
      const verdict = ((msg.content[0] as any).text as string)?.trim().toLowerCase()
      answer_correct = verdict === 'yes'
    }

    const progress = await prisma.onboardingProgress.upsert({
      where:  { enrollment_id_step_id: { enrollment_id: req.params.enrollmentId, step_id: req.params.stepId } },
      update: { completed_at: new Date(), answer_text: answer_text ?? null, answer_correct },
      create: {
        enrollment_id:  req.params.enrollmentId,
        step_id:        req.params.stepId,
        completed_at:   new Date(),
        answer_text:    answer_text ?? null,
        answer_correct,
      },
    })

    const allProgress = await prisma.onboardingProgress.findMany({ where: { enrollment_id: req.params.enrollmentId } })
    const allDone = enrollment.flow.steps.every(s => allProgress.some(p => p.step_id === s.id && p.completed_at))
    if (allDone && !enrollment.completed_at) {
      await prisma.onboardingEnrollment.update({ where: { id: req.params.enrollmentId }, data: { completed_at: new Date() } })
    }

    res.json({ success: true, data: { progress, enrollment_complete: allDone } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})
