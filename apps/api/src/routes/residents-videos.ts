// "This is me" family video messages: every route (see lib/resident-videos.ts for the rules and how upload and processing work).
//
// Family link (public, the invite token is the key; mounted at /public/family, same 410 as the form for a dead link):
//   POST   /:token/videos/start            { size, filename }                 -> a new clip to upload, returns chunk size and count
//   PUT    /:token/videos/:vid/chunk/:n    raw bytes (application/octet-stream), exactly 4 MB each except the last
//   GET    /:token/videos/:vid             state, and which chunks are stored (so a dropped upload carries on)
//   POST   /:token/videos/:vid/complete    { title }  joins, checks, processes; answers when done (or failed)
//   PATCH  /:token/videos/:vid             { title }  (before Send)       DELETE /:token/videos/:vid
// Managers (signed in, admin, Professional or Enterprise; mounted at /residents BEFORE the main residents router):
//   POST   /:id/videos/start | PUT /:id/videos/:vid/chunk/:n | POST /:id/videos/:vid/complete | GET /:id/videos/:vid   same flow, approved at once
//   POST   /:id/videos/:vid/decision       approve (optionally with an edited title and note) or reject (files deleted at once)
//   PATCH  /:id/videos/:vid                rename or edit the note          DELETE /:id/videos/:vid
//   GET    /:id/video-plays                recent plays (who and when)
//   GET    /:id/videos/:vid/transcript     what is said (machine generated); checks a pending speech job first, so the screen polls this
//   POST   /:id/videos/:vid/transcript     "Transcribe and translate" (family clips start by themselves; managers press it for any clip)
//   PATCH  /:id/videos/:vid/transcript     { edited_translation_text?, show_to_staff? }  correct the English text, or share it with staff
// Staff (any signed in user of the home):
//   GET    /hub/videos                     people with approved clips          GET /hub/videos?resident_id=...   their clips, newest first
//   POST   /videos/:vid/play               logs the play and returns a fresh streaming link (and the English text, only if a manager shared it)
// Files (public, signed link, mounted at /public/resident-video):  GET /:id?k=video|poster&s=&e=&g=   with HTTP Range support.

import express, { Router, Request, Response, NextFunction } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { writeAuditLog } from '../lib/audit'
import { residentsEnabled, tablesReady, displayName, canManageArchive } from '../lib/residents'
import {
  videosReady, startVideoUpload, saveChunk, receivedChunks, completeVideo, settleStuck, adminVideoDto, hubVideoDto, familyVideoDto, discardVideoFiles, deleteVideo,
  cleanTitle, cleanNote, adminVideosFor, parseRange, signedVideoPath, verifyVideoSignature, HUB_VIDEO_LIMIT, CHUNK_BYTES,
} from '../lib/resident-videos'
import {
  transcriptsReady, transcriptFor, startTranscript, refreshTranscript, editTranslation, setShowToStaff, adminTranscriptDto, notAvailableDto, staffTranslationFor,
} from '../lib/resident-video-transcripts'
import { liveInvite } from './residents-public'
import { openObjectStream } from '../services/storage/s3'

const db = prisma as any
const DEAD = 'This link is no longer active. Please contact the home if you would still like to share something.'
const DEMO_TOKEN = 'demo'

// ─── Per link limits ───────────────────────────────────────────────────────────
// In addition to the per IP limit on /public. Counted in memory per function instance, so a loose guard; the real caps are in the database
// (5 clips per link, 2 at a time, 40 per resident, 150 MB each).
const hits = new Map<string, number[]>()
function overLimit(key: string, max: number, windowMs: number): boolean {
  const now = Date.now()
  const list = (hits.get(key) ?? []).filter(t => now - t < windowMs)
  list.push(now); hits.set(key, list)
  if (hits.size > 5000) for (const [k, v] of hits) if (!v.some(t => now - t < windowMs)) hits.delete(k)
  return list.length > max
}
const TOO_MANY = 'Too many attempts. Please wait a few minutes and try again.'

// Raw chunk bodies. A chunk is at most 4 MB (the platform body limit is about 4.5 MB).
const rawChunk = (req: Request, res: Response, next: NextFunction) => {
  express.raw({ type: () => true, limit: CHUNK_BYTES })(req, res, (e?: any) => {
    if (!e) { if (!Buffer.isBuffer(req.body)) req.body = Buffer.alloc(0); next(); return }
    err(res, 'BAD_CHUNK', 'That part of the video was too big or unreadable. Please try again.', e?.status === 413 ? 413 : 400)
  })
}

