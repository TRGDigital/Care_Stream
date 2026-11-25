// NO CAP on the points of a regulation: every curated point is assessed, a long list is worked through in several calls.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { inBatches } from './in-batches'

test('inBatches handles any length in order, in chunks of the given size, none dropped', async () => {
  for (const n of [0, 1, 8, 9, 21, 100]) {
    const calls: number[] = []
    const out = await inBatches(Array.from({ length: n }, (_, i) => i), 8, async c => { calls.push(c.length); return c.map(x => x * 2) })
    assert.deepEqual(out, Array.from({ length: n }, (_, i) => i * 2)); assert.ok(calls.every(l => l <= 8)); assert.equal(calls.length, Math.ceil(n / 8))
  }
})
test('WIRING: the curated checklist is never sliced, in the gap detail or in the coverage analysis, and every AI step that scales with it is batched', () => {
  const gd = fs.readFileSync(path.resolve(__dirname, 'gap-detail.ts'), 'utf8'), rc = fs.readFileSync(path.resolve(__dirname, 'regulation-coverage.ts'), 'utf8')
  assert.match(gd, /reg\.required_elements\.filter\(Boolean\) : \[\]/); assert.doesNotMatch(gd, /required_elements\.filter\(Boolean\)\.slice/)
  assert.doesNotMatch(rc, /required_elements \?\? \[\]\)\.filter\(Boolean\)\.slice/); assert.doesNotMatch(rc, /MAX_ELEMENTS/)
  for (const f of ['verifyAndSuggestChunk', 'findLocationsChunk', 'titleNewSectionsChunk', 'refineAmendmentsChunk']) assert.match(gd, new RegExp(`inBatches\\([^)]*=> ${f}\\(`), f)
  assert.match(gd, /identify\(\{ \.\.\.reg, required_elements: chunk \}, evidenceText\)/); assert.match(rc, /assessElementsChunk\(reg, policyName, w, chunk\)/); assert.match(rc, /textWindows\(policyText, POLICY_TEXT_CAP\)/)
})

import { textWindows, splitForComparison } from './in-batches'
test('LONG TEXT: anything within the limit is ONE untouched part; a longer text is cut into overlapping parts that together cover every character', () => {
  const short = 'a'.repeat(900); assert.deepEqual(textWindows(short, 1000), [short])
  const long = Array.from({ length: 400 }, (_, i) => `Paragraph ${i} ${'word '.repeat(20)}`).join('\n')
  const parts = textWindows(long, 5000, 300)
  assert.ok(parts.length > 1); assert.ok(parts.every(p => p.length <= 5000))
  assert.ok(long.startsWith(parts[0])); assert.ok(long.endsWith(parts[parts.length - 1]))                    // from the very start to the very end
  for (let i = 1; i < parts.length; i++) assert.ok(long.includes(parts[i - 1].slice(-200) + '\n') || long.indexOf(parts[i]) <= long.indexOf(parts[i - 1]) + parts[i - 1].length)   // each part starts before the last one ended: no gap
  const covered = new Array(long.length).fill(false); for (const p of parts) { const at = long.indexOf(p); for (let k = at; k < at + p.length; k++) covered[k] = true }
  assert.ok(covered.every(Boolean), 'every character of the text is in at least one part')
})
test('COMPARISON SETS: a small group is compared as it is; a big one is split so that EVERY pair of items still meets in some comparison', () => {
  const small = Array.from({ length: 16 }, (_, i) => i); assert.deepEqual(splitForComparison(small, 16), [small])
  const big = Array.from({ length: 45 }, (_, i) => i), sets = splitForComparison(big, 16)
  assert.ok(sets.every(s => s.length <= 16))
  for (let x = 0; x < big.length; x++) for (let y = x + 1; y < big.length; y++) assert.ok(sets.some(s => s.includes(x) && s.includes(y)) || Math.floor(x / 8) === Math.floor(y / 8) && sets.some(s => s.includes(x) && s.includes(y)), `${x} and ${y} are compared`)
})
test('WIRING: no cap left on cross-policy claims, CQC wording or out of date terms', () => {
  const r = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const pc = r('policy-consistency.ts'), saf = r('saf.ts'), lint = r('policy-lint.ts')
  assert.match(pc, /textWindows\(text, CLAIM_READ_CHARS\)/); assert.doesNotMatch(pc, /g\.slice\(0, MAX_GROUP_CLAIMS\)/); assert.match(pc, /splitForComparison\(g\.map\(i => claims\[i\]\), MAX_GROUP_CLAIMS\)/); assert.match(pc, /\|all-parts/)
  assert.doesNotMatch(saf, /\.slice\(0, 5\)\n?\s*\.map\(\(a: any\)/); assert.doesNotMatch(saf, /\.slice\(0, 20\)/); assert.doesNotMatch(saf, /\.slice\(0, 30\)/); assert.match(saf, /textWindows\(fullText, SAF_POLICY_TEXT_CAP\)/); assert.match(saf, /needed = rated\.filter\(c => \(c\.status === 'no' \|\| c\.status === 'partly'\) && cues\[c\.n - 1\]\)\n/)
  assert.doesNotMatch(lint, /new Set\(hits\.map\(h => h\.match\)\)\]\.slice/)
})
