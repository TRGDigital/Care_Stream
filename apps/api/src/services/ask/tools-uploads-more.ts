// The tools that read the other files an administrator can attach (a rota or timesheet, a holiday sheet, a training list, a letter, a newsletter).
// READ ONLY: they compare and read, they never change anything in CareStream. Administrators only (the manager allowlist does not list them and each tool checks the role).
// A file with people in it is used only after its names were matched and confirmed. No tool here handles sickness, health or resident level data.
import type { AskTool, ToolContext, ToolResult } from './tools'
import { ownSource, type AskSource } from './sources'
import { loadStaff, holidayYearRows } from './data'
import { loadForChat, staffLite, type Loaded } from './uploads/service'
import { toNumber } from './uploads/sheet'
import { compareRota, compareHolidaySheet, compareTraining, closestTemplates, letterShape, newsletterShape, type HoursRow, type HolidaySheetRow, type TrainingFileRow } from './uploads/calc-more'
import { buildTrainingMatrix } from '../../lib/training-matrix'
import { TEMPLATES } from '../letters/templates'
import { NEWSLETTER_TEMPLATES } from '../ask-docs/newsletter-templates'

const src = (name: string, ctx: ToolContext): AskSource => ownSource(`Uploaded file: ${name} (cleaned copy, sensitive columns removed)`, ctx.today)
const adminOnly = (ctx: ToolContext): ToolResult | null => ctx.role === 'manager' ? { data: { error: 'Uploaded files are for administrators only.' }, sources: [] } : null
const noFile = (waiting: Array<{ id: string; filename: string; why: string }>, what: string): ToolResult => ({ data: waiting.length ? { error: 'The file is not ready.', waiting } : { error: `There is no ${what} in this chat. Ask the administrator to attach one with the paperclip button.` }, sources: [] })
const idProp = { upload_id: { type: 'string', description: 'Which uploaded file, from upload_summary. Leave out to use the latest suitable file in this chat.' } }
const last = (files: Loaded[], kind: string) => { const l = files.filter(f => f.stored.doc_kind === kind); return l.length ? l[l.length - 1] : null }
const cell = (f: Loaded, r: string[], role: string) => { const i = (f.stored.roles as any)[role] as number | null | undefined; return i != null ? (r[i] ?? '') : '' }
const textOf = (f: Loaded) => f.stored.kind === 'document' ? (f.stored.text ?? '') : [f.stored.headers.join(' | '), ...f.stored.rows.map(r => r.join(' | '))].join('\n')
const needText = (files: Loaded[]) => { const l = files.filter(f => f.stored.kind === 'document'); return l.length ? l[l.length - 1] : (files.length ? files[files.length - 1] : null) }
async function ready(ctx: ToolContext, input: any) { return loadForChat(ctx.tenantId, ctx.userId, ctx.conversationId, input?.upload_id ? String(input.upload_id) : undefined) }

