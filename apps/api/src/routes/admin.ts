import { Router, Request, Response } from 'express'
import fs from 'fs'
import path from 'path'
import { z } from 'zod'
import { requirePlatformAdmin } from '../middleware/auth'
import { getAiCreditUsage, getQueryUsage, trackAiAction } from '../lib/plan-limits'
import { DEFAULT_ONBOARDING_FLOW_PROMPT, DEFAULT_ONBOARDING_QUESTIONS_PROMPT } from './onboarding-templates'
import { DEFAULT_TRAINING_MODULE_PROMPT } from '../services/training/moduleGenerator'
import { DEFAULT_TRAINING_IMAGE_PROMPT } from '../services/training/moduleImage'
import { DEFAULT_POLICY_ANONYMISE_PROMPT } from './policy-seeds'
import { imageUploadMiddleware } from '../middleware/upload'
import { uploadBlogImage, deleteTenantFiles, getTenantStorageStats, getPlatformStorageStats, downloadExtractedText, downloadFile } from '../services/storage/s3'
import { formatPolicyHtml, getEnglishPolicyHtml, mapLimit } from '../lib/translate'
import { syncRegulationsFromSheets } from '../services/regulations/sheets-sync'
import { TRAINING_TOPICS } from '../data/training-topics'
import { SETTING_LABELS, facilityTypeToSetting, settingLabel } from '../lib/care-setting'
import { SERVICE_TRIGGERS, resolveServiceProfile, regulationAppliesToTenant } from '../lib/service-triggers'
import { renderOnboardingEmailHtml } from '../services/onboarding/render'
import { syncCqcSeedsFromSheets, populateCqcSeedsSheet } from '../services/cqc-seeds/sheets-sync'
import { prisma } from '../db/client'
import { embedTexts } from '../services/rag/embedder'
import { upsertRegulationVectors, deleteRegulationVector, deleteAllTenantPolicyVectors, getTenantVectorStats, getPlatformVectorStats } from '../services/vector/pinecone'
import type { RegulationVector } from '../services/vector/pinecone'
import { ok, err } from '../lib/response'
import { blogImagePublicUrl, siteUrl } from '../lib/urls'
import { submitUrlsForIndexing, countIndexedPages, ralfyIndexBalance } from '../services/ralfyindex/indexer'
import { authLimiter } from '../middleware/rateLimiter'
import { sendRenewalReminders } from '../services/training/renewalReminders'
import { PLATFORM_KNOWLEDGE_SEEDS, type SeedEntry } from '../data/platform-knowledge-seeds'
import { seedTenantKnowledge, seedAllTenants, seedCustomSeedToAllTenants } from '../services/knowledge/seeder'
import { hashPassword } from '../services/auth/password'
import { sendStaffWelcomeEmail } from '../services/email/outbound'
import { createLoginLink } from '../lib/login-tokens'
import { cloneTenant } from '../services/tenant/clone'
import { reconcileTenantBilling, listInvoices, getSubscriptionInfo } from '../services/billing/stripe'
import crypto from 'crypto'
import { DEFAULT_QUESTION_GENERATION_PROMPT, DEFAULT_ANSWER_EVALUATION_PROMPT } from './cqc-staff-questions'
import { DEFAULT_AUDIT_RECOMMENDATIONS_PROMPT, ensurePlatformTemplatesSeeded } from './audits'
import { DEFAULT_REGULATION_COVERAGE_PROMPT } from '../services/analytics/regulation-coverage'
import { defaultSignalSeeds, signalMatches, type TextSignal } from '../services/analytics/policy-lint-signals'
import { callClaude } from '../services/ai/claude'
import { snapshotAndAlert } from '../services/regulations/versioning'
import { checkRegulationSources } from '../services/regulations/source-monitor'

export const adminRouter = Router()

// ─── POST /admin/login ────────────────────────────────────────────────────────
// Email + password login for the platform owner UI. No token required.
// The email must be on the PLATFORM_ADMIN_EMAILS allowlist (comma-separated) AND
// the password must match PLATFORM_ADMIN_PASSWORD. Returns the PLATFORM_ADMIN_TOKEN
// on success so the UI can store it for subsequent /admin/* calls.

// authLimiter (10 req/min) throttles brute-forcing of the platform owner login.
adminRouter.post('/login', authLimiter, (req: Request, res: Response) => {
  const { email, password } = req.body ?? {}
  const adminPassword = process.env.PLATFORM_ADMIN_PASSWORD
  const adminToken    = process.env.PLATFORM_ADMIN_TOKEN
  const adminEmails   = (process.env.PLATFORM_ADMIN_EMAILS ?? '')
    .split(',')
    .map(e => e.trim().toLowerCase())
    .filter(Boolean)

  if (!adminPassword || !adminToken || adminEmails.length === 0) {
    err(res, 'NOT_CONFIGURED', 'Platform admin credentials not configured.', 503)
    return
  }

  const emailMatches =
    typeof email === 'string' && adminEmails.includes(email.trim().toLowerCase())

  // Constant-time password comparison — computed unconditionally so the response
  // time does not reveal whether the email was valid.
  const provided = Buffer.from(String(password ?? ''), 'utf8')
  const expected = Buffer.from(adminPassword, 'utf8')
  const passwordMatches =
    provided.length === expected.length && crypto.timingSafeEqual(provided, expected)

  // Generic error — never reveal which of email / password was wrong.
  if (!emailMatches || !passwordMatches) {
    err(res, 'INVALID_CREDENTIALS', 'Incorrect email or password.', 401)
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

  const [indexedPageCount, indexBalance] = await Promise.all([
    countIndexedPages(),
    ralfyIndexBalance(),
  ])

  ok(res, {
    tenantCount,
    activePolicyCount,
    knowledgeCount,
    queryCount,
    regulationCount,
    queriesLast7Days,
    queriesLast30Days,
    indexedPageCount,
    indexBalance,
  })
})

// ─── GET /admin/agent-events ──────────────────────────────────────────────────
// How AI agents are interacting with CareStream via WebMCP. Aggregate stats +
// per-tool breakdown + recent invocations, for the platform console (AI Agents tab).

adminRouter.get('/agent-events', async (_req: Request, res: Response) => {
  const since7  = new Date(Date.now() - 7  * 86_400_000)
  const since30 = new Date(Date.now() - 30 * 86_400_000)

  const [total, last7Days, last30Days, mutations, byToolRaw, recent] = await Promise.all([
    (prisma as any).agentEvent.count(),
    (prisma as any).agentEvent.count({ where: { created_at: { gte: since7 } } }),
    (prisma as any).agentEvent.count({ where: { created_at: { gte: since30 } } }),
    (prisma as any).agentEvent.count({ where: { mutation: true } }),
    (prisma as any).agentEvent.groupBy({
      by: ['tool_name'],
      _count: { tool_name: true },
      orderBy: { _count: { tool_name: 'desc' } },
    }),
    (prisma as any).agentEvent.findMany({
      orderBy: { created_at: 'desc' },
      take: 50,
      select: {
        id: true, tool_name: true, source: true, path: true, status: true, created_at: true,
        mutation: true, confirmed: true, summary: true, tenant_id: true,
      },
    }),
  ])

  const byTool = (byToolRaw as Array<{ tool_name: string; _count: { tool_name: number } }>).map(r => ({
    tool: r.tool_name,
    count: r._count.tool_name,
  }))

  ok(res, { total, last7Days, last30Days, mutations, byTool, recent })
})

// ─── GET /admin/leads ─────────────────────────────────────────────────────────
// Contact + demo form submissions (newest first) so leads are never lost.

adminRouter.get('/leads', async (_req: Request, res: Response) => {
  const [leads, total, newCount] = await Promise.all([
    (prisma as any).marketingLead.findMany({ orderBy: { created_at: 'desc' }, take: 200 }),
    (prisma as any).marketingLead.count(),
    (prisma as any).marketingLead.count({ where: { status: 'new' } }),
  ])
  ok(res, { leads, total, newCount })
})

// ─── GET /admin/tenants/:id/insights ──────────────────────────────────────────
// Per-tenant observability: Pinecone namespaces + vector counts, S3 storage, and
// ESTIMATED monthly costs (usage × published unit prices — not invoiced amounts).

adminRouter.get('/tenants/:id/insights', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }

  const since30 = new Date(Date.now() - 30 * 86_400_000)
  const [vectors, storage, queriesTotal, queries30] = await Promise.all([
    getTenantVectorStats(tenantId).catch(() => null),
    getTenantStorageStats(tenantId).catch(() => null),
    (prisma as any).queryRecord.count({ where: { tenant_id: tenantId } }),
    (prisma as any).queryRecord.count({ where: { tenant_id: tenantId, created_at: { gte: since30 } } }),
  ])

  // ── Monthly cost — storage estimated; AI measured from the per-call token log. ──
  const GB = 1024 ** 3
  const PINECONE_USD_PER_GB_MONTH = 0.33
  const S3_USD_PER_GB_MONTH       = 0.024                 // eu-west-2 S3 Standard
  const BYTES_PER_VECTOR          = 1536 * 4 + 1600        // 1536-dim float32 + ~chunk_text metadata
  const EMBED_USD_PER_VECTOR      = 0.000005               // ~250 tokens × $0.02/1M (text-embedding-3-small)

  const vectorTotal   = vectors?.total ?? 0
  const pinecone_usd  = (vectorTotal * BYTES_PER_VECTOR / GB) * PINECONE_USD_PER_GB_MONTH
  const s3_usd        = ((storage?.bytes ?? 0) / GB) * S3_USD_PER_GB_MONTH
  const embed_onetime = vectorTotal * EMBED_USD_PER_VECTOR

  // AI cost measured from the durable per-call token log — EVERY AI feature (chat, formatting,
  // audit recs, training, translation…), not just chat. Broken down by feature.
  const aiUsage: any[] = await (prisma as any).aiUsageEvent.groupBy({
    by:     ['feature'],
    where:  { tenant_id: tenantId, created_at: { gte: since30 } },
    _sum:   { cost_usd: true, input_tokens: true, output_tokens: true },
    _count: { _all: true },
  }).catch(() => [])
  const ai_usd       = aiUsage.reduce((s, r) => s + (r._sum?.cost_usd ?? 0), 0)
  const ai_calls     = aiUsage.reduce((s, r) => s + (r._count?._all ?? 0), 0)
  const ai_input     = aiUsage.reduce((s, r) => s + (r._sum?.input_tokens ?? 0), 0)
  const ai_output    = aiUsage.reduce((s, r) => s + (r._sum?.output_tokens ?? 0), 0)
  const ai_by_feature = aiUsage
    .map(r => ({ feature: r.feature as string, calls: r._count?._all ?? 0, usd: r._sum?.cost_usd ?? 0 }))
    .sort((a, b) => b.usd - a.usd)

  ok(res, {
    vectors: vectors ? { ...vectors, available: true } : { namespaces: [], total: 0, available: false },
    storage: storage ? { ...storage, available: true } : { objects: 0, bytes: 0, available: false },
    queries: { total: queriesTotal, last30: queries30 },
    costs: {
      pinecone_usd, s3_usd, ai_usd, embed_onetime,
      total_monthly_usd: pinecone_usd + s3_usd + ai_usd,
      ai_measured:        true,
      ai_calls,
      ai_input_tokens:    ai_input,
      ai_output_tokens:   ai_output,
      ai_by_feature,
      note: 'AI cost is measured from real per-call token usage across every AI feature (input/output tokens × per-model prices) over the last 30 days. Storage/vectors are estimated from usage × published unit prices; embeddings shown separately as a one-off. Not invoiced amounts.',
    },
  })
})

// ─── GET /admin/tenants/:id/gap-usage ────────────────────────────────────────
// How a client is using Policy Gap Detection: their applicability scope + service
// profile, coverage results, and remediation/training activity.
adminRouter.get('/tenants/:id/gap-usage', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true, service_profile: true } })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }

  const setting = facilityTypeToSetting(tenant.facility_type)
  const profile = resolveServiceProfile(setting, (tenant.service_profile ?? {}) as Record<string, unknown>)

  const [regs, coverage, deepDives, gapModules, openAlerts, ack] = await Promise.all([
    (prisma as any).externalRegulation.findMany({ where: { is_active: true }, select: { applies_to_settings: true, required_triggers: true } }),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { status: true, analysed_at: true } }),
    (prisma as any).gapDetailCache.count({ where: { tenant_id: tenantId } }),
    (prisma as any).trainingModule.count({ where: { tenant_id: tenantId, slug: { startsWith: 'ai-gap-' } } }),
    (prisma as any).tenantRegulationAlert.count({ where: { tenant_id: tenantId, dismissed_at: null } }),
    (prisma as any).legalAcknowledgement.findUnique({ where: { tenant_id_kind: { tenant_id: tenantId, kind: 'policy_remediation' } } }).catch(() => null),
  ])

  const inScope = (regs as any[]).filter(r => regulationAppliesToTenant(r, setting, profile)).length
  const cov = coverage as any[]
  const covered = cov.filter(c => c.status === 'covered').length
  const partial = cov.filter(c => c.status === 'partial').length
  const gap     = cov.filter(c => c.status === 'gap').length
  const analysed = cov.length > 0
  const analysedAt = analysed ? cov.reduce((m: Date, c: any) => (c.analysed_at > m ? c.analysed_at : m), cov[0].analysed_at) : null
  const total = covered + partial + gap
  const score = analysed && total > 0 ? Math.round(((covered + partial * 0.5) / total) * 100) : null

  ok(res, {
    setting, setting_label: settingLabel(setting),
    service_profile: SERVICE_TRIGGERS.map(t => ({ key: t.key, label: t.label, on: profile[t.key] === true })),
    in_scope_regulations: inScope,
    analysed, analysed_at: analysedAt,
    coverage: { score, covered, partial, gap, total },
    deep_dives: deepDives,
    gap_training_modules: gapModules,
    open_alerts: openAlerts,
    remediation_ack: ack ? { at: ack.acknowledged_at, by: ack.user_name || ack.user_email || 'an admin', version: ack.disclaimer_version } : null,
  })
})

// ─── GET /admin/costs ─────────────────────────────────────────────────────────
// Platform-wide cost dashboard: AI (measured from per-query token logging),
// Pinecone (vector storage), S3 (file storage) and Email (SendGrid) — last 30
// days for recurring usage, point-in-time for storage. Estimated from usage ×
// published unit prices except AI, which is measured. Not invoiced amounts.

adminRouter.get('/costs', async (_req: Request, res: Response) => {
  const since30 = new Date(Date.now() - 30 * 86_400_000)

  const [vectors, storage, aiByFeature, aiByTenant, aiDaily, emailQueries30, trainingSends30] = await Promise.all([
    getPlatformVectorStats().catch(() => null),
    getPlatformStorageStats().catch(() => null),
    (prisma as any).aiUsageEvent.groupBy({
      by: ['feature'], where: { created_at: { gte: since30 } },
      _sum: { cost_usd: true, input_tokens: true, output_tokens: true }, _count: { _all: true },
    }).catch(() => []),
    (prisma as any).aiUsageEvent.groupBy({
      by: ['tenant_id'], where: { created_at: { gte: since30 } },
      _sum: { cost_usd: true }, _count: { _all: true },
    }).catch(() => []),
    // Per-day spend for a small trend (last 30 days), computed in SQL.
    (prisma as any).$queryRaw`
      SELECT date_trunc('day', created_at)::date AS day, sum(cost_usd) AS usd, count(*) AS calls
      FROM ai_usage_events WHERE created_at >= ${since30}
      GROUP BY 1 ORDER BY 1`.catch(() => []),
    // Outbound email replies ≈ one per email-channel query (inbound parse is free).
    (prisma as any).queryRecord.count({ where: { channel: 'email', created_at: { gte: since30 } } }),
    // Training pulses delivered (email or WhatsApp) — counted toward email estimate.
    (prisma as any).trainingSendLog.count({ where: { sent_at: { gte: since30 } } }).catch(() => 0),
  ])

  // Unit prices (USD). Storage is monthly; AI/email are last-30-day usage.
  const GB = 1024 ** 3
  const PINECONE_USD_PER_GB_MONTH = 0.33
  const S3_USD_PER_GB_MONTH       = 0.024
  const BYTES_PER_VECTOR          = 1536 * 4 + 1600
  const EMAIL_USD_PER_SEND        = 0.001           // ~SendGrid Essentials blended rate

  const vectorTotal  = vectors?.total ?? 0
  const pinecone_usd = (vectorTotal * BYTES_PER_VECTOR / GB) * PINECONE_USD_PER_GB_MONTH
  const s3_usd       = ((storage?.bytes ?? 0) / GB) * S3_USD_PER_GB_MONTH

  // AI — measured from the per-call token log across EVERY feature and tenant.
  const ai_usd    = (aiByFeature as any[]).reduce((s, r) => s + (r._sum?.cost_usd ?? 0), 0)
  const ai_calls  = (aiByFeature as any[]).reduce((s, r) => s + (r._count?._all ?? 0), 0)
  const ai_input  = (aiByFeature as any[]).reduce((s, r) => s + (r._sum?.input_tokens ?? 0), 0)
  const ai_output = (aiByFeature as any[]).reduce((s, r) => s + (r._sum?.output_tokens ?? 0), 0)
  const ai_by_feature = (aiByFeature as any[])
    .map(r => ({ feature: r.feature as string, calls: r._count?._all ?? 0, usd: r._sum?.cost_usd ?? 0 }))
    .sort((a, b) => b.usd - a.usd)

  // Resolve tenant names for the top spenders.
  const tenantIds = (aiByTenant as any[]).map(r => r.tenant_id).filter(Boolean)
  const tenantRows = tenantIds.length
    ? await (prisma as any).tenant.findMany({ where: { id: { in: tenantIds } }, select: { id: true, name: true } }).catch(() => [])
    : []
  const nameOf = new Map((tenantRows as any[]).map(t => [t.id, t.name]))
  const ai_by_tenant = (aiByTenant as any[])
    .map(r => ({ tenant_id: r.tenant_id as string | null, name: r.tenant_id ? (nameOf.get(r.tenant_id) ?? 'Unknown') : 'Platform / no tenant', calls: r._count?._all ?? 0, usd: r._sum?.cost_usd ?? 0 }))
    .sort((a, b) => b.usd - a.usd)
  const ai_daily = (aiDaily as any[]).map(r => ({ day: r.day instanceof Date ? r.day.toISOString().slice(0, 10) : String(r.day).slice(0, 10), usd: Number(r.usd ?? 0), calls: Number(r.calls ?? 0) }))

  const emailSends = (emailQueries30 ?? 0) + (trainingSends30 ?? 0)
  const email_usd  = emailSends * EMAIL_USD_PER_SEND

  const total_monthly_usd = pinecone_usd + s3_usd + ai_usd + email_usd

  ok(res, {
    period_days: 30,
    ai: {
      usd: ai_usd,
      measured: true,
      calls: ai_calls,
      input_tokens: ai_input,
      output_tokens: ai_output,
      by_feature: ai_by_feature,
      by_tenant: ai_by_tenant,
      daily: ai_daily,
    },
    pinecone: { usd: pinecone_usd, vectors: vectorTotal, namespaces: vectors?.namespaces ?? 0, available: !!vectors },
    s3:       { usd: s3_usd, bytes: storage?.bytes ?? 0, objects: storage?.objects ?? 0, available: !!storage },
    email:    { usd: email_usd, sends: emailSends, reply_emails: emailQueries30 ?? 0, training_sends: trainingSends30 ?? 0 },
    total_monthly_usd,
    note: 'Platform-wide, last 30 days. AI cost is measured from real per-call token usage across every AI feature and tenant (input/output tokens × per-model prices). Pinecone, S3 and Email are estimated from usage × published unit prices (not invoiced amounts). Inbound email parsing is free.',
  })
})

