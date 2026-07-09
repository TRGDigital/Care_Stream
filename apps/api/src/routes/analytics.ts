// §10.2/10.3 — Analytics endpoint.
// Basic metrics are returned for all plans.
// Advanced metrics are returned only when plan.has_advanced_analytics is true.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { getTenantId } from '../db/tenant-context'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { checkFeature, PlanLimitError } from '../lib/plan-limits'
import { getKnowledgeGapData } from '../lib/knowledge-gaps'
import { analyseRegulationCoverage } from '../services/analytics/regulation-coverage'
import { getGapDetail } from '../services/analytics/gap-detail'

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
  let chatCount = 0, emailCount = 0, whatsappCount = 0, voiceCount = 0
  for (const q of thisMonthQueries) {
    if (q.channel === 'chat')           chatCount++
    else if (q.channel === 'email')     emailCount++
    else if (q.channel === 'whatsapp')  whatsappCount++
    else if (q.channel === 'voice')     voiceCount++
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
    queries_by_channel:  { chat: chatCount, email: emailCount, whatsapp: whatsappCount, voice: voiceCount },
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

// ─── GET /analytics/gaps ─────────────────────────────────────────────────────
// Policy gap detection — surfaces:
//   1. Themes from unanswered (no_match) queries in the last 90 days
//   2. External regulations with no tenant policy coverage
//   3. A headline coverage score

const STOPWORDS = new Set([
  'a','about','above','after','also','an','and','any','are','as','at','be',
  'been','by','can','do','for','from','get','how','i','if','in','is','it',
  'its','just','me','my','no','not','of','on','or','our','please','send',
  'should','so','tell','that','the','their','them','this','to','us','was',
  'we','what','when','where','which','who','will','with','you','your',
])

function extractKeywords(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, ' ')
    .split(/\s+/)
    .filter(w => w.length > 3 && !STOPWORDS.has(w))
}

analyticsRouter.get('/gaps', requireAdmin, async (req: Request, res: Response) => {
  const tenantId   = getTenantId()

  try {
    await checkFeature(tenantId, 'has_gap_detection')
  } catch (e) {
    if (e instanceof PlanLimitError) {
      err(res, e.code, e.message, 403)
      return
    }
    throw e
  }

  const ninetyDaysAgo = new Date(Date.now() - 90 * 86_400_000)

  const [noMatchQueries, regulations, coverage] = await Promise.all([
    (prisma as any).queryRecord.findMany({
      where:   { tenant_id: tenantId, no_match: true, created_at: { gte: ninetyDaysAgo } },
      select:  { id: true, query_text: true, created_at: true },
      orderBy: { created_at: 'desc' },
    }),
    (prisma as any).externalRegulation.findMany({
      where:  { is_active: true },
      select: { reference_key: true, official_name: true, summary: true, care_home_context: true },
    }),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId } }),
  ])

  // ── 1. Cluster unanswered queries into themes ─────────────────────────────────
  // Score every keyword by how many no-match queries contain it
  const termFreq = new Map<string, { count: number; queries: string[] }>()
  for (const q of noMatchQueries) {
    const kws = extractKeywords(q.query_text as string)
    const unique = [...new Set(kws)]
    for (const kw of unique) {
      const e = termFreq.get(kw)
      if (!e) {
        termFreq.set(kw, { count: 1, queries: [q.query_text as string] })
      } else {
        e.count++
        if (e.queries.length < 3) e.queries.push(q.query_text as string)
      }
    }
  }

  // Pick top themes: keywords appearing in 2+ queries, not substrings of each other
  const candidates = [...termFreq.entries()]
    .filter(([, v]) => v.count >= 2)
    .sort((a, b) => b[1].count - a[1].count)

  const themes: Array<{ theme: string; count: number; sample_questions: string[] }> = []
  const usedTerms = new Set<string>()

  for (const [term, { count, queries }] of candidates) {
    if (usedTerms.has(term)) continue
    // Skip if already covered by a higher-scoring theme
    const dominated = themes.some(t => t.theme.includes(term) || term.includes(t.theme))
    if (dominated) continue
    themes.push({ theme: term, count, sample_questions: queries })
    usedTerms.add(term)
    if (themes.length >= 10) break
  }

  // ── 2. Regulation coverage (content-based, cached) ────────────────────────────
  // Read the cached, AI-judged coverage (computed by POST /analytics/gaps/analyse,
  // which reads inside the policies via the vector index). If it's never been run,
  // we report not_analysed so the UI can prompt for it — we no longer guess from
  // policy names/tags.
  const covByKey = new Map<string, any>((coverage as any[]).map(c => [c.reference_key, c]))
  const analysed = (coverage as any[]).length > 0
  const analysedAt = analysed
    ? (coverage as any[]).reduce((max: Date, c: any) => (c.analysed_at > max ? c.analysed_at : max), (coverage as any[])[0].analysed_at)
    : null

  const regulationGaps = (regulations as any[]).map((reg: any) => {
    const c = covByKey.get(reg.reference_key)
    const status: 'covered' | 'partial' | 'gap' | 'unknown' = c?.status ?? 'unknown'
    return {
      reference_key:        reg.reference_key,
      official_name:        reg.official_name,
      summary:              reg.summary,
      care_home_context:    reg.care_home_context,
      status,
      covered:              status === 'covered' || status === 'partial',  // back-compat
      confidence:           c?.confidence ?? null,
      evidence_policy_id:   c?.evidence_policy_id ?? null,
      evidence_policy_name: c?.evidence_policy_name ?? null,
      reason:               c?.reason ?? null,
    }
  })

  const totalCount   = regulationGaps.length
  const coveredCount = regulationGaps.filter(r => r.status === 'covered').length
  const partialCount = regulationGaps.filter(r => r.status === 'partial').length
  const gapCount     = regulationGaps.filter(r => r.status === 'gap').length
  const coverageScore = analysed && totalCount > 0
    ? Math.round(((coveredCount + partialCount * 0.5) / totalCount) * 100)
    : null

  // Order: gaps first, then partial, then covered — most actionable on top.
  const rank = (s: string) => (s === 'gap' ? 0 : s === 'partial' ? 1 : s === 'covered' ? 2 : 3)

  ok(res, {
    coverage_score:    coverageScore,
    analysed,
    analysed_at:       analysedAt,
    unanswered_themes: themes,
    regulation_gaps:   regulationGaps.sort((a, b) => rank(a.status) - rank(b.status)),
    meta: {
      no_match_total:      noMatchQueries.length,
      days_analysed:       90,
      regulations_total:   totalCount,
      regulations_covered: coveredCount,
      regulations_partial: partialCount,
      regulations_gap:     gapCount,
    },
  })
})

// ─── POST /analytics/gaps/analyse ─────────────────────────────────────────────
// Run the content-based regulation coverage analysis (semantic retrieval + AI
// judgement over the tenant's own policies) and cache it. Can take ~1 minute.
analyticsRouter.post('/gaps/analyse', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    await checkFeature(tenantId, 'has_gap_detection')
  } catch (e) {
    if (e instanceof PlanLimitError) { err(res, e.code, e.message, 403); return }
    throw e
  }
  try {
    const rows = await analyseRegulationCoverage(tenantId)
    ok(res, {
      analysed_at: new Date(),
      regulations_total:   rows.length,
      regulations_covered: rows.filter(r => r.status === 'covered').length,
      regulations_partial: rows.filter(r => r.status === 'partial').length,
      regulations_gap:     rows.filter(r => r.status === 'gap').length,
    })
  } catch (e: any) {
    err(res, 'ANALYSIS_FAILED', e.message, 500)
  }
})

