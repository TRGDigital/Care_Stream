// Run: npx tsx src/services/training/weeklyReminderLogic.test.ts
import assert from 'node:assert/strict'
import { planTenant, rankOutstanding, hubLinks, londonWeekStart, weeksWithoutActivity, STALLED_AFTER_WEEKS, MAX_LISTED, type UserFacts, type TenantFacts, type OutstandingItem } from './weeklyReminderLogic'

const now = new Date('2026-11-23T09:30:00Z')            // a Monday
const day = 86_400_000
const ago = (d: number) => new Date(now.getTime() - d * day)
const item = (name: string, o: Partial<OutstandingItem> = {}): OutstandingItem => ({ module_name: name, category: 'statutory', source: 'manual', status: 'not_started', due_date: null, ...o })
const user = (id: string, o: Partial<UserFacts> = {}): UserFacts => ({ id, name: `User ${id}`, email: `${id}@oak.co.uk`, role: 'staff', is_active: true, is_reviewer: false, is_agency: false, agency_end: null, first_login_at: ago(30), last_login_at: ago(2), items: [item('Fire Safety')], assigned_total: 5, completed_total: 4, completed_7d: 0, last_completed_at: null, sent_weekly: [], ...o })
const tenant = (users: UserFacts[], o: Partial<TenantFacts> = {}): TenantFacts => ({ id: 't1', name: 'Oak House', reminders_enabled: true, users, ...o })
const BASE = 'https://www.carestreamai.com'

// ---- week start (Europe/London)
assert.equal(londonWeekStart(new Date('2026-11-23T09:30:00Z')), '2026-11-23')   // Monday
assert.equal(londonWeekStart(new Date('2026-11-29T23:30:00Z')), '2026-11-23')   // Sunday night
assert.equal(londonWeekStart(new Date('2026-07-06T23:30:00Z')), '2026-07-06')   // BST: 00:30 Tuesday 7 July in London, still the week that started Monday 6 July
assert.equal(londonWeekStart(new Date('2026-07-05T23:30:00Z')), '2026-07-06')   // BST: Sunday 23:30 UTC is already 00:30 Monday in London, so a new week

// ---- ranking: overdue, then soonest due, then started, then statutory, then name
const ranked = rankOutstanding([
  item('Zeta'), item('Alpha', { category: 'specialist' }), item('Started', { status: 'in_progress' }),
  item('Due later', { due_date: ago(-10) }), item('Due soon', { due_date: ago(-2) }), item('Overdue', { due_date: ago(3) }),
], now).map((i) => i.module_name)
assert.deepEqual(ranked, ['Overdue', 'Due soon', 'Due later', 'Started', 'Zeta', 'Alpha'])

// ---- hub links: annual and ordinary training go to different hub sections
assert.deepEqual(hubLinks([item('A'), item('B', { source: 'ai_generated' }), item('C', { source: 'ai_generated' })], BASE + '/'), { annual: { url: `${BASE}/chat?view=annual`, count: 2 }, training: { url: `${BASE}/chat?view=training`, count: 1 } })
assert.deepEqual(hubLinks([item('A')], BASE), { training: { url: `${BASE}/chat?view=training`, count: 1 } })

// ---- Anusha's case: 47 outstanding, no due dates, one course done, signed in once
const many = Array.from({ length: 47 }, (_, i) => item(`Module ${String(i).padStart(2, '0')}`))
let p = planTenant(tenant([user('admin', { role: 'admin', items: [] }), user('anusha', { items: many, assigned_total: 48, completed_total: 1, first_login_at: ago(20), last_login_at: ago(20) })]), BASE, now)
assert.equal(p.staff.length, 1); assert.equal(p.staff[0].outstanding, 47); assert.equal(p.staff[0].listed.length, MAX_LISTED); assert.equal(p.staff[0].more, 47 - MAX_LISTED)
assert.equal(p.staff[0].never_signed_in, false); assert.equal(p.staff[0].first_name, 'User')
assert.equal(p.digests.length, 1); assert.equal(p.digests[0].summary.outstanding_total, 47); assert.equal(p.digests[0].top[0].name, 'User anusha')

// ---- nothing outstanding: no staff email, no digest
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('b', { items: [] })]), BASE, now)
assert.equal(p.staff.length, 0); assert.equal(p.digests.length, 0)

