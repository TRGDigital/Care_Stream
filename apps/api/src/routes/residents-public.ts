// Public, unauthenticated endpoints for the family form (the emailed private link). Mounted before requireAuth.
// The unguessable token is the key: only its SHA-256 is stored. A dead link (unknown, revoked, expired, resident no longer living, or plan
// lapsed) always answers 410 with the same message, so a wrong guess learns nothing. Rate limited by publicLimiter (mounted on /public).
// Whatever a family member writes becomes a PENDING contribution: staff cannot see it until an admin approves it.
// Photos work the same way: up to 5 per link, each PENDING until a manager approves it (see lib/resident-photos.ts). The family member
// can see their own photos on this page while the link is valid; nobody else can, and there is no public address for any photo.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { siteUrl } from '../lib/urls'
import { SECTIONS, SECTION_KEYS, hashToken, cleanText, residentsEnabled, tablesReady } from '../lib/residents'
import {
  photosReady, processAndStorePhoto, cleanCaption, cleanPeople, familyPhotoDto, verifyPhotoSignature, PHOTOS_PER_INVITE, PENDING_PHOTOS_PER_RESIDENT, CAPTION_MAX,
} from '../lib/resident-photos'
import { residentPhotoUploadMiddleware } from '../middleware/upload'
import { downloadFile, deleteFile } from '../services/storage/s3'
import { sendResidentFamilySubmissionEmail } from '../services/email/outbound'
import { noteFamilyReply } from '../lib/family-reminders'
import { videosReady, familyVideoDto, settleInviteVideos, videoLimits, voiceLimits } from '../lib/resident-videos'

export const publicFamilyRouter = Router()
const db = prisma as any
const DEAD = 'This link is no longer active. Please contact the home if you would still like to share something.'

export async function liveInvite(token: string) {
  if (!token || token.length < 20 || token.length > 100) return null
  if (!(await tablesReady())) return null
  const inv = await db.residentInvite.findUnique({ where: { token_hash: hashToken(token) } })
  if (!inv || inv.revoked_at || inv.expires_at < new Date()) return null
  const resident = await db.resident.findFirst({ where: { id: inv.resident_id, tenant_id: inv.tenant_id } })
  if (!resident || resident.status !== 'living') return null
  if (!(await residentsEnabled(inv.tenant_id))) return null
  const tenant = await db.tenant.findUnique({ where: { id: inv.tenant_id }, select: { name: true } })
  return { inv, resident, homeName: tenant?.name ?? 'the home' }
}

// A permanent demonstration link, /family/demo, so care managers can see exactly what a family member sees. It shows the real questions
// with a sample resident and home, never reads or writes a resident, and never sends an email. Nothing typed into it is kept.
const DEMO_TOKEN = 'demo'

const photoLimits = { max_photos: PHOTOS_PER_INVITE, max_photo_mb: 5, caption_max: CAPTION_MAX }
async function ownVideos(inviteId: string): Promise<any[]> {
  try { return await db.residentVideo.findMany({ where: { invite_id: inviteId, state: { not: 'failed' }, status: { not: 'rejected' } }, orderBy: { submitted_at: 'asc' }, take: 20 }) } catch { return [] }
}
async function ownPhotos(inviteId: string): Promise<any[]> {
  try { return await db.residentPhoto.findMany({ where: { invite_id: inviteId }, orderBy: { submitted_at: 'asc' }, take: 20 }) } catch { return [] }
}

publicFamilyRouter.get('/:token', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) {
    ok(res, { resident_name: 'Tim', home_name: 'Sample Care Home', invitee_name: 'Sally', expires_at: '2099-12-31T00:00:00.000Z', already_submitted: false, sections: SECTIONS, demo: true, photos: [], photos_enabled: true, ...photoLimits, videos: [], videos_enabled: true, ...videoLimits, voice_enabled: true, voice_notes: [], ...voiceLimits })
    return
  }
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  const photos = await ownPhotos(live.inv.id)
  const videos = await ownVideos(live.inv.id)
  const videosOn = await videosReady()
  if (!live.inv.opened_at) await db.residentInvite.update({ where: { id: live.inv.id }, data: { opened_at: new Date() } }).catch(() => undefined)
  ok(res, {
    resident_name: live.resident.preferred_name || live.resident.first_name,
    home_name: live.homeName,
    invitee_name: live.inv.name,
    expires_at: live.inv.expires_at.toISOString(),
    already_submitted: !!live.inv.submitted_at,
    sections: SECTIONS,
    photos_enabled: await photosReady(),
    photos: photos.map(p => familyPhotoDto(p, live.inv.id)),
    ...photoLimits,
    videos_enabled: videosOn,
    videos: videos.filter(v => v.media_kind !== 'audio').map(v => familyVideoDto(v, live.inv.id)),
    ...videoLimits,
    voice_enabled: videosOn,
    voice_notes: videos.filter(v => v.media_kind === 'audio').map(v => familyVideoDto(v, live.inv.id)),
    ...voiceLimits,
  })
})

