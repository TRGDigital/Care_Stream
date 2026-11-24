import test from 'node:test'
import assert from 'node:assert/strict'
import { describeDays, holidayHeadline, holidaySubject, holidayMessage, holidayCardHtml, holidayButton, niceDate } from '../services/email/holiday-content'

const base = { personName: 'Amira Khan', approverName: 'Sarah Jones', days: ['2026-12-21', '2026-12-22', '2026-12-23', '2026-12-28'], totalLabel: '32 hours' }

test('days read as runs, and the words carry no dashes', () => {
  assert.equal(niceDate('2026-12-21'), 'Mon 21 Dec')
  assert.match(describeDays(base.days), /^Mon 21 Dec to Wed 23 Dec, Mon 28 Dec/)
  assert.equal(describeDays([]), 'no days')
  for (const kind of ['requested', 'approved', 'rejected', 'edited', 'removed'] as const) {
    const i = { ...base, kind, note: 'Please check.' }
    const all = [holidayHeadline(i), holidaySubject(i), holidayCardHtml(i), holidayMessage(i).title, holidayMessage(i).body].join(' ')
    assert.ok(!/[–—]/.test(all), kind)
  }
})

test('every kind has its headline and subject, and requests go to the approvals page', () => {
  assert.match(holidayHeadline({ ...base, kind: 'requested' }), /Amira Khan has asked for holiday/)
  assert.match(holidayHeadline({ ...base, kind: 'removed' }), /Sarah Jones has removed your holiday/)
  assert.match(holidaySubject({ ...base, kind: 'rejected' }), /has been disapproved/)
  assert.equal(holidayButton('requested').path, '/holiday-requests'); assert.equal(holidayButton('approved').path, '/my-holidays')
})

test('the hub message for a removal says disapproved and carries the manager note; nothing in a note can become markup', () => {
  const m = holidayMessage({ ...base, kind: 'removed', note: 'Short staffed <b>that</b> day' })
  assert.match(m.title, /disapproved/); assert.match(m.body, /Note from Sarah Jones: Short staffed/)
  assert.ok(!holidayCardHtml({ ...base, kind: 'removed', note: '<script>x</script>' }).includes('<script>'))
  assert.ok(m.title.length <= 120)
})
