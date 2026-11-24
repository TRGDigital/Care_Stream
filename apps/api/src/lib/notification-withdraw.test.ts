import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

test('withdraw: records who and when, removes every recipient (hub and unread list), and refuses a second time', () => {
  const t = src('notification-withdraw.ts')
  assert.match(t, /insert into public\.notification_withdrawals/); assert.match(t, /staffNotificationRecipient\.deleteMany/)
  assert.match(t, /tenant_id: tenantId/); assert.match(t, /code: 'ALREADY'/); assert.match(t, /code: 'NOT_FOUND'/)
  assert.ok(t.indexOf('insert into public.notification_withdrawals') < t.indexOf('deleteMany'), 'the record is written before the recipients go')
})
test('withdraw route: administrators only, audit logged, and it says the email cannot be recalled', () => {
  const r = src('../routes/notifications.ts')
  assert.match(r, /notificationsAdminRouter\.post\('\/:id\/withdraw'/); assert.match(r, /staff_notification_withdrawn/); assert.match(r, /cannot be recalled/)
  assert.match(r, /notificationsAdminRouter\.use\(requireAdmin\)/)
})
test('withdrawn notifications show as withdrawn in the admin list and detail, and the staff reads are untouched', () => {
  const r = src('../routes/notifications.ts')
  assert.match(r, /withdrawn: gone\.has\(n\.id\)/)
  const mine = r.slice(r.indexOf('const mine'), r.indexOf('meNotificationsRouter.get(\'/unread\''))
  assert.doesNotMatch(mine, /withdraw/, 'staff queries need no filter: the recipient rows are gone')
})
test('Ask CareStream sends through the shared function: hub only is possible, the daily limit counts a personalised batch once, and the audit says via', () => {
  const r = src('../routes/notifications.ts')
  assert.match(r, /email\?: boolean; skipDailyLimit\?: boolean; via\?: string/); assert.match(r, /o\.email === false \? \{ emailed: 0, failed: 0 \}/); assert.match(r, /\.\.\.\(o\.via \? \{ via: o\.via \} : \{\}\)/)
})
test('training allocation and reminders are shared functions the screens also use', () => {
  const t = src('../routes/training.ts')
  assert.match(t, /export async function enrollStaff/); assert.match(t, /export async function remindEnrollment/)
  assert.match(t, /trainingRouter\.post\('\/enroll'[\s\S]*enrollStaff\(/); assert.match(t, /trainingRouter\.post\('\/enrollments\/:id\/remind'[\s\S]*remindEnrollment\(/)
})
