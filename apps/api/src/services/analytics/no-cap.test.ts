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
  assert.match(gd, /identify\(\{ \.\.\.reg, required_elements: chunk \}, evidenceText\)/); assert.match(rc, /assessElementsChunk\(reg, policyName, policyText, chunk\)/)
})
