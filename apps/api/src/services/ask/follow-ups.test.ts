// Tightened follow ups (every agent): a draft pasted in the chat gets a Save button, an open "what would you like me to change?" becomes the Change form, any invitation in words gets buttons,
// a reply with no block at all gets a small default row, and "Change something" runs on the screen. Plain code, no model.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { AGENTS } from './agents'
import { DEFAULT_HOUSE_RULES_FORMS } from './house-rules-forms'
import { ASK_PROMPT_MAX } from './prompt-register'
import { endsInProseChoice, isChangeQuestion, changeMenuBlock, looksLikeUnsavedDocument, defaultSteps, withDeadEndFallback, SAVE_DRAFT_STEP } from './dead-end'
import { DEAD_ENDS, NOT_DEAD_ENDS, FOLLOW_UP_SAYS } from './dead-end-probes'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const apiSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../..', f), 'utf8')

// the draft Len's chat showed, pasted as text (no save tool called)
const PASTED = `Employees of the Month: Callum, Chloe and David

We are delighted to announce that Callum Fraser, Chloe Bennett and David Stone are our employees of the month for November.

Why they were chosen

Callum, Chloe and David have each made a real difference to our new residents and to the whole team this month. They stayed calm through a very busy week, helped new starters feel welcome and always found time for a resident who needed a chat. Their colleagues told us again and again how much they have helped.

A thank you

Thank you to Callum, Chloe and David for your outstanding contribution this month. Each of you will receive a £25 M&S voucher as a small token of our appreciation.

How to nominate next month

Do you know someone who deserves recognition? Speak to your manager or a member of the management team with the person's name and what they have done.

---

From Team Management

---

Would you like me to make any changes, or shall I save this as a draft for you?`

test('LEN\'S CHAT, replayed: a draft pasted as text with no save call gets a Save button; the open change question gets the Change form; a plain answer gets default buttons', async () => {
  const b = await web('lib/ask-blocks.ts')
  assert.equal(looksLikeUnsavedDocument(PASTED, { saveTools: ['save_newsletter_draft'], drafts: 0 }), true)
  const r = withDeadEndFallback(PASTED, { agentId: 'newsletter', drafts: 0, saveTools: ['save_newsletter_draft'] })
  assert.equal(r.appended, true); assert.ok(r.text.startsWith(PASTED.trimEnd()), 'the model words are untouched')
  const ns = b.parseNextSteps(r.text)!; assert.ok(ns.steps.some((s: any) => s.id === 'save_draft' && s.kind === 'ask' && /save the text above as a draft/i.test(s.payload)))
  assert.deepEqual(ns.steps[0].id, SAVE_DRAFT_STEP.id)
  // the click on Change something: the agent's open question in words (ends with a full stop, no question mark) becomes the Change form
  const open = 'What would you like me to change? I can adjust the wording, add or remove sections, change the tone, or make any other edits you need.'
  assert.equal(endsInProseChoice(open), true); assert.equal(isChangeQuestion(open), true)
  const c = withDeadEndFallback(open, { agentId: 'newsletter' }); assert.equal(c.appended, true)
  const q = b.parseQuestions(c.text)!; assert.equal(q.questions.length, 2)
  assert.deepEqual(q.questions[0].choices, ['Wording', 'Add or remove a section', 'Tone', 'People', 'Gift', 'Colours', 'Layout'])
  assert.equal(q.questions[1].kind, 'longtext'); assert.equal(q.questions[1].required, true)
  // a plain answer, long enough to matter, gets a small default row and never a "Would you like"
  const plain = 'Training is complete for 29 of 31 staff. The two who are outstanding are both new starters, and their dates fall inside the first month of their induction period, which ends on 12 December.'
  const p = withDeadEndFallback(plain, { agentId: 'staff' }); assert.equal(p.appended, true)
  const steps = b.parseNextSteps(p.text)!.steps; assert.ok(steps.length >= 2 && steps.length <= 3); assert.ok(steps.some((s: any) => s.id === 'follow_up' && s.kind === 'action'))
  assert.doesNotMatch(p.text.slice(plain.length), /would you like|let me know/i)
})

test('SAVE IN THE SAME TURN: the check fires only for a long, document-like text from an agent that has a save tool and saved nothing', () => {
  assert.equal(looksLikeUnsavedDocument(PASTED, { saveTools: ['save_newsletter_draft'], drafts: 1 }), false)   // it saved
  assert.equal(looksLikeUnsavedDocument(PASTED, { saveTools: [], drafts: 0 }), false)                         // no save tool (the Staff agent)
  assert.equal(looksLikeUnsavedDocument('Dear Helen,\n\nThank you for all you do.\n\nBest wishes', { saveTools: ['save_letter_draft'], drafts: 0 }), false)   // too short to be a draft
  assert.equal(looksLikeUnsavedDocument('The balance is 112 hours. ' + 'It is calculated from the allowance and the days taken. '.repeat(15), { saveTools: ['save_letter_draft'], drafts: 0 }), false)   // long, but not a document
  const letter = 'Dear Helen,\n\n' + 'Thank you for everything you have done for the home this year, and for the way you support the people we care for. '.repeat(8) + '\n\nYours sincerely,\nLen'
  assert.equal(looksLikeUnsavedDocument(letter, { saveTools: ['save_letter_draft'], drafts: 0 }), true)
  const out = withDeadEndFallback(letter, { agentId: 'letters', drafts: 0, saveTools: ['save_letter_draft'] })
  assert.match(out.text, /Save this as a draft/); assert.doesNotMatch(out.text.slice(letter.length), /[–—]/)
  // every agent that can save a document says so in its prompt (the same turn, one short line)
  for (const id of ['newsletter', 'governance']) assert.match(AGENTS.find(a => a.id === id)!.prompt, /IN THE SAME TURN|SAVE IN THE SAME TURN/)
  assert.match(AGENTS.find(a => a.id === 'letters')!.prompt, /end the SAME message with the share question block/)
  const runner = apiSrc('services/ask/runner.ts'); assert.match(runner, /saveTools: agent\.tools\.filter\(t => t in DRAFT_TOOL_TYPE\)/)
})

