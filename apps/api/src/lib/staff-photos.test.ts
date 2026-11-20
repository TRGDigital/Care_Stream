import test from 'node:test'
import assert from 'node:assert/strict'
process.env.JWT_SECRET = 'test-secret-for-staff-photos'
import sharp from 'sharp'
import { processStaffPhoto, signedStaffPhotoPath, verifyStaffPhotoSignature, STAFF_PHOTO_SCOPE } from './staff-photos'

test('staff photo: a 3000x2000 JPEG with EXIF becomes a 512x512 JPEG with no EXIF', async () => {
  const src = await sharp({ create: { width: 3000, height: 2000, channels: 3, background: '#3366cc' } })
    .withExif({ IFD0: { Make: 'TestCam', Orientation: '6' } }).jpeg().toBuffer()
  assert.ok((await sharp(src).metadata()).exif, 'fixture has EXIF')
  const r = await processStaffPhoto({ buffer: src, originalname: 'me.jpg' })
  assert.ok(r.ok)
  if (!r.ok) return
  const meta = await sharp(r.data).metadata()
  assert.equal(meta.format, 'jpeg')
  assert.equal(meta.width, 512); assert.equal(meta.height, 512)
  assert.equal(meta.exif, undefined)
  assert.equal(r.width, 512)
})

test('staff photo: PNG and WebP are accepted, a text file renamed .jpg is rejected', async () => {
  const png = await sharp({ create: { width: 300, height: 300, channels: 4, background: { r: 0, g: 0, b: 0, alpha: 0.5 } } }).png().toBuffer()
  assert.ok((await processStaffPhoto({ buffer: png, originalname: 'a.png' })).ok)
  const webp = await sharp({ create: { width: 100, height: 400, channels: 3, background: '#ffffff' } }).webp().toBuffer()
  assert.ok((await processStaffPhoto({ buffer: webp, originalname: 'a.webp' })).ok)
  const bad = await processStaffPhoto({ buffer: Buffer.from('this is just some text, not a picture'), originalname: 'me.jpg' })
  assert.equal(bad.ok, false)
  assert.equal((bad as any).code, 'INVALID_FILE')
  assert.equal(((await processStaffPhoto(undefined)) as any).code, 'NO_FILE')
})

test('staff photo: signed link is scoped, expires and cannot be reused for another person', () => {
  const path = signedStaffPhotoPath('user-1')
  const u = new URL('http://x' + path)
  const s = u.searchParams.get('s')!, e = Number(u.searchParams.get('e')), g = u.searchParams.get('g')!
  assert.equal(s, STAFF_PHOTO_SCOPE)
  assert.ok(path.startsWith('/public/staff-photo/user-1?'))
  assert.ok(verifyStaffPhotoSignature('user-1', s, e, g))
  assert.equal(verifyStaffPhotoSignature('user-2', s, e, g), false)            // another person
  assert.equal(verifyStaffPhotoSignature('user-1', 'staff', e, g), false)      // the resident photo scope
  assert.equal(verifyStaffPhotoSignature('user-1', s, e + 1, g), false)        // tampered expiry
  const past = Math.floor(Date.now() / 1000) - 5
  assert.equal(verifyStaffPhotoSignature('user-1', s, past, g), false)
  const ttl = e - Math.floor(Date.now() / 1000)
  assert.ok(ttl > 590 && ttl <= 600)
})
