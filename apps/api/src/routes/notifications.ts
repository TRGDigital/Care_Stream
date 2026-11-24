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
import { withdrawNotification, withdrawnSet } from '../lib/notification-withdraw'
import { staffPhotoUrls } from '../lib/staff-photos'
import { sendStaffNotificationEmail } from '../services/email/outbound'
import { NOTIFICATION_TITLE_MAX, NOTIFICATION_BODY_MAX } from '../services/email/notification-content'
import { notificationFileUploadMiddleware } from '../middleware/upload'
import { putPrivateObject } from '../services/storage/s3'
import { downloadFile, deleteFile } from '../services/storage/s3'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { randomUUID } from 'crypto'
import { detectNotificationFile, cleanFileName, checkTotals, INLINE_TYPES, NOTIFICATION_FILE_MAX_FILES } from '../lib/notification-file'
import { ELIGIBLE_WHERE, MAX_SENDS_PER_DAY, cleanTitle, cleanBody, remindWaitMs, resolveAudience, progress } from '../lib/staff-notifications'

const p = () => prisma as any
const notReady = (res: Response) => err(res, 'NOT_SET_UP', 'Notifications are not switched on yet.', 503)
const tenantOf = (req: Request): string => (req as any).user.tenant_id
const userOf = (req: Request): string => (req as any).user.sub
const iso = (d: any) => (d ? new Date(d).toISOString() : null)

/** A missing table (the SQL has not been run yet) is 'not switched on'; anything else is a real error. */
const isMissingTable = (e: any) => e?.code === 'P2021' || /does not exist|relation .* does not exist/i.test(String(e?.message ?? ''))

// ── Documents on a notification ──────────────────────────────────────────────
const fileDto = (f: any) => ({ id: f.id, name: f.name, mime: f.mime, size_bytes: f.size_bytes })
const noFiles = (res: Response) => err(res, 'NOT_SET_UP', 'Attachments are not switched on yet.', 503)

/** The documents on some notifications, by notification id. A missing table is simply no documents, so notifications keep working. */
async function filesFor(tenantId: string, ids: string[]): Promise<Map<string, any[]>> {
  const out = new Map<string, any[]>()
  if (!ids.length) return out
  try {
    const rows = await p().staffNotificationFile.findMany({ where: { tenant_id: tenantId, notification_id: { in: ids } }, orderBy: { created_at: 'asc' } })
    for (const f of rows) { const l = out.get(f.notification_id) ?? []; l.push(f); out.set(f.notification_id, l) }
  } catch { /* the table is not there yet */ }
  return out
}

/** Sends one stored document back: safe types are shown in the browser, everything else downloads. Private, never cached. */
async function sendFile(res: Response, f: any) {
  const buf = await downloadFile(f.storage_key)
  const inline = INLINE_TYPES.has(f.mime)
  res.setHeader('Content-Type', inline ? f.mime : 'application/octet-stream')
  res.setHeader('X-Content-Type-Options', 'nosniff')
  res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; object-src 'self'")
  res.setHeader('Cache-Control', 'private, no-store')
  res.setHeader('Content-Disposition', `${inline ? 'inline' : 'attachment'}; filename="${String(f.name).replace(/[^a-zA-Z0-9._\- ]/g, '_')}"`)
  res.send(buf)
}

async function sendTo(opts: { notification: any; people: Array<{ id: string; name: string; email: string }>; orgName: string; kind: 'new' | 'reminder'; attachments?: number }): Promise<{ emailed: number; failed: number }> {
  let emailed = 0, failed = 0
  const queue = [...opts.people]
  const worker = async () => {
    for (let person = queue.shift(); person; person = queue.shift()) {
      try {
        await sendStaffNotificationEmail({ to: person.email, name: person.name, orgName: opts.orgName, title: opts.notification.title, body: opts.notification.body, notificationId: opts.notification.id, actorUserId: opts.notification.created_by, kind: opts.kind , attachments: opts.attachments ?? 0})
        await p().staffNotificationRecipient.updateMany({ where: { notification_id: opts.notification.id, tenant_id: opts.notification.tenant_id, user_id: person.id }, data: { email_sent_at: new Date() } })
        emailed++
      } catch (e: any) { failed++; console.error('[notifications] email failed:', String(e?.message ?? e).slice(0, 120)) }   // the notification still shows in their hub
    }
  }
  await Promise.all([worker(), worker(), worker(), worker()])
  return { emailed, failed }
}


