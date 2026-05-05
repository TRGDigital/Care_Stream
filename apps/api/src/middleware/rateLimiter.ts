// §11 — 100 req/min per user; 10 req/min on auth routes
// Brute-force protection: lockout after 5 failed login attempts
export const apiLimiter = {} as any   // placeholder
export const authLimiter = {} as any  // placeholder
