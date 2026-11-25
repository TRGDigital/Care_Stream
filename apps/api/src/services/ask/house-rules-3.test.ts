// HOUSE RULE 9: a gentle one line check on unexpected choices, and which people questions take more than one person. The deciding code is plain and does not use the model, so it is tested on its own.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { AGENTS } from './agents'
import { buildSystemPrompt, __setPromptTestHooks } from './prompt-register'
import { DEFAULT_HOUSE_RULES_FORMS, HOUSE_RULES_SUMMARY } from './house-rules-forms'
import { LOCKED_RULES } from './safety'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const people = (...ids: string[]) => ids.map(id => ({ id, name: id.toUpperCase() }))
const SAID0 = { count: null, audience: null, names: [] as string[] }
const staff = Array.from({ length: 12 }, (_, i) => ({ id: `s${i}`, name: `Person ${i}` }))

test('KINDS: recognition questions take a small group, group questions take any number, risky ones are exactly one whatever the agent says', async () => {
  const ck = await web('lib/ask-check.ts')
  const q = (label: string, extra: any = {}) => ({ id: 'p', label, hint: '', required: true, kind: 'people', choices: [], ...extra })
  const SOME = ['Who is the employee of the month?', 'Who are the employees of the month?', 'Who is the star of the month?', 'Who would you like to thank?', 'Who are the new starters?', 'Who is leaving?', 'Whose birthday is it?', 'Whose work anniversary is it?', 'Who is in the staff story?', 'Who won the award?']
  for (const l of SOME) assert.equal(ck.peopleMode(q(l)), 'some', l)
  const MANY = ['Who should the training be allocated to?', 'Who should receive this notification?', 'Which staff should get the reminder?']
  for (const l of MANY) assert.equal(ck.peopleMode(q(l)), 'many', l)
  const ONE = ['Who is the letter for?', 'Who is the pay review for?', 'Whose holiday request is it?', 'Who is this warning about?', 'Who is the reference for?', 'Who should I approve this for?']
  for (const l of ONE) assert.equal(ck.peopleMode(q(l, { multiple: true })), 'one', `${l} is one even when the agent says multiple`)
  for (const l of ONE) assert.equal(ck.peopleMode(q(l, { mode: 'many' })), 'one', `${l} is one even when the agent says many`)
  assert.equal(ck.peopleMode(q('Who is it?')), 'one')                                       // an unknown kind is the safe one
  assert.equal(ck.peopleMode(q('Who is it?', { mode: 'some' })), 'some')                   // the agent may widen an unknown kind
  assert.equal(ck.peopleMode(q('Who is it?', { multiple: true })), 'many')                  // an older "multiple" means any number
  assert.deepEqual([ck.maxPeople('one'), ck.maxPeople('some'), ck.maxPeople('many')], [1, 12, 500])
  const w = ck.withMode(q('Who is the letter for?', { multiple: true, expected: 2 }))
  assert.equal(w.multiple, undefined); assert.equal(w.mode, 'one'); assert.equal(w.expected, undefined)
  assert.equal(ck.withMode(q('Who is the employee of the month?')).multiple, true)
})

test('PARSER: the question block may carry a mode for a people question and ignores a bad one', async () => {
  const b = await web('lib/ask-blocks.ts')
  const f = b.parseQuestions('```questions\n{"questions":[{"id":"p","label":"Who are the employees of the month?","kind":"people","mode":"some","expected":2},{"id":"q","label":"Who?","kind":"people","mode":"lots"},{"id":"t","label":"Tone?","kind":"text","mode":"many"}]}\n```')
  assert.equal(f.questions[0].mode, 'some'); assert.equal(f.questions[1].mode, undefined); assert.equal(f.questions[2].mode, undefined)
})

