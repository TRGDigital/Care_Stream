// The Letters agent's tools. The model finds the person, picks a Tier 1 letter, looks at what each merge field is and what is already known, previews the finished letter and
// saves a DRAFT. It never invents a value: a missing required field comes back as missing and the agent asks the administrator. Nothing is sent from here: a draft goes through
// the approval steps in routes/ask.ts first. Pay rates and holiday figures are administrators only, and the whole Ask feature is.
import type { AskTool } from './tools'
import { ownSource } from './sources'
import { loadStaff, ukToday } from './data'
import { saveDocument } from './store'
import { listTemplates, getTemplate, validate, render, resolveDefaults, DRAFT_NOTE, type Values } from '../letters'
import { prismaLetterSource } from '../letters/loader'
import { withHolidayLeaverDefaults } from '../letters/leaver'

const OWN = (label: string, today: string) => ownSource(`${label} (CareStream records)`, today)
const fail = (message: string) => ({ data: { error: message }, sources: [] })
export const cleanValuesForTest = (v: unknown): Values => cleanValues(v)
const cleanValues = (v: unknown): Values => {
  const out: Values = {}
  if (v && typeof v === 'object') for (const [k, x] of Object.entries(v as Record<string, unknown>)) if (/^[a-z0-9_]{1,60}$/i.test(k) && (typeof x === 'string' || typeof x === 'number')) out[k] = x
  return out
}

/** The starting values for a letter and a person, with the leaver sums done by the entitlement calculator, then the administrator's own values on top. */
export async function mergedValues(o: { tenantId: string; userId: string; actorId: string; templateId: string; today: string; given: Values }) {
  const base = await resolveDefaults({ templateId: o.templateId, tenantId: o.tenantId, userId: o.userId, actorUserId: o.actorId, today: o.today, adminVerified: true }, prismaLetterSource())
  const leaver = await withHolidayLeaverDefaults({ templateId: o.templateId, tenantId: o.tenantId, userId: o.userId, today: o.today, values: { ...base.values, ...o.given } })
  return { values: { ...base.values, ...leaver.values, ...o.given } as Values, notes: { ...base.notes, ...leaver.notes }, working: leaver.working }
}

