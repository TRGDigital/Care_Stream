// "This is me" resident photos: validation, processing, private storage, short-lived signed links and clean-up.
//
// Rules (agreed with the owner):
//   - Only JPEG, PNG or WebP, up to 5 MB, judged by the real bytes. Malware scanned. RE-ENCODED to a plain JPEG no longer than
//     1600px on its longest side, which drops EXIF and location data and anything hidden in the original file.
//   - Every photo is PENDING until a manager approves it (managers' own uploads are approved at once). Staff and the hub only see
//     APPROVED photos of LIVING residents.
//   - Storage is private. There is no public address. A photo is shown through a link signed for about five minutes, and the file
//     route (routes/residents-public.ts) re-checks status, resident and invite every time it is opened, so a photo stops being
//     served the moment the resident moves on or the family link is cancelled, even if an old link is still in a browser.
//   - Photos are NEVER part of the assistant's knowledge. syncResidentKnowledge reads text sections only and does not know this table.

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import sharp from 'sharp'
import { prisma } from '../db/client'
import { detectEvidenceType } from './evidence-file'
import { cleanText, residentsEnabled } from './residents'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { uploadResidentPhoto, deleteFile } from '../services/storage/s3'

const db = prisma as any

export const PHOTOS_PER_INVITE = 5
export const PENDING_PHOTOS_PER_RESIDENT = 40
export const CAPTION_MAX = 140
export const MAX_EDGE_PX = 1600
export const URL_SECONDS = 5 * 60
const ACCEPTED = new Set(['image/jpeg', 'image/png', 'image/webp'])

/** True when the photos table exists (the SQL may not have been run yet). */
export async function photosReady(): Promise<boolean> {
  try { await db.residentPhoto.findFirst({ select: { id: true } }); return true } catch { return false }
}

export type PhotoFail = { ok: false; status: number; code: string; message: string }
export type PhotoOk = { ok: true; s3Key: string; mime: string; size: number; width: number; height: number; scan: 'clean' | 'skipped' }

/**
 * Checks, scans, re-encodes and stores one uploaded photo. Nothing is stored unless every step passes.
 * Same pattern as the face to face evidence upload: magic bytes first, then the malware scan (fail closed if the scanner is
 * configured but errors), then storage.
 */
export async function processAndStorePhoto(opts: { tenantId: string; residentId: string; file: Express.Multer.File | undefined }): Promise<PhotoOk | PhotoFail> {
  const file = opts.file
  if (!file || !file.buffer?.length) return { ok: false, status: 400, code: 'NO_FILE', message: 'Please choose a photo to upload.' }
  const detected = detectEvidenceType(file.buffer)
  if (!detected || !ACCEPTED.has(detected.mime)) return { ok: false, status: 400, code: 'INVALID_FILE', message: 'That file is not a JPEG, PNG or WebP photo, so it was not uploaded.' }

  const scan = await scanBuffer(file.buffer, file.originalname)
  if (scan.status === 'infected') return { ok: false, status: 400, code: 'MALWARE_DETECTED', message: 'That file was flagged by the security scan and was not uploaded.' }
  if (scan.status === 'error' && scannerConfigured()) return { ok: false, status: 503, code: 'SCAN_FAILED', message: 'The photo could not be checked just now, so it was not uploaded. Please try again.' }

  let out: { data: Buffer; info: sharp.OutputInfo }
  try {
    // rotate() applies the camera's orientation before the metadata is dropped, so the photo does not turn sideways.
    // sharp keeps no metadata unless asked, so EXIF and GPS are gone. flatten() puts transparent PNGs on white.
    out = await sharp(file.buffer, { limitInputPixels: 60_000_000 })
      .rotate()
      .resize({ width: MAX_EDGE_PX, height: MAX_EDGE_PX, fit: 'inside', withoutEnlargement: true })
      .flatten({ background: '#ffffff' })
      .jpeg({ quality: 82 })
      .toBuffer({ resolveWithObject: true })
  } catch {
    return { ok: false, status: 400, code: 'INVALID_FILE', message: 'That photo could not be read. Please try a different one.' }
  }
  const s3Key = await uploadResidentPhoto({ tenantId: opts.tenantId, residentId: opts.residentId, key: `${randomUUID()}.jpg`, buffer: out.data, mimeType: 'image/jpeg' })
  return { ok: true, s3Key, mime: 'image/jpeg', size: out.data.length, width: out.info.width, height: out.info.height, scan: scan.status === 'clean' ? 'clean' : 'skipped' }
}

