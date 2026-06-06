// AI annual-training module generator. Grounds a teach-then-assess module in
// the tenant's own policies (RAG) + anonymised reference policy seeds, producing
// a short learning section + a question bank. Output is a DRAFT — an admin
// reviews/edits/approves before staff see it. The generation prompt is editable
// in the platform console (ai_prompts: training_module_generation).

import { prisma } from '../../db/client'
import { callClaude } from '../ai/claude'
import { embedText } from '../rag/embedder'
import { queryVectors, getTenantNamespace } from '../vector/pinecone'

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
- Vary difficulty; prefer realistic care-scenario phrasing.{{lang_note}}`

type GeneratedSection = {
  heading: string
  body: string
  scenario: { situation: string; prompt: string; answer: string }
  check: { question: string; options: string[]; correct: number }
}

type GeneratedModule = {
  title: string
  learning_content: { summary: string; key_points: string[]; sections: GeneratedSection[] }
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
async function buildGrounding(tenantId: string | null, topic: { title: string; aliases?: string[] }): Promise<{ text: string; refs: GeneratedModule['policy_refs'] }> {
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

  // Reference seeds for the topic (anonymised best-practice policies).
  const kw = topic.title.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3).slice(0, 4)
  if (kw.length) {
    const seeds = await (prisma as any).policySeed.findMany({
      where:  { OR: kw.map(k => ({ OR: [{ section: { contains: k, mode: 'insensitive' } }, { title: { contains: k, mode: 'insensitive' } }] })) },
      select: { title: true, content: true }, orderBy: { reviewed: 'desc' }, take: 2,
    }).catch(() => [])
    for (const s of (seeds as any[])) parts.push(`${s.title}\n${s.content}`)
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
  topic: { title: string; aliases?: string[]; requires_practical?: boolean },
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

  return {
    title: String(p?.title ?? topic.title).slice(0, 160),
    learning_content: {
      summary:    String(p?.summary ?? ''),
      key_points: Array.isArray(p?.key_points) ? p.key_points.map((x: any) => String(x)).slice(0, 6) : [],
      sections,
    },
    questions,
    policy_refs: refs,
  }
}