// ─── POST /analytics/gaps/:reference_key/detail ──────────────────────────────
// Deep-dive for a partial/gap regulation (Professional+): the highlight quotes and
// the "what to add" suggestions, each verified against the whole policy corpus so we
// never recommend adding something already held elsewhere. Uses Sonnet; cached until
// the next coverage re-run. Pass ?force=1 to regenerate.
analyticsRouter.post('/gaps/:reference_key/detail', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    await checkFeature(tenantId, 'has_gap_detection')
  } catch (e) {
    if (e instanceof PlanLimitError) { err(res, e.code, e.message, 403); return }
    throw e
  }
  try {
    const detail = await getGapDetail(tenantId, String(req.params.reference_key), req.query.force === '1')
    ok(res, detail)
  } catch (e: any) {
    err(res, 'DETAIL_FAILED', e.message ?? 'Could not build the coverage detail.', 500)
  }
})

// ─── GET /analytics/daily-activity ───────────────────────────────────────────
// Returns daily query counts split by channel (chat / email) for the last N days.
// Used by the dashboard line graph. Defaults to 30 days.

analyticsRouter.get('/daily-activity', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const days     = Math.min(parseInt((req.query.days as string) ?? '30', 10) || 30, 90)

  const rows: Array<{ date: string; channel: string; count: number }> = await (prisma as any).$queryRaw`
    SELECT
      TO_CHAR(DATE(created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
      COALESCE(channel, 'chat')                                   AS channel,
      COUNT(*)::int                                               AS count
    FROM   queries
    WHERE  tenant_id  = ${tenantId}
      AND  created_at >= NOW() - (${days} || ' days')::interval
    GROUP  BY DATE(created_at AT TIME ZONE 'UTC'), channel
    ORDER  BY date ASC
  `

  // Build a full date spine so days with zero activity still appear
  const series: Array<{ date: string; chat: number; email: number; whatsapp: number; voice: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date()
    d.setUTCHours(0, 0, 0, 0)
    d.setUTCDate(d.getUTCDate() - i)
    series.push({ date: d.toISOString().slice(0, 10), chat: 0, email: 0, whatsapp: 0, voice: 0 })
  }

  for (const row of rows) {
    const entry = series.find(s => s.date === row.date)
    if (!entry) continue
    if (row.channel === 'email')         entry.email    = row.count
    else if (row.channel === 'whatsapp') entry.whatsapp = row.count
    else if (row.channel === 'voice')    entry.voice    = row.count
    else                                 entry.chat     = row.count
  }

  ok(res, { series, days })
})

// ─── GET /analytics/training ─────────────────────────────────────────────────
// Training compliance summary: compliance rate, per-module breakdown, answer stats.

analyticsRouter.get('/training', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const now = new Date()

  const [users, enrollments, trainingModules] = await Promise.all([
    (prisma as any).user.findMany({
      where:  { tenant_id: tenantId, is_active: true },
      select: { id: true },
    }),
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId },
      include: {
        module:  { select: { id: true, name: true, category: true, sort_order: true } },
        answers: { select: { is_correct: true } },
      },
    }),
    (prisma as any).trainingModule.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      select:  { id: true, name: true, category: true, sort_order: true },
      orderBy: { sort_order: 'asc' },
    }),
  ])

  const enriched = enrollments.map((e: any) => {
    let status = e.status as string
    if (e.expires_at && new Date(e.expires_at) < now && status === 'complete') status = 'expired'
    const daysUntilExpiry = e.expires_at
      ? Math.ceil((new Date(e.expires_at).getTime() - now.getTime()) / 86400000)
      : null
    return { ...e, status, daysUntilExpiry }
  })

  const moduleBreakdown = trainingModules
    .map((m: any) => {
      const rows      = enriched.filter((e: any) => e.module_id === m.id)
      const completed   = rows.filter((e: any) => e.status === 'complete').length
      const in_progress = rows.filter((e: any) => e.status === 'in_progress').length
      const not_started = rows.filter((e: any) => e.status === 'not_started').length
      const expired     = rows.filter((e: any) => e.status === 'expired').length
      return {
        id: m.id, name: m.name, category: m.category, sort_order: m.sort_order,
        enrolled: rows.length, completed, in_progress, not_started, expired,
        completion_rate: rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0,
      }
    })
    .filter((m: any) => m.enrolled > 0)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const statutoryModules = trainingModules.filter((m: any) => m.category === 'statutory')
  const compliantStaff   = users.filter((u: any) =>
    statutoryModules.length === 0 || statutoryModules.every((m: any) => {
      const e = enriched.find((e: any) => e.user_id === u.id && e.module_id === m.id)
      return e?.status === 'complete'
    })
  ).length

  const allAnswers        = enriched.flatMap((e: any) => e.answers ?? [])
  const total_answers     = allAnswers.length
  const correct_answers   = allAnswers.filter((a: any) => a.is_correct).length
  const expiring_soon     = enriched.filter((e: any) =>
    e.status === 'complete' && e.daysUntilExpiry !== null && e.daysUntilExpiry <= 90 && e.daysUntilExpiry > 0
  ).length
  const expired_count = enriched.filter((e: any) => e.status === 'expired').length

  ok(res, {
    compliance_rate:      users.length > 0 ? Math.round((compliantStaff / users.length) * 100) : 0,
    compliant_staff:      compliantStaff,
    total_staff:          users.length,
    module_breakdown:     moduleBreakdown,
    total_answers,
    correct_answers,
    correct_answer_rate:  total_answers > 0 ? Math.round((correct_answers / total_answers) * 100) : 0,
    expiring_soon_count:  expiring_soon,
    expired_count,
  })
})

// ─── GET /analytics/training-gaps ────────────────────────────────────────────
// Per-question failure analysis and per-staff-member knowledge gap summary.