export const cleanCaption = (v: unknown) => cleanText(v, CAPTION_MAX).replace(/\s*\n\s*/g, ' ') || null
export const cleanPeople = (v: unknown) => cleanText(v, CAPTION_MAX).replace(/\s*\n\s*/g, ' ') || null

// ─── Signed links ──────────────────────────────────────────────────────────────
// scope says who the link was made for and what the file route must re-check when it is opened:
//   staff          approved photo of a living resident (any signed in user of the home, the hub)
//   admin          a manager looking at any non-removed photo of one of their residents
//   family:<id>    a photo that came through that invite, while the invite is still valid
const secret = () => `${process.env.JWT_SECRET ?? ''}:resident-photo`
const sigFor = (id: string, scope: string, exp: number) => createHmac('sha256', secret()).update(`${id}|${scope}|${exp}`).digest('base64url')

/** A path on the API (no host) to open the photo for the next five minutes. */
export function signedPhotoPath(id: string, scope: string): string {
  const exp = Math.floor(Date.now() / 1000) + URL_SECONDS
  return `/public/resident-photo/${id}?s=${encodeURIComponent(scope)}&e=${exp}&g=${sigFor(id, scope, exp)}`
}

export function verifyPhotoSignature(id: string, scope: string, exp: number, sig: string): boolean {
  if (!process.env.JWT_SECRET || !id || !scope || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const a = Buffer.from(sigFor(id, scope, exp)); const b = Buffer.from(sig || '')
  return a.length === b.length && timingSafeEqual(a, b)
}

// ─── DTOs ──────────────────────────────────────────────────────────────────────
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)

/** Manager view: everything about the photo, including who sent it. */
export const adminPhotoDto = (p: any) => ({
  id: p.id, invite_id: p.invite_id ?? null, uploaded_by_name: p.uploaded_by_name, relationship: p.relationship ?? null, source: p.source,
  caption: p.caption ?? null, people_note: p.people_note ?? null, status: p.status, width: p.width ?? null, height: p.height ?? null,
  submitted_at: iso(p.submitted_at), decided_at: iso(p.decided_at), decided_by: p.decided_by ?? null,
  url: p.s3_key ? signedPhotoPath(p.id, 'admin') : null,   // a rejected photo's file is already gone
})

/** Staff and hub view: approved photos only, and only what is needed to show them. */
export const hubPhotoDto = (p: any) => ({
  id: p.id, caption: p.caption ?? null, people_note: p.people_note ?? null, width: p.width ?? null, height: p.height ?? null, url: signedPhotoPath(p.id, 'staff'),
})

/** What the family member sees of their own photos. A rejected photo is shown as "not used" without its picture. */
export const familyPhotoDto = (p: any, inviteId: string) => ({
  id: p.id, caption: p.caption ?? null, people_note: p.people_note ?? null, status: p.status,
  url: p.s3_key && p.status !== 'rejected' ? signedPhotoPath(p.id, `family:${inviteId}`) : null,
})

// ─── Clean-up ──────────────────────────────────────────────────────────────────
/** Removes the file from storage and blanks the key (used on reject and when a resident moves on with photos still waiting). */
export async function discardPhotoFile(p: { id: string; s3_key: string }): Promise<void> {
  if (p.s3_key) await deleteFile(p.s3_key)
  await db.residentPhoto.update({ where: { id: p.id }, data: { s3_key: '' } })
}

/** Permanent deletion of every photo of a resident: the files first, then the rows. Used when the profile is deleted. */
export async function deleteResidentPhotos(tenantId: string, residentId: string): Promise<number> {
  let rows: any[] = []
  try { rows = await db.residentPhoto.findMany({ where: { tenant_id: tenantId, resident_id: residentId }, select: { id: true, s3_key: true } }) }
  catch { return 0 }   // table not created yet: nothing to delete
  for (const p of rows) if (p.s3_key) await deleteFile(p.s3_key)
  await db.residentPhoto.deleteMany({ where: { tenant_id: tenantId, resident_id: residentId } })
  return rows.length
}

