// The staff newsletter agent's tools. Internal staff newsletters only. Data comes as counts and first names (never pay, health or anything negative about a person), the draft
// is checked against the house rules before it is saved, and saving makes a DRAFT: it goes through the approval steps before it is shared.
import type { AskTool } from './tools'
import { ownSource, figuresFor } from './sources'
import { loadNewStarters, loadBirthdaysThisMonth, loadAnniversariesThisMonth, loadTrainingCompletions, whoIsOff, weekOf, addDays } from './data'
import { loadEnrolments } from './tools-people'
import { dueAndOverdue } from './people-calc'
import { saveDocument, getDocumentFor, updateDocumentContent } from './store'
import { canEdit } from '../ask-docs/workflow'
import { applyOp, listItems, PALETTES, BLOCK_TYPES, type Op } from '../ask-docs/newsletter-edit'
import { writeAuditLog } from '../../lib/audit'
import { photoAllowedFor, photoChoice, resolvePerson, staffHasPicture, CONSENT_QUESTION, MAX_FEATURED, giftAllowedFor, lintGift, giftKey, GIFT_IMAGE_ID } from '../ask-docs/newsletter-photo'
import { downloadFile } from '../storage/s3'
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
export async function lintForTemplate(text: string, templateId?: string | null, extra: { allowMoney?: boolean } = {}): Promise<string[]> {
  const t = templateId ? newsletterTemplate(templateId) : undefined
  return lintNewsletter(text, { ...lintOptionsFor(templateId, t?.national_rates ? await nationalRateNumbers() : []), ...extra })
}

