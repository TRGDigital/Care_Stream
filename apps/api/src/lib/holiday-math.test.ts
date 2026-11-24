import test from 'node:test'
import assert from 'node:assert/strict'
import {
  yearRange, yearContaining, monthsOfYear, balanceFor, carryInFor, validateDays, defaultDayHours, clashesFor, bankMultiplier,
  parseImportCsv, parseDateCell, weekStart, weekdayIndex, ukToday, addDays,
} from './holiday-math'
import { isPilotAccount, pilotAccounts } from './holiday-pilot'

test('the holiday year runs January to December by default, and can start in April', () => {
  const r = yearRange(2026)
  assert.equal(r.from, '2026-01-01'); assert.equal(r.to, '2026-12-31'); assert.equal(r.label, '2026')
  const a = yearRange(2026, 4, 1)
  assert.equal(a.from, '2026-04-01'); assert.equal(a.to, '2027-03-31'); assert.equal(a.label, '2026/27')
  assert.equal(yearContaining('2026-02-10'), 2026); assert.equal(yearContaining('2026-02-10', 4, 1), 2025)
  const m = monthsOfYear(a)
  assert.equal(m[0].key, '2026-04'); assert.equal(m[11].key, '2027-03'); assert.equal(m[11].to, '2027-03-31'); assert.equal(m[0].label, 'Apr-26')
})

const days = [
  { day: '2026-03-02', hours: 8 }, { day: '2026-03-03', hours: 8 },   // past
  { day: '2026-12-24', hours: 12 },                                    // future
  { day: '2025-12-30', hours: 8 },                                     // another year
]
test('only days in the year count; taken is up to today, booked is after today', () => {
  const b = balanceFor({ allowance: 224, unit: 'hours', days, range: yearRange(2026), today: '2026-11-24' })
  assert.equal(b.taken, 16); assert.equal(b.booked, 12); assert.equal(b.used, 28); assert.equal(b.remaining, 196)
  assert.equal(b.by_month_taken['2026-03'], 16); assert.equal(b.by_month_booked['2026-12'], 12)
  assert.equal(b.percent_taken, 7.1)
  const today = balanceFor({ allowance: 100, unit: 'hours', days: [{ day: '2026-11-24', hours: 8 }], range: yearRange(2026), today: '2026-11-24' })
  assert.equal(today.taken, 8, 'today counts as taken')
})

test('people measured in days count each day as 1, whatever the hours', () => {
  const b = balanceFor({ allowance: 28, unit: 'days', days, range: yearRange(2026), today: '2026-11-24' })
  assert.equal(b.taken, 2); assert.equal(b.booked, 1); assert.equal(b.remaining, 25)
})

test('carry over: off loses untaken holiday, on adds it to the next year (and chains)', () => {
  const d = [{ day: '2025-06-02', hours: 8 }, { day: '2025-06-03', hours: 8 }]
  const base = { year: 2026, allowance: 40, unit: 'hours' as const, days: d, month: 1, day: 1 }
  assert.equal(carryInFor({ ...base, carryOver: false }), 0)
  assert.equal(carryInFor({ ...base, carryOver: true }), 24)
  const b = balanceFor({ allowance: 40, unit: 'hours', carryIn: 24, days: [], range: yearRange(2026), today: '2026-01-05' })
  assert.equal(b.entitlement, 64); assert.equal(b.carry_in, 24); assert.equal(b.remaining, 64)
  // 2025 left 24 over; 2026 uses 8 of 64 and leaves 56 for 2027
  const chain = carryInFor({ year: 2027, allowance: 40, unit: 'hours', days: [...d, { day: '2026-02-02', hours: 8 }], month: 1, day: 1, carryOver: true })
  assert.equal(chain, 56)
  assert.equal(carryInFor({ ...base, days: [], carryOver: true }), 0, 'a person with no history carries nothing')
})

test('requests: whole hours 1 to 13, no duplicates, no past days for staff', () => {
  const ok = validateDays([{ day: '2026-12-02', hours: 8 }, { day: '2026-12-01', hours: 12 }], { today: '2026-11-24' })
  assert.ok(ok.ok && ok.total_hours === 20 && ok.days[0].day === '2026-12-01')
  assert.equal(validateDays([{ day: '2026-12-02', hours: 0 }], { today: '2026-11-24' }).ok, false)
  assert.equal(validateDays([{ day: '2026-12-02', hours: 14 }], { today: '2026-11-24' }).ok, false)
  assert.equal(validateDays([{ day: '2026-12-02', hours: 7.5 }], { today: '2026-11-24' }).ok, false)
  assert.equal(validateDays([{ day: '2026-12-02', hours: 8 }, { day: '2026-12-02', hours: 8 }], { today: '2026-11-24' }).ok, false)
  assert.equal(validateDays([{ day: '2026-11-01', hours: 8 }], { today: '2026-11-24' }).ok, false)
  assert.equal(validateDays([{ day: '2026-11-01', hours: 8 }], { today: '2026-11-24', allowPast: true }).ok, true)
  assert.equal(validateDays([], { today: '2026-11-24' }).ok, false)
  assert.equal(validateDays([{ day: 'nope', hours: 8 }], { today: '2026-11-24' }).ok, false)
})