export const MORE_UPLOAD_TOOLS: AskTool[] = [
  {
    name: 'rota_hours_compare',
    description: 'Compares the hours in an uploaded rota or timesheet export with the contracted hours CareStream holds (or a contracted hours column in the file), person by person for the people the administrator matched. Lists who is over (overtime hours) and who is under, and totals. weeks says how many weeks the file covers (default 1); contracted hours are weekly.',
    input_schema: { type: 'object', properties: { ...idProp, weeks: { type: 'number', description: 'How many weeks the file covers. Ask if it is not clear.' } } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await ready(ctx, input)
      const f = last(files, 'rota') ?? last(files, 'payroll'); if (!f || !f.mapping) return noFile(waiting, 'rota or timesheet file')
      if (f.stored.roles.hours == null) return { data: { error: 'I could not find an hours column. The columns are: ' + f.stored.headers.join(', ') + '.' }, sources: [] }
      const rows: HoursRow[] = f.stored.rows.map((r, row) => ({ row, name: cell(f, r, 'name'), hours: toNumber(cell(f, r, 'hours')), contracted: f.stored.roles.contracted_hours != null ? toNumber(cell(f, r, 'contracted_hours')) : null })).filter(r => r.name.trim() !== '')
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).map(staffLite)
      const weeks = Math.max(1, Math.min(53, Number(input?.weeks) || 1))
      return { data: compareRota(rows, f.mapping, staff, weeks), method: `For each matched person: hours in the file minus contracted hours for the period (weekly contracted hours x ${weeks} week${weeks === 1 ? '' : 's'}, or the contracted hours column in the file). A quarter of an hour either way counts as on target. Overtime is hours above contract; short is hours below.`, sources: [src(f.stored.filename, ctx), ownSource('Staff records (contracted hours)', ctx.today)] }
    },
  },
  {
    name: 'holiday_sheet_compare',
    description: 'Compares an uploaded holiday sheet (for example from an old system) with the holiday balances CareStream holds for the current holiday year: allowance (with carried over), taken and remaining, person by person for matched people. Comparison only, nothing is changed. file_unit says whether the file is in hours or days; if it is days and CareStream holds hours, give hours_per_day.',
    input_schema: { type: 'object', properties: { ...idProp, file_unit: { type: 'string', enum: ['hours', 'days'] }, hours_per_day: { type: 'number' } } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await ready(ctx, input)
      const f = last(files, 'holiday'); if (!f || !f.mapping) return noFile(waiting, 'holiday sheet')
      const y = await holidayYearRows(ctx.tenantId, ctx.today)
      const cs = y.rows.map((r: any) => ({ user_id: r.user_id, name: r.name, unit: r.unit ?? 'hours', entitlement: Number(r.entitlement ?? 0), taken: Number(r.taken ?? 0), booked: Number(r.booked ?? 0), remaining: Number(r.remaining ?? 0) }))
      const csUnit = cs[0]?.unit ?? 'hours', fileUnit = String(input?.file_unit ?? '')
      if (fileUnit !== 'hours' && fileUnit !== 'days') return { data: { needs: 'file_unit', message: `Is the file in hours or in days? CareStream holds holiday in ${csUnit}. Ask the administrator.` }, sources: [] }
      let factor = 1
      if (fileUnit === 'days' && csUnit === 'hours') { const h = Number(input?.hours_per_day); if (!(h > 0)) return { data: { needs: 'hours_per_day', message: 'The file is in days and CareStream holds hours. How many hours is one day? Ask the administrator.' }, sources: [] }; factor = h }
      if (fileUnit === 'hours' && csUnit === 'days') return { data: { error: 'The file is in hours but CareStream holds days for these people, so I cannot compare them safely.' }, sources: [] }
      const rows: HolidaySheetRow[] = f.stored.rows.map((r, row) => ({ row, name: cell(f, r, 'name'), allowance: toNumber(cell(f, r, 'allowance')), taken: toNumber(cell(f, r, 'taken')), remaining: toNumber(cell(f, r, 'remaining')) })).filter(r => r.name.trim() !== '')
      return { data: { holiday_year: y.label, ...compareHolidaySheet(rows, f.mapping, cs, factor) }, method: 'For each matched person, the figure in the file against the same figure in CareStream for the current holiday year. Only approved holiday counts as taken (on or before today) or booked (after today). Differences of less than 0.01 count as the same. Remaining = allowance (with carried over) minus taken minus booked. Neither side is assumed to be right.', sources: [src(f.stored.filename, ctx), ownSource('Holiday records', ctx.today)] }
    },
  },
  {
    name: 'training_list_compare',
    description: 'Compares an uploaded training matrix or certificate list (name, course, completed or expiry date) with the training CareStream requires for each person\'s job role (the Training Matrix): who has a required course missing from the file, expired or expiring in the file, and where the file and CareStream disagree. Only for people the administrator matched.',
    input_schema: { type: 'object', properties: { ...idProp } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await ready(ctx, input)
      const f = last(files, 'training'); if (!f || !f.mapping) return noFile(waiting, 'training list')
      let m: Awaited<ReturnType<typeof buildTrainingMatrix>>
      try { m = await buildTrainingMatrix(ctx.tenantId) } catch { return { data: { error: 'The training matrix could not be read.' }, sources: [] } }
      if (!m.has_requirements) return { data: { error: 'No required training has been set up on the Training Matrix tab yet, so there is nothing to compare the list with.' }, sources: [ownSource('Training matrix', ctx.today)] }
      const rows: TrainingFileRow[] = f.stored.rows.map((r, row) => ({ row, name: cell(f, r, 'name'), course: cell(f, r, 'course'), completed: cell(f, r, 'completed') || null, expiry: cell(f, r, 'expiry') || null })).filter(r => r.name.trim() !== '' && r.course.trim() !== '')
      const lite = { columns: m.columns.map(c => ({ key: c.key, label: c.label })), rows: m.rows.filter(r => !r.is_agency).map(r => ({ user_id: r.user_id, name: r.name, job_role: r.job_role, cells: Object.fromEntries(Object.entries(r.cells).map(([k, c]: [string, any]) => [k, { required: !!c.required, status: String(c.status) }])) })) }
      return { data: compareTraining(rows, f.mapping, lite, ctx.today), method: 'Each required course for the person\'s job role (from the Training Matrix) is looked for in the file by course name (words in common, not an exact match). A course in the file with a date in the past is expired; within 60 days is expiring soon. A course with no expiry date in the file is listed separately. "File says in date but CareStream has a gap" and the reverse show where the two records disagree: check the certificate before changing either.', sources: [src(f.stored.filename, ctx), ownSource('Training matrix', ctx.today)] }
    },
  },
  {
    name: 'letter_upload_review',
    description: 'Reads an uploaded staff letter (names already replaced by [name], so none are kept): its structure, tone and length, and which approved CareStream letter templates it is closest to. Use it to suggest the matching template; you can only draft from the approved templates.',
    input_schema: { type: 'object', properties: { ...idProp } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await ready(ctx, input)
      const f = needText(files); if (!f) return noFile(waiting, 'letter')
      const t = textOf(f)
      const lite = TEMPLATES.map(x => ({ id: x.id, title: x.title, text: `${x.description} ${x.whoFor} ${x.subject} ${x.body.map((b: any) => b.text ?? '').join(' ')}` }))
      return { data: { shape: letterShape(t), closest_templates: closestTemplates(t, lite, 3), text_with_names_removed: t.slice(0, 3000), note: 'Staff names were replaced by [name] before this copy was kept.' }, method: 'Structure is counted from the text. The closest templates share the most words with the letter (title, description and wording).', sources: [src(f.stored.filename, ctx)] }
    },
  },
  {
    name: 'newsletter_upload_reuse',
    description: 'Reads an uploaded previous newsletter or text (staff names already replaced by [name]): its headings, length and bullet use, and which CareStream newsletter templates (and layouts) its headings fit best, so the structure and content can be reused for the next one.',
    input_schema: { type: 'object', properties: { ...idProp } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await ready(ctx, input)
      const f = needText(files); if (!f) return noFile(waiting, 'newsletter')
      const t = textOf(f)
      const lite = NEWSLETTER_TEMPLATES.map(x => ({ id: x.id, title: x.title, layout: x.layout, sections: x.sections.map(s => s.title) }))
      return { data: { shape: newsletterShape(t, lite), text_with_names_removed: t.slice(0, 4000), note: 'Staff names were replaced by [name] before this copy was kept. Names for the new issue come from the administrator\'s ticks, as always.' }, method: 'Headings are read from the text and compared with each template\'s section titles by words in common.', sources: [src(f.stored.filename, ctx)] }
    },
  },
]
