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

Produce a module with two parts: a short LEARNING section that teaches the topic, then an ASSESSMENT bank of multiple-choice questions.

Return ONLY a JSON object, no prose or markdown fences, exactly:
{
  "title": "Clear module title (you may keep the topic name)",
  "summary": "2-3 sentence plain-language overview of what this training covers and why it matters here.",
  "key_points": ["6 to 9 short, concrete things a worker must know — grounded in the policy where possible"],
  "questions": [
    { "text": "A clear single-best-answer question", "options": ["four plausible options"], "correct": 0 }
  ]
}
Rules: produce EXACTLY 20 questions (a bank — staff will be served a random subset). Each question has exactly 4 options; "correct" is the 0-based index of the single best answer. Make wrong options plausible but clearly wrong against the policy/best practice. Vary difficulty; prefer realistic care-scenario phrasing. Plain English suitable for staff with English as a second language.{{lang_note}}`

type GeneratedModule = {
  title: string
  learning_content: { summary: string; key_points: string[] }
  questions: Array<{ id: string; text: string; options: string[]; correct: number }>
  policy_refs: Array<{ policy_id: string; title: string; section: string | null }>
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

export async function generateAnnualModuleDraft(
  tenantId: string | null,
  topic: { title: string; aliases?: string[]; requires_practical?: boolean },
): Promise<GeneratedModule> {
  const { text, refs } = await buildGrounding(tenantId, topic)
  const promptTpl = await getPrompt()
  const practicalNote = topic.requires_practical
    ? 'NOTE: this topic also requires a practical/observed competency assessment in real life — this module is the KNOWLEDGE component only. Do not imply it certifies practical competence.'
    : ''
  const grounding = text || 'No specific policy extract was found — base the module on standard UK care-sector good practice for this topic.'

  const system = promptTpl
    .replace('{{topic}}', topic.title)
    .replace('{{practical_note}}', practicalNote)
    .replace('{{grounding}}', grounding)
    .replace('{{lang_note}}', '')

  const raw = await callClaude(system, `Generate the "${topic.title}" annual training module now as JSON.`, { maxTokens: 4096, temperature: 0.4 })
  const p = parseJson(raw)

  const rawQs = Array.isArray(p?.questions) ? p.questions : []
  const questions = rawQs.map((q: any, i: number) => {
    const options = (Array.isArray(q?.options) ? q.options : []).map((o: any) => String(o)).slice(0, 4)
    while (options.length < 4) options.push('—')
    let correct = Number(q?.correct)
    if (!Number.isInteger(correct) || correct < 0 || correct > 3) correct = 0
    return { id: `q${i + 1}`, text: String(q?.text ?? ''), options, correct }
  }).filter((q: any) => q.text)

  return {
    title: String(p?.title ?? topic.title).slice(0, 160),
    learning_content: {
      summary:    String(p?.summary ?? ''),
      key_points: Array.isArray(p?.key_points) ? p.key_points.map((x: any) => String(x)).slice(0, 9) : [],
    },
    questions,
    policy_refs: refs,
  }
}
