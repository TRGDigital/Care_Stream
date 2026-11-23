// Shared tablets: a quarterly nudge to the account's admins to print a fresh "Connect a tablet" poster and take the old ones down.
// Runs daily. An account is reminded once its poster is 90 days old, then again every 30 days until it is renewed. Nothing is sent to
// accounts with no tablets.

import { prisma } from '../../db/client'
import { sweepTenants } from '../../lib/tenant-sweep'
import { sendTrainingUpdateEmail } from '../email/outbound'
import { CONNECT_KEY_REMINDER_DAYS } from '../../lib/shared-tablets'

const p = () => prisma as any

export async function remindPosterForTenant(tenantId: string, dryRun = false): Promise<boolean> {
  const [key, tablets, tenant] = await Promise.all([
    p().sharedConnectKey.findUnique({ where: { tenant_id: tenantId } }),
    p().sharedDevice.count({ where: { tenant_id: tenantId, revoked_at: null } }),
    p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])
  if (!key || !tablets || !tenant) return false
  const age = (Date.now() - new Date(key.rotated_at).getTime()) / 86_400_000
  if (age < CONNECT_KEY_REMINDER_DAYS) return false
  if (key.reminded_at && (Date.now() - new Date(key.reminded_at).getTime()) / 86_400_000 < 30) return false
  if (dryRun) return true
  const admins = await p().user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true, is_shared: false }, select: { email: true, name: true } })
  const bodyHtml = `<p style="font-size:15px;margin:0 0 12px">The <strong>Connect a tablet</strong> poster for ${tenant.name} is now ${Math.floor(age)} days old.</p>` +
    `<p style="font-size:15px;margin:0 0 12px">For safety, we suggest printing a new one every three months and taking the old ones down. Tablets that are already connected stay connected.</p>` +
    `<p style="font-size:14px;color:#666;margin:0">Go to Staff, then Shared tablets, then Print a new poster.</p>`
  await Promise.all(admins.map((a: any) => sendTrainingUpdateEmail({ to: a.email, name: a.name, orgName: tenant.name, subject: 'Time to print a new Connect a tablet poster', bodyHtml, buttonLabel: 'Open Staff', buttonPath: '/staff' }).catch(() => {})))
  await p().sharedConnectKey.update({ where: { tenant_id: tenantId }, data: { reminded_at: new Date() } })
  return admins.length > 0
}

export async function remindPostersAllTenants(): Promise<{ tenants: number; reminded: number }> {
  let reminded = 0
  const swept = await sweepTenants('tablet-poster-reminders', async (t) => { if (await remindPosterForTenant(t.id)) reminded++ })
  return { tenants: swept.processed, reminded }
}
