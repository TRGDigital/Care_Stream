import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { verifyFeedbackToken } from '../lib/feedback-token'

export const feedbackRouter = Router()

// GET /feedback/:queryId/:rating?sig=TOKEN
// One-click feedback from email/WhatsApp links — no auth required, HMAC-verified
feedbackRouter.get('/:queryId/:rating', async (req: Request, res: Response) => {
  const queryId: string = req.params.queryId as string
  const rating:  string = req.params.rating  as string
  const sig: string = Array.isArray(req.query.sig)
    ? String(req.query.sig[0] ?? '')
    : typeof req.query.sig === 'string'
      ? req.query.sig
      : ''

  if (!verifyFeedbackToken(queryId, rating, sig)) {
    res.status(400).send(feedbackPage('Invalid or expired link.', false))
    return
  }

  try {
    await prisma.$executeRaw`
      UPDATE queries SET feedback = ${rating} WHERE id = ${queryId}
    `
    res.send(feedbackPage(
      rating === 'positive' ? 'Thank you! Glad that was helpful.' : 'Thank you for letting us know — we\'ll use this to improve.',
      true,
    ))
  } catch {
    res.status(500).send(feedbackPage('Something went wrong. Please try again.', false))
  }
})

function feedbackPage(message: string, success: boolean): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Feedback — CareStreamAI</title>
  <style>
    body { font-family: Inter, sans-serif; display: flex; align-items: center; justify-content: center; min-height: 100vh; margin: 0; background: #f9fafb; }
    .card { background: white; border-radius: 12px; padding: 40px 48px; text-align: center; max-width: 400px; box-shadow: 0 1px 3px rgba(0,0,0,0.1); }
    .icon { font-size: 48px; margin-bottom: 16px; }
    h1 { color: #111827; font-size: 20px; margin: 0 0 8px; }
    p { color: #6b7280; font-size: 14px; margin: 0; }
    .brand { margin-top: 32px; font-size: 12px; color: #9ca3af; }
  </style>
</head>
<body>
  <div class="card">
    <div class="icon">${success ? '✅' : '❌'}</div>
    <h1>${message}</h1>
    <p>You can close this tab.</p>
    <p class="brand">CareStreamAI</p>
  </div>
</body>
</html>`
}
