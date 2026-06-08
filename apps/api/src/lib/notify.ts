// Notification helper — checks tenant email preferences before sending.
// All service-email preference keys default to true if not explicitly set.

import { prisma } from '../db/client'
import { sendStaffAllocationEmail, type AllocationKind } from '../services/email/outbound'

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

// Tenant email-preference key that gates each allocation type.
const ALLOC_PREF: Record<AllocationKind, string> = {
  induction:       'onboarding_updates',
  training:        'training_updates',
  annual_training: 'training_updates',
  follow_up:       'training_updates',
  cqc_prep:        'cqc_staff_prep',
}

// Email staff that work has been allocated to them, with a deep link to the hub.
// Honours the tenant's email preference for that type. (Push is sent separately by
// the channels that already do it, e.g. CQC delivery + proactive training.)
export async function notifyStaffAllocation(tenantId: string, userIds: string[], kind: AllocationKind): Promise<void> {
  if (!userIds.length) return
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
  const portalUrl = (process.env.WEB_URL || 'https://carestreamai.com').replace(/\/$/, '')
  await notifyUsers(tenantId, ALLOC_PREF[kind], userIds, (email, name) =>
    sendStaffAllocationEmail({ to: email, name, orgName: tenant?.name ?? '', kind, portalUrl })
  )
}

// "You have follow-up to complete" email. Follow-ups aren't allocated by an admin —
// they're created when a staff member answers wrong — so this is DEBOUNCED to at most
// one email per staff member per 24h (a bad session of 5 wrong answers = one email).
const FOLLOWUP_DEBOUNCE_MS = 24 * 60 * 60 * 1000
export async function notifyFollowUp(tenantId: string, userId: string): Promise<void> {
  try {
    const user = await (prisma as any).user.findUnique({
      where:  { id: userId },
      select: { is_active: true, last_followup_email_at: true },
    })
    if (!user || user.is_active === false) return
    const last = user.last_followup_email_at ? new Date(user.last_followup_email_at).getTime() : 0
    if (Date.now() - last < FOLLOWUP_DEBOUNCE_MS) return
    // Claim the debounce slot first so concurrent wrong answers don't double-send.
    await (prisma as any).user.update({ where: { id: userId }, data: { last_followup_email_at: new Date() } })
    await notifyStaffAllocation(tenantId, [userId], 'follow_up')
  } catch (e) {
    console.error('[notify] follow-up email error:', e)
  }
}
