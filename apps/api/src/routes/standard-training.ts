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
import { neutraliseModuleVoice } from '../services/training/neutraliseVoice'
import { generateModuleIllustration, generateSectionImage, illustrationUrl } from '../services/training/moduleImage'
import { runModuleQa } from '../services/training/moduleQa'
import { callClaude } from '../services/ai/claude'
import { normaliseActivities, alignActivitySections } from '../lib/training-activities'
import { STANDARDS_CATALOGUE, normaliseStandards } from '../data/training-standards'
import { genToken, genPassword, hashPassword, contentHash, buildSnapshot } from '../lib/review-links'
import { ensureTrainingTopicsSeeded } from './training'
import { renewalMonthsFor, TOPIC_GROUP_LABELS } from '../data/training-topics'
import { CARE_SETTINGS, SETTING_LABELS } from '../lib/care-setting'
import { siteUrl } from '../lib/urls'
import { submitUrlsForIndexing } from '../services/ralfyindex/indexer'

// Public /staff-training/<slug> is keyed by slugify(topic.title) (mirrors training-public.ts).
function trainingPageSlug(title: string): string {
  return title.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
}

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

// When a module is regenerated its content changes, so any outstanding/approved
// external review no longer applies — mark them superseded (a fresh review is needed).
async function supersedeReviewLinks(moduleId: string): Promise<void> {
  await (prisma as any).moduleReviewLink.updateMany({
    where: { module_id: moduleId, status: { in: ['approved', 'pending', 'changes_requested'] } },
    data:  { status: 'superseded' },
  }).catch((e: any) => console.error('[std-training] supersede review links failed:', e?.message ?? e))
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
        select: { id: true, name: true, topic_id: true, approved: true, approved_at: true, created_at: true, frequency: true, requires_practical: true, pass_mark: true, duration_minutes: true, group_key: true, image_key: true, illustration_key: true, cpd_accredited: true, questions: true, learning_content: true, policy_refs: true, standards: true, attested_by_name: true, attested_by_role: true, attested_at: true, share_enabled: true, share_token: true, share_password: true },
      }),
    ])
    // Latest external review status per module (so the catalogue can flag reviewer changes).
    const moduleIds = (modules as any[]).map(m => m.id)
    const reviewByModule = new Map<string, any>()
    if (moduleIds.length) {
      const links = await (prisma as any).moduleReviewLink.findMany({
        where: { module_id: { in: moduleIds }, status: { notIn: ['revoked', 'superseded'] } },
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
      const secs = Array.isArray(m.learning_content?.sections) ? m.learning_content.sections : []
      const sectionImages = secs.filter((s: any) => s?.image_key).length
      byTopic.set(m.topic_id, {
        id: m.id, name: m.name, topic_id: m.topic_id, approved: m.approved, approved_at: m.approved_at, created_at: m.created_at,
        frequency: m.frequency, requires_practical: m.requires_practical, pass_mark: m.pass_mark, duration_minutes: m.duration_minutes,
        group_key: m.group_key, illustration_url: illustrationUrl(m.illustration_key), cpd_accredited: !!m.cpd_accredited,
        image_count: (m.illustration_key ? 1 : 0) + sectionImages, image_slots: 1 + secs.length,
        question_count: Array.isArray(m.questions) ? m.questions.length : 0,
        standards_count: Array.isArray(m.standards) ? m.standards.length : 0,
        attested_by_name: m.attested_by_name, attested_by_role: m.attested_by_role, attested_at: m.attested_at,
        qa_hard_fails: qa.hard_fails, qa_warnings: qa.warnings,
        ...(reviewByModule.get(m.id) ?? { review_status: null, review_changes_open: 0 }),
      })
    }
    ok(res, {
      groups: TOPIC_GROUP_LABELS,
      settings: CARE_SETTINGS.map(s => ({ key: s, label: SETTING_LABELS[s] })),
      topics: (topics as any[]).map(t => ({ ...t, module: byTopic.get(t.id) ?? null })),
    })
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

    const draft = await generateAnnualModuleDraft(null, { title: topic.title, aliases: topic.aliases, requires_practical: topic.requires_practical, care_setting: topic.care_setting })
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
      care_setting: topic.care_setting ?? null,  // inherit the topic's setting (NULL = universal)
    }
    const existing = await (prisma as any).trainingModule.findFirst({ where: { tenant_id: null, source: 'ai_generated', topic_id: topic.id } })
    const module = existing
      ? await (prisma as any).trainingModule.update({ where: { id: existing.id }, data })
      : await (prisma as any).trainingModule.create({ data: { tenant_id: null, slug: `std-${kebab(topic.title)}`, ...data } })
    if (existing) await supersedeReviewLinks(existing.id)  // content changed → external approval no longer valid
    ok(res, { module })
  } catch (e: any) {
    console.error('[standard-training/generate] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// POST /admin/standard-training/modules/:id/neutralise — rewrite the wording to
// setting-neutral voice (for the universal cross-over modules), keeping structure,
// answers AND images intact. Content changes, so it un-publishes + supersedes any
// external review (same as a regenerate), needing a fresh review/publish.
standardTrainingRouter.post('/modules/:id/neutralise', async (req: Request, res: Response) => {
  try {
    const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null, source: 'ai_generated' } })
    if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
    const result = await neutraliseModuleVoice({ name: module.name, learning_content: module.learning_content, questions: module.questions })
    if (!result) { err(res, 'GENERATION_FAILED', 'Could not neutralise safely (structure mismatch) — left unchanged. Try again.', 502); return }
    const updated = await (prisma as any).trainingModule.update({
      where: { id: module.id },
      data: {
        learning_content: result.learning_content,
        questions: result.questions,
        approved: false, approved_at: null, approved_by: null,
        attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false,
      },
    })
    await supersedeReviewLinks(module.id)
    ok(res, { module: updated })
  } catch (e: any) {
    console.error('[standard-training/neutralise] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', e?.message ?? 'Neutralise failed', 502)
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
    await supersedeReviewLinks(module.id)  // content changed → external approval no longer valid
    ok(res, { module: { ...updated, illustration_url: illustrationUrl(updated.illustration_key) }, generated: draft.questions.length, avoided: texts.length })
  } catch (e: any) {
    console.error('[std-training/regenerate-questions] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', e.message, 500)
  }
})

