// "This is me" video processing, tested for real with the bundled ffmpeg. Run with:  npx tsx src/lib/resident-video-media.test.ts
// (no database, no storage, no network). It makes small test clips, runs them through detectVideoContainer and transcodeVideo, and checks
// the output is H.264 + AAC MP4, at most 1280px, with a poster, no metadata, and that junk and over-long clips are refused.

import assert from 'node:assert/strict'
import { spawnSync } from 'node:child_process'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { binaryPath, detectVideoContainer, detectAudioContainer, probeVideo, probeAudio, transcodeVideo, transcodeAudio, VideoError, MAX_EDGE, MAX_AUDIO_SECONDS } from './resident-video-media'

let n = 0
const t = async (name: string, fn: () => Promise<void> | void) => { await fn(); n++; console.log('ok  ', name) }
const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'rv-test-'))
const ff = (...args: string[]) => { const r = spawnSync(binaryPath('ffmpeg'), ['-y', '-hide_banner', '-loglevel', 'error', ...args]); assert.equal(r.status, 0, String(r.stderr)); }

async function main() {
  // A phone-like clip: 1920x1080, 3 seconds, with sound and location and title tags that must not survive.
  const big = path.join(dir, 'big.mp4')
  ff('-f', 'lavfi', '-i', 'testsrc=size=1920x1080:rate=30:duration=3', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac',
    '-metadata', 'location=+53.4808-002.2426/', '-metadata', 'title=Secret title', '-metadata', 'com.apple.quicktime.model=iPhone 15', '-shortest', big)
  const mov = path.join(dir, 'clip.mov')
  ff('-f', 'lavfi', '-i', 'testsrc=size=1080x1920:rate=30:duration=2', '-f', 'lavfi', '-i', 'sine=frequency=330:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-f', 'mov', '-shortest', mov)
  const webm = path.join(dir, 'clip.webm')
  ff('-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=1', '-c:v', 'libvpx', '-b:v', '200k', webm)
  const silent = path.join(dir, 'silent.mp4')
  ff('-f', 'lavfi', '-i', 'testsrc=size=320x240:rate=15:duration=2', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', silent)
  const text = path.join(dir, 'notes.mp4')
  fs.writeFileSync(text, 'This is just some text pretending to be a video. '.repeat(50))
  const long = path.join(dir, 'long.mp4')
  ff('-f', 'lavfi', '-i', 'color=c=blue:size=160x120:rate=1:duration=75', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', long)

  const head = (f: string) => fs.readFileSync(f).subarray(0, 4096)

  await t('signatures: mp4, mov, webm accepted by the real bytes', () => {
    assert.equal(detectVideoContainer(head(big))?.kind, 'mp4')
    assert.equal(detectVideoContainer(head(mov))?.kind, 'mov')
    assert.equal(detectVideoContainer(head(webm))?.kind, 'webm')
  })
  await t('signatures: 3gp brand accepted, HEIC image brand and text and empty refused', () => {
    const box = (brand: string) => Buffer.concat([Buffer.from([0, 0, 0, 24]), Buffer.from('ftyp'), Buffer.from(brand), Buffer.alloc(12)])
    assert.equal(detectVideoContainer(box('3gp4'))?.kind, '3gp')
    assert.equal(detectVideoContainer(box('heic')), null)
    assert.equal(detectVideoContainer(head(text)), null)
    assert.equal(detectVideoContainer(Buffer.alloc(0)), null)
    assert.equal(detectVideoContainer(Buffer.from('%PDF-1.7 not a video at all')), null)
  })

  await t('a big phone clip becomes H.264 + AAC MP4, 1280px, faststart, poster, no metadata', async () => {
    const out = path.join(dir, 'o1'); fs.mkdirSync(out)
    const r = await transcodeVideo(big, out)
    const p = await probeVideo(r.mp4)
    assert.equal(p.videoCodec, 'h264'); assert.equal(p.audioCodec, 'aac')
    assert.ok(Math.max(r.width, r.height) <= MAX_EDGE, `size ${r.width}x${r.height}`)
    assert.equal(r.width, 1280); assert.equal(r.height, 720)
    assert.ok(r.duration > 2.5 && r.duration < 3.6, String(r.duration))
    assert.ok(fs.existsSync(r.poster) && fs.statSync(r.poster).size > 500)
    const poster = fs.readFileSync(r.poster); assert.ok(poster[0] === 0xff && poster[1] === 0xd8)
    const bytes = fs.readFileSync(r.mp4).toString('latin1')
    for (const secret of ['Secret title', 'iPhone', '+53.4808', 'location']) assert.ok(!bytes.includes(secret), `metadata leaked: ${secret}`)
    assert.equal(p.hasMetadataTags, false)
    // faststart: the moov box comes before the media data
    assert.ok(bytes.indexOf('moov') > 0 && bytes.indexOf('moov') < bytes.indexOf('mdat'), 'moov not before mdat')
  })
  await t('a portrait .mov is scaled the right way round', async () => {
    const out = path.join(dir, 'o2'); fs.mkdirSync(out)
    const r = await transcodeVideo(mov, out)
    assert.equal(r.height, 1280); assert.equal(r.width, 720)
  })
  await t('webm and a clip with no sound both work', async () => {
    for (const [f, name] of [[webm, 'o3'], [silent, 'o4']]) {
      const out = path.join(dir, name); fs.mkdirSync(out)
      const r = await transcodeVideo(f, out)
      assert.equal((await probeVideo(r.mp4)).videoCodec, 'h264')
    }
  })
  await t('a text file renamed .mp4 is refused', async () => {
    const out = path.join(dir, 'o5'); fs.mkdirSync(out)
    await assert.rejects(() => transcodeVideo(text, out), (e: any) => e instanceof VideoError && e.code === 'INVALID_FILE')
  })
  await t('a clip over 60 seconds is refused before transcoding', async () => {
    const out = path.join(dir, 'o6'); fs.mkdirSync(out)
    await assert.rejects(() => transcodeVideo(long, out), (e: any) => e instanceof VideoError && e.code === 'TOO_LONG')
    assert.ok(!fs.existsSync(path.join(out, 'out.mp4')))
  })

  // ── Voice notes ──
  const tone = (name: string, ...args: string[]) => { const f = path.join(dir, name); ff('-f', 'lavfi', '-i', 'sine=frequency=440:duration=3', ...args, f); return f }
  const m4a = tone('tone.m4a', '-c:a', 'aac', '-metadata', 'title=Secret title', '-metadata', 'location=+53.4808-002.2426/')
  const webmA = tone('tone.webm', '-c:a', 'libopus')
  const oggA = tone('tone.ogg', '-c:a', 'libopus')
  const mp3A = tone('tone.mp3', '-c:a', 'libmp3lame')
  const wavA = tone('tone.wav', '-c:a', 'pcm_s16le')
  await t('voice note files are recognised by their first bytes (m4a, webm, ogg, mp3, wav), not by name', () => {
    for (const [f, kind] of [[m4a, 'm4a'], [webmA, 'webm'], [oggA, 'ogg'], [mp3A, 'mp3'], [wavA, 'wav']] as const) assert.equal(detectAudioContainer(fs.readFileSync(f))?.kind, kind, f)
    assert.equal(detectAudioContainer(fs.readFileSync(text)), null)
    assert.equal(detectAudioContainer(Buffer.from('GIF89a......')), null)
    // a photo brand is never accepted as audio, and a video file is not detected as a video by the audio check being the only gate
    assert.equal(detectAudioContainer(Buffer.concat([Buffer.alloc(4), Buffer.from('ftypheic'), Buffer.alloc(8)])), null)
  })
  await t('a voice note is turned into mono AAC m4a with no tags, and the length is measured', async () => {
    for (const [f, name] of [[m4a, 'a1'], [webmA, 'a2'], [oggA, 'a3'], [mp3A, 'a4'], [wavA, 'a5']] as const) {
      const out = path.join(dir, name); fs.mkdirSync(out)
      const r = await transcodeAudio(f, out)
      assert.ok(r.m4a.endsWith('.m4a') && r.size > 1000)
      assert.ok(r.duration > 2.5 && r.duration < 3.6, `${name} ${r.duration}`)
      const p = await probeAudio(r.m4a)
      assert.equal(p.audioCodec, 'aac'); assert.equal(p.hasVideo, false)
      const dump = spawnSync(binaryPath('ffmpeg'), ['-hide_banner', '-i', r.m4a]).stderr.toString()
      assert.ok(!/Secret title|53\.4808/.test(dump), 'tags survived')
    }
  })
  await t('a video file sent as a voice note comes out as audio only', async () => {
    const out = path.join(dir, 'a6'); fs.mkdirSync(out)
    const r = await transcodeAudio(big, out)
    assert.equal((await probeAudio(r.m4a)).hasVideo, false)
  })
  await t('a text file and a silent video are refused as voice notes', async () => {
    const out = path.join(dir, 'a7'); fs.mkdirSync(out)
    await assert.rejects(() => transcodeAudio(text, out), (e: any) => e instanceof VideoError && e.code === 'INVALID_FILE')
    await assert.rejects(() => transcodeAudio(silent, out), (e: any) => e instanceof VideoError && e.code === 'INVALID_FILE')
  })
  await t('a recording over two minutes is refused, one just under is accepted', async () => {
    assert.equal(MAX_AUDIO_SECONDS, 120)
    const longA = path.join(dir, 'long.m4a'); ff('-f', 'lavfi', '-i', 'sine=frequency=300:duration=130', '-c:a', 'aac', '-b:a', '16k', longA)
    const o1 = path.join(dir, 'a8'); fs.mkdirSync(o1)
    await assert.rejects(() => transcodeAudio(longA, o1), (e: any) => e instanceof VideoError && e.code === 'TOO_LONG')
    const okA = path.join(dir, 'ok.m4a'); ff('-f', 'lavfi', '-i', 'sine=frequency=300:duration=110', '-c:a', 'aac', '-b:a', '16k', okA)
    const o2 = path.join(dir, 'a9'); fs.mkdirSync(o2)
    assert.ok((await transcodeAudio(okA, o2)).duration > 105)
  })
  await t('no dashes in the messages families see', () => {
    for (const m of ['TOO_LONG', 'NO_VIDEO']) assert.ok(m)
    const src = fs.readFileSync(path.join(__dirname, 'resident-video-media.ts'), 'utf8')
    assert.ok(!/[\u2013\u2014]/.test(src))
  })
  fs.rmSync(dir, { recursive: true, force: true })
  console.log(`\n${n} passed`)
}
main().catch(e => { console.error(e); fs.rmSync(dir, { recursive: true, force: true }); process.exit(1) })
