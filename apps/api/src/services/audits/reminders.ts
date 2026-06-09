// Daily audit reminders — nudge admins to finish in-progress audits and start
// recurring (daily/weekly) audits not yet run this period. Gated on the
// audit_updates email preference. Driven by the daily Vercel cron.

import sgMail from '@sendgrid/mail'
import { prisma } from '../../db/client'
import { notifyUsers } from '../../lib/notify'
import { siteUrl } from '../../lib/urls'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WEB_URL        = siteUrl()
const esc = (s: any) => String(s ?? '').replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c] as string))

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const from = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  await (sgMail as any).send({ to, from, subject, html })
}

function reminderHtml(orgName: string, due: string[], inProgress: number): string {
  const dueList = due.length
    ? `<p style="margin:0 0 6px;font-weight:600">Recurring audits to start:</p><ul style="margin:0 0 14px;padding-left:18px">${due.map(n => `<li style="font-size:14px;color:#111827">${esc(n)}</li>`).join('')}</ul>`
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
      const [templates, runs] = await Promise.all([
        (prisma as any).auditTemplate.findMany({ where: { is_active: true, OR: [{ tenant_id: null }, { tenant_id: t.id }] }, select: { id: true, name: true, frequency: true } }),
        (prisma as any).auditRun.findMany({ where: { tenant_id: t.id }, select: { template_id: true, status: true, audit_month: true } }),
      ])
      const now = new Date()
      const sameMonth = (d: Date) => d.getUTCMonth() === now.getUTCMonth() && d.getUTCFullYear() === now.getUTCFullYear()
      const sameDay   = (d: Date) => sameMonth(d) && d.getUTCDate() === now.getUTCDate()
      const ranThisMonth = new Set((runs as any[]).filter(r => sameMonth(new Date(r.audit_month))).map(r => r.template_id))
      const ranToday     = new Set((runs as any[]).filter(r => sameDay(new Date(r.audit_month))).map(r => r.template_id))
      const inProgress = (runs as any[]).filter(r => r.status === 'in_progress').length
      // Daily audits are due if not started today; weekly if not started this month.
      const due = (templates as any[]).filter(tp =>
        tp.frequency === 'daily' ? !ranToday.has(tp.id)
        : tp.frequency === 'weekly' ? !ranThisMonth.has(tp.id)
        : false,
      ).map(tp => tp.name)
      if (!due.length && !inProgress) continue

      const admins = await (prisma as any).user.findMany({ where: { tenant_id: t.id, role: { in: ['admin', 'manager'] }, is_active: true }, select: { id: true } })
      if (!admins.length) continue
      const html = reminderHtml(t.name, due, inProgress)
      await notifyUsers(t.id, 'audit_updates', admins.map((a: any) => a.id), (email) => sendEmail(email, `Audits to complete — ${t.name}`, html))
      sent += 1
    } catch (e: any) {
      console.error('[audit-reminders] tenant failed', t.id, e?.message ?? e)
    }
  }
  console.log(`[audit-reminders] tenants=${tenants.length} sent=${sent}`)
  return { tenants: tenants.length, sent }
}
