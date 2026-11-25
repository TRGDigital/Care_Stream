// Ask CareStream actions. Mounted by routes/ask.ts at /ask/actions (after its guard: a pilot account and an allowed person only).
//   GET  /settings             the guardrail switches (administrators)         PUT /settings   change them (administrators, audit logged)
//   GET  /staff                the people an action could reach (for the picker on the card)
//   GET  /:id                  one proposal as a card
//   PATCH /:id                 edit the wording, the people, the due date or the email switch before confirming
//   POST /:id/confirm          do it (once)                                    POST /:id/cancel   drop it
import { Router, Request, Response } from 'express'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { cleanTitle, cleanBody } from '../lib/staff-notifications'
import { NOTIFICATION_TITLE_MAX, NOTIFICATION_BODY_MAX } from '../services/email/notification-content'
import * as store from '../services/ask/actions/store'
import { loadAskSettings, saveAskSettings, missingTable } from '../services/ask/actions/settings'
import { approverEmailsOn, saveApproverEmails } from '../services/ask-docs/approver-deps'
import { buildCard } from '../services/ask/actions/card'
import { confirmAction, mayConfirm } from '../services/ask/actions/execute'
import { eligibleStaff, revalidate, recipientCards, adminsFirst } from '../services/ask/actions/recipients'
import { fieldsIn } from '../services/ask/actions/fields'

export const askActionsRouter = Router()
const notReady = (res: Response) => err(res, 'NOT_READY', 'Ask CareStream actions are not switched on yet.', 503)
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)
const actor = (req: Request) => ({ tenantId: getTenantId(), userId: req.user!.sub, role: String(req.user!.role) })
const wrap = (fn: (req: Request, res: Response) => Promise<void>) => async (req: Request, res: Response) => {
  try { await fn(req, res) } catch (e: any) { if (missingTable(e)) notReady(res); else { console.error('[ask-actions]', String(e?.message ?? e).slice(0, 160)); err(res, 'ERROR', 'Something went wrong.', 500) } }
}
const YMD = /^\d{4}-\d{2}-\d{2}$/

askActionsRouter.get('/settings', wrap(async (req, res) => {
  if (req.user!.role !== 'admin') { notFound(res); return }
  ok(res, { settings: { ...(await loadAskSettings(getTenantId())), approver_emails: await approverEmailsOn(getTenantId()) }, ready: await store.tablesReady() })
}))
askActionsRouter.put('/settings', wrap(async (req, res) => {
  if (req.user!.role !== 'admin') { notFound(res); return }
  const b = req.body ?? {}
  const patch: any = {}
  for (const k of ['actions_enabled', 'notifications_enabled', 'training_enabled', 'emails_enabled', 'managers_can_use']) if (typeof b[k] === 'boolean') patch[k] = b[k]
  for (const k of ['max_recipients', 'min_gap_minutes']) if (b[k] != null && Number.isFinite(Number(b[k]))) patch[k] = Number(b[k])
  const next: any = await saveAskSettings(getTenantId(), patch)
  if (typeof b.approver_emails === 'boolean') { try { await saveApproverEmails(getTenantId(), b.approver_emails); patch.approver_emails = b.approver_emails } catch { err(res, 'NOT_READY', 'That switch is not available yet. Please try again later.', 409); return } }
  next.approver_emails = await approverEmailsOn(getTenantId())
  void writeAuditLog({ tenant_id: getTenantId(), user_id: req.user!.sub, event_type: 'ask_settings_changed', entity_type: 'tenant', entity_id: getTenantId(), metadata: { changed: Object.keys(patch) } })
  ok(res, { settings: next })
}))

askActionsRouter.get('/staff', wrap(async (req, res) => {
  const people = adminsFirst(await eligibleStaff(getTenantId()))   // active staff only, administrators first, then A to Z; each with the picture the admin added (a signed, authenticated address), or none
  const cards = await recipientCards(getTenantId(), people.map(x => x.id), people)
  ok(res, { staff: cards.map((c, i) => ({ ...c, has_email: people[i].has_email })) })
}))