test('THE CHECK: two chosen after "an employee of the month" asks one line; two said does not; one chosen does not', async () => {
  const ck = await web('lib/ask-check.ts')
  const q = ck.withMode({ id: 'p', label: 'Who is the employee of the month?', hint: '', required: true, kind: 'people', choices: [] })
  assert.equal(ck.peopleCheck(q, people('a'), SAID0, 31), null)                              // one chosen, one expected: nothing to ask
  assert.equal(ck.peopleCheck(q, [], SAID0, 31), null)                                      // nothing chosen yet
  const c = ck.peopleCheck(q, people('a', 'b'), SAID0, 31)
  assert.equal(c.kind, 'people_more'); assert.equal(c.text, 'You have chosen 2 people. Is this two employees of the month?'); assert.equal(c.yes, 'Yes, two'); assert.equal(c.no, 'No, just one')
  assert.doesNotMatch(JSON.stringify(c), /[–—]/)
  assert.equal(ck.peopleCheck(q, people('a', 'b'), { ...SAID0, count: 2 }, 31), null)       // they said two: no check
  const three = ck.peopleCheck(q, people('a', 'b', 'c'), { ...SAID0, count: 2 }, 31)       // they said two, chose three
  assert.equal(three.kind, 'people_more'); assert.equal(three.no, 'No, two'); assert.match(three.text, /three employees of the month/)
  const fewer = ck.peopleCheck(q, people('a'), { ...SAID0, count: 2 }, 31)                  // they said two, chose one
  assert.equal(fewer.kind, 'people_fewer'); assert.equal(fewer.text, 'You said two, but chose one. Is that right?'); assert.equal(fewer.yes, 'Yes, just one'); assert.equal(fewer.no, 'Choose two')
  assert.equal(ck.peopleCheck(q, people('a', 'b'), { ...SAID0, names: ['Helen Thomas', 'Sam Reed'] }, 31), null)   // they typed two names and chose two
  assert.equal(ck.peopleCheck(q, people('a', 'b'), { ...SAID0, names: ['Helen Thomas'] }, 31).kind, 'people_more')  // they typed one name, chose two
  assert.equal(ck.peopleCheck({ ...q, expected: 2 }, people('a', 'b'), SAID0, 31), null)    // the agent set 2 from their words
})

test('THE CHECK: a confirmed choice is not asked twice, a changed choice is asked again, and the id carries what was chosen', async () => {
  const ck = await web('lib/ask-check.ts')
  const q = ck.withMode({ id: 'p', label: 'Who is the employee of the month?', hint: '', required: true, kind: 'people', choices: [] })
  const form = { title: '', questions: [q] }
  const checks = (ids: string[]) => ck.checksFor(form, { p: { text: '', people: people(...ids) } }, SAID0, 31, '2026-11-26')
  const first = checks(['a', 'b'])
  assert.equal(first.length, 1)
  assert.equal(ck.pendingChecks(first, {}).length, 1)
  assert.equal(ck.pendingChecks(first, { [first[0].id]: first[0].note }).length, 0)            // confirmed: gone
  assert.equal(checks(['b', 'a'])[0].id, first[0].id)                                           // the same two people in another order is the same choice
  const changed = checks(['a', 'c'])
  assert.notEqual(changed[0].id, first[0].id)                                                   // a different choice is asked again
  assert.equal(ck.pendingChecks(changed, { [first[0].id]: first[0].note }).length, 1)
  assert.equal(first[0].note, 'confirmed 2 people')
})

test('DECLINE: "No, just one" returns the form to what was expected; the others do what their button says', async () => {
  const ck = await web('lib/ask-check.ts')
  const q = ck.withMode({ id: 'p', label: 'Who is the employee of the month?', hint: '', required: true, kind: 'people', choices: [] })
  const c = ck.peopleCheck(q, people('a', 'b'), SAID0, 31)
  assert.deepEqual(ck.declineValue(c, { text: '', people: people('a', 'b') }, q, SAID0, null).people.map((p: any) => p.id), ['a'])
  const c3 = ck.peopleCheck(q, people('a', 'b', 'c'), { ...SAID0, count: 2 }, 31)
  assert.deepEqual(ck.declineValue(c3, { text: '', people: people('a', 'b', 'c') }, q, { ...SAID0, count: 2 }, null).people.map((p: any) => p.id), ['a', 'b'])
  const fewer = ck.peopleCheck(q, people('a'), { ...SAID0, count: 2 }, 31)
  assert.deepEqual(ck.declineValue(fewer, { text: '', people: people('a') }, q, { ...SAID0, count: 2 }, null).people.map((p: any) => p.id), ['a'])   // they go on to pick another
})

