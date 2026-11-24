import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMatrixCsv, looksLikeMatrix, parseImportCsv, parseMonthHeader, balanceFor, carryInFor, yearRange, nameKey } from './holiday-math'

// A small copy of the spreadsheet layout (not Len's file): a blank row, then per person a taken row and a Booked row.
const H = 'Staff Name,Start Date,Holiday Entitlement Hrs,Contracted Hours/Week,Jan-26,Feb-26,Mar-26,Apr-26,May-26,Jun-26,Jul-26,Aug-26,Sep-26,Oct-26,Nov-26,Dec-26,Total Hours Taken,Holiday Hours Remaining,Percentage Taken'
const FIXTURE = [
  H, ',,,,,,,,,,,,,,,,,,',
  'Ann Example,2/20/2017,224,40,,,40,80,,12,,,12,12,,,156,68,', 'Booked,,,,,,,,,,,,,,,,,,',
  'Bea Sample,8/25/2025,112,20,,,,,20,,20,5,,,,,45,67,', 'Booked,,,,,,,,22,,25,,,,,,,,',
  'Cy Test,7/18/2024,109.2,39,,,,,,,,,,2.4,,,0,109.2,', 'Booked,,,,,,,,,,,,,,,,,,',
].join('\n')

test('the day by day importer rejects the matrix, and the matrix is recognised', () => {
  assert.equal(looksLikeMatrix(FIXTURE), true)
  assert.equal(looksLikeMatrix('email,date,hours,status\na@b.co,2026-03-04,8,approved'), false)
  const r = parseImportCsv(FIXTURE).rows
  assert.ok(r.length > 0 && r.every(x => x.error), 'every row fails as day rows (dates and hours are not day values)')
})

test('month headers: Jan-26, Feb 2026, Sept-26', () => {
  assert.deepEqual(parseMonthHeader('Jan-26'), { year: 2026, month: 1 })
  assert.deepEqual(parseMonthHeader('Feb 2026'), { year: 2026, month: 2 })
  assert.deepEqual(parseMonthHeader('Sept-26'), { year: 2026, month: 9 })
  assert.equal(parseMonthHeader('Total Hours Taken'), null)
})

test('the matrix is read: taken row, Booked row, blanks, decimals, dates month first', () => {
  const p = parseMatrixCsv(FIXTURE)
  assert.equal(p.matrix, true); assert.equal(p.problems.length, 0); assert.equal(p.people.length, 3)
  assert.equal(p.months.length, 12); assert.equal(p.months[0], '2026-01')
  const ann = p.people[0]
  assert.deepEqual(ann.taken, { '2026-03': 40, '2026-04': 80, '2026-06': 12, '2026-09': 12, '2026-10': 12 }); assert.deepEqual(ann.booked, {})
  assert.equal(ann.start_date, '2017-02-20'); assert.equal(ann.entitlement, 224); assert.equal(ann.contracted, 40)
  const bea = p.people[1]
  assert.deepEqual(bea.booked, { '2026-05': 22, '2026-07': 25 }); assert.equal(bea.taken['2026-08'], 5)
  assert.equal(p.people[2].taken['2026-10'], 2.4)
  assert.equal(p.date_format, 'mdy')   // 2/20/2017 can only be month first
})

test('bad cells and orphan Booked rows are reported, totals columns are ignored', () => {
  const bad = [H, 'Booked,,,,5', 'Dee Bad,1/1/2020,100,40,x,,,,,,,,,,,,0,0,'].join('\n')
  const p = parseMatrixCsv(bad)
  assert.ok(p.problems.some(x => /no person above/i.test(x.message))); assert.ok(p.problems.some(x => /not a number/i.test(x.message)))
  const ok = parseMatrixCsv([H, 'Eve Ok,1/1/2020,100,40,,,,,,,,,,,,,999,999,50'].join('\n'))
  assert.deepEqual(ok.people[0].taken, {})   // total, remaining and percentage are never read as months
})

test('day first dates are recognised when a day is above 12', () => {
  const p = parseMatrixCsv([H, 'Fay,25/12/2019,100,40,,,,,,,,,,,,,0,0,', 'Booked,,,,'].join('\n'))
  assert.equal(p.date_format, 'dmy'); assert.equal(p.people[0].start_date, '2019-12-25')
})

test('imported monthly figures add to the matrix and the totals, and are not counted twice', () => {
  const range = yearRange(2026, 1, 1)
  const days = [{ day: '2026-03-02', hours: 8 }]
  const base = balanceFor({ allowance: 224, unit: 'hours', days, range, today: '2026-06-01' })
  const monthly = [{ key: '2026-03', taken: 40, booked: 0 }, { key: '2026-09', taken: 0, booked: 24 }, { key: '2025-12', taken: 99, booked: 0 }]
  const b = balanceFor({ allowance: 224, unit: 'hours', days, range, today: '2026-06-01', monthly })
  assert.equal(b.by_month_taken['2026-03'], 48)     // 8 from the approved day plus 40 imported
  assert.equal(b.by_month_booked['2026-09'], 24)
  assert.equal(b.taken, base.taken + 40); assert.equal(b.booked, 24)
  assert.equal(b.remaining, 224 - 8 - 40 - 24)
  assert.equal(b.percent_taken, Math.round((48 / 224) * 1000) / 10)
  // the same figures given twice would double; the importer replaces rows, so the data layer only ever holds one set
  const again = balanceFor({ allowance: 224, unit: 'hours', days, range, today: '2026-06-01', monthly })
  assert.deepEqual(again, b)
})

test('imported figures count as used when working out carry over', () => {
  const monthly = [{ key: '2025-05', taken: 100, booked: 0 }]
  assert.equal(carryInFor({ year: 2026, allowance: 224, unit: 'hours', days: [], month: 1, day: 1, carryOver: true, back: 1, monthly }), 124)
  assert.equal(carryInFor({ year: 2026, allowance: 224, unit: 'hours', days: [], month: 1, day: 1, carryOver: false, monthly }), 0)
})

test('names match without caring about case, spaces or punctuation', () => {
  assert.equal(nameKey("  Liam  O'Connor "), nameKey('liam o connor'))
  assert.notEqual(nameKey('Len Burgess'), nameKey('Lenny Burgess'))
})
