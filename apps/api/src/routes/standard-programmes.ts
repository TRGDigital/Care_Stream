// Platform Console — standard training programmes (diplomas / pathways). A programme
// groups published standard modules into an ordered container with one completion
// rule, one synoptic (cross-module) assessment and one certificate.
//
// Published programmes (tenant_id = null, approved = true) are available to every
// tenant to assign, exactly like standard modules.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'
import { runProgrammeQa } from '../services/training/programmeQa'
import { programmeDurationMinutes } from '../services/training/programme'
import { callClaude } from '../services/ai/claude'
import { STANDARDS_CATALOGUE, normaliseStandards } from '../data/training-standards'
import { TOPIC_GROUP_LABELS } from '../data/training-topics'
import { CARE_SETTINGS, SETTING_LABELS } from '../lib/care-setting'
import { illustrationUrl } from '../services/training/moduleImage'
import { DIPLOMA_TEMPLATES } from '../data/programme-templates'

export const standardProgrammesRouter = Router()
standardProgrammesRouter.use(requirePlatformAdmin)

const KINDS = ['diploma', 'pathway', 'award']

function kebab(s: string): string {
  return s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60)
}

const UNIT_SELECT = {
  id: true, name: true, duration_minutes: true, requires_practical: true, cpd_accredited: true,
  pass_mark: true, approved: true, attested_by_name: true, group_key: true, topic_id: true,
  illustration_key: true, learning_content: true, questions: true,
}

// Load a programme with its units resolved to modules, in order.
async function loadProgramme(id: string) {
  const programme = await (prisma as any).trainingProgramme.findFirst({
    where:   { id, tenant_id: null },
    include: { units: { orderBy: { order: 'asc' } } },
  })
  if (!programme) return null
  const moduleIds = programme.units.map((u: any) => u.module_id)
  const modules = moduleIds.length
    ? await (prisma as any).trainingModule.findMany({ where: { id: { in: moduleIds } }, select: UNIT_SELECT })
    : []
  const byId = new Map<string, any>((modules as any[]).map(m => [m.id, m]))
  // Same order as programme.units so QA can pair unit flags with modules by index.
  const unitModules = programme.units.map((u: any) => byId.get(u.module_id)).filter(Boolean)
  return { programme, unitModules }
}

// ─── Catalogue ────────────────────────────────────────────────────────────────