test('default hours for a day come from contracted hours', () => {
  assert.equal(defaultDayHours(40), 8); assert.equal(defaultDayHours(36), 7); assert.equal(defaultDayHours(20), 4)
  assert.equal(defaultDayHours(null), 8); assert.equal(defaultDayHours(0), 8); assert.equal(defaultDayHours(120), 13); assert.equal(defaultDayHours(2), 1)
})

test('clashes show who else is off, who has asked, and when the limit would be passed', () => {
  const others = [
    { day: '2026-12-01', user_id: 'a', name: 'Ann', status: 'approved' as const, hours: 8 },
    { day: '2026-12-01', user_id: 'b', name: 'Bo', status: 'approved' as const, hours: 8 },
    { day: '2026-12-01', user_id: 'c', name: 'Cy', status: 'pending' as const, hours: 8 },
    { day: '2026-12-01', user_id: 'me', name: 'Me', status: 'approved' as const, hours: 8 },
  ]
  const c = clashesFor({ days: ['2026-12-01', '2026-12-02'], userId: 'me', others, maxOff: 2 })
  assert.equal(c[0].approved_count, 2); assert.equal(c[0].pending.length, 1); assert.equal(c[0].over_limit, true)
  assert.equal(c[1].approved_count, 0); assert.equal(c[1].over_limit, false)
  assert.equal(clashesFor({ days: ['2026-12-01'], userId: 'me', others, maxOff: null })[0].over_limit, false)
  assert.equal(clashesFor({ days: ['2026-12-01'], userId: 'me', others, maxOff: 3 })[0].over_limit, false, '2 already off + this person = 3, which is within a limit of 3')
})

test('bank holidays are never deducted and carry a stored multiplier: Christmas and Boxing Day 2x, others the default', () => {
  assert.equal(bankMultiplier('2026-12-25', 'Christmas Day', 1.5), 2)
  assert.equal(bankMultiplier('2026-12-28', 'Boxing Day', 1.5), 2)
  assert.equal(bankMultiplier('2026-08-31', 'Summer bank holiday', 1.5), 1.5)
  assert.equal(bankMultiplier('2026-08-31', 'Summer bank holiday', 1.75), 1.75)
  assert.equal(bankMultiplier('2026-08-31', 'Summer bank holiday', 1.5, { '2026-08-31': 2.5 }), 2.5)
  assert.equal(bankMultiplier('2026-08-31', 'Summer bank holiday', 1.37), 1.5, 'an odd value falls back to the default')
  // a booked bank holiday still counts only as the hours booked (nothing is deducted for the holiday itself)
  const b = balanceFor({ allowance: 100, unit: 'hours', days: [{ day: '2026-04-03', hours: 0 + 8 }], range: yearRange(2026), today: '2026-11-24' })
  assert.equal(b.taken, 8)
})

test('weeks are Monday to Sunday', () => {
  assert.equal(weekdayIndex('2026-11-23'), 0); assert.equal(weekStart('2026-11-29'), '2026-11-23'); assert.equal(weekStart('2026-11-30'), '2026-11-30')
  assert.equal(addDays('2026-12-30', 3), '2027-01-02')
  assert.match(ukToday(), /^\d{4}-\d{2}-\d{2}$/)
})

test('CSV import: header, UK dates, hours, and row by row errors', () => {
  const csv = 'email,date,hours,status\nann@x.org,04/03/2026,8,approved\n"Bo, B",2026-03-05,12\nnobody,2026-03-06,0\ncy@x.org,32/13/2026,8\ndee@x.org,2026-03-07,8,pending\n'
  const { rows, header } = parseImportCsv(csv)
  assert.equal(header, true); assert.equal(rows.length, 5)
  assert.deepEqual([rows[0].day, rows[0].hours, rows[0].error], ['2026-03-04', 8, null])
  assert.deepEqual([rows[1].who, rows[1].hours, rows[1].error], ['Bo, B', 12, null])
  assert.match(rows[2].error!, /Hours/); assert.match(rows[3].error!, /date/); assert.match(rows[4].error!, /approved/)
  assert.equal(parseDateCell('1/2/2026'), '2026-02-01')
  assert.equal(parseImportCsv('ann@x.org,2026-03-04,8').header, false)
})

test('the pilot switch: CS-1001 only unless the environment adds accounts', () => {
  assert.equal(isPilotAccount('CS-1001', ''), true); assert.equal(isPilotAccount('cs-1001', ''), true)
  assert.equal(isPilotAccount('CS-1002', ''), false); assert.equal(isPilotAccount(null, ''), false); assert.equal(isPilotAccount('', ''), false)
  assert.equal(isPilotAccount('CS-1009', 'CS-1009, cs-1010'), true); assert.equal(isPilotAccount('CS-1010', 'CS-1009, cs-1010'), true)
  assert.deepEqual(pilotAccounts(''), ['CS-1001'])
})