// One photo per request (multipart: field "photo", optional "caption" and "people_note"). Stored PENDING. The first request of a
// visit is the usual place a bad link is noticed, so the same 410 as the form is used.
publicFamilyRouter.post('/:token/photos', residentPhotoUploadMiddleware, async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { demo: true, photo: { id: `demo-${Date.now()}`, caption: cleanCaption(req.body?.caption), people_note: cleanPeople(req.body?.people_note), status: 'pending', url: null } }, 201); return }
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  if (!(await photosReady())) { err(res, 'NOT_READY', 'Photos are not available just now. Please try again later.', 503); return }
  if (live.inv.submitted_at) { err(res, 'ALREADY_SUBMITTED', 'Thank you, your answers have already been sent. The home can send you a new link if you would like to add more photos.', 409); return }
  const mine = await db.residentPhoto.count({ where: { invite_id: live.inv.id, status: { not: 'rejected' } } })
  if (mine >= PHOTOS_PER_INVITE) { err(res, 'LIMIT', `You can share up to ${PHOTOS_PER_INVITE} photos.`, 403); return }
  const waiting = await db.residentPhoto.count({ where: { resident_id: live.resident.id, status: 'pending' } })
  if (waiting >= PENDING_PHOTOS_PER_RESIDENT) { err(res, 'LIMIT', 'There are a lot of photos waiting for the manager to review. Please try again later.', 429); return }

  const done = await processAndStorePhoto({ tenantId: live.inv.tenant_id, residentId: live.resident.id, file: (req as any).file })
  if (!done.ok) { err(res, done.code, done.message, done.status); return }
  const photo = await db.residentPhoto.create({
    data: {
      tenant_id: live.inv.tenant_id, resident_id: live.resident.id, invite_id: live.inv.id, uploaded_by_name: cleanText(live.inv.name, 100) || 'Family', relationship: cleanText(live.inv.relationship, 60) || null,
      source: 'family', caption: cleanCaption(req.body?.caption), people_note: cleanPeople(req.body?.people_note),
      s3_key: done.s3Key, mime: done.mime, size_bytes: done.size, width: done.width, height: done.height, status: 'pending', scan_status: done.scan,
    },
  })
  ok(res, { photo: familyPhotoDto(photo, live.inv.id) }, 201)
})

// A family member removes a photo they sent while it is still waiting (or after), so a wrong photo can be taken back.
publicFamilyRouter.delete('/:token/photos/:pid', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { deleted: true, demo: true }); return }
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  if (live.inv.submitted_at) { err(res, 'ALREADY_SUBMITTED', 'Your photos have already been sent. Please ask the home if you would like one removed.', 409); return }
  const ph = await db.residentPhoto.findFirst({ where: { id: String(req.params.pid), invite_id: live.inv.id } }).catch(() => null)
  if (!ph) { err(res, 'NOT_FOUND', 'Photo not found.', 404); return }
  if (ph.s3_key) await deleteFile(ph.s3_key)
  await db.residentPhoto.delete({ where: { id: ph.id } })
  ok(res, { deleted: true })
})

const SubmitSchema = z.object({
  name: z.string().trim().min(1).max(100),
  relationship: z.string().trim().min(1).max(60),
  answers: z.record(z.string(), z.string().max(4000)),
})

