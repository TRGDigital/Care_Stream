// Staff profile pictures: validation, processing, private storage, short-lived signed links and clean-up.
//
//   - JPEG, PNG or WebP up to 5 MB, judged by the real bytes, malware scanned (fail closed when the scanner is set up but errors),
//     then re-encoded to a 512x512 square JPEG. That drops EXIF, camera and location data and anything hidden in the original.
//   - Stored privately at tenants/{tenant}/staff/{user}/photo.jpg and overwritten on replace. No public address: the web app
//     shows it through a link signed for about ten minutes, and the file route re-checks the row every time it is opened, so a
//     removed picture stops being served even if an old link is still in a browser.
//   - SAFETY: this lives in its OWN table (staff_photos), never a column on User, and is read through (prisma as any). If the
//     table has not been created yet every read answers "no picture" and every write answers 503 "being set up".

import { createHmac, timingSafeEqual } from 'crypto'
import { Router, Request, Response } from 'express'
import sharp from 'sharp'
import { prisma } from '../db/client'
import { err } from './response'
import { detectEvidenceType } from './evidence-file'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { uploadStaffPhoto, deleteFile, downloadFile, staffPhotoKey } from '../services/storage/s3'

const db = prisma as any

export const STAFF_PHOTO_PX = 512
export const STAFF_URL_SECONDS = 10 * 60
export const STAFF_PHOTO_SCOPE = 'staff-photo'
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** True when the staff_photos table exists (the SQL may not have been run yet). */
export async function staffPhotosReady(): Promise<boolean> {
  try { await db.staffPhoto.findFirst({ select: { id: true } }); return true } catch { return false }
}

export type StaffPhotoFail = { ok: false; status: number; code: string; message: string }

/** Checks, scans and re-encodes an uploaded picture. Nothing is stored here. */
export async function processStaffPhoto(file: { buffer?: Buffer; originalname?: string } | undefined): Promise<{ ok: true; data: Buffer; width: number; height: number } | StaffPhotoFail> {
  if (!file || !file.buffer?.length) return { ok: false, status: 400, code: 'NO_FILE', message: 'Please choose a picture to upload.' }
  const detected = detectEvidenceType(file.buffer)
  if (!detected || !ACCEPTED.has(detected.mime)) return { ok: false, status: 400, code: 'INVALID_FILE', message: 'That file is not a JPEG, PNG or WebP picture, so it was not uploaded.' }

  const scan = await scanBuffer(file.buffer, file.originalname ?? 'photo')
  if (scan.status === 'infected') return { ok: false, status: 400, code: 'MALWARE_DETECTED', message: 'That file was flagged by the security scan and was not uploaded.' }
  if (scan.status === 'error' && scannerConfigured()) return { ok: false, status: 503, code: 'SCAN_FAILED', message: 'The picture could not be checked just now, so it was not uploaded. Please try again.' }

  try {
    // rotate() applies the camera's orientation first; sharp keeps no metadata unless asked, so EXIF and GPS are gone.
    const { data, info } = await sharp(file.buffer, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: STAFF_PHOTO_PX, height: STAFF_PHOTO_PX, fit: 'cover', position: sharp.strategy.attention })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 85 })
      .toBuffer({ resolveWithObject: true })
    return { ok: true, data, width: info.width, height: info.height }
  } catch {
    return { ok: false, status: 400, code: 'INVALID_FILE', message: 'That picture could not be read. Please try a different one.' }
  }
}

/** Process and store (or replace) one person's picture. The caller has already checked who may do this. */
export async function setStaffPhoto(opts: { tenantId: string; userId: string; uploadedBy: string; file: any }): Promise<{ ok: true } | StaffPhotoFail> {
  if (!(await staffPhotosReady())) return { ok: false, status: 503, code: 'NOT_READY', message: 'Pictures are being set up. Please try again shortly.' }
  const done = await processStaffPhoto(opts.file)
  if (!done.ok) return done
  const s3Key = await uploadStaffPhoto({ tenantId: opts.tenantId, userId: opts.userId, buffer: done.data })
  const data = { tenant_id: opts.tenantId, s3_key: s3Key, mime: 'image/jpeg', size_bytes: done.data.length, width: done.width, height: done.height, uploaded_by: opts.uploadedBy, updated_at: new Date() }
  await db.staffPhoto.upsert({ where: { user_id: opts.userId }, create: { user_id: opts.userId, ...data }, update: data })
  return { ok: true }
}