async function waitForVideo(id: string, inviteId?: string, residentId?: string) {
  const where: any = { id }
  if (inviteId) where.invite_id = inviteId
  if (residentId) where.resident_id = residentId
  const v = await db.residentVideo.findFirst({ where }).catch(() => null)
  return v ? settleStuck(v) : null
}

// ═══ Family link ═══════════════════════════════════════════════════════════════
export const publicFamilyVideosRouter = Router()

async function familyCtx(req: Request, res: Response) {
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return null }
  if (!(await videosReady())) { err(res, 'NOT_READY', 'Videos are not available just now. Please try again later.', 503); return null }
  if (live.inv.submitted_at) { err(res, 'ALREADY_SUBMITTED', 'Thank you, your answers have already been sent. The home can send you a new link if you would like to add more.', 409); return null }
  return live
}

publicFamilyVideosRouter.post('/:token/videos/start', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { demo: true, video: { id: `demo-${Date.now()}`, title: null, state: 'uploading', status: 'pending', error: null, duration_seconds: null, total_chunks: 1, chunk_bytes: CHUNK_BYTES, video_url: null, poster_url: null } }, 201); return }
  const live = await familyCtx(req, res); if (!live) return
  if (overLimit(`start:${live.inv.id}`, 12, 3600_000)) { err(res, 'RATE_LIMITED', TOO_MANY, 429); return }
  const r = await startVideoUpload(
    { tenantId: live.inv.tenant_id, residentId: live.resident.id, inviteId: live.inv.id, name: live.inv.name, relationship: live.inv.relationship ?? null, source: 'family' },
    { size: req.body?.size },
  )
  if (!r.ok) { err(res, r.code, r.message, r.status); return }
  ok(res, { video: familyVideoDto(r.video, live.inv.id) }, 201)
})

publicFamilyVideosRouter.put('/:token/videos/:vid/chunk/:n', rawChunk, async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { demo: true, stored: true }); return }
  const live = await familyCtx(req, res); if (!live) return
  if (overLimit(`chunk:${live.inv.id}`, 400, 3600_000)) { err(res, 'RATE_LIMITED', TOO_MANY, 429); return }
  const v = await waitForVideo(String(req.params.vid), live.inv.id)
  if (!v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  const r = await saveChunk(v, Number(req.params.n), req.body as Buffer)
  if (!r.ok) { err(res, r.code, r.message, r.status); return }
  ok(res, { stored: true })
})

publicFamilyVideosRouter.get('/:token/videos/:vid', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  const live = await liveInvite(String(req.params.token))
  if (!live) { err(res, 'UNAVAILABLE', DEAD, 410); return }
  const v = await waitForVideo(String(req.params.vid), live.inv.id)
  if (!v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  ok(res, { video: familyVideoDto(v, live.inv.id), received: v.state === 'uploading' ? await receivedChunks(v) : [] })
})

publicFamilyVideosRouter.post('/:token/videos/:vid/complete', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { demo: true, video: { id: String(req.params.vid), title: cleanTitle(req.body?.title), state: 'ready', status: 'pending', error: null, duration_seconds: 12, total_chunks: 1, chunk_bytes: CHUNK_BYTES, video_url: null, poster_url: null } }); return }
  const live = await familyCtx(req, res); if (!live) return
  const v = await waitForVideo(String(req.params.vid), live.inv.id)
  if (!v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  const r = await completeVideo(v, { title: req.body?.title })
  if (!r.ok) { err(res, r.code, r.message, r.status); return }
  ok(res, { video: familyVideoDto(r.video, live.inv.id) })
})

publicFamilyVideosRouter.patch('/:token/videos/:vid', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { demo: true }); return }
  const live = await familyCtx(req, res); if (!live) return
  const v = await waitForVideo(String(req.params.vid), live.inv.id)
  if (!v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  const upd = await db.residentVideo.update({ where: { id: v.id }, data: { title: cleanTitle(req.body?.title) } })
  ok(res, { video: familyVideoDto(upd, live.inv.id) })
})