test('DETECTION: at least 25 dead end phrasings are caught (full stops, no question mark, invitations) and ordinary statements are left alone', () => {
  assert.ok(DEAD_ENDS.length >= 25, `only ${DEAD_ENDS.length}`)
  for (const t of DEAD_ENDS) assert.equal(endsInProseChoice(t), true, t.slice(0, 70))
  for (const t of NOT_DEAD_ENDS) assert.equal(endsInProseChoice(t), false, t.slice(0, 70))
  // "I can" in the middle of a long answer is not a dead end; at the end it is
  assert.equal(endsInProseChoice('I can see the balance is 112 hours. It is made up of the allowance, the days taken and the days booked, and nothing else is included in that figure.'), false)
  assert.equal(endsInProseChoice('That is the balance. I can adjust the dates if you need.'), true)
  assert.equal(endsInProseChoice('Here is the list.\n\n```next_steps\n{"steps":[{"id":"a","label":"A","kind":"ask"}]}\n```'), false)
})

test('CATCH ALL: every agent has default buttons for a plain answer, never an invitation in words, never for a one line acknowledgement or an error', () => {
  assert.ok(AGENTS.length >= 20)
  for (const a of AGENTS) {
    const s = defaultSteps(a.id, 'The total is 112 hours for 8 people.'); assert.ok(s.length >= 1 && s.length <= 3, a.id)
    assert.ok(s.some(x => x.id === 'follow_up'), `${a.id} has the follow up button`)
    for (const x of s) assert.doesNotMatch(x.label + x.payload, /[–—]/)
    const r = withDeadEndFallback('The total is 112 hours for 8 people across the whole of the year to date, as held in the records.', { agentId: a.id }); assert.equal(r.appended, true, a.id)
  }
  assert.equal(defaultSteps('pay', 'Total £4,200 a month.').some(x => x.id === 'show_working'), true)
  assert.equal(withDeadEndFallback('Done. The colours are now ocean blue.', { agentId: 'newsletter' }).appended, false)   // acknowledgement
  assert.equal(withDeadEndFallback('I could not finish working that out. Please try asking it a little differently, or break it into smaller questions.', { agentId: 'staff' }).appended, false)   // error
  assert.equal(withDeadEndFallback('Saved.', { agentId: 'letters', drafts: 1 }).appended, false)
})

test('THE CHANGE MENU: the form is the same wherever it comes from, per agent, and "Change something", "Edit" and "Ask a follow up" are screen actions', async () => {
  const b = await web('lib/ask-blocks.ts')
  for (const id of ['newsletter', 'letters', 'staff']) { const q = b.parseQuestions(changeMenuBlock(id))!; assert.equal(q.questions.length, 2); assert.ok(q.questions[0].choices.length >= 4, id) }
  assert.ok(!b.parseQuestions(changeMenuBlock('letters'))!.questions[0].choices.includes('Colours'))
  const mk = (x: any) => b.parseNextSteps('```next_steps\n' + JSON.stringify({ steps: [x] }) + '\n```')!.steps[0]
  for (const label of ['Change something', 'Make changes', 'Edit the content', 'Amend']) { const s = mk({ id: 'x', label, kind: 'ask' }); assert.equal(s.kind, 'action'); assert.equal(s.payload, 'edit', label) }
  const f = mk({ id: 'follow_up', label: 'Ask a follow up', kind: 'action', payload: 'follow_up' }); assert.equal(f.kind, 'action'); assert.equal(f.payload, 'follow_up')
  const o = webSrc('components/ask/ask-overlay.tsx'); assert.match(o, /action === 'follow_up'[\s\S]{0,200}getElementById\('ask-input'\)/)
  const fn = o.slice(o.indexOf('async function nextAction'), o.indexOf('const loadLib'))
  assert.match(fn, /action === 'edit'[\s\S]{0,160}if \(doc\) setDocId\(doc\); else ask_\(\)/)   // with a draft the editor opens and nothing is sent; without one the agent answers with the Change form
})

test('THE RULE TEXT: Rule 1 gives the Change form, Rule 7 calls any invitation in words a failure and says never to paste a draft, inside the editing limit', () => {
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /WHAT TO CHANGE is a question like any other/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /"title":"What would you like to change\?"/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /is a FAILURE, even with no question mark/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /Never paste a whole draft \(newsletter, letter, report\) into the chat/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /follow_up \(puts the cursor in the chat box\)/)
  assert.ok(DEFAULT_HOUSE_RULES_FORMS.length <= ASK_PROMPT_MAX, `${DEFAULT_HOUSE_RULES_FORMS.length} > ${ASK_PROMPT_MAX}`)
  assert.match(AGENTS.find(a => a.id === 'newsletter')!.prompt, /Tell me what to change/)
  assert.doesNotMatch(DEFAULT_HOUSE_RULES_FORMS, /[–—]/)
})

test('EVAL: the follow up phrasings from the chat are in the manual eval', () => {
  assert.ok(FOLLOW_UP_SAYS.some(x => /Change something/.test(x.say)) && FOLLOW_UP_SAYS.some(x => /employee of the month newsletter/.test(x.say)))
  const ev = apiSrc('scripts/ask-eval.ts'); assert.match(ev, /FOLLOW_UP_SAYS/); assert.match(ev, /DRAFTS SAVED/)
})
