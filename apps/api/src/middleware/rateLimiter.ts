import rateLimit from 'express-rate-limit'

// §11.1 — 100 req/min per user on general API routes
export const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.user?.sub ?? req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } },
})

// §11.1 — 10 req/min on auth routes
export const authLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } },
})

// Public, unauthenticated routes: 60 req/min per IP.
//
// apiLimiter is mounted after requireAuth and keys on the user id, so nothing in front of
// the auth boundary was throttled at all -- which included every marketing endpoint, the
// shop, and a demo route that spends Anthropic credit on each call. An unauthenticated
// caller could loop that at whatever rate their connection allowed.
//
// Keyed on IP because there is no user to key on. Generous enough that a person browsing
// the marketing site never meets it, tight enough that a script does.
export const publicLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 60,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { success: false, error: { code: 'RATE_LIMITED', message: 'Too many requests. Please try again shortly.' } },
})