// POST /admin/standard-training/modules/:id/draft-activities — draft interactive
// activities from the course's own lesson content. Returns them for review; it
// deliberately does NOT save, so the platform editor can show them, let you edit
// the wording, and only then write them with the normal module PATCH.
const ACTIVITY_PROMPT = `You write interactive exercises for UK adult social care e-learning.

You will be given a course's lesson sections. Produce interactive activities that make the learner DO something, in addition to the reading and the multiple-choice questions they already have. Ground every activity in the lesson content you are given — never introduce rules the course does not teach.

Work through the lesson SECTION BY SECTION. For each section, choose the activity type that genuinely suits what that section teaches, and produce one activity for it. The learner should meet an exercise after most sections, so the course keeps a rhythm of read → check → do.

Return ONLY a JSON array, no prose and no markdown fences:
[
  {
    "type": "match",
    "title": "Short instruction-style title",
    "instructions": "One sentence telling the learner what to do.",
    "after_section": 0,
    "pairs": [{ "term": "A term the course uses", "definition": "Its plain-English meaning, one sentence" }]
  },
  {
    "type": "sort",
    "title": "…", "instructions": "…", "after_section": 2,
    "bins":  [{ "id": "bin1", "name": "Short category name", "note": "A few words on what belongs here" }],
    "items": [{ "text": "A specific, realistic item", "bin": "bin1" }]
  },
  {
    "type": "order",
    "title": "…", "instructions": "…", "after_section": 1,
    "steps": ["The steps of a procedure, IN THE CORRECT ORDER"]
  }
]
Rules:
- "after_section" is the 0-based index of the lesson section the activity follows. Put each activity after the section that teaches it, and never give one section two activities.
- SKIP a section when nothing fits it honestly. A section about values, attitudes or why something matters usually has no real sequence and no categories a competent worker could not argue either way — a contrived exercise is worse than none, so leave that section out rather than forcing one.
- VARY the type as the course goes on. Never use the same type for more than two sections in a row, and use at least two different types across the course where the content allows.
- match: 4 to 6 pairs. Terms must be distinct; definitions must not give the term away word-for-word.
- sort: exactly 3 bins and 5 to 6 items, spread across the bins so no bin is empty. Each item names one bin id. Items must be concrete and unambiguous — a competent worker should not be able to argue for two bins.
- order: 4 to 6 steps of ONE real procedure, in the correct sequence. Only use a procedure where the order genuinely matters.
- Plain, concrete British English in short sentences — this is translated into 60+ languages, so every string must stand on its own and never depend on the wording of another.
- Do not reuse the wording of existing quiz questions.`