/** Creates a notification for the chosen staff, attaches the (already uploaded, still unsent) documents, records who it went to and emails them. Used by the Notifications page and by
 *  Ask CareStream when an approved letter or newsletter is shared. The caller has already checked the title, body and documents. */
export async function createAndSendNotification(o: { tenantId: string; userId: string; title: string; body: string; audience: unknown; userIds?: unknown; files: any[]; email?: boolean; skipDailyLimit?: boolean; via?: string }):
  Promise<{ ok: true; id: string; recipients: number; emailed: number; email_failed: number; dropped: number } | { ok: false; code: string; message: string; status: number }> {
  const { tenantId } = o
  const sentToday = o.skipDailyLimit ? 0 : await p().staffNotification.count({ where: { tenant_id: tenantId, created_at: { gte: new Date(Date.now() - 24 * 3600_000) } } })
  if (sentToday >= MAX_SENDS_PER_DAY) return { ok: false, code: 'LIMIT', message: `You can send up to ${MAX_SENDS_PER_DAY} notifications a day. Please try again tomorrow.`, status: 429 }
  const eligible = (await p().user.findMany({ where: ELIGIBLE_WHERE(tenantId), select: { id: true, name: true, email: true, job_role: true, role: true } })).filter((u: any) => u.email)
  const r = resolveAudience({ audience: o.audience, user_ids: o.userIds }, eligible)
  if ('error' in r) return { ok: false, code: 'INVALID', message: r.error, status: 400 }
  const [sender, tenant] = await Promise.all([
    p().user.findUnique({ where: { id: o.userId }, select: { name: true } }),
    p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
  ])
  const n = await p().staffNotification.create({ data: { tenant_id: tenantId, title: o.title, body: o.body, created_by: o.userId, created_by_name: sender?.name ?? 'An administrator', audience: r.audience } })
  if (o.files.length) await p().staffNotificationFile.updateMany({ where: { id: { in: o.files.map((f: any) => f.id) }, tenant_id: tenantId, notification_id: null }, data: { notification_id: n.id } })
  await p().staffNotificationRecipient.createMany({ data: r.people.map(x => ({ notification_id: n.id, tenant_id: tenantId, user_id: x.id })), skipDuplicates: true })
  void writeAuditLog({ tenant_id: tenantId, user_id: o.userId, event_type: 'staff_notification_sent', entity_type: 'staff_notification', entity_id: n.id, metadata: { audience: r.audience, recipients: r.people.length, ...(o.via ? { via: o.via } : {}) } })
  // Ask CareStream can send a hub only notification (email off); every other caller keeps the usual hub message plus email.
  const sent = o.email === false ? { emailed: 0, failed: 0 } : await sendTo({ notification: n, people: r.people, orgName: tenant?.name ?? 'Your service', kind: 'new', attachments: o.files.length })
  return { ok: true, id: n.id, recipients: r.people.length, emailed: sent.emailed, email_failed: sent.failed, dropped: r.dropped }
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

// Upload one document as a draft (it is attached when the notification is sent). Field "file", up to 4 MB, checked on its real bytes and scanned.
notificationsAdminRouter.post('/files', notificationFileUploadMiddleware, async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)   // not getTenantId(): the multipart parser runs outside the request context on this runtime
  const file = (req as any).file as Express.Multer.File | undefined
  if (!file) { err(res, 'NO_FILE', 'No file was uploaded.', 400); return }
  try {
    const found = detectNotificationFile(file.buffer, file.originalname)
    if (!found.ok) { err(res, 'INVALID_FILE', found.reason, 400); return }
    const drafts = await p().staffNotificationFile.count({ where: { tenant_id: tenantId, created_by: userOf(req), notification_id: null, created_at: { gte: new Date(Date.now() - 24 * 3600_000) } } })
    if (drafts >= NOTIFICATION_FILE_MAX_FILES * 3) { err(res, 'LIMIT', 'Please send or remove the documents you have already added first.', 429); return }
    const scan = await scanBuffer(file.buffer, file.originalname)
    if (scan.status === 'infected') { err(res, 'MALWARE_DETECTED', 'That file was flagged by the virus scanner and was not uploaded.', 400); return }
    if (scan.status === 'error' && scannerConfigured()) { err(res, 'SCAN_FAILED', 'The file could not be virus scanned just now, so it was not uploaded. Please try again.', 503); return }
    const id = randomUUID()
    const key = `tenants/${tenantId}/notification-files/${id}.${found.ext}`
    await putPrivateObject(key, file.buffer, found.mime)
    const name = cleanFileName(file.originalname, found.ext)
    const row = await p().staffNotificationFile.create({ data: { id, tenant_id: tenantId, name, mime: found.mime, size_bytes: file.size ?? file.buffer.length, storage_key: key, scan_status: scan.status === 'clean' ? 'clean' : 'skipped', created_by: userOf(req) } })
    void writeAuditLog({ tenant_id: tenantId, user_id: userOf(req), event_type: 'staff_notification_file_uploaded', entity_type: 'staff_notification_file', entity_id: id, metadata: { name, size: row.size_bytes } })
    // Drafts nobody sent are tidied up after a day.
    void (async () => {
      try {
        const old = await p().staffNotificationFile.findMany({ where: { tenant_id: tenantId, notification_id: null, created_at: { lt: new Date(Date.now() - 24 * 3600_000) } }, take: 20 })
        for (const o of old) { await deleteFile(o.storage_key).catch(() => undefined); await p().staffNotificationFile.delete({ where: { id: o.id } }).catch(() => undefined) }
      } catch { /* ignore */ }
    })()
    ok(res, { file: fileDto(row) }, 201)
  } catch (e) { isMissingTable(e) ? noFiles(res) : err(res, 'UPLOAD_FAILED', 'Could not upload the file. Please try again.', 500) }
})