// ─── POST /admin/tenants/:id/policies/reset ───────────────────────────────────
// Platform-owner action: permanently delete ALL of a tenant's policy data so they
// can re-upload from scratch — Pinecone vectors, S3 files, policy rows, and the
// policy-derived knowledge entries. Nothing else (account, settings, staff,
// platform content) is touched. Irreversible.

adminRouter.post('/tenants/:id/policies/reset', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId } })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }

  // 1. Pinecone — clear policy/chapter/knowledge namespaces (else deleted content
  //    still surfaces in answers). Best-effort.
  await deleteAllTenantPolicyVectors(tenantId).catch(e => console.error('[reset] pinecone:', (e as Error)?.message))

  // 2. S3 — every file under tenants/{id}/.
  const filesDeleted = await deleteTenantFiles(tenantId).catch(e => { console.error('[reset] s3:', (e as Error)?.message); return 0 })

  // 3. Postgres — drop version self-links first so policy delete can't hit the FK,
  //    then policy-derived knowledge, then the policies themselves.
  await (prisma as any).$executeRaw`UPDATE policies SET superseded_by = NULL WHERE tenant_id = ${tenantId}`
  const knowledge = await (prisma as any).knowledgeEntry.deleteMany({ where: { tenant_id: tenantId, source_type: 'policy' } })
  const policies  = await (prisma as any).policy.deleteMany({ where: { tenant_id: tenantId } })

  console.log(`[reset] tenant=${tenantId} policies=${policies.count} knowledge=${knowledge.count} files=${filesDeleted}`)
  ok(res, { policies_deleted: policies.count, knowledge_deleted: knowledge.count, files_deleted: filesDeleted })
})

// ─── GET /admin/tenants ───────────────────────────────────────────────────────
// List root tenants (parent_tenant_id IS NULL) with per-tenant stats + sub-tenant count.

adminRouter.get('/tenants', async (_req: Request, res: Response) => {
  const tenants = await (prisma as any).tenant.findMany({
    where:   { parent_tenant_id: null },
    orderBy: { created_at: 'desc' },
    include: {
      plan: {
        select: {
          name:                         true,
          price_monthly_pence:          true,
          price_annual_pence:           true,
          monthly_query_limit:          true,
          monthly_annual_license_limit: true,
          max_policies:                 true,
          max_staff_users:              true,
          max_handbooks:                true,
          max_manual_knowledge_entries: true,
          has_gap_detection:            true,
          has_face_to_face:             true,
          has_custom_audits:            true,
          has_effectiveness:            true,
          has_training_impact:          true,
        },
      },
    },
  })

  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  // Aggregate stats for ALL tenants in a few grouped queries instead of 8 counts
  // per tenant (was 8×N round-trips → 7 total).
  const [
    policyGroups, knowledgeAll, knowledgeManual, queryAll, queryMonth, activeUsers, subTenants, annualMonth,
  ] = await Promise.all([
    (prisma as any).policy.groupBy({ by: ['tenant_id', 'document_category'], where: { status: 'active' }, _count: { _all: true } }),
    (prisma as any).knowledgeEntry.groupBy({ by: ['tenant_id'], _count: { _all: true } }),
    (prisma as any).knowledgeEntry.groupBy({ by: ['tenant_id'], where: { source_type: 'manual' }, _count: { _all: true } }),
    (prisma as any).queryRecord.groupBy({ by: ['tenant_id'], _count: { _all: true } }),
    (prisma as any).queryRecord.groupBy({ by: ['tenant_id'], where: { created_at: { gte: thisMonthStart } }, _count: { _all: true } }),
    (prisma as any).user.groupBy({ by: ['tenant_id'], where: { is_active: true }, _count: { _all: true } }),
    (prisma as any).tenant.groupBy({ by: ['parent_tenant_id'], where: { parent_tenant_id: { not: null } }, _count: { _all: true } }),
    // Annual-training-module allocations used this month (the monthly licence pool).
    (prisma as any).trainingEnrollment.groupBy({ by: ['tenant_id'], where: { created_at: { gte: thisMonthStart }, module: { source: 'ai_generated' } }, _count: { _all: true } }),
  ])

  const policyByTenant = new Map<string, { internal: number; handbook: number }>()
  for (const g of policyGroups as any[]) {
    const e = policyByTenant.get(g.tenant_id) ?? { internal: 0, handbook: 0 }
    if (g.document_category === 'internal_policy') e.internal = g._count._all
    else if (g.document_category === 'staff_handbook') e.handbook = g._count._all
    policyByTenant.set(g.tenant_id, e)
  }
  const toMap = (arr: any[], key = 'tenant_id') => new Map<string, number>(arr.map((g: any) => [g[key], g._count._all]))
  const knowledgeMap  = toMap(knowledgeAll as any[])
  const manualMap     = toMap(knowledgeManual as any[])
  const queryMap      = toMap(queryAll as any[])
  const queryMonthMap = toMap(queryMonth as any[])
  const usersMap      = toMap(activeUsers as any[])
  const subTenantMap  = toMap(subTenants as any[], 'parent_tenant_id')
  const annualMap     = toMap(annualMonth as any[])

  const withStats = tenants.map((t: any) => {
    const p = policyByTenant.get(t.id) ?? { internal: 0, handbook: 0 }
    const annualUsed  = annualMap.get(t.id) ?? 0
    const annualLimit = (t.plan?.monthly_annual_license_limit ?? null) as number | null
    return {
      ...t,
      stats: {
        policyCount:          p.internal,
        handbookCount:        p.handbook,
        knowledgeCount:       knowledgeMap.get(t.id)     ?? 0,
        manualKnowledgeCount: manualMap.get(t.id)        ?? 0,
        queryCount:           queryMap.get(t.id)         ?? 0,
        activeUserCount:      usersMap.get(t.id)         ?? 0,
        queriesThisMonth:     queryMonthMap.get(t.id)    ?? 0,
        annualLicensesUsed:   annualUsed,
        annualLicenseLimit:   annualLimit,
      },
      sub_tenant_count: subTenantMap.get(t.id) ?? 0,
    }
  })

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

  const now            = new Date()
  const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)

  const [policies, recentQueries, knowledgeCount, manualKnowledgeCount, userCount, queriesThisMonth, handbookCount, annualLicensesUsed] = await Promise.all([
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
    (prisma as any).knowledgeEntry.count({ where: { tenant_id: req.params.id, source_type: 'manual' } }),
    (prisma as any).user.count({ where: { tenant_id: req.params.id, is_active: true } }),
    (prisma as any).queryRecord.count({ where: { tenant_id: req.params.id, created_at: { gte: thisMonthStart } } }),
    (prisma as any).policy.count({ where: { tenant_id: req.params.id, status: 'active', document_category: 'staff_handbook' } }),
    (prisma as any).trainingEnrollment.count({ where: { tenant_id: req.params.id, created_at: { gte: thisMonthStart }, module: { source: 'ai_generated' } } }),
  ])

  // Monthly annual-training-module allocation pool (the per-plan licence quota).
  const annualLimit = (tenant.plan?.monthly_annual_license_limit ?? null) as number | null
  const annual_license = {
    used:      annualLicensesUsed,
    limit:     annualLimit,
    remaining: annualLimit === null ? null : Math.max(0, annualLimit - annualLicensesUsed),
  }

  // S3 location for this tenant's documents — lets the platform team match a
  // client to its bucket prefix (and vice versa) when investigating issues.
  const storage = {
    bucket:         process.env.S3_BUCKET ?? null,
    region:         process.env.AWS_REGION ?? 'eu-west-2',
    prefix:         `tenants/${req.params.id}/`,
    policies_prefix: `tenants/${req.params.id}/policies/`,
  }

  // Training-module licences (training-only clients buy these). Grouped per module,
  // with how many were allocated and to whom — so the platform team can see exactly
  // what a training client purchased and assigned.
  const licences = await (prisma as any).trainingLicense.findMany({
    where:   { tenant_id: req.params.id },
    orderBy: [{ module_name: 'asc' }, { purchased_at: 'asc' }],
    select:  { module_slug: true, module_name: true, price_pence: true, purchased_at: true, renewal_due_at: true, status: true, user_id: true },
  })
  let training_licences: any[] = []
  if ((licences as any[]).length) {
    const userIds = [...new Set((licences as any[]).map(l => l.user_id).filter(Boolean))]
    const lUsers  = userIds.length
      ? await (prisma as any).user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, email: true } })
      : []
    const userById = new Map((lUsers as any[]).map(u => [u.id, u]))
    const byModule = new Map<string, any>()
    for (const l of licences as any[]) {
      const g = byModule.get(l.module_slug) ?? {
        module_slug: l.module_slug, module_name: l.module_name, total: 0, allocated: 0,
        price_pence: l.price_pence, purchased_at: l.purchased_at, renewal_due_at: l.renewal_due_at,
        allocations: [] as any[],
      }
      g.total += 1
      if (l.user_id) {
        g.allocated += 1
        const u = userById.get(l.user_id)
        g.allocations.push({ name: u?.name ?? 'Unknown', email: u?.email ?? null })
      }
      if (new Date(l.purchased_at) < new Date(g.purchased_at)) g.purchased_at = l.purchased_at
      byModule.set(l.module_slug, g)
    }
    training_licences = [...byModule.values()]
  }

  ok(res, { tenant, policies, recentQueries, knowledgeCount, manualKnowledgeCount, userCount, queriesThisMonth, handbookCount, storage, training_licences, annual_license })
})

// ─── PATCH /admin/tenants/:id/enterprise-discount ────────────────────────────
// Platform-only: allocate (or remove) the 20% Enterprise closing discount for a tenant.
// Applied automatically at their checkout — never self-serve. Body: { enabled: boolean }.
adminRouter.patch('/tenants/:id/enterprise-discount', async (req: Request, res: Response) => {
  const enabled = req.body?.enabled === true
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: req.params.id }, select: { id: true } })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }
  const updated = await (prisma as any).tenant.update({
    where: { id: req.params.id },
    data:  { enterprise_discount: enabled },
    select: { id: true, enterprise_discount: true },
  })
  ok(res, { tenant: updated })
})

// ─── GET /admin/tenants/:id/invoices ─────────────────────────────────────────
// A tenant's Stripe invoices + revenue summary, for the platform clients view
// (track monthly revenue per tenant). Reuses the billing service.
adminRouter.get('/tenants/:id/invoices', async (req: Request, res: Response) => {
  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: req.params.id },
    select: { stripe_customer_id: true, stripe_subscription_id: true, subscription_status: true, trial_ends_at: true, plan: { select: { price_monthly_pence: true, name: true } } },
  })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }

  if (!tenant.stripe_customer_id) {
    ok(res, {
      invoices: [], next_billing_date: null, billing_interval: null,
      total_paid_pence: 0, monthly_pence: tenant.plan?.price_monthly_pence ?? null,
      currency: 'gbp', subscription_status: tenant.subscription_status, trial_ends_at: tenant.trial_ends_at, plan_name: tenant.plan?.name ?? null,
    })
    return
  }

  const [invoices, sub] = await Promise.all([
    listInvoices(tenant.stripe_customer_id).catch(() => [] as any[]),
    getSubscriptionInfo(tenant).catch(() => null),
  ])
  const paid             = (invoices as any[]).filter(i => i.status === 'paid')
  const total_paid_pence = paid.reduce((s, i) => s + (i.amount_pence || 0), 0)
  // "Monthly" figure = most recent paid invoice (real charge incl. VAT), else the plan price.
  const monthly_pence    = paid[0]?.amount_pence ?? tenant.plan?.price_monthly_pence ?? null

  ok(res, {
    invoices,
    next_billing_date:   sub?.next_billing_date ?? null,
    billing_interval:    sub?.billing_interval ?? null,
    total_paid_pence,
    monthly_pence,
    currency:            'gbp',
    subscription_status: tenant.subscription_status,
    trial_ends_at:       tenant.trial_ends_at,
    plan_name:           tenant.plan?.name ?? null,
  })
})

// ─── GET /admin/tenants/:id/staff ────────────────────────────────────────────
// Full staff list for a tenant, including login tracking fields.

// GET /admin/tenants/:id/ai-usage — AI credits (by action) + queries + annual
// training modules this tenant uses (tailored vs standard) and completion.
adminRouter.get('/tenants/:id/ai-usage', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  try {
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const [credits, queries, byAction, enrollments] = await Promise.all([
      getAiCreditUsage(tenantId),
      getQueryUsage(tenantId),
      (prisma as any).aiCreditLog.groupBy({ by: ['action', 'billable'], where: { tenant_id: tenantId, created_at: { gte: monthStart } }, _count: { _all: true } }).catch(() => []),
      (prisma as any).trainingEnrollment.findMany({ where: { tenant_id: tenantId }, select: { status: true, module: { select: { id: true, name: true, source: true, tenant_id: true } } } }).catch(() => []),
    ])
    const ai = (enrollments as any[]).filter(e => e.module?.source === 'ai_generated')
    const byModule = new Map<string, any>()
    for (const e of ai) {
      const m = e.module
      const g = byModule.get(m.id) ?? { id: m.id, name: m.name, tailored: m.tenant_id === tenantId, assigned: 0, completed: 0 }
      g.assigned += 1
      if (e.status === 'complete') g.completed += 1
      byModule.set(m.id, g)
    }
    const modules = [...byModule.values()].sort((a, b) => b.assigned - a.assigned)
    const billedByAction: Record<string, number> = {}
    const trackedByAction: Record<string, number> = {}
    for (const a of (byAction as any[])) {
      const target = a.billable ? billedByAction : trackedByAction
      target[a.action ?? 'other'] = (target[a.action ?? 'other'] ?? 0) + a._count._all
    }
    ok(res, {
      credits:  { ...credits, by_action: billedByAction },
      other_ai: trackedByAction,
      queries,
      annual_training: { modules, tailored: modules.filter(m => m.tailored).length, standard: modules.filter(m => !m.tailored).length },
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

adminRouter.get('/tenants/:id/staff', async (req: Request, res: Response) => {
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: req.params.id }, select: { id: true },
  })
  if (!tenant) { err(res, 'NOT_FOUND', 'Tenant not found', 404); return }

  const users = await (prisma as any).user.findMany({
    where:   { tenant_id: req.params.id },
    select:  {
      id: true, name: true, email: true, role: true, job_role: true,
      is_active: true, created_at: true, first_login_at: true, last_login_at: true,
    },
    orderBy: { created_at: 'asc' },
  })

  ok(res, { users, total: users.length })
})

// ─── POST /admin/tenants/:id/staff/:userId/reset-password ────────────────────

adminRouter.post('/tenants/:id/staff/:userId/reset-password', async (req: Request, res: Response) => {
  const user = await (prisma as any).user.findUnique({
    where:  { id: req.params.userId },
    select: { id: true, name: true, email: true, tenant_id: true },
  })
  if (!user || user.tenant_id !== req.params.id) {
    err(res, 'NOT_FOUND', 'User not found.', 404); return
  }

  const tempPassword = crypto.randomBytes(10).toString('base64url')
  const passwordHash = await hashPassword(tempPassword)

  await (prisma as any).user.update({
    where: { id: req.params.userId },
    data:  { password_hash: passwordHash, failed_login_attempts: 0, locked_until: null },
  })

  ok(res, { user: { id: user.id, name: user.name, email: user.email }, temp_password: tempPassword })
})

// ─── POST /admin/tenants/:id/staff/:userId/send-credentials ──────────────────

adminRouter.post('/tenants/:id/staff/:userId/send-credentials', async (req: Request, res: Response) => {
  const { temp_password } = req.body
  if (!temp_password || typeof temp_password !== 'string') {
    err(res, 'VALIDATION_ERROR', 'temp_password is required.', 400); return
  }

  const user = await (prisma as any).user.findUnique({
    where:  { id: req.params.userId },
    select: { id: true, name: true, email: true, tenant_id: true },
  })
  if (!user || user.tenant_id !== req.params.id) {
    err(res, 'NOT_FOUND', 'User not found.', 404); return
  }

  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: req.params.id }, select: { name: true },
  })

  const portalUrl = siteUrl()

  try {
    await sendStaffWelcomeEmail({
      to:           user.email,
      staffName:    user.name,
      orgName:      tenant?.name ?? 'your organisation',
      tempPassword: temp_password,
      portalUrl,
    })
    ok(res, { sent: true })
  } catch (e: any) {
    err(res, 'EMAIL_FAILED', e.message ?? 'Failed to send email.', 500)
  }
})

