import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { imageUploadMiddleware } from '../middleware/upload'
import { uploadBlogImage } from '../services/storage/s3'
import { sendProactiveTrainingQuestions } from '../services/training/proactive'
import { callClaude } from '../services/ai/claude'
import { notifyAdmin } from '../lib/notify'
import { sendTrainingUpdateEmail } from '../services/email/outbound'
import { requireAdmin } from '../middleware/auth'

export const trainingRouter = Router()

// GET /training/modules — list all active modules
trainingRouter.get('/modules', async (_req: Request, res: Response) => {
  try {
    const modules = await (prisma as any).trainingModule.findMany({
      where:   { is_active: true },
      orderBy: { sort_order: 'asc' },
    })
    ok(res, { modules })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// GET /training/compliance — full grid: all staff × enrolled modules
trainingRouter.get('/compliance', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    const [users, enrollments] = await Promise.all([
      (prisma as any).user.findMany({
        where:   { tenant_id: tenantId, is_active: true },
        orderBy: { name: 'asc' },
        select:  { id: true, name: true, email: true, job_role: true, shift_type: true },
      }),
      (prisma as any).trainingEnrollment.findMany({
        where:   { tenant_id: tenantId },
        include: { module: { select: { id: true, slug: true, name: true, category: true, sort_order: true } } },
        orderBy: { created_at: 'asc' },
      }),
    ])

    // Compute current status accounting for expiry
    const now = new Date()
    const enriched = enrollments.map((e: any) => {
      let status = e.status
      if (e.expires_at && new Date(e.expires_at) < now && status === 'complete') status = 'expired'
      const daysUntilExpiry = e.expires_at
        ? Math.ceil((new Date(e.expires_at).getTime() - now.getTime()) / 86400000)
        : null
      return { ...e, status, daysUntilExpiry }
    })

    ok(res, { users, enrollments: enriched })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// POST /training/enroll — assign modules to staff members (admin only)
trainingRouter.post('/enroll', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const { user_ids, module_ids, due_date } = req.body ?? {}

  if (!Array.isArray(user_ids) || user_ids.length === 0) {
    err(res, 'INVALID', 'user_ids required', 400); return
  }
  if (!Array.isArray(module_ids) || module_ids.length === 0) {
    err(res, 'INVALID', 'module_ids required', 400); return
  }

  try {
    // Restrict to user_ids that actually belong to this tenant, and module_ids that
    // exist and are active — prevents injecting foreign/arbitrary UUIDs into this
    // tenant's enrollment table (and emailing strangers).
    const [members, modules] = await Promise.all([
      (prisma as any).user.findMany({ where: { id: { in: user_ids }, tenant_id: tenantId }, select: { id: true } }),
      (prisma as any).trainingModule.findMany({ where: { id: { in: module_ids }, is_active: true }, select: { id: true } }),
    ])
    const validUserIds:   string[] = members.map((m: any) => m.id)
    const validModuleIds: string[] = modules.map((m: any) => m.id)
    if (validUserIds.length === 0)   { err(res, 'INVALID', 'No valid recipients for this organisation.', 400); return }
    if (validModuleIds.length === 0) { err(res, 'INVALID', 'No valid modules selected.', 400); return }

    let created = 0
    for (const uid of validUserIds) {
      for (const mid of validModuleIds) {
        const existing = await (prisma as any).trainingEnrollment.findFirst({
          where: { tenant_id: tenantId, user_id: uid, module_id: mid, status: { not: 'expired' } },
        })
        if (existing) continue
        await (prisma as any).trainingEnrollment.create({
          data: {
            tenant_id:   tenantId,
            user_id:     uid,
            module_id:   mid,
            status:      'not_started',
            due_date:    due_date ? new Date(due_date) : null,
            assigned_by: userId,
          },
        })
        created++
      }
    }
    ok(res, { enrolled: created })

    // Notify admin and send proactive questions (both fire-and-forget)
    if (created > 0) {
      const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
      notifyAdmin(tenantId, 'training_updates', (email, name) =>
        sendTrainingUpdateEmail({
          to: email, name, orgName: tenant?.name ?? '',
          subject: `Training assigned — ${validUserIds.length} staff member${validUserIds.length > 1 ? 's' : ''} enrolled`,
          bodyHtml: `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
            <strong>${created}</strong> training module assignment${created > 1 ? 's' : ''} have been created for
            <strong>${validUserIds.length}</strong> staff member${validUserIds.length > 1 ? 's' : ''} across
            <strong>${validModuleIds.length}</strong> module${validModuleIds.length > 1 ? 's' : ''}.
            Staff will be contacted via their configured channel to complete their training.
          </p>`,
        })
      ).catch(e => console.error('[training/enroll] Notify error:', e))
    }
    sendProactiveTrainingQuestions(tenantId, validUserIds, validModuleIds).catch(e =>
      console.error('[training/enroll] Proactive send error:', e)
    )
  } catch (e: any) {
    err(res, 'ENROLL_FAILED', e.message, 500)
  }
})

// GET /training/enrollments/:id — single enrollment with answers
trainingRouter.get('/enrollments/:id', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    const enrollment = await (prisma as any).trainingEnrollment.findFirst({
      where:   { id: req.params.id, tenant_id: tenantId },
      include: {
        module:  true,
        answers: { orderBy: { answered_at: 'asc' } },
        user:    { select: { id: true, name: true, job_role: true, email: true } },
      },
    })
    if (!enrollment) { err(res, 'NOT_FOUND', 'Enrollment not found', 404); return }
    ok(res, { enrollment })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// POST /training/enrollments/:id/answer — save an MCQ answer (A/B/C/D)
trainingRouter.post('/enrollments/:id/answer', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  // answer_text is the selected option letter: 'A', 'B', 'C', or 'D'
  const { question_id, answer_text } = req.body ?? {}
  if (!question_id || !answer_text?.trim()) {
    err(res, 'INVALID', 'question_id and answer_text required', 400); return
  }
  try {
    const enrollment = await (prisma as any).trainingEnrollment.findFirst({
      where:   { id: req.params.id, tenant_id: tenantId },
      include: { module: { select: { questions: true } } },
    })
    if (!enrollment) { err(res, 'NOT_FOUND', 'Enrollment not found', 404); return }

    // Only the enrolled staff member (or an admin) may answer — prevents one user
    // submitting/overwriting another user's assessment.
    if (enrollment.user_id !== (req as any).user.sub && (req as any).user.role !== 'admin') {
      err(res, 'FORBIDDEN', 'You can only answer your own training.', 403); return
    }

    // Determine if the selected option is correct
    const questions = (enrollment.module.questions as any[]) ?? []
    const question  = questions.find((q: any) => q.id === question_id)
    const OPTION_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
    const selectedIndex = OPTION_MAP[answer_text.trim().toUpperCase()] ?? -1
    const is_correct = question?.correct !== undefined && selectedIndex === question.correct

    await (prisma as any).trainingAnswer.upsert({
      where:  { enrollment_id_question_id: { enrollment_id: req.params.id, question_id } },
      update: { answer_text: answer_text.trim().toUpperCase(), is_correct, answered_at: new Date() },
      create: {
        enrollment_id: req.params.id,
        question_id,
        question_text: question?.text ?? null,
        answer_text:   answer_text.trim().toUpperCase(),
        is_correct,
      },
    })

    if (enrollment.status === 'not_started') {
      await (prisma as any).trainingEnrollment.update({
        where: { id: req.params.id },
        data:  { status: 'in_progress', updated_at: new Date() },
      })
    }

    ok(res, { saved: true, is_correct, correct_option: question ? OPTION_MAP[question.correct] : null })
  } catch (e: any) {
    err(res, 'SAVE_FAILED', e.message, 500)
  }
})

// POST /training/enrollments/:id/complete — mark complete, set expires_at
trainingRouter.post('/enrollments/:id/complete', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const { certificate_url } = req.body ?? {}
  try {
    const enrollment = await (prisma as any).trainingEnrollment.findFirst({
      where:   { id: req.params.id, tenant_id: tenantId },
      include: { module: { select: { is_annual: true } } },
    })
    if (!enrollment) { err(res, 'NOT_FOUND', 'Enrollment not found', 404); return }

    // Only the enrolled staff member (or an admin) may mark it complete —
    // prevents forging another user's training-completion record.
    if (enrollment.user_id !== (req as any).user.sub && (req as any).user.role !== 'admin') {
      err(res, 'FORBIDDEN', 'You can only complete your own training.', 403); return
    }

    const now = new Date()
    const expiresAt = enrollment.module.is_annual
      ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
      : null

    const updated = await (prisma as any).trainingEnrollment.update({
      where: { id: req.params.id },
      data: {
        status:          'complete',
        completed_at:    now,
        expires_at:      expiresAt,
        certificate_url: certificate_url ?? enrollment.certificate_url ?? null,
        updated_at:      now,
      },
    })
    ok(res, { enrollment: updated })
  } catch (e: any) {
    err(res, 'COMPLETE_FAILED', e.message, 500)
  }
})

// POST /training/enrollments/:id/upload-certificate — upload cert file
trainingRouter.post('/enrollments/:id/upload-certificate', imageUploadMiddleware, async (req: any, res: Response) => {
  const tenantId = req.user.tenant_id
  if (!req.file) { err(res, 'NO_FILE', 'No file provided', 400); return }
  try {
    const enrollment = await (prisma as any).trainingEnrollment.findFirst({
      where: { id: req.params.id, tenant_id: tenantId },
    })
    if (!enrollment) { err(res, 'NOT_FOUND', 'Enrollment not found', 404); return }

    // Only the enrolled staff member (or an admin) may attach a certificate.
    if (enrollment.user_id !== req.user.sub && req.user.role !== 'admin') {
      err(res, 'FORBIDDEN', 'You can only upload a certificate for your own training.', 403); return
    }

    const key  = await uploadBlogImage({
      filename: req.file.originalname,
      buffer:   req.file.buffer,
      mimeType: req.file.mimetype,
    })
    const file = key.split('/').pop()
    const url  = `${req.protocol}://${req.get('host')}/public/blog/image/${file}`
    await (prisma as any).trainingEnrollment.update({
      where: { id: req.params.id },
      data:  { certificate_url: url, updated_at: new Date() },
    })
    ok(res, { certificate_url: url })
  } catch (e: any) {
    err(res, 'UPLOAD_FAILED', e.message, 500)
  }
})

// DELETE /training/enrollments/:id — remove enrollment
trainingRouter.delete('/enrollments/:id', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    await (prisma as any).trainingEnrollment.deleteMany({
      where: { id: req.params.id, tenant_id: tenantId },
    })
    ok(res, { deleted: true })
  } catch (e: any) {
    err(res, 'DELETE_FAILED', e.message, 500)
  }
})

