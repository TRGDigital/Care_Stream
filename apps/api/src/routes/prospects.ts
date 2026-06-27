// Platform admin — Prospects (outbound CQC-sourced lead universe).
// Mounted at /admin/prospects, protected by requirePlatformAdmin. Reads/writes
// the provider_leads table; the snapshot is populated by services/prospects/sync.
import { Router, Request, Response } from 'express'
import { z } from 'zod'
import { requirePlatformAdmin } from '../middleware/auth'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { draftMessage, SEGMENT_META } from '../services/prospects/scoring'
import { syncProspects } from '../services/prospects/sync'
import { generateAiDraft } from '../services/prospects/ai-draft'
import { enrichLead } from '../services/prospects/enrich'
import { enrichBatch } from '../services/prospects/enrich-batch'

export const prospectsRouter = Router()
prospectsRouter.use(requirePlatformAdmin)

const SEGMENTS = ['rescue', 'protect', 'maintain', 'defend', 'unrated'] as const
const STATUSES = ['new', 'queued', 'contacted', 'engaged', 'qualified', 'won', 'lost', 'suppressed'] as const

const listQuery = z.object({
  segment: z.enum(SEGMENTS).optional(),
  status: z.enum(STATUSES).optional(),
  setting: z.string().min(1).optional(),
  region: z.string().min(1).optional(),
  rating: z.string().min(1).optional(),
  q: z.string().min(1).optional(),
  sort: z.enum(['score', 'inspected', 'name']).default('score'),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(200).default(50),
})
type ListFilters = z.infer<typeof listQuery>

function buildWhere(f: ListFilters, includeSegment: boolean): Record<string, unknown> {
  const where: Record<string, unknown> = {}
  if (includeSegment && f.segment) where.segment = f.segment
  if (f.status) where.status = f.status
  if (f.setting) where.setting = f.setting
  if (f.region) where.region = f.region
  if (f.rating) where.cqc_rating = f.rating
  if (f.q) where.name = { contains: f.q, mode: 'insensitive' }
  return where
}

// ─── GET /admin/prospects ─────────────────────────────────────────────────────
// Filtered, paginated, sorted list + per-segment counts (honouring the other
// filters, so the segment tab badges reflect the current view).
prospectsRouter.get('/', async (req: Request, res: Response) => {
  const parsed = listQuery.safeParse(req.query)
  if (!parsed.success) { err(res, 'BAD_REQUEST', parsed.error.message); return }
  const f = parsed.data

  const where = buildWhere(f, true)
  const baseWhere = buildWhere(f, false)

  const orderBy =
    f.sort === 'name'
      ? [{ name: 'asc' as const }]
      : f.sort === 'inspected'
        ? [{ cqc_inspection_date: { sort: 'desc' as const, nulls: 'last' as const } }, { score: 'desc' as const }]
        : [{ score: 'desc' as const }, { cqc_inspection_date: { sort: 'desc' as const, nulls: 'last' as const } }]

  const [rows, total, counts] = await Promise.all([
    (prisma as any).providerLead.findMany({ where, orderBy, skip: (f.page - 1) * f.pageSize, take: f.pageSize }),
    (prisma as any).providerLead.count({ where }),
    (prisma as any).providerLead.groupBy({ by: ['segment'], where: baseWhere, _count: { _all: true } }),
  ])

  const segmentCounts: Record<string, number> = {}
  for (const c of counts as Array<{ segment: string; _count: { _all: number } }>) {
    segmentCounts[c.segment] = c._count._all
  }

  ok(res, { rows, total, page: f.page, pageSize: f.pageSize, segmentCounts })
})

// ─── GET /admin/prospects/filters ─────────────────────────────────────────────
// Distinct regions/settings + the segment + status vocab, for the filter UI.
prospectsRouter.get('/filters', async (_req: Request, res: Response) => {
  const [regions, settings] = await Promise.all([
    (prisma as any).providerLead.findMany({ where: { region: { not: null } }, distinct: ['region'], select: { region: true }, orderBy: { region: 'asc' } }),
    (prisma as any).providerLead.findMany({ where: { setting: { not: null } }, distinct: ['setting'], select: { setting: true }, orderBy: { setting: 'asc' } }),
  ])
  ok(res, {
    regions: (regions as Array<{ region: string }>).map((r) => r.region),
    settings: (settings as Array<{ setting: string }>).map((s) => s.setting),
    statuses: STATUSES,
    segments: SEGMENTS.map((s) => ({ key: s, ...SEGMENT_META[s] })),
  })
})

// ─── POST /admin/prospects/enrich-bulk ────────────────────────────────────────
// Enrich the next batch of website-having, not-yet-enriched leads (hottest
// first). Call repeatedly until `remaining` hits 0. Bounded per call so it stays
// well under the function time limit; the UI loops it.
const bulkBody = z
  .object({
    limit: z.coerce.number().int().min(1).max(100).default(100),
    segment: z.enum(SEGMENTS).optional(),
    concurrency: z.coerce.number().int().min(1).max(10).default(8),
  })
  .strict()

