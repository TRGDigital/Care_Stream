// Intent classifier — routes inbound messages (email / WhatsApp / voice) to the
// correct RAG pipeline before the main query handler runs.
//
// Resolution order:
//   1. Fast keyword scoring — handles ~80% of messages with no API cost
//   2. Claude micro-classification — for ambiguous messages (< 200 tokens)
//   3. 'unclear' fallback — triggers a clarification reply to the user

import Anthropic from '@anthropic-ai/sdk'
import { recordUsage } from '../../lib/token-usage'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

export type IntentResult = 'internal_policy' | 'training_module' | 'cqc_report' | 'unclear'

// ─── Keyword tables ───────────────────────────────────────────────────────────

const CQC_KEYWORDS = [
  'cqc', 'inspection', 'inspected', 'inspection report', 'cqc report',
  'requires improvement', 'inadequate', 'well-led', 'well led',
  'single assessment', 'key question', 'special measures', 'enforcement',
  'quality statement', 'inspector', 'cqc rating', 'overall rating',
  'safe domain', 'effective domain', 'caring domain', 'responsive domain',
  'action plan', 'factual accuracy', 'regulation 12', 'regulation 17',
  'regulation 9', 'regulated activity', 'fundamental standard',
]

const TRAINING_KEYWORDS = [
  'training', 'course', 'module', 'e-learning', 'elearning', 'online learning',
  'care certificate', 'oliver mcgowan', 'competency assessment', 'qualification',
  'training record', 'mandatory training', 'cpd', 'continuing professional',
  'learning outcome', 'training matrix', 'induction training',
]

const POLICY_KEYWORDS = [
  'policy', 'policies', 'procedure', 'protocol', 'guidance document',
  'safeguarding', 'medication', 'medicines management', 'infection control',
  'falls prevention', 'pressure area', 'pressure ulcer', 'moving and handling',
  'care plan', 'risk assessment', 'incident report', 'complaint procedure',
  'dols', 'deprivation of liberty', 'mental capacity', 'mca', 'best interests',
  'dnacpr', 'end of life', 'staff handbook', 'do not resuscitate',
  'sops', 'standard operating',
]

// ─── Keyword scorer ───────────────────────────────────────────────────────────

function scoreText(text: string): { cqc: number; training: number; policy: number } {
  const lower = text.toLowerCase()
  const score = { cqc: 0, training: 0, policy: 0 }

  for (const kw of CQC_KEYWORDS)      if (lower.includes(kw)) score.cqc++
  for (const kw of TRAINING_KEYWORDS) if (lower.includes(kw)) score.training++
  for (const kw of POLICY_KEYWORDS)   if (lower.includes(kw)) score.policy++

  return score
}

function pickFromScores(scores: { cqc: number; training: number; policy: number }): IntentResult | null {
  const max = Math.max(scores.cqc, scores.training, scores.policy)
  if (max === 0) return null

  // Require a clear winner — at least 1 point ahead of second place
  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1])
  const [first, second] = sorted
  if (first[1] - (second?.[1] ?? 0) >= 1 && first[1] >= 1) {
    if (first[0] === 'cqc')      return 'cqc_report'
    if (first[0] === 'training') return 'training_module'
    if (first[0] === 'policy')   return 'internal_policy'
  }

  return null
}

// ─── Claude micro-classifier ──────────────────────────────────────────────────

