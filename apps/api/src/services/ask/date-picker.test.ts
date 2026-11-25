import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fromLongDate, isPickable, plainSummary, toLongDate, todayIso } from '../../../../web/src/lib/ask-dates'
import { EMPTY_NOTICE, noticeKey, openNotice, parseNotice, setNoticeOpen } from '../../../../web/src/lib/ask-notice'
import { AGENTS } from './agents'
import { buildSystemPrompt, __setPromptTestHooks } from './prompt-register'
import { HOUSE_RULES_SUMMARY, DEFAULT_HOUSE_RULES_FORMS } from './house-rules-forms'

const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const walk = (d: string, out: string[] = []) => { for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isDirectory()) walk(p, out); else if (/\.tsx$/.test(e.name)) out.push(p) } return out }

test('RULE 12: the picked date becomes the readable form, and the readable form goes back to a date', () => {
  assert.equal(toLongDate('2026-12-08'), 'Tuesday 8 December 2026')
  assert.equal(toLongDate('2026-02-30'), ''); assert.equal(toLongDate(''), ''); assert.equal(toLongDate('soon'), '')
  assert.equal(fromLongDate('Tuesday 8 December 2026'), '2026-12-08')
  assert.equal(fromLongDate('8th Dec 2026'), '2026-12-08'); assert.equal(fromLongDate('08/12/2026'), '2026-12-08'); assert.equal(fromLongDate('2026-12-08'), '2026-12-08')
  assert.equal(fromLongDate('Monday 8 December', 2026), '2026-12-08')   // an older block without a year
  assert.equal(fromLongDate('30 February 2026'), null); assert.equal(fromLongDate('the Friday after next'), null); assert.equal(fromLongDate(''), null)
  assert.equal(todayIso(new Date(2026, 10, 5)), '2026-11-05')
})

