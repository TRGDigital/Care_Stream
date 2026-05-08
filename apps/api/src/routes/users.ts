// §7.3 — Users routes: staff list + invite.

import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { hashPassword } from '../services/auth/password'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'
import crypto from 'crypto'

export const usersRouter = Router()

// All /users routes are admin-only
usersRouter.use(requireAdmin)

// ─── GET /users ───────────────────────────────────────────────────────────────

usersRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const users = await (prisma as any).user.findMany({
    where:   { tenant_id: tenantId },
    select:  { id: true, name: true, email: true, role: true, created_at: true },
    orderBy: { created_at: 'asc' },
  })

  ok(res, { users, total: users.length })
})

// ─── POST /users/invite ───────────────────────────────────────────────────────

const InviteSchema = z.object({
  name:  z.string().min(1).max(100),
  email: z.string().email(),
  role:  z.enum(['admin', 'staff']).default('staff'),
})

usersRouter.post('/invite', async (req: Request, res: Response) => {
  const parsed = InviteSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { name, email, role } = parsed.data
  const tenantId = req.user!.tenant_id

  const existing = await (prisma as any).user.findUnique({ where: { email } })
  if (existing) {
    err(res, 'EMAIL_IN_USE', 'A user with that email address already exists.')
    return
  }

  const tempPassword = crypto.randomBytes(10).toString('base64url')
  const passwordHash = await hashPassword(tempPassword)

  const user = await (prisma as any).user.create({
    data: {
      tenant_id:     tenantId,
      name,
      email,
      role,
      password_hash: passwordHash,
    },
    select: { id: true, name: true, email: true, role: true, created_at: true },
  })

  ok(res, { user, temp_password: tempPassword }, 201)
})
