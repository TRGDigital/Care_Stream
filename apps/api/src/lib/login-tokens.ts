// Passwordless sign-in tokens (magic link / per-staff QR). Single-use, hashed at
// rest — the raw token only ever lives in the link. Part of the WhatsApp → Hub
// migration: getting care staff into the hub without remembering a password.

import crypto from 'crypto'
import { prisma } from '../db/client'

function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex')
}

// Mint a one-time sign-in link for a user. Returns the full URL to send/show.
export async function createLoginLink(userId: string, tenantId: string, ttlMs: number): Promise<string> {
  const token = crypto.randomBytes(24).toString('base64url')
  await (prisma as any).loginToken.create({
    data: { token_hash: hashToken(token), user_id: userId, tenant_id: tenantId, expires_at: new Date(Date.now() + ttlMs) },
  })
  const base = (process.env.WEB_URL || 'https://carestreamai.com').replace(/\/$/, '')
  return `${base}/auth/link?token=${token}`
}

// Validate + consume a sign-in token. Returns the user_id once, or null if the
// token is unknown, already used, or expired.
export async function consumeLoginToken(token: string): Promise<{ user_id: string } | null> {
  if (!token) return null
  const row = await (prisma as any).loginToken.findUnique({ where: { token_hash: hashToken(token) } }).catch(() => null)
  if (!row || row.used_at || new Date(row.expires_at) < new Date()) return null
  await (prisma as any).loginToken.update({ where: { id: row.id }, data: { used_at: new Date() } }).catch(() => {})
  return { user_id: row.user_id }
}
