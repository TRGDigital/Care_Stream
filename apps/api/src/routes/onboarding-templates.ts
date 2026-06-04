import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { callClaude } from '../services/ai/claude'
import { DEFAULT_POLICY_SECTIONS } from '../lib/policy-sections'
import { PRIMARY_ROLES, SECONDARY_ROLES } from '../data/onboarding-roles'

// Platform-owner management of shared onboarding flow TEMPLATES (tenant_id = NULL).
// Tenants adopt these (cloned into editable copies) on the tenant side.
export const onboardingTemplatesRouter = Router()
onboardingTemplatesRouter.use(requirePlatformAdmin)

const flowInclude = { steps: { orderBy: { order: 'asc' as const } } }

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
  const { name, description, job_roles, flow_kind, steps } = req.body ?? {}
  if (!name || typeof name !== 'string') return err(res, 'MISSING_FIELD', 'name is required', 400)

  const flow = await (prisma as any).onboardingFlow.create({
    data: {
      tenant_id:   null,
      name:        name.trim(),
      description: description ?? null,
      job_roles:   Array.isArray(job_roles) ? job_roles : [],
      flow_kind:   flow_kind === 'secondary' ? 'secondary' : 'primary',
      steps:       buildStepCreate(steps),
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

  const { name, description, job_roles, flow_kind, is_active, steps } = req.body ?? {}
  const data: Record<string, any> = {}
  if (name !== undefined)        data.name = String(name).trim()
  if (description !== undefined) data.description = description
  if (job_roles !== undefined)   data.job_roles = Array.isArray(job_roles) ? job_roles : []
  if (flow_kind !== undefined)   data.flow_kind = flow_kind === 'secondary' ? 'secondary' : 'primary'
  if (is_active !== undefined)   data.is_active = !!is_active

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

  // System prompt is editable in the platform /prompts page (usage: onboarding_flow_generation).
  const system = await getOnboardingPrompt()

  // Ground the questions in real (anonymised) policy text when reviewed seeds exist —
  // one excerpt per section, truncated to keep the prompt bounded.
  const seeds = await (prisma as any).policySeed.findMany({
    where:   { reviewed: true, NOT: { section: null } },
    select:  { section: true, content: true },
    orderBy: { updated_at: 'desc' },
  }).catch(() => [] as any[])
  const bySection = new Map<string, string>()
  for (const s of seeds as any[]) if (s.section && !bySection.has(s.section)) bySection.set(s.section, s.content)
  const refBlock = [...bySection.entries()].map(([sec, content]) => `## ${sec}\n${String(content).slice(0, 1000)}`).join('\n\n')

  const user = [
    `Role or specialism: "${role}" (${isSecond ? 'specialism' : 'job role'}).`,
    `Available policy areas: ${sections}.`,
    refBlock ? `\nReference policy extracts — base your questions on the wording and procedures in these where relevant:\n${refBlock}` : '',
  ].filter(Boolean).join('\n')

  let parsed: any
  try {
    const raw = await callClaude(system, user, { maxTokens: 3500, temperature: 0.4 })
    parsed = extractJson(raw)
  } catch (e: any) {
    return err(res, 'AI_FAILED', `Could not generate a draft: ${e.message}`, 502)
  }

  const areas: any[] = Array.isArray(parsed?.areas) ? parsed.areas : []
  if (areas.length === 0) return err(res, 'AI_EMPTY', 'The AI returned no usable steps — try again.', 502)

  // Each area → a read_policy step then an answer_question MCQ step.
  const steps: any[] = []
  let order = 0
  for (const a of areas) {
    const section = typeof a.policy_section === 'string' ? a.policy_section : null
    if (!section) continue
    steps.push({ order: order++, title: `Read the ${section} policy`, type: 'read_policy', policy_section: section })
    if (a.question && Array.isArray(a.options) && a.options.length === 4) {
      steps.push({
        order:          order++,
        title:          String(a.question).slice(0, 200),
        type:           'answer_question',
        policy_section: section,
        question:       String(a.question),
        options:        (a.options as any[]).map(o => String(o)),
        correct_option: typeof a.correct_option === 'number' ? a.correct_option : 0,
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

// ─── POST /seed-roles — create the canonical role/specialism templates (empty) ─
onboardingTemplatesRouter.post('/seed-roles', async (_req: Request, res: Response) => {
  const existing = await (prisma as any).onboardingFlow.findMany({
    where: { tenant_id: null }, select: { name: true },
  })
  const have = new Set((existing as any[]).map(f => (f.name as string).toLowerCase()))

  const toCreate: any[] = []
  for (const role of PRIMARY_ROLES) {
    if (!have.has(role.toLowerCase())) {
      toCreate.push({ tenant_id: null, name: role, flow_kind: 'primary', job_roles: [role], is_active: false })
    }
  }
  for (const spec of SECONDARY_ROLES) {
    if (!have.has(spec.toLowerCase())) {
      toCreate.push({ tenant_id: null, name: spec, flow_kind: 'secondary', job_roles: [spec], is_active: false })
    }
  }
  if (toCreate.length > 0) {
    await (prisma as any).onboardingFlow.createMany({ data: toCreate })
  }
  ok(res, { created: toCreate.length })
})

// ─── AI prompt (editable in platform /prompts) ────────────────────────────────
export const DEFAULT_ONBOARDING_FLOW_PROMPT = `You design staff onboarding inductions for UK care and nursing homes.

You will be given a job role or a specialism, and the list of policy areas available in the home. Choose the policy areas most relevant to that role or specialism, and for each chosen area write a single multiple-choice question that checks the staff member's understanding of that policy as it applies to their work.

Guidelines:
- For a JOB ROLE, choose the 4 to 7 most relevant policy areas. For a SPECIALISM, choose the 2 to 4 most relevant.
- Use ONLY the exact policy area names provided — do not invent new ones.
- Each question must have exactly 4 options with exactly one correct answer. Make the incorrect options plausible but clearly wrong to someone who has read the policy.
- Keep questions practical, specific, and grounded in day-to-day UK care/nursing home work.

Output ONLY valid JSON in exactly this shape — no markdown, no commentary:
{"areas":[{"policy_section":"<exact area name>","question":"<question text>","options":["option 1","option 2","option 3","option 4"],"correct_option":<0-based index of the correct option>}]}`

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
    })),
  }
}
