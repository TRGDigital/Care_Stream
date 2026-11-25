// The staff newsletter agent's tools. Internal staff newsletters only. Data comes as counts and first names (never pay, health or anything negative about a person), the draft
// is checked against the house rules before it is saved, and saving makes a DRAFT: it goes through the approval steps before it is shared.
import type { AskTool } from './tools'
import { ownSource, figuresFor } from './sources'
import { loadNewStarters, loadBirthdaysThisMonth, loadAnniversariesThisMonth, loadTrainingCompletions, whoIsOff, weekOf, addDays } from './data'
import { loadEnrolments } from './tools-people'
import { dueAndOverdue } from './people-calc'
import { saveDocument } from './store'
import { NEWSLETTER_TEMPLATES, NEWSLETTER_CHECKLIST, NEWSLETTER_CATEGORIES, newsletterTemplate, newsletterMenu, matchNewsletterTypes, lintNewsletter, lintOptionsFor } from '../ask-docs/newsletter-templates'

const OWN = (label: string, today: string) => ownSource(`${label} (CareStream records)`, today)

/** The official national rates (pounds an hour, every age band, current and announced) a minimum wage newsletter may quote. Empty when the register cannot confirm them. */
export async function nationalRateNumbers(): Promise<number[]> {
  try {
    const f = (await figuresFor(['nlw'])).figures[0]
    if (!f?.usable) return []
    const rows = [f.value?.current, ...(Array.isArray(f.value?.upcoming) ? f.value.upcoming : [])].filter(Boolean)
    return rows.flatMap((r: any) => [r.age21, r.age18to20, r.under18, r.apprentice]).filter((n: unknown): n is number => typeof n === 'number')
  } catch { return [] }
}
/** The checks a newsletter is saved or edited with: its template decides whether care words and the national rates are allowed. */
export async function lintForTemplate(text: string, templateId?: string | null): Promise<string[]> {
  const t = templateId ? newsletterTemplate(templateId) : undefined
  return lintNewsletter(text, lintOptionsFor(templateId, t?.national_rates ? await nationalRateNumbers() : []))
}