export const NEWSLETTER_TOOLS: AskTool[] = [
  {
    name: 'list_newsletter_templates',
    description: 'ALWAYS call this first with query set to the administrator\'s own words (for example "employee of the month newsletter"): it returns the best matching newsletter types, best first, and you offer THAT type, never a different one. The staff newsletter library: 25 newsletter types in 4 categories (whole-team, compliance-care, rota-pay, culture), each in short, standard and detailed layouts. With no input it returns the menu (categories, types and the layout ids). With category it returns that category\'s types; with template_id (or type) it returns the full sections, which are filled from data and by which tool, the people who need ticking, and any heads up to give the administrator. Use it to offer 3 or 4 matching templates and to know how to fill one.',
    input_schema: { type: 'object', properties: { query: { type: 'string', description: 'The administrator\'s own words for the newsletter, for example "employee of the month". Always pass this first: it returns the best matching types, best first.' }, category: { type: 'string', enum: NEWSLETTER_CATEGORIES.map(c => c.id) }, type: { type: 'string' }, template_id: { type: 'string' } } },
    async run(_ctx, input) {
      const id = String(input?.template_id ?? '').trim(), type = String(input?.type ?? '').trim(), cat = String(input?.category ?? '').trim(), query = String(input?.query ?? '').trim()
      if (query && !id && !type) { const matches = matchNewsletterTypes(query); if (matches.length) return { data: { best_matches: matches.map(m => ({ ...m, layouts: NEWSLETTER_TEMPLATES.filter(x => x.type === m.type).map(x => ({ id: x.id, layout: x.layout, sections: x.sections.length })) })), note: 'Offer the first match unless the administrator\'s words clearly fit another. Never offer a different type that does not match their words.', accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST }, sources: [] } }
      if (id) { const t = newsletterTemplate(id); return { data: t ? { template: t, takes_photo: photoAllowedFor(t.id), accuracy_and_tone_checklist: NEWSLETTER_CHECKLIST } : { error: 'No template has that id. Call this tool with no input for the menu.' }, sources: [] } }
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
    input_schema: { type: 'object', properties: { title: { type: 'string' }, template_id: { type: 'string' }, body: { type: 'string' }, photo_user_id: { type: 'string', description: 'The staff id of the person whose picture goes in the newsletter (the staff id from the question form answer). Only for employee of the month, staff stories, new starters and leavers.' }, photo_person_name: { type: 'string', description: 'Their full name, only if you have no staff id.' }, photo_consent: { type: 'boolean', description: 'true ONLY when the administrator answered yes to "They are happy to be named and photographed" in the question form. Never guess it.' }, featured: { type: 'array', maxItems: 8, description: 'Use this when MORE THAN ONE person is featured (two employees of the month): one entry per person with their staff id (from the Staff ids line) and consent true ONLY if that person agreed. Each person needs their own yes. Replaces photo_user_id.', items: { type: 'object', properties: { user_id: { type: 'string' }, consent: { type: 'boolean' } }, required: ['user_id', 'consent'] } }, gift_text: { type: 'string', description: 'OPTIONAL. What the gift is, in a few words (for example "A £25 voucher and a day of extra leave"). A pound value is allowed here. Only for employee of the month, staff stories and recognition. Leave it out when there is no gift.' }, gift_image_id: { type: 'string', description: 'OPTIONAL. The id of a gift picture the administrator uploaded in the form (png, jpg or webp, up to 1 MB). Without one the newsletter shows a gift icon.' } }, required: ['title', 'body'] },
    async run(ctx, input) {
      const title = String(input?.title ?? '').trim().slice(0, 120), body = String(input?.body ?? '').trim()
      if (!title || body.length < 40) return { data: { saved: false, message: 'Please give a title and the newsletter text.' }, sources: [] }
      const problems = await lintForTemplate(`${title}\n${body}`, String(input?.template_id ?? ''))
      if (problems.length) return { data: { saved: false, problems, message: 'Not saved. Fix these and try again.' }, sources: [] }
      const tpl = newsletterTemplate(String(input?.template_id ?? ''))
      // A picture of one person: only for the types that carry one, only with a recorded yes, only an active member of staff of this account. Refused BEFORE anything is saved.
      let photos: Record<string, unknown>[] = [], photoInfo: Record<string, unknown> | undefined
      const asked: Array<{ user_id?: unknown; name?: unknown; consent: unknown }> = Array.isArray(input?.featured) && input.featured.length
        ? input.featured.slice(0, MAX_FEATURED).map((f: any) => ({ user_id: f?.user_id, consent: f?.consent }))
        : (input?.photo_user_id || input?.photo_person_name) ? [{ user_id: input.photo_user_id, name: input.photo_person_name, consent: input.photo_consent }] : []
      if (asked.length) {
        if (!photoAllowedFor(tpl?.id)) return { data: { saved: false, message: 'A person\'s picture can only go in an employee of the month, staff story, new starters or leavers newsletter.' }, sources: [] }
        const people: Array<{ name: string; picture: string }> = []
        for (const a of asked) {   // each person needs their own recorded yes, and nothing is saved if any one is missing
          const ch0 = photoChoice({ userId: 'x', consent: a.consent, actorId: ctx.userId })
          if (!ch0.ok) return { data: { saved: false, message: `Not saved. ${ch0.reason} Each featured person needs their own yes.` }, sources: [] }
          const who = await resolvePerson(ctx.tenantId, { user_id: a.user_id, name: a.name })
          if (!who.ok) return { data: { saved: false, message: `Not saved. ${who.reason}` }, sources: [] }
          const ch = photoChoice({ userId: who.id, consent: true, actorId: ctx.userId })
          if (ch.ok && !photos.some(x => x.user_id === who.id)) { photos.push(ch.photo as unknown as Record<string, unknown>); people.push({ name: who.name, picture: (await staffHasPicture(ctx.tenantId, who.id)) ? 'included' : 'none_on_file' }) }
        }
        const missing = people.filter(x => x.picture === 'none_on_file').map(x => x.name)
        photoInfo = { people, note: `Their staff pictures are in the designed newsletter, the PDF and the hub, large and round, side by side. Email shows initials and says the photos are in the hub and the PDF.${missing.length ? ` ${missing.join(' and ')} ${missing.length === 1 ? 'has' : 'have'} no staff picture yet, so initials show. Tell the administrator plainly, and offer two choices: carry on with initials, or add a picture first (Staff, open their profile, Picture): it then appears by itself.` : ''}` }
      }
      // The optional gift: only for the types that carry one, the words follow the newsletter rules (a pound value is allowed here), the picture must be one this account uploaded.
      let gift: Record<string, unknown> | null = null
      const giftText = String(input?.gift_text ?? '').trim(), giftImage = String(input?.gift_image_id ?? '').trim()
      if (giftText || giftImage) {
        if (!giftAllowedFor(tpl?.id)) return { data: { saved: false, message: 'A gift can only go in an employee of the month, staff story or recognition newsletter.' }, sources: [] }
        const gp = lintGift(giftText); if (gp.length) return { data: { saved: false, problems: gp, message: 'Not saved. Fix the gift description and try again.' }, sources: [] }
        if (giftImage) { if (!GIFT_IMAGE_ID.test(giftImage)) return { data: { saved: false, message: 'That gift picture id is not valid. Ask the administrator to upload the picture again.' }, sources: [] }
          try { await downloadFile(giftKey(ctx.tenantId, giftImage)) } catch { return { data: { saved: false, message: 'That gift picture was not found for this account. Ask the administrator to upload it again.' }, sources: [] } } }
        gift = { text: giftText, image_id: giftImage || null }
      }
      const id = await saveDocument(ctx.tenantId, ctx.userId, { type: 'newsletter', title, body, data: { template_id: tpl?.id ?? null, checklist: NEWSLETTER_CHECKLIST, ...(photos.length ? { photos, photo: photos[0] } : {}), ...(gift ? { gift } : {}) } })
      return { data: { saved: true, document_id: id, status: 'draft', ...(photoInfo ? { photo: photoInfo } : {}), next: 'Open it in the library to review, edit, submit for approval and then share it with your staff.' }, sources: [] }
    },
  },
  {
    name: 'set_newsletter_style',
    description: 'Change the COLOURS of a newsletter DRAFT the administrator already has (use the document id from save_newsletter_draft). accent: the colour of the whole newsletter, either a palette id (teal, ocean, forest, plum, berry, terracotta, bronze, slate) or a hex such as #1D4E89, or "default" to go back to the brand or category colour; pale colours that cannot be read on white are refused. block_id with block_style (soft, bold, outline or none, or "default") changes ONE block; reset_block_styles true puts every block back. Words such as "make it blue" mean you pick the nearest palette (blue is ocean, green is forest, purple is plum, pink is berry, orange is terracotta, yellow or gold is bronze, grey is slate) and say which one you chose. Administrators only; never changes the words. After it, give next step buttons including "Change colours".',
    input_schema: { type: 'object', properties: { document_id: { type: 'string' }, accent: { type: 'string' }, block_id: { type: 'string' }, block_style: { type: 'string', enum: ['soft', 'bold', 'outline', 'none', 'default'] }, reset_block_styles: { type: 'boolean' } }, required: ['document_id'] },
    async run(ctx, input) {
      const d = await getDocumentFor(ctx.tenantId, ctx.userId, String(input?.document_id ?? ''))
      if (!d || d.type !== 'newsletter') return { data: { saved: false, message: 'That newsletter was not found.' }, sources: [] }
      const ed = canEdit(d as any, ctx.userId); if (!ed.ok) return { data: { saved: false, message: ed.reason }, sources: [] }
      let state = { body: d.body as string, data: d.data ?? {} }
      const ops: Op[] = []
      if (typeof input?.accent === 'string' && input.accent.trim()) { const a = input.accent.trim(); const pal = PALETTES.find(x => x.id === a.toLowerCase()); ops.push({ op: 'accent', accent: a.toLowerCase() === 'default' ? null : pal ? pal.accent : a }) }
      if (input?.reset_block_styles === true) ops.push({ op: 'reset_styles' })
      if (input?.block_id) ops.push({ op: 'style', id: String(input.block_id), style: input?.block_style === 'default' ? null : String(input?.block_style ?? '') })
      if (!ops.length) return { data: { saved: false, message: 'Say what to change: the overall colour, or a block and its look.', palettes: PALETTES, blocks: listItems(state.body, state.data).map(i => ({ id: i.id, title: i.title, style: i.style })) }, sources: [] }
      for (const op of ops) { const r = applyOp(state, op); if (!r.ok) return { data: { saved: false, message: r.message }, sources: [] }; state = r.state }
      await updateDocumentContent(ctx.tenantId, d.id, { data: state.data })
      void writeAuditLog({ tenant_id: ctx.tenantId, user_id: ctx.userId, event_type: 'ask_newsletter_edited', entity_type: 'ask_document', entity_id: d.id, metadata: { op: 'style', by: 'agent' } })
      return { data: { saved: true, accent: state.data?.accent ?? null, next_steps_required: true, next: 'The designed newsletter shows the new colours. Say in one line what you changed, then give next step buttons.' }, sources: [] }
    },
  },
  {
    name: 'add_newsletter_block',
    description: 'Add a block of the administrator\'s own to a newsletter DRAFT (use the document id from save_newsletter_draft). type: text (heading, text), quote (text, who), callout (title, text, icon), button (label, and either kind hub or kind url with an https address), numbers (items: 2 to 4 of {n, label}), list (heading, style bullets or ticks, items), dates (heading, rows of {date, what}). Pictures cannot be added from the chat: tell them to use Add a block, Picture and text in the document panel. after_id is the id of the block it follows (leave empty for the very top). The words go through the newsletter house rules and are refused with the reason if they break them. Administrators only. After it, give next step buttons.',
    input_schema: { type: 'object', properties: { document_id: { type: 'string' }, type: { type: 'string', enum: ['text', 'quote', 'callout', 'button', 'numbers', 'list', 'dates'] }, content: { type: 'object' }, after_id: { type: 'string' } }, required: ['document_id', 'type', 'content'] },
    async run(ctx, input) {
      const d = await getDocumentFor(ctx.tenantId, ctx.userId, String(input?.document_id ?? ''))
      if (!d || d.type !== 'newsletter') return { data: { saved: false, message: 'That newsletter was not found.' }, sources: [] }
      const ed = canEdit(d as any, ctx.userId); if (!ed.ok) return { data: { saved: false, message: ed.reason }, sources: [] }
      if (String(input?.type) === 'picture_text') return { data: { saved: false, message: 'A picture cannot be added from the chat. Ask the administrator to open the newsletter and use Add a block, then Picture and text.' }, sources: [] }
      const r = applyOp({ body: d.body as string, data: d.data ?? {} }, { op: 'add', type: String(input?.type ?? ''), content: input?.content ?? {}, after: input?.after_id ? String(input.after_id) : null })
      if (!r.ok) return { data: { saved: false, message: r.message, block_types: BLOCK_TYPES.map(b => b.id) }, sources: [] }
      const problems = await lintForTemplate(r.texts.filter(Boolean).join('\n'), String(d.data?.template_id ?? ''), { allowMoney: true })
      if (problems.length) return { data: { saved: false, problems, message: 'Not added. Fix these and try again.' }, sources: [] }
      await updateDocumentContent(ctx.tenantId, d.id, { ...(r.state.body !== d.body ? { body: r.state.body } : {}), data: r.state.data })
      void writeAuditLog({ tenant_id: ctx.tenantId, user_id: ctx.userId, event_type: 'ask_newsletter_edited', entity_type: 'ask_document', entity_id: d.id, metadata: { op: 'add', type: String(input?.type), by: 'agent' } })
      return { data: { saved: true, block_id: r.id, next_steps_required: true, next: 'The block is in the designed newsletter. Say in one line what you added, then give next step buttons (edit it, change colours, move on).' }, sources: [] }
    },
  },
  {
    name: 'check_staff_picture',
    description: 'Before you ask for a picture in a newsletter: does this member of staff have a staff picture on file? Pass their staff id (from the question form answer) or their full name. Returns yes or no and their name only. Administrators only. Use it for employee of the month, staff stories, new starters and leavers, after the administrator has answered yes to "' + CONSENT_QUESTION + '".',
    input_schema: { type: 'object', properties: { user_id: { type: 'string' }, name: { type: 'string' } } },
    async run(ctx, input) {
      const who = await resolvePerson(ctx.tenantId, { user_id: input?.user_id, name: input?.name })
      if (!who.ok) return { data: { found: false, message: who.reason }, sources: [] }
      const has = await staffHasPicture(ctx.tenantId, who.id)
      return { data: { found: true, person: who.name, staff_id: who.id, has_picture: has, next: has ? 'Their picture can go in the newsletter once they have agreed.' : 'They have no staff picture yet. Say so plainly and offer: carry on with initials, or add a picture first in Staff, their profile, Picture; it then appears by itself.' }, sources: [] }
    },
  },
]
