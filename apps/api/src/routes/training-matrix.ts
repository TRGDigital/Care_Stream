// Training > Training Matrix tab: staff against the training their role requires, and the
// "Required training by role" setting behind it. Face-to-face requirements are read here
// but still set on the Face-to-face tab; credentials are read from /workforce.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { buildTrainingMatrix, ALL_STAFF_ROLE } from '../lib/training-matrix'

export const trainingMatrixRouter = Router()
trainingMatrixRouter.use(requireAdmin)

const tid = (req: Request) => (req as any).user.tenant_id as string

// Modules a requirement can point at: the same set an admin can enrol staff in.
const assignableModules = (tenantId: string) => ({
  is_active: true,
  OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }],
})

// GET /training-matrix
trainingMatrixRouter.get('/', async (req: Request, res: Response) => {
  try { ok(res, await buildTrainingMatrix(tid(req))) }
  catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not build the training matrix.', 500) }
})

// GET /training-matrix/requirements — the setting, plus the roles and modules to pick from.
trainingMatrixRouter.get('/requirements', async (req: Request, res: Response) => {
  const tenantId = tid(req)
  try {
    const [items, f2f, staff, modules] = await Promise.all([
      (prisma as any).trainingRoleRequirement.findMany({ where: { tenant_id: tenantId }, orderBy: [{ job_role: 'asc' }, { module_name: 'asc' }] }),
      (prisma as any).faceToFaceMandatory.findMany({ where: { tenant_id: tenantId }, orderBy: [{ job_role: 'asc' }, { module_name: 'asc' }] }),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true, is_reviewer: false }, select: { job_role: true } }),
      (prisma as any).trainingModule.findMany({
        where:   assignableModules(tenantId),
        select:  { id: true, name: true, tenant_id: true, source: true, tier: true, category: true },
        orderBy: { name: 'asc' },
      }),
    ])
    const counts = new Map<string, number>()
    for (const s of staff as any[]) {
      const r = (s.job_role ?? '').trim()
      if (r) counts.set(r, (counts.get(r) ?? 0) + 1)
    }
    for (const i of items as any[]) if (i.job_role !== ALL_STAFF_ROLE && !counts.has(i.job_role)) counts.set(i.job_role, 0)
    ok(res, {
      items: (items as any[]).map(i => ({ job_role: i.job_role, module_id: i.module_id, module_name: i.module_name })),
      face_to_face: (f2f as any[]).map(m => ({ job_role: m.job_role, module_id: m.module_id, module_name: m.module_name })),
      roles: [...counts.entries()].map(([name, staff]) => ({ name, staff })).sort((a, b) => a.name.localeCompare(b.name)),
      unassigned_staff: (staff as any[]).filter(s => !(s.job_role ?? '').trim()).length,
      modules: (modules as any[]).map(m => ({
        id: m.id, name: m.name, category: m.category,
        group: m.source !== 'ai_generated' ? 'adhoc' : (m.tier === 'cpd' ? 'cpd' : 'prebuilt'),
      })),
    })
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not load the requirements.', 500) }
})

// PUT /training-matrix/requirements — body { items: [{ job_role, module_id }] }. Replaces the set.
trainingMatrixRouter.put('/requirements', async (req: Request, res: Response) => {
  const tenantId = tid(req)
  const raw = Array.isArray(req.body?.items) ? req.body.items.slice(0, 5000) : []
  try {
    const moduleIds = [...new Set(raw.map((r: any) => String(r?.module_id ?? '')).filter(Boolean))]
    const modules = moduleIds.length
      ? await (prisma as any).trainingModule.findMany({ where: { id: { in: moduleIds }, ...assignableModules(tenantId) }, select: { id: true, name: true } })
      : []
    const nameById = new Map((modules as any[]).map(m => [m.id, m.name]))
    const seen = new Set<string>()
    const rows: any[] = []
    for (const r of raw) {
      const job_role = String(r?.job_role ?? '').trim().slice(0, 100)
      const module_id = String(r?.module_id ?? '')
      if (!job_role || !nameById.has(module_id)) continue
      const k = `${job_role}::${module_id}`
      if (seen.has(k)) continue
      seen.add(k)
      rows.push({ tenant_id: tenantId, job_role, module_id, module_name: nameById.get(module_id) })
    }
    await (prisma as any).$transaction([
      (prisma as any).trainingRoleRequirement.deleteMany({ where: { tenant_id: tenantId } }),
      ...(rows.length ? [(prisma as any).trainingRoleRequirement.createMany({ data: rows })] : []),
    ])
    ok(res, { count: rows.length })
  } catch (e: any) { err(res, 'SAVE_FAILED', e?.message ?? 'Could not save the requirements.', 500) }
})
