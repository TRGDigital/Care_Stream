// "This is me" video messages: the media part only (file signature, probing, transcoding, poster). No database, no storage, so it can be
// tested on its own with a real clip:  npx tsx src/scripts/resident-video-media.check.ts
//
// ffmpeg comes from the ffmpeg-static package (probing uses `ffmpeg -i` too, so there is no second binary to ship). Its binary is shipped in
// the Vercel function through "includeFiles" in apps/api/vercel.json. If a binary cannot be found or cannot be run, every function here fails with a plain error
// (VideoError, code 'NO_FFMPEG') rather than crashing the request.

import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

export const MAX_SECONDS = 60
export const MAX_AUDIO_SECONDS = 120         // a voice note
export const SECONDS_TOLERANCE = 2          // a clip a hair over a minute still passes
export const MAX_EDGE = 1280                // longest side of the stored video, pixels
export const POSTER_EDGE = 640
const TRANSCODE_TIMEOUT_MS = 240_000        // the function has 300 seconds in total

export class VideoError extends Error {
  constructor(public code: 'INVALID_FILE' | 'TOO_LONG' | 'NO_VIDEO' | 'NO_FFMPEG' | 'PROCESS_FAILED', message: string) { super(message) }
}

// ─── File signature ────────────────────────────────────────────────────────────
/** mp4, mov and 3gp share the ISO "ftyp" box; webm starts with the EBML header and says "webm". HEIC and other image brands are refused. */
export function detectVideoContainer(b: Buffer): { kind: 'mp4' | 'mov' | '3gp' | 'webm'; mime: string } | null {
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp') {
    const brand = b.toString('latin1', 8, 12)
    if (['heic', 'heix', 'heif', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'avif', 'avis', 'crx '].includes(brand)) return null
    if (brand === 'qt  ') return { kind: 'mov', mime: 'video/quicktime' }
    if (brand.startsWith('3g')) return { kind: '3gp', mime: 'video/3gpp' }
    // isom, iso2, mp41, mp42, avc1, M4V, MSNV and the other camera brands are all MP4 family files.
    if (/^[\x20-\x7e]{4}$/.test(brand)) return { kind: 'mp4', mime: 'video/mp4' }
    return null
  }
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) {
    if (b.toString('latin1', 0, Math.min(b.length, 64)).includes('webm')) return { kind: 'webm', mime: 'video/webm' }
    return null   // Matroska (mkv) is not accepted
  }
  return null
}

// ─── Binaries ──────────────────────────────────────────────────────────────────
const resolved = new Map<string, string>()

function candidates(name: 'ffmpeg'): string[] {
  const out: string[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const p = require('ffmpeg-static'); if (typeof p === 'string') out.push(p)
  } catch { /* package not installed */ }
  if (process.env.FFMPEG_PATH) out.unshift(process.env.FFMPEG_PATH)
  // Where includeFiles puts it in the deployed function (relative to the function root).
  const cwd = process.cwd()
  out.push(path.join(cwd, 'node_modules/ffmpeg-static/ffmpeg'), path.join(cwd, '../../node_modules/ffmpeg-static/ffmpeg'), path.join(cwd, 'apps/api/node_modules/ffmpeg-static/ffmpeg'))
  return out
}

/** Finds the binary, and makes sure it can be run (a deployed file may have lost its executable bit: then a copy in the temp folder is used). */
export function binaryPath(name: 'ffmpeg'): string {
  const hit = resolved.get(name)
  if (hit) return hit
  for (const c of candidates(name)) {
    try {
      if (!fs.existsSync(c)) continue
      try { fs.accessSync(c, fs.constants.X_OK); resolved.set(name, c); return c } catch { /* not executable */ }
      const copy = path.join(os.tmpdir(), `rv-bin-${name}`)
      if (!fs.existsSync(copy)) { fs.copyFileSync(c, copy); fs.chmodSync(copy, 0o755) }
      resolved.set(name, copy); return copy
    } catch { /* try the next place */ }
  }
  throw new VideoError('NO_FFMPEG', 'Video processing is not available just now. Please try again later.')
}