analyticsRouter.get('/training-gaps', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  const now      = new Date()

  const [trainingModules, enrollments] = await Promise.all([
    (prisma as any).trainingModule.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      orderBy: { sort_order: 'asc' },
    }),
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId },
      include: {
        user:    { select: { id: true, name: true, job_role: true } },
        module:  { select: { id: true, name: true, category: true, sort_order: true } },
        answers: { select: { question_id: true, question_text: true, answer_text: true, is_correct: true, answered_at: true } },
      },
    }),
  ])

  // Build a lookup of question text from the current module JSON for answers that lack a snapshot
  const questionTextLookup: Record<string, string> = {}
  for (const m of trainingModules) {
    for (const q of (m.questions as any[]) ?? []) {
      if (q.id && q.text) questionTextLookup[q.id] = q.text
    }
  }

  // ── Per-question gap analysis ──────────────────────────────────────────────
  // Aggregate all answers across the tenant, grouped by question_id
  const questionStats: Record<string, { question_id: string; question_text: string; module_id: string; module_name: string; total: number; incorrect: number }> = {}

  for (const enrollment of enrollments) {
    for (const answer of (enrollment.answers as any[])) {
      const qid   = answer.question_id
      const qtext = answer.question_text ?? questionTextLookup[qid] ?? 'Unknown question'
      if (!questionStats[qid]) {
        questionStats[qid] = {
          question_id:   qid,
          question_text: qtext,
          module_id:     enrollment.module_id,
          module_name:   enrollment.module.name,
          total:         0,
          incorrect:     0,
        }
      }
      questionStats[qid].total++
      if (!answer.is_correct) questionStats[qid].incorrect++
    }
  }

  const allQuestionStats = Object.values(questionStats).map(s => ({
    ...s,
    incorrect_rate: s.total > 0 ? Math.round((s.incorrect / s.total) * 100) : 0,
  }))

  // Gaps = questions where at least 2 people answered and incorrect rate >= 40%
  const question_gaps = allQuestionStats
    .filter(s => s.total >= 2 && s.incorrect_rate >= 40)
    .sort((a, b) => b.incorrect_rate - a.incorrect_rate)

  // ── Per-staff gap analysis ─────────────────────────────────────────────────
  const staff_gaps = enrollments.map((enrollment: any) => {
    const answers      = (enrollment.answers as any[]) ?? []
    const total        = answers.length
    const incorrect    = answers.filter((a: any) => !a.is_correct).length
    const isExpired    = enrollment.expires_at && new Date(enrollment.expires_at) < now && enrollment.status === 'complete'
    const status       = isExpired ? 'expired' : enrollment.status

    // Weak areas = questions this person got wrong
    const weak_questions = answers
      .filter((a: any) => !a.is_correct)
      .map((a: any) => a.question_text ?? questionTextLookup[a.question_id] ?? 'Unknown question')

    return {
      user_id:        enrollment.user.id,
      user_name:      enrollment.user.name,
      job_role:       enrollment.user.job_role,
      module_id:      enrollment.module_id,
      module_name:    enrollment.module.name,
      module_category: enrollment.module.category,
      status,
      total_answers:  total,
      incorrect,
      incorrect_rate: total > 0 ? Math.round((incorrect / total) * 100) : 0,
      weak_questions,
    }
  }).filter((s: any) => s.total_answers > 0 || s.status === 'expired')

  // ── Module-level summary ───────────────────────────────────────────────────
  const module_summary = trainingModules.map((m: any) => {
    const moduleEnrollments = enrollments.filter((e: any) => e.module_id === m.id)
    const moduleAnswers     = moduleEnrollments.flatMap((e: any) => e.answers ?? [])
    const total             = moduleAnswers.length
    const incorrect         = moduleAnswers.filter((a: any) => !a.is_correct).length
    const gaps              = question_gaps.filter(q => q.module_id === m.id)
    return {
      module_id:      m.id,
      module_name:    m.name,
      category:       m.category,
      total_answers:  total,
      incorrect,
      incorrect_rate: total > 0 ? Math.round((incorrect / total) * 100) : 0,
      gap_count:      gaps.length,
    }
  }).filter((m: any) => m.total_answers > 0)

  ok(res, { question_gaps, staff_gaps, module_summary })
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
    select: { name: true, logo_url: true, plan: { select: { has_cqc_report: true } } },
  })

  if (!tenant?.plan?.has_cqc_report) {
    err(res, 'PLAN_REQUIRED', 'CQC Readiness Report requires the Professional plan.', 403)
    return
  }

  const dateTo   = req.query.date_to
    ? (() => { const d = new Date(req.query.date_to as string); d.setUTCHours(23, 59, 59, 999); return d })()
    : new Date()
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

  // Reverse index: policy_id → queries that cited it. Built in a single pass over
  // periodQueries so the per-policy summaries below are O(P + Q), not O(P × Q).
  const citationsByPolicy = new Map<string, any[]>()
  for (const q of periodQueries) {
    for (const pid of (q.policy_ids_cited as string[])) {
      const arr = citationsByPolicy.get(pid)
      if (arr) arr.push(q)
      else citationsByPolicy.set(pid, [q])
    }
  }

  // ── 1. Policy Access Summary ─────────────────────────────────────────────────
  const policyAccess = activePolicies.map((p: any) => {
    const citing = citationsByPolicy.get(p.id) ?? []
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
    const citing = citationsByPolicy.get(p.id) ?? []
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

  // ── 9. Staff Training Compliance & Gaps ───────────────────────────────────────
  const reportNow = new Date()
  const [trainingUsers, trainingEnrollments, trainingModules] = await Promise.all([
    (prisma as any).user.findMany({
      where:  { tenant_id: tenantId, is_active: true },
      select: { id: true, name: true, job_role: true },
    }),
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId },
      include: {
        user:    { select: { id: true, name: true, job_role: true } },
        module:  { select: { id: true, name: true, category: true, sort_order: true } },
        answers: { select: { question_id: true, question_text: true, is_correct: true } },
      },
    }),
    (prisma as any).trainingModule.findMany({
      where:   { tenant_id: tenantId, is_active: true },
      orderBy: { sort_order: 'asc' },
    }),
  ])

  const enrichedEnrollments = trainingEnrollments.map((e: any) => {
    let status = e.status as string
    if (e.expires_at && new Date(e.expires_at) < reportNow && status === 'complete') status = 'expired'
    return { ...e, status }
  })

  const trainingModuleBreakdown = trainingModules
    .map((m: any) => {
      const rows        = enrichedEnrollments.filter((e: any) => e.module_id === m.id)
      const completed   = rows.filter((e: any) => e.status === 'complete').length
      const in_progress = rows.filter((e: any) => e.status === 'in_progress').length
      const not_started = rows.filter((e: any) => e.status === 'not_started').length
      const expired     = rows.filter((e: any) => e.status === 'expired').length
      return {
        name: m.name, category: m.category, sort_order: m.sort_order,
        enrolled: rows.length, completed, in_progress, not_started, expired,
        completion_rate: rows.length > 0 ? Math.round((completed / rows.length) * 100) : 0,
      }
    })
    .filter((m: any) => m.enrolled > 0)
    .sort((a: any, b: any) => a.sort_order - b.sort_order)

  const trainingStatutoryModules = trainingModules.filter((m: any) => m.category === 'statutory')
  const trainingCompliantStaff   = trainingUsers.filter((u: any) =>
    trainingStatutoryModules.length === 0 || trainingStatutoryModules.every((m: any) => {
      const e = enrichedEnrollments.find((e: any) => e.user_id === u.id && e.module_id === m.id)
      return e?.status === 'complete'
    })
  ).length

  const trainingAllAnswers   = enrichedEnrollments.flatMap((e: any) => e.answers ?? [])
  const trainingCorrect      = trainingAllAnswers.filter((a: any) => a.is_correct).length
  const trainingExpiringSoon = enrichedEnrollments.filter((e: any) => {
    if (e.status !== 'complete' || !e.expires_at) return false
    const days = Math.ceil((new Date(e.expires_at).getTime() - reportNow.getTime()) / 86400000)
    return days > 0 && days <= 90
  }).length

  // Training gaps: per-question failure analysis
  const questionTextLookup: Record<string, string> = {}
  for (const m of trainingModules) {
    for (const q of (m.questions as any[]) ?? []) {
      if (q.id && q.text) questionTextLookup[q.id] = q.text
    }
  }
  const qStats: Record<string, { question_text: string; module_name: string; total: number; incorrect: number }> = {}
  for (const enrollment of enrichedEnrollments) {
    for (const answer of (enrollment.answers as any[])) {
      const qid   = answer.question_id
      const qtext = answer.question_text ?? questionTextLookup[qid] ?? 'Unknown question'
      if (!qStats[qid]) qStats[qid] = { question_text: qtext, module_name: enrollment.module.name, total: 0, incorrect: 0 }
      qStats[qid].total++
      if (!answer.is_correct) qStats[qid].incorrect++
    }
  }
  const trainingQuestionGaps = Object.values(qStats)
    .map(s => ({ ...s, incorrect_rate: s.total > 0 ? Math.round((s.incorrect / s.total) * 100) : 0 }))
    .filter(s => s.total >= 2 && s.incorrect_rate >= 40)
    .sort((a, b) => b.incorrect_rate - a.incorrect_rate)

  // Training chat engagement: queries where staff were actively researching training topics
  const trainingChatQueries = periodQueries.filter((q: any) => q.document_category_queried === 'training_module')
  const trainingChatUserIds = new Set<string>(
    trainingChatQueries.filter((q: any) => q.user_id).map((q: any) => q.user_id as string),
  )

  // Load names for users who engaged in training chat
  const trainingChatUserRows: any[] = trainingChatUserIds.size > 0
    ? await (prisma as any).user.findMany({
        where:  { id: { in: [...trainingChatUserIds] }, tenant_id: tenantId },
        select: { id: true, name: true, job_role: true },
      })
    : []
  const trainingChatUserMap = new Map(trainingChatUserRows.map((u: any) => [u.id, u]))

  const trainingChatByUser = [...trainingChatUserIds].map(uid => {
    const userQueries = trainingChatQueries.filter((q: any) => q.user_id === uid)
    const lastQ       = userQueries.reduce((a: any, b: any) => a.created_at > b.created_at ? a : b, userQueries[0])
    return {
      user_id:       uid,
      user_name:     (trainingChatUserMap.get(uid) as any)?.name ?? 'Unknown',
      job_role:      (trainingChatUserMap.get(uid) as any)?.job_role ?? null,
      query_count:   userQueries.length,
      last_active:   lastQ?.created_at ?? null,
    }
  }).sort((a, b) => b.query_count - a.query_count)

  const trainingCompliance = {
    compliance_rate:     trainingUsers.length > 0 ? Math.round((trainingCompliantStaff / trainingUsers.length) * 100) : 0,
    compliant_staff:     trainingCompliantStaff,
    total_staff:         trainingUsers.length,
    total_enrollments:   trainingEnrollments.length,
    module_breakdown:    trainingModuleBreakdown,
    total_answers:       trainingAllAnswers.length,
    correct_answers:     trainingCorrect,
    correct_answer_rate: trainingAllAnswers.length > 0 ? Math.round((trainingCorrect / trainingAllAnswers.length) * 100) : 0,
    expiring_soon_count: trainingExpiringSoon,
    expired_count:       enrichedEnrollments.filter((e: any) => e.status === 'expired').length,
    knowledge_gaps:      trainingQuestionGaps,
    // Staff actively researching training topics via the learning chat
    chat_engagement: {
      total_queries:   trainingChatQueries.length,
      unique_staff:    trainingChatUserIds.size,
      by_user:         trainingChatByUser,
    },
  }

  ok(res, {
    meta: {
      org_name:                 tenant.name,
      org_logo_url:             tenant.logo_url ?? null,
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
    training_compliance:    trainingCompliance,
  })
})

