// WhatsApp audit conversation handler.
// Intercepts inbound messages when a user is mid-audit and routes accordingly.
// Returns { handled: true } if the message was consumed, { handled: false } to pass through.

import { prisma } from '../../db/client'
import { SECTIONS_WITH_ALL_QUESTIONS, shapeRunTemplate, isVisible, isYesNo, isNarrative } from '../../lib/audit-questions'

type SendFn = (text: string) => Promise<void>

interface AuditConversationParams {
  tenantId:     string
  userId:       string | null
  phoneNumber:  string
  incomingText: string
  session:      any
  send:         SendFn
}

const TRIGGER_WORDS = ['start audit', 'begin audit', 'audit', 'monthly audit']
const YES_WORDS     = ['yes', 'y', '✓', '✅', 'yeah', 'yep', 'correct']
const NO_WORDS      = ['no', 'n', '✗', '❌', 'nope', 'negative']
const NA_WORDS      = ['n/a', 'na', 'not applicable', 'not apply']
const SKIP_WORDS    = ['skip', 'none', '-', '.', 'no outcome', 'no actions', 'nothing']


function isYes(text: string)  { return YES_WORDS.includes(text.toLowerCase().trim()) }
function isNo(text: string)   { return NO_WORDS.includes(text.toLowerCase().trim()) }
function isNA(text: string)   { return NA_WORDS.includes(text.toLowerCase().trim()) }
function isSkip(text: string) { return SKIP_WORDS.includes(text.toLowerCase().trim()) }
function isAuditTrigger(text: string) {
  const lower = text.toLowerCase().trim()
  return TRIGGER_WORDS.some(t => lower === t || lower.startsWith(t + ' '))
}
// Set on the audit itself (the builder's "ask for day or night shift" and "each audit is about").
function requiresShift(template: any)  { return !!template?.requires_shift }
function requiresSubject(template: any) { return (template?.subject_scope ?? 'none') !== 'none' }
function subjectPrompt(template: any) {
  const scope = template?.subject_scope
  return scope === 'resident' ? "Please enter the *resident's name or initials* for this audit:"
    : scope === 'staff' ? "Please enter the *staff member's name* for this audit:"
    : 'Please enter the *room number* for this checklist:'
}

// Parse a WhatsApp reply for the number, date, choice and rating question types. Returns the stored
// answer_value, or null when the reply cannot be read (the question is asked again).
function parseTypedReply(q: any, text: string): string | null {
  const t = text.trim()
  const s = q.settings ?? {}
  if (q.question_type === 'number') {
    const m = t.replace(',', '.').match(/-?\d+(\.\d+)?/)
    return m ? m[0] : null
  }
  if (q.question_type === 'date') {
    if (/^today$/i.test(t)) return new Date().toISOString().slice(0, 10)
    let m = t.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/)
    if (m) return `${m[1]}-${m[2].padStart(2, '0')}-${m[3].padStart(2, '0')}`
    m = t.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{2,4})$/)
    if (m) {
      const y = m[3].length === 2 ? `20${m[3]}` : m[3]
      const d = new Date(`${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}T00:00:00Z`)
      return isNaN(d.getTime()) ? null : d.toISOString().slice(0, 10)
    }
    return null
  }
  const options: string[] = (s.options ?? []).map((o: any) => o.label)
  const pick = (part: string) => {
    const n = parseInt(part, 10)
    if (String(n) === part.trim() && n >= 1 && n <= options.length) return options[n - 1]
    return options.find(o => o.toLowerCase() === part.trim().toLowerCase()) ?? null
  }
  if (q.question_type === 'choice') return pick(t)
  if (q.question_type === 'multi_choice') {
    const picked = t.split(/[,;]+/).map(pick)
    if (!picked.length || picked.some(x => x === null)) return null
    return JSON.stringify([...new Set(picked)])
  }
  if (q.question_type === 'rating') {
    const n = parseInt(t, 10), max = s.max_rating ?? 5
    return String(n) === t && n >= 1 && n <= max ? String(n) : null
  }
  return null
}

