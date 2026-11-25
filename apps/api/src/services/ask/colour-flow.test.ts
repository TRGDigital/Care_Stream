// The Change colours dead end: a document button must run on the screen (never be typed to the model), a colour request in chat must come back as option cards (with Preview and Choose),
// and a message that ends on a choice written in words must still get buttons. Plain code, no model.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { AGENTS } from './agents'
import { buildSystemPrompt, __setPromptTestHooks } from './prompt-register'
import { DEFAULT_HOUSE_RULES_FORMS } from './house-rules-forms'
import { ASK_PROMPT_MAX } from './prompt-register'
import { endsInProseChoice, withDeadEndFallback, fallbackSteps } from './dead-end'
import { DEAD_ENDS, NOT_DEAD_ENDS, COLOUR_SAYS } from './dead-end-probes'
import { colourOptions, colourOptionsBlock } from '../ask-docs/newsletter-colours'
import { PALETTES } from '../ask-docs/newsletter-edit'
import { cleanRequest, PREVIEW_KINDS } from '../ask-docs/option-preview'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const apiSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../..', f), 'utf8')

test('ROOT CAUSE: a next step button that names a document action is always a screen action, whatever kind or payload the model wrote', async () => {
  const b = await web('lib/ask-blocks.ts')
  const mk = (x: any) => b.parseNextSteps('```next_steps\n' + JSON.stringify({ steps: [x] }) + '\n```')!.steps[0]
  // the case from the chat: Change colours written as a plain ask with no payload
  const s = mk({ id: 'colours', label: 'Change colours', kind: 'ask' })
  assert.equal(s.kind, 'action'); assert.equal(s.payload, 'colours')
  assert.equal(mk({ label: 'Change colours' }).kind, 'action')                                  // no id, no kind, no payload
  assert.equal(mk({ id: 'change_colours', label: 'x', kind: 'ask', payload: 'something odd' }).payload, 'colours')
  assert.equal(mk({ id: 'add_a_block', label: 'Add a block', kind: 'ask' }).payload, 'add_block')
  assert.equal(mk({ id: 'designed', label: 'See the designed version', kind: 'ask' }).payload, 'preview')
  assert.equal(mk({ id: 'save_to_library', label: 'Save to library' }).payload, 'save_library')
  // every known action id, written as an ask with nothing else, becomes that action
  for (const a of b.NEXT_ACTIONS) { const st = mk({ id: a, label: 'Anything', kind: 'ask' }); assert.equal(st.kind, 'action', a); assert.equal(st.payload, a) }
  // things that are really follow ups stay asks, and links stay links
  assert.equal(mk({ id: 'letter', label: 'Make a letter from this', kind: 'ask' }).kind, 'ask')
  assert.equal(mk({ id: 'help', label: 'Open help', kind: 'link', payload: '/help' }).kind, 'link')
  assert.equal(mk({ id: 'bad', label: 'Bad', kind: 'link', payload: 'https://x.example' }).kind, 'ask')
})

test('THE SCREEN: colours, add a block, save PDF and print are never sent to the model when there is no draft (a plain notice instead), and the draft is looked for in the whole chat', () => {
  const o = webSrc('components/ask/ask-overlay.tsx')
  const fn = o.slice(o.indexOf('async function nextAction'), o.indexOf('const loadLib'))
  assert.match(fn, /\[\.\.\.messages\]\.reverse\(\)\.flatMap\(x => x\.sources \?\? \[\]\)\.find\(x => x\.document_id\)/)   // the latest draft in this chat
  assert.match(fn, /\?\? docId \?\? null/)                                                                              // or the one that is open
  const colours = fn.slice(fn.indexOf("action === 'colours'"), fn.indexOf("action === 'edit'"))
  assert.match(colours, /else noDoc\(\)/); assert.doesNotMatch(colours, /ask_\(\)/)
  const pdf = fn.slice(fn.indexOf("action === 'save_pdf'"), fn.indexOf("action === 'save_library'"))
  assert.match(pdf, /noDoc\(\)/); assert.doesNotMatch(pdf, /ask_\(\)/)
  assert.match(fn, /own draft|document_id\)\) \{ setSavedMsg/)   // saving an answer still saves that answer
  assert.match(fn, /setDocFocus\(action === 'colours' \? 'colours' : 'blocks'\)/)
})

