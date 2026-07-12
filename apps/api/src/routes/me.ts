// Staff-facing "My Progress" — the signed-in user's own training & induction
// record, fully localised into their first language (UI labels + the on-screen
// explanations + module/flow names + recent activity), so it reads naturally for
// staff whose first language isn't English.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { buildStaffRecord } from '../lib/staff-record'
import { translateBundle, translateText, translateQuestionsBatch, translateTextsBatch, formatPolicyHtml, translateHtmlPreservingTags, generatePolicyQuestions, mapLimit, withTranslationBudget, hubContentLang } from '../lib/translate'
import { overrideHash } from '../lib/overrides'
import { languageNameForCode } from '../data/languages'
import { downloadExtractedText } from '../services/storage/s3'
import { getOrCreateLesson } from '../lib/remediation'
import { trackAiAction, getPlanFeatures } from '../lib/plan-limits'
import { illustrationUrl } from '../services/training/moduleImage'
import { pickImageSource } from '../services/training/coverMatch'
import { getAuditsDue } from '../services/audits/due'
import { prisma } from '../db/client'
import { managerApprove, rejectPolicy, getPolicyDocument, getAdoptionContext } from '../services/analytics/policy-adoption'
import { tenantHasFlag } from '../lib/plan-limits'

// Friendly policy title from a filename (strip extension + tidy separators).
function policyTitle(filename: string): string {
  return (filename || 'Policy').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()
}

export const meRouter = Router()

// All on-screen text for the My Progress page. {placeholders} are filled in by
// the client and are preserved through translation.
const UI_STRINGS: Record<string, string> = {
  title:               'My Progress',
  subtitle:            'Your training and induction at a glance.',
  ring_training:       'Training',
  ring_induction:      'Induction',
  ring_score:          'Avg score',
  outstanding_title:   'You have {n} item(s) to finish',
  outstanding_caught:  "You're all caught up — everything assigned is complete.",
  btn_training:        'Training',
  btn_induction:       'Induction',
  compare_title:       'How you compare',
  compare_team:        'team',
  training_title:      'My training',
  induction_title:     'My induction',
  open:                'Open',
  none_training:       'Nothing assigned yet.',
  none_induction:      'No induction assigned.',
  steps:               '{done}/{total} steps',
  activity_title:      'Recent activity',
  status_complete:     'Done',
  status_in_progress:  'In progress',
  status_not_started:  'To do',
  status_expired:      'Renew',
  // ── Explanations (the ⓘ info bubbles) ──
  info_rings:    "These circles show how much of your training and induction you've finished, and your average quiz score. The closer to 100%, the better.",
  info_outstanding: 'These are the things still left for you to do. Tap a button to go and finish them.',
  info_compare:  "This shows how you're doing compared with the average for everyone in your team. An up arrow means you're above the team average.",
  info_training: 'Your training modules and whether each one is done. Tap Open to read the material and answer the questions.',
  info_induction: 'Your induction steps — reading policies and answering a few questions. Tap Open to carry on where you left off.',
  info_activity: 'The most recent things you have completed.',
}

// Lightweight outstanding-item counts for the Chat Hub sidebar badges.
// Counts only — no heavy data or translation.
// ─── GET /me/profile ──────────────────────────────────────────────────────────
// Lightweight profile for the hub: the staff member's own language so the chat can
// default the "Reply in" picker and dictate voice input in their language.
meRouter.get('/profile', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const tenantId = (req as any).user.tenant_id
  const [user, tenant] = await Promise.all([
    (prisma as any).user.findUnique({
      where:  { id: userId },
      select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true, can_suggest_translations: true },
    }).catch(() => null),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  const second = (user?.second_language as string) ?? null
  ok(res, {
    first_language:              (user?.first_language as string) ?? 'eng',
    second_language:             second,
    second_language_name:        second ? languageNameForCode(second, tenant?.custom_languages) : null,
    comms_always_first_language: user?.comms_always_first_language !== false,
    // Whether this staff member may flip a single hub set into their second language.
    allow_language_switching:    !!user?.allow_language_switching && !!second,
    // Whether this staff member may suggest better translations from the hub.
    can_suggest_translations:    !!user?.can_suggest_translations,
  })
})

// ─── POST /me/translation-suggestion ──────────────────────────────────────────
// A permitted staff member proposes a better translation of a specific piece of
// content in their language. Stored per (tenant, language, source) as pending for
// admin approval, unless the tenant has enabled auto-approve. Consumed by
// apps/api/src/lib/overrides.ts once approved.
meRouter.post('/translation-suggestion', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const tenantId = (req as any).user.tenant_id
  const { source_text, suggested_text, lang_code, machine_text, content_kind, context_label } = req.body ?? {}

  if (typeof source_text !== 'string' || !source_text.trim())       return err(res, 'INVALID_INPUT', 'source_text is required', 400)
  if (typeof suggested_text !== 'string' || !suggested_text.trim()) return err(res, 'INVALID_INPUT', 'suggested_text is required', 400)
  if (typeof lang_code !== 'string' || !lang_code.trim() || lang_code === 'eng') return err(res, 'INVALID_INPUT', 'a non-English lang_code is required', 400)

  const [user, tenant] = await Promise.all([
    (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, can_suggest_translations: true } }).catch(() => null),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { translation_suggestions_auto_approve: true } }).catch(() => null),
  ])
  if (!user?.can_suggest_translations) return err(res, 'FORBIDDEN', 'You do not have permission to suggest translations', 403)

  const autoApprove = !!tenant?.translation_suggestions_auto_approve
  const status = autoApprove ? 'approved' : 'pending'
  const source_hash = overrideHash(source_text)
  const base = {
    source_text:       source_text.trim(),
    suggested_text:    suggested_text.trim(),
    machine_text:      typeof machine_text === 'string' ? machine_text.trim().slice(0, 4000) : '',
    content_kind:      typeof content_kind === 'string' ? content_kind.slice(0, 40) : 'text',
    context_label:     typeof context_label === 'string' ? context_label.slice(0, 200) : '',
    suggested_by_user_id: userId,
    suggested_by_name: (user?.name as string) ?? '',
    status,
    reviewed_by:       autoApprove ? 'Auto-approved' : '',
    reviewed_at:       autoApprove ? new Date() : null,
    updated_at:        new Date(),
  }
  const row = await (prisma as any).translationOverride.upsert({
    where:  { tenant_id_lang_code_source_hash: { tenant_id: tenantId, lang_code: lang_code, source_hash } },
    update: base,
    create: { tenant_id: tenantId, lang_code, source_hash, ...base },
  })
  ok(res, { status: row.status })
})

