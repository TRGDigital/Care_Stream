// §8.1 — SendGrid Inbound Parse handler.
//
// Pipeline:
//  1. Resolve tenant from "to" address (policies@{slug}.carestreamai.co.uk)
//  2. Authenticate sender against tenant's staff list
//  3. Detect thread via Message-ID / In-Reply-To / References headers
//  4. Load active session or create new one (§8.4 — 7-day TTL)
//  5. Strip quoted replies from email body
//  6. Run RAG pipeline with full conversation history injected (§8.2)
//  7. Append both turns to session, extend TTL
//  8. Send reply via outbound.ts preserving thread headers

import { prisma } from '../../db/client'
import { runQueryPipeline } from '../rag/query'
import { sendEmailReply, sendRejectionEmail } from './outbound'
import { checkQueryLimit, PlanLimitError } from '../../lib/plan-limits'
import { handleTrainingConversation } from '../training/conversation'
import { classifyIntent, parseChoiceReply, EMAIL_CLARIFICATION_HTML } from '../intent/classifier'
import type { EmailMessage } from '../../types'

// ─── Payload type (SendGrid Inbound Parse fields) ─────────────────────────────

export interface InboundParsePayload {
  from:      string    // "Name <email@domain.com>"
  to:        string    // "policies@{slug}.carestreamai.co.uk"
  subject:   string
  text?:     string    // plain text body
  headers:   string    // raw RFC-2822 headers
  envelope?: string    // JSON {from, to[]}
}

// ─── Constants ────────────────────────────────────────────────────────────────

const SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000
const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'

// ─── Header / address parsing ─────────────────────────────────────────────────

function extractEmail(addr: string): string {
  const m = addr.match(/<([^>]+)>/)
  return (m ? m[1] : addr).trim().toLowerCase()
}

// Extract the first "policies@{slug}.carestreamai.co.uk" address from the "to" field.
function extractSlug(toField: string): string | null {
  const escapedDomain = INBOUND_DOMAIN.replace(/\./g, '\\.')
  const re = new RegExp(`policies@([^.]+)\\.${escapedDomain}`, 'i')
  const m  = toField.match(re)
  return m ? m[1] : null
}

function parseHeader(headers: string, name: string): string | null {
  const m = headers.match(new RegExp(`^${name}:\\s*(.+)$`, 'im'))
  return m ? m[1].trim() : null
}

function cleanMsgId(raw: string): string {
  return raw.replace(/[<>]/g, '').trim()
}

// Collect all candidate thread anchor IDs from In-Reply-To and References.
function candidateThreadIds(inReplyTo: string | null, references: string | null): string[] {
  const ids: string[] = []
  if (inReplyTo)  ids.push(...inReplyTo.split(/\s+/).map(cleanMsgId).filter(Boolean))
  if (references) ids.push(...references.split(/\s+/).map(cleanMsgId).filter(Boolean))
  return [...new Set(ids)]
}

// ─── Quoted-reply stripping ───────────────────────────────────────────────────

export function stripQuotedReplies(text: string): string {
  const lines = text.split('\n')
  const out: string[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    // "On [date] ... wrote:" — Outlook / Gmail quote prefix
    if (/^On .{5,} wrote:/.test(trimmed))         break
    // "-----Original Message-----" / Outlook separator line
    if (/^-{5,}[\w\s]*-*$/.test(trimmed))         break
    // Underscore separators (Outlook mobile / Hotmail)
    if (/^_{5,}/.test(trimmed))                    break
    // Skip individual > quoted lines
    if (trimmed.startsWith('>'))                   continue
    out.push(line)
  }

  return out.join('\n').trim()
}

// ─── Session helpers ──────────────────────────────────────────────────────────

function expiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_MS)
}

