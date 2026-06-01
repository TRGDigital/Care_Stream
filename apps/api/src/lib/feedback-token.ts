import { createHmac, timingSafeEqual } from 'crypto'

// In production the secret MUST come from the environment. The dev fallback is
// only used outside production so local testing works; it is never used in prod
// (where a missing secret would make tokens fail to verify — fail closed).
const SECRET = process.env.FEEDBACK_HMAC_SECRET
  ?? (process.env.NODE_ENV === 'production' ? '' : 'feedback-dev-secret-change-in-prod')

export function signFeedbackToken(queryId: string, rating: 'positive' | 'negative'): string {
  return createHmac('sha256', SECRET).update(`${queryId}:${rating}`).digest('hex')
}

export function verifyFeedbackToken(queryId: string, rating: string, sig: string): boolean {
  if (rating !== 'positive' && rating !== 'negative') return false
  const expected = signFeedbackToken(queryId, rating as 'positive' | 'negative')
  try {
    return timingSafeEqual(Buffer.from(sig, 'hex'), Buffer.from(expected, 'hex'))
  } catch {
    return false
  }
}
