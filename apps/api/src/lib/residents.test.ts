// "This is me" pure logic. Run with:  npx tsx src/lib/residents.test.ts   (no database needed)

import assert from 'node:assert/strict'
import { SECTIONS, SECTION_KEYS, RETENTION_YEARS, ageFrom, addYears, cleanText, displayName, hashToken, newInviteToken, dateOnly, labelFor, chunkText } from './residents'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok  ', name) }

t('sections: unique keys, every one has a label, help and a family question', () => {
  assert.equal(new Set(SECTIONS.map(s => s.key)).size, SECTIONS.length)
  for (const s of SECTIONS) { assert.ok(s.label && s.help && s.family_prompt); assert.ok(SECTION_KEYS.has(s.key)) }
  assert.equal(labelFor('likes'), 'Likes')
  assert.equal(labelFor('nope'), 'nope')
})

t('no dashes in any wording families or admins see', () => {
  for (const s of SECTIONS) assert.ok(!/[–—]/.test(`${s.label}${s.help}${s.family_prompt}`), s.key)
})

t('age is worked out on the birthday, not before', () => {
  const now = new Date('2026-11-17T12:00:00Z')
  assert.equal(ageFrom('1940-11-17', now), 86)
  assert.equal(ageFrom('1940-11-18', now), 85)
  assert.equal(ageFrom(null, now), null)
  assert.equal(ageFrom('2030-01-01', now), null)
})

t('retention is seven years after archiving', () => {
  assert.equal(RETENTION_YEARS, 7)
  assert.equal(dateOnly(addYears(new Date('2026-11-17T09:00:00Z'), RETENTION_YEARS)), '2033-11-17')
})

t('display name prefers the preferred name', () => {
  assert.equal(displayName({ first_name: 'Margaret', last_name: 'Smith', preferred_name: 'Peggy' }), 'Peggy Smith')
  assert.equal(displayName({ first_name: 'Margaret', last_name: 'Smith' }), 'Margaret Smith')
})

t('family text is stripped of markup and trimmed', () => {
  assert.equal(cleanText('  <b>Loves</b> tea <script>x</script>  ', 100), 'Loves tea x')
  assert.equal(cleanText('a'.repeat(50), 10).length, 10)
})

t('invite tokens are long, unique, url safe and only the hash is derivable', () => {
  const a = newInviteToken(), b = newInviteToken()
  assert.notEqual(a.token, b.token)
  assert.ok(a.token.length >= 40 && /^[A-Za-z0-9_-]+$/.test(a.token))
  assert.equal(a.hash, hashToken(a.token))
  assert.notEqual(a.hash, a.token)
  assert.equal(a.hash.length, 64)
})

t('long text is split at paragraphs and sentences, nothing is lost or cut mid word', () => {
  const sentence = 'He met Mum at a dance at the Mecca Ballroom in nineteen fifty four. '
  const long = Array.from({ length: 4 }, () => sentence.repeat(30)).join('\n\n')   // about 8,000 characters
  const parts = chunkText(long, 3800)
  assert.ok(parts.length >= 3)
  for (const p of parts) assert.ok(p.length <= 3800)
  assert.equal(parts.join(' ').replace(/\s+/g, ' '), long.replace(/\s+/g, ' ').trim())
  assert.deepEqual(chunkText('short'), ['short'])
  assert.deepEqual(chunkText('   '), [])
})

console.log(`\n${n} groups passed`)