export const NEWSLETTER_TOOLS: AskTool[] = [
  {
    name: 'list_newsletter_templates',
    description: 'ALWAYS call this first with query set to the administrator\'s own words (for example "employee of the month newsletter"): it returns the best matching newsletter types, best first, and you offer THAT type, never a different one. The staff newsletter library: 25 newsletter types in 4 categories (whole-team, compliance-care, rota-pay, culture), each in short, standard and detailed layouts. With no input it returns the menu (categories, types and the layout ids). With category it returns that category\'s types; with template_id (or type) it returns the full sections, which are filled from data and by which tool, the people who need ticking, and any heads up to give the administrator. Use it to offer 3 or 4 matching templates and to know how to fill one.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'The administrator\'s own words for the newsletter, for example "employee of the month". Always pass this first: it returns the best matching types, best first.' }, category: { type: 'string', enum: NEWSLETTER_CATEGORIES.map(c => c.id) }, type: { type: 'string' }, template_id: { type: 'string' } } },
    async run(_ctx, input) {
      const id = String(input?.template_id ?? '').trim(), type = String(input?.type ?? '').trim(), cat = String(input?.category ?? '').trim(), query = String(input?.query ?? '').trim()
      if (query && !id && !type) { const matches = matchNewsletterTypes(query); if (matches.length) return { data: { best_matches: matches.map(m => ({ ...m, layouts: NEWSLETTER_TEMPLATES.filter(x => x.type === m.type).map(x => ({ id: x.id, layout: x.layout, sections: x.sections.length })) })), note: 'Offer the first match unless the administrator\'s words clearly fit another. Never offer a different type that does not match their words.', accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST }, sources: [] } }
      if (id) { const t = newsletterTemplate(id); return { data: t ? { template: t, accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST } : { error: 'No template has that id. Call this tool with no input for the menu.' }, sources: [] } }
      if (type) { const list = NEWSLETTER_TEMPLATES.filter(t => t.type === type); return { data: list.length ? { templates: list, accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST } : { error: 'No newsletter type has that name. Call this tool with no input for the menu.' }, sources: [] } }
      const menu = newsletterMenu().filter(m => !cat || m.id === cat)
      return { data: { categories: menu, accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST }, sources: [] }
    },
  },
  {
    name: 'newsletter_data',
    description: 'Facts for newsletter sections from this home\'s records: new_starters (name, role, start date, last 60 days), birthdays (first names and the day of the month, this month, only if birthday greetings are switched on, the month and day only, never an age), anniversaries (first names, the day and whole years of service this month), training_due (per course, how many people have it due soon or expiring in the next 30 days: counts only, no names), training (courses completed in the last 30 days, counts only) and holiday (the next 8 weeks: how many people are off each week, counts only, no names). Pick the sections you need.',
    input_schema: { type: 'object', properties: { sections: { type: 'array', items: { type: 'string', enum: ['new_starters', 'birthdays', 'anniversaries', 'training', 'training_due', 'holiday'] } } }, required: ['sections'] },
    async run(ctx, input) {
      const want = new Set<string>(Array.isArray(input?.sections) ? input.sections.map(String) : [])
      const data: Record<string, unknown> = {}
      if (want.has('new_starters')) data.new_starters = await loadNewStarters(ctx.tenantId, 60, ctx.today)
      if (want.has('birthdays')) { const b = await loadBirthdaysThisMonth(ctx.tenantId, ctx.today); data.birthdays = b.enabled ? b.people : 'Not available: birthday greetings are switched off for this account, so birthdays are not included.' }
      if (want.has('anniversaries')) data.anniversaries = await loadAnniversariesThisMonth(ctx.tenantId, ctx.today)
      if (want.has('training_due')) {
        const due = dueAndOverdue(await loadEnrolments(ctx.tenantId), ctx.today, 30).filter(i => i.kind === 'due_soon' || i.kind === 'expiring')
        const per = new Map<string, number>(); for (const i of due) per.set(i.course, (per.get(i.course) ?? 0) + 1)
        data.training_due = { total: due.length, courses: [...per].map(([course, people]) => ({ course, people })).sort((a, b) => b.people - a.people).slice(0, 8) }
      }
      if (want.has('training')) data.training = await loadTrainingCompletions(ctx.tenantId, 30, ctx.today)
      if (want.has('holiday')) {
        const rows = await whoIsOff(ctx.tenantId, ctx.today, addDays(ctx.today, 55))
        const weeks = new Map<string, Set<string>>()
        for (const r of rows) if (r.status === 'approved') { const w = weekOf(r.day); weeks.set(w, (weeks.get(w) ?? new Set()).add(r.name)) }
        data.holiday = [...weeks].map(([week_starting, s]) => ({ week_starting, people_off: s.size })).sort((a, b) => a.week_starting.localeCompare(b.week_starting))
      }
      return { data, method: 'Counts and first names only. Do not name anyone in a negative or private context.', sources: [OWN('Staff, training and holiday records', ctx.today)] }
    },
  },
  {
    name: 'save_newsletter_draft',
    description: 'Save the finished newsletter as a DRAFT in the library for approval. body is plain text: ## for a heading, - for a bullet, blank lines between paragraphs. It is refused if it breaks the house rules (dashes, health or pay content, superlatives): fix and try again. Nothing is sent from here.',
    input_schema: { type: 'object', properties: { title: { type: 'string' }, template_id: { type: 'string' }, body: { type: 'string' } }, required: ['title', 'body'] },
    async run(ctx, input) {
      const title = String(input?.title ?? '').trim().slice(0, 120), body = String(input?.body ?? '').trim()
      if (!title || body.length < 40) return { data: { saved: false, message: 'Please give a title and the newsletter text.' }, sources: [] }
      const problems = await lintForTemplate(`${title}\n${body}`, String(input?.template_id ?? ''))
      if (problems.length) return { data: { saved: false, problems, message: 'Not saved. Fix these and try again.' }, sources: [] }
      const tpl = newsletterTemplate(String(input?.template_id ?? ''))
      const id = await saveDocument(ctx.tenantId, ctx.userId, { type: 'newsletter', title, body, data: { template_id: tpl?.id ?? null, checklist: NEWSLETTER_CHECKLIST } })
      return { data: { saved: true, document_id: id, status: 'draft', next: 'Open it in the library to review, edit, submit for approval and then share it with your staff.' }, sources: [] }
    },
  },
]
