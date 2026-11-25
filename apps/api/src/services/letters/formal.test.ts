// Tests for the formal letterhead, the Word and PDF output, and personal signatures. Run: npx tsx --test src/services/letters/formal.test.ts
// The PDF and Word tests need pdfkit and the docx package installed; if they are missing they are skipped (the rest still run).

import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { cleanDetails, addressLines, footerLines, missingChecklist, toLetterhead, EMPTY_DETAILS, registeredOfficeLine, type LetterheadDetails } from './letterhead'
import { letterLayout, getTemplate as getT } from './render'
import { layoutToHtml, footerFor, parseBlocks, printable, type LayoutDoc, type SignatureImage } from './layout'
import { cleanSignaturePng, canHaveSignature } from './signatures'
import { withTradingName } from '../ask-docs/render-doc'

const DETAILS: LetterheadDetails = cleanDetails({
  trading_name: 'Ferndale Nursing Home', legal_name: 'Ferndale Care Services Ltd', address_line1: '1 Orchard Lane', town: 'Maidstone', county: 'Kent', postcode: 'ME14 1AA',
  phone: '01622 000000', email: 'office@ferndale.example', website: 'https://www.ferndale.example/', company_number: '12345678', registered_in: 'England and Wales',
  vat_number: 'GB123456789', cqc_provider_id: '1-1234567', cqc_location_id: '1-7654321', ico_number: 'ZB123456', footer_line: 'A member of the Ferndale Group', logo_align: 'left',
})
const COMMON = { recipient_name: 'Aisha Rahman', recipient_role: 'Care Assistant', letter_date: '2026-11-25', service_name: 'Ferndale Nursing Home - Admin', manager_name: 'Sarah Jones', manager_role: 'Registered Manager' }
const PAY = { ...COMMON, effective_date: '2026-12-01', old_rate: 12.71, new_rate: 13.21, reason: 'performance' }
const noDash = (s: string) => !/[–—]/.test(s)

async function png(w: number, h: number, colour = '#222222'): Promise<Buffer> {
  const sharp = (await import('sharp')).default
  return sharp({ create: { width: w, height: h, channels: 4, background: colour } }).png().toBuffer()
}
async function modulesPresent(): Promise<boolean> { try { await import('pdfkit'); await import('docx'); return true } catch { return false } }

test('the details are cleaned, and the address and footer come out as formal lines', () => {
  assert.equal(DETAILS.website, 'www.ferndale.example')
  assert.deepEqual(addressLines(DETAILS), ['1 Orchard Lane', 'Maidstone, Kent', 'ME14 1AA'])
  const f = footerLines(DETAILS)
  assert.ok(f.some(l => /Registered in England and Wales, company number 12345678/.test(l)), 'the registration line')
  assert.ok(f.some(l => l.includes('Registered office: 1 Orchard Lane, Maidstone, Kent, ME14 1AA')), 'the registered office is the address when "same as above" is on')
  assert.ok(f.some(l => l.includes('VAT number GB123456789') && l.includes('CQC provider ID 1-1234567') && l.includes('CQC location ID 1-7654321') && l.includes('ICO registration ZB123456')))
  assert.ok(f.includes('A member of the Ferndale Group'))
  assert.ok(f.every(noDash))
  const other = cleanDetails({ ...DETAILS, registered_office_same: false, registered_office: '9 Head Street, London', registered_in: 'Other', registered_in_other: 'Jersey' })
  assert.equal(registeredOfficeLine(other), '9 Head Street, London')
  assert.ok(footerLines(other).some(l => l.includes('Registered in Jersey, company number 12345678')))
  assert.equal(cleanDetails({ trading_name: '<b>X</b>\u0000' }).trading_name, 'b X /b')   // angle brackets and control characters are removed
})

test('the trading name is used, never the account display name, and nothing breaks when details are missing', () => {
  const head = toLetterhead(DETAILS, 'Ferndale Nursing Home - Admin', null)
  assert.equal(head.name, 'Ferndale Nursing Home')
  assert.equal(toLetterhead(null, 'Ferndale Nursing Home - Admin', null).name, 'Ferndale Nursing Home - Admin')   // falls back, no crash
  assert.deepEqual(toLetterhead(EMPTY_DETAILS, 'X', null).footerLines, [])
  assert.deepEqual(withTradingName({ service_name: 'Ferndale Nursing Home - Admin' }, 'Ferndale Nursing Home - Admin', 'Ferndale Nursing Home'), { service_name: 'Ferndale Nursing Home' })
  assert.deepEqual(withTradingName({}, 'A', 'B'), { service_name: 'B' })
  assert.deepEqual(withTradingName({ service_name: 'Typed by hand' }, 'A', 'B'), { service_name: 'Typed by hand' })   // a name the person typed is kept
})

