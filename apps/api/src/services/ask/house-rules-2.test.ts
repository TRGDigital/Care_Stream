// HOUSE RULES 3 to 8 (rule 6 is in confidentiality.test.ts): staff from the list with pictures, Save PDF and Print on every document, the Share this panel, next step buttons on every agent,
// and reading what the administrator has already said.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { AGENTS, systemPromptFor } from './agents'
import { buildSystemPrompt, __setPromptTestHooks } from './prompt-register'
import { DEFAULT_HOUSE_RULES_FORMS, NEXT_STEPS_REQUIRED, withNextStepsReminder } from './house-rules-forms'
import { DRAFT_TOOL_TYPE } from './runner'
import { planShare, summaryLine, NAMES_SHOWN, type PlanDoc, type PlanPerson } from '../ask-docs/share-plan'
import { adminsFirst } from './actions/recipients'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const apiSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../..', f), 'utf8')

test('RULES 3, 4, 5, 7 and 8 are in the composed prompt of EVERY agent (all of them, not a sample), with an example each', async () => {
  assert.ok(AGENTS.length >= 20, `expected the full registry, got ${AGENTS.length}`)
  __setPromptTestHooks({ reader: async () => null })
  try {
    for (const a of AGENTS) {
      const p = await buildSystemPrompt(a, '2026-11-26', 'Ferndale', '')
      for (const mark of ['RULE 3, STAFF COME FROM THE LIST', 'RULE 4, EVERY DOCUMENT CAN BE SAVED AND PRINTED', 'RULE 5, SHARING IS ONE PANEL', 'RULE 7, ALWAYS END WITH NEXT STEP BUTTONS', 'RULE 8, READ WHAT THE ADMINISTRATOR HAS ALREADY SAID', '```next_steps', 'Staff ids:']) assert.ok(p.includes(mark), `${a.id} is missing: ${mark}`)
      assert.ok(systemPromptFor(a, '2026-11-26', 'Ferndale').includes('RULE 7'), a.id)
    }
  } finally { __setPromptTestHooks({ reader: null }) }
  assert.doesNotMatch(DEFAULT_HOUSE_RULES_FORMS, /[–—]/)
  // the default next steps for each kind of output are spelled out
  for (const k of ['After a newsletter or letter draft', 'After an answer with figures', 'After a list of people', 'After a quality, audit or governance report', 'After a notification, reminder or training allocation proposal', 'After an upload', 'After a Knowledge answer', 'Something else']) assert.match(DEFAULT_HOUSE_RULES_FORMS, new RegExp(k))
})

test('RULE 7: after a draft or a proposal is saved the tool result itself tells the agent to end with next_steps (tool level), and the runner applies it', () => {
  for (const t of ['save_letter_draft', 'save_newsletter_draft', 'save_report_draft', 'propose_staff_notification', 'propose_unread_reminder', 'propose_training_allocation', 'propose_training_reminders']) {
    const r = withNextStepsReminder(t, { saved: true, document_id: 'x' })
    assert.equal(r.next_steps_required, NEXT_STEPS_REQUIRED, t)
  }
  assert.equal(withNextStepsReminder('save_letter_draft', { saved: false, missing: ['a'] }).next_steps_required, undefined)   // nothing was made, so nothing to take forward
  assert.equal(withNextStepsReminder('pay_summary', { rows: 1 }).next_steps_required, undefined)
  assert.match(apiSrc('services/ask/runner.ts'), /withNextStepsReminder\(c\.name, r\.data\)/)
  assert.deepEqual(Object.keys(DRAFT_TOOL_TYPE).sort(), ['save_letter_draft', 'save_newsletter_draft', 'save_report_draft'])
  // every tool that saves a draft is covered by the prefix rule
  const names = AGENTS.flatMap(a => a.tools).filter(n => /^(save_|propose_)/.test(n))
  assert.ok(names.length >= 6)
  for (const n of new Set(names)) assert.ok(withNextStepsReminder(n, { saved: true }).next_steps_required, n)
})

