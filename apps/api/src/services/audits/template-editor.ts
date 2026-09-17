// Editing, copying and versioning audit templates. Used by a home editing its own audits
// (/audits/templates/:id) and by the platform editing the shared built-in audits (/admin/audit-seeds).
//
// History is never rewritten. A question that already has answers is not changed in place when its
// wording, type or scoring changes: it is retired (is_active false) and a new question takes its
// place, so every completed audit still shows exactly what was asked. Removed questions are retired
// the same way. Each save bumps the template's version and stores a snapshot of the new structure.

import { Prisma } from '@prisma/client'
import { prisma } from '../../db/client'
import { QUESTION_TYPES, normaliseSettings } from '../../lib/audit-questions'

export const FREQUENCIES = ['daily', 'weekly', 'monthly', 'quarterly', 'periodic']
export const SUBJECT_SCOPES = ['none', 'room', 'resident', 'staff']

export type EditorQuestion = {
  id: string | null
  key: string
  text: string
  type: string
  settings: any
  show_if: { key: string; equals: string[] } | null
  quality_statement_id: string | null
}
export type EditorSection = { id: string | null; title: string; questions: EditorQuestion[] }
export type EditorPayload = {
  name?: string
  description?: string | null
  frequency?: string
  subject_scope?: string
  requires_shift?: boolean
  sections: EditorSection[]
  change_note?: string | null
}

// Normalise and validate a raw editor payload. Returns an error message or the clean payload.
export function parseEditorPayload(b: any, opts: { requireName?: boolean } = {}): { error: string } | { payload: EditorPayload } {
  if (!Array.isArray(b?.sections)) return { error: 'sections array is required' }
  const keys = new Set<string>()
  const sections: EditorSection[] = b.sections.map((s: any, si: number) => ({
    id: s?.id ? String(s.id) : null,
    title: String(s?.title ?? '').trim().slice(0, 200),
    questions: (Array.isArray(s?.questions) ? s.questions : []).map((q: any, qi: number) => {
      const type = (QUESTION_TYPES as readonly string[]).includes(q?.type ?? q?.question_type) ? (q.type ?? q.question_type) : 'yes_no_na'
      const key = String(q?.key ?? q?.id ?? `new-${si}-${qi}`)
      keys.add(key)
      const cond = q?.show_if
      return {
        id: q?.id ? String(q.id) : null,
        key,
        text: String(q?.text ?? q?.question_text ?? '').trim().slice(0, 1000),
        type,
        settings: normaliseSettings(type, q?.settings),
        show_if: cond?.key && Array.isArray(cond.equals) && cond.equals.length
          ? { key: String(cond.key), equals: cond.equals.map((v: any) => String(v)).slice(0, 20) }
          : null,
        quality_statement_id: q?.quality_statement_id ? String(q.quality_statement_id) : null,
      }
    }).filter((q: EditorQuestion) => q.text),
  }))
  if (!sections.length) return { error: 'Add at least one section' }
  if (sections.some(s => !s.title)) return { error: 'Every section needs a title' }
  if (sections.some(s => s.questions.length === 0)) return { error: 'Every section needs at least one question' }
  for (const s of sections) for (const q of s.questions) {
    if ((q.type === 'choice' || q.type === 'multi_choice') && (q.settings?.options?.length ?? 0) < 2) {
      return { error: `"${q.text.slice(0, 60)}" needs at least two options` }
    }
    if (q.show_if && (!keys.has(q.show_if.key) || q.show_if.key === q.key)) q.show_if = null
  }
  const name = typeof b?.name === 'string' ? b.name.trim().slice(0, 200) : undefined
  if (opts.requireName && !name) return { error: 'Give the audit a name' }
  return {
    payload: {
      name,
      description: b?.description === undefined ? undefined : (b.description ? String(b.description).trim().slice(0, 1000) : null),
      frequency: FREQUENCIES.includes(b?.frequency) ? b.frequency : undefined,
      subject_scope: SUBJECT_SCOPES.includes(b?.subject_scope) ? b.subject_scope : undefined,
      requires_shift: typeof b?.requires_shift === 'boolean' ? b.requires_shift : undefined,
      sections,
      change_note: b?.change_note ? String(b.change_note).trim().slice(0, 300) : null,
    },
  }
}

