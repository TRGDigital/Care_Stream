// "This is me" family video messages: chunked upload, processing, private storage, short-lived signed streaming links, clean-up and the
// chat answer. The media work itself (signature, probe, ffmpeg) is in resident-video-media.ts.
//
// Rules (agreed with the owner, see the spec resident-video-messages.md):
//   - Up to 60 seconds, 150 MB before processing, 5 clips per family link, 40 stored per resident. Judged by the real bytes and by probing.
//   - Every family clip is PENDING until a manager approves it (managers' own uploads are approved at once). Staff and the hub only see
//     APPROVED, READY clips of LIVING residents.
//   - Storage is private. There is no public address. A clip is played through a link signed for about ten minutes; the streaming route
//     (routes/residents-video-files.ts) re-checks status, resident and invite on every request and supports HTTP Range for fast starts.
//   - Clips are NEVER part of the assistant's knowledge and the assistant never watches or describes one.
//
// HOW A CLIP GETS IN (and why it is built this way)
//   The API body limit is about 4.5 MB, so one POST cannot carry a video, and S3 multipart parts must be at least 5 MB (except the last),
//   which does not fit in a 4 MB request. So each 4 MB chunk is stored as its own small temporary object
//   (tenants/{t}/residents/{r}/videos/tmp/{id}/00000), the page can ask which chunks are there and carry on after a lost signal, and on
//   "complete" the function joins the chunks in order into ONE file in the temp folder (about 150 MB at most), checks it, scans it,
//   transcodes it, stores the MP4 and poster, and deletes the temporary chunks. Temp folder use: raw file (at most 150 MB) + output
//   (about 15 MB) + the ffmpeg copy only if the deployed binary lost its executable bit (about 45 MB): well under 400 MB.
//   No S3 multipart upload is used, so there is nothing left half open in the bucket that could cost money: an abandoned upload leaves
//   a few small temporary objects which are removed when the invite is submitted, the clip is deleted, or the resident moves on.
//
// WORK RUNS BEFORE THE RESPONSE
//   The repo has no waitUntil helper (@vercel/functions is not installed) and a Vercel function is frozen once it has replied, so the
//   processing is done inside the "complete" request (function limit 300 seconds; a 60 second clip takes about 20 to 40). The row is set to
//   state 'processing' first, so the page shows Processing and polls the status route; if the phone drops the connection the function
//   still runs to the end. A row stuck in 'processing' for more than 6 minutes is reported as failed so the person can try again.

import { createHmac, randomUUID, timingSafeEqual } from 'crypto'
import fs from 'fs'
import os from 'os'
import path from 'path'
import { prisma } from '../db/client'
import { cleanText, residentsEnabled } from './residents'
import { detectVideoContainer, transcodeVideo, VideoError, MAX_SECONDS } from './resident-video-media'
import { keyOf, words, esc, STOP } from './resident-photos'
import { scanBuffer, scannerConfigured } from '../services/security/malware-scan'
import { putPrivateObject, objectSize, deleteObjectsUnder, deleteFile, downloadFile } from '../services/storage/s3'

const db = prisma as any

export const VIDEOS_PER_INVITE = 5
export const VIDEOS_PER_RESIDENT = 40          // stored in total (not rejected, not failed)
export const HUB_VIDEO_LIMIT = 10              // newest approved shown in the hub; older ones stay stored for a manager
export const MAX_UPLOAD_BYTES = 150 * 1024 * 1024
export const CHUNK_BYTES = 4 * 1024 * 1024
export const TITLE_MAX = 60
export const NOTE_MAX = 280
export const URL_SECONDS = 10 * 60
export const SCAN_MAX_BYTES = 25 * 1024 * 1024  // above this the scanner is skipped; the transcode below re-creates the file anyway
/** What the family page needs to know about the limits. */
export const videoLimits = { max_videos: VIDEOS_PER_INVITE, max_video_seconds: MAX_SECONDS, max_video_mb: MAX_UPLOAD_BYTES / 1024 / 1024, video_title_max: TITLE_MAX }
const STUCK_MS = 6 * 60 * 1000

