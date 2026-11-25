// The tools that read a file an administrator uploaded to this chat. READ ONLY: they compare and calculate, they never change anything in CareStream. Administrators
// only (the manager allowlist does not list them, and each tool checks the role as well). A file is used only after its names were matched and confirmed.
import type { AskTool, ToolContext, ToolResult } from './tools'
import { figuresFor, ownSource, type AskSource } from './sources'
import { loadStaff } from './data'
import { loadForChat, payRowsOf, staffLite, type Loaded } from './uploads/service'
import { comparePayroll, repricePayroll, costPerResidentDay, type Invoice, type FoodBenchmark } from './uploads/calc'
import { invoiceLines } from './uploads/columns'
import { prisma } from '../../db/client'
import type { NlwRow } from './calc'

const src = (name: string, ctx: ToolContext): AskSource => ownSource(`Uploaded file: ${name} (cleaned copy, sensitive columns removed)`, ctx.today)
const adminOnly = (ctx: ToolContext): ToolResult | null => ctx.role === 'manager' ? { data: { error: 'Uploaded files are for administrators only.' }, sources: [] } : null
const noFile = (waiting: Array<{ id: string; filename: string; why: string }>, what: string): ToolResult => ({ data: waiting.length ? { error: 'The file is not ready.', waiting } : { error: `There is no ${what} file in this chat. Ask the administrator to attach one with the paperclip button.` }, sources: [] })
const pct = (v: any) => Math.max(0, Math.min(60, Number.isFinite(Number(v)) ? Number(v) : 0))
const idProp = { upload_id: { type: 'string', description: 'Which uploaded file, from upload_summary. Leave out to use the latest suitable file in this chat.' } }

function pick(files: Loaded[], kind: 'payroll' | 'invoice'): Loaded | null {
  const list = files.filter(f => f.stored.doc_kind === kind)
  return list.length ? list[list.length - 1] : null
}

/** Invoice totals from every ready invoice file in the chat (and any the administrator typed). Documents give best effort totals the administrator must check. */
export function collectInvoices(files: Loaded[], typed: any): { lines: Invoice[]; dates: string[]; checks: string[]; periodFromText: { from: string | null; to: string | null } | null } {
  const lines: Invoice[] = [], dates: string[] = [], checks: string[] = []
  let periodFromText: { from: string | null; to: string | null } | null = null
  for (const f of files) {
    const base = f.stored.filename.replace(/\.[a-z0-9]+$/i, '')
    if (f.stored.kind === 'spreadsheet' && f.stored.doc_kind === 'invoice') {
      for (const l of invoiceLines({ kind: 'invoice', roles: f.stored.roles, name_columns: [], sheet: { name: f.stored.sheet_name ?? '', headers: f.stored.headers, rows: f.stored.rows, title_rows_skipped: 0 } }, base)) { lines.push({ supplier: l.supplier, amount: l.amount }); if (l.date) dates.push(l.date) }
    } else if (f.stored.kind === 'document' && f.stored.text_totals?.length) {
      const order = ['invoice total', 'total due', 'amount due', 'balance due', 'total payable', 'grand total', 'total']
      const t = [...f.stored.text_totals].sort((a, b) => order.indexOf(a.label) - order.indexOf(b.label))[0]
      lines.push({ supplier: base, amount: t.amount }); checks.push(`${f.stored.filename}: I read "${t.label}" as ${t.amount.toFixed(2)} from the text. Please check it is the right figure.`)
      if (f.stored.text_period?.from) periodFromText = f.stored.text_period
    }
  }
  for (const i of Array.isArray(typed) ? typed.slice(0, 30) : []) { const a = Number(i?.amount); if (Number.isFinite(a) && a >= 0) lines.push({ supplier: String(i?.supplier ?? 'Supplier').slice(0, 60), amount: a }) }
  return { lines, dates: dates.sort(), checks, periodFromText }
}

async function nlwRows(): Promise<{ current: NlwRow | null; upcoming: NlwRow | null; sources: AskSource[]; warning: string | null }> {
  const { figures, sources } = await figuresFor(['nlw'])
  const f = figures[0]
  return { current: f?.value?.current ?? null, upcoming: f?.value?.upcoming?.[0] ?? null, sources, warning: f?.usable ? (f?.warning ?? null) : 'The minimum wage figures could not be confirmed.' }
}

