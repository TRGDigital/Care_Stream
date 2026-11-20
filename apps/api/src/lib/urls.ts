import { Request } from 'express'

// The canonical site origin for building user-facing links (password reset, magic
// links, verification, email CTAs). WEB_URL may hold a COMMA-SEPARATED CORS
// allowlist (e.g. "https://carestreamai.com,https://www.carestreamai.com,…"), so
// links must use only the FIRST entry — never the whole string.
export function siteUrl(): string {
  const entries = (process.env.WEB_URL || process.env.FRONTEND_URL || '')
    .split(',').map(e => e.trim().replace(/\/$/, '')).filter(Boolean)
  // Never put a *.vercel.app address in a link people receive (it is a different host from the signed-in site, so they are asked to
  // sign in again), and use the canonical www host rather than the bare apex, which only redirects there.
  const pick = entries.find(e => !/\.vercel\.app(\/|$)/i.test(e)) ?? 'https://www.carestreamai.com'
  return pick.replace(/^https:\/\/carestreamai\.com$/i, 'https://www.carestreamai.com')
}

// Builds the public URL for a stored blog image key (blog/images/<uuid>.<ext>),
// served via GET /public/blog/image/:file. Derived from the incoming request's
// host so it is correct across the API's aliases.
export function blogImagePublicUrl(req: Request, key: string): string {
  const file = key.split('/').pop()
  return `${req.protocol}://${req.get('host')}/public/blog/image/${file}`
}
