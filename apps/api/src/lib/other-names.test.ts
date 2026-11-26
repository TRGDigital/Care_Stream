// Other names in wording about to be adopted: found exactly, offered a choice, replaced exactly, and the screen counts the same way the server does.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { archivedNamesIn, unknownNamesFrom, namesPrompt, NAMES_SYSTEM, countName as serverCount, wholeNameRegex as serverRe } from './other-names'
import { countName, replaceWholeName, wholeNameRegex } from '../../../web/src/lib/name-replace'

const text = 'In the event of an incident, Ishwurduth Mannick is responsible for informing the HSE. Report to Ishwurduth Mannick, or to Pippa Thornley.'

test('LAYER 1: archived staff written in the wording are found with how many times; current staff, short names and names not in the wording are not', () => {
  const users = [
    { name: 'Ishwurduth Mannick', job_role: 'Care Manager', is_active: false },
    { name: 'Pippa Thornley', job_role: 'Nurse', is_active: true },     // current: not flagged
    { name: 'Al Wu', job_role: null, is_active: false },                 // too short to match safely
    { name: 'Someone Else', job_role: null, is_active: false },          // archived but not in the wording
    { name: 'Ishwurduth Mannick', job_role: 'Care Manager', is_active: false },   // duplicate record
  ]
  assert.deepEqual(archivedNamesIn(text, users), [{ name: 'Ishwurduth Mannick', kind: 'archived', job_role: 'Care Manager', occurrences: 2 }])
})

test('LAYER 2: the AI list is kept only for names really written in the wording, that are not current people or already flagged', () => {
  const raw = '{"names":["Ishwurduth Mannick","Pippa Thornley","Made Up Person","Jordan Reeve"]}'
  const t = text + ' Jordan Reeve will advise.'
  const r = unknownNamesFrom(raw, t, ['Pippa Thornley'], ['Ishwurduth Mannick'])
  assert.deepEqual(r, [{ name: 'Jordan Reeve', kind: 'unknown', job_role: null, occurrences: 1 }])   // invented, current and already flagged names are dropped
  assert.deepEqual(unknownNamesFrom('not json', t, [], []), []); assert.deepEqual(unknownNamesFrom('{"names":"x"}', t, [], []), [])
  assert.match(namesPrompt('x'), /Do not include organisations, regulators, places, job titles on their own/); assert.match(NAMES_SYSTEM, /JSON only/)
})

test('REPLACE: every whole occurrence is swapped, never inside another word, case sensitive, possessives still count; the screen and the server agree', () => {
  assert.equal(replaceWholeName(text, 'Ishwurduth Mannick', 'David Whitfield'), 'In the event of an incident, David Whitfield is responsible for informing the HSE. Report to David Whitfield, or to Pippa Thornley.')
  assert.equal(replaceWholeName('Bill Smith and Billing Smith. Bill Smith’s report.', 'Bill Smith', 'Ann Lee'), 'Ann Lee and Billing Smith. Ann Lee’s report.')
  assert.equal(replaceWholeName('o\'Brien and Brien', 'Brien', 'X'), "o'Brien and X")
  assert.equal(replaceWholeName('bill smith', 'Bill Smith', 'X'), 'bill smith')
  for (const [t, n] of [[text, 'Ishwurduth Mannick'], ['Tom-Marie and Tom', 'Tom'], ['Priya Shah’s report', 'Priya Shah']] as const) {
    assert.equal(countName(t, n), serverCount(t, n)); assert.equal(wholeNameRegex(n).source, serverRe(n).source)
  }
})

test('WIRING: the endpoint is admin only and gated, the exact layer always runs, the AI layer is optional and charged, and the screen offers Keep or Replace and checks for other names when asked', () => {
  const rt = fs.readFileSync(path.resolve(__dirname, '../routes/analytics.ts'), 'utf8')
  const fn = rt.slice(rt.indexOf("'/gaps/other-names'"), rt.indexOf("// POST /analytics/gaps/adopt "))
  assert.match(fn, /requireAdmin/); assert.match(fn, /nameWeaveEnabled\(tenantId\)\)\) \{ err\(res, 'NOT_AVAILABLE'/)
  assert.match(fn, /const found = archivedNamesIn\(text, users as any\[\]\)/); assert.match(fn, /if \(req\.body\?\.ai === true\) \{[^]*?checkAiCreditLimit[^]*?logAiCredit\(tenantId, 'other_names'/)
  assert.match(rt, /name_change_needs_approval: nameApproval/)
})

test('SCREEN: the notice offers Keep and Replace with the relevant current people, replaces exactly, keeps AI findings only while the name is in the wording, and offers to update the rest of the policy after adopting', () => {
  const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')
  const m = web('components/admin/gap-detail-modal.tsx'), n = web('components/admin/adopt-other-names.tsx')
  assert.match(n, /Another name is in this wording:/); assert.match(n, /Keep \{f\.name\} as it is/); assert.match(n, /Replace with \{c\.name\}/); assert.match(n, /Check for other names/)
  assert.match(n, /\/manager\/i\.test\(f\.job_role\)/)                                   // a former manager: the current manager is offered first
  assert.match(m, /replaceWholeName\(adoptText, from, to\)/); assert.match(m, /countName\(adoptText, f\.name\)/)
  assert.match(m, /\.filter\(f => f\.occurrences > 0\)/)                                  // an AI finding disappears once the name is gone from the wording
  assert.match(m, /checkOtherNames/); assert.match(m, /otherNames\(\{ text: adoptText, ai: true \}\)/); assert.match(m, /otherNames\(\{ text: adoptText \}\)/)   // free check by itself, AI only when asked
  assert.match(m, /Update the rest of this policy/); assert.match(m, /policy_ids: \[f\.policyId\]/)                               // the one policy that was just adopted into
  assert.match(m, /as your settings require\./); assert.match(m, /as your settings allow\./)
  assert.match(m, /setWeaveUndo\(\{ text: adoptText, replaced: \{ from, to \} \}\)/)      // a replacement can be undone like a weave
  const copy = 'Another name is in this wording: It may be out of date. Keep it as it is, or replace every one with a current person. Check for other names No other names found. You replaced The old name may be written elsewhere Update the rest of this policy No thanks The change will wait for approval, as your settings require. It goes live straight away as a small new version, as your settings allow.'
  assert.doesNotMatch(copy, /[–—]| - /)
})