function run(bin: string, args: string[], timeoutMs: number): Promise<{ code: number; out: string; err: string }> {
  return new Promise((resolve, reject) => {
    let child
    try { child = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] }) } catch { reject(new VideoError('NO_FFMPEG', 'Video processing is not available just now. Please try again later.')); return }
    let out = '', err = ''
    const timer = setTimeout(() => { child.kill('SIGKILL'); reject(new VideoError('PROCESS_FAILED', 'That video took too long to process.')) }, timeoutMs)
    child.stdout.on('data', d => { if (out.length < 200_000) out += d })
    child.stderr.on('data', d => { if (err.length < 200_000) err += d })
    child.on('error', () => { clearTimeout(timer); reject(new VideoError('NO_FFMPEG', 'Video processing is not available just now. Please try again later.')) })
    child.on('close', code => { clearTimeout(timer); resolve({ code: code ?? 1, out, err }) })
  })
}

// ─── Probe ─────────────────────────────────────────────────────────────────────
export interface Probe { duration: number; width: number; height: number; hasAudio: boolean; videoCodec: string; audioCodec: string | null; hasMetadataTags: boolean }

export async function probeVideo(file: string): Promise<Probe> {
  // `ffmpeg -i file` with no output prints what it found on stderr and exits non zero: that is expected here.
  const r = await run(binaryPath('ffmpeg'), ['-hide_banner', '-i', file], 30_000)
  const text = r.err
  const dm = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text)
  const vm = /Stream #\d+:\d+[^\n]*?:\s*Video:\s*([a-z0-9_]+)[^\n]*?,\s*(\d{2,5})x(\d{2,5})/i.exec(text.replace(/Video:[^\n]*attached pic[^\n]*/gi, ''))
  if (!vm) throw new VideoError(/Invalid data|moov atom|could not find codec|No such file/i.test(text) || !dm ? 'INVALID_FILE' : 'NO_VIDEO', /Duration/.test(text) ? 'That file does not contain a video. Please try a different clip.' : 'That file could not be read as a video. Please try a different clip.')
  const duration = dm ? Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]) : NaN
  if (!Number.isFinite(duration) || duration <= 0) throw new VideoError('INVALID_FILE', 'That video could not be read. Please try a different clip.')
  const am = /Stream #\d+:\d+[^\n]*?:\s*Audio:\s*([a-z0-9_]+)/i.exec(text)
  // Rotated phone clips store the rotation as a side flag: the shown size is the other way round.
  let width = Number(vm[2]) || 0, height = Number(vm[3]) || 0
  const rm = /rotation of\s*(-?\d+(?:\.\d+)?)\s*degrees|\brotate\s*:\s*(-?\d+)/i.exec(text)
  const rot = rm ? Math.abs(Number(rm[1] ?? rm[2])) % 360 : 0
  if (rot === 90 || rot === 270) [width, height] = [height, width]
  // Container level tags are listed under "Metadata:" before the first "Duration:" line.
  const head = text.slice(0, dm ? dm.index : text.length)
  const keys = [...head.matchAll(/^\s{4}([A-Za-z0-9_.\-]+)\s*:/gm)].map(m => m[1])
  return { duration, width, height, hasAudio: !!am, videoCodec: vm[1], audioCodec: am ? am[1] : null, hasMetadataTags: keys.some(k => !['major_brand', 'minor_version', 'compatible_brands', 'encoder', 'handler_name'].includes(k)) }
}

// ─── Transcode ─────────────────────────────────────────────────────────────────
export interface Processed { mp4: string; poster: string; duration: number; width: number; height: number; size: number }

/**
 * input -> MP4 (H.264 + AAC, longest side at most 1280px, about 1.5 Mbps, faststart, no metadata) and a 640px JPEG poster, both written
 * into outDir. Rejects clips over 60 seconds (plus a small tolerance) before spending any time transcoding.
 */
