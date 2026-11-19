import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { getTenantId } from '../db/tenant-context'
import { tierOf } from '../lib/tiers'
import { residentsEnabled, tablesReady } from '../lib/residents'
import { parseQuery, kindOnly, type Parsed } from '../lib/admin-search-query'

// Admin search, the records half: this account's own policies, staff, residents, knowledge entries, audits and training courses that match
// what was typed. The pages and guides half is static and runs in the browser. Names only plus a link target: no policy text,
// no chat content. Admin only, this account only.
export const adminSearchRouter = Router()
adminSearchRouter.use(requireAdmin)

const like = (q: string) => ({ contains: q, mode: 'insensitive' as const })
const kindLabel = (c: string | null | undefined) => c === 'staff_handbook' ? 'Staff handbook' : c === 'cqc_report' ? 'CQC report' : null

// Every need in the search must be met by the name: one of its phrases is in it (abbreviations expand, so "gdpr" also finds
// "Data Protection"). Short phrases (dpa, ico) only count at the start of a word so they do not match inside other words.
const phraseWhere = (field: string, p: string) => p.length <= 3
  ? { OR: [{ [field]: { startsWith: p, mode: 'insensitive' } }, { [field]: { contains: ' ' + p, mode: 'insensitive' } }] }
  : { [field]: { contains: p, mode: 'insensitive' } }
const subjectWhere = (field: string, parsed: Parsed) => ({ AND: parsed.subject.map(s => ({ OR: s.phrases.map(p => phraseWhere(field, p)) })) })

adminSearchRouter.get('/', async (req: Request, res: Response) => {
  try {
    const q = String(req.query.q ?? '').trim().slice(0, 60)
    if (q.length < 2) { ok(res, { topics: [], policies: [], staff: [], knowledge: [], audits: [], training: [], residents: [], onboarding: [] }); return }
    const tenantId = getTenantId()
    const tier = await tierOf(tenantId)
    const full = tier === 'full'
    const db = prisma as any
    // Residents: only where the plan includes them (Professional and above) and the tables exist.
    const residentsOn = tier === 'full' && (await residentsEnabled(tenantId)) && (await tablesReady())
    // Searching just "audits" or "training" lists that kind (the whole list is the answer), not names containing the word.
    const parsed = parseQuery(q)
    const kind = kindOnly(q)
    // null = do not search this kind at all. A search that names only a kind (audits) lists that kind; one with a subject
    // (gdpr, len) filters by it; one with neither a subject nor that kind (just "staff") lists nothing, so it never dumps a whole table.
    const by = (k: string, field: string): Record<string, unknown> | null =>
      parsed.subject.length ? subjectWhere(field, parsed) : kind === k ? {} : null
    // People: only words the person typed as they are (a name), never an abbreviation expansion.
    const personWhere = parsed.subject.length > 0 && parsed.subject.every(s => s.plain)
      ? { AND: parsed.subject.map(s => ({ OR: [{ name: like(s.plain!) }, { email: like(s.plain!) }] })) } : null
    const residentWhere = parsed.subject.length > 0 && parsed.subject.every(s => s.plain)
      ? { AND: parsed.subject.map(s => ({ OR: [{ first_name: like(s.plain!) }, { last_name: like(s.plain!) }, { preferred_name: like(s.plain!) }] })) } : null
    const none: Promise<any[]> = Promise.resolve([])
    const pW = by('policy', 'name'), aW = by('audit', 'name'), tW = by('training', 'name'), oW = by('onboarding', 'name'), kW = parsed.subject.length ? subjectWhere('question', parsed) : null
    const [policies, staff, knowledge, audits, training, residents, onboarding] = await Promise.all([
      pW ? db.policy.findMany({ where: { tenant_id: tenantId, status: 'active', ...pW }, select: { id: true, name: true, document_category: true }, orderBy: { name: 'asc' }, take: kind === 'policy' ? 10 : 6 }) : none,
      tier === 'policies_only' || !personWhere ? none : db.user.findMany({ where: { tenant_id: tenantId, is_active: true, ...personWhere }, select: { id: true, name: true, email: true, role: true, job_role: true }, orderBy: { name: 'asc' }, take: 6 }),
      full && kW ? db.knowledgeEntry.findMany({ where: { tenant_id: tenantId, source_type: 'manual', ...kW }, select: { id: true, question: true }, take: 5 }) : none,
      tier === 'policies_only' || tier === 'training_only' || !aW ? none : db.auditTemplate.findMany({ where: { is_active: true, ...aW, OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: kind === 'audit' ? 12 : 6 }),
      tier === 'policies_only' || !tW ? none : db.trainingModule.findMany({ where: { is_active: true, ...tW, OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true, is_annual: true, tier: true, cpd_accredited: true }, orderBy: [{ cpd_accredited: 'desc' }, { is_annual: 'desc' }, { name: 'asc' }], take: kind === 'training' ? 12 : 6 }),
      residentsOn && residentWhere ? db.resident.findMany({ where: { tenant_id: tenantId, status: 'living', ...residentWhere }, select: { id: true, first_name: true, last_name: true, preferred_name: true, room: true }, orderBy: { last_name: 'asc' }, take: 6 }) : none,
      // Onboarding flows this account has (its own copies, not the shared templates): only on a full account.
      full && oW ? db.onboardingFlow.findMany({ where: { tenant_id: tenantId, is_active: true, ...oW }, select: { id: true, name: true }, orderBy: { name: 'asc' }, take: 6 }) : none,
    ])
    ok(res, {
      topics: parsed.topics,
      policies: policies.map((p: any) => ({ id: p.id, title: p.name, sub: kindLabel(p.document_category) })),
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
