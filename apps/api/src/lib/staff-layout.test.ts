import test from 'node:test'
import assert from 'node:assert/strict'
import sgMail from '@sendgrid/mail'
process.env.SENDGRID_API_KEY = process.env.SENDGRID_API_KEY || 'SG.test'
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret'
import * as out from '../services/email/outbound'
import { setActorOverrideForPreview } from '../services/email/email-avatar'
import { personEmailCases, otherStaffEmailCases } from '../services/email/person-email-samples'
import { finalizeStaffEmail } from './staff-email-finalize'
import { applyOrgLogo } from './org-logo'

const sent: any[] = []
;(sgMail as any).send = async (m: any) => { sent.push(m) }
setActorOverrideForPreview(() => ({ name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: null }))
const base = { to: 'staff@example.org', name: 'Amira Khan', orgName: 'Ferndale Nursing Home' }
const portal = 'https://www.carestreamai.com'

test('every email to a member of staff has the new structure: logo place, headline, the person it is from, a card and a footer note', async () => {
  const cases = { ...personEmailCases(out, { ...base, actorUserId: 'a' }, portal), ...otherStaffEmailCases(out, base, portal) }
  const bad: string[] = []
  for (const [name, fn] of Object.entries(cases)) {
    sent.length = 0
    await fn()
    const fin = await finalizeStaffEmail(sent[0])
    const html = applyOrgLogo(fin.html, { url: 'https://x.test/logo.png', alt: 'Home' })
    const fromName = typeof fin.from === 'object' ? fin.from.name : String(fin.from)
    const ok = html.includes('Sarah Jones') && html.includes('Care Manager at Ferndale Nursing Home') && html.includes('https://x.test/logo.png') && /via CareStream/.test(fromName) && !html.includes('CS_')
    if (!ok) bad.push(`${name} (from ${fromName})`)
  }
  assert.deepEqual(bad, [], `old layout or missing parts: ${bad.join(', ')}`)
})

test('the headline of a company layout email is its subject, without a [Preview] or [Sample] prefix', async () => {
  sent.length = 0
  await out.sendPasswordResetEmail('staff@example.org', 'Amira Khan', `${portal}/reset-password?token=x`)
  const fin = await finalizeStaffEmail({ ...sent[0], subject: '[Sample] ' + sent[0].subject })
  assert.ok(fin.html.includes(String(sent[0].subject).replace(/&/g, '&amp;')))
  assert.ok(!fin.html.includes('[Sample]'))
})