// ─── GET /analytics/cqc-prep ─────────────────────────────────────────────────
// CQC Staff Prep performance analytics for the current tenant.

analyticsRouter.get('/cqc-prep', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const deliveries = await (prisma as any).cqcStaffDelivery.findMany({
      where:   { tenant_id: tenantId },
      include: {
        question: { select: { domain: true } },
        user:     { select: { id: true, name: true, job_role: true } },
      },
      orderBy: { sent_at: 'desc' },
    })

    const evaluated = deliveries.filter((d: any) => d.status === 'evaluated')
    const pending   = deliveries.filter((d: any) => d.status === 'pending')

    // Overall summary
    const avgScore = evaluated.length
      ? Math.round(evaluated.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / evaluated.length)
      : null
    const pct80Plus = evaluated.length
      ? Math.round(evaluated.filter((d: any) => (d.score ?? 0) >= 80).length / evaluated.length * 100)
      : null

    // Review & retry: how many answers were re-attempted after reviewing the model
    // answer, and the average score improvement — direct evidence staff are learning.
    const retriedItems = evaluated.filter((d: any) => (d.attempts ?? 1) > 1 && d.first_score != null)
    const retried = retriedItems.length
    const avgImprovement = retried
      ? Math.round(retriedItems.reduce((s: number, d: any) => s + ((d.score ?? 0) - (d.first_score ?? 0)), 0) / retried)
      : null

    // Per-domain breakdown
    const DOMAINS = ['safe', 'effective', 'caring', 'responsive', 'well_led']
    const by_domain = DOMAINS.map(domain => {
      const sent  = deliveries.filter((d: any) => d.question.domain === domain)
      const done  = sent.filter((d: any) => d.status === 'evaluated')
      const avg      = done.length ? Math.round(done.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / done.length) : null
      const pct80    = done.length ? Math.round(done.filter((d: any) => (d.score ?? 0) >= 80).length / done.length * 100) : null
      return { domain, total_sent: sent.length, total_answered: done.length, avg_score: avg, pct_80_plus: pct80 }
    })

    // Per-staff performance
    const userMap = new Map<string, { name: string; job_role: string | null; answers: any[] }>()
    for (const d of evaluated) {
      if (!userMap.has(d.user_id)) {
        userMap.set(d.user_id, { name: d.user.name, job_role: d.user.job_role, answers: [] })
      }
      userMap.get(d.user_id)!.answers.push(d)
    }
    const staff_performance = Array.from(userMap.entries()).map(([user_id, u]) => {
      const overall = Math.round(u.answers.reduce((s, d) => s + (d.score ?? 0), 0) / u.answers.length)
      const by_domain = DOMAINS.reduce((acc, dom) => {
        const domAnswers = u.answers.filter((d: any) => d.question.domain === dom)
        acc[dom] = domAnswers.length
          ? Math.round(domAnswers.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / domAnswers.length)
          : null
        return acc
      }, {} as Record<string, number | null>)
      const userRetried = u.answers.filter((d: any) => (d.attempts ?? 1) > 1 && d.first_score != null)
      const improvement = userRetried.length
        ? Math.round(userRetried.reduce((s: number, d: any) => s + ((d.score ?? 0) - (d.first_score ?? 0)), 0) / userRetried.length)
        : null
      return { user_id, name: u.name, job_role: u.job_role, total_answered: u.answers.length, avg_score: overall, retried: userRetried.length, improvement, by_domain }
    }).sort((a, b) => b.avg_score - a.avg_score)

    ok(res, {
      summary: {
        total_sent:      deliveries.length,
        total_answered:  evaluated.length,
        pending:         pending.length,
        avg_score:       avgScore,
        pct_80_plus:     pct80Plus,
        retried,
        avg_improvement: avgImprovement,
      },
      by_domain,
      staff_performance,
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/engagement ────────────────────────────────────────────────
// The WhatsApp → Hub migration scoreboard: weekly active staff %, an 8-week trend,
// and the channel mix (hub vs WhatsApp vs email vs voice) so you can watch the hub
// take over as WhatsApp ramps down. "Active" = opened the hub (login) OR asked a
// question OR read a policy in the window.
analyticsRouter.get('/engagement', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const DAY  = 86_400_000
  const WEEK = 7 * DAY
  const WEEKS = 8
  try {
    const now   = Date.now()
    const since = new Date(now - WEEKS * WEEK)

    const [users, allQ, reads] = await Promise.all([
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, last_login_at: true } }),
      (prisma as any).queryRecord.findMany({ where: { tenant_id: tenantId, created_at: { gte: since } }, select: { user_id: true, created_at: true, channel: true } }),
      (prisma as any).policyReadSession.findMany({ where: { tenant_id: tenantId, created_at: { gte: since } }, select: { user_id: true, created_at: true } }),
    ])

    const totalStaff = (users as any[]).length
    const loggedIn7d = new Set((users as any[]).filter(u => u.last_login_at && (now - new Date(u.last_login_at).getTime()) <= WEEK).map(u => u.id))

    // User-attributed activity events (have history; logins are a snapshot only).
    const events: Array<{ user_id: string; t: number }> = [
      ...(allQ as any[]).filter(q => q.user_id).map(q => ({ user_id: q.user_id as string, t: new Date(q.created_at).getTime() })),
      ...(reads as any[]).map(r => ({ user_id: r.user_id as string, t: new Date(r.created_at).getTime() })),
    ]

    // Headline weekly-active: activity in last 7d ∪ logged in last 7d.
    const active7d = new Set(events.filter(e => (now - e.t) <= WEEK).map(e => e.user_id))
    for (const id of loggedIn7d) active7d.add(id)
    const wauPct = totalStaff ? Math.round((active7d.size / totalStaff) * 100) : null

    // 8-week trend (activity-based — login has no history). Oldest → newest.
    const CHANNELS = ['chat', 'whatsapp', 'email', 'voice'] as const
    const trend = Array.from({ length: WEEKS }, (_, i) => {
      const end = now - i * WEEK, start = end - WEEK
      const set = new Set(events.filter(e => e.t >= start && e.t < end).map(e => e.user_id))
      const ch: Record<string, number> = { chat: 0, whatsapp: 0, email: 0, voice: 0 }
      for (const q of allQ as any[]) {
        const t = new Date(q.created_at).getTime()
        if (t >= start && t < end && ch[q.channel] !== undefined) ch[q.channel]++
      }
      return {
        week_start: new Date(start).toISOString(),
        active: set.size,
        pct: totalStaff ? Math.round((set.size / totalStaff) * 100) : 0,
        channels: ch,
      }
    }).reverse()

    // Channel mix over the last 30 days.
    const ch30: Record<string, number> = { chat: 0, whatsapp: 0, email: 0, voice: 0 }
    for (const q of allQ as any[]) {
      if ((now - new Date(q.created_at).getTime()) <= 30 * DAY && ch30[q.channel] !== undefined) ch30[q.channel]++
    }
    const ch30Total = CHANNELS.reduce((s, c) => s + ch30[c], 0)

    ok(res, {
      wau: { active: active7d.size, total_staff: totalStaff, pct: wauPct },
      logged_in_7d: loggedIn7d.size,
      trend,
      channels: { ...ch30, total: ch30Total, hub_pct: ch30Total ? Math.round((ch30.chat / ch30Total) * 100) : null },
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/language-switches ─────────────────────────────────────────
// Where staff lean on their second language: which sets they flip out of English.
// A training/language gap signal. Returns an aggregate (generalist) view plus a
// per-staff breakdown for the Staff tab.

const SWITCH_AREA_LABELS: Record<string, string> = {
  training: 'My Training', annual: 'Annual Training', induction: 'Induction',
  followup: 'Follow-up', cqc: 'CQC Prep',
}

analyticsRouter.get('/language-switches', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const DAY = 86_400_000
  try {
    const since = new Date(Date.now() - 180 * DAY)
    const [events, users] = await Promise.all([
      (prisma as any).languageSwitchEvent.findMany({
        where: { tenant_id: tenantId, created_at: { gte: since } },
        select: { user_id: true, area: true, set_ref: true, set_name: true, lang: true, lang_name: true, created_at: true },
        orderBy: { created_at: 'desc' },
      }),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId }, select: { id: true, name: true, job_role: true } }),
    ])

    const userMap = new Map<string, { name: string; job_role: string | null }>()
    for (const u of users as any[]) userMap.set(u.id, { name: u.name, job_role: u.job_role })

    const setLabel = (area: string, setName: string | null) => setName || SWITCH_AREA_LABELS[area] || area

    // ── Aggregate (generalist) ────────────────────────────────────────────────
    const byAreaMap = new Map<string, number>()
    const byLangMap = new Map<string, { lang: string; lang_name: string; count: number; staff: Set<string> }>()
    const bySetMap  = new Map<string, { area: string; set_name: string; switch_count: number; staff: Set<string>; last_at: string }>()
    const byStaff   = new Map<string, { user_id: string; name: string; job_role: string | null; total: number; languages: Set<string>; sets: Map<string, { area: string; set_name: string; count: number; last_at: string }> }>()
    const staffSet  = new Set<string>()

    for (const ev of events as any[]) {
      const whenIso = new Date(ev.created_at).toISOString()
      staffSet.add(ev.user_id)
      byAreaMap.set(ev.area, (byAreaMap.get(ev.area) ?? 0) + 1)

      const lname = ev.lang_name || ev.lang
      const lkey  = ev.lang
      if (!byLangMap.has(lkey)) byLangMap.set(lkey, { lang: ev.lang, lang_name: lname, count: 0, staff: new Set() })
      const lrow = byLangMap.get(lkey)!; lrow.count++; lrow.staff.add(ev.user_id)

      const label = setLabel(ev.area, ev.set_name)
      const skey  = `${ev.area}::${label}`
      if (!bySetMap.has(skey)) bySetMap.set(skey, { area: ev.area, set_name: label, switch_count: 0, staff: new Set(), last_at: whenIso })
      const srow = bySetMap.get(skey)!; srow.switch_count++; srow.staff.add(ev.user_id)

      // ── Per-staff ──
      const u = userMap.get(ev.user_id)
      if (!byStaff.has(ev.user_id)) byStaff.set(ev.user_id, { user_id: ev.user_id, name: u?.name ?? 'Unknown', job_role: u?.job_role ?? null, total: 0, languages: new Set(), sets: new Map() })
      const st = byStaff.get(ev.user_id)!
      st.total++; st.languages.add(lname)
      if (!st.sets.has(skey)) st.sets.set(skey, { area: ev.area, set_name: label, count: 0, last_at: whenIso })
      st.sets.get(skey)!.count++
    }

    const by_area = [...byAreaMap.entries()].map(([area, count]) => ({ area, label: SWITCH_AREA_LABELS[area] || area, count })).sort((a, b) => b.count - a.count)
    const by_language = [...byLangMap.values()].map(l => ({ lang: l.lang, lang_name: l.lang_name, count: l.count, staff_count: l.staff.size })).sort((a, b) => b.count - a.count)
    const by_set = [...bySetMap.values()].map(s => ({ area: s.area, area_label: SWITCH_AREA_LABELS[s.area] || s.area, set_name: s.set_name, switch_count: s.switch_count, staff_count: s.staff.size, last_at: s.last_at })).sort((a, b) => b.switch_count - a.switch_count)
    const by_staff = [...byStaff.values()].map(s => ({
      user_id: s.user_id, name: s.name, job_role: s.job_role, total: s.total,
      languages: [...s.languages],
      sets: [...s.sets.values()].sort((a, b) => b.count - a.count),
    })).sort((a, b) => b.total - a.total)

    ok(res, {
      summary: { total_switches: (events as any[]).length, staff_count: staffSet.size, set_count: bySetMap.size, days: 180 },
      by_area, by_language, by_set, by_staff,
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/staff-risk ────────────────────────────────────────────────
// Staff who need attention: overdue/expired training, overdue or stalled
// induction, or never logged in. Powers the "Staff needing attention" panel.

analyticsRouter.get('/staff-risk', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const now  = new Date()
  const soon = new Date(now.getTime() + 30 * 86_400_000)
  const weekAgo = new Date(now.getTime() - 7 * 86_400_000)
  try {
    const [users, tEnr, oEnr] = await Promise.all([
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, name: true, job_role: true, first_login_at: true } }),
      (prisma as any).trainingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, status: true, due_date: true, expires_at: true } }),
      (prisma as any).onboardingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, completed_at: true, due_date: true, enrolled_at: true } }),
    ])

    const tByUser = new Map<string, any[]>()
    for (const e of tEnr as any[]) { const a = tByUser.get(e.user_id) ?? []; a.push(e); tByUser.set(e.user_id, a) }
    const oByUser = new Map<string, any[]>()
    for (const e of oEnr as any[]) { const a = oByUser.get(e.user_id) ?? []; a.push(e); oByUser.set(e.user_id, a) }

    const staff = (users as any[]).map(u => {
      const ts = tByUser.get(u.id) ?? []
      const os = oByUser.get(u.id) ?? []
      const flags: Array<{ level: 'high' | 'medium'; kind: string; label: string }> = []
      const expired = ts.filter(e => e.expires_at && new Date(e.expires_at) < now && e.status === 'complete').length
      const overdue = ts.filter(e => e.due_date && new Date(e.due_date) < now && e.status !== 'complete').length
      const dueSoon = ts.filter(e => e.due_date && new Date(e.due_date) >= now && new Date(e.due_date) <= soon && e.status !== 'complete').length
      const oOverdue = os.filter(e => e.due_date && new Date(e.due_date) < now && !e.completed_at).length
      const oStalled = os.filter(e => !e.completed_at && e.enrolled_at && new Date(e.enrolled_at) < weekAgo).length
      if (expired > 0)  flags.push({ level: 'high',   kind: 'training_expired', label: `${expired} expired` })
      if (overdue > 0)  flags.push({ level: 'high',   kind: 'training_overdue', label: `${overdue} overdue training` })
      if (oOverdue > 0) flags.push({ level: 'high',   kind: 'onboarding_overdue', label: 'Induction overdue' })
      if (!u.first_login_at) flags.push({ level: 'medium', kind: 'never_logged_in', label: 'Never logged in' })
      if (dueSoon > 0)  flags.push({ level: 'medium', kind: 'training_due_soon', label: `${dueSoon} due soon` })
      if (oStalled > 0) flags.push({ level: 'medium', kind: 'onboarding_stalled', label: 'Induction stalled' })
      return { id: u.id, name: u.name, job_role: u.job_role, flags, severity: flags.some(f => f.level === 'high') ? 2 : flags.length ? 1 : 0 }
    }).filter(s => s.flags.length > 0).sort((a, b) => b.severity - a.severity)

    ok(res, {
      staff,
      summary: {
        total_flagged: staff.length,
        high:          staff.filter(s => s.severity === 2).length,
      },
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/policy-reading ────────────────────────────────────────────
// Aggregate policy-reading engagement: how thoroughly staff read induction
// policies (time, scroll depth, completion) overall and per policy.

analyticsRouter.get('/policy-reading', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const sessions = await (prisma as any).policyReadSession.findMany({
      where:  { tenant_id: tenantId },
      select: { user_id: true, policy_id: true, seconds_spent: true, max_scroll_pct: true, reached_end: true, marked_read: true },
    })

    const total = (sessions as any[]).length
    if (total === 0) {
      ok(res, { summary: { total_sessions: 0, staff_count: 0, avg_seconds: null, avg_scroll_pct: null, pct_reached_end: null }, by_policy: [] })
      return
    }

    const avg = (sel: (s: any) => number) => Math.round((sessions as any[]).reduce((a, s) => a + sel(s), 0) / total)
    const summary = {
      total_sessions:  total,
      staff_count:     new Set((sessions as any[]).map(s => s.user_id)).size,
      avg_seconds:     avg(s => s.seconds_spent ?? 0),
      avg_scroll_pct:  avg(s => s.max_scroll_pct ?? 0),
      pct_reached_end: Math.round(((sessions as any[]).filter(s => s.reached_end).length / total) * 100),
    }

    const byPolicy = new Map<string, any>()
    for (const s of sessions as any[]) {
      const g = byPolicy.get(s.policy_id) ?? { policy_id: s.policy_id, sessions: 0, secs: 0, scroll: 0, reached: 0 }
      g.sessions += 1; g.secs += s.seconds_spent ?? 0; g.scroll += s.max_scroll_pct ?? 0; g.reached += s.reached_end ? 1 : 0
      byPolicy.set(s.policy_id, g)
    }
    const ids = [...byPolicy.keys()]
    const policies = await (prisma as any).policy.findMany({ where: { id: { in: ids }, tenant_id: tenantId }, select: { id: true, filename: true } })
    const titleById = new Map((policies as any[]).map(p => [p.id, (p.filename || 'Policy').replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()]))

    const by_policy = [...byPolicy.values()]
      .filter(g => titleById.has(g.policy_id))
      .map(g => ({
        policy_id:       g.policy_id,
        title:           titleById.get(g.policy_id),
        sessions:        g.sessions,
        avg_seconds:     Math.round(g.secs / g.sessions),
        avg_scroll_pct:  Math.round(g.scroll / g.sessions),
        pct_reached_end: Math.round((g.reached / g.sessions) * 100),
      }))
      .sort((a, b) => b.sessions - a.sessions)

    ok(res, { summary, by_policy })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/induction-performance ─────────────────────────────────────
// Overall induction question performance + the questions most often answered
// incorrectly (knowledge gaps).

analyticsRouter.get('/induction-performance', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const enrollments = await (prisma as any).onboardingEnrollment.findMany({
      where:   { tenant_id: tenantId },
      include: {
        flow:     { include: { steps: { select: { id: true, type: true, question: true } } } },
        progress: { select: { step_id: true, answer_text: true, answer_correct: true } },
      },
    })

    let total = 0, correct = 0
    const staff = new Set<string>()
    const byQ = new Map<string, any>()
    for (const e of enrollments as any[]) {
      const stepById = new Map<string, any>((e.flow?.steps ?? []).map((s: any) => [s.id, s]))
      for (const p of (e.progress ?? [])) {
        if (p.answer_text == null) continue
        const step = stepById.get(p.step_id)
        if (!step || step.type !== 'answer_question') continue
        total += 1
        if (p.answer_correct === true) correct += 1
        staff.add(e.user_id)
        const g = byQ.get(step.id) ?? { question: step.question, answered: 0, incorrect: 0 }
        g.answered += 1
        if (p.answer_correct !== true) g.incorrect += 1
        byQ.set(step.id, g)
      }
    }
    console.log(`[induction-perf] tenant=${tenantId} answered=${total}`)

    if (total === 0) {
      ok(res, { summary: { total_answered: 0, correct: 0, pct_correct: null, staff_answered: 0 }, weak_questions: [] })
      return
    }

    const summary = {
      total_answered: total,
      correct,
      pct_correct:    Math.round((correct / total) * 100),
      staff_answered: staff.size,
    }

    const weak_questions = [...byQ.values()]
      .filter(g => g.incorrect > 0)
      .map(g => ({ question: g.question, answered: g.answered, incorrect: g.incorrect, incorrect_rate: Math.round((g.incorrect / g.answered) * 100) }))
      .sort((a, b) => b.incorrect_rate - a.incorrect_rate || b.incorrect - a.incorrect)
      .slice(0, 10)

    ok(res, { summary, weak_questions })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/follow-up ─────────────────────────────────────────────────
// Staff with unreviewed knowledge gaps (wrong training/induction answers since
// their last review). Powers the admin hub "Needs follow-up" card.

analyticsRouter.get('/follow-up', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const [users, tEnr, oEnr, reviews] = await Promise.all([
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, name: true, job_role: true } }),
      (prisma as any).trainingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, answers: { where: { is_correct: false }, select: { answered_at: true } } } }),
      (prisma as any).onboardingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, progress: { where: { answer_correct: false }, select: { completed_at: true } } } }),
      (prisma as any).knowledgeGapReview.findMany({ where: { tenant_id: tenantId }, orderBy: { created_at: 'desc' }, select: { user_id: true, created_at: true } }),
    ])

    const trainByUser = new Map<string, any[]>()
    for (const e of tEnr as any[]) { const a = trainByUser.get(e.user_id) ?? []; for (const ans of (e.answers ?? [])) a.push(ans.answered_at); trainByUser.set(e.user_id, a) }
    const indByUser = new Map<string, any[]>()
    for (const e of oEnr as any[]) { const a = indByUser.get(e.user_id) ?? []; for (const p of (e.progress ?? [])) a.push(p.completed_at); indByUser.set(e.user_id, a) }
    const reviewedAt = new Map<string, number>()
    for (const r of reviews as any[]) { if (!reviewedAt.has(r.user_id)) reviewedAt.set(r.user_id, new Date(r.created_at).getTime()) }

    const staff = (users as any[]).map(u => {
      const t = trainByUser.get(u.id) ?? []
      const i = indByUser.get(u.id) ?? []
      const rv = reviewedAt.get(u.id) ?? 0
      const unreviewed = [...t, ...i].filter(when => !when || new Date(when).getTime() > rv).length
      return { id: u.id, name: u.name, job_role: u.job_role, training_gaps: t.length, induction_gaps: i.length, total_gaps: t.length + i.length, unreviewed }
    }).filter(s => s.unreviewed > 0).sort((a, b) => b.unreviewed - a.unreviewed)

    ok(res, { staff, summary: { total: staff.length, total_gaps: staff.reduce((a, s) => a + s.total_gaps, 0) } })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/effectiveness ─────────────────────────────────────────────
