// Shared tablets (all paid plans). Three routers:
//   tabletPublicRouter  /public/tablet/*   connect a tablet from the printed QR (needs the connect key AND a staff PIN)
//   tabletRouter        /tablet/*          a connected tablet: who can use it, and starting a personal session with a PIN
//   tabletsAdminRouter  /tablets/*         admins: add / revoke tablets, the poster key, and staff PINs
// See lib/shared-tablets.ts and ~/carestream-content/specs/shared-tablet-login.md.

import { Router, Request, Response } from 'express'
import jwt from 'jsonwebtoken'
import crypto from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { writeAuditLog } from '../lib/audit'
import { generateAccessToken, generateTabletPersonalToken, TABLET_PERSONAL_MINUTES } from '../services/auth/tokens'
import { issueRefreshToken, revokeUserRefreshTokens } from '../lib/refresh-tokens'
import { mintLoginToken, consumeLoginToken } from '../lib/login-tokens'
import { hashPassword } from '../services/auth/password'
import { staffPhotoUrls } from '../lib/staff-photos'
import { sendStaffPinEmail } from '../services/email/outbound'
import { forgetDevice } from '../middleware/sharedDeviceGuard'
import {
  checkPin, setPin, readPin, takeResendSlot, getOrCreateConnectKey, rotateConnectKey, tenantForKey, noteKeyFailure,
  TABLET_STAFF_WHERE, REMINDER_CHOICES, DEFAULT_REMINDER_MONTHS, reminderDays,
} from '../lib/shared-tablets'

const p = () => prisma as any
const MAX_TABLETS = 5
const notSetUp = (res: Response) => err(res, 'NOT_SET_UP', 'Shared tablets are not set up yet.', 503)

// ── Public: connect a tablet ─────────────────────────────────────────────────
export const tabletPublicRouter = Router()

tabletPublicRouter.get('/:key/info', async (req: Request, res: Response) => {
  try {
    const k = await tenantForKey(String(req.params.key))
    if (!k) { err(res, 'INVALID_KEY', 'This poster is out of date. Ask an administrator for the new one.', 404); return }
    const t = await p().tenant.findUnique({ where: { id: k.tenantId }, select: { name: true } })
    ok(res, { home_name: t?.name ?? '', blocked: k.blocked })
  } catch { notSetUp(res) }
})

// Staff type the first letters of their name; there is no full list before a tablet is connected.
tabletPublicRouter.get('/:key/search', async (req: Request, res: Response) => {
  try {
    const k = await tenantForKey(String(req.params.key))
    if (!k) { err(res, 'INVALID_KEY', 'This poster is out of date.', 404); return }
    if (k.blocked) { err(res, 'TOO_MANY', 'Too many wrong attempts. Please wait a few minutes.', 429); return }
    const q = String(req.query.q ?? '').trim()
    if (q.length < 3) { ok(res, { people: [] }); return }
    const rows = await p().user.findMany({
      where: { ...TABLET_STAFF_WHERE(k.tenantId), name: { contains: q, mode: 'insensitive' } },
      select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 6,
    })
    const photos = await staffPhotoUrls(k.tenantId, rows.map((r: any) => r.id))
    ok(res, { people: rows.map((r: any) => ({ id: r.id, name: r.name, photo_url: photos.get(r.id) ?? null })) })
  } catch { notSetUp(res) }
})

