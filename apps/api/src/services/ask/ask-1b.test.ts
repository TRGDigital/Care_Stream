import { LOCKED_RULES } from './safety'
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { paySummary, payGaps, compareNlw, rateBands, rateStats, median, lowestRate } from './calc'
import { TOOLS, toolByName } from './tools'
import { AGENTS, agentById, HOUSE_RULES } from './agents'
import { cleanValuesForTest } from './letter-tools'
import { lintNewsletter, NEWSLETTER_TEMPLATES } from '../ask-docs/newsletter-templates'
import { canEdit, canSubmit, canApprove, canReturn, canShare, canReopen, sharesFor } from '../ask-docs/workflow'
import { parseBlocks, renderNewsletterPdf } from '../ask-docs/pdf'
import { leaverFigures } from '../../lib/holiday-leaver'
import { listTemplates, render, validate } from '../letters'

const P = (o: Partial<any>) => ({ name: 'A', job_role: 'Carer', age: 30, weekday_rate: 12, weekend_rate: 12, weekly_hours: 40, ...o })
const NLW = { age21: 12.71, age18to20: 10.85, under18: 8.0 }
const src = (rel: string) => fs.readFileSync(path.resolve(__dirname, rel), 'utf8')

// ── A. Pay analysis ─────────────────────────────────────────────────────────────────────────────────
test('PAY: average, median, lowest and highest, by role, with people who have no rate listed', () => {
  const people = [P({ name: 'A', weekday_rate: 12, weekend_rate: 12 }), P({ name: 'B', weekday_rate: 13, weekend_rate: 13 }), P({ name: 'C', job_role: 'Senior', weekday_rate: 15, weekend_rate: 16 }), P({ name: 'D', weekday_rate: null, weekend_rate: null })]
  const r = paySummary(people, 2 / 7)
  assert.equal(r.people_total, 4); assert.equal(r.people_with_rate, 3); assert.deepEqual(r.people_without_rate, ['D'])
  assert.equal(r.blended!.lowest, 12); assert.equal(r.blended!.highest, 15.29); assert.equal(r.blended!.median, 13)
  assert.equal(r.weekday!.average, round(40 / 3)); assert.equal(r.weekend!.highest, 16)
  assert.deepEqual(r.by_role.map(x => x.role), ['Senior', 'Carer']); assert.equal(r.by_role.find(x => x.role === 'Carer')!.average, 12.5)
  assert.equal(r.bands.reduce((s, b) => s + b.count, 0), 3)
  assert.deepEqual(rateStats([]), null); assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5)
})
const round = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100

test('PAY: bands of 50p and 1 pound cover every rate once', () => {
  const rates = [11.9, 12.0, 12.49, 12.5, 13.99]
  const b1 = rateBands(rates, 1), b5 = rateBands(rates, 0.5)
  assert.equal(b1.reduce((s, b) => s + b.count, 0), 5); assert.equal(b5.reduce((s, b) => s + b.count, 0), 5)
  assert.deepEqual(b1.map(b => b.count), [1, 3, 1]); assert.equal(b5.find(b => b.from === 12.5)!.count, 1)
})

test('PAY: gaps use the LOWER of weekday and weekend against the age band, find role differences and outliers', () => {
  const people = [P({ name: 'Low', weekday_rate: 12.8, weekend_rate: 12.0 }), P({ name: 'Young', age: 19, weekday_rate: 10, weekend_rate: 10 }), P({ name: 'NoDob', age: null }), P({ name: 'R1', weekday_rate: 13, weekend_rate: 13 }), P({ name: 'R2', weekday_rate: 13, weekend_rate: 13 }), P({ name: 'R3', weekday_rate: 20, weekend_rate: 20 })]
  const r = payGaps(people, NLW, 10)
  assert.deepEqual(r.below_minimum.map(x => x.name), ['Low', 'Young']); assert.equal(r.below_minimum[0].short_by, 0.71)
  assert.deepEqual(r.not_checked.map(x => x.name), ['NoDob'])
  assert.equal(r.same_role_differences[0].role, 'Carer'); assert.ok(r.outliers.some(o => o.name === 'R3' && o.difference_percent > 10))
  assert.equal(lowestRate({ weekday_rate: 12, weekend_rate: 14 }), 12)
  assert.equal(payGaps(people, null).below_minimum.length, 0)    // a figure that could not be confirmed is never used for the check
})

