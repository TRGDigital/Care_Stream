// HOUSE RULE 11, TEXT FORMATTING: bold, italic and underline are real formatting in every output, and the marker characters never show.
// Run: NODE_PATH=/tmp/ac/docxmod/node_modules npx tsx --test src/services/ask-docs/text-formatting.test.ts
import test from 'node:test'
import assert from 'node:assert/strict'
import { parseMarks, stripMarks, marksToHtml, hasMarks } from './inline-marks'
import { renderNewsletterHtml, renderNewsletterPdfFit, htmlToText, readSections } from './newsletter-design'
import { renderNewsletterSheet } from './newsletter-sheet'
import { NEWSLETTER_TEMPLATES, newsletterTemplate, lintNewsletter } from './newsletter-templates'
import { layoutToHtml, type LayoutDoc } from '../letters/layout'
import { toLetterhead, cleanDetails } from '../letters/letterhead'

const brand = { name: 'Ferndale Nursing Home', contact: ['01234 567890'] }
const BODY = '## Our employees of the month\nWe are delighted to announce **Callum Fraser** and **Chloe Bennett**, who were *outstanding* this month and __really__ went the extra mile.\n\n## Why they were chosen\n* Stayed calm and **kind** through a busy week\n- Helped three new starters, <u>every</u> day\n\n## What colleagues said\n- Callum is a *joy* to work with.\n\n## How to nominate\nSpeak to a **manager**. A stray **marker never closes.\n\n**Team Management**'
const input = (templateId = 'employee-of-the-month-standard'): any => ({ templateId, title: 'Employees of the month', body: BODY, brand, sentBy: 'Len Burgess', people: [{ dataUrl: '', name: 'Callum Fraser' }, { dataUrl: '', name: 'Chloe Bennett' }] })

test('MARKS: bold, italic and underline are read; unmatched markers are dropped; a lone star is plain text', () => {
  assert.equal(marksToHtml('A **b** and *i* and _j_ and __u__ and <u>v</u>'), 'A <strong>b</strong> and <em>i</em> and <em>j</em> and <u>u</u> and <u>v</u>')
  assert.equal(stripMarks('Callum **Fraser** *the* __best__'), 'Callum Fraser the best')
  assert.equal(stripMarks('**unclosed name'), 'unclosed name'); assert.equal(stripMarks('also __this'), 'also this')
  assert.equal(stripMarks('5 * 3 and a * b and snake_case_name and £5*2'), '5 * 3 and a * b and snake_case_name and £5*2')
  const nested = parseMarks('**bold and *italic***'); assert.ok(nested.some(r => r.b && r.i && r.text === 'italic')); assert.ok(nested.some(r => r.b && !r.i && /bold and/.test(r.text)))
  assert.equal(marksToHtml('<script>x</script> **a**'), '&lt;script&gt;x&lt;/script&gt; <strong>a</strong>')   // never raw html
  assert.equal(hasMarks('plain'), false); assert.equal(hasMarks('**x**'), true)
})

test('NEWSLETTER: the designed page, the email and the sheet show real bold, italic and underline and no stars', () => {
  for (const target of ['web', 'email'] as const) {
    const html = renderNewsletterHtml(input(), target)
    assert.match(html, /<strong>Callum Fraser<\/strong> and <strong>Chloe Bennett<\/strong>/)
    assert.match(html, /<em>outstanding<\/em>/); assert.match(html, /<u>really<\/u>/); assert.match(html, /<u>every<\/u>/)
    const text = htmlToText(html); assert.doesNotMatch(text, /\*\*|__|<u>/); { const i = text.indexOf('*'); assert.equal(i, -1, `${target}: a star is left: ...${text.slice(Math.max(0, i - 40), i + 40)}`) }
    assert.match(text, /A stray marker never closes\./)   // the unmatched marker is dropped, the words stay
  }
  const sheet = renderNewsletterSheet(input(), { orientation: 'portrait' }); assert.match(sheet, /<strong>Callum Fraser<\/strong>/)
  assert.doesNotMatch(htmlToText(sheet.replace(/<script[\s\S]*?<\/script>/g, '')), /\*/)   // the fit script has maths in it, the page has no stars
})

test('NEWSLETTER: a line that starts with a star or a dash is still a bullet, and bullets keep their marks', () => {
  const { secs } = readSections(BODY, newsletterTemplate('employee-of-the-month-standard')!)
  const li = secs.flatMap((s: any) => s.blocks).filter((b: any) => b.t === 'li').map((b: any) => b.text)
  assert.ok(li.some((t: string) => /Stayed calm and \*\*kind\*\*/.test(t))); assert.ok(li.some((t: string) => /<u>every<\/u>/.test(t)))
  assert.match(renderNewsletterHtml(input(), 'web'), /Stayed calm and <strong>kind<\/strong>/)
})

