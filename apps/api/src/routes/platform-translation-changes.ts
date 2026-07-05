import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { languageNameForCode } from '../data/languages'

// Platform-owner oversight of every tenant's translation overrides — what staff
// have suggested/edited, against which care setting, and its approval status.
export const platformTranslationChangesRouter = Router()
platformTranslationChangesRouter.use(requirePlatformAdmin)

// ─── GET / — all overrides across tenants (optional ?status=, ?tenant_id=) ──────
platformTranslationChangesRouter.get('/', async (req: Request, res: Response) => {
  const status = typeof req.query.status === 'string' ? req.query.status : undefined
  const tenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : undefined
  const where: any = {}
  if (status && ['pending', 'approved', 'rejected'].includes(status)) where.status = status
  if (tenantId) where.tenant_id = tenantId

  const rows = await (prisma as any).translationOverride.findMany({ where, orderBy: { updated_at: 'desc' }, take: 1000 })

  // Attach care-setting names.
  const ids = [...new Set((rows as any[]).map(r => r.tenant_id))]
  const tenants = ids.length
    ? await (prisma as any).tenant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, account_number: true } })
    : []
  const nameById = new Map((tenants as any[]).map(t => [t.id, t]))

  const changes = (rows as any[]).map(r => ({
    id: r.id,
    tenant_id: r.tenant_id,
    tenant_name: (nameById.get(r.tenant_id) as any)?.name ?? 'Unknown',
    account_number: (nameById.get(r.tenant_id) as any)?.account_number ?? '',
    lang_code: r.lang_code,
    lang_name: languageNameForCode(r.lang_code),
    source_text: r.source_text,
    machine_text: r.machine_text,
    suggested_text: r.suggested_text,
    content_kind: r.content_kind,
    context_label: r.context_label,
    status: r.status,
    suggested_by_name: r.suggested_by_name,
    reviewed_by: r.reviewed_by,
    reviewed_at: r.reviewed_at,
    created_at: r.created_at,
    updated_at: r.updated_at,
  }))

  // Simple roll-up for the header.
  const counts = { total: 0, pending: 0, approved: 0, rejected: 0 } as Record<string, number>
  for (const r of rows as any[]) { counts.total++; counts[r.status] = (counts[r.status] ?? 0) + 1 }

  ok(res, { changes, counts })
})

// ─── DELETE /:id — platform owner can remove any override ───────────────────────
platformTranslationChangesRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).translationOverride.findUnique({ where: { id } })
  if (!existing) return err(res, 'NOT_FOUND', 'Not found', 404)
  await (prisma as any).translationOverride.delete({ where: { id } })
  ok(res, { deleted: true })
})
