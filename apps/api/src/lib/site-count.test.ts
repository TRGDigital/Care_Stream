// The anonymous page counter keeps nothing that identifies a person, ignores bots and private areas, and the browser side stores nothing on the device.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { cleanCount } from './site-count'

const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')
const UA_DESK = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Safari/605.1.15'
const UA_PHONE = 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

test('COUNT: a page view becomes a path, a source and a device type, nothing else', () => {
  const c = cleanCount({ path: '/pricing?email=a@b.com#x', referrer: 'https://www.google.com/search?q=secret', utm_source: 'Google' }, UA_PHONE, new Date('2026-11-26T10:00:00Z'))
  assert.deepEqual(c, { day: '2026-11-26', path: '/pricing', source: 'google (campaign)', device: 'mobile' })
  assert.equal(cleanCount({ path: '/blog/x', referrer: 'https://www.google.com/search?q=secret' }, UA_DESK)!.source, 'google.com')   // host only, never the address
  assert.equal(cleanCount({ path: '/blog/x', referrer: 'https://www.carestreamai.com/' }, UA_DESK)!.source, 'direct')               // our own site is not a source
})

test('COUNT: bots, private areas and junk are dropped', () => {
  assert.equal(cleanCount({ path: '/' }, 'Googlebot/2.1'), null)
  assert.equal(cleanCount({ path: '/platform/site-activity' }, UA_DESK), null)
  assert.equal(cleanCount({ path: '/family/abc-secret-token' }, UA_DESK), null)
  assert.equal(cleanCount({ path: 'nope' }, UA_DESK), null)
  assert.equal(cleanCount(null, UA_DESK), null)
})

test('COUNT: the browser counter writes nothing to the device and is not behind the cookie choice', () => {
  const c = web('components/marketing/page-counter.tsx'), layout = web('app/layout.tsx')
  assert.doesNotMatch(c.replace(/\/\/.*$/gm, ''), /localStorage|sessionStorage|document\.cookie|indexedDB/)
  assert.match(layout, /<CookieConsent \/>[^]*?<PageCounter \/>[^]*?<VisitTracker \/>/)
  assert.doesNotMatch(c, /hasAnalyticsConsent/)
})