// Step 1: the person proves who they are with their PIN. Wrong guesses count against the person AND the poster key.
tabletPublicRouter.post('/verify', async (req: Request, res: Response) => {
  try {
    const k = await tenantForKey(String(req.body?.key ?? ''))
    if (!k) { err(res, 'INVALID_KEY', 'This poster is out of date. Ask an administrator for the new one.', 404); return }
    if (k.blocked) { err(res, 'TOO_MANY', 'Too many wrong attempts. Please wait a few minutes.', 429); return }
    const user = await p().user.findFirst({ where: { id: String(req.body?.user_id ?? ''), ...TABLET_STAFF_WHERE(k.tenantId) }, select: { id: true, name: true } })
    if (!user) { err(res, 'WRONG_PIN', 'That PIN is not right.', 401); return }
    const c = await checkPin(user.id, String(req.body?.pin ?? ''))
    if (!c.ok) {
      if (c.reason !== 'locked') await noteKeyFailure(k.tenantId)
      const msg = c.reason === 'locked' ? 'Too many wrong tries. Please wait a few minutes, or ask an administrator.' : c.reason === 'no_pin' ? 'You do not have a PIN yet. Ask an administrator to send you one.' : `That PIN is not right. ${c.remaining} ${c.remaining === 1 ? 'try' : 'tries'} left.`
      err(res, c.reason === 'locked' ? 'LOCKED' : 'WRONG_PIN', msg, c.reason === 'locked' ? 429 : 401); return
    }
    const tablets = await p().sharedDevice.findMany({ where: { tenant_id: k.tenantId, revoked_at: null }, orderBy: { name: 'asc' }, select: { id: true, name: true, location: true, paired_at: true } })
    const ticket = jwt.sign({ purpose: 'tablet-connect', uid: user.id, tid: k.tenantId }, process.env.JWT_SECRET!, { expiresIn: '5m' })
    ok(res, { ticket, person: { name: user.name }, tablets: tablets.map((t: any) => ({ id: t.id, name: t.name, location: t.location, connected: !!t.paired_at })) })
  } catch { notSetUp(res) }
})

// Step 2: choose which tablet this is, and it is connected (a long lived, revocable device session).
tabletPublicRouter.post('/complete', async (req: Request, res: Response) => {
  try {
    let t: any
    try { t = jwt.verify(String(req.body?.ticket ?? ''), process.env.JWT_SECRET!) } catch { err(res, 'INVALID_TICKET', 'That took too long. Please start again.', 401); return }
    if (t?.purpose !== 'tablet-connect') { err(res, 'INVALID_TICKET', 'Please start again.', 401); return }
    const device = await p().sharedDevice.findFirst({ where: { id: String(req.body?.tablet_id ?? ''), tenant_id: t.tid, revoked_at: null } })
    if (!device) { err(res, 'NOT_FOUND', 'That tablet is not set up. Ask an administrator.', 404); return }
    const [tenant, who] = await Promise.all([p().tenant.findUnique({ where: { id: t.tid }, select: { name: true } }), p().user.findUnique({ where: { id: t.uid }, select: { name: true } })])
    await revokeUserRefreshTokens(device.user_id)   // connecting again replaces whatever was connected before
    forgetDevice(device.id)
    await p().sharedDevice.update({ where: { id: device.id }, data: { paired_at: new Date(), paired_by: t.uid, last_seen_at: new Date() } })
    const access = generateAccessToken({ sub: device.user_id, tenant_id: t.tid, role: 'staff', dev: { t: 'device', d: device.id } })
    const refresh = await issueRefreshToken(device.user_id)
    void writeAuditLog({ tenant_id: t.tid, user_id: t.uid, event_type: 'shared_tablet_connected', entity_type: 'shared_device', entity_id: device.id, metadata: { tablet: device.name, by: who?.name } })
    ok(res, { access_token: access, refresh_token: refresh, tenant_name: tenant?.name ?? '', tablet: { id: device.id, name: device.name }, user: { id: device.user_id, name: device.name } })
  } catch { notSetUp(res) }
})

// Back to the tablet itself after a personal session. The return token is single use and only ever minted for a tablet's own account.
tabletPublicRouter.post('/return', async (req: Request, res: Response) => {
  try {
    const used = await consumeLoginToken(String(req.body?.return_token ?? ''))
    if (!used) { err(res, 'INVALID_TOKEN', 'This tablet needs to be connected again.', 401); return }
    const [user, device] = await Promise.all([
      p().user.findUnique({ where: { id: used.user_id }, select: { id: true, tenant_id: true, is_shared: true, name: true } }),
      p().sharedDevice.findUnique({ where: { user_id: used.user_id } }),
    ])
    if (!user?.is_shared || !device || device.revoked_at) { err(res, 'INVALID_TOKEN', 'This tablet needs to be connected again.', 401); return }
    const tenant = await p().tenant.findUnique({ where: { id: user.tenant_id }, select: { name: true } })
    ok(res, {
      access_token: generateAccessToken({ sub: user.id, tenant_id: user.tenant_id, role: 'staff', dev: { t: 'device', d: device.id } }),
      refresh_token: await issueRefreshToken(user.id), tenant_name: tenant?.name ?? '', user: { id: user.id, name: user.name },
    })
  } catch { notSetUp(res) }
})