export const UPLOAD_TOOLS: AskTool[] = [
  {
    name: 'upload_summary',
    description: 'What the administrator has attached to this chat: each file, what kind it looks like (payroll, invoices, other), its columns and what each means, how many rows, which sensitive columns were removed on reading, and whether the names are matched and confirmed. Call this first when files are attached.',
    input_schema: { type: 'object', properties: {} },
    async run(ctx) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await loadForChat(ctx.tenantId, ctx.userId, ctx.conversationId)
      if (!files.length && !waiting.length) return { data: { files: [], note: 'Nothing is attached to this chat. The administrator can attach a spreadsheet, Word or PDF file with the paperclip button.' }, sources: [] }
      return {
        data: {
          files: files.map(f => ({ id: f.upload.id, filename: f.stored.filename, looks_like: f.stored.doc_kind, rows: f.stored.rows.length, columns: f.stored.headers.map((h, i) => ({ name: h, meaning: Object.entries(f.stored.roles).find(([, ix]) => ix === i)?.[0]?.replace(/_/g, ' ') ?? null })), sensitive_columns_removed: f.stored.dropped, names_confirmed: f.stored.doc_kind === 'payroll' ? !!f.upload.match?.confirmed_at : null, text_totals_found: f.stored.text_totals ?? null, first_rows: f.stored.doc_kind === 'other' ? f.stored.rows.slice(0, 5) : undefined, expires: f.upload.expires_at })),
          waiting,
        },
        method: 'Read from the cleaned copy of each file. Sensitive columns (bank details, National Insurance numbers, addresses, dates of birth, phone numbers, emails, health columns and notes) were removed when the file was read and were never kept.',
        sources: files.map(f => src(f.stored.filename, ctx)),
      }
    },
  },
  {
    name: 'payroll_compare',
    description: 'Compares the hourly rate in an uploaded payroll file with the weekday hourly rate CareStream holds, person by person (people whose names the administrator matched). Lists the differences, with their effect over the hours in the file when it has hours, people only in the file, and staff not in the file. Changes nothing in CareStream.',
    input_schema: { type: 'object', properties: { ...idProp } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await loadForChat(ctx.tenantId, ctx.userId, ctx.conversationId, input?.upload_id ? String(input.upload_id) : undefined)
      const f = pick(files, 'payroll'); if (!f || !f.mapping) return noFile(waiting, 'payroll')
      if (f.stored.roles.rate == null) return { data: { error: 'I could not find an hourly rate column in this file. Its columns are: ' + f.stored.headers.join(', ') + '.' }, sources: [] }
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).map(staffLite)
      const r = comparePayroll(payRowsOf(f.stored), f.mapping, staff)
      return { data: r, method: 'For each matched person, the hourly rate in the file minus the weekday hourly rate CareStream holds. Differences of less than half a penny count as the same. The effect is the difference times the hours in the file (only where the file has hours). CareStream weekend rates are shown but not compared. Nothing was changed.', sources: [src(f.stored.filename, ctx), ownSource('Staff pay rates (CareStream records)', ctx.today)] }
    },
  },
  {
    name: 'payroll_reprice_nlw',
    description: 'Re-prices an uploaded payroll at a National Living Wage or National Minimum Wage rate: who in the file would need to move up, by how much an hour, and what that costs over the hours in the file (or per week on contracted hours when the file has no hours). target is "upcoming" (the next announced rise), "current", or "custom" with custom_rates. Ages come from CareStream. Also lists anyone in the file already below the current minimum. Optional on costs percentage.',
    input_schema: { type: 'object', properties: { ...idProp, target: { type: 'string', enum: ['upcoming', 'current', 'custom'] }, custom_rates: { type: 'object', properties: { age21: { type: 'number' }, age18to20: { type: 'number' }, under18: { type: 'number' } } }, on_cost_percent: { type: 'number', description: 'Employer on costs as a percentage of pay. Only use a number the administrator gave.' } } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await loadForChat(ctx.tenantId, ctx.userId, ctx.conversationId, input?.upload_id ? String(input.upload_id) : undefined)
      const f = pick(files, 'payroll'); if (!f || !f.mapping) return noFile(waiting, 'payroll')
      if (f.stored.roles.rate == null) return { data: { error: 'I could not find an hourly rate column in this file. Its columns are: ' + f.stored.headers.join(', ') + '.' }, sources: [] }
      const n = await nlwRows()
      if (!n.current) return { data: { error: 'The current minimum wage figures are not available, so I cannot re-price.' }, sources: n.sources }
      let target: NlwRow | null = null, label = ''
      const t = String(input?.target ?? 'upcoming')
      if (t === 'custom') { const c = input?.custom_rates ?? {}; if (!(Number(c.age21) > 0)) return { data: { error: 'Please give the rate for the 21 and over band, for example 13.50.' }, sources: [] }; target = { age21: Number(c.age21), age18to20: Number(c.age18to20) || n.current.age18to20, under18: Number(c.under18) || n.current.under18 }; label = 'rates the administrator gave' }
      else if (t === 'current') { target = n.current; label = 'the current rates' }
      else if (n.upcoming) { target = n.upcoming; label = `the rates announced from ${n.upcoming.from ?? 'a later date'}` }
      else { target = n.current; label = 'the current rates (no rise has been announced yet)' }
      const staff = (await loadStaff(ctx.tenantId, ctx.today)).map(staffLite)
      const r = repricePayroll(payRowsOf(f.stored), f.mapping, staff, target!, n.current, pct(input?.on_cost_percent))
      return { data: { target_rates: target, target_label: label, ...r, minimum_wage_warning: n.warning }, method: `Each matched person is checked against the rate for their age band in ${label}. Only people paid below that rate move up to it; the cost is the rise an hour times their hours ${r.hours_basis === 'hours_in_file' ? 'in the file' : '(the file has no hours, so contracted weekly hours from CareStream)'}${r.on_cost_percent ? `, plus ${r.on_cost_percent}% on costs` : ', with no on costs'}. Ages come from CareStream records.`, sources: [...n.sources, src(f.stored.filename, ctx), ownSource('Staff ages and hours (CareStream records)', ctx.today)] }
    },
  },
  {
    name: 'invoice_cost_per_resident_day',
    description: 'Works out what the service spends per resident per day (and per week) from uploaded supplier invoices (for example a supermarket and a food wholesaler) or totals the administrator types, and compares it with the council cost of care food benchmark from the data sources register (brought to today with food price inflation when the register allows it). The number of residents is a choice: call it first without residents_basis and the tool will return the options; the administrator picks. Totals are used as given, so tell them if the invoices may include more than food.',
    input_schema: { type: 'object', properties: { ...idProp, invoices: { type: 'array', items: { type: 'object', properties: { supplier: { type: 'string' }, amount: { type: 'number' } } }, description: 'Totals the administrator typed, when they did not upload a file.' }, period_from: { type: 'string', description: 'YYYY-MM-DD' }, period_to: { type: 'string', description: 'YYYY-MM-DD' }, residents_basis: { type: 'string', enum: ['current_residents', 'average_stated'] }, average_residents: { type: 'number', description: 'The average number of residents over the period, when basis is average_stated.' } } },
    async run(ctx, input) {
      const g = adminOnly(ctx); if (g) return g
      const { files, waiting } = await loadForChat(ctx.tenantId, ctx.userId, ctx.conversationId, input?.upload_id ? String(input.upload_id) : undefined)
      const inv = collectInvoices(files, input?.invoices)
      if (!inv.lines.length) return noFile(waiting, 'invoice')
      let from = String(input?.period_from ?? ''), to = String(input?.period_to ?? ''), periodNote = 'given by the administrator'
      const iso = (s: string) => /^\d{4}-\d{2}-\d{2}$/.test(s)
      if (!iso(from) || !iso(to)) {
        const d = inv.dates.length ? { from: inv.dates[0], to: inv.dates[inv.dates.length - 1] } : inv.periodFromText?.from ? inv.periodFromText : null
        if (d?.from && d?.to) { from = d.from; to = d.to; periodNote = 'worked out from the dates in the file: please check it' }
        else return { data: { needs: 'period', message: 'I need the period the invoices cover, for example 1 to 31 October 2026. Ask the administrator for the first and last day.', invoices_found: inv.lines.length }, sources: [] }
      }
      const living = await (prisma as any).resident.count({ where: { tenant_id: ctx.tenantId, status: 'living', archived_at: null } }).catch(() => null)
      const basis = String(input?.residents_basis ?? '')
      if (basis !== 'current_residents' && basis !== 'average_stated') {
        return { data: { needs: 'residents_basis', message: 'Which number of residents should I use? Ask the administrator to choose.', options: [{ id: 'current_residents', residents: living, note: 'The number of residents living in the home today. Quick, but it may differ from the average over the period.' }, { id: 'average_stated', note: 'The administrator tells you the average number of residents over the period (for example from the occupancy report). More accurate.' }], period: { from, to, how: periodNote } }, sources: [] }
      }
      const residents = basis === 'current_residents' ? Number(living) : Number(input?.average_residents)
      if (!(residents > 0)) return { data: { needs: 'residents_basis', message: basis === 'current_residents' ? 'There are no residents recorded as living in the home, so I cannot use that basis. Ask for the average number instead.' : 'Please give the average number of residents over the period.' }, sources: [] }
      const { figures, sources } = await figuresFor(['care_food_cost'])
      const fig = figures[0]
      const b = fig?.usable && fig.value ? (fig.value as FoodBenchmark) : null
      const r: any = costPerResidentDay({ invoices: inv.lines, from, to, residents, benchmark: b })
      if (r.error) return { data: r, sources: [] }
      return {
        data: { ...r, residents_basis: basis === 'current_residents' ? 'residents living in the home today' : 'average given by the administrator', period_how: periodNote, check_these: inv.checks, benchmark_note: b ? 'The benchmark is a council cost of care figure (median food supplies per resident per week, residential care for people aged 65 and over), in the prices of its exercise year. It is a benchmark, not a supplier price list.' : 'The food cost benchmark is not available in the data sources register just now, so there is no comparison.', benchmark_warning: fig?.warning ?? null, invoices_may_include_more_than_food: true },
        method: `Total of the invoices ${r.total_spend.toFixed(2)} divided by resident days (${r.residents_used} residents x ${r.period.days} days = ${r.resident_days}) gives the cost per resident per day; times 7 for a week. ${b ? 'The benchmark is brought forward with the ONS food price index when the register holds both index values, and is labelled either way.' : ''}`,
        sources: [...sources, ...files.map(f => src(f.stored.filename, ctx)), ownSource('Residents living today (CareStream records)', ctx.today)],
      }
    },
  },
]
