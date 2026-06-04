// Proactive training question delivery — runs when question_trigger = 'auto'.
//
// Called fire-and-forget from POST /training/enroll immediately after enrollments
// are created. For each new enrollment it sends the first question to the staff
// member via their registered WhatsApp number, falling back to email.

import twilio from 'twilio'
import sgMail from '@sendgrid/mail'
import { prisma } from '../../db/client'
import { splitIntoChunks } from '../../utils/htmlToWhatsApp'
import { fmtQuestionWA, fmtQuestionEmail } from './conversation'
import { translateTrainingQuestion, langName } from '../../lib/translate'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WA_NUMBER      = process.env.TWILIO_WHATSAPP_NUMBER ?? ''

// ─── Transport helpers ────────────────────────────────────────────────────────

async function sendWhatsAppMessage(to: string, body: string): Promise<void> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const chunks = splitIntoChunks(body)
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 500))
    await client.messages.create({
      from: `whatsapp:${WA_NUMBER}`,
      to:   `whatsapp:${to}`,
      body: chunks[i],
    })
  }
}

async function sendTrainingEmailDirect({
  to,
  subject,
  htmlBody,
  replyTo,
  firstName,
}: {
  to:        string
  subject:   string
  htmlBody:  string
  replyTo:   string
  firstName: string
}): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)

  const from = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`

  const html = `
<div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <p>Hi ${firstName},</p>
  <p style="color:#374151">
    Your manager has assigned you a training module. Please answer the question below
    by replying to this email with a single letter — A, B, C, or D.
  </p>
  ${htmlBody}
  <p style="color:#aaa;font-size:12px;margin-top:32px">
    Questions? Contact your manager or reply with your question to reach the CareStreamAI assistant.
  </p>
</div>`.trim()

  await (sgMail as any).send({
    to,
    from,
    replyTo,
    subject: `Training – ${subject}`,
    html,
  })
}

// ─── Main export ──────────────────────────────────────────────────────────────

export async function sendProactiveTrainingQuestions(
  tenantId:  string,
  userIds:   string[],
  moduleIds: string[],
): Promise<void> {
  // Load tenant settings + slug
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { training_settings: true, slug: true },
  })

  const settings = (tenant?.training_settings as any) ?? {}
  if (settings.question_trigger !== 'auto') return

  const replyTo = `policies@${tenant.slug}.${INBOUND_DOMAIN}`

  // Prefetch all users and all relevant not-started enrollments in two queries,
  // then iterate the combinations in memory — avoids an N×M query fan-out.
  const [users, enrollments] = await Promise.all([
    (prisma as any).user.findMany({
      where:  { id: { in: userIds } },
      select: { id: true, name: true, email: true, phone_number: true, first_language: true },
    }).catch(() => [] as any[]),
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: { in: userIds }, module_id: { in: moduleIds }, status: 'not_started' },
      include: { module: { select: { name: true, questions: true } } },
    }).catch(() => [] as any[]),
  ])
  const userById = new Map<string, any>(users.map((u: any) => [u.id, u]))
  const enrollmentByKey = new Map<string, any>(enrollments.map((e: any) => [`${e.user_id}:${e.module_id}`, e]))

  for (const userId of userIds) {
    for (const moduleId of moduleIds) {
      try {
        const user       = userById.get(userId)
        const enrollment = enrollmentByKey.get(`${userId}:${moduleId}`)

        if (!user || !enrollment) continue

        const questions = (enrollment.module.questions as any[]) ?? []
        if (questions.length === 0) {
          console.log(`[training/proactive] Module ${moduleId} has no questions — skipping`)
          continue
        }

        const firstQ      = questions[0]
        const firstName   = (user.name as string ?? '').split(' ')[0] || 'there'
        const total       = questions.length
        const name        = enrollment.module.name as string
        const userLang    = (user.first_language as string) ?? 'eng'

        const translatedQ = await translateTrainingQuestion(
          { text: firstQ.text, options: (firstQ.options as string[]) ?? [] },
          userLang,
        )
        const questionForFmt = { ...firstQ, text: translatedQ.text, options: translatedQ.options }

        if (user.phone_number) {
          const text = fmtQuestionWA(questionForFmt, 0, total, name)
          await sendWhatsAppMessage(user.phone_number as string, text)
          console.log(`[training/proactive] WA question sent: user=${userId} module=${moduleId} lang=${userLang}`)
        } else if (user.email) {
          const html = fmtQuestionEmail(questionForFmt, 0, total, name)
          await sendTrainingEmailDirect({
            to:        user.email as string,
            subject:   name,
            htmlBody:  html,
            replyTo,
            firstName,
          })
          console.log(`[training/proactive] Email question sent: user=${userId} module=${moduleId}`)
        } else {
          console.log(`[training/proactive] No contact info for user=${userId}`)
        }
      } catch (e) {
        console.error(`[training/proactive] Failed for user=${userId} module=${moduleId}:`, e)
      }
    }
  }
}
