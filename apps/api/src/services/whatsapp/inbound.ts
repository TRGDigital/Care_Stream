// WhatsApp inbound message handler.
//
// Pipeline (mirrors email/inbound.ts):
//  1. Normalise sender phone number from Twilio payload
//  2. Resolve tenant — sandbox: lookup phone in phone_allowlist across all tenants
//                      production: match To number against tenant.twilio_whatsapp_number
//  3. Validate sender is on tenant's phone_allowlist
//  4. Load active WhatsAppSession (24-hour TTL) or create a new one
//  5. Run RAG pipeline with conversation history
//  6. Append both turns to session, extend TTL
//  7. Convert HTML response to WhatsApp text and send via Twilio REST API

import twilio from 'twilio'
import OpenAI from 'openai'
import { prisma } from '../../db/client'
import { recordCostUsd } from '../../lib/token-usage'
import { runQueryPipeline } from '../rag/query'
import { checkQueryLimit, PlanLimitError } from '../../lib/plan-limits'
import { htmlToWhatsApp, splitIntoChunks } from '../../utils/htmlToWhatsApp'
import { handleTrainingConversation } from '../training/conversation'
import { handleAuditConversation } from '../audit/conversation'
import { classifyIntent, parseChoiceReply, WHATSAPP_CLARIFICATION } from '../intent/classifier'
import { signFeedbackToken } from '../../lib/feedback-token'
import type { EmailMessage } from '../../types'

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const SESSION_TTL_MS = 24 * 60 * 60 * 1000   // 24-hour WhatsApp session window

const twilioClient = twilio(
  process.env.TWILIO_ACCOUNT_SID,
  process.env.TWILIO_AUTH_TOKEN,
)

const PLATFORM_WHATSAPP_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER ?? ''

// ─── Payload type (Twilio WhatsApp webhook fields) ────────────────────────────

export interface TwilioWhatsAppPayload {
  From:        string         // "whatsapp:+447539000065"
  To:          string         // "whatsapp:+14155238886"
  Body:        string         // message text (empty for voice notes)
  MessageSid:  string
  AccountSid:  string
  mediaUrl:    string | null  // Twilio MediaUrl0 for voice notes
  mediaType:   string | null  // e.g. "audio/ogg; codecs=opus"
  isVoiceNote: boolean
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

// Strip the "whatsapp:" prefix Twilio prepends to all numbers
function normaliseNumber(raw: string): string {
  return raw.replace(/^whatsapp:/i, '').trim()
}

function expiresAt(): Date {
  return new Date(Date.now() + SESSION_TTL_MS)
}

async function findActiveSession(tenantId: string, phoneNumber: string): Promise<any | null> {
  return (prisma as any).whatsAppSession.findFirst({
    where: {
      tenant_id:    tenantId,
      phone_number: phoneNumber,
      expires_at:   { gt: new Date() },
    },
  })
}

// ─── Tenant resolution ────────────────────────────────────────────────────────

// Sandbox: find the tenant whose phone_allowlist contains this sender number.
// Production: match the incoming To number against tenant.twilio_whatsapp_number.
async function resolveTenant(fromNumber: string, toNumber: string): Promise<any | null> {
  // Production path — tenant has their own dedicated Twilio number
  const byOwnNumber = await (prisma as any).tenant.findFirst({
    where: { twilio_whatsapp_number: toNumber },
    select: { id: true, phone_allowlist: true, branding_signoff: true, response_style: true },
  })
  if (byOwnNumber) return byOwnNumber

  // Sandbox path — shared platform number, resolve by sender being on an allowlist
  const byAllowlist = await (prisma as any).tenant.findFirst({
    where: { phone_allowlist: { has: fromNumber } },
    select: { id: true, phone_allowlist: true, branding_signoff: true, response_style: true },
  })
  return byAllowlist ?? null
}

// ─── Outbound send ────────────────────────────────────────────────────────────

async function sendWhatsAppReply(to: string, body: string): Promise<void> {
  await twilioClient.messages.create({
    from: `whatsapp:${PLATFORM_WHATSAPP_NUMBER}`,
    to:   `whatsapp:${to}`,
    body,
  })
}

// Uses OpenAI to generate a ≤20-char button label for each follow-up question.
// Falls back to word-chop if the API call fails.
// Called before chunk sending so the result is ready by the time we need it.
async function generateButtonLabels(questions: string[]): Promise<string[]> {
  try {
    const res = await openai.chat.completions.create({
      model:       'gpt-4o-mini',
      temperature: 0,
      max_tokens:  80,
      messages: [
        {
          role:    'system',
          content:
            'You label WhatsApp quick-reply buttons. For each numbered question ' +
            'write a short label summarising it in ≤20 characters. ' +
            'Use plain words, no punctuation. Return one label per line, numbered.',
        },
        {
          role:    'user',
          content: questions.map((q, i) => `${i + 1}. ${q}`).join('\n'),
        },
      ],
    })
    const lines = (res.choices[0].message.content ?? '')
      .split('\n')
      .map(l => {
        const raw = l.replace(/^\d+[.)]\s*/, '').trim()
        if (raw.length <= 20) return raw
        // Snap to last complete word within the 20-char limit
        const words = raw.split(' ')
        let label = ''
        for (const w of words) {
          const candidate = label ? `${label} ${w}` : w
          if (candidate.length > 20) break
          label = candidate
        }
        return label || raw.slice(0, 20)
      })
      .filter(Boolean)
    const labels = questions.map((q, i) => lines[i] ?? q.slice(0, 20))
    console.log('[whatsapp/inbound] Button labels:', labels)
    return labels
  } catch (e) {
    console.error('[whatsapp/inbound] Failed to generate button labels, using fallback:', e)
    return questions.map(q => {
      const words = q.replace(/[?!]$/, '').split(/\s+/)
      let label = ''
      for (const word of words) {
        const candidate = label ? `${label} ${word}` : word
        if (candidate.length > 20) break
        label = candidate
      }
      return label || q.slice(0, 20)
    })
  }
}

