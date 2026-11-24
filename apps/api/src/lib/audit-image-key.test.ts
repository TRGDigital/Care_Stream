import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
import { AUDIT_IMAGE_SCENES } from '../data/audit-image-scenes'

// The web files live in another package, so they are loaded by path at run time (the API build must not compile them).
const web = (f: string) => import(path.resolve(__dirname, '../../../web/src/lib', f))
const keys = new Set(AUDIT_IMAGE_SCENES.map(s => s.key))

test('every audit card has a picture to show: its own, or its theme', async () => {
  const { AUDIT_CATALOGUE } = await web('audit-catalogue'); const { auditImageKeys } = await web('audit-image-key')
  type A = { name: string }
  const none = (AUDIT_CATALOGUE as A[]).filter(a => !(auditImageKeys(a.name) as string[]).some(k => keys.has(k))).map(a => a.name)
  assert.deepEqual(none, [])
})

test('the 19 new home care audits each have their own picture, and the rest share a theme', async () => {
  const { AUDIT_CATALOGUE } = await web('audit-catalogue'); const { auditImageKeys } = await web('audit-image-key')
  const own = (AUDIT_CATALOGUE as Array<{ name: string }>).filter(a => (auditImageKeys(a.name) as string[]).length === 2 && keys.has((auditImageKeys(a.name) as string[])[0]))
  assert.equal(own.length, 19)
  assert.equal(AUDIT_IMAGE_SCENES.filter(s => !s.key.startsWith('theme:') && !s.key.startsWith('collection:')).length, 19)
  assert.equal(AUDIT_IMAGE_SCENES.filter(s => s.key.startsWith('theme:')).length, 14)
})

test('scene descriptions are long enough for the generator and use no dashes', () => {
  for (const s of AUDIT_IMAGE_SCENES) {
    assert.ok(s.scene.length >= 15 && s.scene.length <= 600, s.key)
    assert.ok(!/[–—]/.test(s.scene + s.topic + s.alt), `${s.key} has a dash`)
  }
})

test('the API theme rules agree with the web ones for every audit', async () => {
  const { AUDIT_CATALOGUE } = await web('audit-catalogue'); const { auditThemeKey: webKey } = await web('audit-image-key')
  const { auditThemeKey } = await import('../data/audit-image-theme')
  for (const a of AUDIT_CATALOGUE as Array<{ name: string }>) assert.equal(auditThemeKey(a.name), webKey(a.name), a.name)
})
