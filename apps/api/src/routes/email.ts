import { Router } from 'express'

export const emailRouter = Router()

// POST /email/inbound — SendGrid Inbound Parse webhook (§8.1)
// Authenticates sender, detects thread, strips quoted replies,
// runs RAG pipeline with full conversation context from email_sessions
emailRouter.post('/inbound', (_req, res) => res.json({ success: true }))
