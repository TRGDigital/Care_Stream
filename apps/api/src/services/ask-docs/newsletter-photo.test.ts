import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import sharp from 'sharp'
import { photoAllowedFor, photoChoice, CONSENT_QUESTION } from './newsletter-photo'
import { renderNewsletterHtml, renderNewsletterPdf, sampleBody } from './newsletter-design'
import { newsletterTemplate } from './newsletter-templates'
import { NEWSLETTER_TOOLS } from '../ask/newsletter-tools'
import { AGENTS } from '../ask/agents'
import { toolAllowed } from '../ask/manager-access'
import { renderOptionPreview } from './option-preview'

const BRAND = { name: 'Ferndale Nursing Home', contact: ['01234 567890'] }
const EOM = 'Hello everyone.\n\n## Our employee of the month\nHelen Thomas, senior care assistant, is our employee of the month.\n\n## Why they were chosen\n- Kind and calm\n\n## A thank you\nThank you, Helen.'
const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
const tool = (n: string) => NEWSLETTER_TOOLS.find(t => t.name === n)!
const ctx = { tenantId: 't1', userId: 'u1', today: '2026-11-26' }
let jpg = Buffer.alloc(0)
const photoUrl = async () => { jpg = await sharp({ create: { width: 200, height: 200, channels: 3, background: '#3b82f6' } }).jpeg().toBuffer(); return 'data:image/jpeg;base64,' + jpg.toString('base64') }
let pdfkitOk = true; try { require.resolve('pdfkit') } catch { pdfkitOk = false }

test('PHOTO RULES: only four newsletter types carry a picture, and a picture needs a recorded yes', () => {
  for (const id of ['employee-of-the-month-short', 'employee-of-the-month-standard', 'employee-of-the-month-detailed', 'staff-stories-standard', 'welcome-new-starters-short', 'leavers-farewells-detailed']) assert.equal(photoAllowedFor(id), true, id)
  for (const id of ['monthly-update-standard', 'bank-holiday-cover-short', '', null, undefined]) assert.equal(photoAllowedFor(id as any), false, String(id))
  assert.equal(photoChoice({ userId: 'u9', consent: false, actorId: 'a' }).ok, false)
  assert.equal(photoChoice({ userId: 'u9', consent: undefined, actorId: 'a' }).ok, false)
  assert.equal(photoChoice({ userId: 'u9', consent: 'yes', actorId: 'a' }).ok, false)
  const ok = photoChoice({ userId: 'u9', consent: true, actorId: 'a', now: new Date('2026-11-26T10:00:00Z') })
  assert.ok(ok.ok && ok.photo.consent === true && ok.photo.include === true && ok.photo.consent_by === 'a' && ok.photo.consent_at.startsWith('2026-11-26'))
  assert.match(CONSENT_QUESTION, /happy to be named and photographed/)
})

test('SAVE TOOL: refused without consent, and for a type that takes no picture, before anything is saved', async () => {
  const save = tool('save_newsletter_draft')
  const body = '## Our employee of the month\nHelen Thomas is our employee of the month for November, thank you Helen.\n\n## A thank you\nThank you for everything you do for the home.'
  const noConsent: any = await save.run(ctx, { title: 'Employee of the month', template_id: 'employee-of-the-month-standard', body, photo_user_id: 'u9' })
  assert.equal(noConsent.data.saved, false); assert.match(noConsent.data.message, /agrees|happy to be named and photographed/)
  const no: any = await save.run(ctx, { title: 'Employee of the month', template_id: 'employee-of-the-month-standard', body, photo_user_id: 'u9', photo_consent: false })
  assert.equal(no.data.saved, false)
  const wrongType: any = await save.run(ctx, { title: 'Monthly update', template_id: 'monthly-update-standard', body, photo_user_id: 'u9', photo_consent: true })
  assert.equal(wrongType.data.saved, false); assert.match(wrongType.data.message, /employee of the month, staff story, new starters or leavers/)
})

test('ADMIN ONLY: managers reach neither the picture check nor the save tool, and the route sits behind the administrator guard', () => {
  for (const n of ['check_staff_picture', 'save_newsletter_draft']) { assert.equal(toolAllowed('manager', false, n), false, n); assert.equal(toolAllowed('manager', true, n), false, n) }
  const r = src('../../routes/ask-docs.ts')
  assert.match(r, /CONSENT_REQUIRED/); assert.match(r, /photoChoice\(/); assert.match(r, /photoAllowedFor\(/)
  assert.match(src('../../routes/ask-docs.ts'), /staffHasPicture/)
  assert.ok(NEWSLETTER_TOOLS.some(t => t.name === 'check_staff_picture'))
})

test('NO PICTURE ON FILE: the slot shows their initials, plainly, in web and PDF, and the design never breaks', async () => {
  const html = renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'Employee of the month', body: EOM, brand: BRAND, photo: { dataUrl: '', name: 'Helen Thomas' } }, 'web')
  assert.match(html, /aria-label="Picture slot for Helen Thomas"/); assert.match(html, />HT</); assert.doesNotMatch(html, /<img[^>]+Photo of/)
  if (pdfkitOk) { const pdf = await renderNewsletterPdf({ templateId: 'employee-of-the-month-standard', title: 'Employee of the month', body: EOM, brand: BRAND, photo: { dataUrl: '', name: 'Helen Thomas' } }, null, null); assert.equal(pdf.subarray(0, 4).toString(), '%PDF') }
})