test('RULE 12: an older block with a date typed in words still opens (editable text plus the picker); a readable or empty one shows only the picker', () => {
  assert.equal(isPickable(''), true); assert.equal(isPickable('Tuesday 8 December 2026'), true); assert.equal(isPickable('Monday 8 December'), true)
  assert.equal(isPickable('the Friday before Christmas'), false)
  const c = web('components/ask/date-picker.tsx')
  assert.match(c, /!pickable && \(/); assert.match(c, /Pick a date to replace it/); assert.match(c, /onChange=\{iso => onChange\(toLongDate\(iso\)\)\}/)
  assert.match(c, /type="date"/); assert.match(c, />Today</); assert.match(c, />Clear</)
})

test('RULE 12: every date in the Ask panel is picked: the only date input is the shared DatePicker, and no date is a text box', () => {
  const dir = path.resolve(__dirname, '../../../../web/src/components/ask')
  for (const f of walk(dir)) {
    const src = fs.readFileSync(f, 'utf8'); const rel = path.relative(dir, f)
    if (rel !== 'date-picker.tsx') assert.doesNotMatch(src, /type="date"|type=\{[^}]*'date'[^}]*\}/, `${rel} must use DatePicker, not its own date input`)
    for (const m of src.matchAll(/<input[^>]*>/g)) { const tag = m[0]; if (/label=\{?[`"'][^`"']*\b(date|due|deadline)\b/i.test(tag) && /type="text"|^[^>]*(?!type=)/.test(tag) && !/type="(checkbox|date|file|radio)"/.test(tag) && rel !== 'date-picker.tsx') assert.fail(`${rel}: a date typed in a text box: ${tag.slice(0, 80)}`) }
    assert.doesNotMatch(src, /placeholder="Monday 8/)
  }
  assert.match(web('components/ask/question-form.tsx'), /q\.kind === 'date' \? <DatePicker/)
  assert.match(web('components/ask/action-card.tsx'), /<DatePicker id=\{`due-/)
  assert.match(web('components/ask/document-panel.tsx'), /f\.type === 'date' \? <DatePicker/)
  assert.match(web('components/ask/newsletter-editor.tsx'), /<DateTextPicker id=/)
})

test('RULE 12: the rule is in the shared prompt of every agent, with one example, and the list on the prompts page has twelve', async () => {
  assert.deepEqual(HOUSE_RULES_SUMMARY.map(r => r.n), [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13])
  const r12 = HOUSE_RULES_SUMMARY[11]; assert.equal(r12.locked, false); assert.ok(DEFAULT_HOUSE_RULES_FORMS.includes(r12.phrase))
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /kind "date"/); assert.match(DEFAULT_HOUSE_RULES_FORMS, /never ask for a date as kind text|Never ask for a date as kind text/i)
  assert.match(DEFAULT_HOUSE_RULES_FORMS, /"id":"deadline","label":"When is the nomination deadline\?","kind":"date"/)
  __setPromptTestHooks({ reader: async () => null })
  try { for (const a of AGENTS) assert.ok((await buildSystemPrompt(a, '2026-11-26', 'Ferndale', '')).includes('RULE 12, DATES ARE PICKED'), a.id) } finally { __setPromptTestHooks({ reader: null }) }
})

test('NOTICES: the Before you send band is open the first three times, then collapsed, and stays as the person left it; a draft is counted once', () => {
  let p = { ...EMPTY_NOTICE }
  const seen: boolean[] = []
  for (const id of ['a', 'b', 'c', 'd', 'e']) { const r = openNotice(p, id); p = r.prefs; seen.push(r.open) }
  assert.deepEqual(seen, [true, true, true, false, false])
  assert.equal(openNotice(p, 'e').prefs.seen, 5)   // reopening the same draft does not count again
  p = setNoticeOpen(p, true); assert.equal(openNotice(p, 'f').open, true); p = setNoticeOpen(p, false); assert.equal(openNotice(p, 'g').open, false)
  assert.deepEqual(parseNotice('not json'), EMPTY_NOTICE); assert.equal(parseNotice(JSON.stringify({ seen: 2, ids: ['x'], open: false })).open, false)
  assert.notEqual(noticeKey('A@b.com'), noticeKey('c@d.com')); assert.equal(noticeKey('A@B.com'), noticeKey('a@b.com'))
})

test('NOTICES: the checklist, the letterhead note and the warnings sit in one band across the whole panel, above the columns, never in the left column', () => {
  const s = web('components/ask/document-panel.tsx')
  assert.match(s, /id="ask-notices">\{noticeBand\}/)
  assert.ok(s.indexOf('id="ask-notices"') < s.indexOf("split ? 'grid grid-cols-2 items-start gap-4'"), 'the band comes before the two columns')
  const restAt = s.indexOf('const rest = d ? (<>'), pageAt = s.indexOf('const pageBlock')
  assert.doesNotMatch(s.slice(restAt, pageAt), /Before you send/); assert.doesNotMatch(s.slice(restAt, pageAt), /finish your <strong>Letterhead/)
  assert.match(s, /aria-expanded=\{noticeOpen\}/); assert.match(s, /checks<\/span>/)
})

test('CLICK TO ENLARGE: a designed page is an iframe, so a clear layer over it takes the click; the sheet frame sits inside the Expandable and nothing disables pointer events', () => {
  const v = web('components/ask/expand-viewer.tsx'); const e = v.slice(v.indexOf('export function Expandable'))
  assert.match(e, /data-expand-hit="true" onClick=\{onOpen\}/); assert.match(e, /absolute inset-0 z-\[5\] cursor-zoom-in/)
  assert.match(e, /role="button" tabIndex=\{0\}/); assert.match(e, /isActivateKey\(e\.key\)/)   // Enter and Space still work from the keyboard
  const sf = web('components/ask/sheet-frame.tsx'); assert.doesNotMatch(sf, /pointer-events-none|pointerEvents/)
  const dp = web('components/ask/document-panel.tsx'); assert.match(dp, /<Expandable label=\{d\.type === 'newsletter' \? 'The designed newsletter'[^]*?<SheetFrame/)
  assert.match(dp, /aria-label="Expand" title="Expand" onClick=\{openViewer\}[^>]*><Maximize2/)   // the toolbar Expand button
})

test('BLOCK LIST: the summary has no formatting marks and is cut at a word with an ellipsis; the block panel has no inner scroll', () => {
  assert.equal(plainSummary('We are delighted to announce not one, but three employees of the month for November: **Callum Fraser** and **Chloe Bennett**.', 60), 'We are delighted to announce not one, but three employees…')
  assert.equal(plainSummary('A *quiet* __week__'), 'A quiet week'); assert.equal(plainSummary('5 * 3 is fifteen'), '5 * 3 is fifteen'); assert.equal(plainSummary(''), '')
  assert.doesNotMatch(plainSummary('text with **Cal', 90), /\*/)
  assert.match(web('components/ask/newsletter-editor.tsx'), /plainSummary\(it\.summary, 90\)/)
  const ne = web('components/ask/newsletter-editor.tsx'); assert.doesNotMatch(ne, /max-h-\[|overflow-y-auto/)
})
