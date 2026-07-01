// AI annual-training module generator. Grounds a teach-then-assess module in
// the tenant's own policies (RAG) + anonymised reference policy seeds, producing
// a short learning section + a question bank. Output is a DRAFT — an admin
// reviews/edits/approves before staff see it. The generation prompt is editable
// in the platform console (ai_prompts: training_module_generation).

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { embedText } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'
import { settingGenerationContext } from '../../lib/care-setting'

export const TRAINING_MODULE_PROMPT_USAGE = 'training_module_generation'

export const DEFAULT_TRAINING_MODULE_PROMPT = `You are a UK care-sector training lead writing an ANNUAL refresher training module for care staff, tailored to one care home using THEIR OWN policies.

Topic: {{topic}}
{{practical_note}}

The home's relevant policy material:
"""
{{grounding}}
"""
Ground the module in this policy material wherever possible — teach THIS home's procedures, not just generic content. Where the policies don't cover something, use standard UK care-sector good practice (CQC fundamental standards). Never invent rules that contradict the policies. Keep clinical content safe and accurate.

Build a STRUCTURED, INTERACTIVE lesson made of SECTIONS, then an ASSESSMENT bank of multiple-choice questions. Each section TEACHES one part of the topic, then makes the learner APPLY it through a real care-home scenario and a quick knowledge check.

LANGUAGE: write in clear, simple, concrete language with short sentences. Staff read this in their own first language via translation, so plain wording that translates cleanly matters more than sophisticated English. Avoid jargon; explain any necessary term.

Return ONLY a JSON object, no prose or markdown fences, exactly:
{
  "title": "Clear module title (you may keep the topic name)",
  "summary": "2-3 sentence plain-language overview of what this training covers and why it matters here.",
  "outcomes": ["3 to 5 measurable learning outcomes, each completing the sentence 'By the end of this module you will be able to…' — start each with an action verb (describe, identify, explain, apply, recognise…). Concrete and assessable."],
  "estimated_minutes": 30,
  "sections": [
    {
      "heading": "Short section title",
      "body": "2-4 short sentences teaching this part of the topic, grounded in the policy where possible.",
      "scenario": {
        "situation": "A short, realistic care-home situation (2-4 sentences) where this applies. Use a resident first name.",
        "prompt": "One sentence asking what the worker should do.",
        "answer": "2-3 sentences giving the correct action and WHY, grounded in the policy/good practice."
      },
      "check": {
        "question": "A quick single-best-answer question checking THIS section's point (different from the scenario).",
        "options": ["four plausible options"],
        "correct": 0
      }
    }
  ],
  "key_points": ["4 to 6 short recap points a worker must remember"],
  "questions": [
    { "text": "A clear single-best-answer question", "options": ["four plausible options"], "correct": 0 }
  ]
}
Rules:
- Produce 4 to 6 SECTIONS. EVERY section MUST include both a "scenario" and a "check" — these are required, never omit them.
- Each "check" and each assessment question has exactly 4 options; "correct" is the 0-based index of the single best answer. Make wrong options plausible but clearly wrong against the policy/best practice.
- Produce EXACTLY 20 assessment "questions" (a bank — staff are served a random subset). These are SEPARATE from and should not duplicate the in-section checks.
- "outcomes": 3 to 5 measurable learning outcomes (action-verb led, assessable). The assessment questions must collectively test these outcomes.
- "estimated_minutes": a realistic estimate of total active learning time (reading the sections + scenarios + checks + the assessment), typically 20–45 minutes for an annual refresher.
- Vary difficulty; prefer realistic care-scenario phrasing.{{lang_note}}`

type GeneratedSection = {
  heading: string
  body: string
  scenario: { situation: string; prompt: string; answer: string }
  check: { question: string; options: string[]; correct: number }
}

type GeneratedModule = {
  title: string
  estimated_minutes: number
  learning_content: { summary: string; outcomes: string[]; key_points: string[]; sections: GeneratedSection[] }
  questions: Array<{ id: string; text: string; options: string[]; correct: number }>
  policy_refs: Array<{ policy_id: string; title: string; section: string | null }>
}

// Normalise a 4-option MCQ {question/text, options, correct}. Pads options to 4, clamps correct.
function normaliseMcq(raw: any, key: 'question' | 'text'): { options: string[]; correct: number } & Record<string, any> {
  const options = (Array.isArray(raw?.options) ? raw.options : []).map((o: any) => String(o)).slice(0, 4)
  while (options.length < 4) options.push('—')
  let correct = Number(raw?.correct)
  if (!Number.isInteger(correct) || correct < 0 || correct > 3) correct = 0
  return { [key]: String(raw?.[key] ?? ''), options, correct }
}

