import { Router, Request, Response } from 'express'
import PDFDocument from 'pdfkit'
import 'pdfkit/standard-fonts/Helvetica'
import 'pdfkit/standard-fonts/HelveticaBold'
import 'pdfkit/standard-fonts/HelveticaOblique'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requirePlatformAdmin } from '../middleware/auth'

// Platform-INTERNAL view of the ad-hoc training homes have generated from their own
// policies (Modules tab → Generate lesson). Lists which homes have generated lessons, and
// produces a PDF record of one lesson: every question, and every source it was grounded
// in (the home's policies, the curated training seed, the example policy seeds), so the
// platform team can always check what a lesson was built from.
export const platformAdhocTrainingRouter = Router()
platformAdhocTrainingRouter.use(requirePlatformAdmin)

const db = prisma as any

type Ref = { policy_id: string; title: string; section: string | null }
type SourceKind = 'home' | 'training_seed' | 'example'

// policy_refs carries all three kinds; the id prefix says which.
function sourceKind(id: string): SourceKind {
  if (id.startsWith('training-seed:')) return 'training_seed'
  if (id.startsWith('seed:')) return 'example'
  return 'home'
}

function splitSources(refs: unknown): { home: Ref[]; training_seed: Ref[]; example: Ref[]; recorded: boolean } {
  const list: Ref[] = Array.isArray(refs) ? (refs as any[]).filter(r => r && r.policy_id).map(r => ({
    policy_id: String(r.policy_id), title: String(r.title ?? ''), section: r.section ? String(r.section) : null,
  })) : []
  return {
    home:          list.filter(r => sourceKind(r.policy_id) === 'home'),
    training_seed: list.filter(r => sourceKind(r.policy_id) === 'training_seed'),
    example:       list.filter(r => sourceKind(r.policy_id) === 'example'),
    recorded:      list.length > 0,
  }
}

// Ad-hoc modules with a generated lesson, across every home. Computed in SQL so the lesson
// bodies are not pulled into memory just to count them.
async function lessonRows(moduleId?: string): Promise<any[]> {
  return db.$queryRawUnsafe(`
    SELECT m.id, m.tenant_id, m.name, m.questions_version,
           CASE WHEN jsonb_typeof(m.questions) = 'array' THEN jsonb_array_length(m.questions) ELSE 0 END AS questions,
           jsonb_array_length(m.learning_content->'sections') AS sections,
           m.policy_refs
      FROM training_modules m
     WHERE m.tenant_id IS NOT NULL
       AND m.source = 'manual'
       AND jsonb_typeof(m.learning_content->'sections') = 'array'
       AND CASE WHEN jsonb_typeof(m.learning_content->'sections') = 'array'
                THEN jsonb_array_length(m.learning_content->'sections') ELSE 0 END > 0
       ${moduleId ? 'AND m.id::text = $1' : ''}
  `, ...(moduleId ? [moduleId] : []))
}

// Latest generation per module, from the AI credit log (the module row has no timestamp).
async function lastGenerated(moduleIds: string[]): Promise<Map<string, Date>> {
  if (!moduleIds.length) return new Map()
  const rows = await db.aiCreditLog.groupBy({
    by: ['ref_id'], where: { action: 'training_lesson', ref_id: { in: moduleIds } }, _max: { created_at: true },
  }).catch(() => [])
  return new Map((rows as any[]).map(r => [String(r.ref_id), r._max.created_at]))
}

// The newest provenance record per module (one is written each time a lesson is generated).
// `full` adds the passages and per-item attribution, which only the PDF needs.
async function latestProvenance(moduleIds: string[], full = false): Promise<Map<string, any>> {
  if (!moduleIds.length) return new Map()
  const rows = await db.trainingLessonProvenance.findMany({
    where: { module_id: { in: moduleIds } }, orderBy: { created_at: 'desc' },
    select: { module_id: true, version: true, summary: true, created_at: true, ...(full ? { sources: true, attribution: true } : {}) },
  }).catch(() => [])
  const out = new Map<string, any>()
  for (const r of rows as any[]) if (!out.has(r.module_id)) out.set(r.module_id, r)
  return out
}

