import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { parseQuery, kindOnly, variants } from './admin-search-query'

test('the browser and the API run the same query code', () => {
  const api = readFileSync(join(process.cwd(), 'src/lib/admin-search-query.ts'), 'utf8')   // run from apps/api
  const web = readFileSync(join(process.cwd(), '../web/src/lib/admin-search/query.ts'), 'utf8')
  assert.equal(api, web, 'apps/web/src/lib/admin-search/query.ts and apps/api/src/lib/admin-search-query.ts must be identical')
})
test('abbreviations expand and kind words drop out of the name match', () => {
  const g = parseQuery('GDPR training')
  assert.deepEqual(g.topics, ['training'])
  assert.equal(g.subject.length, 1)
  assert.ok(g.subject[0].phrases.includes('data protection'))
})
test('a name plus a topic', () => {
  const p = parseQuery('Len Incentives')
  assert.deepEqual(p.topics, ['incentive'])
  assert.deepEqual(p.subject.map(s => s.plain), ['len'])
})
test('shorthand', () => {
  assert.ok(parseQuery('h&s').subject[0].phrases.includes('health and safety'))
  assert.ok(parseQuery('f2f').subject[0].phrases.includes('face to face'))
  assert.ok(parseQuery('DBS').subject[0].phrases.includes('disclosure and barring'))
  assert.ok(parseQuery('mca dols').subject.length === 1)
  assert.ok(variants('f2f').includes('face to face'))
})
test('a bare kind lists that kind; a specific search does not', () => {
  assert.equal(kindOnly('audits'), 'audit')
  assert.equal(kindOnly('CPD training'), 'training')
  assert.equal(kindOnly('courses'), 'training')
  assert.equal(kindOnly('policies'), 'policy')
  assert.equal(kindOnly('induction'), 'onboarding')
  assert.equal(kindOnly('infection control audit'), null)
  assert.equal(kindOnly('GDPR training'), null)
  assert.equal(kindOnly('fire'), null)
})
test('filler words are ignored', () => {
  assert.equal(parseQuery('add a staff member').subject.length, 0)
  assert.equal(parseQuery('how do i add staff').subject.length, 0)
})
