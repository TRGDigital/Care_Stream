import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { ok, err } from '../lib/response'
import {
  generateKnowledgeForPolicy,
  generateKnowledgeForAllPolicies,
  deleteKnowledgeForPolicy,
  embedManualEntry,
} from '../services/knowledge/generator'
import { deleteKnowledgeVectors } from '../services/vector/pinecone'

export const knowledgeRouter = Router()

// All knowledge routes require admin.
knowledgeRouter.use(requireAdmin)

// ─── GET /knowledge ───────────────────────────────────────────────────────────
// List all knowledge entries for the current tenant.

knowledgeRouter.get('/', async (req: Request, res: Response) => {
  const tenantId  = getTenantId()
  const page      = Math.max(1, parseInt((req.query.page  as string) || '1'))
  const limit     = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '50')))
  const sourceId  = req.query.source_id as string | undefined
  const where: Record<string, unknown> = {}
  if (sourceId) where.source_id = sourceId

  const [entries, total] = await Promise.all([
    (prisma as any).knowledgeEntry.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { created_at: 'desc' },
    }),
    (prisma as any).knowledgeEntry.count({ where }),
  ])

  ok(res, { entries, total, page, limit })
})

// ─── POST /knowledge ──────────────────────────────────────────────────────────
// Create a manual Q&A entry. Auto-embeds to Pinecone.

const CreateSchema = z.object({
  question:    z.string().min(5).max(500),
  answer:      z.string().min(5).max(5000),
  source_name: z.string().min(1).max(200).optional(),
})

knowledgeRouter.post('/', async (req: Request, res: Response) => {
  const parsed = CreateSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }
  const { question, answer, source_name } = parsed.data
  const tenantId = getTenantId()

  const entry = await (prisma as any).knowledgeEntry.create({
    data: {
      tenant_id:   tenantId,
      question,
      answer,
      source_type: 'manual',
      source_name: source_name ?? 'Manual entry',
    },
  })

  const vectorId = await embedManualEntry(tenantId, entry.id, question, answer, entry.source_name)

  const updated = await (prisma as any).knowledgeEntry.update({
    where: { id: entry.id },
    data:  { vector_id: vectorId },
  })

  ok(res, updated, 201)
})

// ─── PATCH /knowledge/:id ─────────────────────────────────────────────────────
// Update a manual entry. Re-embeds to Pinecone.

const UpdateSchema = z.object({
  question:    z.string().min(5).max(500).optional(),
  answer:      z.string().min(5).max(5000).optional(),
  source_name: z.string().min(1).max(200).optional(),
})

knowledgeRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = UpdateSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }
  const tenantId = getTenantId()
  const existing = await (prisma as any).knowledgeEntry.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })
  if (!existing) {
    err(res, 'NOT_FOUND', 'Knowledge entry not found', 404)
    return
  }
  if (existing.source_type !== 'manual') {
    err(res, 'FORBIDDEN', 'Policy-generated entries cannot be edited manually. Re-generate from the policy instead.', 403)
    return
  }

  const merged = { ...parsed.data }
  const updated = await (prisma as any).knowledgeEntry.update({
    where: { id: req.params.id },
    data:  merged,
  })

  const vectorId = await embedManualEntry(
    tenantId,
    updated.id,
    updated.question,
    updated.answer,
    updated.source_name,
  )
  await (prisma as any).knowledgeEntry.update({
    where: { id: updated.id },
    data:  { vector_id: vectorId },
  })

  ok(res, { ...updated, vector_id: vectorId })
})

// ─── DELETE /knowledge/:id ────────────────────────────────────────────────────
// Delete a single entry from DB and Pinecone.

knowledgeRouter.delete('/:id', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const existing = await (prisma as any).knowledgeEntry.findFirst({
    where: { id: req.params.id, tenant_id: tenantId },
  })
  if (!existing) {
    err(res, 'NOT_FOUND', 'Knowledge entry not found', 404)
    return
  }

  await deleteKnowledgeVectors(tenantId, [existing.id])
  await (prisma as any).knowledgeEntry.delete({ where: { id: req.params.id } })

  ok(res, { deleted: true })
})

// ─── POST /knowledge/generate/:policyId ──────────────────────────────────────
// (Re-)generate knowledge entries for one policy. Idempotent.

knowledgeRouter.post('/generate/:policyId', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const policy   = await (prisma as any).policy.findFirst({
    where:  { id: req.params.policyId, tenant_id: tenantId, status: 'active' },
    select: { id: true, name: true },
  })
  if (!policy) {
    err(res, 'NOT_FOUND', 'Active policy not found', 404)
    return
  }

  try {
    await generateKnowledgeForPolicy(tenantId, policy.id, policy.name)
    const count = await (prisma as any).knowledgeEntry.count({
      where: { tenant_id: tenantId, source_id: policy.id },
    })
    ok(res, { policy_id: policy.id, entries_generated: count })
  } catch (e) {
    console.error('[route/knowledge] generate error:', e)
    err(res, 'GENERATION_FAILED', 'Knowledge generation failed', 500)
  }
})

// ─── POST /knowledge/generate-all ────────────────────────────────────────────
// Re-generate knowledge for all active policies in the tenant.

knowledgeRouter.post('/generate-all', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const result = await generateKnowledgeForAllPolicies(tenantId)
    ok(res, result)
  } catch (e) {
    console.error('[route/knowledge] generate-all error:', e)
    err(res, 'GENERATION_FAILED', 'Bulk generation failed', 500)
  }
})

// ─── DELETE /knowledge/policy/:policyId ──────────────────────────────────────
// Delete all knowledge entries derived from a specific policy.

knowledgeRouter.delete('/policy/:policyId', async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  await deleteKnowledgeForPolicy(tenantId, req.params.policyId as string)
  ok(res, { deleted: true })
})
