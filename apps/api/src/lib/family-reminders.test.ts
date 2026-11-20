// Family reminder rules. Run with:  npx tsx src/lib/family-reminders.test.ts   (no database needed)

import assert from 'node:assert/strict'
import {
  nextDueDate, decide, alignToWeekday, addMonth, londonDay, signStopToken, verifyStopToken, MIN_GAP_DAYS, MAX_UNANSWERED, type Cadence,
} from './family-reminders-schedule'
import { reminderCopy, REMINDER_OFFERS_VIDEO } from './family-reminders-copy'

process.env.JWT_SECRET = 'test-secret'
let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok  ', name) }
const D = (s: string) => new Date(`${s}T00:00:00.000Z`)
const ymd = (d: Date | null) => (d ? d.toISOString().slice(0, 10) : null)

// 2026-11-23 is a Monday.
t('weekly, no weekday: a week after the last reminder', () => {
  assert.equal(ymd(nextDueDate({ cadence: 'weekly', lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-23') })), '2026-11-30')
})
t('fortnightly and monthly', () => {
  assert.equal(ymd(nextDueDate({ cadence: 'fortnightly', lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-23') })), '2026-12-07')
  assert.equal(ymd(nextDueDate({ cadence: 'monthly', lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-23') })), '2026-12-23')
})
t('monthly clamps to the end of a short month', () => {
  assert.equal(ymd(addMonth(D('2027-01-31'))), '2027-02-28')
  assert.equal(ymd(addMonth(D('2027-12-15'))), '2028-01-15')
})
t('preferred weekday: moves forward to that day, never back', () => {
  assert.equal(ymd(alignToWeekday(D('2026-11-30'), 3)), '2026-12-02')   // Monday to Wednesday
  assert.equal(ymd(alignToWeekday(D('2026-12-02'), 3)), '2026-12-02')   // already Wednesday
  assert.equal(ymd(alignToWeekday(D('2026-12-03'), 3)), '2026-12-09')   // Thursday to next Wednesday
  assert.equal(ymd(alignToWeekday(D('2026-12-03'), null)), '2026-12-03')
  const due = nextDueDate({ cadence: 'weekly', weekday: 0, lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-23') })
  assert.equal(due!.getUTCDay(), 0)
  assert.equal(ymd(due), '2026-12-06')   // Sunday on or after 30 Nov
})
t('off has no due date', () => {
  assert.equal(nextDueDate({ cadence: 'off', today: D('2026-11-23') }), null)
})
t('never sooner than tomorrow, even if the invite is old', () => {
  assert.equal(ymd(nextDueDate({ cadence: 'weekly', lastContact: D('2026-01-05'), today: D('2026-11-23') })), '2026-11-24')
})
t('first set up with no history: tomorrow, or the weekday after it', () => {
  assert.equal(ymd(nextDueDate({ cadence: 'weekly', today: D('2026-11-23') })), '2026-11-24')
  assert.equal(ymd(nextDueDate({ cadence: 'weekly', weekday: 5, today: D('2026-11-23') })), '2026-11-27')
})
t('a pause pushes the due date to the pause end (then the weekday)', () => {
  assert.equal(ymd(nextDueDate({ cadence: 'weekly', lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-24'), pausedUntil: D('2026-12-20') })), '2026-12-20')
  assert.equal(ymd(nextDueDate({ cadence: 'weekly', weekday: 1, lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-24'), pausedUntil: D('2026-12-20') })), '2026-12-21')
})
t('the 6 day minimum holds for every cadence and weekday', () => {
  for (const cadence of ['weekly', 'fortnightly', 'monthly'] as Cadence[]) {
    for (let wd = -1; wd <= 6; wd++) {
      for (let off = 0; off < 40; off++) {
        const last = new Date(D('2026-11-23').getTime() + off * 86400000)
        const due = nextDueDate({ cadence, weekday: wd < 0 ? null : wd, lastContact: last, lastReminder: last, today: last })!
        assert.ok((due.getTime() - last.getTime()) / 86400000 >= MIN_GAP_DAYS, `${cadence} wd=${wd} off=${off}`)
        if (wd >= 0) assert.equal(due.getUTCDay(), wd)
      }
    }
  }
})
t('changing weekday cannot bring the next reminder inside 6 days of the last', () => {
  const due = nextDueDate({ cadence: 'weekly', weekday: 2, lastContact: D('2026-11-23'), lastReminder: D('2026-11-23'), today: D('2026-11-24') })
  assert.ok(due! >= D('2026-11-29'))
})

const base = { cadence: 'weekly' as Cadence, nextDueAt: D('2026-11-30'), pausedUntil: null, lastSentAt: D('2026-11-23'), unanswered: 1, replied: false }
t('decide: sends when due and 6 days have passed', () => {
  assert.equal(decide({ ...base, today: D('2026-11-30') }).action, 'send')
  assert.equal(decide({ ...base, today: D('2026-12-04') }).action, 'send')
})
t('decide: waits before the due date', () => {
  assert.equal(decide({ ...base, today: D('2026-11-29') }).action, 'wait')
})
t('decide: never within 6 days of the last reminder, even if due', () => {
  assert.equal(decide({ ...base, nextDueAt: D('2026-11-25'), today: D('2026-11-28') }).action, 'wait')
  assert.equal(decide({ ...base, nextDueAt: D('2026-11-25'), today: D('2026-11-29') }).action, 'send')
})
t('decide: paused and off contacts are not sent to', () => {
  assert.equal(decide({ ...base, pausedUntil: D('2026-12-10'), today: D('2026-11-30') }).action, 'wait')
  assert.equal(decide({ ...base, pausedUntil: D('2026-11-30'), today: D('2026-11-30') }).action, 'send')   // pause ends that day
  assert.equal(decide({ ...base, cadence: 'off', today: D('2026-11-30') }).action, 'wait')
})
t('decide: three unanswered in a row stops sending', () => {
  assert.equal(MAX_UNANSWERED, 3)
  assert.equal(decide({ ...base, unanswered: 2, today: D('2026-11-30') }).action, 'send')
  assert.equal(decide({ ...base, unanswered: 3, today: D('2026-11-30') }).action, 'stalled')
})
t('decide: a reply resets the count and lets sending carry on', () => {
  const d = decide({ ...base, unanswered: 3, replied: true, today: D('2026-11-30') })
  assert.equal(d.unanswered, 0)
  assert.equal(d.action, 'send')
})
t('decide: a due date missing is worked out, not sent blind', () => {
  assert.equal(decide({ ...base, nextDueAt: null, today: D('2026-11-30') }).action, 'schedule')
})
t('unanswered counting over a run of reminders', () => {
  let count = 0
  const sent: number[] = []
  for (let week = 0; week < 6; week++) {
    const d = decide({ cadence: 'weekly', nextDueAt: D('2026-11-01'), pausedUntil: null, lastSentAt: week === 0 ? null : new Date(D('2026-11-01').getTime() - 7 * 86400000), unanswered: count, replied: false, today: D('2026-11-30') })
    if (d.action !== 'send') break
    count = d.unanswered + 1; sent.push(count)
  }
  assert.deepEqual(sent, [1, 2, 3])
})

t('London date: late evening in summer is the next UK day', () => {
  assert.equal(ymd(londonDay(new Date('2026-07-01T23:30:00Z'))), '2026-07-02')
  assert.equal(ymd(londonDay(new Date('2026-12-01T23:30:00Z'))), '2026-12-01')
})

t('stop token: round trip, tamper and wrong secret', () => {
  const tok = signStopToken('7b1f2c9e-aaaa-bbbb-cccc-1234567890ab')!
  assert.equal(verifyStopToken(tok), '7b1f2c9e-aaaa-bbbb-cccc-1234567890ab')
  assert.equal(verifyStopToken(tok.slice(0, -2) + 'xx'), null)
  assert.equal(verifyStopToken('other-id' + tok.slice(tok.indexOf('.'))), null)
  assert.equal(verifyStopToken(''), null)
  assert.equal(verifyStopToken('nodot'), null)
  process.env.JWT_SECRET = 'different'
  assert.equal(verifyStopToken(tok), null)
  process.env.JWT_SECRET = ''
  assert.equal(signStopToken('abc'), null)   // no secret: no email without a working stop link
  process.env.JWT_SECRET = 'test-secret'
})

t('email wording: video is mentioned only when switched on', () => {
  assert.equal(REMINDER_OFFERS_VIDEO, true)
  assert.ok(/short video message/.test(reminderCopy({ residentName: 'Tim', homeName: 'Ferndale', days: 14 }).intro))
  const off = reminderCopy({ residentName: 'Tim', homeName: 'Ferndale', days: 14 }, false)
  assert.ok(!/video/i.test(Object.values(off).join(' ')))
  assert.ok(/photo/.test(off.intro))
  const on = reminderCopy({ residentName: 'Tim', homeName: 'Ferndale', days: 14 }, true)
  assert.ok(/short video message/.test(on.intro))
})
t('email wording: names the home, resident and 14 days; no dashes, no banned words', () => {
  for (const v of [false, true]) {
    const c = reminderCopy({ residentName: 'Tim', homeName: 'Ferndale', days: 14 }, v)
    const all = Object.values(c).join(' ')
    assert.ok(all.includes('Ferndale') && all.includes('Tim') && all.includes('14 days'))
    assert.ok(!/[\u2013\u2014]/.test(all))
    assert.ok(!/whatsapp/i.test(all) && !/\bAI\b/.test(all))
    assert.equal(c.stop, 'Stop these reminders')
  }
})

console.log(`\n${n} passed`)
