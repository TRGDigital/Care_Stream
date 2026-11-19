// Printing or emailing the training detail. The detail contains a member of staff's training records, so an email goes only to an
// active ADMIN of the same account (the supervisor themselves by default), never to an address typed in. Every share is recorded.
import { prisma } from '../db/client'
import { sendTrainingUpdateEmail } from '../services/email/outbound'
import { writeAuditLog } from './audit'
import { renderDetailPrintPage, renderDetailEmailBody, detailTitle } from './supervision-training-render'
import type { TrainingDetail } from './supervision-training'

const p = () => prisma as any

export async function printPage(tenantId: string, actorId: string, d: TrainingDetail): Promise<string> {
  const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  void writeAuditLog({ tenant_id: tenantId, user_id: actorId, event_type: 'supervision_training_shared', entity_type: 'user', entity_id: d.person.id, metadata: { via: 'print', supervision_id: d.supervision?.id ?? null } })
  return renderDetailPrintPage(d, t?.name ?? '')
}

export type EmailResult = { ok: true; to_name: string; to_email: string } | { ok: false; code: 'NOT_AN_ADMIN' | 'EMAIL_NOT_SET_UP' | 'EMAIL_FAILED'; message: string }

export async function emailDetail(tenantId: string, actorId: string, d: TrainingDetail, toUserId?: string | null): Promise<EmailResult> {
  if (!process.env.SENDGRID_API_KEY) return { ok: false, code: 'EMAIL_NOT_SET_UP', message: 'Email is not set up on this server, so it could not be sent. Print it instead.' }
  const recipient = await p().user.findFirst({ where: { id: toUserId || actorId, tenant_id: tenantId, role: 'admin', is_active: true }, select: { id: true, name: true, email: true } })
  if (!recipient?.email) return { ok: false, code: 'NOT_AN_ADMIN', message: 'It can only be sent to an admin on this account.' }
  const [actor, tenant] = await Promise.all([p().user.findUnique({ where: { id: actorId }, select: { name: true } }), p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } })])
  try {
    await sendTrainingUpdateEmail({ to: recipient.email, name: recipient.name ?? 'there', orgName: tenant?.name ?? '', subject: detailTitle(d), bodyHtml: renderDetailEmailBody(d, recipient.id === actorId ? 'You' : (actor?.name ?? 'A colleague')) })
  } catch (e) { console.error('[training-detail] email', e); return { ok: false, code: 'EMAIL_FAILED', message: 'We could not send the email. Please try again, or print it.' } }
  void writeAuditLog({ tenant_id: tenantId, user_id: actorId, event_type: 'supervision_training_shared', entity_type: 'user', entity_id: d.person.id, metadata: { via: 'email', to_user_id: recipient.id, supervision_id: d.supervision?.id ?? null } })
  return { ok: true, to_name: recipient.name ?? '', to_email: recipient.email }
}
