// Staff-facing "My Progress" — the signed-in user's own training & induction
// record, fully localised into their first language (UI labels + the on-screen
// explanations + module/flow names + recent activity), so it reads naturally for
// staff whose first language isn't English.

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { buildStaffRecord } from '../lib/staff-record'
import { translateBundle, translateText, formatPolicyHtml, translateHtmlPreservingTags, generatePolicyQuestions, mapLimit, withTranslationBudget } from '../lib/translate'
import { languageNameForCode } from '../data/languages'
import { downloadExtractedText } from '../services/storage/s3'
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
meRouter.get('/counts', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const now = new Date()
  const [training, induction, cqc] = await Promise.all([
    (prisma as any).trainingEnrollment.count({ where: { tenant_id: tenantId, user_id: userId, OR: [
      { status: { in: ['not_started', 'in_progress'] } },
      { status: 'complete', expires_at: { lt: now } },
    ] } }).catch(() => 0),
    (prisma as any).onboardingEnrollment.count({ where: { tenant_id: tenantId, user_id: userId, completed_at: null } }).catch(() => 0),
    (prisma as any).cqcStaffDelivery.count({ where: { tenant_id: tenantId, user_id: userId, status: 'pending' } }).catch(() => 0),
  ])
  ok(res, { training, induction, cqc })
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
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, comms_always_first_language: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
  ])
  if (!policy) { err(res, 'NOT_FOUND', 'Policy not found.', 404); return }

  const title = policyTitle(policy.filename)
  const lang  = user?.comms_always_first_language === false ? 'eng' : ((user?.first_language as string) ?? 'eng')

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
    englishHtml = await withTranslationBudget(formatPolicyHtml(raw, 'eng'), 45_000, null)
    if (englishHtml) {
      await (prisma as any).policyTranslation.create({ data: { tenant_id: tenantId, policy_id: policyId, lang: 'eng', content: englishHtml } }).catch(() => {})
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
    (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, comms_always_first_language: true } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true } }).catch(() => null),
  ])
  if (!policy) { err(res, 'NOT_FOUND', 'Policy not found.', 404); return }

  const english = await downloadExtractedText(tenantId, policyId).catch(() => null)
  if (!english) { ok(res, { questions: [] }); return }

  const lang     = user?.comms_always_first_language === false ? 'eng' : ((user?.first_language as string) ?? 'eng')
  const langName = languageNameForCode(lang, tenant?.custom_languages)
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