askActionsRouter.get('/:id', wrap(async (req, res) => {
  const a = await store.getProposal(getTenantId(), String(req.params.id))
  if (!a || a.user_id !== req.user!.sub) { notFound(res); return }
  ok(res, { card: await buildCard(getTenantId(), a, await loadAskSettings(getTenantId())) })
}))

askActionsRouter.patch('/:id', wrap(async (req, res) => {
  const t = getTenantId(), a = await store.getProposal(t, String(req.params.id))
  if (!a || a.user_id !== req.user!.sub) { notFound(res); return }
  if (store.effectiveStatus(a) !== 'proposed') { err(res, 'NOT_EDITABLE', 'This can no longer be edited.', 409); return }
  const s = await loadAskSettings(t), people = await eligibleStaff(t), b = req.body ?? {}
  const pl: any = { ...a.payload }
  if (Array.isArray(b.user_ids)) {
    const wanted: string[] = [...new Set<string>(b.user_ids.map((x: unknown) => String(x)))]
    const limited = a.type === 'remind_unread_notification' || a.type === 'send_training_reminders'
    const pool = limited ? wanted.filter(i => (pl.suggested_ids ?? []).includes(i)) : wanted   // reminders can only be narrowed, not widened
    const { kept } = revalidate(pool, people, a.type === 'send_staff_notification' || a.type === 'remind_unread_notification')
    if (kept.length > s.max_recipients) { err(res, 'TOO_MANY', `One action can reach up to ${s.max_recipients} people.`, 400); return }
    pl.user_ids = kept
    if (a.type === 'send_staff_notification') pl.all_staff = kept.length === people.filter(x => x.has_email).length
  }
  if (a.type === 'send_staff_notification') {
    if (b.title != null) pl.title = cleanTitle(b.title, NOTIFICATION_TITLE_MAX)
    if (b.body != null) pl.body = cleanBody(b.body, NOTIFICATION_BODY_MAX)
    if (!pl.title || !pl.body) { err(res, 'INVALID', 'A notification needs a title and a message.', 400); return }
    const f = fieldsIn(`${pl.title}\n${pl.body}`); if (f.unknown.length) { err(res, 'INVALID', `These placeholders are not allowed: ${f.unknown.join(', ')}.`, 400); return }
    if (typeof b.email === 'boolean') pl.email = b.email && s.emails_enabled
  }
  if (a.type === 'allocate_training' && b.due_date !== undefined) { if (b.due_date && !YMD.test(String(b.due_date))) { err(res, 'INVALID', 'The due date is not valid.', 400); return } pl.due_date = b.due_date || null }
  if (!(await store.updatePayload(t, a.id, pl))) { err(res, 'NOT_EDITABLE', 'This can no longer be edited.', 409); return }
  const fresh = await store.getProposal(t, a.id)
  ok(res, { card: await buildCard(t, fresh!, s, people) })
}))

askActionsRouter.post('/:id/confirm', wrap(async (req, res) => {
  const me = actor(req), a = await store.getProposal(me.tenantId, String(req.params.id))
  if (!a || !(await mayConfirm(me, a))) { notFound(res); return }
  const r = await confirmAction(me, a.id)
  const fresh = await store.getProposal(me.tenantId, a.id)
  const card = fresh ? await buildCard(me.tenantId, fresh, await loadAskSettings(me.tenantId)) : null
  if (!r.ok) { err(res, r.code, r.message, r.status); return }
  ok(res, { card, result: r.result })
}))

askActionsRouter.post('/:id/cancel', wrap(async (req, res) => {
  const t = getTenantId()
  if (!(await store.cancel(t, req.user!.sub, String(req.params.id)))) { notFound(res); return }
  void writeAuditLog({ tenant_id: t, user_id: req.user!.sub, event_type: 'ask_action_cancelled', entity_type: 'ask_action', entity_id: String(req.params.id), metadata: {} })
  ok(res, { cancelled: true })
}))
