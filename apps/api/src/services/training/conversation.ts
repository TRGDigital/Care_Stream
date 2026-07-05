// Shared training conversation handler — used by WhatsApp and email inbound pipelines.
//
// Single path: if the incoming text is a single A/B/C/D answer, record it and
// send feedback + the next question (returns { handled: true }, caller skips RAG).
// All other messages return { handled: false } and pass through to the RAG pipeline.
//
// Training questions are delivered proactively by services/training/proactive.ts —
// they are never injected into policy or CQC conversations.

import { prisma } from '../../db/client'
import { translateTrainingQuestion } from '../../lib/translate'
import { languageNameForCode } from '../../data/languages'

const OPTION_MAP: Record<string, number> = { A: 0, B: 1, C: 2, D: 3 }
const LABELS = ['A', 'B', 'C', 'D']

function isTrainingAnswer(text: string): boolean {
  return /^[A-Da-d]$/.test(text.trim())
}

function getNextUnanswered(
  questions:   any[],
  answeredIds: Set<string>,
): { question: any; index: number } | null {
  for (let i = 0; i < questions.length; i++) {
    if (!answeredIds.has(questions[i].id)) return { question: questions[i], index: i }
  }
  return null
}

// ─── Formatters ───────────────────────────────────────────────────────────────

export function fmtQuestionWA(q: any, index: number, total: number, moduleName: string): string {
  const opts = (q.options as string[]) ?? []
  return [
    `📚 *Training: ${moduleName}*`,
    `_Question ${index + 1} of ${total}_`,
    '',
    q.text,
    '',
    ...opts.map((o, i) => `*${LABELS[i]})* ${o}`),
    '',
    '_Reply A, B, C, or D_',
  ].join('\n')
}

