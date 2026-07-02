// Workforce compliance register (Enterprise).
//
// A single place to record each staff member's "safe to work" credentials
// (DBS, right to work, professional registration, references) with dates, and
// see at a glance what is valid, expiring, expired or missing. Status is
// computed from expires_at at read time (not stored). Reuses the staff list.

import { Router, Request, Response } from 'express'
import { randomUUID } from 'crypto'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { getTenantId } from '../db/tenant-context'
import { checkFeature, PlanLimitError } from '../lib/plan-limits'

export const workforceRouter = Router()

// Admin-only, and gated to plans that include the workforce compliance register
// (Enterprise). requireAuth is applied globally before this router is mounted.
workforceRouter.use(requireAdmin)
workforceRouter.use(async (req: Request, res: Response, next) => {
  try { await checkFeature((req as any).user.tenant_id, 'has_workforce_compliance'); next() }
  catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } next(e) }
})

const CREDENTIAL_TYPES = ['dbs', 'right_to_work', 'professional_registration', 'reference'] as const
type CredType = typeof CREDENTIAL_TYPES[number]

// Traffic-light status for a credential of a given type.
//   reference: received (present) | outstanding (missing)
//   others:    missing | expired | expiring (≤30 days) | valid
function statusFor(type: string, present: boolean, expiresAt: Date | null): string {
  if (!present) return type === 'reference' ? 'outstanding' : 'missing'
  if (type === 'reference') return 'received'
  if (!expiresAt) return 'valid'
  const ms = new Date(expiresAt).getTime()
  const now = Date.now()
  if (ms < now) return 'expired'
  return (ms - now) / 86_400_000 <= 30 ? 'expiring' : 'valid'
}

// GET /workforce/register — the staff × credentials grid + a group summary.
workforceRouter.get('/register', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const [users, creds] = await Promise.all([
    (prisma as any).user.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      select:  { id: true, name: true, job_role: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).staffCredential.findMany({ where: { tenant_id: tenantId } }),
  ])

  const byUser = new Map<string, Record<string, any>>()
  for (const c of creds) {
    if (!byUser.has(c.user_id)) byUser.set(c.user_id, {})
    byUser.get(c.user_id)![c.type] = c
  }

  const summary = { valid: 0, expiring: 0, expired: 0, missing: 0 }
  const staff = users.map((u: any) => {
    const credentials: Record<string, any> = {}
    for (const type of CREDENTIAL_TYPES) {
      const row = byUser.get(u.id)?.[type] ?? null
      const status = statusFor(type, !!row, row?.expires_at ?? null)
      credentials[type] = {
        present:    !!row,
        reference:  row?.reference ?? null,
        issued_at:  row?.issued_at ?? null,
        expires_at: row?.expires_at ?? null,
        notes:      row?.notes ?? null,
        status,
      }
      if      (status === 'expired')                        summary.expired++
      else if (status === 'expiring')                       summary.expiring++
      else if (status === 'valid' || status === 'received') summary.valid++
      else                                                  summary.missing++  // missing | outstanding
    }
    return { id: u.id, name: u.name, job_role: u.job_role, credentials }
  })

  ok(res, { types: CREDENTIAL_TYPES, staff, summary, total_staff: users.length })
})

// PUT /workforce/staff/:userId/credentials/:type — record/update one credential.
workforceRouter.put('/staff/:userId/credentials/:type', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const type   = String(req.params.type)
  if (!CREDENTIAL_TYPES.includes(type as CredType)) { err(res, 'VALIDATION_ERROR', 'Unknown credential type.'); return }

  const user = await (prisma as any).user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true } })
  if (!user) { err(res, 'NOT_FOUND', 'Staff member not found.', 404); return }

  const { reference, issued_at, expires_at, notes } = req.body ?? {}
  const data = {
    reference:  reference?.toString().trim() || null,
    issued_at:  issued_at  ? new Date(issued_at)  : null,
    expires_at: expires_at ? new Date(expires_at) : null,
    notes:      notes?.toString().trim() || null,
  }

  const existing = await (prisma as any).staffCredential.findFirst({ where: { tenant_id: tenantId, user_id: userId, type } })
  const cred = existing
    ? await (prisma as any).staffCredential.update({ where: { id: existing.id }, data })
    : await (prisma as any).staffCredential.create({ data: { id: randomUUID(), tenant_id: tenantId, user_id: userId, type, ...data } })

  ok(res, { credential: { ...cred, status: statusFor(type, true, cred.expires_at) } })
})

// DELETE /workforce/staff/:userId/credentials/:type — clear a credential.
workforceRouter.delete('/staff/:userId/credentials/:type', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const userId = String(req.params.userId)
  const type   = String(req.params.type)
  await (prisma as any).staffCredential.deleteMany({ where: { tenant_id: tenantId, user_id: userId, type } })
  ok(res, { deleted: true })
})
