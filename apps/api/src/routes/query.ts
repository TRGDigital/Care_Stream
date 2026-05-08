import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { runQueryPipeline } from '../services/rag/query'
import { ok, err } from '../lib/response'

export const queryRouter = Router()

// ─── Validation ───────────────────────────────────────────────────────────────

const QuerySchema = z.object({
  query_text:           z.string().min(1).max(2000),
  policy_id:            z.string().uuid().optional(),
  staff_name:           z.string().max(100).optional(),
  document_category:    z.enum(['internal_policy', 'staff_handbook']).optional(),
  conversation_history: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(10_000),
  })).max(20).optional(),
})

// ─── POST /query ──────────────────────────────────────────────────────────────
// Submit a chat query. Runs the full RAG pipeline and returns an HTML response.
// Available to all authenticated staff (not admin-only).

queryRouter.post('/', async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { query_text, policy_id, staff_name, document_category, conversation_history } = parsed.data
  const tenantId = getTenantId()

  let result
  try {
    result = await runQueryPipeline({
      queryText:           query_text,
      tenantId,
      userId:              req.user!.sub,
      staffName:           staff_name,
      channel:             'chat',
      policyId:            policy_id,
      selectedCategory:    document_category,
      conversationHistory: conversation_history,
    })
  } catch (e) {
    console.error('[route/query] Pipeline error:', e)
    err(res, 'QUERY_FAILED', 'Failed to process query. Please try again.', 500)
    return
  }

  ok(res, {
    responseHtml:       result.responseHtml,
    intentType:         result.intentType,
    citations:          result.citations,
    noMatch:            result.noMatch,
    languageDetected:   result.languageDetected,
    responseTimeMs:     result.responseTimeMs,
    suggestedQuestions: result.suggestedQuestions,
  })
})

// ─── GET /queries ─────────────────────────────────────────────────────────────
// List query history for the current tenant. Admin only.
// Supports filtering by intent_type, no_match, and language_detected.

queryRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const page  = Math.max(1, parseInt((req.query.page  as string) || '1'))
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20')))

  const { intent_type, no_match, language_detected, document_category } = req.query as Record<string, string>

  const where: Record<string, unknown> = { tenant_id: tenantId }
  if (intent_type)         where.intent_type                = intent_type
  if (language_detected)   where.language_detected          = language_detected
  if (document_category)   where.document_category_queried  = document_category
  if (no_match !== undefined && no_match !== '') where.no_match = no_match === 'true'

  const [queries, total] = await Promise.all([
    (prisma as any).queryRecord.findMany({
      where,
      skip:    (page - 1) * limit,
      take:    limit,
      orderBy: { created_at: 'desc' },
      select: {
        id:                        true,
        user_id:                   true,
        channel:                   true,
        query_text:                true,
        intent_type:               true,
        document_category_queried: true,
        policy_ids_cited:          true,
        no_match:                  true,
        language_detected:         true,
        response_time_ms:          true,
        created_at:                true,
        user: { select: { name: true, email: true } },
        // response_text omitted — can be large; fetch individually if needed
      },
    }),
    (prisma as any).queryRecord.count({ where }),
  ])

  ok(res, { queries, total, page, limit })
})
