// Which named people are offered when wording is adopted: only the ones that matter to the wording or the policy.
import test from 'node:test'
import assert from 'node:assert/strict'
import { relevantRoleKeys } from '../../../web/src/lib/name-relevance'

const keys = (m: Map<string, string>) => [...m.keys()].sort()

test('RELEVANCE: a role named in the wording is relevant, with the wording as the reason', () => {
  const m = relevantRoleKeys({ wording: 'The Safeguarding Lead will review every concern within 24 hours.', policyName: 'Record Keeping Policy' })
  assert.equal(m.get('safeguarding_lead'), 'wording')
})
test('RELEVANCE: a role named in the policy text, or the subject of the policy title, is relevant', () => {
  const m = relevantRoleKeys({ wording: 'Staff must record the date.', policyName: 'Fire Safety And Evacuation Policy', policyText: 'The Registered Manager reviews drills.' })
  assert.deepEqual(keys(m), ['fire_safety_officer', 'registered_manager'])
  assert.equal(m.get('registered_manager'), 'policy'); assert.equal(m.get('fire_safety_officer'), 'title')
})
test('RELEVANCE: roles that have nothing to do with this wording or policy are NOT offered', () => {
  const m = relevantRoleKeys({ wording: 'Meals are served at set times.', policyName: 'Nutrition And Hydration Policy' })
  assert.deepEqual(keys(m), ['nutrition_hydration_lead'])
  assert.ok(!m.has('fire_safety_officer') && !m.has('safeguarding_lead') && !m.has('caldicott_guardian'))
})
test('RELEVANCE: the nominated individual and the approver are offered when the wording names them; the wording wins over the title', () => {
  const m = relevantRoleKeys({ wording: 'This policy is approved by the nominated individual.', policyName: 'Safeguarding Adults Policy' })
  assert.equal(m.get('nominated_individual'), 'wording'); assert.equal(m.get('default_approver'), 'wording'); assert.equal(m.get('safeguarding_lead'), 'title')
})
test('RELEVANCE: nothing relevant gives an empty set (the screen then offers Show everyone)', () => {
  assert.equal(relevantRoleKeys({ wording: 'Keep it tidy.', policyName: 'General Policy' }).size, 0)
})