// Phase-1 "Effectiveness of Training": evidence that training + follow-up are
// improving knowledge, from data CareStream already holds. Maps to Kirkpatrick
// levels 1–3 (reaction, learning, behaviour). Level 4 (care outcomes) is a later
// phase that needs outcome data to be captured.
analyticsRouter.get('/effectiveness', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  const DAY = 86_400_000, WEEK = 7 * DAY
  try {
    await checkFeature(tenantId, 'has_effectiveness')
    const now = Date.now()
    const since7 = new Date(now - 7 * DAY), since30 = new Date(now - 30 * DAY)
    const [kg, attempts, enrollments, cqc, langEvents, ratings] = await Promise.all([
      getKnowledgeGapData(tenantId),
      (prisma as any).remediationAttempt.findMany({ where: { tenant_id: tenantId }, select: { user_id: true, method: true, created_at: true } }),
      (prisma as any).trainingEnrollment.findMany({
        where:  { tenant_id: tenantId },
        select: { user_id: true, status: true, eval_confidence: true, eval_usefulness: true, eval_at: true, answers: { select: { is_correct: true } } },
      }),
      (prisma as any).cqcStaffDelivery.findMany({ where: { tenant_id: tenantId, status: 'evaluated' }, select: { score: true, first_score: true, attempts: true } }),
      (prisma as any).languageSwitchEvent.findMany({ where: { tenant_id: tenantId }, select: { user_id: true } }),
      (prisma as any).trainingRating.findMany({ where: { tenant_id: tenantId }, select: { confidence: true, usefulness: true } }),
    ])

    // ── Learning loop: gaps put right via follow-up (uncapped) ──
    const att = attempts as any[]
    const learn = att.filter(a => a.method !== 'retry').length
    const retry = att.filter(a => a.method === 'retry').length
    const putRight = att.length
    const openGaps = kg.summary.open_gaps
    const resolved7  = att.filter(a => new Date(a.created_at) >= since7).length
    const resolved30 = att.filter(a => new Date(a.created_at) >= since30).length
    const trend = Array.from({ length: 8 }, (_, i) => {
      const end = now - i * WEEK, start = end - WEEK
      return { week_start: new Date(start).toISOString(), resolved: att.filter(a => { const t = new Date(a.created_at).getTime(); return t >= start && t < end }).length }
    }).reverse()

    // ── Mastery: completion + assessment accuracy ──
    const enr = enrollments as any[]
    const assigned = enr.length
    const completed = enr.filter(e => e.status === 'complete').length
    let totalAns = 0, correctAns = 0
    for (const e of enr) for (const a of (e.answers ?? [])) { totalAns++; if (a.is_correct) correctAns++ }

    // ── Reaction: post-completion ratings (annual enrolment evals + the new
    //    My Training / Follow-up / CQC ratings), each 1–5 → %. ──
    const evald = enr.filter(e => e.eval_at && (e.eval_confidence != null || e.eval_usefulness != null))
    const ratingRows = ratings as any[]
    const confVals = [...evald.map(e => e.eval_confidence), ...ratingRows.map(r => r.confidence)].filter((v: any) => v != null) as number[]
    const usefVals = [...evald.map(e => e.eval_usefulness), ...ratingRows.map(r => r.usefulness)].filter((v: any) => v != null) as number[]
    const responses = evald.length + ratingRows.length
    const avgPct5 = (vals: number[]) => vals.length ? Math.round((vals.reduce((a, b) => a + b, 0) / vals.length / 5) * 100) : null

    // ── CQC prep: improvement after reviewing the model answer and retrying ──
    const cqcEvald = cqc as any[]
    const retried = cqcEvald.filter(d => (d.attempts ?? 1) > 1 && d.first_score != null)
    const avg = (vals: number[]) => vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length) : null

    // ── Language inclusion parity: does 2nd-language support keep competency on par? ──
    const langUsers = new Set((langEvents as any[]).map(l => l.user_id))
    const groupStats = (members: any[]) => {
      const total = members.length
      const comp = members.filter(e => e.status === 'complete').length
      let t = 0, c = 0
      for (const e of members) for (const a of (e.answers ?? [])) { t++; if (a.is_correct) c++ }
      return { staff: new Set(members.map(e => e.user_id)).size, completion_pct: total ? Math.round((comp / total) * 100) : null, avg_score: t ? Math.round((c / t) * 100) : null }
    }

    ok(res, {
      headline: {
        gaps_put_right:  putRight,
        open_gaps:       openGaps,
        resolution_rate: (putRight + openGaps) > 0 ? Math.round((putRight / (putRight + openGaps)) * 100) : null,
        engaged_pct:     (learn + retry) > 0 ? Math.round((learn / (learn + retry)) * 100) : null,
        resolved_30d:    resolved30,
      },
      loop:    { learn, retry, resolved_7d: resolved7, resolved_30d: resolved30, trend },
      mastery: { assigned, completed, completion_pct: assigned ? Math.round((completed / assigned) * 100) : null, avg_assessment_score: totalAns ? Math.round((correctAns / totalAns) * 100) : null, answers: totalAns },
      reaction:{ responses, avg_confidence_pct: avgPct5(confVals), avg_usefulness_pct: avgPct5(usefVals) },
      cqc:     { evaluated: cqcEvald.length, retried: retried.length, avg_first_score: avg(retried.map(d => d.first_score)), avg_latest_score: avg(retried.map(d => d.score)), avg_improvement: retried.length ? Math.round(retried.reduce((s, d) => s + ((d.score ?? 0) - (d.first_score ?? 0)), 0) / retried.length) : null },
      language:{ second_lang_users: langUsers.size, with: groupStats(enr.filter(e => langUsers.has(e.user_id))), without: groupStats(enr.filter(e => !langUsers.has(e.user_id))) },
    })
  } catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── GET /analytics/training-impact ───────────────────────────────────────────
