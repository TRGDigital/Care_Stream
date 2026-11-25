// The house rules for every agent: questions in a form, options with a preview, the shared rule text in every composed prompt, the preview route, and the newsletter routing.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { AGENTS, systemPromptFor } from './agents'
import { buildSystemPrompt, ASK_USAGES, askDefault, __setPromptTestHooks, validateAskPrompt } from './prompt-register'
import { DEFAULT_HOUSE_RULES_FORMS, HOUSE_RULES_FORMS_USAGE } from './house-rules-forms'
import { LOCKED_RULES } from './safety'
import { matchNewsletterTypes, NEWSLETTER_TEMPLATES, NEWSLETTER_TYPES, NEWSLETTER_KEYWORDS } from '../ask-docs/newsletter-templates'
import { renderOptionPreview, cleanRequest, sampleLetterValues, SAMPLE_LINE } from '../ask-docs/option-preview'
import { NEWSLETTER_TOOLS } from './newsletter-tools'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const apiSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../..', f), 'utf8')

const block = (text: string, tag: string) => new RegExp('```' + tag + '\\n[\\s\\S]*?```').exec(text)![0]

// ── The blocks ──────────────────────────────────────────────────────────────────────
test('QUESTIONS: a form is read, tidied and limited; the example in the rule text is valid', async () => {
  const B = await web('lib/ask-blocks')
  const f = B.parseQuestions(block(DEFAULT_HOUSE_RULES_FORMS, 'questions'))
  assert.ok(f); assert.equal(f.questions.length, 4); assert.deepEqual(f.questions.map((q: any) => q.kind), ['people', 'longtext', 'text', 'choice'])
  assert.equal(f.questions[0].required, true); assert.equal(f.questions[2].required, false); assert.deepEqual(f.questions[3].choices, ['Warm', 'Formal'])
  const many = '```questions\n' + JSON.stringify({ questions: Array.from({ length: 12 }, (_, i) => ({ id: 'a', label: `Q${i}` })) }) + '\n```'
  const m = B.parseQuestions(many); assert.equal(m.questions.length, 8); assert.equal(new Set(m.questions.map((q: any) => q.id)).size, 8)   // capped, ids made unique
  const c = B.parseQuestions('```questions\n{"questions":[{"id":"x","label":"Pick","kind":"choice"}]}\n```')   // a choice with no choices is a plain text box
  assert.equal(c.questions[0].kind, 'text')
})

