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
  chat_session_id:      z.string().uuid().optional(),
  conversation_history: z.array(z.object({
    role:    z.enum(['user', 'assistant']),
    content: z.string().max(10_000),
  })).max(20).optional(),
})

// ─── POST /query ──────────────────────────────────────────────────────────────

queryRouter.post('/', async (req: Request, res: Response) => {
  const parsed = QuerySchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }

  const { query_text, policy_id, staff_name, document_category, chat_session_id, conversation_history } = parsed.data
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
      chatSessionId:       chat_session_id,
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

// ─── PATCH /query/session/:sessionId/delete ──────────────────────────────────
// Called by the chat UI when a staff member removes a session from their history.
// Marks records as deleted (chat_deleted_at) but keeps them for admin reporting.

queryRouter.patch('/session/:sessionId/delete', async (req: Request, res: Response) => {
  const tenantId  = getTenantId()
  const sessionId = req.params.sessionId

  await prisma.$executeRaw`
    UPDATE queries
    SET chat_deleted_at = NOW()
    WHERE tenant_id = ${tenantId}
    AND (
      chat_session_id = ${sessionId}
      OR (chat_session_id IS NULL AND id::text = ${sessionId})
    )
  `

  ok(res, { deleted: true })
})

// ─── GET /query — session detail ──────────────────────────────────────────────
// ?session_id=<uuid>  → all messages for one chat session (admin only)

queryRouter.get('/session/:sessionId', requireAdmin, async (req: Request, res: Response) => {
  const tenantId  = getTenantId()
  const sessionId = req.params.sessionId

  const messages = await (prisma as any).queryRecord.findMany({
    where:   { tenant_id: tenantId, chat_session_id: sessionId },
    orderBy: { created_at: 'asc' },
    select: {
      id:            true,
      query_text:    true,
      response_text: true,
      no_match:      true,
      created_at:    true,
      language_detected: true,
      response_time_ms:  true,
    },
  })

  ok(res, { messages })
})

// ─── GET /query — session list ────────────────────────────────────────────────
// Returns one row per chat session (grouped by chat_session_id).
// Standalone queries (no session id) each appear as their own row.
// Supports filtering by document_category, no_match, language_detected.

queryRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const page  = Math.max(1, parseInt((req.query.page  as string) || '1'))
  const limit = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20')))
  const offset = (page - 1) * limit

  const { no_match, language_detected, document_category } = req.query as Record<string, string>

  // Build optional WHERE clauses (appended after tenant filter)
  const conditions: string[] = [`q.tenant_id = '${tenantId}'`]
  if (document_category)  conditions.push(`q.document_category_queried = '${document_category}'`)
  if (language_detected)  conditions.push(`q.language_detected = '${language_detected}'`)
  if (no_match === 'true')  conditions.push(`q.no_match = true`)
  if (no_match === 'false') conditions.push(`q.no_match = false`)

  const whereClause = conditions.join(' AND ')

  // One row per session: pick the earliest message as the "title", aggregate the rest
  const rawSessions: any[] = await prisma.$queryRawUnsafe(`
    WITH session_data AS (
      SELECT
        q.id,
        COALESCE(q.chat_session_id::text, q.id::text)  AS session_key,
        q.chat_session_id,
        q.query_text,
        q.response_text,
        q.document_category_queried,
        q.no_match,
        q.language_detected,
        q.channel,
        q.user_id,
        q.created_at,
        ROW_NUMBER() OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
          ORDER BY q.created_at ASC
        ) AS rn,
        COUNT(*) OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
        ) AS message_count,
        MAX(q.created_at) OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
        ) AS last_message_at,
        BOOL_OR(q.no_match) OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
        ) AS any_no_match,
        SUM(q.response_time_ms) OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
        ) AS total_response_time_ms,
        MIN(q.created_at) OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
        ) AS started_at,
        BOOL_OR(q.chat_deleted_at IS NOT NULL) OVER (
          PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)
        ) AS deleted_from_chat
      FROM queries q
      WHERE ${whereClause}
    )
    SELECT
      sd.session_key,
      sd.chat_session_id,
      sd.id,
      sd.query_text        AS first_query,
      sd.response_text,
      sd.document_category_queried,
      sd.language_detected,
      sd.channel,
      sd.user_id,
      sd.message_count::int,
      sd.last_message_at,
      sd.any_no_match,
      sd.total_response_time_ms::int,
      sd.started_at,
      sd.deleted_from_chat,
      sd.created_at,
      u.name               AS user_name,
      u.email              AS user_email
    FROM session_data sd
    LEFT JOIN users u ON sd.user_id = u.id
    WHERE sd.rn = 1
    ORDER BY sd.last_message_at DESC
    LIMIT ${limit} OFFSET ${offset}
  `)

  const totalRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT COALESCE(chat_session_id::text, id::text))::int AS total
    FROM queries q
    WHERE ${whereClause}
  `)

  const total = Number(totalRows[0]?.total ?? 0)

  // Shape into a clean response (attach user as sub-object)
  const sessions = rawSessions.map((r: any) => ({
    session_key:               r.session_key,
    chat_session_id:           r.chat_session_id,
    id:                        r.id,
    first_query:               r.first_query,
    response_text:             r.response_text,
    document_category_queried: r.document_category_queried,
    language_detected:         r.language_detected,
    channel:                   r.channel,
    message_count:             Number(r.message_count),
    last_message_at:           r.last_message_at,
    started_at:                r.started_at,
    any_no_match:              r.any_no_match,
    total_response_time_ms:    Number(r.total_response_time_ms ?? 0),
    deleted_from_chat:         r.deleted_from_chat ?? false,
    created_at:                r.created_at,
    user: r.user_name ? { name: r.user_name, email: r.user_email } : null,
  }))

  ok(res, { queries: sessions, total, page, limit })
})