export async function transcodeVideo(input: string, outDir: string): Promise<Processed> {
  const info = await probeVideo(input)
  if (info.duration > MAX_SECONDS + SECONDS_TOLERANCE) throw new VideoError('TOO_LONG', `That video is longer than ${MAX_SECONDS} seconds. Please send a shorter one.`)
  const mp4 = path.join(outDir, 'out.mp4'), poster = path.join(outDir, 'poster.jpg')
  const ff = binaryPath('ffmpeg')
  // Scale to fit inside 1280x1280 without enlarging, keep the shape, even sizes (H.264 needs them). Phone rotation is applied by ffmpeg.
  const vf = `scale=w='min(${MAX_EDGE},iw)':h='min(${MAX_EDGE},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,format=yuv420p`
  const t = await run(ff, [
    '-nostdin', '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input, '-t', String(MAX_SECONDS + SECONDS_TOLERANCE),
    '-map', '0:v:0', '-map', '0:a:0?', '-sn', '-dn',
    '-vf', vf, '-r', '30',
    '-c:v', 'libx264', '-preset', 'veryfast', '-profile:v', 'high', '-b:v', '1500k', '-maxrate', '2000k', '-bufsize', '3000k',
    '-c:a', 'aac', '-b:a', '96k', '-ac', '2', '-ar', '44100',
    '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact', '-flags:v', '+bitexact', '-flags:a', '+bitexact',
    '-movflags', '+faststart', mp4,
  ], TRANSCODE_TIMEOUT_MS)
  if (t.code !== 0 || !fs.existsSync(mp4)) throw new VideoError('PROCESS_FAILED', 'That video could not be processed. Please try again with a shorter video.')

  const out = await probeVideo(mp4)
  const at = out.duration > 3 ? '1' : '0'   // a frame a moment in, so the poster is not a black first frame
  const p = await run(ff, [
    '-nostdin', '-y', '-hide_banner', '-loglevel', 'error', '-ss', at, '-i', mp4, '-frames:v', '1',
    '-vf', `scale=w='min(${POSTER_EDGE},iw)':h='min(${POSTER_EDGE},ih)':force_original_aspect_ratio=decrease:force_divisible_by=2`,
    '-q:v', '4', '-map_metadata', '-1', poster,
  ], 60_000)
  if (p.code !== 0 || !fs.existsSync(poster)) throw new VideoError('PROCESS_FAILED', 'That video could not be processed. Please try again with a shorter video.')
  return { mp4, poster, duration: out.duration, width: out.width, height: out.height, size: fs.statSync(mp4).size }
}


// ─── Voice notes (audio only) ──────────────────────────────────────────────────
/** What the file is, by its first bytes: m4a or mp4 audio, 3gp (Android recorders), webm (Chrome recordings), ogg, mp3, wav or amr. Anything else is refused. */
export function detectAudioContainer(b: Buffer): { kind: 'm4a' | '3gp' | 'webm' | 'ogg' | 'mp3' | 'wav' | 'amr'; mime: string } | null {
  if (b.length >= 12 && b.toString('latin1', 4, 8) === 'ftyp') {
    const brand = b.toString('latin1', 8, 12)
    if (['heic', 'heix', 'heif', 'hevc', 'heim', 'heis', 'hevm', 'hevs', 'mif1', 'msf1', 'avif', 'avis', 'crx '].includes(brand)) return null
    if (brand.startsWith('3g')) return { kind: '3gp', mime: 'audio/3gpp' }
    if (/^[\x20-\x7e]{4}$/.test(brand)) return { kind: 'm4a', mime: 'audio/mp4' }
    return null
  }
  if (b.length >= 4 && b[0] === 0x1a && b[1] === 0x45 && b[2] === 0xdf && b[3] === 0xa3) return b.toString('latin1', 0, Math.min(b.length, 64)).includes('webm') ? { kind: 'webm', mime: 'audio/webm' } : null
  if (b.length >= 4 && b.toString('latin1', 0, 4) === 'OggS') return { kind: 'ogg', mime: 'audio/ogg' }
  if (b.length >= 12 && b.toString('latin1', 0, 4) === 'RIFF' && b.toString('latin1', 8, 12) === 'WAVE') return { kind: 'wav', mime: 'audio/wav' }
  if (b.length >= 6 && b.toString('latin1', 0, 6) === '#!AMR\n') return { kind: 'amr', mime: 'audio/amr' }
  if (b.length >= 3 && b.toString('latin1', 0, 3) === 'ID3') return { kind: 'mp3', mime: 'audio/mpeg' }
  if (b.length >= 2 && b[0] === 0xff && (b[1] & 0xe0) === 0xe0 && (b[1] & 0x06) !== 0) return { kind: 'mp3', mime: 'audio/mpeg' }
  return null
}

