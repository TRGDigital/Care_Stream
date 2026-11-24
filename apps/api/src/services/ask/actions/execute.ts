// Confirming a proposal: the ONLY place an action runs. It goes through the same trusted functions the normal screens use (createAndSendNotification, remindUnread,
// enrollStaff, remindEnrollment), as the person who pressed Confirm, and is audit logged "via Ask CareStream". A proposal can be confirmed once (claim), only by an allowed
// person, within 30 minutes, and not faster than the minimum gap between actions. Recipients are re-checked here, so someone who left since the proposal is dropped.
import { prisma } from '../../../db/client'
import { writeAuditLog } from '../../../lib/audit'
import { cleanTitle, cleanBody } from '../../../lib/staff-notifications'
import { isManagerJobRole } from '../../../lib/care-manager'
// The route modules are loaded when an action runs (not when this file loads), so the Ask routes stay light and testable.
const notifications = () => import('../../../routes/notifications')
const training = () => import('../../../routes/training')
import * as store from './store'
import { loadAskSettings, actionAllowed } from './settings'
import { eligibleStaff, revalidate } from './recipients'
import { hasPersonal, renderPersonal } from './fields'
import { loadPersonalValues } from './personal'
import { enrollmentsByIds } from './training-data'
import type { ActionRow, ActionType, AskSettings } from './types'
const p = () => prisma as any
const VIA = 'ask_carestream'

export type ConfirmResult = { ok: true; status: 'done'; result: any } | { ok: false; code: string; message: string; status: number; result?: any }
export interface Actor { tenantId: string; userId: string; role: string }

/** Who may confirm: the person who asked for it, who is an administrator, or (only when the account allows managers) a deciding manager. */
export async function mayConfirm(actor: Actor, a: ActionRow): Promise<boolean> {
  if (a.tenant_id !== actor.tenantId || a.user_id !== actor.userId) return false
  if (actor.role === 'admin') return true
  const s = await loadAskSettings(actor.tenantId)
  if (!s.managers_can_use) return false
  const u = await p().user.findFirst({ where: { id: actor.userId, tenant_id: actor.tenantId, is_active: true }, select: { job_role: true } })
  return isManagerJobRole(u?.job_role)
}

const fail = (code: string, message: string, status: number): ConfirmResult => ({ ok: false, code, message, status })

export interface ConfirmDeps {
  store: Pick<typeof store, 'getProposal' | 'effectiveStatus' | 'lastConfirmedAt' | 'claim' | 'finish'>
  settings: (tenantId: string) => Promise<AskSettings>
  people: (tenantId: string) => Promise<Awaited<ReturnType<typeof eligibleStaff>>>
  may: (actor: Actor, a: ActionRow) => Promise<boolean>
  audit: (o: Parameters<typeof writeAuditLog>[0]) => unknown
  runners?: Partial<Record<ActionType, (actor: Actor, a: ActionRow, ids: string[], people: Awaited<ReturnType<typeof eligibleStaff>>, s: AskSettings) => Promise<any>>>
}
const realDeps = (): ConfirmDeps => ({ store, settings: loadAskSettings, people: eligibleStaff, may: mayConfirm, audit: o => void writeAuditLog(o) })

