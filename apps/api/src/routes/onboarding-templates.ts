import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { callClaude } from '../services/ai/claude'
import { DEFAULT_POLICY_SECTIONS } from '../lib/policy-sections'
import { PRIMARY_ROLES, SECONDARY_ROLES } from '../data/onboarding-roles'
import { isCareSetting, settingFallbackOrder, settingLabelForPrompt } from '../lib/care-setting'

// Platform-owner management of shared onboarding flow TEMPLATES (tenant_id = NULL).
// Tenants adopt these (cloned into editable copies) on the tenant side.
export const onboardingTemplatesRouter = Router()
onboardingTemplatesRouter.use(requirePlatformAdmin)

const flowInclude = { steps: { orderBy: { order: 'asc' as const } } }

// Difficulty levels (per flow) — descriptions fed into the AI prompt so questions
// are pitched right: a kitchen porter gets very-easy awareness, a nurse gets hard.
export const DIFFICULTY_LEVELS = ['very_easy', 'easy', 'medium', 'hard'] as const
const DIFFICULTY_GUIDE: Record<string, string> = {
  very_easy: 'very easy — basic awareness and simple everyday recognition only (suitable for non-care roles like kitchen porter, laundry, cleaning)',
  easy:      'easy — straightforward day-to-day knowledge a new starter should know',
  medium:    'medium — applied understanding of the home\'s procedures',
  hard:      'hard — in-depth or specialist knowledge (for clinical/specialist roles such as nurses)',
}

// ─── GET / — list all platform templates ──────────────────────────────────────
onboardingTemplatesRouter.get('/', async (_req: Request, res: Response) => {
  const flows = await (prisma as any).onboardingFlow.findMany({
    where:   { tenant_id: null },
    include: flowInclude,
    orderBy: [{ flow_kind: 'asc' }, { name: 'asc' }],
  })
  ok(res, { flows })
})

// ─── POST / — create a template ───────────────────────────────────────────────
onboardingTemplatesRouter.post('/', async (req: Request, res: Response) => {
  const { name, description, job_roles, flow_kind, care_setting, difficulties, steps } = req.body ?? {}
  if (!name || typeof name !== 'string') return err(res, 'MISSING_FIELD', 'name is required', 400)

  const flow = await (prisma as any).onboardingFlow.create({
    data: {
      tenant_id:    null,
      name:         name.trim(),
      description:  description ?? null,
      job_roles:    Array.isArray(job_roles) ? job_roles : [],
      flow_kind:    flow_kind === 'secondary' ? 'secondary' : 'primary',
      care_setting: isCareSetting(care_setting) ? care_setting : null,
      difficulties: cleanDifficulties(difficulties),
      steps:        buildStepCreate(steps),
    },
    include: flowInclude,
  })
  ok(res, { flow })
})

// ─── PATCH /:id — update flow fields and/or replace steps ──────────────────────
onboardingTemplatesRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).onboardingFlow.findFirst({ where: { id, tenant_id: null } })
  if (!existing) return err(res, 'NOT_FOUND', 'Template not found', 404)

  const { name, description, job_roles, flow_kind, care_setting, difficulties, is_active, steps } = req.body ?? {}
  const data: Record<string, any> = {}
  if (name !== undefined)         data.name = String(name).trim()
  if (description !== undefined)  data.description = description
  if (job_roles !== undefined)    data.job_roles = Array.isArray(job_roles) ? job_roles : []
  if (flow_kind !== undefined)    data.flow_kind = flow_kind === 'secondary' ? 'secondary' : 'primary'
  if (care_setting !== undefined) data.care_setting = isCareSetting(care_setting) ? care_setting : null
  if (difficulties !== undefined) data.difficulties = cleanDifficulties(difficulties)
  if (is_active !== undefined)    data.is_active = !!is_active

  if (Array.isArray(steps)) {
    await (prisma as any).onboardingStep.deleteMany({ where: { flow_id: id } })
    data.steps = buildStepCreate(steps)
  }

  const flow = await (prisma as any).onboardingFlow.update({ where: { id }, data, include: flowInclude })
  ok(res, { flow })
})

