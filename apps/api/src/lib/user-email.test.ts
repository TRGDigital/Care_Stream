// Archived email aliases. Run with:  npx tsx src/lib/user-email.test.ts   (no database needed)
import assert from 'node:assert/strict'
import { archivedEmail, originalEmail, isArchivedEmail } from './user-email'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok  ', name) }
const ID = '1a2b3c4d-5e6f-7890-abcd-ef0123456789'

t('an archived account gives up its address but keeps it recognisable', () => {
  const a = archivedEmail('enquiries@crosswayscarehome.co.uk', ID)
  assert.equal(a, 'enquiries+archived-1a2b3c4d@crosswayscarehome.co.uk')
  assert.ok(isArchivedEmail(a))
  assert.equal(originalEmail(a), 'enquiries@crosswayscarehome.co.uk')
})
t('archiving twice changes nothing, and two accounts never collide', () => {
  const a = archivedEmail('enquiries@x.co.uk', ID)
  assert.equal(archivedEmail(a, ID), a)
  assert.notEqual(archivedEmail('enquiries@x.co.uk', 'ffffffff-0000-0000-0000-000000000000'), a)
})
t('plus addresses and odd input are handled', () => {
  assert.equal(originalEmail(archivedEmail('a+b@x.co.uk', ID)), 'a+b@x.co.uk')
  assert.equal(originalEmail('plain@x.co.uk'), 'plain@x.co.uk')
  assert.equal(archivedEmail('not-an-email', ID), 'not-an-email')
})
console.log(`\n${n} groups passed`)
