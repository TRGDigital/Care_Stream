// WhatsApp audit conversation handler.
// Intercepts inbound messages when a user is mid-audit and routes accordingly.
// Returns { handled: true } if the message was consumed, { handled: false } to pass through.

import { prisma } from '../../db/client'

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

// Templates that require a shift selection (day/night) before starting
const SHIFT_REQUIRED_TEMPLATES = ['Fire Marshall Checklist']
// Templates that require a room number before starting
const ROOM_REQUIRED_TEMPLATES  = ['Resident Bedrooms']

function isYes(text: string)  { return YES_WORDS.includes(text.toLowerCase().trim()) }
function isNo(text: string)   { return NO_WORDS.includes(text.toLowerCase().trim()) }
function isNA(text: string)   { return NA_WORDS.includes(text.toLowerCase().trim()) }
function isSkip(text: string) { return SKIP_WORDS.includes(text.toLowerCase().trim()) }
function isAuditTrigger(text: string) {
  const lower = text.toLowerCase().trim()
  return TRIGGER_WORDS.some(t => lower === t || lower.startsWith(t + ' '))
}
function requiresShift(templateName: string)  { return SHIFT_REQUIRED_TEMPLATES.includes(templateName) }
function requiresRoom(templateName: string)   { return ROOM_REQUIRED_TEMPLATES.includes(templateName) }

function fmtQuestion(q: any, qNum: number, total: number, sectionTitle: string): string {
  const qType = q.question_type ?? 'yes_no'
  let replyHint: string
  if (qType === 'yes_no_na')  replyHint = 'Reply *yes*, *no*, or *n/a*'
  else if (qType === 'findings')  replyHint = 'Reply with your *findings* (or *skip*)'
  else if (qType === 'free_text') replyHint = 'Reply with your *answer* (or *skip*)'
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
  const run = await (prisma as any).auditRun.findUnique({
    where:   { id: runId },
    include: {
      template: {
        include: {
          sections: {
            orderBy: { section_order: 'asc' },
            include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } },
          },
        },
      },
      answers: true,
    },
  })
  if (!run) return { run: null, flatQuestions: [] }

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
  return flatQuestions.find(({ q }) => !answeredIds.has(q.id)) ?? null
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

    const current = findCurrentQuestion(flatQuestions, run.answers)
    const step    = session.audit_step ?? 'yn'

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
        const templateName = run.template?.name ?? ''
        if (requiresShift(templateName)) {
          await (prisma as any).whatsAppSession.update({
            where: { id: session.id },
            data:  { audit_step: 'shift' },
          })
          await send('Is this a *day shift* or *night shift* audit?\n\nReply *day* or *night*.')
        } else if (requiresRoom(templateName)) {
          await (prisma as any).whatsAppSession.update({
            where: { id: session.id },
            data:  { audit_step: 'room' },
          })
          await send('Please enter the *room number* for this checklist:')
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
      if (!roomNumber || roomNumber.length > 30) {
        await send('Please enter the room number (e.g. *12* or *Room 4A*).')
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
        await send(`The checklist for *Room ${roomNumber}* is already complete. Log in to CareStream to view the report.`)
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: null, audit_run_id: null, audit_step: null },
        })
      } else {
        const totalQs = fqs.length
        const resumeNote = activeAnswers.length > 0
          ? `\n_Resuming — ${activeAnswers.length} of ${totalQs} already answered._`
          : ''
        await send(`🛏️ *Room ${roomNumber}* — starting checklist.${resumeNote}`)
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
            create: { run_id: run.id, question_id: q.id, answer_yn: yn, answer_na: false },
            update: { answer_yn: yn, answer_na: false, answered_at: new Date() },
          })
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
    const templates = await (prisma as any).auditTemplate.findMany({
      where:   { is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }] },
      orderBy: { name: 'asc' },
    })

    if (templates.length === 0) {
      await send('No audit templates are set up yet. Please contact your administrator.')
      return { handled: true }
    }

    if (templates.length === 1) {
      // Only one template — start immediately
      const needsContext = requiresShift(templates[0].name) || requiresRoom(templates[0].name)
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
    const templates = await (prisma as any).auditTemplate.findMany({
      where:   { is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }] },
      orderBy: { name: 'asc' },
    })
    const idx = parseInt(incomingText.trim(), 10) - 1
    if (isNaN(idx) || idx < 0 || idx >= templates.length) {
      const list = templates.map((t: any, i: number) => `*${i + 1}.* ${t.name}`).join('\n')
      await send(`Please reply with a number:\n\n${list}`)
      return { handled: true }
    }

    const chosen = templates[idx]
    const needsContext = requiresShift(chosen.name) || requiresRoom(chosen.name)
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