test('PAY: headroom over the minimum is by person, smallest first, with totals', () => {
  const r = compareNlw([P({ name: 'A', weekday_rate: 13.21, weekend_rate: 13.21 }), P({ name: 'B', weekday_rate: 12.5, weekend_rate: 12.5 }), P({ name: 'C', age: 19, weekday_rate: 11, weekend_rate: 11 }), P({ name: 'D', age: null })], NLW)
  assert.deepEqual(r.people.map(x => x.name), ['B', 'C', 'A'])
  assert.equal(r.people[0].name, 'B'); assert.equal(r.people[0].headroom, -0.21); assert.equal(r.below_minimum, 1); assert.equal(r.within_50p, 2)
  assert.deepEqual(r.skipped.map(s => s.name), ['D'])
})

test('PAY: "what is the average hourly rate we pay" resolves to pay_summary, and the Staff and Pay agents both own the pay tools', () => {
  const q = 'what is the average hourly rate we pay'
  const score = (t: { name: string; description: string }) => ['average', 'hourly rate', 'pay'].filter(w => (t.name + ' ' + t.description).toLowerCase().includes(w)).length + (t.description.toLowerCase().includes(q.replace('what is ', '').replace('we ', '')) ? 3 : 0) + (/"what is the average hourly rate we pay"/i.test(t.description) ? 5 : 0)
  const ranked = [...TOOLS].sort((a, b) => score(b) - score(a))
  assert.equal(ranked[0].name, 'pay_summary')
  for (const id of ['staff', 'pay']) for (const n of ['pay_summary', 'pay_list', 'pay_gaps', 'pay_compare_nlw']) assert.ok(agentById(id)!.tools.includes(n), `${id} ${n}`)
  assert.ok(agentById('staff')!.starters.includes('What is the average hourly rate we pay?')); assert.ok(agentById('pay')!.starters.includes('What is the average hourly rate we pay?'))
})

test('PRIVACY WORDING: the agent is told pay and holiday ARE available to this administrator and must be used; sickness and health are not; no dates of birth or contact details', () => {
  assert.match(HOUSE_RULES, /Pay rates, holiday balances and liability, and resident funding totals ARE available/); assert.match(HOUSE_RULES, /Never say you do not have access to pay or holiday information/)
  // The sickness, health, date of birth and contact rules are LOCKED (safety.ts, added last to every run); they are not part of the editable house rules.
  assert.match(LOCKED_RULES, /Sickness absence and health notes are NOT available/); assert.match(LOCKED_RULES, /Never show dates of birth or contact details/)
  assert.ok(!/Sickness absence and health notes/.test(HOUSE_RULES))
  assert.ok(!/administrator-only data is not available|do not have access to pay/i.test(HOUSE_RULES.replace('Never say you do not have access to pay or holiday information', '')))
  const t = src('tools.ts') + src('letter-tools.ts') + src('newsletter-tools.ts') + src('entitlement-tools.ts')
  assert.ok(!/\.email\b|\bphone\b|phone_number|date_of_birth|\bdob\b/i.test(t.replace(/\/\/.*$/gm, '').replace(/no_date_of_birth/g, '')))
  for (const n of ['pay_summary', 'pay_list', 'pay_gaps', 'pay_compare_nlw']) assert.ok(!/(date_of_birth|\bdob\b|email|phone)/i.test(JSON.stringify(toolByName(n)!.input_schema)))
})