// ─── GET /admin/adhoc-training ────────────────────────────────────────────────
// Every home with generated ad-hoc lessons, and each lesson's sources at a glance.
platformAdhocTrainingRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const rows = await lessonRows()
    const ids = rows.map(r => String(r.id))
    const [tenants, generated, enrolled, provenance] = await Promise.all([
      db.tenant.findMany({
        where:  { id: { in: [...new Set(rows.map(r => String(r.tenant_id)))] } },
        select: { id: true, name: true, account_number: true },
      }),
      lastGenerated(ids),
      ids.length ? db.trainingEnrollment.groupBy({ by: ['module_id'], where: { module_id: { in: ids } }, _count: { _all: true } }).catch(() => []) : [],
      latestProvenance(ids),
    ])
    const tenantById = new Map((tenants as any[]).map(t => [String(t.id), t]))
    const enrolledById = new Map((enrolled as any[]).map(e => [String(e.module_id), e._count._all]))

    const byTenant = new Map<string, any>()
    for (const r of rows) {
      const t = tenantById.get(String(r.tenant_id))
      if (!byTenant.has(String(r.tenant_id))) {
        byTenant.set(String(r.tenant_id), { tenant_id: String(r.tenant_id), name: t?.name ?? 'Unknown home', account_number: t?.account_number ?? '', modules: [] })
      }
      const src = splitSources(r.policy_refs)
      const at = generated.get(String(r.id))
      byTenant.get(String(r.tenant_id)).modules.push({
        id: String(r.id), name: r.name, version: Number(r.questions_version ?? 0),
        questions: Number(r.questions ?? 0), sections: Number(r.sections ?? 0),
        sources_recorded: src.recorded,
        home_policies: src.home.length, training_seeds: src.training_seed.length, example_policies: src.example.length,
        generated_at: at ? new Date(at).toISOString() : null,
        enrolled: enrolledById.get(String(r.id)) ?? 0,
        // Where the content is supported, from the check run at generation. Null when the
        // lesson was generated before checking began; `current` is false if the questions
        // were edited after the check.
        attribution: (() => {
          const pv = provenance.get(String(r.id))
          if (!pv || !pv.summary || pv.summary.error || !pv.summary.questions) return pv?.summary?.error ? { failed: true } : null
          return { failed: false, current: Number(pv.version) === Number(r.questions_version ?? 0), questions: pv.summary.questions, sections: pv.summary.sections }
        })(),
      })
    }
    const list = [...byTenant.values()]
    for (const t of list) {
      t.modules.sort((a: any, b: any) => (b.generated_at ?? '').localeCompare(a.generated_at ?? '') || a.name.localeCompare(b.name))
      t.last_generated_at = t.modules.find((m: any) => m.generated_at)?.generated_at ?? null
    }
    list.sort((a, b) => (b.last_generated_at ?? '').localeCompare(a.last_generated_at ?? '') || a.name.localeCompare(b.name))

    ok(res, {
      tenants: list,
      totals: {
        tenants: list.length,
        lessons: rows.length,
        recorded: list.reduce((n, t) => n + t.modules.filter((m: any) => m.sources_recorded).length, 0),
      },
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e?.message ?? 'Could not load ad-hoc training.', 500)
  }
})

// ─── PDF ──────────────────────────────────────────────────────────────────────

const INK = '#111827', MID = '#6b7280', LINE = '#e5e7eb', ACCENT = '#0f766e', GREEN = '#15803d', AMBER = '#b45309'
const PAGE = { w: 595.28, h: 841.89, m: 48 }
const LETTERS = ['A', 'B', 'C', 'D']

// Standard PDF fonts only cover Windows-1252: swap common punctuation, drop the rest.
function clean(v: any): string {
  return String(v ?? '')
    .replace(/[‘’]/g, "'").replace(/[“”]/g, '"').replace(/[–—]/g, '-').replace(/…/g, '...')
    .replace(/[•●]/g, '-').replace(/ /g, ' ')
    .replace(/[^\x09\x0A\x0D\x20-\x7E\xA0-\xFF€]/g, '')
}
const dateLong = (d: any) => d ? new Date(d).toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit', timeZone: 'Europe/London' }) : 'Not recorded'
const safeName = (s: string) => s.replace(/[^a-z0-9]+/gi, '-').replace(/(^-|-$)/g, '').toLowerCase().slice(0, 60) || 'lesson'

