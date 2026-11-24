import test from 'node:test'
import assert from 'node:assert/strict'
import sgMail from '@sendgrid/mail'
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import * as out from '../services/email/outbound'
import { setActorOverrideForPreview } from '../services/email/email-avatar'
import { LOGO_ROW, LOGO_BLOCK } from '../services/email/org-logo-markers'

const sent: any[] = []
;(sgMail as any).send = async (m: any) => { sent.push(m) }
const base = { to: 'daughter@example.org', inviteeName: 'Jan Smith', residentName: 'Tim', homeName: 'Ferndale Nursing Home', senderName: 'Sarah Jones', link: 'https://www.carestreamai.com/family/abc', days: 14 }

test('the family invite is sent "<Admin> via CareStream" with the administrator shown, and no logo marker is left over', async () => {
  setActorOverrideForPreview(() => ({ name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: 'https://api.carestreamai.com/public/email-avatar/x.png' }))
  sent.length = 0
  await out.sendResidentFamilyInviteEmail({ ...base, senderUserId: 'u1', tenantId: null })
  const m = sent[0]
  assert.equal(m.from.name, 'Sarah Jones via CareStream')
  assert.match(m.subject, /Sarah Jones would love your help getting to know Tim/)
  assert.ok(m.html.includes('email-avatar/x.png') && m.html.includes('Care Manager at Ferndale Nursing Home'))
  assert.ok(m.html.includes('Tell us about Tim') && m.html.includes(base.link))
  assert.ok(!m.html.includes(LOGO_ROW) && !m.html.includes(LOGO_BLOCK), 'the logo marker is replaced or removed')
  assert.ok(m.html.indexOf('email-avatar/x.png') > m.html.indexOf('alt="CareStream"'), 'logo above the person')
})

test('the reminder is person led too and keeps the stop link', async () => {
  setActorOverrideForPreview(() => ({ name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: null }))
  sent.length = 0
  await out.sendResidentFamilyReminderEmail({ to: base.to, inviteeName: 'Jan', residentName: 'Tim', homeName: base.homeName, link: base.link, stopLink: 'https://www.carestreamai.com/family/stop/x', days: 14, senderUserId: 'u1' })
  assert.equal(sent[0].from.name, 'Sarah Jones via CareStream')
  assert.ok(sent[0].html.includes('family/stop/x'))
})

test('with no sender the plain layout is kept (from "CareStream")', async () => {
  setActorOverrideForPreview(() => null)
  sent.length = 0
  await out.sendResidentFamilyInviteEmail({ ...base })
  assert.equal(sent[0].from.name, 'CareStream')
  assert.match(sent[0].subject, /Help us get to know Tim/)
})

test('the "someone has replied" button says voice notes only when there are voice notes', () => {
  const l = out.submissionButtonLabel
  assert.equal(l({ answers: 0, photos: 0, videos: 0, voices: 0 }), 'Review the answers')
  assert.equal(l({ answers: 2, photos: 1, videos: 0, voices: 0 }), 'Review the answers and files')
  assert.equal(l({ answers: 0, photos: 0, videos: 2, voices: 0 }), 'Review the video messages')
  assert.equal(l({ answers: 0, photos: 1, videos: 1, voices: 0 }), 'Review the photos and videos')
  assert.equal(l({ answers: 0, photos: 0, videos: 0, voices: 1 }), 'Review the voice notes')
  assert.equal(l({ answers: 0, photos: 1, videos: 0, voices: 1 }), 'Review the photos, videos and voice notes')
})