test('NEWSLETTER: every one of the 75 templates draws marks and leaves no stars', () => {
  for (const t of NEWSLETTER_TEMPLATES) {
    const body = t.sections.map(s => `## ${s.title}\nHello **team**, a *kind* word, __thanks__.`).join('\n\n')
    const html = renderNewsletterHtml({ templateId: t.id, title: t.type_title, body, brand, sentBy: 'A' } as any, 'web')
    assert.match(html, /<strong>team<\/strong>/, t.id); assert.doesNotMatch(htmlToText(html), /\*|__/, t.id)
  }
})

test('PDF: the drawn newsletter uses the bold and oblique fonts for marked words', async t => {
  let ok = true; try { await import('pdfkit') } catch { ok = false }
  if (!ok) return t.skip('pdfkit is not installed here')
  const r = await renderNewsletterPdfFit(input(), null, null, null, {})
  const raw = r.buffer.toString('latin1')
  assert.match(raw, /Helvetica-Bold/); assert.match(raw, /Helvetica-Oblique/)
  assert.doesNotMatch(raw, /\*\*Callum/)
  assert.equal(r.pages, 1)
})

test('LETTERS AND REPORTS: the HTML shows real formatting for the body, list and a heading is plain', () => {
  const head = toLetterhead(cleanDetails({ trading_name: 'Ferndale', address_line1: '1 Orchard Lane', town: 'Maidstone', postcode: 'ME14 1AB' } as any), 'Ferndale', null)
  const d: LayoutDoc = { kind: 'letter', head, date: '2026-11-25', subject: 'Your review', recipient: { name: 'Aisha' }, blocks: [{ t: 'h', text: '**A heading**' }, { t: 'p', text: 'Thank you **Aisha**, this was *excellent* and __noted__.' }, { t: 'li', text: 'A **bold** bullet' }], closing: 'Yours sincerely', signer: { name: 'Len' } }
  const html = layoutToHtml(d, null)
  assert.match(html, /<strong>Aisha<\/strong>/); assert.match(html, /<em>excellent<\/em>/); assert.match(html, /<u>noted<\/u>/); assert.match(html, /<li>A <strong>bold<\/strong> bullet<\/li>/)
  assert.match(html, /<h3[^>]*>A heading<\/h3>/); assert.doesNotMatch(html, /\*/)
})

test('LETTERS: the PDF uses bold and oblique fonts and the Word file has w:b, w:i and w:u runs', async t => {
  let ok = true; try { await import('pdfkit'); await import('docx') } catch { ok = false }
  if (!ok) return t.skip('pdfkit or docx is not installed here')
  const head = toLetterhead(cleanDetails({ trading_name: 'Ferndale', address_line1: '1 Orchard Lane', town: 'Maidstone', postcode: 'ME14 1AB' } as any), 'Ferndale', null)
  const d: LayoutDoc = { kind: 'letter', head, date: '2026-11-25', subject: 'Your review', recipient: { name: 'Aisha' }, blocks: [{ t: 'p', text: 'Thank you **Aisha**, this was *excellent* and __noted__.' }, { t: 'li', text: 'A **bold** bullet' }], closing: 'Yours sincerely', signer: { name: 'Len' } }
  const { renderLayoutPdf } = await import('../letters/layout-pdf'); const { renderLayoutDocx } = await import('../letters/layout-docx')
  const pdf = (await renderLayoutPdf(d, { compress: false })).toString('latin1')
  assert.match(pdf, /Helvetica-Bold/); assert.match(pdf, /Helvetica-Oblique/); assert.doesNotMatch(pdf, /\*\*Aisha|__noted/)
  const JSZip = (await import('jszip')).default
  const zip = await JSZip.loadAsync(await renderLayoutDocx(d)); const xml = await zip.file('word/document.xml')!.async('string')
  assert.match(xml, /<w:b\/>[\s\S]*Aisha/); assert.match(xml, /<w:i\/>[\s\S]*excellent/); assert.match(xml, /<w:u [^>]*\/>[\s\S]*noted/)
  assert.doesNotMatch(xml, /\*\*|__noted/)
})

test('LINT AND TEXT: marks are not words (a dash inside a mark is still refused), and notifications drop stray marks', async () => {
  assert.deepEqual(lintNewsletter('We are **delighted** to say thank you, *really*'), [])
  assert.match(lintNewsletter('**Well done – all**')[0], /dash/)
  assert.match(lintNewsletter('She is **outstanding**')[0], /superlative/)
  assert.equal(stripMarks('**Title** of *it*'), 'Title of it')
})
