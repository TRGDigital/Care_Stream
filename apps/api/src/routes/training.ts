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
import { blogImagePublicUrl } from '../lib/urls'
import { facilityTypeToSetting, settingFallbackOrder } from '../lib/care-setting'
import { translateQuestionCached, translateText, mapLimit, withTranslationBudget } from '../lib/translate'
import { languageNameForCode } from '../data/languages'
import { generateAnnualModuleDraft } from '../services/training/moduleGenerator'
import { TRAINING_TOPICS, renewalMonthsFor, TOPIC_GROUP_LABELS } from '../data/training-topics'
import { checkTrainingGenerationLimit, logTrainingGeneration, getTrainingGenerationUsage, PlanLimitError } from '../lib/plan-limits'

export const trainingRouter = Router()

// ─── Annual training: catalogue, AI generation, review/approve ────────────────

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

export async function ensureTrainingTopicsSeeded(): Promise<void> {
  const existing = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null }, select: { title: true } })
  const have = new Set((existing as any[]).map(t => t.title))
  const toCreate = TRAINING_TOPICS
    .map((t, i) => ({ ...t, sort_order: i + 1 }))
    .filter(t => !have.has(t.title))
    .map(t => ({
      tenant_id: null, title: t.title, group_key: t.group_key,
      default_frequency: t.default_frequency, requires_practical: !!t.requires_practical,
      image_key: t.group_key, aliases: t.aliases ?? [], sort_order: t.sort_order,
    }))
  if (toCreate.length) {
    await (prisma as any).trainingTopic.createMany({ data: toCreate }).catch((e: any) => console.error('[training-topics] seed failed:', e?.message ?? e))
  }
}

