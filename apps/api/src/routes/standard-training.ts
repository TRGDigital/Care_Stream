// Platform Console — standard annual-training library. Platform admins generate,
// review and publish standard modules (grounded in anonymised policy seeds, not a
// tenant's policies). Published standard modules (TrainingModule with
// tenant_id = null, source = 'ai_generated', approved = true) are available to
// every tenant to assign at no AI-generation cost.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { generateAnnualModuleDraft, normaliseQuestion } from '../services/training/moduleGenerator'
import { generateModuleIllustration, illustrationUrl } from '../services/training/moduleImage'
import { ensureTrainingTopicsSeeded } from './training'
import { renewalMonthsFor, TOPIC_GROUP_LABELS } from '../data/training-topics'

export const standardTrainingRouter = Router()
standardTrainingRouter.use(requirePlatformAdmin)

// Modules whose questions were last set more than this long ago are flagged for review.
const REGEN_INTERVAL_MONTHS = 6

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

function questionTexts(questions: any): string[] {
  return (Array.isArray(questions) ? questions : []).map((q: any) => String(q?.text ?? '')).filter(Boolean)
}

// Every distinct question text ever used by a module: current bank + all snapshots.
async function gatherUsedQuestions(moduleId: string, currentQuestions: any): Promise<{ texts: string[]; versions: Array<{ version: number; count: number; created_at: Date }> }> {
  const versions = await (prisma as any).trainingQuestionVersion.findMany({
    where: { module_id: moduleId }, orderBy: { version: 'desc' },
    select: { version: true, questions: true, created_at: true },
  }).catch(() => [])
  const seen = new Set<string>()
  const texts: string[] = []
  const push = (t: string) => { const k = normaliseQuestion(t); if (k && !seen.has(k)) { seen.add(k); texts.push(t) } }
  for (const t of questionTexts(currentQuestions)) push(t)
  for (const v of (versions as any[])) for (const t of questionTexts(v.questions)) push(t)
  return {
    texts,
    versions: (versions as any[]).map(v => ({ version: v.version, count: questionTexts(v.questions).length, created_at: v.created_at })),
  }
}

// GET /admin/standard-training — catalogue topics + their standard module
standardTrainingRouter.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureTrainingTopicsSeeded()
    const [topics, modules] = await Promise.all([
      (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, orderBy: { sort_order: 'asc' } }),
      (prisma as any).trainingModule.findMany({
        where:  { tenant_id: null, source: 'ai_generated' },
        select: { id: true, name: true, topic_id: true, approved: true, approved_at: true, created_at: true, frequency: true, requires_practical: true, pass_mark: true, group_key: true, image_key: true, illustration_key: true, questions: true },
      }),
    ])
    const byTopic = new Map<string, any>()
    for (const m of (modules as any[])) { if (m.topic_id) byTopic.set(m.topic_id, { ...m, illustration_url: illustrationUrl(m.illustration_key), question_count: Array.isArray(m.questions) ? m.questions.length : 0, questions: undefined }) }
    ok(res, { groups: TOPIC_GROUP_LABELS, topics: (topics as any[]).map(t => ({ ...t, module: byTopic.get(t.id) ?? null })) })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// POST /admin/standard-training/generate — generate/regenerate a standard module (seed-grounded)