// GET /admin/standard-programmes — every platform programme + summary
standardProgrammesRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const programmes = await (prisma as any).trainingProgramme.findMany({
      where:   { tenant_id: null },
      orderBy: [{ sort_order: 'asc' }, { created_at: 'asc' }],
      include: { units: { orderBy: { order: 'asc' } } },
    })
    const allModuleIds = [...new Set((programmes as any[]).flatMap(p => p.units.map((u: any) => u.module_id)))]
    const modules = allModuleIds.length
      ? await (prisma as any).trainingModule.findMany({ where: { id: { in: allModuleIds } }, select: UNIT_SELECT })
      : []
    const byId = new Map<string, any>((modules as any[]).map(m => [m.id, m]))

    // Live enrolment counts so the console shows whether anyone is on each programme.
    const counts = await (prisma as any).trainingProgrammeEnrollment.groupBy({
      by: ['programme_id', 'status'], _count: { _all: true },
    }).catch(() => [])
    const enrolBy = new Map<string, { total: number; complete: number }>()
    for (const c of (counts as any[])) {
      const cur = enrolBy.get(c.programme_id) ?? { total: 0, complete: 0 }
      cur.total += c._count._all
      if (c.status === 'complete') cur.complete += c._count._all
      enrolBy.set(c.programme_id, cur)
    }

    // Tenant list so the pilot gate can be set by name rather than by pasting UUIDs.
    const tenants = await (prisma as any).tenant.findMany({
      orderBy: { account_number: 'asc' },
      select:  { id: true, name: true, account_number: true },
    }).catch(() => [])

    ok(res, {
      groups:   TOPIC_GROUP_LABELS,
      settings: CARE_SETTINGS.map(s => ({ key: s, label: SETTING_LABELS[s] })),
      tenants,
      templates: DIPLOMA_TEMPLATES.map(t => ({
        slug: t.slug, name: t.name, kind: t.kind, care_setting: t.care_setting ?? null,
        unit_count: t.units.length,
        required_count: t.units.filter(u => !u.is_optional).length,
      })),
      programmes: (programmes as any[]).map(p => {
        const unitModules = p.units.map((u: any) => byId.get(u.module_id)).filter(Boolean)
        const qa = runProgrammeQa(p, unitModules)
        const synoptic = Array.isArray(p.synoptic_questions) ? p.synoptic_questions.length : 0
        const minutes = programmeDurationMinutes(unitModules, synoptic)
        return {
          id: p.id, slug: p.slug, name: p.name, description: p.description, kind: p.kind,
          group_key: p.group_key, care_setting: p.care_setting, is_active: p.is_active,
          approved: p.approved, approved_at: p.approved_at,
          attested_by_name: p.attested_by_name, attested_by_role: p.attested_by_role, attested_at: p.attested_at,
          cpd_accredited: p.cpd_accredited, independently_reviewed: p.independently_reviewed,
          sequential: p.sequential, require_practical: p.require_practical, require_reflection: p.require_reflection,
          pilot_tenant_ids: p.pilot_tenant_ids ?? [],
          synoptic_count: synoptic, synoptic_pass_mark: p.synoptic_pass_mark,
          renewal_months: p.renewal_months, price_pence: p.price_pence,
          unit_count: p.units.length,
          units_missing: p.units.length - unitModules.length,
          duration_minutes: minutes,
          cpd_hours: minutes ? Math.round((minutes / 60) * 10) / 10 : null,
          outcomes_count: Array.isArray(p.outcomes) ? p.outcomes.length : 0,
          standards_count: Array.isArray(p.standards) ? p.standards.length : 0,
          // CPD accreditation progress: how many units are accredited. Publishing does
          // NOT need this — it only governs whether the certificate can carry CPD branding.
          cpd_units: unitModules.filter((m: any) => m?.cpd_accredited).length,
          cpd_ready: unitModules.length > 0 && unitModules.every((m: any) => m?.cpd_accredited),
          illustration_url: illustrationUrl(p.illustration_key),
          qa_hard_fails: qa.hard_fails, qa_warnings: qa.warnings,
          enrolled: enrolBy.get(p.id)?.total ?? 0,
          completed: enrolBy.get(p.id)?.complete ?? 0,
        }
      }),
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// GET /admin/standard-programmes/available-modules — published standard modules that
// can be used as units, for the unit picker.
standardProgrammesRouter.get('/available-modules', async (_req: Request, res: Response) => {
  const modules = await (prisma as any).trainingModule.findMany({
    where:   { tenant_id: null, source: 'ai_generated', approved: true, is_active: true },
    orderBy: [{ group_key: 'asc' }, { name: 'asc' }],
    select:  { id: true, name: true, group_key: true, duration_minutes: true, requires_practical: true, cpd_accredited: true, attested_by_name: true },
  })
  ok(res, { modules, groups: TOPIC_GROUP_LABELS })
})

// GET /admin/standard-programmes/:id/full — programme + resolved units + QA
standardProgrammesRouter.get('/:id/full', async (req: Request, res: Response) => {
  const loaded = await loadProgramme(String(req.params.id))
  if (!loaded) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }
  const { programme, unitModules } = loaded
  const synoptic = Array.isArray(programme.synoptic_questions) ? programme.synoptic_questions.length : 0
  const minutes = programmeDurationMinutes(unitModules, synoptic)

  ok(res, {
    programme: {
      ...programme,
      illustration_url: illustrationUrl(programme.illustration_key),
      duration_minutes: minutes,
      cpd_hours: minutes ? Math.round((minutes / 60) * 10) / 10 : null,
      units: programme.units.map((u: any) => {
        const m = unitModules.find((x: any) => x?.id === u.module_id)
        return {
          id: u.id, module_id: u.module_id, order: u.order, is_optional: u.is_optional,
          name: m?.name ?? '(module no longer available)',
          duration_minutes: m?.duration_minutes ?? null,
          requires_practical: !!m?.requires_practical,
          cpd_accredited: !!m?.cpd_accredited,
          approved: !!m?.approved,
          attested_by_name: m?.attested_by_name ?? null,
          group_key: m?.group_key ?? null,
          section_count: Array.isArray(m?.learning_content?.sections) ? m.learning_content.sections.length : 0,
          question_count: Array.isArray(m?.questions) ? m.questions.length : 0,
        }
      }),
    },
    qa: runProgrammeQa(programme, unitModules),
    standards_catalogue: STANDARDS_CATALOGUE,
    groups: TOPIC_GROUP_LABELS,
    settings: CARE_SETTINGS.map(s => ({ key: s, label: SETTING_LABELS[s] })),
  })
})

// POST /admin/standard-programmes — create an empty programme
standardProgrammesRouter.post('/', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const name = String(b.name ?? '').trim()
  if (!name) { err(res, 'VALIDATION_ERROR', 'A name is required'); return }
  const kind = KINDS.includes(String(b.kind)) ? String(b.kind) : 'diploma'
  try {
    const programme = await (prisma as any).trainingProgramme.create({
      data: {
        tenant_id: null,
        slug: `std-${kebab(name)}`,
        name: name.slice(0, 160),
        description: String(b.description ?? '').slice(0, 1000) || name,
        kind,
        group_key: b.group_key ? String(b.group_key) : null,
        care_setting: b.care_setting ? String(b.care_setting) : null,
        approved: false,
      },
    })
    ok(res, { programme })
  } catch (e: any) {
    if (e?.code === 'P2002') { err(res, 'DUPLICATE', 'A programme with that name already exists.', 409); return }
    err(res, 'CREATE_FAILED', e.message, 500)
  }
})