export async function confirmAction(actor: Actor, actionId: string, now = new Date(), deps: ConfirmDeps = realDeps()): Promise<ConfirmResult> {
  const store = deps.store, loadAskSettings = deps.settings, eligibleStaff = deps.people
  const writeAuditLog = deps.audit as typeof import('../../../lib/audit').writeAuditLog
  const a = await store.getProposal(actor.tenantId, actionId)
  if (!a) return fail('NOT_FOUND', 'That proposal was not found.', 404)
  if (!(await deps.may(actor, a))) return fail('NOT_ALLOWED', 'Only the person who asked for this can confirm it.', 403)
  const st = store.effectiveStatus(a, now.getTime())
  if (st === 'expired') return fail('EXPIRED', 'This proposal has expired (they last 30 minutes). Ask again to get a fresh one.', 410)
  if (st !== 'proposed') return fail('ALREADY', st === 'done' ? 'This has already been done.' : `This proposal is ${st}.`, 409)
  const s = await loadAskSettings(actor.tenantId)
  const allowed = actionAllowed(s, a.type); if (!allowed.ok) return fail('SWITCHED_OFF', allowed.reason, 403)
  const ids: string[] = Array.isArray(a.payload?.user_ids) ? a.payload.user_ids : []
  if (!ids.length) return fail('NO_RECIPIENTS', 'Nobody is ticked. Choose at least one person.', 400)
  if (ids.length > s.max_recipients) return fail('TOO_MANY', `One action can reach up to ${s.max_recipients} people. Untick some, or change the limit in Settings.`, 400)
  const last = await store.lastConfirmedAt(actor.tenantId, actor.userId)
  if (last && s.min_gap_minutes > 0 && now.getTime() - last.getTime() < s.min_gap_minutes * 60_000) {
    const wait = Math.ceil((s.min_gap_minutes * 60_000 - (now.getTime() - last.getTime())) / 60_000)
    return fail('TOO_SOON', `You confirmed another action a moment ago. Please wait about ${wait} minute${wait === 1 ? '' : 's'} and try again.`, 429)
  }
  if (!(await store.claim(actor.tenantId, actionId, actor.userId))) return fail('ALREADY', 'This has already been confirmed.', 409)

  const people = await eligibleStaff(actor.tenantId)
  let result: any
  try {
    const custom = deps.runners?.[a.type]
    if (custom) result = await custom(actor, a, ids, people, s)
    else if (a.type === 'send_staff_notification') result = await runNotification(actor, a, ids, people, s.emails_enabled)
    else if (a.type === 'remind_unread_notification') result = await runUnreadReminder(actor, a, ids, people)
    else if (a.type === 'allocate_training') result = await runAllocation(actor, a, ids, people)
    else result = await runTrainingReminders(actor, a, ids, people)
  } catch (e: any) {
    await store.finish(actor.tenantId, actionId, 'failed', { error: 'It could not be completed. Nothing further was sent.' })
    writeAuditLog({ tenant_id: actor.tenantId, user_id: actor.userId, event_type: 'ask_action_failed', entity_type: 'ask_action', entity_id: actionId, metadata: { type: a.type, via: VIA } })
    return fail('FAILED', 'It could not be completed just now. Please check the Notifications or Training screen before trying again.', 500)
  }
  if (result?.error) {
    await store.finish(actor.tenantId, actionId, 'failed', result)
    writeAuditLog({ tenant_id: actor.tenantId, user_id: actor.userId, event_type: 'ask_action_failed', entity_type: 'ask_action', entity_id: actionId, metadata: { type: a.type, via: VIA } })
    return { ok: false, code: result.code ?? 'FAILED', message: result.error, status: result.status ?? 409, result }
  }
  await store.finish(actor.tenantId, actionId, 'done', result)
  writeAuditLog({ tenant_id: actor.tenantId, user_id: actor.userId, event_type: 'ask_action_confirmed', entity_type: 'ask_action', entity_id: actionId, metadata: { type: a.type, recipients: result.recipients ?? ids.length, via: VIA } })   // counts and type only, never the message
  return { ok: true, status: 'done', result }
}