// ─── GET /me/document-categories ──────────────────────────────────────────────
// Which document categories the tenant actually has live documents in, so the
// hub's "new chat" screen can grey out topics with nothing uploaded yet.
meRouter.get('/document-categories', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const rows = await (prisma as any).policy.groupBy({
    by: ['document_category'],
    where: { tenant_id: tenantId, status: { in: ['active', 'processing'] } },
  }).catch(() => [] as Array<{ document_category: string }>)
  const available = new Set<string>((rows ?? []).map((r: any) => r.document_category).filter(Boolean))

  // Business Continuity chat also draws on the Knowledge Base, so approved BC
  // entries make the topic usable even without an uploaded document.
  if (!available.has('business_continuity')) {
    const bc = await (prisma as any).knowledgeEntry.count({
      where: { tenant_id: tenantId, knowledge_category: 'business_continuity', approved: true },
    }).catch(() => 0)
    if (bc > 0) available.add('business_continuity')
  }

  ok(res, { available: Array.from(available) })
})

// ─── Web-push subscription (PWA notifications) ────────────────────────────────
meRouter.post('/push/subscribe', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const { endpoint, keys } = req.body ?? {}
  if (!endpoint || !keys?.p256dh || !keys?.auth) { err(res, 'INVALID', 'endpoint and keys are required', 400); return }
  const ua = (req.headers['user-agent'] as string | undefined)?.slice(0, 300) ?? null
  try {
    await (prisma as any).pushSubscription.upsert({
      where:  { endpoint },
      update: { user_id: userId, tenant_id: tenantId, p256dh: keys.p256dh, auth: keys.auth, user_agent: ua, last_used_at: new Date() },
      create: { tenant_id: tenantId, user_id: userId, endpoint, p256dh: keys.p256dh, auth: keys.auth, user_agent: ua },
    })
    ok(res, { subscribed: true })
  } catch (e: any) {
    err(res, 'SUBSCRIBE_FAILED', e.message, 500)
  }
})

meRouter.post('/push/unsubscribe', async (req: Request, res: Response) => {
  const { endpoint } = req.body ?? {}
  if (endpoint) await (prisma as any).pushSubscription.deleteMany({ where: { endpoint } }).catch(() => {})
  ok(res, { subscribed: false })
})

meRouter.get('/counts', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const now = new Date()
  const [tEnr, induction, cqc, tWrong, oWrong] = await Promise.all([
    // Split into My Training (manual modules) vs Annual Training (AI modules).
    (prisma as any).trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: userId }, select: { status: true, expires_at: true, module: { select: { source: true } } } }).catch(() => []),
    (prisma as any).onboardingEnrollment.count({ where: { tenant_id: tenantId, user_id: userId, completed_at: null } }).catch(() => 0),
    (prisma as any).cqcStaffDelivery.count({ where: { tenant_id: tenantId, user_id: userId, status: 'pending' } }).catch(() => 0),
    // Direct counts of outstanding wrong answers (was fetch-all-rows-and-sum).
    (prisma as any).trainingAnswer.count({ where: { is_correct: false, enrollment: { tenant_id: tenantId, user_id: userId } } }).catch(() => 0),
    (prisma as any).onboardingProgress.count({ where: { answer_correct: false, enrollment: { tenant_id: tenantId, user_id: userId } } }).catch(() => 0),
  ])
  const outstanding = (e: any) => ['not_started', 'in_progress'].includes(e.status) || (e.status === 'complete' && e.expires_at && new Date(e.expires_at) < now)
  const training = (tEnr as any[]).filter(e => e.module?.source !== 'ai_generated' && outstanding(e)).length
  const annual   = (tEnr as any[]).filter(e => e.module?.source === 'ai_generated' && outstanding(e)).length
  const followup = (tWrong as number) + (oWrong as number)
  // Audits badge: admins see all due audits; "Staff + Audits" members see only
  // those due among their allocated templates.
  let audits = 0
  if ((req as any).user.role === 'admin') {
    try { const a = await getAuditsDue(tenantId); audits = a.due.length + a.inProgress } catch { /* ignore */ }
  } else {
    try {
      const u = await (prisma as any).user.findUnique({ where: { id: (req as any).user.sub }, select: { audit_template_ids: true } })
      const ids: string[] = u?.audit_template_ids ?? []
      if (ids.length) { const a = await getAuditsDue(tenantId, ids); audits = a.due.length + a.inProgress }
    } catch { /* ignore */ }
  }
  ok(res, { training, induction, cqc, followup, annual, audits })
})

// ─── Care manager: policies awaiting their approval (Policy Change Adoption) ──
async function isCareManager(userId: string): Promise<boolean> {
  const u = await (prisma as any).user.findUnique({ where: { id: userId }, select: { job_role: true } })
  return /care manager|registered manager/i.test(String(u?.job_role ?? ''))
}

meRouter.get('/policy-approvals', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  if (!(await tenantHasFlag(tenantId, 'has_policy_adoption')) || !(await isCareManager(userId))) {
    ok(res, { is_manager: false, policies: [], published: [] }); return
  }
  const docs = await (prisma as any).policyDocument.findMany({
    where: { tenant_id: tenantId, approval_status: 'pending_manager' },
    select: { id: true, policy_id: true, version: true, updated_at: true },
  })
  const policies = [] as any[]
  for (const d of docs) {
    const [policy, changes] = await Promise.all([
      (prisma as any).policy.findUnique({ where: { id: d.policy_id }, select: { name: true } }),
      (prisma as any).policyDocumentChange.count({ where: { document_id: d.id, published: false, reverted: false } }),
    ])
    policies.push({ policy_id: d.policy_id, name: policy?.name ?? 'Policy', version: d.version, changes, submitted_at: d.updated_at })
  }
  // Recently published policies, shown to the care manager for visibility even when their
  // approval is not required (the "admin approves directly" path). Most recent first.
  const pubDocs = await (prisma as any).policyDocument.findMany({
    where: { tenant_id: tenantId, approval_status: 'published', published_at: { not: null } },
    select: { policy_id: true, version: true, published_at: true, published_by: true },
    orderBy: { published_at: 'desc' }, take: 20,
  })
  const published = [] as any[]
  for (const d of pubDocs) {
    const policy = await (prisma as any).policy.findUnique({ where: { id: d.policy_id }, select: { name: true } })
    published.push({ policy_id: d.policy_id, name: policy?.name ?? 'Policy', version: d.version, published_at: d.published_at, published_by: d.published_by })
  }
  ok(res, { is_manager: true, policies, published })
})

