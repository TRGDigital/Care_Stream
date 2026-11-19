import test from 'node:test'
import assert from 'node:assert/strict'
import { summariseSiteActivity, type VisitRow } from './site-activity'

const now = new Date('2026-11-19T17:00:00Z')
let n = 0
const v = (o: Partial<VisitRow> & { path: string }): VisitRow => ({ id: `id${++n}`, visitor_id: 'a', session_id: 's1', referrer: null, utm_source: null, device: 'desktop', is_return: false, started_at: new Date(now.getTime() - 3_600_000), active_seconds: 30, max_scroll_pct: 50, interactions: 1, clicks: [], conversions: [], next_path: null, ...o })

test('visitors, sessions, page views, averages and bounce', () => {
  const rows = [
    v({ path: '/', visitor_id: 'a', session_id: 's1', active_seconds: 40 }), v({ path: '/pricing', visitor_id: 'a', session_id: 's1', active_seconds: 80 }),
    v({ path: '/', visitor_id: 'b', session_id: 's2', active_seconds: 3, interactions: 0, max_scroll_pct: 10 }),   // a bounce
    v({ path: '/blog/x', visitor_id: 'c', session_id: 's3', active_seconds: 120, is_return: true }),
  ]
  const s = summariseSiteActivity(rows, now, 7)
  assert.equal(s.totals.visitors, 3); assert.equal(s.totals.sessions, 3); assert.equal(s.totals.page_views, 4)
  assert.equal(s.totals.avg_active_seconds, 61); assert.equal(s.totals.bounce_pct, 33); assert.equal(s.totals.returning_pct, 33); assert.equal(s.totals.pages_per_session, 1.3)
  assert.equal(s.pages[0].path, '/'); assert.equal(s.pages[0].views, 2); assert.equal(s.pages[0].visitors, 2)
})
test('the funnel counts distinct visitors who reached each step', () => {
  const rows = [
    v({ path: '/', visitor_id: 'a' }), v({ path: '/pricing', visitor_id: 'a', conversions: ['signup_click'] }), v({ path: '/register', visitor_id: 'a', conversions: ['email_entered', 'signup_submitted'] }),
    v({ path: '/pricing', visitor_id: 'b', session_id: 's2', conversions: ['demo_click'] }), v({ path: '/', visitor_id: 'c', session_id: 's3' }),
  ]
  const f = Object.fromEntries(summariseSiteActivity(rows, now).funnel.map(x => [x.key, x.visitors]))
  assert.deepEqual(f, { visited: 3, pricing: 2, signup_click: 1, email_entered: 1, signup_submitted: 1, demo_click: 1, demo_submitted: 0 })
})
test('clicks are grouped by label and link, pages by conversions, and sources fall back to Direct', () => {
  const rows = [
    v({ path: '/', clicks: [{ l: 'Book a demo', h: '/demo' }], conversions: ['demo_click'] }), v({ path: '/pricing', visitor_id: 'b', session_id: 's2', clicks: [{ l: 'Book a demo', h: '/demo' }, { l: 'Start free trial', h: '/register' }], referrer: 'google.com' }),
    v({ path: '/', visitor_id: 'c', session_id: 's3', utm_source: 'google_ads' }),
  ]
  const s = summariseSiteActivity(rows, now)
  assert.deepEqual(s.clicks[0], { label: 'Book a demo', href: '/demo', count: 2, pages: 2 })
  assert.equal(s.pages.find(p => p.path === '/')!.conversions, 1)
  assert.deepEqual(s.referrers.map(r => r.source).sort(), ['Direct', 'google.com', 'google_ads (campaign)'])
})
test('daily series covers every day asked for, and live counts the last 30 minutes', () => {
  const rows = [v({ path: '/', started_at: new Date(now.getTime() - 5 * 60_000), visitor_id: 'live' }), v({ path: '/', started_at: new Date(now.getTime() - 3 * 86_400_000), visitor_id: 'old', session_id: 's9' })]
  const s = summariseSiteActivity(rows, now, 7)
  assert.equal(s.daily.length, 7); assert.equal(s.live_visitors, 1); assert.equal(s.daily.reduce((n, d) => n + d.visitors, 0), 2)
})
test('recent journeys list pages in order with time spent', () => {
  const t0 = now.getTime()
  const rows = [v({ path: '/pricing', started_at: new Date(t0 - 60_000), active_seconds: 70 }), v({ path: '/', started_at: new Date(t0 - 120_000), active_seconds: 20 })]
  const r = summariseSiteActivity(rows, now).recent[0]
  assert.deepEqual(r.pages.map(p => p.path), ['/', '/pricing']); assert.equal(r.pages[1].active_seconds, 70)
})