const sameJson = (a: any, b: any) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null)

// The template in the editor's shape: active questions only, conditions expressed by key.
export async function templateForEditor(templateId: string) {
  const t = await (prisma as any).auditTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { orderBy: { section_order: 'asc' }, include: { questions: { where: { is_active: true }, orderBy: { question_order: 'asc' } } } } },
  })
  if (!t) return null
  return {
    id: t.id, tenant_id: t.tenant_id, name: t.name, description: t.description, frequency: t.frequency,
    subject_scope: t.subject_scope ?? 'none', requires_shift: !!t.requires_shift, version: t.version ?? 1,
    module_ids: t.module_ids ?? [], is_seed: !!t.is_seed,
    sections: (t.sections as any[]).filter(s => s.questions.length).map(s => ({
      id: s.id, title: s.title,
      questions: s.questions.map((q: any) => ({
        id: q.id, key: q.id, text: q.question_text, type: q.question_type, settings: q.settings ?? null,
        show_if: q.show_if?.question_id ? { key: q.show_if.question_id, equals: q.show_if.equals ?? [] } : null,
        quality_statement_id: q.quality_statement_id ?? null,
      })),
    })),
  }
}

function snapshotOf(payload: EditorPayload, meta: { name: string; frequency: string; subject_scope: string }) {
  return {
    name: meta.name, frequency: meta.frequency, subject_scope: meta.subject_scope,
    sections: payload.sections.map(s => ({
      title: s.title,
      questions: s.questions.map(q => ({ text: q.text, type: q.type, settings: q.settings, show_if: q.show_if, quality_statement_id: q.quality_statement_id })),
    })),
  }
}

