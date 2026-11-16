// Run: npx tsx src/lib/client-origin.test.ts
import assert from 'node:assert/strict'
import { clientOrigin, isTrustedForward, describeDevice, cleanIp } from './client-origin'
import { requestOrigin } from './signup-meta'

const req = (headers: Record<string, string>, ip = '76.76.21.9'): any => ({ ip, headers })
const SECRET = 'a'.repeat(48)
const env = { CS_FORWARD_SECRET: SECRET }
const fwd = (extra: Record<string, string> = {}) => req({
  'x-cs-forward-secret': SECRET, 'x-cs-client-ip': '81.2.69.142', 'x-cs-client-country': 'GB', 'x-cs-client-region': 'ENG', 'x-cs-client-city': 'Bexley%20Heath',
  'x-cs-client-ua': 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 Chrome/126.0 Mobile Safari/537.36', ...extra,
})

// the website's forwarded values are believed ONLY with the right secret
let o = clientOrigin(fwd(), env)
assert.equal(o.ip, '81.2.69.142'); assert.equal(o.city, 'Bexley Heath'); assert.equal(o.country, 'GB'); assert.equal(o.forwarded, true)
assert.equal(o.device, 'Chrome on Android'); assert.equal(o.client, 'web')
o = clientOrigin(req({ ...fwd().headers, 'x-cs-forward-secret': 'wrong' + 'a'.repeat(43) }), env)
assert.equal(o.ip, '76.76.21.9', 'wrong secret: the claimed IP is ignored'); assert.equal(o.forwarded, false)
o = clientOrigin(req({ 'x-cs-client-ip': '1.2.3.4' }), env)
assert.equal(o.ip, '76.76.21.9', 'no secret header: ignored'); assert.equal(o.client, 'unknown')
o = clientOrigin(fwd(), {})                                           // secret not configured on this side: never trust
assert.equal(o.ip, '76.76.21.9'); assert.equal(isTrustedForward(fwd(), {}), false)
assert.equal(isTrustedForward(req({ 'x-cs-forward-secret': ['x'] as any }), env), false)

// bad forwarded values fall back safely
o = clientOrigin(fwd({ 'x-cs-client-ip': '<script>' }), env); assert.equal(o.ip, '76.76.21.9')
assert.equal(cleanIp('::ffff:1.2.3.4'), '1.2.3.4'); assert.equal(cleanIp('not an ip'), null); assert.equal(cleanIp(undefined), null)

// how they opened CareStream
assert.equal(clientOrigin(fwd({ 'x-cs-client-app': 'android' }), env).client, 'android_app')
assert.equal(clientOrigin(fwd({ 'x-cs-client-app': 'ios' }), env).client, 'ios_app')
assert.equal(clientOrigin(fwd({ 'x-cs-client-mode': 'installed_web' }), env).client, 'installed_web')
assert.equal(clientOrigin(fwd({ 'x-cs-client-app': 'android', 'x-cs-client-mode': 'installed_web' }), env).client, 'android_app')

// device labels
assert.equal(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 18_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.1 Mobile/15E148 Safari/604.1'), 'Safari on iPhone')
assert.equal(describeDevice('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0 Safari/537.36 Edg/126.0'), 'Edge on Windows')
assert.equal(describeDevice('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 Version/17.0 Safari/605.1.15'), 'Safari on Mac')
assert.equal(describeDevice('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 CriOS/126.0 Mobile/15E148 Safari/604.1'), 'Chrome on iPhone')
assert.equal(describeDevice(''), null); assert.equal(describeDevice(null), null)

// the last login record (requestOrigin) now carries the REAL visitor, not the website server
process.env.CS_FORWARD_SECRET = SECRET
const r = requestOrigin(fwd()); assert.equal(r.ip, '81.2.69.142'); assert.equal(r.city, 'Bexley Heath'); assert.equal(r.device, 'Chrome on Android'); assert.ok(r.at)
console.log('client-origin tests passed')
