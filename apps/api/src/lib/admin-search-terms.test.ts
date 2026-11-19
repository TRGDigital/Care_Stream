import test from 'node:test'
import assert from 'node:assert/strict'
import { termsOf, kindOnly, nameFilter, policyKindLabel } from './admin-search-terms'

test('a search that is only a kind lists that kind', () => {
  assert.equal(kindOnly('audits'), 'audit')
  assert.equal(kindOnly('audit'), 'audit')
  assert.equal(kindOnly('training'), 'training')
  assert.equal(kindOnly('courses'), 'training')
  assert.equal(kindOnly('CPD training'), 'training')
  assert.equal(kindOnly('policies'), 'policy')
  assert.equal(kindOnly('onboarding'), 'onboarding')
  assert.equal(kindOnly('new audit'), 'audit')
})
test('a specific search is not a kind search', () => {
  assert.equal(kindOnly('infection control'), null)
  assert.equal(kindOnly('infection control audit'), null)
  assert.equal(kindOnly('medication audit'), null)
  assert.equal(kindOnly('fire'), null)
})
test('every word must be present, with plurals cut back', () => {
  assert.deepEqual(termsOf('infection control audits'), ['infection', 'control', 'audit'])
  assert.deepEqual(termsOf('care homes'), ['care', 'home'])
  const f: any = nameFilter('name', 'infection control')
  assert.equal(f.AND.length, 2)
})
test('raw category keys are not shown', () => {
  assert.equal(policyKindLabel('internal_policy'), null)
  assert.equal(policyKindLabel('staff_handbook'), 'Staff handbook')
})