// ─── DELETE /:id ───────────────────────────────────────────────────────────────
onboardingTemplatesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).onboardingFlow.findFirst({ where: { id, tenant_id: null } })
  if (!existing) return err(res, 'NOT_FOUND', 'Template not found', 404)
  await (prisma as any).onboardingFlow.delete({ where: { id } })
  ok(res, { deleted: true })
})

// ─── POST /:id/ai-draft — AI-generate steps for this template's role ───────────
// Drafts the policy areas to read + an MCQ for each, then saves them onto the flow
// (replacing existing steps) for the platform admin to review and edit.
onboardingTemplatesRouter.post('/:id/ai-draft', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const flow = await (prisma as any).onboardingFlow.findFirst({ where: { id, tenant_id: null } })
  if (!flow) return err(res, 'NOT_FOUND', 'Template not found', 404)

  const role     = (flow.job_roles?.[0] as string) || (flow.name as string)
  const isSecond = flow.flow_kind === 'secondary'
  const sections = DEFAULT_POLICY_SECTIONS.join(', ')

  // "Keep"d steps the caller wants preserved through a re-generate. We keep these
  // verbatim (locked), tell the AI not to repeat them, and only regenerate the rest.
  const keptSteps: any[] = (Array.isArray(req.body?.keep) ? req.body.keep : [])
    .filter((s: any) => s && (s.type === 'read_policy' || s.type === 'answer_question'))
  const keptSections  = new Set(keptSteps.map((s: any) => String(s.policy_section ?? '').toLowerCase()).filter(Boolean))
  const keptQuestions = keptSteps.filter((s: any) => s.type === 'answer_question' && s.question).map((s: any) => String(s.question))

  // System prompt is editable in the platform /prompts page (usage: onboarding_flow_generation).
  const system = await getOnboardingPrompt()

  // Ground the questions in real (anonymised) policy text when reviewed seeds exist —
  // one excerpt per section, from THIS template's care setting (falling back to the
  // nearest setting that has seeds). Templates with no setting use any reviewed seed.
  let seeds: any[] = []
  if (flow.care_setting) {
    for (const s of settingFallbackOrder(flow.care_setting)) {
      seeds = await (prisma as any).policySeed.findMany({
        where:   { reviewed: true, care_setting: s, NOT: { section: null } },
        select:  { section: true, content: true },
        orderBy: { updated_at: 'desc' },
      }).catch(() => [] as any[])
      if (seeds.length > 0) break
    }
  } else {
    seeds = await (prisma as any).policySeed.findMany({
      where:   { reviewed: true, NOT: { section: null } },
      select:  { section: true, content: true },
      orderBy: { updated_at: 'desc' },
    }).catch(() => [] as any[])
  }
  const bySection = new Map<string, string>()
  for (const s of seeds as any[]) if (s.section && !bySection.has(s.section)) bySection.set(s.section, s.content)
  const refBlock = [...bySection.entries()].map(([sec, content]) => `## ${sec}\n${String(content).slice(0, 1000)}`).join('\n\n')

  // Variables available to the editable prompt as {{PLACEHOLDERS}}. Any not present
  // in the prompt are appended to the user message instead, so generation always
  // gets the data whether or not the prompt uses the placeholder.
  const diffs: string[] = Array.isArray(flow.difficulties) ? flow.difficulties : []
  const vars: Record<string, string> = {
    JOB_ROLE:           role,
    CARE_SETTING:       settingLabelForPrompt(flow.care_setting),
    POLICY_AREAS:       sections,
    REFERENCE_POLICIES: refBlock || 'None provided — use general UK adult social care best practice.',
    DIFFICULTY:         diffs.length ? diffs.map(d => DIFFICULTY_GUIDE[d] ?? d).join('; ') : 'a balanced mix, from easy to medium',
    AVOID_QUESTIONS:    keptQuestions.length ? keptQuestions.map((q: string) => `- ${q}`).join('\n') : 'None.',
  }
  const filled = fillPrompt(system, vars)
  const user = (filled.context.length ? `${filled.context.join('\n\n')}\n\n` : '') +
    'Generate the questions now, in the required JSON format and nothing else.'

  let parsed: any
  try {
    const raw = await callClaude(filled.system, user, { maxTokens: 3500, temperature: 0.4 })
    parsed = extractJson(raw)
  } catch (e: any) {
    return err(res, 'AI_FAILED', `Could not generate a draft: ${e.message}`, 502)
  }

  const areas: any[] = Array.isArray(parsed?.areas) ? parsed.areas : []
  if (areas.length === 0 && keptSteps.length === 0) return err(res, 'AI_EMPTY', 'The AI returned no usable steps — try again.', 502)

  // Start with the kept (locked) steps, then generated steps for the rest.
  const steps: any[] = []
  let order = 0
  const seenQuestions = new Set<string>(keptQuestions.map((q: string) => q.trim().toLowerCase()))
  for (const k of keptSteps) {
    steps.push({
      order:          order++,
      title:          String(k.title ?? ''),
      type:           k.type === 'answer_question' ? 'answer_question' : 'read_policy',
      policy_section: k.policy_section ?? null,
      question:       k.question ?? null,
      options:        Array.isArray(k.options) ? k.options.map((o: any) => String(o)) : [],
      correct_option: typeof k.correct_option === 'number' ? k.correct_option : null,
      locked:         true,
    })
  }

  // Each area → a read_policy step then an answer_question MCQ step.
  for (const a of areas) {
    const section = typeof a.policy_section === 'string' ? a.policy_section : null
    if (!section) continue
    if (keptSections.has(section.toLowerCase())) continue   // already covered by a kept step
    const qkey = typeof a.question === 'string' ? a.question.trim().toLowerCase() : ''
    if (qkey && seenQuestions.has(qkey)) continue           // drop duplicate questions
    if (qkey) seenQuestions.add(qkey)
    steps.push({ order: order++, title: `Read the ${section} policy`, type: 'read_policy', policy_section: section, locked: false })
    if (a.question && Array.isArray(a.options) && a.options.length === 4) {
      steps.push({
        order:          order++,
        title:          String(a.question).slice(0, 200),
        type:           'answer_question',
        policy_section: section,
        question:       String(a.question),
        options:        (a.options as any[]).map(o => String(o)),
        correct_option: typeof a.correct_option === 'number' ? a.correct_option : 0,
        locked:         false,
      })
    }
  }

  await (prisma as any).onboardingStep.deleteMany({ where: { flow_id: id } })
  const updated = await (prisma as any).onboardingFlow.update({
    where:   { id },
    data:    { steps: { create: steps } },
    include: flowInclude,
  })
  ok(res, { flow: updated })
})