// GET /training/my-enrollments — staff portal: current user's enrollments with questions (correct field stripped) + their answers
trainingRouter.get('/my-enrollments', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const tenantId = (req as any).user.tenant_id
  try {
    const enrollments = await (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: userId },
      include: {
        module:  { select: { id: true, name: true, category: true, description: true, questions: true } },
        answers: { orderBy: { answered_at: 'asc' } },
      },
      orderBy: { created_at: 'asc' },
    })
    // Strip the 'correct' index from questions before sending to staff
    const sanitised = enrollments.map((e: any) => ({
      ...e,
      module: {
        ...e.module,
        questions: (e.module.questions as any[]).map(({ correct: _c, ...q }) => q),
      },
    }))
    ok(res, { enrollments: sanitised })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// GET /training/settings — get notification settings for this tenant
trainingRouter.get('/settings', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    const tenant = await (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: { training_settings: true },
    })
    ok(res, { settings: tenant?.training_settings ?? {} })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// PATCH /training/modules/:id/questions — replace questions array (admin only)
// Always creates a version snapshot and unlocks the module for review before re-locking.
trainingRouter.patch('/modules/:id/questions', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required', 403); return
  }
  const { questions } = req.body ?? {}
  if (!Array.isArray(questions)) {
    err(res, 'INVALID', 'questions must be an array', 400); return
  }
  const cleaned = questions
    .filter((q: any) => q.text?.trim())
    .map((q: any) => ({
      id:      q.id || randomUUID(),
      text:    q.text.trim(),
      options: Array.isArray(q.options) ? q.options : [],
      correct: typeof q.correct === 'number' ? q.correct : 0,
    }))
  try {
    const existing = await (prisma as any).trainingModule.findUnique({ where: { id: req.params.id } })
    if (!existing) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

    const nextVersion = (existing.questions_version ?? 0) + 1
    const createdBy   = (req as any).user.name ?? (req as any).user.email ?? 'admin'

    const [module] = await (prisma as any).$transaction([
      (prisma as any).trainingModule.update({
        where: { id: req.params.id },
        data:  {
          questions:        cleaned,
          questions_version: nextVersion,
          questions_locked:  false,      // saving always unlocks; admin must re-lock explicitly
          questions_locked_at: null,
        },
      }),
      (prisma as any).trainingQuestionVersion.create({
        data: {
          id:         randomUUID(),
          module_id:  req.params.id,
          version:    nextVersion,
          questions:  cleaned,
          created_by: createdBy,
        },
      }),
    ])

    ok(res, { module })
  } catch (e: any) {
    err(res, 'UPDATE_FAILED', e.message, 500)
  }
})

