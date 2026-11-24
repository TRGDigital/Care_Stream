import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { balanceFor, yearRange, validateDays, halfShift, dayChoices, shiftHoursFor, valueOf, type DayRow, type OffRow } from './holiday-math'
import { availableIn, evaluateRequest, gate, reserve, cleanBlocked, dayList, type YearState, type Locker, type RuleIssue } from './holiday-rules'

const today = '2026-11-24'
const state = (o: Partial<YearState> = {}): YearState => ({ year: 2026, label: '2026', allowance_set: true, entitlement: 224, used: 219, pending: 0, future: false, ...o })
const base = (days: DayRow[], years: Record<number, YearState>, extra: Partial<Parameters<typeof evaluateRequest>[0]> = {}) =>
  evaluateRequest({ days, unit: 'hours', today, month: 1, day: 1, years, others: [], maxOff: null, blocked: [], carryOver: false, ...extra })
const d = (day: string, hours = 8, part?: 'am' | 'pm' | 'part'): DayRow => ({ day, hours, ...(part ? { part } : {}) })

test('what is available is the allowance minus approved, minus requests still waiting (pending hours are held back)', () => {
  assert.equal(availableIn(state()), 5)
  assert.equal(availableIn(state({ pending: 3 })), 2)
  assert.equal(availableIn(state({ pending: 9 })), 0, 'never below zero')
  // figures loaded from the spreadsheet count as used, just like approved days
  const b = balanceFor({ allowance: 224, unit: 'hours', days: [d('2026-03-02')], range: yearRange(2026), today, monthly: [{ key: '2026-04', taken: 80, booked: 12 }] })
  assert.equal(b.used, 100)
  assert.equal(availableIn(state({ entitlement: b.entitlement, used: b.used })), 124)
})

test('zero left refuses with the plain words, and too much says exactly how much can still be booked', () => {
  const zero = base([d('2026-12-01', 8)], { 2026: state({ used: 224 }) })
  assert.equal(zero.length, 1); assert.equal(zero[0].message, 'You have no holiday left to book.')
  const over = base([d('2026-12-01', 8), d('2026-12-02', 12)], { 2026: state() })
  assert.equal(over[0].code, 'balance'); assert.equal(over[0].message, 'You have 5 hours left. This request is 20 hours. Please shorten it.')
  assert.deepEqual(base([d('2026-12-01', 5)], { 2026: state() }), [], 'exactly what is left is fine')
  const held = base([d('2026-12-01', 5)], { 2026: state({ pending: 4 }) })
  assert.match(held[0].message, /You have 1 hour left\. This request is 5 hours/)
  assert.match(base([d('2026-12-01')], { 2026: state({ allowance_set: false, entitlement: 0, used: 0 }) })[0].message, /allowance has not been set up/)
})

test('a request across the holiday year is checked against each year on its own', () => {
  const years = { 2026: state({ used: 208 }), 2027: state({ year: 2027, label: '2027', entitlement: 224, used: 0, future: true }) }
  const ok = base([d('2026-12-30', 8), d('2026-12-31', 8), d('2027-01-04', 8)], years)
  assert.deepEqual(ok, [])
  const bad = base([d('2026-12-30', 8), d('2026-12-31', 8), d('2027-01-04', 8)], { ...years, 2026: state({ used: 220 }) })
  assert.equal(bad.length, 1); assert.match(bad[0].message, /You have 4 hours left for 2026\. This request is 16 hours/)
  const next = base([d('2027-02-01', 8)], { ...years, 2027: state({ year: 2027, label: '2027', entitlement: 224, used: 224, future: true }) }, { carryOver: true })
  assert.match(next[0].message, /no holiday left to book for 2027/); assert.match(next[0].message, /only your basic allowance counts; any holiday carried over is added at the year end/)
  const far = base([d('2028-02-01', 8)], years)
  assert.equal(far[0].code, 'too_far'); assert.equal(far[0].overridable, false); assert.match(far[0].message, /up to the end of 2027/)
})

