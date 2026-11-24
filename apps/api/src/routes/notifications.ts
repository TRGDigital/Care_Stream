// Admin notifications to staff.
//   Admin  (/notifications):     who can be sent to, send (all or chosen staff), the sent list with read progress, one notification with who has read it, remind unread.
//   Staff  (/me/notifications):  my unread ones (for the sign in overlay), my list, read one, mark it read.
// A shared tablet's own token never reaches the staff routes (tabletRefusal); a PERSONAL tablet session is the person and does.
// The tables are created by prisma/sql/2026-11-25_staff_notifications.sql; until then every route answers 'not switched on yet'.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { writeAuditLog } from '../lib/audit'
import { staffPhotoUrls } from '../lib/staff-photos'
import { sendStaffNotificationEmail } from '../services/email/outbound'
import { NOTIFICATION_TITLE_MAX, NOTIFICATION_BODY_MAX } from '../services/email/notification-content'
import { ELIGIBLE_WHERE, MAX_SENDS_PER_DAY, cleanTitle, cleanBody, remindWaitMs, resolveAudience, progress } from '../lib/staff-notifications'

const p = () => prisma as any
const notReady = (res: Response) => err(res, 'NOT_SET_UP', 'Notifications are not switched on yet.', 503)
const tenantOf = (req: Request): string => (req as any).user.tenant_id
const userOf = (req: Request): string => (req as any).user.sub
const iso = (d: any) => (d ? new Date(d).toISOString() : null)

/** A missing table (the SQL has not been run yet) is 'not switched on'; anything else is a real error. */
const isMissingTable = (e: any) => e?.code === 'P2021' || /does not exist|relation .* does not exist/i.test(String(e?.message ?? ''))

async function sendTo(opts: { notification: any; people: Array<{ id: string; name: string; email: string }>; orgName: string; kind: 'new' | 'reminder' }): Promise<{ emailed: number; failed: number }> {
  let emailed = 0, failed = 0
  const queue = [...opts.people]
  const worker = async () => {
    for (let person = queue.shift(); person; person = queue.shift()) {
      try {
        await sendStaffNotificationEmail({ to: person.email, name: person.name, orgName: opts.orgName, title: opts.notification.title, body: opts.notification.body, notificationId: opts.notification.id, actorUserId: opts.notification.created_by, kind: opts.kind })
        await p().staffNotificationRecipient.updateMany({ where: { notification_id: opts.notification.id, tenant_id: opts.notification.tenant_id, user_id: person.id }, data: { email_sent_at: new Date() } })
        emailed++
      } catch (e: any) { failed++; console.error('[notifications] email failed:', String(e?.message ?? e).slice(0, 120)) }   // the notification still shows in their hub
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return { emailed, failed }
}

// ── Admin ────────────────────────────────────────────────────────────────────
export const notificationsAdminRouter = Router()
notificationsAdminRouter.use(requireAdmin)

notificationsAdminRouter.get('/staff', async (req: Request, res: Response) => {
  try {
    const rows = await p().user.findMany({ where: ELIGIBLE_WHERE(tenantOf(req)), orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, job_role: true, role: true } })
    ok(res, { staff: rows.filter((r: any) => r.email).map((r: any) => ({ id: r.id, name: r.name, job_role: r.job_role ?? null, role: r.role })) })
  } catch (e) { err(res, 'ERROR', 'Could not load staff.', 500) }
})

notificationsAdminRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await p().staffNotification.findMany({ where: { tenant_id: tenantOf(req) }, orderBy: { created_at: 'desc' }, take: 100 })
    const ids = rows.map((r: any) => r.id)
    const recips = ids.length ? await p().staffNotificationRecipient.findMany({ where: { tenant_id: tenantOf(req), notification_id: { in: ids } }, select: { notification_id: true, read_at: true } }) : []
    const tally = new Map<string, { total: number; read: number }>()
    for (const r of recips) { const t = tally.get(r.notification_id) ?? { total: 0, read: 0 }; t.total++; if (r.read_at) t.read++; tally.set(r.notification_id, t) }
    ok(res, { notifications: rows.map((n: any) => ({ id: n.id, title: n.title, created_at: iso(n.created_at), created_by_name: n.created_by_name, audience: n.audience, ...progress(tally.get(n.id)?.total ?? 0, tally.get(n.id)?.read ?? 0) })) })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load notifications.', 500) }
})

notificationsAdminRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const n = await p().staffNotification.findFirst({ where: { id: String(req.params.id), tenant_id: tenantOf(req) } })
    if (!n) { err(res, 'NOT_FOUND', 'Notification not found.', 404); return }
    const recips = await p().staffNotificationRecipient.findMany({ where: { notification_id: n.id, tenant_id: tenantOf(req) } })
    const users = await p().user.findMany({ where: { id: { in: recips.map((r: any) => r.user_id) }, tenant_id: tenantOf(req) }, select: { id: true, name: true, job_role: true, is_active: true } })
    const by = new Map<string, any>(users.map((u: any) => [u.id, u]))
    const people = recips.map((r: any) => ({ user_id: r.user_id, name: by.get(r.user_id)?.name ?? 'Former member of staff', job_role: by.get(r.user_id)?.job_role ?? null, active: by.get(r.user_id)?.is_active ?? false, email_sent: !!r.email_sent_at, read_at: iso(r.read_at) }))
      .sort((a: any, b: any) => (a.read_at ? 1 : 0) - (b.read_at ? 1 : 0) || a.name.localeCompare(b.name))
    const wait = remindWaitMs(n.last_reminded_at)
    ok(res, { notification: { id: n.id, title: n.title, body: n.body, created_at: iso(n.created_at), created_by_name: n.created_by_name, audience: n.audience, last_reminded_at: iso(n.last_reminded_at), can_remind_in_minutes: Math.ceil(wait / 60000), ...progress(people.length, people.filter((x: any) => x.read_at).length) }, people })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that notification.', 500) }
})

notificationsAdminRouter.post('/', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  const title = cleanTitle(req.body?.title, NOTIFICATION_TITLE_MAX)
  const body = cleanBody(req.body?.body, NOTIFICATION_BODY_MAX)
  if (!title) { err(res, 'INVALID', 'Please add a title.', 400); return }
  if (!body) { err(res, 'INVALID', 'Please write the message.', 400); return }
  try {
    const sentToday = await p().staffNotification.count({ where: { tenant_id: tenantId, created_at: { gte: new Date(Date.now() - 24 * 3600_000) } } })
    if (sentToday >= MAX_SENDS_PER_DAY) { err(res, 'LIMIT', `You can send up to ${MAX_SENDS_PER_DAY} notifications a day. Please try again tomorrow.`, 429); return }
    const eligible = (await p().user.findMany({ where: ELIGIBLE_WHERE(tenantId), select: { id: true, name: true, email: true, job_role: true, role: true } })).filter((u: any) => u.email)
    const r = resolveAudience({ audience: req.body?.audience, user_ids: req.body?.user_ids }, eligible)
    if ('error' in r) { err(res, 'INVALID', r.error, 400); return }
    const [sender, tenant] = await Promise.all([
      p().user.findUnique({ where: { id: userOf(req) }, select: { name: true } }),
      p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
    ])
    const n = await p().staffNotification.create({ data: { tenant_id: tenantId, title, body, created_by: userOf(req), created_by_name: sender?.name ?? 'An administrator', audience: r.audience } })
    await p().staffNotificationRecipient.createMany({ data: r.people.map(x => ({ notification_id: n.id, tenant_id: tenantId, user_id: x.id })), skipDuplicates: true })
    void writeAuditLog({ tenant_id: tenantId, user_id: userOf(req), event_type: 'staff_notification_sent', entity_type: 'staff_notification', entity_id: n.id, metadata: { audience: r.audience, recipients: r.people.length } })
    const sent = await sendTo({ notification: n, people: r.people, orgName: tenant?.name ?? 'Your service', kind: 'new' })
    ok(res, { id: n.id, recipients: r.people.length, emailed: sent.emailed, email_failed: sent.failed, dropped: r.dropped }, 201)
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not send the notification.', 500) }
})