test('a gentle checklist says what is still to fill in', () => {
  const m = missingChecklist({}, false)
  assert.ok(m.length >= 5 && m.every(x => typeof x === 'string'))
  assert.deepEqual(missingChecklist(DETAILS, true), [])
})

test('a letter becomes one layout; the signature is only present when passed, and the signer replaces the sign off', () => {
  const t = getT('pay-review')!
  const head = toLetterhead(DETAILS, 'Ferndale Nursing Home - Admin', null)
  const plain = letterLayout(t, PAY, head, null)
  assert.equal(plain.kind, 'letter')
  assert.equal(plain.signer?.signature, null)
  assert.equal(plain.signer?.name, 'Sarah Jones')
  const text = [plain.subject, ...plain.blocks.map(b => b.text), plain.closing].join(' ')
  assert.ok(!/\{\{|\}\}/.test(text), 'no unresolved placeholders')
  const sig: SignatureImage = { png: Buffer.from('x'), width: 400, height: 150 }
  const signed = letterLayout(t, PAY, head, { name: 'Len Burgess', role: 'Care Manager', signature: sig })
  assert.equal(signed.signer?.name, 'Len Burgess'); assert.equal(signed.signer?.signature, sig)
  assert.ok(!layoutToHtml(plain, null).includes('Signature'), 'no signature picture unless one was passed')
  assert.ok(layoutToHtml(signed, null).includes('data:image/png;base64'))
})

test('the preview escapes everything', () => {
  const head = toLetterhead({ ...DETAILS, trading_name: '<img src=x onerror=alert(1)>' }, 'A', null)
  const html = layoutToHtml({ kind: 'letter', head, date: '1 Dec', recipient: { name: '<script>x</script>' }, subject: 'S', blocks: [{ t: 'p', text: '<b>hi</b>' }], closing: 'Yours sincerely,', signer: { name: 'N' } }, null)
  assert.ok(!html.includes('<script>') && !html.includes('<img src=x') && !html.includes('<b>hi</b>'))
})

test('reports and newsletters read simple headings and bullets, and the printable filter keeps pounds and curly quotes', () => {
  assert.deepEqual(parseBlocks('## Title\nLine one\nline two\n\n- a\n- b'), [{ t: 'h', text: 'Title' }, { t: 'p', text: 'Line one line two' }, { t: 'li', text: 'a' }, { t: 'li', text: 'b' }])
  assert.equal(printable('£12.71 ’ok’ \u{1F600}'), '£12.71 ’ok’ ')
  assert.deepEqual(footerFor(toLetterhead(DETAILS, 'A', null)).length > 2, true)
})

test('the PDF is a real PDF with the legal footer and the signature on the letter', async t => {
  if (!(await modulesPresent())) return t.skip('pdfkit or docx is not installed here')
  const { renderLayoutPdf } = await import('./layout-pdf')
  const logo = 'data:image/png;base64,' + (await png(300, 100, '#0f766e')).toString('base64')
  const head = toLetterhead(DETAILS, 'A', logo)
  const sigPng = await png(400, 150, '#101010')
  const layout: LayoutDoc = { ...letterLayout(getT('pay-review')!, PAY, head, { name: 'Len Burgess', role: 'Care Manager', signature: { png: sigPng, width: 400, height: 150 } }) }
  const pdf = await renderLayoutPdf(layout, { compress: false })
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-')
  // pdfkit writes standard font text as hex strings; decode them to look for the footer text.
  const raw = pdf.toString('latin1')
  const text = [...raw.matchAll(/<([0-9a-f]{2,})>/gi)].map(m => Buffer.from(m[1], 'hex').toString('latin1')).join('')
  assert.ok(text.includes('Registered in England and Wales, company number 12345678'), 'the registration text is in the PDF')
  assert.ok(text.includes('Ferndale Nursing Home') && text.includes('Len Burgess') && text.includes('Care Manager'))
  const imgs = (raw.match(/\/Subtype \/Image/g) ?? []).length
  const plain = await renderLayoutPdf(letterLayout(getT('pay-review')!, PAY, head, null), { compress: false })
  const plainImgs = (plain.toString('latin1').match(/\/Subtype \/Image/g) ?? []).length
  assert.ok(plainImgs >= 1 && imgs > plainImgs, 'the signature adds a picture beyond the logo')
})

