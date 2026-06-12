// Training-only tier: email each tenant's admin once when their training licences
// come within 30 days of renewal. Idempotent via training_licenses.renewal_reminded_at.

import { prisma } from '../../db/client'
import { sendTrainingRenewalEmail } from '../email/outbound'

function webUrl(): string {
  return (process.env.WEB_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '')
}

export async function sendLicenceRenewalReminders(): Promise<{ tenants: number; reminded: number }> {
  const now = new Date()
  const horizon = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000)

  const due = await (prisma as any).trainingLicense.findMany({
    where:  { status: 'active', renewal_reminded_at: null, renewal_due_at: { gte: now, lte: horizon } },
    select: { id: true, tenant_id: true, module_name: true, renewal_due_at: true },
  })
  if (!due.length) return { tenants: 0, reminded: 0 }

  // Group by tenant.
  const byTenant = new Map<string, any[]>()
  for (const l of due as any[]) {
    const arr = byTenant.get(l.tenant_id) ?? []
    arr.push(l); byTenant.set(l.tenant_id, arr)
  }

  let reminded = 0
  for (const [tenantId, licences] of byTenant) {
    const admin = await (prisma as any).user.findFirst({
      where:   { tenant_id: tenantId, role: 'admin', is_active: true },
      orderBy: { created_at: 'asc' }, select: { email: true, name: true },
    })
    if (!admin?.email) continue

    // Aggregate by module: count + earliest renewal date.
    const byModule = new Map<string, { module: string; count: number; due: Date }>()
    for (const l of licences) {
      const m = byModule.get(l.module_name) ?? { module: l.module_name, count: 0, due: l.renewal_due_at }
      m.count += 1
      if (l.renewal_due_at < m.due) m.due = l.renewal_due_at
      byModule.set(l.module_name, m)
    }

    try {
      await sendTrainingRenewalEmail({ to: admin.email, name: admin.name ?? 'there', manageUrl: `${webUrl()}/licences`, items: [...byModule.values()] })
      await (prisma as any).trainingLicense.updateMany({ where: { id: { in: licences.map((l: any) => l.id) } }, data: { renewal_reminded_at: now } })
      reminded += licences.length
    } catch (e: any) {
      console.error('[licence-renewals] send failed for tenant', tenantId, e?.message ?? e)
    }
  }
  return { tenants: byTenant.size, reminded }
}
