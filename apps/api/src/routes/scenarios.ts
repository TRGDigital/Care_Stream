import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { validateScenario } from '../lib/scenario-validate'

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

// POST /admin/scenarios/import  { scenarios: [page] }  (at most 10). Saves pages written outside the nightly queue (for example a batch written in a
// session) as DRAFTS, like Import drafts on the blog. Never publishes. An existing page is left alone unless it is still a DRAFT and the file
// says replace_draft: true for it; a published page is never overwritten. Structural problems (missing keys, dashes,
// forbidden HTML or claims, a bad slug) refuse the page; quality points the owner fixes in review (image, keywords, link domains, word counts,
// read next targets) are saved WITH the page and returned as notes.
const SOFT = /^(image must be|keywords not used|primary keyword used|secondary keyword|external link domain|read_next slug|words)/i

/** Saves scenario pages as DRAFTS. Never publishes; replaces an existing page only if it is a draft and carries replace_draft: true. See the route comment above for what refuses a page. */
export async function importScenarioDrafts(list: any[]) {
  const posts = await (prisma as any).blogPost.findMany({ select: { slug: true } })   // drafts count too: a read next may point at a post still to be published
  const blogSlugs = posts.map((p: any) => p.slug)
  const created: Array<{ slug: string; notes: string[] }> = []
  const updated: Array<{ slug: string; notes: string[] }> = []
  const skipped: Array<{ slug: string; reason: string[] }> = []
  for (const raw of list) {
    const { replace_draft: replace, ...page } = raw ?? {}
    const slug = String(page?.slug ?? '')
    const existing = await (prisma as any).scenarioPage.findUnique({ where: { slug } }).catch(() => null)
    if (existing && !(replace === true && existing.status === 'draft')) { skipped.push({ slug, reason: ['A page with this slug already exists. Nothing was changed.'] }); continue }
    const data = { ...page, status: 'draft' }
    const v = validateScenario(data, { expected: { primary: String(page?.primary_keyword ?? ''), secondary: Array.isArray(page?.secondary_keywords) ? page.secondary_keywords : [] }, blogSlugs })
    const hard = v.errors.filter(e => !SOFT.test(e))
    if (hard.length) { skipped.push({ slug, reason: hard.slice(0, 12) }); continue }
    const order = Number(page?.order) > 0 ? Number(page.order) : 9999
    const notes = [...v.errors.filter(e => SOFT.test(e)), ...v.warnings].slice(0, 12)
    if (existing) {
      // Matched on status too, so a page published since the lookup is not overwritten.
      const r = await (prisma as any).scenarioPage.updateMany({ where: { slug, status: 'draft' }, data: { sort_order: order, data: { ...data, order } } })
      if (r.count) updated.push({ slug, notes }); else skipped.push({ slug, reason: ['The page is no longer a draft. Nothing was changed.'] })
      continue
    }
    await (prisma as any).scenarioPage.create({ data: { slug, status: 'draft', sort_order: order, data: { ...data, order } } })
    created.push({ slug, notes })
  }
  return { created, updated, skipped }
}

scenariosAdminRouter.post('/import', async (req: Request, res: Response) => {
  const list = Array.isArray(req.body?.scenarios) ? req.body.scenarios.slice(0, 10) : []
  if (!list.length) { err(res, 'VALIDATION_ERROR', 'scenarios must be a non empty array.'); return }
  ok(res, await importScenarioDrafts(list))
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
