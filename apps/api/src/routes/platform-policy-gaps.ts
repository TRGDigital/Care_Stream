import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { facilityTypeToSetting, settingLabel } from '../lib/care-setting'
import { classifyTenantPolicies, knownPolicyTypes } from '../lib/policy-classifier'

// Platform-INTERNAL policy gap analysis. Classifies each client's policies into
// canonical types, then compares a client against peers of the same care setting
// to surface policies they're missing (a future "write & sell the gap" pipeline).
// Never exposed to tenants; no client's policy CONTENT is shared with another —
// only anonymous policy-type names + peer coverage counts.
export const platformPolicyGapsRouter = Router()
platformPolicyGapsRouter.use(requirePlatformAdmin)

// ─── GET / — clients grouped by setting, with classification coverage ──────────
platformPolicyGapsRouter.get('/', async (_req: Request, res: Response) => {
  const [tenants, counts] = await Promise.all([
    (prisma as any).tenant.findMany({ select: { id: true, name: true, account_number: true, facility_type: true } }),
    (prisma as any).policy.groupBy({
      by: ['tenant_id'],
      where: { status: 'active' },
      _count: { _all: true },
    }).catch(() => [] as any[]),
  ])
  const classified = await (prisma as any).policy.groupBy({
    by: ['tenant_id'],
    where: { status: 'active', policy_type: { not: null } },
    _count: { _all: true },
  }).catch(() => [] as any[])

  const totalById = new Map((counts as any[]).map(c => [c.tenant_id, c._count._all]))
  const classById = new Map((classified as any[]).map(c => [c.tenant_id, c._count._all]))

  const clients = (tenants as any[]).map(t => {
    const setting = facilityTypeToSetting(t.facility_type)
    return {
      id: t.id, name: t.name, account_number: t.account_number,
      setting, setting_label: settingLabel(setting),
      policies: totalById.get(t.id) ?? 0,
      classified: classById.get(t.id) ?? 0,
    }
  }).filter(c => c.policies > 0)
    .sort((a, b) => a.setting_label.localeCompare(b.setting_label) || a.name.localeCompare(b.name))

  ok(res, { clients })
})

// ─── POST /:tenantId/classify — classify this client's un-typed policies ───────
platformPolicyGapsRouter.post('/:tenantId/classify', async (req: Request, res: Response) => {
  const tenantId = String(req.params.tenantId)
  const known = await knownPolicyTypes()
  try {
    const { classified, remaining } = await classifyTenantPolicies(tenantId, known, 40)
    const total = await (prisma as any).policy.count({ where: { tenant_id: tenantId, status: 'active' } })
    ok(res, { classified, remaining, total })
  } catch (e: any) {
    err(res, 'CLASSIFY_FAILED', e.message ?? 'Classification failed', 500)
  }
})

// ─── GET /matrix?setting= — setting-wide gap matrix (the sales pipeline) ───────
// For one care setting: every assessable client (has ≥1 classified policy) × the
// peer-derived catalogue of policy types, so we can see who's missing what.
platformPolicyGapsRouter.get('/matrix', async (req: Request, res: Response) => {
  const setting = String(req.query.setting ?? '')
  if (!setting) return err(res, 'INVALID_INPUT', 'setting is required', 400)

  const allTenants = await (prisma as any).tenant.findMany({ select: { id: true, name: true, facility_type: true } })
  const inSetting = (allTenants as any[]).filter(t => facilityTypeToSetting(t.facility_type) === setting)
  const nameById = new Map(inSetting.map(t => [t.id, t.name]))
  const ids = inSetting.map(t => t.id)

  const rows = ids.length
    ? await (prisma as any).policy.findMany({
        where: { tenant_id: { in: ids }, status: 'active', policy_type: { not: null } },
        select: { tenant_id: true, policy_type: true },
      })
    : []

  // client → set of types; type → set of clients.
  const typesByClient = new Map<string, Set<string>>()
  const clientsByType = new Map<string, Set<string>>()
  for (const r of rows as any[]) {
    if (!typesByClient.has(r.tenant_id)) typesByClient.set(r.tenant_id, new Set())
    typesByClient.get(r.tenant_id)!.add(r.policy_type)
    if (!clientsByType.has(r.policy_type)) clientsByType.set(r.policy_type, new Set())
    clientsByType.get(r.policy_type)!.add(r.tenant_id)
  }
  const assessableIds = [...typesByClient.keys()]   // clients with ≥1 classified policy

  const ignores = await (prisma as any).policyTypeCuration.findMany({
    where: { status: 'ignored', OR: [{ care_setting: setting }, { care_setting: null }] }, select: { name: true },
  }).catch(() => [])
  const ignored = new Set((ignores as any[]).map(r => r.name.toLowerCase()))

  const total = assessableIds.length
  const types = [...clientsByType.entries()]
    .filter(([type]) => !ignored.has(type.toLowerCase()))
    .map(([type, haveSet]) => ({
      type,
      have_count: haveSet.size,
      have_pct: total ? Math.round((haveSet.size / total) * 100) : 0,
      missing: assessableIds.filter(id => !haveSet.has(id)).map(id => ({ id, name: nameById.get(id) ?? 'Unknown' })),
    }))
    .sort((a, b) => b.have_count - a.have_count || a.type.localeCompare(b.type))

  const expectedTypes = types.map(t => t.type)
  const clients = assessableIds.map(id => {
    const have = typesByClient.get(id) ?? new Set()
    const missing = expectedTypes.filter(t => !have.has(t)).length
    return { id, name: nameById.get(id) ?? 'Unknown', have: have.size, missing }
  }).sort((a, b) => b.missing - a.missing || a.name.localeCompare(b.name))

  ok(res, { setting, setting_label: settingLabel(setting), client_count: total, type_count: types.length, types, clients })
})