// ── B. Letters: never invent, drafts only ────────────────────────────────────────────────────────────
test('LETTERS: the agent is ready, owns exactly the letter tools, and the save is refused while anything is missing (checked before anything is stored)', () => {
  const a = agentById('letters')!
  assert.equal(a.status, 'ready'); assert.deepEqual(a.tools.slice(0, 5), ['find_staff', 'list_letter_templates', 'get_letter_fields', 'preview_letter', 'save_letter_draft'])
  const code = src('letter-tools.ts')
  const save = code.slice(code.indexOf("name: 'save_letter_draft'"))
  assert.ok(save.indexOf('if (!r.ok)') > 0 && save.indexOf('if (!r.ok)') < save.indexOf('saveDocument('), 'refused before saving')
  assert.match(save, /still\s*missing|missing: r\.missing/)
  assert.match(a.prompt, /Never invent a value/); assert.match(a.prompt, /ONLY for the required values that are still missing/)
  assert.deepEqual(cleanValuesForTest({ a: 'x', b: 2, c: { evil: 1 }, 'bad key': 'y', d: ['z'] }), { a: 'x', b: 2 })   // nested objects and odd keys are dropped
  const t = listTemplates().find(x => x.id === 'pay-review')!
  assert.ok(!validate(t.id, {}).ok && render(t.id, {}).missing.length > 0)
})

// ── D. Newsletter rules ──────────────────────────────────────────────────────────────────────────────
test('NEWSLETTER: staff only, templates have sections, and the house rules are enforced before saving', () => {
  assert.ok(NEWSLETTER_TEMPLATES.length >= 5 && NEWSLETTER_TEMPLATES.every(t => t.sections.length >= 3))
  assert.ok(!/famil|recruit|job advert|vacanc/i.test(JSON.stringify(NEWSLETTER_TEMPLATES)))
  assert.equal(lintNewsletter('A calm month, thank you all.').length, 0)
  assert.ok(lintNewsletter('Thanks – all of you').some(p => /dash/.test(p)))
  assert.ok(lintNewsletter('Sam was off sick last week').length > 0); assert.ok(lintNewsletter('We are giving a pay rise of £1 per hour').length > 0); assert.ok(lintNewsletter('Our best ever month').length > 0)
  const code = src('newsletter-tools.ts')
  assert.ok(code.indexOf('lintNewsletter(') < code.indexOf('saveDocument(')); assert.match(agentById('newsletter')!.prompt, /ACCURACY AND TONE/); assert.match(agentById('newsletter')!.prompt, /never families, never recruitment/)
  assert.ok(!/sick|pay_rate|weekday_rate|hourly/i.test(code.replace(/\/\/.*$/gm, '')), 'the newsletter tools never read pay or health')
})

// ── The workflow ────────────────────────────────────────────────────────────────────────────────────
test('WORKFLOW: the author submits; someone else approves (or the sole administrator); the checklist must be ticked; only approved documents are shared', () => {
  const draft = { type: 'letter', status: 'draft', created_by: 'a' }, pending = { ...draft, status: 'pending' }, approved = { ...draft, status: 'approved' }
  assert.ok(canEdit(draft, 'a').ok && !canEdit(draft, 'b').ok && !canEdit(pending, 'a').ok)
  assert.ok(canSubmit(draft, 'a').ok && !canSubmit(draft, 'b').ok && !canSubmit(pending, 'a').ok)
  assert.ok(!canApprove(pending, 'a', 2, true).ok); assert.ok(canApprove(pending, 'b', 2, true).ok); assert.ok(canApprove(pending, 'a', 1, true).ok)   // sole administrator may approve their own
  assert.ok(!canApprove(pending, 'b', 2, false).ok); assert.ok(!canApprove(draft, 'b', 2, true).ok)
  assert.ok(canReturn(pending, 'a', 2).ok && !canReturn(draft, 'a', 2).ok)
  assert.ok(!canShare(pending).ok && canShare(approved).ok && canShare({ ...draft, status: 'shared' }).ok); assert.ok(canReopen(approved).ok && !canReopen(draft).ok)
  assert.deepEqual(sharesFor('letter'), ['pdf', 'email', 'notification']); assert.deepEqual(sharesFor('newsletter'), ['pdf', 'notification']); assert.deepEqual(sharesFor('answer'), [])
  assert.ok(!canSubmit({ type: 'answer', status: 'draft', created_by: 'a' }, 'a').ok)
})