test('RULE 7: the next_steps block is parsed, bad blocks fall back to plain text, only known actions and our own pages are allowed, and at most five buttons', async () => {
  const b = await web('lib/ask-blocks.ts')
  const text = 'Here it is.\n```next_steps\n{"steps":[{"id":"edit","label":"Edit the content","kind":"action","payload":"edit"},{"id":"pdf","label":"Save PDF","kind":"action","payload":"save_pdf"},{"id":"more","label":"Make a letter from this","kind":"ask"},{"id":"x","label":"Odd","kind":"action","payload":"launch_missiles"},{"id":"l","label":"Open notifications","kind":"link","payload":"/notifications"},{"id":"o","label":"Outside","kind":"link","payload":"https://evil.example"}]}\n```'
  const n = b.parseNextSteps(text)
  assert.equal(n.steps.length, 5)                                                      // five at most
  assert.deepEqual(n.steps.slice(0, 2).map((s: any) => s.kind), ['action', 'action'])
  assert.equal(n.steps[3].kind, 'ask')                                                 // an unknown action is only a plain ask
  assert.equal(n.steps[4].kind, 'link'); assert.equal(n.steps[4].payload, '/notifications')
  assert.equal(b.parseNextSteps('```next_steps\n{bad json\n```'), null)
  assert.equal(b.parseNextSteps('no block here'), null)
  assert.equal(b.visibleText(text), 'Here it is.')                                      // the block is never shown as text
  assert.match(b.visibleText('Words\n```next_steps\n{bad json\n```'), /bad json/)      // a malformed block is not lost
  const o = b.parseNextSteps('```next_steps\n[{"label":"Outside","kind":"link","payload":"https://evil.example"}]\n```')
  assert.equal(o.steps[0].kind, 'ask')                                                 // never an outside address
  const sent = b.formatNext({ id: 'letter', label: 'Make a letter from this', payload: null })
  assert.deepEqual(b.parseNextMessage(sent), { label: 'Make a letter from this' })
  assert.deepEqual(b.parseNextMessage(b.formatSomethingElse('Add a line about parking')), { label: 'Add a line about parking' })
})