async function runNotification(actor: Actor, a: ActionRow, ids: string[], people: Awaited<ReturnType<typeof eligibleStaff>>, emailsOn: boolean) {
  const { kept, dropped } = revalidate(ids, people, true)
  if (!kept.length) return { error: 'None of those people can receive notifications any more.', code: 'NO_RECIPIENTS', status: 409 }
  const title = cleanTitle(a.payload.title, 120), body = cleanBody(a.payload.body, 2000)
  const email = !!a.payload.email && emailsOn
  const who = people.filter(x => kept.includes(x.id)).map(x => ({ id: x.id, name: x.name }))
  // A message without personal fields is ONE notification. With personal fields each person gets their own (their own figures only), in one batch that counts once against the daily limit.
  if (!hasPersonal(`${title}\n${body}`)) {
    const r = await (await notifications()).createAndSendNotification({ tenantId: actor.tenantId, userId: actor.userId, title, body, audience: 'selected', userIds: kept, files: [], email, via: VIA })
    if (!r.ok) return { error: r.message, code: r.code, status: r.status }
    return { recipients: r.recipients, emailed: r.emailed, email_failed: r.email_failed, dropped, notification_ids: [r.id], personalised: false }
  }
  const values = await loadPersonalValues(actor.tenantId, who)
  const sentIds: string[] = []; let emailed = 0, failed = 0, first = true
  for (const w of who) {
    const v = values.get(w.id); if (!v) continue
    const r = await (await notifications()).createAndSendNotification({ tenantId: actor.tenantId, userId: actor.userId, title: cleanTitle(renderPersonal(title, v), 120), body: cleanBody(renderPersonal(body, v), 2000), audience: 'selected', userIds: [w.id], files: [], email, skipDailyLimit: !first, via: VIA })
    if (!r.ok) { if (first) return { error: r.message, code: r.code, status: r.status }; continue }
    first = false; sentIds.push(r.id); emailed += r.emailed; failed += r.email_failed
  }
  return { recipients: sentIds.length, emailed, email_failed: failed, dropped, notification_ids: sentIds, personalised: true }
}

async function runUnreadReminder(actor: Actor, a: ActionRow, ids: string[], people: Awaited<ReturnType<typeof eligibleStaff>>) {
  const { kept } = revalidate(ids, people, true)
  const r = await (await notifications()).remindUnread({ tenantId: actor.tenantId, userId: actor.userId, notificationId: String(a.payload.notification_id), onlyUserIds: kept, via: VIA })
  if (!r.ok) return { error: r.message, code: r.code, status: r.status }
  return { recipients: r.reminded, emailed: r.emailed, email_failed: r.email_failed }
}

async function runAllocation(actor: Actor, a: ActionRow, ids: string[], people: Awaited<ReturnType<typeof eligibleStaff>>) {
  const { kept, dropped } = revalidate(ids, people, false)
  if (!kept.length) return { error: 'None of those people can be allocated training any more.', code: 'NO_RECIPIENTS', status: 409 }
  const r = await (await training()).enrollStaff({ tenantId: actor.tenantId, userId: actor.userId, userIds: kept, moduleIds: a.payload.module_ids, dueDate: a.payload.due_date })
  if (!r.ok) return { error: r.message, code: r.code, status: r.status }
  r.after()
  void writeAuditLog({ tenant_id: actor.tenantId, user_id: actor.userId, event_type: 'ask_action_confirmed', entity_type: 'ask_action', entity_id: a.id, metadata: { type: 'allocate_training_detail', allocated: r.enrolled, skipped: r.skipped, via: VIA } })
  return { recipients: kept.length, allocated: r.enrolled, skipped: r.skipped, dropped }
}

async function runTrainingReminders(actor: Actor, a: ActionRow, ids: string[], people: Awaited<ReturnType<typeof eligibleStaff>>) {
  const { kept } = revalidate(ids, people, false)
  const keep = new Set(kept)
  const items = (await enrollmentsByIds(actor.tenantId, a.payload.enrollment_ids ?? [])).filter(i => keep.has(i.user_id))
  let sent = 0, skipped = 0
  for (const i of items) {
    const r = await (await training()).remindEnrollment({ tenantId: actor.tenantId, actorUserId: actor.userId, enrollmentId: i.id })
    if (r.ok) sent++; else skipped++
  }
  if (sent === 0) return { error: skipped ? 'No reminders could be sent (they may have been reminded in the last few minutes, or have nowhere to send to).' : 'There is nothing to remind.', code: 'NOTHING_TO_DO', status: 409 }
  return { recipients: new Set(items.map(i => i.user_id)).size, reminders: sent, skipped }
}