function fmtQuestion(q: any, qNum: number, total: number, sectionTitle: string): string {
  const qType = q.question_type ?? 'yes_no'
  let replyHint: string
  const na = q.settings?.allow_na ? ', or *n/a*' : ''
  const options: string[] = (q.settings?.options ?? []).map((o: any, i: number) => `*${i + 1}.* ${o.label}`)
  if (qType === 'yes_no_na')  replyHint = 'Reply *yes*, *no*, or *n/a*'
  else if (qType === 'findings')  replyHint = 'Reply with your *findings* (or *skip*)'
  else if (qType === 'free_text') replyHint = 'Reply with your *answer* (or *skip*)'
  else if (qType === 'number')    replyHint = `Reply with a *number*${q.settings?.unit ? ` in ${q.settings.unit}` : ''}${na}`
  else if (qType === 'date')      replyHint = `Reply with a *date*, e.g. 14/09/2026 or *today*${na}`
  else if (qType === 'choice')    replyHint = `${options.join('\n')}\n\nReply with the *number* of your answer${na}`
  else if (qType === 'multi_choice') replyHint = `${options.join('\n')}\n\nReply with the *numbers* that apply, separated by commas${na}`
  else if (qType === 'rating')    replyHint = `Reply with a *rating from 1 to ${q.settings?.max_rating ?? 5}*${na}`
  else                            replyHint = 'Reply *yes* or *no*'
  return [
    `📋 *Monthly Audit*`,
    `_${sectionTitle}_`,
    `_Question ${qNum} of ${total}_`,
    ``,
    q.question_text,
    ``,
    replyHint,
  ].join('\n')
}

function fmtOutcome(isFindings: boolean): string {
  return isFindings
    ? [`Any *actions & timescales* to record?`, `_Reply with text, or *skip*_`].join('\n')
    : [`✅ Noted.`, ``, `Any *outcome* to record for this item?`, `_Reply with text, or *skip*_`].join('\n')
}

function fmtActions(): string {
  return [`Any *actions to be taken*?`, `_Reply with text, or *skip*_`].join('\n')
}

async function getOrCreateActiveRun(tenantId: string, templateId: string): Promise<any> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const existing = await (prisma as any).auditRun.findFirst({
    where: { tenant_id: tenantId, template_id: templateId, status: 'in_progress' },
  })
  if (existing) return existing
  return (prisma as any).auditRun.create({
    data: { tenant_id: tenantId, template_id: templateId, audit_month: monthStart },
  })
}

// For shift/room templates: always create a fresh run so we can ask for context
// before deciding which run to attach to.
async function createFreshRun(tenantId: string, templateId: string): Promise<any> {
  const now = new Date()
  const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  return (prisma as any).auditRun.create({
    data: { tenant_id: tenantId, template_id: templateId, audit_month: monthStart },
  })
}

async function getRunWithQuestions(runId: string): Promise<{ run: any; flatQuestions: any[] }> {
  const raw = await (prisma as any).auditRun.findUnique({
    where:   { id: runId },
    include: { template: { include: SECTIONS_WITH_ALL_QUESTIONS }, answers: true },
  })
  if (!raw) return { run: null, flatQuestions: [] }
  const run = shapeRunTemplate(raw)

  const flatQuestions: Array<{ q: any; section: any; index: number }> = []
  for (const section of run.template.sections) {
    for (const q of section.questions) {
      flatQuestions.push({ q, section, index: flatQuestions.length })
    }
  }
  return { run, flatQuestions }
}

function findCurrentQuestion(flatQuestions: Array<{ q: any; section: any; index: number }>, answers: any[]) {
  const answeredIds = new Set(answers.map((a: any) => a.question_id))
  const byId = new Map<string, any>(flatQuestions.map(f => [f.q.id, f.q]))
  const answerMap = new Map<string, any>(answers.map((a: any) => [a.question_id, a]))
  // Questions hidden by a condition (for example "only if the answer above is No") are skipped.
  return flatQuestions.find(({ q }) => !answeredIds.has(q.id) && isVisible(q, byId, answerMap)) ?? null
}

// Audits the home can run, without the built-in audits it has hidden.
async function listTemplates(tenantId: string) {
  const [templates, tenant] = await Promise.all([
    (prisma as any).auditTemplate.findMany({ where: { is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }] }, orderBy: { name: 'asc' } }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { hidden_audit_templates: true } }),
  ])
  const hidden: string[] = tenant?.hidden_audit_templates ?? []
  return (templates as any[]).filter(t => t.tenant_id || !hidden.includes(t.id))
}

