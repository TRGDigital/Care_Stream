import { createHmac, timingSafeEqual } from 'crypto'

const SECRET = process.env.FEEDBACK_HMAC_SECRET ?? 'feedback-dev-secret-change-in-prod'

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
