import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(path.resolve(__dirname, '../routes/holiday.ts'), 'utf8')

test('the pilot gate sits on both holiday routers, before anything but /meta, and the admin router also needs an administrator', () => {
  const metaAt = src.indexOf("holidayRouter.get('/meta'"), gateAt = src.indexOf('holidayRouter.use(pilotGate)')
  assert.ok(metaAt > 0 && gateAt > metaAt, 'only /meta comes before the gate')
  assert.ok(!/holidayRouter\.(get|post|put|patch|delete)\(/.test(src.slice(gateAt - 0, gateAt)) )
  // the admin router keeps the pilot gate for everything except a person's holiday and pay boxes (/staff/:userId), and still needs an administrator
  const gateLine = src.indexOf('pilotGate(req, res, next)))')
  assert.ok(gateLine > 0 && src.slice(gateLine - 160, gateLine).includes('/^\\/staff\\/[^/]+\\/?$/'))
  assert.ok(gateLine < src.indexOf('holidayAdminRouter.use(requireAdmin)'))
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

test('ROLLED OUT: only the Holiday and pay boxes on the staff forms are open to every account (administrators only); holiday tracking itself stays in the pilot', () => {
  const re = /^\/staff\/[^/]+\/?$/
  assert.ok(re.test('/staff/abc-123')); assert.ok(re.test('/staff/abc-123/'))
  for (const p of ['/matrix', '/settings', '/sick', '/sick/x', '/staff', '/staff/a/b', '/people', '/import']) assert.ok(!re.test(p), p)
  assert.match(src, /ok\(res, \{ enabled: false, staff_fields: roleOf\(req\) === 'admin'/)   // /meta tells an admin of any account that the boxes are available
  const web = fs.readFileSync(path.join(__dirname, '../../../web/src/components/admin/holiday/holiday-staff-fields.tsx'), 'utf8')
  assert.ok(/meta\?\.enabled \|\| meta\?\.staff_fields/.test(web)); assert.ok(/!meta\.is_admin/.test(web))
})

test('HOLIDAY AND PAY is locked on screen and the hub chat never reads it (no holiday, pay or staff detail record is loaded by the chat, retrieval or staff AI code)', () => {
  const web = fs.readFileSync(path.join(__dirname, '../../../web/src/components/admin/holiday/holiday-staff-fields.tsx'), 'utf8')
  assert.match(web, /Holiday and pay <LockedBadge variant="icon" \/>/); assert.match(web, /never used by the hub chat/)
  const root = path.resolve(__dirname, '..')
  const files: string[] = []
  const walk = (d: string) => { for (const f of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, f.name); if (f.isDirectory()) walk(p); else if (/\.ts$/.test(f.name) && !/\.test\.ts$/.test(f.name)) files.push(p) } }
  for (const d of ['services/rag', 'services/ai', 'services/knowledge']) { try { walk(path.join(root, d)) } catch { /* folder may not exist */ } }
  for (const f of ['routes/chat.ts']) { try { if (fs.existsSync(path.join(root, f))) files.push(path.join(root, f)) } catch { /* ignore */ } }
  assert.ok(files.length > 0, 'the chat code was found')
  for (const f of files) assert.doesNotMatch(fs.readFileSync(f, 'utf8'), /holidayStaff|holiday_staff|staffDetail|weekday_rate|weekend_rate|holiday_entitlement/, path.relative(root, f))
})
