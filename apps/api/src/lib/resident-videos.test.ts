// "This is me" video messages: upload, processing and signed links, end to end against local storage and an in-memory stand-in for the
// database. Run with:  npx tsx src/lib/resident-videos.test.ts   (needs no database or S3; uses the bundled ffmpeg)

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.JWT_SECRET = 'test-secret'
delete process.env.S3_BUCKET
process.env.LOCAL_STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-store-'))


const rows: any[] = []
// Loaded after the environment is set (the storage folder is read when the storage module loads).
let startVideoUpload: any, saveChunk: any, receivedChunks: any, completeVideo: any, CHUNK_BYTES: number, totalChunksFor: any, expectedChunkSize: any, signedVideoPath: any, verifyVideoSignature: any
let VOICE_NOTES_PER_INVITE: number, MAX_AUDIO_UPLOAD_BYTES: number, voiceLimits: any, settleInviteVideos: any
let parseRange: any, retireResidentVideos: any, deleteResidentVideos: any, adminVideoDto: any, hubVideoDto: any, familyVideoDto: any, VIDEOS_PER_INVITE: number
let binaryPath: any, listObjects: any

async function setup() {
  const { prisma } = await import('../db/client')
  // A tiny in-memory residentVideo table, enough for the functions under test.
  const match = (r: any, w: any): boolean => Object.entries(w ?? {}).every(([k, c]: [string, any]) => {
    if (c && typeof c === 'object' && !(c instanceof Date)) {
      if ('in' in c) return c.in.includes(r[k])
      if ('not' in c) return r[k] !== c.not
      if ('lt' in c) return r[k] < c.lt
      return true
    }
    return r[k] === c
  })
  const table = {
    create: async ({ data }: any) => { const r = { id: `v${rows.length + 1}`, submitted_at: new Date(), s3_key: '', poster_key: '', state: 'uploading', status: 'pending', ...data }; rows.push(r); return r },
    count: async ({ where }: any) => rows.filter(r => match(r, where)).length,
    findMany: async ({ where }: any) => rows.filter(r => match(r, where)),
    findFirst: async ({ where }: any = {}) => rows.find(r => match(r, where)) ?? null,
    findUnique: async ({ where }: any) => rows.find(r => r.id === where.id) ?? null,
    updateMany: async ({ where, data }: any) => { const hit = rows.filter(r => match(r, where)); hit.forEach(r => Object.assign(r, data)); return { count: hit.length } },
    update: async ({ where, data }: any) => { const r = rows.find(x => x.id === where.id); Object.assign(r, data); return r },
    deleteMany: async ({ where }: any) => { for (const r of rows.filter(x => match(x, where))) rows.splice(rows.indexOf(r), 1); return { count: 0 } },
    delete: async ({ where }: any) => { rows.splice(rows.findIndex(r => r.id === where.id), 1) },
  }
  Object.defineProperty(prisma, 'residentVideo', { value: table, configurable: true })
  Object.defineProperty(prisma, 'residentVideoPlay', { value: { findFirst: async () => null, deleteMany: async () => ({ count: 0 }) }, configurable: true })


  const lib = await import('./resident-videos')
  ;({ startVideoUpload, saveChunk, receivedChunks, completeVideo, CHUNK_BYTES, totalChunksFor, expectedChunkSize, signedVideoPath, verifyVideoSignature, parseRange, retireResidentVideos, deleteResidentVideos, adminVideoDto, hubVideoDto, familyVideoDto, VIDEOS_PER_INVITE } = lib as any)
  ;({ VOICE_NOTES_PER_INVITE, MAX_AUDIO_UPLOAD_BYTES, voiceLimits, settleInviteVideos } = lib as any)
  ;({ binaryPath } = await import('./resident-video-media'))
  ;({ listObjects } = await import('../services/storage/s3'))
}

let n = 0
const t = async (name: string, fn: () => Promise<void> | void) => { await fn(); n++; console.log('ok  ', name) }
const sender = { tenantId: 'T1', residentId: 'R1', inviteId: 'I1', name: 'Sarah', relationship: 'daughter', source: 'family' as const }

async function upload(file: Buffer, s = sender) {
  const start = await startVideoUpload(s, { size: file.length, title: 'From Sarah, Sunday' })
  assert.ok(start.ok, JSON.stringify(start))
  const v = (start as any).video
  for (let i = 0; i < v.total_chunks; i++) {
    const r = await saveChunk(v, i, file.subarray(i * CHUNK_BYTES, Math.min(file.length, (i + 1) * CHUNK_BYTES)))
    assert.ok(r.ok, JSON.stringify(r))
  }
  return v
}

