import test from 'node:test'
import assert from 'node:assert/strict'
import { isSupervisionRoute } from './supervision-routes'

test('supervision routes use the supervisions flag, everything else on /workforce stays Enterprise', () => {
  for (const p of ['/supervisions', '/supervisions/abc', '/staff/u1/supervisions', '/staff/u1/supervisions/']) assert.equal(isSupervisionRoute(p), true, p)
  for (const p of ['/register', '/staff/u1', '/staff/u1/training-brief', '/staff/u1/training-detail', '/staff/u1/suggestions/action', '/credentials/x', '/supervisions-extra', '/staff/u1/supervisions/x/y']) assert.equal(isSupervisionRoute(p), false, p)
})