// ─── POST /admin/tenants/:id/format-policies ─────────────────────────────────
// Pre-format + cache the clean reading HTML for a tenant's policies, so the staff
// hub policy reader serves them instantly (formatted) instead of formatting on the
// fly per open (which can time out → raw/unformatted text). Idempotent: skips
// already-cached policies. Processes a bounded batch per call (returns `remaining`
// so the caller can loop until 0).
adminRouter.post('/tenants/:id/format-policies', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  const limit = Math.min(Number(req.body?.limit) || 25, 40)
  try {
    const [policies, cached] = await Promise.all([
      (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active' }, select: { id: true } }),
      (prisma as any).policyTranslation.findMany({ where: { tenant_id: tenantId, lang: 'eng' }, select: { policy_id: true } }),
    ])
    const cachedSet = new Set((cached as any[]).map(c => c.policy_id))
    const explicitIds: string[] = Array.isArray(req.body?.policy_ids) ? req.body.policy_ids.map(String) : []
    let todo = (policies as any[]).filter(p => !cachedSet.has(p.id)).map(p => p.id)
    if (explicitIds.length) todo = todo.filter(id => explicitIds.includes(id))   // format these first
    const batch = todo.slice(0, limit)

    let formatted = 0, failed = 0
    await mapLimit(batch, 4, async (policyId: string) => {
      try {
        const raw = await downloadExtractedText(tenantId, policyId).catch(() => null)
        if (!raw) { failed++; return }
        const html = await formatPolicyHtml(raw, 'eng')
        if (!html) { failed++; return }
        await (prisma as any).policyTranslation.create({ data: { tenant_id: tenantId, policy_id: policyId, lang: 'eng', content: html } }).catch(() => {})
        formatted++
      } catch { failed++ }
    })

    ok(res, { formatted, failed, processed: batch.length, remaining: Math.max(0, todo.length - batch.length), total_active: policies.length, total_cached: cachedSet.size + formatted })
  } catch (e: any) {
    err(res, 'FORMAT_FAILED', e.message ?? 'Format failed', 500)
  }
})

// ─── GET /admin/tenants/:id/policies/:policyId/preview ────────────────────────
// Platform QA: render a policy exactly as staff see it (the header/footer-stripped,
// formatted English HTML), alongside the original extracted text, so we can verify
// the stripping worked. Uses the cached formatted HTML when present (same content
// staff are served); generates + caches it on demand otherwise.
adminRouter.get('/tenants/:id/policies/:policyId/preview', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  const policyId = String(req.params.policyId)
  try {
    const policy = await (prisma as any).policy.findFirst({
      where: { id: policyId, tenant_id: tenantId }, select: { id: true, filename: true, name: true, status: true },
    })
    if (!policy) return err(res, 'NOT_FOUND', 'Policy not found', 404)

    const raw = await downloadExtractedText(tenantId, policyId).catch(() => null)

    // Prefer the cached English formatted HTML — this is exactly what staff receive. Self-heals
    // if the cache is missing or truncated (rebuilds with the chunked formatter).
    const { html, cached } = await getEnglishPolicyHtml(tenantId, policyId, raw)
    if (html && !cached) trackAiAction(tenantId, 'policy_format', policyId)

    ok(res, {
      policy_id: policyId,
      name:      policy.name || policy.filename,
      status:    policy.status,
      cached,
      html:      html ?? '',
      raw:       raw ?? '',
      has_raw:   !!raw,
    })
  } catch (e: any) {
    err(res, 'PREVIEW_FAILED', e.message ?? 'Preview failed', 500)
  }
})

// ─── POST /admin/tenants/:id/clone ───────────────────────────────────────────
// Full content/config clone of a tenant into a brand-new "Live" account (clean
// slate — no activity; one fresh admin). Renames the source to free the clean
// slug. Copies DB rows, S3 files and Pinecone vectors (no re-embedding).
// Body: { live:{name,slug,email_domain}, admin_rename:{name,slug,email_domain},
//         admin:{email,name,password?} }. Returns a temp password if none given.
adminRouter.post('/tenants/:id/clone', async (req: Request, res: Response) => {
  const { live, admin_rename, admin } = req.body ?? {}
  if (!live?.name || !live?.slug || !live?.email_domain) { err(res, 'VALIDATION_ERROR', 'live {name,slug,email_domain} required', 400); return }
  if (!admin_rename?.name || !admin_rename?.slug || !admin_rename?.email_domain) { err(res, 'VALIDATION_ERROR', 'admin_rename {name,slug,email_domain} required', 400); return }
  if (!admin?.email || !admin?.name) { err(res, 'VALIDATION_ERROR', 'admin {email,name} required', 400); return }

  const password = (admin.password && String(admin.password)) || crypto.randomBytes(9).toString('base64url')
  try {
    const result = await cloneTenant({
      sourceTenantId: String(req.params.id),
      adminRename:    admin_rename,
      live,
      newAdmin:       { email: String(admin.email).toLowerCase().trim(), name: admin.name, password },
    })
    ok(res, { ...result, temp_password: admin.password ? undefined : password })
  } catch (e: any) {
    err(res, 'CLONE_FAILED', e.message ?? 'Clone failed', 500)
  }
})

// ─── POST /admin/tenants/:id/sync-billing ────────────────────────────────────
// Ops: pull a tenant's subscription straight from Stripe and write it onto the
// tenant (un-stick a tenant whose webhook never landed). Returns the new state.
adminRouter.post('/tenants/:id/sync-billing', async (req: Request, res: Response) => {
  const tenantId = String(req.params.id)
  try {
    const synced = await reconcileTenantBilling(tenantId)
    const t = await (prisma as any).tenant.findUnique({
      where: { id: tenantId },
      select: { account_number: true, subscription_status: true, stripe_customer_id: true, stripe_subscription_id: true, trial_ends_at: true, plan_id: true },
    })
    ok(res, { synced, tenant: t })
  } catch (e: any) {
    err(res, 'SYNC_FAILED', e.message ?? 'Billing sync failed', 500)
  }
})

// ─── POST /admin/tenants/:id/open-account ────────────────────────────────────
// Platform owner "opens" a client's account: mint a single-use, short-lived
// sign-in link for that tenant's admin and return it. Opening it in a new tab
// signs the operator into the client's own dashboard (separate next-auth cookie
// session — does not disturb the console's platform token). Reuses the
// passwordless magic-link infra. Optional ?userId targets a specific staff member.
adminRouter.post('/tenants/:id/open-account', async (req: Request, res: Response) => {
  const tenantId   = String(req.params.id)
  const targetUser = (req.body?.user_id as string | undefined) ?? undefined

  const where = targetUser
    ? { id: targetUser, tenant_id: tenantId, is_active: true }
    : { tenant_id: tenantId, role: 'admin', is_active: true }

  let user = await (prisma as any).user.findFirst({
    where,
    select:  { id: true, name: true, email: true, tenant_id: true },
    orderBy: { created_at: 'asc' },   // the first/owner admin
  })
  // Fallback for admin-less tenants (e.g. the CPD Assessor account, whose only user
  // is a reviewer): open as any active user.
  if (!user && !targetUser) {
    user = await (prisma as any).user.findFirst({
      where:   { tenant_id: tenantId, is_active: true },
      select:  { id: true, name: true, email: true, tenant_id: true },
      orderBy: { created_at: 'asc' },
    })
  }
  if (!user || user.tenant_id !== tenantId) {
    err(res, 'NOT_FOUND', 'No active user found for this client.', 404); return
  }

  // Short-lived (5 min) one-time link — it's used immediately when the tab opens.
  const url = await createLoginLink(user.id, tenantId, 5 * 60 * 1000)
  console.info(`[platform] open-account: operator signed into tenant ${tenantId} as ${user.email}`)
  ok(res, { url, signed_in_as: { id: user.id, name: user.name, email: user.email } })
})

// ─── POST /admin/tenants/:id/staff/:userId/deactivate ────────────────────────

adminRouter.post('/tenants/:id/staff/:userId/deactivate', async (req: Request, res: Response) => {
  const user = await (prisma as any).user.findUnique({
    where:  { id: req.params.userId },
    select: { id: true, tenant_id: true },
  })
  if (!user || user.tenant_id !== req.params.id) {
    err(res, 'NOT_FOUND', 'User not found.', 404); return
  }
  await (prisma as any).user.update({ where: { id: req.params.userId }, data: { is_active: false } })
  ok(res, { deactivated: true })
})

// ─── POST /admin/tenants/:id/staff/:userId/reactivate ────────────────────────

adminRouter.post('/tenants/:id/staff/:userId/reactivate', async (req: Request, res: Response) => {
  const user = await (prisma as any).user.findUnique({
    where:  { id: req.params.userId },
    select: { id: true, tenant_id: true },
  })
  if (!user || user.tenant_id !== req.params.id) {
    err(res, 'NOT_FOUND', 'User not found.', 404); return
  }
  await (prisma as any).user.update({ where: { id: req.params.userId }, data: { is_active: true } })
  ok(res, { reactivated: true })
})

// ─── GET /admin/tenants/:id/sessions/:sessionId ──────────────────────────────
// All messages for one chat session — used by the platform owner modal.

// ─── GET /admin/tenants/:id/sub-tenants ──────────────────────────────────────

adminRouter.get('/tenants/:id/sub-tenants', async (req: Request, res: Response) => {
  const parent = await (prisma as any).tenant.findUnique({
    where: { id: req.params.id }, select: { id: true },
  })
  if (!parent) { err(res, 'NOT_FOUND', 'Tenant not found.', 404); return }

  const subTenants = await (prisma as any).tenant.findMany({
    where:   { parent_tenant_id: req.params.id },
    orderBy: { created_at: 'asc' },
    select:  { id: true, name: true, slug: true, subscription_status: true, created_at: true },
  })

  ok(res, { sub_tenants: subTenants, total: subTenants.length })
})

// ─── POST /admin/tenants/:id/sub-tenants ─────────────────────────────────────

adminRouter.post('/tenants/:id/sub-tenants', async (req: Request, res: Response) => {
  const { name } = req.body ?? {}
  if (!name?.trim()) { err(res, 'VALIDATION_ERROR', 'Site name is required.'); return }

  const parent = await (prisma as any).tenant.findUnique({
    where: { id: req.params.id }, select: { id: true, parent_tenant_id: true },
  })
  if (!parent) { err(res, 'NOT_FOUND', 'Parent tenant not found.', 404); return }
  if (parent.parent_tenant_id) {
    err(res, 'VALIDATION_ERROR', 'Cannot add a sub-tenant under another sub-tenant.', 400); return
  }

  const base   = name.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
  let slug     = `${base}-${Date.now().toString(36)}`
  while (await (prisma as any).tenant.findUnique({ where: { slug } })) {
    slug = `${base}-${Date.now().toString(36)}`
  }

  const newTenant = await (prisma as any).tenant.create({
    data: {
      name:                name.trim(),
      slug,
      email_domain:        slug,
      parent_tenant_id:    req.params.id,
      subscription_status: 'active',
      branding_signoff:    'The CareStream Team',
    },
  })

  ok(res, { tenant: { id: newTenant.id, name: newTenant.name, slug: newTenant.slug } })
})