publicFamilyVideosRouter.delete('/:token/videos/:vid', async (req: Request, res: Response) => {
  if (req.params.token === DEMO_TOKEN) { ok(res, { deleted: true, demo: true }); return }
  const live = await familyCtx(req, res); if (!live) return
  const v = await waitForVideo(String(req.params.vid), live.inv.id)
  if (!v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  await deleteVideo(v)
  ok(res, { deleted: true })
})

// ═══ Managers and staff ════════════════════════════════════════════════════════
export const residentVideosRouter = Router()

async function actor(req: Request) {
  const u = await db.user.findUnique({ where: { id: req.user!.sub }, select: { id: true, name: true, email: true } })
  return { id: req.user!.sub, name: u?.name ?? 'An admin', email: u?.email ?? 'unknown' }
}
async function adminGate(req: Request, res: Response, next: NextFunction) {
  const tenantId = getTenantId()
  if (!(await residentsEnabled(tenantId))) { err(res, 'FEATURE_NOT_AVAILABLE', 'Resident profiles are on the Professional and Enterprise plans. Upgrade to use them.', 403); return }
  if (!(await tablesReady())) { err(res, 'NOT_READY', 'Resident profiles are being set up. Please try again shortly.', 503); return }
  if (!(await videosReady())) { err(res, 'NOT_READY', 'Videos are being set up. Please try again shortly.', 503); return }
  next()
}
const admin = [requireAdmin, adminGate]
const loadResident = (tenantId: string, id: string) => db.resident.findFirst({ where: { id, tenant_id: tenantId } })

residentVideosRouter.post('/:id/videos/start', ...admin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'You cannot add videos to an archived profile.', 409); return }
  const a = await actor(req)
  const s = await startVideoUpload({ tenantId, residentId: r.id, inviteId: null, name: a.name, relationship: null, source: 'manager', decidedBy: a.email }, { size: req.body?.size, title: req.body?.title })
  if (!s.ok) { err(res, s.code, s.message, s.status); return }
  if (req.body?.note) await db.residentVideo.update({ where: { id: s.video.id }, data: { note: cleanNote(req.body.note) } })
  ok(res, { video: adminVideoDto(s.video), chunk_bytes: CHUNK_BYTES, total_chunks: s.video.total_chunks }, 201)
})

residentVideosRouter.put('/:id/videos/:vid/chunk/:n', ...admin, rawChunk, async (req: Request, res: Response) => {
  const v = await waitForVideo(String(req.params.vid), undefined, String(req.params.id))
  if (!v || v.tenant_id !== getTenantId()) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  const r = await saveChunk(v, Number(req.params.n), req.body as Buffer)
  if (!r.ok) { err(res, r.code, r.message, r.status); return }
  ok(res, { stored: true })
})

residentVideosRouter.get('/:id/videos/:vid', ...admin, async (req: Request, res: Response) => {
  const v = await waitForVideo(String(req.params.vid), undefined, String(req.params.id))
  if (!v || v.tenant_id !== getTenantId()) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  ok(res, { video: adminVideoDto(v), received: v.state === 'uploading' ? await receivedChunks(v) : [], chunk_bytes: CHUNK_BYTES, total_chunks: v.total_chunks })
})

residentVideosRouter.post('/:id/videos/:vid/complete', ...admin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const v = await waitForVideo(String(req.params.vid), undefined, String(req.params.id))
  if (!v || v.tenant_id !== tenantId) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  const r = await completeVideo(v, { title: req.body?.title })
  if (!r.ok) { err(res, r.code, r.message, r.status); return }
  const a = await actor(req)
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_video_added', entity_type: 'resident', entity_id: v.resident_id, metadata: { video_id: v.id, source: 'manager' } })
  ok(res, { video: adminVideoDto(r.video) })
})