test('PHOTO IN THE OUTPUT: large and round in web and PDF in all three layouts, with the alt text "Photo of NAME"', async () => {
  const dataUrl = await photoUrl()
  for (const layout of ['short', 'standard', 'detailed']) {
    const id = `employee-of-the-month-${layout}`
    const html = renderNewsletterHtml({ templateId: id, title: 'Employee of the month', body: EOM, brand: BRAND, photo: { dataUrl, name: 'Helen Thomas' } }, 'web')
    assert.match(html, /alt="Photo of Helen Thomas"/, id); assert.match(html, /width="140" height="140"/, id); assert.match(html, /border-radius:50%/, id)
    if (pdfkitOk) { const pdf = await renderNewsletterPdf({ templateId: id, title: 'Employee of the month', body: EOM, brand: BRAND, photo: { dataUrl, name: 'Helen Thomas' } }, null, jpg); assert.equal(pdf.subarray(0, 4).toString(), '%PDF', id); assert.ok(pdf.length > 3000) }
  }
})

test('EMAIL: never carries the picture or a staff picture address; it shows initials and says the photo is in the hub and the PDF', async () => {
  const dataUrl = await photoUrl()
  const html = renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'Employee of the month', body: EOM, brand: BRAND, photo: { dataUrl, name: 'Helen Thomas', inHub: true } }, 'email')
  assert.doesNotMatch(html, /data:image\/jpeg/); assert.doesNotMatch(html, /staff-photo|photo\.jpg|<img[^>]+Photo of/); assert.match(html, /Their photo is in the hub and the PDF/); assert.match(html, />HT</)
  const doc = src('./newsletter-design-doc.ts')
  assert.match(doc, /peopleFor\(o\.tenantId, o\.doc, web\)/)
  assert.match(fs.readFileSync(path.resolve(__dirname, 'newsletter-photo.ts'), 'utf8'), /x\.consent === true/)   // featuredOf drops anyone without a recorded agreement
  assert.match(doc, /staffHasPicture/)
})

test('PREVIEW: a neutral SAMPLE silhouette, never a real picture, in every employee of the month and staff story layout', async () => {
  for (const id of ['employee-of-the-month-short', 'employee-of-the-month-standard', 'employee-of-the-month-detailed', 'staff-stories-standard']) {
    const t = newsletterTemplate(id)!
    const html = renderNewsletterHtml({ templateId: id, title: t.type_title, body: sampleBody(t), brand: BRAND, sample: true }, 'web')
    assert.match(html, /Sample picture of a member of staff/, id); assert.doesNotMatch(html, /data:image\/jpeg/, id)
  }
  const r = await renderOptionPreview('t1', { kind: 'newsletter', template_id: 'employee-of-the-month-standard' } as any, { letterhead: async () => ({ head: { name: 'Ferndale', logoDataUrl: null, addressLines: [], contactLines: [] } as any }), brand: async () => null })
  assert.match(r.html, /Sample picture of a member of staff/); assert.doesNotMatch(r.html, /staff-photo|data:image\/jpeg/)
})

test('THE AGENT: asks "who" with the people picker and the agreement question, checks for a picture, and passes the choice when saving', () => {
  const a = AGENTS.find(x => x.id === 'newsletter')!
  assert.ok(a.tools.includes('check_staff_picture'))
  assert.match(a.prompt, /They are happy to be named and photographed/); assert.match(a.prompt, /Who is the employee of the month\?/)
  assert.match(a.prompt, /kind people/); assert.match(a.prompt, /photo_user_id/); assert.match(a.prompt, /photo_consent true/); assert.match(a.prompt, /check_staff_picture/)
  assert.match(a.prompt, /no staff picture/i); assert.match(a.prompt, /initials/)
  for (const id of ['employee-of-the-month-standard', 'staff-stories-standard', 'welcome-new-starters-standard', 'leavers-farewells-standard']) assert.match(newsletterTemplate(id)!.heads_up ?? '', /staff picture|agree/i, id)
  assert.doesNotMatch(src('./newsletter-templates.ts').match(/heads_up: '[^']*'/g)!.join(' '), /[–—]/)
})
