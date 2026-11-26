// Two fixes found on the first uncapped cross-policy run: an answer that ran past its length (33 long policies failed to read), and one comparison call that came within seconds of the server's time limit.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { wholeItemsOf } from './in-batches'

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

test('CUT OFF ANSWER: every whole item before the cut is kept, the unfinished one is dropped, nothing whole is lost', () => {
  const full = '{"claims":[{"topic":"a","statement":"one, with a } brace and \\"quote\\"","quote":"q1"},{"topic":"b","statement":"two","quote":"q2"},{"topic":"c","statement":"thr'
  const got = wholeItemsOf(full, 'claims')
  assert.equal(got.length, 2); assert.equal(got[0].topic, 'a'); assert.match(got[0].statement, /a \} brace/); assert.equal(got[1].topic, 'b')
  assert.deepEqual(wholeItemsOf('{"claims":[]}', 'claims'), []); assert.deepEqual(wholeItemsOf('no json here', 'claims'), []); assert.deepEqual(wholeItemsOf('{"claims":[{"topic":"x"', 'claims'), [])
  const whole = JSON.stringify({ claims: [{ topic: 'a' }, { topic: 'b' }, { topic: 'c' }] }); assert.equal(wholeItemsOf(whole, 'claims').length, 3)
})

test('WIRING: claims are read with room for a full list, a cut off list keeps its whole claims, and only a list with nothing whole fails', () => {
  const s = read('policy-consistency.ts')
  assert.match(s, /maxTokens: 6000, temperature: 0, feature: 'policy_consistency'/); assert.match(s, /wholeItemsOf\(out, 'claims'\)/); assert.match(s, /if \(!rawClaims\.length\) throw e/)
})

test('COMPARISON STEPS: the plan is saved once, a few groups are compared per call and each slice is saved, the last call joins and saves as before, and without the table the old single call is used', () => {
  const s = read('policy-consistency.ts'), rt = read('../../routes/analytics.ts')
  assert.match(s, /const DETECT_SLICE = 3/); assert.match(s, /export async function detectStep/); assert.match(s, /return \{ mode: 'single' \}/)
  assert.match(s, /insert into public\.policy_consistency_steps/); assert.match(s, /delete from public\.policy_consistency_steps/)
  assert.match(s, /if \(next < plan\.total\) return \{ mode: 'steps', step: next, total: plan\.total, done: false \}/)
  assert.match(s, /export async function runDetection/)                      // the single call is still there, unchanged
  assert.match(rt, /'\/consistency\/detect-step'/); assert.match(rt, /comparing_done: comparing\.done/)
  const sql = fs.readFileSync(path.resolve(__dirname, '../../../prisma/sql/2026-11-26_consistency_steps.sql'), 'utf8')
  assert.match(sql, /create table if not exists public\.policy_consistency_steps/); assert.match(sql, /enable row level security/)
})

test('PAGE: a run compares in saved steps (fresh only when policies were just read), shows the part it is on, stops cleanly, and Resume can offer an interrupted comparison', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/app/(admin)/gaps/page.tsx'), 'utf8')
  assert.match(page, /consistencyDetectStep\(!retrySince \|\| toExtract > 0\)/); assert.match(page, /Comparing your policies: part \$\{r\.step \+ 1\} of \$\{r\.total\}/)
  assert.match(page, /The comparison was interrupted: \{state\.comparing_done\} of \{state\.comparing_total\} parts done/)
})
