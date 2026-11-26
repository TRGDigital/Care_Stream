// Weave a name in: who gets it while it is tested, and what counts as a good rewrite.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { nameWeaveAccounts, isNameWeaveAccount, weavePrompt, weaveResult, WEAVE_SYSTEM } from './name-weave'

test('WHO GETS IT: everyone by default; NAME_WEAVE_ACCOUNTS narrows it to a list of accounts (the switch back)', () => {
  assert.deepEqual(nameWeaveAccounts(undefined), ['*']); assert.deepEqual(nameWeaveAccounts(''), ['*'])
  assert.equal(isNameWeaveAccount('CS-1001', undefined), true); assert.equal(isNameWeaveAccount('cs-1009', undefined), true)
  assert.equal(isNameWeaveAccount('CS-1009', ' cs-1001 , CS-1009 '), true); assert.equal(isNameWeaveAccount('CS-1234', 'CS-1001'), false); assert.equal(isNameWeaveAccount(null, 'CS-1001'), false)
})

test('PROMPT: keeps every fact, adds nothing, never puts the name only at the front, British English and no dashes', () => {
  const p = weavePrompt({ text: 'The lead reviews each concern within 24 hours.', name: 'Jane Smith', role: 'Safeguarding lead', policy_name: 'Safeguarding Adults Policy' })
  assert.match(p, /Jane Smith, who is the Safeguarding lead/); assert.match(p, /Keep every fact, duty, timeframe and instruction exactly as given/)
  assert.match(p, /Do not add duties, promises or detail/); assert.match(p, /rather than putting the name at the start/); assert.match(p, /"Safeguarding Adults Policy" policy/)
  assert.match(WEAVE_SYSTEM, /British English/); assert.match(WEAVE_SYSTEM, /no em dashes or en dashes/)
})

test('RESULT: used only when it names the person, is not empty, has not run away, and is not just the name stuck on the front', () => {
  const orig = 'The Safeguarding Lead reviews each concern within 24 hours.'
  assert.deepEqual(weaveResult(orig, 'The Safeguarding Lead, Jane Smith, reviews each concern within 24 hours.', 'Jane Smith'), { ok: true, text: 'The Safeguarding Lead, Jane Smith, reviews each concern within 24 hours.' })
  assert.deepEqual(weaveResult(orig, '"Jane Smith reviews each concern within 24 hours."', 'Jane Smith'), { ok: true, text: 'Jane Smith reviews each concern within 24 hours.' })   // stray quotes removed
  assert.equal(weaveResult(orig, '', 'Jane Smith').ok, false)
  assert.equal(weaveResult(orig, orig, 'Jane Smith').ok, false)                                   // the name never made it in
  assert.equal(weaveResult(orig, 'Jane Smith ' + 'and more words '.repeat(60), 'Jane Smith').ok, false)   // ran away
  assert.equal(weaveResult(orig, 'Jane Smith ' + orig, 'Jane Smith').ok, false)                  // just prefixed
})

test('WIRING: the endpoint is admin only, gated, checks the credit, keeps the wording on failure, and the context says whether to show the new screen', () => {
  const rt = fs.readFileSync(path.resolve(__dirname, '../routes/analytics.ts'), 'utf8')
  const fn = rt.slice(rt.indexOf("'/gaps/weave-name'"), rt.indexOf("// POST /analytics/gaps/adopt "))
  assert.match(fn, /requireAdmin/); assert.match(fn, /nameWeaveEnabled\(tenantId\)\)\) \{ err\(res, 'NOT_AVAILABLE'/); assert.match(fn, /await checkAiCreditLimit\(tenantId\)/)
  assert.match(fn, /Your wording is unchanged/); assert.match(fn, /logAiCredit\(tenantId, 'name_weave'/)
  assert.match(rt, /names_v2: await nameWeaveEnabled\(tenantId\)/)
})

test('SCREEN: the new people row shows only on accounts where it is on, keeps the old row for everyone else, never pastes at the cursor, and always offers Undo and Show everyone', () => {
  const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')
  const modal = web('components/admin/gap-detail-modal.tsx'), row = web('components/admin/adopt-named-people.tsx')
  assert.match(modal, /adoption\.names_v2 \? \(/); assert.match(modal, /Insert a name \(click to add at the cursor\):/)     // the old row is still the else branch
  assert.match(modal, /weaveName\(\{ text: adoptText, name, role, policy_name:/); assert.match(modal, /setWeaveUndo\(\{ text: adoptText \}\); setAdoptText\(r\.text\)/)
  assert.match(modal, /function undoWeave\(\)/); assert.match(modal, /Your wording is unchanged/)
  assert.doesNotMatch(row, /insertChip|setSelectionRange/)                                    // the weave button never pastes at the cursor
  assert.match(row, /relevantRoleKeys\(/); assert.match(row, /Show everyone \(\$\{hidden\} more\)/); assert.match(row, /Undo the last change/)
  assert.match(row, /<StaffAvatar name=\{person\.name\}/); assert.match(row, />Archived<\/span>/)
  const copy = [...row.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)].map(m => m[1]).join(' ') + ' Working it in… Already in the wording No named person looks relevant to this wording or policy.'
  assert.doesNotMatch(copy, /[–—]| - /)
})