// ── A connected tablet ───────────────────────────────────────────────────────
export const tabletRouter = Router()

const deviceFails = new Map<string, { n: number; at: number }>()   // per tablet: stops a stranger guessing PINs one person after another
function deviceBlocked(d: string): boolean { const f = deviceFails.get(d); return !!f && Date.now() - f.at < 10 * 60_000 && f.n >= 30 }
function deviceFail(d: string) { const f = deviceFails.get(d); deviceFails.set(d, !f || Date.now() - f.at >= 10 * 60_000 ? { n: 1, at: Date.now() } : { n: f.n + 1, at: f.at }) }

tabletRouter.get('/roster', async (req: Request, res: Response) => {
  if (req.user?.dev?.t !== 'device') { err(res, 'FORBIDDEN', 'Only a connected shared tablet can see this.', 403); return }
  try {
    const tenantId = req.user!.tenant_id
    const staff = await p().user.findMany({ where: TABLET_STAFF_WHERE(tenantId), select: { id: true, name: true }, orderBy: { name: 'asc' } })
    const [photos, pins] = await Promise.all([staffPhotoUrls(tenantId, staff.map((s: any) => s.id)), p().staffPin.findMany({ where: { tenant_id: tenantId }, select: { user_id: true } })])
    const has = new Set(pins.map((x: any) => x.user_id))
    ok(res, { people: staff.map((s: any) => ({ id: s.id, name: s.name, photo_url: photos.get(s.id) ?? null, has_pin: has.has(s.id) })) })
  } catch { notSetUp(res) }
})

tabletRouter.post('/personal/start', async (req: Request, res: Response) => {
  const dev = req.user?.dev
  if (dev?.t !== 'device') { err(res, 'FORBIDDEN', 'Only a connected shared tablet can do this.', 403); return }
  if (deviceBlocked(dev.d)) { err(res, 'TOO_MANY', 'Too many wrong attempts on this tablet. Please wait a few minutes.', 429); return }
  try {
    const tenantId = req.user!.tenant_id
    const user = await p().user.findFirst({ where: { id: String(req.body?.user_id ?? ''), ...TABLET_STAFF_WHERE(tenantId) }, select: { id: true, name: true } })
    if (!user) { deviceFail(dev.d); err(res, 'WRONG_PIN', 'That PIN is not right.', 401); return }
    const c = await checkPin(user.id, String(req.body?.pin ?? ''))
    if (!c.ok) {
      if (c.reason !== 'locked') deviceFail(dev.d)
      const msg = c.reason === 'locked' ? 'Too many wrong tries. Please wait a few minutes, or ask an administrator.' : c.reason === 'no_pin' ? 'You do not have a PIN yet. Ask an administrator to send you one.' : `That PIN is not right. ${c.remaining} ${c.remaining === 1 ? 'try' : 'tries'} left.`
      err(res, c.reason === 'locked' ? 'LOCKED' : 'WRONG_PIN', msg, c.reason === 'locked' ? 429 : 401); return
    }
    // Always an ordinary staff session, even for an administrator: admin screens are never reachable from a shared tablet.
    const token = generateTabletPersonalToken({ sub: user.id, tenant_id: tenantId, role: 'staff', dev: { t: 'personal', d: dev.d } })
    await p().sharedSession.create({ data: { tenant_id: tenantId, device_id: dev.d, user_id: user.id } })
    void writeAuditLog({ tenant_id: tenantId, user_id: user.id, event_type: 'shared_tablet_session_started', entity_type: 'shared_device', entity_id: dev.d, metadata: {} })
    // A one time token that brings this browser back to the tablet itself when the person taps Done (or the tablet times out).
    const returnToken = await mintLoginToken(req.user!.sub, tenantId, (TABLET_PERSONAL_MINUTES + 10) * 60_000, 'tablet-return')
    ok(res, { access_token: token, return_token: returnToken, expires_in: TABLET_PERSONAL_MINUTES * 60, user: { id: user.id, name: user.name } })
  } catch { notSetUp(res) }
})

