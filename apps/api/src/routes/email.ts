import { Router, Request, Response } from 'express'
import multer from 'multer'
import crypto from 'crypto'
import { handleInboundEmail } from '../services/email/inbound'
import type { InboundParsePayload } from '../services/email/inbound'

// §8.1 — Email interface routes.
// Mounted at /email in app.ts BEFORE requireAuth — this is an unauthenticated
// SendGrid webhook, not a tenant-JWT-protected route.

export const emailRouter = Router()

// SendGrid Inbound Parse posts multipart/form-data.
// Use multer with memoryStorage so file attachments are buffered but not persisted.
// We only use the text form fields; files are silently discarded.
const upload = multer({ storage: multer.memoryStorage() })

// ─── POST /email/inbound ──────────────────────────────────────────────────────
// SendGrid Inbound Parse webhook (§8.1).
//
// IMPORTANT: Always return HTTP 200 immediately — SendGrid retries on any
// non-200 response and may deliver the same email multiple times.
// Processing runs asynchronously after the 200 is sent.

emailRouter.post('/inbound', upload.any(), (req: Request, res: Response) => {
  // Shared-secret verification — prevents anyone spoofing the SendGrid webhook to
  // inject mail as a staff member. Enable by (1) setting the SendGrid Inbound Parse
  // URL to .../email/inbound?key=<SENDGRID_INBOUND_PARSE_KEY>, then (2) setting
  // ENFORCE_INBOUND_PARSE_KEY=true. Off by default so it can't break live mail.
  if (process.env.ENFORCE_INBOUND_PARSE_KEY === 'true') {
    const expected = process.env.SENDGRID_INBOUND_PARSE_KEY ?? ''
    const provided = typeof req.query.key === 'string' ? req.query.key : ''
    const a = Buffer.from(provided), b = Buffer.from(expected)
    const keyValid = expected.length > 0 && a.length === b.length && crypto.timingSafeEqual(a, b)
    if (!keyValid) {
      res.status(401).json({ success: false, error: 'Unauthorized' })
      return
    }
  }

  res.status(200).json({ success: true })

  const payload: InboundParsePayload = {
    from:     req.body.from    ?? '',
    to:       req.body.to      ?? '',
    subject:  req.body.subject ?? '',
    text:     req.body.text,
    headers:  req.body.headers ?? '',
    envelope: req.body.envelope,
  }

  handleInboundEmail(payload).catch(e => {
    console.error('[email/inbound] Unhandled processing error:', e)
  })
})
