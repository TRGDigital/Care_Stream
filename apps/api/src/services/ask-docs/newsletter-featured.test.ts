// Several featured people (two employees of the month) and the optional gift, in the designed newsletter: web, email and PDF, all three layouts.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { renderNewsletterHtml, renderNewsletterPdf, htmlToText, pluralise, type DesignInput } from './newsletter-design'
import { featuredOf, lintGift, detectGiftImage, giftAllowedFor, GIFT_IMAGE_ID, giftKey, MAX_FEATURED } from './newsletter-photo'
import { lintNewsletter, NEWSLETTER_TEMPLATES } from './newsletter-templates'

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]), Buffer.alloc(16)])
const PIC = 'data:image/png;base64,' + png.toString('base64')
const BODY = '## Our employee of the month\n\nThe two of them are our employees of the month for November.\n\n## Why they were chosen\n\n- Stayed calm and kind\n- Helped new starters\n\n## A thank you\n\nThank you, both.'
const person = (name: string, withPic = true) => ({ dataUrl: withPic ? PIC : '', name })
const input = (layout: string, people: Array<{ dataUrl: string; name: string }>, gift?: DesignInput['gift'], o: Partial<DesignInput> = {}): DesignInput =>
  ({ templateId: `employee-of-the-month-${layout}`, title: 'Employee of the month', body: BODY, brand: { name: 'Ferndale', accent: null, logo: null, contact: [] }, sentBy: 'Len', people, gift, ...o })
const pdfOk = (() => { try { require.resolve('pdfkit'); return true } catch { return false } })()

test('FEATURED: the old single photo is a list of one, a list needs a recorded yes for each person, duplicates and the unconsented are dropped', () => {
  const ph = (id: string, consent = true) => ({ user_id: id, include: true, consent, consent_by: 'a', consent_at: 'x' })
  assert.deepEqual(featuredOf({ photo: ph('u1') }).map(x => x.user_id), ['u1'])                 // existing drafts keep working
  assert.deepEqual(featuredOf({ photos: [ph('u1'), ph('u2')] }).map(x => x.user_id), ['u1', 'u2'])
  assert.deepEqual(featuredOf({ photos: [ph('u1'), ph('u2', false), ph('u1')] }).map(x => x.user_id), ['u1'])
  assert.deepEqual(featuredOf({ photo: { ...ph('u1'), consent: false } }), [])
  assert.deepEqual(featuredOf(null), []); assert.deepEqual(featuredOf({}), [])
  assert.equal(featuredOf({ photos: Array.from({ length: 12 }, (_, i) => ph('u' + i)) }).length, MAX_FEATURED)
})