export async function handleAuditConversation(params: AuditConversationParams): Promise<{ handled: boolean }> {
  const { tenantId, userId, phoneNumber, incomingText, session, send } = params

  // ── User is in an active audit session ───────────────────────────────────────
  if (session.detected_category === 'audit' && session.audit_run_id) {
    const { run, flatQuestions } = await getRunWithQuestions(session.audit_run_id)
    if (!run) {
      // Run no longer exists — clear state
      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { detected_category: null, audit_run_id: null, audit_step: null },
      })
      return { handled: false }
    }

    const step    = session.audit_step ?? 'yn'
    // The follow-up steps (is No correct or a gap, outcome, actions) belong to the question that was
    // just answered, which is the most recently answered one, not the next unanswered question.
    const followUp = ['no_class', 'outcome', 'actions'].includes(step)
    const lastAnswered = followUp
      ? [...(run.answers as any[])].sort((a, b) => new Date(b.answered_at).getTime() - new Date(a.answered_at).getTime())[0]
      : null
    const current = followUp
      ? (flatQuestions.find(f => f.q.id === lastAnswered?.question_id) ?? findCurrentQuestion(flatQuestions, run.answers))
      : findCurrentQuestion(flatQuestions, run.answers)

    if (!current) {
      // All questions answered — prompt to complete
      await send(
        `🎉 *All questions answered!*\n\nYour audit progress is saved. Log in to CareStream to review, add your summary, and generate AI recommendations.\n\nhttps://app.carestreamai.co.uk/audits/${run.id}`
      )
      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { detected_category: null, audit_run_id: null, audit_step: null },
      })
      return { handled: true }
    }

    const { q, section } = current
    const total = flatQuestions.length

    const qType = q.question_type ?? 'yes_no'

    // ── Pause: 'stop' or 'pause' saves progress and unlocks the session ───────
    if (['stop', 'pause'].includes(incomingText.toLowerCase().trim())) {
      const hasAnswers = (run.answers as any[]).length > 0
      if (!hasAnswers) {
        // No answers yet (still at confirm/shift/room step) — cancel cleanly
        await (prisma as any).auditRun.delete({ where: { id: run.id } })
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
        await send("Audit cancelled. Send *audit* whenever you're ready to start.")
      } else {
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
        const answered = (run.answers as any[]).length
        await send(
          `⏸ *Audit paused.* Progress saved — ${answered} of ${total} questions answered.\n\nSend *audit* to continue where you left off.`
        )
      }
      return { handled: true }
    }

    // ── Confirmation step: user must say yes before questions begin ──────────
    if (step === 'confirm') {
      if (isYes(incomingText)) {
        if (requiresShift(run.template)) {
          await (prisma as any).whatsAppSession.update({
            where: { id: session.id },
            data:  { audit_step: 'shift' },
          })
          await send('Is this a *day shift* or *night shift* audit?\n\nReply *day* or *night*.')
        } else if (requiresSubject(run.template)) {
          await (prisma as any).whatsAppSession.update({
            where: { id: session.id },
            data:  { audit_step: 'room' },
          })
          await send(subjectPrompt(run.template))
        } else {
          await (prisma as any).whatsAppSession.update({
            where: { id: session.id },
            data:  { audit_step: 'yn' },
          })
          await send(fmtQuestion(q, current.index + 1, total, section.title))
        }
      } else if (isNo(incomingText)) {
        const hasAnswers = (run.answers as any[]).length > 0
        if (!hasAnswers) {
          await (prisma as any).auditRun.delete({ where: { id: run.id } })
        }
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
        await send(hasAnswers
          ? "No problem — your progress is saved. Send *audit* to resume when you're ready."
          : "Audit cancelled. Send *audit* whenever you're ready to start.")
      } else {
        await send('Please reply *yes* to begin or *no* to cancel the audit.')
      }
      return { handled: true }
    }

    // ── Shift step: Fire Marshall Checklist requires day/night selection ──────
    if (step === 'shift') {
      const lower = incomingText.toLowerCase().trim()
      const shift = (lower === 'day' || lower === '1') ? 'day'
        : (lower === 'night' || lower === '2') ? 'night'
        : null

      if (!shift) {
        await send('Please reply *day* or *night* to select the shift.')
        return { handled: true }
      }

      // Find an existing in_progress run for this template + shift (may differ from placeholder)
      const existingShiftRun = await (prisma as any).auditRun.findFirst({
        where: {
          tenant_id:   tenantId,
          template_id: run.template_id,
          status:      'in_progress',
          shift,
          id:          { not: run.id },
        },
      })

      let activeRunId = run.id
      if (existingShiftRun) {
        // Resume the existing shift run and discard the placeholder
        await (prisma as any).auditRun.delete({ where: { id: run.id } })
        activeRunId = existingShiftRun.id
      } else {
        await (prisma as any).auditRun.update({ where: { id: run.id }, data: { shift } })
      }

      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { audit_run_id: activeRunId, audit_step: 'yn' },
      })

      const { flatQuestions: fqs } = await getRunWithQuestions(activeRunId)
      const activeAnswers = await (prisma as any).auditAnswer.findMany({ where: { run_id: activeRunId } })
      const nextQ = findCurrentQuestion(fqs, activeAnswers)

      if (!nextQ) {
        const shiftLabel = shift === 'day' ? 'Day Shift' : 'Night Shift'
        await send(`The *${run.template.name}* (${shiftLabel}) for today is already complete. Log in to CareStream to view the report.`)
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
      } else {
        const shiftLabel = shift === 'day' ? 'Day Shift' : 'Night Shift'
        const totalQs = fqs.length
        const resumeNote = activeAnswers.length > 0
          ? `\n_Resuming — ${activeAnswers.length} of ${totalQs} already answered._`
          : ''
        await send(`✅ *${shiftLabel}* — starting *${run.template.name}*.${resumeNote}`)
        await send(fmtQuestion(nextQ.q, nextQ.index + 1, totalQs, nextQ.section.title))
      }
      return { handled: true }
    }

    // ── Room step: Resident Bedrooms requires a room number ───────────────────
    if (step === 'room') {
      const roomNumber = incomingText.trim()
      if (!roomNumber || roomNumber.length > 80) {
        await send(subjectPrompt(run.template))
        return { handled: true }
      }

      // Find an existing in_progress run for this template + room number
      const existingRoomRun = await (prisma as any).auditRun.findFirst({
        where: {
          tenant_id:   tenantId,
          template_id: run.template_id,
          status:      'in_progress',
          room_number: roomNumber,
          id:          { not: run.id },
        },
      })

      let activeRunId = run.id
      if (existingRoomRun) {
        await (prisma as any).auditRun.delete({ where: { id: run.id } })
        activeRunId = existingRoomRun.id
      } else {
        await (prisma as any).auditRun.update({ where: { id: run.id }, data: { room_number: roomNumber } })
      }

      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { audit_run_id: activeRunId, audit_step: 'yn' },
      })

      const { flatQuestions: fqs } = await getRunWithQuestions(activeRunId)
      const activeAnswers = await (prisma as any).auditAnswer.findMany({ where: { run_id: activeRunId } })
      const nextQ = findCurrentQuestion(fqs, activeAnswers)

      if (!nextQ) {
        await send(`The *${run.template.name}* for *${roomNumber}* is already complete. Log in to CareStream to view the report.`)
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
      } else {
        const totalQs = fqs.length
        const resumeNote = activeAnswers.length > 0
          ? `\n_Resuming — ${activeAnswers.length} of ${totalQs} already answered._`
          : ''
        await send(`✅ *${roomNumber}* — starting *${run.template.name}*.${resumeNote}`)
        await send(fmtQuestion(nextQ.q, nextQ.index + 1, totalQs, nextQ.section.title))
      }
      return { handled: true }
    }

    if (step === 'yn') {
      // findings / free_text questions skip the toggle — treat input as the findings text
      if (qType === 'findings' || qType === 'free_text') {
        const outcome = isSkip(incomingText) ? null : incomingText.trim()
        await (prisma as any).auditAnswer.upsert({
          where:  { run_id_question_id: { run_id: run.id, question_id: q.id } },
          create: { run_id: run.id, question_id: q.id, outcome_text: outcome },
          update: { outcome_text: outcome, answered_at: new Date() },
        })
        if (qType === 'free_text') {
          // free_text has no actions step — move straight to next question
          const updatedAnswers = await (prisma as any).auditAnswer.findMany({ where: { run_id: run.id } })
          const next = findCurrentQuestion(flatQuestions, updatedAnswers)
          if (next) {
            await (prisma as any).whatsAppSession.update({
              where: { id: session.id },
              data:  { audit_step: 'yn' },
            })
            await send(fmtQuestion(next.q, next.index + 1, total, next.section.title))
          } else {
            await send(`🎉 *All questions answered!*\n\nLog in to CareStream to review your answers, add your summary, and generate AI recommendations.`)
            await (prisma as any).whatsAppSession.update({
              where: { id: session.id },
              data:  { detected_category: null, audit_run_id: null, audit_step: null },
            })
          }
          return { handled: true }
        }
        // findings → go to actions step (no outcome prompt needed, this was the findings)
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { audit_step: 'actions' },
        })
        await send(fmtOutcome(true))
        return { handled: true }
      }

      if (!isYesNo(qType) && !isNarrative(qType)) {
        const na = !!q.settings?.allow_na && isNA(incomingText)
        const value = na ? null : parseTypedReply(q, incomingText)
        if (!na && value === null) {
          await send(`Sorry, I could not read that answer.\n\n${fmtQuestion(q, current.index + 1, total, section.title)}`)
          return { handled: true }
        }
        await (prisma as any).auditAnswer.upsert({
          where:  { run_id_question_id: { run_id: run.id, question_id: q.id } },
          create: { run_id: run.id, question_id: q.id, answer_value: value, answer_na: na },
          update: { answer_value: value, answer_na: na, answer_yn: null, answered_at: new Date() },
        })
        await (prisma as any).whatsAppSession.update({ where: { id: session.id }, data: { audit_step: 'outcome' } })
        await send(fmtOutcome(false))
        return { handled: true }
      }

      // yes_no / yes_no_na
      const acceptNA = qType === 'yes_no_na' && isNA(incomingText)
      if (isYes(incomingText) || isNo(incomingText) || acceptNA) {
        if (acceptNA) {
          await (prisma as any).auditAnswer.upsert({
            where:  { run_id_question_id: { run_id: run.id, question_id: q.id } },
            create: { run_id: run.id, question_id: q.id, answer_na: true },
            update: { answer_na: true, answer_yn: null, answered_at: new Date() },
          })
        } else {
          const yn = isYes(incomingText)
          await (prisma as any).auditAnswer.upsert({
            where:  { run_id_question_id: { run_id: run.id, question_id: q.id } },
            create: { run_id: run.id, question_id: q.id, answer_yn: yn, answer_na: false, no_compliant: null },
            update: { answer_yn: yn, answer_na: false, no_compliant: null, answered_at: new Date() },
          })
          if (!yn) {
            await (prisma as any).whatsAppSession.update({ where: { id: session.id }, data: { audit_step: 'no_class' } })
            await send('Is *No* the correct answer here, or a gap?\n\n*1.* No is the correct answer\n*2.* It is a gap (we do not have this or have not done it)')
            return { handled: true }
          }
        }
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { audit_step: 'outcome' },
        })
        await send(fmtOutcome(false))
        return { handled: true }
      } else {
        const hint = qType === 'yes_no_na' ? '*yes*, *no*, or *n/a*' : '*yes* or *no*'
        await send(`Please reply ${hint} for:\n\n_${q.question_text}_`)
        return { handled: true }
      }
    }

    if (step === 'no_class') {
      const t = incomingText.trim().toLowerCase()
      const compliant = t === '1' || t.startsWith('correct') ? true : t === '2' || t.startsWith('gap') ? false : null
      if (compliant === null) {
        await send('Please reply *1* if No is the correct answer, or *2* if it is a gap.')
        return { handled: true }
      }
      await (prisma as any).auditAnswer.update({
        where: { run_id_question_id: { run_id: run.id, question_id: q.id } },
        data:  { no_compliant: compliant, answered_at: new Date() },
      })
      await (prisma as any).whatsAppSession.update({ where: { id: session.id }, data: { audit_step: 'outcome' } })
      await send(fmtOutcome(false))
      return { handled: true }
    }

    if (step === 'outcome') {
      const outcome = isSkip(incomingText) ? null : incomingText.trim()
      await (prisma as any).auditAnswer.upsert({
        where:  { run_id_question_id: { run_id: run.id, question_id: q.id } },
        create: { run_id: run.id, question_id: q.id, outcome_text: outcome },
        update: { outcome_text: outcome, answered_at: new Date() },
      })
      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { audit_step: 'actions' },
      })
      await send(fmtActions())
      return { handled: true }
    }

    if (step === 'actions') {
      const actions = isSkip(incomingText) ? null : incomingText.trim()
      await (prisma as any).auditAnswer.upsert({
        where:  { run_id_question_id: { run_id: run.id, question_id: q.id } },
        create: { run_id: run.id, question_id: q.id, actions_text: actions },
        update: { actions_text: actions, answered_at: new Date() },
      })

      // Find next question
      const updatedAnswers = await (prisma as any).auditAnswer.findMany({ where: { run_id: run.id } })
      const next = findCurrentQuestion(flatQuestions, updatedAnswers)

      if (next) {
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { audit_step: 'yn' },
        })
        await send(fmtQuestion(next.q, next.index + 1, total, next.section.title))
      } else {
        await send(
          `🎉 *All questions answered!*\n\nLog in to CareStream to review your answers, add your summary, and generate AI recommendations.\n\nhttps://app.carestreamai.co.uk/audits/${run.id}`
        )
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
      }
      return { handled: true }
    }

    // Safety net — any unrecognised step still locks the session from the RAG pipeline
    return { handled: true }
  }

  // ── Trigger: user wants to start an audit ────────────────────────────────────
  if (isAuditTrigger(incomingText)) {
    const templates = await listTemplates(tenantId)

    if (templates.length === 0) {
      await send('No audit templates are set up yet. Please contact your administrator.')
      return { handled: true }
    }

    if (templates.length === 1) {
      // Only one template — start immediately
      const needsContext = requiresShift(templates[0]) || requiresSubject(templates[0])
      const run = needsContext
        ? await createFreshRun(tenantId, templates[0].id)
        : await getOrCreateActiveRun(tenantId, templates[0].id)
      const { flatQuestions } = await getRunWithQuestions(run.id)
      const existingAnswers   = await (prisma as any).auditAnswer.findMany({ where: { run_id: run.id } })
      const current           = findCurrentQuestion(flatQuestions, existingAnswers)

      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { detected_category: 'audit', audit_run_id: run.id, audit_step: 'confirm' },
      })

      if (!current) {
        await send(`Your *${templates[0].name}* for this month is already complete. Log in to CareStream to view the report.`)
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
      } else {
        const total = flatQuestions.length
        const resumeNote = existingAnswers.length > 0
          ? `\n_Resuming — ${existingAnswers.length} of ${total} questions already answered._`
          : `\n_${total} questions to complete._`
        await send(`📋 Ready to start *${templates[0].name}*?${resumeNote}\n\nReply *yes* to begin or *no* to cancel.`)
      }
      return { handled: true }
    }

    // Multiple templates — ask which one
    const list = templates.map((t: any, i: number) => `*${i + 1}.* ${t.name}`).join('\n')
    await send(`Which audit would you like to start?\n\n${list}\n\nReply with the number.`)

    await (prisma as any).whatsAppSession.update({
      where: { id: session.id },
      data:  { detected_category: 'audit_select', audit_run_id: null },
    })
    return { handled: true }
  }

  // ── Template selection reply ──────────────────────────────────────────────────
  if (session.detected_category === 'audit_select') {
    const templates = await listTemplates(tenantId)
    const idx = parseInt(incomingText.trim(), 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= templates.length) {
      const list = templates.map((t: any, i: number) => `*${i + 1}.* ${t.name}`).join('\n')
      await send(`Please reply with a number:\n\n${list}`)
      return { handled: true }
    }

    const chosen = templates[idx]
    const needsContext = requiresShift(chosen) || requiresSubject(chosen)
    const run    = needsContext
      ? await createFreshRun(tenantId, chosen.id)
      : await getOrCreateActiveRun(tenantId, chosen.id)
    const { flatQuestions } = await getRunWithQuestions(run.id)
    const existingAnswers   = await (prisma as any).auditAnswer.findMany({ where: { run_id: run.id } })
    const current           = findCurrentQuestion(flatQuestions, existingAnswers)

    await (prisma as any).whatsAppSession.update({
      where: { id: session.id },
      data:  { detected_category: 'audit', audit_run_id: run.id, audit_step: 'confirm' },
    })

    if (!current) {
      await send(`Your *${chosen.name}* for this month is already complete. Log in to CareStream to view the report.`)
      await (prisma as any).whatsAppSession.update({
        where: { id: session.id },
        data:  { detected_category: null, audit_run_id: null, audit_step: null },
      })
    } else {
      const total = flatQuestions.length
      const resumeNote = existingAnswers.length > 0
        ? `\n_Resuming — ${existingAnswers.length} of ${total} questions already answered._`
        : `\n_${total} questions to complete._`
      await send(`📋 Ready to start *${chosen.name}*?${resumeNote}\n\nReply *yes* to begin or *no* to cancel.`)
    }
    return { handled: true }
  }

  return { handled: false }
}
