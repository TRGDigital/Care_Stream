import test from 'node:test'
import assert from 'node:assert/strict'
process.env.JWT_SECRET = 'test-secret-for-person-email'
import { personLedEmail, personFrom, initialsOf, roleLine } from './person-email'
import { emailAvatarToken, verifyEmailAvatarToken } from './email-avatar'

const admin = { name: 'Sarah Jones', jobRole: 'Care Manager', homeName: 'Ferndale Nursing Home', avatarUrl: null as string | null }
const base = {
  admin, headline: 'Sarah Jones has allocated you training',
  details: [{ label: 'Allocated', value: 'New training' }, { label: 'Due by', value: '12 December 2026' }, { label: 'Note', value: '' }],
  button: { label: 'Open in your hub', href: 'https://carestreamai.com/chat?view=training' },
  footerNote: 'You received this because Sarah Jones allocated you training.', logoUrl: 'https://carestreamai.com/logo-color.png',
}

test('person email: has the person, headline, details and the one button', () => {
  const html = personLedEmail(base)
  for (const s of ['Sarah Jones', 'has allocated you training', 'Care Manager at Ferndale Nursing Home', 'New training', '12 December 2026', 'Open in your hub', 'chat?view=training', 'logo-color.png']) assert.ok(html.includes(s), s)
  assert.equal((html.match(/<a /g) ?? []).length, 1)
  assert.ok(!html.includes('Note'), 'empty detail rows are left out')
  assert.ok(!/<script/i.test(html))
})

test('person email: no picture gives initials, with a picture gives the image', () => {
  assert.ok(personLedEmail(base).includes('>SJ<'))
  const withPic = personLedEmail({ ...base, admin: { ...admin, avatarUrl: 'https://api.example.org/public/email-avatar/u/abc.jpg' } })
  assert.ok(withPic.includes('email-avatar/u/abc.jpg') && !withPic.includes('>SJ<'))
})

test('person email: escapes names and falls back to Admin', () => {
  const html = personLedEmail({ ...base, admin: { name: 'A <b>B</b>', jobRole: '', homeName: null } })
  assert.ok(!html.includes('<b>B</b>') && html.includes('&lt;b&gt;'))
  assert.equal(roleLine({ name: 'x', jobRole: null, homeName: null }), 'Admin')
  assert.equal(initialsOf('madonna'), 'M')
})

test('From name is "<Name> via CareStream" and cannot break the header', () => {
  assert.equal(personFrom({ name: 'Sarah Jones' }), 'Sarah Jones via CareStream')
  assert.equal(personFrom({ name: 'Sa"rah <x>\nJones' }), 'Sa rah x Jones via CareStream')
  assert.equal(personFrom({ name: '' }), 'CareStream')
})

test('email avatar token: changes with updated_at, rejects tampering and other people', () => {
  const t1 = emailAvatarToken('user-1', new Date('2026-11-01T10:00:00Z'))
  const t2 = emailAvatarToken('user-1', new Date('2026-11-02T10:00:00Z'))
  assert.notEqual(t1, t2)
  assert.ok(verifyEmailAvatarToken('user-1', new Date('2026-11-01T10:00:00Z'), t1))
  assert.equal(verifyEmailAvatarToken('user-1', new Date('2026-11-02T10:00:00Z'), t1), false)   // picture replaced: old link dead
  assert.equal(verifyEmailAvatarToken('user-2', new Date('2026-11-01T10:00:00Z'), t1), false)   // another person
  assert.equal(verifyEmailAvatarToken('user-1', new Date('2026-11-01T10:00:00Z'), t1.slice(0, -1) + (t1.endsWith('A') ? 'B' : 'A')), false)
  assert.equal(verifyEmailAvatarToken('user-1', new Date('2026-11-01T10:00:00Z'), ''), false)
})