// ─── POST /:id/clone  body { setting } ────────────────────────────────────────
// Clone a template into another care setting, copying its read-policy steps verbatim
// (they're setting-agnostic) and RE-WORDING its questions for the target setting via
// AI. Created inactive for review. Idempotent (skips if the name already exists there).
onboardingTemplatesRouter.post('/:id/clone', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const setting = String(req.body?.setting ?? '')
  if (!isCareSetting(setting)) return err(res, 'VALIDATION_ERROR', 'A valid care setting is required', 400)

  const source = await (prisma as any).onboardingFlow.findFirst({ where: { id, tenant_id: null }, include: flowInclude })
  if (!source) return err(res, 'NOT_FOUND', 'Source template not found', 404)
  if (source.care_setting === setting) return err(res, 'SAME_SETTING', 'Source and target settings are the same', 400)

  const dup = await (prisma as any).onboardingFlow.findFirst({ where: { tenant_id: null, care_setting: setting, name: source.name }, select: { id: true } })
  if (dup) { ok(res, { skipped: true, flow: dup }); return }

  const steps = (source.steps as any[])
  const questionSteps = steps.filter(s => s.type === 'answer_question' && s.question)

  // One AI call per flow: reword all its questions for the target setting.
  const reworded = new Map<number, { question: string; options: string[]; correct_option: number }>()
  if (questionSteps.length > 0) {
    const label = settingLabelForPrompt(setting)
    const system = `You adapt UK adult social care staff-induction multiple-choice questions from one care setting to another. Keep each question's learning point and the MEANING of the correct answer; only change the wording/scenario so it fits the target setting. Use UK English. Never add company or personal names. Return ONLY JSON.`
    const list = questionSteps.map((s, i) => ({ i, question: s.question, options: s.options, correct_option: typeof s.correct_option === 'number' ? s.correct_option : 0 }))
    const user = `Target care setting: ${label}. Rewrite each of these induction questions so they read correctly for staff working in a ${label} setting — adapt the scenario/context, keep exactly 4 options, keep the same correct_option index, and keep the same underlying topic. Input:\n${JSON.stringify(list)}\n\nOutput JSON only: {"questions":[{"i":<index>,"question":"...","options":["","","",""],"correct_option":<0-3>}]}`
    try {
      const parsed = extractJson(await callClaude(system, user, { maxTokens: 8000, temperature: 0.4 }))
      for (const q of (Array.isArray(parsed?.questions) ? parsed.questions : [])) {
        if (typeof q?.i === 'number' && typeof q.question === 'string' && Array.isArray(q.options) && q.options.length === 4) {
          reworded.set(q.i, { question: String(q.question), options: q.options.map((o: any) => String(o)), correct_option: typeof q.correct_option === 'number' ? q.correct_option : 0 })
        }
      }
    } catch { /* fall back to the original wording */ }
  }

  const newSteps = steps.map((s: any) => {
    if (s.type === 'answer_question') {
      const rw = reworded.get(questionSteps.indexOf(s))
      return { order: s.order, title: (rw ? rw.question : s.title).slice(0, 200), type: 'answer_question', policy_section: s.policy_section ?? null, question: rw ? rw.question : s.question, options: rw ? rw.options : (s.options ?? []), correct_option: rw ? rw.correct_option : s.correct_option, locked: false }
    }
    return { order: s.order, title: s.title, type: 'read_policy', policy_section: s.policy_section ?? null, question: null, options: [], correct_option: null, locked: false }
  })

  const flow = await (prisma as any).onboardingFlow.create({
    data: {
      tenant_id:    null,
      name:         source.name,
      description:  source.description,
      job_roles:    source.job_roles,
      flow_kind:    source.flow_kind,
      care_setting: setting,
      difficulties: source.difficulties,
      is_active:    false,
      steps:        { create: newSteps },
    },
    include: flowInclude,
  })
  ok(res, { skipped: false, flow })
})