// PATCH /admin/standard-programmes/:id
standardProgrammesRouter.patch('/:id', async (req: Request, res: Response) => {
  const b = req.body ?? {}
  const programme = await (prisma as any).trainingProgramme.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!programme) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }

  const data: any = {}
  if (typeof b.name === 'string' && b.name.trim()) data.name = b.name.trim().slice(0, 160)
  if (typeof b.description === 'string') data.description = b.description.slice(0, 1000)
  if (KINDS.includes(String(b.kind))) data.kind = String(b.kind)
  if (b.group_key !== undefined) data.group_key = b.group_key ? String(b.group_key) : null
  if (b.care_setting !== undefined) data.care_setting = b.care_setting ? String(b.care_setting) : null
  if (Array.isArray(b.job_roles)) data.job_roles = b.job_roles.map((r: any) => String(r)).slice(0, 30)
  // Pilot gate — empty means every tenant sees it once published.
  if (Array.isArray(b.pilot_tenant_ids)) data.pilot_tenant_ids = b.pilot_tenant_ids.map((t: any) => String(t).trim()).filter(Boolean).slice(0, 50)
  if (Array.isArray(b.outcomes)) data.outcomes = b.outcomes.map((o: any) => String(o)).filter(Boolean).slice(0, 20)
  if (b.standards !== undefined) data.standards = normaliseStandards(b.standards)
  if (Array.isArray(b.synoptic_questions)) data.synoptic_questions = b.synoptic_questions
  if (typeof b.synoptic_pass_mark === 'number') data.synoptic_pass_mark = Math.max(0, Math.min(100, Math.round(b.synoptic_pass_mark)))
  if (typeof b.sequential === 'boolean') data.sequential = b.sequential
  if (typeof b.require_practical === 'boolean') data.require_practical = b.require_practical
  if (typeof b.require_reflection === 'boolean') data.require_reflection = b.require_reflection
  if (typeof b.cpd_accredited === 'boolean') data.cpd_accredited = b.cpd_accredited
  if (typeof b.is_active === 'boolean') data.is_active = b.is_active
  if (typeof b.sort_order === 'number') data.sort_order = Math.round(b.sort_order)
  if (b.renewal_months !== undefined) data.renewal_months = b.renewal_months == null ? null : Math.max(1, Math.min(120, Math.round(Number(b.renewal_months) || 0)))
  if (b.price_pence !== undefined) data.price_pence = b.price_pence == null ? null : Math.max(0, Math.round(Number(b.price_pence) || 0))

  // Any content change un-publishes: a published programme is an attested artefact.
  const CONTENT_KEYS = ['name', 'description', 'kind', 'outcomes', 'synoptic_questions', 'synoptic_pass_mark', 'require_practical', 'require_reflection', 'sequential']
  if (programme.approved && CONTENT_KEYS.some(k => k in data)) {
    Object.assign(data, { approved: false, approved_at: null, approved_by: null, attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false })
  }

  const updated = await (prisma as any).trainingProgramme.update({ where: { id: programme.id }, data })
  ok(res, { programme: updated })
})