tabletRouter.post('/personal/end', async (req: Request, res: Response) => {
  const dev = req.user?.dev
  if (dev?.t !== 'personal') { ok(res, { ended: false }); return }
  await p().sharedSession.updateMany({ where: { device_id: dev.d, user_id: req.user!.sub, ended_at: null }, data: { ended_at: new Date(), end_reason: 'done' } }).catch(() => {})
  ok(res, { ended: true })
})

// ── Admin ────────────────────────────────────────────────────────────────────
export const tabletsAdminRouter = Router()
tabletsAdminRouter.use(requireAdmin)

async function pinEmailFor(tenantId: string, userId: string, kind: 'new' | 'resend' | 'regenerated', pin: string): Promise<boolean> {
  const [u, t] = await Promise.all([p().user.findUnique({ where: { id: userId }, select: { name: true, email: true } }), p().tenant.findUnique({ where: { id: tenantId }, select: { name: true } })])
  if (!u?.email) return false
  await sendStaffPinEmail({ to: u.email, name: u.name, orgName: t?.name ?? 'Your service', pin, kind })
  await p().staffPin.update({ where: { user_id: userId }, data: { sent_at: new Date() } }).catch(() => {})
  return true
}

/** For a new staff member: if the account uses shared tablets, create their PIN and email it. Never throws. */
export async function issuePinForNewStaff(tenantId: string, userId: string): Promise<void> {
  try {
    const any = await p().sharedDevice.findFirst({ where: { tenant_id: tenantId, revoked_at: null }, select: { id: true } })
    if (!any) return
    const pin = await setPin(tenantId, userId)
    await pinEmailFor(tenantId, userId, 'new', pin)
  } catch (e) { console.error('[tablets] could not issue a PIN for new staff:', (e as any)?.message ?? e) }
}

tabletsAdminRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  try {
    const [devices, key, staff, pins, org] = await Promise.all([
      p().sharedDevice.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'asc' } }),
      p().sharedConnectKey.findUnique({ where: { tenant_id: tenantId } }),
      p().user.count({ where: TABLET_STAFF_WHERE(tenantId) }),
      p().staffPin.count({ where: { tenant_id: tenantId } }),
      p().tenant.findUnique({ where: { id: tenantId }, select: { logo_url: true } }),
    ])
    const names = new Map<string, string>()
    const by = devices.map((d: any) => d.paired_by).filter(Boolean)
    if (by.length) (await p().user.findMany({ where: { id: { in: by } }, select: { id: true, name: true } })).forEach((u: any) => names.set(u.id, u.name))
    const days = key ? Math.floor((Date.now() - new Date(key.rotated_at).getTime()) / 86_400_000) : null
    ok(res, {
      tablets: devices.map((d: any) => ({ id: d.id, name: d.name, location: d.location, connected: !!d.paired_at && !d.revoked_at, revoked: !!d.revoked_at, paired_at: d.paired_at, paired_by: d.paired_by ? names.get(d.paired_by) ?? null : null, last_seen_at: d.last_seen_at })),
      poster: { exists: !!key, rotated_at: key?.rotated_at ?? null, days_old: days, due: days !== null && days >= reminderDays(key?.reminder_months ?? DEFAULT_REMINDER_MONTHS), reminder_months: key?.reminder_months ?? DEFAULT_REMINDER_MONTHS, has_logo: !!org?.logo_url },
      pins: { staff_total: staff, with_pin: pins },
      max_tablets: MAX_TABLETS,
    })
  } catch { notSetUp(res) }
})

