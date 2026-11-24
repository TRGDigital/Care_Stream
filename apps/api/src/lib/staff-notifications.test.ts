import test from 'node:test'
import assert from 'node:assert/strict'
import sgMail from '@sendgrid/mail'
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import * as out from '../services/email/outbound'
import { setActorOverrideForPreview } from '../services/email/email-avatar'
import { notificationBodyToHtml, notificationHeadline, notificationSubject } from '../services/email/notification-content'
import { tabletRefusal } from './shared-tablets'
import { ELIGIBLE_WHERE, resolveAudience, remindWaitMs, progress, cleanTitle, cleanBody, MAX_RECIPIENTS } from './staff-notifications'

const staff = (n: number) => Array.from({ length: n }, (_, i) => ({ id: `u${i + 1}`, name: `Person ${i + 1}`, email: `p${i + 1}@oak.co.uk` }))

test('only active, non shared, non agency people can be sent to, and only within the home', () => {
  assert.deepEqual(ELIGIBLE_WHERE('t1'), { tenant_id: 't1', is_active: true, is_shared: false, is_agency: false })
})

test('All staff sends to everyone eligible; chosen staff sends to those chosen who are still eligible', () => {
  const e = staff(5)
  const all = resolveAudience({ audience: 'all' }, e) as any
  assert.equal(all.people.length, 5); assert.equal(all.audience, 'all')
  const some = resolveAudience({ audience: 'selected', user_ids: ['u2', 'u4', 'u2', 'gone', 'other-home-user'] }, e) as any
  assert.deepEqual(some.people.map((p: any) => p.id), ['u2', 'u4']); assert.equal(some.dropped, 2)   // duplicates collapse, people not eligible are dropped
})

test('a send needs an audience, somebody to send to, and stays within the size limit', () => {
  assert.ok('error' in (resolveAudience({}, staff(2)) as any))
  assert.ok('error' in (resolveAudience({ audience: 'selected', user_ids: [] }, staff(2)) as any))
  assert.ok('error' in (resolveAudience({ audience: 'selected', user_ids: ['nobody'] }, staff(2)) as any))
  assert.ok('error' in (resolveAudience({ audience: 'all' }, []) as any))
  assert.ok('error' in (resolveAudience({ audience: 'all' }, staff(MAX_RECIPIENTS + 1)) as any))
})

test('read progress and the once a day reminder rule', () => {
  assert.equal(progress(15, 12).label, '12 of 15 read'); assert.equal(progress(3, 3).unread, 0)
  const now = Date.now()
  assert.equal(remindWaitMs(null, now), 0)
  assert.ok(remindWaitMs(new Date(now - 3600_000), now) > 22 * 3600_000)
  assert.equal(remindWaitMs(new Date(now - 25 * 3600_000), now), 0)
})

test('the title and message are cleaned and limited', () => {
  assert.equal(cleanTitle('  Fire   drill \n Thursday '), 'Fire drill Thursday')
  assert.equal(cleanTitle('x'.repeat(300)).length, 120)
  assert.equal(cleanBody('a\r\n\r\n\r\n\r\nb'), 'a\n\nb')
  assert.equal(cleanBody('y'.repeat(5000)).length, 2000)
})

test('the email body keeps paragraphs and line breaks and can never become markup', () => {
  const h = notificationBodyToHtml('Line one\nline two\n\n<script>alert(1)</script> & "quoted"')
  assert.ok(h.includes('Line one<br>line two'))
  assert.equal((h.match(/<p /g) ?? []).length, 2)
  assert.ok(!h.includes('<script>') && h.includes('&lt;script&gt;') && h.includes('&amp;'))
  assert.match(notificationHeadline('Sarah Jones'), /Sarah Jones has sent you a notification/)
  assert.match(notificationSubject('Sarah Jones', 'x'.repeat(120)), /\.\.\.$/)
})

test('the notification email is sent "<Admin> via CareStream", with the title, the message and a button to the hub page', async () => {
  const sent: any[] = []
  ;(sgMail as any).send = async (m: any) => { sent.push(m) }
  setActorOverrideForPreview(() => ({ name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: null }))
  await out.sendStaffNotificationEmail({ to: 'a@oak.co.uk', name: 'Amira Khan', orgName: 'Ferndale', title: 'Fire drill on Thursday', body: 'Please read the plan.', notificationId: 'n1', actorUserId: 'u1' })
  const m = sent[0]
  assert.equal(m.from.name, 'Sarah Jones via CareStream')
  assert.ok(m.html.includes('Sarah Jones has sent you a notification') && m.html.includes('Fire drill on Thursday') && m.html.includes('Please read the plan.'))
  assert.ok(m.html.includes('/notifications/n1') && m.html.includes('Read it in my hub'))
  setActorOverrideForPreview(() => null)
  sent.length = 0
  await out.sendStaffNotificationEmail({ to: 'a@oak.co.uk', name: 'Amira Khan', orgName: 'Ferndale', title: 'T', body: 'B', notificationId: 'n1' })
  assert.ok(sent[0].html.includes('Read it in my hub'), 'the branded layout still has the button')
})

test('a shared tablet that nobody has entered a PIN on never reaches notifications; a person signed in by PIN does', () => {
  const req = (method: string, url: string, dev: any) => ({ method, originalUrl: url, user: { sub: 'u', tenant_id: 't', role: 'staff', dev } }) as any
  for (const [m, u] of [['GET', '/me/notifications/unread'], ['GET', '/me/notifications/n1'], ['POST', '/me/notifications/n1/read'], ['GET', '/notifications']])
    assert.ok(tabletRefusal(req(m, u, { t: 'device', d: 'dev1' })), `${m} ${u} must be refused for the tablet itself`)
  for (const [m, u] of [['GET', '/me/notifications/unread'], ['GET', '/me/notifications'], ['GET', '/me/notifications/n1'], ['POST', '/me/notifications/n1/read']])
    assert.equal(tabletRefusal(req(m, u, { t: 'personal', d: 'dev1' })), null, `${m} ${u} must work for a person signed in by PIN`)
})

test('every read of notifications in the routes is limited to the signed in home (tenant isolation)', () => {
  const src = require('fs').readFileSync(require('path').resolve(__dirname, '../routes/notifications.ts'), 'utf8').split('\n') as string[]
  const reads = src.filter(l => /staffNotification(Recipient)?\.(findFirst|findMany|count|updateMany)\(/.test(l))
  assert.ok(reads.length >= 8)
  for (const l of reads) assert.ok(/tenant_id/.test(l), `missing tenant_id: ${l.trim().slice(0, 90)}`)
})