// LLMs strongly favour placing the correct option first (A), so generated answers
// cluster on one letter. Move the correct answer to a target position and shuffle the
// distractors around it. Used with balanceAnswerPositions for an even spread.
function moveCorrectTo<T extends { options: string[]; correct: number }>(it: T, target: number): T {
  const opts = it.options
  if (!Array.isArray(opts) || opts.length < 2) return it
  if (typeof it.correct !== 'number' || it.correct < 0 || it.correct >= opts.length) return it
  const tgt = Math.max(0, Math.min(target, opts.length - 1))
  const correctVal = opts[it.correct]
  const rest = opts.filter((_, i) => i !== it.correct)
  for (let i = rest.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [rest[i], rest[j]] = [rest[j], rest[i]] }
  const out: string[] = []
  let r = 0
  for (let pos = 0; pos < opts.length; pos++) out.push(pos === tgt ? correctVal : rest[r++])
  // Mutate in place so the exact object type (and any extra fields) is preserved.
  it.options = out
  it.correct = tgt
  return it
}

// Redistribute the correct answers across the four positions as evenly as possible,
// in a shuffled order (so there's no learnable A-B-C-D pattern either), and shuffle
// each question's distractors.
export function balanceAnswerPositions<T extends { options: string[]; correct: number }>(items: T[]): T[] {
  const targets = items.map((_, i) => i % 4)
  for (let i = targets.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [targets[i], targets[j]] = [targets[j], targets[i]] }
  return items.map((it, idx) => moveCorrectTo(it, targets[idx]))
}

function policyTitle(filename?: string | null): string {
  if (!filename) return 'Policy'
  return filename.replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
}

async function getPrompt(): Promise<string> {
  try {
    const row = await (prisma as any).aiPrompt.findUnique({ where: { usage: TRAINING_MODULE_PROMPT_USAGE } })
    if (row?.content) return row.content
  } catch { /* fall through */ }
  return DEFAULT_TRAINING_MODULE_PROMPT
}

// Gather grounding: tenant policy chunks (RAG) + matching reference seeds.
// tenantId null → platform/standard module: ground in reference seeds only.
async function buildGrounding(tenantId: string | null, topic: { title: string; aliases?: string[]; care_setting?: string | null }): Promise<{ text: string; refs: GeneratedModule['policy_refs'] }> {
  const query = `${topic.title} ${(topic.aliases ?? []).join(' ')}`.trim()
  let chunks: any[] = []
  if (tenantId) {
    try {
      const vector = await embedText(query)
      const matches = await queryVectors(getTenantNamespace(tenantId), vector, 10)
      chunks = matches.filter(m => (m.score ?? 0) > 0.18).map(m => m.metadata)
    } catch (e: any) {
      console.error('[module-gen] retrieval failed:', e?.message ?? e)
    }
  }

  const parts: string[] = []
  const refMap = new Map<string, { policy_id: string; title: string; section: string | null }>()
  for (const c of chunks) {
    if (c?.chunk_text) parts.push(String(c.chunk_text))
    if (c?.policy_id && !refMap.has(c.policy_id)) {
      refMap.set(c.policy_id, { policy_id: c.policy_id, title: policyTitle(c.source_filename), section: c.section_heading ?? null })
    }
  }

  // Structured training-seed reference for this topic (curated in the console →
  // Training Seeds). This is the primary grounding for standard modules — it lets a
  // setting-specific module (e.g. dental) be grounded in that setting's own facts
  // rather than care-home policy text. Prepended so it leads the grounding.
  try {
    const seedRef = await (prisma as any).trainingSeed.findFirst({
      where: { is_active: true, training_type: { equals: topic.title, mode: 'insensitive' } },
    })
    if (seedRef && (seedRef.summary || seedRef.care_context || seedRef.practical_meaning)) {
      parts.unshift([
        `Authoritative reference for "${seedRef.training_type}":`,
        seedRef.summary && `Overview: ${seedRef.summary}`,
        seedRef.care_context && `How it applies in this care setting: ${seedRef.care_context}`,
        seedRef.care_company_interaction && `What the service must do: ${seedRef.care_company_interaction}`,
        seedRef.practical_meaning && `What it means for staff in practice: ${seedRef.practical_meaning}`,
      ].filter(Boolean).join('\n'))
    }
  } catch { /* training-seed grounding is best-effort */ }

  // Reference seeds for the topic (anonymised best-practice policies). These are the
  // evidence base/provenance for standard (platform) modules — record them as refs.
  // For a setting-specific topic, only pull seeds from THAT setting so e.g. dental
  // generation isn't grounded in nursing-home policy text.
  const kw = topic.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3).slice(0, 4)
  if (kw.length) {
    const keywordOr = { OR: kw.map(k => ({ OR: [{ section: { contains: k, mode: 'insensitive' } }, { title: { contains: k, mode: 'insensitive' } }] })) }
    const seeds = await (prisma as any).policySeed.findMany({
      where:  topic.care_setting ? { AND: [keywordOr, { care_setting: topic.care_setting }] } : keywordOr,
      select: { id: true, title: true, section: true, content: true }, orderBy: { reviewed: 'desc' }, take: 3,
    }).catch(() => [])
    for (const s of (seeds as any[])) {
      parts.push(`${s.title}\n${s.content}`)
      const key = `seed:${s.id}`
      if (!refMap.has(key)) refMap.set(key, { policy_id: key, title: policyTitle(s.title), section: s.section ?? null })
    }
  }

  return { text: parts.join('\n\n').slice(0, 9000), refs: [...refMap.values()].slice(0, 8) }
}