// POST /training/modules/:id/lock — lock current questions (admin only)
trainingRouter.post('/modules/:id/lock', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required', 403); return
  }
  try {
    const module = await (prisma as any).trainingModule.update({
      where: { id: req.params.id },
      data:  { questions_locked: true, questions_locked_at: new Date() },
    })
    ok(res, { module })
  } catch (e: any) {
    err(res, 'LOCK_FAILED', e.message, 500)
  }
})

// POST /training/modules/:id/unlock — unlock questions for editing (admin only)
trainingRouter.post('/modules/:id/unlock', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required', 403); return
  }
  try {
    const module = await (prisma as any).trainingModule.update({
      where: { id: req.params.id },
      data:  { questions_locked: false, questions_locked_at: null },
    })
    ok(res, { module })
  } catch (e: any) {
    err(res, 'UNLOCK_FAILED', e.message, 500)
  }
})

// GET /training/modules/:id/versions — full version history (admin only)
trainingRouter.get('/modules/:id/versions', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required', 403); return
  }
  try {
    const versions = await (prisma as any).trainingQuestionVersion.findMany({
      where:   { module_id: req.params.id },
      orderBy: { version: 'desc' },
    })
    ok(res, { versions })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── AI generation helpers ────────────────────────────────────────────────────

const FALLBACK_QUESTION_PROMPT = `You are a training question writer for UK care homes.
Given a training topic and its knowledge context, generate multiple-choice assessment questions.
Each question must have exactly 4 options (A, B, C, D) and one correct answer.
Output ONLY a JSON array — no markdown, no explanation.
Format: [{"text":"Question text","options":["Option A","Option B","Option C","Option D"],"correct":0}]
"correct" is the zero-based index of the correct option.`

async function getTrainingPrompt(): Promise<string> {
  try {
    const prompt = await (prisma as any).aiPrompt.findUnique({
      where: { usage: 'training_question_generation' },
    })
    if (prompt?.content) return prompt.content
  } catch { /* fall through */ }
  return FALLBACK_QUESTION_PROMPT
}

function buildSeedContext(seed: any): string {
  return [
    `Training topic: ${seed.training_type}`,
    seed.summary            && `Summary: ${seed.summary}`,
    seed.care_context       && `Care home context: ${seed.care_context}`,
    seed.care_company_interaction && `Organisation responsibilities: ${seed.care_company_interaction}`,
    seed.practical_meaning  && `What staff must know in practice: ${seed.practical_meaning}`,
    seed.also_known_as?.length && `Also known as: ${seed.also_known_as.join(', ')}`,
  ].filter(Boolean).join('\n\n')
}

function parseGeneratedQuestions(raw: string): Array<{ text: string; options: string[]; correct: number }> {
  const clean = raw.replace(/^```(?:json)?\s*/i, '').replace(/\s*```\s*$/, '').trim()
  try {
    const parsed = JSON.parse(clean)
    if (!Array.isArray(parsed)) return []
    return parsed.filter((q: any) =>
      typeof q.text === 'string' &&
      Array.isArray(q.options) && q.options.length === 4 &&
      typeof q.correct === 'number'
    )
  } catch {
    return []
  }
}

// POST /training/modules/:id/generate-questions — generate question texts from training seed
trainingRouter.post('/modules/:id/generate-questions', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required', 403); return
  }
  const count = Math.min(parseInt(req.body?.count ?? '8', 10) || 8, 20)

  try {
    const module = await (prisma as any).trainingModule.findUnique({ where: { id: req.params.id } })
    if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

    const seed = await (prisma as any).trainingSeed.findUnique({ where: { slug: module.slug } })
    if (!seed) {
      err(res, 'NO_SEED', `No training seed found for slug "${module.slug}". Add a training seed with that slug first.`, 422)
      return
    }

    const systemPrompt = await getTrainingPrompt()
    const userMessage  = `${buildSeedContext(seed)}\n\nGenerate exactly ${count} multiple-choice questions for this training topic.`

    const raw       = await callClaude(systemPrompt, userMessage, { maxTokens: 4096, temperature: 0.6 })
    const generated = parseGeneratedQuestions(raw)

    if (generated.length === 0) {
      err(res, 'PARSE_FAILED', 'AI returned no valid questions. Check the training_question_generation prompt.', 500)
      return
    }

    const questions = generated.map(q => ({
      id:      randomUUID(),
      text:    q.text,
      options: q.options,
      correct: q.correct,
    }))

    ok(res, { questions })
  } catch (e: any) {
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// POST /training/modules/:id/generate-answers — generate A/B/C/D options for existing question texts
trainingRouter.post('/modules/:id/generate-answers', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') {
    err(res, 'FORBIDDEN', 'Admin access required', 403); return
  }
  const { questions } = req.body ?? {}
  if (!Array.isArray(questions) || questions.length === 0) {
    err(res, 'INVALID', 'questions array required', 400); return
  }

  try {
    const module = await (prisma as any).trainingModule.findUnique({ where: { id: req.params.id } })
    if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

    const seed = await (prisma as any).trainingSeed.findUnique({ where: { slug: module.slug } })
    if (!seed) {
      err(res, 'NO_SEED', `No training seed found for slug "${module.slug}". Add a training seed with that slug first.`, 422)
      return
    }

    const systemPrompt = await getTrainingPrompt()
    const questionList = questions.map((q: any, i: number) => `${i + 1}. ${q.text}`).join('\n')
    const userMessage  = `${buildSeedContext(seed)}\n\nFor each of the following questions, generate exactly 4 answer options (A, B, C, D) and identify the correct one.\nReturn the same number of questions as given, in the same order.\n\nQuestions:\n${questionList}`

    const raw       = await callClaude(systemPrompt, userMessage, { maxTokens: 4096, temperature: 0.4 })
    const generated = parseGeneratedQuestions(raw)

    if (generated.length === 0) {
      err(res, 'PARSE_FAILED', 'AI returned no valid answers. Check the training_question_generation prompt.', 500)
      return
    }

    // Merge generated options back onto the original question IDs
    const enriched = questions.map((q: any, i: number) => ({
      id:      q.id ?? randomUUID(),
      text:    q.text,
      options: generated[i]?.options ?? ['', '', '', ''],
      correct: generated[i]?.correct ?? 0,
    }))

    ok(res, { questions: enriched })
  } catch (e: any) {
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// PATCH /training/settings — update notification settings
trainingRouter.patch('/settings', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const { notifications_enabled, notify_90d, notify_30d, notify_7d, notify_manager, question_trigger } = req.body ?? {}
  try {
    const tenant = await (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: { training_settings: true },
    })
    const current = (tenant?.training_settings as any) ?? {}
    const updated = {
      ...current,
      ...(notifications_enabled !== undefined && { notifications_enabled }),
      ...(notify_90d !== undefined && { notify_90d }),
      ...(notify_30d !== undefined && { notify_30d }),
      ...(notify_7d !== undefined && { notify_7d }),
      ...(notify_manager    !== undefined && { notify_manager }),
      ...(question_trigger  !== undefined && { question_trigger }),
    }
    await (prisma as any).tenant.update({
      where: { id: tenantId },
      data:  { training_settings: updated },
    })
    ok(res, { settings: updated })
  } catch (e: any) {
    err(res, 'UPDATE_FAILED', e.message, 500)
  }
})

// ─── Delivery Rules ────────────────────────────────────────────────────────────

// GET /training/delivery-rules — list all rules for tenant
trainingRouter.get('/delivery-rules', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    const rules = await (prisma as any).trainingDeliveryRule.findMany({
      where:   { tenant_id: tenantId },
      orderBy: { created_at: 'asc' },
    })
    ok(res, { rules })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// POST /training/delivery-rules — create a new rule
trainingRouter.post('/delivery-rules', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  const adminId  = (req as any).user.sub
  const {
    name, module_id, target_audience = 'all', target_user_ids = [],
    days_of_week = [], send_time, questions_per_send = 3,
    frequency_cap_day, frequency_cap_week,
  } = req.body ?? {}
  if (!name?.trim()) { err(res, 'INVALID', 'name required', 400); return }
  try {
    const rule = await (prisma as any).trainingDeliveryRule.create({
      data: {
        id:                 randomUUID(),
        tenant_id:          tenantId,
        module_id:          module_id ?? null,
        name:               name.trim(),
        rule_type:          'scheduled',
        target_audience,
        target_user_ids:    Array.isArray(target_user_ids) ? target_user_ids : [],
        days_of_week:       Array.isArray(days_of_week) ? days_of_week : [],
        send_time:          send_time ?? null,
        questions_per_send: Number(questions_per_send) || 3,
        frequency_cap_day:  frequency_cap_day  ? Number(frequency_cap_day)  : null,
        frequency_cap_week: frequency_cap_week ? Number(frequency_cap_week) : null,
        created_by:         adminId,
      },
    })
    ok(res, { rule }, 201)
  } catch (e: any) {
    err(res, 'CREATE_FAILED', e.message, 500)
  }
})

// PATCH /training/delivery-rules/:id — update rule fields or toggle active
trainingRouter.patch('/delivery-rules/:id', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  const existing = await (prisma as any).trainingDeliveryRule.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })
  if (!existing) { err(res, 'NOT_FOUND', 'Rule not found', 404); return }

  const {
    name, module_id, target_audience, target_user_ids,
    days_of_week, send_time, questions_per_send,
    frequency_cap_day, frequency_cap_week, is_active,
  } = req.body ?? {}

  const data: Record<string, any> = {}
  if (name               !== undefined) data.name               = name.trim()
  if (module_id          !== undefined) data.module_id          = module_id ?? null
  if (target_audience    !== undefined) data.target_audience    = target_audience
  if (target_user_ids    !== undefined) data.target_user_ids    = target_user_ids
  if (days_of_week       !== undefined) data.days_of_week       = days_of_week
  if (send_time          !== undefined) data.send_time          = send_time ?? null
  if (questions_per_send !== undefined) data.questions_per_send = Number(questions_per_send) || 3
  if (frequency_cap_day  !== undefined) data.frequency_cap_day  = frequency_cap_day  ? Number(frequency_cap_day)  : null
  if (frequency_cap_week !== undefined) data.frequency_cap_week = frequency_cap_week ? Number(frequency_cap_week) : null
  if (is_active          !== undefined) data.is_active          = Boolean(is_active)

  try {
    const rule = await (prisma as any).trainingDeliveryRule.update({
      where: { id: req.params.id },
      data,
    })
    ok(res, { rule })
  } catch (e: any) {
    err(res, 'UPDATE_FAILED', e.message, 500)
  }
})