test('GROUPS: everyone said but few chosen, and all chosen without saying so, are checked for a group question only', async () => {
  const ck = await web('lib/ask-check.ts')
  const q = ck.withMode({ id: 'p', label: 'Who should receive this notification?', hint: '', required: true, kind: 'people', choices: [] })
  assert.equal(ck.peopleMode(q), 'many')
  assert.equal(ck.peopleCheck(q, people('a', 'b', 'c'), SAID0, 31), null)                       // any group of a normal size, nothing said: no check
  const few = ck.peopleCheck(q, people('a', 'b', 'c'), { ...SAID0, audience: { kind: 'all' } }, 31)
  assert.equal(few.kind, 'people_few'); assert.equal(few.text, 'You said everyone, but chose 3 of 31. Is that right?')
  assert.equal(ck.peopleCheck(q, people(...Array.from({ length: 31 }, (_, i) => `s${i}`)), { ...SAID0, audience: { kind: 'all' } }, 31), null)   // everyone said and chosen
  const all = ck.peopleCheck(q, people(...Array.from({ length: 31 }, (_, i) => `s${i}`)), SAID0, 31)
  assert.equal(all.kind, 'people_all'); assert.equal(all.text, 'You have chosen all 31 staff. Is that right?')
  assert.equal(ck.peopleCheck(q, people('a', 'b'), { ...SAID0, count: 3 }, 31).kind, 'people_fewer')            // a number said for a group question counts
  assert.deepEqual(ck.declineValue(few, { text: '', people: people('a') }, q, SAID0, staff).people.length, 12)   // "Choose everyone" ticks the whole list
  assert.deepEqual(ck.declineValue(all, { text: '', people: people('a') }, q, SAID0, staff).people, [])          // "Change it" clears it
  assert.equal(ck.peopleCheck(q, people('a', 'b', 'c', 'd'), SAID0, 3), null)                    // a tiny account is never asked about "all"
})

test('RISKY: a letter, a pay review or a holiday decision refuses a second person, and no check is ever needed', async () => {
  const ck = await web('lib/ask-check.ts'), pf = await web('lib/ask-prefill.ts'), b = await web('lib/ask-blocks.ts')
  for (const label of ['Who is the letter for?', 'Who is the pay review for?', 'Whose holiday request is this?']) {
    const q = ck.withMode({ id: 'p', label, hint: '', required: true, kind: 'people', choices: [], multiple: true })
    assert.equal(ck.peopleMode(q), 'one'); assert.equal(q.multiple, undefined)
    assert.equal(ck.peopleCheck(q, people('a', 'b'), SAID0, 31), null)                          // the picker will not let a second person be chosen, so nothing to ask
    const form = b.parseQuestions(`\`\`\`questions\n{"questions":[{"id":"p","label":"${label}","kind":"people","multiple":true,"expected":2}]}\n\`\`\``)
    const r = pf.prefillForm(form, ['write a letter for Helen and Sam'], [{ id: 'h', name: 'Helen Thomas' }, { id: 's', name: 'Sam Reed' }])
    assert.equal(r.values.p, undefined)                                                         // two names for a one person question are never guessed between
    assert.equal(r.form.questions[0].multiple, undefined)
  }
  const oneName = pf.prefillForm(b.parseQuestions('```questions\n{"questions":[{"id":"p","label":"Who is the letter for?","kind":"people"}]}\n```'), ['a letter for Helen'], [{ id: 'h', name: 'Helen Thomas' }, { id: 's', name: 'Sam Reed' }])
  assert.deepEqual(oneName.values.p.people.map((p: any) => p.id), ['h'])                        // one name for one person: filled
  const msg = b.formatAnswers(b.parseQuestions('```questions\n{"questions":[{"id":"p","label":"Who is the letter for?","kind":"people"}]}\n```'), { p: { text: '', people: people('a', 'b') } })
  assert.match(msg, /Answer: A\n/); assert.doesNotMatch(msg, /Answer: A, B/)                    // even a forced second person never reaches the agent
})