/** True when the videos tables exist (the SQL may not have been run yet). */
export async function videosReady(): Promise<boolean> {
  try { await db.residentVideo.findFirst({ select: { id: true } }); await db.residentVideoPlay.findFirst({ select: { id: true } }); return true } catch { return false }
}

export type Fail = { ok: false; status: number; code: string; message: string }
const fail = (status: number, code: string, message: string): Fail => ({ ok: false, status, code, message })

export const cleanTitle = (v: unknown) => cleanText(v, TITLE_MAX).replace(/\s*\n\s*/g, ' ') || null
export const cleanNote = (v: unknown) => cleanText(v, NOTE_MAX).replace(/\s*\n\s*/g, ' ') || null

// ─── Keys ──────────────────────────────────────────────────────────────────────
const baseKey = (tenantId: string, residentId: string) => `tenants/${tenantId}/residents/${residentId}/videos/`
const partsPrefix = (v: { tenant_id: string; resident_id: string; id: string }) => `${baseKey(v.tenant_id, v.resident_id)}tmp/${v.id}/`
const partKey = (v: { tenant_id: string; resident_id: string; id: string }, n: number) => `${partsPrefix(v)}${String(n).padStart(5, '0')}`
export const totalChunksFor = (size: number) => Math.ceil(size / CHUNK_BYTES)
export const expectedChunkSize = (size: number, n: number) => (n < totalChunksFor(size) - 1 ? CHUNK_BYTES : size - (totalChunksFor(size) - 1) * CHUNK_BYTES)

// ─── Signed links ──────────────────────────────────────────────────────────────
// scope says who the link was made for and what the file route must re-check when it is opened:
//   staff          approved, ready clip of a living resident (any signed in user of the home, the hub)
//   admin          a manager looking at any non-removed clip of one of their residents
//   family:<id>    a clip that came through that invite, while the invite is still valid
// kind is 'video' or 'poster'.
const secret = () => `${process.env.JWT_SECRET ?? ''}:resident-video`
const sigFor = (id: string, kind: string, scope: string, exp: number) => createHmac('sha256', secret()).update(`${id}|${kind}|${scope}|${exp}`).digest('base64url')

/** A path on the API (no host) to open the clip, or its poster, for the next ten minutes. Never logged. */
export function signedVideoPath(id: string, scope: string, kind: 'video' | 'poster' = 'video'): string {
  const exp = Math.floor(Date.now() / 1000) + URL_SECONDS
  return `/public/resident-video/${id}?k=${kind}&s=${encodeURIComponent(scope)}&e=${exp}&g=${sigFor(id, kind, scope, exp)}`
}

export function verifyVideoSignature(id: string, kind: string, scope: string, exp: number, sig: string): boolean {
  if (!process.env.JWT_SECRET || !id || !scope || (kind !== 'video' && kind !== 'poster') || !Number.isFinite(exp) || exp < Math.floor(Date.now() / 1000)) return false
  const a = Buffer.from(sigFor(id, kind, scope, exp)); const b = Buffer.from(sig || '')
  return a.length === b.length && timingSafeEqual(a, b)
}

// ─── DTOs ──────────────────────────────────────────────────────────────────────
const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const live = (v: any) => v.state === 'ready' && !!v.s3_key

/** Manager view: everything about the clip, including who sent it. Links are for previewing (not logged as plays). */
export const adminVideoDto = (v: any) => ({
  id: v.id, invite_id: v.invite_id ?? null, uploaded_by_name: v.uploaded_by_name, relationship: v.relationship ?? null, source: v.source,
  title: v.title ?? null, note: v.note ?? null, state: v.state, status: v.status, error: v.error ?? null,
  duration_seconds: v.duration_seconds ?? null, width: v.width ?? null, height: v.height ?? null, size_bytes: v.size_bytes ?? 0,
  submitted_at: iso(v.submitted_at), decided_at: iso(v.decided_at), decided_by: v.decided_by ?? null, last_played_at: iso(v.last_played_at),
  video_url: live(v) ? signedVideoPath(v.id, 'admin') : null, poster_url: live(v) && v.poster_key ? signedVideoPath(v.id, 'admin', 'poster') : null,
})

