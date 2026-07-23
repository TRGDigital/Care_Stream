// "Learn & retry" remediation: turns a wrong-answer knowledge gap into a short,
// policy-grounded micro-lesson (corrective why → key points → scenario → a fresh
// check question). Lessons are cached per gap concept + language; generation is
// grounded ONLY in the home's own policy text + seeded reference policies.

import { prisma } from '../db/client'
import { callClaude } from '../services/ai/claude'
import { trackAiAction } from './plan-limits'
import { downloadExtractedText } from '../services/storage/s3'

export type LessonPayload = {
  why:         string
  key_points:  string[]
  scenario:    { situation: string; prompt: string; answer: string }
  check:       { question: string; options: string[]; correct_option: number }
  policy_id?:  string | null
  policy_title?: string | null
}

type GapContext = {
  topic:        string
  question:     string
  options:      string[]
  correctText:  string
  policyText:   string
  policyId:     string | null
  policyTitle:  string | null
}

function policyTitle(filename?: string | null): string {
  if (!filename) return 'Policy'
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

function keywords(name?: string | null): string[] {
  return String(name ?? '')
    .toLowerCase()
    .replace(/[^a-z0-9 ]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !['adult', 'adults', 'staff', 'care', 'home', 'training', 'module', 'policy'].includes(w))
    .slice(0, 4)
}

// Gather the question + correct answer + grounding policy text for one gap.
export async function buildGapContext(
  tenantId: string,
  source:   'training' | 'induction',
  ref:      string,
  enrollmentId: string,
): Promise<GapContext | null> {
  if (source === 'induction') {
    const step = await (prisma as any).onboardingStep.findFirst({
      where:  { id: ref, flow: { enrollments: { some: { id: enrollmentId, tenant_id: tenantId } } } },
      select: { question: true, options: true, correct_option: true, policy_id: true, policy_section: true,
                flow: { select: { name: true } } },
    }).catch(() => null)
    if (!step?.question) return null
    const options = Array.isArray(step.options) ? step.options : []
    let policyText = '', policyTitleStr: string | null = null, policyId: string | null = null
    if (step.policy_id) {
      policyId   = step.policy_id
      policyText = (await downloadExtractedText(tenantId, step.policy_id).catch(() => null)) ?? ''
      const p = await (prisma as any).policy.findFirst({ where: { id: step.policy_id, tenant_id: tenantId }, select: { filename: true } }).catch(() => null)
      policyTitleStr = policyTitle(p?.filename)
    }
    return {
      topic:       step.policy_section || step.flow?.name || 'Induction',
      question:    step.question,
      options,
      correctText: typeof step.correct_option === 'number' ? (options[step.correct_option] ?? '') : '',
      policyText:  policyText.slice(0, 6000),
      policyId,
      policyTitle: policyTitleStr,
    }
  }

  // training — question lives as JSON on the module; ground in matching tenant
  // policy (if any) + seeded reference policies for the topic.
  const enr = await (prisma as any).trainingEnrollment.findFirst({
    where:  { id: enrollmentId, tenant_id: tenantId },
    select: { module: { select: { name: true, questions: true } } },
  }).catch(() => null)
  const q = (Array.isArray(enr?.module?.questions) ? enr.module.questions : []).find((x: any) => x.id === ref)
  if (!q?.text) return null
  const options = Array.isArray(q.options) ? q.options : []
  const kw = keywords(enr?.module?.name)

  let policyText = '', policyTitleStr: string | null = null, policyId: string | null = null
  if (kw.length) {
    const tenantPolicy = await (prisma as any).policy.findFirst({
      where:  { tenant_id: tenantId, OR: kw.map(k => ({ filename: { contains: k, mode: 'insensitive' } })) },
      select: { id: true, filename: true },
    }).catch(() => null)
    if (tenantPolicy) {
      policyId       = tenantPolicy.id
      policyTitleStr = policyTitle(tenantPolicy.filename)
      policyText     = (await downloadExtractedText(tenantId, tenantPolicy.id).catch(() => null)) ?? ''
    }
    if (policyText.length < 1500) {
      const seeds = await (prisma as any).policySeed.findMany({
        where:  { OR: kw.map(k => ({ OR: [{ section: { contains: k, mode: 'insensitive' } }, { title: { contains: k, mode: 'insensitive' } }] })) },
        select: { title: true, content: true }, orderBy: { reviewed: 'desc' }, take: 2,
      }).catch(() => [])
      policyText += '\n\n' + (seeds as any[]).map(s => `${s.title}\n${s.content}`).join('\n\n')
    }
  }

  return {
    topic:       enr?.module?.name || 'Training',
    question:    q.text,
    options,
    correctText: typeof q.correct === 'number' ? (options[q.correct] ?? '') : '',
    policyText:  policyText.trim().slice(0, 6000),
    policyId,
    policyTitle: policyTitleStr,
  }
}

function parseJson(raw: string): any {
  let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a > 0 || b < s.length - 1) s = s.slice(a, b + 1)
  return JSON.parse(s)
}

