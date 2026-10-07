import { sendConversionMilestoneEmail, type ConversionMilestone } from '../email/outbound'

// Bid strategy milestones (cron /conversion-milestones, daily). Funnel Insights counts each Google
// Ads campaign's confirmed sales (CareStream, Stripe paid) and leads (TRG quiz) over 30 days; at 30
// a campaign is ready for Maximise conversions, at 50 for a Target CPA or Target ROAS. When one is
// due, Len gets one email, then Funnel Insights is told it was sent, so each milestone is emailed
// once per 30 days. No email on days with nothing due.
const MILESTONES_URL = process.env.FI_MILESTONES_URL || 'https://trg-funnel-insights.vercel.app/api/milestones'

export async function runConversionMilestones(): Promise<Record<string, unknown>> {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret) throw new Error('FI_INGEST_SECRET is not set')
  const headers = { Authorization: `Bearer ${secret}` }
  const res = await fetch(MILESTONES_URL, { headers, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Funnel Insights answered ${res.status}`)
  const body = await res.json() as { link: string; campaigns: unknown[]; due: ConversionMilestone[] }
  if (!body.due?.length) return { sent: false, campaigns: body.campaigns?.length ?? 0, due: 0 }
  await sendConversionMilestoneEmail(body.link, body.due)
  const ack = await fetch(MILESTONES_URL, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ due: body.due }), signal: AbortSignal.timeout(20_000),
  })
  if (!ack.ok) throw new Error(`Email sent, but Funnel Insights did not record it (${ack.status}): it may send again tomorrow`)
  return { sent: true, due: body.due.map(d => `${d.campaign} (${d.threshold})`) }
}
