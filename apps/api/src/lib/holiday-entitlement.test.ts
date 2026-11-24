import test from 'node:test'
import assert from 'node:assert/strict'
import { statutoryEntitlement, partYearEntitlement, compareWithStatutory, irregularHoursAccrual, holidayOwedOnLeaving, leaveYearFor, daysInclusive } from './holiday-entitlement'

const near = (a: number, b: number, d = 1e-6) => assert.ok(Math.abs(a - b) < d, `${a} is not ${b}`)
const noDashes = (v: unknown) => assert.ok(!/[–—]/.test(JSON.stringify(v)), 'no en or em dash in any result text')
const Y26 = { leaveYearStart: '2026-01-01', leaveYearEnd: '2026-12-31' }

test('statutory minimum: GOV.UK examples and the 28 day limit', () => {
  const five = statutoryEntitlement({ daysPerWeek: 5 }); near(five.days!, 28); assert.equal(five.capped, false)
  near(statutoryEntitlement({ daysPerWeek: 3 }).days!, 16.8)           // 3 x 5.6
  const six = statutoryEntitlement({ daysPerWeek: 6 }); near(six.days!, 28); assert.equal(six.capped, true)
  near(statutoryEntitlement({ hoursPerWeek: 40 }).hours!, 224)         // 5.6 x 40
  near(statutoryEntitlement({ hoursPerWeek: 30 }).hours!, 168)         // part time, 30 hours a week
  const both = statutoryEntitlement({ hoursPerWeek: 40, daysPerWeek: 5 }); near(both.hours!, 224); near(both.days!, 28)
  const cap = statutoryEntitlement({ hoursPerWeek: 48, daysPerWeek: 6 })   // 6 x 8 hour days: capped at 28 days = 224 hours
  near(cap.hours!, 224); assert.equal(cap.capped, true)
  assert.throws(() => statutoryEntitlement({})); assert.throws(() => statutoryEntitlement({ hoursPerWeek: 0 }))
  noDashes([five, six, cap])
})

test('GOV.UK starter example: 28 days, leave year from 1 January, January accrues 2.5 days (2.33 rounded up to the half day)', () => {
  const r = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-01-13', leavingDate: '2026-01-31' })
  near(r.months!, 1); near(r.unrounded, 28 / 12, 1e-4); assert.equal(r.entitlement, 2.5)
})

test('GOV.UK accrual example: after the third month 28 days gives 7 days', () => {
  const r = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-01-01', leavingDate: '2026-03-31' })
  near(r.months!, 3); assert.equal(r.entitlement, 7)
})

test('starting part way through a month counts the whole month, so the full year from 13 January is still 28 days', () => {
  const r = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-01-13' })
  near(r.months!, 12); assert.equal(r.entitlement, 28)
})

test('a start in the middle of the year, monthly and exact days methods', () => {
  const m = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-07-01' })      // July to December = 6 months
  near(m.months!, 6); assert.equal(m.entitlement, 14)
  const d = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-07-01', method: 'exact_days' })   // 184 of 365 days
  assert.equal(d.daysEmployed, 184); near(d.unrounded, 28 * 184 / 365, 1e-4); assert.equal(d.entitlement, 14.5)
})

test('a leaver part way through a month: the leaving month counts by the days worked in it', () => {
  const r = partYearEntitlement({ annual: 224, unit: 'hours', ...Y26, startDate: '2020-02-03', leavingDate: '2026-03-16', hoursPerDay: 8, roundTo: 'half_day' })
  near(r.months!, 2 + 16 / 31, 1e-6)
  assert.equal(r.roundedTo, 'half_day')
  near(r.entitlement % 4, 0)    // a multiple of half a day (4 hours)
})

test('start and leaving in the same month, same day, first day and last day of the leave year', () => {
  const same = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-05-10', leavingDate: '2026-05-20' })
  near(same.months!, 11 / 31, 1e-6)
  const oneDay = partYearEntitlement({ annual: 365, unit: 'days', ...Y26, startDate: '2026-12-31', method: 'exact_days', roundTo: 'none' })
  assert.equal(oneDay.daysEmployed, 1); near(oneDay.entitlement, 1)
  const first = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-01-01', leavingDate: '2026-12-31' })
  assert.equal(first.entitlement, 28); near(first.fraction, 1)
  const lastDay = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2020-01-01', leavingDate: '2026-01-31' })
  near(lastDay.months!, 1)
})

