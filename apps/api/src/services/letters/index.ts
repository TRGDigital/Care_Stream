// The Tier 1 letter library. A small, read only API for the Ask CareStream agents: list the letters, describe one, check values, and render to text, HTML or PDF.
// No routes and no tables live here. Letters are always drafts: nothing is shared until an administrator or manager has approved it.

import { TEMPLATES, TIER2_PLANNED, COMMON_FIELDS, DRAFT_NOTE, type LetterTemplate, type FieldDef } from './templates'
import { getTemplate as find, renderLetter, renderLetterPdf, renderLetterDocx, letterLayout, validateValues, type Values, type RenderedLetter, type Letterhead, type Signer } from './render'

export { TIER2_PLANNED, COMMON_FIELDS, DRAFT_NOTE }
export type { LetterTemplate, FieldDef, Values, RenderedLetter, Letterhead, Signer }
export { resolveDefaults } from './fields'
export type { LetterDataSource, Resolved, ResolveInput } from './fields'

export interface LetterSummary { id: string; title: string; category: LetterTemplate['category']; description: string; whoFor: string; fields: FieldDef[]; beforeYouSend: string[]; references: LetterTemplate['references']; approvalRequired: true }

export function listTemplates(): LetterSummary[] {
  return TEMPLATES.map(t => ({ id: t.id, title: t.title, category: t.category, description: t.description, whoFor: t.whoFor, fields: t.fields, beforeYouSend: t.beforeYouSend, references: t.references, approvalRequired: true as const }))
}

export function getTemplate(id: string): LetterTemplate | undefined { return find(id) }

/** What is missing or unreadable in the values for a letter. */
export function validate(id: string, values: Values) {
  const t = find(id)
  if (!t) return { ok: false, missing: [] as string[], invalid: [{ key: '', label: 'Letter', message: 'That letter does not exist.' }] }
  return validateValues(t, values)
}

/** The letter as text and HTML, with gaps shown as [Label] and listed in `missing`. */
export function render(id: string, values: Values): RenderedLetter {
  const t = find(id)
  if (!t) throw new Error(`Unknown letter: ${id}`)
  return renderLetter(t, values)
}

/** The letter as a PDF on the letterhead. Refuses to produce one while anything is missing, so an unfinished letter can never be printed by accident. */
export async function renderPdf(id: string, values: Values, head: Letterhead, signer?: Signer | null): Promise<Buffer> {
  const t = find(id)
  if (!t) throw new Error(`Unknown letter: ${id}`)
  const check = validateValues(t, values)
  if (!check.ok) throw new Error(`The letter is not finished: ${[...check.missing, ...check.invalid.map(i => i.label)].join(', ')}`)
  return renderLetterPdf(t, values, head, signer)
}

/** The same finished letter as a Word document (.docx). Refuses while anything is missing, like the PDF. */
export async function renderDocx(id: string, values: Values, head: Letterhead, signer?: Signer | null): Promise<Buffer> {
  const t = find(id)
  if (!t) throw new Error(`Unknown letter: ${id}`)
  const check = validateValues(t, values)
  if (!check.ok) throw new Error(`The letter is not finished: ${[...check.missing, ...check.invalid.map(i => i.label)].join(', ')}`)
  return renderLetterDocx(t, values, head, signer)
}

/** The letter as a layout (for the on screen preview). Works while the letter is unfinished: gaps show as [Label]. */
export function layout(id: string, values: Values, head: Letterhead, signer?: Signer | null) {
  const t = find(id)
  if (!t) throw new Error(`Unknown letter: ${id}`)
  return letterLayout(t, values, head, signer)
}
