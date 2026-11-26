// A policy whose check FAILED is never recorded as a clean result, and a Resume tries it again (once, so a policy that keeps failing cannot hold a run in a loop).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

test('WORDING: a failed check is stored as failed (not "already reads well"), is not counted as done, and Resume retries it once', () => {
  const s = read('saf.ts')
  assert.match(s, /WORDING_FAILED_MESSAGE = /)
  assert.match(s, /message = didFail \? WORDING_FAILED_MESSAGE/)
  assert.match(s, /if \(didFail\) alignments = \[\]/)                                   // never a partial verdict, never charged
  assert.match(s, /NOT: \{ message: WORDING_FAILED_MESSAGE \}/)                         // run state does not count it as done
  assert.match(s, /retryFailedBefore && e\.message === WORDING_FAILED_MESSAGE && new Date\(e\.analysed_at\) < retryFailedBefore/)
  assert.match(s, /async function generateAlignments\([^)]*\): Promise<SafAlignment\[\]> \{\s*return \(await alignmentsWithStatus/)   // the single policy check is unchanged
})

test('CROSS-POLICY: a failed read is stored as failed, is not counted as read, and Resume retries it once', () => {
  const s = read('policy-consistency.ts')
  assert.match(s, /CLAIMS_FAILED_HASH = 'failed'/)
  assert.match(s, /writeRow\(CLAIMS_FAILED_HASH, \[\]\)/)
  assert.doesNotMatch(s, /writeRow\(hash, \[\]\)/)
  assert.match(s, /NOT: \{ content_hash: CLAIMS_FAILED_HASH \}/)
  assert.match(s, /retryFailedBefore && c\.content_hash === CLAIMS_FAILED_HASH && new Date\(c\.extracted_at\) < retryFailedBefore/)
})

test('RESUME sends when it began; a fresh run does not', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/app/(admin)/gaps/page.tsx'), 'utf8')
  assert.equal((page.match(/new Date\(\)\.toISOString\(\)\)/g) ?? []).length >= 2, true)
  assert.match(page, /consistencyBatch\(retrySince\)/); assert.match(page, /wordingAlignmentBatch\(retrySince\)/)
})

test('OVERLAY: all three runs use one blocking overlay with the stay message, a leave warning and a deliberate Stop; no dashes in its copy', () => {
  const page = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/app/(admin)/gaps/page.tsx'), 'utf8')
  const ov = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/components/admin/run-overlay.tsx'), 'utf8')
  assert.equal((page.match(/<RunOverlay /g) ?? []).length, 3)
  assert.match(ov, /Please stay on this page until it finishes/); assert.match(ov, /beforeunload/); assert.match(ov, /Stop the check/)
  assert.doesNotMatch(ov, /Safe to leave|carries on in the background/)
  const copy = [...ov.matchAll(/>([^<>{}]*[A-Za-z][^<>{}]*)</g)].map(m => m[1]).join(' ') + [...ov.matchAll(/'([A-Z][^']{20,})'/g)].map(m => m[1]).join(' ')
  assert.doesNotMatch(copy, /[–—]| - /)
})

test('LONG RUNS: a 401 refreshes the session once (shared, remembered) and retries the same request before anyone is sent to sign in', () => {
  const c = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/lib/api-client.ts'), 'utf8')
  assert.match(c, /let refreshInFlight/); assert.match(c, /import\('next-auth\/react'\)/); assert.match(c, /refreshedTokens\.set\(stale, fresh\)/)
  assert.match(c, /if \(!retried\) \{ const fresh = await freshTokenFor\(token\); if \(fresh\) return apiFetch<T>\(path, fresh, options, true\) \}/)
  assert.ok(c.indexOf("cs-view-as-return") < c.indexOf('freshTokenFor(token)'))   // a view as session still ends as before
  assert.doesNotMatch(c.slice(0, 400), /from 'next-auth/)                               // no static import: next-auth stays out of marketing and platform bundles
})
