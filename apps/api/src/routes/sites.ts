import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { generateAccessToken } from '../services/auth/tokens'
import { issueRefreshToken } from '../lib/refresh-tokens'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'

export const sitesRouter = Router()

sitesRouter.use(requireAdmin)

// ─── GET /sites ───────────────────────────────────────────────────────────────
// List all sites in the caller's group (root + sub-tenants).

sitesRouter.get('/', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const currentTenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { id: true, parent_tenant_id: true },
  })

  const groupRootId = currentTenant?.parent_tenant_id ?? tenantId

  const all = await (prisma as any).tenant.findMany({
    where: {
      OR: [
        { id: groupRootId },
        { parent_tenant_id: groupRootId },
      ],
    },
    select: { id: true, name: true, slug: true, subscription_status: true, parent_tenant_id: true },
    orderBy: { created_at: 'asc' },
  })

  const sites = all.map((t: any) => ({
    id:                  t.id,
    name:                t.name,
    slug:                t.slug,
    subscription_status: t.subscription_status,
    is_current:          t.id === tenantId,
    is_root:             t.parent_tenant_id === null,
  }))

  ok(res, { sites, group_root_id: groupRootId })
})

// ─── GET /sites/overview ──────────────────────────────────────────────────────
// Group console: a compliance rollup + benchmarking across every site in the
// caller's group (training, onboarding and audits), plus a group summary. The
// site set is derived server-side from the caller's own group, so it can never
// span another group.

sitesRouter.get('/overview', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const current = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { id: true, parent_tenant_id: true },
  })
  const groupRootId = current?.parent_tenant_id ?? tenantId

  const tenants = await (prisma as any).tenant.findMany({
    where:   { OR: [{ id: groupRootId }, { parent_tenant_id: groupRootId }] },
    select:  { id: true, name: true, account_number: true, subscription_status: true, parent_tenant_id: true },
    orderBy: { created_at: 'asc' },
  })
  const siteIds: string[] = tenants.map((t: any) => t.id)

  const [staffGroups, trainingGroups, onboardingRows, auditGroups] = await Promise.all([
    (prisma as any).user.groupBy({
      by: ['tenant_id'],
      where: { tenant_id: { in: siteIds }, is_active: true },
      _count: { _all: true },
    }),
    (prisma as any).trainingEnrollment.groupBy({
      by: ['tenant_id', 'status'],
      where: { tenant_id: { in: siteIds } },
      _count: { _all: true },
    }),
    (prisma as any).onboardingEnrollment.findMany({
      where:  { tenant_id: { in: siteIds } },
      select: { tenant_id: true, completed_at: true, due_date: true },
    }),
    (prisma as any).auditRun.groupBy({
      by: ['tenant_id', 'status'],
      where: { tenant_id: { in: siteIds } },
      _count: { _all: true },
    }),
  ])

  const staffByTenant = new Map<string, number>()
  for (const g of staffGroups) staffByTenant.set(g.tenant_id, g._count._all)

  const trainingByTenant = new Map<string, { complete: number; total: number; expired: number }>()
  for (const g of trainingGroups) {
    const t = trainingByTenant.get(g.tenant_id) ?? { complete: 0, total: 0, expired: 0 }
    t.total += g._count._all
    if (g.status === 'complete') t.complete += g._count._all
    if (g.status === 'expired')  t.expired  += g._count._all
    trainingByTenant.set(g.tenant_id, t)
  }

  const now = Date.now()
  const onboardingByTenant = new Map<string, { complete: number; total: number; overdue: number }>()
  for (const r of onboardingRows) {
    const o = onboardingByTenant.get(r.tenant_id) ?? { complete: 0, total: 0, overdue: 0 }
    o.total += 1
    if (r.completed_at) o.complete += 1
    else if (r.due_date && new Date(r.due_date).getTime() < now) o.overdue += 1
    onboardingByTenant.set(r.tenant_id, o)
  }

  const auditByTenant = new Map<string, { completed: number; total: number }>()
  for (const g of auditGroups) {
    const a = auditByTenant.get(g.tenant_id) ?? { completed: 0, total: 0 }
    a.total += g._count._all
    if (g.status === 'completed') a.completed += g._count._all
    auditByTenant.set(g.tenant_id, a)
  }

  const pct = (num: number, den: number): number | null => den > 0 ? Math.round((num / den) * 100) : null
  const avgDefined = (vals: Array<number | null>): number | null => {
    const d = vals.filter((v): v is number => v !== null)
    return d.length ? Math.round(d.reduce((s, v) => s + v, 0) / d.length) : null
  }

  const sites = tenants.map((t: any) => {
    const tr = trainingByTenant.get(t.id)   ?? { complete: 0, total: 0, expired: 0 }
    const ob = onboardingByTenant.get(t.id) ?? { complete: 0, total: 0, overdue: 0 }
    const au = auditByTenant.get(t.id)      ?? { completed: 0, total: 0 }
    const training   = { complete: tr.complete, total: tr.total, pct: pct(tr.complete, tr.total) }
    const onboarding = { complete: ob.complete, total: ob.total, overdue: ob.overdue, pct: pct(ob.complete, ob.total) }
    const audits     = { completed: au.completed, total: au.total, pct: pct(au.completed, au.total) }
    return {
      id:                  t.id,
      name:                t.name,
      account_number:      t.account_number,
      subscription_status: t.subscription_status,
      is_current:          t.id === tenantId,
      is_root:             t.parent_tenant_id === null,
      staff:               staffByTenant.get(t.id) ?? 0,
      training, onboarding, audits,
      overdue:             ob.overdue + tr.expired,   // overdue inductions + expired training
      overall_pct:         avgDefined([training.pct, onboarding.pct, audits.pct]),
    }
  })

  const pool = (fn: (s: typeof sites[number]) => { n: number; d: number }): number | null => {
    let n = 0, d = 0
    for (const s of sites) { const r = fn(s); n += r.n; d += r.d }
    return pct(n, d)
  }
  const summary = {
    sites:          sites.length,
    staff:          sites.reduce((acc: number, x: any) => acc + x.staff, 0),
    training_pct:   pool(s => ({ n: s.training.complete,   d: s.training.total })),
    onboarding_pct: pool(s => ({ n: s.onboarding.complete, d: s.onboarding.total })),
    audit_pct:      pool(s => ({ n: s.audits.completed,    d: s.audits.total })),
    overall_pct:    avgDefined(sites.map((s: any) => s.overall_pct)),
  }

  ok(res, { group_root_id: groupRootId, current_tenant_id: tenantId, is_group: sites.length > 1, sites, summary })
})