notificationsAdminRouter.post('/:id/remind', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const n = await p().staffNotification.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } })
    if (!n) { err(res, 'NOT_FOUND', 'Notification not found.', 404); return }
    const wait = remindWaitMs(n.last_reminded_at)
    if (wait > 0) { err(res, 'REMINDED_TODAY', 'You have already sent a reminder in the last day.', 429); return }
    const unread = await p().staffNotificationRecipient.findMany({ where: { notification_id: n.id, tenant_id: tenantId, read_at: null }, select: { user_id: true } })
    const users = (await p().user.findMany({ where: { id: { in: unread.map((x: any) => x.user_id) }, ...ELIGIBLE_WHERE(tenantId) }, select: { id: true, name: true, email: true } })).filter((u: any) => u.email)
    if (users.length === 0) { err(res, 'NOTHING_TO_DO', 'Everyone who can read it has read it.', 409); return }
    await p().staffNotification.update({ where: { id: n.id }, data: { last_reminded_at: new Date() } })
    const tenant = await p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
    const sent = await sendTo({ notification: n, people: users, orgName: tenant?.name ?? 'Your service', kind: 'reminder' })
    void writeAuditLog({ tenant_id: tenantId, user_id: userOf(req), event_type: 'staff_notification_reminded', entity_type: 'staff_notification', entity_id: n.id, metadata: { recipients: users.length } })
    ok(res, { reminded: users.length, emailed: sent.emailed, email_failed: sent.failed })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not send the reminder.', 500) }
})

// ── Staff: my notifications ──────────────────────────────────────────────────
export const meNotificationsRouter = Router()

type Mine = { id: string; title: string; sender_name: string; sender_photo_url: string | null; created_at: string | null; read_at: string | null; _body: string }
async function mine(tenantId: string, userId: string, where: Record<string, unknown> = {}): Promise<Mine[]> {
  const recips = await p().staffNotificationRecipient.findMany({ where: { tenant_id: tenantId, user_id: userId, ...where }, orderBy: { created_at: 'desc' }, take: 100 })
  const notes = recips.length ? await p().staffNotification.findMany({ where: { id: { in: recips.map((r: any) => r.notification_id) }, tenant_id: tenantId } }) : []
  const by = new Map<string, any>(notes.map((n: any) => [n.id, n]))
  const photos = await staffPhotoUrls(tenantId, [...new Set<string>(notes.map((n: any) => String(n.created_by)))])
  return recips.filter((r: any) => by.has(r.notification_id)).map((r: any) => {
    const n = by.get(r.notification_id)
    return { id: n.id, title: n.title, sender_name: n.created_by_name, sender_photo_url: photos.get(n.created_by) ?? null, created_at: iso(n.created_at), read_at: iso(r.read_at), _body: n.body }
  })
}

meNotificationsRouter.get('/unread', async (req: Request, res: Response) => {
  try {
    const list = await mine(tenantOf(req), userOf(req), { read_at: null })
    if (list.length) await p().staffNotificationRecipient.updateMany({ where: { tenant_id: tenantOf(req), user_id: userOf(req), shown_at: null, notification_id: { in: list.map(l => l.id) } }, data: { shown_at: new Date() } })
    ok(res, { count: list.length, notifications: list.map(({ _body, ...n }) => n) })
  } catch (e) { ok(res, { count: 0, notifications: [] }) }   // not switched on yet: no overlay, no error
})

meNotificationsRouter.get('/', async (req: Request, res: Response) => {
  try {
    const list = await mine(tenantOf(req), userOf(req))
    list.sort((a, b) => (a.read_at ? 1 : 0) - (b.read_at ? 1 : 0) || String(b.created_at).localeCompare(String(a.created_at)))
    ok(res, { notifications: list.map(({ _body, ...n }) => n) })
  } catch (e) { ok(res, { notifications: [] }) }
})

meNotificationsRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const [n] = await mine(tenantOf(req), userOf(req), { notification_id: String(req.params.id) })
    if (!n) { err(res, 'NOT_FOUND', 'Notification not found.', 404); return }
    const { _body, ...rest } = n
    ok(res, { notification: { ...rest, body: _body } })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that notification.', 500) }
})

meNotificationsRouter.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const r = await p().staffNotificationRecipient.findFirst({ where: { notification_id: String(req.params.id), tenant_id: tenantOf(req), user_id: userOf(req) } })
    if (!r) { err(res, 'NOT_FOUND', 'Notification not found.', 404); return }
    const at = r.read_at ?? new Date()
    if (!r.read_at) {
      await p().staffNotificationRecipient.update({ where: { id: r.id }, data: { read_at: at } })
      void writeAuditLog({ tenant_id: tenantOf(req), user_id: userOf(req), event_type: 'staff_notification_read', entity_type: 'staff_notification', entity_id: r.notification_id, metadata: {} })
    }
    ok(res, { read_at: iso(at) })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not mark it as read.', 500) }
})