function parseJson(raw: string): any {
  let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a > 0 || b < s.length - 1) s = s.slice(a, b + 1)
  return JSON.parse(s)
}

// Normalise a question text for duplicate comparison (case/space/punctuation-insensitive).
export function normaliseQuestion(text: string): string {
  return String(text ?? '').toLowerCase().replace(/[^a-z0-9 ]/g, ' ').replace(/\s+/g, ' ').trim()
}

export async function generateAnnualModuleDraft(
  tenantId: string | null,
  topic: { title: string; aliases?: string[]; requires_practical?: boolean; care_setting?: string | null },
  opts: { excludeQuestions?: string[] } = {},
): Promise<GeneratedModule> {
  const { text, refs } = await buildGrounding(tenantId, topic)
  const promptTpl = await getPrompt()
  const practicalNote = topic.requires_practical
    ? 'NOTE: this topic also requires a practical/observed competency assessment in real life — this module is the KNOWLEDGE component only. Do not imply it certifies practical competence.'
    : ''
  const grounding = text || 'No specific policy extract was found — base the module on standard UK care-sector good practice for this topic.'

  let system = promptTpl
    .replace('{{topic}}', topic.title)
    .replace('{{practical_note}}', practicalNote)
    .replace('{{grounding}}', grounding)
    .replace('{{lang_note}}', '')

  // Append setting voice/scenario/regulatory guidance (appended, not templated, so
  // it applies regardless of any console-edited prompt). NULL = setting-neutral.
  system += settingGenerationContext(topic.care_setting ?? null)

  // Avoid repeating questions used in previous versions of this module. Appended
  // after the (editable) template so it always applies on a regeneration.
  const exclude = (opts.excludeQuestions ?? []).map(q => String(q).trim()).filter(Boolean)
  if (exclude.length) {
    const list = exclude.slice(-150).map(q => `- ${q.slice(0, 180)}`).join('\n')
    system += `\n\nIMPORTANT — QUESTION HISTORY: the following ${exclude.length} question(s) have ALREADY been used in previous versions of this module. Do NOT repeat, copy, or lightly reword any of them. Produce genuinely NEW questions that test different scenarios, angles, or details of the same topic:\n${list}`
  }

  const raw = await callClaude(system, `Generate the "${topic.title}" annual training module now as JSON.`, { maxTokens: 8000, temperature: exclude.length ? 0.6 : 0.4 })
  const p = parseJson(raw)

  // Drop any generated question that still matches a previously-used one.
  const seen = new Set(exclude.map(normaliseQuestion))
  const rawQs = (Array.isArray(p?.questions) ? p.questions : []).filter((q: any) => {
    const key = normaliseQuestion(q?.text ?? '')
    if (!key || seen.has(key)) return false
    seen.add(key)
    return true
  })
  const questions = rawQs.map((q: any, i: number) => {
    const m = normaliseMcq(q, 'text')
    return { id: `q${i + 1}`, text: m.text, options: m.options, correct: m.correct }
  }).filter((q: any) => q.text)

  // Build the interactive sections — every section keeps its scenario + check.
  const sections: GeneratedSection[] = (Array.isArray(p?.sections) ? p.sections : []).map((s: any, i: number) => {
    const sc = s?.scenario ?? {}
    const chk = normaliseMcq(s?.check ?? {}, 'question')
    return {
      heading: String(s?.heading ?? `Section ${i + 1}`).slice(0, 160),
      body:    String(s?.body ?? ''),
      scenario: {
        situation: String(sc.situation ?? ''),
        prompt:    String(sc.prompt ?? ''),
        answer:    String(sc.answer ?? ''),
      },
      check: { question: (chk as any).question, options: chk.options, correct: chk.correct },
    }
  }).filter((s: GeneratedSection) => s.body || s.heading)

  const estMin = Math.round(Number(p?.estimated_minutes))
  const estimated_minutes = Number.isFinite(estMin) ? Math.max(10, Math.min(180, estMin)) : 30

  // Break the LLM's "correct answer is always A" bias: spread the correct answer
  // evenly across A/B/C/D for the assessment questions and the per-section checks.
  // balanceAnswerPositions mutates each item's options/correct in place.
  balanceAnswerPositions(questions)
  balanceAnswerPositions(sections.map(s => s.check))

  return {
    title: String(p?.title ?? topic.title).slice(0, 160),
    estimated_minutes,
    learning_content: {
      summary:    String(p?.summary ?? ''),
      outcomes:   Array.isArray(p?.outcomes) ? p.outcomes.map((x: any) => String(x)).slice(0, 6) : [],
      key_points: Array.isArray(p?.key_points) ? p.key_points.map((x: any) => String(x)).slice(0, 6) : [],
      sections,
    },
    questions,
    policy_refs: refs,
  }
}