// For audits linked to training modules: a monthly timeline of audit compliance %
// alongside cumulative training completion %, so admins can see whether the
// training is correlated with a real improvement in audited practice. Correlation,
// not causation — framed as a trend + before/after on the client.
analyticsRouter.get('/training-impact', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    await checkFeature(tenantId, 'has_training_impact')
    const templates = await (prisma as any).auditTemplate.findMany({
      where:  { tenant_id: tenantId, is_active: true, module_ids: { isEmpty: false } },
      select: { id: true, name: true, module_ids: true },
    })
    if (!(templates as any[]).length) { ok(res, { audits: [] }); return }

    const allModuleIds = [...new Set((templates as any[]).flatMap((t: any) => t.module_ids))]
    const [runs, modules, enrollments] = await Promise.all([
      (prisma as any).auditRun.findMany({
        where:  { tenant_id: tenantId, template_id: { in: (templates as any[]).map((t: any) => t.id) }, status: 'completed' },
        select: { template_id: true, audit_month: true, answers: { select: { answer_yn: true, answer_na: true } } },
        orderBy: { audit_month: 'asc' },
      }),
      (prisma as any).trainingModule.findMany({ where: { id: { in: allModuleIds } }, select: { id: true, name: true } }),
      (prisma as any).trainingEnrollment.findMany({ where: { tenant_id: tenantId, module_id: { in: allModuleIds } }, select: { module_id: true, created_at: true, completed_at: true } }),
    ])
    const moduleName = new Map((modules as any[]).map((m: any) => [m.id, m.name]))
    const monthEnd = (d: any) => { const x = new Date(d); return new Date(Date.UTC(x.getUTCFullYear(), x.getUTCMonth() + 1, 0, 23, 59, 59)) }
    const runScore = (r: any) => {
      const ans = r.answers ?? []
      const yes = ans.filter((a: any) => a.answer_yn === true && !a.answer_na).length
      const no  = ans.filter((a: any) => a.answer_yn === false && !a.answer_na).length
      return (yes + no) > 0 ? Math.round((yes / (yes + no)) * 100) : null
    }

    const audits = (templates as any[]).map((t: any) => {
      const tRuns = (runs as any[]).filter(r => r.template_id === t.id)
      const enr   = (enrollments as any[]).filter(e => t.module_ids.includes(e.module_id))
      const timeline = tRuns.map(r => {
        const end = monthEnd(r.audit_month)
        const assigned  = enr.filter(e => new Date(e.created_at) <= end).length
        const completed = enr.filter(e => e.completed_at && new Date(e.completed_at) <= end).length
        return { month: r.audit_month, audit_score: runScore(r), completion_pct: assigned > 0 ? Math.round((completed / assigned) * 100) : null }
      })
      const scores = timeline.map(x => x.audit_score).filter((x): x is number => x != null)
      const first = scores.length ? scores[0] : null
      const latest = scores.length ? scores[scores.length - 1] : null
      const currentCompleted = enr.filter(e => e.completed_at).length
      return {
        template_id: t.id, name: t.name,
        modules: t.module_ids.map((id: string) => ({ id, name: moduleName.get(id) ?? 'Module' })),
        runs: tRuns.length,
        timeline,
        first_score: first, latest_score: latest,
        score_change: (first != null && latest != null) ? latest - first : null,
        current_completion_pct: enr.length ? Math.round((currentCompleted / enr.length) * 100) : null,
      }
    })
    ok(res, { audits })
  } catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } err(res, 'FETCH_FAILED', e.message, 500) }
})