residentVideosRouter.post('/:id/videos/:vid/decision', ...admin, async (req: Request, res: Response) => {
  const p = z.object({ decision: z.enum(['approve', 'reject']), title: z.string().max(400).nullish(), note: z.string().max(1000).nullish() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'decision must be approve or reject.'); return }
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const v = r ? await db.residentVideo.findFirst({ where: { id: String(req.params.vid), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'This profile is archived.', 409); return }
  if (v.status !== 'pending') { err(res, 'DECIDED', 'This video has already been decided.', 409); return }
  if (v.state !== 'ready') { err(res, 'NOT_READY', 'This video is still being processed.', 409); return }
  const a = await actor(req)
  const data: Record<string, unknown> = { status: p.data.decision === 'approve' ? 'approved' : 'rejected', decided_at: new Date(), decided_by: a.email }
  if (p.data.decision === 'approve') { if (p.data.title !== undefined) data.title = cleanTitle(p.data.title); if (p.data.note !== undefined) data.note = cleanNote(p.data.note) }
  const upd = await db.residentVideo.update({ where: { id: v.id }, data })
  if (p.data.decision === 'reject') { await discardVideoFiles(upd); upd.s3_key = ''; upd.poster_key = '' }   // a rejected clip is not kept
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_video_decided', entity_type: 'resident', entity_id: r.id, metadata: { decision: p.data.decision, video_id: v.id } })
  ok(res, adminVideoDto(upd))
})

residentVideosRouter.patch('/:id/videos/:vid', ...admin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const v = r ? await db.residentVideo.findFirst({ where: { id: String(req.params.vid), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'An archived profile cannot be edited.', 409); return }
  const data: Record<string, unknown> = {}
  if (req.body?.title !== undefined) data.title = cleanTitle(req.body.title)
  if (req.body?.note !== undefined) data.note = cleanNote(req.body.note)
  const upd = await db.residentVideo.update({ where: { id: v.id }, data })
  ok(res, adminVideoDto(upd))
})

residentVideosRouter.delete('/:id/videos/:vid', ...admin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const v = r ? await db.residentVideo.findFirst({ where: { id: String(req.params.vid), resident_id: r.id, tenant_id: tenantId } }) : null
  if (!r || !v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  if (r.status !== 'living' && !(await canManageArchive(tenantId, req.user!.sub, req.user!.role))) { err(res, 'FORBIDDEN', 'You do not have access to archived residents.', 403); return }
  const a = await actor(req)
  await deleteVideo(v)
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_video_deleted', entity_type: 'resident', entity_id: r.id, metadata: { video_id: v.id, status: v.status } })
  ok(res, { deleted: true })
})

// ─── What is said (manager only) ───────────────────────────────────────────────
// Machine generated speech to text and English translation, a decision aid for the manager. Approving or rejecting never waits for it.
async function loadVideoFor(req: Request) {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  const v = r ? await db.residentVideo.findFirst({ where: { id: String(req.params.vid), resident_id: r.id, tenant_id: tenantId } }) : null
  return { tenantId, r, v }
}

residentVideosRouter.get('/:id/videos/:vid/transcript', ...admin, async (req: Request, res: Response) => {
  const { tenantId, r, v } = await loadVideoFor(req)
  if (!r || !v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  if (!(await transcriptsReady())) { ok(res, { transcript: notAvailableDto() }); return }
  let t = await transcriptFor(tenantId, v.id)
  if (t?.state === 'pending') t = await refreshTranscript(t)   // no background worker: the check happens when the screen asks
  ok(res, { transcript: t ? adminTranscriptDto(t) : null })
})

residentVideosRouter.post('/:id/videos/:vid/transcript', ...admin, async (req: Request, res: Response) => {
  const { tenantId, r, v } = await loadVideoFor(req)
  if (!r || !v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'This profile is archived.', 409); return }
  if (v.state !== 'ready' || !v.s3_key || v.status === 'rejected') { err(res, 'NOT_READY', 'This video is not ready to be read.', 409); return }
  if (!(await transcriptsReady())) { ok(res, { transcript: notAvailableDto() }); return }
  const t = await startTranscript(v)
  const a = await actor(req)
  void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_video_transcribed', entity_type: 'resident', entity_id: r.id, metadata: { video_id: v.id } })   // never the text
  ok(res, { transcript: t ? adminTranscriptDto(t) : null }, 202)
})

residentVideosRouter.patch('/:id/videos/:vid/transcript', ...admin, async (req: Request, res: Response) => {
  const p = z.object({ edited_translation_text: z.string().max(20000).nullish(), show_to_staff: z.boolean().optional() }).safeParse(req.body)
  if (!p.success) { err(res, 'VALIDATION_ERROR', 'Please check the text and try again.'); return }
  const { tenantId, r, v } = await loadVideoFor(req)
  if (!r || !v) { err(res, 'NOT_FOUND', 'Video not found.', 404); return }
  if (r.status !== 'living') { err(res, 'ARCHIVED', 'An archived profile cannot be edited.', 409); return }
  if (!(await transcriptsReady())) { err(res, 'NOT_READY', 'Translation is not switched on yet.', 503); return }
  let t = await transcriptFor(tenantId, v.id)
  if (!t) { err(res, 'NOT_FOUND', 'There is no text for this video yet.', 404); return }
  const a = await actor(req)
  if (p.data.edited_translation_text !== undefined) {
    const e = await editTranslation(t, p.data.edited_translation_text, a.name)
    if (!e.ok) { err(res, e.code, e.message, e.status); return }
    t = e.row
    void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_video_translation_edited', entity_type: 'resident', entity_id: r.id, metadata: { video_id: v.id } })
  }
  if (p.data.show_to_staff !== undefined) {
    const s = await setShowToStaff(t, p.data.show_to_staff)
    if (!s.ok) { err(res, s.code, s.message, s.status); return }
    t = s.row
    void writeAuditLog({ tenant_id: tenantId, user_id: a.id, event_type: 'resident_video_staff_text_changed', entity_type: 'resident', entity_id: r.id, metadata: { video_id: v.id, show_to_staff: p.data.show_to_staff } })
  }
  ok(res, { transcript: adminTranscriptDto(t) })
})

residentVideosRouter.get('/:id/video-plays', ...admin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const r = await loadResident(tenantId, String(req.params.id))
  if (!r) { err(res, 'NOT_FOUND', 'Resident not found.', 404); return }
  ok(res, { plays: (await adminVideosFor(tenantId, r.id)).plays })
})

