import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { FEATURES } from './features.ts'
import { searchFeatures, searchGuides } from './search.ts'

const guides = JSON.parse(readFileSync(new URL('./guides-index.json', import.meta.url), 'utf8'))
const top = (q) => searchFeatures(q, FEATURES)[0]?.entry.id

test('people find features by the words they use', () => {
  assert.equal(top('incentives'), 'incentives')
  assert.equal(top('supervision'), 'supervisions')
  assert.equal(top('dbs check'), 'workforce')
  assert.equal(top('invite family'), 'residents')
  assert.equal(top('copy link'), 'residents')
  assert.equal(top('infection control audit'), 'audits')
  assert.equal(top('change my plan'), 'billing')
  assert.equal(top('cqc'), 'cqc-report')
  assert.equal(top('care certificate'), 'cpd')
  assert.equal(top('who has not signed in'), 'staff-records')
})
test('nonsense finds nothing and stop words alone find nothing', () => {
  assert.equal(searchFeatures('zzqxv', FEATURES).length, 0)
  assert.equal(searchFeatures('how do i', FEATURES).length, 0)
  assert.equal(searchFeatures('', FEATURES).length, 0)
})
test('guide text is searched, with a snippet', () => {
  const g = searchGuides('upload your cqc report', guides)
  assert.ok(g.length > 0)
  assert.ok(g[0].snippet.length > 10)
})
test('every entry has a unique id, a real guide and a path', () => {
  const ids = new Set(FEATURES.map(f => f.id)); assert.equal(ids.size, FEATURES.length)
  const gids = new Set(guides.map(g => g.id))
  for (const f of FEATURES) { assert.ok(f.href.startsWith('/'), f.id); if (f.guide) assert.ok(gids.has(f.guide), `${f.id}: guide ${f.guide} does not exist`) }
  for (const f of FEATURES) for (const w of [f.title, f.about, ...f.words]) assert.doesNotMatch(w, /[—–]/, `${f.id}: no dashes in copy`)
})

test('the committed guides index matches the Help and Guides page (re-run scripts/build-admin-search-guides.mjs if this fails)', async () => {
  const { build } = await import('../../../scripts/build-admin-search-guides.mjs')
  assert.deepEqual(JSON.parse(JSON.stringify(build())), guides)
})

test('people find the action, not just the page', () => {
  assert.equal(top('add a staff member'), 'do-add-staff')
  assert.equal(top('upload a policy'), 'do-upload-policy')
  assert.equal(top('new face to face session'), 'do-new-f2f')
  assert.equal(top('add faq'), 'do-add-entry')
  assert.equal(top('new incentive'), 'do-new-incentive')
  assert.equal(top('create onboarding flow'), 'do-new-flow')
})
test('every action in the map is performed by a page (no dead links)', async () => {
  const { execSync } = await import('node:child_process')
  const root = new URL('../../', import.meta.url).pathname
  const src = execSync(`grep -rhoE "useSearchIntent\\(\\{[^;]*" ${root} || true`, { encoding: 'utf8' }) + execSync(`grep -rh -A4 "useSearchIntent({" ${root} || true`, { encoding: 'utf8' })
  for (const f of FEATURES.filter(x => x.action)) {
    const name = new URL(f.href, 'http://x').searchParams.get('do')
    assert.ok(src.includes(`'${name}'`), `${f.id}: no page handles do=${name}`)
  }
})
