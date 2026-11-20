// "What is said" for family video messages: language mapping, text extraction, the job lifecycle, access denied, edits, staff gating and
// deletion, all with the speech service replaced by a stand-in (no AWS call) and an in-memory table. Run with:
//   npx tsx src/lib/resident-video-transcripts.test.ts

import assert from 'node:assert/strict'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

process.env.JWT_SECRET = 'test-secret'
delete process.env.S3_BUCKET
process.env.LOCAL_STORAGE_DIR = fs.mkdtempSync(path.join(os.tmpdir(), 'rvt-store-'))

const rows: any[] = []
const videoRows: any[] = []

async function main() {
  const { prisma } = await import('../db/client')
  const match = (r: any, w: any): boolean => Object.entries(w ?? {}).every(([k, c]: [string, any]) => {
    if (c && typeof c === 'object' && !(c instanceof Date)) { if ('in' in c) return c.in.includes(r[k]); if ('not' in c) return r[k] !== c.not; return true }
    return r[k] === c
  })
  const table = (store: any[], mk: (data: any) => any) => ({
    create: async ({ data }: any) => { if (store.some(r => data.video_id && r.video_id === data.video_id)) throw new Error('unique'); const r = mk(data); store.push(r); return r },
    findMany: async ({ where }: any = {}) => store.filter(r => match(r, where)),
    findFirst: async ({ where }: any = {}) => store.find(r => match(r, where)) ?? null,
    update: async ({ where, data }: any) => { const r = store.find(x => x.id === where.id); Object.assign(r, data, { updated_at: new Date() }); return r },
    updateMany: async ({ where, data }: any) => { const hit = store.filter(r => match(r, where)); hit.forEach(r => Object.assign(r, data, { updated_at: new Date() })); return { count: hit.length } },
    deleteMany: async ({ where }: any) => { for (const r of store.filter(x => match(x, where))) store.splice(store.indexOf(r), 1); return { count: 0 } },
    delete: async ({ where }: any) => { store.splice(store.findIndex(r => r.id === where.id), 1) },
  })
  let n = 0
  Object.defineProperty(prisma, 'residentVideoTranscript', { value: table(rows, d => ({ id: `t${++n}`, state: 'pending', show_to_staff: false, created_at: new Date(), updated_at: new Date(), ...d })), configurable: true })
  Object.defineProperty(prisma, 'residentVideo', { value: table(videoRows, d => ({ id: `v${++n}`, ...d })), configurable: true })
  Object.defineProperty(prisma, 'residentVideoPlay', { value: { findFirst: async () => null, findMany: async () => [], deleteMany: async () => ({ count: 0 }) }, configurable: true })

  const sp = await import('../services/speech/transcribe')
  const lib = await import('./resident-video-transcripts')
  const videos = await import('./resident-videos')

  // ─── Pure helpers ─────────────────────────────────────────────────────────────
  assert.equal(sp.translateCodeFor('hi-IN'), 'hi')
  assert.equal(sp.translateCodeFor('pa-IN'), 'pa')
  assert.equal(sp.translateCodeFor('zh-CN'), 'zh')
  assert.equal(sp.translateCodeFor('pt-PT'), 'pt-PT')
  assert.equal(sp.translateCodeFor('pt-BR'), 'pt')
  assert.equal(sp.translateCodeFor('ur-PK'), 'ur')
  assert.equal(sp.translateCodeFor('cy-GB'), null, 'Welsh is not on the list')
  assert.equal(sp.translateCodeFor(null), null)
  assert.equal(sp.languageName('pa-IN'), 'Punjabi')
  assert.equal(sp.languageName('en-GB'), 'English')
  assert.equal(sp.isEnglish('en-US'), true)
  assert.equal(sp.isEnglish('hi-IN'), false)
  assert.ok(!sp.LANGUAGE_OPTIONS.some(c => c.startsWith('cy')))
  assert.equal(sp.extractTranscriptText({ results: { transcripts: [{ transcript: '  Hello   there ' }] } }), 'Hello there')
  assert.equal(sp.extractTranscriptText({ results: { transcripts: [{ transcript: '' }] } }), '')
  assert.equal(sp.extractTranscriptText(null), '')
  assert.equal(sp.extractTranscriptText({}), '')
  const long = Array.from({ length: 400 }, (_, i) => `Sentence number ${i}.`).join(' ')
  const pieces = sp.chunkForTranslate(long, 500)
  assert.ok(pieces.length > 1 && pieces.every(p => p.length <= 500) && pieces.join(' ') === long)
  assert.equal(sp.isAccessDenied({ name: 'AccessDeniedException' }), true)
  assert.equal(sp.isAccessDenied({ $metadata: { httpStatusCode: 403 } }), true)
  assert.equal(sp.isAccessDenied({ name: 'InternalFailure' }), false)

  // ─── A stand-in for the service ───────────────────────────────────────────────
  const calls: string[] = []
  const jobs = new Map<string, { status: 'IN_PROGRESS' | 'QUEUED' | 'COMPLETED' | 'FAILED'; languageCode: string | null; uri: string | null }>()
  const transcripts = new Map<string, unknown>()
  let denyStart = false, denyGet = false, denyTranslate = false, configured = true, translateCalls = 0
  setProvider()
  function setProvider() {
    sp.setSpeechProvider({
      configured: () => configured,
      startJob: async (name, key) => { calls.push(`start:${key}`); if (denyStart) throw new sp.SpeechNotAvailable(); jobs.set(name, { status: 'IN_PROGRESS', languageCode: null, uri: null }) },
      getJob: async name => { calls.push('get'); if (denyGet) throw new sp.SpeechNotAvailable(); const j = jobs.get(name); if (!j) throw new Error('no job'); return { status: j.status, languageCode: j.languageCode, transcriptUri: j.uri } },
      fetchTranscript: async uri => transcripts.get(uri),
      deleteJob: async name => { calls.push('delete'); jobs.delete(name) },
      translateToEnglish: async (text, lang) => { translateCalls++; if (denyTranslate) throw new sp.SpeechNotAvailable(); return `EN(${lang}): ${text}` },
    })
  }
  const finish = (name: string, languageCode: string, text: string) => {
    const uri = `https://example.invalid/${name}`   // fake, never fetched
    transcripts.set(uri, { results: { transcripts: [{ transcript: text }] } })
    jobs.set(name, { status: 'COMPLETED', languageCode, uri })
  }
  const jobOf = (v: any) => rows.find(r => r.video_id === v.id)?.job_name as string
  const mkVideo = (extra: any = {}) => { const v = { id: `vid${++n}`, tenant_id: 'ten', resident_id: 'res', s3_key: 'k.mp4', poster_key: 'p.jpg', state: 'ready', status: 'pending', source: 'family', title: 'T', ...extra }; videoRows.push(v); return v }

  // ─── Start ────────────────────────────────────────────────────────────────────
  const notReady = mkVideo({ state: 'processing', s3_key: '' })
  assert.equal(await lib.startTranscript(notReady), null, 'only a ready clip with a file')

  const hindi = mkVideo()
  let t = await lib.startTranscript(hindi)
  assert.equal(t.state, 'pending')
  assert.ok(t.job_name && t.job_name.startsWith('carestream-rv-'))
  assert.ok(calls.includes('start:k.mp4'))
  assert.equal((await lib.startTranscript(hindi)).id, t.id, 'a second start leaves a running job alone')
  assert.equal(calls.filter(c => c.startsWith('start')).length, 1)

  // still running: nothing changes, nothing is downloaded
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'pending')

  // ─── Completed, not English: translated, job deleted ──────────────────────────
  finish(jobOf(hindi), 'hi-IN', 'नमस्ते दादी')
  const name1 = jobOf(hindi)
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'ready')
  assert.equal(t.language_code, 'hi-IN'); assert.equal(t.language_name, 'Hindi')
  assert.equal(t.original_text, 'नमस्ते दादी')
  assert.equal(t.translation_text, 'EN(hi): नमस्ते दादी')
  assert.ok(!jobs.has(name1), 'the job is deleted once the transcript is saved')
  let dto = lib.adminTranscriptDto(t)
  assert.equal(dto.machine_generated, true)
  assert.match(dto.label, /Machine generated\. Check anything important with someone who speaks the language\./)
  assert.equal(dto.translation, 'EN(hi): नमस्ते दादी'); assert.equal(dto.can_share_with_staff, true); assert.equal(dto.show_to_staff, false)
  assert.equal((await lib.refreshTranscript(t)).state, 'ready', 'a finished transcript is not asked about again')

  // ─── Edit and show_to_staff gating ────────────────────────────────────────────
  const approvedHindi = { ...hindi, status: 'approved' }
  assert.equal(await lib.staffTranslationFor(approvedHindi), null, 'off by default: staff see nothing')
  const on = await lib.setShowToStaff(t, true); assert.ok(on.ok)
  const staff = await lib.staffTranslationFor(approvedHindi)
  assert.equal(staff?.text, 'EN(hi): नमस्ते दादी'); assert.equal(staff?.language_name, 'Hindi')
  assert.match(staff!.label, /machine generated and checked by a manager/)
  assert.equal(await lib.staffTranslationFor({ ...hindi, status: 'pending' }), null, 'pending clip: staff see nothing even when switched on')
  assert.equal(await lib.staffTranslationFor({ ...hindi, status: 'rejected' }), null)
  assert.equal(await lib.staffTranslationFor({ ...hindi, status: 'approved', state: 'failed' }), null)
  const ed = await lib.editTranslation(on.ok ? on.row : t, '  Hello Grandma, we love you.  ', 'Pat Manager'); assert.ok(ed.ok)
  assert.equal(ed.ok && ed.row.edited_translation_text, 'Hello Grandma, we love you.')
  assert.equal(ed.ok && ed.row.edited_by, 'Pat Manager')
  assert.equal((await lib.staffTranslationFor(approvedHindi))?.text, 'Hello Grandma, we love you.', 'staff see the manager edited text')
  dto = lib.adminTranscriptDto(ed.ok ? ed.row : t)
  assert.equal(dto.edited, true); assert.equal(dto.translation, 'Hello Grandma, we love you.'); assert.equal(dto.machine_translation, 'EN(hi): नमस्ते दादी')
  const cleared = await lib.editTranslation(ed.ok ? ed.row : t, '   ', 'Pat Manager'); assert.ok(cleared.ok)
  assert.equal(cleared.ok && cleared.row.edited_translation_text, null, 'empty text goes back to the machine translation')
  const off = await lib.setShowToStaff(cleared.ok ? cleared.row : t, false); assert.ok(off.ok)
  assert.equal(await lib.staffTranslationFor(approvedHindi), null)

  // ─── English video: no translation ────────────────────────────────────────────
  const eng = mkVideo()
  t = await lib.startTranscript(eng)
  translateCalls = 0
  finish(jobOf(eng), 'en-GB', 'Hello everyone, it is Sunday.')
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'ready'); assert.equal(t.translation_text, null); assert.equal(translateCalls, 0)
  dto = lib.adminTranscriptDto(t)
  assert.equal(dto.translation, null); assert.equal(dto.can_share_with_staff, false); assert.equal(dto.message, 'Spoken in English')
  const noShare = await lib.setShowToStaff(t, true); assert.equal(noShare.ok, false, 'nothing to share for English')
  const noEdit = await lib.editTranslation(t, 'x', 'P'); assert.equal(noEdit.ok, false)

  // ─── Language Translate cannot do: transcript only ────────────────────────────
  const welsh = mkVideo()
  t = await lib.startTranscript(welsh)
  finish(jobOf(welsh), 'cy-GB', 'Shwmae nain')
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'ready'); assert.equal(t.translation_text, null); assert.equal(translateCalls, 0)
  dto = lib.adminTranscriptDto(t)
  assert.match(dto.message ?? '', /Translation is not available for this language/)
  assert.equal(dto.original_text, 'Shwmae nain'); assert.equal(dto.can_share_with_staff, false)

  // ─── No speech ────────────────────────────────────────────────────────────────
  const quiet = mkVideo()
  t = await lib.startTranscript(quiet)
  finish(jobOf(quiet), 'en-GB', '   ')
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'no_speech')
  assert.equal(lib.adminTranscriptDto(t).message, 'No speech found in this video')
  assert.equal(lib.adminTranscriptDto(t).original_text, null)
  // it can be run again
  const again = await lib.startTranscript(quiet)
  assert.equal(again.state, 'pending')

  // ─── Job failed ───────────────────────────────────────────────────────────────
  const bad = mkVideo()
  t = await lib.startTranscript(bad)
  jobs.get(jobOf(bad))!.status = 'FAILED'
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'failed'); assert.equal(lib.adminTranscriptDto(t).message, 'Could not read the speech in this video')

  // ─── Access denied ────────────────────────────────────────────────────────────
  denyStart = true
  const denied = mkVideo()
  t = await lib.startTranscript(denied)
  assert.equal(t.state, 'not_available'); assert.equal(lib.adminTranscriptDto(t).message, 'Translation is not switched on yet')
  denyStart = false
  const deniedLater = mkVideo()
  t = await lib.startTranscript(deniedLater)
  denyGet = true
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'not_available')
  denyGet = false
  const deniedTranslate = mkVideo()
  t = await lib.startTranscript(deniedTranslate)
  denyTranslate = true
  finish(jobOf(deniedTranslate), 'ur-PK', 'السلام')
  t = await lib.refreshTranscript(t)
  assert.equal(t.state, 'ready'); assert.equal(t.translation_text, null)
  assert.match(lib.adminTranscriptDto(t).message ?? '', /Translation is not switched on yet\. The original text is shown\./)
  denyTranslate = false
  configured = false
  const local = mkVideo()
  t = await lib.startTranscript(local)
  assert.equal(t.state, 'not_available', 'no bucket configured: not switched on')
  configured = true

  // ─── Retention ────────────────────────────────────────────────────────────────
  const gone = mkVideo()
  await lib.startTranscript(gone)
  const goneJob = jobOf(gone)
  assert.ok(jobs.has(goneJob))
  await videos.removeVideoFiles(gone)   // used by reject, delete, retire and profile deletion
  assert.equal(rows.some(r => r.video_id === gone.id), false, 'transcript removed with the video')
  assert.equal(jobs.has(goneJob), false, 'and the running job is deleted')

  // reject (discard) removes it, and so does deleting the clip
  const rej = mkVideo(); await lib.startTranscript(rej)
  await videos.discardVideoFiles(rej)
  assert.equal(rows.some(r => r.video_id === rej.id), false)
  const del = mkVideo(); await lib.startTranscript(del)
  await videos.deleteVideo(del)
  assert.equal(rows.some(r => r.video_id === del.id), false)

  // retire: pending clip loses its transcript, an approved one keeps it for the retention period
  const pend = mkVideo({ resident_id: 'res2' }); await lib.startTranscript(pend)
  const appr = mkVideo({ resident_id: 'res2', status: 'approved' }); await lib.startTranscript(appr)
  await videos.retireResidentVideos('ten', 'res2')
  assert.equal(rows.some(r => r.video_id === pend.id), false, 'pending clip: transcript deleted')
  assert.equal(rows.some(r => r.video_id === appr.id), true, 'approved clip stays for retention, like its files')

  // profile deletion removes everything, even a transcript whose clip row is already gone
  const orphan = mkVideo({ resident_id: 'res3' }); await lib.startTranscript(orphan)
  videoRows.splice(videoRows.indexOf(orphan), 1)
  await videos.deleteResidentVideos('ten', 'res3')
  assert.equal(rows.some(r => r.resident_id === 'res3'), false)

  // ─── Admin list carries the transcript; completing a family upload starts a job ─
  const listed = mkVideo({ resident_id: 'res4' }); await lib.startTranscript(listed)
  const adminList = await videos.adminVideosFor('ten', 'res4')
  assert.equal((adminList.videos[0] as any).transcript.state, 'pending')

  // ─── Table not created yet: everything is quiet ───────────────────────────────
  Object.defineProperty(prisma, 'residentVideoTranscript', { value: undefined, configurable: true })
  assert.equal(await lib.transcriptsReady(), false)
  assert.equal(await lib.startTranscript(mkVideo()), null)
  assert.equal(await lib.transcriptFor('ten', 'x'), null)
  assert.equal((await lib.transcriptsFor('ten', ['x'])).size, 0)
  await lib.removeTranscriptFor({ id: 'x' }); await lib.removeTranscriptsForResident('ten', 'x')
  assert.equal(lib.notAvailableDto().message, 'Translation is not switched on yet')
  const noTable = await videos.adminVideosFor('ten', 'res4')
  assert.equal((noTable.videos[0] as any).transcript, null)

  console.log('resident-video-transcripts: all checks passed')
}

main().catch(e => { console.error(e); process.exit(1) })