meRouter.get('/policy-approvals/:policyId', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  if (!(await isCareManager((req as any).user.sub))) { err(res, 'FORBIDDEN', 'Not a care manager', 403); return }
  const policyId = String(req.params.policyId)
  const docRes = await getPolicyDocument(tenantId, policyId)
  if (!docRes?.document) { err(res, 'NOT_FOUND', 'Not found', 404); return }
  const policy = await (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId }, select: { name: true } })
  let html = ''
  const cached = await (prisma as any).policyTranslation.findUnique({ where: { policy_id_lang: { policy_id: policyId, lang: 'eng' } }, select: { content: true } }).catch(() => null)
  if (cached?.content) html = cached.content
  else {
    const raw = await downloadExtractedText(tenantId, policyId).catch(() => null)
    if (raw) { const h = await formatPolicyHtml(raw, 'eng'); if (h) { html = h; await (prisma as any).policyTranslation.create({ data: { tenant_id: tenantId, policy_id: policyId, lang: 'eng', content: h } }).catch(() => {}) } }
  }
  const ctx = await getAdoptionContext(tenantId)
  ok(res, { policy_name: policy?.name ?? 'Policy', version: docRes.document.version, html, changes: docRes.changes, show_role_names: ctx.show_role_names, role_names: ctx.role_names })
})

meRouter.post('/policy-approvals/:policyId/approve', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  if (!(await isCareManager(userId))) { err(res, 'FORBIDDEN', 'Not a care manager', 403); return }
  const me = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  try {
    const r = await managerApprove(tenantId, String(req.params.policyId), me?.name || me?.email || 'Care manager')
    if (!r) { err(res, 'NOT_FOUND', 'Not found', 404); return }
    ok(res, r)
  } catch (e: any) { err(res, 'APPROVE_FAILED', e.message ?? 'Could not approve.', 500) }
})

meRouter.post('/policy-approvals/:policyId/reject', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  if (!(await isCareManager(userId))) { err(res, 'FORBIDDEN', 'Not a care manager', 403); return }
  const me = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true, email: true } })
  const r = await rejectPolicy(tenantId, String(req.params.policyId), 'manager', me?.name || me?.email || 'Care manager', String(req.body?.comment ?? ''))
  if (!r) { err(res, 'NOT_FOUND', 'Not found', 404); return }
  ok(res, r)
})


// Pick an already-generated image for a training module's follow-up thumbnail,
// reusing what we have rather than showing a placeholder:
//   1. the module's own AI cover illustration, then any lesson section image;
//   2. failing that, borrow the cover from a related module that has one
//      (same topic, or a normalised-name match — e.g. the "Fire Safety" gap
//      reuses the "Fire Safety Annual Refresher" cover).
// `imaged` is the pool of modules (this tenant + standard library) that have a
// cover image. Null = the client shows its default illustration.
function resolveFollowUpImage(m: any, imaged: any[]): string | null {
  if (m?.illustration_key) return illustrationUrl(m.illustration_key)
  const sections = Array.isArray(m?.learning_content?.sections) ? m.learning_content.sections : []
  const ownSection = sections.find((s: any) => s?.image_key)
  if (ownSection) return illustrationUrl(ownSection.image_key)

  // Order-independent shared-word match (so "Data Protection & GDPR" matches
  // "GDPR and Data Protection Annual Refresher"), preferring an imaged candidate.
  const match = pickImageSource(m?.name, m?.topic_id, imaged)
  return match?.illustration_key ? illustrationUrl(match.illustration_key) : null
}

// ─── GET /me/follow-up ────────────────────────────────────────────────────────
// The exact questions the staff member currently has wrong (training + induction
// MCQs), so they can re-answer just those. Questions translated to their language.

meRouter.get('/follow-up', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub

  const [tEnr, oEnr, user, tenant, imaged] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: userId },
      select: { id: true, module: { select: { name: true, topic_id: true, questions: true, illustration_key: true, learning_content: true } }, answers: { where: { is_correct: false }, select: { question_id: true } } },
    }),
    (prisma as any).onboardingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: userId },
      select: { id: true, flow: { select: { name: true, steps: { select: { id: true, type: true, question: true, options: true } } } }, progress: { where: { answer_correct: false }, select: { step_id: true } } },
    }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
    // Modules (this tenant + standard library) that already have a cover image, so
    // a gap module without its own can borrow a related module's illustration.
    (prisma as any).trainingModule.findMany({
      where:  { OR: [{ tenant_id: tenantId }, { tenant_id: null }], illustration_key: { not: null }, is_active: true },
      select: { name: true, topic_id: true, illustration_key: true },
    }).catch(() => []),
  ])

  const items: any[] = []
  for (const e of tEnr as any[]) {
    const wrong = new Set((e.answers ?? []).map((a: any) => a.question_id))
    for (const q of (e.module?.questions ?? [])) {
      if (!wrong.has(q.id)) continue
      const options = Array.isArray(q.options) ? q.options : []
      if (options.length === 0) continue
      items.push({ source: 'training', enrollment_id: e.id, ref: q.id, topic: e.module?.name, text: q.text, options, image_url: resolveFollowUpImage(e.module, imaged as any[]) })
    }
  }
  for (const e of oEnr as any[]) {
    const wrong = new Set((e.progress ?? []).map((p: any) => p.step_id))
    for (const s of (e.flow?.steps ?? [])) {
      if (s.type !== 'answer_question' || !wrong.has(s.id)) continue
      const options = Array.isArray(s.options) ? s.options : []
      if (options.length === 0) continue
      items.push({ source: 'induction', enrollment_id: e.id, ref: s.id, topic: e.flow?.name, text: s.question, options, image_url: null })
    }
  }

  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)
  if (lang !== 'eng' && items.length > 0) {
    // Translate the question + options AND the topic/title (so the lesson intro
    // title isn't left in English). Topics repeat across gaps, so dedupe them.
    const uniqTopics = [...new Set(items.map((it: any) => it.topic ?? '').filter(Boolean))]
    const translated = await withTranslationBudget(
      Promise.all([
        translateQuestionsBatch(items.map((it: any) => ({ text: it.text ?? '', options: it.options })), lang, langName, tenant?.translation_glossary, tenantId),
        uniqTopics.length ? translateTextsBatch(uniqTopics, lang, langName, tenant?.translation_glossary, tenantId) : Promise.resolve([] as string[]),
      ]).then(([qs, tts]) => {
        const tmap = new Map(uniqTopics.map((t, i) => [t, tts[i] ?? t]))
        return items.map((it: any, i: number) => ({ ...it, text: qs[i].text, options: qs[i].options, topic: tmap.get(it.topic ?? '') ?? it.topic }))
      }),
      18_000, items,
    )
    ok(res, { items: translated })
  } else {
    ok(res, { items })
  }
})

