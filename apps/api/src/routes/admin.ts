import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { requirePlatformAdmin } from '../middleware/auth'
import { syncRegulationsFromSheets } from '../services/regulations/sheets-sync'
import { prisma } from '../db/client'
import { embedTexts } from '../services/rag/embedder'
import { upsertRegulationVectors, deleteRegulationVector } from '../services/vector/pinecone'
import type { RegulationVector } from '../services/vector/pinecone'
import { ok, err } from '../lib/response'

export const adminRouter = Router()

// ─── POST /admin/login ────────────────────────────────────────────────────────
// Password-based login for the platform owner UI. No token required.
// Returns the PLATFORM_ADMIN_TOKEN on success so the UI can store it.

adminRouter.post('/login', (req: Request, res: Response) => {
  const { password } = req.body ?? {}
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD
  const adminToken    = process.env.PLATFORM_ADMIN_TOKEN

  if (!adminPassword || !adminToken) {
    err(res, 'NOT_CONFIGURED', 'Platform admin credentials not configured.', 503)
    return
  }

  if (!password || password !== adminPassword) {
    err(res, 'INVALID_CREDENTIALS', 'Incorrect password.', 401)
    return
  }

  ok(res, { token: adminToken })
})

// All routes below require the platform admin Bearer token.
adminRouter.use(requirePlatformAdmin)

// ─── POST /admin/regulations/sync ────────────────────────────────────────────
// Trigger a manual Google Sheets sync of the external regulations knowledge base.

adminRouter.post('/regulations/sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncRegulationsFromSheets()
    ok(res, {
      synced_at:  result.synced_at.toISOString(),
      total_rows: result.total_rows,
      upserted:   result.upserted,
      unchanged:  result.unchanged,
      errors:     result.errors,
    })
  } catch (e) {
    console.error('[admin/sync] Sync failed:', e)
    err(res, 'SYNC_FAILED', String(e), 500)
  }
})

// ─── GET /admin/stats ─────────────────────────────────────────────────────────
// Platform-wide counts for the dashboard overview.

adminRouter.get('/stats', async (_req: Request, res: Response) => {
  const [
    tenantCount,
    activePolicyCount,
    knowledgeCount,
    queryCount,
    regulationCount,
    queriesLast7Days,
    queriesLast30Days,
  ] = await Promise.all([
    (prisma as any).tenant.count(),
    (prisma as any).policy.count({ where: { status: 'active' } }),
    (prisma as any).knowledgeEntry.count(),
    (prisma as any).queryRecord.count(),
    (prisma as any).externalRegulation.count({ where: { is_active: true } }),
    (prisma as any).queryRecord.count({
      where: { created_at: { gte: new Date(Date.now() - 7  * 86_400_000) } },
    }),
    (prisma as any).queryRecord.count({
      where: { created_at: { gte: new Date(Date.now() - 30 * 86_400_000) } },
    }),
  ])

  ok(res, {
    tenantCount,
    activePolicyCount,
    knowledgeCount,
    queryCount,
    regulationCount,
    queriesLast7Days,
    queriesLast30Days,
  })
})

// ─── GET /admin/tenants ───────────────────────────────────────────────────────
// List all tenants with per-tenant stats.

adminRouter.get('/tenants', async (_req: Request, res: Response) => {
  const tenants = await (prisma as any).tenant.findMany({
    orderBy: { created_at: 'desc' },
    include: { plan: { select: { name: true } } },
  })

  // Fetch per-tenant stats in parallel
  const withStats = await Promise.all(
    tenants.map(async (t: any) => {
      const [policyCount, knowledgeCount, queryCount, userCount, queriesThisMonth] = await Promise.all([
        (prisma as any).policy.count({
          where: { tenant_id: t.id, status: 'active' },
        }),
        (prisma as any).knowledgeEntry.count({
          where: { tenant_id: t.id },
        }),
        (prisma as any).queryRecord.count({
          where: { tenant_id: t.id },
        }),
        (prisma as any).user.count({
          where: { tenant_id: t.id },
        }),
        (prisma as any).queryRecord.count({
          where: {
            tenant_id:  t.id,
            created_at: { gte: new Date(Date.now() - 30 * 86_400_000) },
          },
        }),
      ])
      return { ...t, stats: { policyCount, knowledgeCount, queryCount, userCount, queriesThisMonth } }
    })
  )

  ok(res, { tenants: withStats, total: withStats.length })
})

// ─── GET /admin/tenants/:id ───────────────────────────────────────────────────
// Single tenant detail: full stats + recent queries + policy list.