test('DATES: a deadline in the past is checked; a start date, a birthday and a future date are not', async () => {
  const ck = await web('lib/ask-check.ts')
  const d = (label: string, hint = '') => ({ id: 'd', label, hint, required: false, kind: 'date', choices: [] })
  const TODAY = '2026-11-26'
  const c = ck.dateCheck(d('Nominations close by when?'), { text: '2026-11-20' }, TODAY)
  assert.equal(c.kind, 'date_past'); assert.equal(c.text, 'That date, 20 November 2026, has already gone. Is that right?'); assert.equal(c.yes, 'Yes, it is'); assert.equal(c.no, 'Change it')
  assert.equal(ck.dateCheck(d('Nominations close by when?'), { text: '2026-11-26' }, TODAY), null)   // today is fine
  assert.equal(ck.dateCheck(d('Nominations close by when?'), { text: '2026-12-01' }, TODAY), null)
  assert.equal(ck.dateCheck(d('When did they start?'), { text: '2020-01-01' }, TODAY), null)
  assert.equal(ck.dateCheck(d('Date of birth?'), { text: '1980-01-01' }, TODAY), null)
  assert.equal(ck.dateCheck(d('Deadline for the previous course?'), { text: '2020-01-01' }, TODAY), null)
  assert.equal(ck.dateCheck(d('Nominations close by when?'), { text: '' }, TODAY), null)
  assert.equal(ck.dateCheck(d('A note'), { text: '2020-01-01' }, TODAY), null)                   // not a date about the future
  const declined = ck.declineValue(c, { text: '2026-11-20' }, d('x'), SAID0, null)
  assert.equal(declined.text, '')
})

test('TEMPLATE: choosing a template other than the one they typed asks; layouts and matching choices do not', async () => {
  const ck = await web('lib/ask-check.ts')
  const mk = (id: string, title: string) => ({ id, title, description: '', preview: { kind: 'newsletter', template_id: id, layout: null } })
  const set = { title: '', options: [mk('eotm', 'Employee of the month'), mk('stories', 'Staff stories'), mk('thanks', 'Recognition and thank yous')] }
  const c = ck.templateCheck(['I need an employee of the month newsletter'], set.options[1], set)
  assert.equal(c.kind, 'template'); assert.equal(c.text, 'You asked for Employee of the month. Is Staff stories what you want?'); assert.equal(c.yes, 'Yes, use Staff stories')
  assert.equal(ck.templateCheck(['I need an employee of the month newsletter'], set.options[0], set), null)   // the one they asked for
  assert.equal(ck.templateCheck(['make a newsletter'], set.options[1], set), null)                          // they did not name one
  const layouts = { title: '', options: [mk('s', 'Short'), mk('st', 'Standard'), mk('d', 'Detailed')] }
  assert.equal(ck.templateCheck(['employee of the month, short please'], layouts.options[1], layouts), null)  // layout names are one word and never trigger it
})

test('ANSWER MESSAGE: a confirmed check is written into the answers so the agent adapts, and the answered card hides it', async () => {
  const b = await web('lib/ask-blocks.ts'), ck = await web('lib/ask-check.ts')
  const q = ck.withMode(b.parseQuestions('```questions\n{"questions":[{"id":"p","label":"Who are the employees of the month?","kind":"people","mode":"some","required":true}]}\n```').questions[0])
  const msg = b.formatAnswers({ title: 'About the winners', questions: [q] }, { p: { text: '', people: [{ id: 'a', name: 'Helen Thomas' }, { id: 'b', name: 'Sam Reed' }] } }, { p: 'confirmed 2 people' })
  assert.match(msg, /Answer: Helen Thomas, Sam Reed/); assert.match(msg, /Staff ids: a, b/); assert.match(msg, /\n {3}Check: confirmed 2 people/)
  const parsed = b.parseAnswersMessage(msg)
  assert.equal(parsed.pairs.length, 1); assert.doesNotMatch(JSON.stringify(parsed), /Check|confirmed|Staff ids/)         // the card shows names only
  const plain = b.formatAnswers({ title: '', questions: [q] }, { p: { text: '', people: [{ id: 'a', name: 'Helen Thomas' }] } })
  assert.doesNotMatch(plain, /Check:/)                                                                                  // nothing confirmed, no line
})

test('ADAPTS: after "yes, two" the plan is plural, with a consent and a picture for each, and a gift question that asks shared or one each (the rule text)', () => {
  const r9 = DEFAULT_HOUSE_RULES_FORMS.slice(DEFAULT_HOUSE_RULES_FORMS.indexOf('RULE 9'))
  for (const w of ['You have chosen 2 people. Is this two employees of the month?', 'Yes, two', 'No, just one', 'plural wording', 'consent and a picture for each person', 'one shared gift or one each', 'Check:', 'do not ask again', 'never blocks', 'never lectures']) assert.ok(r9.includes(w), `rule 9 says: ${w}`)
  assert.doesNotMatch(r9, /[–—]/)
  assert.ok(DEFAULT_HOUSE_RULES_FORMS.includes('"mode":"some","expected":2'))                    // the people example uses mode
  assert.ok(DEFAULT_HOUSE_RULES_FORMS.includes('always use "one"'))                              // the risky kinds are named
})