// PUT /admin/standard-programmes/:id/units — set the ordered unit list.
// Body: { units: [{ module_id, is_optional? }] } — order is the array order.
standardProgrammesRouter.put('/:id/units', async (req: Request, res: Response) => {
  const programme = await (prisma as any).trainingProgramme.findFirst({ where: { id: req.params.id, tenant_id: null } })
  if (!programme) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }
  const incoming = Array.isArray(req.body?.units) ? req.body.units : null
  if (!incoming) { err(res, 'VALIDATION_ERROR', 'units array is required'); return }

  // Only published standard modules may be units, and each may appear once.
  const wantedIds = [...new Set(incoming.map((u: any) => String(u?.module_id ?? '')).filter(Boolean))]
  const valid = wantedIds.length
    ? await (prisma as any).trainingModule.findMany({
        where:  { id: { in: wantedIds }, tenant_id: null, source: 'ai_generated', approved: true, is_active: true },
        select: { id: true },
      })
    : []
  const validIds = new Set((valid as any[]).map(m => m.id))
  const rejected = wantedIds.filter(id => !validIds.has(id))
  if (rejected.length) { err(res, 'INVALID_UNITS', `${rejected.length} selected module(s) are not published standard modules.`, 422); return }

  const rows = incoming
    .filter((u: any) => validIds.has(String(u?.module_id)))
    .map((u: any, i: number) => ({ programme_id: programme.id, module_id: String(u.module_id), order: i, is_optional: !!u.is_optional }))

  await (prisma as any).$transaction([
    (prisma as any).trainingProgrammeUnit.deleteMany({ where: { programme_id: programme.id } }),
    ...(rows.length ? [(prisma as any).trainingProgrammeUnit.createMany({ data: rows })] : []),
  ])

  // Cache the CPD duration and un-publish (the taught content just changed).
  const modules = rows.length
    ? await (prisma as any).trainingModule.findMany({ where: { id: { in: rows.map((r: any) => r.module_id) } }, select: { duration_minutes: true } })
    : []
  const synoptic = Array.isArray(programme.synoptic_questions) ? programme.synoptic_questions.length : 0
  await (prisma as any).trainingProgramme.update({
    where: { id: programme.id },
    data: {
      duration_minutes: programmeDurationMinutes(modules as any[], synoptic),
      ...(programme.approved ? { approved: false, approved_at: null, approved_by: null, attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false } : {}),
    },
  })

  const loaded = await loadProgramme(programme.id)
  ok(res, { units: loaded?.programme.units ?? [], qa: loaded ? runProgrammeQa(loaded.programme, loaded.unitModules) : null })
})

// ─── Synoptic assessment ──────────────────────────────────────────────────────

const SYNOPTIC_PROMPT = `You write the final synoptic assessment for a UK adult social care diploma.

A synoptic assessment is NOT a re-run of the unit quizzes. It tests whether the learner can bring together what they learned across SEVERAL units at once — the judgement a competent worker needs when a real situation touches more than one topic.

You will be given the diploma's units and the learning outcomes of each. Write single-best-answer multiple-choice questions where answering correctly requires knowledge from TWO OR MORE different units.

Return ONLY a JSON array, no prose and no markdown fences:
[
  {
    "text": "A short, concrete scenario in a care home, ending in a question about what the worker should do or why.",
    "options": ["Four plausible options", "…", "…", "…"],
    "correct": 0,
    "draws_on": ["Unit name", "Another unit name"]
  }
]

Rules:
- Every question must genuinely draw on at least two named units. Put those unit names in "draws_on".
- "correct" is the 0-based index of the single best answer. Exactly four options, all plausible to someone who has not learned the material — no filler or joke options.
- Test APPLICATION and JUDGEMENT, not recall of definitions. Prefer "what should you do first", "what makes this unsafe", "what must be recorded and why".
- Ground every question in UK adult social care practice and legislation (CQC, Care Act 2014, Mental Capacity Act 2005, Health and Safety at Work Act 1974, GDPR). Never invent a rule the units would not teach.
- Plain, concrete British English in short sentences — this is translated into 60+ languages, so each string must stand alone and never depend on the wording of another.
- Never reuse the wording of a unit's own quiz questions.
- Spread coverage across all the units, not just the first two.`

