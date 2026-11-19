import test from 'node:test'
import assert from 'node:assert/strict'
process.env.JWT_SECRET = 'test-secret-for-view-as'
import jwt from 'jsonwebtoken'
import { requireAuth } from './auth'

function run(method: string, url: string, claims: Record<string, unknown>) {
  const token = jwt.sign({ sub: 'u1', tenant_id: 't1', role: 'staff', ...claims }, process.env.JWT_SECRET!, { expiresIn: '5m' })
  const req: any = { method, originalUrl: url, headers: { authorization: `Bearer ${token}` } }
  let status = 0, body: any = null, passed = false
  const res: any = { status(s: number) { status = s; return this }, json(b: any) { body = b; return this } }
  requireAuth(req, res, () => { passed = true })
  return { status, body, passed, req }
}
const view = { imp: { by: 'a1', by_name: 'Len', mode: 'view' } }
const act = { imp: { by: 'a1', by_name: 'Len', mode: 'act' } }

test('a view only token can read', () => {
  for (const m of ['GET', 'HEAD', 'OPTIONS']) assert.equal(run(m, '/me/annual-training', view).passed, true, m)
})
test('a view only token can never change anything', () => {
  for (const m of ['POST', 'PUT', 'PATCH', 'DELETE']) {
    const r = run(m, '/me/annual-training/x/submit', view)
    assert.equal(r.passed, false, m); assert.equal(r.status, 403); assert.equal(r.body.error.code, 'VIEW_ONLY')
  }
})
test('the only write a view token may make is ending the view', () => {
  assert.equal(run('POST', '/me/view-as/end', view).passed, true)
  assert.equal(run('POST', '/me/view-as/end?x=1', view).passed, true)
  assert.equal(run('POST', '/me/view-as/endless', view).passed, false)   // exactly that path, nothing that merely starts with it
  assert.equal(run('POST', '/me/view-as/end/more', view).passed, false)
})
test('act mode and ordinary tokens can write', () => {
  assert.equal(run('POST', '/me/annual-training/x/submit', act).passed, true)
  assert.equal(run('POST', '/me/annual-training/x/submit', {}).passed, true)
})
test('the claims reach the handlers', () => {
  const r = run('GET', '/me/supervisions', view)
  assert.equal(r.req.user.imp.mode, 'view'); assert.equal(r.req.user.sub, 'u1')
})