test('EVERY AGENT: the composed prompt carries rule 9 (editable, after the job and before the locked rules), and the summary lists twelve rules', async () => {
  assert.ok(AGENTS.length >= 20)
  __setPromptTestHooks({ reader: async () => null })
  try {
    for (const a of AGENTS) {
      const p = await buildSystemPrompt(a, '2026-11-26', 'Ferndale', '')
      assert.ok(p.includes('RULE 9, A GENTLE CHECK ON UNEXPECTED CHOICES'), `${a.id} carries rule 9`)
      assert.ok(p.indexOf('RULE 9, A GENTLE CHECK') > p.indexOf('YOUR JOB:'), `${a.id}: after its own job`)
      assert.ok(p.indexOf('RULE 9, A GENTLE CHECK') < p.indexOf(LOCKED_RULES.slice(0, 40)), `${a.id}: before the locked rules`)
    }
  } finally { __setPromptTestHooks({ reader: null }) }
  assert.deepEqual(HOUSE_RULES_SUMMARY.map(r => r.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  const nine = HOUSE_RULES_SUMMARY[8]
  assert.equal(nine.locked, false); assert.ok(nine.line.length < 100); assert.doesNotMatch(`${nine.title} ${nine.line}`, /[–—]/)
  const page = webSrc('app/(platform)/platform/prompts/page.tsx')
  assert.match(page, /The house rules/); assert.match(page, /Every rule except rule 6 is editable/)
})

test('SCREEN: the form and the option cards use the check line, nothing is blocked, and the answers carry the confirmation', () => {
  const form = webSrc('components/ask/question-form.tsx'), opts = webSrc('components/ask/options-block.tsx'), ov = webSrc('components/ask/ask-overlay.tsx')
  assert.match(form, /export function CheckLine/); assert.match(form, /role="group" aria-label="A quick check"/); assert.match(form, /aria-live="polite"/)
  assert.match(form, /checksFor\(/); assert.match(form, /pendingChecks\(/); assert.match(form, /declineValue\(/); assert.match(form, /formatAnswers\(form, values, notes\)/)
  assert.match(form, /data-check-yes/)                                                           // Send moves focus to the first answer instead of silently failing
  assert.match(form, /peopleMode\(q\)/); assert.match(form, /maxPeople\(mode\)/)
  assert.doesNotMatch(form, /overflow-y-(auto|scroll)/)                                           // no scroll bars
  assert.match(opts, /templateCheck\(typed, o, set\)/); assert.match(opts, /<CheckLine/); assert.match(ov, /<OptionsBlock[^>]*typed=\{/)
  assert.doesNotMatch(`${form}${opts}`, /[–—]/)
  const lib = webSrc('lib/ask-check.ts')
  assert.doesNotMatch(lib, /fetch\(|ask\./)                                                       // plain code, no model, no network
  assert.doesNotMatch(lib, /[–—]/)
})

test('AUDIT: the check changes nothing on the server: no new audit event and no route', () => {
  const audit = fs.readFileSync(path.resolve(__dirname, '../../lib/audit.ts'), 'utf8')
  assert.doesNotMatch(audit, /ask_check|ask_gentle/)
  const routes = fs.readFileSync(path.resolve(__dirname, '../../routes/ask.ts'), 'utf8')
  assert.doesNotMatch(routes, /\/checks?\b/)
})

test('RULE 13: keep it uncluttered is in the shared prompt of every agent, editable, and says internal checks are never shown to the tenant', async () => {
  const r = HOUSE_RULES_SUMMARY[12]
  assert.equal(r.n, 13); assert.equal(r.locked, false); assert.ok(r.line.length < 100); assert.doesNotMatch(`${r.title} ${r.line}`, /[–—]/)
  assert.ok(DEFAULT_HOUSE_RULES_FORMS.includes(r.phrase)); assert.match(DEFAULT_HOUSE_RULES_FORMS, /Never show CareStream's internal checks/)
  __setPromptTestHooks({ reader: async () => null })
  try { for (const a of AGENTS) assert.ok((await buildSystemPrompt(a, '2026-11-26', 'Ferndale', '')).includes('RULE 13, KEEP IT UNCLUTTERED'), a.id) } finally { __setPromptTestHooks({ reader: null }) }
})