/** Staff and hub list view: approved clips only, no video link (the player asks for one when play is pressed, which logs the play). */
export const hubVideoDto = (v: any, r?: { first_name?: string; preferred_name?: string | null; room?: string | null }) => ({
  resident_name: r ? (r.preferred_name || r.first_name || null) : null, room: r?.room ?? null,   // shown beside the video so staff know whose it is and where to find them
  id: v.id, title: v.title ?? null, note: v.note ?? null, uploaded_by_name: v.uploaded_by_name, relationship: v.relationship ?? null,
  submitted_at: iso(v.decided_at ?? v.submitted_at), duration_seconds: v.duration_seconds ?? null, width: v.width ?? null, height: v.height ?? null,
  poster_url: v.poster_key ? signedVideoPath(v.id, 'staff', 'poster') : null,
})

/** What the family member sees of their own clips. */
export const familyVideoDto = (v: any, inviteId: string) => ({
  id: v.id, title: v.title ?? null, state: v.state, status: v.status, error: v.state === 'failed' ? (v.error ?? 'That video could not be processed. Please try again with a shorter video.') : null,
  duration_seconds: v.duration_seconds ?? null, total_chunks: v.total_chunks ?? 0, chunk_bytes: CHUNK_BYTES,
  video_url: live(v) && v.status !== 'rejected' ? signedVideoPath(v.id, `family:${inviteId}`) : null,
  poster_url: live(v) && v.poster_key && v.status !== 'rejected' ? signedVideoPath(v.id, `family:${inviteId}`, 'poster') : null,
})

// ─── Upload: start, chunk, status ──────────────────────────────────────────────
export interface Sender { tenantId: string; residentId: string; inviteId: string | null; name: string; relationship: string | null; source: 'family' | 'manager'; decidedBy?: string }

export async function startVideoUpload(s: Sender, opts: { size: unknown; title?: unknown }): Promise<{ ok: true; video: any } | Fail> {
  const size = Number(opts.size)
  if (!Number.isInteger(size) || size < 1024) return fail(400, 'INVALID_FILE', 'That video looks empty. Please choose a different one.')
  if (size > MAX_UPLOAD_BYTES) return fail(413, 'FILE_TOO_LARGE', `That video is too big. Videos must be under ${MAX_UPLOAD_BYTES / 1024 / 1024} MB, which is about a minute from a phone.`)
  await sweepStale(s.residentId)
  if (s.inviteId) {
    const mine = await db.residentVideo.count({ where: { invite_id: s.inviteId, status: { not: 'rejected' }, state: { not: 'failed' } } })
    if (mine >= VIDEOS_PER_INVITE) return fail(403, 'LIMIT', `You can share up to ${VIDEOS_PER_INVITE} videos.`)
    const busy = await db.residentVideo.count({ where: { invite_id: s.inviteId, state: { in: ['uploading', 'processing'] } } })
    if (busy >= 2) return fail(429, 'BUSY', 'Please wait for your other video to finish first.')
  }
  const stored = await db.residentVideo.count({ where: { tenant_id: s.tenantId, resident_id: s.residentId, status: { not: 'rejected' }, state: { not: 'failed' } } })
  if (stored >= VIDEOS_PER_RESIDENT) return fail(403, 'LIMIT', `A profile can hold up to ${VIDEOS_PER_RESIDENT} videos. ${s.source === 'manager' ? 'Delete some first.' : 'Please ask the home.'}`)
  const video = await db.residentVideo.create({
    data: {
      tenant_id: s.tenantId, resident_id: s.residentId, invite_id: s.inviteId, uploaded_by_name: cleanText(s.name, 100) || 'Family', relationship: s.relationship ? cleanText(s.relationship, 60) : null,
      source: s.source, title: cleanTitle(opts.title), state: 'uploading', status: s.source === 'manager' ? 'approved' : 'pending', size_bytes: size, total_chunks: totalChunksFor(size),
      ...(s.source === 'manager' ? { decided_at: new Date(), decided_by: s.decidedBy ?? s.name } : {}),
    },
  })
  return { ok: true, video }
}

