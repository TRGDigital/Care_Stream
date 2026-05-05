import { Router } from 'express'

export const usersRouter = Router()

// GET /users — list staff for tenant (admin only)
usersRouter.get('/', (_req, res) => res.json({ success: true }))

// POST /users/invite — invite staff member by email (§7 admin dashboard)
usersRouter.post('/invite', (_req, res) => res.json({ success: true }))