// ─── GET /me/follow-up/lesson ─────────────────────────────────────────────────
// "Learn & retry": a policy-grounded micro-lesson for one gap (corrective why →
// key points → scenario → a fresh check question). The check's correct answer is
// withheld from the client and graded server-side via the POST below.

meRouter.get('/follow-up/lesson', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const source   = String(req.query.source ?? '')
  const ref      = String(req.query.ref ?? '')
  const enrollmentId = String(req.query.enrollment_id ?? '')
  if (!['training', 'induction'].includes(source) || !ref || !enrollmentId) {
    err(res, 'VALIDATION_ERROR', 'source, ref and enrollment_id are required.'); return
  }

  const [user, tenant] = await Promise.all([
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)

  const lesson = await getOrCreateLesson(tenantId, source as any, ref, enrollmentId, lang, langName).catch((e: any) => {
    console.error('[me/follow-up/lesson] generate failed:', e?.message ?? e); return null
  })
  if (!lesson) { err(res, 'NOT_FOUND', 'Could not build a lesson for this gap.', 404); return }

  const { check, ...rest } = lesson
  ok(res, { lesson: { ...rest, check: { question: check.question, options: check.options } }, lang })
})

// ─── POST /me/follow-up/lesson/answer ─────────────────────────────────────────
// Grade the fresh check question. A correct answer resolves the original gap
// (training answer / induction step) and logs a remediation attempt.

meRouter.post('/follow-up/lesson/answer', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const b = req.body ?? {}
  const source = String(b.source ?? '')
  const ref    = String(b.ref ?? '')
  const enrollmentId = String(b.enrollment_id ?? '')
  const selected = Number(b.selected)
  if (!['training', 'induction'].includes(source) || !ref || !enrollmentId || !Number.isInteger(selected)) {
    err(res, 'VALIDATION_ERROR', 'source, ref, enrollment_id and selected are required.'); return
  }

  const [user, tenant] = await Promise.all([
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)

  const lesson = await getOrCreateLesson(tenantId, source as any, ref, enrollmentId, lang, langName).catch(() => null)
  if (!lesson) { err(res, 'NOT_FOUND', 'Lesson not found.', 404); return }

  const correct = selected === lesson.check.correct_option
  if (!correct) { ok(res, { correct: false, correct_option: lesson.check.correct_option }); return }

  // Verify the enrollment belongs to this user, then resolve the original gap.
  if (source === 'training') {
    const enr = await (prisma as any).trainingEnrollment.findFirst({ where: { id: enrollmentId, tenant_id: tenantId, user_id: userId }, select: { id: true } })
    if (enr) await (prisma as any).trainingAnswer.updateMany({ where: { enrollment_id: enrollmentId, question_id: ref }, data: { is_correct: true, answered_at: new Date() } }).catch(() => {})
  } else {
    const enr = await (prisma as any).onboardingEnrollment.findFirst({ where: { id: enrollmentId, tenant_id: tenantId, user_id: userId }, select: { id: true } })
    if (enr) await (prisma as any).onboardingProgress.updateMany({ where: { enrollment_id: enrollmentId, step_id: ref }, data: { answer_correct: true, completed_at: new Date() } }).catch(() => {})
  }

  ok(res, { correct: true, resolved: true, correct_option: lesson.check.correct_option })
})

// ─── POST /me/follow-up/resolved ──────────────────────────────────────────────
// Log how a gap was closed — 'learn' (engaged with the micro-lesson) or 'retry'
// (re-answered the original question) — for the staff record breakdown.

meRouter.post('/follow-up/resolved', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const b = req.body ?? {}
  const source = String(b.source ?? '')
  const ref    = String(b.ref ?? '')
  const method = b.method === 'retry' ? 'retry' : 'learn'
  if (!['training', 'induction'].includes(source) || !ref) { err(res, 'VALIDATION_ERROR', 'source and ref are required.'); return }
  const label = typeof b.label === 'string' ? b.label.slice(0, 280) : null
  await (prisma as any).remediationAttempt.create({ data: { tenant_id: tenantId, user_id: userId, source, ref, method, label, lang: typeof b.lang === 'string' ? b.lang : 'eng' } }).catch(() => {})
  ok(res, { logged: true })
})

