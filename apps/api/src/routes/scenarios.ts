import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'

// Scenario pages kept in the database: the ones the nightly routine writes as drafts and the platform publishes.
// (The older pages live in the repository, apps/web/src/data/scenarios, and are merged with these by the web app.)

export const publicScenariosRouter = Router()
export const scenariosAdminRouter = Router()

// GET /public/scenarios: published pages in full (the web app merges them with the repository ones). Cached for a minute.
publicScenariosRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await (prisma as any).scenarioPage.findMany({ where: { status: 'published' }, orderBy: [{ sort_order: 'asc' }, { slug: 'asc' }], select: { data: true, status: true, sort_order: true } })
  res.setHeader('Cache-Control', 'public, max-age=0, s-maxage=60, stale-while-revalidate=120')
  ok(res, { scenarios: rows.map((r: any) => ({ ...r.data, status: 'published', order: r.sort_order })) })
})

scenariosAdminRouter.use(requirePlatformAdmin)

// GET /admin/scenarios: every database scenario with its status (full data for the preview is a separate call).
scenariosAdminRouter.get('/', async (_req: Request, res: Response) => {
  const rows = await (prisma as any).scenarioPage.findMany({ orderBy: [{ sort_order: 'asc' }, { slug: 'asc' }], select: { slug: true, status: true, sort_order: true, data: true, created_at: true, published_at: true } })
  ok(res, { scenarios: rows.map((r: any) => ({ ...r.data, slug: r.slug, status: r.status, order: r.sort_order, created_at: r.created_at, published_at: r.published_at })) })
})

scenariosAdminRouter.get('/:slug', async (req: Request, res: Response) => {
  const r = await (prisma as any).scenarioPage.findUnique({ where: { slug: String(req.params.slug) } })
  if (!r) { err(res, 'NOT_FOUND', 'Scenario not found.', 404); return }
  ok(res, { scenario: { ...r.data, slug: r.slug, status: r.status, order: r.sort_order } })
})

// PATCH /admin/scenarios/:slug/status  { status: 'published' | 'draft' }
scenariosAdminRouter.patch('/:slug/status', async (req: Request, res: Response) => {
  const status = req.body?.status
  if (status !== 'published' && status !== 'draft') { err(res, 'VALIDATION_ERROR', "status must be 'published' or 'draft'."); return }
  const slug = String(req.params.slug)
  const r = await (prisma as any).scenarioPage.findUnique({ where: { slug } })
  if (!r) { err(res, 'NOT_FOUND', 'Scenario not found.', 404); return }
  const row = await (prisma as any).scenarioPage.update({ where: { slug }, data: { status, published_at: status === 'published' ? (r.published_at ?? new Date()) : r.published_at } })
  ok(res, { slug: row.slug, status: row.status })
})

// DELETE /admin/scenarios/:slug: only a draft can be deleted.
scenariosAdminRouter.delete('/:slug', async (req: Request, res: Response) => {
  const slug = String(req.params.slug)
  const r = await (prisma as any).scenarioPage.findUnique({ where: { slug } })
  if (!r) { err(res, 'NOT_FOUND', 'Scenario not found.', 404); return }
  if (r.status !== 'draft') { err(res, 'NOT_DRAFT', 'Unpublish the page before deleting it.'); return }
  await (prisma as any).scenarioPage.delete({ where: { slug } })
  ok(res, { deleted: slug })
})
