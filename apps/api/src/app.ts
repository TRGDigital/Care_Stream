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

const app = express()
const PORT = process.env.PORT || 4000

app.use(helmet())
app.use(cors({ origin: process.env.WEB_URL }))
app.use(express.json())

// §12.1 — REST API routes
app.use('/auth', authRouter)
app.use('/policies', policiesRouter)
app.use('/query', queryRouter)
app.use('/users', usersRouter)
app.use('/email', emailRouter)
app.use('/billing', billingRouter)
app.use('/regulations', regulationsRouter)

app.get('/health', (_req, res) => res.json({ status: 'ok' }))

app.listen(PORT, () => {
  console.log(`CareStreamAI API running on port ${PORT}`)
})

export default app
