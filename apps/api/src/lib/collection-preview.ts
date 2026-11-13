import crypto from 'crypto'

// Short lived, slug scoped preview links for DRAFT collections. The platform console asks for one
// (admin auth), and the public page passes it back to the API, which checks the signature, the
// expiry and the slug before returning a draft. The signing key is derived from the platform
// admin token, which never leaves the server, so nothing in the URL can be used to reach any
// other page or to sign in. Links die after 30 minutes.
const TTL_MS = 30 * 60 * 1000
const key = () => crypto.createHash('sha256').update('collection-preview:' + (process.env.PLATFORM_ADMIN_TOKEN ?? '')).digest()
const sig = (payload: string) => crypto.createHmac('sha256', key()).update(payload).digest('base64url')

export function signCollectionPreview(slug: string): string {
  const payload = Buffer.from(`${slug}|${Date.now() + TTL_MS}`).toString('base64url')
  return `${payload}.${sig(payload)}`
}

export function verifyCollectionPreview(token: unknown, slug: string): boolean {
  if (typeof token !== 'string' || !process.env.PLATFORM_ADMIN_TOKEN) return false
  const [payload, mac] = token.split('.')
  if (!payload || !mac) return false
  const want = sig(payload)
  if (mac.length !== want.length || !crypto.timingSafeEqual(Buffer.from(mac), Buffer.from(want))) return false
  const [s, exp] = Buffer.from(payload, 'base64url').toString().split('|')
  return s === slug && Number(exp) > Date.now()
}
