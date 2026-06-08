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
import { runModuleQa } from '../services/training/moduleQa'
import { STANDARDS_CATALOGUE, normaliseStandards } from '../data/training-standards'
import { genToken, genPassword, hashPassword, contentHash, buildSnapshot } from '../lib/review-links'
import { ensureTrainingTopicsSeeded } from './training'
import { renewalMonthsFor, TOPIC_GROUP_LABELS } from '../data/training-topics'

const REVIEW_LINK_DAYS = 30

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
        select: { id: true, name: true, topic_id: true, approved: true, approved_at: true, created_at: true, frequency: true, requires_practical: true, pass_mark: true, duration_minutes: true, group_key: true, image_key: true, illustration_key: true, questions: true, learning_content: true, policy_refs: true, standards: true, attested_by_name: true, attested_by_role: true, attested_at: true },
      }),
    ])
    // Latest external review status per module (so the catalogue can flag reviewer changes).
    const moduleIds = (modules as any[]).map(m => m.id)
    const reviewByModule = new Map<string, any>()
    if (moduleIds.length) {
      const links = await (prisma as any).moduleReviewLink.findMany({
        where: { module_id: { in: moduleIds }, status: { not: 'revoked' } },
        orderBy: { created_at: 'desc' },
        select: { module_id: true, status: true, item_feedback: true },
      }).catch(() => [])
      for (const l of (links as any[])) {
        if (reviewByModule.has(l.module_id)) continue // first = latest
        const open = (Array.isArray(l.item_feedback) ? l.item_feedback : []).filter((it: any) => it.status === 'changes_requested' && !it.resolved).length
        reviewByModule.set(l.module_id, { review_status: l.status, review_changes_open: open })
      }
    }
    const byTopic = new Map<string, any>()
    for (const m of (modules as any[])) {
      if (!m.topic_id) continue
      const qa = runModuleQa(m)
      byTopic.set(m.topic_id, {
        id: m.id, name: m.name, topic_id: m.topic_id, approved: m.approved, approved_at: m.approved_at, created_at: m.created_at,
        frequency: m.frequency, requires_practical: m.requires_practical, pass_mark: m.pass_mark, duration_minutes: m.duration_minutes,
        group_key: m.group_key, illustration_url: illustrationUrl(m.illustration_key),
        question_count: Array.isArray(m.questions) ? m.questions.length : 0,
        standards_count: Array.isArray(m.standards) ? m.standards.length : 0,
        attested_by_name: m.attested_by_name, attested_by_role: m.attested_by_role, attested_at: m.attested_at,
        qa_hard_fails: qa.hard_fails, qa_warnings: qa.warnings,
        ...(reviewByModule.get(m.id) ?? { review_status: null, review_changes_open: 0 }),
      })
    }
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
      attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false,
      learning_content: draft.learning_content,
      requires_practical: !!topic.requires_practical,
      frequency: topic.default_frequency,
      renewal_months: renewalMonthsFor(topic.default_frequency),
      pass_mark: 80,
      duration_minutes: draft.estimated_minutes,
      image_key: topic.image_key ?? topic.group_key,
      // NOTE: illustration_key (the AI cover image) is intentionally NOT set here, so
      // a rebuild preserves any existing image. Changing the image is a separate action.
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
    qa: runModuleQa(module),
    standards_catalogue: STANDARDS_CATALOGUE,
    review_links: await (async () => {
      const links = await (prisma as any).moduleReviewLink.findMany({
        where: { module_id: module.id }, orderBy: { created_at: 'desc' },
        select: { id: true, status: true, created_at: true, expires_at: true, reviewer_name: true, reviewer_role: true, reviewer_org: true, decision: true, comments: true, decided_at: true, content_hash: true, item_feedback: true },
      }).catch(() => [])
      const currentHash = contentHash(module)
      return (links as any[]).map(l => ({ ...l, stale: l.content_hash !== currentHash, content_hash: undefined }))
    })(),
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
        attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false,
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
  if (b.duration_minutes !== undefined && b.duration_minutes !== null) data.duration_minutes = Math.max(0, Math.min(600, Math.round(Number(b.duration_minutes) || 0)))
  if (b.standards !== undefined) data.standards = normaliseStandards(b.standards)
  if (typeof b.cpd_accredited === 'boolean') data.cpd_accredited = b.cpd_accredited
  if (typeof b.frequency === 'string') { data.frequency = b.frequency; data.renewal_months = renewalMonthsFor(b.frequency); data.is_annual = !['once', 'adhoc'].includes(b.frequency) }
  if (typeof b.requires_practical === 'boolean') data.requires_practical = b.requires_practical
  const updated = await (prisma as any).trainingModule.update({ where: { id: module.id }, data })
  ok(res, { module: updated })
})