// GET /training/catalogue — topics to generate AI modules from + this tenant's modules
trainingRouter.get('/catalogue', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    await ensureTrainingTopicsSeeded()
    const sel = { id: true, name: true, topic_id: true, approved: true, frequency: true, requires_practical: true, pass_mark: true, group_key: true, image_key: true, questions: true, created_at: true }
    const [topics, modules, standard] = await Promise.all([
      (prisma as any).trainingTopic.findMany({ where: { OR: [{ tenant_id: null }, { tenant_id: tenantId }], is_active: true }, orderBy: { sort_order: 'asc' } }),
      (prisma as any).trainingModule.findMany({ where: { tenant_id: tenantId, source: 'ai_generated' }, select: sel }),
      // Platform standard library — published modules shared to all tenants.
      (prisma as any).trainingModule.findMany({ where: { tenant_id: null, source: 'ai_generated', approved: true }, select: sel }),
    ])
    const slim = (m: any) => ({ ...m, question_count: Array.isArray(m.questions) ? m.questions.length : 0, questions: undefined })
    const moduleByTopic = new Map<string, any>()
    for (const m of (modules as any[])) { if (m.topic_id) moduleByTopic.set(m.topic_id, slim(m)) }
    const standardByTopic = new Map<string, any>()
    for (const m of (standard as any[])) { if (m.topic_id) standardByTopic.set(m.topic_id, slim(m)) }
    ok(res, {
      groups: TOPIC_GROUP_LABELS,
      topics: (topics as any[]).map(t => ({ ...t, module: moduleByTopic.get(t.id) ?? null, standard_module: standardByTopic.get(t.id) ?? null })),
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// GET /training/generation-usage — tailored generations used vs the plan limit
trainingRouter.get('/generation-usage', requireAdmin, async (req: Request, res: Response) => {
  try { ok(res, await getTrainingGenerationUsage((req as any).user.tenant_id)) }
  catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

// POST /training/catalogue/generate — generate (or regenerate) a draft module from a topic
trainingRouter.post('/catalogue/generate', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const topicId  = String(req.body?.topic_id ?? '')
  if (!topicId) { err(res, 'VALIDATION_ERROR', 'topic_id is required'); return }
  try {
    const topic = await (prisma as any).trainingTopic.findFirst({ where: { id: topicId, OR: [{ tenant_id: null }, { tenant_id: tenantId }] } })
    if (!topic) { err(res, 'NOT_FOUND', 'Topic not found', 404); return }

    // Tailored generation is metered against the plan's monthly quota.
    try { await checkTrainingGenerationLimit(tenantId) }
    catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } throw e }

    const draft = await generateAnnualModuleDraft(tenantId, { title: topic.title, aliases: topic.aliases, requires_practical: topic.requires_practical })
    if (!draft.questions.length) { err(res, 'GENERATION_FAILED', 'No questions were generated — try again.', 502); return }

    const category = topic.group_key === 'role_specific' ? 'specialist' : 'statutory'
    const data = {
      name: draft.title,
      description: (draft.learning_content.summary || topic.title).slice(0, 500),
      category,
      questions: draft.questions,
      is_annual: !['once', 'adhoc'].includes(topic.default_frequency),
      source: 'ai_generated', approved: false, approved_at: null, approved_by: null,
      learning_content: draft.learning_content,
      requires_practical: !!topic.requires_practical,
      frequency: topic.default_frequency,
      renewal_months: renewalMonthsFor(topic.default_frequency),
      pass_mark: 80,
      image_key: topic.image_key ?? topic.group_key,
      policy_refs: draft.policy_refs,
      topic_id: topic.id,
      group_key: topic.group_key,
    }
    const slug = `ai-${kebab(topic.title)}`
    const existing = await (prisma as any).trainingModule.findFirst({ where: { tenant_id: tenantId, topic_id: topic.id } })
    const module = existing
      ? await (prisma as any).trainingModule.update({ where: { id: existing.id }, data })
      : await (prisma as any).trainingModule.create({ data: { tenant_id: tenantId, slug, ...data } })

    await logTrainingGeneration(tenantId, topic.id)
    ok(res, { module })
  } catch (e: any) {
    console.error('[training/generate] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// GET /training/modules/:id/full — full module (learning + questions) for review
trainingRouter.get('/modules/:id/full', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  ok(res, { module })
})

// PATCH /training/modules/:id — edit a draft (name, learning, questions, settings)
trainingRouter.patch('/modules/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const b = req.body ?? {}
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const data: any = {}
  if (typeof b.name === 'string') data.name = b.name.slice(0, 160)
  if (b.learning_content !== undefined) data.learning_content = b.learning_content
  if (Array.isArray(b.questions)) data.questions = b.questions
  if (typeof b.pass_mark === 'number') data.pass_mark = Math.max(0, Math.min(100, Math.round(b.pass_mark)))
  if (typeof b.frequency === 'string') { data.frequency = b.frequency; data.renewal_months = renewalMonthsFor(b.frequency); data.is_annual = !['once', 'adhoc'].includes(b.frequency) }
  if (typeof b.requires_practical === 'boolean') data.requires_practical = b.requires_practical
  const updated = await (prisma as any).trainingModule.update({ where: { id: module.id }, data })
  ok(res, { module: updated })
})

// POST /training/modules/:id/approve — publish a reviewed module
trainingRouter.post('/modules/:id/approve', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userName = (req as any).user.name ?? (req as any).user.email ?? null
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const approve = req.body?.approved !== false
  const updated = await (prisma as any).trainingModule.update({
    where: { id: module.id },
    data:  approve ? { approved: true, approved_at: new Date(), approved_by: userName } : { approved: false, approved_at: null, approved_by: null },
  })
  ok(res, { module: updated })
})

// Per-tenant training catalog: modules with tenant_id = null are shared platform
// templates; each tenant gets its own editable copies (cloned on first read) so
// editing/locking/regenerating questions only ever affects that tenant — never the
// shared seed or another tenant's bank.
async function ensureTenantModules(tenantId: string): Promise<void> {
  const count = await (prisma as any).trainingModule.count({ where: { tenant_id: tenantId } })
  if (count > 0) return
  // Only clone templates for this home's care setting (plus universal ones).
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } })
  const setting = facilityTypeToSetting(tenant?.facility_type)
  const templates = await (prisma as any).trainingModule.findMany({
    // Exclude AI annual modules — those are assigned directly, not cloned as
    // editable per-tenant copies (and they belong in Annual Training, not My Training).
    where: { tenant_id: null, source: { not: 'ai_generated' }, OR: [{ care_setting: setting }, { care_setting: null }] },
  })
  if (templates.length === 0) return
  await (prisma as any).trainingModule.createMany({
    data: templates.map((m: any) => ({
      tenant_id:           tenantId,
      care_setting:        m.care_setting,
      slug:                m.slug,
      name:                m.name,
      description:         m.description,
      category:            m.category,
      questions:           m.questions,
      is_annual:           m.is_annual,
      sort_order:          m.sort_order,
      is_active:           m.is_active,
      questions_locked:    m.questions_locked,
      questions_locked_at: m.questions_locked_at,
      questions_version:   m.questions_version,
    })),
    skipDuplicates: true,
  })
}

