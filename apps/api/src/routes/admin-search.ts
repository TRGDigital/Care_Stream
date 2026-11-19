import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { getTenantId } from '../db/tenant-context'
import { tierOf } from '../lib/tiers'
import { residentsEnabled, tablesReady } from '../lib/residents'
import { nameFilter, kindOnly, policyKindLabel } from '../lib/admin-search-terms'

// Admin search, the records half: this account's own policies, staff, residents, knowledge entries, audits and training courses that match
// what was typed. The pages and guides half is static and runs in the browser. Names only plus a link target: no policy text,
// no chat content. Admin only, this account only.
export const adminSearchRouter = Router()
adminSearchRouter.use(requireAdmin)

const like = (q: string) => ({ contains: q, mode: 'insensitive' as const })

adminSearchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 60)
    if (q.length < 2) { ok(res, { policies: [], staff: [], knowledge: [], audits: [], training: [], residents: [], onboarding: [] }); return }
    const tenantId = getTenantId()
    const tier = await tierOf(tenantId)
    const full = tier === 'full'
    const db = prisma as any
    // Residents: only where the plan includes them (Professional and above) and the tables exist.
    const residentsOn = tier === 'full' && (await residentsEnabled(tenantId)) && (await tablesReady())
    // Searching just "audits" or "training" lists that kind (the whole list is the answer), not names containing the word.
    const kind = kindOnly(q)
    const by = (k: string, field: string) => (kind === k ? {} : nameFilter(field, q))
    const [policies, staff, knowledge, audits, training, residents, onboarding] = await Promise.all([
      db.policy.findMany({ where: { tenant_id: tenantId, status: 'active', ...by('policy', 'name') }, select: { id: true, name: true, document_category: true }, orderBy: { name: 'asc' }, take: kind === 'policy' ? 10 : 6 }),
      tier === 'policies_only' ? [] : db.user.findMany({ where: { tenant_id: tenantId, is_active: true, OR: [{ name: like(q) }, { email: like(q) }] }, select: { id: true, name: true, email: true, role: true, job_role: true }, orderBy: { name: 'asc' }, take: 6 }),
      full ? db.knowledgeEntry.findMany({ where: { tenant_id: tenantId, source_type: 'manual', question: like(q) }, select: { id: true, question: true }, take: 5 }) : [],
      tier === 'policies_only' || tier === 'training_only' ? [] : db.auditTemplate.findMany({ where: { is_active: true, ...by('audit', 'name'), OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: kind === 'audit' ? 12 : 6 }),
      tier === 'policies_only' ? [] : db.trainingModule.findMany({ where: { is_active: true, ...by('training', 'name'), OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true, is_annual: true, tier: true, cpd_accredited: true }, orderBy: [{ cpd_accredited: 'desc' }, { is_annual: 'desc' }, { name: 'asc' }], take: kind === 'training' ? 12 : 6 }),
      residentsOn ? db.resident.findMany({ where: { tenant_id: tenantId, status: 'living', OR: [{ first_name: like(q) }, { last_name: like(q) }, { preferred_name: like(q) }] }, select: { id: true, first_name: true, last_name: true, preferred_name: true, room: true }, orderBy: { last_name: 'asc' }, take: 6 }) : [],
      // Onboarding flows this account has (its own copies, not the shared templates): only on a full account.
      full ? db.onboardingFlow.findMany({ where: { tenant_id: tenantId, is_active: true, ...by('onboarding', 'name') }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 6 }) : [],
    ])
    ok(res, {
      policies: policies.map((p: any) => ({ id: p.id, title: p.name, sub: policyKindLabel(p.document_category) })),
      staff: staff.map((u: any) => ({ id: u.id, title: u.name, sub: [u.job_role, u.email].filter(Boolean).join(', ') })),
      knowledge: knowledge.map((k: any) => ({ id: k.id, title: k.question, sub: null })),
      audits: audits.map((a: any) => ({ id: a.id, title: a.name, sub: null })),
      residents: residents.map((r: any) => ({ id: r.id, title: `${r.preferred_name || r.first_name} ${r.last_name}`, sub: r.room ? `Room ${r.room}` : null })),
      training: training.map((m: any) => ({ id: m.id, title: m.name, sub: m.is_annual ? 'Annual training' : null, annual: !!m.is_annual, cpd: m.cpd_accredited === true })),
      onboarding: onboarding.map((o: any) => ({ id: o.id, title: o.name, sub: null })),
    })
  } catch (e: any) { err(res, 'SEARCH_FAILED', 'Search could not run.', 500) }
})

// The browser reports a search that found nothing (once per query, after the person stops typing).
adminSearchRouter.post('/miss', async (req: Request, res: Response) => {
  try {
    const q = String(req.body?.q ?? '').trim().slice(0, 80)
    if (q.length < 3) { ok(res, { logged: false }); return }
    const tenantId = getTenantId()
    await (prisma as any).$executeRawUnsafe('insert into admin_search_misses (tenant_id, user_id, tier, query) values ($1, $2, $3, $4)', tenantId, (req as any).user?.sub ?? null, await tierOf(tenantId), q)
    ok(res, { logged: true })
  } catch { ok(res, { logged: false }) }
})
