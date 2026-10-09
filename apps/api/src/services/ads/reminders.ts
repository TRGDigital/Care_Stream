import { sendReminderEmail, type DueReminder } from '../email/outbound'

// Reminders (cron /reminders, daily 08:00 UTC, pg_cron cs-reminders). Funnel Insights keeps dated
// reminders Len sets on its CRO ideas page (fi_reminders); a 'cta_test' reminder comes with the
// Add to basket clicks by button position for the last 14 days. Each due reminder is emailed once,
// then Funnel Insights is told so it is not sent again. No email on days with nothing due.
const REMINDERS_URL = process.env.FI_REMINDERS_URL || 'https://trg-funnel-insights.vercel.app/api/reminders-due'

export async function runReminders(): Promise<Record<string, unknown>> {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret) throw new Error('FI_INGEST_SECRET is not set')
  const headers = { Authorization: `Bearer ${secret}` }
  const res = await fetch(REMINDERS_URL, { headers, signal: AbortSignal.timeout(20_000) })
  if (!res.ok) throw new Error(`Funnel Insights answered ${res.status}`)
  const body = await res.json() as { links: { cro: string; changes: string }; due: DueReminder[] }
  if (!body.due?.length) return { sent: 0 }
  for (const r of body.due) await sendReminderEmail(r, body.links)
  const ack = await fetch(REMINDERS_URL, {
    method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' },
    body: JSON.stringify({ ids: body.due.map(r => r.id) }), signal: AbortSignal.timeout(20_000),
  })
  if (!ack.ok) throw new Error(`Email sent, but Funnel Insights did not record it (${ack.status}): it may send again tomorrow`)
  return { sent: body.due.length, titles: body.due.map(r => r.title) }
}
