import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { AUDIT_IMAGE_SCENES } from '../data/audit-image-scenes'

// The web files live in another package, so they are loaded by path at run time (the API build must not compile them).
const web = (f: string) => import(path.resolve(__dirname, '../../../web/src/lib', f))
const keys = new Set(AUDIT_IMAGE_SCENES.map(s => s.key))

test('every audit card has a picture to show: its own', async () => {
  const { AUDIT_CATALOGUE } = await web('audit-catalogue'); const { auditImageKeys } = await web('audit-image-key')
  type A = { name: string; slug: string }
  const none = (AUDIT_CATALOGUE as A[]).filter(a => !(auditImageKeys(a.name, a.slug) as string[]).some(k => keys.has(k))).map(a => a.name)
  assert.deepEqual(none, [])
})

test('every one of the 124 audits has its own picture scene', async () => {
  const { AUDIT_CATALOGUE } = await web('audit-catalogue'); const { auditImageKeys } = await web('audit-image-key')
  const missing = (AUDIT_CATALOGUE as Array<{ name: string; slug: string }>).filter(a => !keys.has((auditImageKeys(a.name, a.slug) as string[])[0])).map(a => a.name)
  assert.deepEqual(missing, [])
  assert.equal((AUDIT_CATALOGUE as unknown[]).length, 124)
})

test('scene descriptions are long enough for the generator and use no dashes', () => {
  for (const s of AUDIT_IMAGE_SCENES) {
    assert.ok(s.scene.length >= 15 && s.scene.length <= 600, s.key)
    assert.ok(!/[–—]/.test(s.scene + s.topic + s.alt), `${s.key} has a dash`)
  }
})

test('no two audits share a picture key', async () => {
  const { AUDIT_CATALOGUE } = await web('audit-catalogue'); const { auditImageKeys } = await web('audit-image-key')
  const seen = new Map<string, string>()
  for (const a of AUDIT_CATALOGUE as Array<{ name: string; slug: string }>) {
    const k = (auditImageKeys(a.name, a.slug) as string[])[0]
    assert.ok(!seen.has(k), `${a.name} shares a picture with ${seen.get(k)}`)
    seen.set(k, a.name)
  }
})

test('the dashboard greeting changes at noon and at six', async () => {
  const { greetingFor } = await web('greeting')
  assert.equal(greetingFor(0), 'Good morning'); assert.equal(greetingFor(11), 'Good morning')
  assert.equal(greetingFor(12), 'Good afternoon'); assert.equal(greetingFor(17), 'Good afternoon')
  assert.equal(greetingFor(18), 'Good evening'); assert.equal(greetingFor(23), 'Good evening')
})
