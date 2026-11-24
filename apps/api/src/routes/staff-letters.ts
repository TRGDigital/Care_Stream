// My letters: the letters an administrator shared in MY hub. Staff routes only (mounted at /me/letters): everything is limited to the signed in person and their own account, a withdrawn
// letter is gone, and a shared tablet's own login never reaches this (see lib/shared-tablets.ts: only a person who entered their PIN does). The letter file is the PDF SNAPSHOT taken when it
// was shared. The administrators' side (who has read it, withdraw) lives in routes/ask.ts.
import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { downloadFile } from '../services/storage/s3'
import * as letters from '../lib/staff-letters'

export const meLettersRouter = Router()
const tenantOf = (req: Request): string => (req as any).user.tenant_id
const userOf = (req: Request): string => (req as any).user.sub
const notReady = (res: Response) => err(res, 'NOT_SET_UP', 'Letters are not switched on yet.', 503)
const dto = (l: letters.StaffLetter) => ({ id: l.id, title: l.title, filename: l.filename, size_bytes: l.size_bytes, signed: l.signed, from: l.sent_by_name, shared_at: l.shared_at, read_at: l.read_at, needs_acknowledgement: l.needs_acknowledgement, acknowledged_at: l.acknowledged_at })
const audit = (req: Request, event: Parameters<typeof writeAuditLog>[0]['event_type'], id: string) => void writeAuditLog({ tenant_id: tenantOf(req), user_id: userOf(req), event_type: event, entity_type: 'staff_letter', entity_id: id, metadata: {} })

// The sidebar asks this to decide whether to show "My letters" at all (only people who have been sent a letter see it) and what to put on the badge.
meLettersRouter.get('/meta', async (req: Request, res: Response) => {
  try { const c = await letters.unreadCount(tenantOf(req), userOf(req)); ok(res, { enabled: c.total > 0, total: c.total, unread: c.unread, needs_acknowledgement: c.needs_ack }) }
  catch { ok(res, { enabled: false, total: 0, unread: 0, needs_acknowledgement: 0 }) }   // not switched on yet: no menu item, no error
})

meLettersRouter.get('/', async (req: Request, res: Response) => {
  try { ok(res, { letters: (await letters.listMine(tenantOf(req), userOf(req))).map(dto) }) }
  catch (e) { letters.isMissingTable(e) ? ok(res, { letters: [] }) : err(res, 'ERROR', 'Could not load your letters.', 500) }
})

// The letter a hub notification is about, so the notification can offer "Open the letter".
meLettersRouter.get('/by-notification/:nid', async (req: Request, res: Response) => {
  try { const l = await letters.mineByNotification(tenantOf(req), userOf(req), String(req.params.nid)); ok(res, { letter: l ? dto(l) : null }) }
  catch { ok(res, { letter: null }) }
})

meLettersRouter.get('/:id', async (req: Request, res: Response) => {
  try {
    const l = await letters.getMine(tenantOf(req), userOf(req), String(req.params.id))
    if (!l) { err(res, 'NOT_FOUND', 'Letter not found.', 404); return }
    ok(res, { letter: dto(l) })
  } catch (e) { letters.isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load that letter.', 500) }
})

// The PDF snapshot. No store, never indexed, an audit entry each time. `?download=1` asks the browser to save it; otherwise it is shown inline (the viewer and Print).
meLettersRouter.get('/:id/file', async (req: Request, res: Response) => {
  try {
    const l = await letters.getMine(tenantOf(req), userOf(req), String(req.params.id))
    if (!l) { err(res, 'NOT_FOUND', 'Letter not found.', 404); return }
    const buf = await downloadFile(l.storage_key)
    audit(req, 'staff_letter_file_downloaded', l.id)
    res.setHeader('Content-Type', 'application/pdf'); res.setHeader('X-Content-Type-Options', 'nosniff'); res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:; object-src 'self'")
    res.setHeader('Content-Disposition', `${req.query.download === '1' ? 'attachment' : 'inline'}; filename="${l.filename.replace(/[^a-zA-Z0-9._\- ]/g, '_')}"`)
    res.send(buf)
  } catch (e) { letters.isMissingTable(e) ? notReady(res) : err(res, 'FETCH_FAILED', 'Could not fetch the letter.', 500) }
})

meLettersRouter.post('/:id/read', async (req: Request, res: Response) => {
  try {
    const first = await letters.getMine(tenantOf(req), userOf(req), String(req.params.id))
    if (!first) { err(res, 'NOT_FOUND', 'Letter not found.', 404); return }
    // An administrator looking at (or acting as) someone's hub must never mark a letter as read for them.
    if ((req as any).user?.imp) { ok(res, { read_at: first.read_at }); return }
    const at = await letters.markRead(tenantOf(req), userOf(req), first.id)
    if (!first.read_at) audit(req, 'staff_letter_read', first.id)
    ok(res, { read_at: at })
  } catch (e) { letters.isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not mark it as read.', 500) }
})

meLettersRouter.post('/:id/acknowledge', async (req: Request, res: Response) => {
  try {
    const l = await letters.getMine(tenantOf(req), userOf(req), String(req.params.id))
    if (!l) { err(res, 'NOT_FOUND', 'Letter not found.', 404); return }
    // An administrator looking at someone's hub (view as) must never acknowledge for them.
    if ((req as any).user?.imp) { err(res, 'FORBIDDEN', 'You are viewing this hub as someone else, so you cannot acknowledge a letter for them.', 403); return }
    const r = await letters.acknowledge(tenantOf(req), userOf(req), l.id)
    if (!r.ok) { err(res, 'NOT_ALLOWED', r.reason, 409); return }
    if (!l.acknowledged_at) audit(req, 'staff_letter_acknowledged', l.id)
    ok(res, { acknowledged_at: r.acknowledged_at })
  } catch (e) { letters.isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not record that.', 500) }
})
