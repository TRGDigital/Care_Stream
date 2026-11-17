// Daily: tell the archive admins when an archived resident profile has reached (or is within 30 days of) the end of its retention
// period, so profiles are deleted when they should be and not forgotten. One email per home, at most every 30 days per profile.

import { prisma } from '../../db/client'
import { siteUrl } from '../../lib/urls'
import { archiveAdmins, displayName, dateOnly } from '../../lib/residents'
import { sendResidentRetentionEmail } from '../email/outbound'

const db = prisma as any

export async function runResidentRetentionReminders(): Promise<{ homes: number; profiles: number; emailed: number }> {
  const now = new Date()
  const horizon = new Date(now.getTime() + 30 * 86400000)
  const staleBefore = new Date(now.getTime() - 30 * 86400000)
  let rows: any[] = []
  try {
    rows = await db.resident.findMany({
      where: {
        status: { in: ['left', 'deceased'] },
        retention_until: { lte: horizon },
        OR: [{ retention_notified_at: null }, { retention_notified_at: { lt: staleBefore } }],
      },
    })
  } catch { return { homes: 0, profiles: 0, emailed: 0 } }   // table not created yet

  const byTenant = new Map<string, any[]>()
  for (const r of rows) byTenant.set(r.tenant_id, [...(byTenant.get(r.tenant_id) ?? []), r])

  let emailed = 0
  for (const [tenantId, list] of byTenant) {
    try {
      const tenant = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
      const admins = await archiveAdmins(tenantId)
      if (!admins.length) continue
      await sendResidentRetentionEmail({
        to: admins.map(a => a.email), homeName: tenant?.name ?? 'your home', link: `${siteUrl()}/knowledge`,
        items: list.map(r => ({ name: displayName(r), retentionUntil: dateOnly(r.retention_until) ?? '', overdue: !!r.retention_until && r.retention_until <= now })),
      })
      await db.resident.updateMany({ where: { id: { in: list.map(r => r.id) } }, data: { retention_notified_at: now } })
      emailed++
    } catch (e) { console.error('[residents] retention reminder failed for', tenantId, e) }
  }
  return { homes: byTenant.size, profiles: rows.length, emailed }
}
