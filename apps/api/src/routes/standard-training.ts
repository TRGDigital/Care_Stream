// Platform Console — standard annual-training library. Platform admins generate,
// review and publish standard modules (grounded in anonymised policy seeds, not a
// tenant's policies). Published standard modules (TrainingModule with
// tenant_id = null, source = 'ai_generated', approved = true) are available to
// every tenant to assign at no AI-generation cost.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { generateAnnualModuleDraft } from '../services/training/moduleGenerator'
import { generateModuleIllustration, illustrationUrl } from '../services/training/moduleImage'
import { ensureTrainingTopicsSeeded } from './training'
import { renewalMonthsFor, TOPIC_GROUP_LABELS } from '../data/training-topics'

export const standardTrainingRouter = Router()
standardTrainingRouter.use(requirePlatformAdmin)

function kebab(s: string): string {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

// GET /admin/standard-training — catalogue topics + their standard module
standardTrainingRouter.get('/', async (_req: Request, res: Response) => {
  try {
    await ensureTrainingTopicsSeeded()
    const [topics, modules] = await Promise.all([
      (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, orderBy: { sort_order: 'asc' } }),
      (prisma as any).trainingModule.findMany({
        where:  { tenant_id: null, source: 'ai_generated' },
        select: { id: true, name: true, topic_id: true, approved: true, frequency: true, requires_practical: true, pass_mark: true, group_key: true, image_key: true, illustration_key: true, questions: true },
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

// GET /admin/standard-training/modules/:id/full
standardTrainingRouter.get('/modules/:id/full', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  ok(res, { module: { ...module, illustration_url: illustrationUrl(module.illustration_key) } })
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
