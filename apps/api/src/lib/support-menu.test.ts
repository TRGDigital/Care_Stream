import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { normaliseKind, cleanPageUrl, emailSubjectFor } from './feature-request-kind'

const web = (f: string) => import(path.resolve(__dirname, '../../../web/src', f))

test('a request is a bug only when it says so, and the page must be an http address', () => {
  assert.equal(normaliseKind('bug'), 'bug'); assert.equal(normaliseKind('BUG'), 'bug')
  assert.equal(normaliseKind(undefined), 'feature'); assert.equal(normaliseKind('anything'), 'feature')
  assert.equal(cleanPageUrl('https://www.carestreamai.com/staff'), 'https://www.carestreamai.com/staff')
  assert.equal(cleanPageUrl('javascript:alert(1)'), null); assert.equal(cleanPageUrl(''), null); assert.equal(cleanPageUrl('not a url'), null)
  assert.equal(cleanPageUrl('https://x.test/' + 'a'.repeat(600))!.length <= 500, true)
})

test('the email subject says bug report or feature request', () => {
  assert.equal(emailSubjectFor('bug', 'Ferndale', 'Page blank'), 'Bug report from Ferndale: Page blank')
  assert.equal(emailSubjectFor('feature', 'Ferndale', 'Dark mode'), 'Feature request from Ferndale: Dark mode')
})

test('only paid plans count for the phone line, and the release dot shows for a newer release', async () => {
  const { isPaidTier, hasUnreadRelease, mailtoSupport, SUPPORT_PHONE } = await web('lib/support')
  assert.equal(isPaidTier('full'), true); assert.equal(isPaidTier(undefined), true)
  for (const t of ['free', 'training_only', 'policies_only']) assert.equal(isPaidTier(t), false, t)
  assert.equal(hasUnreadRelease('2026-11-24', null), true); assert.equal(hasUnreadRelease('2026-11-24', '2026-11-23'), true)
  assert.equal(hasUnreadRelease('2026-11-24', '2026-11-24'), false); assert.equal(hasUnreadRelease(null, null), false)
  assert.match(mailtoSupport('CS-1001'), /^mailto:support@carestreamai\.com\?subject=Support%20request%3A%20CS-1001$/)
  assert.equal(SUPPORT_PHONE, '020 8064 1596')
})

test('release notes are newest first, have unique dated ids, no future dates and no dashes', async () => {
  const { RELEASES } = await web('data/releases')
  const ids = RELEASES.map((r: any) => r.id)
  assert.deepEqual([...ids].sort().reverse(), ids)
  assert.equal(new Set(ids).size, ids.length)
  for (const r of RELEASES) {
    assert.ok(r.id <= '2026-11-24', `${r.id} is in the future`)
    assert.ok(!/[–—]/.test(JSON.stringify(r)), `${r.id} has a dash`)
    assert.ok(r.items.length > 0)
  }
})
