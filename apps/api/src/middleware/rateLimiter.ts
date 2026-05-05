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
