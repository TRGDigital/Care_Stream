// Helpers for password-protected external review links of standard modules.

import { randomBytes, createHash, timingSafeEqual } from 'crypto'
import { illustrationUrl } from '../services/training/moduleImage'

export function genToken(): string {
  return randomBytes(24).toString('base64url') // ~32 chars, unguessable
}

// Readable one-time password the admin shares alongside the link.
export function genPassword(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789' // no ambiguous chars
  const bytes = randomBytes(10)
  return Array.from(bytes, b => chars[b % chars.length]).join('').replace(/(.{5})(.{5})/, '$1-$2')
}

export function hashPassword(token: string, password: string): string {
  return createHash('sha256').update(`${token}:${password.trim().toUpperCase()}`).digest('hex')
}

export function passwordMatches(token: string, password: string, hash: string): boolean {
  const a = Buffer.from(hashPassword(token, password))
  const b = Buffer.from(hash)
  return a.length === b.length && timingSafeEqual(a, b)
}

// Hash of the content fields that matter for review — used to detect edits after a
// link was created/approved (staleness), so an approval can't apply to changed content.
export function contentHash(m: any): string {
  const payload = JSON.stringify({
    name: m?.name ?? '',
    learning_content: m?.learning_content ?? null,
    questions: m?.questions ?? [],
    pass_mark: m?.pass_mark ?? null,
    duration_minutes: m?.duration_minutes ?? null,
    frequency: m?.frequency ?? null,
    requires_practical: !!m?.requires_practical,
    standards: m?.standards ?? [],
    policy_refs: m?.policy_refs ?? [],
  })
  return createHash('sha256').update(payload).digest('hex')
}

// The frozen, read-only content an external reviewer sees.
export function buildSnapshot(m: any) {
  return {
    name: m?.name ?? '',
    learning_content: m?.learning_content ?? null,
    questions: Array.isArray(m?.questions) ? m.questions : [],
    pass_mark: m?.pass_mark ?? 80,
    duration_minutes: m?.duration_minutes ?? null,
    frequency: m?.frequency ?? null,
    requires_practical: !!m?.requires_practical,
    standards: Array.isArray(m?.standards) ? m.standards : [],
    policy_refs: Array.isArray(m?.policy_refs) ? m.policy_refs : [],
    illustration_url: illustrationUrl(m?.illustration_key),
    created_at: m?.created_at ?? null,
  }
}
