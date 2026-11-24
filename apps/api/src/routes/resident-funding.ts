// Resident (or client) funding and fees: LOCKED. Mounted at /residents/funding after requireAuth and BEFORE the general residents routes.
//   GET  /meta          whether this person may see funding, the fee model this service defaults to, the lists for the form
//   GET  /summary       totals in code (weekly income, average fee by funding type, the mix, reviews due): no names, no individual figures
//   GET/PUT /settings   administrators only: let managers see funding (default off)
//   GET/PUT/DELETE /:residentId   one person's funding (every view of an individual's figures is audit logged)
// Pilot: CS-1001 only (lib/finance-pilot.ts). Anyone else, and every account outside the pilot, gets a plain 404 so the feature does not even show itself.
// Staff never reach any of this, and nothing here is read by the hub, family links, the assistant's knowledge or any export.

import { Router, Request, Response, NextFunction } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import { writeAuditLog } from '../lib/audit'
import { financePilotEnabled } from '../lib/finance-pilot'
import {
  FEE_MODELS, FUNDING_TYPES, FUNDING_LABEL, MODEL_LABEL, feeModelForFacility, cleanFunding, canSeeFunding, managersCanSee, setManagersCanSee,
  fundingTablesReady, getFunding, saveFunding, deleteFunding, loadSummaryRows, summarise,
} from '../lib/resident-funding'

export const residentFundingRouter = Router()
const db = prisma as any
const notFound = (res: Response) => err(res, 'NOT_FOUND', 'Not found.', 404)
const notReady = (res: Response) => err(res, 'NOT_READY', 'Funding and fees are not switched on yet.', 503)
const ukToday = () => new Date().toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

// Every route: pilot account, then a person who is allowed to see funding. Anyone else gets a 404.
async function guard(req: Request, res: Response, next: NextFunction) {
  try {
    const tenantId = getTenantId()
    if (!(await financePilotEnabled(tenantId))) { notFound(res); return }
    const u = await db.user.findFirst({ where: { id: req.user!.sub, tenant_id: tenantId, is_active: true }, select: { job_role: true } })
    const mgr = req.user!.role === 'admin' ? false : await managersCanSee(tenantId)
    if (!canSeeFunding(req.user!.role, u?.job_role, mgr)) { notFound(res); return }
    next()
  } catch { notFound(res) }
}
residentFundingRouter.use(guard)

const adminOnly = (req: Request, res: Response, next: NextFunction) => (req.user!.role === 'admin' ? next() : notFound(res))
const isMissingTable = (e: any) => /relation .* does not exist|resident_funding/i.test(String(e?.message ?? e))

residentFundingRouter.get('/meta', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } })
    ok(res, {
      enabled: true, ready: await fundingTablesReady(), is_admin: req.user!.role === 'admin', managers_can_see: await managersCanSee(tenantId),
      default_model: feeModelForFacility(t?.facility_type), models: FEE_MODELS.map(m => ({ key: m, label: MODEL_LABEL[m] })),
      funding_types: FUNDING_TYPES.map(f => ({ key: f, label: FUNDING_LABEL[f] })),
    })
  } catch { err(res, 'ERROR', 'Could not load.', 500) }
})

residentFundingRouter.get('/settings', adminOnly, async (_req: Request, res: Response) => { ok(res, { managers_can_see: await managersCanSee(getTenantId()) }) })
residentFundingRouter.put('/settings', adminOnly, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const on = req.body?.managers_can_see === true
    await setManagersCanSee(tenantId, on)
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'resident_funding_setting', entity_type: 'tenant', entity_id: tenantId, metadata: { managers_can_see: on } })
    ok(res, { managers_can_see: on })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save.', 500) }
})

residentFundingRouter.get('/summary', async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const rows = await loadSummaryRows(tenantId)
    const living = await db.resident.count({ where: { tenant_id: tenantId, status: 'living' } })
    ok(res, summarise(rows, ukToday(), Math.max(0, living - rows.length)))
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load the summary.', 500) }
})

async function residentOf(tenantId: string, id: string) { return db.resident.findFirst({ where: { id, tenant_id: tenantId }, select: { id: true } }) }

residentFundingRouter.get('/:residentId', async (req: Request, res: Response) => {
  const tenantId = getTenantId(), id = String(req.params.residentId)
  try {
    if (!(await residentOf(tenantId, id))) { notFound(res); return }
    const row = await getFunding(tenantId, id)
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'resident_funding_viewed', entity_type: 'resident', entity_id: id, metadata: {} })
    ok(res, { funding: row })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not load.', 500) }
})

residentFundingRouter.put('/:residentId', async (req: Request, res: Response) => {
  const tenantId = getTenantId(), id = String(req.params.residentId)
  const c = cleanFunding(req.body)
  if (!c.ok) { err(res, 'VALIDATION_ERROR', c.error, 400); return }
  try {
    if (!(await residentOf(tenantId, id))) { notFound(res); return }
    const r = await saveFunding(tenantId, id, c.value, req.user!.sub)
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: r.created ? 'resident_funding_created' : 'resident_funding_updated', entity_type: 'resident', entity_id: id, metadata: { fee_model: c.value.fee_model, funding_type: c.value.funding_type } })
    ok(res, { funding: r.row })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not save.', 500) }
})

residentFundingRouter.delete('/:residentId', async (req: Request, res: Response) => {
  const tenantId = getTenantId(), id = String(req.params.residentId)
  try {
    if (!(await residentOf(tenantId, id))) { notFound(res); return }
    const n = await deleteFunding(tenantId, id)
    void writeAuditLog({ tenant_id: tenantId, user_id: req.user!.sub, event_type: 'resident_funding_deleted', entity_type: 'resident', entity_id: id, metadata: {} })
    ok(res, { deleted: n > 0 })
  } catch (e) { isMissingTable(e) ? notReady(res) : err(res, 'ERROR', 'Could not delete.', 500) }
})
