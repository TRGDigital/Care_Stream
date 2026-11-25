import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { NEWSLETTER_TEMPLATES, NEWSLETTER_TYPES, NEWSLETTER_CATEGORIES, NEWSLETTER_CHECKLIST, DATA_TOOL, newsletterTemplate, newsletterMenu, lintNewsletter, lintOptionsFor } from './newsletter-templates'
import { NEWSLETTER_TOOLS } from '../ask/newsletter-tools'
import { TOOLS } from '../ask/tools'
import { agentById } from '../ask/agents'

const src = (f: string) => fs.readFileSync(path.join(__dirname, '..', 'ask', f), 'utf8')

test('LIBRARY: 25 types in 4 categories, each with short, standard and detailed layouts that grow', () => {
  assert.equal(NEWSLETTER_TYPES.length, 25)
  assert.equal(NEWSLETTER_TEMPLATES.length, 75)
  for (const c of NEWSLETTER_CATEGORIES) assert.ok(NEWSLETTER_TEMPLATES.filter(t => t.category === c.id).length >= 12, c.id)
  for (const ty of NEWSLETTER_TYPES) {
    const l = Object.fromEntries(NEWSLETTER_TEMPLATES.filter(t => t.type === ty.type).map(t => [t.layout, t.sections.length]))
    assert.deepEqual(Object.keys(l).sort(), ['detailed', 'short', 'standard'], ty.type)
    assert.ok(l.short >= 3 && l.short < l.standard && l.standard < l.detailed, `${ty.type} layouts grow: ${JSON.stringify(l)}`)
  }
  const ids = NEWSLETTER_TEMPLATES.map(t => t.id); assert.equal(new Set(ids).size, ids.length)
})
test('LIBRARY: every requested newsletter is there, including employee of the month', () => {
  const want = ['monthly-update', 'welcome-new-starters', 'leavers-farewells', 'employee-of-the-month', 'team-achievements', 'birthdays-anniversaries', 'cqc-preparation', 'inspection-result', 'policy-update', 'training-due', 'safeguarding-reminder', 'infection-control', 'hot-weather', 'winter-pressures', 'bank-holiday-cover', 'christmas-rota', 'minimum-wage-change', 'holiday-booking', 'staff-stories', 'wellbeing-support', 'survey-results', 'seasonal-christmas', 'seasonal-summer', 'seasonal-easter', 'seasonal-bank-holiday']
  assert.deepEqual(NEWSLETTER_TYPES.map(t => t.type).sort(), want.slice().sort())
  const eom = newsletterTemplate('employee-of-the-month-standard')!
  assert.deepEqual(eom.sections.map(s => s.key), ['who', 'why', 'thank_you', 'quotes', 'nominate'])
})
test('SHAPE: every template and section says what it is, whether data fills it, and which tool', () => {
  for (const t of NEWSLETTER_TEMPLATES) {
    for (const k of ['id', 'type', 'type_title', 'category', 'audience', 'purpose', 'layout', 'title', 'description'] as const) assert.ok(String(t[k]).length > 3, `${t.id} ${k}`)
    assert.ok(NEWSLETTER_CATEGORIES.some(c => c.id === t.category))
    for (const s of t.sections) {
      assert.ok(s.key && s.title && s.hint, `${t.id} ${s.key}`)
      assert.equal(s.from_data, !!s.data); assert.equal(s.tool, s.data ? DATA_TOOL[s.data] : null)
    }
    assert.equal(new Set(t.sections.map(s => s.key)).size, t.sections.length, `${t.id} duplicate section keys`)
  }
})
test('TOOLS: every tool a section names exists, and the data kinds it asks for are ones the data tool offers', () => {
  const names = new Set([...TOOLS.map(t => t.name), ...NEWSLETTER_TOOLS.map(t => t.name)])
  const offered = new Set<string>((NEWSLETTER_TOOLS.find(t => t.name === 'newsletter_data')!.input_schema as any).properties.sections.items.enum)
  const figureKeys = new Set<string>((TOOLS.find(t => t.name === 'get_figures')!.input_schema as any).properties.keys.items.enum)
  for (const t of NEWSLETTER_TEMPLATES) for (const s of t.sections) if (s.data) {
    assert.ok(names.has(s.tool!), `${t.id}: ${s.tool}`)
    if (s.tool === 'newsletter_data') assert.ok(offered.has(s.data), `${t.id}: ${s.data}`)
    else assert.ok(figureKeys.has(s.data), `${t.id}: ${s.data}`)
  }
  const agent = agentById('newsletter')!
  for (const n of ['list_newsletter_templates', 'newsletter_data', 'get_figures', 'save_newsletter_draft']) assert.ok(agent.tools.includes(n), n)
})
test('STAFF ONLY: nothing for families, recruitment or residents by name; no dashes anywhere in the copy', () => {
  const text = JSON.stringify([NEWSLETTER_TEMPLATES, NEWSLETTER_CATEGORIES, NEWSLETTER_CHECKLIST])
  assert.ok(!/famil|recruit|job advert|vacanc|relatives' newsletter/i.test(text.replace('their relatives or recruitment', '')), 'no family or recruitment wording')
  assert.ok(!/[–—]/.test(text), 'no en or em dashes')
  assert.ok(NEWSLETTER_TEMPLATES.every(t => t.audience === 'All staff'))
  assert.match(agentById('newsletter')!.prompt, /never for families or recruitment|Never offer anything for families or recruitment/)
})
test('PEOPLE: anything that names a person must be ticked by the administrator first', () => {
  for (const t of NEWSLETTER_TEMPLATES) for (const s of t.sections) if (s.data === 'new_starters' || s.data === 'birthdays' || s.data === 'anniversaries') assert.equal(s.needs_ticks, true, `${t.id} ${s.key}`)
  for (const id of ['employee-of-the-month-short', 'leavers-farewells-short', 'staff-stories-short']) assert.ok(newsletterTemplate(id)!.sections.some(s => s.needs_ticks), id)
  assert.match(agentById('newsletter')!.prompt, /needs_ticks[\s\S]*Name nobody who has not been chosen/)
})
test('DOB: birthdays show the month and day only, never an age, and the administrator is told', () => {
  const b = newsletterTemplate('birthdays-anniversaries-short')!
  assert.match(b.heads_up!, /month and day/i); assert.match(b.heads_up!, /never an age/i)
  assert.ok(b.sections.some(s => s.data === 'birthdays') && b.sections.some(s => s.data === 'anniversaries'))
  assert.ok(lintNewsletter('Happy birthday to Sam, who is turning 40').some(p => /age/.test(p)))
  assert.ok(lintNewsletter('Priya is aged 34 today').some(p => /age/.test(p)))
  assert.ok(lintNewsletter('Her 50th birthday is on Friday').some(p => /age/.test(p)))
  assert.equal(lintNewsletter('Happy birthday to Sam on the 14th, and well done Priya on 6 years with us').length, 0)
  assert.match(NEWSLETTER_CHECKLIST.join(' '), /month and day only, never an age/)
  // the data tool returns the day and first name only: the loader never selects or returns the date of birth itself
  const data = fs.readFileSync(path.join(__dirname, '..', 'ask', 'data.ts'), 'utf8')
  const fn = data.slice(data.indexOf('export async function loadBirthdaysThisMonth'), data.indexOf('export async function loadAnniversariesThisMonth'))
  assert.match(fn, /first_name/); assert.ok(!/age:|ageOn|years_old/.test(fn))
  const code = src('newsletter-tools.ts').replace(/\/\/.*$/gm, '')
  assert.ok(!/date_of_birth|\bdob\b|\.age\b/i.test(code))
})
test('PAY: only the national rates may appear, only on the minimum wage template, never anyone\'s pay', () => {
  const nw = newsletterTemplate('minimum-wage-change-standard')!
  assert.equal(nw.national_rates, true); assert.ok(nw.sections.some(s => s.data === 'nlw' && s.tool === 'get_figures'))
  assert.equal(NEWSLETTER_TEMPLATES.filter(t => t.national_rates).every(t => t.type === 'minimum-wage-change'), true)
  const o = lintOptionsFor('minimum-wage-change-standard', [12.71, 10.85, 8])
  assert.equal(lintNewsletter('From 1 April the rate for staff aged 21 and over is £12.71 an hour.'.replace('aged 21 and over', 'over 21'), o).length, 0)
  assert.ok(lintNewsletter('The rate is £13.50 an hour.', o).length > 0, 'a figure that is not an official rate is refused')
  assert.ok(lintNewsletter('Your salary will go up to £13.00.', o).length > 0)
  assert.ok(lintNewsletter('The rate is £12.71 an hour.').length > 0, 'refused on any other template')
  assert.ok(lintNewsletter('A pay rise for everyone', lintOptionsFor('monthly-update-standard')).length > 0)
  assert.deepEqual(lintOptionsFor('minimum-wage-change-standard', []).nationalRates, [], 'no confirmed rates means no figure is allowed')
  assert.ok(lintNewsletter('The rate is £12.71 an hour.', lintOptionsFor('minimum-wage-change-standard', [])).length > 0)
})
test('CARE TOPICS: care words are allowed on care templates but health or discipline of staff is still refused elsewhere', () => {
  const o = lintOptionsFor('infection-control-short')
  assert.equal(o.careTopic, true)
  assert.equal(lintNewsletter('Wash your hands to stop illness spreading, and report any warning signs.', o).length, 0)
  assert.ok(lintNewsletter('Wash your hands to stop illness spreading.', lintOptionsFor('monthly-update-short')).length > 0)
  assert.ok(lintNewsletter('Anyone with a disciplinary should see me', o).length > 0)
  assert.equal(NEWSLETTER_TEMPLATES.filter(t => t.care_topic).map(t => t.type).filter((v, i, a) => a.indexOf(v) === i).sort().join(), 'hot-weather,infection-control,safeguarding-reminder,winter-pressures')
})
test('LEGACY: drafts saved against the first five templates still resolve; the menu lists every type once', () => {
  for (const id of ['monthly-update', 'recognition', 'policy-training-reminders', 'holiday-rota-reminders', 'seasonal']) assert.ok(newsletterTemplate(id), id)
  assert.equal(newsletterMenu().flatMap(c => c.types).length, 25)
})
test('SAVE: the draft is checked with the template\'s own rules before it is stored, and edits are checked the same way', () => {
  const code = src('newsletter-tools.ts'), route = fs.readFileSync(path.join(__dirname, '..', '..', 'routes', 'ask.ts'), 'utf8')
  assert.ok(code.indexOf('lintForTemplate(') < code.indexOf('saveDocument('))
  assert.match(route, /lintForTemplate\(/)
  assert.ok(!/sick|pay_rate|weekday_rate|hourly/i.test(code.replace(/\/\/.*$/gm, '')))
})
test('PICKER: the library has a template picker for the newsletter agent, administrators only, with no scroll bars', () => {
  const read = (...p: string[]) => fs.readFileSync(path.join(__dirname, '..', '..', '..', '..', ...p), 'utf8')
  assert.match(read('api', 'src', 'routes', 'ask.ts'), /askRouter\.get\('\/newsletter-templates'/)
  assert.ok(!require('../ask/manager-access').managerMayReach('GET', '/newsletter-templates'))
  const picker = read('web', 'src', 'components', 'ask', 'newsletter-picker.tsx')
  assert.ok(!/overflow-(y-)?(auto|scroll)|max-h-/.test(picker)); assert.match(picker, /Browse newsletter templates/)
  assert.match(read('web', 'src', 'components', 'ask', 'ask-overlay.tsx'), /agent\.id === 'newsletter'[^\n]*<NewsletterPicker/)
  assert.ok(!/[–—]/.test(picker))
})