prospectsRouter.post('/enrich-bulk', async (req: Request, res: Response) => {
  const parsed = bulkBody.safeParse(req.body ?? {})
  if (!parsed.success) { err(res, 'BAD_REQUEST', parsed.error.message); return }
  try {
    // Manual bulk action — allow the paid Hunter fallback on scrape misses.
    const result = await enrichBatch({ ...parsed.data, useFinder: true })
    ok(res, result)
  } catch (e) {
    err(res, 'ENRICH_FAILED', e instanceof Error ? e.message : String(e), 500)
  }
})

// ─── POST /admin/prospects/sync ───────────────────────────────────────────────
// Refresh the snapshot from CareAssura. Idempotent; preserves nurture state.
prospectsRouter.post('/sync', async (_req: Request, res: Response) => {
  try {
    const result = await syncProspects()
    ok(res, result)
  } catch (e) {
    err(res, 'SYNC_FAILED', e instanceof Error ? e.message : String(e), 500)
  }
})

// ─── GET /admin/prospects/:id ─────────────────────────────────────────────────
// Single lead + a freshly drafted, tier-tailored outreach message.
prospectsRouter.get('/:id', async (req: Request, res: Response) => {
  const lead = await (prisma as any).providerLead.findUnique({ where: { id: String(req.params.id) } })
  if (!lead) { err(res, 'NOT_FOUND', 'Lead not found', 404); return }
  const draft = draftMessage({
    name: lead.name,
    segment: lead.segment,
    cqc_rating: lead.cqc_rating,
    failingDomains: lead.failing_domains ?? [],
    angleLabel: lead.lead_angle_label ?? '',
    angleKey: lead.lead_angle_key ?? '',
  })
  ok(res, { lead, draft })
})

// ─── PATCH /admin/prospects/:id ───────────────────────────────────────────────
// Update nurture state. Moving to "contacted" stamps last_contacted_at.
const patchBody = z
  .object({
    status: z.enum(STATUSES).optional(),
    owner: z.string().max(200).nullable().optional(),
    notes: z.string().max(5000).nullable().optional(),
    next_action_at: z.string().datetime().nullable().optional(),
  })
  .strict()

prospectsRouter.patch('/:id', async (req: Request, res: Response) => {
  const parsed = patchBody.safeParse(req.body)
  if (!parsed.success) { err(res, 'BAD_REQUEST', parsed.error.message); return }

  const data: Record<string, unknown> = {}
  if (parsed.data.status !== undefined) data.status = parsed.data.status
  if (parsed.data.owner !== undefined) data.owner = parsed.data.owner
  if (parsed.data.notes !== undefined) data.notes = parsed.data.notes
  if (parsed.data.next_action_at !== undefined) {
    data.next_action_at = parsed.data.next_action_at ? new Date(parsed.data.next_action_at) : null
  }
  if (parsed.data.status === 'contacted') data.last_contacted_at = new Date()

  const lead = await (prisma as any).providerLead
    .update({ where: { id: String(req.params.id) }, data })
    .catch(() => null)
  if (!lead) { err(res, 'NOT_FOUND', 'Lead not found', 404); return }
  ok(res, { lead })
})

// ─── POST /admin/prospects/:id/draft-ai ───────────────────────────────────────
// Generate (and store) an AI-sharpened outreach email — built from the CQC
// signals, opportunistically using the provider's CQC report page.
prospectsRouter.post('/:id/draft-ai', async (req: Request, res: Response) => {
  const lead = await (prisma as any).providerLead.findUnique({ where: { id: String(req.params.id) } })
  if (!lead) { err(res, 'NOT_FOUND', 'Lead not found', 404); return }
  try {
    const draft = await generateAiDraft({
      name: lead.name,
      setting: lead.setting,
      town: lead.town,
      county: lead.county,
      segment: lead.segment,
      cqc_rating: lead.cqc_rating,
      failing_domains: lead.failing_domains ?? [],
      lead_angle_label: lead.lead_angle_label,
      cqc_report_url: lead.cqc_report_url,
      contact_name: lead.contact_name,
    })
    await (prisma as any).providerLead.update({
      where: { id: lead.id },
      data: { ai_draft_subject: draft.subject, ai_draft_body: draft.body, ai_draft_sources: draft.sources, ai_drafted_at: new Date() },
    })
    ok(res, draft)
  } catch (e) {
    err(res, 'DRAFT_FAILED', e instanceof Error ? e.message : String(e), 500)
  }
})

// ─── POST /admin/prospects/:id/enrich ─────────────────────────────────────────
// Find a decision-maker: scrape the provider website for a contact email, and
// look up the active director via Companies House. Stores + returns the result.
prospectsRouter.post('/:id/enrich', async (req: Request, res: Response) => {
  const lead = await (prisma as any).providerLead.findUnique({ where: { id: String(req.params.id) } })
  if (!lead) { err(res, 'NOT_FOUND', 'Lead not found', 404); return }
  try {
    const result = await enrichLead({ name: lead.name, website: lead.website }, { useFinder: true })
    const updated = await (prisma as any).providerLead.update({
      where: { id: lead.id },
      data: {
        contact_name: result.contactName,
        contact_role: result.contactRole,
        enriched_email: result.email,
        enrichment_source: result.source,
        company_number: result.companyNumber,
        enriched_at: new Date(),
      },
    })
    ok(res, { result, lead: updated })
  } catch (e) {
    err(res, 'ENRICH_FAILED', e instanceof Error ? e.message : String(e), 500)
  }
})