/** Stores one chunk (idempotent: sending it again just replaces it). Each must be exactly the expected size, so a short chunk is caught here. */
export async function saveChunk(v: any, n: number, body: Buffer): Promise<{ ok: true } | Fail> {
  if (v.state !== 'uploading') return fail(409, 'NOT_UPLOADING', 'This video is no longer being uploaded.')
  if (!Number.isInteger(n) || n < 0 || n >= v.total_chunks) return fail(400, 'BAD_CHUNK', 'That part of the video was not expected.')
  if (!Buffer.isBuffer(body) || body.length !== expectedChunkSize(v.size_bytes, n)) return fail(400, 'BAD_CHUNK', 'That part of the video arrived incomplete. Please try again.')
  await putPrivateObject(partKey(v, n), body, 'application/octet-stream')
  return { ok: true }
}

/** Which chunk numbers are safely stored (the page carries on from here after a lost signal). */
export async function receivedChunks(v: any): Promise<number[]> {
  // The chunk names are known in advance (partKey), so each one is checked directly. The storage login can read and delete
  // objects but is not allowed to list the bucket, so nothing here may list.
  const have: number[] = []
  for (let n = 0; n < (v.total_chunks ?? 0); n++) {
    if ((await objectSize(partKey(v, n))) === expectedChunkSize(v.size_bytes, n)) have.push(n)
  }
  return have
}

/** Deletes a clip's temporary chunks by name (no listing needed). */
async function dropParts(v: any): Promise<void> {
  for (let n = 0; n < (v.total_chunks ?? 0); n++) await deleteFile(partKey(v, n))
}

/** A clip stuck in processing for too long (the function was cut off) is shown as failed so the person can try again. */
export async function settleStuck(v: any): Promise<any> {
  if (v.state === 'processing' && v.processing_started_at && Date.now() - new Date(v.processing_started_at).getTime() > STUCK_MS) {
    await dropParts(v)
    return db.residentVideo.update({ where: { id: v.id }, data: { state: 'failed', error: 'That video took too long to process. Please try again with a shorter video.' } })
  }
  return v
}

/** Removes the temporary chunks of upload attempts that were never finished (a day old), for this resident. */
async function sweepStale(residentId: string): Promise<void> {
  try {
    const old = await db.residentVideo.findMany({ where: { resident_id: residentId, state: { in: ['uploading', 'failed'] }, submitted_at: { lt: new Date(Date.now() - 24 * 3600 * 1000) } }, take: 20 })
    for (const v of old) { await dropParts(v); await db.residentVideo.delete({ where: { id: v.id } }) }
  } catch { /* housekeeping only */ }
}

