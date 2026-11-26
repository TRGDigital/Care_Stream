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
  assert.match(gd, /identify\(\{ \.\.\.reg, required_elements: chunk \}, evidenceText, open\)/); assert.match(rc, /assessElementsChunk\(reg, policyName, w, chunk\)/); assert.match(rc, /partsOf\(policyText, POLICY_TEXT_CAP, open\)/)
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
  assert.match(pc, /partsOf\(text, CLAIM_READ_CHARS, open\)/); assert.match(pc, /splitForComparison\(g\.map\(i => claims\[i\]\), MAX_GROUP_CLAIMS\)/); assert.match(pc, /\|all-parts/)
  assert.doesNotMatch(saf, /\.slice\(0, 5\)\n?\s*\.map\(\(a: any\)/); assert.doesNotMatch(saf, /\)\]\.slice\(0, 20\)/); assert.doesNotMatch(saf, /map\(t => t\.term\)\.slice/); assert.match(saf, /partsOf\(fullText, SAF_POLICY_TEXT_CAP, open\)/); assert.match(saf, /let needed = rated\.filter\(c => \(c\.status === 'no' \|\| c\.status === 'partly'\) && cues\[c\.n - 1\]\)\n  if \(!open\) needed = needed\.slice\(0, 5\)/)
  assert.doesNotMatch(lint, /new Set\(hits\.map\(h => h\.match\)\)\]\.slice/)
})

import { noCapList, partsOf } from './uncapped'
test('WHO GETS NO CAP: CS-1001 by default, * for everyone, and the old limits (one cut part) for everyone else', () => {
  const was = process.env.NO_CAP_ACCOUNTS
  try {
    delete process.env.NO_CAP_ACCOUNTS; assert.deepEqual(noCapList(), ['CS-1001'])
    process.env.NO_CAP_ACCOUNTS = ' cs-1001 , CS-1009 '; assert.deepEqual(noCapList(), ['CS-1001', 'CS-1009'])
    process.env.NO_CAP_ACCOUNTS = '*'; assert.deepEqual(noCapList(), ['*'])
  } finally { if (was === undefined) delete process.env.NO_CAP_ACCOUNTS; else process.env.NO_CAP_ACCOUNTS = was }
  const long = 'x'.repeat(2500)
  assert.deepEqual(partsOf(long, 1000, false), ['x'.repeat(1000)])           // old limit: the first 1000 characters, nothing more
  assert.ok(partsOf(long, 1000, true).length > 1)                           // no cap: every part
  assert.deepEqual(partsOf('short', 1000, true), ['short'])                 // within the limit both are the same single read
})
test('GATED: each place that lifted a cap keeps the old limit for accounts that are not switched on', () => {
  const r = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const gd = r('gap-detail.ts'), rc = r('regulation-coverage.ts'), saf = r('saf.ts'), pc = r('policy-consistency.ts')
  assert.match(gd, /if \(!open\) curated = curated\.slice\(0, MAX_REQUIREMENTS\)/); assert.match(gd, /const open = await noCapFor\(tenantId\)/)
  assert.match(rc, /const elements = open \? all : all\.slice\(0, ELEMENTS_PER_CALL\)/); assert.match(rc, /const open = await noCapFor\(tenantId\)/)
  assert.match(saf, /if \(!open\) cues = cues\.slice\(0, 20\)/); assert.match(saf, /if \(!open\) keepTerms = keepTerms\.slice\(0, 30\)/); assert.match(saf, /await noCapFor\(tenantId\)/)
  assert.match(pc, /open && text\.length > CLAIM_READ_CHARS/); assert.match(pc, /open \? splitForComparison\(g\.map\(i => claims\[i\]\), MAX_GROUP_CLAIMS\) : \[g\.slice\(0, MAX_GROUP_CLAIMS\)/)
})
test('CROSS-POLICY RE-RUN: at the start of a run every stored reading that no longer matches the policy as it is now is dropped (edited, failed, or a long policy read from its first part alone), so it is read again; unchanged ones are kept', () => {
  const r = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const pc = r('policy-consistency.ts'), rt = r('../../routes/analytics.ts')
  assert.doesNotMatch(pc, /export async function dropStaleClaims[^]*?if \(!\(await noCapFor\(tenantId\)\)\) return 0/)   // no longer only for no cap accounts
  assert.match(pc, /open && t\.length > CLAIM_READ_CHARS \? `\$\{t\}\|all-parts` : t/); assert.match(pc, /if \(t === undefined\) return/)
  assert.match(rt, /await dropStaleClaims\(tenantId\)[^]*?await pendingClaimPolicies\(tenantId\)/)
})
