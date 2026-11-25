import { test } from 'node:test'
import assert from 'node:assert/strict'
import { allowanceForYear } from './holiday-data.js'

const range = { from: '2026-04-01', to: '2027-03-31' }
test('part year figure applies only in the year of the start date', () => {
  const p = { allowance: 224, first_year_allowance: 112, start_date: '2026-10-05' }
  assert.equal(allowanceForYear(p, range), 112)
  assert.equal(allowanceForYear(p, { from: '2027-04-01', to: '2028-03-31' }), 224)
})
test('no part year figure or no start date uses the full allocation', () => {
  assert.equal(allowanceForYear({ allowance: 224, first_year_allowance: null, start_date: '2026-10-05' }, range), 224)
  assert.equal(allowanceForYear({ allowance: 224, first_year_allowance: 112, start_date: null }, range), 224)
})