// ─── Complete: join, check, scan, transcode, store ─────────────────────────────
export async function completeVideo(v: any, edits: { title?: unknown }): Promise<{ ok: true; video: any } | Fail> {
  // Claim it: only one request may process a clip.
  const claim = await db.residentVideo.updateMany({ where: { id: v.id, state: 'uploading' }, data: { state: 'processing', processing_started_at: new Date(), error: null, ...(edits.title !== undefined ? { title: cleanTitle(edits.title) } : {}) } })
  if (claim.count !== 1) return fail(409, 'NOT_UPLOADING', 'This video is already being processed.')
  const work = path.join(os.tmpdir(), `rv-${v.id}`)
  try {
    fs.mkdirSync(work, { recursive: true })
    const have = await receivedChunks(v)
    if (have.length !== v.total_chunks) throw new VideoError('INVALID_FILE', 'Part of the video did not arrive. Please try the upload again.')
    // Check the first bytes before downloading the rest.
    const first = await downloadFile(partKey(v, 0))
    const kind = detectVideoContainer(first)
    if (!kind) throw new VideoError('INVALID_FILE', 'That file is not a video we can use. Please choose a video from your phone (MP4, MOV, WebM or 3GP).')
    const raw = path.join(work, 'raw')
    fs.writeFileSync(raw, first)
    for (let n = 1; n < v.total_chunks; n++) fs.appendFileSync(raw, await downloadFile(partKey(v, n)))
    if (fs.statSync(raw).size !== v.size_bytes) throw new VideoError('INVALID_FILE', 'The video did not arrive in full. Please try the upload again.')

    // Malware scan (fail closed when a scanner is configured and errors). Big files skip it: the transcode re-creates every byte of the output.
    let scan: 'clean' | 'skipped' = 'skipped'
    if (v.size_bytes <= SCAN_MAX_BYTES) {
      const r = await scanBuffer(fs.readFileSync(raw), 'video')
      if (r.status === 'infected') throw new VideoError('INVALID_FILE', 'That file was flagged by the security scan and was not used.')
      if (r.status === 'error' && scannerConfigured()) throw new VideoError('PROCESS_FAILED', 'The video could not be checked just now. Please try again.')
      if (r.status === 'clean') scan = 'clean'
    }

    const out = await transcodeVideo(raw, work)
    const id = randomUUID()
    const mp4Key = `${baseKey(v.tenant_id, v.resident_id)}${id}.mp4`, posterKey = `${baseKey(v.tenant_id, v.resident_id)}${id}.jpg`
    await putPrivateObject(mp4Key, fs.readFileSync(out.mp4), 'video/mp4')
    await putPrivateObject(posterKey, fs.readFileSync(out.poster), 'image/jpeg')
    const done = await db.residentVideo.update({
      where: { id: v.id },
      data: { state: 'ready', s3_key: mp4Key, poster_key: posterKey, mime: 'video/mp4', duration_seconds: out.duration, size_bytes: out.size, width: out.width, height: out.height, scan_status: scan, error: null },
    })
    await dropParts(v)   // the raw upload is not kept
    return { ok: true, video: done }
  } catch (e: any) {
    const message = e instanceof VideoError ? e.message : 'That video could not be processed. Please try again with a shorter video.'
    if (!(e instanceof VideoError)) console.error('[resident-video] processing failed:', e?.message ?? e)
    await dropParts(v)
    await db.residentVideo.update({ where: { id: v.id }, data: { state: 'failed', error: message } }).catch(() => null)
    return { ok: false, status: e instanceof VideoError && e.code === 'NO_FFMPEG' ? 503 : 422, code: e instanceof VideoError ? e.code : 'PROCESS_FAILED', message }
  } finally {
    try { fs.rmSync(work, { recursive: true, force: true }) } catch { /* ignore */ }
  }
}

/** "bytes=0-", "bytes=100-199", "bytes=-500". null = no range asked; 'bad' = cannot be satisfied. */
export function parseRange(header: string | undefined, size: number): { start: number; end: number } | 'bad' | null {
  if (!header) return null
  const m = /^bytes=(\d*)-(\d*)$/.exec(header.trim())
  if (!m || (m[1] === '' && m[2] === '') || size <= 0) return 'bad'
  let start: number, end: number
  if (m[1] === '') { const n = Number(m[2]); if (n <= 0) return 'bad'; start = Math.max(0, size - n); end = size - 1 }
  else { start = Number(m[1]); end = m[2] === '' ? size - 1 : Math.min(Number(m[2]), size - 1) }
  if (!Number.isFinite(start) || !Number.isFinite(end) || start > end || start >= size) return 'bad'
  return { start, end }
}

// ─── Clean-up ──────────────────────────────────────────────────────────────────
/** Removes every file of a clip from storage: the processed video, the poster and any temporary chunks. */
export async function removeVideoFiles(v: any): Promise<void> {
  if (v.s3_key) await deleteFile(v.s3_key)
  if (v.poster_key) await deleteFile(v.poster_key)
  await dropParts(v)
}

/** Reject: files gone at once, keys blanked, the row kept as a record that it was rejected. */
export async function discardVideoFiles(v: any): Promise<void> {
  await removeVideoFiles(v)
  await db.residentVideo.update({ where: { id: v.id }, data: { s3_key: '', poster_key: '' } })
}

/** Deleting a clip entirely (files, then the row and its play log). */
export async function deleteVideo(v: any): Promise<void> {
  await removeVideoFiles(v)
  await db.residentVideo.delete({ where: { id: v.id } })
  await db.residentVideoPlay.deleteMany({ where: { video_id: v.id } }).catch(() => undefined)
}

/**
 * The resident died or moved on. Approved clips drop out of the hub at once (the hub and the streaming route only serve living residents)
 * but stay in private storage for the retention period, like photos. Anything not approved is of no use to anyone now: pending clips are
 * deleted from storage and marked rejected, and half-finished uploads are removed.
 */