// Single-section drafting. The model sees ONE section — its teaching text, its
// scenario and the quick check that has just been asked — so the exercise
// practises that section's point instead of the course in general, and cannot
// simply restate the question the learner has already answered.
const SECTION_ACTIVITY_PROMPT = `You write interactive exercises for UK adult social care e-learning.

You will be given ONE section of a course: what it teaches, its worked scenario, and the quick check question the learner has just answered. Write a single interactive activity that the learner does immediately after that quick check, to practise THAT section's learning point.

Choose whichever ONE of these three types genuinely suits the section:
- "order" — put the steps of a procedure into the correct sequence. Only where the order really matters.
- "sort"  — put items into the right category. Only where the categories are genuinely distinct.
- "match" — match a term to its meaning. Good where the section introduces vocabulary.

Return ONLY a JSON array containing exactly one object, no prose and no markdown fences:
[{ "type": "match", "title": "Short instruction-style title", "instructions": "One sentence telling the learner what to do.",
   "pairs": [{ "term": "…", "definition": "…" }] }]
For "sort" use "bins": [{ "id": "bin1", "name": "…", "note": "…" }] and "items": [{ "text": "…", "bin": "bin1" }].
For "order" use "steps": ["…"] in the CORRECT order.

Rules:
- Ground it ONLY in this section's content. Never introduce a rule the section does not teach, and never contradict it.
- Do NOT restate the quick check. The learner has just answered that question — the activity must test the same knowledge a different way, with different wording and different examples.
- Do NOT reuse the scenario's situation as an item or a step.
- match: 4 to 6 pairs. Definitions must not repeat the term word-for-word.
- sort: exactly 3 bins and 5 to 6 items, spread so no bin is empty. Items must be concrete — a competent worker should not be able to argue for two bins.
- order: 4 to 6 steps of one real procedure.
- Plain, concrete British English in short sentences. This is translated into 60+ languages, so every string must stand on its own and never depend on the wording of another.
- If this section honestly supports none of the three types — it teaches values, attitudes or why something matters, with no sequence and no clean categories — return an empty array [] rather than inventing a contrived exercise.`

// Everything the model needs about one section: what it teaches, its scenario,
// and the quick check just asked (with the right answer marked, so the activity
// cannot contradict it or simply repeat it).
function sectionBrief(s: any, index: number): string {
  const opts: string[] = Array.isArray(s?.check?.options) ? s.check.options.map((o: any) => String(o)) : []
  const correct = Number.isInteger(s?.check?.correct) ? s.check.correct : -1
  const parts = [
    `Section ${index + 1}: ${String(s?.heading ?? '')}`,
    `What it teaches:\n${String(s?.body ?? '')}`,
  ]
  if (s?.scenario?.situation) {
    parts.push(`Worked scenario (do not reuse this situation):\n${String(s.scenario.situation)}\n${String(s.scenario.prompt ?? '')}\n${String(s.scenario.answer ?? '')}`)
  }
  if (s?.check?.question) {
    parts.push(
      `Quick check the learner has just answered (do not restate it):\n${String(s.check.question)}\n` +
      opts.map((o, i) => `  ${i === correct ? '(correct)' : '         '} ${o}`).join('\n'),
    )
  }
  return parts.join('\n\n').slice(0, 8_000)
}