// ─── GET /analytics/knowledge-gaps ────────────────────────────────────────────
// Unified, team-wide view of knowledge gaps: open gaps (training + induction
// combined), the most-missed questions, the weakest topics, and how staff are
// closing gaps (Learn & retry vs Just retry — remediation effectiveness).

analyticsRouter.get('/knowledge-gaps', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const [data, snapshots] = await Promise.all([
      getKnowledgeGapData(tenantId),
      (prisma as any).knowledgeGapSnapshot.findMany({
        where: { tenant_id: tenantId }, orderBy: { date: 'asc' }, take: 90,
        select: { date: true, open_gaps: true, open_training: true, open_induction: true, resolved_7d: true },
      }).catch(() => []),
    ])
    const trend = (snapshots as any[]).map(s => ({
      date: s.date, open_gaps: s.open_gaps, open_training: s.open_training, open_induction: s.open_induction, resolved_7d: s.resolved_7d,
    }))
    ok(res, { ...data, trend })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /analytics/annual-training ───────────────────────────────────────────
// Team-wide annual (AI) training: completion, renewals due, certificates,
// practical assessments outstanding, and a per-module breakdown.

analyticsRouter.get('/annual-training', requireAdmin, async (_req: Request, res: Response) => {
  const tenantId = getTenantId()
  try {
    const now = new Date()
    const soon = new Date(now.getTime() + 30 * 86_400_000)
    const enrollments = await (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId },
      select: {
        user_id: true, status: true, expires_at: true, practical_signed: true, learn_seconds: true,
        eval_confidence: true, eval_usefulness: true,
        module:  { select: { id: true, name: true, source: true, requires_practical: true, questions: true, duration_minutes: true } },
        answers: { select: { is_correct: true } },
      },
    })
    const ai = (enrollments as any[]).filter(e => e.module?.source === 'ai_generated')

    const staff = new Set<string>()
    let completed = 0, overdue = 0, renewalDue = 0, practicalDue = 0
    const byModule = new Map<string, any>()
    for (const e of ai) {
      staff.add(e.user_id)
      const expired = e.expires_at && new Date(e.expires_at) < now && e.status === 'complete'
      const isComplete = e.status === 'complete' && !expired
      if (isComplete) completed += 1
      if (expired) renewalDue += 1
      else if (e.status === 'complete' && e.expires_at && new Date(e.expires_at) <= soon) renewalDue += 1
      if (e.status !== 'complete' && !e.expires_at && false) {} // (no due_date selected here)
      if (e.module?.requires_practical && e.status === 'complete' && !e.practical_signed) practicalDue += 1

      const total = Array.isArray(e.module?.questions) ? e.module.questions.length : 0
      const correct = (e.answers ?? []).filter((a: any) => a.is_correct).length
      const mk = e.module.id
      const g = byModule.get(mk) ?? { id: mk, name: e.module.name, requires_practical: e.module.requires_practical, claimed_minutes: e.module.duration_minutes ?? null, assigned: 0, completed: 0, scores: [] as number[], learn_secs: [] as number[], conf: [] as number[], use: [] as number[] }
      g.assigned += 1
      if (isComplete) { g.completed += 1; if (total) g.scores.push(Math.round((correct / total) * 100)) }
      if (e.learn_seconds > 0) g.learn_secs.push(e.learn_seconds)
      if (e.eval_confidence) g.conf.push(e.eval_confidence)
      if (e.eval_usefulness) g.use.push(e.eval_usefulness)
      byModule.set(mk, g)
    }
    const allLearnSecs = ai.filter(e => e.learn_seconds > 0).map(e => e.learn_seconds)
    const avgActualMinutes = allLearnSecs.length ? Math.round(allLearnSecs.reduce((a: number, b: number) => a + b, 0) / allLearnSecs.length / 60) : null
    const mean1dp = (arr: number[]) => arr.length ? Math.round((arr.reduce((a, b) => a + b, 0) / arr.length) * 10) / 10 : null
    const allConf = ai.filter(e => e.eval_confidence).map(e => e.eval_confidence as number)
    const allUse  = ai.filter(e => e.eval_usefulness).map(e => e.eval_usefulness as number)

    const modulesPublished = await (prisma as any).trainingModule.count({ where: { tenant_id: tenantId, source: 'ai_generated', approved: true } })

    const by_module = [...byModule.values()].map(m => ({
      id: m.id, name: m.name, requires_practical: m.requires_practical,
      assigned: m.assigned, completed: m.completed,
      avg_score: m.scores.length ? Math.round(m.scores.reduce((a: number, b: number) => a + b, 0) / m.scores.length) : null,
      completion_pct: m.assigned ? Math.round((m.completed / m.assigned) * 100) : 0,
      claimed_minutes: m.claimed_minutes,
      avg_actual_minutes: m.learn_secs.length ? Math.round(m.learn_secs.reduce((a: number, b: number) => a + b, 0) / m.learn_secs.length / 60) : null,
      avg_confidence: mean1dp(m.conf),
      avg_usefulness: mean1dp(m.use),
      eval_count: m.conf.length || m.use.length,
    })).sort((a, b) => a.completion_pct - b.completion_pct)

    ok(res, {
      summary: {
        modules_published: modulesPublished,
        staff: staff.size,
        assigned: ai.length,
        completed,
        renewal_due: renewalDue,
        practical_due: practicalDue,
        completion_pct: ai.length ? Math.round((completed / ai.length) * 100) : null,
        avg_actual_minutes: avgActualMinutes,
        avg_confidence: mean1dp(allConf),
        avg_usefulness: mean1dp(allUse),
        eval_count: Math.max(allConf.length, allUse.length),
      },
      by_module,
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})
