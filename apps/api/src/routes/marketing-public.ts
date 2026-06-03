import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { sendLeadNotificationEmail } from '../services/email/outbound'

// Public, unauthenticated marketing endpoints. Mounted BEFORE requireAuth in app.ts.
// Platform-level (no tenant scoping).
//   POST /public/marketing/leads        — contact + demo form submissions
//   POST /public/marketing/agent-events — WebMCP tool-invocation tracking beacons

export const marketingPublicRouter = Router()

// ─── Leads ──────────────────────────────────────────────────────────────────
const leadSchema = z.object({
  type:         z.enum(['contact', 'demo']),
  name:         z.string().trim().min(1).max(200),
  email:        z.string().trim().email().max(320),
  organisation: z.string().trim().max(200).optional().nullable(),
  role:         z.string().trim().max(200).optional().nullable(),
  phone:        z.string().trim().max(60).optional().nullable(),
  homes:        z.string().trim().max(40).optional().nullable(),
  subject:      z.string().trim().max(120).optional().nullable(),
  message:      z.string().trim().max(5000).optional().nullable(),
  source:       z.enum(['web', 'agent']).optional(),
})

marketingPublicRouter.post('/leads', async (req: Request, res: Response) => {
  const parsed = leadSchema.safeParse(req.body ?? {})
  if (!parsed.success) {
    err(res, 'INVALID_INPUT', 'Please check the form fields and try again.', 400)
    return
  }
  const d = parsed.data
  const source = d.source ?? 'web'

  try {
    await prisma.marketingLead.create({
      data: {
        type:         d.type,
        name:         d.name,
        email:        d.email,
        organisation: d.organisation ?? null,
        role:         d.role ?? null,
        phone:        d.phone ?? null,
        homes:        d.homes ?? null,
        subject:      d.subject ?? null,
        message:      d.message ?? null,
        source,
        user_agent:   String(req.headers['user-agent'] ?? '').slice(0, 500) || null,
      },
    })
  } catch (e) {
    console.error('[leads] failed to persist lead:', (e as Error)?.message)
    err(res, 'INTERNAL_ERROR', 'Could not submit right now — please try again.', 500)
    return
  }

  // Notify sales — best-effort, never block the response on email delivery.
  sendLeadNotificationEmail({
    type:         d.type,
    source,
    name:         d.name,
    email:        d.email,
    organisation: d.organisation,
    role:         d.role,
    phone:        d.phone,
    homes:        d.homes,
    subject:      d.subject,
    message:      d.message,
  }).catch(e => console.error('[leads] notification email failed:', (e as Error)?.message))

  ok(res, { received: true })
})

// ─── Agent events (WebMCP tracking) ───────────────────────────────────────────
const eventSchema = z.object({
  tool_name: z.string().trim().min(1).max(128),
  path:      z.string().trim().max(300).optional().nullable(),
  status:    z.enum(['ok', 'error']).optional(),
  source:    z.enum(['webmcp', 'mcp-server']).optional(),
})

marketingPublicRouter.post('/agent-events', async (req: Request, res: Response) => {
  const parsed = eventSchema.safeParse(req.body ?? {})
  // Tracking must never error back to the page — silently accept invalid beacons.
  if (!parsed.success) { res.status(204).end(); return }
  const d = parsed.data

  try {
    await prisma.agentEvent.create({
      data: {
        tool_name:  d.tool_name,
        source:     d.source ?? 'webmcp',
        path:       d.path ?? null,
        status:     d.status ?? 'ok',
        user_agent: String(req.headers['user-agent'] ?? '').slice(0, 500) || null,
      },
    })
  } catch (e) {
    console.error('[agent-events] failed to record:', (e as Error)?.message)
  }
  res.status(204).end()
})
