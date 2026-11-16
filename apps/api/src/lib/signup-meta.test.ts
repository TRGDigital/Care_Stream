// Run: npx tsx src/lib/signup-meta.test.ts
import assert from 'node:assert/strict'
import { buildSignupMeta, describeCameFrom, cleanIp, accountTypeLabel, locationOf, requestOrigin } from './signup-meta'

const req = (o: any = {}) => ({ ip: '::ffff:81.2.69.142', headers: { 'x-vercel-ip-country': 'GB', 'x-vercel-ip-city': 'Bexley%20Heath', 'x-vercel-ip-country-region': 'ENG', 'user-agent': 'Mozilla/5.0', ...(o.headers ?? {}) }, ...o }) as any

assert.equal(cleanIp('::ffff:1.2.3.4'), '1.2.3.4')
assert.equal(cleanIp('2001:db8::1'), '2001:db8::1')
assert.equal(cleanIp(undefined), null)

const m = buildSignupMeta(req(), { source: 'blog-fire-safety-audit', growth_ref: null, attribution: { referrer: 'www.google.com/' } })
assert.equal(m.ip, '81.2.69.142')
assert.equal(locationOf(m), 'Bexley Heath, ENG, GB')
assert.equal(buildSignupMeta(req(), { attribution: { utm_source: 'x'.repeat(500) } }).utm_source!.length, 100)
assert.deepEqual(m.came_from, ['Blog post: fire-safety-audit', 'Arrived from: www.google.com/'].map((x) => x))

assert.deepEqual(describeCameFrom({ growth_ref: 'abc', utm_campaign: 'carestream_new_ab', source: null, gclid: false, referrer: null, course: null, landing: null, utm_source: 'growth', utm_medium: 'email' }), ['A CareStream outreach email (Growth), campaign carestream_new_ab'])
assert.deepEqual(describeCameFrom({ gclid: true, source: null, growth_ref: null, utm_source: 'google', utm_medium: 'cpc', utm_campaign: 'cpd', referrer: null, course: null, landing: null }), ['A Google Ads click', 'Campaign link: google / cpc / cpd'])
assert.deepEqual(describeCameFrom({ gclid: false, source: null, growth_ref: null, utm_source: null, utm_medium: null, utm_campaign: null, referrer: null, course: null, landing: null }), ['Direct visit, no referrer'])

assert.equal(accountTypeLabel('free'), 'Free')
assert.equal(accountTypeLabel('training_only'), 'Training only (pay per course)')
assert.equal(accountTypeLabel('full', 'Starter'), 'Paid plan: Starter (trial)')
assert.equal(accountTypeLabel('full'), 'Paid plan (trial)')

// a request with no geo headers and no attribution still works
const bare = buildSignupMeta({ ip: undefined, headers: {} } as any, {})
assert.equal(bare.ip, null); assert.equal(bare.country ?? null, null); assert.deepEqual(bare.came_from, ['Direct visit, no referrer'])
// last login origin
const o = requestOrigin(req())
assert.equal(o.ip, '81.2.69.142'); assert.equal(o.city, 'Bexley Heath'); assert.equal(o.country, 'GB'); assert.ok(o.at)
const none = requestOrigin({ ip: undefined, headers: {} } as any)
assert.equal(none.ip, null); assert.equal(none.user_agent, null)
console.log('signup-meta tests passed')
