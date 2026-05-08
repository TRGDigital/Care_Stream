import { Router, Request, Response } from 'express'
import multer from 'multer'
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