adminRouter.get('/tenants/:id/sessions/:sessionId', async (req: Request, res: Response) => {
  const { id: tenantId, sessionId } = req.params

  const messages = await (prisma as any).queryRecord.findMany({
    where:   { tenant_id: tenantId, chat_session_id: sessionId },
    orderBy: { created_at: 'asc' },
    select:  {
      id: true, query_text: true, response_text: true,
      no_match: true, response_time_ms: true, language_detected: true, created_at: true,
    },
  })

  ok(res, { messages })
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
      WHERE q.tenant_id = $1
    ),
    lang_agg AS (
      SELECT
        COALESCE(chat_session_id::text, id::text) AS session_key,
        ARRAY_AGG(DISTINCT language_detected ORDER BY language_detected)
          FILTER (WHERE language_detected IS NOT NULL) AS all_languages
      FROM queries
      WHERE tenant_id = $1
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
    LIMIT  $2 OFFSET $3
  `, tenantId, limit, offset)

  const totalRows: any[] = await prisma.$queryRawUnsafe(`
    SELECT COUNT(DISTINCT COALESCE(chat_session_id::text, id::text))::int AS total
    FROM queries WHERE tenant_id = $1
  `, tenantId)

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

// ─── GET /admin/cqc-prep/summary ─────────────────────────────────────────────
// Platform-level CQC Staff Prep analytics — aggregated across all tenants.

adminRouter.get('/cqc-prep/summary', requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const DOMAINS = ['safe', 'effective', 'caring', 'responsive', 'well_led']

    const deliveries = await (prisma as any).cqcStaffDelivery.findMany({
      include: {
        question: { select: { domain: true } },
        tenant:   { select: { id: true, name: true } },
      },
    })

    const evaluated = deliveries.filter((d: any) => d.status === 'evaluated')

    // Overall
    const avgScore = evaluated.length
      ? Math.round(evaluated.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / evaluated.length)
      : null

    // Per-domain
    const by_domain = DOMAINS.map(domain => {
      const done = evaluated.filter((d: any) => d.question.domain === domain)
      return {
        domain,
        total_answered: done.length,
        avg_score: done.length ? Math.round(done.reduce((s: number, d: any) => s + (d.score ?? 0), 0) / done.length) : null,
      }
    })

    // Per-tenant
    const tenantMap = new Map<string, { name: string; sent: number; answered: number; total_score: number }>()
    for (const d of deliveries) {
      const tid = d.tenant.id
      if (!tenantMap.has(tid)) tenantMap.set(tid, { name: d.tenant.name, sent: 0, answered: 0, total_score: 0 })
      const t = tenantMap.get(tid)!
      t.sent++
      if (d.status === 'evaluated') { t.answered++; t.total_score += d.score ?? 0 }
    }
    const by_tenant = Array.from(tenantMap.entries()).map(([tenant_id, t]) => ({
      tenant_id,
      name:           t.name,
      total_sent:     t.sent,
      total_answered: t.answered,
      avg_score:      t.answered ? Math.round(t.total_score / t.answered) : null,
    })).sort((a, b) => b.total_sent - a.total_sent)

    ok(res, {
      summary: {
        total_sent:     deliveries.length,
        total_answered: evaluated.length,
        avg_score:      avgScore,
        tenants_active: by_tenant.filter(t => t.total_sent > 0).length,
      },
      by_domain,
      by_tenant,
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// ─── GET /admin/audits/summary ───────────────────────────────────────────────
// Platform-level audit analytics — aggregated across all tenants.

adminRouter.get('/audits/summary', requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const FREQS = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic'] as const

    const runs = await (prisma as any).auditRun.findMany({
      select: {
        status:       true,
        completed_at: true,
        tenant:       { select: { id: true, name: true } },
        template:     { select: { frequency: true } },
      },
    })

    const completed   = runs.filter((r: any) => r.status === 'completed')
    const inProgress  = runs.filter((r: any) => r.status !== 'completed')

    // By frequency
    const by_frequency = FREQS.map(freq => {
      const c = completed.filter((r: any) => r.template?.frequency === freq)
      const p = inProgress.filter((r: any) => r.template?.frequency === freq)
      const last = c.reduce((best: string | null, r: any) => {
        const ca = r.completed_at ? new Date(r.completed_at).toISOString() : null
        return ca && (!best || ca > best) ? ca : best
      }, null)
      return { frequency: freq, completed: c.length, in_progress: p.length, last_completed: last }
    })

    // By tenant
    const tenantMap = new Map<string, { name: string; completed: number; in_progress: number }>()
    for (const r of runs) {
      const tid = r.tenant?.id
      if (!tid) continue
      if (!tenantMap.has(tid)) tenantMap.set(tid, { name: r.tenant.name, completed: 0, in_progress: 0 })
      const t = tenantMap.get(tid)!
      if (r.status === 'completed') t.completed++; else t.in_progress++
    }
    const by_tenant = Array.from(tenantMap.entries())
      .map(([tenant_id, t]) => ({ tenant_id, tenant_name: t.name, completed: t.completed, in_progress: t.in_progress }))
      .sort((a, b) => b.completed - a.completed)

    ok(res, {
      summary: {
        total:       runs.length,
        completed:   completed.length,
        in_progress: inProgress.length,
        tenants_active: by_tenant.filter(t => t.completed + t.in_progress > 0).length,
      },
      by_frequency,
      by_tenant,
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
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

// ─── GET /admin/revenue ───────────────────────────────────────────────────────
// Platform revenue summary derived from DB plan pricing.
// MRR/ARR are calculated from active subscriptions × plan price — 100% accurate
// against what's in the DB. Stripe-dependent fields (actual payment history,
// daily/monthly series) are returned as empty stubs with clear comments so
// they can be wired up during Stripe integration without restructuring the response.

adminRouter.get('/revenue', async (_req: Request, res: Response) => {
  const tenants = await (prisma as any).tenant.findMany({
    select: {
      id:                  true,
      name:                true,
      subscription_status: true,
      stripe_customer_id:  true,
      created_at:          true,
      plan: {
        select: {
          name:               true,
          price_monthly_pence: true,
        },
      },
    },
    orderBy: { created_at: 'desc' },
  })

  // Aggregate counts by status
  const statusCounts: Record<string, number> = {}
  for (const t of tenants) {
    const s = t.subscription_status as string
    statusCounts[s] = (statusCounts[s] ?? 0) + 1
  }

  // MRR = sum of plan prices for active tenants only
  let mrrPence = 0
  for (const t of tenants) {
    if (t.subscription_status === 'active' && t.plan?.price_monthly_pence) {
      mrrPence += t.plan.price_monthly_pence as number
    }
  }

  // Plan breakdown: group active tenants by plan
  const planMap = new Map<string, { plan_name: string; plan_price_pence: number; active_count: number; trialling_count: number }>()
  for (const t of tenants) {
    const key  = t.plan?.name ?? 'No plan'
    const price = t.plan?.price_monthly_pence ?? 0
    if (!planMap.has(key)) planMap.set(key, { plan_name: key, plan_price_pence: price, active_count: 0, trialling_count: 0 })
    const entry = planMap.get(key)!
    if (t.subscription_status === 'active')    entry.active_count++
    if (t.subscription_status === 'trialling') entry.trialling_count++
  }
  const planBreakdown = [...planMap.values()]
    .map(p => ({ ...p, mrr_pence: p.active_count * p.plan_price_pence }))
    .sort((a, b) => b.mrr_pence - a.mrr_pence)

  const clientList = tenants.map((t: any) => ({
    id:                  t.id,
    name:                t.name,
    plan_name:           t.plan?.name ?? null,
    plan_price_pence:    t.plan?.price_monthly_pence ?? null,
    subscription_status: t.subscription_status,
    stripe_customer_id:  t.stripe_customer_id,
    created_at:          t.created_at,
  }))

  ok(res, {
    summary: {
      mrr_pence:        mrrPence,
      arr_pence:        mrrPence * 12,
      active_count:     statusCounts['active']    ?? 0,
      trialling_count:  statusCounts['trialling'] ?? 0,
      past_due_count:   statusCounts['past_due']  ?? 0,
      cancelled_count:  statusCounts['cancelled'] ?? 0,
      total_count:      tenants.length,
    },
    plan_breakdown: planBreakdown,
    clients:        clientList,
    stripe_connected: false,
    // ── Stripe integration points ─────────────────────────────────────────────
    // monthly_series: replace [] with data from:
    //   stripe.paymentIntents.list({ created: { gte, lte }, limit: 100 })
    //   grouped by month, summing amount_received
    monthly_series: [] as Array<{ month: string; revenue_pence: number }>,
    // daily_series: replace [] with data from Stripe payment intents/charges
    //   grouped by day for the selected period
    daily_series: [] as Array<{ date: string; revenue_pence: number }>,
  })
})

// ─── GET /admin/daily-activity ────────────────────────────────────────────────
// Platform-wide daily query counts split by chat/email, over N days (max 90).

adminRouter.get('/daily-activity', async (req: Request, res: Response) => {
  const days = Math.min(parseInt((req.query.days as string) ?? '30', 10) || 30, 90)

  const rows: Array<{ date: string; channel: string; count: number }> = await prisma.$queryRaw`
    SELECT
      TO_CHAR(DATE(created_at AT TIME ZONE 'UTC'), 'YYYY-MM-DD') AS date,
      COALESCE(channel, 'chat') AS channel,
      COUNT(*)::int AS count
    FROM queries
    WHERE created_at >= NOW() - (${days} || ' days')::interval
    GROUP BY DATE(created_at AT TIME ZONE 'UTC'), channel
    ORDER BY date ASC
  `

  // Build full date spine so every day is present even with zero activity
  const today = new Date()
  const series: Array<{ date: string; chat: number; email: number; whatsapp: number; voice: number }> = []
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(today)
    d.setUTCDate(d.getUTCDate() - i)
    series.push({ date: d.toISOString().slice(0, 10), chat: 0, email: 0, whatsapp: 0, voice: 0 })
  }
  for (const row of rows) {
    const entry = series.find(s => s.date === row.date)
    if (!entry) continue
    if (row.channel === 'email')         entry.email    += Number(row.count)
    else if (row.channel === 'whatsapp') entry.whatsapp += Number(row.count)
    else if (row.channel === 'voice')    entry.voice    += Number(row.count)
    else                                 entry.chat     += Number(row.count)
  }

  ok(res, { series, days })
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

// ─── Key-terminology glossary (global) ────────────────────────────────────────
// A curated guardrail for the Policy Gap suggestion engine: terms that must be kept
// and used in their correct form, never genericised or dropped, when the AI drafts or
// combines suggested policy wording.
adminRouter.get('/glossary', async (_req: Request, res: Response) => {
  const terms = await (prisma as any).glossaryTerm.findMany({ orderBy: { term: 'asc' } })
  ok(res, { terms, total: terms.length })
})

adminRouter.post('/glossary', async (req: Request, res: Response) => {
  const term = String(req.body?.term ?? '').trim()
  const note = String(req.body?.note ?? '').trim()
  if (!term) { err(res, 'VALIDATION_ERROR', 'term is required'); return }
  try {
    const created = await (prisma as any).glossaryTerm.create({ data: { term, note } })
    ok(res, { term: created })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'That term is already in the glossary', 409); return }
    throw e
  }
})

adminRouter.patch('/glossary/:id', async (req: Request, res: Response) => {
  const data: any = {}
  if (typeof req.body?.term === 'string') { const t = req.body.term.trim(); if (!t) { err(res, 'VALIDATION_ERROR', 'term cannot be empty'); return } data.term = t }
  if (typeof req.body?.note === 'string') data.note = req.body.note.trim()
  try {
    const updated = await (prisma as any).glossaryTerm.update({ where: { id: String(req.params.id) }, data })
    ok(res, { term: updated })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'That term is already in the glossary', 409); return }
    if (e?.code === 'P2025') { err(res, 'NOT_FOUND', 'Term not found', 404); return }
    throw e
  }
})

adminRouter.delete('/glossary/:id', async (req: Request, res: Response) => {
  await (prisma as any).glossaryTerm.delete({ where: { id: String(req.params.id) } }).catch(() => {})
  ok(res, { deleted: true })
})

// ─── CQC quality statements (Single Assessment Framework library) ──────────────
// The 34 quality statements: curated cues + regulation crosswalk that drive the SAF
// coverage inheritance and (next) wording alignment. Platform-stewarded, shared.
const qsStrArray = (v: unknown): string[] => Array.isArray(v) ? v.map(x => String(x).trim()).filter(Boolean) : []

adminRouter.get('/quality-statements', async (_req: Request, res: Response) => {
  const statements = await (prisma as any).qualityStatement.findMany({ orderBy: { number: 'asc' } })
  ok(res, { statements, total: statements.length })
})

adminRouter.post('/quality-statements', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const reference_key = String(b.reference_key ?? '').trim()
  const name = String(b.name ?? '').trim()
  const key_question = String(b.key_question ?? '').trim()
  if (!reference_key || !name || !key_question) { err(res, 'VALIDATION_ERROR', 'reference_key, name and key_question are required'); return }
  try {
    const created = await (prisma as any).qualityStatement.create({ data: {
      reference_key, name, key_question,
      number: Number(b.number) || 0,
      we_statement: String(b.we_statement ?? ''),
      expectation_cues: qsStrArray(b.expectation_cues),
      linked_regulations: qsStrArray(b.linked_regulations),
      expected_policies: qsStrArray(b.expected_policies),
      applies_to_settings: qsStrArray(b.applies_to_settings),
      is_active: b.is_active !== false,
    } })
    ok(res, { statement: created })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'That reference key already exists', 409); return }
    throw e
  }
})

adminRouter.patch('/quality-statements/:id', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const data: any = {}
  if (typeof b.reference_key === 'string') { const t = b.reference_key.trim(); if (!t) { err(res, 'VALIDATION_ERROR', 'reference_key cannot be empty'); return } data.reference_key = t }
  if (typeof b.name === 'string') data.name = b.name.trim()
  if (typeof b.key_question === 'string') data.key_question = b.key_question.trim()
  if (b.number !== undefined) data.number = Number(b.number) || 0
  if (typeof b.we_statement === 'string') data.we_statement = b.we_statement
  if (b.expectation_cues !== undefined) data.expectation_cues = qsStrArray(b.expectation_cues)
  if (b.linked_regulations !== undefined) data.linked_regulations = qsStrArray(b.linked_regulations)
  if (b.expected_policies !== undefined) data.expected_policies = qsStrArray(b.expected_policies)
  if (b.applies_to_settings !== undefined) data.applies_to_settings = qsStrArray(b.applies_to_settings)
  if (typeof b.is_active === 'boolean') data.is_active = b.is_active
  data.updated_at = new Date()
  try {
    const updated = await (prisma as any).qualityStatement.update({ where: { id: String(req.params.id) }, data })
    ok(res, { statement: updated })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'That reference key already exists', 409); return }
    if (e?.code === 'P2025') { err(res, 'NOT_FOUND', 'Quality statement not found', 404); return }
    throw e
  }
})

adminRouter.delete('/quality-statements/:id', async (req: Request, res: Response) => {
  await (prisma as any).qualityStatement.delete({ where: { id: String(req.params.id) } }).catch(() => {})
  ok(res, { deleted: true })
})

// ─── Policy lint signal catalogue (editable stale-signal reference) ──────────────
// Deterministic, zero-AI catalogue of "this policy is out of date" signals. Seeded from the
// code default on first read, then edited here. The lint engine reads the ACTIVE rows.
const LINT_SORT = [{ sort_order: 'asc' as const }, { created_at: 'asc' as const }]
const slugify = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)

adminRouter.get('/policy-lint-signals', async (_req: Request, res: Response) => {
  let rows = await (prisma as any).policyLintSignal.findMany({ orderBy: LINT_SORT })
  if (rows.length === 0) {
    await (prisma as any).policyLintSignal.createMany({ data: defaultSignalSeeds(), skipDuplicates: true })
    rows = await (prisma as any).policyLintSignal.findMany({ orderBy: LINT_SORT })
  }
  ok(res, { signals: rows, total: rows.length })
})

adminRouter.post('/policy-lint-signals', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const label = String(b.label ?? '').trim()
  const category = String(b.category ?? '').trim()
  if (!label || !category) { err(res, 'VALIDATION_ERROR', 'label and category are required'); return }
  const phrase_source = b.phrase_source ? String(b.phrase_source) : null
  if (phrase_source) { try { new RegExp(phrase_source, 'i') } catch { err(res, 'VALIDATION_ERROR', 'phrase pattern is not a valid regular expression'); return } }
  const acronyms = qsStrArray(b.acronyms)
  if (!phrase_source && acronyms.length === 0) { err(res, 'VALIDATION_ERROR', 'give a phrase pattern, one or more acronyms, or both'); return }
  const signal_key = (String(b.signal_key ?? '').trim() || slugify(label)) || 'signal'
  try {
    const created = await (prisma as any).policyLintSignal.create({ data: {
      signal_key, category, severity: String(b.severity ?? 'medium'), label,
      detail: String(b.detail ?? ''), phrase_source, acronyms,
      superseded_by: b.superseded_by ? String(b.superseded_by) : null,
      source_urls: qsStrArray(b.source_urls),
      is_active: b.is_active !== false, sort_order: Number(b.sort_order) || 0,
      approved: false, approved_at: null,   // new signals are Pending until reviewed
    } })
    ok(res, { signal: created })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'That signal key already exists', 409); return }
    throw e
  }
})

adminRouter.patch('/policy-lint-signals/:id', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const data: any = {}
  if (typeof b.signal_key === 'string') { const t = b.signal_key.trim(); if (t) data.signal_key = t }
  if (typeof b.label === 'string') data.label = b.label.trim()
  if (typeof b.category === 'string') data.category = b.category.trim()
  if (typeof b.severity === 'string') data.severity = b.severity.trim()
  if (typeof b.detail === 'string') data.detail = b.detail
  // Changing the MATCHING behaviour (phrase or acronyms) drops the signal back to Pending so
  // it must be re-reviewed before it affects tenants again. Cosmetic edits don't.
  let matchingChanged = false
  if (b.phrase_source !== undefined) {
    const p = b.phrase_source ? String(b.phrase_source) : null
    if (p) { try { new RegExp(p, 'i') } catch { err(res, 'VALIDATION_ERROR', 'phrase pattern is not a valid regular expression'); return } }
    data.phrase_source = p; matchingChanged = true
  }
  if (b.acronyms !== undefined) { data.acronyms = qsStrArray(b.acronyms); matchingChanged = true }
  if (b.superseded_by !== undefined) data.superseded_by = b.superseded_by ? String(b.superseded_by) : null
  if (b.source_urls !== undefined) data.source_urls = qsStrArray(b.source_urls)   // reference only — doesn't affect matching/approval
  if (typeof b.is_active === 'boolean') data.is_active = b.is_active
  if (b.sort_order !== undefined) data.sort_order = Number(b.sort_order) || 0
  if (matchingChanged) { data.approved = false; data.approved_at = null }
  data.updated_at = new Date()
  try {
    const updated = await (prisma as any).policyLintSignal.update({ where: { id: String(req.params.id) }, data })
    ok(res, { signal: updated })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'That signal key already exists', 409); return }
    if (e?.code === 'P2025') { err(res, 'NOT_FOUND', 'Signal not found', 404); return }
    throw e
  }
})

adminRouter.delete('/policy-lint-signals/:id', async (req: Request, res: Response) => {
  await (prisma as any).policyLintSignal.delete({ where: { id: String(req.params.id) } }).catch(() => {})
  ok(res, { deleted: true })
})

// Approve a Pending signal so tenant scans start using it.
adminRouter.post('/policy-lint-signals/:id/approve', async (req: Request, res: Response) => {
  try {
    const signal = await (prisma as any).policyLintSignal.update({
      where: { id: String(req.params.id) },
      data: { approved: true, approved_at: new Date() },
    })
    ok(res, { signal })
  } catch (e: any) {
    if (e?.code === 'P2025') { err(res, 'NOT_FOUND', 'Signal not found', 404); return }
    throw e
  }
})

// Dry-run: test a signal definition against the real (anonymised) policy corpus and return
// which policies it matches, with snippets — so an admin can catch cross-over/ambiguity (e.g.
// an "ISA" savings reference) BEFORE approving. Accepts phrase_source + acronyms in the body,
// so it works for a saved signal or a candidate being edited.
adminRouter.post('/policy-lint-signals/audit', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const phrase_source = b.phrase_source ? String(b.phrase_source) : null
  if (phrase_source) { try { new RegExp(phrase_source, 'i') } catch { err(res, 'VALIDATION_ERROR', 'phrase pattern is not a valid regular expression'); return } }
  const acronyms = qsStrArray(b.acronyms)
  if (!phrase_source && acronyms.length === 0) { err(res, 'VALIDATION_ERROR', 'give a phrase pattern, one or more acronyms, or both'); return }
  const signal: TextSignal = {
    id: 'audit', category: 'placeholder', severity: 'low', label: '', detail: '',
    phrases: phrase_source ? new RegExp(phrase_source, 'i') : undefined, acronyms,
  }
  const seeds = await (prisma as any).policySeed.findMany({ select: { title: true, content: true } })
  const snippet = (text: string, index: number, len: number) => {
    const start = Math.max(0, index - 40), end = Math.min(text.length, index + len + 40)
    return (start > 0 ? '…' : '') + text.slice(start, end).replace(/\s+/g, ' ').trim() + (end < text.length ? '…' : '')
  }
  const matches: Array<{ policy: string; count: number; snippets: string[] }> = []
  let totalOccurrences = 0
  for (const s of (seeds as any[])) {
    const hits = signalMatches(String(s.content ?? ''), signal)
    if (!hits.length) continue
    totalOccurrences += hits.length
    matches.push({ policy: s.title ?? '(untitled)', count: hits.length, snippets: hits.slice(0, 3).map(h => snippet(String(s.content), h.index, h.match.length)) })
    if (matches.length >= 60) break
  }
  ok(res, { corpus: (seeds as any[]).length, policies_matched: matches.length, occurrences: totalOccurrences, matches })
})

// ─── POST /admin/regulations ──────────────────────────────────────────────────
// Create a new external regulation + embed to Pinecone.

adminRouter.post('/regulations', async (req: Request, res: Response) => {
  const {
    reference_key, official_name, also_known_as = [], summary,
    care_home_context, care_company_interaction, practical_meaning,
    source_urls = [], is_active = true,
    match_terms = [], distinguish_from = [], expected_policy_titles = [], required_elements = [],
    authoritative_requirements = '', authority_basis, applies_to_settings = [], required_triggers = [],
    needs_update = false, review_note = '',
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
      match_terms:              Array.isArray(match_terms) ? match_terms : [],
      distinguish_from:         Array.isArray(distinguish_from) ? distinguish_from : [],
      expected_policy_titles:   Array.isArray(expected_policy_titles) ? expected_policy_titles : [],
      required_elements:        Array.isArray(required_elements) ? required_elements : [],
      authoritative_requirements: typeof authoritative_requirements === 'string' ? authoritative_requirements : '',
      authority_basis:          authority_basis === 'advisory' ? 'advisory' : 'statutory',
      applies_to_settings:      Array.isArray(applies_to_settings) ? applies_to_settings : [],
      required_triggers:        Array.isArray(required_triggers) ? required_triggers : [],
      needs_update:             !!needs_update,
      review_note:              typeof review_note === 'string' ? review_note : '',
      last_reviewed_at:         new Date(),
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
    match_terms, distinguish_from, expected_policy_titles, required_elements,
    authoritative_requirements, authority_basis, applies_to_settings, required_triggers,
    needs_update, review_note, notify_tenants,
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
      ...(match_terms              !== undefined ? { match_terms }              : {}),
      ...(distinguish_from         !== undefined ? { distinguish_from }         : {}),
      ...(expected_policy_titles   !== undefined ? { expected_policy_titles }   : {}),
      ...(required_elements        !== undefined ? { required_elements }        : {}),
      ...(authoritative_requirements !== undefined ? { authoritative_requirements } : {}),
      ...(authority_basis          !== undefined ? { authority_basis: authority_basis === 'advisory' ? 'advisory' : 'statutory' } : {}),
      ...(applies_to_settings      !== undefined ? { applies_to_settings }      : {}),
      ...(required_triggers        !== undefined ? { required_triggers }        : {}),
      ...(needs_update             !== undefined ? { needs_update: !!needs_update } : {}),
      ...(review_note              !== undefined ? { review_note: typeof review_note === 'string' ? review_note : '' } : {}),
      last_reviewed_at: new Date(),
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

  // Record a version and (unless suppressed) alert assessed tenants on a material change.
  await snapshotAndAlert(existing, updated, { notifyTenants: notify_tenants === true })

  ok(res, updated)
})

// ─── POST /admin/regulations/check-sources ───────────────────────────────────
// Manually run the source-URL monitor now (best-effort): fingerprints each active
// regulation's source pages and flags any that changed for review. Weekly cron too.
adminRouter.post('/regulations/check-sources', async (_req: Request, res: Response) => {
  try {
    const result = await checkRegulationSources()
    ok(res, result)
  } catch (e: any) {
    err(res, 'CHECK_FAILED', e.message ?? 'Source check failed', 500)
  }
})

// ─── GET /admin/regulations/:id/versions ─────────────────────────────────────
// Change history for a regulation (most recent first) for the console diff view.
adminRouter.get('/regulations/:id/versions', async (req: Request, res: Response) => {
  const reg = await (prisma as any).externalRegulation.findUnique({ where: { id: req.params.id }, select: { reference_key: true } })
  if (!reg) { err(res, 'NOT_FOUND', 'Regulation not found', 404); return }
  const versions = await (prisma as any).regulationVersion.findMany({
    where: { reference_key: reg.reference_key }, orderBy: { created_at: 'desc' }, take: 50,
  })
  ok(res, { versions })
})

// ─── POST /admin/regulations/:id/generate-requirements ───────────────────────
// Draft the AUTHORITATIVE REQUIREMENTS for a regulation: a faithful statement of
// what the actual standard/legislation requires, with the specific provisions and
// sources cited. Returns a draft for the admin to REVIEW against the cited source
// and edit — the human review is what makes it authoritative. Does NOT save.
adminRouter.post('/regulations/:id/generate-requirements', async (req: Request, res: Response) => {
  const reg = await (prisma as any).externalRegulation.findUnique({
    where:  { id: req.params.id },
    select: { official_name: true, also_known_as: true, summary: true, care_home_context: true, practical_meaning: true, source_urls: true },
  })
  if (!reg) { err(res, 'NOT_FOUND', 'Regulation not found', 404); return }

  const sources = (reg.source_urls ?? []).filter(Boolean).join('\n')
  const user = `Write a faithful, authoritative statement of the requirements that "${reg.official_name}" places on a UK care provider — as close as you can to what the actual standard, legislation or guidance says, so a compliance lead would recognise it as accurate.

Rules:
- State the concrete duties/requirements, grouped logically, as clear bullet points (use "- ").
- Where you can, reference the specific provisions (e.g. section, regulation or clause numbers) that impose each requirement.
- Stay strictly within the scope of THIS instrument — do not import requirements that belong to other laws.
- End with a line beginning "Sources:" naming the specific legal instrument(s)/guidance this is drawn from.
- Output ONLY the requirements text itself — no preamble, no title, no commentary.

CONTEXT (our own summary — use to orient, but the authority is the named instrument itself):
WHAT IT REQUIRES: ${reg.summary}
IN A CARE HOME: ${reg.care_home_context}
PRACTICAL MEANING: ${reg.practical_meaning}
${sources ? `KNOWN SOURCE URLS:\n${sources}` : ''}`

  try {
    const text = await callClaude('You are a UK health & social care compliance specialist. Reply with the requested text only, no preamble.', user, { model: 'claude-sonnet-4-5', maxTokens: 4000, feature: 'marketing_gen' })
    // Plain-text field — strip any stray code fences, never JSON-parse (long prose
    // in JSON truncates/breaks). Empty response is the only failure case.
    const requirements = String(text ?? '').replace(/^```[a-z]*\s*|\s*```$/g, '').trim()
    if (!requirements) { err(res, 'GENERATE_FAILED', 'The model returned an empty response — please try again.', 502); return }
    ok(res, { authoritative_requirements: requirements })
  } catch (e: any) {
    err(res, 'GENERATE_FAILED', e.message ?? 'Could not generate the requirements.', 500)
  }
})

// ─── POST /admin/regulations/:id/generate-checklist ──────────────────────────
// Draft the "required_elements" checklist. Grounded PRIMARILY in the regulation's
// vetted Authoritative requirements when present (the faithful capture of the
// standard), otherwise its curated summary/context. Returns a draft for review —
// does NOT save it. Never scrapes; source URLs are for traceability only.
adminRouter.post('/regulations/:id/generate-checklist', async (req: Request, res: Response) => {
  const reg = await (prisma as any).externalRegulation.findUnique({
    where:  { id: req.params.id },
    select: { official_name: true, summary: true, care_home_context: true, practical_meaning: true, source_urls: true, authoritative_requirements: true },
  })
  if (!reg) { err(res, 'NOT_FOUND', 'Regulation not found', 404); return }

  const sources = (reg.source_urls ?? []).filter(Boolean).join('\n')
  const groundOnRequirements = typeof reg.authoritative_requirements === 'string' && reg.authoritative_requirements.trim().length > 0
  const user = `You are a UK care-home compliance specialist. Produce the checklist of concrete elements a compliant care-home policy for this regulation MUST contain. ${groundOnRequirements ? 'Base the checklist ONLY on the AUTHORITATIVE REQUIREMENTS below — do not add requirements beyond them.' : 'Base the checklist ONLY on the regulation description below — do not rely on outside knowledge or invent requirements beyond what this describes.'}

REGULATION: ${reg.official_name}
${groundOnRequirements
  ? `AUTHORITATIVE REQUIREMENTS (the vetted statement of what this standard requires):\n${reg.authoritative_requirements}`
  : `WHAT IT REQUIRES: ${reg.summary}\nIN A CARE HOME: ${reg.care_home_context}\nPRACTICAL MEANING: ${reg.practical_meaning}`}
${sources ? `REFERENCE SOURCES (traceability only — do not assume content beyond the text above):\n${sources}` : ''}

Write 8 to 15 specific, distinct, self-contained checklist items. Each should name a concrete thing the policy must address (not vague themes). Care-home specific and practical.

Respond with ONLY minified JSON:
{"required_elements":["<one concrete required element>"]}`

  try {
    const text = await callClaude('Respond only with valid JSON.', user, { model: 'claude-sonnet-4-5', maxTokens: 2800, feature: 'marketing_gen' })
    const slice = text.slice(text.indexOf('{'), text.lastIndexOf('}') + 1)
    if (!slice) { err(res, 'GENERATE_FAILED', 'The model returned an unexpected response — please try again.', 502); return }
    const parsed = JSON.parse(slice)
    const items = Array.isArray(parsed.required_elements)
      ? parsed.required_elements.map((s: any) => String(s ?? '').trim()).filter(Boolean).slice(0, 20)
      : []
    ok(res, { required_elements: items })
  } catch (e: any) {
    err(res, 'GENERATE_FAILED', e.message ?? 'Could not generate the checklist. Please try again.', 500)
  }
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

// ─── Training Seeds CRUD ─────────────────────────────────────────────────────

// A seed's care setting is derived from its matching topic (by title; NULL =
// universal). Tag the seed so the console shows which setting it grounds — applied
// on every read AND write, so the tag survives an edit (not just a full reload).
const SEED_SETTING_BY_TITLE = new Map(
  TRAINING_TOPICS.filter(t => t.care_setting).map(t => [t.title.toLowerCase(), t.care_setting as string]),
)
function withSettingTag(seed: any) {
  const labels = SETTING_LABELS as Record<string, string>
  const cs = SEED_SETTING_BY_TITLE.get(String(seed?.training_type).toLowerCase()) ?? null
  return { ...seed, care_setting: cs, care_setting_label: cs ? (labels[cs] ?? cs) : null }
}

adminRouter.get('/training-seeds', async (_req: Request, res: Response) => {
  try {
    const seeds = await (prisma as any).trainingSeed.findMany({ orderBy: { training_type: 'asc' } })
    const withSetting = (seeds as any[]).map(withSettingTag)
    ok(res, { seeds: withSetting, total: withSetting.length })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

adminRouter.post('/training-seeds', async (req: Request, res: Response) => {
  const {
    training_type, also_known_as = [], summary,
    care_context = '', care_company_interaction = '', practical_meaning = '',
    source_urls = [], is_active = true,
  } = req.body ?? {}

  if (!training_type || !summary) {
    err(res, 'VALIDATION_ERROR', 'training_type and summary are required', 400); return
  }

  const slug = String(training_type).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')

  const existing = await (prisma as any).trainingSeed.findUnique({ where: { slug } })
  if (existing) {
    err(res, 'CONFLICT', `Training seed with slug "${slug}" already exists`, 409); return
  }

  try {
    const seed = await (prisma as any).trainingSeed.create({
      data: {
        slug,
        training_type:            String(training_type),
        also_known_as:            Array.isArray(also_known_as) ? also_known_as : [],
        summary:                  String(summary),
        care_context:             String(care_context),
        care_company_interaction: String(care_company_interaction),
        practical_meaning:        String(practical_meaning),
        source_urls:              Array.isArray(source_urls) ? source_urls : [],
        is_active:                Boolean(is_active),
        updated_at:               new Date(),
      },
    })
    ok(res, withSettingTag(seed), 201)
  } catch (e: any) {
    err(res, 'CREATE_FAILED', e.message, 500)
  }
})

adminRouter.patch('/training-seeds/:id', async (req: Request, res: Response) => {
  const existing = await (prisma as any).trainingSeed.findUnique({ where: { id: req.params.id } })
  if (!existing) { err(res, 'NOT_FOUND', 'Training seed not found', 404); return }

  const {
    slug, training_type, also_known_as, summary, care_context,
    care_company_interaction, practical_meaning, source_urls, is_active,
  } = req.body ?? {}

  // Validate slug uniqueness if changing
  if (slug !== undefined && slug !== existing.slug) {
    const clash = await (prisma as any).trainingSeed.findUnique({ where: { slug } })
    if (clash) { err(res, 'CONFLICT', `Slug "${slug}" is already in use.`, 409); return }
  }

  try {
    const updated = await (prisma as any).trainingSeed.update({
      where: { id: req.params.id },
      data: {
        ...(slug                     !== undefined ? { slug }                     : {}),
        ...(training_type            !== undefined ? { training_type }            : {}),
        ...(also_known_as            !== undefined ? { also_known_as }            : {}),
        ...(summary                  !== undefined ? { summary }                  : {}),
        ...(care_context             !== undefined ? { care_context }             : {}),
        ...(care_company_interaction !== undefined ? { care_company_interaction } : {}),
        ...(practical_meaning        !== undefined ? { practical_meaning }        : {}),
        ...(source_urls              !== undefined ? { source_urls }              : {}),
        ...(is_active                !== undefined ? { is_active }                : {}),
        updated_at: new Date(),
      },
    })
    ok(res, withSettingTag(updated))
  } catch (e: any) {
    err(res, 'UPDATE_FAILED', e.message, 500)
  }
})

adminRouter.delete('/training-seeds/:id', async (req: Request, res: Response) => {
  const existing = await (prisma as any).trainingSeed.findUnique({ where: { id: req.params.id } })
  if (!existing) { err(res, 'NOT_FOUND', 'Training seed not found', 404); return }
  try {
    await (prisma as any).trainingSeed.delete({ where: { id: req.params.id } })
    ok(res, { deleted: true })
  } catch (e: any) {
    err(res, 'DELETE_FAILED', e.message, 500)
  }
})

// ─── CQC Seeds ────────────────────────────────────────────────────────────────

adminRouter.get('/cqc-seeds', async (_req: Request, res: Response) => {
  try {
    const seeds = await (prisma as any).cqcSeed.findMany({ orderBy: { framework_area: 'asc' } })
    ok(res, { seeds, total: seeds.length })
  } catch (e: any) { err(res, 'FETCH_FAILED', e.message, 500) }
})

adminRouter.post('/cqc-seeds', async (req: Request, res: Response) => {
  const { slug, framework_area, also_known_as = [], description = '', inspector_focus = '', evidence_expected = '', rating_indicators = '', source_urls = [], is_active = true } = req.body ?? {}
  if (!slug?.trim() || !framework_area?.trim()) {
    err(res, 'INVALID', 'slug and framework_area are required', 400); return
  }
  const existing = await (prisma as any).cqcSeed.findUnique({ where: { slug } })
  if (existing) { err(res, 'DUPLICATE', `A CQC seed with slug "${slug}" already exists.`, 409); return }
  try {
    const seed = await (prisma as any).cqcSeed.create({
      data: {
        id: crypto.randomUUID(),
        slug: slug.trim().toLowerCase().replace(/\s+/g, '-'),
        framework_area: framework_area.trim(),
        also_known_as:  Array.isArray(also_known_as) ? also_known_as.filter(Boolean) : [],
        description:    description ?? '',
        inspector_focus: inspector_focus ?? '',
        evidence_expected: evidence_expected ?? '',
        rating_indicators: rating_indicators ?? '',
        source_urls:    Array.isArray(source_urls) ? source_urls.filter(Boolean) : [],
        is_active,
        updated_at: new Date(),
      },
    })
    ok(res, seed, 201)
  } catch (e: any) { err(res, 'CREATE_FAILED', e.message, 500) }
})

adminRouter.patch('/cqc-seeds/:id', async (req: Request, res: Response) => {
  const existing = await (prisma as any).cqcSeed.findUnique({ where: { id: req.params.id } })
  if (!existing) { err(res, 'NOT_FOUND', 'CQC seed not found', 404); return }
  const { framework_area, also_known_as, description, inspector_focus, evidence_expected, rating_indicators, source_urls, is_active } = req.body ?? {}
  const data: Record<string, any> = { updated_at: new Date() }
  if (framework_area    !== undefined) data.framework_area    = framework_area
  if (also_known_as     !== undefined) data.also_known_as     = Array.isArray(also_known_as) ? also_known_as.filter(Boolean) : []
  if (description       !== undefined) data.description       = description
  if (inspector_focus   !== undefined) data.inspector_focus   = inspector_focus
  if (evidence_expected !== undefined) data.evidence_expected = evidence_expected
  if (rating_indicators !== undefined) data.rating_indicators = rating_indicators
  if (source_urls       !== undefined) data.source_urls       = Array.isArray(source_urls) ? source_urls.filter(Boolean) : []
  if (is_active         !== undefined) data.is_active         = Boolean(is_active)
  try {
    const updated = await (prisma as any).cqcSeed.update({ where: { id: req.params.id }, data })
    ok(res, updated)
  } catch (e: any) { err(res, 'UPDATE_FAILED', e.message, 500) }
})

adminRouter.delete('/cqc-seeds/:id', async (req: Request, res: Response) => {
  const existing = await (prisma as any).cqcSeed.findUnique({ where: { id: req.params.id } })
  if (!existing) { err(res, 'NOT_FOUND', 'CQC seed not found', 404); return }
  try {
    await (prisma as any).cqcSeed.delete({ where: { id: req.params.id } })
    ok(res, { deleted: true })
  } catch (e: any) { err(res, 'DELETE_FAILED', e.message, 500) }
})

// POST /admin/cqc-seeds/sync-sheet — pull from Google Sheet → upsert to DB
adminRouter.post('/cqc-seeds/sync-sheet', async (_req: Request, res: Response) => {
  try {
    const result = await syncCqcSeedsFromSheets()
    ok(res, {
      synced_at: result.synced_at.toISOString(),
      total_rows: result.total_rows,
      upserted:   result.upserted,
      unchanged:  result.unchanged,
      errors:     result.errors,
    })
  } catch (e: any) {
    err(res, 'SYNC_FAILED', e.message, 500)
  }
})

// POST /admin/cqc-seeds/populate-sheet — push data file → Google Sheet
adminRouter.post('/cqc-seeds/populate-sheet', async (_req: Request, res: Response) => {
  try {
    const result = await populateCqcSeedsSheet()
    ok(res, { written: result.written, errors: result.errors })
  } catch (e: any) {
    err(res, 'POPULATE_FAILED', e.message, 500)
  }
})

// POST /admin/training-reminders — trigger renewal reminder run (Vercel/external cron)
adminRouter.post('/training-reminders', requirePlatformAdmin, async (_req: Request, res: Response) => {
  try {
    const result = await sendRenewalReminders()
    ok(res, result)
  } catch (e: any) {
    err(res, 'REMINDER_FAILED', e.message, 500)
  }
})

// ─── AI Prompts ──────────────────────────────────────────────────────────────

const PROMPTS_DIR = path.resolve(__dirname, '../../../../prompts')

const FILE_MAP: Record<string, string> = {
  policy_summary:                 'prompt-a-summary.txt',
  policy_full:                    'prompt-b-full-policy.txt',
  knowledge_extraction:           'prompt-c-knowledge-extraction.txt',
}

const USAGE_LABELS: Record<string, string> = {
  policy_summary:                 'Prompt A — Summary & Questions',
  policy_full:                    'Prompt B — Full Policy Formatter',
  knowledge_extraction:           'Prompt C — Knowledge Base Extraction',
  training_question_generation:   'Training Question Generation',
  cqc_question_generation:        'CQC Staff Prep — Question Generation',
  cqc_answer_evaluation:          'CQC Staff Prep — Answer Evaluation',
  audit_recommendations:          'Monthly Audit — AI Recommendations',
  onboarding_flow_generation:     'Onboarding Flow Generation',
  onboarding_questions_from_policy: 'Onboarding — Questions from Policy',
  policy_anonymisation:           'Policy Seed Anonymisation',
  training_module_generation:     'Annual Training — Module Generation',
  training_image_generation:       'Annual Training — Cover Image',
  regulation_coverage:             'Policy Gaps — Regulation Coverage',
}

// Seed any missing prompts — checks per-usage so new prompts are added even when others already exist.
async function ensurePromptsSeeded() {
  // File-based prompts (original A/B/C)
  for (const [usage, filename] of Object.entries(FILE_MAP)) {
    const existing = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
    if (existing) continue
    const filePath = path.join(PROMPTS_DIR, filename)
    try {
      const content = fs.readFileSync(filePath, 'utf8')
      await (prisma as any).aiPrompt.create({
        data: { usage, label: USAGE_LABELS[usage] ?? usage, content, updated_at: new Date() },
      })
    } catch { /* file may not exist in some envs — skip */ }
  }

  // Inline default prompts (no file on disk)
  const inlineDefaults: Record<string, string> = {
    cqc_question_generation:  DEFAULT_QUESTION_GENERATION_PROMPT,
    cqc_answer_evaluation:    DEFAULT_ANSWER_EVALUATION_PROMPT,
    audit_recommendations:    DEFAULT_AUDIT_RECOMMENDATIONS_PROMPT,
    onboarding_flow_generation: DEFAULT_ONBOARDING_FLOW_PROMPT,
    onboarding_questions_from_policy: DEFAULT_ONBOARDING_QUESTIONS_PROMPT,
    policy_anonymisation:       DEFAULT_POLICY_ANONYMISE_PROMPT,
    training_module_generation: DEFAULT_TRAINING_MODULE_PROMPT,
    training_image_generation:  DEFAULT_TRAINING_IMAGE_PROMPT,
    regulation_coverage:        DEFAULT_REGULATION_COVERAGE_PROMPT,
  }
  for (const [usage, content] of Object.entries(inlineDefaults)) {
    const existing = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
    if (existing) continue
    try {
      await (prisma as any).aiPrompt.create({
        data: { usage, label: USAGE_LABELS[usage] ?? usage, content, updated_at: new Date() },
      })
    } catch { /* skip on conflict */ }
  }
}

adminRouter.get('/prompts', async (_req: Request, res: Response) => {
  try {
    await ensurePromptsSeeded()
    const prompts = await (prisma as any).aiPrompt.findMany({ orderBy: { created_at: 'asc' } })
    ok(res, { prompts })
  } catch (e) {
    err(res, 'READ_FAILED', `Could not load prompts: ${String(e)}`, 500)
  }
})

adminRouter.post('/prompts', async (req: Request, res: Response) => {
  const { usage, label, content } = req.body ?? {}
  if (!usage || !content?.trim()) {
    err(res, 'VALIDATION_ERROR', 'usage and content are required', 400); return
  }
  const existing = await (prisma as any).aiPrompt.findUnique({ where: { usage } })
  if (existing) {
    err(res, 'CONFLICT', `A prompt for usage "${usage}" already exists`, 409); return
  }
  try {
    const prompt = await (prisma as any).aiPrompt.create({
      data: { usage, label: label || USAGE_LABELS[usage] || usage, content: content.trim(), updated_at: new Date() },
    })
    ok(res, prompt, 201)
  } catch (e: any) {
    err(res, 'CREATE_FAILED', e.message, 500)
  }
})

adminRouter.patch('/prompts/:id', async (req: Request, res: Response) => {
  const { label, content } = req.body ?? {}
  const existing = await (prisma as any).aiPrompt.findUnique({ where: { id: req.params.id } })
  if (!existing) { err(res, 'NOT_FOUND', 'Prompt not found', 404); return }
  try {
    // Save old version before overwriting (non-fatal if table not yet migrated)
    await (prisma as any).aiPromptVersion.create({
      data: {
        id:        crypto.randomUUID(),
        prompt_id: existing.id,
        usage:     existing.usage,
        label:     existing.label,
        content:   existing.content,
      },
    }).catch((e: any) => console.warn('[admin/prompts] Version snapshot failed (migration pending?):', e.message))

    const updated = await (prisma as any).aiPrompt.update({
      where: { id: req.params.id },
      data: {
        ...(label   !== undefined ? { label }              : {}),
        ...(content !== undefined ? { content: content.trim() } : {}),
        updated_at: new Date(),
      },
    })
    // Write back to file so the AI pipeline picks up the change without a deploy
    const filename = FILE_MAP[existing.usage]
    if (filename && content !== undefined) {
      try { fs.writeFileSync(path.join(PROMPTS_DIR, filename), content.trim(), 'utf8') } catch { /* non-fatal */ }
    }
    ok(res, updated)
  } catch (e: any) {
    err(res, 'UPDATE_FAILED', e.message, 500)
  }
})

// ─── GET /admin/prompts/outputs/:usage ────────────────────────────────────────
// Returns recent AI outputs for a given prompt usage — platform owner analytics.
// Accepts optional ?tenant_id= query param to scope to a specific tenant.

adminRouter.get('/prompts/outputs/:usage', async (req: Request, res: Response) => {
  const usage: string = req.params.usage as string
  const limit    = Math.min(50, parseInt((req.query.limit as string) || '30'))
  const tenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : null

  const categoryMap: Record<string, string | null> = {
    policy_summary:               null,
    policy_full:                  null,
    training_question_generation: 'training_module',
    training_chat:                'training_module',
    cqc_query:                    'cqc_report',
    knowledge_extraction:         null,
  }
  const category = categoryMap[usage] ?? null

  // user-supplied tenant_id is bound as a parameter; `category` is from the
  // fixed categoryMap above (never user input), so it is safe to interpolate.
  const params: any[] = []
  let tenantClause = ''
  if (tenantId) { params.push(tenantId); tenantClause = `AND q.tenant_id = $${params.length}` }
  const whereCategory = category
    ? `AND document_category_queried = '${category}'`
    : `AND (document_category_queried IS NULL OR document_category_queried IN ('internal_policy', 'staff_handbook'))`
  params.push(limit)
  const limitParam = `$${params.length}`

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT q.id, q.query_text, q.response_text, q.no_match, q.feedback,
             q.response_time_ms, q.language_detected, q.created_at,
             u.name AS user_name
      FROM queries q
      LEFT JOIN users u ON q.user_id = u.id
      WHERE q.chat_deleted_at IS NULL
      ${tenantClause}
      ${whereCategory}
      ORDER BY q.created_at DESC
      LIMIT ${limitParam}
    `, ...params)
    ok(res, { outputs: rows })
  } catch (e: any) {
    console.error('[admin/prompts/outputs] Query failed:', e.message)
    ok(res, { outputs: [] })
  }
})