// Sends a quick-reply message with up to 3 tappable follow-up question buttons.
// The button `id` is the full question text — when tapped WhatsApp sends it as
// the next incoming message, which the inbound pipeline handles as a normal query.
// The Content Template is deleted after sending to avoid accumulation.
// labels are pre-generated by generateButtonLabels() before this is called.
async function sendFollowUpButtons(to: string, questions: string[], labels: string[]): Promise<void> {
  if (questions.length === 0) return

  const body =
    '💡 *You might also want to ask:*\n\n' +
    questions.map((q, i) => `${i + 1}. ${q}`).join('\n')

  const actions = questions.slice(0, 3).map((q, i) => ({
    title: labels[i] ?? q.slice(0, 20),
    id:    q.slice(0, 256),
  }))

  let contentSid: string | undefined
  try {
    const basicAuth = Buffer.from(
      `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
    ).toString('base64')

    // Create the Content Template via REST — the SDK wrapper serialises incorrectly
    const createRes = await fetch('https://content.twilio.com/v1/Content', {
      method: 'POST',
      headers: {
        Authorization:  `Basic ${basicAuth}`,
        'Content-Type': 'application/json',
        Accept:         'application/json',
      },
      body: JSON.stringify({
        friendly_name: `followup-${Date.now()}`,
        language:      'en',
        types: {
          'twilio/quick-reply': { body, actions },
        },
      }),
    })

    if (!createRes.ok) {
      const errText = await createRes.text()
      throw new Error(`Content API ${createRes.status}: ${errText}`)
    }

    const created = await createRes.json() as { sid: string }
    contentSid = created.sid

    await twilioClient.messages.create({
      from:       `whatsapp:${PLATFORM_WHATSAPP_NUMBER}`,
      to:         `whatsapp:${to}`,
      contentSid,
    } as any)
  } catch (e) {
    console.error('[whatsapp/inbound] Failed to send follow-up buttons:', e)
  } finally {
    if (contentSid) {
      const basicAuth = Buffer.from(
        `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
      ).toString('base64')
      await fetch(`https://content.twilio.com/v1/Content/${contentSid}`, {
        method:  'DELETE',
        headers: { Authorization: `Basic ${basicAuth}` },
      }).catch(() => {})
    }
  }
}

