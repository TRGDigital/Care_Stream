// Staff-facing "My Progress" — the signed-in user's own training & induction
// record. Reuses the shared staff-record builder (incl. team benchmarks so the
// staff member can see how they compare).

import { Router, Request, Response } from 'express'
import { ok, err } from '../lib/response'
import { buildStaffRecord } from '../lib/staff-record'

export const meRouter = Router()

meRouter.get('/progress', async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const userId   = (req as any).user.sub
  const record = await buildStaffRecord(tenantId, userId, { includeTeam: true })
  if (!record) { err(res, 'NOT_FOUND', 'Record not found.', 404); return }
  ok(res, record)
})
