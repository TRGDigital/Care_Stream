// The tenant brand colour: validation, the fallback order, the letterhead column being optional, and where the colour is (and is not) used.
// Run: NODE_PATH=/tmp/ac/docxmod/node_modules npx tsx --test src/lib/brand-colour.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { normaliseHex, validateBrandColour, usableBrand, applyBrandAccent, DEFAULT_BRAND, SWATCHES } from './brand-colour'
import { renderNewsletterHtml, contrast } from '../services/ask-docs/newsletter-design'
import { cleanDetails, toLetterhead, getBrandColour } from '../services/letters/letterhead'
import { letterLayout, getTemplate as getT } from '../services/letters/render'
import { layoutToHtml } from '../services/letters/layout'
import { prisma } from '../db/client'

const src = (p: string) => fs.readFileSync(path.join(__dirname, p), 'utf8')
const DETAILS = cleanDetails({ trading_name: 'Ferndale Nursing Home', address_line1: '1 Orchard Lane', town: 'Maidstone', postcode: 'ME14 1AA', phone: '01622 000000' })
const COMMON = { recipient_name: 'Aisha Rahman', recipient_role: 'Care Assistant', letter_date: '2026-11-25', service_name: 'Ferndale Nursing Home', manager_name: 'Sarah Jones', manager_role: 'Registered Manager' }
const PAY = { ...COMMON, effective_date: '2026-12-01', old_rate: 12.71, new_rate: 13.21, reason: 'performance' }

test('validation: a valid hex is kept, three digits are expanded, empty means the default, nonsense and pale colours are refused with a plain message', () => {
  assert.equal(normaliseHex('#0f6'), '#00FF66'); assert.equal(normaliseHex('036'), '#003366'); assert.equal(normaliseHex('1d4e89'), '#1D4E89'); assert.equal(normaliseHex(' #1d4e89 '), '#1D4E89'); assert.equal(normaliseHex('#12345'), null)
  assert.deepEqual(validateBrandColour('#1d4e89'), { ok: true, value: '#1D4E89' })
  assert.deepEqual(validateBrandColour('036'), { ok: true, value: '#003366' })
  assert.deepEqual(validateBrandColour(''), { ok: true, value: null }); assert.deepEqual(validateBrandColour(null), { ok: true, value: null })
  const bad: any = validateBrandColour('blue'); assert.equal(bad.ok, false); assert.match(bad.message, /hex colour/)
  const pale: any = validateBrandColour('#FFEE99'); assert.equal(pale.ok, false); assert.match(pale.message, /too pale/); assert.equal(validateBrandColour('#FFFFFF').ok, false)
  for (const s of SWATCHES) assert.ok(contrast(s, '#FFFFFF') >= 4.5, `${s} must read on white`); assert.equal(DEFAULT_BRAND, '#0F766E')
  assert.equal(usableBrand('#FFEE99'), null); assert.equal(usableBrand('#1D4E89'), '#1D4E89')
})