tabletsAdminRouter.post('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const name = String(req.body?.name ?? '').trim().slice(0, 60)
  const location = String(req.body?.location ?? '').trim().slice(0, 80) || null
  if (!name) { err(res, 'VALIDATION_ERROR', 'Give the tablet a name, for example "Ward 2 tablet".'); return }
  try {
    if ((await p().sharedDevice.count({ where: { tenant_id: tenantId, revoked_at: null } })) >= MAX_TABLETS) { err(res, 'LIMIT', `You can have up to ${MAX_TABLETS} shared tablets. Remove one first.`, 400); return }
    const id = crypto.randomUUID()
    const user = await p().user.create({ data: {
      id, tenant_id: tenantId, name, email: `tablet-${id}@tablets.invalid`, password_hash: await hashPassword(crypto.randomBytes(24).toString('base64url')),
      role: 'staff', is_active: false, is_shared: true,
    } })
    const device = await p().sharedDevice.create({ data: { tenant_id: tenantId, user_id: user.id, name, location, created_by: req.user!.sub } })
    await getOrCreateConnectKey(tenantId)
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'shared_tablet_created', entity_type: 'shared_device', entity_id: device.id, metadata: { name } })
    ok(res, { tablet: { id: device.id, name, location } })
  } catch (e: any) { console.error('[tablets] create failed:', e?.message ?? e); notSetUp(res) }
})

tabletsAdminRouter.patch('/:id', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const d = await p().sharedDevice.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } }).catch(() => null)
  if (!d) { err(res, 'NOT_FOUND', 'Tablet not found.', 404); return }
  const name = String(req.body?.name ?? d.name).trim().slice(0, 60) || d.name
  const location = req.body?.location === undefined ? d.location : (String(req.body.location).trim().slice(0, 80) || null)
  await p().sharedDevice.update({ where: { id: d.id }, data: { name, location } })
  await p().user.update({ where: { id: d.user_id }, data: { name } }).catch(() => {})
  ok(res, { updated: true })
})

async function revokeDevice(tenantId: string, actorId: string, d: any) {
  await p().sharedDevice.update({ where: { id: d.id }, data: { revoked_at: new Date() } })
  await revokeUserRefreshTokens(d.user_id)
  forgetDevice(d.id)
  await p().sharedSession.updateMany({ where: { device_id: d.id, ended_at: null }, data: { ended_at: new Date(), end_reason: 'revoked' } }).catch(() => {})
  void writeAuditLog({ tenant_id: tenantId, user_id: actorId, event_type: 'shared_tablet_revoked', entity_type: 'shared_device', entity_id: d.id, metadata: { name: d.name } })
}
tabletsAdminRouter.post('/revoke-all', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const all = await p().sharedDevice.findMany({ where: { tenant_id: tenantId, revoked_at: null } }).catch(() => [])
  for (const d of all) await revokeDevice(tenantId, req.user!.sub, d)
  ok(res, { revoked: all.length })
})
tabletsAdminRouter.post('/:id/revoke', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const d = await p().sharedDevice.findFirst({ where: { id: String(req.params.id), tenant_id: tenantId } }).catch(() => null)
  if (!d) { err(res, 'NOT_FOUND', 'Tablet not found.', 404); return }
  await revokeDevice(tenantId, req.user!.sub, d)
  ok(res, { revoked: true })
})

// How often admins are reminded to print a new poster (Settings > Shared tablets).
tabletsAdminRouter.put('/settings', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const months = Number(req.body?.reminder_months)
  if (!(REMINDER_CHOICES as readonly number[]).includes(months)) { err(res, 'VALIDATION_ERROR', 'Choose monthly, quarterly, half yearly or yearly.'); return }
  try {
    await getOrCreateConnectKey(tenantId)
    await p().sharedConnectKey.update({ where: { tenant_id: tenantId }, data: { reminder_months: months, reminded_at: null } })
    ok(res, { reminder_months: months })
  } catch { notSetUp(res) }
})

