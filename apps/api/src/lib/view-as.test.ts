import test from 'node:test'
import assert from 'node:assert/strict'
import { resolveViewAsMode } from './view-as'

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
