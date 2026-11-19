import test from 'node:test'
import assert from 'node:assert/strict'
import { describeLinkResults } from './supervision-link'

const r = (name: string, result: any, on?: string) => ({ user_id: name, name, result, supervision_on: on })
test('says what was added and what was not, in plain words', () => {
  assert.equal(describeLinkResults([r('Anna', 'linked', '2026-12-03T10:00:00Z')]), 'Added to the next supervision for 1 person (3 Dec).')
  const m = describeLinkResults([r('A', 'linked', '2026-12-03T10:00:00Z'), r('B', 'linked', '2026-12-04T10:00:00Z'), r('C', 'no_supervision'), r('D', 'already', '2026-12-05T10:00:00Z')])
  assert.match(m, /Added to the next supervision for 2 people\./)
  assert.match(m, /Already on their next supervision: D\./)
  assert.match(m, /No supervision is booked yet for C\. Book one in Workforce/)
  assert.equal(describeLinkResults([]), 'Nothing was added.')
})
test('long lists are shortened', () => {
  const rows = ['A', 'B', 'C', 'D', 'E', 'F'].map(n => r(n, 'no_supervision'))
  assert.match(describeLinkResults(rows), /for A, B, C, D and 2 more\./)
})