// Generate the lesson with Sonnet, grounded in the gathered policy text.
export async function generateLesson(ctx: GapContext, lang: string, langName: string): Promise<LessonPayload> {
  const inLang = lang === 'eng' ? '' : `\nWrite ALL text (why, key_points, scenario, check) in ${langName}. Keep it natural and simple.`
  const grounding = ctx.policyText
    ? `The home's policy on this topic says:\n"""\n${ctx.policyText}\n"""\nGround everything you write in this policy. Do not invent rules that contradict it.`
    : `No policy extract was available, so base the lesson on standard UK care-sector good practice for this topic. Keep it general and safe.`

  const system = `You are a friendly UK care-home trainer creating a SHORT remediation micro-lesson for a care worker who just answered a question incorrectly. Your job is to teach the underlying point in a way that sticks, then check understanding with a NEW question (never repeat the original).

${grounding}

Return ONLY a JSON object, no prose, no markdown fences, with exactly this shape:
{
  "why": "2-3 sentences: warmly explain what the correct answer is and WHY it matters in practice. No blame.",
  "key_points": ["3 to 4 short, plain-language points the worker should remember"],
  "scenario": {
    "situation": "A short, realistic care-home situation (2-4 sentences) where this knowledge applies. Use a resident first name.",
    "prompt": "One sentence asking what the right action is.",
    "answer": "2-3 sentences giving the correct action and the reasoning, grounded in the policy."
  },
  "check": {
    "question": "A NEW multiple-choice question testing the SAME concept as the original, but phrased differently (ideally scenario-based). Do NOT reuse the original wording.",
    "options": ["four plausible options"],
    "correct_option": 0
  }
}
Rules: exactly 4 options in check.options; correct_option is the 0-based index of the right one; make wrong options plausible but clearly wrong on the policy. Keep everything concise — a worker should finish in under two minutes.${inLang}`

  const user = `Topic: ${ctx.topic}
Original question they got wrong: "${ctx.question}"
${ctx.options.length ? `Original options: ${ctx.options.map((o, i) => `(${i}) ${o}`).join('  ')}` : ''}
${ctx.correctText ? `The correct answer was: "${ctx.correctText}"` : ''}

Create the micro-lesson now.`

  const raw = await callClaude(system, user, { maxTokens: 1600, temperature: 0.5, feature: 'remediation' })
  const p = parseJson(raw)

  // Normalise + guard the check question shape.
  let options: string[] = Array.isArray(p?.check?.options) ? p.check.options.map((x: any) => String(x)).slice(0, 4) : []
  while (options.length < 4) options.push('—')
  let correct = Number(p?.check?.correct_option)
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) correct = 0

  return {
    why:        String(p?.why ?? ''),
    key_points: Array.isArray(p?.key_points) ? p.key_points.map((x: any) => String(x)).slice(0, 4) : [],
    scenario: {
      situation: String(p?.scenario?.situation ?? ''),
      prompt:    String(p?.scenario?.prompt ?? ''),
      answer:    String(p?.scenario?.answer ?? ''),
    },
    check: { question: String(p?.check?.question ?? ''), options, correct_option: correct },
    policy_id:    ctx.policyId,
    policy_title: ctx.policyTitle,
  }
}

// Cache-aware: return the lesson for a gap, generating + storing it on first use.
export async function getOrCreateLesson(
  tenantId: string,
  source:   'training' | 'induction',
  ref:      string,
  enrollmentId: string,
  lang:     string,
  langName: string,
): Promise<LessonPayload | null> {
  const refKey = `${source}:${ref}`
  const cached = await (prisma as any).remediationLesson.findUnique({ where: { ref_key_lang: { ref_key: refKey, lang } } }).catch(() => null)
  if (cached?.payload) return cached.payload as LessonPayload

  const ctx = await buildGapContext(tenantId, source, ref, enrollmentId)
  if (!ctx) return null
  const lesson = await generateLesson(ctx, lang, langName)
  await (prisma as any).remediationLesson.create({
    data: { tenant_id: tenantId, ref_key: refKey, lang, payload: lesson as any },
  }).catch(() => {}) // unique race — fine, next read serves the winner
  trackAiAction(tenantId, 'remediation', refKey)
  return lesson
}