// Staff: any signed in user of the home. Plan or tables missing = nothing to show, not an error.
residentVideosRouter.get('/hub/videos', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const off = { enabled: false, people: [] as unknown[], resident: null as unknown, videos: [] as unknown[] }
  if (!(await residentsEnabled(tenantId)) || !(await tablesReady()) || !(await videosReady())) { ok(res, off); return }
  const living: any[] = await db.resident.findMany({ where: { tenant_id: tenantId, status: 'living' }, select: { id: true, first_name: true, last_name: true, preferred_name: true, room: true }, take: 500 })
  const rid = req.query.resident_id ? String(req.query.resident_id) : ''
  if (rid) {
    const r = living.find(x => x.id === rid)
    if (!r) { ok(res, { ...off, enabled: true }); return }
    const rows = await db.residentVideo.findMany({ where: { tenant_id: tenantId, resident_id: r.id, status: 'approved', state: 'ready', s3_key: { not: '' } }, orderBy: { decided_at: 'desc' }, take: HUB_VIDEO_LIMIT })
    ok(res, { enabled: true, people: [], resident: { id: r.id, name: r.preferred_name || r.first_name }, videos: rows.map((x: any) => hubVideoDto(x, r)) })
    return
  }
  const g = await db.residentVideo.groupBy({ by: ['resident_id'], where: { tenant_id: tenantId, resident_id: { in: living.map(x => x.id) }, status: 'approved', state: 'ready', s3_key: { not: '' } }, _count: { _all: true } })
  const people = g.map((x: any) => { const r = living.find(l => l.id === x.resident_id); return r ? { id: r.id, name: r.preferred_name || r.first_name, display_name: displayName(r), count: Math.min(x._count._all, HUB_VIDEO_LIMIT) } : null }).filter(Boolean)
    .sort((a: any, b: any) => a.name.localeCompare(b.name))
  ok(res, { enabled: people.length > 0, people, resident: null, videos: [] })
})

