// The anonymous page counter's input handling (POST /public/page-count). Pure. Nothing that could identify a person is read or kept: no cookie or
// device storage is involved, no IP address, no visitor id. Only the page (no query string), where the visit came from (a campaign name or the referring
// site's host, never a full address) and the type of device (from the user agent the request already carries). Bots and private areas are dropped.
import { cleanPath, BOT } from './site-visit'

export type CleanCount = { day: string; path: string; source: string; device: 'desktop' | 'mobile' | 'tablet' }

const londonDay = (d: Date) => d.toLocaleDateString('en-CA', { timeZone: 'Europe/London' })
const clean = (v: unknown, n: number) => { const s = typeof v === 'string' ? v.trim().toLowerCase() : ''; return s ? s.slice(0, n) : '' }
const hostOf = (v: unknown): string => { const s = typeof v === 'string' ? v.trim() : ''; if (!s) return ''; try { return new URL(s).hostname.replace(/^www\./, '').slice(0, 100) } catch { return '' } }
const SELF = /(^|\.)carestreamai\.com$/

export function cleanCount(body: any, userAgent: string | undefined, now: Date = new Date()): CleanCount | null {
  if (!body || typeof body !== 'object') return null
  if (!userAgent || BOT.test(userAgent)) return null
  const path = cleanPath(body.path); if (!path) return null
  const ref = hostOf(body.referrer)
  const utm = clean(body.utm_source, 60).replace(/[^a-z0-9._ -]/g, '')
  const source = utm ? `${utm} (campaign)` : ref && !SELF.test(ref) ? ref : 'direct'
  const device = /iPad|Tablet/i.test(userAgent) ? 'tablet' : /Android|iPhone|iPod|Mobile/i.test(userAgent) ? 'mobile' : 'desktop'
  return { day: londonDay(now), path, source, device }
}