// Save a new structure onto an existing template. Returns the new version number.
export async function saveTemplateStructure(templateId: string, payload: EditorPayload, opts: { changedBy?: string | null } = {}): Promise<number> {
  const current = await (prisma as any).auditTemplate.findUnique({
    where: { id: templateId },
    include: { sections: { include: { questions: true } } },
  })
  if (!current) throw new Error('Audit not found')

  const curSections = new Map<string, any>((current.sections as any[]).map(s => [s.id, s]))
  const curQuestions = new Map<string, any>()
  for (const s of current.sections as any[]) for (const q of s.questions) curQuestions.set(q.id, q)
  const answeredRows = curQuestions.size
    ? await (prisma as any).auditAnswer.groupBy({ by: ['question_id'], where: { question_id: { in: [...curQuestions.keys()] } } })
    : []
  const answered = new Set((answeredRows as any[]).map(r => r.question_id))

  return (prisma as any).$transaction(async (tx: any) => {
    const idByKey = new Map<string, string>()
    const keptQuestionIds = new Set<string>()
    const pendingConditions: Array<{ id: string; show_if: EditorQuestion['show_if'] }> = []

    for (let si = 0; si < payload.sections.length; si++) {
      const s = payload.sections[si]
      let sectionId = s.id && curSections.has(s.id) ? s.id : null
      if (sectionId) await tx.auditSection.update({ where: { id: sectionId }, data: { title: s.title, section_order: si } })
      else sectionId = (await tx.auditSection.create({ data: { template_id: templateId, title: s.title, section_order: si } })).id

      for (let qi = 0; qi < s.questions.length; qi++) {
        const q = s.questions[qi]
        const existing = q.id ? curQuestions.get(q.id) : null
        // Nullable JSON columns need Prisma.DbNull to store SQL NULL; a plain null is rejected.
        const content = { question_text: q.text, question_type: q.type, settings: q.settings ?? Prisma.DbNull }
        let id: string
        if (existing) {
          const changed = existing.question_text !== q.text || existing.question_type !== q.type || !sameJson(existing.settings, q.settings)
          if (changed && answered.has(existing.id)) {
            // Answered before: retire it and ask the new wording as a new question.
            await tx.auditQuestion.update({ where: { id: existing.id }, data: { is_active: false } })
            id = (await tx.auditQuestion.create({ data: { section_id: sectionId, ...content, question_order: qi, quality_statement_id: q.quality_statement_id } })).id
          } else {
            await tx.auditQuestion.update({
              where: { id: existing.id },
              data: { ...content, section_id: sectionId, question_order: qi, quality_statement_id: q.quality_statement_id, is_active: true },
            })
            id = existing.id
          }
        } else {
          id = (await tx.auditQuestion.create({ data: { section_id: sectionId, ...content, question_order: qi, quality_statement_id: q.quality_statement_id } })).id
        }
        idByKey.set(q.key, id)
        if (q.id) idByKey.set(q.id, id)
        keptQuestionIds.add(id)
        pendingConditions.push({ id, show_if: q.show_if })
      }
    }

    // Conditions can point at questions created in this save, so resolve them last.
    for (const p of pendingConditions) {
      const target = p.show_if ? idByKey.get(p.show_if.key) : null
      await tx.auditQuestion.update({
        where: { id: p.id },
        data: { show_if: target && target !== p.id ? { question_id: target, equals: p.show_if!.equals } : Prisma.DbNull },
      })
    }

    // Anything not in the new structure is retired, never deleted.
    for (const q of curQuestions.values()) {
      if (q.is_active && !keptQuestionIds.has(q.id)) await tx.auditQuestion.update({ where: { id: q.id }, data: { is_active: false } })
    }

    const version = (current.version ?? 1) + 1
    const data: any = { version }
    if (payload.name) data.name = payload.name
    if (payload.description !== undefined) data.description = payload.description
    if (payload.frequency) data.frequency = payload.frequency
    if (payload.subject_scope) data.subject_scope = payload.subject_scope
    if (payload.requires_shift !== undefined) data.requires_shift = payload.requires_shift
    const updated = await tx.auditTemplate.update({ where: { id: templateId }, data })

    await tx.auditTemplateVersion.create({
      data: {
        template_id: templateId, tenant_id: current.tenant_id, version,
        snapshot: snapshotOf(payload, { name: updated.name, frequency: updated.frequency, subject_scope: updated.subject_scope ?? 'none' }),
        changed_by: opts.changedBy ?? null, change_note: payload.change_note ?? null,
      },
    })
    return version
  }, { timeout: 30000, maxWait: 10000 })
}

// Create a new template for a tenant from a payload (the builder's "create" and "copy").
export async function createTemplateFromPayload(tenantId: string, payload: EditorPayload, extra: { module_ids?: string[]; changedBy?: string | null }) {
  const template = await (prisma as any).auditTemplate.create({
    data: {
      tenant_id: tenantId,
      name: payload.name ?? 'Untitled audit',
      description: payload.description ?? null,
      frequency: payload.frequency ?? 'periodic',
      subject_scope: payload.subject_scope ?? 'none',
      requires_shift: payload.requires_shift ?? false,
      module_ids: extra.module_ids ?? [],
      version: 0,
    },
  })
  // Build the structure through the same save path, which sets version 1 and stores its snapshot.
  await saveTemplateStructure(template.id, { ...payload, change_note: payload.change_note ?? 'Created' }, { changedBy: extra.changedBy })
  return template.id as string
}

// Copy any template the tenant can see (built-in or its own) into a new template the tenant owns.
export async function copyTemplate(sourceId: string, tenantId: string, name: string | null, changedBy: string | null) {
  const source = await templateForEditor(sourceId)
  if (!source) return null
  const payload: EditorPayload = {
    name: name?.trim() || `${source.name} (copy)`,
    description: source.description,
    frequency: source.frequency,
    subject_scope: source.subject_scope,
    requires_shift: source.requires_shift,
    // Keys are the source ids, so conditions carry over; ids are cleared so every question is new.
    sections: source.sections.map((s: any) => ({ id: null, title: s.title, questions: s.questions.map((q: any) => ({ ...q, id: null })) })),
    change_note: `Copied from "${source.name}"`,
  }
  return createTemplateFromPayload(tenantId, payload, { module_ids: source.tenant_id ? source.module_ids : [], changedBy })
}