// ─── POST /me/language-switch ─────────────────────────────────────────────────
// Records that a staff member flipped one hub set into their second language. The
// switch is session-only; this is just a usage signal for admins (training/language
// gaps). Guarded so we only log staff who actually have the feature + a 2nd language.
meRouter.post('/language-switch', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const b = req.body ?? {}
  const AREAS = ['training', 'annual', 'induction', 'followup', 'cqc', 'chat']
  const area = String(b.area ?? '')
  if (!AREAS.includes(area)) { err(res, 'VALIDATION_ERROR', 'A valid area is required.'); return }

  const [user, tenant] = await Promise.all([
    (prisma as any).user.findUnique({ where: { id: userId }, select: { second_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  // Only log when the feature is genuinely enabled for this staff member.
  if (!user?.allow_language_switching || !user?.second_language) { ok(res, { logged: false }); return }

  const lang     = String(user.second_language)
  const langName = languageNameForCode(lang, tenant?.custom_languages)
  const setRef   = typeof b.set_ref === 'string' ? b.set_ref.slice(0, 120) : null
  const setName  = typeof b.set_name === 'string' ? b.set_name.slice(0, 200) : null

  await (prisma as any).languageSwitchEvent.create({
    data: { tenant_id: tenantId, user_id: userId, area, set_ref: setRef, set_name: setName, lang, lang_name: langName },
  }).catch(() => {})
  ok(res, { logged: true })
})

// ─── POST /me/training-rating ─────────────────────────────────────────────────
// Staff rate a completed piece of training (confidence to apply + usefulness),
// captured in the hub right after finishing. Feeds the Effectiveness analytics.
meRouter.post('/training-rating', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const b = req.body ?? {}
  const AREAS = ['training', 'annual', 'followup', 'cqc']
  const area = String(b.area ?? '')
  if (!AREAS.includes(area)) { err(res, 'VALIDATION_ERROR', 'A valid area is required.'); return }
  const clamp = (v: any) => { const n = Number(v); return Number.isInteger(n) && n >= 1 && n <= 5 ? n : null }
  const confidence = clamp(b.confidence)
  const usefulness = clamp(b.usefulness)
  const comment = typeof b.comment === 'string' && b.comment.trim() ? b.comment.trim().slice(0, 500) : null
  if (confidence == null && usefulness == null && !comment) { ok(res, { saved: false }); return }
  await (prisma as any).trainingRating.create({
    data: { tenant_id: tenantId, user_id: userId, area, ref: typeof b.ref === 'string' ? b.ref.slice(0, 120) : null, confidence, usefulness, comment },
  }).catch(() => {})
  ok(res, { saved: true })
})

// ─── Annual training (AI modules) ─────────────────────────────────────────────

function annualState(e: any, now: Date): string {
  if (e.status === 'complete') {
    if (e.expires_at && new Date(e.expires_at) < now) return 'overdue'
    if (e.expires_at && new Date(e.expires_at).getTime() - now.getTime() < 30 * 86_400_000) return 'due_soon'
    return 'completed'
  }
  if (e.status === 'in_progress') return 'in_progress'
  if (e.due_date && new Date(e.due_date) < now) return 'overdue'
  return 'todo'
}

// A module is "takeable as a lesson" if it has scenario-based learning_content
// sections — true for AI annual modules AND statutory modules built with a lesson.
const moduleHasLesson = (m: any) => Array.isArray(m?.learning_content?.sections) && m.learning_content.sections.length > 0

// GET /me/annual-training — the staff member's assigned annual (AI) modules.
meRouter.get('/annual-training', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const now = new Date()
  const [enrollments, user, tenant, ratings] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: userId },
      include: { module: { select: { id: true, name: true, source: true, approved: true, frequency: true, requires_practical: true, pass_mark: true, group_key: true, image_key: true, illustration_key: true } } },
    }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true, is_reviewer: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
    (prisma as any).trainingRating.findMany({ where: { tenant_id: tenantId, user_id: userId, area: 'annual' }, select: { ref: true } }),
  ])
  const ratedAnnual = new Set((ratings as any[]).map(r => r.ref))
  let items = (enrollments as any[])
    // Reviewers (CPD assessors) also see modules pending approval — that's the point of the review.
    .filter(e => e.module?.source === 'ai_generated' && (user?.is_reviewer || e.module?.approved))
    .map(e => ({
      enrollment_id: e.id, module_id: e.module.id, name: e.module.name,
      frequency: e.module.frequency, requires_practical: e.module.requires_practical,
      group_key: e.module.group_key, image_key: e.module.image_key,
      illustration_url: illustrationUrl(e.module.illustration_key),
      status: e.status, completed_at: e.completed_at, expires_at: e.expires_at, due_date: e.due_date,
      state: annualState(e, now),
      rated: ratedAnnual.has(e.id) || e.eval_at != null,
    }))

  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)
  if (lang !== 'eng' && items.length) {
    items = await withTranslationBudget(
      translateTextsBatch(items.map((it: any) => it.name), lang, langName, tenant?.translation_glossary, tenantId)
        .then(names => items.map((it: any, i: number) => ({ ...it, name: names[i] }))),
      12_000, items,
    )
  }
  ok(res, { items })
})

