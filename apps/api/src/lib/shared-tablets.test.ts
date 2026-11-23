import test from 'node:test'
import assert from 'node:assert/strict'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import { encryptPin, decryptPin, isWeakPin, generatePin, tabletRefusal } from './shared-tablets'

const req = (method: string, url: string, dev?: { t: 'device' | 'personal'; d: string }) => ({ method, originalUrl: url, user: { sub: 'u', tenant_id: 't', role: 'staff', dev } }) as any

test('a PIN survives encrypt then decrypt, and the stored value does not contain it', () => {
  const enc = encryptPin('4821')
  assert.equal(decryptPin(enc), '4821')
  assert.ok(!enc.includes('4821'))
  assert.equal(decryptPin('garbage'), null)
})

test('obvious PINs are rejected and generated PINs are always 4 digits and not weak', () => {
  for (const w of ['0000', '1111', '1234', '4321', '2580', '123', 'abcd', '12345']) assert.ok(isWeakPin(w), w)
  assert.ok(!isWeakPin('4821'))
  for (let i = 0; i < 300; i++) { const p = generatePin(); assert.match(p, /^\d{4}$/); assert.ok(!isWeakPin(p)) }
})

test('a connected tablet that nobody has signed in on can do nothing except let someone enter a PIN', () => {
  const d = { t: 'device' as const, d: 'dev1' }
  assert.equal(tabletRefusal(req('GET', '/tablet/roster', d)), null)
  assert.equal(tabletRefusal(req('POST', '/tablet/personal/start', d)), null)
  assert.equal(tabletRefusal(req('GET', '/me/profile', d)), null)   // the sign in check when the tablet's own session starts
  for (const [m, u] of [['POST', '/query/stream'], ['POST', '/query'], ['GET', '/residents?status=living'], ['GET', '/policies'], ['GET', '/me/annual-training'], ['GET', '/me/counts'], ['POST', '/me/tts'],
    ['GET', '/training/my-enrollments'], ['GET', '/users'], ['POST', '/me/photo'], ['POST', '/me/push/subscribe'], ['GET', '/admin/anything'], ['POST', '/residents'], ['GET', '/tablets'], ['GET', '/workforce/register'], ['POST', '/auth/switch-site']]) {
    assert.ok(tabletRefusal(req(m, u, d)), `${m} ${u} should be refused without a PIN`)
  }
})

test('a personal session on a tablet gets the normal staff hub minus account changes', () => {
  const d = { t: 'personal' as const, d: 'dev1' }
  assert.equal(tabletRefusal(req('GET', '/me/training', d)), null)
  assert.equal(tabletRefusal(req('POST', '/me/training/complete', d)), null)
  for (const [m, u] of [['POST', '/auth/switch-site'], ['POST', '/me/photo'], ['DELETE', '/me/photo'], ['POST', '/me/push/subscribe'], ['POST', '/tablet/personal/start'], ['GET', '/tablets'], ['POST', '/billing/portal']]) {
    assert.ok(tabletRefusal(req(m, u, d)), `${m} ${u} should be refused`)
  }
})

test('an ordinary session is untouched', () => {
  assert.equal(tabletRefusal(req('POST', '/users')), null)
})