// ─── GET /admin/adhoc-training/:moduleId/report.pdf ────────────────────────────
platformAdhocTrainingRouter.get('/:moduleId/report.pdf', async (req: Request, res: Response) => {
  try {
    const [row] = await lessonRows(String(req.params.moduleId))
    if (!row) return err(res, 'NOT_FOUND', 'No generated ad-hoc lesson with that id.', 404)
    const [module, tenant, generated] = await Promise.all([
      db.trainingModule.findUnique({ where: { id: String(row.id) }, select: { name: true, questions: true, learning_content: true, questions_version: true, pass_mark: true, duration_minutes: true, requires_practical: true } }),
      db.tenant.findUnique({ where: { id: String(row.tenant_id) }, select: { name: true, account_number: true } }),
      lastGenerated([String(row.id)]),
    ])
    const pv = (await latestProvenance([String(row.id)], true)).get(String(row.id)) ?? null
    const attrItems: any[] = Array.isArray(pv?.attribution) ? pv.attribution : []
    const attrByRef = new Map(attrItems.map(a => [String(a.ref), a]))
    const checkCurrent = pv ? Number(pv.version) === Number(module?.questions_version ?? 0) : false
    const src = splitSources(row.policy_refs)
    // Are the home's source policies still in its library, and under what name now?
    const homeIds = src.home.map(r => r.policy_id)
    const livePolicies = homeIds.length
      ? await db.policy.findMany({ where: { id: { in: homeIds }, tenant_id: String(row.tenant_id) }, select: { id: true, name: true, status: true } })
      : []
    const liveById = new Map((livePolicies as any[]).map(p => [String(p.id), p]))

    const doc = new PDFDocument({ size: 'A4', margins: { top: PAGE.m, bottom: PAGE.m, left: PAGE.m, right: PAGE.m }, bufferPages: true, info: { Title: `Ad-hoc training record: ${clean(module?.name)}` } })
    const chunks: Buffer[] = []
    doc.on('data', (c: Buffer) => chunks.push(c))
    const done = new Promise<Buffer>(resolve => doc.on('end', () => resolve(Buffer.concat(chunks))))
    const width = PAGE.w - PAGE.m * 2

    const h1 = (t: string) => { doc.font('Helvetica-Bold').fontSize(19).fillColor(INK).text(clean(t), { width }) }
    const h2 = (t: string) => {
      if (doc.y > PAGE.h - PAGE.m - 80) doc.addPage()
      doc.moveDown(0.8)
      doc.font('Helvetica-Bold').fontSize(13).fillColor(ACCENT).text(clean(t), { width })
      doc.moveTo(PAGE.m, doc.y + 3).lineTo(PAGE.w - PAGE.m, doc.y + 3).strokeColor(LINE).lineWidth(0.8).stroke()
      doc.moveDown(0.6)
    }
    const h3 = (t: string) => { doc.moveDown(0.3); doc.font('Helvetica-Bold').fontSize(10.5).fillColor(INK).text(clean(t), { width }) }
    const body = (t: string, opts: any = {}) => { doc.font('Helvetica').fontSize(9.5).fillColor(INK).text(clean(t), { width, lineGap: 1.5, ...opts }) }
    const muted = (t: string) => { doc.font('Helvetica-Oblique').fontSize(9).fillColor(MID).text(clean(t), { width, lineGap: 1.5 }) }
    const label = (k: string, v: string) => {
      doc.font('Helvetica-Bold').fontSize(9).fillColor(MID).text(clean(k), PAGE.m, doc.y, { continued: true, width })
      doc.font('Helvetica').fillColor(INK).text(`  ${clean(v)}`, { width })
    }
    const options = (opts: string[], correct: number) => {
      opts.forEach((o, i) => {
        const right = i === correct
        doc.font(right ? 'Helvetica-Bold' : 'Helvetica').fontSize(9.5).fillColor(right ? GREEN : INK)
          .text(`${LETTERS[i] ?? '?'}.  ${clean(o)}${right ? '   (correct)' : ''}`, PAGE.m + 14, doc.y, { width: width - 14, lineGap: 1 })
      })
      doc.x = PAGE.m
    }

    const KIND_TEXT: Record<string, string> = { home: "This home's policy", training_seed: 'Curated training seed', example: 'Example policy (not this home)' }
    const KIND_COLOUR: Record<string, string> = { home: GREEN, training_seed: '#0369a1', example: AMBER }
    // Where one section or question is supported, with the checked quote.
    const support = (ref: string) => {
      const a = attrByRef.get(ref)
      if (!a) return
      let line: string, colour: string
      if (a.status === 'verified') { line = `Supported by: ${KIND_TEXT[a.source_kind] ?? 'Source'}, ${a.source_title}${a.source_section ? `, ${a.source_section}` : ''}`; colour = KIND_COLOUR[a.source_kind] ?? MID }
      else if (a.status === 'none') { line = 'Not in the sources: written from general good practice'; colour = MID }
      else { line = `Unverified: the quote given${a.source_title ? ` for ${a.source_title}` : ''} was not found in the sources`; colour = '#b91c1c' }
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(colour).text(clean(line), PAGE.m + 14, doc.y + 2, { width: width - 14 })
      if (a.status === 'verified' && a.quote) doc.font('Helvetica-Oblique').fontSize(8.5).fillColor(MID).text(clean(`"${a.quote}"`), PAGE.m + 14, doc.y, { width: width - 14, lineGap: 1 })
      doc.x = PAGE.m
    }

    // ── Header
    doc.font('Helvetica-Bold').fontSize(9).fillColor(ACCENT).text('CARESTREAM · AD-HOC TRAINING RECORD', { width, characterSpacing: 0.6 })
    doc.moveDown(0.3)
    h1(module?.name ?? row.name)
    doc.moveDown(0.5)
    label('Home', `${tenant?.name ?? 'Unknown'}${tenant?.account_number ? ` (${tenant.account_number})` : ''}`)
    label('Last generated', dateLong(generated.get(String(row.id))))
    label('Question version', String(module?.questions_version ?? 0))
    label('Assessment', `${Array.isArray(module?.questions) ? module.questions.length : 0} questions, pass mark ${module?.pass_mark ?? 80}%${module?.duration_minutes ? `, about ${module.duration_minutes} minutes` : ''}${module?.requires_practical ? ', practical sign-off required' : ''}`)
    label('Record produced', dateLong(new Date()))

    // ── Where the content is supported
    h2('Where the content comes from')
    if (!pv) {
      muted('Not checked. This lesson was generated before CareStream began checking each section and question against its sources (21 September 2026). Regenerate the lesson to check it.')
    } else if (pv.summary?.error || !pv.summary?.questions) {
      muted(`The check did not complete when this lesson was generated${pv.summary?.error ? ` (${pv.summary.error})` : ''}. The sources it read are still listed below.`)
    } else {
      muted('Each section and question was checked against the exact text the generator read. It is credited to the one passage that states its key fact, with a quote that was confirmed, word for word, to be in that passage.')
      if (!checkCurrent) muted(`Note: the questions have been edited since this check (the check covers question version ${pv.version}; the lesson is now version ${module?.questions_version ?? 0}). Question numbers below may no longer line up.`)
      const pct = (n: number, t: number) => t ? `${n} (${Math.round((n / t) * 100)}%)` : '0'
      const rows: Array<[string, any]> = [['Assessment questions', pv.summary.questions], ['Lesson sections', pv.summary.sections]]
      const cols = [
        { h: '', w: 118 }, { h: "Home's policies", w: 82 }, { h: 'Training seed', w: 72 }, { h: 'Example policies', w: 76 },
        { h: 'General practice', w: 76 }, { h: 'Unverified', w: 75 },
      ]
      doc.moveDown(0.3)
      let x = PAGE.m, y = doc.y
      doc.font('Helvetica-Bold').fontSize(8.5).fillColor(MID)
      cols.forEach(c => { doc.text(c.h, x, y, { width: c.w }); x += c.w })
      y += 14
      doc.moveTo(PAGE.m, y - 3).lineTo(PAGE.w - PAGE.m, y - 3).strokeColor(LINE).lineWidth(0.6).stroke()
      for (const [name, c] of rows) {
        const vals = [name, pct(c.home, c.total), pct(c.training_seed, c.total), pct(c.example, c.total), pct(c.none, c.total), pct(c.unverified, c.total)]
        x = PAGE.m
        vals.forEach((v, i) => {
          doc.font(i === 0 || i === 1 ? 'Helvetica-Bold' : 'Helvetica').fontSize(9).fillColor(i === 1 ? GREEN : INK).text(clean(v), x, y, { width: cols[i].w })
          x += cols[i].w
        })
        y += 16
      }
      doc.x = PAGE.m; doc.y = y + 4
      const byPolicy: Array<{ title: string; items: number }> = Array.isArray(pv.summary.by_home_policy) ? pv.summary.by_home_policy : []
      if (byPolicy.length) {
        h3("Items supported by each of the home's policies")
        byPolicy.forEach(b => body(`${b.title}: ${b.items}`))
      }
    }

    // ── Sources
    h2('1. Sources this lesson was grounded in')
    if (!src.recorded) {
      muted('Sources were not recorded for this lesson. It was generated before 21 September 2026, when CareStream began saving them. Regenerate the lesson to record its sources.')
    } else {
      muted('The generator reads these in order: the home\'s own policies first, then the curated training seed, then the example policies. Only the first 12,000 characters of the combined text are used; the home\'s policies are given up to 6,000 and the training seed up to 2,500.')
      h3(`This home's own policies (${src.home.length})`)
      if (!src.home.length) body('None. No passage in this home\'s policies matched the module name, so the lesson was built from reference text only.')
      src.home.forEach((r, i) => {
        const live = liveById.get(r.policy_id)
        const state = !live ? 'no longer in the library' : live.status === 'active' ? 'active in the library' : `in the library, status ${live.status}`
        body(`${i + 1}. ${r.title}${r.section ? `, section: ${r.section}` : ''}  (${state})`)
      })
      h3(`Curated training seed (${src.training_seed.length})`)
      if (!src.training_seed.length) body('None. No training seed has exactly this module\'s name.')
      src.training_seed.forEach(r => body(`- ${r.title}`))
      h3(`Example policy seeds (${src.example.length})`)
      if (!src.example.length) body('None matched.')
      src.example.forEach(r => body(`- ${r.title}${r.section ? `, section: ${r.section}` : ''}`))
    }

    // ── Lesson
    const learn = (module?.learning_content ?? {}) as any
    h2('2. Lesson')
    if (learn.summary) { h3('Summary'); body(learn.summary) }
    if (Array.isArray(learn.outcomes) && learn.outcomes.length) {
      h3('Learning outcomes'); learn.outcomes.forEach((o: any) => body(`- ${o}`))
    }
    ;(Array.isArray(learn.sections) ? learn.sections : []).forEach((s: any, i: number) => {
      if (doc.y > PAGE.h - PAGE.m - 120) doc.addPage()
      h3(`Section ${i + 1}: ${s?.heading ?? ''}`)
      support(`L${i + 1}`)
      if (s?.body) body(s.body)
      if (s?.scenario?.situation) {
        doc.moveDown(0.2)
        doc.font('Helvetica-Bold').fontSize(9).fillColor(AMBER).text('Scenario', { width })
        body(s.scenario.situation)
        if (s.scenario.prompt) body(s.scenario.prompt, { oblique: true })
        if (s.scenario.answer) { doc.font('Helvetica-Bold').fontSize(9).fillColor(MID).text('Answer', { width }); body(s.scenario.answer) }
      }
      if (s?.check?.question) {
        doc.moveDown(0.2)
        doc.font('Helvetica-Bold').fontSize(9).fillColor(AMBER).text('Quick check', { width })
        body(s.check.question)
        options(Array.isArray(s.check.options) ? s.check.options : [], Number(s.check.correct))
      }
    })
    if (Array.isArray(learn.key_points) && learn.key_points.length) {
      h3('Key points'); learn.key_points.forEach((k: any) => body(`- ${k}`))
    }

    // ── Assessment
    const qs = Array.isArray(module?.questions) ? module.questions : []
    h2(`3. Assessment questions (${qs.length})`)
    qs.forEach((q: any, i: number) => {
      if (doc.y > PAGE.h - PAGE.m - 90) doc.addPage()
      doc.moveDown(0.35)
      doc.font('Helvetica-Bold').fontSize(9.5).fillColor(INK).text(`${i + 1}. ${clean(q?.text)}`, PAGE.m, doc.y, { width, lineGap: 1.5 })
      options(Array.isArray(q?.options) ? q.options : [], Number(q?.correct))
      support(`Q${i + 1}`)
    })

    // ── Page numbers
    const range = doc.bufferedPageRange()
    for (let i = range.start; i < range.start + range.count; i++) {
      doc.switchToPage(i)
      // The footer sits in the bottom margin; with the margin in place pdfkit would start a new page for it.
      const margin = doc.page.margins.bottom
      doc.page.margins.bottom = 0
      doc.font('Helvetica').fontSize(8).fillColor(MID)
        .text(`${clean(module?.name ?? '')} · ${clean(tenant?.account_number ?? '')} · page ${i + 1} of ${range.count}`, PAGE.m, PAGE.h - PAGE.m + 14, { width, align: 'center', lineBreak: false })
      doc.page.margins.bottom = margin
    }
    doc.end()
    const pdf = await done

    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `attachment; filename="adhoc-training-${safeName(tenant?.account_number ?? '')}-${safeName(module?.name ?? 'lesson')}.pdf"`)
    res.setHeader('Cache-Control', 'private, no-store')
    res.send(pdf)
  } catch (e: any) {
    err(res, 'PDF_FAILED', e?.message ?? 'Could not build the PDF.', 500)
  }
})
