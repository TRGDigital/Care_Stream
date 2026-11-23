// Shared tablets: PINs, the connect key (the printed QR), device lookups and the request guard rules.
//
// Design (see ~/carestream-content/specs/shared-tablet-login.md):
//  - A tablet is its own user row (is_shared true, is_active false so it never counts as staff). Its tokens carry dev:{t:'device'}.
//  - A staff member enters their PIN to get a short personal token (dev:{t:'personal'}, role forced to staff, no refresh).
//  - PINs are random 4 digits, emailed to the person, stored encrypted so "Re-send PIN" can resend the same one. A hashed 4 digit PIN is
//    trivially reversible anyway: the protection is the QR living in staff areas plus the attempt limits below.

import crypto from 'crypto'
import type { Request } from 'express'
import { prisma } from '../db/client'

const p = () => prisma as any

// ── PIN storage ──────────────────────────────────────────────────────────────
function pinKey(): Buffer {
  const base = process.env.SHARED_PIN_KEY || process.env.JWT_SECRET || ''
  if (!base) throw new Error('No key available for PIN storage.')
  return Buffer.from(crypto.hkdfSync('sha256', Buffer.from(base), Buffer.alloc(0), 'carestream-shared-pin', 32))
}
export function encryptPin(pin: string): string {
  const iv = crypto.randomBytes(12)
  const c = crypto.createCipheriv('aes-256-gcm', pinKey(), iv)
  const ct = Buffer.concat([c.update(pin, 'utf8'), c.final()])
  return [iv, c.getAuthTag(), ct].map(b => b.toString('base64url')).join('.')
}
export function decryptPin(enc: string): string | null {
  try {
    const [iv, tag, ct] = enc.split('.').map(x => Buffer.from(x, 'base64url'))
    const d = crypto.createDecipheriv('aes-256-gcm', pinKey(), iv)
    d.setAuthTag(tag)
    return Buffer.concat([d.update(ct), d.final()]).toString('utf8')
  } catch { return null }
}

/** Random 4 digit PIN that is not an obvious one (0000, 1111, 1234, 4321, 2580...). */
export function isWeakPin(pin: string): boolean {
  if (!/^\d{4}$/.test(pin)) return true
  if (/^(\d)\1{3}$/.test(pin)) return true
  const d = pin.split('').map(Number)
  const asc = d.every((x, i) => i === 0 || x === d[i - 1] + 1), desc = d.every((x, i) => i === 0 || x === d[i - 1] - 1)
  if (asc || desc) return true
  return ['2580', '1212', '2020', '1004', '6969', '4200'].includes(pin)
}
export function generatePin(): string {
  for (;;) {
    const pin = String(crypto.randomInt(0, 10000)).padStart(4, '0')
    if (!isWeakPin(pin)) return pin
  }
}

export const PIN_MAX_FAILS = 5
export const PIN_LOCK_MS = 5 * 60_000
export const RESEND_PER_HOUR = 3

/** Create or replace a person's PIN. Returns the plain PIN (to email); it is never returned by any API list. */
export async function setPin(tenantId: string, userId: string): Promise<string> {
  const pin = generatePin()
  const data = { tenant_id: tenantId, pin_enc: encryptPin(pin), set_at: new Date(), failed_count: 0, locked_until: null }
  await p().staffPin.upsert({ where: { user_id: userId }, create: { user_id: userId, ...data }, update: data })
  return pin
}

export async function readPin(userId: string): Promise<string | null> {
  const row = await p().staffPin.findUnique({ where: { user_id: userId } })
  return row ? decryptPin(row.pin_enc) : null
}

/** Limit "send / show a PIN" actions to 3 an hour per person so nobody can be mailed repeatedly. */
export async function takeResendSlot(userId: string): Promise<boolean> {
  const row = await p().staffPin.findUnique({ where: { user_id: userId } })
  if (!row) return true
  const now = Date.now()
  const fresh = !row.resend_window_start || now - new Date(row.resend_window_start).getTime() > 3600_000
  if (!fresh && row.resend_count >= RESEND_PER_HOUR) return false
  await p().staffPin.update({ where: { user_id: userId }, data: fresh ? { resend_window_start: new Date(), resend_count: 1 } : { resend_count: { increment: 1 } } })
  return true
}

export type PinCheck = { ok: true } | { ok: false; reason: 'no_pin' | 'wrong' | 'locked'; remaining?: number; until?: Date }

/** Check a PIN. Wrong guesses are counted per person; after 5 the person is locked for 5 minutes (an admin can clear it by regenerating the PIN). */
export async function checkPin(userId: string, pin: string): Promise<PinCheck> {
  const row = await p().staffPin.findUnique({ where: { user_id: userId } })
  if (!row) return { ok: false, reason: 'no_pin' }
  if (row.locked_until && new Date(row.locked_until).getTime() > Date.now()) return { ok: false, reason: 'locked', until: new Date(row.locked_until) }
  const real = decryptPin(row.pin_enc) ?? ''
  const a = Buffer.from(String(pin ?? '')), b = Buffer.from(real)
  const good = a.length === b.length && b.length > 0 && crypto.timingSafeEqual(a, b)
  if (good) { await p().staffPin.update({ where: { user_id: userId }, data: { failed_count: 0, locked_until: null, last_ok_at: new Date() } }); return { ok: true } }
  const fails = (row.failed_count ?? 0) + 1
  if (fails >= PIN_MAX_FAILS) {
    const until = new Date(Date.now() + PIN_LOCK_MS)
    await p().staffPin.update({ where: { user_id: userId }, data: { failed_count: 0, locked_until: until } })
    return { ok: false, reason: 'locked', until }
  }
  await p().staffPin.update({ where: { user_id: userId }, data: { failed_count: fails } })
  return { ok: false, reason: 'wrong', remaining: PIN_MAX_FAILS - fails }
}

