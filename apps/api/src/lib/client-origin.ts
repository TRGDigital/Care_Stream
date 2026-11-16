// Who is really calling: the visitor's IP address, rough location, device and how they opened CareStream.
//
// Sign in does NOT come straight from the person's browser. NextAuth runs on the website's server and calls this API from there, so req.ip is the
// website's address, not the person's. The website therefore passes the real values along in x-cs-client-* headers, proved genuine by a shared secret
// (CS_FORWARD_SECRET, set on both projects). Without a matching secret the headers are ignored, so nobody calling the API directly can fake an IP.
// Calls that DO come straight from a browser (register, for example) carry no such headers and use req.ip as before.
import { timingSafeEqual } from 'crypto'
import type { Request } from 'express'

export type ClientKind = 'web' | 'installed_web' | 'android_app' | 'ios_app' | 'unknown'
export type ClientOrigin = {
  ip: string | null; country: string | null; region: string | null; city: string | null
  user_agent: string | null; client: ClientKind; device: string | null; forwarded: boolean
}

const IP_RE = /^[0-9a-fA-F:.]{3,64}$/
const clip = (s: unknown, n: number): string | null => { const v = String(s ?? '').replace(/[^\x20-\x7e]/g, '').trim(); return v ? v.slice(0, n) : null }
const header = (req: Request, name: string): string | null => { const v = req.headers[name]; return clip(Array.isArray(v) ? v[0] : v, 300) }
const decode = (s: string | null): string | null => { if (!s) return null; try { return decodeURIComponent(s) } catch { return s } }

export const cleanIp = (ip: string | null | undefined): string | null => {
  const v = String(ip ?? '').trim().replace(/^::ffff:/i, '')
  return v && IP_RE.test(v) ? v.slice(0, 64) : null
}

/** Is this request from our own website server (shared secret matches)? */
export function isTrustedForward(req: Request, env: Record<string, string | undefined> = process.env): boolean {
  const secret = env.CS_FORWARD_SECRET
  const given = req.headers['x-cs-forward-secret']
  if (!secret || typeof given !== 'string') return false
  const a = Buffer.from(given), b = Buffer.from(secret)
  return a.length === b.length && timingSafeEqual(a, b)
}

/** "Chrome on Android", "Safari on iPhone", "Edge on Windows": enough to recognise a device without storing a fingerprint. */
export function describeDevice(ua: string | null | undefined): string | null {
  const s = String(ua ?? '')
  if (!s) return null
  const os = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac OS X|Macintosh/.test(s) ? 'Mac' : /CrOS/.test(s) ? 'ChromeOS' : /Linux/.test(s) ? 'Linux' : null
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\/|Opera/.test(s) ? 'Opera' : /SamsungBrowser/.test(s) ? 'Samsung Internet' : /FxiOS|Firefox\//.test(s) ? 'Firefox' : /CriOS|Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : null
  if (!browser && !os) return null
  return [browser ?? 'Browser', os ? `on ${os}` : ''].filter(Boolean).join(' ')
}

export function clientOrigin(req: Request, env: Record<string, string | undefined> = process.env): ClientOrigin {
  const fwd = isTrustedForward(req, env)
  const ip = fwd ? (cleanIp(header(req, 'x-cs-client-ip')) ?? cleanIp(req.ip)) : cleanIp(req.ip)
  const ua = fwd ? (header(req, 'x-cs-client-ua') ?? header(req, 'user-agent')) : header(req, 'user-agent')
  const geo = (fwdName: string, directName: string) => decode(header(req, fwd ? fwdName : directName))
  const app = fwd ? header(req, 'x-cs-client-app') : null
  const mode = fwd ? header(req, 'x-cs-client-mode') : null
  const client: ClientKind = app === 'android' ? 'android_app' : app === 'ios' ? 'ios_app' : mode === 'installed_web' ? 'installed_web' : fwd ? 'web' : 'unknown'
  return {
    ip, country: geo('x-cs-client-country', 'x-vercel-ip-country'), region: geo('x-cs-client-region', 'x-vercel-ip-country-region'), city: geo('x-cs-client-city', 'x-vercel-ip-city'),
    user_agent: ua, client, device: describeDevice(ua), forwarded: fwd,
  }
}
