// Fixes after Len's testing of the two person newsletter: Save PDF errors are never silent, wider editing mode and the split layout, the tools above the newsletter, several featured people that
// stay selected, an explicit Save with unsaved-changes protection, and the Bold, Italic and Underline buttons. Run: NODE_PATH=/tmp/ac/docxmod/node_modules npx tsx --test src/services/ask-docs/newsletter-fixes-2.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { editWidthFor, editCeiling, splitFor, SPLIT_FROM, EDIT_FLOOR, parseEditMode, editModeKey, loadEditMode, saveEditMode, clampWidth, DEFAULT_W, MIN_W } from '../../../../web/src/lib/ask-panel-state'
import { toggleMark, clearMarks, markForKey } from '../../../../web/src/lib/ask-marks'
import { diffPeople, peopleBody, canApplyPeople, takesPeople, MAX_FEATURED } from '../../../../web/src/lib/featured-people'
import { featuredFromChoices, featuredOf, photoChoice } from './newsletter-photo'

const web = (p: string) => fs.readFileSync(path.join(__dirname, '../../../../web/src', p), 'utf8')

// ── wider editing mode ───────────────────────────────────────────────────────────────────
test('WIDER EDITING MODE: about half the screen, never below the default 720, never above 960 or 60 percent', () => {
  assert.equal(editWidthFor('wide', 1920, 720), 960)                 // 50 percent
  assert.equal(editWidthFor('wide', 2560, 720), 1280)                // 50 percent of a big monitor, under the 60 percent ceiling (1536)
  assert.equal(editWidthFor('wide', 1440, 720), 720)                 // 50 percent is 720: the floor is the default
  assert.equal(editWidthFor('wide', 1100, 720), 720)                 // 50 percent is 550: the floor holds
  assert.equal(editCeiling(1000), 900)                               // never more than 90 percent of a small screen
  assert.equal(editCeiling(1920), 1152); assert.equal(editCeiling(1200), 960)   // 960 or 60 percent, whichever is larger
  for (const vw of [700, 800, 1024, 1280, 1440, 1920, 2560, 3440]) { const w = editWidthFor('wide', vw, 720); assert.ok(w >= Math.min(EDIT_FLOOR, Math.floor(vw * 0.9)) && w <= editCeiling(vw), `${vw}: ${w}`) }
  assert.equal(editWidthFor('full', 1920, 720), 1920); assert.ok(editWidthFor('full', 300, 720) >= MIN_W)
  assert.equal(editWidthFor('narrow', 1920, 640), clampWidth(640, 1920))       // narrower is the person's usual width
  assert.equal(editWidthFor('narrow', 1920, 100), MIN_W)
})
test('WIDER EDITING MODE: the choice is remembered per person, defaults to wider, and the panel goes back when the document closes', () => {
  const mem = new Map<string, string>(); const st = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
  assert.equal(loadEditMode('len', st), 'wide')
  saveEditMode('len', 'full', st); assert.equal(loadEditMode('len', st), 'full'); assert.equal(loadEditMode('LEN', st), 'full'); assert.equal(loadEditMode('sam', st), 'wide')
  assert.equal(parseEditMode('sideways'), 'wide'); assert.equal(parseEditMode('narrow'), 'narrow'); assert.notEqual(editModeKey('a'), editModeKey('b'))
  assert.equal(loadEditMode('x', null), 'wide'); assert.doesNotThrow(() => saveEditMode('x', 'wide', null))
  const store = web('lib/ask-ui-store.ts')
  assert.match(store, /export function setAskEditing/); assert.match(store, /export function setAskEditMode/); assert.match(store, /loadEditMode\(who, store\(\)\)/)
  const panel = web('components/ask/document-panel.tsx')
  assert.match(panel, /setAskEditing\(true\); return \(\) => setAskEditing\(false\)/, 'widens while a draft is open for editing and goes back on close')
  const host = web('components/ask/ask-overlay.tsx')
  assert.match(host, /editWidthFor\(ui\.editMode, vw, ui\.width\)/); assert.match(host, /locked=\{editW !== null && ui\.editMode !== 'narrow'\}/)   // an overlay: it never pushes the page, and the resize handle is off while wide
  assert.match(host, /!ui\.editing && layout !== 'phone'/, 'the old "easier in the larger view" hint is not shown while it is already wide')
})
test('SPLIT OR STACKED: side by side from 900px of panel width, stacked (tools above the page) below', () => {
  assert.equal(SPLIT_FROM, 900); assert.equal(splitFor(899), false); assert.equal(splitFor(900), true); assert.equal(splitFor(1152), true)
  const panel = web('components/ask/document-panel.tsx')
  assert.match(panel, /grid grid-cols-2 items-start gap-4/); assert.match(panel, /splitFor\(pw\)/)
  assert.ok(editWidthFor('wide', 1920, 720) >= SPLIT_FROM && editWidthFor('wide', 1440, 720) < SPLIT_FROM, 'a 1920 screen splits, a 1440 screen stacks')
  assert.match(panel, /role="group" aria-label="Panel width"/); assert.match(panel, /'Narrower'[\s\S]*'Wider'[\s\S]*'Full width'/)
})

