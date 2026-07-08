import { Router } from 'express'
import { requireAuth, requireAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import Anthropic from '@anthropic-ai/sdk'
import { notifyUsers, notifyFollowUp } from '../lib/notify'
import { sendOnboardingUpdateEmail } from '../services/email/outbound'
import { callClaude } from '../services/ai/claude'
import { downloadExtractedText } from '../services/storage/s3'
import { illustrationUrl } from '../services/training/moduleImage'
import { DEFAULT_ONBOARDING_QUESTIONS_PROMPT } from './onboarding-templates'

// Auto-match a flow to a training cover illustration by topic keywords, so the
// staff hub can show a thumbnail that reads like the training cards. Generic
// words (induction, policy, staff…) are ignored so only real topics match.
const GENERIC_FLOW_WORDS = new Set([
  'induction','inductions','policy','policies','procedure','procedures','training','module','modules',
  'course','flow','flows','new','starter','starters','staff','care','home','homes','general','basic',
  'intro','introduction','awareness','management','adult','adults','level','the','and','for','your','our',
  'of','to','in','on','with','read','answer','question','questions',
])
function flowKeywords(text: string): Set<string> {
  return new Set((text.toLowerCase().match(/[a-z]+/g) ?? []).filter(w => w.length >= 3 && !GENERIC_FLOW_WORDS.has(w)))
}
function pickIllustrationKey(flowText: string, candidates: Array<{ name: string; illustration_key: string | null }>): string | null {
  const kw = flowKeywords(flowText)
  if (kw.size === 0) return null
  let best: { key: string; score: number } | null = null
  for (const c of candidates) {
    if (!c.illustration_key) continue
    let score = 0
    for (const w of flowKeywords(c.name)) if (kw.has(w)) score++
    if (score > 0 && (!best || score > best.score)) best = { key: c.illustration_key, score }
  }
  return best?.key ?? null
}
import { facilityTypeToSetting } from '../lib/care-setting'
import { siteUrl } from '../lib/urls'
import { translateQuestionsBatch, translateTextsBatch, withTranslationBudget, hubContentLang } from '../lib/translate'
import { languageNameForCode } from '../data/languages'

export const onboardingRouter = Router()
onboardingRouter.use(requireAuth)

const ai = new Anthropic()

// Returns any step policy_ids that do NOT belong to the given tenant. Steps may
// reference a policy by id from the request body, so we must confirm ownership
// before storing it (otherwise a flow could reference another tenant's policy).
async function invalidStepPolicyIds(steps: any[], tenantId: string): Promise<string[]> {
  const ids = [...new Set((steps ?? []).map(s => s?.policy_id).filter(Boolean))] as string[]
  if (ids.length === 0) return []
  const found = await prisma.policy.findMany({
    where:  { id: { in: ids }, tenant_id: tenantId },
    select: { id: true },
  })
  const ok = new Set(found.map(p => p.id))
  return ids.filter(id => !ok.has(id))
}

// ─── Admin: AI question generation from a policy ──────────────────────────────

async function getQuestionsPrompt(): Promise<string> {
  try {
    const p = await (prisma as any).aiPrompt.findUnique({ where: { usage: 'onboarding_questions_from_policy' } })
    if (p?.content?.trim()) return p.content
  } catch { /* fall through to default */ }
  return DEFAULT_ONBOARDING_QUESTIONS_PROMPT
}

// Generate multiple-choice onboarding questions from a policy the tenant has
// uploaded, so a "read policy" step can be paired with a knowledge check drawn
// from that policy's own wording. Prompt is editable in platform /prompts.
onboardingRouter.post('/generate-questions', requireAdmin, async (req, res) => {
  const tenantId = getTenantId()
  const policyId = String(req.body?.policy_id ?? '')
  const count    = Math.min(Math.max(Number(req.body?.count) || 3, 1), 5)

  if (!policyId) {
    res.status(400).json({ success: false, error: { code: 'BAD_REQUEST', message: 'A policy is required.' } })
    return
  }
  const policy = await prisma.policy.findFirst({ where: { id: policyId, tenant_id: tenantId } })
  if (!policy) {
    res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found.' } })
    return
  }
  const text = await downloadExtractedText(tenantId, policyId).catch(() => null)
  if (!text || !text.trim()) {
    res.status(422).json({ success: false, error: { code: 'NO_TEXT', message: 'This policy has no readable text yet. It may still be processing. Please try again shortly.' } })
    return
  }

  try {
    const tpl = await getQuestionsPrompt()
    const userMessage = tpl
      .replace(/\{\{policy_name\}\}/g, policy.name)
      .replace(/\{\{count\}\}/g,       String(count))
      .replace(/\{\{policy_text\}\}/g, text.slice(0, 12000))
    const raw = await callClaude('Respond only with a valid JSON array.', userMessage, { maxTokens: 4000, temperature: 0.4 })
    const noFence = raw.replace(/```(?:json)?/gi, '').trim()
    const arr = JSON.parse(noFence.slice(noFence.indexOf('['), noFence.lastIndexOf(']') + 1))
    const questions = (Array.isArray(arr) ? arr : [])
      .filter((q: any) => q && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4)
      .slice(0, count)
      .map((q: any) => ({
        question:       String(q.question),
        options:        q.options.map((o: any) => String(o)),
        correct_option: (typeof q.correct_option === 'number' && q.correct_option >= 0 && q.correct_option <= 3) ? q.correct_option : 0,
      }))
    if (questions.length === 0) {
      res.status(502).json({ success: false, error: { code: 'AI_EMPTY', message: 'Could not generate questions from this policy. Please try again.' } })
      return
    }
    res.json({ success: true, data: { questions } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e?.message ?? 'Generation failed.' } })
  }
})

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

// POST /onboarding/question-feedback — a tenant admin rates a ready-made-flow
// question (good / not relevant / not good). Feeds the platform template review.
onboardingRouter.post('/question-feedback', requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId()
    const { flow_id, step_id, question, rating, comment } = req.body ?? {}
    if (!['good', 'not_relevant', 'not_good'].includes(String(rating))) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'rating must be good, not_relevant or not_good' } })
    }
    if (typeof question !== 'string' || !question.trim()) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'question is required' } })
    }

    // Resolve the source template + policy area from the flow/step (server-side,
    // so the feedback is reliably linked back to the CareStream template).
    let source_flow_id: string | null = null
    let policy_section: string | null = null
    if (flow_id) {
      const flow = await prisma.onboardingFlow.findFirst({ where: { id: String(flow_id), tenant_id: tenantId }, select: { source_flow_id: true } })
      source_flow_id = (flow?.source_flow_id as string) ?? null
    }
    if (step_id) {
      const step = await (prisma as any).onboardingStep.findUnique({ where: { id: String(step_id) }, select: { policy_section: true } }).catch(() => null)
      policy_section = step?.policy_section ?? null
    }

    const user = await (prisma as any).user.findUnique({ where: { id: (req as any).user!.sub }, select: { name: true } }).catch(() => null)

    await (prisma as any).onboardingQuestionFeedback.create({
      data: {
        tenant_id:       tenantId,
        flow_id:         flow_id ? String(flow_id) : null,
        step_id:         step_id ? String(step_id) : null,
        source_flow_id,
        policy_section,
        question:        String(question).slice(0, 1000),
        rating:          String(rating),
        comment:         typeof comment === 'string' ? comment.trim().slice(0, 1000) : '',
        created_by:      (req as any).user!.sub,
        created_by_name: user?.name ?? '',
      },
    })
    res.json({ success: true, data: { recorded: true } })
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
    const badPolicies = await invalidStepPolicyIds(steps, tenantId)
    if (badPolicies.length) {
      return res.status(400).json({ success: false, error: { code: 'INVALID_POLICY', message: 'A step references a policy that does not belong to your organisation.' } })
    }
    const flow = await prisma.onboardingFlow.create({
      data: {
        tenant_id:   tenantId,
        name,
        description: description ?? null,
        job_roles:   job_roles   ?? [],
        steps: steps?.length ? {
          create: (steps as any[]).map((s, i) => ({
            order:          i,
            title:          s.title,
            type:           s.type,
            policy_id:      s.policy_id ?? null,
            policy_section: s.policy_section ?? null,
            question:       s.question  ?? null,
            options:        Array.isArray(s.options) ? s.options.map((o: any) => String(o)) : [],
            correct_option: typeof s.correct_option === 'number' ? s.correct_option : null,
          })),
        } : undefined,
      },
      include: {
        steps:       { orderBy: { order: 'asc' } },
        enrollments: { select: { id: true, completed_at: true } },
      },
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
      const badPolicies = await invalidStepPolicyIds(steps, tenantId)
      if (badPolicies.length) {
        return res.status(400).json({ success: false, error: { code: 'INVALID_POLICY', message: 'A step references a policy that does not belong to your organisation.' } })
      }
    }

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
              order:          i,
              title:          s.title,
              type:           s.type,
              policy_id:      s.policy_id ?? null,
              policy_section: s.policy_section ?? null,
              question:       s.question  ?? null,
              options:        Array.isArray(s.options) ? s.options.map((o: any) => String(o)) : [],
              correct_option: typeof s.correct_option === 'number' ? s.correct_option : null,
            })),
          },
        }),
      },
      include: {
        steps:       { orderBy: { order: 'asc' } },
        enrollments: { select: { id: true, completed_at: true } },
      },
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
    const flow = await (prisma as any).onboardingFlow.findFirst({ where: { id, tenant_id: tenantId }, include: { steps: true } })
    if (!flow) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Flow not found' } })

    // A flow with 'read policy' steps that aren't mapped to a policy can't be sent to
    // staff — they'd have nothing to read. Block enrolment until it's ready.
    const unmapped = (flow.steps as any[]).filter(s => s.type === 'read_policy' && !s.policy_id).length
    if (unmapped > 0) {
      return res.status(400).json({ success: false, error: { code: 'FLOW_NOT_READY', message: `This flow isn't ready: ${unmapped} 'read policy' step${unmapped === 1 ? '' : 's'} ${unmapped === 1 ? "isn't" : "aren't"} linked to one of your policies. Open the flow and map ${unmapped === 1 ? 'it' : 'them'} to a policy first (or upload the policy), then enrol staff.` } })
    }

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

    const portalUrl = siteUrl()
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    notifyUsers(tenantId, 'onboarding_updates', user_ids as string[], (email, name) =>
      sendOnboardingUpdateEmail({
        to:       email,
        name,
        orgName:  tenant?.name ?? '',
        subject:  `You have been enrolled on an onboarding flow — ${tenant?.name ?? 'CareStreamAI'}`,
        bodyHtml: `
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
            You have been enrolled on the <strong>${flow.name}</strong> induction flow${due_date ? ` with a due date of <strong>${new Date(due_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' })}</strong>` : ''}.
          </p>
          <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">
            Log in to the portal to get started and complete your induction steps.
          </p>`,
        portalUrl,
      })
    ).catch(e => console.error('[onboarding/enroll] Notify error:', e))
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

// GET /onboarding/matrix — staff × onboarding-flow completion grid (compliance view).
onboardingRouter.get('/matrix', requireAdmin, async (_req, res) => {
  try {
    const tenantId = getTenantId()
    const flows = await prisma.onboardingFlow.findMany({
      where:   { tenant_id: tenantId },
      include: {
        steps:       { select: { id: true } },
        enrollments: { include: { user: { select: { id: true, name: true, job_role: true } }, progress: { select: { completed_at: true } } } },
      },
      orderBy: { name: 'asc' },
    }) as any[]

    const flowList = flows.map(f => ({ id: f.id, name: f.name, flow_kind: f.flow_kind }))
    const now = Date.now()
    const staffMap = new Map<string, any>()
    for (const f of flows) {
      const total = (f.steps ?? []).length
      for (const e of f.enrollments ?? []) {
        const u = e.user; if (!u) continue
        if (!staffMap.has(u.id)) staffMap.set(u.id, { user_id: u.id, name: u.name, job_role: u.job_role ?? null, cells: {} as Record<string, any> })
        const done = (e.progress ?? []).filter((p: any) => p.completed_at).length
        let status: string
        if (e.completed_at || (total > 0 && done >= total)) status = 'complete'
        else if (e.due_date && new Date(e.due_date).getTime() < now) status = 'overdue'
        else if (done > 0) status = 'in_progress'
        else status = 'not_started'
        staffMap.get(u.id).cells[f.id] = { status, steps_done: done, steps_total: total }
      }
    }
    const staff = [...staffMap.values()].sort((a, b) => a.name.localeCompare(b.name))
    res.json({ success: true, data: { flows: flowList, staff } })
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

    const [enrollments, user, tenant, coverModules] = await Promise.all([
      prisma.onboardingEnrollment.findMany({
        where:   { user_id: userId, tenant_id: tenantId },
        include: {
          flow:     { include: { steps: { orderBy: { order: 'asc' } } } },
          progress: true,
        },
        orderBy: { enrolled_at: 'asc' },
      }),
      (prisma as any).user.findUnique({ where: { id: userId }, select: { first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true, can_suggest_translations: true } }),
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true } }),
      // Training modules with a cover illustration (this tenant's + shared platform
      // ones) — candidates for auto-matching a thumbnail to each induction flow.
      (prisma as any).trainingModule.findMany({
        where:  { illustration_key: { not: null }, OR: [{ tenant_id: tenantId }, { tenant_id: null }] },
        select: { name: true, illustration_key: true },
      }).catch(() => [] as Array<{ name: string; illustration_key: string | null }>),
    ])

    // Deliver the induction in the staff member's first language when their
    // comms toggle is on (default). Step titles and MCQ questions/options are
    // translated; option order is preserved so answer indices stay valid.
    const { code: langCode, name: langName } = hubContentLang(user, req.query, tenant?.custom_languages)
    const translate = langCode !== 'eng'

    // English baseline — always returned, even if translation fails.
    const baseline = enrollments.map(e => {
      // Match a training cover image to the flow from its name, step titles and
      // policy sections; the hub shows it as the flow thumbnail (or a fallback tile).
      const flowText = [e.flow.name, ...e.flow.steps.map(s => `${s.title} ${(s as any).policy_section ?? ''}`)].join(' ')
      return {
      enrollment_id: e.id,
      flow_id:       e.flow_id,
      flow_name:     e.flow.name,
      illustration_url: illustrationUrl(pickIllustrationKey(flowText, coverModules)),
      enrolled_at:   e.enrolled_at,
      due_date:      e.due_date,
      completed_at:  e.completed_at,
      steps:         e.flow.steps.map(s => ({
        id:        s.id,
        order:     s.order,
        title:     s.title,
        type:      s.type,
        policy_id: s.policy_id,
        question:  s.question,
        options:   s.options,                // shown to staff for MCQ — correct_option is NOT exposed
        progress:  e.progress.find(p => p.step_id === s.id) ?? null,
      })),
      }
    })
    console.log(`[onboarding/my] user=${userId} lang=${langCode} translate=${translate} count=${baseline.length}`)

    let result = baseline
    if (translate) {
      // One text batch (flow names + every step title) and one question batch
      // (every MCQ step) across all enrollments, then redistribute — rather than a
      // per-step round-trip fan-out.
      const translateAll = (async () => {
        const texts: string[] = []
        const flowNameIdx = baseline.map(e => { texts.push(e.flow_name); return texts.length - 1 })
        const titleIdx = baseline.map(e => e.steps.map((s: any) => { texts.push(s.title); return texts.length - 1 }))
        const qFlat: Array<{ text: string; options: string[] }> = []
        const qIdx = baseline.map(e => e.steps.map((s: any) => {
          if (s.type === 'answer_question' && s.question) { qFlat.push({ text: s.question, options: Array.isArray(s.options) ? (s.options as string[]) : [] }); return qFlat.length - 1 }
          return -1
        }))
        const [tTexts, tQs] = await Promise.all([
          translateTextsBatch(texts, langCode, langName, tenant?.translation_glossary, tenantId),
          translateQuestionsBatch(qFlat, langCode, langName, tenant?.translation_glossary, tenantId),
        ])
        return baseline.map((e, ei) => ({
          ...e,
          flow_name: tTexts[flowNameIdx[ei]],
          steps: e.steps.map((s: any, si: number) => {
            const title = tTexts[titleIdx[ei][si]]
            const qi = qIdx[ei][si]
            if (qi >= 0) { const t = tQs[qi]; return { ...s, title, question: t.text, options: t.options as any, source_en: { question: s.question, options: Array.isArray(s.options) ? (s.options as string[]) : [] } } }
            return { ...s, title }
          }),
        }))
      })()
      result = await withTranslationBudget(translateAll, 18_000, baseline)
    }

    res.json({ success: true, data: { enrollments: result, lang_code: langCode, can_suggest: langCode !== 'eng' && !!(user as any)?.can_suggest_translations } })
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
    let mcqIncorrect = false

    if (step.type === 'answer_question' && answer_text != null) {
      const options = (step.options as string[]) ?? []
      if (options.length > 0 && step.correct_option != null) {
        // MCQ — answer_text is the selected option index (0-based); grade deterministically.
        const sel = parseInt(String(answer_text), 10)
        answer_correct = Number.isInteger(sel) && sel === step.correct_option
        mcqIncorrect   = answer_correct === false   // wrong MCQ → make them retry (don't complete)
      } else if (step.question) {
        // Free-text — AI verdict on whether the answer is broadly acceptable.
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
    }

    const completedAt = mcqIncorrect ? null : new Date()
    const progress = await prisma.onboardingProgress.upsert({
      where:  { enrollment_id_step_id: { enrollment_id: req.params.enrollmentId, step_id: req.params.stepId } },
      update: { completed_at: completedAt, answer_text: answer_text ?? null, answer_correct },
      create: {
        enrollment_id:  req.params.enrollmentId,
        step_id:        req.params.stepId,
        completed_at:   completedAt,
        answer_text:    answer_text ?? null,
        answer_correct,
      },
    })

    // A wrong induction answer creates a follow-up — nudge them to the hub (debounced).
    if (answer_correct === false) notifyFollowUp(tenantId, userId).catch(() => {})

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

// ─── Phase 2: Platform template adoption ──────────────────────────────────────

// GET /onboarding/templates — active platform templates available to adopt
// (excludes ones this tenant has already adopted).
onboardingRouter.get('/templates', requireAdmin, async (_req, res) => {
  try {
    const tenantId = getTenantId()
    // Only show templates for this home's care setting (or templates tagged for all).
    const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } })
    const setting = facilityTypeToSetting(tenant?.facility_type)
    const [templates, mine] = await Promise.all([
      (prisma as any).onboardingFlow.findMany({
        where:   { tenant_id: null, is_active: true, OR: [{ care_setting: setting }, { care_setting: null }] },
        include: { steps: { orderBy: { order: 'asc' } } },
        orderBy: [{ flow_kind: 'asc' }, { name: 'asc' }],
      }),
      (prisma as any).onboardingFlow.findMany({
        where:  { tenant_id: tenantId, NOT: { source_flow_id: null } },
        select: { source_flow_id: true },
      }),
    ])
    const adopted = new Set((mine as any[]).map(f => f.source_flow_id))
    const available = (templates as any[]).map(t => ({
      id: t.id, name: t.name, description: t.description, flow_kind: t.flow_kind,
      job_roles: t.job_roles, step_count: t.steps.length,
      read_count: t.steps.filter((s: any) => s.type === 'read_policy').length,
      question_count: t.steps.filter((s: any) => s.type === 'answer_question').length,
      already_adopted: adopted.has(t.id),
    }))
    res.json({ success: true, data: { templates: available } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// AI-match each template step to the tenant's best-fitting policy (Haiku, cheap).
// Returns a map of step index -> policy_id (or null). Falls back to deterministic
// section matching if the AI call fails.
async function matchStepsToPolicies(
  steps: Array<{ policy_section: string | null; title: string; question: string | null }>,
  policies: Array<{ id: string; name: string; section: string | null }>,
): Promise<(string | null)[]> {
  // Deterministic section match as the baseline / fallback.
  const bySection = new Map<string, string[]>()
  for (const p of policies) {
    const key = (p.section ?? '').toLowerCase()
    if (!key) continue
    if (!bySection.has(key)) bySection.set(key, [])
    bySection.get(key)!.push(p.id)
  }
  const deterministic = steps.map(s => {
    const cands = bySection.get((s.policy_section ?? '').toLowerCase()) ?? []
    return cands.length === 1 ? cands[0] : null
  })

  if (policies.length === 0) return steps.map(() => null)

  try {
    const system = `You map care-home onboarding steps to the home's existing policies. Output ONLY JSON.`
    const user = [
      `STEPS (each needs the single best-matching policy):`,
      ...steps.map((s, i) => `${i}. [${s.policy_section ?? 'any'}] ${s.title}${s.question ? ` — ${s.question}` : ''}`),
      ``,
      `POLICIES available at this home:`,
      ...policies.map(p => `${p.id} | ${p.section ?? '—'} | ${p.name}`),
      ``,
      `For each step index, choose the id of the single best-matching policy, or null if none is a reasonable fit.`,
      `Output JSON: {"map":[{"i":<step index>,"policy_id":"<id or null>"}]}`,
    ].join('\n')
    const raw = await callClaude(system, user, { model: 'claude-haiku-4-5-20251001', maxTokens: 1500, temperature: 0 })
    const noFence = raw.replace(/```(?:json)?/gi, '').trim()
    const parsed = JSON.parse(noFence.slice(noFence.indexOf('{'), noFence.lastIndexOf('}') + 1))
    const valid = new Set(policies.map(p => p.id))
    const result = steps.map((_, i) => deterministic[i])
    for (const m of (parsed?.map ?? [])) {
      if (typeof m?.i === 'number' && m.i >= 0 && m.i < result.length) {
        result[m.i] = (typeof m.policy_id === 'string' && valid.has(m.policy_id)) ? m.policy_id : result[m.i]
      }
    }
    return result
  } catch {
    return deterministic
  }
}

// Tailor each MCQ question to the wording of the tenant's matched policy (Haiku,
// one call). Returns step-index -> tailored {question, options, correct_option}.
// Anything that can't be tailored keeps the original template question.
async function tailorQuestionsToPolicies(
  tenantId: string,
  steps: Array<{ type: string; question: string | null; options: string[] | null; correct_option: number | null }>,
  mapped: (string | null)[],
): Promise<Map<number, { question: string; options: string[]; correct_option: number }>> {
  const result = new Map<number, { question: string; options: string[]; correct_option: number }>()
  const targets = steps
    .map((s, i) => ({ s, i, pid: mapped[i] }))
    .filter(t => t.s.type === 'answer_question' && t.pid && Array.isArray(t.s.options) && (t.s.options as string[]).length === 4)
  if (targets.length === 0) return result

  const pids = [...new Set(targets.map(t => t.pid as string))]
  const excerpts = new Map<string, string>()
  await Promise.all(pids.map(async pid => {
    const txt = await downloadExtractedText(tenantId, pid).catch(() => '')
    if (txt && txt.trim()) excerpts.set(pid, txt.slice(0, 1500))
  }))
  const usable = targets.filter(t => excerpts.has(t.pid as string))
  if (usable.length === 0) return result

  try {
    const system = `You adapt onboarding quiz questions to a specific care home's own policy wording. Output ONLY JSON.`
    const user = [
      `Rewrite each multiple-choice question so it reflects the home's actual policy extract, keeping a single best answer and EXACTLY 4 options. Keep the meaning and difficulty similar.`,
      ...usable.map(t => `\n--- item ${t.i} ---\nPolicy extract: ${excerpts.get(t.pid as string)}\nCurrent question: ${t.s.question}\nCurrent options: ${JSON.stringify(t.s.options)}`),
      ``,
      `Output JSON: {"items":[{"i":<index>,"question":"...","options":["","","",""],"correct_option":<0-3>}]}`,
    ].join('\n')
    const raw = await callClaude(system, user, { model: 'claude-haiku-4-5-20251001', maxTokens: 3000, temperature: 0.3 })
    const noFence = raw.replace(/```(?:json)?/gi, '').trim()
    const parsed = JSON.parse(noFence.slice(noFence.indexOf('{'), noFence.lastIndexOf('}') + 1))
    for (const it of (parsed?.items ?? [])) {
      if (typeof it?.i === 'number' && it.question && Array.isArray(it.options) && it.options.length === 4 &&
          typeof it.correct_option === 'number' && it.correct_option >= 0 && it.correct_option <= 3) {
        result.set(it.i, { question: String(it.question), options: it.options.map((o: any) => String(o)), correct_option: it.correct_option })
      }
    }
  } catch { /* keep originals */ }
  return result
}

// POST /onboarding/templates/:id/adopt — clone a platform template into an
// editable tenant copy, mapping each step to the tenant's own policies.
onboardingRouter.post('/templates/:id/adopt', requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId()
    const id = String(req.params.id)
    const template = await (prisma as any).onboardingFlow.findFirst({
      where:   { id, tenant_id: null },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    if (!template) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Template not found' } })

    const policies = await (prisma as any).policy.findMany({
      where:  { tenant_id: tenantId, status: 'active' },
      select: { id: true, name: true, section: true },
    })
    const mapped = await matchStepsToPolicies(
      (template.steps as any[]).map(s => ({ policy_section: s.policy_section, title: s.title, question: s.question })),
      policies as any[],
    )
    // Tailor MCQs to the matched policies' wording (best-effort; falls back to template question).
    const tailored = await tailorQuestionsToPolicies(
      tenantId,
      (template.steps as any[]).map(s => ({ type: s.type, question: s.question, options: s.options, correct_option: s.correct_option })),
      mapped,
    )

    const flow = await (prisma as any).onboardingFlow.create({
      data: {
        tenant_id:      tenantId,
        name:           template.name,
        description:    template.description,
        job_roles:      template.job_roles,
        flow_kind:      template.flow_kind,
        care_setting:   template.care_setting,
        source_flow_id: template.id,
        is_active:      true,
        steps: {
          create: (template.steps as any[]).map((s, i) => {
            const t = tailored.get(i)
            return {
              order:          s.order,
              title:          t ? t.question.slice(0, 200) : s.title,
              type:           s.type,
              policy_id:      mapped[i] ?? null,
              policy_section: s.policy_section,
              question:       t ? t.question : s.question,
              options:        t ? t.options : (s.options ?? []),
              correct_option: t ? t.correct_option : s.correct_option,
            }
          }),
        },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })

    const unmapped = (flow.steps as any[]).filter(s => s.type === 'read_policy' && !s.policy_id).length
    res.json({ success: true, data: { flow, unmapped } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// GET /onboarding/generic-policies — policies flagged 'generic onboarding', offered
// on the Onboarding page as allocatable one-step read-policy flows.
onboardingRouter.get('/generic-policies', requireAdmin, async (_req, res) => {
  try {
    const tenantId = getTenantId()
    const [policies, mine] = await Promise.all([
      (prisma as any).policy.findMany({
        where:   { tenant_id: tenantId, status: 'active', generic_onboarding: true },
        select:  { id: true, name: true, document_category: true },
        orderBy: { name: 'asc' },
      }),
      (prisma as any).onboardingFlow.findMany({
        where:  { tenant_id: tenantId, NOT: { source_policy_id: null } },
        select: { source_policy_id: true },
      }),
    ])
    const adopted = new Set((mine as any[]).map(f => f.source_policy_id))
    const available = (policies as any[]).map(p => ({
      id: p.id, name: p.name, document_category: p.document_category,
      already_adopted: adopted.has(p.id),
    }))
    res.json({ success: true, data: { policies: available } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})

// POST /onboarding/generic-policies/:policyId/adopt — create a one-step read-policy
// onboarding flow from a generic onboarding policy, so it can be enrolled to staff
// exactly like any other flow. Idempotent: returns the existing flow if already made.
onboardingRouter.post('/generic-policies/:policyId/adopt', requireAdmin, async (req, res) => {
  try {
    const tenantId = getTenantId()
    const policyId = String(req.params.policyId)
    const policy = await (prisma as any).policy.findFirst({
      where:  { id: policyId, tenant_id: tenantId, status: 'active', generic_onboarding: true },
      select: { id: true, name: true },
    })
    if (!policy) return res.status(404).json({ success: false, error: { code: 'NOT_FOUND', message: 'Policy not found or not flagged for onboarding' } })

    const existing = await (prisma as any).onboardingFlow.findFirst({
      where:   { tenant_id: tenantId, source_policy_id: policyId },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    if (existing) return res.json({ success: true, data: { flow: existing, already: true } })

    const flow = await (prisma as any).onboardingFlow.create({
      data: {
        tenant_id:        tenantId,
        name:             policy.name,
        description:      'Read and confirm this policy as part of onboarding.',
        job_roles:        [],
        flow_kind:        'primary',
        source_policy_id: policyId,
        is_active:        true,
        steps: { create: [{ order: 0, title: `Read the ${policy.name} policy`, type: 'read_policy', policy_id: policyId }] },
      },
      include: { steps: { orderBy: { order: 'asc' } } },
    })
    res.json({ success: true, data: { flow, already: false } })
  } catch (e: any) {
    res.status(500).json({ success: false, error: { code: 'SERVER_ERROR', message: e.message } })
  }
})