// ─── POST /seed-roles?setting= — create the canonical role/specialism templates ─
// for a given care setting (empty shells). De-dupes within that setting, so each
// setting can have its own Care Assistant etc.
onboardingTemplatesRouter.post('/seed-roles', async (req: Request, res: Response) => {
  const setting = isCareSetting(req.query.setting) ? req.query.setting : null
  const existing = await (prisma as any).onboardingFlow.findMany({
    where: { tenant_id: null, care_setting: setting }, select: { name: true },
  })
  const have = new Set((existing as any[]).map(f => (f.name as string).toLowerCase()))

  const toCreate: any[] = []
  for (const role of PRIMARY_ROLES) {
    if (!have.has(role.toLowerCase())) {
      toCreate.push({ tenant_id: null, name: role, flow_kind: 'primary', job_roles: [role], care_setting: setting, is_active: false })
    }
  }
  for (const spec of SECONDARY_ROLES) {
    if (!have.has(spec.toLowerCase())) {
      toCreate.push({ tenant_id: null, name: spec, flow_kind: 'secondary', job_roles: [spec], care_setting: setting, is_active: false })
    }
  }
  if (toCreate.length > 0) {
    await (prisma as any).onboardingFlow.createMany({ data: toCreate })
  }
  ok(res, { created: toCreate.length })
})