test('COLOURS IN CHAT: the options are the palettes plus the category colour (and the brand colour only when one is saved), each previewing the administrator\'s own draft', async () => {
  const none = colourOptions('doc1', null), withBrand = colourOptions('doc1', '#1D4E89')
  assert.deepEqual(none.map(o => o.id), ['category', ...PALETTES.map(p => p.id)])
  assert.deepEqual(withBrand.map(o => o.id), ['category', 'brand', ...PALETTES.map(p => p.id)])
  for (const o of withBrand) { assert.equal(o.preview.kind, 'newsletter_palette'); assert.equal(o.preview.document_id, 'doc1'); assert.equal(o.preview.template_id, o.id) }
  const b = await web('lib/ask-blocks.ts')
  const set = b.parseOptions(colourOptionsBlock('doc1', '#1D4E89'))
  assert.ok(set && set.options.length === 10, 'the screen reads all ten cards')
  assert.equal(set.options[0].preview.kind, 'newsletter_palette'); assert.equal(set.options[0].preview.document_id, 'doc1')
  const pal = await web('lib/ask-palettes.ts')
  assert.deepEqual(pal.NEWSLETTER_PALETTES, PALETTES.map(p => ({ id: p.id, label: p.label, accent: p.accent })))   // the swatches match the server list
})

test('PREVIEW OF THE DRAFT: the request needs a document, accepts palette, brand and category, has its own kind, never cached, and has no sample PDF', () => {
  assert.ok((PREVIEW_KINDS as readonly string[]).includes('newsletter_palette'))
  assert.equal(cleanRequest({ kind: 'newsletter_palette', template_id: 'ocean' }), null)                                      // no draft, no preview
  assert.deepEqual(cleanRequest({ kind: 'newsletter_palette', template_id: 'ocean', document_id: 'abc-123' }), { kind: 'newsletter_palette', template_id: 'ocean', layout: null, document_id: 'abc-123' })
  for (const id of ['brand', 'category', 'teal']) assert.ok(cleanRequest({ kind: 'newsletter_palette', template_id: id, document_id: 'abc-123' }))
  assert.equal(cleanRequest({ kind: 'newsletter_palette', template_id: 'ocean', document_id: 'a b;c' }), null)
  const r = apiSrc('routes/ask-docs.ts')
  assert.match(r, /q\.kind === 'newsletter_palette' \? 'private, no-store'/); assert.match(r, /!q \|\| q\.kind === 'newsletter_palette'/)
  assert.match(r, /renderOptionPreview\(getTenantId\(\), q, \{\}, req\.user!\.sub\)/)
  const pv = apiSrc('services/ask-docs/option-preview.ts')
  assert.match(pv, /getDocumentFor\(tenantId, userId, req\.document_id\)/); assert.match(pv, /Nothing changes until you press Choose/)
  const ob = webSrc('components/ask/options-block.tsx')
  assert.match(ob, /newsletter_palette' \? <|kind === 'newsletter_palette'\) return <Swatch/); assert.match(ob, /big\.o\.preview\.kind !== 'newsletter_palette'/)
})

test('THE TOOLS: the Newsletters agent has newsletter_colour_options, set_newsletter_style takes brand and category, and the prompt says never to describe the choices in words', () => {
  const ag = AGENTS.find(a => a.id === 'newsletter')!
  for (const t of ['newsletter_colour_options', 'set_newsletter_style', 'add_newsletter_block']) assert.ok(ag.tools.includes(t), t)
  const nt = apiSrc('services/ask/newsletter-tools.ts')
  assert.match(nt, /name: 'newsletter_colour_options'/); assert.match(nt, /al === 'brand'/); assert.match(nt, /al === 'default' \|\| al === 'category' \? null/)
  assert.match(ag.prompt, /NEVER describe the choices in words/); assert.match(ag.prompt, /newsletter_colour_options/); assert.match(ag.prompt, /Do not end with a question/)
})

test('SAFETY NET: every answer from the chats that dead ended is caught, and answers with a block or a plain ending are left alone', () => {
  assert.ok(DEAD_ENDS.length >= 10)
  for (const t of DEAD_ENDS) assert.equal(endsInProseChoice(t), true, t.slice(0, 60))
  for (const t of NOT_DEAD_ENDS) assert.equal(endsInProseChoice(t), false, t.slice(0, 60))
  assert.equal(endsInProseChoice(''), false)
})

test('SAFETY NET: buttons are appended after the model\'s words, never inside or instead of them, and only once', async () => {
  const b = await web('lib/ask-blocks.ts')
  for (const t of DEAD_ENDS) {
    const r = withDeadEndFallback(t, { agentId: 'newsletter' })
    assert.equal(r.appended, true); assert.ok(r.text.startsWith(t.trimEnd()), 'the words are unchanged')
    const ns = b.parseNextSteps(r.text); assert.ok(ns && ns.steps.length >= 2 && ns.steps.length <= 5, 'the screen reads the buttons')
    assert.equal(withDeadEndFallback(r.text, { agentId: 'newsletter' }).appended, false)      // a second pass adds nothing
    assert.doesNotMatch(r.text.slice(t.length), /[–—]/)
  }
  for (const t of NOT_DEAD_ENDS) assert.deepEqual(withDeadEndFallback(t), { text: t, appended: false })
  // the stage decides the buttons
  const colour = fallbackSteps(DEAD_ENDS[0], { agentId: 'newsletter' }); assert.ok(colour.some(s => /colour/i.test(s.label)))
  const draft = fallbackSteps(DEAD_ENDS[1], { agentId: 'letters', drafts: 1 }); assert.deepEqual(draft.map(s => s.payload), ['edit', 'preview', 'save_library', 'save_pdf', 'share'])
  const parsed = b.parseNextSteps(withDeadEndFallback(DEAD_ENDS[1], { agentId: 'letters', drafts: 1 }).text)!
  for (const s of parsed.steps) assert.equal(s.kind, 'action')                                  // document buttons run on the screen
  assert.ok(fallbackSteps(DEAD_ENDS[2], { agentId: 'staff' }).some(s => /choices/i.test(s.label)))
  assert.ok(fallbackSteps(DEAD_ENDS[3], { agentId: 'staff' }).some(s => /yes/i.test(s.label)))
})

test('SAFETY NET: it runs on every finished answer in the runner, only when the run finished normally', () => {
  const r = apiSrc('services/ask/runner.ts')
  assert.match(r, /if \(stopped === 'done'\) answer = withDeadEndFallback\(answer, \{ agentId: agent\.id, drafts: documents\.length \}\)\.text/)
  assert.match(r, /import \{ withDeadEndFallback \} from '\.\/dead-end'/)
})

test('PROMPTS: the shared rules forbid ending on a list of choices in words, every agent carries it, and the text stays inside the editing limit', async () => {
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /Never end a message with a list of choices written in words, or with a bare question such as "What would you like to do\?"/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /every reply that is not a plain answer ends with the next_steps block/)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /Offer at most 10 options/); assert.match(DEFAULT_HOUSE_RULES_FORMS, /newsletter_colour_options/)
  assert.ok(DEFAULT_HOUSE_RULES_FORMS.length <= ASK_PROMPT_MAX - 1000, `${DEFAULT_HOUSE_RULES_FORMS.length} leaves room for more rules`)
  assert.doesNotMatch(DEFAULT_HOUSE_RULES_FORMS, /[–—]/)
  __setPromptTestHooks({ reader: async () => null })
  try { for (const a of AGENTS) assert.ok((await buildSystemPrompt(a, '2026-11-26', 'Ferndale', '')).includes('ALWAYS END WITH NEXT STEP BUTTONS. Never end a message with a list of choices'), a.id) }
  finally { __setPromptTestHooks({ reader: null }) }
})

