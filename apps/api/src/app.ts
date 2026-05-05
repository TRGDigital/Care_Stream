import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth'
import { policiesRouter } from './routes/policies'
import { queryRouter } from './routes/query'
import { usersRouter } from './routes/users'
import { emailRouter } from './routes/email'
import { billingRouter, stripeWebhookHandler } from './routes/billing'
import { regulationsRouter } from './routes/regulations'
import { analyticsRouter } from './routes/analytics'
import { adminRouter } from './routes/admin'
import { settingsRouter } from './routes/settings'
import { knowledgeRouter } from './routes/knowledge'
import { requireAuth } from './middleware/auth'
import { tenantGuard } from './middleware/tenantGuard'
import { apiLimiter } from './middleware/rateLimiter'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.WEB_URL, credentials: true }))

// §10.6 — Stripe webhook must receive the raw body for signature verification.
// Mount before express.json() so the Buffer is preserved.
app.post('/billing/webhook', express.raw({ type: 'application/json' }), stripeWebhookHandler)

app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// §12.1 — Public routes (auth has its own tighter limiter applied inside the router)
app.use('/auth', authRouter)

// §6.5 — Platform admin routes. Uses PLATFORM_ADMIN_TOKEN, not tenant JWTs.
// Must be mounted BEFORE requireAuth so it isn't rejected as an unauthenticated request.
app.use('/admin', adminRouter)

// §8.1 — SendGrid Inbound Parse webhook. Unauthenticated — auth is handled
// inside the service (sender looked up against tenant staff list).
// Must be mounted BEFORE requireAuth.
app.use('/email', emailRouter)

// §11.1 — All routes below require a valid JWT + tenant context.
// apiLimiter: 100 req/min per user.
// tenantGuard: rejects requests where any supplied tenant_id ≠ JWT claim.
app.use(apiLimiter)
app.use(requireAuth)
app.use(tenantGuard)

app.use('/policies', policiesRouter)
app.use('/query', queryRouter)
app.use('/users', usersRouter)
app.use('/billing', billingRouter)
app.use('/analytics', analyticsRouter)
app.use('/regulations', regulationsRouter)
app.use('/settings', settingsRouter)
app.use('/knowledge', knowledgeRouter)

app.listen(PORT, () => {
  console.log(`CareStreamAI API running on port ${PORT}`)
})

export default app