// ─── Photos in the chat ─────────────────────────────────────────────────────────
// When a question in the "This is me" topic asks about photos, the page answers from the approved photos' CAPTIONS and "who is in
// the photo" notes (plain text people wrote), and shows the pictures themselves under the answer. The assistant never looks at an
// image, and the signed links are the same short-lived staff links the hub uses. Living residents with approved photos only.
const PHOTO_INTENT = /\b(photos?|photographs?|pictures?|pics?|images?)\b/i
const STOP = new Set(['do','we','have','a','an','the','of','his','her','their','him','them','is','there','any','of','for','on','in','at','to','and','or','show','me','can','you','see','get','got','where','what','who','with','from','about','photo','photos','photograph','photographs','picture','pictures','pic','pics','image','images','that','this','it','its','are','was','were','be','have','has','please','tell','look','looking'])
const esc = (s: string) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
const words = (s: string) => (s.toLowerCase().match(/[a-z0-9']+/g) ?? []).map(w => w.replace(/'s$/, '')).filter(w => w.length > 1)

export async function photoAnswer(tenantId: string, queryText: string, history: Array<{ role: string; content: string }> = []): Promise<{ html: string; photos: ReturnType<typeof hubPhotoDto>[] } | null> {
  if (!PHOTO_INTENT.test(queryText)) return null
  try {
    if (!(await residentsEnabled(tenantId)) || !(await photosReady())) return null
    const residents: any[] = await db.resident.findMany({ where: { tenant_id: tenantId, status: 'living' }, select: { id: true, first_name: true, last_name: true, preferred_name: true }, take: 500 })
    if (!residents.length) return null
    const ph: any[] = await db.residentPhoto.findMany({ where: { tenant_id: tenantId, status: 'approved', s3_key: { not: '' } }, orderBy: { submitted_at: 'desc' }, take: 1000 })
    // Which person? The question first, then the most recent mention in the last few messages.
    const texts = [queryText, ...history.slice(-6).reverse().map(m => m.content.replace(/<[^>]+>/g, ' '))]
    let target: any = null
    for (const t of texts) {
      const lower = t.toLowerCase()
      let best: { r: any; at: number } | null = null
      for (const r of residents) {
        for (const n of [r.preferred_name, r.first_name, `${r.first_name} ${r.last_name}`]) {
          const nn = (n ?? '').trim().toLowerCase()
          if (nn.length < 2) continue
          const re = new RegExp(`\\b${nn.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
          let m: RegExpExecArray | null
          while ((m = re.exec(lower))) if (!best || m.index > best.at) best = { r, at: m.index }
        }
      }
      if (best) { target = best.r; break }
    }
    if (!target) {
      const withPhotos = new Set(ph.map(p => p.resident_id))
      const only = residents.filter(r => withPhotos.has(r.id))
      if (only.length === 1) target = only[0]
      else return null   // cannot tell who the question is about: let the normal answer ask
    }
    const name = esc(target.preferred_name || target.first_name)
    const mine = ph.filter(p => p.resident_id === target.id)
    if (!mine.length) return { html: `<p>There are no photos of ${name} on their profile yet. A manager can add some, or family can send them through their private link.</p>`, photos: [] }

    const skip = new Set([...STOP, ...words(`${target.first_name} ${target.last_name} ${target.preferred_name ?? ''}`)])
    const terms = [...new Set(words(queryText).filter(w => !skip.has(w)))]
    const scored = mine.map(p => {
      const hay = new Set(words(`${p.caption ?? ''} ${p.people_note ?? ''}`).flatMap(w => [w, w.replace(/(ing|ed|s)$/, '')]))
      return { p, score: terms.filter(t => hay.has(t) || hay.has(t.replace(/(ing|ed|s)$/, ''))).length }
    })
    const matched = terms.length ? scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score) : []
    const shown = (matched.length ? matched : scored).slice(0, 6).map(x => x.p)
    const caps = shown.filter(p => p.caption).map(p => `<li>${esc(p.caption)}</li>`).join('')
    let html: string
    if (matched.length) html = `<p>Yes, there ${shown.length === 1 ? 'is a photo' : 'are photos'} of ${name} that ${shown.length === 1 ? 'fits' : 'fit'} that, shown below.</p>${caps ? `<ul>${caps}</ul>` : ''}`
    else if (terms.length) html = `<p>${name} has ${mine.length} ${mine.length === 1 ? 'photo' : 'photos'}, shown below, but none has a caption that mentions ${esc(terms.slice(0, 3).join(', '))}.</p>${caps ? `<ul>${caps}</ul>` : ''}`
    else html = `<p>Here ${shown.length === 1 ? 'is the photo' : 'are the photos'} of ${name}.</p>${caps ? `<ul>${caps}</ul>` : ''}`
    html += '<p>I can only tell you what each photo is captioned. I cannot describe what is in a picture.</p>'
    return { html, photos: shown.map(hubPhotoDto) }
  } catch { return null }
}
