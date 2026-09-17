// Platform: the shared built-in audits (/platform/audit-seeds). These routes went missing from
// admin.ts at some point, leaving the platform editor calling endpoints that did not exist.
// Edits reach every home's audits, so they go through the same versioned editor homes use: a
// question that already has answers is retired and replaced rather than rewritten.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { parseEditorPayload, saveTemplateStructure } from '../services/audits/template-editor'
import { ensurePlatformTemplatesSeeded } from './audits'

export const auditSeedsAdminRouter = Router()
auditSeedsAdminRouter.use(requirePlatformAdmin)

const withActiveQuestions = {
  sections: {
    orderBy: { section_order: 'asc' },
    include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } },
  },
} as const

// GET /admin/audit-seeds
auditSeedsAdminRouter.get('/', async (_req: Request, res: Response) => {
  await ensurePlatformTemplatesSeeded()
  const templates = await (prisma as any).auditTemplate.findMany({
    where: { is_seed: true, tenant_id: null },
    include: withActiveQuestions,
    orderBy: { name: 'asc' },
  })
  ok(res, { templates, total: templates.length })
})

// PATCH /admin/audit-seeds/:id — body { name?, description?, frequency?, subject_scope?, requires_shift?, sections }
auditSeedsAdminRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const seed = await (prisma as any).auditTemplate.findFirst({ where: { id, is_seed: true, tenant_id: null }, select: { id: true } })
  if (!seed) { err(res, 'NOT_FOUND', 'Audit seed not found', 404); return }
  // The platform editor only sends wording and type. Keep a question's settings, condition and CQC
  // tag when the payload leaves them out, so a wording fix never strips them.
  const existing = await (prisma as any).auditQuestion.findMany({
    where: { section: { template_id: id } },
    select: { id: true, settings: true, show_if: true, quality_statement_id: true },
  })
  const byId = new Map<string, any>((existing as any[]).map(q => [q.id, q]))
  for (const s of Array.isArray(req.body?.sections) ? req.body.sections : []) {
    for (const q of Array.isArray(s?.questions) ? s.questions : []) {
      const cur = q?.id ? byId.get(String(q.id)) : null
      if (!cur) continue
      if (!('settings' in q)) q.settings = cur.settings
      if (!('show_if' in q)) q.show_if = cur.show_if?.question_id ? { key: cur.show_if.question_id, equals: cur.show_if.equals } : null
      if (!('quality_statement_id' in q)) q.quality_statement_id = cur.quality_statement_id
    }
  }
  const parsed = parseEditorPayload(req.body)
  if ('error' in parsed) { err(res, 'VALIDATION_ERROR', parsed.error, 400); return }
  try {
    await saveTemplateStructure(id, parsed.payload, { changedBy: 'CareStream' })
    const template = await (prisma as any).auditTemplate.findUnique({ where: { id }, include: withActiveQuestions })
    ok(res, { template })
  } catch (e: any) { err(res, 'SAVE_FAILED', e?.message ?? 'Could not save the audit.', 500) }
})

// PATCH /admin/audit-seeds/:id/reviewed — body { reviewed }
auditSeedsAdminRouter.patch('/:id/reviewed', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const seed = await (prisma as any).auditTemplate.findFirst({ where: { id, is_seed: true, tenant_id: null }, select: { id: true } })
  if (!seed) { err(res, 'NOT_FOUND', 'Audit seed not found', 404); return }
  const reviewed = req.body?.reviewed !== false
  const updated = await (prisma as any).auditTemplate.update({
    where: { id },
    data: { seed_reviewed: reviewed, seed_reviewed_at: reviewed ? new Date() : null },
    select: { id: true, seed_reviewed: true, seed_reviewed_at: true },
  })
  ok(res, updated)
})
