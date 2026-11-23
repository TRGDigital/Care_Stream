import test from 'node:test'
import assert from 'node:assert/strict'
import { nextBirthday, birthdayIn, ukToday } from './staffBirthdays'

const d = (s: string) => new Date(s + 'T00:00:00Z')
const at = (s: string) => new Date(s + 'T12:00:00Z')

test('a birthday today is 0 days away and the age is the one being reached', () => {
  const r = nextBirthday(d('1985-11-23'), at('2026-11-23'))
  assert.deepEqual(r, { date: '2026-11-23', days: 0, turning: 41 })
})

test('seven days ahead, and across the new year', () => {
  assert.equal(nextBirthday(d('1990-11-30'), at('2026-11-23')).days, 7)
  const r = nextBirthday(d('1990-01-02'), at('2026-12-28'))
  assert.deepEqual(r, { date: '2027-01-02', days: 5, turning: 37 })
})

test('a birthday that has just passed rolls to next year', () => {
  const r = nextBirthday(d('1990-11-22'), at('2026-11-23'))
  assert.equal(r.date, '2027-11-22')
  assert.equal(r.days, 364)
})

test('29 February is celebrated on 28 February in a year without one, and on the 29th in a leap year', () => {
  assert.equal(birthdayIn(d('1992-02-29'), 2027).toISOString().slice(0, 10), '2027-02-28')
  assert.equal(birthdayIn(d('1992-02-29'), 2028).toISOString().slice(0, 10), '2028-02-29')
  assert.equal(nextBirthday(d('1992-02-29'), at('2027-02-21')).days, 7)
})

test('the UK date is used around midnight in summer time', () => {
  // 23:30 UTC on 30 June is 00:30 on 1 July in the UK
  assert.equal(ukToday(new Date('2026-06-30T23:30:00Z')).toISOString().slice(0, 10), '2026-07-01')
})
