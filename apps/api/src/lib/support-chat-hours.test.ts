import test from 'node:test'
import assert from 'node:assert/strict'
import { withinSupportHours, supportOnline, stillWaiting, nextOpeningText, ukParts, closedMessage, bankHolidayName } from './support-chat-hours'
import { SUPPORT_BANK_HOLIDAYS } from '../data/support-chat-bank-holidays'

const at = (iso: string) => new Date(iso)

test('weekday hours: open from 09:00, closed from 17:00 (winter, UTC = UK)', () => {
  assert.equal(withinSupportHours(at('2026-11-24T08:59:00Z')), false)   // Tuesday
  assert.equal(withinSupportHours(at('2026-11-24T09:00:00Z')), true)
  assert.equal(withinSupportHours(at('2026-11-24T16:59:00Z')), true)
  assert.equal(withinSupportHours(at('2026-11-24T17:00:00Z')), false)
})
test('weekends are closed', () => {
  assert.equal(withinSupportHours(at('2026-11-28T11:00:00Z')), false)   // Saturday
  assert.equal(withinSupportHours(at('2026-11-29T11:00:00Z')), false)   // Sunday
})
test('summer time: 09:00 UK is 08:00 UTC', () => {
  assert.equal(withinSupportHours(at('2026-07-14T07:59:00Z')), false)
  assert.equal(withinSupportHours(at('2026-07-14T08:00:00Z')), true)
  assert.equal(withinSupportHours(at('2026-07-14T15:59:00Z')), true)
  assert.equal(withinSupportHours(at('2026-07-14T16:00:00Z')), false)
})
test('the day the clocks change (29 Mar 2026 is a Sunday; Monday 30 Mar is summer time)', () => {
  assert.equal(withinSupportHours(at('2026-03-30T08:00:00Z')), true)    // 09:00 BST
  assert.equal(withinSupportHours(at('2026-03-30T07:30:00Z')), false)   // 08:30 BST
  assert.deepEqual(ukParts(at('2026-10-25T00:30:00Z')), { weekday: 0, minutes: 90 })   // 01:30 BST, before the clocks go back
  assert.deepEqual(ukParts(at('2026-10-25T01:30:00Z')), { weekday: 0, minutes: 90 })   // 01:30 GMT, the same clock time an hour later
  assert.equal(withinSupportHours(at('2026-10-26T09:00:00Z')), true)    // Monday 09:00 GMT
})
test('next opening text', () => {
  assert.equal(nextOpeningText(at('2026-11-24T07:00:00Z')), 'today at 9am')
  assert.equal(nextOpeningText(at('2026-11-24T18:00:00Z')), 'tomorrow at 9am')
  assert.equal(nextOpeningText(at('2026-11-27T18:00:00Z')), 'Monday at 9am')   // Friday evening
  assert.equal(nextOpeningText(at('2026-11-28T10:00:00Z')), 'Monday at 9am')
})
test('online needs hours AND a recent heartbeat from someone who said they are online', () => {
  const now = at('2026-11-24T10:00:00Z')
  const seen = (s: number, online = true) => ({ online, last_seen_at: new Date(now.getTime() - s * 1000) })
  assert.equal(supportOnline([seen(30)], now), true)
  assert.equal(supportOnline([seen(90)], now), true)
  assert.equal(supportOnline([seen(91)], now), false)
  assert.equal(supportOnline([seen(10, false)], now), false)
  assert.equal(supportOnline([], now), false)
  assert.equal(supportOnline([seen(5)], at('2026-11-24T18:00:00Z')), false)   // after hours, even with a heartbeat
  assert.equal(supportOnline([seen(500), seen(20)], now), true)
})
test('still waiting after three minutes with no agent reply', () => {
  const now = at('2026-11-24T10:10:00Z')
  const chat = (o: any) => ({ mode: 'live', status: 'waiting', last_customer_message_at: at('2026-11-24T10:05:00Z'), last_agent_message_at: null, ...o })
  assert.equal(stillWaiting(chat({}), now), true)
  assert.equal(stillWaiting(chat({ last_customer_message_at: at('2026-11-24T10:08:00Z') }), now), false)
  assert.equal(stillWaiting(chat({ last_agent_message_at: at('2026-11-24T10:06:00Z') }), now), false)
  assert.equal(stillWaiting(chat({ mode: 'offline' }), now), false)
  assert.equal(stillWaiting(chat({ status: 'closed' }), now), false)
})

test('a bank holiday is closed all day and the day after is open again', () => {
  assert.equal(withinSupportHours(at('2026-12-25T10:00:00Z')), false)   // Christmas Day (a Friday)
  assert.equal(withinSupportHours(at('2026-12-28T10:00:00Z')), false)   // Boxing Day substitute (Monday)
  assert.equal(withinSupportHours(at('2026-12-29T10:00:00Z')), true)    // Tuesday after
  assert.equal(withinSupportHours(at('2026-08-31T10:00:00Z')), false)   // Summer bank holiday (BST)
  assert.equal(withinSupportHours(at('2026-09-01T08:00:00Z')), true)    // next day 09:00 BST
  assert.equal(bankHolidayName(at('2026-04-03T10:00:00Z')), 'Good Friday')
  assert.equal(bankHolidayName(at('2026-04-02T10:00:00Z')), null)
})
test('the bank holiday is judged by the UK date, not the UTC date', () => {
  // 23:30 UTC on 24 Aug 2026 is 00:30 BST on 25 Aug (a normal day); 23:30 UTC on 30 Aug 2026 is 00:30 BST on 31 Aug (bank holiday)
  assert.equal(bankHolidayName(at('2026-08-30T23:30:00Z')), 'Summer bank holiday')
})
test('closed messages: bank holiday, weekend, out of hours, and none when open', () => {
  const m = closedMessage(at('2026-12-25T10:00:00Z'))!
  assert.equal(m.reason, 'bank_holiday')
  assert.equal(m.text, 'We are closed today for the bank holiday (Christmas Day) and back Tuesday at 9am.')   // 26 Sat, 27 Sun, 28 Mon bank holiday, so Tuesday
  assert.equal(closedMessage(at('2026-04-03T10:00:00Z'))!.text, 'We are closed today for the bank holiday (Good Friday) and back Tuesday at 9am.')   // Easter Monday is also closed
  assert.equal(closedMessage(at('2026-05-04T10:00:00Z'))!.text, 'We are closed today for the bank holiday (Early May bank holiday) and back tomorrow at 9am.')
  assert.equal(closedMessage(at('2026-11-28T10:00:00Z'))!.reason, 'weekend')
  assert.equal(closedMessage(at('2026-11-24T18:00:00Z'))!.text, 'We are closed for now and back tomorrow at 9am.')
  assert.equal(closedMessage(at('2026-11-24T10:00:00Z')), null)
})
test('the day before a bank holiday weekend points past it', () => {
  assert.equal(nextOpeningText(at('2026-04-02T18:00:00Z')), 'Tuesday at 9am')   // Thursday evening: Good Friday, weekend, Easter Monday
})
test('the bank holiday list covers this year and next (add the next year each autumn)', () => {
  const have = new Set(Object.keys(SUPPORT_BANK_HOLIDAYS).map(k => k.slice(0, 4)))
  const y = new Date().getFullYear()
  assert.ok(have.has(String(y)) && have.has(String(y + 1)), `add ${y + 1} bank holidays to data/support-chat-bank-holidays.ts`)
})
