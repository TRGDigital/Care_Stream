// "This is me" video messages: the media part only (file signature, probing, transcoding, poster). No database, no storage, so it can be
// tested on its own with a real clip:  npx tsx src/scripts/resident-video-media.check.ts
//
// ffmpeg and ffprobe come from the ffmpeg-static and ffprobe-static packages. Their binaries are shipped in the Vercel function through
// "includeFiles" in apps/api/vercel.json. If a binary cannot be found or cannot be run, every function here fails with a plain error
// (VideoError, code 'NO_FFMPEG') rather than crashing the request.

import { spawn } from 'child_process'
import fs from 'fs'
import os from 'os'
import path from 'path'

export const MAX_SECONDS = 60
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

function candidates(name: 'ffmpeg' | 'ffprobe'): string[] {
  const out: string[] = []
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    if (name === 'ffmpeg') { const p = require('ffmpeg-static'); if (typeof p === 'string') out.push(p) }
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    else { const p = require('ffprobe-static')?.path; if (typeof p === 'string') out.push(p) }
  } catch { /* package not installed */ }
  const env = process.env[name === 'ffmpeg' ? 'FFMPEG_PATH' : 'FFPROBE_PATH']
  if (env) out.unshift(env)
  // Where includeFiles puts them in the deployed function (relative to the function root and to this file).
  const cwd = process.cwd()
  const arch = process.arch
  if (name === 'ffmpeg') out.push(path.join(cwd, 'node_modules/ffmpeg-static/ffmpeg'), path.join(cwd, '../../node_modules/ffmpeg-static/ffmpeg'), path.join(cwd, 'apps/api/node_modules/ffmpeg-static/ffmpeg'))
  else for (const base of ['node_modules', '../../node_modules', 'apps/api/node_modules']) out.push(path.join(cwd, base, 'ffprobe-static/bin/linux', arch, 'ffprobe'))
  return out
}

/** Finds the binary, and makes sure it can be run (a deployed file may have lost its executable bit: then a copy in the temp folder is used). */
export function binaryPath(name: 'ffmpeg' | 'ffprobe'): string {
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
  const r = await run(binaryPath('ffprobe'), ['-v', 'error', '-print_format', 'json', '-show_format', '-show_streams', file], 30_000)
  let j: any
  try { j = JSON.parse(r.out) } catch { j = null }
  if (r.code !== 0 || !j) throw new VideoError('INVALID_FILE', 'That file could not be read as a video. Please try a different clip.')
  const streams: any[] = Array.isArray(j.streams) ? j.streams : []
  const v = streams.find(s => s.codec_type === 'video' && s.disposition?.attached_pic !== 1)
  if (!v) throw new VideoError('NO_VIDEO', 'That file does not contain a video. Please try a different clip.')
  const a = streams.find(s => s.codec_type === 'audio')
  const duration = Number(j.format?.duration ?? v.duration)
  if (!Number.isFinite(duration) || duration <= 0) throw new VideoError('INVALID_FILE', 'That video could not be read. Please try a different clip.')
  // Rotated phone clips store the rotation as a side flag: the shown size is the other way round.
  let width = Number(v.width) || 0, height = Number(v.height) || 0
  const rot = Math.abs(Number(v.tags?.rotate ?? (v.side_data_list ?? []).find((s: any) => s.rotation !== undefined)?.rotation ?? 0)) % 360
  if (rot === 90 || rot === 270) [width, height] = [height, width]
  const tags = { ...(j.format?.tags ?? {}) }
  return { duration, width, height, hasAudio: !!a, videoCodec: String(v.codec_name ?? ''), audioCodec: a ? String(a.codec_name ?? '') : null, hasMetadataTags: Object.keys(tags).some(k => !['major_brand', 'minor_version', 'compatible_brands', 'encoder', 'handler_name'].includes(k)) }
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