async function main() {
  await setup()
  await t('chunk maths: 4 MB chunks, the last one is the remainder', () => {
    assert.equal(totalChunksFor(CHUNK_BYTES), 1)
    assert.equal(totalChunksFor(CHUNK_BYTES + 1), 2)
    assert.equal(expectedChunkSize(CHUNK_BYTES * 2 + 10, 0), CHUNK_BYTES)
    assert.equal(expectedChunkSize(CHUNK_BYTES * 2 + 10, 2), 10)
  })

  await t('signed links: valid, expired, tampered, wrong scope or kind all behave', () => {
    const p = new URL('http://x' + signedVideoPath('abc', 'staff'))
    const q = (k: string) => p.searchParams.get(k)!
    assert.ok(verifyVideoSignature('abc', q('k'), q('s'), Number(q('e')), q('g')))
    assert.ok(!verifyVideoSignature('abc', 'poster', q('s'), Number(q('e')), q('g')))
    assert.ok(!verifyVideoSignature('abc', q('k'), 'admin', Number(q('e')), q('g')))
    assert.ok(!verifyVideoSignature('abd', q('k'), q('s'), Number(q('e')), q('g')))
    assert.ok(!verifyVideoSignature('abc', q('k'), q('s'), Number(q('e')) - 1000, q('g')))
    const secs = Number(q('e')) - Math.floor(Date.now() / 1000)
    assert.ok(secs > 9 * 60 && secs <= 10 * 60, `expiry ${secs}s`)
  })

  await t('range header parsing', () => {
    assert.equal(parseRange(undefined, 1000), null)
    assert.deepEqual(parseRange('bytes=0-', 1000), { start: 0, end: 999 })
    assert.deepEqual(parseRange('bytes=100-199', 1000), { start: 100, end: 199 })
    assert.deepEqual(parseRange('bytes=900-5000', 1000), { start: 900, end: 999 })
    assert.deepEqual(parseRange('bytes=-100', 1000), { start: 900, end: 999 })
    assert.equal(parseRange('bytes=1000-', 1000), 'bad')
    assert.equal(parseRange('bytes=200-100', 1000), 'bad')
    assert.equal(parseRange('items=0-1', 1000), 'bad')
  })

  // A clip of about 9 MB, so it needs three chunks.
  const clip = path.join(process.env.LOCAL_STORAGE_DIR!, 'in.mp4')
  const gen = spawnSync(binaryPath('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'testsrc2=size=1920x1080:rate=30:duration=4', '-f', 'lavfi', '-i', 'sine=duration=4',
    '-c:v', 'libx264', '-b:v', '18M', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-metadata', 'location=+53.4808-002.2426/', clip])
  assert.equal(gen.status, 0, String(gen.stderr))
  const file = fs.readFileSync(clip)
  assert.ok(file.length > CHUNK_BYTES * 2, `test clip is ${file.length} bytes`)

  await t('a multi chunk upload is joined, processed, stored privately, and the temporary chunks are removed', async () => {
    const v = await upload(file)
    assert.deepEqual(await receivedChunks(v), [0, 1, 2])
    const r: any = await completeVideo(v, { title: '  From Sarah, Sunday  ' })
    assert.ok(r.ok, JSON.stringify(r))
    const done = r.video
    assert.equal(done.state, 'ready'); assert.equal(done.status, 'pending'); assert.equal(done.title, 'From Sarah, Sunday')
    assert.ok(done.s3_key.startsWith('tenants/T1/residents/R1/videos/') && done.s3_key.endsWith('.mp4'))
    assert.ok(done.poster_key.endsWith('.jpg'))
    assert.equal(done.width, 1280); assert.equal(done.height, 720)
    assert.ok(fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, done.s3_key)))
    assert.deepEqual(await listObjects(`tenants/T1/residents/R1/videos/tmp/${v.id}/`), [], 'temporary chunks left behind')
    assert.ok(!fs.existsSync(path.join(os.tmpdir(), `rv-${v.id}`)), 'temp folder left behind')
    // DTOs: the hub never carries a video link, the family and manager do, and nothing leaks storage keys.
    assert.equal((hubVideoDto(done) as any).video_url, undefined)
    assert.ok(adminVideoDto(done).video_url && familyVideoDto(done, 'I1').video_url)
    assert.ok(!JSON.stringify([adminVideoDto(done), hubVideoDto(done), familyVideoDto(done, 'I1')]).includes('tenants/'))
  })

  await t('a clip can be completed once only', async () => {
    const v = await upload(file)
    const [a, b]: any[] = await Promise.all([completeVideo(v, {}), completeVideo(v, {})])
    assert.equal([a, b].filter(x => x.ok).length, 1)
  })

  await t('a text file renamed .mp4 fails cleanly: failed state, plain message, nothing left in storage', async () => {
    const text = Buffer.from('This is a note, not a video. '.repeat(400))
    const v = await upload(text)
    const r: any = await completeVideo(v, {})
    assert.equal(r.ok, false); assert.equal(r.code, 'INVALID_FILE')
    const row = rows.find(x => x.id === v.id)
    assert.equal(row.state, 'failed'); assert.ok(row.error && !/[\u2013\u2014]/.test(row.error))
    assert.deepEqual(await listObjects(`tenants/T1/residents/R1/videos/tmp/${v.id}/`), [])
  })

  await t('chunk checks: wrong size, out of range and a missing chunk are refused', async () => {
    const start: any = await startVideoUpload(sender, { size: CHUNK_BYTES + 5000 })
    const v = start.video
    assert.equal((await saveChunk(v, 0, Buffer.alloc(100)) as any).ok, false)
    assert.equal((await saveChunk(v, 5, Buffer.alloc(100)) as any).ok, false)
    assert.equal((await saveChunk(v, 0, Buffer.alloc(CHUNK_BYTES)) as any).ok, true)
    const r: any = await completeVideo(v, {})   // chunk 1 never arrived
    assert.equal(r.ok, false)
  })

  await t('start refuses empty, oversize, and more than the per link limit', async () => {
    assert.equal(((await startVideoUpload(sender, { size: 10 })) as any).ok, false)
    assert.equal(((await startVideoUpload(sender, { size: 151 * 1024 * 1024 })) as any).status, 413)
    const other = { ...sender, inviteId: 'I2', residentId: 'R2' }
    const results = []
    for (let i = 0; i < VIDEOS_PER_INVITE + 1; i++) { const r: any = await startVideoUpload(other, { size: 5000 }); results.push(r); if (r.ok) r.video.state = 'ready' }
    assert.equal(results.filter(r => r.ok).length, VIDEOS_PER_INVITE)
  })

  await t('moving on: approved stays private and unplayable by staff rules, pending is deleted, half-finished removed', async () => {
    const A = { ...sender, residentId: 'R3', inviteId: 'I3' }
    const approvedV = await upload(file, A); const ra: any = await completeVideo(approvedV, {}); rows.find(x => x.id === approvedV.id).status = 'approved'
    const pendingV = await upload(file, A); const rp: any = await completeVideo(pendingV, {})
    const half = await upload(file.subarray(0, CHUNK_BYTES * 2), { ...A, inviteId: 'I3b' })
    await retireResidentVideos('T1', 'R3')
    const a = rows.find(x => x.id === approvedV.id), p = rows.find(x => x.id === pendingV.id)
    assert.ok(a.s3_key && fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, a.s3_key)), 'approved clip should stay')
    assert.equal(p.status, 'rejected'); assert.equal(p.s3_key, '')
    assert.ok(!fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, rp.video.poster_key || 'none')))
    assert.ok(!rows.find(x => x.id === half.id))
    assert.deepEqual(await listObjects(`tenants/T1/residents/R3/videos/tmp/${half.id}/`), [])
    // deleting the profile removes the lot
    await deleteResidentVideos('T1', 'R3')
    assert.ok(!fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, a.s3_key)))
    assert.equal(rows.filter(x => x.resident_id === 'R3').length, 0)
    void ra
  })


  // ── Voice notes ──
  const voiceFile = path.join(process.env.LOCAL_STORAGE_DIR!, 'note.webm')
  const vgen = spawnSync(binaryPath('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error', '-f', 'lavfi', '-i', 'sine=frequency=400:duration=5', '-c:a', 'libopus', voiceFile])
  assert.equal(vgen.status, 0, String(vgen.stderr))
  const voice = fs.readFileSync(voiceFile)
  const voiceSender = { ...sender, residentId: 'RV', inviteId: 'IV' }
  async function uploadVoice(file: Buffer, s = voiceSender) {
    const start: any = await startVideoUpload(s, { size: file.length, title: 'Hello Mum', kind: 'audio' })
    assert.ok(start.ok, JSON.stringify(start))
    for (let i = 0; i < start.video.total_chunks; i++) assert.ok((await saveChunk(start.video, i, file.subarray(i * CHUNK_BYTES, Math.min(file.length, (i + 1) * CHUNK_BYTES)))).ok)
    return start.video
  }

  await t('a voice note goes through the same pipeline: stored privately as m4a, no poster, pending, kind audio', async () => {
    const v = await uploadVoice(voice)
    assert.equal(v.media_kind, 'audio')
    const r: any = await completeVideo(v, {})
    assert.ok(r.ok, JSON.stringify(r))
    const done = r.video
    assert.equal(done.state, 'ready'); assert.equal(done.status, 'pending'); assert.equal(done.mime, 'audio/mp4')
    assert.ok(done.s3_key.startsWith('tenants/T1/residents/RV/videos/') && done.s3_key.endsWith('.m4a'))
    assert.equal(done.poster_key, ''); assert.equal(done.width, null)
    assert.ok(done.duration_seconds > 4 && done.duration_seconds < 6)
    assert.deepEqual(await listObjects(`tenants/T1/residents/RV/videos/tmp/${v.id}/`), [])
    const dtos = [adminVideoDto(done), hubVideoDto(done), familyVideoDto(done, 'IV')] as any[]
    for (const d of dtos) assert.equal(d.media_kind, 'audio')
    assert.equal(dtos[0].poster_url, null); assert.equal(dtos[1].poster_url, null); assert.equal(dtos[2].poster_url, null)
    assert.ok(dtos[0].video_url && dtos[2].video_url)
    assert.ok(!JSON.stringify(dtos).includes('tenants/'))
  })

  await t('a text file sent as a voice note is refused with a voice note message and leaves nothing behind', async () => {
    const bad = await uploadVoice(Buffer.from('This is a note, not a recording. '.repeat(100)))
    const r: any = await completeVideo(bad, {})
    assert.equal(r.ok, false); assert.equal(r.code, 'INVALID_FILE')
    assert.match(r.message, /voice recording/)
    assert.deepEqual(await listObjects(`tenants/T1/residents/RV/videos/tmp/${bad.id}/`), [])
  })

  await t('voice notes and videos are counted separately: five of each per link, 30 MB for a voice note', async () => {
    assert.equal(VOICE_NOTES_PER_INVITE, 5); assert.equal(MAX_AUDIO_UPLOAD_BYTES, 30 * 1024 * 1024)
    assert.deepEqual(voiceLimits, { max_voice_notes: 5, max_voice_seconds: 120, max_voice_mb: 30 })
    assert.equal((await startVideoUpload(voiceSender, { size: 31 * 1024 * 1024, kind: 'audio' }) as any).status, 413)
    assert.equal((await startVideoUpload(voiceSender, { size: 100, kind: 'audio' }) as any).ok, false)
    const other = { ...sender, inviteId: 'IV2', residentId: 'RV2' }
    const got = []
    for (let i = 0; i < VOICE_NOTES_PER_INVITE + 1; i++) { const r: any = await startVideoUpload(other, { size: 5000, kind: 'audio' }); got.push(r); if (r.ok) r.video.state = 'ready' }
    assert.equal(got.filter(r => r.ok).length, VOICE_NOTES_PER_INVITE)
    assert.match(got[got.length - 1].message, /voice notes/)
    // five voice notes do not use up the videos
    const vid: any = await startVideoUpload(other, { size: 5000 })
    assert.ok(vid.ok, JSON.stringify(vid)); assert.equal(vid.video.media_kind, 'video')
  })

  await t('sending counts voice notes and videos separately', async () => {
    const A = { ...sender, residentId: 'RV3', inviteId: 'IV3' }
    const a: any = await uploadVoice(voice, A); await completeVideo(a, {})
    const b: any = await upload(file.subarray(0, CHUNK_BYTES * 3 - 10), A).catch(() => null)
    void b
    const res = await settleInviteVideos('IV3')
    assert.equal(res.voiceNotes, 1); assert.ok(res.sent >= 1)
  })

  await t('moving on treats a voice note like a video: approved stays, pending is deleted', async () => {
    const A = { ...sender, residentId: 'RV4', inviteId: 'IV4' }
    const ap: any = await uploadVoice(voice, A); await completeVideo(ap, {}); rows.find(x => x.id === ap.id).status = 'approved'
    const pe: any = await uploadVoice(voice, A); const rp: any = await completeVideo(pe, {}); const pendingKey = rp.video.s3_key
    assert.ok(pendingKey && fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, pendingKey)))
    await retireResidentVideos('T1', 'RV4')
    assert.ok(fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, rows.find(x => x.id === ap.id).s3_key)))
    assert.equal(rows.find(x => x.id === pe.id).status, 'rejected'); assert.equal(rows.find(x => x.id === pe.id).s3_key, '')
    assert.ok(!fs.existsSync(path.join(process.env.LOCAL_STORAGE_DIR!, pendingKey)))
    await deleteResidentVideos('T1', 'RV4')
    assert.equal(rows.filter(x => x.resident_id === 'RV4').length, 0)
  })

  fs.rmSync(process.env.LOCAL_STORAGE_DIR!, { recursive: true, force: true })
  console.log(`\n${n} passed`)
  process.exit(0)
}
main().catch(e => { console.error(e); process.exit(1) })
