// The staff newsletter agent's tools. Internal staff newsletters only. Data comes as counts and first names (never pay, health or anything negative about a person), the draft
// is checked against the house rules before it is saved, and saving makes a DRAFT: it goes through the approval steps before it is shared.
import type { AskTool } from './tools'
import { ownSource } from './sources'
import { loadNewStarters, loadBirthdaysThisMonth, loadTrainingCompletions, whoIsOff, weekOf, addDays } from './data'
import { saveDocument } from './store'
import { NEWSLETTER_TEMPLATES, NEWSLETTER_CHECKLIST, newsletterTemplate, lintNewsletter } from '../ask-docs/newsletter-templates'

const OWN = (label: string, today: string) => ownSource(`${label} (CareStream records)`, today)

export const NEWSLETTER_TOOLS: AskTool[] = [
  {
    name: 'list_newsletter_templates',
    description: 'The staff newsletter templates and their sections. Use to offer a choice and to know which sections can be filled from data.',
    input_schema: { type: 'object', properties: {} },
    async run() { return { data: { templates: NEWSLETTER_TEMPLATES, accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST }, sources: [] } },
  },
  {
    name: 'newsletter_data',
    description: 'Facts for newsletter sections from this home\'s records: new_starters (name, role, start date, last 60 days), birthdays (first names and the day of the month, this month, only if birthday greetings are switched on), training (courses completed in the last 30 days, counts only) and holiday (the next 8 weeks: how many people are off each week, counts only, no names). Pick the sections you need.',
    input_schema: { type: 'object', properties: { sections: { type: 'array', items: { type: 'string', enum: ['new_starters', 'birthdays', 'training', 'holiday'] } } }, required: ['sections'] },
    async run(ctx, input) {
      const want = new Set<string>(Array.isArray(input?.sections) ? input.sections.map(String) : [])
      const data: Record<string, unknown> = {}
      if (want.has('new_starters')) data.new_starters = await loadNewStarters(ctx.tenantId, 60, ctx.today)
      if (want.has('birthdays')) { const b = await loadBirthdaysThisMonth(ctx.tenantId, ctx.today); data.birthdays = b.enabled ? b.people : 'Not available: birthday greetings are switched off for this account, so birthdays are not included.' }
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
      const problems = lintNewsletter(`${title}\n${body}`)
      if (problems.length) return { data: { saved: false, problems, message: 'Not saved. Fix these and try again.' }, sources: [] }
      const tpl = newsletterTemplate(String(input?.template_id ?? ''))
      const id = await saveDocument(ctx.tenantId, ctx.userId, { type: 'newsletter', title, body, data: { template_id: tpl?.id ?? null, checklist: NEWSLETTER_CHECKLIST } })
      return { data: { saved: true, document_id: id, status: 'draft', next: 'Open it in the library to review, edit, submit for approval and then share it with your staff.' }, sources: [] }
    },
  },
]