async function findActiveSession(candidates: string[]): Promise<any | null> {
  if (candidates.length === 0) return null
  return (prisma as any).emailSession.findFirst({
    where: { thread_id: { in: candidates }, expires_at: { gt: new Date() } },
  })
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleInboundEmail(payload: InboundParsePayload): Promise<void> {
  // 1. Resolve tenant from recipient address
  const slug = extractSlug(payload.to)
  if (!slug) {
    console.warn('[email/inbound] Unrecognised recipient address:', payload.to)
    return
  }

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { slug },
    select: { id: true, email_allowlist: true, response_style: true },
  })
  if (!tenant) {
    console.warn('[email/inbound] No tenant found for slug:', slug)
    return
  }

  // 2. Check email allowlist — silently drop emails not on the list
  const senderEmail  = extractEmail(payload.from)
  const allowlist    = (tenant.email_allowlist as string[]) ?? []

  if (allowlist.length > 0 && !allowlist.includes(senderEmail)) {
    console.warn('[email/inbound] Sender not on allowlist, discarding:', senderEmail)
    return
  }

  // 3. Look up registered user for personalisation (non-fatal — group/shared emails may not be registered)
  const user = await (prisma as any).user.findFirst({
    where:  { tenant_id: tenant.id, email: senderEmail },
    select: { id: true, name: true, email: true },
  })

  // If allowlist is empty (open) and sender is not a registered user, reject with guidance
  if (!user && allowlist.length === 0) {
    console.warn('[email/inbound] Unknown sender (no allowlist set):', senderEmail)
    await sendRejectionEmail(senderEmail, payload.subject || 'Your enquiry').catch(
      e => console.error('[email/inbound] Failed to send rejection:', e),
    )
    return
  }

  // 4. Thread detection
  const rawMessageId = parseHeader(payload.headers, 'Message-ID')
  const inReplyTo    = parseHeader(payload.headers, 'In-Reply-To')
  const references   = parseHeader(payload.headers, 'References')
  const messageId    = rawMessageId
    ? cleanMsgId(rawMessageId)
    : `${Date.now()}.${senderEmail}@carestreamai.co.uk`

  const candidates = candidateThreadIds(inReplyTo, references)
  let session = await findActiveSession(candidates)

  // 5. Create new session if no active thread found
  const isNew = !session
  if (isNew) {
    session = await (prisma as any).emailSession.create({
      data: {
        tenant_id:       tenant.id,
        user_id:         user?.id ?? null,
        thread_id:       messageId,
        subject:         payload.subject || '(no subject)',
        messages:        [],
        last_message_at: new Date(),
        expires_at:      expiresAt(),
      },
    })
  }

  // 6. Strip quoted replies
  const cleanBody = stripQuotedReplies(payload.text ?? '')
  if (!cleanBody) {
    console.warn('[email/inbound] Empty body after stripping quoted content — skipping')
    return
  }

  // 7. Build conversation history from prior session turns
  const priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    (session.messages as EmailMessage[]).map(m => ({
      role:    m.role,
      content: m.content,
    }))

  // Greeting name: registered user's first name, or the local-part of the email
  const staffName  = user?.name ?? senderEmail.split('@')[0]
  const firstName  = staffName.split(' ')[0] ?? staffName

  // 6.5 Training conversation — intercept A/B/C/D answers; attach pending question to normal replies
  const trainingSend = async (html: string) => {
    await sendEmailReply({
      to:             user?.email ?? senderEmail,
      subject:        session.subject as string,
      htmlBody:       html,
      threadId:       session.thread_id as string,
      citations:      [],
      staffFirstName: firstName,
    })
  }
  const trainingResult = await handleTrainingConversation({
    tenantId:     tenant.id,
    userId:       user?.id ?? null,
    incomingText: cleanBody,
    channel:      'email',
    send:         trainingSend,
  })
  if (trainingResult.handled) {
    console.log(`[email/inbound] Handled as training answer: sender=${senderEmail}`)
    return
  }

  // ─── Intent classification ────────────────────────────────────────────────
  // Resolve which pipeline to run. Persisted on the session so subsequent
  // turns in the same thread don't re-classify.

  let detectedCategory = session.detected_category as string | null

  if (!detectedCategory) {
    if (session.awaiting_clarification) {
      // User is replying to our "1/2/3" clarification message
      const choice = parseChoiceReply(cleanBody)
      if (choice) {
        detectedCategory = choice
        await (prisma as any).emailSession.update({
          where: { id: session.id },
          data:  { detected_category: choice, awaiting_clarification: false },
        })
      } else {
        // Still unclear — re-send clarification and wait
        await sendEmailReply({
          to:             user?.email ?? senderEmail,
          subject:        session.subject as string,
          htmlBody:       EMAIL_CLARIFICATION_HTML,
          threadId:       session.thread_id as string,
          citations:      [],
          staffFirstName: firstName,
        })
        console.log(`[email/inbound] Re-sent clarification to ${senderEmail}`)
        return
      }
    } else {
      // First message — classify from subject + body
      const intent = await classifyIntent(cleanBody, payload.subject)
      if (intent === 'unclear') {
        // Ask the user to clarify, mark session as waiting
        await (prisma as any).emailSession.update({
          where: { id: session.id },
          data:  { awaiting_clarification: true },
        })
        await sendEmailReply({
          to:             user?.email ?? senderEmail,
          subject:        session.subject as string,
          htmlBody:       EMAIL_CLARIFICATION_HTML,
          threadId:       session.thread_id as string,
          citations:      [],
          staffFirstName: firstName,
        })
        console.log(`[email/inbound] Intent unclear — sent clarification to ${senderEmail}`)
        return
      }
      detectedCategory = intent
      await (prisma as any).emailSession.update({
        where: { id: session.id },
        data:  { detected_category: intent },
      })
    }
  }

  // Check monthly query limit before running the pipeline
  try {
    await checkQueryLimit(tenant.id)
  } catch (e) {
    if (e instanceof PlanLimitError) {
      await sendRejectionEmail(
        senderEmail,
        'Monthly query limit reached',
      ).catch(() => {})
      console.warn(`[email/inbound] Query limit reached for tenant=${tenant.id}`)
      return
    }
    throw e
  }

  // Run RAG pipeline with full conversation history (§8.2)
  const result = await runQueryPipeline({
    queryText:           cleanBody,
    tenantId:            tenant.id,
    userId:              user?.id ?? null,
    staffName,
    channel:             'email',
    selectedCategory:    (detectedCategory as any) ?? undefined,
    conversationHistory: priorMessages,
    responseStyle:       (tenant.response_style as 'standard' | 'concise') ?? 'standard',
  })

  // 7. Append both turns to the session
  const now = new Date()
  const userTurn: EmailMessage = {
    role:             'user',
    content:          cleanBody,
    timestamp:        now.toISOString(),
    policy_ids_cited: [],
  }
  const assistantTurn: EmailMessage = {
    role:             'assistant',
    content:          result.responseHtml,
    timestamp:        now.toISOString(),
    policy_ids_cited: result.citations.map(c => c.policy_id),
  }

  await (prisma as any).emailSession.update({
    where: { id: session.id },
    data: {
      messages:        [
        ...(session.messages as EmailMessage[]),
        userTurn,
        assistantTurn,
      ],
      last_message_at: now,
      expires_at:      expiresAt(),
    },
  })

  // 8. Send reply
  await sendEmailReply({
    to:             user?.email ?? senderEmail,
    subject:        session.subject as string,
    htmlBody:       result.responseHtml,
    threadId:       session.thread_id as string,
    citations:      result.citations,
    staffFirstName: firstName,
    queryId:        result.queryId ?? undefined,
  })

  console.log(
    `[email/inbound] Processed: sender=${senderEmail} session=${session.id}` +
    ` new=${isNew} responseMs=${result.responseTimeMs}`,
  )
}
