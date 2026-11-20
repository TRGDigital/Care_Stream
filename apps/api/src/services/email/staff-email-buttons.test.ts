// Every staff-facing email must end with a clear primary button that opens the right place in the hub, and the hub overlay must say
// the same thing as the email (shared builders in person-content.ts).
import test from 'node:test'
import assert from 'node:assert/strict'
process.env.JWT_SECRET = 'test-secret'
process.env.SENDGRID_API_KEY = 'SG.test-not-real'
process.env.FRONTEND_URL = 'https://www.carestreamai.com'

import sgMail from '@sendgrid/mail'
import * as out from './outbound'
import { setActorOverrideForPreview } from './email-avatar'
import { personEmailCases, otherStaffEmailCases, personNoticeCases } from './person-email-samples'
import { htmlToText } from './person-content'

const sent: Array<{ subject: string; html: string }> = []
;(sgMail as any).send = async (m: any) => { sent.push({ subject: m.subject, html: m.html }) }
setActorOverrideForPreview(() => ({ name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: null }))

const portal = 'https://www.carestreamai.com'
const base = { to: 'staff@example.org', name: 'Amira Khan', orgName: 'Ferndale Nursing Home' }
const BUTTON = /<a\s[^>]*href="https:\/\/[^"]+"[^>]*style="[^"]*display:inline-block[^"]*padding:[^"]*"/i

async function render(fn: () => Promise<void>): Promise<string> {
  sent.length = 0
  await fn()
  assert.equal(sent.length, 1)
  return sent[0].html
}

test('every person-led staff email has a button with an https hub link', async () => {
  for (const [name, fn] of Object.entries(personEmailCases(out, { ...base, actorUserId: 'admin-1' }, portal))) {
    const html = await render(fn)
    assert.ok(BUTTON.test(html), `${name} has no button`)
    assert.ok(html.includes('Sarah Jones'), `${name} is person-led`)
  }
})

test('every other staff email has a button with an https link', async () => {
  for (const [name, fn] of Object.entries(otherStaffEmailCases(out, base, portal))) {
    assert.ok(BUTTON.test(await render(fn)), `${name} has no button`)
  }
})

test('the overlay says the same as the email for each kind (shared builder)', async () => {
  const notices = personNoticeCases('Sarah Jones')
  const emails = personEmailCases(out, { ...base, actorUserId: 'admin-1' }, portal)
  assert.deepEqual(Object.keys(notices).sort(), Object.keys(emails).sort())
  for (const [name, c] of Object.entries(notices)) {
    const html = await render(emails[name])
    assert.ok(html.includes(c.headline), `${name} headline`)
    if (c.intro) assert.ok(html.includes(c.intro), `${name} intro`)
    if (c.bodyHtml) assert.ok(html.includes(c.bodyHtml), `${name} body`)
    else if (name === 'action-plan') for (const d of c.details) assert.ok(html.includes(d.value.split(' (')[0]), `${name} action text`)   // the email shows the same actions as richer rows
    else for (const d of c.details) assert.ok(html.includes(d.label) && html.includes(d.value), `${name} detail ${d.label}`)
    assert.ok(c.buttonLabel && html.includes(c.buttonLabel), `${name} button label`)
    assert.ok(c.path && c.path.startsWith('/'), `${name} has a hub path`)
    if (name !== 'action-plan') assert.ok(html.includes(c.path.replace(/&/g, '&amp;')), `${name} destination ${c.path}`)
    for (const d of c.details) assert.ok(d.label && d.value, `${name} no empty rows`)
  }
})

test('html bodies become plain lines for the overlay', () => {
  assert.equal(htmlToText('<p>Hello <strong>there</strong>&nbsp;now</p><p>Second &amp; last</p>'), 'Hello there now\nSecond & last')
})
