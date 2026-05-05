import express from 'express'
import cors from 'cors'
import helmet from 'helmet'
import { authRouter } from './routes/auth'
import { policiesRouter } from './routes/policies'
import { queryRouter } from './routes/query'
import { usersRouter } from './routes/users'
import { emailRouter } from './routes/email'
import { billingRouter } from './routes/billing'
import { regulationsRouter } from './routes/regulations'
import { requireAuth } from './middleware/auth'
import { tenantGuard } from './middleware/tenantGuard'
import { apiLimiter } from './middleware/rateLimiter'

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.WEB_URL, credentials: true }))
app.use(express.json())

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

// §12.1 — Public routes (auth has its own tighter limiter applied inside the router)
app.use('/auth', authRouter)

// §11.1 — All routes below require a valid JWT + tenant context.
// apiLimiter: 100 req/min per user.
// tenantGuard: rejects requests where any supplied tenant_id ≠ JWT claim.
app.use(apiLimiter)
app.use(requireAuth)
app.use(tenantGuard)

app.use('/policies', policiesRouter)
app.use('/query', queryRouter)
app.use('/users', usersRouter)
app.use('/email', emailRouter)
app.use('/billing', billingRouter)
app.use('/regulations', regulationsRouter)

app.listen(PORT, () => {
  console.log(`CareStreamAI API running on port ${PORT}`)
})

export default app
