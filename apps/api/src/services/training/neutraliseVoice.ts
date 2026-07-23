// Rewrites a standard training module's WORDING to setting-NEUTRAL voice, so the
// universal cross-over modules read correctly under every setting tab — not just
// care homes. It deliberately does NOT touch structure, answers or images:
//  - same number/order of sections and questions (guarded; mismatch → abort)
//  - every `correct` index is force-kept from the original (answers never move)
//  - per-section image_key is preserved (the AI never even sees it)
// Returns the rewritten { learning_content, questions }, or null if the result
// can't be merged safely (caller then leaves the module untouched).

import { callClaude } from '../ai/claude'

type Mcq = { question?: string; options: string[]; correct: number }
type Section = {
  heading: string; body: string
  scenario: { situation: string; prompt: string; answer: string }
  check: Mcq; image_key?: string; [k: string]: any
}
type LearningContent = { summary: string; outcomes: string[]; key_points: string[]; sections: Section[]; [k: string]: any }
type Question = { id: string; text: string; options: string[]; correct: number }

const NEUTRALISE_PROMPT = `You are editing a UK health & social care TRAINING MODULE to make its wording setting-NEUTRAL, so it reads correctly for ANY care setting (care homes, dental practices, GP surgeries, hospices, domiciliary care, supported living…), not only care homes.

REWRITE ONLY THE WORDING. You MUST NOT change:
- the NUMBER of sections or questions, or their ORDER
- the MEANING, the facts, the clinical/regulatory accuracy, or which answer is correct
- the ORDER of the multiple-choice options (the correct option must stay in the same position)

WHAT TO CHANGE — replace care-home-only language with neutral equivalents:
- "care home" / "the home" / "our home" / "this home" → "service" / "our service"
- "resident(s)" → "the person we support" / "the people we support" (or a neutral first name in a scenario)
- rephrase any care-home-only scenario so it applies across settings; avoid setting-only job titles
Keep the language plain and simple (staff read it via translation). Keep every learning outcome, key point, scenario and check — only neutralise the words.

Return ONLY a JSON object in EXACTLY this shape, with the SAME counts and order as the input — no markdown, no commentary:
{
  "summary": "...",
  "outcomes": ["..."],
  "key_points": ["..."],
  "sections": [{ "heading": "...", "body": "...", "scenario": { "situation": "...", "prompt": "...", "answer": "..." }, "check": { "question": "...", "options": ["a","b","c","d"], "correct": 0 } }],
  "questions": [{ "text": "...", "options": ["a","b","c","d"], "correct": 0 }]
}`

function parseJson(raw: string): any {
  let s = raw.trim().replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  const a = s.indexOf('{'), b = s.lastIndexOf('}')
  if (a > 0 || b < s.length - 1) s = s.slice(a, b + 1)
  return JSON.parse(s)
}

const str = (v: any) => String(v ?? '')
function opts4(v: any, fallback: string[]): string[] {
  const o = (Array.isArray(v) ? v : []).map(str).slice(0, 4)
  while (o.length < 4) o.push(fallback[o.length] ?? '—')
  return o
}

export async function neutraliseModuleVoice(module: {
  name: string
  learning_content: LearningContent
  questions: Question[]
}): Promise<{ learning_content: LearningContent; questions: Question[] } | null> {
  const lc = module.learning_content
  const origSections = Array.isArray(lc?.sections) ? lc.sections : []
  const origQuestions = Array.isArray(module.questions) ? module.questions : []
  if (!origSections.length || !origQuestions.length) return null

  // Strip image_key before sending — the AI never sees or touches images.
  const payload = {
    name: module.name,
    summary: str(lc.summary),
    outcomes: (lc.outcomes ?? []).map(str),
    key_points: (lc.key_points ?? []).map(str),
    sections: origSections.map(s => ({
      heading: str(s.heading), body: str(s.body),
      scenario: { situation: str(s.scenario?.situation), prompt: str(s.scenario?.prompt), answer: str(s.scenario?.answer) },
      check: { question: str(s.check?.question), options: (s.check?.options ?? []).map(str), correct: Number(s.check?.correct) || 0 },
    })),
    questions: origQuestions.map(q => ({ text: str(q.text), options: (q.options ?? []).map(str), correct: Number(q.correct) || 0 })),
  }

  const raw = await callClaude(
    NEUTRALISE_PROMPT,
    `Neutralise the wording of this module and return the JSON in the same shape:\n\n${JSON.stringify(payload)}`,
    { maxTokens: 8000, temperature: 0.2, feature: 'training_setup' },
  )
  const p = parseJson(raw)
  const newSections = Array.isArray(p?.sections) ? p.sections : []
  const newQuestions = Array.isArray(p?.questions) ? p.questions : []

  // Structural guard: counts must match exactly, else abort (leave module untouched).
  if (newSections.length !== origSections.length || newQuestions.length !== origQuestions.length) return null

  // Merge: take the rewritten TEXT, but force-keep each original image_key and every
  // `correct` index so structure + images + answers are guaranteed intact.
  const sections: Section[] = origSections.map((orig, i) => {
    const n = newSections[i] ?? {}
    return {
      ...orig, // preserves image_key and any other fields
      heading: str(n.heading) || orig.heading,
      body:    str(n.body) || orig.body,
      scenario: {
        situation: str(n.scenario?.situation) || orig.scenario?.situation,
        prompt:    str(n.scenario?.prompt) || orig.scenario?.prompt,
        answer:    str(n.scenario?.answer) || orig.scenario?.answer,
      },
      check: {
        ...orig.check,
        question: str(n.check?.question) || orig.check?.question,
        options:  opts4(n.check?.options, orig.check?.options ?? []),
        correct:  Number(orig.check?.correct) || 0, // answer never moves
      },
    }
  })

  const questions: Question[] = origQuestions.map((orig, i) => {
    const n = newQuestions[i] ?? {}
    return {
      id:      orig.id,
      text:    str(n.text) || orig.text,
      options: opts4(n.options, orig.options ?? []),
      correct: Number(orig.correct) || 0, // answer never moves
    }
  })

  return {
    learning_content: {
      ...lc,
      summary:    str(p.summary) || lc.summary,
      outcomes:   (Array.isArray(p.outcomes) ? p.outcomes.map(str) : lc.outcomes).slice(0, 6),
      key_points: (Array.isArray(p.key_points) ? p.key_points.map(str) : lc.key_points).slice(0, 6),
      sections,
    },
    questions,
  }
}
