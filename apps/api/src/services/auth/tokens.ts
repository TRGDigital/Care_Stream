import jwt from 'jsonwebtoken'
import type { JwtPayload } from '../../middleware/auth'

// §11.1 — Access tokens: 1 hour. Refresh tokens: 7 days.
// Both are stateless JWTs. Refresh tokens are signed with a separate secret
// so a compromised JWT_SECRET does not expose refresh capability.
//
// v1 tradeoff: stateless refresh tokens cannot be individually revoked before
// expiry. Mitigation: short access token window + password change invalidates
// all sessions (implement by checking password_hash version in token claims
// in a future iteration).

const ACCESS_EXPIRY = '1h'
// Long refresh window so care staff "stay signed in" on their phone like WhatsApp,
// rather than being booted to a login screen after a week. (WhatsApp → Hub migration.)
const REFRESH_EXPIRY = '90d'

export function generateAccessToken(payload: Omit<JwtPayload, 'iat' | 'exp'>): string {
  return jwt.sign(payload, process.env.JWT_SECRET!, { expiresIn: ACCESS_EXPIRY })
}

export function generateRefreshToken(userId: string): string {
  return jwt.sign(
    { sub: userId, type: 'refresh' },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: REFRESH_EXPIRY }
  )
}

export function verifyAccessToken(token: string): JwtPayload {
  return jwt.verify(token, process.env.JWT_SECRET!) as JwtPayload
}

export function verifyRefreshToken(token: string): { sub: string } {
  const payload = jwt.verify(token, process.env.JWT_REFRESH_SECRET!) as { sub: string; type: string }
  if (payload.type !== 'refresh') {
    throw new Error('Not a refresh token')
  }
  return { sub: payload.sub }
}