// ─── GET /:tenantId — the gap report vs peers of the same setting ──────────────
platformPolicyGapsRouter.get('/:tenantId', async (req: Request, res: Response) => {
  const tenantId = String(req.params.tenantId)
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { id: true, name: true, facility_type: true } })
  if (!tenant) return err(res, 'NOT_FOUND', 'Client not found', 404)
  const setting = facilityTypeToSetting(tenant.facility_type)

  // Every tenant's setting (facility_type → canonical), to find peers.
  const allTenants = await (prisma as any).tenant.findMany({ select: { id: true, facility_type: true } })
  const peerIds = (allTenants as any[])
    .filter(t => t.id !== tenantId && facilityTypeToSetting(t.facility_type) === setting)
    .map(t => t.id)

  // This client's classified policy types.
  const mine = await (prisma as any).policy.findMany({
    where: { tenant_id: tenantId, status: 'active' }, select: { policy_type: true },
  })
  const myTypes = new Set((mine as any[]).map(p => p.policy_type).filter(Boolean))
  const unclassified = (mine as any[]).filter(p => !p.policy_type).length

  // Peer catalogue: for each policy type, how many DISTINCT peers have it.
  const peerRows = peerIds.length
    ? await (prisma as any).policy.findMany({
        where: { tenant_id: { in: peerIds }, status: 'active', policy_type: { not: null } },
        select: { tenant_id: true, policy_type: true },
      })
    : []
  const peersWithType = new Map<string, Set<string>>()
  const peersClassified = new Set<string>()
  for (const r of peerRows as any[]) {
    peersClassified.add(r.tenant_id)
    if (!peersWithType.has(r.policy_type)) peersWithType.set(r.policy_type, new Set())
    peersWithType.get(r.policy_type)!.add(r.tenant_id)
  }
  const peerCount = peersClassified.size

  // Curation: types the admin has marked to ignore for this setting (noise).
  const ignores = await (prisma as any).policyTypeCuration.findMany({
    where: { status: 'ignored', OR: [{ care_setting: setting }, { care_setting: null }] }, select: { name: true },
  }).catch(() => [])
  const ignored = new Set((ignores as any[]).map(r => r.name.toLowerCase()))

  // Expected catalogue = types peers have (peer-derived), minus ignored.
  const expected = [...peersWithType.entries()]
    .filter(([type]) => !ignored.has(type.toLowerCase()))
    .map(([type, tenants]) => ({ type, peer_count: tenants.size, peer_pct: peerCount ? Math.round((tenants.size / peerCount) * 100) : 0 }))

  const missing = expected
    .filter(e => !myTypes.has(e.type))
    .sort((a, b) => b.peer_count - a.peer_count || a.type.localeCompare(b.type))
  const have = [...myTypes].sort()

  ok(res, {
    tenant: { id: tenant.id, name: tenant.name, setting, setting_label: settingLabel(setting) },
    peer_count: peerCount,
    unclassified,
    have,
    missing,
  })
})

// ─── POST /types/ignore — hide a noisy type from the expected catalogue ────────
platformPolicyGapsRouter.post('/types/ignore', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim()
  const care_setting = req.body?.care_setting ? String(req.body.care_setting) : null
  if (!name) return err(res, 'INVALID_INPUT', 'name is required', 400)
  await (prisma as any).policyTypeCuration.upsert({
    where:  { care_setting_name: { care_setting, name } },
    update: { status: 'ignored' },
    create: { care_setting, name, status: 'ignored' },
  }).catch(() => {})
  ok(res, { ignored: true })
})

// ─── POST /types/restore — bring an ignored type back ──────────────────────────
platformPolicyGapsRouter.post('/types/restore', async (req: Request, res: Response) => {
  const name = String(req.body?.name ?? '').trim()
  const care_setting = req.body?.care_setting ? String(req.body.care_setting) : null
  if (!name) return err(res, 'INVALID_INPUT', 'name is required', 400)
  await (prisma as any).policyTypeCuration.deleteMany({ where: { care_setting, name } }).catch(() => {})
  ok(res, { restored: true })
})
