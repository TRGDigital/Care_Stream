// Staff-facing "My Progress" — the signed-in user's own training & induction
// record, fully localised into their first language (UI labels + the on-screen
// explanations + module/flow names + recent activity), so it reads naturally for
// staff whose first language isn't English.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { buildStaffRecord } from '../lib/staff-record'
import { translateBundle, translateText, translateQuestionsBatch, translateTextsBatch, formatPolicyHtml, translateHtmlPreservingTags, generatePolicyQuestions, mapLimit, withTranslationBudget, hubContentLang } from '../lib/translate'
import { languageNameForCode } from '../data/languages'
import { downloadExtractedText } from '../services/storage/s3'
import { getOrCreateLesson } from '../lib/remediation'
import { trackAiAction } from '../lib/plan-limits'
import { illustrationUrl } from '../services/training/moduleImage'
import { getAuditsDue } from '../services/audits/due'
import { prisma } from '../db/client'

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
      select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true },
    }).catch(() => null),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
  ])
  const second = (user?.second_language as string) ?? null
  ok(res, {
    first_language:              (user?.first_language as string) ?? 'eng',
    second_language:             second,
    second_language_name:        second ? languageNameForCode(second, tenant?.custom_languages) : null,
    comms_always_first_language: user?.comms_always_first_language !== false,
    // Whether this staff member may flip a single hub set into their second language.
    allow_language_switching:    !!user?.allow_language_switching && !!second,
  })
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

// ─── GET /me/follow-up ────────────────────────────────────────────────────────
// The exact questions the staff member currently has wrong (training + induction
// MCQs), so they can re-answer just those. Questions translated to their language.

meRouter.get('/follow-up', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub

  const [tEnr, oEnr, user, tenant] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: userId },
      select: { id: true, module: { select: { name: true, questions: true, illustration_url: true } }, answers: { where: { is_correct: false }, select: { question_id: true } } },
    }),
    (prisma as any).onboardingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: userId },
      select: { id: true, flow: { select: { name: true, steps: { select: { id: true, type: true, question: true, options: true } } } }, progress: { where: { answer_correct: false }, select: { step_id: true } } },
    }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
  ])

  const items: any[] = []
  for (const e of tEnr as any[]) {
    const wrong = new Set((e.answers ?? []).map((a: any) => a.question_id))
    for (const q of (e.module?.questions ?? [])) {
      if (!wrong.has(q.id)) continue
      const options = Array.isArray(q.options) ? q.options : []
      if (options.length === 0) continue
      items.push({ source: 'training', enrollment_id: e.id, ref: q.id, topic: e.module?.name, text: q.text, options, image_url: illustrationUrl(e.module?.illustration_url) })
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
    const translated = await withTranslationBudget(
      translateQuestionsBatch(items.map((it: any) => ({ text: it.text ?? '', options: it.options })), lang, langName)
        .then(ts => items.map((it: any, i: number) => ({ ...it, text: ts[i].text, options: ts[i].options }))),
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
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
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
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
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
  const AREAS = ['training', 'annual', 'induction', 'followup', 'cqc']
  const area = String(b.area ?? '')
  if (!AREAS.includes(area)) { err(res, 'VALIDATION_ERROR', 'A valid area is required.'); return }

  const [user, tenant] = await Promise.all([
    (prisma as any).user.findUnique({ where: { id: userId }, select: { second_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
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
  const [enrollments, user, tenant] = await Promise.all([
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: userId },
      include: { module: { select: { id: true, name: true, source: true, approved: true, frequency: true, requires_practical: true, pass_mark: true, group_key: true, image_key: true, illustration_key: true } } },
    }),
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
  ])
  let items = (enrollments as any[])
    .filter(e => e.module?.source === 'ai_generated' && e.module?.approved)
    .map(e => ({
      enrollment_id: e.id, module_id: e.module.id, name: e.module.name,
      frequency: e.module.frequency, requires_practical: e.module.requires_practical,
      group_key: e.module.group_key, image_key: e.module.image_key,
      illustration_url: illustrationUrl(e.module.illustration_key),
      status: e.status, completed_at: e.completed_at, expires_at: e.expires_at, due_date: e.due_date,
      state: annualState(e, now),
    }))

  const { code: lang, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)
  if (lang !== 'eng' && items.length) {
    items = await withTranslationBudget(
      translateTextsBatch(items.map((it: any) => it.name), lang, langName)
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
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
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
        translateTextsBatch(texts, lang, langName),
        translateQuestionsBatch(qs, lang, langName),
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
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
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
  const translated = await withTranslationBudget(translateHtmlPreservingTags(englishHtml, lang, langName), 50_000, null)
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
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
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

  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null)
  const langName = languageNameForCode(langCode, tenant?.custom_languages)

  const localise = (async () => {
    const [ui, tItems, oItems, timeline] = await Promise.all([
      translateBundle(UI_STRINGS, langCode, langName),
      mapLimit(record.training.items, 6, async (m: any) => ({ ...m, module_name: await translateText(m.module_name, langCode, langName) })),
      mapLimit(record.onboarding.items, 6, async (f: any) => ({ ...f, flow_name: await translateText(f.flow_name, langCode, langName) })),
      mapLimit(record.timeline.slice(0, 6), 6, async (e: any) => ({ ...e, label: await translateText(e.label, langCode, langName) })),
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