// Remove a draft document (one that has not been sent yet).
notificationsAdminRouter.delete('/files/:fileId', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  try {
    const f = await p().staffNotificationFile.findFirst({ where: { id: String(req.params.fileId), tenant_id: tenantId, created_by: userOf(req), notification_id: null } })
    if (!f) { err(res, 'NOT_FOUND', 'Document not found, or it has already been sent.', 404); return }
    await deleteFile(f.storage_key).catch(() => undefined)
    await p().staffNotificationFile.delete({ where: { id: f.id } })
    void writeAuditLog({ tenant_id: tenantId, user_id: userOf(req), event_type: 'staff_notification_file_removed', entity_type: 'staff_notification_file', entity_id: f.id, metadata: { name: f.name } })
    ok(res, { deleted: true })
  } catch (e) { isMissingTable(e) ? noFiles(res) : err(res, 'ERROR', 'Could not remove the document.', 500) }
})

// An administrator of the account downloads or views any document on a notification.
notificationsAdminRouter.get('/files/:fileId/download', async (req: Request, res: Response) => {
  try {
    const f = await p().staffNotificationFile.findFirst({ where: { id: String(req.params.fileId), tenant_id: tenantOf(req), notification_id: { not: null } } })
    if (!f) { err(res, 'NOT_FOUND', 'Document not found.', 404); return }
    await sendFile(res, f)
  } catch (e) { isMissingTable(e) ? noFiles(res) : err(res, 'FETCH_FAILED', 'Could not fetch the document.', 500) }
})

