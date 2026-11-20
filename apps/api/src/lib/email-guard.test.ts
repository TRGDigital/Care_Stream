import test from 'node:test'
import assert from 'node:assert/strict'
import { isUndeliverableEmail, guardMessage } from './email-guard'

test('reserved and fictional domains are unsendable; real ones are not', () => {
  for (const e of ['anna@example.com', 'a@example.org', 'a@EXAMPLE.NET', 'a@mail.example.com', 'a@staff.test', 'a@x.invalid', 'a@host.localhost', 'a@thing.example']) assert.equal(isUndeliverableEmail(e), true, e)
  for (const e of ['len@carestreamai.com', 'a@notexample.com', 'a@example.co.uk', 'a@myexample.com', 'a@test.com', 'a@hotmail.com', 'plain', '']) assert.equal(isUndeliverableEmail(e), false, e)
  assert.equal(isUndeliverableEmail({ email: 'x@example.com', name: 'X' }), true)
})
test('a message to only unsendable addresses is dropped', () => {
  assert.equal(guardMessage({ to: 'anna@example.com', subject: 's' }), null)
  assert.equal(guardMessage({ to: ['a@example.com', 'b@example.org'] }), null)
  assert.equal(guardMessage({ personalizations: [{ to: [{ email: 'a@example.com' }] }] }), null)
})
test('real recipients stay, unsendable ones are removed', () => {
  const m = guardMessage({ to: [{ email: 'a@example.com' }, { email: 'len@carestreamai.com' }], cc: 'b@example.com', subject: 's' })
  assert.deepEqual(m.to, [{ email: 'len@carestreamai.com' }])
  assert.equal(m.cc, undefined)
  assert.equal(guardMessage({ to: 'real@hotmail.com' }).to, 'real@hotmail.com')
  const p = guardMessage({ personalizations: [{ to: [{ email: 'a@example.com' }] }, { to: [{ email: 'c@hotmail.com' }] }] })
  assert.equal(p.personalizations.length, 1)
})

import { withoutClickTracking } from './email-guard'
test('click tracking is switched off unless a caller chose', () => {
  assert.equal(withoutClickTracking({ to: 'a@b.com' }).trackingSettings.clickTracking.enable, false)
  assert.equal(withoutClickTracking({ trackingSettings: { clickTracking: { enable: true } } }).trackingSettings.clickTracking.enable, true)
})