publicFamilyRouter.post('/:token', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { submitted: 0, demo: true }, 201); return }   // demonstration only: nothing is saved
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  if (live.inv.submitted_at) { err(res, 'ALREADY_SUBMITTED', 'Thank you, your answers have already been sent. The home can send you a new link if you would like to add more.', 409); return }
  const p = SubmitSchema.safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please add your name, how you know them, and at least one answer.', 400); return }
  const rows = Object.entries(p.data.answers)
    .filter(([k]) => SECTION_KEYS.has(k))
    .map(([k, v]) => [k, cleanText(v, 4000)] as const)
    .filter(([, v]) => v.length > 0)
  // Photos already uploaded through this link count as part of the submission (a photo-only submission is fine).
  const photoCount = (await ownPhotos(live.inv.id)).filter(ph => ph.status === 'pending').length
  // Videos too: a clip still being processed holds up Send; half-finished uploads are thrown away.
  const vids = await settleInviteVideos(live.inv.id)
  if (vids.processing > 0) { err(res, 'PROCESSING', 'Your video or voice note is still being processed. Please wait a moment and press Send again.', 409); return }
  const videoCount = vids.videos, voiceCount = vids.voiceNotes
  if (!rows.length && !photoCount && !videoCount && !voiceCount) { err(res, 'VALIDATION_ERROR', 'Please answer at least one question or add a photo, video or voice note.', 400); return }

  const name = cleanText(p.data.name, 100), relationship = cleanText(p.data.relationship, 60)
  if (rows.length) await db.residentContribution.createMany({
    data: rows.map(([section_key, text]) => ({
      tenant_id: live.inv.tenant_id, resident_id: live.resident.id, invite_id: live.inv.id, contributor_name: name, relationship, section_key, text,
    })),
  })
  await db.residentInvite.update({ where: { id: live.inv.id }, data: { submitted_at: new Date() } })
  await noteFamilyReply(live.inv.id)   // a reply restarts the family reminder count

  // Tell the admin who sent the invitation. A failed email must never lose the answers.
  try {
    const admin = live.inv.created_by ? await db.user.findUnique({ where: { email: live.inv.created_by }, select: { name: true, email: true } }) : null
    if (admin) {
      await sendResidentFamilySubmissionEmail({
        to: admin.email, adminName: admin.name, homeName: live.homeName, residentName: live.resident.preferred_name || live.resident.first_name,
        contributorName: name, relationship, count: rows.length, photoCount, videoCount, voiceCount, link: `${siteUrl()}/knowledge`,
      })
    }
  } catch (e) { console.error('[residents] submission email failed:', e) }

  ok(res, { submitted: rows.length, photos: photoCount, videos: videoCount, voice_notes: voiceCount }, 201)
})

// ─── The photo file itself ─────────────────────────────────────────────────────
// GET /public/resident-photo/:id?s=<scope>&e=<expiry>&g=<signature>. Opened by an <img> tag, so it cannot carry a sign in token;
// the signature (about five minutes) stands in for it. Every request re-checks the photo, the resident and the invite, so an old
// link stops working as soon as a photo is rejected or deleted, a resident moves on, or a family link is cancelled.
export const residentPhotoFileRouter = Router()

residentPhotoFileRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id), scope = String(req.query.s ?? ''), exp = Number(req.query.e), sig = String(req.query.g ?? '')
  const gone = () => { err(res, 'UNAVAILABLE', 'This photo is not available.', 404) }
  if (!verifyPhotoSignature(id, scope, exp, sig)) { gone(); return }
  try {
    const photo = await db.residentPhoto.findUnique({ where: { id } })
    if (!photo || !photo.s3_key || photo.status === 'rejected') { gone(); return }
    const resident = await db.resident.findFirst({ where: { id: photo.resident_id, tenant_id: photo.tenant_id } })
    if (!resident || !(await residentsEnabled(photo.tenant_id))) { gone(); return }
    if (scope === 'staff') {
      // Staff and the hub: approved photos of LIVING residents only.
      if (photo.status !== 'approved' || resident.status !== 'living') { gone(); return }
    } else if (scope.startsWith('family:')) {
      // The family member who sent it, while their link is valid and the resident is living.
      const inviteId = scope.slice(7)
      const inv = photo.invite_id === inviteId ? await db.residentInvite.findUnique({ where: { id: inviteId } }) : null
      if (!inv || inv.revoked_at || inv.expires_at < new Date() || resident.status !== 'living') { gone(); return }
    } else if (scope !== 'admin') { gone(); return }   // admin links were minted only for a signed in manager (GET /residents/:id)
    const buf = await downloadFile(photo.s3_key)
    // Always a JPEG we produced ourselves. Private, never cached, never sniffed, never framed or run as a page.
    res.setHeader('Content-Type', 'image/jpeg')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; img-src 'self' data:")
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')   // helmet defaults to same-origin, which would block the web app's <img>
    res.setHeader('Content-Disposition', 'inline; filename="photo.jpg"')
    res.send(buf)
  } catch { gone() }
})