// ─── Voice note transcription ─────────────────────────────────────────────────

async function transcribeVoiceNote(mediaUrl: string, mediaType: string): Promise<string> {
  // Download audio from Twilio — requires Basic Auth with Account SID + Auth Token
  const auth = Buffer.from(
    `${process.env.TWILIO_ACCOUNT_SID}:${process.env.TWILIO_AUTH_TOKEN}`
  ).toString('base64')

  const audioRes = await fetch(mediaUrl, {
    headers: { Authorization: `Basic ${auth}` },
  })
  if (!audioRes.ok) {
    throw new Error(`Audio download failed: ${audioRes.status}`)
  }

  const audioBuffer = Buffer.from(await audioRes.arrayBuffer())

  // Derive a sensible filename extension from the MIME type
  const ext = mediaType.includes('ogg') ? 'ogg'
    : mediaType.includes('mp4') || mediaType.includes('m4a') ? 'mp4'
    : mediaType.includes('wav') ? 'wav'
    : mediaType.includes('webm') ? 'webm'
    : 'ogg'

  const file = new File([audioBuffer], `voice.${ext}`, { type: mediaType })

  const result = await openai.audio.transcriptions.create({
    file,
    model:    'whisper-1',
    language: 'en',  // Whisper auto-detects but this speeds it up for English
  })
  // Whisper is billed at $0.006/minute. We don't have exact duration here, so record a modest
  // per-voice-note estimate (about one minute) so voice transcription still shows in the cost log.
  recordCostUsd('whisper-1', 0.006)

  return result.text.trim()
}

async function sendRejectionMessage(to: string): Promise<void> {
  const body =
    "Hi — your number isn't registered with CareStreamAI. " +
    'Ask your manager to add it in the settings and try again.'
  await sendWhatsAppReply(to, body).catch(e =>
    console.error('[whatsapp/inbound] Failed to send rejection:', e),
  )
}

// ─── Main handler ─────────────────────────────────────────────────────────────

