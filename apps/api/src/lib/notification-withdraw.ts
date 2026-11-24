// Withdrawing a sent staff notification: it is removed from every recipient's hub and unread list (the recipient rows are deleted), and a record is kept of what was
// withdrawn, by whom and when. The EMAIL cannot be recalled, and the screen says so. Raw SQL on a new table (notification_withdrawals), so nothing existing changes.
import { prisma } from '../db/client'
const q = () => prisma as any
export const missing = (e: any) => /notification_withdrawals|does not exist|42P01|P2010/i.test(String(e?.message ?? e))

export async function withdrawnSet(tenantId: string, ids: string[]): Promise<Set<string>> {
  if (!ids.length) return new Set()
  try { const r: any[] = await q().$queryRawUnsafe('select notification_id from public.notification_withdrawals where tenant_id = $1 and notification_id = any($2::text[])', tenantId, ids); return new Set(r.map(x => String(x.notification_id))) } catch { return new Set() }
}

export async function withdrawNotification(tenantId: string, userId: string, notificationId: string):
  Promise<{ ok: true; recipients: number; read: number } | { ok: false; code: string; message: string; status: number }> {
  const n = await q().staffNotification.findFirst({ where: { id: notificationId, tenant_id: tenantId }, select: { id: true } })
  if (!n) return { ok: false, code: 'NOT_FOUND', message: 'Notification not found.', status: 404 }
  if ((await withdrawnSet(tenantId, [notificationId])).has(notificationId)) return { ok: false, code: 'ALREADY', message: 'It has already been withdrawn.', status: 409 }
  const rec = await q().staffNotificationRecipient.findMany({ where: { notification_id: notificationId, tenant_id: tenantId }, select: { read_at: true } })
  const read = rec.filter((r: any) => r.read_at).length
  try {
    await q().$executeRawUnsafe('insert into public.notification_withdrawals (notification_id, tenant_id, withdrawn_by, recipients, read_count) values ($1,$2,$3,$4,$5) on conflict (notification_id) do nothing', notificationId, tenantId, userId, rec.length, read)
  } catch (e) { if (missing(e)) return { ok: false, code: 'NOT_SET_UP', message: 'Withdrawing is not switched on yet.', status: 503 }; throw e }
  await q().staffNotificationRecipient.deleteMany({ where: { notification_id: notificationId, tenant_id: tenantId } })
  return { ok: true, recipients: rec.length, read }
}
