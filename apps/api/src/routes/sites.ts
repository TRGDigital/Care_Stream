import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { generateAccessToken, generateRefreshToken } from '../services/auth/tokens'
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
      branding_signoff:    `The ${name.trim()} Team`,
    },
  })

  // Issue tokens so the admin can switch to the new site immediately
  const accessToken  = generateAccessToken({ sub: req.user!.sub, tenant_id: newTenant.id, role: 'admin' })
  const refreshToken = generateRefreshToken(req.user!.sub)

  ok(res, {
    tenant:        { id: newTenant.id, name: newTenant.name, slug: newTenant.slug },
    access_token:  accessToken,
    refresh_token: refreshToken,
  })
})