test('newsletters: the brand colour is used when given, a pale one falls back to the category colour, the saved document accent wins, and the panels are tinted from it', () => {
  const input = (accent: string | null) => ({ templateId: 'employee-of-the-month-standard', title: 'Employee of the month', body: '## Our employee of the month\n\nHelen Thomas.', brand: { name: 'Ferndale', accent }, sentBy: 'Sam' })
  const plain = renderNewsletterHtml(input(null), 'email'), custom = renderNewsletterHtml(input('#1D4E89'), 'email'), pale = renderNewsletterHtml(input('#FFEE99'), 'email')
  assert.ok(!/1D4E89/i.test(plain)); assert.ok(/1D4E89/i.test(custom)); assert.ok(!/FFEE99/i.test(pale)); assert.equal(pale, plain)
  assert.match(custom, /background:#[0-9A-F]{6}/i)   // tinted panels from the accent
  const doc = src('../services/ask-docs/newsletter-design-doc.ts')
  assert.match(doc, /typeof o\.doc\.data\?\.accent === 'string' && o\.doc\.data\.accent \? o\.doc\.data\.accent : \(l\.head\.brandColour \?\? null\)/)   // document accent, then the tenant colour, then (in paletteFor) the category colour
})

test('letters and reports: the colour goes on the header rule and the headings only; body text stays black; with no colour nothing changes', () => {
  const plainHead = toLetterhead(DETAILS, 'Ferndale', null)
  const brandHead = { ...plainHead, brandColour: '#1D4E89' }
  const layout = (h: any) => ({ ...letterLayout(getT('pay-review')!, PAY, h, null), blocks: [{ t: 'h' as const, text: 'Your new rate' }, { t: 'p' as const, text: 'Your pay changes.' }] })
  const a = layoutToHtml(layout(plainHead)), b = layoutToHtml(layout(brandHead))
  assert.ok(!/1D4E89/i.test(a)); assert.match(a, /<hr>/); assert.match(a, /<h3>/)
  assert.match(b, /<hr style="border-top:2px solid #1D4E89">/); assert.match(b, /<h3 style="color:#1D4E89">/)
  assert.ok(!/<p[^>]*1D4E89/i.test(b)); assert.equal(layoutToHtml(layout({ ...plainHead, brandColour: '#FFEE99' })), a)   // a pale or old colour is ignored
})

test('PDF and Word: the colour is on the rule and headings, and the plain output is unchanged', async t => {
  try { require.resolve('pdfkit'); require.resolve('docx') } catch { t.skip('pdfkit or docx is not installed here'); return }
  const { renderLayoutPdf } = await import('../services/letters/layout-pdf'), { renderLayoutDocx } = await import('../services/letters/layout-docx')
  const plainHead = toLetterhead(DETAILS, 'Ferndale', null), brandHead = { ...plainHead, brandColour: '#1D4E89' }
  const mk = (h: any) => ({ ...letterLayout(getT('pay-review')!, PAY, h, null), blocks: [{ t: 'h' as const, text: 'Your new rate' }, { t: 'p' as const, text: 'Your pay changes.' }] })
  const p1 = await renderLayoutPdf(mk(plainHead), { compress: false }), p2 = await renderLayoutPdf(mk(brandHead), { compress: false })
  assert.equal(p2.subarray(0, 4).toString(), '%PDF'); assert.ok(p2.toString('latin1').includes('0.114 0.306 0.537 RG') || p2.toString('latin1').includes('0.1137'))   // #1D4E89 as the stroke colour
  assert.ok(!p1.toString('latin1').includes('0.114 0.306 0.537'))
  const JSZip = (await import('jszip')).default
  const files = async (b: Buffer) => { const z = await JSZip.loadAsync(b); let all = ''; for (const n of Object.keys(z.files)) if (/word\/.*\.xml$/.test(n)) all += await z.files[n].async('string'); return all }
  const d1 = await files(await renderLayoutDocx(mk(plainHead))), d2 = await files(await renderLayoutDocx(mk(brandHead)))
  assert.ok(d2.includes('1D4E89')); assert.ok(!d1.includes('1D4E89'))
})

test('emails: the CareStream purple button takes the brand colour; with no colour, or a pale one, the email is unchanged and its structure is untouched', () => {
  const html = '<td bgcolor="#9B52B5" style="background:#9B52B5"><a style="color:#ffffff">Open</a></td>'
  assert.equal(applyBrandAccent(html, '#1D4E89'), '<td bgcolor="#1D4E89" style="background:#1D4E89"><a style="color:#ffffff">Open</a></td>')
  assert.equal(applyBrandAccent(html, null), html); assert.equal(applyBrandAccent(html, '#FFEE99'), html); assert.equal(applyBrandAccent(html, 'nonsense'), html)
  const logo = src('./org-logo.ts'), out = src('../services/email/outbound.ts')
  assert.match(logo, /applyBrandAccent\(applyOrgLogo\(msg\.html, logo\), brand\)/); assert.match(out, /applyBrandAccent\(html, o\.tenantId \? await brandColourForTenant/)
})

test('the column is optional: reading without it gives no colour, and saving says it needs a database update instead of failing', async () => {
  const p: any = prisma, was = p.$queryRawUnsafe
  p.$queryRawUnsafe = async () => { throw new Error('column "brand_colour" does not exist') }
  try { assert.equal(await getBrandColour('t1'), null) } finally { p.$queryRawUnsafe = was }
  const route = src('../routes/letterhead.ts')
  assert.match(route, /brandColumnReady\(\)/); assert.match(route, /needs a database update before it can be saved\. Everything else was saved\./)
  assert.match(route, /if \(brand && !brand\.ok\) \{ err\(res, 'VALIDATION_ERROR', brand\.message, 400\); return \}/)   // a bad colour changes nothing
  assert.match(route, /guard\(req/); assert.match(route, /role === 'admin'/)   // administrators only, as the rest of the letterhead
  const sql = fs.readFileSync(path.join(__dirname, '../../prisma/sql/2026-11-26_brand_colour.sql'), 'utf8')
  assert.match(sql, /add column if not exists brand_colour text/); assert.doesNotMatch(sql, /[–—]/)
})

test('the screen: picker, hex box, swatches, live chip and Clear; no dashes in copy', () => {
  const ui = fs.readFileSync(path.join(__dirname, '../../../web/src/components/admin/settings/letterhead-settings.tsx'), 'utf8')
  for (const w of ['type="color"', 'Suggested colours', 'Sample heading', 'Clear', 'Brand colour', 'brandProblem']) assert.ok(ui.includes(w), w)
  assert.doesNotMatch(ui.slice(ui.indexOf('Brand colour')), /[–—]/)
})
