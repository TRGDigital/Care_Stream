import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { languageNameForCode } from '../data/languages'

// Tenant-admin review queue for human-verified translation overrides. Staff submit
// suggestions from the hub (POST /me/translation-suggestion); admins approve, edit
// or reject them here. Approved rows are served by apps/api/src/lib/overrides.ts.
export const translationSuggestionsRouter = Router()

function adminOnly(req: Request, res: Response): boolean {
  if ((req as any).user?.role !== 'admin') { err(res, 'FORBIDDEN', 'Admins only', 403); return false }
  return true
}

function shape(o: any) {
  return {
    id: o.id,
    lang_code: o.lang_code,
    lang_name: languageNameForCode(o.lang_code),
    source_text: o.source_text,
    machine_text: o.machine_text,
    suggested_text: o.suggested_text,
    content_kind: o.content_kind,
    context_label: o.context_label,
    status: o.status,
    suggested_by_name: o.suggested_by_name,
    reviewed_by: o.reviewed_by,
    reviewed_at: o.reviewed_at,
    created_at: o.created_at,
    updated_at: o.updated_at,
  }
}

// ─── GET / — list this tenant's suggestions (optional ?status=) ─────────────────
translationSuggestionsRouter.get('/', async (req: Request, res: Response) => {
  if (!adminOnly(req, res)) return
  const tenantId = (req as any).user.tenant_id
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const where: any = { tenant_id: tenantId }
  if (status && ['pending', 'approved', 'rejected'].includes(status)) where.status = status

  const [rows, pending] = await Promise.all([
    (prisma as any).translationOverride.findMany({ where, orderBy: [{ status: 'asc' }, { updated_at: 'desc' }], take: 500 }),
    (prisma as any).translationOverride.count({ where: { tenant_id: tenantId, status: 'pending' } }),
  ])
  ok(res, { suggestions: (rows as any[]).map(shape), pending_count: pending })
})

// ─── PATCH /:id — approve / edit / reject ───────────────────────────────────────
translationSuggestionsRouter.patch('/:id', async (req: Request, res: Response) => {
  if (!adminOnly(req, res)) return
  const tenantId = (req as any).user.tenant_id
  const reviewer = (req as any).user.name || (req as any).user.email || 'Admin'
  const id = String(req.params.id)
  const { action, suggested_text } = req.body ?? {}

  const existing = await (prisma as any).translationOverride.findFirst({ where: { id, tenant_id: tenantId } })
  if (!existing) return err(res, 'NOT_FOUND', 'Suggestion not found', 404)

  const data: Record<string, any> = { updated_at: new Date() }
  if (typeof suggested_text === 'string' && suggested_text.trim()) data.suggested_text = suggested_text.trim()
  if (action === 'approve') { data.status = 'approved'; data.reviewed_by = reviewer; data.reviewed_at = new Date() }
  else if (action === 'reject') { data.status = 'rejected'; data.reviewed_by = reviewer; data.reviewed_at = new Date() }
  else if (action === 'pending') { data.status = 'pending'; data.reviewed_by = ''; data.reviewed_at = null }
  else if (suggested_text === undefined) return err(res, 'INVALID_INPUT', 'action must be approve, reject or pending', 400)

  const updated = await (prisma as any).translationOverride.update({ where: { id }, data })
  ok(res, { suggestion: shape(updated) })
})

// ─── DELETE /:id ────────────────────────────────────────────────────────────────
translationSuggestionsRouter.delete('/:id', async (req: Request, res: Response) => {
  if (!adminOnly(req, res)) return
  const tenantId = (req as any).user.tenant_id
  const id = String(req.params.id)
  const existing = await (prisma as any).translationOverride.findFirst({ where: { id, tenant_id: tenantId } })
  if (!existing) return err(res, 'NOT_FOUND', 'Suggestion not found', 404)
  await (prisma as any).translationOverride.delete({ where: { id } })
  ok(res, { deleted: true })
})