// Pressing play: logs who and when, and hands back a fresh link (so a link never goes stale in an open page).
residentVideosRouter.post('/videos/:vid/play', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  if (!(await residentsEnabled(tenantId)) || !(await videosReady())) { err(res, 'UNAVAILABLE', 'This video is not available.', 404); return }
  const v = await db.residentVideo.findFirst({ where: { id: String(req.params.vid), tenant_id: tenantId, status: 'approved', state: 'ready', s3_key: { not: '' } } })
  const r = v ? await loadResident(tenantId, v.resident_id) : null
  if (!v || !r || r.status !== 'living') { err(res, 'UNAVAILABLE', 'This video is not available.', 404); return }
  // refresh = the page asking for a new link for the same play because the first one ran out: not a second play.
  if (req.body?.refresh !== true) {
    const now = new Date()
    await db.residentVideoPlay.create({ data: { tenant_id: tenantId, resident_id: v.resident_id, video_id: v.id, user_id: req.user!.sub, played_at: now } })
    await db.residentVideo.update({ where: { id: v.id }, data: { last_played_at: now } })
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'resident_video_played', entity_type: 'resident', entity_id: v.resident_id, metadata: { video_id: v.id } })   // never the link
  }
  // The English text is only returned when a manager shared it for this video (and the clip is approved, which was checked above).
  const text = await staffTranslationFor(v).catch(() => null)
  ok(res, { url: signedVideoPath(v.id, 'staff'), title: v.title ?? null, translation: text })
})

// ═══ The file itself ═══════════════════════════════════════════════════════════
// GET /public/resident-video/:id?k=video|poster&s=<scope>&e=<expiry>&g=<signature>. Opened by a <video> or <img> tag, so it cannot carry a
// sign in token; the signature (about ten minutes) stands in for it. Every request re-checks the clip, the resident and the invite, so an old
// link stops working as soon as a clip is rejected or deleted, a resident moves on, or a family link is cancelled. Range requests are
// answered with 206 so playback starts quickly and seeking works on phones and tablets.
export const residentVideoFileRouter = Router()

residentVideoFileRouter.get('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id), kind = String(req.query.k ?? 'video'), scope = String(req.query.s ?? ''), exp = Number(req.query.e), sig = String(req.query.g ?? '')
  const gone = () => { if (!res.headersSent) err(res, 'UNAVAILABLE', 'This video is not available.', 404) }
  if (!verifyVideoSignature(id, kind, scope, exp, sig)) { gone(); return }
  try {
    const v = await db.residentVideo.findUnique({ where: { id } })
    if (!v || v.state !== 'ready' || v.status === 'rejected') { gone(); return }
    const key = kind === 'poster' ? v.poster_key : v.s3_key
    if (!key) { gone(); return }
    const resident = await db.resident.findFirst({ where: { id: v.resident_id, tenant_id: v.tenant_id } })
    if (!resident || !(await residentsEnabled(v.tenant_id))) { gone(); return }
    if (scope === 'staff') {
      if (v.status !== 'approved' || resident.status !== 'living') { gone(); return }
    } else if (scope.startsWith('family:')) {
      const inviteId = scope.slice(7)
      const inv = v.invite_id === inviteId ? await db.residentInvite.findUnique({ where: { id: inviteId } }) : null
      if (!inv || inv.revoked_at || inv.expires_at < new Date() || resident.status !== 'living') { gone(); return }
    } else if (scope !== 'admin') { gone(); return }   // admin links were minted only for a signed in manager

    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.setHeader('Content-Security-Policy', "sandbox; default-src 'none'; media-src 'self'; img-src 'self' data:")
    res.setHeader('Cache-Control', 'private, no-store')
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Accept-Ranges', 'bytes')
    if (kind === 'poster') {
      res.setHeader('Content-Type', 'image/jpeg'); res.setHeader('Content-Disposition', 'inline; filename="poster.jpg"')
      ;(await openObjectStream(key)).on('error', () => res.destroy()).pipe(res)
      return
    }
    const size = Number(v.size_bytes) || 0
    const range = parseRange(req.headers.range, size)
    res.setHeader('Content-Type', 'video/mp4'); res.setHeader('Content-Disposition', 'inline; filename="message.mp4"')
    if (range === 'bad') { res.status(416).setHeader('Content-Range', `bytes */${size}`); res.end(); return }
    if (range) {
      res.status(206); res.setHeader('Content-Range', `bytes ${range.start}-${range.end}/${size}`); res.setHeader('Content-Length', String(range.end - range.start + 1))
      ;(await openObjectStream(key, range)).on('error', () => res.destroy()).pipe(res)
      return
    }
    res.status(200); res.setHeader('Content-Length', String(size))
    ;(await openObjectStream(key)).on('error', () => res.destroy()).pipe(res)
  } catch { gone() }
})