// ─── GET /admin/prompts/feedback-stats ────────────────────────────────────────
// Aggregate feedback (positive/negative) per prompt category.
// Accepts optional ?tenant_id= query param to scope to a specific tenant.

adminRouter.get('/prompts/feedback-stats', async (req: Request, res: Response) => {
  const tenantId = typeof req.query.tenant_id === 'string' ? req.query.tenant_id : null
  const params: any[] = []
  let tenantClause = ''
  if (tenantId) { params.push(tenantId); tenantClause = `AND tenant_id = $${params.length}` }

  try {
    const rows: any[] = await prisma.$queryRawUnsafe(`
      SELECT
        COALESCE(document_category_queried, 'policy') AS category,
        COUNT(*)                                        AS total,
        COUNT(*) FILTER (WHERE feedback = 'positive')  AS positive,
        COUNT(*) FILTER (WHERE feedback = 'negative')  AS negative,
        COUNT(*) FILTER (WHERE feedback IS NULL)        AS unrated,
        ROUND(
          COUNT(*) FILTER (WHERE feedback = 'positive') * 100.0
          / NULLIF(COUNT(*) FILTER (WHERE feedback IS NOT NULL), 0), 1
        ) AS positive_pct
      FROM queries
      WHERE chat_deleted_at IS NULL
      ${tenantClause}
      GROUP BY COALESCE(document_category_queried, 'policy')
      ORDER BY total DESC
    `, ...params)
    ok(res, { stats: rows })
  } catch (e: any) {
    console.error('[admin/prompts/feedback-stats] Query failed:', e.message)
    ok(res, { stats: [] })
  }
})

