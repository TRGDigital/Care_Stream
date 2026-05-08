import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { requirePlatformAdmin } from '../middleware/auth'
import { syncRegulationsFromSheets } from '../services/regulations/sheets-sync'
import { prisma } from '../db/client'
import { embedTexts } from '../services/rag/embedder'
import { upsertRegulationVectors, deleteRegulationVector } from '../services/vector/pinecone'
import type { RegulationVector } from '../services/vector/pinecone'
import { ok, err } from '../lib/response'
import { PLATFORM_KNOWLEDGE_SEEDS, type SeedEntry } from '../data/platform-knowledge-seeds'
import { seedTenantKnowledge, seedAllTenants, seedCustomSeedToAllTenants } from '../services/knowledge/seeder'

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

// ─── GET /admin/tenants/:id/queries ──────────────────────────────────────────
// Session-grouped query list for one tenant (same shape as GET /query).

adminRouter.get('/tenants/:id/queries', async (req: Request, res: Response) => {
  const tenantId = req.params.id
  const page     = Math.max(1, parseInt((req.query.page  as string) || '1'))
  const limit    = Math.min(100, Math.max(1, parseInt((req.query.limit as string) || '20')))
  const offset   = (page - 1) * limit

  const rawSessions: any[] = await prisma.$queryRawUnsafe(`
    WITH session_data AS (
      SELECT
        q.id,
        COALESCE(q.chat_session_id::text, q.id::text) AS session_key,
        q.chat_session_id,
        q.query_text,
        q.response_text,
        q.document_category_queried,
        q.no_match,
        q.language_detected,
        q.channel,
        q.user_id,
        q.created_at,
        ROW_NUMBER() OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text) ORDER BY q.created_at ASC)  AS rn,
        COUNT(*)     OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text))                            AS message_count,
        MAX(q.created_at) OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text))                      AS last_message_at,
        BOOL_OR(q.no_match) OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text))                    AS any_no_match,
        BOOL_AND(q.no_match) OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text))                   AS all_no_match,
        SUM(q.response_time_ms) OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text))                AS total_response_time_ms,
        MIN(q.created_at) OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text))                      AS started_at,
        BOOL_OR(q.chat_deleted_at IS NOT NULL) OVER (PARTITION BY COALESCE(q.chat_session_id::text, q.id::text)) AS deleted_from_chat
      FROM queries q
      WHERE q.tenant_id = '${tenantId}'
    ),
    lang_agg AS (
      SELECT
        COALESCE(chat_session_id::text, id::text) AS session_key,
        ARRAY_AGG(DISTINCT language_detected ORDER BY language_detected)
          FILTER (WHERE language_detected IS NOT NULL) AS all_languages
      FROM queries
      WHERE tenant_id = '${tenantId}'
      GROUP BY COALESCE(chat_session_id::text, id::text)
    )
    SELECT sd.session_key, sd.chat_session_id, sd.id,
           sd.query_text AS first_query, sd.response_text,
           sd.document_category_queried, sd.language_detected, sd.channel, sd.user_id,
           sd.message_count::int, sd.last_message_at, sd.any_no_match, sd.all_no_match,
           sd.total_response_time_ms::int, sd.started_at, sd.deleted_from_chat, sd.created_at,
           u.name AS user_name, u.email AS user_email,
           la.all_languages
    FROM   session_data sd
    LEFT   JOIN users u    ON sd.user_id      = u.id
    LEFT   JOIN lang_agg la ON sd.session_key = la.session_key
    WHERE  sd.rn = 1
    ORDER  BY sd.last_message_at DESC
    LIMIT  ${limit} OFFSET ${offset}
  `)

  const totalRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT COALESCE(chat_session_id::text, id::text))::int AS total
    FROM queries WHERE tenant_id = '${tenantId}'
  `)

  const sessions = rawSessions.map((r: any) => ({
    session_key:               r.session_key,
    chat_session_id:           r.chat_session_id,
    id:                        r.id,
    first_query:               r.first_query,
    response_text:             r.response_text,
    document_category_queried: r.document_category_queried,
    language_detected:         r.language_detected,
    all_languages:             Array.isArray(r.all_languages) ? r.all_languages : [],
    channel:                   r.channel,
    message_count:             Number(r.message_count),
    last_message_at:           r.last_message_at,
    started_at:                r.started_at,
    any_no_match:              r.any_no_match,
    all_no_match:              r.all_no_match,
    total_response_time_ms:    Number(r.total_response_time_ms ?? 0),
    deleted_from_chat:         r.deleted_from_chat ?? false,
    created_at:                r.created_at,
    user: r.user_name ? { name: r.user_name, email: r.user_email } : null,
  }))

  ok(res, { queries: sessions, total: Number(totalRows[0]?.total ?? 0), page, limit })
})

// ─── GET /admin/tenants/:id/analytics ────────────────────────────────────────
// Key analytics for one tenant — no plan restrictions.

adminRouter.get('/tenants/:id/analytics', async (req: Request, res: Response) => {
  const tenantId      = req.params.id
  const now           = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)
  const thirtyDaysAgo  = new Date(Date.now() - 30 * 86_400_000)
  const msPerDay       = 86_400_000

  const [thisMonthQueries, lastMonthQueries, activePolicies, knowledgeGaps, monthlyRows, multilingualRows] = await Promise.all([
    (prisma as any).queryRecord.findMany({
      where:  { tenant_id: tenantId, created_at: { gte: thisMonthStart } },
      select: { user_id: true, channel: true, policy_ids_cited: true, no_match: true,
                intent_type: true, document_category_queried: true, response_time_ms: true, created_at: true },
    }),
    (prisma as any).queryRecord.findMany({
      where:  { tenant_id: tenantId, created_at: { gte: lastMonthStart, lt: thisMonthStart } },
      select: { user_id: true, no_match: true },
    }),
    (prisma as any).policy.findMany({
      where:   { tenant_id: tenantId, status: 'active' },
      select:  { id: true, name: true, document_category: true, version: true },
    }),
    (prisma as any).queryRecord.findMany({
      where:   { tenant_id: tenantId, no_match: true, created_at: { gte: thirtyDaysAgo } },
      select:  { id: true, query_text: true, channel: true, language_detected: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take:    20,
    }),
    (prisma as any).$queryRaw`
      SELECT TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS period, COUNT(*)::int AS count
      FROM queries WHERE tenant_id = ${tenantId} AND created_at >= NOW() - INTERVAL '6 months'
      GROUP BY period ORDER BY period ASC
    `,
    (prisma as any).$queryRaw`
      SELECT COUNT(*)::int AS count FROM (
        SELECT COALESCE(chat_session_id::text, id::text) AS session_key
        FROM queries WHERE tenant_id = ${tenantId}
        GROUP BY session_key
        HAVING COUNT(DISTINCT language_detected) > 1
      ) t
    `,
  ])

  const thisTotal = thisMonthQueries.length
  const lastTotal = lastMonthQueries.length
  const pct = (a: number, b: number) => b > 0 ? Math.round(((a - b) / b) * 100) : null

  const thisNoMatch = thisMonthQueries.filter((q: any) => q.no_match).length
  const noMatchRate = thisTotal > 0 ? Math.round((thisNoMatch / thisTotal) * 1000) / 10 : 0

  const rtValues  = thisMonthQueries.map((q: any) => q.response_time_ms as number)
  const avgRespMs = rtValues.length > 0
    ? Math.round(rtValues.reduce((s: number, v: number) => s + v, 0) / rtValues.length) : 0

  let chatCount = 0, emailCount = 0
  for (const q of thisMonthQueries) {
    if (q.channel === 'chat') chatCount++; else if (q.channel === 'email') emailCount++
  }

  const citationMap = new Map<string, number>()
  for (const q of thisMonthQueries) {
    for (const pid of (q.policy_ids_cited as string[])) {
      citationMap.set(pid, (citationMap.get(pid) ?? 0) + 1)
    }
  }
  const pMeta = new Map(activePolicies.map((p: any) => [p.id, { name: p.name, document_category: p.document_category }]))
  const topPolicies = [...citationMap.entries()]
    .sort((a, b) => b[1] - a[1]).slice(0, 8)
    .map(([id, count]) => ({ policy_id: id, policy_name: (pMeta.get(id) as any)?.name ?? 'Unknown', count }))

  const thisActiveUsers = new Set(thisMonthQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size
  const lastActiveUsers = new Set(lastMonthQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size

  ok(res, {
    total_queries:         { this_month: thisTotal, last_month: lastTotal, change_pct: pct(thisTotal, lastTotal) },
    active_users:          { this_month: thisActiveUsers, last_month: lastActiveUsers, change_pct: pct(thisActiveUsers, lastActiveUsers) },
    no_match_rate:         noMatchRate,
    avg_response_ms:       avgRespMs,
    channel_split:         { chat: chatCount, email: emailCount },
    top_policies:          topPolicies,
    knowledge_gaps:        knowledgeGaps,
    monthly_trend:         monthlyRows,
    policy_count:          activePolicies.length,
    multilingual_sessions: Number((multilingualRows as any[])[0]?.count ?? 0),
  })
})

// ─── GET /admin/tenants/:id/analytics/cqc-report ─────────────────────────────
// Full CQC report for one tenant — no plan restrictions for platform owner.

const REGULATORY_FRAMEWORKS_ADMIN = [
  { name: 'CQC Fundamental Standards',  terms: ['cqc', 'care quality commission', 'fundamental standard', 'regulation 12', 'regulation 17', 'regulation 20'] },
  { name: 'RIDDOR',                      terms: ['riddor', 'reporting injury', 'dangerous occurrence', 'reportable accident'] },
  { name: 'GDPR / Data Protection',      terms: ['gdpr', 'data protection', 'personal data', 'privacy'] },
  { name: 'Safeguarding',                terms: ['safeguarding', 'adult protection', 'abuse', 'neglect', 'vulnerable adult'] },
  { name: 'Mental Capacity Act',         terms: ['mental capacity', 'mca', 'deprivation of liberty', 'dols', 'best interest'] },
  { name: 'Health & Safety at Work',     terms: ['health and safety', 'manual handling', 'risk assessment', 'coshh'] },
  { name: 'Fire Safety',                 terms: ['fire safety', 'fire risk', 'evacuation', 'fire drill'] },
  { name: 'Infection Prevention',        terms: ['infection', 'ppe', 'hand hygiene', 'isolation', 'decontamination'] },
]

adminRouter.get('/tenants/:id/analytics/cqc-report', async (req: Request, res: Response) => {
  const tenantId = req.params.id
  const dateTo   = req.query.date_to   ? new Date(req.query.date_to   as string) : new Date()
  const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : new Date(dateTo.getTime() - 365 * 86_400_000)

  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { name: true },
  })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }

  const [periodQueries, activePolicies, allVersions] = await Promise.all([
    (prisma as any).queryRecord.findMany({
      where:  { tenant_id: tenantId, created_at: { gte: dateFrom, lte: dateTo } },
      select: { id: true, user_id: true, channel: true, query_text: true,
                policy_ids_cited: true, no_match: true, language_detected: true,
                document_category_queried: true, created_at: true },
    }),
    (prisma as any).policy.findMany({
      where:   { tenant_id: tenantId, status: 'active' },
      select:  { id: true, name: true, version: true, document_category: true, created_at: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).policy.findMany({
      where:   { tenant_id: tenantId, status: { in: ['active', 'superseded'] } },
      select:  { id: true, name: true, version: true, status: true,
                 document_category: true, created_at: true,
                 uploader: { select: { name: true } } },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    }),
  ])

  const queryingUserIds = [...new Set(periodQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id as string))]
  const userRows: any[] = queryingUserIds.length > 0
    ? await (prisma as any).user.findMany({
        where:  { id: { in: queryingUserIds }, tenant_id: tenantId },
        select: { id: true, role: true },
      })
    : []
  const userRoles = new Map<string, string>(userRows.map((u: any) => [u.id as string, u.role as string]))

  const msPerDay = 86_400_000

  const policyAccess = activePolicies.map((p: any) => {
    const citing = periodQueries.filter((q: any) => (q.policy_ids_cited as string[]).includes(p.id))
    const lastQ  = citing.length > 0 ? citing.reduce((a: any, b: any) => a.created_at > b.created_at ? a : b) : null
    return { id: p.id, name: p.name, version: p.version, document_category: p.document_category,
             total_queries: citing.length,
             unique_staff:  new Set(citing.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size,
             last_accessed: lastQ?.created_at ?? null }
  }).sort((a: any, b: any) => b.total_queries - a.total_queries)

  const policiesNotAccessed = policyAccess
    .filter((p: any) => p.total_queries === 0)
    .map((p: any) => ({
      id: p.id, name: p.name, version: p.version, document_category: p.document_category,
      days_active: Math.floor((Date.now() - new Date(activePolicies.find((a: any) => a.id === p.id)?.created_at ?? Date.now()).getTime()) / msPerDay),
    }))

  const versionHistory = allVersions.map((v: any) => ({
    id: v.id, name: v.name, version: v.version, status: v.status,
    document_category: v.document_category, uploaded_at: v.created_at,
    uploaded_by_name: v.uploader?.name ?? 'Unknown',
  }))

  const roleMap = new Map<string, { count: number; staffIds: Set<string> }>()
  for (const q of periodQueries) {
    if (!q.user_id) continue
    const role = userRoles.get(q.user_id) ?? 'staff'
    const e = roleMap.get(role)
    if (!e) roleMap.set(role, { count: 1, staffIds: new Set([q.user_id]) })
    else { e.count++; e.staffIds.add(q.user_id) }
  }
  const staffEngagement = [...roleMap.entries()]
    .map(([role, { count, staffIds }]) => ({ role, query_count: count, unique_staff: staffIds.size }))
    .sort((a, b) => b.query_count - a.query_count)

  const regulatoryActivity = REGULATORY_FRAMEWORKS_ADMIN
    .map(fw => {
      const matches = periodQueries.filter((q: any) => fw.terms.some(t => (q.query_text as string).toLowerCase().includes(t)))
      const lastQ   = matches.length > 0 ? matches.reduce((a: any, b: any) => a.created_at > b.created_at ? a : b) : null
      return { framework: fw.name, query_count: matches.length, last_queried: lastQ?.created_at ?? null }
    })
    .filter(r => r.query_count > 0)
    .sort((a, b) => b.query_count - a.query_count)

  // All languages used (including English) for session-level language reporting
  const langMap = new Map<string, number>()
  for (const q of periodQueries.filter((q: any) => q.language_detected)) {
    const l = q.language_detected as string
    langMap.set(l, (langMap.get(l) ?? 0) + 1)
  }
  const multilingualAccess = [...langMap.entries()]
    .map(([language, count]) => ({ language, query_count: count,
      pct: periodQueries.length > 0 ? Math.round((count / periodQueries.length) * 100 * 10) / 10 : 0 }))
    .sort((a, b) => b.query_count - a.query_count)

  // Sessions that used more than one language during the period
  const sessionLangMap = new Map<string, Set<string>>()
  for (const q of periodQueries.filter((q: any) => q.language_detected)) {
    const key = q.chat_session_id ?? q.id
    if (!sessionLangMap.has(key)) sessionLangMap.set(key, new Set())
    sessionLangMap.get(key)!.add(q.language_detected as string)
  }
  const switchedSessions = [...sessionLangMap.entries()]
    .filter(([, langs]) => langs.size > 1)
    .map(([, langs]) => Array.from(langs))
  const multilingualSessionCount = switchedSessions.length

  const knowledgeGaps = periodQueries
    .filter((q: any) => q.no_match)
    .sort((a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    .slice(0, 50)
    .map((q: any) => ({ query_text: q.query_text, channel: q.channel,
                        language: q.language_detected, created_at: q.created_at }))

  ok(res, {
    meta: { org_name: tenant.name, date_from: dateFrom.toISOString(), date_to: dateTo.toISOString(),
            generated_at: new Date().toISOString(), total_queries: periodQueries.length,
            total_staff_with_queries: queryingUserIds.length },
    policy_access:         policyAccess,
    policies_not_accessed: policiesNotAccessed,
    version_history:       versionHistory,
    staff_engagement:      staffEngagement,
    regulatory_activity:   regulatoryActivity,
    multilingual_access:        multilingualAccess,
    multilingual_session_count: multilingualSessionCount,
    knowledge_gaps:        knowledgeGaps,
  })
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

const PROMPTS_DIR = path.resolve(__dirname, '../../../../prompts')

adminRouter.get('/prompts', (_req: Request, res: Response) => {
  try {
    const promptA = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-a-summary.txt'),              'utf8')
    const promptB = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-b-full-policy.txt'),           'utf8')
    const promptC = fs.readFileSync(path.join(PROMPTS_DIR, 'prompt-c-knowledge-extraction.txt'), 'utf8')
    ok(res, {
      prompts: [
        { id: 'prompt-a', label: 'Prompt A — Summary & Questions',      content: promptA },
        { id: 'prompt-b', label: 'Prompt B — Full Policy Formatter',     content: promptB },
        { id: 'prompt-c', label: 'Prompt C — Knowledge Base Extraction', content: promptC },
      ],
    })
  } catch (e) {
    err(res, 'READ_FAILED', `Could not read prompt files: ${String(e)}`, 500)
  }
})

// ─── GET /admin/knowledge-seeds ───────────────────────────────────────────────
// List all platform seed definitions (static + custom DB) with per-seed seeded-tenant count.

adminRouter.get('/knowledge-seeds', async (_req: Request, res: Response) => {
  const customSeeds = await (prisma as any).platformCustomSeed.findMany({
    orderBy: { created_at: 'asc' },
  })

  const allSeeds = [
    ...PLATFORM_KNOWLEDGE_SEEDS,
    ...customSeeds.map((s: any) => ({
      slug:        s.slug,
      category:    s.category,
      question:    s.question,
      answer:      s.answer,
      source_name: s.source_name,
    })),
  ]

  const [counts, totalTenants] = await Promise.all([
    Promise.all(
      allSeeds.map(seed =>
        (prisma as any).knowledgeEntry.count({
          where: { source_type: 'platform', source_id: `seed_${seed.slug}` },
        }),
      ),
    ),
    (prisma as any).tenant.count(),
  ])

  const seeds = allSeeds.map((seed, i) => ({
    slug:         seed.slug,
    category:     seed.category,
    question:     seed.question,
    answer:       seed.answer,
    source_name:  seed.source_name,
    seeded_count: counts[i],
    custom:       i >= PLATFORM_KNOWLEDGE_SEEDS.length,
  }))

  ok(res, { seeds, total: seeds.length, total_tenants: totalTenants })
})

// ─── POST /admin/knowledge-seeds ─────────────────────────────────────────────
// Create a new custom platform seed and immediately seed it to all tenants.

const CustomSeedSchema = z.object({
  slug:        z.string().min(2).max(80).regex(/^[a-z0-9_]+$/, 'slug must be lowercase letters, numbers, or underscores'),
  category:    z.string().min(2).max(100),
  question:    z.string().min(10).max(500),
  answer:      z.string().min(10).max(5000),
  source_name: z.string().min(2).max(200),
})

adminRouter.post('/knowledge-seeds', async (req: Request, res: Response) => {
  const parsed = CustomSeedSchema.safeParse(req.body)
  if (!parsed.success) {
    err(res, 'VALIDATION_ERROR', parsed.error.issues.map(i => i.message).join(', '))
    return
  }
  const { slug, category, question, answer, source_name } = parsed.data

  const existing = await (prisma as any).platformCustomSeed.findUnique({ where: { slug } })
  if (existing) {
    err(res, 'CONFLICT', `A seed with slug "${slug}" already exists`, 409)
    return
  }

  const seed = await (prisma as any).platformCustomSeed.create({
    data: { slug, category, question, answer, source_name },
  })

  // Seed the new entry into all existing tenants in the background
  seedCustomSeedToAllTenants({ slug, category, question, answer, source_name }).catch(e =>
    console.error('[admin/seeds] Custom seed propagation failed:', e),
  )

  ok(res, { ...seed, custom: true }, 201)
})

// ─── POST /admin/knowledge-seeds/seed-tenant/:tenantId ───────────────────────
// Seed one tenant with any missing platform entries. Idempotent.

adminRouter.post('/knowledge-seeds/seed-tenant/:tenantId', async (req: Request, res: Response) => {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: req.params.tenantId },
    select: { id: true, name: true },
  })
  if (!tenant) {
    err(res, 'NOT_FOUND', 'Tenant not found', 404)
    return
  }
  try {
    const result = await seedTenantKnowledge(tenant.id as string)
    ok(res, { tenant_id: tenant.id, tenant_name: tenant.name, ...result })
  } catch (e) {
    console.error('[admin/seeds] Seed failed:', e)
    err(res, 'SEED_FAILED', String(e), 500)
  }
})

// ─── POST /admin/knowledge-seeds/seed-all ────────────────────────────────────
// Seed every tenant with any missing platform entries. Idempotent.

adminRouter.post('/knowledge-seeds/seed-all', async (_req: Request, res: Response) => {
  try {
    const result = await seedAllTenants()
    ok(res, result)
  } catch (e) {
    console.error('[admin/seeds] Seed-all failed:', e)
    err(res, 'SEED_FAILED', String(e), 500)
  }
})