// GET /me/annual-training/:enrollmentId — learning section + assessment (translated)
meRouter.get('/annual-training/:enrollmentId', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const [enr, user, tenant] = await Promise.all([
    (prisma as any).trainingEnrollment.findFirst({
      where:   { id: req.params.enrollmentId, tenant_id: tenantId, user_id: userId },
      include: { module: { select: { name: true, source: true, learning_content: true, questions: true, pass_mark: true, requires_practical: true, frequency: true, policy_refs: true, illustration_key: true, duration_minutes: true } }, answers: { select: { question_id: true, answer_text: true, is_correct: true } } },
    }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true, can_suggest_translations: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  if (!enr || !(enr.module?.source === 'ai_generated' || moduleHasLesson(enr.module))) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

  const m = enr.module

  // Linked source policies (validated as still present) so staff can ask about them.
  const refs = Array.isArray(m.policy_refs) ? m.policy_refs : []
  const refIds = [...new Set(refs.map((r: any) => r?.policy_id).filter(Boolean))]
  let policies: Array<{ policy_id: string; title: string }> = []
  if (refIds.length) {
    const found = await (prisma as any).policy.findMany({ where: { id: { in: refIds }, tenant_id: tenantId }, select: { id: true, filename: true } }).catch(() => [])
    policies = (found as any[]).map(p => ({ policy_id: p.id, title: policyTitle(p.filename) }))
  }
  const learn = (m.learning_content ?? {}) as any
  let summary = String(learn.summary ?? '')
  let outcomes: string[] = Array.isArray(learn.outcomes) ? learn.outcomes.map((x: any) => String(x)) : []
  let keyPoints: string[] = Array.isArray(learn.key_points) ? learn.key_points.map((x: any) => String(x)) : []
  // Interactive sections (heading, body, scenario, in-lesson check). Older modules
  // have none — the hub falls back to summary + key_points.
  let sections = (Array.isArray(learn.sections) ? learn.sections : []).map((s: any, i: number) => ({
    id: `s${i + 1}`,
    heading: String(s?.heading ?? ''),
    body: String(s?.body ?? ''),
    image_url: illustrationUrl(s?.image_key),
    scenario: { situation: String(s?.scenario?.situation ?? ''), prompt: String(s?.scenario?.prompt ?? ''), answer: String(s?.scenario?.answer ?? '') },
    check: { question: String(s?.check?.question ?? ''), options: Array.isArray(s?.check?.options) ? s.check.options.map((o: any) => String(o)) : [], correct: Number.isInteger(s?.check?.correct) ? s.check.correct : 0 },
  })).filter((s: any) => s.body || s.heading)
  let questions = (Array.isArray(m.questions) ? m.questions : []).map(({ correct: _c, ...q }: any) => ({ ...q, options: Array.isArray(q.options) ? q.options : [] }))
  // English source of the quiz questions + lesson sections, snapshotted before
  // translation so the hub can offer a "suggest a better translation" control
  // keyed to the source string.
  const enQuestions = (questions as any[]).map((q: any) => ({ text: String(q.text ?? ''), options: (q.options as string[]) ?? [] }))
  const enOverview = { summary: String(summary ?? ''), outcomes: (outcomes as string[]).map(String), key_points: (keyPoints as string[]).map(String) }
  const enSections = (sections as any[]).map((s: any) => ({
    heading:       String(s.heading ?? ''),
    body:          String(s.body ?? ''),
    situation:     String(s.scenario?.situation ?? ''),
    prompt:        String(s.scenario?.prompt ?? ''),
    answer:        String(s.scenario?.answer ?? ''),
    check_question: String(s.check?.question ?? ''),
    check_options: Array.isArray(s.check?.options) ? s.check.options.map(String) : [],
  }))

  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)
  if (lang !== 'eng') {
    const translated = await withTranslationBudget((async () => {
      // Flatten every plain string and every question across the whole module into
      // two batches → one cache read + one bulk write each, instead of dozens of
      // per-field round-trips. Reassembled below in the exact same order.
      const texts: string[] = [summary, ...outcomes, ...keyPoints]
      for (const sec of sections as any[]) texts.push(sec.heading, sec.body, sec.scenario.situation, sec.scenario.prompt, sec.scenario.answer)
      const qs = [
        ...(questions as any[]).map((q: any) => ({ text: q.text ?? '', options: q.options })),
        ...(sections as any[]).map((sec: any) => ({ text: sec.check.question ?? '', options: sec.check.options })),
      ]
      const [tTexts, tQs] = await Promise.all([
        translateTextsBatch(texts, lang, langName, tenant?.translation_glossary, tenantId),
        translateQuestionsBatch(qs, lang, langName, tenant?.translation_glossary, tenantId),
      ])
      let p = 0
      const s  = tTexts[p++]
      const oc = (outcomes as string[]).map(() => tTexts[p++])
      const kp = (keyPoints as string[]).map(() => tTexts[p++])
      const secs = (sections as any[]).map((sec: any) => {
        const heading = tTexts[p++], body = tTexts[p++], situation = tTexts[p++], prompt = tTexts[p++], answer = tTexts[p++]
        return { ...sec, heading, body, scenario: { situation, prompt, answer } }
      })
      let qi = 0
      const newQs = (questions as any[]).map((q: any) => { const t = tQs[qi++]; return { ...q, text: t.text, options: t.options } })
      const secsFull = secs.map((sec: any) => { const t = tQs[qi++]; return { ...sec, check: { ...sec.check, question: t.text, options: t.options } } })
      return { summary: s, outcomes: oc, keyPoints: kp, questions: newQs, sections: secsFull }
    })(), 25_000, null)
    if (translated) { summary = translated.summary; outcomes = translated.outcomes; keyPoints = translated.keyPoints; questions = translated.questions; sections = translated.sections }
  }

  ok(res, {
    name: m.name, pass_mark: m.pass_mark ?? 80, requires_practical: m.requires_practical, frequency: m.frequency,
    duration_minutes: m.duration_minutes ?? null,
    illustration_url: illustrationUrl(m.illustration_key),
    learning: { summary, outcomes, key_points: keyPoints, sections },
    questions,
    policies,
    answers: (enr.answers ?? []).map((a: any) => ({ question_id: a.question_id, answer_text: a.answer_text, is_correct: a.is_correct })),
    status: enr.status,
    // Translation-suggestion context: only when the module is being shown in a
    // non-English language AND this staff member is permitted to suggest.
    lang_code: lang,
    can_suggest: lang !== 'eng' && !!(user as any)?.can_suggest_translations,
    source_questions: lang !== 'eng' ? enQuestions : undefined,
    source_sections: lang !== 'eng' ? enSections : undefined,
    source_overview: lang !== 'eng' ? enOverview : undefined,
  })
})

// POST /me/annual-training/:enrollmentId/submit — grade against pass mark, issue cert on pass
meRouter.post('/annual-training/:enrollmentId/submit', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const enr = await (prisma as any).trainingEnrollment.findFirst({
    where:   { id: req.params.enrollmentId, tenant_id: tenantId, user_id: userId },
    include: { module: { select: { source: true, questions: true, pass_mark: true, renewal_months: true, learning_content: true } }, answers: { select: { question_id: true, is_correct: true } } },
  })
  if (!enr || !(enr.module?.source === 'ai_generated' || moduleHasLesson(enr.module))) { err(res, 'NOT_FOUND', 'Module not found', 404); return }

  const bank = Array.isArray(enr.module.questions) ? enr.module.questions : []
  const bankIds = new Set(bank.map((q: any) => q.id))
  const total = bank.length
  const correct = (enr.answers ?? []).filter((a: any) => bankIds.has(a.question_id) && a.is_correct).length
  const score = total ? Math.round((correct / total) * 100) : 0
  const passMark = enr.module.pass_mark ?? 80
  const passed = score >= passMark

  if (passed) {
    const now = new Date()
    const months = enr.module.renewal_months
    const expiresAt = months ? new Date(now.getFullYear(), now.getMonth() + months, now.getDate()) : null
    await (prisma as any).trainingEnrollment.update({
      where: { id: enr.id },
      data:  { status: 'complete', completed_at: now, expires_at: expiresAt, certificate_url: 'issued', updated_at: now },
    })
  }
  ok(res, { passed, score, correct, total, pass_mark: passMark })
})

// POST /me/annual-training/:enrollmentId/learn-time — accumulate active lesson time
// (substantiates the module's claimed CPD duration). Per-call capped to guard against
// runaway values; a normal lesson is a few minutes.
meRouter.post('/annual-training/:enrollmentId/learn-time', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const secs = Math.max(0, Math.min(3600, Math.round(Number(req.body?.seconds) || 0)))
  if (secs > 0) {
    await (prisma as any).trainingEnrollment.updateMany({
      where: { id: req.params.enrollmentId, tenant_id: tenantId, user_id: userId },
      data:  { learn_seconds: { increment: secs } },
    }).catch((e: any) => console.error('[me/annual-training/learn-time] failed:', e?.message ?? e))
  }
  ok(res, { recorded: secs })
})

// POST /me/annual-training/:enrollmentId/evaluate — short post-completion learner
// evaluation (confidence + usefulness, 1–5, optional comment). CPD evidence of value.
meRouter.post('/annual-training/:enrollmentId/evaluate', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const clamp = (v: any) => { const n = Math.round(Number(v)); return Number.isFinite(n) && n >= 1 && n <= 5 ? n : null }
  const confidence = clamp(req.body?.confidence)
  const usefulness = clamp(req.body?.usefulness)
  const comment    = typeof req.body?.comment === 'string' ? req.body.comment.slice(0, 1000) : null
  await (prisma as any).trainingEnrollment.updateMany({
    where: { id: req.params.enrollmentId, tenant_id: tenantId, user_id: userId },
    data:  { eval_confidence: confidence, eval_usefulness: usefulness, eval_comment: comment, eval_at: new Date() },
  }).catch((e: any) => console.error('[me/annual-training/evaluate] failed:', e?.message ?? e))
  ok(res, { saved: true })
})