// ─── AI prompt (editable in platform /prompts) ────────────────────────────────
export const DEFAULT_ONBOARDING_FLOW_PROMPT = `You are an expert UK health and social care onboarding content creator.

Your task is to generate multiple-choice induction questions for a specific staff role, tailored to their care setting and based on the home's own policies provided below.

INPUT VARIABLES:

ROLE:
{{JOB_ROLE}}

CARE_SETTING:
{{CARE_SETTING}}

QUESTION_DIFFICULTY:
{{DIFFICULTY}}

POLICY_AREAS (choose only from these exact names):
{{POLICY_AREAS}}

REFERENCE_POLICIES (the home's own, anonymised — base questions on this wording where relevant):
{{REFERENCE_POLICIES}}

ALREADY_KEPT_QUESTIONS (do NOT repeat or rephrase any of these):
{{AVOID_QUESTIONS}}

YOUR TASK:

Choose the policy areas most relevant to a {{JOB_ROLE}} working in a {{CARE_SETTING}} — for a job role choose 4 to 7 areas, for a specialist role choose 2 to 4. For each chosen area write ONE multiple-choice question.

CARE_SETTING will be one of: Care Home, Nursing Home, Home Care Agency. Tailor every question to it:
- Care Home: residential care staff supporting residents — residents' rooms, communal areas, dining, activities, visitors, handovers, care plans, personal care, safeguarding, infection control, falls, fire safety, record keeping and person-centred support.
- Nursing Home: staff supporting residents with higher clinical needs — registered nurses, care assistants, senior carers, medication support, pressure area and wound care, clinical observations, infection control, nutrition and hydration, end of life care, deteriorating residents, escalation, documentation and working within competence.
- Home Care Agency: domiciliary staff in people's own homes — lone working, travel between visits, medication prompts, missed/late calls, access to homes, family members, home hazards, confidentiality, safeguarding, infection control, moving and handling in domestic settings, care plans, reporting concerns and professional boundaries.

ROLE AND DIFFICULTY:
- Every question must be specific to what a {{JOB_ROLE}} actually does day to day. Never ask a role a question that belongs to a different role (e.g. do not ask a kitchen porter a clinical nursing question).
- Pitch the questions at this difficulty: {{DIFFICULTY}}. "Very easy" means basic awareness only — non-care roles (kitchen porter, laundry, cleaning) get simple, practical questions and never specialist clinical content.

EACH QUESTION MUST:
- Reflect UK adult social care standards, CQC expectations, legislation and best practice
- Use UK English spelling and terminology
- Be clear, practical and easy for care staff to understand; test understanding, not trick the learner
- Include exactly 4 answer options with only ONE correct answer and plausible but clearly incorrect distractors
- Randomise the position of the correct answer
- Avoid "all of the above" / "none of the above" and duplicate or repetitive wording
- Be scenario-based where appropriate

AVOID: overly academic language, ambiguous answers, trick questions, unsafe advice, US terminology, any company names, any real personal names (state clearly if a character is fictional), references to AI or internal systems, and anything outside the JSON format below.

Output ONLY valid JSON in exactly this shape — no markdown, no commentary:
{"areas":[{"policy_section":"<exact area name from POLICY_AREAS>","question":"<question text>","options":["option 1","option 2","option 3","option 4"],"correct_option":<0-based index of the correct option>}]}`