async function classifyWithClaude(message: string, subjectLine?: string): Promise<IntentResult> {
  const context = subjectLine
    ? `Subject: ${subjectLine}\n\nMessage: ${message}`
    : `Message: ${message}`

  try {
    const response = await anthropic.messages.create({
      model:      'claude-haiku-4-5-20251001',
      max_tokens: 20,
      messages: [{
        role:    'user',
        content: `Classify this message from a care setting staff member. Reply with exactly one word:
- "policy" — asking about a policy, procedure, or guidance
- "training" — asking about training, a course, or learning
- "cqc" — asking about a CQC inspection, report, or rating
- "unclear" — cannot determine

${context}

Classification:`,
      }],
    })

    recordUsage('claude-haiku-4-5-20251001', response.usage)

    const text = (response.content[0] as any).text?.toLowerCase().trim() ?? ''
    if (text.includes('cqc'))      return 'cqc_report'
    if (text.includes('training')) return 'training_module'
    if (text.includes('policy'))   return 'internal_policy'
    return 'unclear'
  } catch (e) {
    console.error('[intent/classifier] Claude classification failed:', e)
    return 'unclear'
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

// Classify an inbound message. For email, pass the subject line as a strong signal.
// Returns the matched DocumentCategory, or 'unclear' if the intent cannot be determined.

export async function classifyIntent(message: string, subjectLine?: string): Promise<IntentResult> {
  // Subject line alone is often enough — try it first
  if (subjectLine) {
    const subjectScores = scoreText(subjectLine)
    const fromSubject   = pickFromScores(subjectScores)
    if (fromSubject) return fromSubject
  }

  // Score the message body
  const bodyScores = scoreText(message)
  const fromBody   = pickFromScores(bodyScores)
  if (fromBody) return fromBody

  // Combined subject + body score
  if (subjectLine) {
    const subjectScores = scoreText(subjectLine)
    const combined = {
      cqc:      bodyScores.cqc      + subjectScores.cqc,
      training: bodyScores.training + subjectScores.training,
      policy:   bodyScores.policy   + subjectScores.policy,
    }
    const fromCombined = pickFromScores(combined)
    if (fromCombined) return fromCombined
  }

  // Fall back to Claude for genuinely ambiguous messages
  return classifyWithClaude(message, subjectLine)
}

// ─── Clarification message helpers ───────────────────────────────────────────

// Map a label or numeric reply to the corresponding category.
// Accepts the full label ("Policies", "Training", "CQC") or the shorthand number.
export function parseChoiceReply(text: string): IntentResult | null {
  const t = text.trim().toLowerCase()

  // Policy matches: label, shorthand, or number
  if (
    t === '1' ||
    /^polic(y|ies)/.test(t) ||
    /^procedure/.test(t) ||
    /^policies\s*(&|and)\s*proc/.test(t) ||
    t === 'p&p' || t === 'p and p'
  ) return 'internal_policy'

  // Training matches
  if (
    t === '2' ||
    /^training/.test(t) ||
    /^learning/.test(t) ||
    /^staff\s*training/.test(t) ||
    /^course/.test(t)
  ) return 'training_module'

  // CQC matches
  if (
    t === '3' ||
    /^cqc/.test(t) ||
    /^compliance/.test(t) ||
    /^inspection/.test(t) ||
    /^report/.test(t)
  ) return 'cqc_report'

  return null
}

export const WHATSAPP_CLARIFICATION =
  `Hi! I can help with three things. Just reply with the topic name that best fits your question:\n\n` +
  `1️⃣ *Policies* — policies, procedures, and protocols\n` +
  `2️⃣ *Training* — training courses, modules, and learning\n` +
  `3️⃣ *CQC* — CQC inspection, ratings, and action plans\n\n` +
  `Reply *Policies*, *Training*, or *CQC* (or just 1, 2, or 3).`

export const EMAIL_CLARIFICATION_HTML =
  `<p>Thanks for getting in touch. To make sure I give you the most relevant answer, could you let me know which of the following best describes your question?</p>` +
  `<ul>` +
  `<li><strong>Policies</strong> — your policies, procedures, and protocols</li>` +
  `<li><strong>Training</strong> — training courses, modules, and learning</li>` +
  `<li><strong>CQC</strong> — your CQC inspection report, ratings, and action plans</li>` +
  `</ul>` +
  `<p>Please reply with the topic name (or 1, 2, or 3) and I'll get straight back to you.</p>`