// DELETE /training/delivery-rules/:id
trainingRouter.delete('/delivery-rules/:id', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  try {
    await (prisma as any).trainingDeliveryRule.deleteMany({
      where: { id: req.params.id, tenant_id: tenantId },
    })
    ok(res, { deleted: true })
  } catch (e: any) {
    err(res, 'DELETE_FAILED', e.message, 500)
  }
})

// POST /training/delivery-rules/:id/trigger — manually trigger a scheduled rule now
trainingRouter.post('/delivery-rules/:id/trigger', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  const adminId  = (req as any).user.sub
  try {
    const rule = await (prisma as any).trainingDeliveryRule.findFirst({
      where: { id: req.params.id, tenant_id: tenantId },
    })
    if (!rule) { err(res, 'NOT_FOUND', 'Rule not found', 404); return }

    const staffFilter: Record<string, any> = { tenant_id: tenantId, is_active: true, role: 'staff' }
    if (rule.target_audience === 'day_shift')  staffFilter.shift_type = 'day'
    if (rule.target_audience === 'night_shift') staffFilter.shift_type = 'night'
    if (rule.target_audience === 'specific')   staffFilter.id = { in: rule.target_user_ids }

    const staff = await (prisma as any).user.findMany({
      where: staffFilter, select: { id: true, name: true },
    })

    let questionIds: string[] = []
    if (rule.module_id) {
      const mod = await (prisma as any).trainingModule.findUnique({ where: { id: rule.module_id } })
      if (mod) questionIds = (mod.questions as any[]).slice(0, rule.questions_per_send).map((q: any) => q.id)
    }

    if (staff.length > 0) {
      await (prisma as any).trainingSendLog.createMany({
        data: staff.map((s: any) => ({
          id: randomUUID(), tenant_id: tenantId, rule_id: rule.id,
          module_id: rule.module_id ?? null, user_id: s.id,
          question_ids: questionIds, trigger_type: 'manual',
          triggered_by: adminId, context: `Manual trigger of rule "${rule.name}"`,
        })),
      })
      if (rule.module_id) {
        sendProactiveTrainingQuestions(tenantId, staff.map((s: any) => s.id), [rule.module_id])
          .catch((e: any) => console.error('[delivery-rules/trigger] send error:', e))
      }
    }

    ok(res, { sent_to: staff.length, staff_names: staff.map((s: any) => s.name) })
  } catch (e: any) {
    err(res, 'TRIGGER_FAILED', e.message, 500)
  }
})