test('part days: the morning or afternoon is half a shift to the nearest half hour, capped at what is left', () => {
  assert.equal(halfShift(8), 4); assert.equal(halfShift(12), 6); assert.equal(halfShift(7), 3.5); assert.equal(halfShift(9), 4.5); assert.equal(halfShift(1), 0.5)
  assert.equal(shiftHoursFor(40), 8); assert.equal(shiftHoursFor(null), 8)
  const c = dayChoices(12, 5)   // a 12 hour shift with 5 hours left
  assert.equal(c.full, 5); assert.equal(c.am, 5); assert.equal(c.pm, 5); assert.equal(c.last, 5)
  const roomy = dayChoices(12, 100)
  assert.equal(roomy.full, 12); assert.equal(roomy.am, 6); assert.equal(roomy.last, null, 'no last-hours option while a full shift fits')
  assert.equal(dayChoices(8, 2.4).last, 2.4, 'use my last 2.4 hours')
  assert.equal(dayChoices(8, null).am, 4, 'an approver has no cap')
  assert.equal(dayChoices(8, 0).full, 0)
})

test('part days are accepted with the right hours and refused otherwise; days-unit staff count AM, PM and part as half a day', () => {
  const ok = validateDays([{ day: '2026-12-01', hours: 6, part: 'am' }, { day: '2026-12-02', hours: 2.4, part: 'part' }, { day: '2026-12-03', hours: 12 }], { today })
  assert.ok(ok.ok); if (ok.ok) { assert.equal(ok.days[0].part, 'am'); assert.equal(ok.days[2].part, undefined); assert.equal(ok.total_hours, 20.4) }
  assert.equal(validateDays([{ day: '2026-12-01', hours: 6.25, part: 'pm' }], { today }).ok, false, 'a morning or afternoon is a whole or half hour')
  assert.equal(validateDays([{ day: '2026-12-01', hours: 14, part: 'part' }], { today }).ok, false)
  assert.equal(validateDays([{ day: '2026-12-01', hours: 0, part: 'part' }], { today }).ok, false)
  assert.equal(validateDays([{ day: '2026-12-01', hours: 7.5 }], { today }).ok, false, 'a full day stays whole hours')
  assert.equal(valueOf({ day: 'x', hours: 6, part: 'am' }, 'days'), 0.5); assert.equal(valueOf({ day: 'x', hours: 8 }, 'days'), 1); assert.equal(valueOf({ day: 'x', hours: 6, part: 'am' }, 'hours'), 6)
  const inDays = (used: number) => evaluateRequest({ days: [d('2026-12-01', 6, 'am'), d('2026-12-02', 8)], unit: 'days', today, month: 1, day: 1, years: { 2026: state({ entitlement: 28, used }) }, others: [], maxOff: null, blocked: [], carryOver: false })
  assert.deepEqual(inDays(26.5), [], 'half a day plus a whole day is 1.5 days, and 1.5 are left')
  assert.equal(inDays(27)[0].message, 'You have 1 day left. This request is 1.5 days. Please shorten it.')
})

test('people off on one day: approved and pending people count, each once, and the person asking is not counted', () => {
  const others: OffRow[] = [
    { day: '2026-12-01', user_id: 'a', name: 'A', status: 'approved', hours: 8 }, { day: '2026-12-01', user_id: 'b', name: 'B', status: 'pending', hours: 8 },
    { day: '2026-12-01', user_id: 'b', name: 'B', status: 'pending', hours: 8 }, { day: '2026-12-02', user_id: 'a', name: 'A', status: 'approved', hours: 8 },
  ]
  const r = base([d('2026-12-01', 1), d('2026-12-02', 1)], { 2026: state({ used: 0 }) }, { others, maxOff: 2 })
  assert.equal(r.length, 1); assert.equal(r[0].code, 'max_off'); assert.match(r[0].message, /Too many people are already off on 1 December 2026\./)
  assert.deepEqual(base([d('2026-12-01', 1)], { 2026: state({ used: 0 }) }, { others, maxOff: null }), [])
})

