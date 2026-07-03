// Workforce compliance: credential expiry alerts (Enterprise).
//
// Emails a tenant's admins a digest of staff credentials (DBS, right to work,
// professional registration) that have expired or expire within 30 days, so
// nothing lapses. Respects the tenant's compliance_expiry_alerts email
// preference (the manual "send now" button bypasses it). Reference credentials
// have no expiry, so they never appear here.

import { prisma } from '../../db/client'
import { isEmailEnabled } from '../../lib/notify'
import { sendTrainingUpdateEmail } from '../email/outbound'

const WINDOW_DAYS = 30

// Days-to-expiry on which a staff member is personally emailed about their own
// passport (rather than every day it sits in the 30-day window).
const PASSPORT_STAFF_THRESHOLDS = new Set([30, 14, 7, 3, 1, 0])

const TYPE_LABELS: Record<string, string> = {
  dbs:                       'DBS check',
  right_to_work:             'Right to work',
  passport:                  'Passport',
  professional_registration: 'Professional registration',
  reference:                 'References',
}

type Flag = { user_id: string; name: string; type: string; expires_at: Date; when: 'expired' | 'soon' }

function escapeHtml(s: string): string {
  return s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))
}
function fmt(d: Date): string {
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

function buildDigestHtml(flags: Flag[]): string {
  const rows = flags.map(f => {
    const colour = f.when === 'expired' ? '#dc2626' : '#d97706'
    const state  = f.when === 'expired' ? 'Expired' : 'Expiring soon'
    return `<tr>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${escapeHtml(f.name)}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${TYPE_LABELS[f.type] ?? f.type}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0;color:${colour};font-weight:600">${state}</td>
      <td style="padding:6px 10px;border-bottom:1px solid #f0f0f0">${fmt(f.expires_at)}</td>
    </tr>`
  }).join('')
  return `
    <p style="font-size:15px;margin:0 0 12px">These staff credentials need attention in your workforce compliance register:</p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead><tr>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e5e5e5">Staff member</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e5e5e5">Credential</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e5e5e5">Status</th>
        <th style="text-align:left;padding:6px 10px;border-bottom:2px solid #e5e5e5">Date</th>
      </tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <p style="font-size:13px;color:#666;margin:16px 0 0">Open <strong>Compliance</strong> in CareStream to update these records.</p>
  `
}

export interface ExpiryResult { sent: boolean; expiring: number; expired: number; recipients: number; passport_staff: number }

// Run the digest for one tenant. force = bypass the email preference (manual button).
export async function runCredentialExpiryForTenant(tenantId: string, opts?: { force?: boolean }): Promise<ExpiryResult> {
  const empty: ExpiryResult = { sent: false, expiring: 0, expired: 0, recipients: 0, passport_staff: 0 }

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { name: true, plan: { select: { has_workforce_compliance: true } } },
  })
  if (!tenant?.plan?.has_workforce_compliance) return empty

  const now       = new Date()
  const windowEnd = new Date(now.getTime() + WINDOW_DAYS * 86_400_000)

  const creds = await (prisma as any).staffCredential.findMany({
    where:  { tenant_id: tenantId, expires_at: { not: null, lte: windowEnd } },
    select: { user_id: true, type: true, expires_at: true },
  })
  if (creds.length === 0) return empty

  // Only flag active staff.
  const userIds = [...new Set(creds.map((c: any) => c.user_id))]
  const users   = await (prisma as any).user.findMany({
    where: { id: { in: userIds }, tenant_id: tenantId, is_active: true }, select: { id: true, name: true, email: true },
  })
  const userById = new Map<string, { name: string; email: string }>(users.map((u: any) => [u.id, { name: u.name, email: u.email }]))

  const flags: Flag[] = []
  for (const c of creds) {
    const u = userById.get(c.user_id)
    if (!u) continue
    const exp = new Date(c.expires_at)
    flags.push({ user_id: c.user_id, name: u.name, type: c.type, expires_at: exp, when: exp.getTime() < now.getTime() ? 'expired' : 'soon' })
  }
  if (flags.length === 0) return empty
  flags.sort((a, b) => a.expires_at.getTime() - b.expires_at.getTime())

  const expired  = flags.filter(f => f.when === 'expired').length
  const expiring = flags.filter(f => f.when === 'soon').length

  if (!opts?.force && !(await isEmailEnabled(tenantId, 'compliance_expiry_alerts'))) {
    return { sent: false, expiring, expired, recipients: 0, passport_staff: 0 }
  }

  // Personal reminders to staff about their OWN passport (overseas staff). On the
  // daily cron this only fires on renewal thresholds; the manual button always sends.
  let passportStaff = 0
  for (const f of flags) {
    if (f.type !== 'passport') continue
    const u = userById.get(f.user_id)
    if (!u?.email) continue
    const daysUntil = Math.ceil((f.expires_at.getTime() - now.getTime()) / 86_400_000)
    if (!opts?.force && !PASSPORT_STAFF_THRESHOLDS.has(daysUntil)) continue
    const dateStr = fmt(f.expires_at)
    const bodyHtml = f.when === 'expired'
      ? `<p style="font-size:15px;margin:0 0 8px">Your passport <strong style="color:#dc2626">has expired</strong> (expiry ${dateStr}). Please renew it as soon as possible and let your manager know once it is done.</p>`
      : `<p style="font-size:15px;margin:0 0 8px">Your passport is due to expire on <strong>${dateStr}</strong>. Please arrange to renew it in good time and let your manager know once it is done.</p>`
    await sendTrainingUpdateEmail({ to: u.email, name: u.name, orgName: tenant.name, subject: f.when === 'expired' ? 'Your passport has expired' : 'Your passport is expiring soon', bodyHtml }).catch(() => {})
    passportStaff++
  }

  const admins = await (prisma as any).user.findMany({
    where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { email: true, name: true },
  })
  if (admins.length === 0) return { sent: passportStaff > 0, expiring, expired, recipients: 0, passport_staff: passportStaff }

  const subject  = `Workforce compliance: ${expired} expired, ${expiring} expiring soon`
  const bodyHtml = buildDigestHtml(flags)
  await Promise.all(admins.map((a: any) =>
    sendTrainingUpdateEmail({ to: a.email, name: a.name, orgName: tenant.name, subject, bodyHtml }).catch(() => {}),
  ))

  return { sent: true, expiring, expired, recipients: admins.length, passport_staff: passportStaff }
}

// Run for every Enterprise tenant (cron).
export async function runCredentialExpiryAllTenants(): Promise<{ tenants: number; sent: number }> {
  const tenants = await (prisma as any).tenant.findMany({
    where: { plan: { has_workforce_compliance: true } }, select: { id: true },
  })
  let sent = 0
  for (const t of tenants) {
    try { if ((await runCredentialExpiryForTenant(t.id)).sent) sent++ } catch { /* continue */ }
  }
  return { tenants: tenants.length, sent }
}