// POST /training/manual-send — one-off manual send to a target audience
trainingRouter.post('/manual-send', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  const adminId  = (req as any).user.sub
  const { module_id, target_audience = 'all', target_user_ids = [], questions_per_send = 3 } = req.body ?? {}
  if (!module_id) { err(res, 'INVALID', 'module_id required', 400); return }
  try {
    const staffFilter: Record<string, any> = { tenant_id: tenantId, is_active: true, role: 'staff' }
    if (target_audience === 'day_shift')  staffFilter.shift_type = 'day'
    if (target_audience === 'night_shift') staffFilter.shift_type = 'night'
    if (target_audience === 'specific')   staffFilter.id = { in: target_user_ids }

    const staff = await (prisma as any).user.findMany({
      where: staffFilter, select: { id: true, name: true },
    })
    const mod = await (prisma as any).trainingModule.findUnique({ where: { id: module_id } })
    const questionIds = mod
      ? (mod.questions as any[]).slice(0, Number(questions_per_send) || 3).map((q: any) => q.id)
      : []

    if (staff.length > 0) {
      await (prisma as any).trainingSendLog.createMany({
        data: staff.map((s: any) => ({
          id: randomUUID(), tenant_id: tenantId, rule_id: null,
          module_id, user_id: s.id, question_ids: questionIds,
          trigger_type: 'manual', triggered_by: adminId, context: 'Manual send',
        })),
      })
      sendProactiveTrainingQuestions(tenantId, staff.map((s: any) => s.id), [module_id])
        .catch((e: any) => console.error('[manual-send] send error:', e))
    }

    ok(res, { sent_to: staff.length, staff_names: staff.map((s: any) => s.name) })
  } catch (e: any) {
    err(res, 'TRIGGER_FAILED', e.message, 500)
  }
})

