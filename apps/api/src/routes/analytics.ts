// §10.2/10.3 — Analytics endpoint.
// Basic metrics are returned for all plans.
// Advanced metrics are returned only when plan.has_advanced_analytics is true.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'

export const analyticsRouter = Router()

analyticsRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
  const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1)

  const [tenant, thisMonthQueries, lastMonthQueries, activePolicies] = await Promise.all([
    (prisma as any).tenant.findUnique({
      where:  { id: tenantId },
      select: { plan: { select: { monthly_query_limit: true, has_advanced_analytics: true } } },
    }),
    (prisma as any).queryRecord.findMany({
      where:  { tenant_id: tenantId, created_at: { gte: thisMonthStart } },
      select: {
        user_id:                   true,
        channel:                   true,
        policy_ids_cited:          true,
        no_match:                  true,
        intent_type:               true,
        document_category_queried: true,
        response_time_ms:          true,
        created_at:                true,
      },
    }),
    (prisma as any).queryRecord.findMany({
      where:  { tenant_id: tenantId, created_at: { gte: lastMonthStart, lt: thisMonthStart } },
      select: { user_id: true, no_match: true },
    }),
    (prisma as any).policy.findMany({
      where:   { tenant_id: tenantId, status: 'active' },
      select:  { id: true, name: true, document_category: true, version: true, updated_at: true },
      orderBy: { updated_at: 'asc' },
    }),
  ])

  const hasAdvanced  = tenant?.plan?.has_advanced_analytics ?? false
  const monthlyLimit = tenant?.plan?.monthly_query_limit ?? null
  const thisTotal    = thisMonthQueries.length
  const lastTotal    = lastMonthQueries.length
  const pct          = (a: number, b: number): number | null => b > 0 ? Math.round(((a - b) / b) * 100) : null

  // ── Channel split ─────────────────────────────────────────────────────────────
  let chatCount = 0, emailCount = 0
  for (const q of thisMonthQueries) {
    if (q.channel === 'chat')  chatCount++
    else if (q.channel === 'email') emailCount++
  }

  // ── Policy citation counts ────────────────────────────────────────────────────
  const citationMap = new Map<string, number>()
  for (const q of thisMonthQueries) {
    for (const pid of (q.policy_ids_cited as string[])) {
      citationMap.set(pid, (citationMap.get(pid) ?? 0) + 1)
    }
  }

  const citedIds = [...citationMap.keys()]
  const citedPolicies: any[] = citedIds.length > 0
    ? await (prisma as any).policy.findMany({
        where:  { id: { in: citedIds }, tenant_id: tenantId },
        select: { id: true, name: true, document_category: true },
      })
    : []

  const pMeta = new Map<string, { name: string; document_category: string }>(
    citedPolicies.map((p: any) => [p.id, { name: p.name, document_category: p.document_category }]),
  )

  const topPolicies = [...citationMap.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, count]) => ({
      policy_id:         id,
      policy_name:       pMeta.get(id)?.name ?? 'Unknown',
      document_category: pMeta.get(id)?.document_category ?? '',
      count,
    }))

  const topHandbookTopics = [...citationMap.entries()]
    .filter(([id]) => pMeta.get(id)?.document_category === 'staff_handbook')
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id, count]) => ({
      policy_id:   id,
      policy_name: pMeta.get(id)?.name ?? 'Unknown',
      count,
    }))

  // ── Active users ──────────────────────────────────────────────────────────────
  const thisActiveUsers = new Set(thisMonthQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size
  const lastActiveUsers = new Set(lastMonthQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size

  // ── No-match rate ─────────────────────────────────────────────────────────────
  const thisNoMatch = thisMonthQueries.filter((q: any) => q.no_match).length
  const lastNoMatch = lastMonthQueries.filter((q: any) => q.no_match).length
  const thisNoMatchRate = thisTotal > 0 ? Math.round((thisNoMatch / thisTotal) * 1000) / 10 : 0
  const lastNoMatchRate = lastTotal > 0 ? Math.round((lastNoMatch / lastTotal) * 1000) / 10 : 0

  // ── Response time ─────────────────────────────────────────────────────────────
  const rtValues = thisMonthQueries.map((q: any) => q.response_time_ms as number)
  const avgResponseMs = rtValues.length > 0
    ? Math.round(rtValues.reduce((s: number, v: number) => s + v, 0) / rtValues.length)
    : 0

  // ── Intent split ──────────────────────────────────────────────────────────────
  let fullPolicyCount = 0, summaryCount = 0, followUpCount = 0
  for (const q of thisMonthQueries) {
    if (q.intent_type === 'full_policy')  fullPolicyCount++
    else if (q.intent_type === 'summary') summaryCount++
    else                                   followUpCount++
  }

  // ── Policy ages ───────────────────────────────────────────────────────────────
  const msPerDay   = 86_400_000
  const policyAges = activePolicies.map((p: any) => ({
    id:                p.id,
    name:              p.name,
    document_category: p.document_category,
    version:           p.version,
    updated_at:        p.updated_at,
    days_since_update: Math.floor((Date.now() - new Date(p.updated_at).getTime()) / msPerDay),
  }))

  const basic = {
    total_queries:       { this_month: thisTotal,       last_month: lastTotal,       change_pct: pct(thisTotal,       lastTotal)       },
    active_users:        { this_month: thisActiveUsers, last_month: lastActiveUsers, change_pct: pct(thisActiveUsers, lastActiveUsers)  },
    no_match_rate:       { this_month: thisNoMatchRate, last_month: lastNoMatchRate  },
    avg_response_ms:     avgResponseMs,
    queries_by_channel:  { chat: chatCount, email: emailCount },
    full_vs_summary:     { full_policy: fullPolicyCount, summary: summaryCount, follow_up: followUpCount },
    plan_usage:          { used: thisTotal, limit: monthlyLimit, percent: monthlyLimit ? Math.round((thisTotal / monthlyLimit) * 100) : null },
    top_policies:        topPolicies,
    top_handbook_topics: topHandbookTopics,
    policy_ages:         policyAges,
  }

  if (!hasAdvanced) {
    ok(res, { basic, advanced: null })
    return
  }

  // ── Advanced: SQL aggregations ────────────────────────────────────────────────
  const thirtyDaysAgo = new Date(Date.now() - 30 * msPerDay)

  const [langRows, monthlyRows, weeklyRows, knowledgeGaps] = await Promise.all([
    (prisma as any).$queryRaw`
      SELECT
        language_detected                                    AS language,
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS month,
        COUNT(*)::int                                        AS count
      FROM   queries
      WHERE  tenant_id = ${tenantId}
        AND  created_at >= NOW() - INTERVAL '12 months'
      GROUP  BY language, month
      ORDER  BY month ASC, count DESC
    `,
    (prisma as any).$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('month', created_at), 'YYYY-MM') AS period,
        COUNT(*)::int                                        AS count
      FROM   queries
      WHERE  tenant_id = ${tenantId}
        AND  created_at >= NOW() - INTERVAL '12 months'
      GROUP  BY period
      ORDER  BY period ASC
    `,
    (prisma as any).$queryRaw`
      SELECT
        TO_CHAR(DATE_TRUNC('week', created_at), 'YYYY-MM-DD') AS period,
        COUNT(*)::int                                          AS count
      FROM   queries
      WHERE  tenant_id = ${tenantId}
        AND  created_at >= NOW() - INTERVAL '12 months'
      GROUP  BY period
      ORDER  BY period ASC
    `,
    (prisma as any).queryRecord.findMany({
      where:   { tenant_id: tenantId, no_match: true, created_at: { gte: thirtyDaysAgo } },
      select:  { id: true, query_text: true, channel: true, language_detected: true, created_at: true },
      orderBy: { created_at: 'desc' },
      take:    50,
    }),
  ])

  // ── Advanced: staff engagement ────────────────────────────────────────────────
  const userMap = new Map<string, { count: number; last_query_at: Date }>()
  for (const q of thisMonthQueries) {
    if (!q.user_id) continue
    const e = userMap.get(q.user_id)
    if (!e) {
      userMap.set(q.user_id, { count: 1, last_query_at: new Date(q.created_at) })
    } else {
      e.count++
      const d = new Date(q.created_at)
      if (d > e.last_query_at) e.last_query_at = d
    }
  }

  const userIds   = [...userMap.keys()]
  const userRows: any[] = userIds.length > 0
    ? await (prisma as any).user.findMany({
        where:  { id: { in: userIds }, tenant_id: tenantId },
        select: { id: true, name: true, role: true },
      })
    : []
  const userInfo = new Map(userRows.map((u: any) => [u.id, { name: u.name, role: u.role }]))

  const staffEngagement = [...userMap.entries()]
    .sort((a, b) => b[1].count - a[1].count)
    .map(([user_id, { count, last_query_at }]) => ({
      user_id,
      name:          userInfo.get(user_id)?.name ?? 'Unknown',
      role:          userInfo.get(user_id)?.role ?? 'staff',
      count,
      last_query_at: last_query_at.toISOString(),
    }))

  // ── Advanced: category breakdown ──────────────────────────────────────────────
  const catMap = new Map<string, number>()
  for (const q of thisMonthQueries) {
    const cat = (q.document_category_queried as string) ?? 'unknown'
    catMap.set(cat, (catMap.get(cat) ?? 0) + 1)
  }

  // ── Advanced: p95 response time ───────────────────────────────────────────────
  const sorted = [...rtValues].sort((a: number, b: number) => a - b)
  const p95Ms  = sorted.length > 0
    ? sorted[Math.floor(sorted.length * 0.95)] ?? sorted[sorted.length - 1]
    : 0

  const advanced = {
    language_breakdown: langRows,
    knowledge_gaps:     knowledgeGaps,
    query_trend:        { monthly: monthlyRows, weekly: weeklyRows },
    staff_engagement:   staffEngagement,
    category_breakdown: [...catMap.entries()].map(([category, count]) => ({ category, count })).sort((a, b) => b.count - a.count),
    response_time:      { avg_ms: avgResponseMs, p95_ms: p95Ms },
  }

  ok(res, { basic, advanced })
})

// ─── GET /analytics/cqc-report ───────────────────────────────────────────────
// §10.4 — CQC Readiness Report. Professional plan only (has_cqc_report = true).
// Accepts date_from / date_to query params; defaults to a rolling 12-month window.

const REGULATORY_FRAMEWORKS = [
  { name: 'CQC Fundamental Standards',  terms: ['cqc', 'care quality commission', 'fundamental standard', 'regulation 12', 'regulation 17', 'regulation 20', 'person-centred care', 'dignity and respect'] },
  { name: 'RIDDOR',                      terms: ['riddor', 'reporting injury', 'dangerous occurrence', 'reportable accident', 'near miss'] },
  { name: 'GDPR / Data Protection',      terms: ['gdpr', 'data protection', 'personal data', 'data subject', 'information commissioner', 'privacy'] },
  { name: 'Safeguarding',                terms: ['safeguarding', 'safeguard', 'adult protection', 'abuse', 'neglect', 'exploitation', 'vulnerable adult'] },
  { name: 'Mental Capacity Act',         terms: ['mental capacity', 'mca', 'deprivation of liberty', 'dols', 'best interest', 'lasting power of attorney', 'lpa'] },
  { name: 'Health & Safety at Work',     terms: ['health and safety', 'manual handling', 'risk assessment', 'coshh', 'lone working', 'working at height'] },
  { name: 'Fire Safety',                 terms: ['fire safety', 'fire risk', 'evacuation', 'fire drill', 'fire escape', 'extinguisher'] },
  { name: 'Infection Prevention',        terms: ['infection', 'ppe', 'personal protective equipment', 'hand hygiene', 'isolation', 'decontamination', 'sterilisation'] },
]

analyticsRouter.get('/cqc-report', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { name: true, plan: { select: { has_cqc_report: true } } },
  })

  if (!tenant?.plan?.has_cqc_report) {
    err(res, 'PLAN_REQUIRED', 'CQC Readiness Report requires the Professional plan.', 403)
    return
  }

  const dateTo   = req.query.date_to   ? new Date(req.query.date_to   as string) : new Date()
  const dateFrom = req.query.date_from ? new Date(req.query.date_from as string) : new Date(dateTo.getTime() - 365 * 86_400_000)

  // Fetch all data in parallel
  const [periodQueries, activePolicies, allVersions] = await Promise.all([
    (prisma as any).queryRecord.findMany({
      where:  { tenant_id: tenantId, created_at: { gte: dateFrom, lte: dateTo } },
      select: {
        id:                        true,
        chat_session_id:           true,
        user_id:                   true,
        channel:                   true,
        query_text:                true,
        policy_ids_cited:          true,
        no_match:                  true,
        language_detected:         true,
        document_category_queried: true,
        created_at:                true,
      },
    }),
    (prisma as any).policy.findMany({
      where:   { tenant_id: tenantId, status: 'active' },
      select:  { id: true, name: true, version: true, document_category: true, created_at: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).policy.findMany({
      where:   { tenant_id: tenantId, status: { in: ['active', 'superseded'] } },
      select:  {
        id: true, name: true, version: true, status: true,
        document_category: true, created_at: true,
        uploader: { select: { name: true } },
      },
      orderBy: [{ name: 'asc' }, { version: 'asc' }],
    }),
  ])

  // Query volume in 30 days following each version's upload (all-time, not period-scoped)
  const v30dRows: any[] = await (prisma as any).$queryRaw`
    SELECT p.id, COUNT(DISTINCT q.id)::int AS count
    FROM   policies p
    LEFT   JOIN queries q
           ON  q.tenant_id         = ${tenantId}
           AND p.id                = ANY(q.policy_ids_cited)
           AND q.created_at       >= p.created_at
           AND q.created_at        < p.created_at + INTERVAL '30 days'
    WHERE  p.tenant_id = ${tenantId}
      AND  p.status    IN ('active', 'superseded')
    GROUP  BY p.id
  `
  const v30dMap = new Map<string, number>(v30dRows.map((r: any) => [r.id as string, r.count as number]))

  // Load roles for all querying users
  const queryingUserIds = [...new Set(periodQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id as string))]
  const userRows: any[] = queryingUserIds.length > 0
    ? await (prisma as any).user.findMany({
        where:  { id: { in: queryingUserIds }, tenant_id: tenantId },
        select: { id: true, role: true },
      })
    : []
  const userRoles = new Map<string, string>(userRows.map((u: any) => [u.id as string, u.role as string]))

  const msPerDay = 86_400_000

  // ── 1. Policy Access Summary ─────────────────────────────────────────────────
  const policyAccess = activePolicies.map((p: any) => {
    const citing = periodQueries.filter((q: any) => (q.policy_ids_cited as string[]).includes(p.id))
    const lastQ  = citing.length > 0
      ? citing.reduce((a: any, b: any) => a.created_at > b.created_at ? a : b)
      : null
    return {
      id:                p.id,
      name:              p.name,
      version:           p.version,
      document_category: p.document_category,
      total_queries:     citing.length,
      unique_staff:      new Set(citing.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size,
      last_accessed:     lastQ?.created_at ?? null,
    }
  }).sort((a: any, b: any) => b.total_queries - a.total_queries)

  // ── 2. Policies Not Accessed ─────────────────────────────────────────────────
  const policiesNotAccessed = policyAccess
    .filter((p: any) => p.total_queries === 0)
    .map((p: any) => ({
      id:                p.id,
      name:              p.name,
      version:           p.version,
      document_category: p.document_category,
      days_active:       Math.floor((Date.now() - new Date(activePolicies.find((a: any) => a.id === p.id)?.created_at ?? Date.now()).getTime()) / msPerDay),
    }))

  // ── 3. Policy Version History ────────────────────────────────────────────────
  const versionHistory = allVersions.map((v: any) => ({
    id:               v.id,
    name:             v.name,
    version:          v.version,
    status:           v.status,
    document_category: v.document_category,
    uploaded_at:      v.created_at,
    uploaded_by_name: v.uploader?.name ?? 'Unknown',
    queries_30d:      v30dMap.get(v.id) ?? 0,
  }))

  // ── 4. Staff Engagement Evidence (by role — anonymised) ──────────────────────
  const roleMap = new Map<string, { count: number; staffIds: Set<string> }>()
  for (const q of periodQueries) {
    if (!q.user_id) continue
    const role = userRoles.get(q.user_id) ?? 'staff'
    const e    = roleMap.get(role)
    if (!e) {
      roleMap.set(role, { count: 1, staffIds: new Set([q.user_id]) })
    } else {
      e.count++
      e.staffIds.add(q.user_id)
    }
  }
  const staffEngagement = [...roleMap.entries()]
    .map(([role, { count, staffIds }]) => ({ role, query_count: count, unique_staff: staffIds.size }))
    .sort((a, b) => b.query_count - a.query_count)

  // ── 5. Regulatory Framework Activity ─────────────────────────────────────────
  const regulatoryActivity = REGULATORY_FRAMEWORKS
    .map(fw => {
      const matches = periodQueries.filter((q: any) => {
        const text = (q.query_text as string).toLowerCase()
        return fw.terms.some(t => text.includes(t))
      })
      const lastQ = matches.length > 0
        ? matches.reduce((a: any, b: any) => a.created_at > b.created_at ? a : b)
        : null
      return { framework: fw.name, query_count: matches.length, last_queried: lastQ?.created_at ?? null }
    })
    .filter(r => r.query_count > 0)
    .sort((a, b) => b.query_count - a.query_count)

  // ── 6. Multi-Language Access ──────────────────────────────────────────────────
  const langMap = new Map<string, number>()
  for (const q of periodQueries.filter((q: any) => q.language_detected)) {
    const l = q.language_detected as string
    langMap.set(l, (langMap.get(l) ?? 0) + 1)
  }
  const multilingualAccess = [...langMap.entries()]
    .map(([language, count]) => ({
      language,
      query_count: count,
      pct:         periodQueries.length > 0 ? Math.round((count / periodQueries.length) * 100 * 10) / 10 : 0,
    }))
    .sort((a, b) => b.query_count - a.query_count)

  // Sessions where the language changed mid-conversation
  const sessionLangMap = new Map<string, Set<string>>()
  for (const q of periodQueries.filter((q: any) => q.language_detected)) {
    const key = (q as any).chat_session_id ?? q.id
    if (!sessionLangMap.has(key)) sessionLangMap.set(key, new Set())
    sessionLangMap.get(key)!.add(q.language_detected as string)
  }
  const multilingualSessionCount = [...sessionLangMap.values()].filter(s => s.size > 1).length

  // ── 7. Handbook Access Summary ────────────────────────────────────────────────
  const handbookPolicies = activePolicies.filter((p: any) => p.document_category === 'staff_handbook')
  const handbookAccess   = handbookPolicies.map((p: any) => {
    const citing = periodQueries.filter((q: any) => (q.policy_ids_cited as string[]).includes(p.id))
    const lastQ  = citing.length > 0
      ? citing.reduce((a: any, b: any) => a.created_at > b.created_at ? a : b)
      : null
    return {
      policy_name:   p.name,
      query_count:   citing.length,
      unique_staff:  new Set(citing.filter((q: any) => q.user_id).map((q: any) => q.user_id)).size,
      last_accessed: lastQ?.created_at ?? null,
    }
  }).sort((a: any, b: any) => b.query_count - a.query_count)

  // ── 8. Knowledge Gap Log ──────────────────────────────────────────────────────
  const knowledgeGaps = periodQueries
    .filter((q: any) => q.no_match)
    .sort((a: any, b: any) => b.created_at - a.created_at)
    .slice(0, 100)
    .map((q: any) => ({
      query_text:  q.query_text,
      channel:     q.channel,
      language:    q.language_detected,
      created_at:  q.created_at,
    }))

  ok(res, {
    meta: {
      org_name:                 tenant.name,
      date_from:                dateFrom.toISOString(),
      date_to:                  dateTo.toISOString(),
      generated_at:             new Date().toISOString(),
      total_queries:            periodQueries.length,
      total_staff_with_queries: queryingUserIds.length,
    },
    policy_access:          policyAccess,
    policies_not_accessed:  policiesNotAccessed,
    version_history:        versionHistory,
    staff_engagement:       staffEngagement,
    regulatory_activity:    regulatoryActivity,
    multilingual_access:         multilingualAccess,
    multilingual_session_count:  multilingualSessionCount,
    handbook_access:             handbookAccess,
    knowledge_gaps:         knowledgeGaps,
  })
})