test('blocked dates stop a request and name the dates and the reason; the list is cleaned', () => {
  const blocked = cleanBlocked([{ from: '2026-12-24', to: '2027-01-02', reason: 'Christmas week' }, { from: 'bad', to: '2026-01-01' }, { from: '2026-05-05', to: '2026-05-01', reason: 'backwards' }, { from: '2026-08-10', reason: '' }])
  assert.equal(blocked.length, 2); assert.equal(blocked[1].reason, 'Christmas week'); assert.equal(blocked[0].to, '2026-08-10'); assert.equal(blocked[0].reason, 'Not available for holiday')
  const r = base([d('2026-12-23', 1), d('2026-12-24', 1), d('2026-12-25', 1)], { 2026: state({ used: 0 }) }, { blocked })
  assert.equal(r.length, 1); assert.equal(r[0].code, 'blocked'); assert.equal(r[0].message, 'You cannot book holiday on 24 Dec to 25 Dec: Christmas week')
  assert.equal(dayList(['2026-03-03', '2026-03-04', '2026-03-09']), '3 Mar to 4 Mar, 9 Mar')
})

test('staff can never go over; an approver can only with the override ticked and a reason; booking beyond next year is refused for everyone', () => {
  const iss: RuleIssue[] = [{ code: 'balance', overridable: true, message: 'x' }]
  assert.equal(gate([], { approver: false, override: false, note: null }).ok, true)
  assert.equal(gate(iss, { approver: false, override: true, note: 'please' }).ok, false, 'staff cannot override')
  const noTick = gate(iss, { approver: true, override: false, note: 'reason' }); assert.equal(noTick.ok, false); if (!noTick.ok) { assert.equal(noTick.reason, 'rules'); assert.equal(noTick.canOverride, true) }
  const noNote = gate(iss, { approver: true, override: true, note: '  ' }); assert.equal(noNote.ok, false); if (!noNote.ok) assert.equal(noNote.reason, 'needs_note')
  const fine = gate(iss, { approver: true, override: true, note: 'Agreed for a family event' }); assert.equal(fine.ok, true); if (fine.ok) { assert.equal(fine.override, true); assert.equal(fine.overBalance, true) }
  const maxOnly = gate([{ code: 'max_off', overridable: true, message: 'y' }], { approver: true, override: true, note: 'cover arranged' }); assert.equal(maxOnly.ok, true); if (maxOnly.ok) assert.equal(maxOnly.overBalance, false, 'only a balance exception is an over allowance booking')
  const far = gate([{ code: 'too_far', overridable: false, message: 'z' }], { approver: true, override: true, note: 'a reason' }); assert.equal(far.ok, false); if (!far.ok) { assert.equal(far.reason, 'refused'); assert.equal(far.canOverride, false) }
})