// GET /training/modules — list this tenant's active modules (cloning from templates on first access)
trainingRouter.get('/modules', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    await ensureTenantModules(tenantId)
    const modules = await (prisma as any).trainingModule.findMany({
      where:   { tenant_id: tenantId, is_active: true },
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
        include: { module: { select: { id: true, slug: true, name: true, category: true, sort_order: true, source: true, requires_practical: true } } },
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
    await ensureTenantModules(tenantId)
    const [members, modules] = await Promise.all([
      (prisma as any).user.findMany({ where: { id: { in: user_ids }, tenant_id: tenantId }, select: { id: true } }),
      // Only this tenant's own module copies are valid enrollment targets.
      // Valid targets: the tenant's own modules, OR a published platform standard module (tenant_id null).
      (prisma as any).trainingModule.findMany({ where: { id: { in: module_ids }, is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] }, select: { id: true } }),
    ])
    const validUserIds:   string[] = members.map((m: any) => m.id)
    const validModuleIds: string[] = modules.map((m: any) => m.id)
    if (validUserIds.length === 0)   { err(res, 'INVALID', 'No valid recipients for this organisation.', 400); return }
    if (validModuleIds.length === 0) { err(res, 'INVALID', 'No valid modules selected.', 400); return }

    // Batch: fetch existing (non-expired) enrollments in one query, then createMany
    // the missing (user × module) pairs — avoids an N×M findFirst/create loop.
    const existing = await (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: { in: validUserIds }, module_id: { in: validModuleIds }, status: { not: 'expired' } },
      select: { user_id: true, module_id: true },
    })
    const existingKeys = new Set(existing.map((e: any) => `${e.user_id}:${e.module_id}`))

    const toCreate: any[] = []
    for (const uid of validUserIds) {
      for (const mid of validModuleIds) {
        if (existingKeys.has(`${uid}:${mid}`)) continue
        toCreate.push({
          tenant_id:   tenantId,
          user_id:     uid,
          module_id:   mid,
          status:      'not_started',
          due_date:    due_date ? new Date(due_date) : null,
          assigned_by: userId,
        })
      }
    }
    if (toCreate.length > 0) {
      await (prisma as any).trainingEnrollment.createMany({ data: toCreate, skipDuplicates: true })
    }
    const created = toCreate.length
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
    const url  = blogImagePublicUrl(req, key)
    await (prisma as any).trainingEnrollment.update({
      where: { id: req.params.id },
      data:  { certificate_url: url, updated_at: new Date() },
    })
    ok(res, { certificate_url: url })
  } catch (e: any) {
    err(res, 'UPLOAD_FAILED', e.message, 500)
  }
})