const staffProp = { staff_id: { type: 'string', description: 'The person\'s id from find_staff.' } }
export const LETTER_TOOLS: AskTool[] = [
  {
    name: 'find_staff',
    description: 'Find active staff by name (part of a name is fine). Returns id, name and job role. If more than one person matches, ask the administrator which one they mean. Use the id in the other tools.',
    input_schema: { type: 'object', properties: { name: { type: 'string' } }, required: ['name'] },
    async run(ctx, input) {
      const q = String(input?.name ?? '').trim().toLowerCase()
      if (q.length < 2) return fail('Please give at least two letters of the name.')
      const found = (await loadStaff(ctx.tenantId, ctx.today)).filter(s => s.name.toLowerCase().includes(q)).slice(0, 8)
      return { data: { matches: found.map(s => ({ id: s.id, name: s.name, job_role: s.job_role })), note: found.length > 1 ? 'More than one person matches: ask which one.' : found.length === 0 ? 'Nobody matches that name.' : null }, sources: [OWN('Staff records', ctx.today)] }
    },
  },
  {
    name: 'list_letter_templates',
    description: 'The letters you can draft: id, title, what it is for. Tier 1 letters only.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) { return { data: { letters: listTemplates().map(t => ({ id: t.id, title: t.title, category: t.category, description: t.description, who_for: t.whoFor })) }, sources: [] } },
  },
  {
    name: 'get_letter_fields',
    description: 'For one letter and one person: every merge field (key, label, type, whether it is required, choices), the value already known from the records (with where it came from) and the required fields still missing. Ask the administrator ONLY for what is missing.',
    input_schema: { type: 'object', properties: { template_id: { type: 'string' }, ...staffProp }, required: ['template_id', 'staff_id'] },
    async run(ctx, input) {
      const t = getTemplate(String(input?.template_id ?? ''))
      if (!t) return fail('That letter does not exist. Use list_letter_templates.')
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).find(s => s.id === String(input?.staff_id ?? ''))
      if (!staff) return fail('I could not find that person. Use find_staff first.')
      const m = await mergedValues({ tenantId: ctx.tenantId, userId: staff.id, actorId: ctx.userId, templateId: t.id, today: ctx.today, given: { recipient_name: staff.name, recipient_role: staff.job_role ?? '' } })
      const check = validate(t.id, m.values)
      return { data: { letter: t.title, person: staff.name, fields: t.fields.map(f => ({ key: f.key, label: f.label, type: f.type, required: f.required, required_when: f.requiredWhen ?? null, choices: f.choices?.map(c => c.value) ?? null, help: f.help ?? null, known_value: m.values[f.key] ?? null, source: m.notes[f.key] ?? null })), still_missing: check.missing, unreadable: check.invalid.map(i => i.label), working: m.working }, method: 'Known values come from the staff record, the holiday records and the pay records. Anything not known must be asked for, never guessed.', sources: [OWN('Staff, holiday and pay records', ctx.today)] }
    },
  },
  {
    name: 'preview_letter',
    description: 'Render the finished letter as text with the values you give (on top of what is already known). Gaps show as [Label] and are listed in missing: if anything is missing, ask the administrator for it. Does not save anything.',
    input_schema: { type: 'object', properties: { template_id: { type: 'string' }, ...staffProp, values: { type: 'object', description: 'Field values by key, only ones the administrator gave you.' } }, required: ['template_id', 'staff_id'] },
    async run(ctx, input) {
      const t = getTemplate(String(input?.template_id ?? ''))
      if (!t) return fail('That letter does not exist.')
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).find(s => s.id === String(input?.staff_id ?? ''))
      if (!staff) return fail('I could not find that person.')
      const m = await mergedValues({ tenantId: ctx.tenantId, userId: staff.id, actorId: ctx.userId, templateId: t.id, today: ctx.today, given: { recipient_name: staff.name, recipient_role: staff.job_role ?? '', ...cleanValues(input?.values) } })
      const r = render(t.id, m.values)
      return { data: { ready_to_save: r.ok, missing: r.missing, unreadable: r.invalid.map(i => i.label), letter_text: r.text, before_you_send: r.beforeYouSend, note: DRAFT_NOTE, working: m.working }, sources: [OWN('Staff, holiday and pay records', ctx.today)] }
    },
  },
  {
    name: 'save_letter_draft',
    description: 'Save the letter as a DRAFT in the library for approval. Refused while any required field is missing. It is not sent and not final: an administrator reviews, approves and then shares it.',
    input_schema: { type: 'object', properties: { template_id: { type: 'string' }, ...staffProp, values: { type: 'object' } }, required: ['template_id', 'staff_id'] },
    async run(ctx, input) {
      const t = getTemplate(String(input?.template_id ?? ''))
      if (!t) return fail('That letter does not exist.')
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).find(s => s.id === String(input?.staff_id ?? ''))
      if (!staff) return fail('I could not find that person.')
      const m = await mergedValues({ tenantId: ctx.tenantId, userId: staff.id, actorId: ctx.userId, templateId: t.id, today: ctx.today, given: { recipient_name: staff.name, recipient_role: staff.job_role ?? '', ...cleanValues(input?.values) } })
      const r = render(t.id, m.values)
      if (!r.ok) return { data: { saved: false, missing: r.missing, unreadable: r.invalid.map(i => i.label), message: 'The letter is not finished, so it has not been saved. Ask the administrator for the missing details.' }, sources: [] }
      const id = await saveDocument(ctx.tenantId, ctx.userId, { type: 'letter', title: `${t.title}: ${staff.name}`, body: r.text, data: { template_id: t.id, staff_user_id: staff.id, staff_name: staff.name, values: m.values, before_you_send: r.beforeYouSend, references: r.references } })
      return { data: { saved: true, document_id: id, status: 'draft', next: 'Open it in the library to review, tick the checklist and submit it for approval.' }, sources: [] }
    },
  },
]
export { ukToday }
