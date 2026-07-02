// Workforce compliance: day-before reminders for booked supervisions and
// appraisals (Enterprise). Emails each staff member whose session is tomorrow,
// plus a per-tenant digest to admins. Respects the supervision_updates email
// preference. Mirrors the training renewal-reminder cron pattern.

import { prisma } from '../../db/client'
import { isEmailEnabled } from '../../lib/notify'
import { sendTrainingUpdateEmail } from '../email/outbound'

function fmtLong(d: Date): string { return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' }) }
function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}

export async function runSupervisionReminders(): Promise<{ sessions: number; staff_emailed: number; admin_emails: number }> {
  // Calendar day = tomorrow.
  const start = new Date(); start.setDate(start.getDate() + 1); start.setHours(0, 0, 0, 0)
  const end = new Date(start); end.setHours(23, 59, 59, 999)

  const records = await (prisma as any).staffSupervision.findMany({ where: { held_on: { gte: start, lte: end } } })
  if (records.length === 0) return { sessions: 0, staff_emailed: 0, admin_emails: 0 }

  const tenantIds = [...new Set(records.map((r: any) => r.tenant_id))] as string[]
  const userIds   = [...new Set(records.map((r: any) => r.user_id))] as string[]
  const [tenants, users] = await Promise.all([
    (prisma as any).tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true, plan: { select: { has_workforce_compliance: true } } } }),
    (prisma as any).user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } }),
  ])
  const tenantMap = new Map<string, any>(tenants.map((t: any) => [t.id, t]))
  const userMap   = new Map<string, any>(users.map((u: any) => [u.id, u]))

  let sessions = 0, staffEmailed = 0, adminEmails = 0
  const adminBuckets = new Map<string, Array<{ name: string; type: string; by: string | null }>>()

  for (const r of records) {
    const tenant = tenantMap.get(r.tenant_id)
    if (!tenant?.plan?.has_workforce_compliance) continue
    if (!(await isEmailEnabled(r.tenant_id, 'supervision_updates'))) continue
    sessions++
    const label   = r.type === 'appraisal' ? 'appraisal' : 'supervision'
    const dateStr = fmtLong(new Date(r.held_on))
    const user    = userMap.get(r.user_id)

    if (user?.email) {
      const by = r.conducted_by ? ` with ${escapeHtml(r.conducted_by)}` : ''
      const bodyHtml = `<p style="font-size:15px;margin:0 0 8px">This is a reminder that your ${label} is tomorrow, <strong>${dateStr}</strong>${by}.</p>`
      try { await sendTrainingUpdateEmail({ to: user.email, name: user.name, orgName: tenant.name, subject: `Reminder: your ${label} is tomorrow`, bodyHtml }); staffEmailed++ } catch { /* ignore */ }
    }

    if (!adminBuckets.has(r.tenant_id)) adminBuckets.set(r.tenant_id, [])
    adminBuckets.get(r.tenant_id)!.push({ name: user?.name ?? 'A staff member', type: label, by: r.conducted_by ?? null })
  }

  // Per-tenant admin digest.
  for (const [tenantId, items] of adminBuckets) {
    const tenant = tenantMap.get(tenantId)
    const admins = await (prisma as any).user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { email: true, name: true } })
    const rows = items.map(i => `<li style="margin:0 0 6px">${escapeHtml(i.name)} — ${i.type}${i.by ? ` with ${escapeHtml(i.by)}` : ''}</li>`).join('')
    const bodyHtml = `<p style="font-size:15px;margin:0 0 10px">These supervisions and appraisals are scheduled for tomorrow:</p><ul style="padding-left:18px;margin:0">${rows}</ul>`
    for (const a of admins) {
      if (!a.email) continue
      try { await sendTrainingUpdateEmail({ to: a.email, name: a.name, orgName: tenant?.name ?? 'Your service', subject: 'Supervisions & appraisals due tomorrow', bodyHtml }); adminEmails++ } catch { /* ignore */ }
    }
  }

  return { sessions, staff_emailed: staffEmailed, admin_emails: adminEmails }
}