standardTrainingRouter.post('/modules/:id/draft-activities', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({
    where:  { id: req.params.id, tenant_id: null },
    select: { id: true, name: true, learning_content: true },
  })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

  const wanted: string[] = Array.isArray(req.body?.types) && req.body.types.length
    ? req.body.types.filter((t: any) => ['order', 'sort', 'match'].includes(String(t)))
    : ['order', 'sort', 'match']
  const learn    = (module.learning_content ?? {}) as any
  const sections = (Array.isArray(learn.sections) ? learn.sections : []) as any[]
  if (!sections.length) { err(res, 'NO_LESSON', 'This module has no lesson sections to build activities from.', 400); return }

  // Optional: draft for ONE section, grounded in that section's own lesson text,
  // scenario and quick check rather than the whole course.
  const one = Number.isInteger(req.body?.section) ? Number(req.body.section) : null
  if (one != null && (one < 0 || one >= sections.length)) { err(res, 'VALIDATION_ERROR', 'That section does not exist.', 400); return }

  const lesson = one != null
    ? sectionBrief(sections[one], one)
    : sections
        .map((s: any, i: number) => `Section ${i} — ${String(s?.heading ?? '')}\n${String(s?.body ?? '')}`)
        .join('\n\n')
        .slice(0, 24_000)

  try {
    const raw = await callClaude(
      one != null ? SECTION_ACTIVITY_PROMPT : ACTIVITY_PROMPT,
      one != null
        ? `Course: ${module.name}\n\nWrite one activity for this section${wanted.length < 3 ? `, using only these types: ${wanted.join(', ')}` : ''}.\n\n"""\n${lesson}\n"""`
        : `Course: ${module.name}\n\nThis lesson has ${sections.length} sections (indexes 0 to ${sections.length - 1}). Work through them in order and produce one activity for each section that genuinely suits one, skipping any that do not. Use only these types: ${wanted.join(', ')}.\n\nLesson content:\n"""\n${lesson}\n"""`,
      { maxTokens: one != null ? 2000 : 8000, temperature: 0.4, feature: 'training_activities' },
    )
    const jsonStart = raw.indexOf('[')
    const jsonEnd   = raw.lastIndexOf(']')
    if (jsonStart < 0 || jsonEnd < jsonStart) throw new Error('no JSON array in the response')
    const parsed = JSON.parse(raw.slice(jsonStart, jsonEnd + 1))
    const rawList = (Array.isArray(parsed) ? parsed : []).map((a: any, i: number) => ({ ...a, id: `act${Date.now()}${i}` }))

    if (one != null) {
      // The section owns the placement — the model is never asked for an index.
      const drafted = normaliseActivities(rawList.map((a: any) => ({ ...a, after_section: one }))).slice(0, 1)
      if (!drafted.length) {
        err(res, 'NO_FIT', 'This section does not suit an order, sort or match exercise — it may be teaching values or principles rather than a procedure. Try writing one by hand, or leave it without.', 422)
        return
      }
      ok(res, { activities: drafted })
      return
    }

    // One activity per section — if the model doubles up, keep the first.
    const seen = new Set<number>()
    const activities = alignActivitySections(normaliseActivities(rawList), sections.length).filter(a => {
      if (a.after_section == null) return true
      if (seen.has(a.after_section)) return false
      seen.add(a.after_section)
      return true
    })
    if (!activities.length) { err(res, 'GENERATION_FAILED', 'Nothing usable came back — try again.', 502); return }
    ok(res, { activities })
  } catch (e: any) {
    console.error('[std-training/draft-activities] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', 'Could not draft activities — try again.', 502)
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

// POST /admin/standard-training/modules/:id/share — enable/disable the password-protected
// external validation link, and set/change its password.
standardTrainingRouter.post('/modules/:id/share', async (req: Request, res: Response) => {
  const enabled = !!req.body?.enabled
  const password = typeof req.body?.password === 'string' ? req.body.password.trim() : ''

  const module = await (prisma as any).trainingModule.findFirst({
    where:  { id: req.params.id, tenant_id: null },
    select: { id: true, share_token: true, share_password: true },
  })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

  const data: Record<string, unknown> = { share_enabled: enabled }
  if (enabled && !module.share_token) data.share_token = genToken()
  if (password) data.share_password = password
  else if (enabled && !module.share_password) data.share_password = genPassword()

  const updated = await (prisma as any).trainingModule.update({
    where:  { id: module.id },
    data,
    select: { share_enabled: true, share_token: true, share_password: true },
  })

  ok(res, {
    share_enabled:  updated.share_enabled,
    share_token:    updated.share_token,
    share_password: updated.share_password,
    share_url:      updated.share_token ? `${siteUrl()}/validate/${updated.share_token}` : null,
  })
})

// POST /admin/standard-training/modules/:id/sections/:index/generate-image — section image (free)
standardTrainingRouter.post('/modules/:id/sections/:index/generate-image', async (req: Request, res: Response) => {
  const module = await (prisma as any).trainingModule.findFirst({ where: { id: req.params.id, tenant_id: null }, select: { id: true } })
  if (!module) { err(res, 'NOT_FOUND', 'Module not found', 404); return }
  const index = parseInt(String(req.params.index), 10)
  if (!Number.isInteger(index) || index < 0) { err(res, 'VALIDATION_ERROR', 'Invalid section index'); return }
  try {
    const key = await generateSectionImage(module.id, index)
    ok(res, { image_url: illustrationUrl(key) })
  } catch (e: any) {
    console.error('[standard-training/section-image] failed:', e?.message ?? e)
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

  // Auto-index the public training page for this topic (RalfyIndex). Deduped, fire-and-forget safe.
  try {
    if (module.topic_id) {
      const topic = await (prisma as any).trainingTopic.findUnique({ where: { id: module.topic_id }, select: { title: true } })
      if (topic?.title) await submitUrlsForIndexing([`${siteUrl()}/staff-training/${trainingPageSlug(topic.title)}`], { source: 'page' })
    }
  } catch { /* never block publish on an indexing hiccup */ }

  ok(res, { module: updated })
})

// POST /admin/standard-training/bulk-approve — attest and publish every draft module
// in one scope with a single named attestation, skipping any that fail the QA hard
// checks. The per-module governance record written is identical to approving them
// one at a time; this only saves re-typing the reviewer each time.
//
// Scope is deliberately narrow and explicit:
//   scope 'universal'  → topics with care_setting = NULL  (the "All settings" tab)
//   scope 'setting'    → topics for one care_setting
// `include_annual` defaults to FALSE, so the Annual Training (CPD) set is never
// touched by accident — those are promoted and attested individually.
standardTrainingRouter.post('/bulk-approve', async (req: Request, res: Response) => {
  const name = String(req.body?.reviewer_name ?? '').trim()
  const role = String(req.body?.reviewer_role ?? '').trim()
  if (!name || !role) { err(res, 'ATTESTATION_REQUIRED', 'A reviewer name and role are required to attest and publish.', 422); return }

  const scope = req.body?.scope === 'setting' ? 'setting' : 'universal'
  const careSetting = scope === 'setting' ? String(req.body?.care_setting ?? '') : null
  if (scope === 'setting' && !careSetting) { err(res, 'VALIDATION_ERROR', 'care_setting is required for a setting scope.'); return }
  const includeAnnual = req.body?.include_annual === true
  const dryRun = req.body?.dry_run === true

  try {
    await ensureTrainingTopicsSeeded()
    const topics = await (prisma as any).trainingTopic.findMany({
      where:  { tenant_id: null, is_active: true, ...(scope === 'setting' ? { care_setting: careSetting } : { care_setting: null }) },
      select: { id: true, title: true, is_annual: true },
    })
    // is_annual marks the Annual Training (CPD) set — excluded unless explicitly asked for.
    const topicIds = (topics as any[]).filter(t => includeAnnual || !t.is_annual).map(t => t.id)
    const excluded = (topics as any[]).filter(t => !includeAnnual && t.is_annual).map(t => t.title)
    if (!topicIds.length) { ok(res, { approved: [], skipped: [], excluded_annual: excluded, total_candidates: 0 }); return }

    const modules = await (prisma as any).trainingModule.findMany({
      where: { tenant_id: null, source: 'ai_generated', approved: false, topic_id: { in: topicIds } },
    })

    const approved: Array<{ id: string; name: string }> = []
    const skipped:  Array<{ id: string; name: string; reason: string }> = []

    for (const m of (modules as any[])) {
      const qa = runModuleQa(m)
      if (!qa.ok_to_approve) {
        skipped.push({
          id: m.id, name: m.name,
          reason: qa.checks.filter(c => c.status === 'fail').map(c => c.label).join(', ') || 'failed quality checks',
        })
        continue
      }
      if (dryRun) { approved.push({ id: m.id, name: m.name }); continue }
      try {
        await (prisma as any).trainingModule.update({
          where: { id: m.id },
          data: {
            approved: true, approved_at: new Date(), approved_by: name,
            attested_by_name: name, attested_by_role: role, attested_at: new Date(),
            // Bulk approval is an INTERNAL named attestation, never an independent
            // external review — that must be claimed per module via a review link.
            independently_reviewed: false,
          },
        })
        approved.push({ id: m.id, name: m.name })
      } catch (e: any) {
        skipped.push({ id: m.id, name: m.name, reason: e?.message ?? 'update failed' })
      }
    }

    // Index the public training pages for what was just published (best-effort).
    if (!dryRun && approved.length) {
      try {
        const pub = await (prisma as any).trainingModule.findMany({
          where: { id: { in: approved.map(a => a.id) } }, select: { topic_id: true },
        })
        const ids = (pub as any[]).map(p => p.topic_id).filter(Boolean)
        const tops = ids.length ? await (prisma as any).trainingTopic.findMany({ where: { id: { in: ids } }, select: { title: true } }) : []
        const urls = (tops as any[]).map(t => `${siteUrl()}/staff-training/${trainingPageSlug(t.title)}`)
        if (urls.length) await submitUrlsForIndexing(urls, { source: 'page' })
      } catch { /* never block a publish on an indexing hiccup */ }
    }

    ok(res, {
      approved, skipped,
      excluded_annual: excluded,
      total_candidates: (modules as any[]).length,
      dry_run: dryRun,
    })
  } catch (e: any) {
    console.error('[std-training/bulk-approve] failed:', e?.message ?? e)
    err(res, 'BULK_APPROVE_FAILED', e.message, 500)
  }
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