// POST /training/return-to-work — send refresher pulse to a staff member returning from absence
trainingRouter.post('/return-to-work', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  const adminId  = (req as any).user.sub
  const { user_id, module_id, notes } = req.body ?? {}
  if (!user_id) { err(res, 'INVALID', 'user_id required', 400); return }
  try {
    const user = await (prisma as any).user.findFirst({
      where: { id: user_id, tenant_id: tenantId }, select: { id: true, name: true },
    })
    if (!user) { err(res, 'NOT_FOUND', 'Staff member not found', 404); return }

    let questionIds: string[] = []
    if (module_id) {
      const mod = await (prisma as any).trainingModule.findUnique({ where: { id: module_id } })
      if (mod) questionIds = (mod.questions as any[]).slice(0, 3).map((q: any) => q.id)
    }

    await (prisma as any).trainingSendLog.create({
      data: {
        id: randomUUID(), tenant_id: tenantId, rule_id: null,
        module_id: module_id ?? null, user_id,
        question_ids: questionIds, trigger_type: 'return_to_work',
        triggered_by: adminId, context: notes ?? 'Return to work refresher',
      },
    })
    if (module_id) {
      sendProactiveTrainingQuestions(tenantId, [user_id], [module_id])
        .catch((e: any) => console.error('[return-to-work] send error:', e))
    }
    ok(res, { triggered: true, staff_name: user.name })
  } catch (e: any) {
    err(res, 'TRIGGER_FAILED', e.message, 500)
  }
})

