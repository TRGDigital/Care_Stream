// The organisation logo (Settings > Organisation logo) in staff emails.
//
// The logo is stored as a small WebP data URL, which email programs do not show reliably (and Gmail blocks data images). So each account's
// logo is also served from a public address as a PNG, and a central step at send time puts it above the title of every staff email.
//   /public/org-logo/<tenantId>/<hash>.png    the hash is of the stored logo, so a new logo gets a new address (and can be cached for good)

import crypto from 'crypto'
import sharp from 'sharp'
import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { LOGO_ROW, LOGO_BLOCK } from '../services/email/org-logo-markers'

const p = () => prisma as any
const apiBase = () => (process.env.API_PUBLIC_URL || 'https://api.carestreamai.com').replace(/\/$/, '')
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export interface OrgLogo { url: string; alt: string }
export const logoHash = (dataUrl: string): string => crypto.createHash('sha256').update(dataUrl).digest('hex').slice(0, 16)
export const logoAddress = (tenantId: string, dataUrl: string): string => `${apiBase()}/public/org-logo/${encodeURIComponent(tenantId)}/${logoHash(dataUrl)}.png`

// Preview and test tooling only: supply a logo without a database.
let override: ((email: string) => OrgLogo | null) | null = null
export function setOrgLogoOverrideForPreview(fn: ((email: string) => OrgLogo | null) | null): void { override = fn }

const memo = new Map<string, { at: number; v: OrgLogo | null }>()
const MEMO_MS = 10 * 60_000

/** The logo of the account this email address belongs to, or null (no such person, or the account has not added a logo). */
export async function orgLogoForRecipient(email: string): Promise<OrgLogo | null> {
  if (override) return override(email)
  const key = email.trim().toLowerCase()
  const hit = memo.get(key)
  if (hit && Date.now() - hit.at < MEMO_MS) return hit.v
  let v: OrgLogo | null = null
  try {
    const u = await p().user.findFirst({ where: { email: { equals: key, mode: 'insensitive' } }, select: { tenant_id: true } })
    if (u?.tenant_id) {
      const t = await p().tenant.findUnique({ where: { id: u.tenant_id }, select: { name: true, logo_url: true } })
      if (t?.logo_url && /^data:image\//.test(t.logo_url)) v = { url: logoAddress(u.tenant_id, t.logo_url), alt: t.name ?? '' }
    }
  } catch { v = null }
  memo.set(key, { at: Date.now(), v })
  return v
}

/** Replace the markers with the logo, or remove them when there is none. */
export function applyOrgLogo(html: string, logo: OrgLogo | null): string {
  if (!html.includes(LOGO_ROW) && !html.includes(LOGO_BLOCK)) return html
  const img = logo ? `<img src="${esc(logo.url)}" alt="${esc(logo.alt)}" style="display:block;margin:0 auto;max-width:220px;max-height:72px;width:auto;height:auto;border:0">` : ''
  const row = logo ? `<tr><td align="center" style="padding:14px 32px 0">${img}</td></tr>` : ''
  const block = logo ? `<div style="text-align:center;margin:0 0 22px">${img}</div>` : ''
  return html.split(LOGO_ROW).join(row).split(LOGO_BLOCK).join(block)
}

const firstRecipient = (to: unknown): string | null => {
  const one = Array.isArray(to) ? to[0] : to
  const e = typeof one === 'string' ? one : (one as any)?.email
  return typeof e === 'string' && e.includes('@') ? e : null
}

/** The central step: used by the shared sender (lib/email-guard.ts) on every outgoing message. */
export async function withOrgLogo(msg: any): Promise<any> {
  if (!msg || typeof msg !== 'object' || typeof msg.html !== 'string') return msg
  if (!msg.html.includes(LOGO_ROW) && !msg.html.includes(LOGO_BLOCK)) return msg
  const to = firstRecipient(msg.to ?? msg.personalizations?.[0]?.to)
  const logo = to ? await orgLogoForRecipient(to).catch(() => null) : null
  return { ...msg, html: applyOrgLogo(msg.html, logo) }
}

// ── The image ────────────────────────────────────────────────────────────────
export const orgLogoFileRouter = Router()
const pngCache = new Map<string, Buffer>()

orgLogoFileRouter.get('/:tenantId/:file', async (req: Request, res: Response) => {
  const m = /^([0-9a-f]{16})\.png$/.exec(String(req.params.file))
  const gone = () => { res.status(404).type('text/plain').send('Not found') }
  if (!m) { gone(); return }
  const tenantId = String(req.params.tenantId)
  const key = `${tenantId}:${m[1]}`
  try {
    let png = pngCache.get(key)
    if (!png) {
      const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { logo_url: true } })
      const logo: string | null = t?.logo_url ?? null
      const parsed = logo ? /^data:(image\/[a-z0-9.+-]+);base64,(.+)$/i.exec(logo) : null
      if (!logo || !parsed || logoHash(logo) !== m[1]) { gone(); return }
      // PNG for every email program (WebP is not shown by Outlook), at twice the display size so it stays sharp on phones.
      png = await sharp(Buffer.from(parsed[2], 'base64')).resize({ width: 440, height: 144, fit: 'inside', withoutEnlargement: true }).png({ palette: true, quality: 90, compressionLevel: 9, effort: 8 }).toBuffer()   // a palette PNG keeps a flat logo small for email
      if (pngCache.size > 100) pngCache.clear()
      pngCache.set(key, png)
    }
    res.setHeader('Content-Type', 'image/png')
    // helmet's default (same-origin) stops Outlook on the web, Gmail and others showing the image in an email, so say it may be shown anywhere (as the picture route does)
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.setHeader('Cache-Control', 'public, max-age=86400, immutable')
    res.setHeader('X-Content-Type-Options', 'nosniff')
    res.send(png)
  } catch (e: any) {
    // A busy database is not "no such logo": say try again, so the image is not given up on (and nothing is cached for it).
    console.error('[org-logo] could not serve', String(e?.message ?? e).slice(0, 120))
    res.status(503).setHeader('Retry-After', '30'); res.type('text/plain').send('Try again')
  }
})