test('the Word file is a valid .docx with the header, footer, text and images', async t => {
  if (!(await modulesPresent())) return t.skip('pdfkit or docx is not installed here')
  const { renderLayoutDocx } = await import('./layout-docx')
  const JSZip = (await import('jszip')).default
  const logo = 'data:image/png;base64,' + (await png(300, 100, '#0f766e')).toString('base64')
  const head = toLetterhead(DETAILS, 'A', logo)
  const buf = await renderLayoutDocx(letterLayout(getT('pay-review')!, PAY, head, { name: 'Len Burgess', role: 'Care Manager', signature: { png: await png(400, 150), width: 400, height: 150 } }))
  assert.equal(buf.subarray(0, 2).toString(), 'PK')
  const zip = await JSZip.loadAsync(buf)
  const names = Object.keys(zip.files)
  assert.ok(names.includes('word/document.xml'))
  const headerNames = names.filter(n => /^word\/header\d*\.xml$/.test(n)); let header: string | undefined; for (const n of headerNames) if ((await zip.file(n)!.async('string')).includes('1 Orchard Lane')) header = n   // the full letterhead is the first page header; later pages have a small running header
  const footer = names.find(n => /^word\/footer\d*\.xml$/.test(n))
  assert.ok(header && footer, 'a header and a footer part')
  const hx = await zip.file(header!)!.async('string'), fx = await zip.file(footer!)!.async('string'), dx = await zip.file('word/document.xml')!.async('string')
  assert.ok(hx.includes('Ferndale Nursing Home') && hx.includes('1 Orchard Lane'), 'the header has the name and address')
  assert.ok(fx.includes('company number 12345678') && fx.includes('Registered office'), 'the footer has the registration text')
  assert.ok(dx.includes('Dear') || dx.includes('Aisha'), 'the body is there')
  assert.ok(dx.includes('Len Burgess') && dx.includes('Care Manager'))
  assert.ok(names.filter(n => n.startsWith('word/media/')).length >= 2, 'the logo and the signature are in the file')
  const centred = await renderLayoutDocx(letterLayout(getT('pay-review')!, PAY, { ...head, logoAlign: 'centre' }, null))
  assert.ok((await JSZip.loadAsync(centred)).file('word/document.xml'))
})

test('reports and newsletters get the same header and footer and a title block (Word and PDF)', async t => {
  if (!(await modulesPresent())) return t.skip('pdfkit or docx is not installed here')
  const { renderLayoutPdf } = await import('./layout-pdf'); const { renderLayoutDocx } = await import('./layout-docx')
  const JSZip = (await import('jszip')).default
  const head = toLetterhead(DETAILS, 'A', null)
  const doc: LayoutDoc = { kind: 'report', head, subject: 'Monthly governance review', date: '1 December 2026', blocks: parseBlocks('## Headline\n- 12 audits\n\nAll good.') }
  assert.equal((await renderLayoutPdf(doc)).subarray(0, 5).toString(), '%PDF-')
  const zip = await JSZip.loadAsync(await renderLayoutDocx(doc))
  assert.ok((await zip.file('word/document.xml')!.async('string')).includes('Monthly governance review'))
  const f = Object.keys(zip.files).find(n => /^word\/footer\d*\.xml$/.test(n))!
  assert.ok((await zip.file(f)!.async('string')).includes('company number 12345678'))
})

test('a signature picture is checked: PNG only, a sensible size, metadata stripped', async () => {
  const good = await png(600, 200)
  const out = await cleanSignaturePng(good)
  assert.equal(out.png.subarray(1, 4).toString(), 'PNG'); assert.ok(out.width <= 1200 && out.height <= 600)
  const big = await cleanSignaturePng(await png(3000, 1000))
  assert.ok(big.width <= 1200 && big.height <= 600, 'scaled down')
  await assert.rejects(() => cleanSignaturePng(Buffer.from('not a png at all, just some text that is long enough to pass the length check'.repeat(3))), /PNG/)
  const tiny = await png(20, 10)
  await assert.rejects(() => cleanSignaturePng(tiny), /too small/)
  await assert.rejects(() => cleanSignaturePng(Buffer.alloc(10)), /empty/)
})

test('only administrators and managers may have a signature', () => {
  assert.equal(canHaveSignature('admin', null), true)
  assert.equal(canHaveSignature('staff', 'Care Manager'), true)
  assert.equal(canHaveSignature('staff', 'Registered Manager'), true)
  assert.equal(canHaveSignature('staff', 'Care Assistant'), false)
})