adminRouter.get('/tenants/:id', async (req: Request, res: Response) => {
  const tenant = await (prisma as any).tenant.findUnique({
    where:   { id: req.params.id },
    include: { plan: true },
  })
  if (!tenant) {
    err(res, 'NOT_FOUND', 'Tenant not found', 404)
    return
  }

  const [policies, recentQueries, knowledgeCount, userCount] = await Promise.all([
    (prisma as any).policy.findMany({
      where:   { tenant_id: req.params.id },
      orderBy: { created_at: 'desc' },
      select: {
        id: true, name: true, status: true, document_category: true,
        version: true, created_at: true,
      },
    }),
    (prisma as any).queryRecord.findMany({
      where:   { tenant_id: req.params.id },
      orderBy: { created_at: 'desc' },
      take:    20,
      select: {
        id: true, query_text: true, intent_type: true, no_match: true,
        language_detected: true, response_time_ms: true, created_at: true,
      },
    }),
    (prisma as any).knowledgeEntry.count({ where: { tenant_id: req.params.id } }),
    (prisma as any).user.count({ where: { tenant_id: req.params.id } }),
  ])

  ok(res, { tenant, policies, recentQueries, knowledgeCount, userCount })
})

// ─── GET /admin/usage ─────────────────────────────────────────────────────────
// Query volume by tenant for the last 30 days, grouped by day.

adminRouter.get('/usage', async (_req: Request, res: Response) => {
  const since = new Date(Date.now() - 30 * 86_400_000)

  const [byTenant, dailyTotals, noMatchRate] = await Promise.all([
    // Per-tenant query counts last 30 days
    (prisma as any).queryRecord.groupBy({
      by:        ['tenant_id'],
      where:     { created_at: { gte: since } },
      _count:    { id: true },
      orderBy:   { _count: { id: 'desc' } },
    }),
    // All queries last 30 days (for day-by-day chart — raw from DB)
    (prisma as any).queryRecord.findMany({
      where:   { created_at: { gte: since } },
      select:  { created_at: true, tenant_id: true },
      orderBy: { created_at: 'asc' },
    }),
    // Platform no-match rate (unanswered queries)
    (prisma as any).queryRecord.count({
      where: { created_at: { gte: since }, no_match: true },
    }),
  ])

  // Map tenant_id → name
  const tenants = await (prisma as any).tenant.findMany({
    select: { id: true, name: true },
  })
  const tenantNames = new Map<string, string>(tenants.map((t: any) => [t.id, t.name]))

  const tenantUsage = byTenant.map((r: any) => ({
    tenant_id:   r.tenant_id,
    tenant_name: tenantNames.get(r.tenant_id) ?? r.tenant_id,
    query_count: r._count.id,
  }))

  // Bucket daily totals by date string
  const dailyBuckets: Record<string, number> = {}
  for (const q of dailyTotals) {
    const day = (q.created_at as Date).toISOString().slice(0, 10)
    dailyBuckets[day] = (dailyBuckets[day] ?? 0) + 1
  }
  const dailySeries = Object.entries(dailyBuckets)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([date, count]) => ({ date, count }))

  const totalLast30 = dailyTotals.length
  const noMatchRatePercent = totalLast30 > 0
    ? Math.round((noMatchRate / totalLast30) * 1000) / 10
    : 0

  ok(res, { tenantUsage, dailySeries, totalLast30, noMatchRatePercent })
})

// ─── GET /admin/regulations ───────────────────────────────────────────────────
// List all external regulations.

adminRouter.get('/regulations', async (_req: Request, res: Response) => {
  const regulations = await (prisma as any).externalRegulation.findMany({
    orderBy: { official_name: 'asc' },
  })
  ok(res, { regulations, total: regulations.length })
})

// ─── POST /admin/regulations ──────────────────────────────────────────────────
// Create a new external regulation + embed to Pinecone.