export async function handleInboundWhatsApp(payload: TwilioWhatsAppPayload): Promise<void> {
  const fromNumber = normaliseNumber(payload.From)
  const toNumber   = normaliseNumber(payload.To)
  let   body       = payload.Body?.trim()
  let   voiceTranscript: string | null = null

  // Transcribe voice note if present
  if (payload.isVoiceNote && payload.mediaUrl && payload.mediaType) {
    console.log('[whatsapp/inbound] Voice note received — transcribing...')
    try {
      voiceTranscript = await transcribeVoiceNote(payload.mediaUrl, payload.mediaType)
      body = voiceTranscript
      console.log(`[whatsapp/inbound] Transcript: "${body}"`)
    } catch (e) {
      console.error('[whatsapp/inbound] Transcription failed:', e)
      await sendWhatsAppReply(fromNumber,
        "Sorry, I couldn't make out your voice message. Please try again or type your question."
      ).catch(() => {})
      return
    }
  }

  if (!body) {
    console.warn('[whatsapp/inbound] Empty message body — ignoring')
    return
  }

  // 1. Resolve tenant
  const tenant = await resolveTenant(fromNumber, toNumber)
  if (!tenant) {
    console.warn('[whatsapp/inbound] Could not resolve tenant for:', fromNumber)
    await sendRejectionMessage(fromNumber)
    return
  }

  // 2. Validate sender is on allowlist
  const allowlist = (tenant.phone_allowlist as string[]) ?? []
  if (allowlist.length > 0 && !allowlist.includes(fromNumber)) {
    console.warn('[whatsapp/inbound] Sender not on phone allowlist:', fromNumber)
    await sendRejectionMessage(fromNumber)
    return
  }

  // 3. Look up registered user by phone number (non-fatal — many staff won't have one yet)
  const user = await (prisma as any).user.findFirst({
    where:  { tenant_id: tenant.id, phone_number: fromNumber },
    select: { id: true, name: true },
  }).catch(() => null)  // phone_number field may not exist yet on all deployments

  const staffName = user?.name ?? fromNumber

  // 3.5 Training conversation — intercept A/B/C/D answers; append pending question to normal replies
  const trainingSend = async (text: string) => {
    const chunks = splitIntoChunks(text)
    for (let i = 0; i < chunks.length; i++) {
      if (i > 0) await new Promise(r => setTimeout(r, 500))
      await sendWhatsAppReply(fromNumber, chunks[i])
    }
  }
  const trainingResult = await handleTrainingConversation({
    tenantId:     tenant.id,
    userId:       user?.id ?? null,
    incomingText: body,
    channel:      'whatsapp',
    send:         trainingSend,
  })
  if (trainingResult.handled) {
    console.log(`[whatsapp/inbound] Handled as training answer: from=${fromNumber}`)
    return
  }

  // 4. Load or create session
  let session = await findActiveSession(tenant.id, fromNumber)
  const isNew = !session

  if (isNew) {
    session = await (prisma as any).whatsAppSession.create({
      data: {
        tenant_id:      tenant.id,
        phone_number:   fromNumber,
        messages:       [],
        last_message_at: new Date(),
        expires_at:     expiresAt(),
      },
    })
  }

  // 3.6 Audit conversation — runs before intent classification so active audit sessions
  // lock the pipeline and policy RAG can never interrupt a mid-audit message.
  {
    const auditSend = async (text: string) => { await sendWhatsAppReply(fromNumber, text) }
    const auditResult = await handleAuditConversation({
      tenantId:     tenant.id,
      userId:       user?.id ?? null,
      phoneNumber:  fromNumber,
      incomingText: body,
      session,
      send:         auditSend,
    })
    if (auditResult.handled) {
      console.log(`[whatsapp/inbound] Handled as audit conversation: from=${fromNumber}`)
      return
    }
  }

  // 5. Build conversation history from prior session turns
  const priorMessages: Array<{ role: 'user' | 'assistant'; content: string }> =
    (session.messages as EmailMessage[]).map(m => ({
      role:    m.role,
      content: m.content,
    }))

  // ─── Intent classification ────────────────────────────────────────────────
  // Persisted on the session so subsequent messages in the same window
  // don't re-classify. Voice notes skip the clarification flow and go
  // straight to AI classification (can't type 1/2/3 in a voice note).

  let detectedCategory = session.detected_category as string | null

  if (!detectedCategory) {
    if (!voiceTranscript && session.awaiting_clarification) {
      // User is replying to our "1/2/3" clarification message
      const choice = parseChoiceReply(body)
      if (choice) {
        detectedCategory = choice
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: choice, awaiting_clarification: false },
        })
      } else {
        // Still unclear — re-send clarification and wait
        await sendWhatsAppReply(fromNumber, WHATSAPP_CLARIFICATION).catch(() => {})
        console.log(`[whatsapp/inbound] Re-sent clarification to ${fromNumber}`)
        return
      }
    } else {
      // Classify message (or transcript for voice notes)
      const intent = await classifyIntent(body)
      if (intent === 'unclear' && !voiceTranscript) {
        // Ask the user to clarify, mark session as waiting
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { awaiting_clarification: true },
        })
        await sendWhatsAppReply(fromNumber, WHATSAPP_CLARIFICATION).catch(() => {})
        console.log(`[whatsapp/inbound] Intent unclear — sent clarification to ${fromNumber}`)
        return
      }
      // For voice notes where intent is unclear, fall through to general policy path
      if (intent !== 'unclear') {
        detectedCategory = intent
        await (prisma as any).whatsAppSession.update({
          where: { id: session.id },
          data:  { detected_category: intent },
        })
      }
    }
  }

  // 6. Check monthly query limit before running the pipeline
  try {
    await checkQueryLimit(tenant.id)
  } catch (e) {
    if (e instanceof PlanLimitError) {
      await sendWhatsAppReply(
        fromNumber,
        'Your organisation has reached its monthly query limit. Please ask your manager to upgrade the plan.',
      ).catch(() => {})
      console.warn(`[whatsapp/inbound] Query limit reached for tenant=${tenant.id}`)
      return
    }
    throw e
  }

  // 7. Run RAG pipeline
  const result = await runQueryPipeline({
    queryText:           body,
    tenantId:            tenant.id,
    userId:              user?.id ?? null,
    staffName,
    channel:             voiceTranscript ? 'voice' : 'whatsapp',
    selectedCategory:    (detectedCategory as any) ?? undefined,
    conversationHistory: priorMessages,
    responseStyle:       (tenant.response_style as 'standard' | 'concise') ?? 'standard',
  })

  // 7. Append turns to session
  const now = new Date()
  const userTurn: EmailMessage = {
    role:             'user',
    content:          body,
    timestamp:        now.toISOString(),
    policy_ids_cited: [],
  }
  const assistantTurn: EmailMessage = {
    role:             'assistant',
    content:          result.responseHtml,
    timestamp:        now.toISOString(),
    policy_ids_cited: result.citations.map(c => c.policy_id),
  }

  await (prisma as any).whatsAppSession.update({
    where: { id: session.id },
    data: {
      messages: [
        ...(session.messages as EmailMessage[]),
        userTurn,
        assistantTurn,
      ],
      last_message_at: now,
      expires_at:      expiresAt(),
    },
  })

  // 8. Convert HTML → WhatsApp text, split into chunks, and send sequentially.
  //    Training questions are sent as a separate message AFTER the policy reply
  //    so they don't fragment the main response or arrive out of order.
  //    Start label generation NOW so it runs in parallel with chunk sending.
  let replyText = htmlToWhatsApp(result.responseHtml)
  if (voiceTranscript) {
    replyText = `🎤 _I heard: "${voiceTranscript}"_\n\n${replyText}`
  }

  const labelPromise = result.suggestedQuestions.length > 0
    ? generateButtonLabels(result.suggestedQuestions.slice(0, 3))
    : Promise.resolve([] as string[])

  const chunks = splitIntoChunks(replyText)
  let chunkError: unknown = null
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise(resolve => setTimeout(resolve, 1000))
    try {
      await sendWhatsAppReply(fromNumber, chunks[i])
    } catch (e) {
      console.error(`[whatsapp/inbound] Failed to send chunk ${i + 1}/${chunks.length}:`, e)
      chunkError = e
      break
    }
  }

  // Send follow-up buttons — wait 3 s after the final chunk so WhatsApp
  // delivers all text messages before the button message arrives.
  if (result.suggestedQuestions.length > 0) {
    const [labels] = await Promise.all([
      labelPromise,
      new Promise<void>(r => setTimeout(r, 3000)),
    ])
    await sendFollowUpButtons(fromNumber, result.suggestedQuestions, labels)
  }


  // Send one-click feedback link after a 5-minute delay.
  // If the user sends another message before the timer fires, skip it —
  // the query timestamp is captured now so we can compare later.
  if (result.queryId) {
    const API_BASE   = process.env.API_BASE_URL ?? 'https://api.carestreamai.co.uk'
    const posSig     = signFeedbackToken(result.queryId, 'positive')
    const negSig     = signFeedbackToken(result.queryId, 'negative')
    const posUrl     = `${API_BASE}/feedback/${result.queryId}/positive?sig=${posSig}`
    const negUrl     = `${API_BASE}/feedback/${result.queryId}/negative?sig=${negSig}`
    const feedbackMsg = `_Was this helpful?_\n👍 ${posUrl}\n👎 ${negUrl}`
    const querySentAt = new Date()

    setTimeout(async () => {
      try {
        // Only send if the session hasn't had any new activity in the last 5 minutes
        const current = await (prisma as any).whatsAppSession.findFirst({
          where: { tenant_id: tenant.id, phone_number: fromNumber },
          select: { last_message_at: true },
        })
        if (current && current.last_message_at > querySentAt) return
        await sendWhatsAppReply(fromNumber, feedbackMsg)
      } catch (e) {
        console.error('[whatsapp/inbound] Failed to send deferred feedback prompt:', e)
      }
    }, 5 * 60 * 1000)
  }

  if (chunkError) throw chunkError

  console.log(
    `[whatsapp/inbound] Processed: from=${fromNumber} tenant=${tenant.id}` +
    ` new=${isNew} responseMs=${result.responseTimeMs}`,
  )
}
