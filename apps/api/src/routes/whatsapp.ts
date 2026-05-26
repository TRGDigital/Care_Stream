import { Router, Request, Response } from 'express'
import twilio from 'twilio'
import { handleInboundWhatsApp } from '../services/whatsapp/inbound'
import type { TwilioWhatsAppPayload } from '../services/whatsapp/inbound'

// Mounted at /whatsapp in app.ts BEFORE requireAuth — this is an unauthenticated
// Twilio webhook, not a tenant-JWT-protected route.

export const whatsappRouter = Router()

// ─── POST /whatsapp/inbound ───────────────────────────────────────────────────
// Twilio WhatsApp webhook.
//
// IMPORTANT: Return HTTP 200 immediately — Twilio retries on any non-200 response.
// Processing runs asynchronously; replies are sent via the Twilio REST API in
// handleInboundWhatsApp(), not via TwiML in this response.
//
// Signature validation: enabled in production (TWILIO_AUTH_TOKEN must be set).
// In development (NODE_ENV !== 'production') validation is skipped so you can
// test without a public URL.

function buildWebhookValidator() {
  const authToken = process.env.TWILIO_AUTH_TOKEN
  if (!authToken) return null
  return twilio.webhook({ protocol: 'https' })
}

const twilioWebhook = buildWebhookValidator()

whatsappRouter.post(
  '/inbound',
  // Apply Twilio signature validation in production only
  (req: Request, res: Response, next) => {
    if (process.env.NODE_ENV === 'production' && twilioWebhook) {
      return twilioWebhook(req, res, next)
    }
    next()
  },
  (req: Request, res: Response) => {
    // Acknowledge immediately
    res.status(200).send('<Response></Response>')

    const numMedia       = parseInt(req.body.NumMedia ?? '0', 10)
    const mediaUrl       = req.body.MediaUrl0       ?? null
    const mediaType      = req.body.MediaContentType0 ?? null
    const isVoiceNote    = numMedia > 0 && typeof mediaType === 'string' && mediaType.startsWith('audio/')

    const payload: TwilioWhatsAppPayload = {
      From:          req.body.From       ?? '',
      To:            req.body.To         ?? '',
      Body:          req.body.Body       ?? '',
      MessageSid:    req.body.MessageSid ?? '',
      AccountSid:    req.body.AccountSid ?? '',
      mediaUrl:      mediaUrl,
      mediaType:     mediaType,
      isVoiceNote:   isVoiceNote,
    }

    if (!payload.From || (!payload.Body && !isVoiceNote)) {
      console.warn('[whatsapp/inbound] Missing From and no text/voice content — ignoring')
      return
    }

    handleInboundWhatsApp(payload).catch(e => {
      console.error('[whatsapp/inbound] Unhandled processing error:', e)
    })
  },
)