// ─── GET /admin/prompts/:id/versions ─────────────────────────────────────────
// Returns version history for a specific prompt (last 20 versions).

adminRouter.get('/prompts/:id/versions', async (req: Request, res: Response) => {
  try {
    const versions = await (prisma as any).aiPromptVersion.findMany({
      where:   { prompt_id: req.params.id },
      orderBy: { saved_at: 'desc' },
      take:    20,
      select:  { id: true, label: true, content: true, saved_at: true },
    })
    ok(res, { versions })
  } catch (e: any) {
    console.error('[admin/prompts/versions] Query failed:', e.message)
    ok(res, { versions: [] })
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

// ─── Blog Authors ─────────────────────────────────────────────────────────────

// ─── GET /admin/tenants/:id/audit-stats ──────────────────────────────────────

adminRouter.get('/tenants/:id/audit-stats', async (req: Request, res: Response) => {
  const tenantId = req.params.id

  const runs = await (prisma as any).auditRun.findMany({
    where:   { tenant_id: tenantId },
    select:  { status: true, completed_at: true, template: { select: { frequency: true, name: true } } },
  })

  const FREQS = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic'] as const
  const byFreq: Record<string, { completed: number; in_progress: number; last_completed: string | null }> = {}

  for (const f of FREQS) {
    byFreq[f] = { completed: 0, in_progress: 0, last_completed: null }
  }

  for (const run of runs) {
    const freq = run.template?.frequency ?? 'monthly'
    if (!byFreq[freq]) continue
    if (run.status === 'completed') {
      byFreq[freq].completed++
      const ca = run.completed_at ? new Date(run.completed_at).toISOString() : null
      if (ca && (!byFreq[freq].last_completed || ca > byFreq[freq].last_completed!)) {
        byFreq[freq].last_completed = ca
      }
    } else {
      byFreq[freq].in_progress++
    }
  }

  ok(res, {
    total:      runs.length,
    completed:  runs.filter((r: any) => r.status === 'completed').length,
    in_progress: runs.filter((r: any) => r.status !== 'completed').length,
    by_frequency: byFreq,
  })
})

// ─── GET /admin/audit-seeds ───────────────────────────────────────────────────

adminRouter.get('/audit-seeds', async (_req: Request, res: Response) => {
  await ensurePlatformTemplatesSeeded().catch(() => {})   // make sure new code-defined seeds exist
  const templates = await (prisma as any).auditTemplate.findMany({
    where:   { is_seed: true, tenant_id: null },
    include: {
      sections: {
        orderBy: { section_order: 'asc' },
        include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } },
      },
    },
    orderBy: { name: 'asc' },
  })
  ok(res, { templates, total: templates.length })
})

// ─── PATCH /admin/audit-seeds/:id ─────────────────────────────────────────────
// Edit a platform audit seed. These rows are shared read-only by EVERY tenant
// (tenant_id null, is_seed true), so an edit reaches every tenant's live audits
// immediately. To keep historical audit answers intact we edit in place: existing
// questions keep their id (their past answers stay valid), and a removed question
// is soft-deleted (is_active=false) rather than hard-deleted, which run rendering
// already hides (questions are fetched with is_active: true).
adminRouter.patch('/audit-seeds/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const seed = await (prisma as any).auditTemplate.findFirst({
    where:  { id, is_seed: true, tenant_id: null },
    select: { id: true },
  })
  if (!seed) { err(res, 'NOT_FOUND', 'Audit seed not found', 404); return }

  const b = req.body ?? {}
  const FREQS = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic']
  const TYPES = ['yes_no', 'yes_no_na', 'findings', 'free_text']

  if (!Array.isArray(b.sections)) { err(res, 'VALIDATION_ERROR', 'sections array is required', 400); return }

  // Normalise + validate the whole payload before touching the DB, so a bad edit
  // never applies partially.
  const sections = b.sections.map((s: any) => ({
    id:    s?.id ? String(s.id) : null,
    title: String(s?.title ?? '').trim(),
    questions: (Array.isArray(s?.questions) ? s.questions : [])
      .map((q: any) => ({
        id:   q?.id ? String(q.id) : null,
        text: String(q?.question_text ?? '').trim(),
        type: TYPES.includes(q?.question_type) ? q.question_type : 'yes_no',
      }))
      .filter((q: any) => q.text),
  }))
  if (!sections.length)                                    { err(res, 'VALIDATION_ERROR', 'Add at least one section', 400); return }
  if (sections.some((s: any) => !s.title))                 { err(res, 'VALIDATION_ERROR', 'Every section needs a title', 400); return }
  if (sections.some((s: any) => s.questions.length === 0)) { err(res, 'VALIDATION_ERROR', 'Every section needs at least one question', 400); return }

  const current = await (prisma as any).auditTemplate.findUnique({
    where:   { id },
    include: { sections: { include: { questions: true } } },
  })
  const curSectionById = new Map<string, any>(current.sections.map((s: any) => [s.id, s]))

  await (prisma as any).$transaction(async (tx: any) => {
    // Template-level fields
    const tData: any = {}
    if (typeof b.name === 'string' && b.name.trim())              tData.name = b.name.trim()
    if (b.description !== undefined)                              tData.description = b.description ? String(b.description).trim() : null
    if (typeof b.frequency === 'string' && FREQS.includes(b.frequency)) tData.frequency = b.frequency
    if (Object.keys(tData).length) await tx.auditTemplate.update({ where: { id }, data: tData })

    // Only WRITE rows that actually changed. Big templates (e.g. Health & Safety
    // has 9 sections / 49 questions) would otherwise fire ~60 sequential writes
    // and blow the interactive-transaction budget; a typical edit touches a few.
    const keptSectionIds = new Set<string>()
    for (let si = 0; si < sections.length; si++) {
      const s = sections[si]
      let sectionId: string | null = s.id && curSectionById.has(s.id) ? s.id : null
      if (sectionId) {
        const cs = curSectionById.get(sectionId)
        if (cs.title !== s.title || cs.section_order !== si) {
          await tx.auditSection.update({ where: { id: sectionId }, data: { title: s.title, section_order: si } })
        }
      } else {
        const created = await tx.auditSection.create({ data: { template_id: id, title: s.title, section_order: si } })
        sectionId = created.id
      }
      keptSectionIds.add(sectionId!)

      const cur = curSectionById.get(sectionId!)
      const curQById = new Map<string, any>((cur?.questions ?? []).map((q: any) => [q.id, q]))
      const keptQIds = new Set<string>()
      for (let qi = 0; qi < s.questions.length; qi++) {
        const q = s.questions[qi]
        const cq = q.id ? curQById.get(q.id) : null
        if (cq) {
          keptQIds.add(q.id)
          if (cq.question_text !== q.text || cq.question_type !== q.type || cq.question_order !== qi || !cq.is_active) {
            await tx.auditQuestion.update({ where: { id: q.id }, data: { question_text: q.text, question_type: q.type, question_order: qi, is_active: true } })
          }
        } else {
          await tx.auditQuestion.create({ data: { section_id: sectionId!, question_text: q.text, question_type: q.type, question_order: qi } })
        }
      }
      // Questions removed from a kept section → soft-delete (keep their answers).
      for (const q of (cur?.questions ?? [])) {
        if (q.is_active && !keptQIds.has(q.id)) await tx.auditQuestion.update({ where: { id: q.id }, data: { is_active: false } })
      }
    }
    // Whole sections removed → soft-delete their questions (section rows carry no
    // is_active flag; an empty section renders nothing to tenants).
    for (const cs of current.sections) {
      if (!keptSectionIds.has(cs.id)) {
        for (const q of cs.questions) if (q.is_active) await tx.auditQuestion.update({ where: { id: q.id }, data: { is_active: false } })
      }
    }
  }, { timeout: 20000, maxWait: 8000 })

  const updated = await (prisma as any).auditTemplate.findUnique({
    where:   { id },
    include: {
      sections: {
        orderBy: { section_order: 'asc' },
        include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } },
      },
    },
  })
  ok(res, { template: updated })
})

