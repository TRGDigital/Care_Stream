import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { callClaude } from '../services/ai/claude'
import { downloadExtractedText } from '../services/storage/s3'

// Platform-owner management of anonymised reference policies (Policy Seeds).
export const policySeedsRouter = Router()
policySeedsRouter.use(requirePlatformAdmin)

const HAIKU = 'claude-haiku-4-5-20251001'
const AI_INPUT_CAP = 12_000   // chars — above this we keep deterministic-only to avoid truncation

// ─── GET / — list seeds (metadata only) ───────────────────────────────────────
policySeedsRouter.get('/', async (_req: Request, res: Response) => {
  const seeds = await (prisma as any).policySeed.findMany({
    orderBy: [{ section: 'asc' }, { title: 'asc' }],
    select:  { id: true, section: true, title: true, document_category: true, reviewed: true, source_policy_id: true, updated_at: true },
  })
  ok(res, { seeds })
})

// ─── GET /:id — full seed (with content) ──────────────────────────────────────
policySeedsRouter.get('/:id', async (req: Request, res: Response) => {
  const seed = await (prisma as any).policySeed.findUnique({ where: { id: String(req.params.id) } })
  if (!seed) return err(res, 'NOT_FOUND', 'Seed not found', 404)
  ok(res, { seed })
})

// ─── PATCH /:id — edit content / section / title / reviewed ────────────────────
policySeedsRouter.patch('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).policySeed.findUnique({ where: { id } })
  if (!existing) return err(res, 'NOT_FOUND', 'Seed not found', 404)
  const { section, title, content, document_category, reviewed } = req.body ?? {}
  const data: Record<string, any> = { updated_at: new Date() }
  if (section !== undefined)           data.section = section
  if (title !== undefined)             data.title = String(title)
  if (content !== undefined)           data.content = String(content)
  if (document_category !== undefined) data.document_category = document_category
  if (reviewed !== undefined)          data.reviewed = !!reviewed
  const seed = await (prisma as any).policySeed.update({ where: { id }, data })
  ok(res, { seed })
})

// ─── DELETE /:id ───────────────────────────────────────────────────────────────
policySeedsRouter.delete('/:id', async (req: Request, res: Response) => {
  const id = String(req.params.id)
  const existing = await (prisma as any).policySeed.findUnique({ where: { id } })
  if (!existing) return err(res, 'NOT_FOUND', 'Seed not found', 404)
  await (prisma as any).policySeed.delete({ where: { id } })
  ok(res, { deleted: true })
})

// ─── POST /import/:tenantId — batched import + anonymise from a tenant ──────────
// Processes up to `limit` not-yet-imported active policies per call so the console
// can drive a progress loop without hitting serverless time limits.
policySeedsRouter.post('/import/:tenantId', async (req: Request, res: Response) => {
  const tenantId = String(req.params.tenantId)
  const limit = Math.min(Math.max(parseInt(String(req.query.limit ?? '4'), 10) || 4, 1), 8)

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { id: true, name: true, slug: true, email_domain: true, branding_signoff: true },
  })
  if (!tenant) return err(res, 'NOT_FOUND', 'Tenant not found', 404)

  // All active policies for the tenant, and which we've already imported.
  const [policies, done, users] = await Promise.all([
    (prisma as any).policy.findMany({
      where:  { tenant_id: tenantId, status: 'active' },
      select: { id: true, name: true, section: true, document_category: true },
      orderBy: { created_at: 'asc' },
    }),
    (prisma as any).policySeed.findMany({ where: { source_tenant_id: tenantId }, select: { source_policy_id: true } }),
    (prisma as any).user.findMany({ where: { tenant_id: tenantId }, select: { name: true, email: true, phone_number: true } }),
  ])

  const importedIds = new Set((done as any[]).map(d => d.source_policy_id))
  const pending = (policies as any[]).filter(p => !importedIds.has(p.id))
  const batch = pending.slice(0, limit)

  const anonymise = buildDeterministicAnonymiser(tenant, users as any[])
  const aiPrompt = await getAnonymisePrompt()

  let imported = 0
  for (const p of batch) {
    try {
      const raw = await downloadExtractedText(tenantId, p.id).catch(() => '')
      if (!raw || !raw.trim()) continue

      let content = anonymise(raw)
      if (content.length <= AI_INPUT_CAP) {
        try {
          const cleaned = await callClaude(aiPrompt, content, { model: HAIKU, maxTokens: 8000, temperature: 0 })
          if (cleaned && cleaned.trim().length > 50) content = cleaned.trim()
        } catch { /* keep deterministic-only on AI failure */ }
      }

      await (prisma as any).policySeed.create({
        data: {
          section:           p.section ?? null,
          title:             p.name,
          content,
          document_category: p.document_category ?? 'internal_policy',
          source_tenant_id:  tenantId,
          source_policy_id:  p.id,
          reviewed:          false,
        },
      })
      imported++
    } catch { /* skip this policy, continue the batch */ }
  }

  const remaining = pending.length - imported
  ok(res, { imported, remaining, total: (policies as any[]).length, already: importedIds.size })
})

// ─── Anonymisation ─────────────────────────────────────────────────────────────

function buildDeterministicAnonymiser(
  tenant: { name: string; slug: string; email_domain: string; branding_signoff: string },
  users: Array<{ name: string | null; email: string | null; phone_number: string | null }>,
): (text: string) => string {
  const rules: Array<{ re: RegExp; to: string }> = []
  const add = (value: string | null | undefined, to: string) => {
    const v = (value ?? '').trim()
    if (v.length < 3) return
    rules.push({ re: new RegExp(escapeRe(v), 'gi'), to })
  }
  add(tenant.name, 'the Home')
  add(tenant.slug, 'the-home')
  add(tenant.email_domain, 'example.com')
  add(tenant.branding_signoff, 'The Care Team')
  for (const u of users) {
    add(u.name, '[Name]')
    add(u.email, '[email]')
    add(u.phone_number, '[phone]')
  }
  // Generic contact patterns
  rules.push({ re: /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g, to: '[email]' })
  rules.push({ re: /\b(?:\+44\s?|0)\d[\d\s-]{8,}\b/g, to: '[phone]' })

  return (text: string) => rules.reduce((acc, r) => acc.replace(r.re, r.to), text)
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

export const DEFAULT_POLICY_ANONYMISE_PROMPT = `You anonymise UK care and nursing home policies so they can be used as generic templates.

Remove or replace EVERY identifying detail with a neutral placeholder:
- the home's or company's name -> "the Home"
- any address, postcode, town or region -> "[address]"
- telephone, fax, email or website -> "[contact details]"
- named individuals (managers, staff, directors) -> their role, e.g. "the Registered Manager", or "[Name]"
- company, charity or CQC registration numbers -> "[registration number]"

Preserve ALL policy content, meaning, structure and headings exactly as written — only the identifying details change. Do not summarise, shorten or add commentary.

Output ONLY the anonymised policy text.`

async function getAnonymisePrompt(): Promise<string> {
  try {
    const p = await (prisma as any).aiPrompt.findUnique({ where: { usage: 'policy_anonymisation' } })
    if (p?.content) return p.content
  } catch { /* fall through */ }
  return DEFAULT_POLICY_ANONYMISE_PROMPT
}