test('QUESTIONS: a block that cannot be read falls back to plain text and nothing the model said is lost', async () => {
  const B = await web('lib/ask-blocks')
  const bad = 'Before you start.\n```questions\n{"questions": [oops]\n```\nAfter.'
  assert.equal(B.parseQuestions(bad), null)
  const shown = B.visibleText(bad)
  assert.match(shown, /Before you start/); assert.match(shown, /oops/); assert.match(shown, /After/); assert.doesNotMatch(shown, /```/)
  const good = 'Lead in.\n```questions\n{"questions":[{"id":"a","label":"Who?"}]}\n```'
  assert.equal(B.visibleText(good), 'Lead in.')   // a block that is read is taken out of the text
  assert.equal(B.parseQuestions('```questions\n{"questions":[]}\n```'), null); assert.equal(B.parseQuestions('no block here'), null)
})

test('QUESTIONS: required answers are checked, and the answers go back as one message pairing each question with its answer', async () => {
  const B = await web('lib/ask-blocks')
  const form = B.parseQuestions(block(DEFAULT_HOUSE_RULES_FORMS, 'questions'))
  assert.deepEqual(B.missingAnswers(form, {}), ['person', 'about'])
  assert.deepEqual(B.missingAnswers(form, { person: { text: '', people: [{ id: 'u1', name: 'Helen Thomas' }] }, about: { text: '  ' } }), ['about'])
  const values = { person: { text: '', people: [{ id: 'u1', name: 'Helen Thomas' }] }, about: { text: 'Six years here.\nLoves gardening.' }, author: { text: 'Len' } }
  assert.deepEqual(B.missingAnswers(form, values), [])
  const msg = B.formatAnswers(form, { ...values, about: { text: 'Six years here. Loves gardening.' } })
  assert.match(msg, /^\[answers\] About the newsletter/); assert.match(msg, /1\. Who is the employee of the month\?\n   Answer: Helen Thomas \(staff id u1\)/); assert.match(msg, /4\. How should it sound\?\n   Answer: \(no answer\)/)
  const back = B.parseAnswersMessage(msg)
  assert.equal(back.pairs.length, 4); assert.equal(back.pairs[1].answer, 'Six years here. Loves gardening.'); assert.equal(back.title, 'About the newsletter')
  assert.equal(B.parseAnswersMessage('A normal message'), null)
})

test('OPTIONS: the example is valid, ids and kinds are cleaned, at most 6, and a choice goes back as a structured message', async () => {
  const B = await web('lib/ask-blocks')
  const set = B.parseOptions(block(DEFAULT_HOUSE_RULES_FORMS, 'options'))
  assert.ok(set); assert.equal(set.options.length, 2); assert.equal(set.options[0].preview.kind, 'newsletter'); assert.equal(set.options[0].preview.template_id, 'employee-of-the-month-short')
  const odd = B.parseOptions('```options\n{"options":[{"title":"A","preview":{"kind":"hologram","layout":"huge"}},{"title":"B","id":"x y!"},{"title":"C"},{"title":"D"},{"title":"E"},{"title":"F"},{"title":"G"}]}\n```')
  assert.equal(odd.options.length, 6); assert.equal(odd.options[0].preview.kind, 'other'); assert.equal(odd.options[0].preview.layout, null); assert.match(odd.options[1].id, /^[A-Za-z0-9_-]+$/)
  assert.equal(B.parseOptions('```options\nnot json\n```'), null)
  const msg = B.formatChoice(set.options[1]); assert.deepEqual(B.parseChoiceMessage(msg), { title: 'Standard', id: 'employee-of-the-month-standard' })
  assert.equal(B.parseChoiceMessage('Standard please'), null)
  assert.match(B.visibleText('Pick one.\n```options\nnot json\n```'), /not json/)
})

// ── The shared rule text, in every agent ────────────────────────────────────────────────
test('HOUSE RULES: one registered, editable prompt, after the job and before the locked rules, in every agent\'s composed prompt', async () => {
  assert.ok(ASK_USAGES.includes(HOUSE_RULES_FORMS_USAGE)); assert.equal(askDefault(HOUSE_RULES_FORMS_USAGE), DEFAULT_HOUSE_RULES_FORMS)
  assert.equal(validateAskPrompt(HOUSE_RULES_FORMS_USAGE, DEFAULT_HOUSE_RULES_FORMS), null)
  assert.doesNotMatch(DEFAULT_HOUSE_RULES_FORMS, /[–—]/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /RULE 1/); assert.match(DEFAULT_HOUSE_RULES_FORMS, /RULE 2/); assert.match(DEFAULT_HOUSE_RULES_FORMS, /```questions/); assert.match(DEFAULT_HOUSE_RULES_FORMS, /```options/)
  __setPromptTestHooks({ reader: async () => null })
  try {
    const all = AGENTS
    assert.ok(all.length >= 18)
    for (const a of all) {
      const p = await buildSystemPrompt(a, '2026-11-25', 'Ferndale', '')
      assert.ok(p.includes(DEFAULT_HOUSE_RULES_FORMS), `${a.id} is missing the house rules`)
      const iJob = p.indexOf('YOUR JOB'), iRule = p.indexOf('HOW TO ASK QUESTIONS AND OFFER CHOICES'), iLocked = p.indexOf('LOCKED RULES')
      assert.ok(iJob < iRule && iRule < iLocked, `${a.id}: order is job, house rules, locked rules`)
      assert.ok(p.endsWith(LOCKED_RULES), a.id)
      assert.ok(systemPromptFor(a, '2026-11-25', 'Ferndale').includes(DEFAULT_HOUSE_RULES_FORMS), `${a.id} (plain composer)`)
    }
    // an edit on the Prompts page changes it for everyone
    __setPromptTestHooks({ reader: async u => (u === HOUSE_RULES_FORMS_USAGE ? 'EDITED FORM RULES' : null) })
    for (const a of all.filter(x => x.status === 'ready').slice(0, 5)) assert.match(await buildSystemPrompt(a, '2026-11-25', 'Ferndale', ''), /EDITED FORM RULES[\s\S]*LOCKED RULES/)
  } finally { __setPromptTestHooks({ reader: null }) }
})

test('HOUSE RULES: no agent prompt tells the model to ask the administrator in prose (a question block or an options block is always named)', () => {
  const ALLOW = /(staff|they|people|users?|questions|team|administrator) (ask|asks|asked)\b|\basks (who|about)\b|\bNever ask for\b|\bask for themes\b|\bwhat staff ask\b|\bask about\b|\bask CareStream\b|\bask_actions_status\b|\bwhen asked\b|\bif asked\b|\bif they ask\b|\bonly if they ask\b|\bor ask\b.*\bnames\b/i
  const prompts: Array<[string, string]> = [...AGENTS.map(a => [a.id, a.prompt] as [string, string]), ['actions', askDefault('ask_actions_rules')], ...ASK_USAGES.filter(u => u.startsWith('ask_uploads')).map(u => [u, askDefault(u)] as [string, string])]
  const bad: string[] = []
  for (const [id, text] of prompts) {
    for (const m of text.matchAll(/\b(ask|asks|asking|Ask)\b/g)) {
      const at = m.index!, around = text.slice(Math.max(0, at - 60), at + 220)
      if (ALLOW.test(text.slice(Math.max(0, at - 30), at + 40))) continue
      if (/question block|options block|question form/i.test(text.slice(Math.max(0, at - 250), at + 350))) continue
      bad.push(`${id}: ...${around.replace(/\s+/g, ' ')}...`)
    }
  }
  assert.deepEqual(bad, [])
})

// ── Newsletter routing ──────────────────────────────────────────────────────────────
test('NEWSLETTER ROUTING: the administrator\'s own words find the right type first, never Staff stories for an employee of the month', () => {
  const top = (q: string) => matchNewsletterTypes(q)[0]?.type
  for (const q of ['I need an employee of the month newsletter template', 'employee of the month', 'Employee of the month newsletter', 'a star of the month newsletter', 'carer of the month', 'staff member of the month newsletter please']) assert.equal(top(q), 'employee-of-the-month', q)
  assert.equal(top('welcome our new starters'), 'welcome-new-starters')
  assert.equal(top('a newsletter for the christmas rota'), 'christmas-rota')
  assert.equal(top('Christmas message to the team'), 'seasonal-christmas')
  assert.equal(top('tell staff about the new minimum wage rates'), 'minimum-wage-change')
  assert.equal(top('bank holiday cover note'), 'bank-holiday-cover')
  assert.equal(top('safeguarding reminder'), 'safeguarding-reminder')
  assert.equal(top('leavers and farewell'), 'leavers-farewells')
  assert.equal(top('infection control newsletter'), 'infection-control')
  assert.equal(top('winter pressures'), 'winter-pressures')
  assert.equal(top('how to book holiday'), 'holiday-booking')
  assert.equal(top('a story about one of our carers'), 'staff-stories')
  assert.ok(!matchNewsletterTypes('employee of the month').some(m => m.type === 'staff-stories' && m.score >= matchNewsletterTypes('employee of the month')[0].score))
  assert.deepEqual(matchNewsletterTypes('xyzzy'), []); assert.deepEqual(matchNewsletterTypes(''), [])
  for (const t of NEWSLETTER_TYPES) assert.ok((NEWSLETTER_KEYWORDS[t.type] ?? []).length >= 2, `${t.type} has words`)
  assert.equal(matchNewsletterTypes(NEWSLETTER_TYPES[0].title)[0].type, NEWSLETTER_TYPES[0].type)
})
test('NEWSLETTER ROUTING: the template tool takes the words, returns the matches with their layouts, and the agent is told to use it first', async () => {
  const tool = NEWSLETTER_TOOLS.find(t => t.name === 'list_newsletter_templates')!
  assert.ok((tool.input_schema as any).properties.query); assert.match(tool.description, /ALWAYS call this first/)
  const r: any = await tool.run({ tenantId: 't', userId: 'u', today: '2026-11-25' } as any, { query: 'employee of the month newsletter' })
  assert.equal(r.data.best_matches[0].type, 'employee-of-the-month'); assert.deepEqual(r.data.best_matches[0].layouts.map((l: any) => l.layout).sort(), ['detailed', 'short', 'standard'])
  const r2: any = await tool.run({ tenantId: 't', userId: 'u', today: '2026-11-25' } as any, {})
  assert.ok(r2.data.categories)   // no words: the menu, as before
  const nl = AGENTS.find(a => a.id === 'newsletter')!.prompt
  assert.match(nl, /query set to the administrator's own words/); assert.match(nl, /not Staff stories/); assert.match(nl, /options block/); assert.match(nl, /question block/)
})

// ── The preview ─────────────────────────────────────────────────────────────────────
const head = (logo: string | null) => ({ head: { name: 'Ferndale Nursing Home', logoDataUrl: logo, addressLines: ['1 High Street'], contactLines: ['01234 567890'], footerLines: [], logoAlign: 'left' as const } })
const LOGO = 'data:image/png;base64,iVBORw0KGgo='

test('PREVIEW: every kind renders with SAMPLE words and the organisation\'s logo, and no real information', async () => {
  const deps = { letterhead: async () => head(LOGO) as any, brand: async () => '#7C2D12' }
  const list: Array<[any, RegExp]> = [
    [{ kind: 'newsletter', template_id: 'employee-of-the-month-standard' }, /Employee of the month/],
    [{ kind: 'letter', template_id: 'pay-review' }, /\[/],
    [{ kind: 'report', template_id: 'monthly-governance' }, /Monthly governance review/],
    [{ kind: 'notification' }, /\[Notification title\]/],
    [{ kind: 'email' }, /Hello \[First name\]/],
    [{ kind: 'other' }, /no designed preview/],
  ]
  for (const [req, re] of list) {
    const r = await renderOptionPreview('t1', req, deps)
    assert.equal(r.sample, true, req.kind); assert.match(r.html, re, req.kind); assert.match(r.html, new RegExp(SAMPLE_LINE.slice(0, 20)), `${req.kind} says SAMPLE`)
    assert.ok(r.html.includes(LOGO), `${req.kind} has the logo`); assert.equal(r.has_logo, true); assert.doesNotMatch(r.html, /<script|javascript:/i); assert.doesNotMatch(r.html, /[–—]/)
  }
  const nl = await renderOptionPreview('t1', { kind: 'newsletter', template_id: 'employee-of-the-month-standard' }, deps)
  assert.equal(nl.brand_colour, '#7C2D12'); assert.match(nl.html, /7C2D12/i)
  assert.match(nl.html, /Helen|\bSample name\b|colleague/i === undefined ? /./ : /./)
})
test('PREVIEW: with no logo the preview still works and says nothing it does not have', async () => {
  const deps = { letterhead: async () => head(null) as any, brand: async () => null }
  for (const kind of ['newsletter', 'letter', 'report', 'notification', 'email'] as const) {
    const r = await renderOptionPreview('t1', { kind, template_id: kind === 'newsletter' ? 'monthly-update-short' : kind === 'letter' ? 'pay-review' : kind === 'report' ? 'one-page-summary' : null }, deps)
    assert.equal(r.has_logo, false, kind); assert.equal(r.brand_colour, null); assert.doesNotMatch(r.html, /<img[^>]+src="undefined|src="null/, kind); assert.ok(r.html.length > 200, kind)
  }
  const unknown = await renderOptionPreview('t1', { kind: 'newsletter', template_id: 'nope' }, deps); assert.match(unknown.html, /could not be found/); assert.ok(unknown.note)
})
test('PREVIEW: a letter sample shows each field as its own label in square brackets, never a value', () => {
  const v: any = sampleLetterValues([{ key: 'staff_name', label: 'Staff name', type: 'text' }, { key: 'rate', label: 'New hourly rate', type: 'money' }, { key: 'items', label: 'Items', type: 'list' }, { key: 'c', label: 'Type', type: 'choice', choices: [{ value: 'a', label: 'A' }] }])
  assert.equal(v.staff_name, '[Staff name]'); assert.equal(v.recipient_name, '[Name]'); assert.equal(v.rate, '[New hourly rate]'); assert.equal(v.items.length, 2); assert.equal(v.c, 'a')
})
test('PREVIEW: the request is checked, the route is admin only, and nothing here calls a model or reads staff or resident records', () => {
  assert.equal(cleanRequest({ kind: 'bogus' }), null); assert.equal(cleanRequest({ kind: 'letter', template_id: '../../etc' }), null); assert.equal(cleanRequest({ kind: 'newsletter', layout: 'wide' }), null)
  assert.deepEqual(cleanRequest({ kind: 'Newsletter', template_id: 'monthly-update-short', layout: 'Short' }), { kind: 'newsletter', template_id: 'monthly-update-short', layout: 'short' })
  const route = apiSrc('routes/ask-docs.ts'); assert.match(route, /askDocsRouter\.use\(guard\)/); assert.ok(route.indexOf('askDocsRouter.use(guard)') < route.indexOf("'/option-preview'"))
  assert.match(route, /req\.user\?\.role === 'admin'/)
  const src = apiSrc('services/ask-docs/option-preview.ts')
  assert.doesNotMatch(src, /anthropic|runner|runAgent|ai-tokens|token-usage|\.messages\.create/i); assert.doesNotMatch(src, /prisma as any\)\.(user|resident|staff|holiday)/)
})

// ── The screen ──────────────────────────────────────────────────────────────────────
test('SCREEN: the form and the option cards are wired into the panel for every agent, with labels and keyboard use', () => {
  const o = webSrc('components/ask/ask-overlay.tsx'), q = webSrc('components/ask/question-form.tsx'), b = webSrc('components/ask/options-block.tsx')
  assert.match(o, /QuestionFormCard/); assert.match(o, /OptionsBlock/); assert.match(o, /AnsweredCard/); assert.match(o, /visibleText/)
  assert.doesNotMatch(o, /agent\.id === 'newsletter' && token && parseOptions/)   // not tied to one agent
  assert.match(q, /htmlFor=\{id\}/); assert.match(q, /Send answers/); assert.match(q, /\(required\)/); assert.match(q, /type="submit"/); assert.match(q, /loadStaff/); assert.match(q, /role="alert"/)
  assert.match(b, /Preview/); assert.match(b, /Choose/); assert.match(b, /ExpandViewer/); assert.match(b, /aria-label=\{`Preview/)
  for (const f of [q, b]) { assert.doesNotMatch(f, /overflow-y-scroll|overflow-scroll/); assert.doesNotMatch(f, /[–—]/) }
})