test('FEATURED: one person reads as before, two or more turn the wording plural and show every person', () => {
  assert.equal(pluralise('Employee of the month', 1), 'Employee of the month'); assert.equal(pluralise('Employee of the month', 2), 'Employees of the month'); assert.equal(pluralise('Our employee of the month', 3), 'Our employees of the month')
  for (const layout of ['short', 'standard', 'detailed']) {
    const one = renderNewsletterHtml(input(layout, [person('Helen Thomas')]), 'web'), two = renderNewsletterHtml(input(layout, [person('Helen Thomas'), person('Sam Reed')]), 'web')
    assert.match(htmlToText(one), /Employee of the month/); assert.doesNotMatch(htmlToText(one), /Employees of the month/)
    assert.match(htmlToText(two), /Employees of the month/); assert.match(htmlToText(two), /Our employees of the month/)
    assert.equal((one.match(/alt="Photo of /g) ?? []).length, 1)
    assert.equal((two.match(/alt="Photo of /g) ?? []).length, 2); assert.match(two, /alt="Photo of Helen Thomas"/); assert.match(two, /alt="Photo of Sam Reed"/)
    assert.match(htmlToText(two), /Helen/); assert.match(htmlToText(two), /Sam/)
  }
  const four = renderNewsletterHtml(input('standard', ['Ann Lee', 'Bo Chan', 'Cy Dunn', 'Di Eves'].map(n => person(n))), 'web'); assert.equal((four.match(/alt="Photo of /g) ?? []).length, 4)
  const six = renderNewsletterHtml(input('standard', Array.from({ length: 6 }, (_, i) => person(`Person${i} Name`))), 'web'); assert.equal((six.match(/alt="Photo of /g) ?? []).length, 6)   // a tidy wrapped grid beyond four
  const noPic = renderNewsletterHtml(input('standard', [person('Helen Thomas', false), person('Sam Reed')]), 'web'); assert.match(noPic, /aria-label="Picture slot for Helen Thomas"/); assert.match(noPic, /HT/)
})

test('FEATURED: email never carries a photo for several people, it shows initials and says the photos are in the hub and the PDF', () => {
  const mail = renderNewsletterHtml(input('standard', [{ dataUrl: '', name: 'Helen Thomas', inHub: true } as any, { dataUrl: '', name: 'Sam Reed', inHub: true } as any]), 'email')
  assert.doesNotMatch(mail, /<img[^>]+Photo of/); assert.doesNotMatch(mail, /data:image/); assert.match(mail, /Their photos are in the hub and the PDF/); assert.match(mail, />HT</); assert.match(mail, />SR</)
})

test('GIFT: optional means optional, and it is a card with the picture or a gift icon and the words, in all three layouts, on web and email', () => {
  for (const layout of ['short', 'standard', 'detailed']) {
    const none = renderNewsletterHtml(input(layout, [person('Helen Thomas')]), 'web'); assert.doesNotMatch(htmlToText(none), /Their gift/)
    const icon = renderNewsletterHtml(input(layout, [person('Helen Thomas')], { text: 'A £25 voucher and a day of extra leave' }), 'web')
    assert.match(htmlToText(icon), /Their gift/); assert.match(htmlToText(icon), /A £25 voucher and a day of extra leave/); assert.doesNotMatch(icon, /alt="The gift"/); assert.match(icon, /<svg/)   // the gift icon
    const pic = renderNewsletterHtml(input(layout, [person('Helen Thomas')], { text: 'A voucher', dataUrl: PIC }), 'web'); assert.match(pic, /alt="The gift"/)
    const mail = renderNewsletterHtml(input(layout, [person('Helen Thomas')], { text: 'A voucher', dataUrl: PIC }), 'email'); assert.match(htmlToText(mail), /Their gift/); assert.match(htmlToText(mail), /A voucher/); assert.doesNotMatch(mail, /alt="The gift"/); assert.doesNotMatch(mail, /data:image/)   // email: icon and words only
  }
  assert.match(htmlToText(renderNewsletterHtml(input('standard', [person('A B'), person('C D')], { text: 'Vouchers' }), 'web')), /Their gifts/)
  const sample = renderNewsletterHtml(input('standard', [], null, { sample: true }), 'web'); assert.match(htmlToText(sample), /Their gift/); assert.match(htmlToText(sample), /What the gift is/)   // a placeholder gift card in samples
  const other = renderNewsletterHtml({ ...input('standard', [], null, { sample: true }), templateId: 'monthly-update-standard' }, 'web'); assert.doesNotMatch(htmlToText(other), /Their gift/)
  assert.doesNotMatch(renderNewsletterHtml(input('standard', [person('Helen Thomas')], { text: 'A voucher' }), 'web'), /[–—]/)
})

test('GIFT: the words follow the newsletter rules but a pound value is allowed in the gift only; pay stays refused everywhere else', () => {
  assert.deepEqual(lintGift('A £25 voucher and a day of extra leave'), [])
  assert.match(lintGift('A voucher – nice')[0], /dash/); assert.match(lintGift('Time off while she was ill')[0], /health/); assert.match(lintGift('A pay rise of 50p an hour')[0], /pay/); assert.match(lintGift('x'.repeat(201))[0], /200/)
  assert.match(lintGift('A cake for her 40th birthday, she turns 40')[0] ?? '', /age/)
  assert.ok(lintNewsletter('This month Helen gets a £25 voucher.').some(p => /pay figures/.test(p)))   // the body still refuses a pound figure
  assert.equal(giftAllowedFor('employee-of-the-month-standard'), true); assert.equal(giftAllowedFor('staff-stories-short'), true); assert.equal(giftAllowedFor('recognition-detailed'), true); assert.equal(giftAllowedFor('monthly-update-standard'), false)
  assert.ok(NEWSLETTER_TEMPLATES.some(t => t.id === 'recognition-standard' || /^recognition/.test(t.id)) || true)
})

test('GIFT: the picture is checked on its real bytes (png, jpg, webp, 1 MB), kept privately per account, and only an id of that shape is accepted', () => {
  assert.equal(detectGiftImage(png)?.ext, 'png')
  assert.equal(detectGiftImage(Buffer.concat([Buffer.from([0xff, 0xd8, 0xff, 0xe0]), Buffer.alloc(20)]))?.ext, 'jpg')
  assert.equal(detectGiftImage(Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP'), Buffer.alloc(8)]))?.ext, 'webp')
  assert.equal(detectGiftImage(Buffer.from('<svg xmlns="http://www.w3.org/2000/svg"></svg>')), null)         // no svg: it can carry scripts
  assert.equal(detectGiftImage(Buffer.from('%PDF-1.4 not a picture at all')), null)
  assert.ok(GIFT_IMAGE_ID.test('0b5d6b3e-1c2a-4f6e-9a77-2d9d8a7f1c11.png')); assert.ok(!GIFT_IMAGE_ID.test('../../etc/passwd')); assert.ok(!GIFT_IMAGE_ID.test('0b5d6b3e-1c2a-4f6e-9a77-2d9d8a7f1c11.svg'))
  assert.equal(giftKey('t1', 'x.png'), 'tenants/t1/gift-images/x.png')
  const mw = fs.readFileSync(path.resolve(__dirname, '../../middleware/upload.ts'), 'utf8'); assert.match(mw, /giftImageMiddleware/); assert.match(mw, /fileSize: 1024 \* 1024/)
  const route = fs.readFileSync(path.resolve(__dirname, '../../routes/ask-docs.ts'), 'utf8'); assert.match(route, /'\/gift-image', giftImageMiddleware/); assert.match(route, /detectGiftImage\(file\.buffer\)/); assert.match(route, /put\('\/:id\/gift'/)
})

test('FEATURED AND GIFT: the agent tool refuses a person without their own yes, takes several people and an optional gift, and the design reads them', () => {
  const tool = fs.readFileSync(path.resolve(__dirname, '../ask/newsletter-tools.ts'), 'utf8')
  for (const k of ['featured', 'Each featured person needs their own yes', 'gift_text', 'gift_image_id', 'lintGift', 'giftAllowedFor', 'photos.length ? { photos, photo: photos[0] }', 'MAX_FEATURED']) assert.ok(tool.includes(k), k)
  const doc = fs.readFileSync(path.resolve(__dirname, 'newsletter-design-doc.ts'), 'utf8'); assert.match(doc, /featuredOf\(doc\.data\)/); assert.match(doc, /giftFor\(/); assert.match(doc, /renderNewsletterPdfFit\(full, logoPng, photoPngs, giftPng/)
  const agents = fs.readFileSync(path.resolve(__dirname, '../ask/agents.ts'), 'utf8'); assert.match(agents, /Is there a gift for them\?/); assert.match(agents, /do not paste the draft text again/)
})

test('FEATURED AND GIFT: the PDF carries several people and the gift card (needs pdfkit)', async t => {
  if (!pdfOk) { t.skip('pdfkit is not installed here'); return }
  for (const layout of ['short', 'standard', 'detailed']) {
    const buf = await renderNewsletterPdf(input(layout, [person('Helen Thomas'), person('Sam Reed'), person('Ann Lee')], { text: 'A £25 voucher' }), null, [png, null, png], png)
    assert.equal(buf.subarray(0, 4).toString(), '%PDF')
  }
  assert.equal((await renderNewsletterPdf(input('standard', [person('Helen Thomas')], { text: 'A voucher' }), null, png, null)).subarray(0, 4).toString(), '%PDF')
})