// POST /training/enrollments/:id/reset — admin: clear progress so it can be retaken
trainingRouter.post('/enrollments/:id/reset', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  if ((req as any).user.role !== 'admin') { err(res, 'FORBIDDEN', 'Admins only', 403); return }
  try {
    const enrollment = await (prisma as any).trainingEnrollment.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
    if (!enrollment) { err(res, 'NOT_FOUND', 'Enrollment not found', 404); return }
    await (prisma as any).trainingAnswer.deleteMany({ where: { enrollment_id: req.params.id } })
    const updated = await (prisma as any).trainingEnrollment.update({
      where: { id: req.params.id },
      data:  { status: 'not_started', completed_at: null, expires_at: null, certificate_url: null, updated_at: new Date() },
    })
    ok(res, { enrollment: updated })
  } catch (e: any) {
    err(res, 'RESET_FAILED', e.message, 500)
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
    const [enrollments, user, tenant] = await Promise.all([
      (prisma as any).trainingEnrollment.findMany({
        where:   { tenant_id: tenantId, user_id: userId },
        include: {
          module:  { select: { id: true, name: true, category: true, description: true, questions: true, source: true } },
          answers: { orderBy: { answered_at: 'asc' } },
        },
        orderBy: { created_at: 'asc' },
      }),
      (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, comms_always_first_language: true } }),
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }),
    ])

    // Honour the staff member's language preference: when their comms toggle is
    // on (default) and their first language isn't English, deliver the module
    // name and every question (text + options) translated into it. Option order
    // is preserved, so the A/B/C/D answer mapping stays valid.
    const langCode = user?.comms_always_first_language === false ? 'eng' : ((user?.first_language as string) ?? 'eng')
    const langName = languageNameForCode(langCode, tenant?.custom_languages)
    const translate = langCode !== 'eng'

    // English baseline — always returned, even if translation fails.
    const baseline = (enrollments as any[])
      .filter((e: any) => e.module?.source !== 'ai_generated') // AI annual modules live in Annual Training
      .map((e: any) => ({
        ...e,
        module: {
          ...e.module,
          questions: (Array.isArray(e.module?.questions) ? e.module.questions : []).map(({ correct: _c, ...q }: any) => q),
        },
      }))
    console.log(`[my-enrollments] user=${userId} lang=${langCode} translate=${translate} count=${baseline.length}`)

    let sanitised = baseline
    if (translate) {
      const translateAll = Promise.all(baseline.map(async (e: any) => {
        const questions = await mapLimit(e.module.questions as any[], 6, async (q: any) => {
          const t = await translateQuestionCached({ text: q.text ?? '', options: Array.isArray(q.options) ? q.options : [] }, langCode, langName)
          return { ...q, text: t.text, options: t.options }
        })
        const name = await translateText(e.module.name, langCode, langName)
        return { ...e, module: { ...e.module, name, questions } }
      }))
      // Never let translation hang the request — fall back to English after the
      // budget; in-flight work still warms the cache for the next (fast) load.
      sanitised = await withTranslationBudget(translateAll, 18_000, baseline)
    }
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
  const tenantId = (req as any).user.tenant_id
  try {
    await ensureTenantModules(tenantId)
    // Scope to this tenant's own copy — never the shared template or another tenant's bank.
    const existing = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
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
  const tenantId = (req as any).user.tenant_id
  try {
    const { count } = await (prisma as any).trainingModule.updateMany({
      where: { id: req.params.id, tenant_id: tenantId },
      data:  { questions_locked: true, questions_locked_at: new Date() },
    })
    if (count === 0) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
    const module = await (prisma as any).trainingModule.findUnique({ where: { id: req.params.id } })
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
  const tenantId = (req as any).user.tenant_id
  try {
    const { count } = await (prisma as any).trainingModule.updateMany({
      where: { id: req.params.id, tenant_id: tenantId },
      data:  { questions_locked: false, questions_locked_at: null },
    })
    if (count === 0) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
    const module = await (prisma as any).trainingModule.findUnique({ where: { id: req.params.id } })
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
  const tenantId = (req as any).user.tenant_id
  try {
    // Only expose version history for this tenant's own module copy.
    const owned = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId }, select: { id: true } })
    if (!owned) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
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

// Ground training-question generation in the tenant's CARE-SETTING policy seeds.
// Picks the reviewed seeds most relevant to the module topic (keyword match), so a
// care home's training questions reference care-home policies, a nursing home's the
// nursing policies. Returns '' if nothing relevant — generation falls back to the seed.
async function settingSeedContextForModule(tenantId: string, moduleName: string): Promise<string> {
  try {
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } })
    const setting = facilityTypeToSetting(tenant?.facility_type)
    let metas: any[] = []
    for (const s of settingFallbackOrder(setting)) {
      metas = await (prisma as any).policySeed.findMany({ where: { reviewed: true, care_setting: s }, select: { id: true, section: true, title: true } })
      if (metas.length) break
    }
    if (metas.length === 0) return ''
    const words = moduleName.toLowerCase().split(/\s+/).filter(w => w.length > 3)
    const scored = metas
      .map(m => {
        const hay = `${m.section ?? ''} ${m.title ?? ''}`.toLowerCase()
        return { id: m.id as string, score: words.filter(w => hay.includes(w)).length }
      })
      .filter(x => x.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 3)
    if (scored.length === 0) return ''
    const full = await (prisma as any).policySeed.findMany({ where: { id: { in: scored.map(x => x.id) } }, select: { section: true, title: true, content: true } })
    return (full as any[]).map(f => `## ${f.section ?? f.title}\n${String(f.content).slice(0, 800)}`).join('\n\n')
  } catch { return '' }
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
  const tenantId = (req as any).user.tenant_id

  try {
    const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
    if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

    const seed = await (prisma as any).trainingSeed.findUnique({ where: { slug: module.slug } })
    if (!seed) {
      err(res, 'NO_SEED', `No training seed found for slug "${module.slug}". Add a training seed with that slug first.`, 422)
      return
    }

    const systemPrompt = await getTrainingPrompt()
    const policyContext = await settingSeedContextForModule(tenantId, module.name)
    const userMessage  = `${buildSeedContext(seed)}${policyContext ? `\n\nReference policy extracts from this home's care setting — base the questions on these where relevant:\n${policyContext}` : ''}\n\nGenerate exactly ${count} multiple-choice questions for this training topic.`

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
  const tenantId = (req as any).user.tenant_id

  try {
    const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: tenantId } })
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
      const mod = await (prisma as any).trainingModule.findFirst({ where: { id: rule.module_id, tenant_id: tenantId } })
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
    const mod = await (prisma as any).trainingModule.findFirst({ where: { id: module_id, tenant_id: tenantId } })
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
      const mod = await (prisma as any).trainingModule.findFirst({ where: { id: module_id, tenant_id: tenantId } })
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
    const mod = await (prisma as any).trainingModule.findFirst({ where: { id: module_id, tenant_id: tenantId } })
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
