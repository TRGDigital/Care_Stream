import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'

// §6 — Tenant-facing regulation knowledge base routes.
// Mounted at /regulations in app.ts, behind requireAuth + tenantGuard.
// Read-only — the platform team syncs content via POST /admin/regulations/sync.

export const regulationsRouter = Router()

// ─── GET /regulations ─────────────────────────────────────────────────────────
// List all active external regulations, paginated.
// Query params: page (default 1), limit (default 20, max 100)

regulationsRouter.get('/', async (req: Request, res: Response) => {
  const page  = Math.max(1, parseInt(String(req.query.page  ?? 1), 10)  || 1)
  const limit = Math.min(100, Math.max(1, parseInt(String(req.query.limit ?? 20), 10) || 20))
  const skip  = (page - 1) * limit

  try {
    const [items, total] = await Promise.all([
      (prisma as any).externalRegulation.findMany({
        where:   { is_active: true },
        orderBy: { official_name: 'asc' },
        skip,
        take:    limit,
        select: {
          reference_key:  true,
          official_name:  true,
          also_known_as:  true,
          summary:        true,
          last_synced_at: true,
        },
      }),
      (prisma as any).externalRegulation.count({ where: { is_active: true } }),
    ])

    ok(res, {
      items,
      pagination: {
        page,
        limit,
        total,
        pages: Math.ceil(total / limit),
      },
    })
  } catch (e) {
    console.error('[regulations/list] Failed:', e)
    err(res, 'INTERNAL_ERROR', 'Failed to fetch regulations.', 500)
  }
})

// ─── GET /regulations/:key ────────────────────────────────────────────────────
// Return the full knowledge base entry for a single regulation by reference_key.

regulationsRouter.get('/:key', async (req: Request, res: Response) => {
  const { key } = req.params

  try {
    const regulation = await (prisma as any).externalRegulation.findUnique({
      where: { reference_key: key.toLowerCase() },
    })

    if (!regulation || !regulation.is_active) {
      err(res, 'NOT_FOUND', 'Regulation not found.', 404)
      return
    }

    ok(res, regulation)
  } catch (e) {
    console.error('[regulations/get] Failed:', e)
    err(res, 'INTERNAL_ERROR', 'Failed to fetch regulation.', 500)
  }
})