adminRouter.post('/regulations', async (req: Request, res: Response) => {
  const {
    reference_key, official_name, also_known_as = [], summary,
    care_home_context, care_company_interaction, practical_meaning,
    source_urls = [], is_active = true,
  } = req.body ?? {}

  if (!reference_key || !official_name || !summary) {
    err(res, 'VALIDATION_ERROR', 'reference_key, official_name and summary are required')
    return
  }

  const key = String(reference_key).toLowerCase().replace(/\s+/g, '_')

  const existing = await (prisma as any).externalRegulation.findUnique({
    where: { reference_key: key },
  })
  if (existing) {
    err(res, 'CONFLICT', `Regulation with reference_key "${key}" already exists`, 409)
    return
  }

  const embedText = [summary, care_home_context, practical_meaning].filter(Boolean).join('\n\n')
  const [embedding] = await embedTexts([embedText])
  const vectorId = `reg_${key}`

  const regulation = await (prisma as any).externalRegulation.create({
    data: {
      reference_key:            key,
      official_name:            String(official_name),
      also_known_as:            Array.isArray(also_known_as) ? also_known_as : [],
      summary:                  String(summary ?? ''),
      care_home_context:        String(care_home_context ?? ''),
      care_company_interaction: String(care_company_interaction ?? ''),
      practical_meaning:        String(practical_meaning ?? ''),
      source_urls:              Array.isArray(source_urls) ? source_urls : [],
      is_active:                Boolean(is_active),
      pinecone_vector_id:       vectorId,
      last_synced_at:           new Date(),
    },
  })

  const vector: RegulationVector = {
    id:     vectorId,
    values: embedding,
    metadata: { reference_key: key, official_name: String(official_name) },
  }
  await upsertRegulationVectors([vector])

  ok(res, regulation, 201)
})

// ─── PATCH /admin/regulations/:id ────────────────────────────────────────────
// Update an existing regulation + re-embed if content changed.

adminRouter.patch('/regulations/:id', async (req: Request, res: Response) => {
  const existing = await (prisma as any).externalRegulation.findUnique({
    where: { id: req.params.id },
  })
  if (!existing) {
    err(res, 'NOT_FOUND', 'Regulation not found', 404)
    return
  }

  const {
    official_name, also_known_as, summary, care_home_context,
    care_company_interaction, practical_meaning, source_urls, is_active,
  } = req.body ?? {}

  const updated = await (prisma as any).externalRegulation.update({
    where: { id: req.params.id },
    data: {
      ...(official_name            !== undefined ? { official_name }            : {}),
      ...(also_known_as            !== undefined ? { also_known_as }            : {}),
      ...(summary                  !== undefined ? { summary }                  : {}),
      ...(care_home_context        !== undefined ? { care_home_context }        : {}),
      ...(care_company_interaction !== undefined ? { care_company_interaction } : {}),
      ...(practical_meaning        !== undefined ? { practical_meaning }        : {}),
      ...(source_urls              !== undefined ? { source_urls }              : {}),
      ...(is_active                !== undefined ? { is_active }                : {}),
      last_synced_at: new Date(),
    },
  })

  // Re-embed if any content field changed
  const contentChanged = summary !== undefined || care_home_context !== undefined || practical_meaning !== undefined
  if (contentChanged) {
    const embedText = [updated.summary, updated.care_home_context, updated.practical_meaning]
      .filter(Boolean).join('\n\n')
    const [embedding] = await embedTexts([embedText])
    const vectorId    = `reg_${existing.reference_key}`
    await upsertRegulationVectors([{
      id:     vectorId,
      values: embedding,
      metadata: { reference_key: existing.reference_key, official_name: updated.official_name },
    }])
  }

  ok(res, updated)
})

// ─── DELETE /admin/regulations/:id ───────────────────────────────────────────
// Remove a regulation from DB and Pinecone.

adminRouter.delete('/regulations/:id', async (req: Request, res: Response) => {
  const existing = await (prisma as any).externalRegulation.findUnique({
    where: { id: req.params.id },
  })
  if (!existing) {
    err(res, 'NOT_FOUND', 'Regulation not found', 404)
    return
  }

  await deleteRegulationVector(existing.reference_key as string)
  await (prisma as any).externalRegulation.delete({ where: { id: req.params.id } })

  ok(res, { deleted: true })
})

// ─── GET /admin/prompts ───────────────────────────────────────────────────────
// Return the live AI prompt file contents so the platform owner can inspect them.

const PROMPTS_DIR = path.resolve(__dirname, '../../../../../prompts')

adminRouter.get('/prompts', (_req: Request, res: Response) => {
  try {
    const promptA = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-a-summary.txt'),    'utf8')
    const promptB = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-b-full-policy.txt'), 'utf8')
    ok(res, {
      prompts: [
        { id: 'prompt-a', label: 'Prompt A — Summary & Questions', content: promptA },
        { id: 'prompt-b', label: 'Prompt B — Full Policy Formatter', content: promptB },
      ],
    })
  } catch (e) {
    err(res, 'READ_FAILED', `Could not read prompt files: ${String(e)}`, 500)
  }
})