notificationsAdminRouter.get('/', async (req: Request, res: Response) => {
  try {
    const rows = await p().staffNotification.findMany({ where: { tenant_id: tenantOf(req) }, orderBy: { created_at: 'desc' }, take: 100 })
    const ids = rows.map((r: any) => r.id)
    const recips = ids.length ? await p().staffNotificationRecipient.findMany({ where: { tenant_id: tenantOf(req), notification_id: { in: ids } }, select: { notification_id: true, read_at: true } }) : []
    const tally = new Map<string, { total: number; read: number }>()
    for (const r of recips) { const t = tally.get(r.notification_id) ?? { total: 0, read: 0 }; t.total++; if (r.read_at) t.read++; tally.set(r.notification_id, t) }
    const fileMap = await filesFor(tenantOf(req), ids)
    const gone = await withdrawnSet(tenantOf(req), ids)
    ok(res, { notifications: rows.map((n: any) => ({ withdrawn: gone.has(n.id), file_count: fileMap.get(n.id)?.length ?? 0, id: n.id, title: n.title, created_at: iso(n.created_at), created_by_name: n.created_by_name, audience: n.audience, ...progress(tally.get(n.id)?.total ?? 0, tally.get(n.id)?.read ?? 0) })) })
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
    const files = (await filesFor(tenantOf(req), [n.id])).get(n.id) ?? []
    const gone = await withdrawnSet(tenantOf(req), [n.id])
    ok(res, { notification: { withdrawn: gone.has(n.id), files: files.map(fileDto), id: n.id, title: n.title, body: n.body, created_at: iso(n.created_at), created_by_name: n.created_by_name, audience: n.audience, last_reminded_at: iso(n.last_reminded_at), can_remind_in_minutes: Math.ceil(wait / 60000), ...progress(people.length, people.filter((x: any) => x.read_at).length) }, people })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that notification.', 500) }
})

notificationsAdminRouter.post('/', async (req: Request, res: Response) => {
  const tenantId = tenantOf(req)
  const title = cleanTitle(req.body?.title, NOTIFICATION_TITLE_MAX)
  const body = cleanBody(req.body?.body, NOTIFICATION_BODY_MAX)
  if (!title) { err(res, 'INVALID', 'Please add a title.', 400); return }
  if (!body) { err(res, 'INVALID', 'Please write the message.', 400); return }
  try {
    // Documents were uploaded first; they must all be here (this administrator's, this account's, not yet sent) before anything is sent.
    const fileIds: string[] = Array.isArray(req.body?.file_ids) ? [...new Set<string>(req.body.file_ids.map((x: unknown) => String(x)))] : []
    let files: any[] = []
    if (fileIds.length) {
      if (fileIds.length > NOTIFICATION_FILE_MAX_FILES) { err(res, 'INVALID', `You can attach up to ${NOTIFICATION_FILE_MAX_FILES} documents.`, 400); return }
      try { files = await p().staffNotificationFile.findMany({ where: { id: { in: fileIds }, tenant_id: tenantId, created_by: userOf(req), notification_id: null } }) }
      catch (e) { if (isMissingTable(e)) { noFiles(res); return } throw e }
      if (files.length !== fileIds.length) { err(res, 'INVALID', 'One of the documents is missing. Please add it again.', 400); return }
      const tooMuch = checkTotals(files); if (tooMuch) { err(res, 'INVALID', tooMuch, 400); return }
    }
    const made = await createAndSendNotification({ tenantId, userId: userOf(req), title, body, audience: req.body?.audience, userIds: req.body?.user_ids, files })
    if (!made.ok) { err(res, made.code, made.message, made.status); return }
    ok(res, { id: made.id, recipients: made.recipients, emailed: made.emailed, email_failed: made.email_failed, dropped: made.dropped }, 201)
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not send the notification.', 500) }
})

/** Remind the people who have not read a notification (once a day for each notification). Used by the Notifications page and by Ask CareStream (which may limit it to chosen people). */
export async function remindUnread(o: { tenantId: string; userId: string; notificationId: string; onlyUserIds?: string[]; via?: string }):
  Promise<{ ok: true; reminded: number; emailed: number; email_failed: number } | { ok: false; code: string; message: string; status: number }> {
  const tenantId = o.tenantId
  const n = await p().staffNotification.findFirst({ where: { id: o.notificationId, tenant_id: tenantId } })
  if (!n) return { ok: false, code: 'NOT_FOUND', message: 'Notification not found.', status: 404 }
  const wait = remindWaitMs(n.last_reminded_at)
  if (wait > 0) return { ok: false, code: 'REMINDED_TODAY', message: 'You have already sent a reminder in the last day.', status: 429 }
  const unread = await p().staffNotificationRecipient.findMany({ where: { notification_id: n.id, tenant_id: tenantId, read_at: null }, select: { user_id: true } })
  const only = o.onlyUserIds ? new Set(o.onlyUserIds) : null
  const users = (await p().user.findMany({ where: { id: { in: unread.map((x: any) => x.user_id).filter((id: string) => !only || only.has(id)) }, ...ELIGIBLE_WHERE(tenantId) }, select: { id: true, name: true, email: true } })).filter((u: any) => u.email)
  if (users.length === 0) return { ok: false, code: 'NOTHING_TO_DO', message: 'Everyone who can read it has read it.', status: 409 }
  await p().staffNotification.update({ where: { id: n.id }, data: { last_reminded_at: new Date() } })
  const tenant = await p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } })
  const sent = await sendTo({ notification: n, people: users, orgName: tenant?.name ?? 'Your service', kind: 'reminder', attachments: ((await filesFor(tenantId, [n.id])).get(n.id) ?? []).length })
  void writeAuditLog({ tenant_id: tenantId, user_id: o.userId, event_type: 'staff_notification_reminded', entity_type: 'staff_notification', entity_id: n.id, metadata: { recipients: users.length, emailed: sent.emailed, ...(o.via ? { via: o.via } : {}) } })
  return { ok: true, reminded: users.length, emailed: sent.emailed, email_failed: sent.failed }
}