// POST /admin/standard-programmes/:id/synoptic/generate — draft the cross-module
// final assessment from the units' own outcomes. Returns it for review; deliberately
// does NOT save, so the editor can show it and only then PATCH it.
standardProgrammesRouter.post('/:id/synoptic/generate', async (req: Request, res: Response) => {
  const loaded = await loadProgramme(String(req.params.id))
  if (!loaded) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }
  const { programme, unitModules } = loaded
  if (unitModules.length < 2) { err(res, 'TOO_FEW_UNITS', 'Add at least two units before drafting the final assessment.', 400); return }

  const count = Math.max(10, Math.min(30, Math.round(Number(req.body?.count) || 15)))
  const brief = unitModules.map((m: any, i: number) => {
    const lc = m.learning_content ?? {}
    const outcomes = Array.isArray(lc.outcomes) ? lc.outcomes : []
    const headings = (Array.isArray(lc.sections) ? lc.sections : []).map((s: any) => String(s?.heading ?? '')).filter(Boolean)
    return `Unit ${i + 1} — ${m.name}\nOutcomes: ${outcomes.join('; ') || '(none recorded)'}\nSections: ${headings.join('; ') || '(none)'}`
  }).join('\n\n').slice(0, 24_000)

  try {
    const raw = await callClaude(
      SYNOPTIC_PROMPT,
      `Diploma: ${programme.name}\n${programme.description}\n\nIt has ${unitModules.length} units:\n\n${brief}\n\nWrite exactly ${count} synoptic questions, spread across all the units.`,
      { maxTokens: 8000, temperature: 0.4, feature: 'training_synoptic' },
    )
    const start = raw.indexOf('[')
    const end   = raw.lastIndexOf(']')
    if (start < 0 || end < start) throw new Error('no JSON array in the response')
    const parsed = JSON.parse(raw.slice(start, end + 1))

    const questions = (Array.isArray(parsed) ? parsed : [])
      .map((q: any, i: number) => ({
        id: `syn${i + 1}`,
        text: String(q?.text ?? '').trim(),
        options: (Array.isArray(q?.options) ? q.options : []).slice(0, 4).map((o: any) => String(o ?? '').trim()),
        correct: Number.isInteger(q?.correct) ? q.correct : 0,
        draws_on: (Array.isArray(q?.draws_on) ? q.draws_on : []).map((d: any) => String(d)).slice(0, 4),
      }))
      .filter((q: any) => q.text && q.options.length === 4 && q.options.every(Boolean) && q.correct >= 0 && q.correct < 4)

    if (!questions.length) { err(res, 'GENERATION_FAILED', 'Nothing usable came back — try again.', 502); return }
    ok(res, { questions })
  } catch (e: any) {
    console.error('[std-programmes/synoptic] failed:', e?.message ?? e)
    err(res, 'GENERATION_FAILED', 'Could not draft the final assessment — try again.', 502)
  }
})

// ─── Publish ──────────────────────────────────────────────────────────────────

// POST /admin/standard-programmes/:id/approve — publish with a NAMED attestation.
// Blocks on QA hard fails, exactly like a module.
standardProgrammesRouter.post('/:id/approve', async (req: Request, res: Response) => {
  const loaded = await loadProgramme(String(req.params.id))
  if (!loaded) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }
  const { programme, unitModules } = loaded

  if (req.body?.approved === false) {
    const updated = await (prisma as any).trainingProgramme.update({
      where: { id: programme.id },
      data:  { approved: false, approved_at: null, approved_by: null, attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false },
    })
    ok(res, { programme: updated }); return
  }

  const qa = runProgrammeQa(programme, unitModules)
  if (!qa.ok_to_approve) {
    err(res, 'QA_FAILED', `Cannot publish — ${qa.hard_fails} quality check(s) failed: ${qa.checks.filter(c => c.status === 'fail').map(c => c.label).join(', ')}.`, 422)
    return
  }

  const name = String(req.body?.reviewer_name ?? '').trim()
  const role = String(req.body?.reviewer_role ?? '').trim()
  if (!name || !role) { err(res, 'ATTESTATION_REQUIRED', 'A reviewer name and role are required to attest and publish.', 422); return }

  // A programme is independently reviewed only if every unit is.
  const independent = unitModules.length > 0 && unitModules.every((m: any) => m?.independently_reviewed)

  const updated = await (prisma as any).trainingProgramme.update({
    where: { id: programme.id },
    data:  {
      approved: true, approved_at: new Date(), approved_by: name,
      attested_by_name: name, attested_by_role: role, attested_at: new Date(),
      independently_reviewed: independent,
    },
  })
  ok(res, { programme: updated })
})

