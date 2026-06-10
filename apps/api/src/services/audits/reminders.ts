// Daily audit reminders — nudge admins to finish in-progress audits and start
// recurring (daily/weekly) audits not yet run this period. Gated on the
// audit_updates email preference. Driven by the daily Vercel cron.

import sgMail from '@sendgrid/mail'
import { prisma } from '../../db/client'
import { notifyUsers } from '../../lib/notify'
import { siteUrl } from '../../lib/urls'
import { getAuditsDue, frequencyLabel, type DueAudit } from './due'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WEB_URL        = siteUrl()
const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const from = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  await (sgMail as any).send({ to, from, subject, html })
}

function reminderHtml(orgName: string, due: DueAudit[], inProgress: number): string {
  const dueList = due.length
    ? `<p style="margin:0 0 6px;font-weight:600">Audits to complete:</p><ul style="margin:0 0 14px;padding-left:18px">${due.map(a => `<li style="font-size:14px;color:#111827">${esc(a.name)} <span style="color:#6b7280">(${esc(frequencyLabel(a.frequency))})</span></li>`).join('')}</ul>`
    : ''
  const inProg = inProgress > 0
    ? `<p style="margin:0 0 14px;font-size:14px;color:#111827">You have <strong>${inProgress}</strong> audit${inProgress === 1 ? '' : 's'} in progress to finish.</p>`
    : ''
  return `
<div style="font-family:Inter,Arial,sans-serif;max-width:560px;margin:0 auto;padding:24px;color:#111827">
  <h2 style="margin:0 0 4px">Audits to complete</h2>
  <p style="margin:0 0 16px;color:#6b7280">${esc(orgName)}</p>
  ${inProg}${dueList}
  <a href="${WEB_URL}/chat" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">Open Audits in the hub →</a>
  <p style="margin:20px 0 0;font-size:11px;color:#9ca3af">You can start, save and complete audits from the hub on any device. Turn these reminders off in Settings → Email preferences (Audit updates).</p>
</div>`
}

export async function sendDailyAuditReminders(): Promise<{ tenants: number; sent: number }> {
  const tenants = await (prisma as any).tenant.findMany({ select: { id: true, name: true } })
  let sent = 0
  for (const t of tenants as any[]) {
    try {
      const { due, inProgress } = await getAuditsDue(t.id)
      if (!due.length && !inProgress) continue

      const admins = await (prisma as any).user.findMany({ where: { tenant_id: t.id, role: { in: ['admin', 'manager'] }, is_active: true }, select: { id: true } })
      if (admins.length) {
        const html = reminderHtml(t.name, due, inProgress)
        await notifyUsers(t.id, 'audit_updates', admins.map((a: any) => a.id), (email) => sendEmail(email, `Audits to complete — ${t.name}`, html))
        sent += 1
      }

      // "Staff + Audits" members: nudge each for THEIR allocated due audits only.
      const auditors = await (prisma as any).user.findMany({
        where:  { tenant_id: t.id, is_active: true, role: { notIn: ['admin', 'manager'] }, audit_template_ids: { isEmpty: false } },
        select: { id: true, audit_template_ids: true },
      })
      for (const a of auditors as any[]) {
        const scoped = await getAuditsDue(t.id, a.audit_template_ids)
        if (!scoped.due.length && !scoped.inProgress) continue
        const html = reminderHtml(t.name, scoped.due, scoped.inProgress)
        await notifyUsers(t.id, 'audit_updates', [a.id], (email) => sendEmail(email, `Audits to complete — ${t.name}`, html))
        sent += 1
      }
    } catch (e: any) {
      console.error('[audit-reminders] tenant failed', t.id, e?.message ?? e)
    }
  }
  console.log(`[audit-reminders] tenants=${tenants.length} sent=${sent}`)
  return { tenants: tenants.length, sent }
}