test('SHARE PATHS: every transition and share is audit logged, and the PDF is made with the same dynamic import pattern as the letters', () => {
  const routes = fs.readFileSync(path.resolve(__dirname, '../../routes/ask.ts'), 'utf8')
  for (const e of ['ask_document_submitted', 'ask_document_approved', 'ask_document_returned', 'ask_document_reopened', 'ask_document_pdf_downloaded', 'ask_document_shared_email', 'ask_document_shared_notification', 'ask_document_edited']) assert.ok(routes.includes(e), e)
  const pdf = src('../ask-docs/pdf.ts'), letters = fs.readFileSync(path.resolve(__dirname, '../letters/render.ts'), 'utf8')
  for (const t of [pdf, letters]) { assert.match(t, /import\('pdfkit'\)/); assert.match(t, /import\('\.\.\/policy\/policy-pdf'\)/) }
  assert.ok(!/^import .*pdfkit/m.test(pdf), 'pdfkit is not imported at the top of the file')
  assert.match(routes, /canShare\(d\)/); assert.match(routes, /adminOnly|req\.user\?\.role !== 'admin'/)
})

// ── C. The leaver sums ──────────────────────────────────────────────────────────────────────────────
test('LEAVER: leave earned to the last day (monthly), taken, balance, pounds owed, booked after the last day is cancelled', () => {
  const r = leaverFigures({ unit: 'hours', allowance: 224, contracted: 40, startDate: '2020-01-06', leaveYear: { start: '2026-01-01', end: '2026-12-31' }, leavingDate: '2026-06-30', hourlyRate: 12.5,
    days: [{ day: '2026-02-10', hours: 40 }, { day: '2026-05-04', hours: 20 }, { day: '2026-08-03', hours: 40 }] })
  assert.equal(r.earned, 112); assert.equal(r.taken, 60); assert.equal(r.bookedAfter, 40); assert.equal(r.balance, 52); assert.equal(r.owed, 52); assert.equal(r.owedPounds, 650)
  assert.ok(r.working.length >= 3 && r.caveats.length > 0)
  const days = leaverFigures({ unit: 'days', allowance: 28, contracted: 40, startDate: null, leaveYear: { start: '2026-01-01', end: '2026-12-31' }, leavingDate: '2026-06-30', days: [{ day: '2026-03-02', hours: 8, part: 'am' }, { day: '2026-03-03', hours: 8 }] })
  assert.equal(days.earned, 14); assert.equal(days.taken, 1.5); assert.equal(days.owed, 12.5)
})

test('every agent tool exists, ready agents have four starters, and the new agents are in the same order', () => {
  for (const a of AGENTS) for (const n of a.tools) assert.ok(TOOLS.some(t => t.name === n), `${a.id} -> ${n}`)
  for (const a of AGENTS.filter(x => x.status === 'ready')) assert.equal(a.starters.length, 4, a.id)
  assert.deepEqual(AGENTS.filter(a => a.status === 'ready').map(a => a.id).slice(0, 6), ['staff', 'holiday', 'pay', 'letters', 'newsletter', 'notifications'])   // agents added later (finance, complaints and so on) come after these six
  assert.ok(agentById('holiday')!.starters.some(s => /14 March on 30 hours a week with 224 hours/.test(s))); assert.ok(agentById('holiday')!.starters.includes('What is a leaver owed?'))
  for (const n of ['entitlement_for_starter_or_leaver', 'statutory_minimum', 'holiday_owed_on_leaving', 'irregular_hours_accrual']) assert.ok(agentById('holiday')!.tools.includes(n), n)
})

test('NEWSLETTER PDF: text with ## headings and - bullets becomes blocks, and a PDF is made when pdfkit is available', async t => {
  assert.deepEqual(parseBlocks('## Welcome\n\nHello team.\nSecond line.\n\n- one\n- two'), [{ t: 'h', text: 'Welcome' }, { t: 'p', text: 'Hello team. Second line.' }, { t: 'li', text: 'one' }, { t: 'li', text: 'two' }])
  let ok = true; try { require.resolve('pdfkit') } catch { ok = false }
  if (!ok) { t.skip('pdfkit is not installed here'); return }
  const buf = await renderNewsletterPdf({ title: 'November news', body: '## Welcome\n\nThank you all.\n\n- A thing\n- Another thing', head: { name: 'Ferndale', logoDataUrl: null }, dateText: '24 November 2026' })
  assert.equal(buf.subarray(0, 4).toString(), '%PDF')
})
