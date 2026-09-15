import jwt from 'jsonwebtoken'

// Short-lived tokens that let the console look at an unpublished marketing page.
//
// The problem this solves: every public endpoint returns published rows only, which is
// correct, but it means the only way to see a draft was to publish it. That is backwards for
// a switchover whose whole point is checking a page before anyone else can see it — and it
// already cost us once, when eight cluster feature pages went live rendering empty bodies and
// that was how we found out.
//
// Signed with JWT_SECRET, which the API already has, so this needs no new configuration.
//
// Deliberately narrow: a token names one family and one slug, and lasts 30 minutes. A leaked
// link exposes one unpublished marketing page for half an hour, not the admin API.

const TTL_SECONDS = 30 * 60

export type PreviewKind = 'user-case' | 'feature' | 'setting'

interface PreviewClaims {
  kind: PreviewKind
  slug: string
  purpose: 'preview'
}

export function signPreviewToken(kind: PreviewKind, slug: string): string {
  const secret = process.env.JWT_SECRET
  if (!secret) throw new Error('JWT_SECRET is not configured')
  const claims: PreviewClaims = { kind, slug, purpose: 'preview' }
  return jwt.sign(claims, secret, { expiresIn: TTL_SECONDS })
}

/**
 * True when the token is a valid, unexpired preview token for exactly this page.
 *
 * `purpose` is checked so an ordinary access token cannot be used here: those are signed with
 * the same secret, and without this a tenant's own login token would open any draft page.
 */
export function verifyPreviewToken(token: string | undefined, kind: PreviewKind, slug: string): boolean {
  const secret = process.env.JWT_SECRET
  if (!secret || !token) return false
  try {
    const claims = jwt.verify(token, secret) as Partial<PreviewClaims>
    return claims?.purpose === 'preview' && claims.kind === kind && claims.slug === slug
  } catch {
    return false
  }
}

export const PREVIEW_TTL_SECONDS = TTL_SECONDS
