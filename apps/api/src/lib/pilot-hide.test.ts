// Demo switch: an account with feature_flags.hide_pilots = true shows no pilot features (Ask CareStream, holiday tracking), with no deploy.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { pilotsHidden } from './ask-pilot'

test('SWITCH: only the real boolean true hides the pilots; anything else, or no flags at all, leaves them as they were', () => {
  assert.equal(pilotsHidden({ hide_pilots: true }), true)
  for (const v of [undefined, null, {}, { hide_pilots: false }, { hide_pilots: 'true' }, { hide_pilots: 1 }, [], 'x', 7]) assert.equal(pilotsHidden(v), false)
})

test('WIRING: both pilots read the flag (and are still limited to their accounts), and the answer is cached for a minute at most', () => {
  const ask = fs.readFileSync(path.resolve(__dirname, 'ask-pilot.ts'), 'utf8'), hol = fs.readFileSync(path.resolve(__dirname, 'holiday-pilot.ts'), 'utf8')
  assert.match(ask, /v = isAskPilotAccount\(t\?\.account_number\) && !pilotsHidden\(t\?\.feature_flags\)/)
  assert.match(hol, /v = isPilotAccount\(t\?\.account_number\) && !pilotsHidden\(t\?\.feature_flags\)/)
  assert.match(ask, /Date\.now\(\) - hit\.at < 60_000/)
})
