// The real wiring for approver-notify.ts: who the administrators are, the hub notification (and email when the account allows it), and the account's email switch.
import { prisma } from '../../db/client'
import * as store from '../ask/store'
import type { NotifyDeps } from './approver-notify'
const q = () => prisma as any

/** The account's switch for approver emails (default ON). The hub notification is always sent. A missing column or table means "on". */
export async function approverEmailsOn(tenantId: string): Promise<boolean> {
  try { const r: any[] = await q().$queryRawUnsafe('select approver_emails from public.ask_settings where tenant_id = $1', tenantId); return r[0] ? r[0].approver_emails !== false : true } catch { return true }
}
export async function saveApproverEmails(tenantId: string, on: boolean): Promise<boolean> {
  await q().$executeRawUnsafe('insert into public.ask_settings (tenant_id, approver_emails, updated_at) values ($1, $2, now()) on conflict (tenant_id) do update set approver_emails = $2, updated_at = now()', tenantId, on)
  return on
}

export const realDeps: NotifyDeps = {
  admins: (t) => store.activeAdmins(t),
  nameOf: (t, u) => store.userName(t, u),
  emailsOn: approverEmailsOn,
  stamp: (t, id, patch) => store.setApprovalMeta(t, id, patch as Record<string, string | null>),
  async send(o) {
    const n = await import('../../routes/notifications')
    const r = await n.createAndSendNotification({ tenantId: o.tenantId, userId: o.fromUserId, title: o.title, body: o.body, audience: 'selected', userIds: o.toUserIds, files: [], email: o.email, skipDailyLimit: true, via: 'ask_approval' })
    return r.ok ? { recipients: r.recipients, emailed: r.emailed } : { recipients: 0, emailed: 0 }
  },
}