// ── tools above the newsletter, Save, unsaved changes ───────────────────────────────────────
test('THE TOOLS SIT ABOVE THE NEWSLETTER: toolbar, then the Colours or Add a block panel, then the page (never underneath it)', () => {
  const p = web('components/ask/document-panel.tsx')
  const toolbar = p.indexOf('role="toolbar" aria-label="Document tools"'), tools = p.indexOf('<NewsletterEditor bare'), body = p.indexOf('{split ? (<>')
  assert.ok(toolbar > 0 && tools > toolbar && body > tools, 'toolbar, then the panel, then the page')
  assert.match(p, /Colours<\/button>/); assert.match(p, /Add a block<\/button>/); assert.match(p, /Portrait/); assert.match(p, /Landscape/)
  assert.doesNotMatch(p, /d\.actions\.edit && !editing && <NewsletterEditor/, 'the editor is not rendered under the newsletter any more')
  const ed = web('components/ask/newsletter-editor.tsx'); assert.match(ed, /if \(bare && !open\) return null/); assert.match(ed, /aria-label="Close this panel"/)
})
test('SAVE: an explicit Save with Saved or Unsaved changes, Submit waits for it, and closing asks Save your changes?', () => {
  const p = web('components/ask/document-panel.tsx')
  assert.match(p, /\{dirty \? 'Save' : 'Saved'\}/); assert.match(p, /Unsaved changes/); assert.match(p, /All changes saved/)
  assert.match(p, /disabled=\{!!busy \|\| dirty\} title=\{dirty \? 'Save your changes first'/); assert.match(p, /Save your changes first\./)
  assert.match(p, /Save your changes\?/); assert.match(p, /Discard/); assert.match(p, /Keep editing/); assert.doesNotMatch(p, /window\.confirm\('Save/)   // one line, no browser dialog
  assert.match(p, /const requestClose = \(\) => \{ if \(dirty\) setConfirmClose\('panel'\)/); assert.match(p, /onClick=\{requestClose\}/)
  assert.match(p, /async function save\(closeEditor = false\)/); assert.match(p, /setSavedAt\(new Date\(\)\)/)
})

// ── Save PDF is never silent ────────────────────────────────────────────────────────────────
test('A FAILED SAVE PDF, PRINT OR WORD IS NEVER SILENT: the reason shows next to the buttons, and TOO_LONG offers the gentle check', () => {
  const a = web('components/ask/document-actions.tsx')
  assert.match(a, /const \[problem, setProblem\]/); assert.match(a, /role="alert"[^>]*>\{problem\.message\}/); assert.match(a, /export function TooLongCheck/)
  assert.match(a, /Switch to \{other\}/); assert.match(a, /Shorten it/); assert.match(a, /Allow two pages/); assert.match(a, /problem\.code === 'TOO_LONG' && tooLong/)
  const v = web('components/ask/expand-viewer.tsx')
  assert.match(v, /const \[err, setErr\]/); assert.match(v, /catch \(e\) \{ setErr\(/); assert.match(v, /role="alert" className="basis-full/); assert.match(v, /tooLong=\{pdf\.tooLong\}/)
  const panel = web('components/ask/document-panel.tsx'); assert.match(panel, /tooLong=\{d\.type === 'newsletter' \? \{ orientation, canTwoPages: canTwo/); assert.match(panel, /tooLong: d\.type === 'newsletter' && d\.actions\.edit/)
  assert.match(web('components/ask/draft-card.tsx'), /onError=\{setErr\}/)
})

// ── several featured people, kept ───────────────────────────────────────────────────────────
const who = 'admin-1'
test('FEATURED PEOPLE: two and three people stay selected after an edit and after reopening, each with their own agreement', () => {
  const a = photoChoice({ userId: 'u1', consent: true, actorId: who, now: new Date('2026-11-25T09:00:00Z') }); assert.ok(a.ok)
  const b = photoChoice({ userId: 'u2', consent: true, actorId: who, now: new Date('2026-11-25T09:01:00Z') }); assert.ok(b.ok)
  const two = [(a as any).photo, (b as any).photo]
  const data = { photos: two, photo: two[0] }
  assert.deepEqual(featuredOf(data).map(x => x.user_id), ['u1', 'u2'])                       // reopened: both are there
  const again = featuredFromChoices(featuredOf(data), [{ user_id: 'u1' }, { user_id: 'u2' }], who)   // saved again with no change: nobody needs a new tick
  assert.ok(again.ok); assert.deepEqual((again as any).list, two); assert.equal((again as any).list[1].consent_at, '2026-11-25T09:01:00.000Z')   // their recorded agreement is kept
  const three = featuredFromChoices(featuredOf(data), [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3', consent: true }], who)
  assert.ok(three.ok); assert.deepEqual((three as any).list.map((x: any) => x.user_id), ['u1', 'u2', 'u3'])
  assert.equal((three as any).list[0].consent_by, who)
})
test('FEATURED PEOPLE: a newcomer needs their own tick; removing one removes only that person; the list is capped and deduplicated', () => {
  const have = [(photoChoice({ userId: 'u1', consent: true, actorId: who }) as any).photo, (photoChoice({ userId: 'u2', consent: true, actorId: who }) as any).photo]
  const no = featuredFromChoices(have, [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3' }], who); assert.equal(no.ok, false); assert.equal((no as any).user_id, 'u3')
  assert.equal(featuredFromChoices(have, [{ user_id: 'u1' }, { user_id: 'u3', consent: 'yes' }], who).ok, false)   // only a real true counts
  const drop = featuredFromChoices(have, [{ user_id: 'u2' }], who); assert.ok(drop.ok); assert.deepEqual((drop as any).list.map((x: any) => x.user_id), ['u2'])
  const none = featuredFromChoices(have, [], who); assert.ok(none.ok); assert.deepEqual((none as any).list, [])
  const dup = featuredFromChoices([], [{ user_id: 'x', consent: true }, { user_id: 'x', consent: true }, { user_id: '', consent: true }], who); assert.equal((dup as any).list.length, 1)
  const many = featuredFromChoices([], Array.from({ length: 12 }, (_, i) => ({ user_id: `p${i}`, consent: true })), who); assert.equal((many as any).list.length, MAX_FEATURED)
})
test('FEATURED PEOPLE (screen): everyone already featured is selected, a newcomer shows their own tick, and removing one only removes that one', () => {
  const c = diffPeople(['u1', 'u2'], ['u1', 'u2']); assert.equal(c.changed, false)
  const add = diffPeople(['u1', 'u2'], ['u1', 'u2', 'u3']); assert.deepEqual(add.added, ['u3']); assert.equal(canApplyPeople(add, {}), false); assert.equal(canApplyPeople(add, { u3: true }), true)
  assert.deepEqual(peopleBody(['u1', 'u2'], ['u1', 'u2', 'u3'], { u3: true }), [{ user_id: 'u1' }, { user_id: 'u2' }, { user_id: 'u3', consent: true }])
  const rm = diffPeople(['u1', 'u2'], ['u2']); assert.deepEqual(rm.removed, ['u1']); assert.deepEqual(rm.kept, ['u2']); assert.equal(canApplyPeople(rm, {}), true)   // removing needs no tick
  assert.equal(takesPeople('employee-of-the-month-standard'), true); assert.equal(takesPeople('policy-training-reminders-short'), false)
  const fp = web('components/ask/featured-people.tsx'); assert.match(fp, /<StaffPicker people=\{staff\} mode="multi" max=\{MAX_FEATURED\}/); assert.match(fp, /setSelected\(r\.people\.map\(p => p\.user_id\)\)/); assert.match(fp, /CONSENT_TEXT/)
  assert.doesNotMatch(web('components/ask/document-panel.tsx'), /Picture of the person \(employee of the month/, 'the one person dropdown is gone')
  const routes = fs.readFileSync(path.join(__dirname, '../../routes/ask-docs.ts'), 'utf8'); assert.match(routes, /\/:id\/newsletter-people/); assert.match(routes, /featuredFromChoices/)
})

// ── the formatting buttons ──────────────────────────────────────────────────────────────────
test('FORMATTING BUTTONS: Bold, Italic and Underline wrap the selection, toggle off, and Clear removes the marks; Ctrl or Cmd B, I, U work', () => {
  assert.deepEqual(toggleMark('hello world', 0, 5, 'bold'), { text: '**hello** world', start: 2, end: 7 })
  assert.deepEqual(toggleMark('**hello** world', 2, 7, 'bold'), { text: 'hello world', start: 0, end: 5 })        // toggled off
  assert.equal(toggleMark('a b', 2, 3, 'italic').text, 'a *b*'); assert.equal(toggleMark('a b', 2, 3, 'underline').text, 'a __b__')
  assert.deepEqual(toggleMark('x', 1, 1, 'bold'), { text: 'x****', start: 3, end: 3 })                       // nothing selected: an open pair, cursor inside
  assert.equal(toggleMark('**bold**', 2, 6, 'italic').text, '***bold***'.replace('***bold***', '***bold***'))    // italic inside bold is not mistaken for half of the bold pair
  assert.equal(clearMarks('**a** *b* __c__ <u>d</u>', 0, 0).text, 'a b c d')
  assert.equal(clearMarks('* a **bold** bullet\n- b *it*', 0, 0).text, '* a bold bullet\n- b it')              // a bullet star stays
  assert.equal(markForKey({ key: 'b', ctrlKey: true, metaKey: false }), 'bold'); assert.equal(markForKey({ key: 'I', ctrlKey: false, metaKey: true }), 'italic'); assert.equal(markForKey({ key: 'u', ctrlKey: true, metaKey: false }), 'underline')
  assert.equal(markForKey({ key: 'b', ctrlKey: false, metaKey: false }), null); assert.equal(markForKey({ key: 'b', ctrlKey: true, metaKey: false, altKey: true }), null)
  const mt = web('components/ask/marked-textarea.tsx'); assert.match(mt, /aria-label="Bold \(Ctrl or Cmd B\)"/); assert.match(mt, /Clear formatting/); assert.match(mt, /markForKey\(e\)/)
  assert.match(web('components/ask/document-panel.tsx'), /<MarkedTextarea id="ask-doc-body"/); assert.match(web('components/ask/newsletter-editor.tsx'), /<MarkedTextarea id=\{`sec-/)
})

test('MARKS ON SCREEN: the text view draws real bold, italic and underline, reads marks exactly as the server does, and Esc asks before closing with unsaved changes', async () => {
  const { parseMarks: server } = await import('./inline-marks'); const { parseMarks: screen } = await import('../../../../web/src/lib/ask-inline-marks')
  for (const t of ['A **b** and *i* and _j_ and __u__ and <u>v</u>', '**bold and *italic***', '5 * 3 and snake_case_name and £5*2', '**unclosed name', '* a bullet', 'a *b* c *d', 'Sent by **Team Management**', '__a__b__', '***both***'])
    assert.deepEqual(screen(t), server(t), t)
  const md = web('components/ask/markdown-lite.tsx'); assert.match(md, /<em>\{n\}<\/em>/); assert.match(md, /<u>\{n\}<\/u>/); assert.match(md, /export function Marked/)
  assert.doesNotMatch(web('components/ask/document-panel.tsx'), />\{d\.body\}<\/pre>/, 'the letter text view draws the marks')
  assert.match(web('components/ask/ask-overlay.tsx'), /dispatchEvent\(new Event\('cs:ask-doc-close'\)\)/); assert.match(web('components/ask/document-panel.tsx'), /addEventListener\('cs:ask-doc-close'/)
})