// ── Source level rules: who may read a signature, and where ──────────────────────────────────────────
const SRC = path.resolve(__dirname, '../..')
function walk(dir: string, out: string[] = []): string[] { for (const e of fs.readdirSync(dir, { withFileTypes: true })) { const p = path.join(dir, e.name); if (e.isDirectory()) walk(p, out); else if (/\.ts$/.test(e.name) && !/\.test\.ts$/.test(e.name)) out.push(p) } return out }
const rel = (f: string) => path.relative(SRC, f)

test('the signatures table is only touched by services/letters/signatures.ts', () => {
  const offenders = walk(SRC).filter(f => /user_signatures/.test(fs.readFileSync(f, 'utf8'))).map(rel).filter(f => f !== 'services/letters/signatures.ts')
  assert.deepEqual(offenders, [])
})

test('a signature picture is only loaded for the signed in person: loadSignatureFor is called in two places, with the caller as the signer', () => {
  const users = walk(SRC).filter(f => /loadSignatureFor\(/.test(fs.readFileSync(f, 'utf8'))).map(rel).sort()
  assert.deepEqual(users, ['routes/signatures.ts', 'services/ask-docs/render-doc.ts', 'services/letters/signatures.ts'].sort())
  const own = fs.readFileSync(path.join(SRC, 'routes/signatures.ts'), 'utf8')
  assert.ok(/loadSignatureFor\(getTenantId\(\), req\.user!\.sub\)/.test(own), 'the image route reads only the caller\'s own picture')
  assert.ok(!/req\.params\.userId[^\n]*loadSignatureFor|loadSignatureFor[^\n]*req\.params/.test(own))
  // the routes pass req.user.sub only when the request asked to sign; never an id from the body, query or params
  for (const f of ['routes/ask.ts', 'routes/ask-docs.ts']) {
    const s = fs.readFileSync(path.join(SRC, f), 'utf8')
    for (const m of s.matchAll(/signerUserId:\s*([^,}\n]+)/g)) assert.ok(/(\?\s*u\s*:\s*null|\?\s*req\.user!\.sub\s*:\s*null)/.test(m[1]), `${f}: ${m[1]}`)
  }
})

test('signatures never reach emails, notifications, the Ask tools or the assistant', () => {
  const banned = /signatures|loadSignatureFor|user_signatures|SignatureImage/
  for (const f of walk(path.join(SRC, 'services/ask'))) assert.ok(!banned.test(fs.readFileSync(f, 'utf8')), `${rel(f)} must not touch signatures`)
  assert.ok(!banned.test(fs.readFileSync(path.join(SRC, 'services/email/outbound.ts'), 'utf8')))
  assert.ok(!banned.test(fs.readFileSync(path.join(SRC, 'routes/notifications.ts'), 'utf8')))
})

test('the signature routes are for the pilot account, administrators and managers; only the owner changes theirs; an admin can only remove', () => {
  const s = fs.readFileSync(path.join(SRC, 'routes/signatures.ts'), 'utf8')
  assert.ok(/askPilotEnabled/.test(s) && /canHaveSignature/.test(s))
  assert.ok(/signaturesRouter\.put\('\/me'/.test(s) && /signaturesRouter\.delete\('\/me'/.test(s))
  assert.ok(!/signaturesRouter\.(put|post|patch)\('\/:userId/.test(s), 'no route saves someone else\'s signature')
  assert.ok(/signature_saved/.test(s) && /signature_deleted/.test(s) && /signature_removed_by_admin/.test(s), 'audited')
  assert.ok(/no-store/.test(s))
})

test('every query on the letterhead and signature tables names the account', () => {
  for (const f of ['services/letters/letterhead.ts', 'services/letters/signatures.ts']) {
    const s = fs.readFileSync(path.join(SRC, f), 'utf8')
    for (const m of s.matchAll(/\$(?:queryRawUnsafe|executeRawUnsafe)\(\s*[`']([^`']+)[`']/g)) {
      const sql = m[1]
      if (/^select 1 from/i.test(sql.trim())) continue
      assert.ok(/tenant_id/.test(sql), `${f}: ${sql.slice(0, 60)}`)
    }
  }
})

test('the new copy has no dashes', () => {
  for (const f of ['services/letters/letterhead.ts', 'services/letters/layout.ts', 'services/letters/layout-pdf.ts', 'services/letters/layout-docx.ts', 'services/letters/signatures.ts', 'routes/letterhead.ts', 'routes/signatures.ts', 'routes/ask-docs.ts']) {
    const s = fs.readFileSync(path.join(SRC, f), 'utf8')
    for (const m of s.matchAll(/'([^'\n]{6,})'/g)) assert.ok(noDash(m[1]), `${f}: ${m[1]}`)
  }
})