// GET /me/annual-training/:enrollmentId/certificate — certificate data for a passed module
meRouter.get('/annual-training/:enrollmentId/certificate', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const [enr, tenant, user] = await Promise.all([
    (prisma as any).trainingEnrollment.findFirst({
      where:   { id: req.params.enrollmentId, tenant_id: tenantId, user_id: userId },
      include: { module: { select: { name: true, requires_practical: true, frequency: true, questions: true, duration_minutes: true, cpd_accredited: true, independently_reviewed: true } }, answers: { select: { question_id: true, is_correct: true } } },
    }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, logo_url: true } }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true } }),
  ])
  if (!enr || enr.status !== 'complete') { err(res, 'NOT_FOUND', 'No certificate yet.', 404); return }
  const bank = Array.isArray(enr.module.questions) ? enr.module.questions : []
  const total = bank.length
  const correct = (enr.answers ?? []).filter((a: any) => a.is_correct).length
  const cpdHours = enr.module.duration_minutes ? Math.round((enr.module.duration_minutes / 60) * 10) / 10 : null
  ok(res, {
    staff_name: user?.name ?? '', module_name: enr.module.name, org_name: tenant?.name ?? '', logo_url: tenant?.logo_url ?? null,
    completed_at: enr.completed_at, expires_at: enr.expires_at, frequency: enr.module.frequency,
    requires_practical: enr.module.requires_practical, score: total ? Math.round((correct / total) * 100) : 0,
    independently_reviewed: !!enr.module.independently_reviewed,
    cpd: { accredited: !!enr.module.cpd_accredited, hours: cpdHours, provider_number: process.env.CPD_PROVIDER_NUMBER ?? null },
  })
})

// ─── CPD assessor: per-module review notes ────────────────────────────────────

// GET /me/module-reviews — this reviewer's saved notes + status, keyed by module.
meRouter.get('/module-reviews', async (req: Request, res: Response) => {
  const userId = (req as any).user.sub
  const rows = await (prisma as any).moduleReview.findMany({ where: { reviewer_user_id: userId } })
  ok(res, { reviews: (rows as any[]).map(r => ({ module_id: r.module_id, notes: r.notes, status: r.status, updated_at: r.updated_at })) })
})

// POST /me/module-reviews — upsert notes/status for one module.
meRouter.post('/module-reviews', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const moduleId = String(req.body?.module_id ?? '').trim()
  if (!moduleId) { err(res, 'INVALID', 'module_id is required.', 400); return }
  const notes  = req.body?.notes != null ? String(req.body.notes).slice(0, 8000) : undefined
  const status = ['not_reviewed', 'reviewed', 'needs_discussion'].includes(req.body?.status) ? req.body.status : undefined
  const user   = await (prisma as any).user.findUnique({ where: { id: userId }, select: { name: true } })
  await (prisma as any).moduleReview.upsert({
    where:  { module_id_reviewer_user_id: { module_id: moduleId, reviewer_user_id: userId } },
    update: { ...(notes !== undefined ? { notes } : {}), ...(status ? { status } : {}), reviewer_name: user?.name ?? null },
    create: { module_id: moduleId, reviewer_user_id: userId, reviewer_name: user?.name ?? null, notes: notes ?? null, status: status ?? 'not_reviewed' },
  })
  ok(res, { saved: true })
})

// ─── GET /me/policy/:policyId ─────────────────────────────────────────────────
// Full policy text for a staff member to read, translated into their first
// language when their comms toggle is on. Translations are cached per policy+lang.

meRouter.get('/policy/:policyId', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const policyId = String(req.params.policyId)

  const [policy, user, tenant] = await Promise.all([
    (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId }, select: { id: true, filename: true, status: true } }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  if (!policy) { err(res, 'NOT_FOUND', 'Policy not found.', 404); return }

  const title = policyTitle(policy.filename)
  const { code: lang } = hubContentLang(user, req.query, tenant?.custom_languages)

  // If the staff member's language version is already cached, serve it.
  const cachedTarget = lang === 'eng' ? null
    : await (prisma as any).policyTranslation.findUnique({ where: { policy_id_lang: { policy_id: policyId, lang } } }).catch(() => null)
  if (cachedTarget?.content) { ok(res, { policy_id: policyId, title, content: cachedTarget.content, lang, html: true }); return }

  // ── Stage 1: clean + format English HTML (cached) ───────────────────────────
  const cachedEng = await (prisma as any).policyTranslation.findUnique({ where: { policy_id_lang: { policy_id: policyId, lang: 'eng' } } }).catch(() => null)
  let englishHtml: string | null = cachedEng?.content ?? null
  const engWasCached = !!englishHtml

  if (!englishHtml) {
    const raw = await downloadExtractedText(tenantId, policyId).catch(() => null)
    if (!raw) { ok(res, { policy_id: policyId, title, content: '', lang: 'eng', html: false, processing: policy.status === 'processing' }); return }
    englishHtml = await withTranslationBudget(formatPolicyHtml(raw, 'eng'), 90_000, null)
    if (englishHtml) {
      await (prisma as any).policyTranslation.create({ data: { tenant_id: tenantId, policy_id: policyId, lang: 'eng', content: englishHtml } }).catch(() => {})
      trackAiAction(tenantId, 'policy_format', policyId)
    } else {
      console.error(`[me/policy] format failed for ${policyId} — serving raw text`)
      ok(res, { policy_id: policyId, title, content: raw, lang: 'eng', html: false }); return
    }
  }

  if (lang === 'eng') { ok(res, { policy_id: policyId, title, content: englishHtml, lang: 'eng', html: true }); return }

  // ── Stage 2: translate the formatted HTML ───────────────────────────────────
  // Only attempt in this request if English was already cached (so there's time
  // budget). Otherwise serve the clean English now; the next open translates it.
  if (!engWasCached) {
    ok(res, { policy_id: policyId, title, content: englishHtml, lang: 'eng', html: true, translation_pending: true }); return
  }
  const langName   = languageNameForCode(lang, tenant?.custom_languages)
  const translated = await withTranslationBudget(translateHtmlPreservingTags(englishHtml, lang, langName, tenant?.translation_glossary), 50_000, null)
  if (translated && translated !== englishHtml) {
    await (prisma as any).policyTranslation.create({ data: { tenant_id: tenantId, policy_id: policyId, lang, content: translated } }).catch(() => {})
    trackAiAction(tenantId, 'translation', policyId)
    ok(res, { policy_id: policyId, title, content: translated, lang, html: true })
  } else {
    ok(res, { policy_id: policyId, title, content: englishHtml, lang: 'eng', html: true, translation_pending: true })
  }
})