test('RULE 7: the chat shows next step buttons for the last answer, with the main button first and a Something else box; a saved draft is shown DESIGNED, not as plain text', () => {
  const ns = webSrc('components/ask/next-steps.tsx')
  assert.match(ns, /i === 0 \? 'bg-teal text-white/); assert.match(ns, /Something else/); assert.match(ns, /role="group" aria-label="Next steps"/)
  const ov = webSrc('components/ask/ask-overlay.tsx')
  assert.match(ov, /<NextStepsBar/); assert.match(ov, /<DraftCard/); assert.match(ov, /<DocViewer/); assert.match(ov, /mi === messages\.length - 1/)
  const dc = webSrc('components/ask/draft-card.tsx')
  assert.match(dc, /Expandable/); assert.match(dc, /DocumentActions/); assert.match(dc, /designed version/)
  assert.match(apiSrc('routes/ask.ts'), /document_id: d\.id, doc_type: d\.type/)
})

test('RULE 3: answers show names only (never a staff id), a single choice holds exactly one person, a people question is answered only by picking from the list', async () => {
  const b = await web('lib/ask-blocks.ts')
  const form = b.parseQuestions('```questions\n{"questions":[{"id":"p","label":"Who is the employee of the month?","kind":"people","required":true},{"id":"m","label":"Who are the others?","kind":"people","multiple":true,"expected":2}]}\n```')
  assert.equal(form.questions[0].multiple, undefined); assert.equal(form.questions[1].multiple, true); assert.equal(form.questions[1].expected, 2)
  const values = { p: { text: 'Len', people: [{ id: 'd6d2f65b-1111', name: 'Chloe Bennett' }, { id: 'u2', name: 'Len Burgess' }] }, m: { text: '', people: [{ id: 'a1', name: 'Helen Thomas' }, { id: 'a2', name: 'Sam Reed' }] } }
  const msg = b.formatAnswers(form, values)
  assert.match(msg, /Answer: Chloe Bennett\n\s+Staff ids: d6d2f65b-1111\n/)          // exactly one person, ids on their own line
  assert.doesNotMatch(msg, /Len Burgess|Answer: [^\n]*staff id/i)                       // the second person and the typed text were not used for a single choice
  assert.match(msg, /Answer: Helen Thomas, Sam Reed\n\s+Staff ids: a1, a2/)
  const shown = b.parseAnswersMessage(msg)
  assert.deepEqual(shown.pairs.map((p: any) => p.answer), ['Chloe Bennett', 'Helen Thomas, Sam Reed'])   // what the administrator sees: names only
  assert.doesNotMatch(JSON.stringify(shown), /d6d2f65b|Staff ids|staff id/i)
  assert.deepEqual(b.missingAnswers(form, { p: { text: 'Helen' } }), ['p'])             // a typed name does not answer a people question
  assert.deepEqual(b.missingAnswers(form, { p: { text: '', people: [{ id: 'x', name: 'X' }] } }), [])
})

test('RULE 3: the shared staff picker logic: admins first, search by name or job, single and several, a page at a time, no scroll bar', async () => {
  const sp = await web('lib/staff-picker.ts')
  const staff = [{ id: '1', name: 'Zed Adams', job_role: 'Cook' }, { id: '2', name: 'Ann Boss', job_role: 'Manager', is_admin: true }, { id: '3', name: 'Bea Carter', job_role: 'Carer', photo_url: 'x' }, { id: '4', name: 'Amélie Dupont', job_role: 'Carer' }]
  assert.deepEqual(sp.orderStaff(staff).map((p: any) => p.id), ['2', '4', '3', '1'])      // the admin first, then A to Z
  assert.deepEqual(sp.filterStaff(staff, 'amelie').map((p: any) => p.id), ['4'])           // accents do not matter
  assert.deepEqual(sp.filterStaff(staff, 'carer').map((p: any) => p.id), ['3', '4'])       // job titles are searched too
  assert.deepEqual(sp.filterStaff(staff, '', 'Cook').map((p: any) => p.id), ['1'])
  assert.deepEqual(sp.nextSelection([], 'a', 'single'), ['a']); assert.deepEqual(sp.nextSelection(['a'], 'b', 'single'), ['b']); assert.deepEqual(sp.nextSelection(['a'], 'a', 'single'), [])
  assert.deepEqual(sp.nextSelection(['a'], 'b', 'multi'), ['a', 'b']); assert.deepEqual(sp.nextSelection(['a', 'b'], 'c', 'multi', 2), ['a', 'b'])
  assert.equal(sp.hasPicture(staff[2]), true); assert.equal(sp.hasPicture(staff[0]), false)
  const many = Array.from({ length: 20 }, (_, i) => ({ id: String(i), name: `P${i}` }))
  assert.deepEqual([sp.pageOf(many, 1).shown.length, sp.pageOf(many, 1).hidden, sp.pageOf(many, 3).hidden], [8, 12, 0])
  const comp = webSrc('components/ask/staff-picker.tsx')
  assert.match(comp, /No picture yet/); assert.match(comp, /Show more/); assert.match(comp, /StaffAvatar/); assert.doesNotMatch(comp, /overflow-y-(auto|scroll)/)
  // the API sends administrators first and only active, eligible staff, with the signed picture address
  assert.deepEqual(adminsFirst([{ name: 'B', is_admin: false }, { name: 'A', is_admin: false }, { name: 'Z', is_admin: true }]).map(x => x.name), ['Z', 'A', 'B'])
  assert.match(apiSrc('routes/ask-actions.ts'), /adminsFirst\(await eligibleStaff/)
})

test('RULE 3: every place an administrator picks staff uses the ONE picker (no raw selects, no typed names)', () => {
  assert.match(webSrc('components/ask/question-form.tsx'), /<StaffPicker/)
  assert.doesNotMatch(webSrc('components/ask/question-form.tsx'), /Type a name/)
  assert.match(webSrc('components/ask/action-card.tsx'), /<StaffPicker/)
  assert.match(webSrc('components/ask/upload-panel.tsx'), /<StaffSelect/); assert.doesNotMatch(webSrc('components/ask/upload-panel.tsx'), /<option value=\{s\.id\}/)
  assert.match(webSrc('components/ask/document-panel.tsx'), /<StaffPicker/); assert.doesNotMatch(webSrc('components/ask/document-panel.tsx'), /adminNotifications\.staff/)
  assert.match(webSrc('components/ask/share-panel.tsx'), /<StaffPicker/)
})

test('RULE 4: every document surface uses Save PDF and Print as two SEPARATE buttons, drafts are stamped DRAFT and samples SAMPLE', () => {
  const da = webSrc('components/ask/document-actions.tsx')
  assert.match(da, /Save PDF<\/button>/); assert.match(da, /Print<\/button>/)
  assert.equal((da.match(/<button/g) ?? []).length >= 4, true)   // pdf, print, word, expand are each their own button
  for (const f of ['components/ask/document-panel.tsx', 'components/ask/draft-card.tsx']) assert.match(webSrc(f), /<DocumentActions/, f)
  for (const f of ['components/ask/document-panel.tsx', 'components/ask/draft-card.tsx', 'components/ask/options-block.tsx', 'components/ask/layout-thumbs.tsx', 'components/ask/ask-overlay.tsx']) assert.match(webSrc(f), /pdf=\{|pdf=\{\{|<DocumentActions/, `${f} gives its viewer Save PDF and Print`)
  const ev = webSrc('components/ask/expand-viewer.tsx'); assert.match(ev, /<DocumentActions/); assert.match(ev, /pdf\?: \{ getPdf/)
  assert.doesNotMatch(webSrc('components/ask/layout-thumbs.tsx'), /noPrint/); assert.doesNotMatch(webSrc('components/ask/options-block.tsx'), /noPrint/)
  assert.match(webSrc('lib/document-actions.ts'), /DRAFT is printed on every page/); assert.match(webSrc('lib/document-actions.ts'), /SAMPLE is printed on every page/)
  // server: drafts are stamped and nothing is recorded as shared; samples have their own PDF route
  const ask = apiSrc('routes/ask.ts'), docs = apiSrc('routes/ask-docs.ts')
  assert.match(ask, /DRAFT_STAMP/); assert.match(ask, /req\.query\.draft !== '1'/); assert.match(ask, /ask_document_draft_copy/)
  assert.match(docs, /req\.query\.draft !== '1'/); assert.match(docs, /\/option-preview\/pdf/)
  assert.match(apiSrc('services/ask-docs/render-doc.ts'), /DRAFT: not yet approved/)
  assert.match(apiSrc('services/ask-docs/option-preview.ts'), /SAMPLE: placeholder words only/)
  for (const f of ['services/letters/layout-pdf.ts', 'services/letters/layout-docx.ts', 'services/ask-docs/newsletter-design.ts']) assert.match(apiSrc(f), /stamp/, f)
})

const eligible: PlanPerson[] = Array.from({ length: 14 }, (_, i) => ({ id: `u${i}`, name: `Person ${i}`, has_email: i !== 13 }))
const settings = { max_recipients: 100, min_gap_minutes: 2, emails_enabled: true }
const news = (o: Partial<PlanDoc> = {}): PlanDoc => ({ id: 'd1', type: 'newsletter', title: 'November news', status: 'approved', created_by: 'a', data: {}, ...o })
const letter = (o: Partial<PlanDoc> = {}): PlanDoc => ({ id: 'd2', type: 'letter', title: 'Pay review', status: 'approved', created_by: 'a', data: { staff_user_id: 'u3' }, ...o })

test('RULE 5: who and how combinations: a newsletter can go to one, chosen or all staff; a letter only to its one person; a report never to everyone', () => {
  for (const how of ['email', 'hub', 'both']) {
    assert.equal(planShare(news(), { how, who: 'all' }, eligible, settings).ok, true, `newsletter all ${how}`)
    assert.equal(planShare(news(), { how, who: 'selected', user_ids: ['u1', 'u2'] }, eligible, settings).count, 2)
    assert.equal(planShare(news(), { how, who: 'one', user_ids: ['u1'] }, eligible, settings).count, 1)
    assert.equal(planShare(letter(), { how, who: 'one' }, eligible, settings).ok, true, `letter ${how}`)
  }
  assert.equal(planShare(news(), { how: 'hub', who: 'all' }, eligible, settings).notification_email, false)        // hub only: no email
  assert.equal(planShare(news(), { how: 'email', who: 'all' }, eligible, settings).notification_email, true)
  assert.deepEqual(planShare(letter(), { how: 'both', who: 'one' }, eligible, settings).channels, ['email', 'hub'])
  assert.deepEqual(planShare(letter(), { how: 'hub', who: 'one' }, eligible, settings).channels, ['hub'])
  const all = planShare(letter(), { how: 'hub', who: 'all' }, eligible, settings); assert.equal(all.ok, false); assert.match(all.blockers.join(' '), /one person at a time/)
  assert.equal(planShare(letter(), { how: 'hub', who: 'selected', user_ids: ['u1'] }, eligible, settings).ok, false)
  const rep = planShare({ ...news(), type: 'report', data: {} }, { how: 'email', who: 'all' }, eligible, settings); assert.equal(rep.ok, false); assert.match(rep.blockers.join(' '), /cannot be sent to everyone/)
  assert.equal(planShare({ ...news(), type: 'report', data: { internal_only: true } }, { how: 'email', who: 'selected', user_ids: ['u1'] }, eligible, settings).ok, false)
  assert.equal(planShare({ ...news(), type: 'answer' }, { how: 'email', who: 'all' }, eligible, settings).ok, false)
  assert.equal(planShare(news(), { how: 'carrier pigeon', who: 'all' }, eligible, settings).ok, false)
})

test('RULE 5: print only letters are never sent, approval comes first, the Ask limits apply, names show for ten or fewer', () => {
  const po = planShare(letter({ data: { staff_user_id: 'u3', share_intent: { hub: false, email: false, print_only: true } } }), { how: 'hub', who: 'one' }, eligible, settings)
  assert.equal(po.ok, false); assert.match(po.blockers.join(' '), /print only/)
  const draft = planShare(news({ status: 'draft' }), { how: 'hub', who: 'all' }, eligible, settings); assert.equal(draft.ok, false); assert.match(draft.blockers.join(' '), /approved/)
  assert.equal(planShare(news({ status: 'pending' }), { how: 'hub', who: 'all' }, eligible, settings).ok, false)
  const big = planShare(news(), { how: 'both', who: 'all' }, eligible, { ...settings, max_recipients: 5 }); assert.equal(big.ok, false); assert.match(big.blockers.join(' '), /up to 5 people/)
  const few = planShare(news(), { how: 'hub', who: 'selected', user_ids: ['u0', 'u1', 'u2'] }, eligible, settings); assert.deepEqual(few.names, ['Person 0', 'Person 1', 'Person 2']); assert.equal(few.more, 0)
  const ten = planShare(news(), { how: 'hub', who: 'all' }, eligible, settings); assert.equal(ten.count, 13); assert.deepEqual(ten.names, []); assert.equal(ten.more, 13); assert.equal(NAMES_SHOWN, 10)   // more than ten: a count, no names
  assert.equal(ten.left_out, 1)                                                                                      // the person with no email is counted as left out, never silently
  const off = planShare(news(), { how: 'email', who: 'all' }, eligible, { ...settings, emails_enabled: false }); assert.equal(off.ok, false); assert.match(off.blockers.join(' '), /switched off/)
  assert.equal(planShare(news(), { how: 'hub', who: 'all' }, eligible, { ...settings, emails_enabled: false }).ok, true)   // the hub notification does not need the email switch
  assert.equal(planShare(letter(), { how: 'email', who: 'one' }, eligible, { ...settings, emails_enabled: false }).ok, true)   // one letter to one person, as before
  const now = new Date('2026-11-26T10:00:00Z')
  assert.equal(planShare(news(), { how: 'hub', who: 'all' }, eligible, settings, { lastShareAt: new Date('2026-11-26T09:59:00Z'), now }).ok, false)   // the minimum gap
  assert.equal(planShare(news(), { how: 'hub', who: 'all' }, eligible, settings, { lastShareAt: new Date('2026-11-26T09:50:00Z'), now }).ok, true)
  assert.equal(planShare(news(), { how: 'hub', who: 'selected', user_ids: [] }, eligible, settings).ok, false)
  assert.match(summaryLine(few), /Send newsletter: November news/); assert.equal(summaryLine(draft), '')
  assert.equal(planShare(letter({ data: { staff_user_id: 'gone' } }), { how: 'hub', who: 'one' }, eligible, settings).ok, false)
})

test('RULE 5: nothing is sent without confirmation, the plan route sends nothing, and the send is only reachable from the panel (never chat text)', () => {
  const r = apiSrc('routes/ask.ts')
  const plan = r.slice(r.indexOf("'/documents/:id/share-plan'"), r.indexOf("'/documents/:id/share-send'"))
  assert.doesNotMatch(plan, /shareAsNotification|emailLetter|shareInHub/)
  const send = r.slice(r.indexOf("'/documents/:id/share-send'"), r.indexOf("// Who has the letter in their hub"))
  assert.match(send, /req\.body\?\.confirm !== true/); assert.match(send, /CONFIRM_REQUIRED/); assert.match(send, /planFor\(req, d\)/); assert.match(send, /!plan\.ok/)
  assert.match(send, /ask_share_confirmed/); assert.doesNotMatch((send.split('\n').find(l => l.includes("audit(req, 'ask_share_confirmed'")) ?? '').split('//')[0], /name|user_ids|title/)   // counts and kinds only in the audit
  const sp = webSrc('components/ask/share-panel.tsx')
  assert.match(sp, /Yes, send it to/); assert.match(sp, /Nothing goes until you press Send/); assert.match(sp, /Preview what they will get/)
  assert.match(webSrc('components/ask/document-panel.tsx'), /<SharePanel/)
  // the old direct send buttons are gone from the panel
  assert.doesNotMatch(webSrc('components/ask/document-panel.tsx'), /Share with staff|run\('now'|run\('email'|run\('note'/)
  assert.doesNotMatch(webSrc('components/ask/ask-overlay.tsx'), /ask\.shareSend/)   // chat code can never call the send
})