// POST /training/post-incident — push targeted question to staff after an incident
trainingRouter.post('/post-incident', async (req: Request, res: Response) => {
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admin access required', 403); return }
  const tenantId = (req as any).user.tenant_id
  const adminId  = (req as any).user.sub
  const { module_id, target_audience = 'all', target_user_ids = [], incident_description } = req.body ?? {}
  if (!module_id)            { err(res, 'INVALID', 'module_id required', 400); return }
  if (!incident_description) { err(res, 'INVALID', 'incident_description required', 400); return }
  try {
    const staffFilter: Record<string, any> = { tenant_id: tenantId, is_active: true, role: 'staff' }
    if (target_audience === 'day_shift')  staffFilter.shift_type = 'day'
    if (target_audience === 'night_shift') staffFilter.shift_type = 'night'
    if (target_audience === 'specific')   staffFilter.id = { in: target_user_ids }

    const staff = await (prisma as any).user.findMany({
      where: staffFilter, select: { id: true, name: true },
    })
    const mod = await (prisma as any).trainingModule.findUnique({ where: { id: module_id } })
    const questionIds = mod
      ? (mod.questions as any[]).slice(0, 3).map((q: any) => q.id)
      : []

    if (staff.length > 0) {
      await (prisma as any).trainingSendLog.createMany({
        data: staff.map((s: any) => ({
          id: randomUUID(), tenant_id: tenantId, rule_id: null,
          module_id, user_id: s.id, question_ids: questionIds,
          trigger_type: 'post_incident', triggered_by: adminId,
          context: incident_description,
        })),
      })
      sendProactiveTrainingQuestions(tenantId, staff.map((s: any) => s.id), [module_id])
        .catch((e: any) => console.error('[post-incident] send error:', e))
    }
    ok(res, { sent_to: staff.length, staff_names: staff.map((s: any) => s.name) })
  } catch (e: any) {
    err(res, 'TRIGGER_FAILED', e.message, 500)
  }
})