test('before the leave year or after it: nothing, and a start before the year counts the full year', () => {
  assert.equal(partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2027-02-01' }).entitlement, 0)
  assert.equal(partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2019-02-01', leavingDate: '2025-12-31' }).entitlement, 0)
  assert.equal(partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2019-02-01' }).entitlement, 28)
})

test('a leaving date before the start date is an error; bad dates are refused', () => {
  assert.throws(() => partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-06-01', leavingDate: '2026-05-31' }), /before the start date/)
  assert.throws(() => partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-02-30' }))
  assert.throws(() => partYearEntitlement({ annual: 28, unit: 'days', leaveYearStart: '2026-12-31', leaveYearEnd: '2026-01-01' }))
  assert.throws(() => partYearEntitlement({ annual: -1, unit: 'days', ...Y26 }))
})

test('leap year: 2028 has 366 days and the exact days share uses them', () => {
  assert.equal(daysInclusive('2028-01-01', '2028-12-31'), 366)
  const r = partYearEntitlement({ annual: 366, unit: 'days', leaveYearStart: '2028-01-01', leaveYearEnd: '2028-12-31', startDate: '2028-03-01', method: 'exact_days', roundTo: 'none' })
  assert.equal(r.daysEmployed, 306); near(r.entitlement, 306)
})

test('a leave year that starts in April: months are counted from April', () => {
  const r = partYearEntitlement({ annual: 224, unit: 'hours', leaveYearStart: '2026-04-01', leaveYearEnd: '2027-03-31', startDate: '2026-10-01', hoursPerDay: 8 })
  near(r.months!, 6); assert.equal(r.entitlement, 112)
})

test('rounding is always up, and floating point noise does not push a whole number up', () => {
  const r = partYearEntitlement({ annual: 224, unit: 'hours', ...Y26, startDate: '2026-02-01', roundTo: 'tenth_hour' })   // 11 months
  near(r.unrounded, 224 * 11 / 12); assert.equal(r.entitlement, 205.4)    // 205.333... up to 205.4
  assert.equal(partYearEntitlement({ annual: 24, unit: 'days', ...Y26, startDate: '2026-07-01', roundTo: 'half_day' }).entitlement, 12)
  const none = partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-01-13', leavingDate: '2026-01-31', roundTo: 'none' })
  near(none.entitlement, 2.33, 0.005)
})

test('hours with a half day rounding needs the day length; without it falls back to tenths of an hour with a note', () => {
  const noLen = partYearEntitlement({ annual: 224, unit: 'hours', ...Y26, startDate: '2026-07-01', roundTo: 'half_day' })
  assert.equal(noLen.roundedTo, 'tenth_hour'); assert.ok(noLen.caveats.some(c => /usual day/.test(c)))
  const withLen = partYearEntitlement({ annual: 224, unit: 'hours', ...Y26, startDate: '2026-03-13', roundTo: 'half_day', hoursPerDay: 8 })   // 10 months = 186.67 -> 188
  assert.equal(withLen.entitlement, 188)
})

test('part time 30 hours a week with 168 hours a year, starting 1 July', () => {
  const r = partYearEntitlement({ annual: 168, unit: 'hours', ...Y26, startDate: '2026-07-01', hoursPerDay: 6 })
  near(r.months!, 6); assert.equal(r.entitlement, 84)
})

test('compare with the statutory minimum', () => {
  const ok = compareWithStatutory(224, 224); assert.equal(ok.ok, true); assert.equal(ok.shortfall, 0)
  const low = compareWithStatutory(200, 224); assert.equal(low.ok, false); near(low.shortfall, 24); assert.match(low.message, /statutory minimum applies/)
  const days = compareWithStatutory(25, 28, 'days'); assert.match(days.message, /days/)
  assert.throws(() => compareWithStatutory(-1, 5))
  noDashes([ok, low, days])
})

test('irregular hours: GOV.UK example, 30 hours worked is 3.621 which is 4 hours', () => {
  const r = irregularHoursAccrual({ hoursWorked: 30 })
  near(r.accruedExact, 3.621); assert.equal(r.accruedHours, 4)
  assert.equal(irregularHoursAccrual({ hoursWorked: 10 }).accruedHours, 1)     // 1.207
  assert.equal(irregularHoursAccrual({ hoursWorked: 4 }).accruedHours, 0)      // 0.4828 is under half an hour, rounded down here
  assert.equal(irregularHoursAccrual({ hoursWorked: 0 }).accruedHours, 0)
  const many = irregularHoursAccrual({ payPeriodsHours: [30, 30, 10] }); assert.equal(many.accruedHours, 9); assert.deepEqual(many.perPayPeriod, [4, 4, 1])
  assert.ok(many.caveats.some(c => /below half an hour|Amounts below half an hour/.test(c)))
  assert.throws(() => irregularHoursAccrual({})); assert.throws(() => irregularHoursAccrual({ hoursWorked: -2 }))
  noDashes([r, many])
})

test('holiday owed on leaving: untaken leave is paid, booked leave after the last day is cancelled', () => {
  const r = holidayOwedOnLeaving({ unit: 'hours', entitlementToLeavingDate: 80, taken: 32, bookedAfterLeaving: 16, hourlyRate: 12.71 })
  near(r.owed, 48); assert.equal(r.owedPounds, 610.08); assert.equal(r.cancelledBooked, 16); assert.equal(r.overTaken, 0)
  assert.ok(r.steps.some(s => /booked after the last day is cancelled/.test(s)))
  const over = holidayOwedOnLeaving({ unit: 'hours', entitlementToLeavingDate: 40, taken: 56, hourlyRate: 12.71 })
  assert.equal(over.owed, 0); near(over.overTaken, 16); assert.equal(over.owedPounds, 0); assert.ok(over.caveats.some(c => /agreed beforehand in writing/.test(c)))
  const days = holidayOwedOnLeaving({ unit: 'days', entitlementToLeavingDate: 10, taken: 4.5, dayRate: 96 })
  near(days.owed, 5.5); assert.equal(days.owedPounds, 528)
  assert.equal(holidayOwedOnLeaving({ unit: 'hours', entitlementToLeavingDate: 20, taken: 20 }).owedPounds, undefined)
  assert.throws(() => holidayOwedOnLeaving({ unit: 'hours', entitlementToLeavingDate: -1, taken: 0 }))
  noDashes([r, over, days])
})

test('the leave year containing a date', () => {
  assert.deepEqual(leaveYearFor('2026-11-24'), { start: '2026-01-01', end: '2026-12-31', label: '2026' })
  assert.deepEqual(leaveYearFor('2026-02-10', 4, 1), { start: '2025-04-01', end: '2026-03-31', label: '2025 to 2026' })
  assert.deepEqual(leaveYearFor('2026-04-01', 4, 1), { start: '2026-04-01', end: '2027-03-31', label: '2026 to 2027' })
  assert.deepEqual(leaveYearFor('2028-12-31'), { start: '2028-01-01', end: '2028-12-31', label: '2028' })
  assert.throws(() => leaveYearFor('24/11/2026'))
})

test('every result carries the caveats and points to the GOV.UK calculator', () => {
  const results = [statutoryEntitlement({ hoursPerWeek: 37.5 }), partYearEntitlement({ annual: 28, unit: 'days', ...Y26, startDate: '2026-03-01' }), irregularHoursAccrual({ hoursWorked: 12 }), holidayOwedOnLeaving({ unit: 'days', entitlementToLeavingDate: 3, taken: 1 })]
  for (const r of results) { assert.ok(r.caveats.length >= 3); assert.ok(r.caveats.some(c => c.includes('https://www.gov.uk/calculate-your-holiday-entitlement'))); noDashes(r.steps); noDashes(r.caveats) }
})