export async function retireResidentVideos(tenantId: string, residentId: string, now = new Date()): Promise<void> {
  try {
    const rows: any[] = await db.residentVideo.findMany({ where: { tenant_id: tenantId, resident_id: residentId, status: { not: 'rejected' } } })
    for (const v of rows) {
      if (v.state !== 'ready') { await removeVideoFiles(v); await db.residentVideo.delete({ where: { id: v.id } }); continue }
      if (v.status === 'pending') { await discardVideoFiles(v); await db.residentVideo.update({ where: { id: v.id }, data: { status: 'rejected', decided_at: now, decided_by: 'system: resident archived' } }) }
    }
  } catch { /* videos tables not created yet */ }
}

/** Permanent deletion of every clip of a resident: the files first, then the rows. Used when the profile is deleted. */
export async function deleteResidentVideos(tenantId: string, residentId: string): Promise<number> {
  let rows: any[] = []
  try { rows = await db.residentVideo.findMany({ where: { tenant_id: tenantId, resident_id: residentId } }) } catch { return 0 }
  for (const v of rows) await removeVideoFiles(v)
  await deleteObjectsUnder(baseKey(tenantId, residentId))   // anything left under the folder
  await db.residentVideo.deleteMany({ where: { tenant_id: tenantId, resident_id: residentId } })
  await db.residentVideoPlay.deleteMany({ where: { tenant_id: tenantId, resident_id: residentId } }).catch(() => undefined)
  return rows.length
}

/** When the family member presses Send: ready clips count as sent, half-finished ones are thrown away. Returns how many were sent. */
export async function settleInviteVideos(inviteId: string): Promise<{ sent: number; processing: number }> {
  try {
    const rows: any[] = await db.residentVideo.findMany({ where: { invite_id: inviteId } })
    let sent = 0, processing = 0
    for (const v0 of rows) {
      const v = await settleStuck(v0)
      if (v.state === 'processing') { processing++; continue }
      if (v.state === 'ready' && v.status === 'pending') sent++
      else if (v.state === 'uploading' || v.state === 'failed') { await removeVideoFiles(v); await db.residentVideo.delete({ where: { id: v.id } }) }
    }
    return { sent, processing }
  } catch { return { sent: 0, processing: 0 } }
}

// ─── Manager record ────────────────────────────────────────────────────────────
/** Clips waiting for approval, per resident (for the Approvals badge). Missing table = none. */
export async function pendingVideoCounts(tenantId: string, ids: string[]): Promise<Map<string, number>> {
  const m = new Map<string, number>()
  try {
    const g = await db.residentVideo.groupBy({ by: ['resident_id'], where: { tenant_id: tenantId, resident_id: { in: ids }, status: 'pending', state: 'ready' }, _count: { _all: true } })
    for (const x of g) m.set(x.resident_id, x._count._all)
  } catch { /* videos tables not created yet */ }
  return m
}

/** The clips and the recent plays of one resident, for the manager's record. */
export async function adminVideosFor(tenantId: string, residentId: string): Promise<{ videos: ReturnType<typeof adminVideoDto>[]; plays: Array<{ id: string; video_id: string; video_title: string | null; user_name: string; played_at: string }> }> {
  try {
    let rows: any[] = await db.residentVideo.findMany({ where: { tenant_id: tenantId, resident_id: residentId, state: { in: ['ready', 'processing'] } }, orderBy: { submitted_at: 'desc' }, take: 200 })
    rows = await Promise.all(rows.map(settleStuck))
    const plays: any[] = await db.residentVideoPlay.findMany({ where: { tenant_id: tenantId, resident_id: residentId }, orderBy: { played_at: 'desc' }, take: 25 })
    const users: any[] = plays.length ? await db.user.findMany({ where: { id: { in: [...new Set(plays.map(p => p.user_id))] } }, select: { id: true, name: true } }) : []
    const who = new Map(users.map(u => [u.id, u.name]))
    const titles = new Map<string, string | null>(rows.map(r => [r.id, r.title ?? null]))
    return {
      videos: rows.filter(r => r.state !== 'failed').map(adminVideoDto),
      plays: plays.map(p => ({ id: p.id, video_id: p.video_id, video_title: titles.get(p.video_id) ?? null, user_name: who.get(p.user_id) ?? 'A team member', played_at: p.played_at.toISOString() })),
    }
  } catch { return { videos: [], plays: [] } }
}

