// Run: npx tsx src/lib/signup-meta.test.ts
import assert from 'node:assert/strict'
import { buildSignupMeta, describeCameFrom, cleanIp, accountTypeLabel, locationOf, requestOrigin, cleanVisit, humanDuration, contextLines, languageOf } from './signup-meta'

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
// silent context
const now = new Date('2026-11-20T12:00:00Z')
assert.equal(languageOf({ headers: { 'accept-language': 'en-GB,en;q=0.9' } } as any), 'en-GB')
assert.equal(languageOf({ headers: { 'accept-language': '<script>' } } as any), null)
assert.equal(languageOf({ headers: {} } as any), null)
let v = cleanVisit({ first_at: '2026-11-17T08:00:00Z', first_landing: '/blog/fire-safety', visits: 3 }, now)
assert.equal(v.visits, 3); assert.equal(v.first_landing, '/blog/fire-safety'); assert.equal(v.seconds_to_signup, 3 * 86400 + 4 * 3600)
v = cleanVisit({ first_at: '2030-01-01T00:00:00Z', visits: 0, first_landing: 'evil' }, now)       // future date, bad count, not a path
assert.deepEqual(v, { first_visit_at: null, first_landing: null, visits: null, seconds_to_signup: null })
v = cleanVisit({ first_at: '2020-01-01T00:00:00Z', visits: 5 }, now); assert.equal(v.first_visit_at, null)   // more than two years ago
assert.equal(humanDuration(60), 'in the same visit'); assert.equal(humanDuration(3 * 3600), '3 hours'); assert.equal(humanDuration(3 * 86400 + 4 * 3600), '3 days 4 hours'); assert.equal(humanDuration(86400), '1 day')
const withVisit = buildSignupMeta(req({ headers: { 'accept-language': 'en-GB' } }), { attribution: { timezone: 'Europe/London', visit: { first_at: new Date(Date.now() - 2 * 86400_000).toISOString(), first_landing: '/pricing', visits: 4 } } })
assert.equal(withVisit.language, 'en-GB'); assert.equal(withVisit.timezone, 'Europe/London'); assert.equal(withVisit.visits, 4); assert.equal(withVisit.first_landing, '/pricing'); assert.ok(withVisit.seconds_to_signup! >= 2 * 86400 - 5)
assert.equal(buildSignupMeta(req(), { attribution: { timezone: '../../etc' } }).timezone, null)
// no cookies accepted: only the language, nothing else
const declined = buildSignupMeta(req({ headers: { 'accept-language': 'cy-GB' } }), { attribution: { referrer: 'x.com/' } })
assert.equal(declined.language, 'cy-GB'); assert.equal(declined.timezone, null); assert.equal(declined.visits ?? null, null); assert.equal(declined.seconds_to_signup ?? null, null)
assert.deepEqual(contextLines(declined), [['Browser language', 'cy-GB']])
assert.deepEqual(contextLines({ language: 'en-GB', timezone: 'Europe/London', first_landing: '/pricing', visits: 1, seconds_to_signup: 600 }).map(([k]) => k), ['Browser language', 'Timezone', 'First page they landed on', 'Visits before sign up', 'First visit to sign up'])
console.log('signup-meta tests passed')