// ─── PATCH /admin/audit-seeds/:id/reviewed ────────────────────────────────────
// Platform review tracking: mark a seed template as content-checked (or not).
adminRouter.patch('/audit-seeds/:id/reviewed', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const seed = await (prisma as any).auditTemplate.findFirst({
    where:  { id, is_seed: true, tenant_id: null },
    select: { id: true },
  })
  if (!seed) { err(res, 'NOT_FOUND', 'Audit seed not found', 404); return }
  const reviewed = req.body?.reviewed !== false
  const updated = await (prisma as any).auditTemplate.update({
    where:  { id },
    data:   { seed_reviewed: reviewed, seed_reviewed_at: reviewed ? new Date() : null },
    select: { id: true, seed_reviewed: true, seed_reviewed_at: true },
  })
  ok(res, updated)
})

// ─── Service requests (tenant support tickets) ────────────────────────────────
adminRouter.get('/service-requests', async (req: Request, res: Response) => {
  const status = req.query.status ? String(req.query.status) : undefined
  const where  = status && status !== 'all' ? { status } : {}
  const [requests, grouped] = await Promise.all([
    (prisma as any).supportRequest.findMany({ where, orderBy: { created_at: 'desc' }, take: 500 }),
    (prisma as any).supportRequest.groupBy({ by: ['status'], _count: { _all: true } }),
  ])
  const counts: Record<string, number> = {}
  for (const g of grouped) counts[g.status] = g._count._all
  ok(res, { requests, counts, total: requests.length })
})

adminRouter.patch('/service-requests/:id', async (req: Request, res: Response) => {
  const id     = String(req.params.id)
  const status = String(req.body?.status ?? '')
  if (!['new', 'in_progress', 'resolved'].includes(status)) { err(res, 'INVALID', 'Invalid status', 400); return }
  const existing = await (prisma as any).supportRequest.findUnique({ where: { id }, select: { id: true } })
  if (!existing) { err(res, 'NOT_FOUND', 'Request not found', 404); return }
  await (prisma as any).supportRequest.update({ where: { id }, data: { status } })
  ok(res, { updated: true })
})

// Stream the attached image (platform admin only). Fetched with the admin token,
// so it can't be a plain <img src>; the console fetches it into a blob URL.
adminRouter.get('/service-requests/:id/image', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const r  = await (prisma as any).supportRequest.findUnique({
    where: { id }, select: { image_s3_key: true, image_type: true, image_file_name: true },
  })
  if (!r?.image_s3_key) { err(res, 'NOT_FOUND', 'No image on this request', 404); return }
  try {
    const buf = await downloadFile(r.image_s3_key)
    res.setHeader('Content-Type', r.image_type ?? 'application/octet-stream')
    res.setHeader('Content-Disposition', `inline; filename="${String(r.image_file_name ?? 'image').replace(/"/g, '')}"`)
    res.send(buf)
  } catch (e: any) { err(res, 'DOWNLOAD_FAILED', e?.message ?? 'Could not load image', 500) }
})

adminRouter.get('/blog/authors', async (_req: Request, res: Response) => {
  const authors = await (prisma as any).blogAuthor.findMany({ orderBy: { name: 'asc' } })
  ok(res, { authors, total: authors.length })
})

adminRouter.post('/blog/authors', async (req: Request, res: Response) => {
  const { name, title, photo_url, bio, linkedin_url } = req.body ?? {}
  if (!name?.trim()) { err(res, 'VALIDATION_ERROR', 'Author name is required.'); return }
  const author = await (prisma as any).blogAuthor.create({
    data: { name: name.trim(), title: title?.trim() || null, photo_url: photo_url || null, bio: bio?.trim() || null, linkedin_url: linkedin_url?.trim() || null },
  })
  ok(res, { author })
})

adminRouter.patch('/blog/authors/:id', async (req: Request, res: Response) => {
  const { name, title, photo_url, bio, linkedin_url } = req.body ?? {}
  const author = await (prisma as any).blogAuthor.update({
    where: { id: req.params.id },
    data:  {
      ...(name         !== undefined && { name:         name.trim()          }),
      ...(title        !== undefined && { title:        title?.trim() || null }),
      ...(photo_url    !== undefined && { photo_url:    photo_url || null     }),
      ...(bio          !== undefined && { bio:          bio?.trim() || null    }),
      ...(linkedin_url !== undefined && { linkedin_url: linkedin_url?.trim() || null }),
    },
  })
  ok(res, { author })
})

adminRouter.delete('/blog/authors/:id', async (req: Request, res: Response) => {
  await (prisma as any).blogAuthor.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
})

// ─── Blog Posts ───────────────────────────────────────────────────────────────

adminRouter.get('/blog/posts', async (_req: Request, res: Response) => {
  const posts = await (prisma as any).blogPost.findMany({
    orderBy: { created_at: 'desc' },
    include: { author: { select: { id: true, name: true, photo_url: true } } },
  })
  ok(res, { posts, total: posts.length })
})

adminRouter.post('/blog/posts', async (req: Request, res: Response) => {
  const { title, slug } = req.body ?? {}
  if (!title?.trim()) { err(res, 'VALIDATION_ERROR', 'Title is required.'); return }
  if (!slug?.trim())  { err(res, 'VALIDATION_ERROR', 'Slug is required.');  return }

  const existing = await (prisma as any).blogPost.findUnique({ where: { slug: slug.trim() } })
  if (existing) { err(res, 'CONFLICT', `A post with slug "${slug}" already exists.`, 409); return }

  const post = await (prisma as any).blogPost.create({ data: buildPostData(req.body) })
  if (post.status === 'published' && post.slug) {
    await submitUrlsForIndexing([`${siteUrl()}/blog/${post.slug}`], { source: 'blog', blogPostId: post.id })
  }
  ok(res, { post })
})

adminRouter.patch('/blog/posts/:id', async (req: Request, res: Response) => {
  const { slug } = req.body ?? {}
  if (slug) {
    const clash = await (prisma as any).blogPost.findFirst({ where: { slug: slug.trim(), NOT: { id: req.params.id } } })
    if (clash) { err(res, 'CONFLICT', `Slug "${slug}" is already in use.`, 409); return }
  }
  const post = await (prisma as any).blogPost.update({
    where: { id: req.params.id },
    data:  buildPostData(req.body),
  })
  if (post.status === 'published' && post.slug) {
    await submitUrlsForIndexing([`${siteUrl()}/blog/${post.slug}`], { source: 'blog', blogPostId: post.id })
  }
  ok(res, { post })
})

adminRouter.delete('/blog/posts/:id', async (req: Request, res: Response) => {
  await (prisma as any).blogPost.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
})

adminRouter.post('/blog/upload-image', imageUploadMiddleware, async (req: any, res: Response) => {
  if (!req.file) { err(res, 'NO_FILE', 'No image file provided.', 400); return }
  try {
    const key  = await uploadBlogImage({
      filename: req.file.originalname,
      buffer:   req.file.buffer,
      mimeType: req.file.mimetype,
    })
    const url  = blogImagePublicUrl(req, key)
    ok(res, { url })
  } catch (e: any) {
    err(res, 'UPLOAD_FAILED', e.message, 500)
  }
})

// ─── Image Alt Tags ───────────────────────────────────────────────────────────
// Central alt-text management for static site images. Surfaced on the marketing
// pages via the <SiteImage> component (GET /public/image-alts).

adminRouter.get('/image-alts', async (_req: Request, res: Response) => {
  const images = await (prisma as any).siteImageAlt.findMany({ orderBy: { src: 'asc' } })
  ok(res, { images, total: images.length })
})

adminRouter.put('/image-alts', async (req: Request, res: Response) => {
  const { src, alt } = req.body ?? {}
  if (!src?.trim()) { err(res, 'MISSING_SRC', 'src is required.'); return }
  const image = await (prisma as any).siteImageAlt.upsert({
    where:  { src: src.trim() },
    create: { src: src.trim(), alt: (alt ?? '').trim() },
    update: { alt: (alt ?? '').trim() },
  })
  ok(res, { image })
})

// ─── Site Pages ───────────────────────────────────────────────────────────────

adminRouter.get('/site-pages', async (_req: Request, res: Response) => {
  const pages = await (prisma as any).sitePage.findMany({ orderBy: { path: 'asc' } })
  ok(res, { pages })
})

adminRouter.post('/site-pages', async (req: Request, res: Response) => {
  const { path, ...rest } = req.body ?? {}
  if (!path) { err(res, 'MISSING_PATH', 'path is required', 400); return }
  const page = await (prisma as any).sitePage.upsert({
    where:  { path: path.trim() },
    update: buildPageData(rest),
    create: { path: path.trim(), ...buildPageData(rest) },
  })
  if (page.status === 'published' && page.path?.startsWith('/')) {
    await submitUrlsForIndexing([`${siteUrl()}${page.path}`], { source: 'page' })
  }
  ok(res, { page })
})

adminRouter.patch('/site-pages/:id', async (req: Request, res: Response) => {
  const page = await (prisma as any).sitePage.update({
    where: { id: req.params.id },
    data:  buildPageData(req.body),
  })
  if (page.status === 'published' && page.path?.startsWith('/')) {
    await submitUrlsForIndexing([`${siteUrl()}${page.path}`], { source: 'page' })
  }
  ok(res, { page })
})

adminRouter.delete('/site-pages/:id', async (req: Request, res: Response) => {
  await (prisma as any).sitePage.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
})

// ─── Collections (ecommerce-style SEO landing pages) ──────────────────────────

adminRouter.get('/collections', async (_req: Request, res: Response) => {
  const collections = await (prisma as any).collection.findMany({ orderBy: { updated_at: 'desc' } })
  ok(res, { collections, total: collections.length })
})

adminRouter.post('/collections', async (req: Request, res: Response) => {
  const { title, slug } = req.body ?? {}
  if (!title?.trim()) { err(res, 'VALIDATION_ERROR', 'Title is required.'); return }
  if (!slug?.trim())  { err(res, 'VALIDATION_ERROR', 'Slug is required.');  return }

  const existing = await (prisma as any).collection.findUnique({ where: { slug: slug.trim() } })
  if (existing) { err(res, 'CONFLICT', `A collection with slug "${slug}" already exists.`, 409); return }

  const collection = await (prisma as any).collection.create({ data: buildCollectionData(req.body) })
  if (collection.status === 'published' && collection.slug) {
    await submitUrlsForIndexing([`${siteUrl()}/collections/${collection.slug}`], { source: 'page' })
  }
  ok(res, { collection })
})

adminRouter.patch('/collections/:id', async (req: Request, res: Response) => {
  const { slug } = req.body ?? {}
  if (slug) {
    const clash = await (prisma as any).collection.findFirst({ where: { slug: slug.trim(), NOT: { id: req.params.id } } })
    if (clash) { err(res, 'CONFLICT', `Slug "${slug}" is already in use.`, 409); return }
  }
  const collection = await (prisma as any).collection.update({
    where: { id: req.params.id },
    data:  buildCollectionData(req.body),
  })
  if (collection.status === 'published' && collection.slug) {
    await submitUrlsForIndexing([`${siteUrl()}/collections/${collection.slug}`], { source: 'page' })
  }
  ok(res, { collection })
})

adminRouter.delete('/collections/:id', async (req: Request, res: Response) => {
  await (prisma as any).collection.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
})

function buildCollectionData(body: any) {
  const {
    title, slug, status, meta_title, meta_description, og_image_url,
    intro, images, body: content, links, faqs,
  } = body ?? {}
  return {
    ...(title            !== undefined && { title:            title?.trim() ?? ''            }),
    ...(slug             !== undefined && { slug:             slug?.trim()                   }),
    ...(status           !== undefined && { status:           status || 'draft'              }),
    ...(meta_title       !== undefined && { meta_title:       meta_title?.trim() || null     }),
    ...(meta_description !== undefined && { meta_description: meta_description?.trim() || null }),
    ...(og_image_url     !== undefined && { og_image_url:     og_image_url?.trim() || null   }),
    ...(intro            !== undefined && { intro:            typeof intro === 'string' ? intro : '' }),
    ...(images           !== undefined && { images:           normaliseImages(images)        }),
    ...(content          !== undefined && { body:             typeof content === 'string' ? content : '' }),
    ...(links            !== undefined && { links:            normaliseLinks(links)          }),
    ...(faqs             !== undefined && { faqs:             normaliseFaqs(faqs)            }),
  }
}

// Keep only image entries with a URL; cap and trim alt text.
function normaliseImages(images: any): Array<{ url: string; alt: string }> {
  if (!Array.isArray(images)) return []
  return images
    .map((i: any) => ({ url: String(i?.url ?? '').trim(), alt: String(i?.alt ?? '').trim().slice(0, 200) }))
    .filter((i: { url: string }) => i.url)
    .slice(0, 12)
}

// Keep only links with both a label and a URL.
function normaliseLinks(links: any): Array<{ label: string; url: string }> {
  if (!Array.isArray(links)) return []
  return links
    .map((l: any) => ({ label: String(l?.label ?? '').trim().slice(0, 160), url: String(l?.url ?? '').trim() }))
    .filter((l: { label: string; url: string }) => l.label && l.url)
    .slice(0, 40)
}

// ─── Feature pages (DB-driven /pricing feature pages) ─────────────────────────

adminRouter.get('/feature-pages', async (_req: Request, res: Response) => {
  const featurePages = await (prisma as any).featurePage.findMany({ orderBy: [{ sort: 'asc' }, { title: 'asc' }] })
  ok(res, { featurePages, total: featurePages.length })
})

adminRouter.post('/feature-pages', async (req: Request, res: Response) => {
  const { title, slug } = req.body ?? {}
  if (!title?.trim()) { err(res, 'VALIDATION_ERROR', 'Title is required.'); return }
  if (!slug?.trim())  { err(res, 'VALIDATION_ERROR', 'Slug is required.');  return }

  const existing = await (prisma as any).featurePage.findUnique({ where: { slug: slug.trim() } })
  if (existing) { err(res, 'CONFLICT', `A feature page with slug "${slug}" already exists.`, 409); return }

  const featurePage = await (prisma as any).featurePage.create({ data: buildFeaturePageData(req.body) })
  if (featurePage.status === 'published' && featurePage.slug) {
    await submitUrlsForIndexing([`${siteUrl()}/features/${featurePage.slug}`], { source: 'page' })
  }
  ok(res, { featurePage })
})

adminRouter.patch('/feature-pages/:id', async (req: Request, res: Response) => {
  const { slug } = req.body ?? {}
  if (slug) {
    const clash = await (prisma as any).featurePage.findFirst({ where: { slug: slug.trim(), NOT: { id: req.params.id } } })
    if (clash) { err(res, 'CONFLICT', `Slug "${slug}" is already in use.`, 409); return }
  }
  const featurePage = await (prisma as any).featurePage.update({
    where: { id: req.params.id },
    data:  buildFeaturePageData(req.body),
  })
  // A pure "mark updated" toggle is just a personal tracker; don't re-submit the page for indexing.
  const onlyTracker = Object.keys(req.body ?? {}).every((k) => k === 'content_updated')
  if (!onlyTracker && featurePage.status === 'published' && featurePage.slug) {
    await submitUrlsForIndexing([`${siteUrl()}/features/${featurePage.slug}`], { source: 'page' })
  }
  ok(res, { featurePage })
})

