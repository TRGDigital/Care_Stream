// Public (unauthenticated) onboarding-email endpoints:
//   GET  /onboarding/unsubscribe  — stop the drip for an enrolment (signed token)
//   POST /onboarding/events       — SendGrid Event Webhook (delivery/open/click)
// Mounted BEFORE requireAuth.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { verifyUnsub } from '../services/onboarding/dispatch'

export const onboardingPublicRouter = Router()

function page(title: string, body: string): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${title}</title></head>
<body style="font-family:Inter,Arial,sans-serif;background:#f3f4f6;margin:0;padding:48px 16px">
  <div style="max-width:440px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:12px;padding:32px;text-align:center">
    <div style="font-size:20px;font-weight:800;color:#9B52B5;margin-bottom:16px">CareStream<span style="color:#c9a8d8">AI</span></div>
    ${body}
  </div></body></html>`
}

// GET only CONFIRMS — it never cancels. This matters because email security
// scanners / link-prefetchers (Outlook SafeLinks, Mimecast, Gmail, antivirus)
// auto-fetch every link in an email; a GET that cancelled on visit would
// unsubscribe people who never clicked. The actual unsubscribe is the POST below,
// which only fires on a real button click.
onboardingPublicRouter.get('/unsubscribe', async (req: Request, res: Response) => {
  const e = String(req.query.e ?? ''), t = String(req.query.t ?? '')
  if (!e || !verifyUnsub(e, t)) {
    res.status(400).send(page('Unsubscribe', '<p style="color:#374151">This unsubscribe link is invalid or has expired.</p>'))
    return
  }
  const action = `/onboarding/unsubscribe?e=${encodeURIComponent(e)}&t=${encodeURIComponent(t)}`
  res.status(200).send(page('Unsubscribe',
    '<p style="color:#111827;font-weight:600;margin:0 0 8px">Unsubscribe from onboarding tips?</p>' +
    '<p style="color:#6b7280;font-size:14px;margin:0 0 20px">You will stop receiving onboarding emails for this account. You can still use CareStream as normal.</p>' +
    `<form method="POST" action="${action}" style="margin:0"><button type="submit" style="background:#9B52B5;color:#fff;border:0;border-radius:8px;padding:11px 20px;font-size:14px;font-weight:600;cursor:pointer">Yes, unsubscribe</button></form>`))
})

onboardingPublicRouter.post('/unsubscribe', async (req: Request, res: Response) => {
  const e = String(req.query.e ?? ''), t = String(req.query.t ?? '')
  if (!e || !verifyUnsub(e, t)) {
    res.status(400).send(page('Unsubscribe', '<p style="color:#374151">This unsubscribe link is invalid or has expired.</p>'))
    return
  }
  await (prisma as any).onboardingEnrolment.update({ where: { id: e }, data: { status: 'cancelled' } }).catch(() => {})
  res.status(200).send(page('Unsubscribed',
    '<p style="color:#111827;font-weight:600;margin:0 0 8px">You are unsubscribed</p>' +
    '<p style="color:#6b7280;font-size:14px;margin:0">You will no longer receive onboarding tips for this account. You can still use CareStream as normal.</p>'))
})

// SendGrid Event Webhook. We only act on events carrying our onboarding_send_id
// custom arg (a random UUID), so spoofed events without a valid id are ignored.
onboardingPublicRouter.post('/events', async (req: Request, res: Response) => {
  const events = Array.isArray(req.body) ? req.body : []
  // Respond fast; SendGrid retries on non-2xx.
  res.status(200).json({ received: events.length })

  for (const ev of events) {
    try {
      const sendId = ev.onboarding_send_id as string | undefined
      if (!sendId) continue
      const row = await (prisma as any).onboardingSend.findUnique({ where: { id: sendId } })
      if (!row) continue
      const at = ev.timestamp ? new Date(ev.timestamp * 1000) : new Date()
      const data: any = {}
      switch (ev.event) {
        case 'delivered':
          data.status = 'delivered'; if (!row.delivered_at) data.delivered_at = at; break
        case 'open':
          data.open_count = (row.open_count ?? 0) + 1; if (!row.first_opened_at) data.first_opened_at = at; break
        case 'click':
          data.click_count = (row.click_count ?? 0) + 1; if (!row.first_clicked_at) data.first_clicked_at = at; break
        case 'bounce':
        case 'dropped':
        case 'blocked':
          data.status = 'bounced'; data.bounced_at = at; if (ev.reason) data.error = String(ev.reason).slice(0, 300); break
        default:
          continue
      }
      await (prisma as any).onboardingSend.update({ where: { id: sendId }, data })
    } catch { /* ignore individual event errors */ }
  }
})
