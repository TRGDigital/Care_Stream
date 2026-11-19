import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveViewAsMode, modeFromFlags } from './view-as'

test('off means off, whatever is asked', () => {
  assert.equal(resolveViewAsMode('off', 'view'), null)
  assert.equal(resolveViewAsMode('off', 'act'), null)
})
test('view only accounts can look but never act', () => {
  assert.equal(resolveViewAsMode('view', 'view'), 'view')
  assert.equal(resolveViewAsMode('view', undefined), 'view')
  assert.equal(resolveViewAsMode('view', 'act'), null)
})
test('act accounts can do either, and the default is the safe one', () => {
  assert.equal(resolveViewAsMode('act', 'act'), 'act')
  assert.equal(resolveViewAsMode('act', 'view'), 'view')
  assert.equal(resolveViewAsMode('act', undefined), 'view')
  assert.equal(resolveViewAsMode('act', 'anything else'), 'view')
})

test('act mode needs a TEST account as well as the flag: a real customer can never be acted as', () => {
  assert.equal(modeFromFlags({ view_as_hub: true, view_as_act: true, is_test: true }), 'act')
  assert.equal(modeFromFlags({ view_as_hub: true, view_as_act: true }), 'view')                 // flag set on a real account: view only
  assert.equal(modeFromFlags({ view_as_hub: true, view_as_act: true, is_test: false }), 'view')
  assert.equal(modeFromFlags({ view_as_act: true, is_test: true }), 'off')                      // act alone does not switch viewing on
  assert.equal(modeFromFlags({}), 'off')
  assert.equal(modeFromFlags(null), 'off')
})
