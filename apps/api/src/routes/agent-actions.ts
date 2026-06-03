import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { requireAdmin } from '../middleware/auth'
import { ok } from '../lib/response'

// Authenticated audit log for confirmed, agent-initiated MUTATIONS performed via
// WebMCP tenant tools (Phase 3). Mounted AFTER requireAuth + tenantGuard, so the
// tenant comes from the JWT context — an agent can only ever log under its own
// tenant. Admin-only (the mutating tools are admin-only). Writes one enriched
// row to agent_events with tenant_id / user_id / summary / mutation / confirmed.

export const agentActionsRouter = Router()

const actionSchema = z.object({
  tool_name: z.string().trim().min(1).max(128),
  summary:   z.string().trim().min(1).max(1000),
  confirmed: z.boolean(),
  status:    z.enum(['ok', 'error', 'declined']).optional(),
  path:      z.string().trim().max(300).optional().nullable(),
})

agentActionsRouter.post('/', requireAdmin, async (req: Request, res: Response) => {
  const parsed = actionSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    res.status(400).json({ success: false, error: { code: 'INVALID_INPUT', message: 'Invalid agent action.' } })
    return
  }
  const d = parsed.data
  const tenantId = getTenantId()

  try {
    await prisma.agentEvent.create({
      data: {
        tool_name:  d.tool_name,
        source:     'webmcp',
        mutation:   true,
        confirmed:  d.confirmed,
        summary:    d.summary,
        status:     d.status ?? (d.confirmed ? 'ok' : 'declined'),
        tenant_id:  tenantId ?? null,
        user_id:    req.user?.sub ?? null,
        path:       d.path ?? null,
        user_agent: String(req.headers['user-agent'] ?? '').slice(0, 500) || null,
      },
    })
  } catch (e) {
    console.error('[agent-actions] failed to record:', (e as Error)?.message)
    res.status(500).json({ success: false, error: { code: 'INTERNAL_ERROR', message: 'Could not record action.' } })
    return
  }

  ok(res, { logged: true })
})