// ─── Videos in the chat ────────────────────────────────────────────────────────
// A question in the "This is me" topic about videos or messages is answered from the approved TITLES and notes (plain text people wrote)
// and who sent each, with the clips shown under the answer (poster and a play button). The assistant never watches a video.
const VIDEO_INTENT = /\b(videos?|clips?|recordings?|footage)\b|\bmessages?\s+from\b|\b(his|her|their|family)\s+messages?\b/i
const VSTOP = new Set([...STOP, 'video', 'videos', 'clip', 'clips', 'recording', 'recordings', 'recorded', 'message', 'messages', 'filmed', 'footage', 'family', 'sent', 'send', 'new', 'latest', 'recent', 'newest', 'all', 'one', 'ones', 'there'])

export async function videoAnswer(tenantId: string, queryText: string, history: Array<{ role: string; content: string }> = []): Promise<{ html: string; videos: ReturnType<typeof hubVideoDto>[] } | null> {
  if (!VIDEO_INTENT.test(queryText)) return null
  try {
    if (!(await residentsEnabled(tenantId)) || !(await videosReady())) return null
    const residents: any[] = await db.resident.findMany({ where: { tenant_id: tenantId, status: 'living' }, select: { id: true, first_name: true, last_name: true, preferred_name: true, room: true }, take: 500 })
    if (!residents.length) return null
    const vids: any[] = await db.residentVideo.findMany({ where: { tenant_id: tenantId, status: 'approved', state: 'ready', s3_key: { not: '' } }, orderBy: { decided_at: 'desc' }, take: 1000 })
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
      const has = new Set(vids.map(p => p.resident_id))
      const only = residents.filter(r => has.has(r.id))
      if (only.length === 1) target = only[0]
      else return null   // cannot tell who the question is about: let the normal answer ask
    }
    const name = esc(target.preferred_name || target.first_name)
    const mine = vids.filter(p => p.resident_id === target.id)
    if (!mine.length) return { html: `<p>There are no video messages for ${name} yet. A manager can add one, or family can send one through their private link.</p>`, videos: [] }

    const skip = new Set([...VSTOP, ...words(`${target.first_name} ${target.last_name} ${target.preferred_name ?? ''}`)])
    const terms = [...new Set(words(queryText).filter(w => !skip.has(w)))]
    const scored = mine.map(p => {
      const hay = new Set(words(`${p.title ?? ''} ${p.note ?? ''} ${p.uploaded_by_name ?? ''} ${p.relationship ?? ''}`).map(keyOf))
      return { p, score: terms.filter(t => hay.has(keyOf(t))).length }
    })
    const matched = terms.length ? scored.filter(x => x.score > 0).sort((a, b) => b.score - a.score) : []
    const shown = (matched.length ? matched : scored).slice(0, 6).map(x => x.p)
    const list = shown.map(p => `<li>${esc(p.title || 'Video message')} (from ${esc(p.uploaded_by_name)}${p.relationship ? `, ${esc(p.relationship)}` : ''})</li>`).join('')
    let html: string
    if (matched.length) html = `<p>Yes, there ${shown.length === 1 ? 'is a video message' : 'are video messages'} for ${name} that ${shown.length === 1 ? 'fits' : 'fit'} that, shown below.</p><ul>${list}</ul>`
    else if (terms.length) html = `<p>${name} has ${mine.length} video ${mine.length === 1 ? 'message' : 'messages'}, shown below, but none has a title or note that mentions ${esc(terms.slice(0, 3).join(', '))}.</p><ul>${list}</ul>`
    else html = `<p>Here ${shown.length === 1 ? 'is the video message' : 'are the video messages'} for ${name}, newest first.</p><ul>${list}</ul>`
    html += '<p>I can only tell you each message\'s title and who sent it. I cannot watch or describe a video.</p>'
    return { html, videos: shown.map(x => hubVideoDto(x, target)) }
  } catch { return null }
}
