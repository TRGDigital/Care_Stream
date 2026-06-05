// Notification helper — checks tenant email preferences before sending.
// All service-email preference keys default to true if not explicitly set.

import { prisma } from '../db/client'

export async function isEmailEnabled(tenantId: string, prefKey: string): Promise<boolean> {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { email_preferences: true },
  })
  if (!tenant) return false
  const prefs = (tenant.email_preferences as Record<string, boolean> | null) ?? {}
  return typeof prefs[prefKey] === 'boolean' ? prefs[prefKey] : true
}

export async function getAdminUser(tenantId: string): Promise<{ email: string; name: string } | null> {
  return (prisma as any).user.findFirst({
    where:  { tenant_id: tenantId, role: 'admin', is_active: true },
    select: { email: true, name: true },
  })
}

export async function getUsers(userIds: string[]): Promise<Array<{ id: string; email: string; name: string }>> {
  return (prisma as any).user.findMany({
    where:  { id: { in: userIds } },
    select: { id: true, email: true, name: true },
  })
}

export async function notifyAdmin(
  tenantId: string,
  prefKey:  string,
  sendFn:   (email: string, name: string) => Promise<void>,
): Promise<void> {
  const [enabled, admin] = await Promise.all([
    isEmailEnabled(tenantId, prefKey),
    getAdminUser(tenantId),
  ])
  if (!enabled || !admin) return
  try {
    await sendFn(admin.email, admin.name)
  } catch (e) {
    console.error(`[notify] Failed to send ${prefKey} email to admin:`, e)
  }
}

export async function notifyUsers(
  tenantId: string,
  prefKey:  string,
  userIds:  string[],
  sendFn:   (email: string, name: string) => Promise<void>,
): Promise<void> {
  const enabled = await isEmailEnabled(tenantId, prefKey)
  if (!enabled) return
  const users = await getUsers(userIds)
  await Promise.allSettled(
    users.map(u => sendFn(u.email, u.name).catch(e =>
      console.error(`[notify] Failed to send ${prefKey} email to ${u.email}:`, e)
    ))
  )
}
