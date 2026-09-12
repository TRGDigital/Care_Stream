// What a buyer has told us about their own service, and what we still have to ask.
//
// The questions come from the regulations a policy is written against, so they are a
// property of the law rather than of any one order. They are therefore answered per TENANT
// and reused across every policy that tenant owns: "do you use an electronic care system"
// is required by data protection, GDPR, Caldicott, good governance and accessible
// information, and asking it five times is how a form stops being completed.
//
// Measured on the real catalogue, a twenty-policy bundle needs 111 answers if each policy
// asks its own and 35 if they are shared. That gap is the difference between a buyer who
// finishes and a buyer who abandons, and an abandoned form returns the writer to guessing,
// which is the whole problem this exists to solve.
//
// These are deliberately NOT asked at checkout. Nine identity questions on the buying page
// is a purchase; forty-four is a decision to come back later. They are asked once the money
// is taken, in the client's own policies page, where the answer improves a document they
// have already bought.

import { prisma } from '../../db/client'
import {
  questionsForReferenceKeys, regulationsWithoutQuestions, type IntakeQuestion,
} from '../../data/policy-intake-questions'

export interface IntakeAnswer {
  question_key: string
  value: string
  answered_at: string
  answered_by: string | null
}

export interface TenantIntakeState {
  /** Every question this tenant's policies need, asked once. */
  questions: IntakeQuestion[]
  answers: Record<string, string>
  answered: number
  missing: number
  /** Questions still unanswered, in the order they should be asked. */
  outstanding: IntakeQuestion[]
  /** Regulations behind their policies that have no questions derived. Should be empty. */
  regulations_not_yet_derived: string[]
}

/** Every reference_key across the policies this tenant has bought. */
async function tenantReferenceKeys(tenantId: string): Promise<string[]> {
  const purchases = await (prisma as any).policyPurchase.findMany({
    where:  { tenant_id: tenantId, status: { not: 'refunded' } },
    select: { reference_keys: true },
  })
  const keys = new Set<string>()
  for (const p of purchases as Array<{ reference_keys: string[] }>) {
    for (const k of p.reference_keys ?? []) keys.add(k)
  }
  return [...keys]
}

export async function tenantIntakeState(tenantId: string): Promise<TenantIntakeState> {
  const keys = await tenantReferenceKeys(tenantId)
  const questions = questionsForReferenceKeys(keys)

  const rows = await (prisma as any).policyIntakeAnswer.findMany({
    where:  { tenant_id: tenantId },
    select: { question_key: true, value: true },
  })
  const answers: Record<string, string> = {}
  for (const r of rows as Array<{ question_key: string; value: string }>) {
    // A blank answer is not an answer. Storing one would let a buyer skip a question and
    // have the policy treat the silence as a fact.
    if (String(r.value ?? '').trim()) answers[r.question_key] = r.value
  }

  const outstanding = questions.filter(q => !answers[q.key])
  return {
    questions,
    answers,
    answered: questions.length - outstanding.length,
    missing:  outstanding.length,
    outstanding,
    regulations_not_yet_derived: regulationsWithoutQuestions(keys),
  }
}

/** Save answers. Blank values delete rather than store, so "answered" always means told. */
export async function saveIntakeAnswers(
  tenantId: string,
  values: Record<string, string>,
  answeredBy: string | null,
): Promise<{ saved: number; cleared: number }> {
  let saved = 0
  let cleared = 0
  for (const [question_key, raw] of Object.entries(values ?? {})) {
    const value = String(raw ?? '').trim()
    if (!value) {
      const res = await (prisma as any).policyIntakeAnswer.deleteMany({
        where: { tenant_id: tenantId, question_key },
      })
      cleared += res?.count ?? 0
      continue
    }
    await (prisma as any).policyIntakeAnswer.upsert({
      where:  { tenant_id_question_key: { tenant_id: tenantId, question_key } },
      update: { value, answered_at: new Date(), answered_by: answeredBy },
      create: { tenant_id: tenantId, question_key, value, answered_by: answeredBy },
    })
    saved++
  }
  return { saved, cleared }
}

/** The answers a writer may use as facts, as "label: value" lines.
 *
 *  Only questions relevant to THIS policy's regulations, so a medicines policy is not handed
 *  the fire evacuation strategy and given the chance to work it in somewhere. */
export async function intakeFactsFor(tenantId: string, referenceKeys: string[]): Promise<string[]> {
  const state = await tenantIntakeState(tenantId)
  const wanted = questionsForReferenceKeys(referenceKeys)
  return wanted
    .filter(q => state.answers[q.key])
    .map(q => `- ${q.label} ${state.answers[q.key]}`)
}

/** Questions relevant to this policy that nobody has answered. The writer is told to keep
 *  quiet about these rather than inventing them, and the gate checks that it did. */
export async function intakeUnknownsFor(
  tenantId: string, referenceKeys: string[],
): Promise<IntakeQuestion[]> {
  const state = await tenantIntakeState(tenantId)
  return questionsForReferenceKeys(referenceKeys).filter(q => !state.answers[q.key])
}
