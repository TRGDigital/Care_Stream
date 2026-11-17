// Incentive rules. Run with:  npx tsx src/services/incentives/logic.test.ts   (no database needed)
import assert from 'node:assert/strict'
import { periodFor, applyCaps, reachedAt, rankClaims, pct, currentMonth, EVENTS, EVENT_KEYS } from './logic'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok  ', name) }
const d = (s: string) => new Date(s)

t('a month runs from its first to its last moment', () => {
  const p = periodFor('2026-11')!
  assert.equal(p.start.toISOString(), '2026-11-01T00:00:00.000Z')
  assert.equal(p.end.toISOString(), '2026-11-30T23:59:59.999Z')
  assert.equal(periodFor('2026-12')!.end.toISOString(), '2026-12-31T23:59:59.999Z')
  assert.equal(periodFor('2026-13'), null)
  assert.equal(periodFor('nope'), null)
  assert.equal(currentMonth(d('2026-11-17T10:00:00Z')), '2026-11')
})

t('events have wording, points and no dashes', () => {
  assert.equal(EVENTS.length, 5)
  for (const e of EVENTS) { assert.ok(e.label && e.help && e.suggested_points > 0); assert.ok(!/[–—]/.test(e.label + e.help)); assert.ok(EVENT_KEYS.has(e.key)) }
})

t('a cap keeps the earliest events and ignores the rest', () => {
  const ev = ['a', 'b', 'c', 'd'].map((s, i) => ({ user_id: 'u1', rule_id: 'r1', source_id: s, occurred_at: d(`2026-11-0${i + 1}T09:00:00Z`) }))
  const kept = applyCaps(ev, new Map([['r1', 2]]))
  assert.deepEqual(kept.map(e => e.source_id), ['a', 'b'])
  assert.equal(applyCaps(ev, new Map([['r1', null]])).length, 4)
  // a cap is per person
  const two = [...ev, { user_id: 'u2', rule_id: 'r1', source_id: 'x', occurred_at: d('2026-11-09T09:00:00Z') }]
  assert.equal(applyCaps(two, new Map([['r1', 2]])).filter(e => e.user_id === 'u2').length, 1)
})

t('the reach time is the entry that took the running total over the target', () => {
  const e = [{ occurred_at: d('2026-11-03T10:00:00Z'), points: 10 }, { occurred_at: d('2026-11-01T10:00:00Z'), points: 10 }, { occurred_at: d('2026-11-05T10:00:00Z'), points: 10 }]
  assert.equal(reachedAt(e, 20)!.toISOString(), '2026-11-03T10:00:00.000Z')
  assert.equal(reachedAt(e, 30)!.toISOString(), '2026-11-05T10:00:00.000Z')
  assert.equal(reachedAt(e, 31), null)
  assert.equal(reachedAt(e, 0), null)
})

t('limited rewards: the earliest people get the places, the rest are outside', () => {
  const r = rankClaims([
    { user_id: 'c', reached_at: d('2026-11-09T12:00:00Z') },
    { user_id: 'a', reached_at: d('2026-11-02T08:00:00Z') },
    { user_id: 'b', reached_at: d('2026-11-05T08:00:00Z') },
  ], 2)
  assert.deepEqual(r.map(x => [x.user_id, x.rank, x.within]), [['a', 1, true], ['b', 2, true], ['c', 3, false]])
  assert.ok(r.every(x => !x.tied))
})

t('unlimited rewards: everyone who qualifies is inside', () => {
  const r = rankClaims([{ user_id: 'a', reached_at: d('2026-11-02T08:00:00Z') }, { user_id: 'b', reached_at: d('2026-11-03T08:00:00Z') }], null)
  assert.ok(r.every(x => x.within))
})

t('a tie at the cut off is flagged for the care manager', () => {
  const r = rankClaims([
    { user_id: 'a', reached_at: d('2026-11-02T08:00:00Z') },
    { user_id: 'b', reached_at: d('2026-11-05T08:00:00.200Z') },
    { user_id: 'c', reached_at: d('2026-11-05T08:00:00.800Z') },
  ], 2)
  assert.deepEqual(r.map(x => x.tied), [false, true, true])
  const noTie = rankClaims([{ user_id: 'a', reached_at: d('2026-11-02T08:00:00Z') }, { user_id: 'b', reached_at: d('2026-11-05T08:00:00Z') }, { user_id: 'c', reached_at: d('2026-11-05T08:00:05Z') }], 2)
  assert.ok(noTie.every(x => !x.tied))
})

t('progress percentage is clamped', () => {
  assert.equal(pct(5, 20), 25); assert.equal(pct(50, 20), 100); assert.equal(pct(-1, 20), 0); assert.equal(pct(5, 0), 0)
})
console.log(`\n${n} groups passed`)

// earnedAt: points follow a passed assessment and any practical sign off
{
  const { earnedAt } = require('./logic')
  const d = (s: string) => new Date(s)
  const q = [{ id: 'a' }, { id: 'b' }, { id: 'c' }, { id: 'd' }, { id: 'e' }]
  const ans = (n: number) => q.map((x, i) => ({ question_id: x.id, is_correct: i < n }))
  const base = { completed_at: d('2026-11-10T10:00:00Z'), practical_signed: false, practical_signed_at: null, questions: q, pass_mark: 80, requires_practical: false }
  const assert = require('node:assert')
  assert.equal(earnedAt({ ...base, answers: ans(5) })?.toISOString(), '2026-11-10T10:00:00.000Z')   // 100 percent
  assert.equal(earnedAt({ ...base, answers: ans(4) })?.toISOString(), '2026-11-10T10:00:00.000Z')   // 80 percent meets the mark
  assert.equal(earnedAt({ ...base, answers: ans(3) }), null)                                          // 60 percent: no points
  assert.equal(earnedAt({ ...base, questions: [], answers: [] })?.toISOString(), '2026-11-10T10:00:00.000Z') // lesson only
  assert.equal(earnedAt({ ...base, answers: ans(5), requires_practical: true }), null)                // practical not signed
  assert.equal(earnedAt({ ...base, answers: ans(5), requires_practical: true, practical_signed: true, practical_signed_at: d('2026-11-12T09:00:00Z') })?.toISOString(), '2026-11-12T09:00:00.000Z')
  assert.equal(earnedAt({ ...base, completed_at: null, answers: ans(5) }), null)
  console.log('earnedAt ok')
}