standardTrainingRouter.post('/generate', async (req: Request, res: Response) => {
  const topicId = String(req.body?.topic_id ?? '')
  if (!topicId) { err(res, 'VALIDATION_ERROR', 'topic_id is required'); return }
  try {
    const topic = await (prisma as any).trainingTopic.findFirst({ where: { id: topicId, tenant_id: null } })
    if (!topic) { err(res, 'NOT_FOUND', 'Topic not found', 404); return }

    const draft = await generateAnnualModuleDraft(null, { title: topic.title, aliases: topic.aliases, requires_practical: topic.requires_practical })
    if (!draft.questions.length) { err(res, 'GENERATION_FAILED', 'No questions were generated — try again.', 502); return }

    const data = {
      name: draft.title,
      description: (draft.learning_content.summary || topic.title).slice(0, 500),
      category: topic.group_key === 'role_specific' ? 'specialist' : 'statutory',
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
    const existing = await (prisma as any).trainingModule.findFirst({ where: { tenant_id: null, source: 'ai_generated', topic_id: topic.id } })
    const module = existing
      ? await (prisma as any).trainingModule.update({ where: { id: existing.id }, data })
      : await (prisma as any).trainingModule.create({ data: { tenant_id: null, slug: `std-${kebab(topic.title)}`, ...data } })
    ok(res, { module })
  } catch (e: any) {
    console.error('[standard-training/generate] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// GET /admin/standard-training/modules/:id/full — module + question-history summary
standardTrainingRouter.get('/modules/:id/full', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

  const { texts, versions } = await gatherUsedQuestions(module.id, module.questions)
  const lastRegen = versions.length ? versions[0].created_at : null
  // "Questions current since" = the most recent regeneration, else when the module was created.
  const since = lastRegen ?? module.created_at
  const dueAt = since ? new Date(new Date(since).setMonth(new Date(since).getMonth() + REGEN_INTERVAL_MONTHS)) : null
  const reviewDue = !!dueAt && dueAt.getTime() <= Date.now()

  ok(res, {
    module: { ...module, illustration_url: illustrationUrl(module.illustration_key) },
    question_history: {
      used_count:         texts.length,
      prior_versions:     versions.length,
      last_regenerated_at: lastRegen,
      review_due:         reviewDue,
      review_due_at:      dueAt,
      interval_months:    REGEN_INTERVAL_MONTHS,
    },
  })
})

// POST /admin/standard-training/modules/:id/regenerate-questions — fresh question
// bank that avoids every question ever used (snapshots the old bank first).
standardTrainingRouter.post('/modules/:id/regenerate-questions', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  try {
    const topic = module.topic_id
      ? await (prisma as any).trainingTopic.findFirst({ where: { id: module.topic_id } }).catch(() => null)
      : null
    const topicArg = {
      title: topic?.title ?? module.name,
      aliases: topic?.aliases ?? [],
      requires_practical: !!(topic?.requires_practical ?? module.requires_practical),
    }

    const { texts } = await gatherUsedQuestions(module.id, module.questions)

    // Snapshot the current bank into history BEFORE replacing it.
    const currentQs = questionTexts(module.questions)
    if (currentQs.length) {
      const maxV = await (prisma as any).trainingQuestionVersion.aggregate({ where: { module_id: module.id }, _max: { version: true } }).catch(() => ({ _max: { version: 0 } }))
      const nextV = ((maxV?._max?.version as number) ?? 0) + 1
      await (prisma as any).trainingQuestionVersion.create({
        data: { module_id: module.id, version: nextV, questions: module.questions, created_by: 'Platform' },
      }).catch((e: any) => console.error('[std-training/regen] snapshot failed:', e?.message ?? e))
    }

    const draft = await generateAnnualModuleDraft(null, topicArg, { excludeQuestions: texts })
    if (!draft.questions.length) { err(res, 'GENERATION_FAILED', 'No new questions were generated — try again.', 502); return }

    // Back to draft so the new bank is reviewed before publishing to all tenants.
    const updated = await (prisma as any).trainingModule.update({
      where: { id: module.id },
      data:  {
        questions: draft.questions,
        questions_version: { increment: 1 },
        approved: false, approved_at: null, approved_by: null,
      },
    })
    ok(res, { module: { ...updated, illustration_url: illustrationUrl(updated.illustration_key) }, generated: draft.questions.length, avoided: texts.length })
  } catch (e: any) {
    console.error('[std-training/regenerate-questions] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// POST /admin/standard-training/modules/:id/generate-image — generate a cover illustration (free, platform-side)
standardTrainingRouter.post('/modules/:id/generate-image', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null }, select: { id: true } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  try {
    const key = await generateModuleIllustration(module.id)
    ok(res, { illustration_url: illustrationUrl(key) })
  } catch (e: any) {
    console.error('[standard-training/generate-image] failed:', e?.message ?? e)
    err(res, 'IMAGE_FAILED', e.message ?? 'Image generation failed', 500)
  }
})

// PATCH /admin/standard-training/modules/:id
standardTrainingRouter.patch('/modules/:id', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
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

// POST /admin/standard-training/modules/:id/approve
standardTrainingRouter.post('/modules/:id/approve', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const approve = req.body?.approved !== false
  const updated = await (prisma as any).trainingModule.update({
    where: { id: module.id },
    data:  approve ? { approved: true, approved_at: new Date(), approved_by: 'Platform' } : { approved: false, approved_at: null, approved_by: null },
  })
  ok(res, { module: updated })
})