// Editable in platform /prompts. Generates onboarding knowledge-check questions
// from a single uploaded policy the tenant has linked to a "read policy" step.
// Placeholders: {{policy_name}}, {{count}}, {{policy_text}}.
export const DEFAULT_ONBOARDING_QUESTIONS_PROMPT = `You create onboarding knowledge-check questions for care home staff, based strictly on the home's own policy document.

Policy name:
{{policy_name}}

Policy content:
"""
{{policy_text}}
"""

Write {{count}} multiple-choice question(s) that check whether a staff member has actually read and understood this specific policy.

RULES:
- Base every question and every answer only on the policy content above. Do not invent facts, figures or procedures that are not in the policy.
- Each question must have EXACTLY 4 options with ONE clearly correct answer grounded in the policy. The other 3 must be plausible but wrong.
- Randomise the position of the correct answer across the questions.
- Where there is more than one question, cover different parts of the policy so they do not overlap.
- Reflect UK adult social care standards and CQC expectations. Use UK English spelling and plain, practical language for frontline care staff. Test understanding, not trick the learner.
- Avoid "all of the above" / "none of the above". Do not use dashes in the text; use commas or full stops.

Output ONLY a JSON array, no markdown and no commentary, in exactly this shape:
[{"question":"...","options":["option 1","option 2","option 3","option 4"],"correct_option":0}]
correct_option is the 0-based index of the correct option.`

const PROMPT_VAR_LABELS: Record<string, string> = {
  JOB_ROLE:           'Role or specialism',
  CARE_SETTING:       'Care setting',
  POLICY_AREAS:       'Available policy areas',
  REFERENCE_POLICIES: 'Reference policy extracts',
  DIFFICULTY:         'Question difficulty',
  AVOID_QUESTIONS:    'Do NOT repeat these questions',
}

// Substitute {{VAR}} placeholders in the prompt; any variable the prompt doesn't
// reference is returned as a context line to append to the user message instead.
function fillPrompt(template: string, vars: Record<string, string>): { system: string; context: string[] } {
  let system = template
  const context: string[] = []
  for (const [k, v] of Object.entries(vars)) {
    const ph = `{{${k}}}`
    if (system.includes(ph)) system = system.split(ph).join(v)
    else context.push(`${PROMPT_VAR_LABELS[k] ?? k}: ${v}`)
  }
  return { system, context }
}

async function getOnboardingPrompt(): Promise<string> {
  try {
    const p = await (prisma as any).aiPrompt.findUnique({ where: { usage: 'onboarding_flow_generation' } })
    if (p?.content) return p.content
  } catch { /* fall through to default */ }
  return DEFAULT_ONBOARDING_FLOW_PROMPT
}

// ─── helpers ──────────────────────────────────────────────────────────────────

// Robustly pull a JSON object out of an LLM response — tolerates code fences and
// any prose the model adds before/after the JSON.
function extractJson(raw: string): any {
  const noFence = raw.replace(/```(?:json)?/gi, '').trim()
  const start = noFence.indexOf('{')
  const end   = noFence.lastIndexOf('}')
  if (start === -1 || end === -1 || end <= start) throw new Error('No JSON object found in response')
  return JSON.parse(noFence.slice(start, end + 1))
}

function cleanDifficulties(v: any): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.filter((d: any) => (DIFFICULTY_LEVELS as readonly string[]).includes(d)))]
}

function buildStepCreate(steps: any): any {
  if (!Array.isArray(steps) || steps.length === 0) return undefined
  return {
    create: (steps as any[]).map((s, i) => ({
      order:          typeof s.order === 'number' ? s.order : i,
      title:          String(s.title ?? ''),
      type:           s.type === 'answer_question' ? 'answer_question' : 'read_policy',
      policy_section: s.policy_section ?? null,
      question:       s.question ?? null,
      options:        Array.isArray(s.options) ? s.options.map((o: any) => String(o)) : [],
      correct_option: typeof s.correct_option === 'number' ? s.correct_option : null,
      locked:         !!s.locked,
    })),
  }
}