export interface AudioProbe { duration: number; audioCodec: string | null; hasVideo: boolean }

export async function probeAudio(file: string): Promise<AudioProbe> {
  const r = await run(binaryPath('ffmpeg'), ['-hide_banner', '-i', file], 30_000)
  const text = r.err
  const dm = /Duration:\s*(\d+):(\d+):(\d+(?:\.\d+)?)/.exec(text)
  const am = /Stream #\d+:\d+[^\n]*?:\s*Audio:\s*([a-z0-9_]+)/i.exec(text)
  if (!am) throw new VideoError('INVALID_FILE', 'That file does not contain a voice recording we can use. Please record again, or choose a different file.')
  const duration = dm ? Number(dm[1]) * 3600 + Number(dm[2]) * 60 + Number(dm[3]) : NaN
  // A recording made in the browser can report no length (a live webm stream): the transcode below measures it.
  const hasVideo = /Stream #\d+:\d+[^\n]*?:\s*Video:/i.test(text.replace(/Video:[^\n]*attached pic[^\n]*/gi, ''))
  return { duration: Number.isFinite(duration) && duration > 0 ? duration : NaN, audioCodec: am[1], hasVideo }
}

export interface ProcessedAudio { m4a: string; duration: number; size: number }

/**
 * input -> mono AAC in an m4a container (about 64 kbps, faststart, no metadata, any picture or video track dropped) written into outDir.
 * Rejects a recording over two minutes (plus a small tolerance). The length is measured again on the output, because a browser recording
 * often has no length in its header.
 */
export async function transcodeAudio(input: string, outDir: string): Promise<ProcessedAudio> {
  const info = await probeAudio(input)
  if (Number.isFinite(info.duration) && info.duration > MAX_AUDIO_SECONDS + SECONDS_TOLERANCE) throw new VideoError('TOO_LONG', `That recording is longer than ${MAX_AUDIO_SECONDS / 60} minutes. Please send a shorter one.`)
  const m4a = path.join(outDir, 'out.m4a')
  const t = await run(binaryPath('ffmpeg'), [
    '-nostdin', '-y', '-hide_banner', '-loglevel', 'error',
    '-i', input, '-t', String(MAX_AUDIO_SECONDS + SECONDS_TOLERANCE + 1),
    '-map', '0:a:0', '-vn', '-sn', '-dn',
    '-c:a', 'aac', '-b:a', '64k', '-ac', '1', '-ar', '44100',
    '-map_metadata', '-1', '-map_chapters', '-1', '-fflags', '+bitexact', '-flags:a', '+bitexact',
    '-movflags', '+faststart', '-f', 'ipod', m4a,
  ], TRANSCODE_TIMEOUT_MS)
  if (t.code !== 0 || !fs.existsSync(m4a)) throw new VideoError('PROCESS_FAILED', 'That recording could not be processed. Please try again with a shorter recording.')
  const out = await probeAudio(m4a)
  if (!Number.isFinite(out.duration) || out.duration < 0.5) throw new VideoError('INVALID_FILE', 'That recording is empty. Please record again.')
  if (out.duration > MAX_AUDIO_SECONDS + SECONDS_TOLERANCE) throw new VideoError('TOO_LONG', `That recording is longer than ${MAX_AUDIO_SECONDS / 60} minutes. Please send a shorter one.`)
  return { m4a, duration: out.duration, size: fs.statSync(m4a).size }
}