// ---- exclusions
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('gone', { is_active: false }), user('rev', { is_reviewer: true }), user('noemail', { email: null }), user('agency', { is_agency: true, agency_end: ago(1) }), user('ok')]), BASE, now)
assert.deepEqual(p.staff.map((s) => s.user_id), ['ok'])
assert.equal(p.skipped.filter((s) => ['gone', 'rev', 'noemail', 'agency'].includes(s.user_id)).length, 4)
// agency worker whose access is still running is included
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('ag', { is_agency: true, agency_end: ago(-5) })]), BASE, now)
assert.deepEqual(p.staff.map((s) => s.user_id), ['ag'])

// ---- account switched off
p = planTenant(tenant([user('a', { role: 'admin' }), user('b')], { reminders_enabled: false }), BASE, now)
assert.equal(p.staff.length + p.digests.length, 0)

// ---- admin who is also on the team: no separate staff email; their own training is in the digest
p = planTenant(tenant([user('boss', { role: 'admin', items: [item('Own thing')] }), user('b')]), BASE, now)
assert.deepEqual(p.staff.map((s) => s.user_id), ['b']); assert.equal(p.digests.length, 1); assert.equal(p.digests[0].own?.outstanding, 1)
// two admins both get the digest
p = planTenant(tenant([user('a1', { role: 'admin', items: [] }), user('a2', { role: 'admin', items: [] }), user('b')]), BASE, now)
assert.deepEqual(p.digests.map((d) => d.user_id).sort(), ['a1', 'a2'])

// ---- a single user (admin on their own, or a private learner): personal reminder, no digest
p = planTenant(tenant([user('solo', { role: 'admin', items: [item('X'), item('Y')] })]), BASE, now)
assert.equal(p.staff.length, 1); assert.equal(p.digests.length, 0); assert.equal(p.staff[0].outstanding, 2)

// ---- never signed in is flagged, to the staff member's link logic and to the admin
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('new', { first_login_at: null, last_login_at: null, items: [item('Induction'), item('Fire')] })]), BASE, now)
assert.equal(p.staff[0].never_signed_in, true); assert.deepEqual(p.digests[0].never_signed_in, [{ name: 'User new', email: 'new@oak.co.uk', outstanding: 2 }])

// ---- the nag limit: six reminders with no activity pauses the person and tells the admin
const sent = (n: number) => Array.from({ length: n }, (_, i) => ago(7 * (i + 1)))
assert.equal(weeksWithoutActivity(user('x', { last_login_at: ago(100), sent_weekly: sent(5) })), 5)
assert.equal(weeksWithoutActivity(user('x', { last_login_at: ago(10), sent_weekly: sent(5) })), 1)    // only the one sent after they last signed in counts
assert.equal(weeksWithoutActivity(user('x', { last_login_at: null, first_login_at: null, sent_weekly: sent(3) })), 3)
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('quiet', { last_login_at: ago(90), first_login_at: ago(95), sent_weekly: sent(STALLED_AFTER_WEEKS) })]), BASE, now)
assert.equal(p.staff.length, 0); assert.ok(p.skipped.some((s) => /paused after 6 weeks/.test(s.reason)))
assert.deepEqual(p.digests[0].stalled, [{ name: 'User quiet', weeks: 6, outstanding: 1 }])
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('back', { last_login_at: ago(1), sent_weekly: sent(STALLED_AFTER_WEEKS) })]), BASE, now)   // they came back: emailed again
assert.equal(p.staff.length, 1); assert.deepEqual(p.digests[0].stalled, [])
// completing a course also counts as activity
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('worker', { last_login_at: ago(90), last_completed_at: ago(3), sent_weekly: sent(STALLED_AFTER_WEEKS) })]), BASE, now)
assert.equal(p.staff.length, 1)

// ---- overdue counted when due dates exist
p = planTenant(tenant([user('a', { role: 'admin', items: [] }), user('b', { items: [item('Late', { due_date: ago(2) }), item('Fine', { due_date: ago(-5) })] })]), BASE, now)
assert.equal(p.staff[0].overdue, 1); assert.equal(p.digests[0].summary.overdue_total, 1)
console.log('weekly reminder logic tests passed')