// ── Connect key (the printed QR) ─────────────────────────────────────────────
const KEY_FAILS = 20, KEY_WINDOW_MS = 10 * 60_000, KEY_BLOCK_MS = 10 * 60_000
export const CONNECT_KEY_REMINDER_DAYS = 90

export async function getOrCreateConnectKey(tenantId: string) {
  const existing = await p().sharedConnectKey.findUnique({ where: { tenant_id: tenantId } })
  if (existing) return existing
  return p().sharedConnectKey.create({ data: { tenant_id: tenantId, connect_key: crypto.randomBytes(18).toString('base64url') } })
}
export async function rotateConnectKey(tenantId: string) {
  const data = { connect_key: crypto.randomBytes(18).toString('base64url'), rotated_at: new Date(), reminded_at: null, fail_count: 0, fail_window_start: null, blocked_until: null }
  return p().sharedConnectKey.upsert({ where: { tenant_id: tenantId }, create: { tenant_id: tenantId, ...data }, update: data })
}
/** The account a connect key belongs to, or null (also null while that key is temporarily blocked after too many wrong guesses). */
export async function tenantForKey(key: string): Promise<{ tenantId: string; blocked: boolean } | null> {
  if (!key || key.length < 16) return null
  const row = await p().sharedConnectKey.findFirst({ where: { connect_key: key } })
  if (!row) return null
  return { tenantId: row.tenant_id, blocked: !!(row.blocked_until && new Date(row.blocked_until).getTime() > Date.now()) }
}
/** Count a wrong PIN against the key as well as the person, so a stranger with the QR cannot keep guessing across the whole team. */
export async function noteKeyFailure(tenantId: string): Promise<void> {
  const row = await p().sharedConnectKey.findUnique({ where: { tenant_id: tenantId } })
  if (!row) return
  const fresh = !row.fail_window_start || Date.now() - new Date(row.fail_window_start).getTime() > KEY_WINDOW_MS
  const count = fresh ? 1 : row.fail_count + 1
  await p().sharedConnectKey.update({ where: { tenant_id: tenantId }, data: { fail_count: count, fail_window_start: fresh ? new Date() : row.fail_window_start, blocked_until: count >= KEY_FAILS ? new Date(Date.now() + KEY_BLOCK_MS) : row.blocked_until } })
}

// ── People ───────────────────────────────────────────────────────────────────
/** Staff who can appear on a tablet: active, not agency, not a tablet. */
export const TABLET_STAFF_WHERE = (tenantId: string) => ({ tenant_id: tenantId, is_active: true, is_agency: false, is_shared: false })

// ── The request guard ────────────────────────────────────────────────────────
// Allow lists are by method and path prefix. A tablet's own account holds no personal records, so reads of /me are harmless; writes and
// every other area are refused here, on the server, whatever the screen shows.
const DEVICE_ALLOWED: Array<{ methods: string[]; prefix: string }> = [
  { methods: ['GET', 'HEAD', 'OPTIONS'], prefix: '/me' },
  { methods: ['GET', 'HEAD', 'OPTIONS'], prefix: '/residents' },
  { methods: ['GET', 'HEAD', 'OPTIONS'], prefix: '/policies' },
  { methods: ['GET', 'POST', 'OPTIONS'], prefix: '/query' },
  { methods: ['GET', 'POST', 'OPTIONS'], prefix: '/tablet' },
]
const PERSONAL_BLOCKED: Array<{ methods: string[]; prefix: string }> = [
  { methods: ['POST', 'PUT', 'PATCH', 'DELETE'], prefix: '/auth' },
  { methods: ['POST', 'PUT', 'PATCH', 'DELETE'], prefix: '/billing' },
  { methods: ['POST', 'DELETE'], prefix: '/me/photo' },
  { methods: ['POST', 'DELETE'], prefix: '/me/push' },
  { methods: ['POST'], prefix: '/tablet/personal/start' },
  { methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'], prefix: '/tablets' },
]
const underPrefix = (path: string, prefix: string) => path === prefix || path.startsWith(prefix + '/')

/** Returns a refusal message, or null when the request may go ahead. */
export function tabletRefusal(req: Request): string | null {
  const dev = req.user?.dev
  if (!dev) return null
  const path = req.originalUrl.split('?')[0]
  if (dev.t === 'device') {
    const ok = DEVICE_ALLOWED.some(r => r.methods.includes(req.method) && underPrefix(path, r.prefix))
    return ok ? null : 'This shared tablet can only be used for chat and This is me. Tap "Who\'s using it?" and enter your PIN to use your own hub.'
  }
  const blocked = PERSONAL_BLOCKED.some(r => r.methods.includes(req.method) && underPrefix(path, r.prefix))
  return blocked ? 'That is not available on a shared tablet.' : null
}
