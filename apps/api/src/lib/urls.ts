import { Request } from 'express'

// The canonical site origin for building user-facing links (password reset, magic
// links, verification, email CTAs). WEB_URL may hold a COMMA-SEPARATED CORS
// allowlist (e.g. "https://carestreamai.com,https://www.carestreamai.com,…"), so
// links must use only the FIRST entry — never the whole string.
export function siteUrl(): string {
  return (process.env.WEB_URL || process.env.FRONTEND_URL || 'https://carestreamai.com')
    .split(',')[0]
    .trim()
    .replace(/\/$/, '')
}

// Builds the public URL for a stored blog image key (blog/images/<uuid>.<ext>),
// served via GET /public/blog/image/:file. Derived from the incoming request's
// host so it is correct across the API's aliases.
export function blogImagePublicUrl(req: Request, key: string): string {
  const file = key.split('/').pop()
  return `${req.protocol}://${req.get('host')}/public/blog/image/${file}`
}