// ─── POST /sites ──────────────────────────────────────────────────────────────
// Self-service: tenant admin adds a new sub-tenant to their group.

sitesRouter.post('/', async (req: Request, res: Response) => {
  const adminTenantId = req.user!.tenant_id
  const { name } = req.body ?? {}

  if (!name?.trim()) {
    err(res, 'VALIDATION_ERROR', 'Site name is required.'); return
  }

  const currentTenant = await (prisma as any).tenant.findUnique({
    where:  { id: adminTenantId },
    select: { id: true, parent_tenant_id: true },
  })

  // Always attach to the group root (can't nest sub-tenants under sub-tenants)
  const groupRootId = currentTenant?.parent_tenant_id ?? adminTenantId

  // Generate a unique slug from the name + short timestamp suffix
  const base = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  const suffix = Date.now().toString(36)
  let slug = `${base}-${suffix}`
  // Ensure uniqueness (collision is extremely unlikely with timestamp suffix, but check anyway)
  while (await (prisma as any).tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${Date.now().toString(36)}`
  }

  const newTenant = await (prisma as any).tenant.create({
    data: {
      name:                name.trim(),
      slug,
      email_domain:        slug,
      parent_tenant_id:    groupRootId,
      subscription_status: 'active',
      branding_signoff:    'The CareStream Team',
    },
  })

  // Issue tokens so the admin can switch to the new site immediately
  const accessToken  = generateAccessToken({ sub: req.user!.sub, tenant_id: newTenant.id, role: 'admin' })
  const refreshToken = await issueRefreshToken(req.user!.sub)

  ok(res, {
    tenant:        { id: newTenant.id, name: newTenant.name, slug: newTenant.slug },
    access_token:  accessToken,
    refresh_token: refreshToken,
  })
})