// DELETE /admin/standard-programmes/:id — only while nobody is enrolled.
standardProgrammesRouter.delete('/:id', async (req: Request, res: Response) => {
  const programme = await (prisma as any).trainingProgramme.findFirst({ where: { id: req.params.id, tenant_id: null }, select: { id: true } })
  if (!programme) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }
  const enrolled = await (prisma as any).trainingProgrammeEnrollment.count({ where: { programme_id: programme.id } })
  if (enrolled > 0) { err(res, 'IN_USE', `${enrolled} staff member(s) are enrolled — archive it instead (set inactive).`, 409); return }
  await (prisma as any).trainingProgramme.delete({ where: { id: programme.id } })
  ok(res, { deleted: true })
})

// ─── Build from a template ────────────────────────────────────────────────────

// POST /admin/standard-programmes/from-template — assemble a programme from a named
// template, matching its unit list against the published standard library by title.
// Reports which units matched and which are missing, so a partially-populated
// library still produces a usable draft.
standardProgrammesRouter.post('/from-template', async (req: Request, res: Response) => {
  const slug = String(req.body?.slug ?? '')
  const template = DIPLOMA_TEMPLATES.find(t => t.slug === slug)
  if (!template) { err(res, 'NOT_FOUND', `Unknown template "${slug}"`, 404); return }

  try {
    const published = await (prisma as any).trainingModule.findMany({
      where:  { tenant_id: null, source: 'ai_generated', approved: true, is_active: true },
      select: { id: true, name: true, duration_minutes: true, topic_id: true },
    })
    // Match on a normalised name so wording drift ("&" vs "and") still matches.
    const norm = (s: string) => s.toLowerCase().replace(/&/g, 'and').replace(/[^a-z0-9]+/g, ' ').trim()
    const byName = new Map<string, any>((published as any[]).map(m => [norm(m.name), m]))
    const findModule = (titles: string[]) => {
      for (const t of titles) {
        const exact = byName.get(norm(t))
        if (exact) return exact
      }
      // Fall back to a containment match in either direction.
      for (const t of titles) {
        const n = norm(t)
        for (const [key, m] of byName) if (key.includes(n) || n.includes(key)) return m
      }
      return null
    }

    const matched: Array<{ module: any; is_optional: boolean; wanted: string }> = []
    const missing: string[] = []
    for (const u of template.units) {
      const m = findModule([u.title, ...(u.aliases ?? [])])
      if (m) matched.push({ module: m, is_optional: !!u.is_optional, wanted: u.title })
      else missing.push(u.title)
    }
    if (!matched.length) {
      err(res, 'NO_UNITS', 'None of this template\'s units are published in the standard library yet — publish those modules first.', 422)
      return
    }

    const existing = await (prisma as any).trainingProgramme.findFirst({ where: { tenant_id: null, slug: template.slug } })
    const data = {
      name: template.name,
      description: template.description,
      kind: template.kind,
      group_key: template.group_key ?? null,
      care_setting: template.care_setting ?? null,
      outcomes: template.outcomes,
      standards: normaliseStandards(template.standards ?? []),
      sequential: !!template.sequential,
      require_practical: !!template.require_practical,
      require_reflection: template.require_reflection !== false,
      synoptic_pass_mark: template.synoptic_pass_mark ?? 80,
      renewal_months: template.renewal_months ?? null,
      price_pence: template.price_pence ?? null,
      duration_minutes: programmeDurationMinutes(matched.map(m => m.module), 0),
      // A fresh build is always a draft — it must be attested before publishing.
      approved: false, approved_at: null, approved_by: null,
      attested_by_name: null, attested_by_role: null, attested_at: null, independently_reviewed: false,
    }

    const programme = existing
      ? await (prisma as any).trainingProgramme.update({ where: { id: existing.id }, data })
      : await (prisma as any).trainingProgramme.create({ data: { tenant_id: null, slug: template.slug, ...data } })

    await (prisma as any).trainingProgrammeUnit.deleteMany({ where: { programme_id: programme.id } })
    await (prisma as any).trainingProgrammeUnit.createMany({
      data: matched.map((m, i) => ({ programme_id: programme.id, module_id: m.module.id, order: i, is_optional: m.is_optional })),
    })

    ok(res, {
      programme,
      matched: matched.map(m => ({ wanted: m.wanted, used: m.module.name, module_id: m.module.id, is_optional: m.is_optional })),
      missing,
      replaced: !!existing,
    })
  } catch (e: any) {
    console.error('[std-programmes/from-template] failed:', e?.message ?? e)
    err(res, 'BUILD_FAILED', e.message, 500)
  }
})