// ── Two requests at the same moment ─────────────────────────────────────────────────────────
// An in memory person with 8 hours left and a lock that works like the database one (one holder at a time for a key, others wait their turn).
function makeStore() {
  const rows: Array<{ id: number; hours: number }> = []
  const chains = new Map<string, Promise<unknown>>()
  const locker: Locker = { lock: (key, fn) => { const prev = chains.get(key) ?? Promise.resolve(); const run = prev.then(fn, fn); chains.set(key, run.catch(() => undefined)); return run as Promise<any> } }
  const tick = () => new Promise(r => setTimeout(r, 5))   // time for the other request to get in between the check and the write
  const check = (hours: number) => async (): Promise<RuleIssue[]> => { await tick(); const used = rows.reduce((s, r) => s + r.hours, 0); return used + hours > 8 ? [{ code: 'balance', overridable: true, message: 'over' }] : [] }
  const write = (hours: number) => async () => { await tick(); rows.push({ id: rows.length + 1, hours }); return rows.length }
  return { rows, locker, check, write }
}
test('two requests sent together cannot both pass: the check and the save sit inside one lock for the person', async () => {
  const s = makeStore()
  const who = { approver: false, override: false, note: null }
  const [a, b] = await Promise.all([reserve(s.locker, 'u1', s.check(6), who, s.write(6)), reserve(s.locker, 'u1', s.check(6), who, s.write(6))])
  assert.equal([a, b].filter(x => x.ok).length, 1, 'exactly one request is accepted')
  assert.equal(s.rows.reduce((t, r) => t + r.hours, 0), 6, 'the allowance is never overspent')
  // different people do not wait for each other
  const t = makeStore()
  const [c, e] = await Promise.all([reserve(t.locker, 'u1', t.check(6), who, t.write(6)), reserve(t.locker, 'u2', async () => [], who, async () => 'ok')])
  assert.ok(c.ok && e.ok)
})
test('without the lock the same two requests DO both pass (this is the race the lock prevents)', async () => {
  const s = makeStore()
  const naive: Locker = { lock: (_k, fn) => fn() }
  const who = { approver: false, override: false, note: null }
  const [a, b] = await Promise.all([reserve(naive, 'u1', s.check(6), who, s.write(6)), reserve(naive, 'u1', s.check(6), who, s.write(6))])
  assert.equal([a, b].filter(x => x.ok).length, 2)
})

// ── What the routes do (source level, like the other holiday route tests) ───────────────────
const routes = fs.readFileSync(path.resolve(__dirname, '../routes/holiday.ts'), 'utf8')
const data = fs.readFileSync(path.resolve(__dirname, './holiday-data.ts'), 'utf8')
test('a staff request is checked under the person lock and can never be an override; approving and editing re-check; booking for someone is open to deciders and admins', () => {
  const create = routes.slice(routes.indexOf("holidayRouter.post('/requests',"), routes.indexOf("holidayRouter.post('/requests/:id/cancel'"))
  assert.match(create, /reserve\(locker, userId,/); assert.match(create, /approver: false, override: false/)
  const decision = routes.slice(routes.indexOf("holidayRouter.post('/requests/:id/decision'"), routes.indexOf("holidayRouter.patch('/requests/:id'"))
  assert.match(decision, /AGAIN/); assert.match(decision, /approver: true, override: ov\.override/); assert.match(decision, /excluding|issuesFor\(tenantId, person, days, settings, r\.id\)/)
  const edit = routes.slice(routes.indexOf("holidayRouter.patch('/requests/:id'"), routes.indexOf("holidayRouter.post('/requests/:id/remove'"))
  assert.match(edit, /reserve\(locker, r\.user_id/); assert.match(edit, /issuesFor\(tenantId, person, v\.days, settings, r\.id\)/)
  assert.match(routes, /holidayAdminRouter\.post\('\/book', bookForSomeone\)/); assert.match(routes, /holidayRouter\.post\('\/book', requireDecider, bookForSomeone\)/)
  assert.match(routes, /holidayRouter\.post\('\/requests\/check'/)
})
test('rejected and cancelled requests free their hours: only approved and pending days are ever counted', () => {
  assert.match(data, /status: 'approved', day: \{ gte/); assert.match(data, /status: 'pending', day: \{ gte/)
  assert.doesNotMatch(data.slice(data.indexOf('export async function approvedDays'), data.indexOf('export async function monthTotals')), /'rejected'|'cancelled'/)
})
test('the exception line goes only to a person whose approved or edited booking was over their allowance, and the flags are only saved with an override', () => {
  assert.match(routes, /if \(o\.exception && \(o\.kind === 'approved' \|\| o\.kind === 'edited'\)\)/)
  assert.match(routes, /if \(g\.override\) await saveOver\(r\.id, g\.overBalance, ov\.note\)/)
  assert.match(data, /part <> 'full'/)   // new columns are read with plain SQL that tolerates the column not being there yet
  assert.match(data, /catch \{ return \[\] \}/)
})