test('EVAL: the chat that started this is in the manual eval, with the colour phrasings', () => {
  assert.ok(COLOUR_SAYS.includes('Change colours') && COLOUR_SAYS.length >= 5)
  const e = apiSrc('scripts/ask-eval.ts'); assert.match(e, /only === 'deadend'/); assert.match(e, /COLOUR_SAYS/)
})

test('NEXT STEPS WRITTEN AS OPTION CARDS (nothing to preview) become next step buttons; real previews are left alone', () => {
  const { optionsUsedAsNextSteps, withDeadEndFallback } = require('./dead-end')
  const bad = 'Saved as a draft.\n\n```options\n{"options":[{"id":"review","title":"Review the draft","description":"Open the newsletter in your library","preview":{"kind":"other"}},{"id":"colours","title":"Change colours","description":"Choose a different colour scheme"},{"id":"changes","title":"Make changes","description":"Edit the content"},{"id":"done","title":"All done","description":"Ready to submit for approval"}]}\n```'
  const r = optionsUsedAsNextSteps(bad)
  assert.equal(r.changed, true); assert.doesNotMatch(r.text, /```options/); assert.match(r.text, /```next_steps/)
  const steps = JSON.parse(/```next_steps\n([\s\S]*?)\n```/.exec(r.text)![1]).steps
  assert.deepEqual(steps.map((x: any) => x.label), ['Review the draft', 'Change colours', 'Make changes', 'All done'])
  assert.match(r.text, /^Saved as a draft\./)
  const good = 'Pick one.\n\n```options\n{"options":[{"id":"short","title":"Short","preview":{"kind":"newsletter","template_id":"employee-of-the-month-short","layout":"short"}}]}\n```'
  assert.equal(optionsUsedAsNextSteps(good).changed, false); assert.equal(optionsUsedAsNextSteps(good).text, good)
  assert.equal(withDeadEndFallback(bad, { agentId: 'newsletter', drafts: 1 }).appended, true)
})