adminRouter.delete('/feature-pages/:id', async (req: Request, res: Response) => {
  await (prisma as any).featurePage.delete({ where: { id: req.params.id } })
  ok(res, { deleted: true })
})

function buildFeaturePageData(body: any) {
  const { title, slug, status, meta_title, meta_description, og_image_url, content, faqs, content_updated, sort } = body ?? {}
  return {
    ...(title            !== undefined && { title:            title?.trim() ?? ''            }),
    ...(slug             !== undefined && { slug:             slug?.trim()                   }),
    ...(status           !== undefined && { status:           status || 'draft'              }),
    ...(meta_title       !== undefined && { meta_title:       meta_title?.trim() || null     }),
    ...(meta_description !== undefined && { meta_description: meta_description?.trim() || null }),
    ...(og_image_url     !== undefined && { og_image_url:     og_image_url?.trim() || null   }),
    ...(content          !== undefined && { content:          (content && typeof content === 'object') ? content : {} }),
    ...(faqs             !== undefined && { faqs:             normaliseFaqs(faqs)            }),
    ...(content_updated  !== undefined && { content_updated:  Boolean(content_updated)       }),
    ...(sort             !== undefined && { sort:             Number(sort) || 0             }),
  }
}

function buildPageData(body: any) {
  const {
    title, meta_title, description, og_title, og_description, og_image_url,
    is_footer_page, footer_group, footer_label, footer_sort,
    page_type, status, faqs, content, content_updated, content_slots,
  } = body ?? {}
  return {
    ...(content_updated !== undefined && { content_updated: Boolean(content_updated) }),
    ...(content_slots   !== undefined && { content_slots: (content_slots && typeof content_slots === 'object') ? content_slots : {} }),
    ...(title          !== undefined && { title:          title?.trim() ?? ''          }),
    ...(meta_title     !== undefined && { meta_title:     meta_title?.trim() || null   }),
    ...(description    !== undefined && { description:    description?.trim() || null  }),
    ...(og_title       !== undefined && { og_title:       og_title?.trim() || null     }),
    ...(og_description !== undefined && { og_description: og_description?.trim() || null }),
    ...(og_image_url   !== undefined && { og_image_url:   og_image_url?.trim() || null }),
    ...(is_footer_page !== undefined && { is_footer_page: Boolean(is_footer_page)      }),
    ...(footer_group   !== undefined && { footer_group:   footer_group || null         }),
    ...(footer_label   !== undefined && { footer_label:   footer_label?.trim() || null }),
    ...(footer_sort    !== undefined && { footer_sort:    Number(footer_sort) || 0     }),
    ...(page_type      !== undefined && { page_type:      page_type || 'marketing'     }),
    ...(status         !== undefined && { status:         status || 'published'        }),
    ...(faqs           !== undefined && { faqs:           normaliseFaqs(faqs)          }),
    ...(content        !== undefined && { content:        typeof content === 'string' ? content : '' }),
  }
}

// Keep only well-formed { question, answer } pairs with content on both sides.
function normaliseFaqs(faqs: any): Array<{ question: string; answer: string }> {
  if (!Array.isArray(faqs)) return []
  return faqs
    .map((f: any) => ({ question: String(f?.question ?? '').trim(), answer: String(f?.answer ?? '').trim() }))
    .filter((f: { question: string; answer: string }) => f.question && f.answer)
}

function buildPostData(body: any) {
  const {
    title, slug, excerpt, meta_title, meta_description,
    feature_image_url, feature_image_alt, og_image_url,
    content, author_id, category, publication_date, status,
    is_featured, read_time_minutes, cta_text, cta_url, cta_type,
    special_message, special_message_color, key_info_title, key_info_content,
    faqs, sources,
  } = body ?? {}

  return {
    ...(title                !== undefined && { title:                 title?.trim()            }),
    ...(slug                 !== undefined && { slug:                  slug?.trim()             }),
    ...(excerpt              !== undefined && { excerpt:               excerpt?.trim() || null  }),
    ...(meta_title           !== undefined && { meta_title:            meta_title?.trim() || null }),
    ...(meta_description     !== undefined && { meta_description:      meta_description?.trim() || null }),
    ...(feature_image_url    !== undefined && { feature_image_url:     feature_image_url || null }),
    ...(feature_image_alt    !== undefined && { feature_image_alt:     feature_image_alt?.trim() || null }),
    ...(og_image_url         !== undefined && { og_image_url:          og_image_url || null    }),
    ...(content              !== undefined && { content:               content || ''            }),
    ...(author_id            !== undefined && { author_id:             author_id || null        }),
    ...(category             !== undefined && { category:              category || 'advice'     }),
    ...(publication_date     !== undefined && { publication_date:      publication_date ? new Date(publication_date) : null }),
    ...(status               !== undefined && { status:                status || 'draft'        }),
    ...(is_featured          !== undefined && { is_featured:           Boolean(is_featured)     }),
    ...(read_time_minutes    !== undefined && { read_time_minutes:     Number(read_time_minutes) || 1 }),
    ...(cta_text             !== undefined && { cta_text:              cta_text?.trim() || null }),
    ...(cta_url              !== undefined && { cta_url:               cta_url?.trim() || null  }),
    ...(cta_type             !== undefined && { cta_type:              cta_type?.trim() || null }),
    ...(special_message      !== undefined && { special_message:       special_message?.trim() || null }),
    ...(special_message_color !== undefined && { special_message_color: special_message_color || null }),
    ...(key_info_title       !== undefined && { key_info_title:        key_info_title?.trim() || null }),
    ...(key_info_content     !== undefined && { key_info_content:      key_info_content?.trim() || null }),
    ...(faqs                 !== undefined && { faqs:                  Array.isArray(faqs) ? faqs.filter((f: any) => f.question?.trim() || f.answer?.trim()) : null }),
    ...(sources              !== undefined && { sources:               Array.isArray(sources) ? sources.map((s: any) => ({ label: (s.label ?? '').trim(), url: (s.url ?? '').trim() })).filter((s: any) => s.url) : null }),
  }
}

// ─── Onboarding email drip (platform Email Marketing) ─────────────────────────

function aggregateSends(sends: any[]) {
  const sent      = sends.filter(s => s.sent_at).length
  const delivered = sends.filter(s => s.delivered_at).length
  const opened    = sends.filter(s => s.first_opened_at).length
  const clicked   = sends.filter(s => s.first_clicked_at).length
  const bounced   = sends.filter(s => s.status === 'bounced').length
  const pct = (n: number, d: number) => d > 0 ? Math.round((n / d) * 100) : null
  return {
    sent, delivered, opened, clicked, bounced,
    delivered_pct: pct(delivered, sent),
    open_pct:      pct(opened, delivered || sent),
    click_pct:     pct(clicked, delivered || sent),
    first_sent_at: sends.reduce<string | null>((min, s) => s.sent_at && (!min || s.sent_at < min) ? s.sent_at : min, null),
  }
}

// GET /admin/onboarding/emails?plan=enterprise — sequence + aggregate stats per email.
adminRouter.get('/onboarding/emails', async (req: Request, res: Response) => {
  const plan = String(req.query.plan ?? 'enterprise')
  const { ownerByKey } = await import('../services/onboarding/ordering')
  const [emails, sends, owner] = await Promise.all([
    (prisma as any).onboardingEmail.findMany({ where: { plan }, orderBy: { day_index: 'asc' } }),
    (prisma as any).onboardingSend.findMany({ where: { plan }, select: { email_id: true, sent_at: true, delivered_at: true, first_opened_at: true, first_clicked_at: true, status: true } }),
    ownerByKey(),
  ])
  const byEmail = new Map<string, any[]>()
  for (const s of sends as any[]) { const a = byEmail.get(s.email_id) ?? []; a.push(s); byEmail.set(s.email_id, a) }
  // Show only the emails this plan introduces; shared ones are managed in the plan below.
  const owned = (emails as any[]).filter(e => e.template_key && owner.get(e.template_key) === plan)
  const out = owned.map(e => ({
    id: e.id, plan: e.plan, day_index: e.day_index, subject: e.subject, preheader: e.preheader,
    from_email: e.from_email, badge: (e.body as any)?.badge ?? null, headline: (e.body as any)?.headline ?? null,
    image: (e.body as any)?.imageSrc ?? null,
    stats: aggregateSends(byEmail.get(e.id) ?? []),
  }))
  ok(res, { plan, emails: out })
})

// GET /admin/onboarding/emails/:id/preview — rendered HTML of the email.
adminRouter.get('/onboarding/emails/:id/preview', async (req: Request, res: Response) => {
  const e = await (prisma as any).onboardingEmail.findUnique({ where: { id: req.params.id } })
  if (!e) { err(res, 'NOT_FOUND', 'Email not found', 404); return }
  const html = renderOnboardingEmailHtml({ subject: e.subject, preheader: e.preheader, body: e.body }, { unsubscribeUrl: '#' })
  ok(res, { html, subject: e.subject })
})

// POST /admin/onboarding/emails/:id/test — send a one-off test to any address.
adminRouter.post('/onboarding/emails/:id/test', async (req: Request, res: Response) => {
  const to = String(req.body?.to ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(to)) { err(res, 'INVALID', 'A valid email address is required.', 400); return }
  const e = await (prisma as any).onboardingEmail.findUnique({ where: { id: req.params.id } })
  if (!e) { err(res, 'NOT_FOUND', 'Email not found', 404); return }
  try {
    const { sendTestEmail } = await import('../services/onboarding/dispatch')
    await sendTestEmail(to, e)
    ok(res, { sent: to })
  } catch (e: any) {
    err(res, 'SEND_FAILED', e?.message ?? 'Could not send the test.', 500)
  }
})

// GET /admin/onboarding/enrolments — active drip enrolments (for the manual runner).
adminRouter.get('/onboarding/enrolments', async (_req: Request, res: Response) => {
  try {
    const enrolments = await (prisma as any).onboardingEnrolment.findMany({ where: { status: 'active' }, orderBy: { created_at: 'desc' } })
    const ids = enrolments.map((e: any) => e.tenant_id)
    const tenants = ids.length ? await (prisma as any).tenant.findMany({ where: { id: { in: ids } }, select: { id: true, name: true, account_number: true } }) : []
    const tMap = new Map((tenants as any[]).map(t => [t.id, t]))
    ok(res, { enrolments: enrolments.map((e: any) => ({
      tenant_id: e.tenant_id,
      tenant_name: tMap.get(e.tenant_id)?.name ?? null,
      account_number: tMap.get(e.tenant_id)?.account_number ?? null,
      plan: e.plan, start_date: e.start_date, status: e.status,
    })) })
  } catch (e: any) { err(res, 'FETCH_FAILED', e?.message ?? 'Could not load enrolments.', 500) }
})

// POST /admin/onboarding/dispatch-now — manually run today's due dispatch (force,
// bypasses the 10am-UK gate). Optional { tenant_id } scopes it to one client so a
// test only emails that tenant's admins. A safety net while crons are unavailable.
adminRouter.post('/onboarding/dispatch-now', async (req: Request, res: Response) => {
  const tenantId = req.body?.tenant_id ? String(req.body.tenant_id) : undefined
  try {
    const { dispatchDue } = await import('../services/onboarding/dispatch')
    const result = await dispatchDue({ force: true, tenantId })
    ok(res, result)
  } catch (e: any) { err(res, 'DISPATCH_FAILED', e?.message ?? 'Could not run the dispatch.', 500) }
})

// PATCH /admin/onboarding/emails/:id — edit subject / preview text. Shared
// emails are the same across plans, so the edit applies to every plan that has
// this email (keyed by template_key).
adminRouter.patch('/onboarding/emails/:id', async (req: Request, res: Response) => {
  const data: any = {}
  if (typeof req.body?.subject === 'string')   data.subject = req.body.subject.trim()
  if (typeof req.body?.preheader === 'string') data.preheader = req.body.preheader.trim()
  if (typeof req.body?.from_email === 'string') data.from_email = req.body.from_email.trim() || null
  if (!Object.keys(data).length) { err(res, 'NO_FIELDS', 'Nothing to update.', 400); return }
  const email = await (prisma as any).onboardingEmail.findUnique({ where: { id: req.params.id }, select: { template_key: true } })
  if (email?.template_key) {
    await (prisma as any).onboardingEmail.updateMany({ where: { template_key: email.template_key }, data })
  } else {
    await (prisma as any).onboardingEmail.update({ where: { id: req.params.id }, data })
  }
  ok(res, { id: req.params.id })
})

// POST /admin/onboarding/emails/reorder — set the order for a plan's OWN emails.
// Body: { plan, ids: [emailId,...] } in the desired order. Reordering an owned
// email flows up to every plan that also contains it (shared template_key +
// sort_order); day_index is then recomputed for all plans.
adminRouter.post('/onboarding/emails/reorder', async (req: Request, res: Response) => {
  const plan = String(req.body?.plan ?? '')
  const ids: string[] = Array.isArray(req.body?.ids) ? req.body.ids.map(String) : []
  if (!plan || ids.length === 0) { err(res, 'BAD_REQUEST', 'plan and ids are required.', 400); return }
  try {
    const { reorderOwned } = await import('../services/onboarding/ordering')
    await reorderOwned(plan as any, ids)
    ok(res, { reordered: ids.length })
  } catch (e: any) {
    err(res, 'BAD_REQUEST', e?.message ?? 'Could not reorder.', 400)
  }
})

// GET /admin/tenants/:id/onboarding — this client's drip + every send to it.
adminRouter.get('/tenants/:id/onboarding', async (req: Request, res: Response) => {
  const tenantId = req.params.id
  const [enrolment, sends] = await Promise.all([
    (prisma as any).onboardingEnrolment.findUnique({ where: { tenant_id: tenantId } }),
    (prisma as any).onboardingSend.findMany({ where: { tenant_id: tenantId }, orderBy: [{ day_index: 'asc' }, { recipient_email: 'asc' }] }),
  ])
  ok(res, {
    enrolment: enrolment ? { plan: enrolment.plan, start_date: enrolment.start_date, status: enrolment.status } : null,
    sends: (sends as any[]).map(s => ({
      day_index: s.day_index, email_id: s.email_id, subject: s.subject, recipient_email: s.recipient_email,
      status: s.status, sent_at: s.sent_at, delivered_at: s.delivered_at,
      first_opened_at: s.first_opened_at, open_count: s.open_count,
      first_clicked_at: s.first_clicked_at, click_count: s.click_count,
    })),
    summary: aggregateSends(sends as any[]),
  })
})

// ─── Feature requests (read inbox for the platform team) ──────────────────────

// GET /admin/feature-requests — every tenant-submitted request, newest first.
adminRouter.get('/feature-requests', async (_req: Request, res: Response) => {
  const requests = await (prisma as any).featureRequest.findMany({ orderBy: { created_at: 'desc' } })
  const counts: Record<string, number> = {}
  for (const r of requests as any[]) counts[r.status] = (counts[r.status] ?? 0) + 1
  ok(res, { requests, counts, total: (requests as any[]).length })
})

// PATCH /admin/feature-requests/:id — update the triage status.
adminRouter.patch('/feature-requests/:id', async (req: Request, res: Response) => {
  const status = String(req.body?.status ?? '')
  if (!['new', 'reviewing', 'planned', 'done', 'declined'].includes(status)) { err(res, 'INVALID', 'Invalid status.', 400); return }
  await (prisma as any).featureRequest.update({ where: { id: req.params.id }, data: { status } })
  ok(res, { updated: true })
})

// ─── CPD review (assessor notes across the standard annual library) ───────────

// GET /admin/cpd-reviews — every standard annual module with the assessor's note/status.
adminRouter.get('/cpd-reviews', async (_req: Request, res: Response) => {
  const [modules, reviews] = await Promise.all([
    (prisma as any).trainingModule.findMany({
      where:  { tenant_id: null, source: 'ai_generated', is_active: true, is_annual: true },
      select: { id: true, name: true, group_key: true, duration_minutes: true, pass_mark: true, approved: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).moduleReview.findMany(),
  ])
  const byModule = new Map((reviews as any[]).map(r => [r.module_id, r]))
  const counts: Record<string, number> = { not_reviewed: 0, reviewed: 0, needs_discussion: 0 }
  const out = (modules as any[]).map(m => {
    const r = byModule.get(m.id)
    const status = r?.status ?? 'not_reviewed'
    counts[status] = (counts[status] ?? 0) + 1
    return {
      id: m.id, name: m.name, group_key: m.group_key, duration_minutes: m.duration_minutes, pass_mark: m.pass_mark, approved: m.approved,
      status, notes: r?.notes ?? null, reviewer_name: r?.reviewer_name ?? null, updated_at: r?.updated_at ?? null,
    }
  })
  ok(res, { modules: out, counts, total: out.length })
})
