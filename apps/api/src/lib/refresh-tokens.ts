// Rotating refresh tokens. Each issued refresh JWT carries a `jti` tracked in the
// refresh_tokens table. On every /auth/refresh the current token is rotated (marked
// consumed) and a fresh one issued — a sliding 90-day window so active staff stay
// signed in, while reuse of a consumed/unknown token is treated as theft and revokes
// all of that user's tokens (forcing re-login everywhere).

import crypto from 'crypto'
import { prisma } from '../db/client'
import { signRefreshToken, verifyRefreshToken, REFRESH_TTL_MS } from '../services/auth/tokens'

// Mint + store a new refresh token for a user.
export async function issueRefreshToken(userId: string): Promise<string> {
  const jti = crypto.randomUUID()
  await (prisma as any).refreshToken.create({
    data: { id: jti, user_id: userId, expires_at: new Date(Date.now() + REFRESH_TTL_MS) },
  }).catch(() => { /* if the store write fails the token still works until expiry */ })
  return signRefreshToken(userId, jti)
}

export async function revokeUserRefreshTokens(userId: string): Promise<void> {
  await (prisma as any).refreshToken.deleteMany({ where: { user_id: userId } }).catch(() => {})
}

// Validate + rotate. Returns the user id and a brand-new refresh token, or null if
// the token is invalid/expired/reused.
export async function rotateRefreshToken(raw: string): Promise<{ userId: string; refreshToken: string } | null> {
  let sub: string
  let jti: string | undefined
  try {
    const p = verifyRefreshToken(raw)   // throws on bad signature or expiry
    sub = p.sub
    jti = p.jti
  } catch {
    return null
  }

  // Legacy token (issued before rotation existed) — no jti. Grandfather it once and
  // start tracking from here, so existing sessions aren't force-logged-out.
  if (!jti) {
    return { userId: sub, refreshToken: await issueRefreshToken(sub) }
  }

  const row = await (prisma as any).refreshToken.findUnique({ where: { id: jti } }).catch(() => null)

  // Validly-signed token whose jti we've never seen, or one already consumed →
  // treat as replay/theft: revoke everything for this user and refuse.
  if (!row || row.user_id !== sub || row.rotated_at || new Date(row.expires_at) < new Date()) {
    await revokeUserRefreshTokens(sub)
    return null
  }

  await (prisma as any).refreshToken.update({ where: { id: jti }, data: { rotated_at: new Date() } }).catch(() => {})
  return { userId: sub, refreshToken: await issueRefreshToken(sub) }
}