/** Remove the file and the row. Safe when there is no picture or no table. Returns whether a picture was removed. */
export async function removeStaffPhoto(tenantId: string, userId: string): Promise<boolean> {
  try {
    const row = await db.staffPhoto.findFirst({ where: { user_id: userId, tenant_id: tenantId }, select: { id: true } })
    if (!row) return false
    await deleteFile(staffPhotoKey(tenantId, userId))
    await db.staffPhoto.deleteMany({ where: { user_id: userId, tenant_id: tenantId } })
    return true
  } catch { return false }   // table not created yet: nothing to remove
}

/** Every picture of a tenant (files then rows). For when a whole home is deleted. */
export async function removeTenantStaffPhotos(tenantId: string): Promise<number> {
  try {
    const rows: any[] = await db.staffPhoto.findMany({ where: { tenant_id: tenantId }, select: { user_id: true } })
    for (const r of rows) await deleteFile(staffPhotoKey(tenantId, r.user_id))
    await db.staffPhoto.deleteMany({ where: { tenant_id: tenantId } })
    return rows.length
  } catch { return 0 }
}

// ─── Signed links ──────────────────────────────────────────────────────────────
const secret = () => `${process.env.JWT_SECRET ?? ''}:staff-photo`
const sigFor = (id: string, scope: string, exp: number) => createHmac('sha256', secret()).update(`${id}|${scope}|${exp}`).digest('base64url')

/** A path on the API (no host) that opens this person's picture for the next ten minutes. */
export function signedStaffPhotoPath(userId: string): string {
  const exp = Math.floor(Date.now() / 1000) + STAFF_URL_SECONDS
  return `/public/staff-photo/${userId}?s=${STAFF_PHOTO_SCOPE}&e=${exp}&g=${sigFor(userId, STAFF_PHOTO_SCOPE, exp)}`
}

export function verifyStaffPhotoSignature(id: string, scope: string, exp: number, sig: string): boolean {
  if (!process.env.JWT_SECRET || !id || scope !== STAFF_PHOTO_SCOPE || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const a = Buffer.from(sigFor(id, scope, exp)); const b = Buffer.from(sig || '')
  return a.length === b.length && timingSafeEqual(a, b)
}

/** photo_url for each of these people (a signed path, or absent). A missing table or any error means nobody has a picture. */
export async function staffPhotoUrls(tenantId: string, userIds: string[]): Promise<Map<string, string>> {
  const out = new Map<string, string>()
  if (!userIds.length) return out
  try {
    const rows: any[] = await db.staffPhoto.findMany({ where: { tenant_id: tenantId, user_id: { in: userIds } }, select: { user_id: true } })
    for (const r of rows) out.set(r.user_id, signedStaffPhotoPath(r.user_id))
  } catch { /* table not created yet */ }
  return out
}
export async function staffPhotoUrl(tenantId: string, userId: string): Promise<string | null> {
  return (await staffPhotoUrls(tenantId, [userId])).get(userId) ?? null
}

// ─── The file itself ───────────────────────────────────────────────────────────
// GET /public/staff-photo/:userId?s=staff-photo&e=<expiry>&g=<signature>. Opened by an <img> tag, so it cannot carry a sign in
// token; the signature stands in for it. Every request re-checks the row, so a removed picture is gone at once.
export const staffPhotoFileRouter = Router()

staffPhotoFileRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id), scope = String(req.query.s ?? ''), exp = Number(req.query.e), sig = String(req.query.g ?? '')
  const gone = () => { err(res, 'UNAVAILABLE', 'This picture is not available.', 404) }
  if (!verifyStaffPhotoSignature(id, scope, exp, sig)) { gone(); return }
  try {
    const row = await db.staffPhoto.findUnique({ where: { user_id: id } })
    if (!row || !row.s3_key) { gone(); return }
    const buf = await downloadFile(row.s3_key)
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:")
    res.setHeader('Cache-Control', 'private, max-age=60')   // short: a replaced or removed picture shows within a minute
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Content-Disposition', 'inline; filename="photo.jpg"')
    res.send(buf)
  } catch { gone() }
})
