import { Router } from 'express'

export const authRouter = Router()

// POST /auth/register — create tenant + admin account (§3.2)
authRouter.post('/register', (_req, res) => res.json({ success: true }))

// POST /auth/login — authenticate, return JWT with tenant_id + role claims
authRouter.post('/login', (_req, res) => res.json({ success: true }))

// POST /auth/refresh — refresh access token
authRouter.post('/refresh', (_req, res) => res.json({ success: true }))