// The poster: the connect key as a link the QR encodes.
tabletsAdminRouter.get('/poster/key', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  try {
    const key = await getOrCreateConnectKey(tenantId)
    const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { name: true, logo_url: true } })
    // logo_url is the Organisation logo from Settings (a stored image), shown large at the top of the printed poster when there is one.
    ok(res, { key: key.connect_key, home_name: t?.name ?? '', rotated_at: key.rotated_at, logo_url: t?.logo_url ?? null, reminder_months: key.reminder_months ?? DEFAULT_REMINDER_MONTHS })
  } catch { notSetUp(res) }
})
tabletsAdminRouter.post('/poster/rotate', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  try {
    const key = await rotateConnectKey(tenantId)
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'shared_tablet_poster_rotated', entity_type: 'tenant', entity_id: tenantId, metadata: {} })
    ok(res, { key: key.connect_key, rotated_at: key.rotated_at })
  } catch { notSetUp(res) }
})

// PINs. Admins never see a PIN unless they choose "Show PIN" (logged); everything else emails it to the person.
async function staffInTenant(tenantId: string, userId: string) {
  return p().user.findFirst({ where: { id: userId, tenant_id: tenantId, is_shared: false }, select: { id: true, name: true, email: true } })
}
tabletsAdminRouter.post('/staff/:userId/pin/:action', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const action = String(req.params.action)
  if (!['resend', 'regenerate', 'show'].includes(action)) { err(res, 'VALIDATION_ERROR', 'Unknown action.'); return }
  try {
    const u = await staffInTenant(tenantId, String(req.params.userId))
    if (!u) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }
    if (!(await takeResendSlot(u.id))) { err(res, 'TOO_MANY', 'That has been done 3 times in the last hour. Please try again later.', 429); return }
    let pin = action === 'regenerate' ? null : await readPin(u.id)
    const created = pin === null
    if (pin === null) {
      pin = await setPin(tenantId, u.id)
      if (action === 'regenerate') await p().sharedSession.updateMany({ where: { user_id: u.id, ended_at: null }, data: { ended_at: new Date(), end_reason: 'pin_regenerated' } }).catch(() => {})
    }
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: (`staff_pin_${action}` as 'staff_pin_resend' | 'staff_pin_regenerate' | 'staff_pin_show'), entity_type: 'user', entity_id: u.id, metadata: {} })
    if (action === 'show') { ok(res, { name: u.name, pin }); return }
    const sent = await pinEmailFor(tenantId, u.id, action === 'regenerate' ? 'regenerated' : created ? 'new' : 'resend', pin)
    if (!sent) { err(res, 'NO_EMAIL', 'That staff member has no email address.', 400); return }
    ok(res, { sent: true, name: u.name, to: u.email })
  } catch (e: any) { console.error('[tablets] pin action failed:', e?.message ?? e); notSetUp(res) }
})

// One off: send a PIN to every active staff member who does not have one yet (admin confirms in the screen).
tabletsAdminRouter.post('/pins/send-all', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  if (req.body?.confirm !== true) { err(res, 'VALIDATION_ERROR', 'Please confirm.'); return }
  try {
    const [staff, have] = await Promise.all([p().user.findMany({ where: TABLET_STAFF_WHERE(tenantId), select: { id: true } }), p().staffPin.findMany({ where: { tenant_id: tenantId }, select: { user_id: true } })])
    const got = new Set(have.map((h: any) => h.user_id))
    const todo = staff.filter((s: any) => !got.has(s.id))
    let sent = 0
    for (let i = 0; i < todo.length; i += 10) {
      await Promise.all(todo.slice(i, i + 10).map(async (s: any) => {
        try { const pin = await setPin(tenantId, s.id); if (await pinEmailFor(tenantId, s.id, 'new', pin)) sent++ } catch { /* one failure must not stop the rest */ }
      }))
    }
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'staff_pins_sent_all', entity_type: 'tenant', entity_id: tenantId, metadata: { sent } })
    ok(res, { sent, skipped: staff.length - todo.length })
  } catch { notSetUp(res) }
})