// GET /training/send-log — recent send activity, enriched with user/module names
trainingRouter.get('/send-log', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const limit    = Math.min(parseInt((req.query as any).limit ?? '50', 10) || 50, 100)
  try {
    const logs = await (prisma as any).trainingSendLog.findMany({
      where: { tenant_id: tenantId }, orderBy: { sent_at: 'desc' }, take: limit,
    })
    const userIds   = [...new Set<string>(logs.map((l: any) => l.user_id))]
    const moduleIds = [...new Set<string>(logs.map((l: any) => l.module_id).filter(Boolean))]
    const [users, modules] = await Promise.all([
      (prisma as any).user.findMany({
        where: { id: { in: userIds } }, select: { id: true, name: true, job_role: true, shift_type: true },
      }),
      (prisma as any).trainingModule.findMany({
        where: { id: { in: moduleIds } }, select: { id: true, name: true },
      }),
    ])
    const userMap   = Object.fromEntries(users.map((u: any) => [u.id, u]))
    const moduleMap = Object.fromEntries(modules.map((m: any) => [m.id, m]))
    ok(res, {
      logs: logs.map((l: any) => ({
        ...l,
        user:   userMap[l.user_id] ?? { id: l.user_id, name: 'Unknown' },
        module: l.module_id ? (moduleMap[l.module_id] ?? null) : null,
      })),
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})
