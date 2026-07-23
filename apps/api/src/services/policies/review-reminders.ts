// Email a tenant's admins once per review cycle when policies reach the review date they set.
// If several policies are due, they go in ONE email per admin (not one email per policy).
// Idempotent via policies.review_reminder_sent_at (reset when a new review date is recorded).

import { prisma } from '../../db/client'
import { sendTrainingUpdateEmail } from '../email/outbound'
import { isEmailEnabled } from '../../lib/notify'

function webUrl(): string {
  return (process.env.WEB_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '')
}
const fmtDate = (d: Date) => d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
function escapeHtml(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

export async function runPolicyReviewReminders(opts?: { force?: boolean }): Promise<{ tenants: number; policies: number; emails: number }> {
  const now = new Date()
  // Active policies with a review date recorded that haven't been reminded this cycle.
  const rows = await (prisma as any).policy.findMany({
    where: { status: 'active', last_reviewed_at: { not: null }, review_reminder_sent_at: null },
    select: { id: true, tenant_id: true, name: true, last_reviewed_at: true, review_interval_days: true },
  })
  // Keep only the genuinely-due ones (last reviewed + interval <= now).
  const due = (rows as any[]).filter(p => {
    const next = new Date(new Date(p.last_reviewed_at).getTime() + (p.review_interval_days ?? 365) * 86_400_000)
    return next.getTime() <= now.getTime()
  })
  if (!due.length) return { tenants: 0, policies: 0, emails: 0 }

  const byTenant = new Map<string, any[]>()
  for (const p of due) { const a = byTenant.get(p.tenant_id) ?? []; a.push(p); byTenant.set(p.tenant_id, a) }

  let emails = 0, policies = 0
  for (const [tenantId, list] of byTenant) {
    if (!opts?.force && !(await isEmailEnabled(tenantId, 'policy_review_reminders'))) continue
    const [tenant, admins] = await Promise.all([
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { email: true, name: true } }),
    ])
    if (!admins.length) continue

    const items = (list as any[])
      .map(p => ({ name: p.name as string, due: new Date(new Date(p.last_reviewed_at).getTime() + (p.review_interval_days ?? 365) * 86_400_000) }))
      .sort((a, b) => a.due.getTime() - b.due.getTime())

    const rowsHtml = items.map(i =>
      `<tr><td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:14px;color:#111">${escapeHtml(i.name)}</td>` +
      `<td style="padding:7px 10px;border-bottom:1px solid #eee;font-size:13px;color:#6b7280;white-space:nowrap">Due ${fmtDate(i.due)}</td></tr>`
    ).join('')
    const one = items.length === 1
    const bodyHtml = `
      <p style="font-size:15px;color:#111;margin:0 0 12px">The following ${one ? 'policy has' : 'policies have'} reached the review date you set and ${one ? 'is' : 'are'} due for review:</p>
      <table style="width:100%;border-collapse:collapse;margin:0 0 16px">${rowsHtml}</table>
      <p style="font-size:14px;color:#374151;margin:0 0 18px">Review ${one ? 'it' : 'them'} in CareStream, then record a new review date so the next reminder is scheduled.</p>
      <p style="margin:0"><a href="${webUrl()}/policies" style="display:inline-block;background:#0f766e;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:14px;font-weight:600">Review policies</a></p>`

    for (const admin of admins as any[]) {
      if (!admin?.email) continue
      try {
        await sendTrainingUpdateEmail({
          to: admin.email, name: admin.name ?? 'there', orgName: tenant?.name ?? 'your organisation',
          subject: one ? 'A policy is due for review' : `${items.length} policies are due for review`,
          bodyHtml,
        })
        emails++
      } catch (e: any) { console.error('[policy-review-reminders] send failed', tenantId, e?.message ?? e) }
    }
    // Mark this cycle reminded so it fires once, not every day. Reset when a new review is recorded.
    await (prisma as any).policy.updateMany({ where: { id: { in: (list as any[]).map(p => p.id) } }, data: { review_reminder_sent_at: now } })
    policies += list.length
  }
  return { tenants: byTenant.size, policies, emails }
}
