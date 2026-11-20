// The picture shown in person-led emails. Email programs cannot open the private signed picture links, so this serves a small
// 160x160 JPEG made from the stored 512 picture, at GET /public/email-avatar/:userId/:token.jpg.
//   - The token is a stateless HMAC of (user id + the picture's updated_at) using JWT_SECRET plus a salt. Replacing the picture
//     changes updated_at, so the link changes; removing the picture makes the route answer 404 whatever the token.
//   - Nothing is stored: the resized bytes are cached in memory only (bounded), keyed by user and updated_at.
//   - SAFETY: the staff_photos table may not exist yet; every read then answers "no picture" and emails fall back to initials.

import { createHmac, timingSafeEqual } from 'crypto'
import { Router, Request, Response } from 'express'
import sharp from 'sharp'
import { prisma } from '../../db/client'
import { downloadFile } from '../storage/s3'
import type { PersonAdmin } from './person-email'

const db = prisma as any
export const EMAIL_AVATAR_PX = 160

const apiBase = () => (process.env.API_PUBLIC_URL || 'https://api.carestreamai.com').replace(/\/$/, '')
const secret = () => `${process.env.JWT_SECRET ?? ''}:email-avatar:v1`

/** Stateless token for one person's current picture. Changes whenever updated_at changes. */
export function emailAvatarToken(userId: string, updatedAt: Date | string | number): string {
  const ms = new Date(updatedAt).getTime()
  return createHmac('sha256', secret()).update(`${userId}|${ms}`).digest('base64url').slice(0, 32)
}

export function verifyEmailAvatarToken(userId: string, updatedAt: Date | string | number, token: string): boolean {
  if (!process.env.JWT_SECRET || !userId || !token) return false
  const ms = new Date(updatedAt).getTime()
  if (!Number.isFinite(ms)) return false
  const a = Buffer.from(emailAvatarToken(userId, ms)); const b = Buffer.from(String(token))
  return a.length === b.length && timingSafeEqual(a, b)
}

/** Absolute URL of this person's email picture, or null when they have none (or the table is not there yet). */
export async function emailAvatarUrlFor(userId: string): Promise<string | null> {
  if (!userId || !process.env.JWT_SECRET) return null
  try {
    const row = await db.staffPhoto.findUnique({ where: { user_id: userId }, select: { updated_at: true } })
    if (!row?.updated_at) return null
    return `${apiBase()}/public/email-avatar/${encodeURIComponent(userId)}/${emailAvatarToken(userId, row.updated_at)}.jpg`
  } catch { return null }
}

// Preview and test tooling only: lets a script supply the acting person without a database.
let actorOverride: ((userId: string) => PersonAdmin | null) | null = null
export function setActorOverrideForPreview(fn: ((userId: string) => PersonAdmin | null) | null): void { actorOverride = fn }

/** Who is acting, for the top of a person-led email. Null when there is no such person (so the branded look is used). */
export async function resolveActor(userId?: string | null): Promise<PersonAdmin | null> {
  if (!userId) return null
  if (actorOverride) return actorOverride(userId)
  try {
    const u = await db.user.findUnique({ where: { id: userId }, select: { name: true, job_role: true, role: true, tenant_id: true } })
    if (!u?.name) return null
    const t = u.tenant_id ? await db.tenant.findUnique({ where: { id: u.tenant_id }, select: { name: true } }).catch(() => null) : null
    return {
      name: u.name,
      jobRole: (u.job_role || '').trim() || (u.role === 'admin' ? 'Admin' : 'Team member'),
      homeName: t?.name ?? null,
      avatarUrl: await emailAvatarUrlFor(userId),
    }
  } catch { return null }
}

// ─── The file ────────────────────────────────────────────────────────────────────
const cache = new Map<string, Buffer>()
const CACHE_MAX = 200

export const emailAvatarRouter = Router()

emailAvatarRouter.get('/:userId/:file', async (req: Request, res: Response) => {
  const userId = String(req.params.userId)
  const m = /^([A-Za-z0-9_-]{16,64})\.jpg$/.exec(String(req.params.file))
  const gone = () => { res.status(404).type('text/plain').send('Not found') }
  if (!m) { gone(); return }
  try {
    const row = await db.staffPhoto.findUnique({ where: { user_id: userId }, select: { s3_key: true, updated_at: true } })
    if (!row?.s3_key || !verifyEmailAvatarToken(userId, row.updated_at, m[1])) { gone(); return }
    const key = `${userId}|${new Date(row.updated_at).getTime()}`
    let out = cache.get(key)
    if (!out) {
      const src = await downloadFile(row.s3_key)
      out = await sharp(src).resize({ width: EMAIL_AVATAR_PX, height: EMAIL_AVATAR_PX, fit: 'cover' }).jpeg({ quality: 82 }).toBuffer()
      if (cache.size >= CACHE_MAX) cache.delete(cache.keys().next().value as string)
      cache.set(key, out)
    }
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Cache-Control', 'public, max-age=86400')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(out)
  } catch { gone() }
})
