import test from 'node:test'
import assert from 'node:assert/strict'
import { computeSuperUser, avgActivePerWeek, londonDay, type SuperUserFacts } from './super-user'

const DAY = 86_400_000
const now = new Date('2026-12-01T12:00:00Z')
const tagged = new Date(now.getTime() - 61 * DAY)               // window complete
const at = (daysAfterTag: number, h = 10) => new Date(tagged.getTime() + daysAfterTag * DAY + h * 3600_000)
const base = (o: Partial<SuperUserFacts> = {}): SuperUserFacts => ({
  now, taggedAt: tagged, consentAt: tagged, planActive: true, tenantCreatedAt: new Date(tagged.getTime() - 200 * DAY),
  person: { id: 'su', name: 'Sam', job_role: 'Senior Carer' },
  events: { chat: [], cqc: [], audit: [], policy: [], followup: [], login: [] },
  training: [], seconds: [],
  colleagues: { staff_total: 6, ever_logged_in: 4, first_login_after_tag: 1, events: [] }, ...o,
})
const col = (user: string, daysAfterTag: number) => ({ user_id: user, at: at(daysAfterTag), kind: 'chat' as const })

test('active days are distinct days, however many things happen on one day', () => {
  const r = computeSuperUser(base({ events: { chat: [at(1, 9), at(1, 10), at(1, 11), at(2)], cqc: [at(2, 12)], audit: [], policy: [], followup: [], login: [at(3)] } }))
  assert.equal(r.measures.active_days, 3)
  assert.equal(r.measures.chat.count, 4); assert.equal(r.measures.chat.days, 2)
})
test('chat is capped at 3 a day so ten questions in a minute do not score ten', () => {
  const r = computeSuperUser(base({ events: { chat: Array.from({ length: 10 }, (_, i) => at(1, 9 + i * 0.01)), cqc: [], audit: [], policy: [], followup: [], login: [] } }))
  assert.equal(r.measures.chat.count, 10); assert.equal(r.measures.chat.counted, 3)
})
test('only things inside the 60 days count', () => {
  const r = computeSuperUser(base({ events: { chat: [new Date(tagged.getTime() - DAY), at(5), at(61)], cqc: [], audit: [], policy: [], followup: [], login: [] } }))
  assert.equal(r.measures.chat.count, 1)
})
test('training: ad hoc, CPD and annual are separate, and only completed ones are passed', () => {
  const r = computeSuperUser(base({ training: [
    { kind: 'cpd', module: 'Moving and handling', started_at: at(3), completed_at: at(4) },
    { kind: 'adhoc', module: 'Dementia', started_at: at(6), completed_at: null },
    { kind: 'annual', module: 'Fire', started_at: at(7), completed_at: at(7) },
  ] }))
  assert.deepEqual(r.measures.training.cpd, { started: 1, completed: 1 })
  assert.deepEqual(r.measures.training.adhoc, { started: 1, completed: 0 })
  assert.equal(r.measures.training.passed_total, 2)
  assert.equal(r.measures.active_days, 4)   // days 3,4,6,7
})
test('minutes: total and per active day', () => {
  const day = (n: number) => at(n).toISOString().slice(0, 10)
  const r = computeSuperUser(base({ events: { chat: [at(1), at(2)], cqc: [], audit: [], policy: [], followup: [], login: [] }, seconds: [{ day: day(1), seconds: 1800 }, { day: day(2), seconds: 900 }] }))
  assert.equal(r.measures.minutes.total, 45); assert.equal(r.measures.minutes.per_active_day, 23); assert.equal(r.measures.minutes.days_recorded, 2)
})
test('colleagues: rising against the 30 days before the tag, shown as people per week', () => {
  const before = [{ user_id: 'a', at: new Date(tagged.getTime() - 10 * DAY), kind: 'chat' as const }]            // 1 person in the baseline
  const during = ['a', 'b', 'c', 'd'].flatMap(u => Array.from({ length: 8 }, (_, w) => ({ user_id: u, at: at(w * 7 + 1), kind: 'chat' as const })))
  const r = computeSuperUser(base({ colleagues: { staff_total: 6, ever_logged_in: 5, first_login_after_tag: 3, events: [...before, ...during] } }))
  assert.equal(r.colleagues.trend, 'rising'); assert.ok(r.colleagues.window_per_week > (r.colleagues.baseline_per_week ?? 0))
  assert.equal(r.colleagues.reached, 3); assert.equal(r.colleagues.pct_ever_logged_in, 83)
})
test('colleagues: a small service, one more person a week is a noticeable rise; no change is steady', () => {
  const baseline = Array.from({ length: 4 }, (_, w) => ({ user_id: 'a', at: new Date(tagged.getTime() - (w * 7 + 2) * DAY), kind: 'chat' as const }))
  const two = ['a', 'b'].flatMap(u => Array.from({ length: 8 }, (_, w) => ({ user_id: u, at: at(w * 7 + 1), kind: 'chat' as const })))
  assert.equal(computeSuperUser(base({ colleagues: { staff_total: 4, ever_logged_in: 3, first_login_after_tag: 1, events: [...baseline, ...two] } })).colleagues.trend, 'rising')
  const same = Array.from({ length: 8 }, (_, w) => ({ user_id: 'a', at: at(w * 7 + 1), kind: 'chat' as const }))
  assert.equal(computeSuperUser(base({ colleagues: { staff_total: 4, ever_logged_in: 3, first_login_after_tag: 0, events: [...baseline, ...same] } })).colleagues.trend, 'steady')
})
test('a new account with no baseline compares the first half of the window with the second', () => {
  const evs = [col('a', 3), ...['a', 'b', 'c'].flatMap(u => [col(u, 40), col(u, 47), col(u, 54)])]
  const r = computeSuperUser(base({ tenantCreatedAt: new Date(tagged.getTime() - 3 * DAY), colleagues: { staff_total: 4, ever_logged_in: 3, first_login_after_tag: 2, events: evs } }))
  assert.equal(r.colleagues.baseline_per_week, null); assert.equal(r.colleagues.trend, 'rising'); assert.match(r.colleagues.trend_note, /No earlier baseline/)
})
test('too early to call before two weeks', () => {
  const young = new Date(now.getTime() - 5 * DAY)
  const r = computeSuperUser(base({ taggedAt: young, consentAt: young, tenantCreatedAt: new Date(young.getTime() - 300 * DAY), colleagues: { staff_total: 4, ever_logged_in: 3, first_login_after_tag: 0, events: [{ user_id: 'a', at: new Date(young.getTime() - 5 * DAY), kind: 'chat' }] } }))
  assert.equal(r.colleagues.trend, 'too_early'); assert.equal(r.status, 'in_window'); assert.equal(r.window.left, 55)
})
test('status: awaiting consent, paused, in window, eligible, not met', () => {
  const good = (o: Partial<SuperUserFacts> = {}) => {
    const days = Array.from({ length: 22 }, (_, i) => at(i * 2 + 1))
    const before = [{ user_id: 'a', at: new Date(tagged.getTime() - 9 * DAY), kind: 'chat' as const }]
    const during = ['a', 'b', 'c'].flatMap(u => Array.from({ length: 8 }, (_, w) => ({ user_id: u, at: at(w * 7 + 2), kind: 'chat' as const })))
    return base({ events: { chat: days, cqc: [], audit: [], policy: [], followup: [], login: [] }, training: [{ kind: 'cpd', module: 'M', started_at: at(2), completed_at: at(3) }], colleagues: { staff_total: 5, ever_logged_in: 4, first_login_after_tag: 1, events: [...before, ...during] }, ...o })
  }
  assert.equal(computeSuperUser(good()).status, 'eligible')
  assert.equal(computeSuperUser(good({ consentAt: null })).status, 'awaiting_consent')
  assert.equal(computeSuperUser(good({ planActive: false })).status, 'paused')
  assert.equal(computeSuperUser(good({ training: [] })).status, 'not_met')
  assert.equal(computeSuperUser(good({ now: new Date(tagged.getTime() + 30 * DAY) })).status, 'in_window')
})
test('avgActivePerWeek counts different people per week, partial weeks included', () => {
  const from = new Date('2026-11-02T00:00:00Z'), to = new Date('2026-11-23T00:00:00Z')   // exactly 3 weeks
  const e = (u: string, d: number) => ({ user_id: u, at: new Date(from.getTime() + d * DAY) })
  assert.equal(avgActivePerWeek([e('a', 1), e('a', 2), e('b', 3), e('a', 9), e('c', 16)], from, to), 1.3)   // weeks: {a,b}=2, {a}=1, {c}=1 -> 4/3
  assert.equal(avgActivePerWeek([], from, to), 0)
})
test('londonDay uses the London calendar day', () => {
  assert.equal(londonDay(new Date('2026-06-30T23:30:00Z')), '2026-07-01')   // BST
  assert.equal(londonDay(new Date('2026-12-01T23:30:00Z')), '2026-12-01')
})

test('daily strip: one entry per day so far, active where they did something, with minutes', () => {
  const day = (n: number) => at(n).toISOString().slice(0, 10)
  const r = computeSuperUser(base({ now: new Date(tagged.getTime() + 4.5 * DAY), events: { chat: [at(1), at(3)], cqc: [], audit: [], policy: [], followup: [], login: [] }, seconds: [{ day: day(1), seconds: 600 }] }))
  assert.equal(r.daily.length, 5)                                  // days 0 to 4
  assert.deepEqual(r.daily.map(d => d.active), [false, true, false, true, false])
  assert.equal(r.daily[1].minutes, 10)
  assert.ok(computeSuperUser(base()).daily.length === 60)           // capped at the 60 days
})