// POST /admin/standard-training/modules/:id/approve — publish with a NAMED reviewer
// attestation (CPD governance). Blocks if automated QA hard-checks fail.
standardTrainingRouter.post('/modules/:id/approve', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const approve = req.body?.approved !== false

  if (!approve) {
    const updated = await (prisma as any).trainingModule.update({
      where: { id: module.id },
      data:  { approved: false, approved_at: null, approved_by: null, attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false },
    })
    ok(res, { module: updated }); return
  }

  // Quality gate — hard checks must pass before a module can be published.
  const qa = runModuleQa(module)
  if (!qa.ok_to_approve) {
    err(res, 'QA_FAILED', `Cannot publish — ${qa.hard_fails} quality check(s) failed: ${qa.checks.filter(c => c.status === 'fail').map(c => c.label).join(', ')}.`, 422)
    return
  }

  let name: string, role: string, attestedAt = new Date(), independent = false

  // Option A — cite an external reviewer's approval (independent sign-off).
  if (req.body?.external_link_id) {
    const link = await (prisma as any).moduleReviewLink.findFirst({ where: { id: String(req.body.external_link_id), module_id: module.id } })
    if (!link || link.status !== 'approved') { err(res, 'NO_EXTERNAL_APPROVAL', 'That external review is not approved.', 422); return }
    if (link.content_hash !== contentHash(module)) { err(res, 'REVIEW_STALE', 'The module has changed since it was externally approved — send a fresh review link.', 422); return }
    name = String(link.reviewer_name ?? '').trim()
    role = `${String(link.reviewer_role ?? '').trim()}${link.reviewer_org ? `, ${link.reviewer_org}` : ''} (external review)`
    attestedAt = link.decided_at ?? new Date()
    independent = true
  } else {
    // Option B — internal named attestation.
    name = String(req.body?.reviewer_name ?? '').trim()
    role = String(req.body?.reviewer_role ?? '').trim()
  }
  if (!name || !role) { err(res, 'ATTESTATION_REQUIRED', 'A reviewer name and role are required to attest and publish.', 422); return }

  const updated = await (prisma as any).trainingModule.update({
    where: { id: module.id },
    data:  {
      approved: true, approved_at: new Date(), approved_by: name,
      attested_by_name: name, attested_by_role: role, attested_at: attestedAt,
      independently_reviewed: independent,
    },
  })
  ok(res, { module: updated })
})

// ─── External review links ────────────────────────────────────────────────────

// POST /admin/standard-training/modules/:id/review-link — create a password-protected,
// snapshot-frozen link for an external specialist to review + sign off.
standardTrainingRouter.post('/modules/:id/review-link', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const qa = runModuleQa(module)
  if (!qa.ok_to_approve) { err(res, 'QA_FAILED', `Fix the ${qa.hard_fails} blocking quality check(s) before sending for review.`, 422); return }

  const token = genToken()
  const password = genPassword()
  const now = new Date()
  const expires = new Date(now.getTime() + REVIEW_LINK_DAYS * 86_400_000)
  await (prisma as any).moduleReviewLink.create({
    data: {
      id: token, module_id: module.id, password_hash: hashPassword(token, password),
      content_hash: contentHash(module), snapshot: buildSnapshot(module),
      status: 'pending', created_by: 'Platform', expires_at: expires,
    },
  })
  ok(res, { token, password, expires_at: expires, path: `/review/${token}` })
})

// GET /admin/standard-training/modules/:id/review-links — links + their status
standardTrainingRouter.get('/modules/:id/review-links', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null }, select: { id: true } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const links = await (prisma as any).moduleReviewLink.findMany({
    where: { module_id: module.id }, orderBy: { created_at: 'desc' },
    select: { id: true, status: true, created_at: true, expires_at: true, reviewer_name: true, reviewer_role: true, reviewer_org: true, decision: true, comments: true, decided_at: true, content_hash: true },
  })
  const currentHash = contentHash(module)
  ok(res, { links: (links as any[]).map(l => ({ ...l, stale: l.content_hash !== currentHash, content_hash: undefined })) })
})

// POST /admin/standard-training/review-links/:linkId/revoke
standardTrainingRouter.post('/review-links/:linkId/revoke', async (req: Request, res: Response) => {
  await (prisma as any).moduleReviewLink.updateMany({ where: { id: req.params.linkId }, data: { status: 'revoked' } })
  ok(res, { revoked: true })
})

// POST /admin/standard-training/review-links/:linkId/resolve — mark one change request
// addressed (or not). { ref, resolved }. Tracks which reviewer changes have been actioned.
standardTrainingRouter.post('/review-links/:linkId/resolve', async (req: Request, res: Response) => {
  const link = await (prisma as any).moduleReviewLink.findUnique({ where: { id: req.params.linkId } })
  if (!link) { err(res, 'NOT_FOUND', 'Link not found', 404); return }
  const ref = String(req.body?.ref ?? '')
  const resolved = req.body?.resolved !== false
  const items = (Array.isArray(link.item_feedback) ? link.item_feedback : []).map((it: any) => it.ref === ref ? { ...it, resolved } : it)
  await (prisma as any).moduleReviewLink.update({ where: { id: link.id }, data: { item_feedback: items } })
  ok(res, { item_feedback: items })
})
