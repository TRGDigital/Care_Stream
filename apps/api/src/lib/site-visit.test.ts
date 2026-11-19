import test from 'node:test'
import assert from 'node:assert/strict'
import { cleanVisit, cleanPath } from './site-visit'

const ID = '3f2b8c1e-0a4d-4f6e-9a1b-2c3d4e5f6a7b'
const good = (o: any = {}) => ({ id: ID, visitor_id: 'v1', session_id: 's1', path: '/pricing?utm_source=x#top', page_type: 'pricing', referrer: 'https://www.google.com/search?q=care+home+software', device: 'desktop', is_return: true,
  started_at: new Date().toISOString(), active_seconds: 42, elapsed_seconds: 90, max_scroll_pct: 80, interactions: 3, clicks: [{ l: 'Book a demo', h: '/demo?x=1' }], conversions: ['demo_click', 'email_entered'], next_path: '/demo', ...o })
const UA = 'Mozilla/5.0 (Macintosh) AppleWebKit/537 Chrome/120 Safari/537'

test('a good visit is kept, with query strings and fragments removed and only the host of the referrer', () => {
  const v = cleanVisit(good(), UA)!
  assert.equal(v.path, '/pricing'); assert.equal(v.referrer, 'google.com'); assert.equal(v.next_path, '/demo')
  assert.deepEqual(v.clicks, [{ l: 'Book a demo', h: '/demo' }]); assert.deepEqual(v.conversions, ['demo_click', 'email_entered']); assert.equal(v.is_return, true)
})
test('bots, bad ids and non-public paths are dropped', () => {
  assert.equal(cleanVisit(good(), 'Googlebot/2.1 (+http://www.google.com/bot.html)'), null)
  assert.equal(cleanVisit(good(), 'Mozilla/5.0 HeadlessChrome/120'), null)
  assert.equal(cleanVisit(good({ id: 'not-a-uuid' }), UA), null)
  for (const p of ['/platform/clients', '/chat', '/dashboard', '/login', '/api/x', '/staff/abc', 'pricing', '', null]) assert.equal(cleanVisit(good({ path: p }), UA), null, String(p))
  assert.equal(cleanVisit(null, UA), null)
})
test('numbers are clamped, conversions must be on the list, clicks are capped and trimmed', () => {
  const v = cleanVisit(good({ active_seconds: 9e9, max_scroll_pct: 500, interactions: -4, conversions: ['demo_click', 'drop table', 'demo_click', 7], clicks: Array.from({ length: 60 }, (_, i) => ({ l: 'x'.repeat(200) + i, h: 'https://evil.example/path?secret=1' })) }), UA)!
  assert.equal(v.active_seconds, 4 * 3600); assert.equal(v.max_scroll_pct, 100); assert.equal(v.interactions, 0)
  assert.deepEqual(v.conversions, ['demo_click'])
  assert.equal(v.clicks.length, 25); assert.equal(v.clicks[0].l.length, 40); assert.equal(v.clicks[0].h, 'evil.example')   // external links keep only the host
})
test('mailto and tel links keep only the scheme, never the address or number', () => {
  const v = cleanVisit(good({ clicks: [{ l: 'Email us', h: 'mailto:someone@example.com' }, { l: 'Call', h: 'tel:+441234567890' }] }), UA)!
  assert.deepEqual(v.clicks.map(c => c.h), ['mailto:', 'tel:'])
})
test('an absurd start time falls back to now, and the device must be one of three', () => {
  const now = new Date('2026-11-19T17:00:00Z')
  assert.equal(cleanVisit(good({ started_at: '1999-01-01', device: 'toaster' }), UA, now)!.started_at.toISOString(), now.toISOString())
  assert.equal(cleanVisit(good({ device: 'toaster' }), UA)!.device, null)
})
test('cleanPath', () => {
  assert.equal(cleanPath('/features/super-user/?a=1'), '/features/super-user'); assert.equal(cleanPath('/'), '/'); assert.equal(cleanPath('//a//b'), '/a/b'); assert.equal(cleanPath('/Platform/x'), null)
})