export function fmtQuestionEmail(q: any, index: number, total: number, moduleName: string): string {
  const opts = (q.options as string[]) ?? []
  return [
    `<div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:6px;padding:16px 20px;margin:24px 0">`,
    `<p style="margin:0 0 4px;font-size:13px;font-weight:600;color:#0d9488">📚 Training – ${moduleName}</p>`,
    `<p style="margin:0 0 12px;font-size:12px;color:#6b7280">Question ${index + 1} of ${total}</p>`,
    `<p style="margin:0 0 12px;font-size:14px;color:#111827;font-weight:500">${q.text}</p>`,
    `<ul style="list-style:none;padding:0;margin:0 0 12px">`,
    ...opts.map((o, i) => `<li style="padding:4px 0;font-size:14px;color:#374151"><strong>${LABELS[i]})</strong> ${o}</li>`),
    `</ul>`,
    `<p style="margin:0;font-size:12px;color:#6b7280;font-style:italic">Reply to this email with just a single letter: A, B, C, or D.</p>`,
    `</div>`,
  ].join('\n')
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface TrainingConversationResult {
  handled: boolean
}

export async function handleTrainingConversation({
  tenantId,
  userId,
  incomingText,
  channel,
  send,
}: {
  tenantId:     string
  userId:       string | null
  incomingText: string
  channel:      'whatsapp' | 'email'
  send:         (text: string) => Promise<void>
}): Promise<TrainingConversationResult> {
  if (!userId) return { handled: false }

  const trimmed = incomingText.trim()

  // ── Path 1: Single A/B/C/D ────────────────────────────────────────────────
  if (isTrainingAnswer(trimmed)) {
    const [userRecord, tenantRecord] = await Promise.all([
      (prisma as any).user.findUnique({
        where: { id: userId }, select: { first_language: true, comms_always_first_language: true },
      }).catch(() => null),
      (prisma as any).tenant.findUnique({
        where: { id: tenantId }, select: { custom_languages: true, translation_glossary: true },
      }).catch(() => null),
    ])
    const userLang: string = userRecord?.comms_always_first_language === false
      ? 'eng'
      : ((userRecord?.first_language as string) ?? 'eng')
    const userLangName = languageNameForCode(userLang, tenantRecord?.custom_languages)
    const letter      = trimmed.toUpperCase()
    const selectedIdx = OPTION_MAP[letter]

    const enrollments = await (prisma as any).trainingEnrollment.findMany({
      where: {
        tenant_id: tenantId,
        user_id:   userId,
        status:    { in: ['not_started', 'in_progress'] },
      },
      include: {
        module:  { select: { id: true, name: true, questions: true, is_annual: true, sort_order: true } },
        answers: true,
      },
      orderBy: { created_at: 'asc' },
    })

    enrollments.sort((a: any, b: any) => (a.module.sort_order ?? 0) - (b.module.sort_order ?? 0))

    // Find first enrollment with an unanswered question
    let active:   any = null
    let nextInfo: { question: any; index: number } | null = null

    for (const e of enrollments) {
      const qs        = (e.module.questions as any[]) ?? []
      const answered  = new Set<string>(e.answers.map((a: any) => a.question_id as string))
      const next      = getNextUnanswered(qs, answered)
      if (next) { active = e; nextInfo = next; break }
    }

    if (!active || !nextInfo) return { handled: false }

    const { question, index } = nextInfo
    const questions  = (active.module.questions as any[]) ?? []
    const total      = questions.length
    const is_correct = question.correct !== undefined && selectedIdx === question.correct

    // Save answer
    await (prisma as any).trainingAnswer.upsert({
      where:  { enrollment_id_question_id: { enrollment_id: active.id, question_id: question.id } },
      update: { answer_text: letter, is_correct, answered_at: new Date() },
      create: { enrollment_id: active.id, question_id: question.id, answer_text: letter, is_correct },
    })

    if (active.status === 'not_started') {
      await (prisma as any).trainingEnrollment.update({
        where: { id: active.id },
        data:  { status: 'in_progress', updated_at: new Date() },
      })
    }

    // Feedback strings
    const correctLetter  = LABELS[question.correct] ?? '?'
    const correctOptText = (question.options as string[])?.[question.correct] ?? ''

    // Remaining questions after this answer
    const answeredIds = new Set<string>([
      ...active.answers.map((a: any) => a.question_id as string),
      question.id as string,
    ])
    const remaining = questions.filter((q: any) => !answeredIds.has(q.id))

    let reply: string

    if (remaining.length === 0) {
      // ── Module complete ──────────────────────────────────────────────────────
      const now     = new Date()
      const expires = active.module.is_annual
        ? new Date(now.getFullYear() + 1, now.getMonth(), now.getDate())
        : null

      await (prisma as any).trainingEnrollment.update({
        where: { id: active.id },
        data:  { status: 'complete', completed_at: now, expires_at: expires, updated_at: now },
      })

      if (channel === 'whatsapp') {
        const fb = is_correct
          ? `✅ *Correct!*`
          : `❌ *Incorrect.* Correct answer: *${correctLetter})* ${correctOptText}`
        reply = `${fb}\n\n🎓 *Module complete!*\n_You've finished "${active.module.name}". Great work!_`
      } else {
        const fb = is_correct
          ? `<p>✅ <strong>Correct!</strong></p>`
          : `<p>❌ <strong>Incorrect.</strong> The correct answer was <strong>${correctLetter})</strong> ${correctOptText}</p>`
        reply = `${fb}<p>🎓 <strong>Module complete!</strong> You've finished <em>${active.module.name}</em>. Great work!</p>`
      }

      // Prompt next module if available
      const nextModule = enrollments.find((e: any) => {
        if (e.id === active.id) return false
        const qs  = (e.module.questions as any[]) ?? []
        const ids = new Set(e.answers.map((a: any) => a.question_id))
        return qs.some((q: any) => !ids.has(q.id))
      })

      if (nextModule) {
        if (channel === 'whatsapp') {
          reply += `\n\nYou have another module: *${nextModule.module.name}*\nJust message again when you're ready to continue.`
        } else {
          reply += `<p>Your next module is <strong>${nextModule.module.name}</strong>. Just reply when you're ready to continue.</p>`
        }
      }
    } else {
      // ── Send next question ───────────────────────────────────────────────────
      const nextQ   = remaining[0]
      const nextIdx = questions.findIndex((q: any) => q.id === nextQ.id)

      const translated = await translateTrainingQuestion(
        { text: nextQ.text, options: (nextQ.options as string[]) ?? [] },
        userLang,
        userLangName,
        tenantRecord?.translation_glossary,
        tenantId,
      )
      const nextQFmt = { ...nextQ, text: translated.text, options: translated.options }

      if (channel === 'whatsapp') {
        const fb = is_correct
          ? `✅ *Correct!*`
          : `❌ *Incorrect.* Correct answer: *${correctLetter})* ${correctOptText}`
        reply = `${fb}\n\n` + fmtQuestionWA(nextQFmt, nextIdx, total, active.module.name)
      } else {
        const fb = is_correct
          ? `<p>✅ <strong>Correct!</strong></p>`
          : `<p>❌ <strong>Incorrect.</strong> The correct answer was <strong>${correctLetter})</strong> ${correctOptText}</p>`
        reply = fb + fmtQuestionEmail(nextQFmt, nextIdx, total, active.module.name)
      }
    }

    await send(reply)
    return { handled: true }
  }

  // Normal message — not a training answer, pass through to the RAG pipeline.
  return { handled: false }
}
