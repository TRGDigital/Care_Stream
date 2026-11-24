import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(path.resolve(__dirname, '../routes/holiday.ts'), 'utf8')

test('the pilot gate sits on both holiday routers, before anything but /meta, and the admin router also needs an administrator', () => {
  const metaAt = src.indexOf("holidayRouter.get('/meta'"), gateAt = src.indexOf('holidayRouter.use(pilotGate)')
  assert.ok(metaAt > 0 && gateAt > metaAt, 'only /meta comes before the gate')
  assert.ok(!/holidayRouter\.(get|post|put|patch|delete)\(/.test(src.slice(gateAt - 0, gateAt)) )
  assert.ok(src.indexOf('holidayAdminRouter.use(pilotGate)') > 0)
  assert.ok(src.indexOf('holidayAdminRouter.use(pilotGate)') < src.indexOf('holidayAdminRouter.use(requireAdmin)'))
  // no route is declared between the router creation and the gate other than /meta
  const before = src.slice(src.indexOf('export const holidayRouter'), gateAt)
  assert.equal((before.match(/holidayRouter\.(get|post|put|patch|delete)\(/g) ?? []).length, 1)
})

test('decisions, edits and removals all need a decider, and a person cannot decide their own request unless they are an administrator', () => {
  for (const route of ["'/approvals'", "'/requests/:id/decision'", "'/requests/:id'", "'/requests/:id/remove'"]) {
    const i = src.indexOf(route + ', requireDecider')
    assert.ok(i > 0, route)
  }
  assert.match(src, /r\.user_id === userOf\(req\) && roleOf\(req\) !== 'admin'/)
})

test('every read or write of requests and days is scoped to the account', () => {
  const calls = src.match(/p\(\)\.holiday(Request|Day)\.(findFirst|findMany|updateMany|deleteMany|count)\(\{[^}]*\}/g) ?? []
  assert.ok(calls.length > 8)
  for (const c of calls) assert.ok(/tenant_id|request_id/.test(c), c.slice(0, 90))
})

test('pay rates are only ever returned by the administrator routes', () => {
  const adminAt = src.indexOf('export const holidayAdminRouter')
  assert.ok(src.slice(0, adminAt).indexOf('weekday_rate') === -1 && src.slice(0, adminAt).indexOf('weekend_rate') === -1)
})