// ─── GET /me/policy/:policyId/questions ───────────────────────────────────────
// Suggested questions about a policy, in the staff member's language, to seed a
// "Talk to this policy" chat.

meRouter.get('/policy/:policyId/questions', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const policyId = String(req.params.policyId)

  const [policy, user, tenant] = await Promise.all([
    (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId }, select: { id: true } }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null),
  ])
  if (!policy) { err(res, 'NOT_FOUND', 'Policy not found.', 404); return }

  const english = await downloadExtractedText(tenantId, policyId).catch(() => null)
  if (!english) { ok(res, { questions: [] }); return }

  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)
  const questions = await withTranslationBudget(generatePolicyQuestions(english, lang, langName), 20_000, [] as string[])
  ok(res, { questions })
})

// ─── POST /me/policy/read ─────────────────────────────────────────────────────
// Record a reading session: time spent, scroll depth, whether they finished.

meRouter.post('/policy/read', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const b = req.body ?? {}
  if (!b.policy_id) { err(res, 'VALIDATION_ERROR', 'policy_id is required.'); return }
  await (prisma as any).policyReadSession.create({
    data: {
      tenant_id: tenantId, user_id: userId, policy_id: String(b.policy_id),
      step_id:        b.step_id ? String(b.step_id) : null,
      enrollment_id:  b.enrollment_id ? String(b.enrollment_id) : null,
      seconds_spent:  Math.max(0, Math.round(Number(b.seconds_spent) || 0)),
      max_scroll_pct: Math.min(100, Math.max(0, Math.round(Number(b.max_scroll_pct) || 0))),
      reached_end:    !!b.reached_end,
      marked_read:    !!b.marked_read,
      lang:           typeof b.lang === 'string' ? b.lang : 'eng',
    },
  }).catch((e: any) => console.error('[me/policy/read] failed:', e))
  ok(res, { recorded: true })
})

// ─── Saved policies (read-later) ──────────────────────────────────────────────

meRouter.get('/saved-policies', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const saved = await (prisma as any).savedPolicy.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' } })
  const ids = (saved as any[]).map(s => s.policy_id)
  const policies = ids.length ? await (prisma as any).policy.findMany({ where: { id: { in: ids }, tenant_id: tenantId }, select: { id: true, filename: true } }) : []
  const nameById = new Map((policies as any[]).map(p => [p.id, policyTitle(p.filename)]))
  ok(res, { saved: (saved as any[]).filter(s => nameById.has(s.policy_id)).map(s => ({ policy_id: s.policy_id, title: nameById.get(s.policy_id), saved_at: s.created_at })) })
})

meRouter.post('/saved-policies', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const policyId = String(req.body?.policy_id ?? '')
  if (!policyId) { err(res, 'VALIDATION_ERROR', 'policy_id is required.'); return }
  const policy = await (prisma as any).policy.findFirst({ where: { id: policyId, tenant_id: tenantId }, select: { id: true } })
  if (!policy) { err(res, 'NOT_FOUND', 'Policy not found.', 404); return }
  await (prisma as any).savedPolicy.upsert({
    where:  { user_id_policy_id: { user_id: userId, policy_id: policyId } },
    update: {},
    create: { tenant_id: tenantId, user_id: userId, policy_id: policyId },
  }).catch(() => {})
  ok(res, { saved: true })
})

meRouter.delete('/saved-policies/:policyId', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  await (prisma as any).savedPolicy.deleteMany({ where: { user_id: userId, policy_id: String(req.params.policyId) } })
  ok(res, { removed: true })
})

meRouter.get('/progress', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const record = await buildStaffRecord(tenantId, userId, { includeTeam: true })
  if (!record) { err(res, 'NOT_FOUND', 'Record not found.', 404); return }

  // Localise into the staff member's first language when their comms toggle is on.
  const langCode = record.user.comms_always_first_language === false ? 'eng' : ((record.user.first_language as string) ?? 'eng')
  if (langCode === 'eng') { ok(res, { ...record, ui: UI_STRINGS }); return }

  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }).catch(() => null)
  const langName = languageNameForCode(langCode, tenant?.custom_languages)

  const localise = (async () => {
    const [ui, tItems, oItems, timeline] = await Promise.all([
      translateBundle(UI_STRINGS, langCode, langName, tenant?.translation_glossary),
      mapLimit(record.training.items, 6, async (m: any) => ({ ...m, module_name: await translateText(m.module_name, langCode, langName, tenant?.translation_glossary, tenantId) })),
      mapLimit(record.onboarding.items, 6, async (f: any) => ({ ...f, flow_name: await translateText(f.flow_name, langCode, langName, tenant?.translation_glossary, tenantId) })),
      mapLimit(record.timeline.slice(0, 6), 6, async (e: any) => ({ ...e, label: await translateText(e.label, langCode, langName, tenant?.translation_glossary, tenantId) })),
    ])
    return {
      ...record, ui,
      training:   { ...record.training,   items: tItems },
      onboarding: { ...record.onboarding, items: oItems },
      timeline,
    }
  })()

  const result = await withTranslationBudget(localise, 16_000, { ...record, ui: UI_STRINGS })
  ok(res, result)
})

// ─── GET /me/supervisions ─────────────────────────────────────────────────────
// The signed-in staff member's own supervisions & appraisals (Enterprise). Used
// by the hub "Supervisions" view. enabled=false when the plan doesn't include it.

meRouter.get('/supervisions', async (req: Request, res: Response) => {
  const userId   = (req as any).user.sub
  const tenantId = (req as any).user.tenant_id
  const features = await getPlanFeatures(tenantId).catch(() => null)
  if (!features?.has_workforce_compliance) { ok(res, { enabled: false, records: [] }); return }
  const records = await (prisma as any).staffSupervision.findMany({
    where:   { tenant_id: tenantId, user_id: userId },
    select:  { id: true, type: true, held_on: true, conducted_by: true, next_due: true, notes: true },
    orderBy: { held_on: 'desc' },
  })
  ok(res, { enabled: true, records })
})