notificationsAdminRouter.post('/:id/remind', async (req: Request, res: Response) => {
  try {
    const r = await remindUnread({ tenantId: tenantOf(req), userId: userOf(req), notificationId: String(req.params.id) })
    if (!r.ok) { err(res, r.code, r.message, r.status); return }
    ok(res, { reminded: r.reminded, emailed: r.emailed, email_failed: r.email_failed })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not send the reminder.', 500) }
})

// Withdraw a sent notification: it disappears from every recipient's hub and unread list. The email cannot be recalled.
notificationsAdminRouter.post('/:id/withdraw', async (req: Request, res: Response) => {
  try {
    const r = await withdrawNotification(tenantOf(req), userOf(req), String(req.params.id))
    if (!r.ok) { err(res, r.code, r.message, r.status); return }
    void writeAuditLog({ tenant_id: tenantOf(req), user_id: userOf(req), event_type: 'staff_notification_withdrawn', entity_type: 'staff_notification', entity_id: String(req.params.id), metadata: { recipients: r.recipients, read: r.read } })
    ok(res, { withdrawn: true, recipients: r.recipients, read: r.read, email_note: 'The emails that were already sent cannot be recalled.' })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not withdraw it.', 500) }
})

// ── Staff: my notifications ──────────────────────────────────────────────────
export const meNotificationsRouter = Router()

type Mine = { id: string; title: string; sender_name: string; sender_photo_url: string | null; created_at: string | null; read_at: string | null; file_count: number; _body: string }
async function mine(tenantId: string, userId: string, where: Record<string, unknown> = {}): Promise<Mine[]> {
  const recips = await p().staffNotificationRecipient.findMany({ where: { tenant_id: tenantId, user_id: userId, ...where }, orderBy: { created_at: 'desc' }, take: 100 })
  const notes = recips.length ? await p().staffNotification.findMany({ where: { id: { in: recips.map((r: any) => r.notification_id) }, tenant_id: tenantId } }) : []
  const by = new Map<string, any>(notes.map((n: any) => [n.id, n]))
  const photos = await staffPhotoUrls(tenantId, [...new Set<string>(notes.map((n: any) => String(n.created_by)))])
  const fileMap = await filesFor(tenantId, notes.map((n: any) => n.id))
  return recips.filter((r: any) => by.has(r.notification_id)).map((r: any) => {
    const n = by.get(r.notification_id)
    return { file_count: fileMap.get(n.id)?.length ?? 0, id: n.id, title: n.title, sender_name: n.created_by_name, sender_photo_url: photos.get(n.created_by) ?? null, created_at: iso(n.created_at), read_at: iso(r.read_at), _body: n.body }
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
    const files = (await filesFor(tenantOf(req), [n.id])).get(n.id) ?? []
    ok(res, { notification: { ...rest, body: _body, files: files.map(fileDto) } })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that notification.', 500) }
})

// A person the notification was sent to downloads one of its documents. Nobody else can, even in the same account.
meNotificationsRouter.get('/:id/files/:fileId', async (req: Request, res: Response) => {
  try {
    const r = await p().staffNotificationRecipient.findFirst({ where: { notification_id: String(req.params.id), tenant_id: tenantOf(req), user_id: userOf(req) } })
    if (!r) { err(res, 'NOT_FOUND', 'Document not found.', 404); return }
    const f = await p().staffNotificationFile.findFirst({ where: { id: String(req.params.fileId), notification_id: r.notification_id, tenant_id: tenantOf(req) } })
    if (!f) { err(res, 'NOT_FOUND', 'Document not found.', 404); return }
    void writeAuditLog({ tenant_id: tenantOf(req), user_id: userOf(req), event_type: 'staff_notification_file_downloaded', entity_type: 'staff_notification_file', entity_id: f.id, metadata: {} })
    await sendFile(res, f)
  } catch (e) { isMissingTable(e) ? noFiles(res) : err(res, 'FETCH_FAILED', 'Could not fetch the document.', 500) }
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
