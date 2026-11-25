// HOUSE RULE 10, document layout: what you see is what you print; a newsletter is ONE page (portrait or landscape); letters never split a paragraph across pages; Word keeps the same rules.
// The browser tests run only where a Chrome is available (CHROME_EXECUTABLE_PATH, or a normal install); the pdfkit fallback is tested everywhere pdfkit is installed.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { NEWSLETTER_TEMPLATES, newsletterTemplate } from './newsletter-templates'
import { buildDesign, landscapeRows, renderNewsletterHtml, renderNewsletterPdfFit, sampleBody, htmlToText, type DesignInput, type CustomIn } from './newsletter-design'
import { renderNewsletterSheet, FIT_STEPS, MIN_SCALE, PAGE_MM, fitScript, orientationOf } from './newsletter-sheet'
import { applyOp } from './newsletter-edit'
import { pagesModeFor, TooLongError } from './newsletter-design-doc'
import { countPdfPages, embeddedFontCss, pdfEngine } from './pdf-render'
import { renderLayoutPdf, type PlacedBlock } from '../letters/layout-pdf'
import type { LayoutDoc } from '../letters/layout'
import { AGENTS } from '../ask/agents'
import { buildSystemPrompt, __setPromptTestHooks } from '../ask/prompt-register'
import { HOUSE_RULES_SUMMARY } from '../ask/house-rules-forms'

const has = (m: string) => { try { require.resolve(m); return true } catch { return false } }
const PDFKIT = has('pdfkit')
const brand = { name: 'Ferndale Nursing Home', contact: ['01234 567890'] }
const people = ['Helen Thomas', 'Sam Reed', 'Chloe Bennett', 'Callum Fraser'].map(name => ({ dataUrl: '', name }))
const custom: CustomIn[] = [
  { id: 'c1', type: 'text', after: null, content: { heading: 'The summer fair', text: 'Thank you to everyone who came along and helped. We raised money for the garden and the sun even shone for the whole afternoon.' } },
  { id: 'c2', type: 'numbers', after: 'c1', content: { heading: 'The fair in numbers', items: [{ n: '214', label: 'visitors' }, { n: '£860', label: 'raised' }, { n: '31', label: 'helpers' }] } },
  { id: 'c3', type: 'callout', after: 'c2', content: { heading: 'Fire drill on Thursday', text: 'At 10am, as usual. Please stay where you are until you hear the all clear.', icon: 'megaphone' } },
]
const input = (id: string, extras = false): DesignInput => {
  const t = newsletterTemplate(id)!
  return { templateId: t.id, title: t.type_title, body: sampleBody(t), brand, sentBy: 'Len Burgess', sample: true, ...(extras ? { people, gift: { text: 'A £25 voucher each and a day of extra leave' }, custom } : {}) }
}

// ── one layout for screen, print and PDF ─────────────────────────────────────────────────
test('ONE LAYOUT: the screen and the PDF engine are given the very same page; only the embedded fonts differ', () => {
  const a = renderNewsletterSheet(input('employee-of-the-month-standard', true), { orientation: 'portrait' })
  const b = renderNewsletterSheet(input('employee-of-the-month-standard', true), { orientation: 'portrait', fonts: embeddedFontCss() })
  const body = (h: string) => h.slice(h.indexOf('<body>'))
  assert.equal(body(a), body(b))                                   // the same structure, blocks, colours and order
  assert.match(a, /@page\{size:A4 portrait;margin:0\}/)
  assert.match(renderNewsletterSheet(input('monthly-update-standard'), { orientation: 'landscape' }), /@page\{size:A4 landscape;margin:0\}/)
  assert.ok(a.includes(fitScript()))                               // the same fit step runs on screen and in the PDF engine
  assert.equal(orientationOf('landscape'), 'landscape'); assert.equal(orientationOf('sideways'), 'portrait')
})
test('ONE LAYOUT: the order of the blocks is the same in the sheet as in the design, in both orientations', () => {
  for (const o of ['portrait', 'landscape'] as const) {
    const inp = { ...input('employee-of-the-month-detailed', true), orientation: o }
    const d = buildDesign(inp)
    const text = htmlToText(renderNewsletterSheet(inp, { orientation: o }))
    let at = -1
    for (const r of d.rows) for (const c of r.cells) { if (!c.title) continue; const i = text.indexOf(c.title, at + 1); assert.ok(i > at, `${o}: "${c.title}" is out of order`); at = i }
  }
})
test('ONE LAYOUT: a heading that only repeats the newsletter title is shown once', () => {
  const inp: DesignInput = { templateId: 'employee-of-the-month-standard', title: 'Employees of the Month: Callum and Chloe', body: '## Employees of the Month: Callum and Chloe\n\nWe have two employees this month.\n\n## Why they were chosen\n\nThey were brilliant.', brand, people: people.slice(0, 2) }
  const html = renderNewsletterHtml(inp, 'web', { sheet: true })
  assert.equal((html.match(/Employees of the Month: Callum and Chloe/g) ?? []).length, 1)
})
test('LANDSCAPE: after the hero the blocks sit in columns (up to three), and a quote, the call to action and the gift keep their own look', () => {
  const d = buildDesign({ ...input('employee-of-the-month-detailed', true), orientation: 'landscape' })
  assert.ok(d.rows.some(r => r.kind === 'hero'))
  assert.ok(d.rows.some(r => r.kind === 'pair' && r.cells.length === 3))
  assert.ok(d.rows.every(r => r.cells.length <= 3))
  const kinds = d.rows.flatMap(r => r.cellKinds ?? [])
  assert.ok(kinds.includes('quote') || kinds.includes('cta') || kinds.includes('gift'))
  assert.deepEqual(landscapeRows([]).length, 0)
})
test('FIT STEPS: the smallest size keeps body text at 9pt or more, and the steps only ever go down', () => {
  assert.equal(FIT_STEPS[0], 1); assert.ok(MIN_SCALE >= 0.8)
  assert.ok((15 * MIN_SCALE) * 0.75 >= 9 - 0.001)                  // 15px body text at the smallest step, in points
  assert.deepEqual([...FIT_STEPS].sort((a, b) => b - a), FIT_STEPS)
  assert.ok(PAGE_MM.portrait.h < 297 && PAGE_MM.landscape.w <= 297)  // a hair under A4: never a blank second sheet
})

// ── the page controls on the saved newsletter ───────────────────────────────────────────
test('PAGE: orientation and pages are validated; two pages are only for the Detailed layout', () => {
  const st = (id: string) => ({ body: '## A\n\nText', data: { template_id: id } })
  const ok1 = applyOp(st('employee-of-the-month-standard'), { op: 'layout', orientation: 'landscape' }); assert.ok(ok1.ok); assert.equal((ok1 as any).state.data.orientation, 'landscape')
  assert.equal(applyOp(st('employee-of-the-month-standard'), { op: 'layout', orientation: 'sideways' }).ok, false)
  assert.equal(applyOp(st('employee-of-the-month-standard'), { op: 'layout', pages: 'two' }).ok, false)
  assert.match((applyOp(st('employee-of-the-month-standard'), { op: 'layout', pages: 'two' }) as any).message, /Detailed/)
  const two = applyOp(st('employee-of-the-month-detailed'), { op: 'layout', pages: 'two' }); assert.ok(two.ok); assert.equal((two as any).state.data.pages, 'two')
  assert.equal(pagesModeFor({ id: 'x', type: 'newsletter', title: '', body: '', data: { template_id: 'employee-of-the-month-detailed', pages: 'two' } }), 'two')
  assert.equal(pagesModeFor({ id: 'x', type: 'newsletter', title: '', body: '', data: { template_id: 'employee-of-the-month-standard', pages: 'two' } }), 'one')
  const e = new TooLongError({ orientation: 'portrait', canAllowTwoPages: true }); assert.equal(e.code, 'TOO_LONG')
})
test('PAGE: the tool, the panel, the route and the PDF route carry the page choice and the gentle check', () => {
  const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  assert.match(src('../ask/newsletter-tools.ts'), /orientation: \{ type: 'string', enum: \['portrait', 'landscape'\] \}/)
  assert.match(src('../../routes/ask.ts'), /TOO_LONG/); assert.match(src('../../routes/ask.ts'), /req\.query\.orientation/)
  const panel = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/components/ask/document-panel.tsx'), 'utf8')
  for (const k of ['Fits one page', 'Switch to ', 'Shorten it', 'Allow two pages', 'Portrait', 'Landscape', "e.code === 'TOO_LONG'"]) assert.ok(panel.includes(k), `the panel has: ${k}`)
  const viewer = fs.readFileSync(path.resolve(__dirname, '../../../../web/src/components/ask/expand-viewer.tsx'), 'utf8'); assert.match(viewer, /kind: 'sheet'/)
})
test('RULE 10: it is in the shared prompt of EVERY agent, listed as the tenth rule, and the newsletter agent is told about the page', async () => {
  __setPromptTestHooks({ reader: async () => null })
  try {
    for (const a of AGENTS) assert.ok((await buildSystemPrompt(a, '2026-11-26', 'Ferndale', '')).includes('RULE 10, DOCUMENT LAYOUT'), `${a.id} carries rule 10`)
  } finally { __setPromptTestHooks({ reader: null }) }
  assert.equal(HOUSE_RULES_SUMMARY[9].n, 10)
  assert.match(AGENTS.find(a => a.id === 'newsletter')!.prompt, /ONE A4 page/)
})

// ── the pdfkit fallback: one page, in both orientations, for every template ─────────────
test('FALLBACK (pdfkit): every one of the 75 templates is exactly ONE page in portrait and in landscape with the sample content', { skip: !PDFKIT && 'pdfkit is not installed here', timeout: 300000 }, async () => {
  assert.equal(NEWSLETTER_TEMPLATES.length, 75)
  for (const t of NEWSLETTER_TEMPLATES) for (const o of ['portrait', 'landscape'] as const) {
    const r = await renderNewsletterPdfFit({ ...input(t.id), orientation: o })
    assert.equal(r.pages, 1, `${t.id} ${o} is ${r.pages} pages`); assert.ok(r.fits); assert.ok(r.scale >= MIN_SCALE - 1e-9)
    assert.equal(countPdfPages(r.buffer), 1)
  }
})
test('FALLBACK (pdfkit): with two people, a gift and a custom block the short and standard layouts are one page; the rest is one page or SAYS it is too long (never cut, never below the smallest size)', { skip: !PDFKIT && 'pdfkit is not installed here', timeout: 300000 }, async () => {
  const mid = (id: string): DesignInput => ({ ...input(id), people: people.slice(0, 2), gift: { text: 'A £25 voucher each' }, custom: custom.slice(0, 1) })
  for (const t of NEWSLETTER_TEMPLATES.filter(x => /^(employee-of-the-month|staff-stories|recognition)/.test(x.id))) for (const o of ['portrait', 'landscape'] as const) {
    const r = await renderNewsletterPdfFit({ ...mid(t.id), orientation: o })
    assert.ok(r.scale >= MIN_SCALE - 1e-9)
    if (t.layout !== 'detailed') assert.ok(r.fits && r.pages === 1, `${t.id} ${o} should fit one page`)
    else if (r.fits) assert.equal(r.pages, 1); else assert.ok(r.pages > 1)
  }
  // the extreme case (four people, a gift and three custom blocks) is allowed to be too long, but it is always SAID, never cut
  const r = await renderNewsletterPdfFit({ ...input('employee-of-the-month-standard', true), orientation: 'landscape' })
  assert.equal(r.fits, false); assert.ok(r.pages >= 2)
})
test('FALLBACK (pdfkit): an over-long newsletter is flagged and may run to two pages only when two pages are allowed', { skip: !PDFKIT && 'pdfkit is not installed here' }, async () => {
  const long: DesignInput = { ...input('employee-of-the-month-detailed', true), body: sampleBody(newsletterTemplate('employee-of-the-month-detailed')!) + '\n\n## More news\n\n' + 'A long paragraph of news for the team. '.repeat(25) + '\n\n## Even more\n\n' + 'Another long paragraph. '.repeat(25) }
  const one = await renderNewsletterPdfFit(long, null, null, null, { allowTwoPages: false }); assert.equal(one.fits, false); assert.ok(one.pages >= 2)
  const two = await renderNewsletterPdfFit(long, null, null, null, { allowTwoPages: true }); assert.equal(two.fits, true); assert.ok(two.scale === 1)
})
test('FALLBACK (pdfkit): two people sit BESIDE the words in the first card, as on the screen, and the hero does not repeat the title', { skip: !PDFKIT && 'pdfkit is not installed here' }, async () => {
  const inp: DesignInput = { templateId: 'employee-of-the-month-standard', title: 'Employees of the Month: Callum and Chloe', body: '## Employees of the Month: Callum and Chloe\n\nWe are delighted to announce Callum Fraser and Chloe Bennett.\n\n## Why they were chosen\n\nBrilliant.', brand, people: people.slice(0, 2), stamp: 'DRAFT: not yet approved. Do not share.' }
  const r = await renderNewsletterPdfFit(inp); assert.equal(r.pages, 1)
  const src = fs.readFileSync(path.resolve(__dirname, 'newsletter-design.ts'), 'utf8')
  assert.match(src, /twin = d\.people\.length === 2/)
})

// ── letters: never split a paragraph across pages ─────────────────────────────────────
const head: any = { name: 'Ferndale Nursing Home', addressLines: ['12 Orchard Lane', 'Maidstone', 'ME14 1AB'], contactLines: ['01622 000000'], footerLines: ['Registered in England and Wales, number 01234567'], logoDataUrl: null, logoAlign: 'left' }
const words = 'care team resident support shift handover training policy review meeting rota holiday standard quality safe kind respectful dignity'.split(' ')
let seed = 7
const rnd = () => { seed = (seed * 1664525 + 1013904223) % 4294967296; return seed / 4294967296 }
const para = (n: number) => { const out: string[] = []; for (let i = 0; i < n; i++) out.push(words[Math.floor(rnd() * words.length)]); const s = out.join(' '); return s[0].toUpperCase() + s.slice(1) + '.' }
function letter(nParas: number, withHeadings: boolean): LayoutDoc {
  const blocks: LayoutDoc['blocks'] = []
  for (let i = 0; i < nParas; i++) {
    if (withHeadings && i % 3 === 0) blocks.push({ t: 'h', text: `Section ${i / 3 + 1}` })
    blocks.push({ t: i % 7 === 6 ? 'li' : 'p', text: para(30 + Math.floor(rnd() * 150)) })
  }
  return { kind: 'letter', head, date: '26 November 2026', recipient: { name: 'Helen Thomas', role: 'Senior care assistant' }, subject: 'Your annual review', blocks, closing: 'Yours sincerely,', signer: { name: 'Len Burgess', role: 'Registered manager' }, acknowledgement: 'Please sign to say you have read this.' }
}
test('LETTERS: no paragraph is ever split across two pages, a heading stays with what follows, and the letter ends on the page of its last paragraph', { skip: !PDFKIT && 'pdfkit is not installed here', timeout: 300000 }, async () => {
  for (let n = 3; n <= 40; n += 3) {
    const trace: PlacedBlock[] = []
    const buf = await renderLayoutPdf(letter(n, n % 2 === 0), { compress: false, trace })
    const pages = countPdfPages(buf)
    assert.ok(trace.length > 0)
    for (const [i, b] of trace.entries()) {
      if (b.t === 'p' || b.t === 'li') assert.equal(b.startPage, b.endPage, `${n} blocks: a ${b.t} was split across pages (${b.text.slice(0, 30)})`)
      if (b.t === 'h' && trace[i + 1]) assert.equal(b.startPage, trace[i + 1].startPage, `${n}: a heading was left at the bottom of a page`)
    }
    const last = [...trace].reverse().find(b => b.t !== 'h')!
    assert.ok(pages <= last.endPage + 2, `${n}: the sign-off must stay with the last paragraph (letter has ${pages} pages, last paragraph on page ${last.endPage + 1})`)
    if (pages > 1) assert.match(fs.readFileSync(path.resolve(__dirname, '../letters/layout-pdf.ts'), 'utf8'), /Page \$\{i \+ 1\} of \$\{range\.count\}/)   // every page of a longer letter says "Page 2 of 3"
  }
})
test('LETTERS: a paragraph longer than a whole page is the only thing allowed to split', { skip: !PDFKIT && 'pdfkit is not installed here' }, async () => {
  const l = letter(2, false); l.blocks.push({ t: 'p', text: 'Very long paragraph. '.repeat(400) })
  const trace: PlacedBlock[] = []; await renderLayoutPdf(l, { compress: false, trace })
  const big = trace[trace.length - 1]; assert.ok(big.endPage > big.startPage)
  for (const b of trace.slice(0, -1)) assert.equal(b.startPage, b.endPage)
})
test('LETTERS: later pages have a small running header, the letterhead is in full on page one only, and the draft note is in the footer (it moves nothing)', () => {
  const src = fs.readFileSync(path.resolve(__dirname, '../letters/layout-pdf.ts'), 'utf8')
  assert.match(src, /const newPage = \(\) => \{/); assert.match(src, /keepTogether/); assert.match(src, /H - 22/)
  assert.doesNotMatch(src, /text\(printable\(d\.stamp\), M, 14/)
})
test('WORD: paragraphs keep their lines together, headings and the sign-off keep with what follows, table rows do not split, and later pages have the small header', { skip: !has('docx') && 'docx is not installed here', timeout: 120000 }, async () => {
  const { renderLayoutDocx } = await import('../letters/layout-docx')
  const JSZip = (await import('jszip')).default
  const buf = await renderLayoutDocx(letter(12, true))
  const zip = await JSZip.loadAsync(buf)
  const doc = await zip.file('word/document.xml')!.async('string')
  for (const k of ['<w:keepNext', '<w:keepLines', '<w:widowControl', '<w:cantSplit', '<w:titlePg']) assert.ok(doc.includes(k), `Word has ${k}`)
  assert.ok(Object.keys(zip.files).filter(f => /word\/header\d*\.xml/.test(f)).length >= 2)   // the full letterhead (first page) and the running header
})
test('PRINT CSS: the preview of a letter keeps paragraphs, the address and the sign-off together when printed', () => {
  const css = fs.readFileSync(path.resolve(__dirname, '../letters/layout.ts'), 'utf8')
  for (const k of ['break-inside:avoid', 'orphans:3', 'widows:3', 'break-after:avoid', '@page{size:A4']) assert.ok(css.includes(k), `the print rules have ${k}`)
})

// ── the browser engine, where a Chrome is available ───────────────────────────────────
const CHROME = process.env.CHROME_EXECUTABLE_PATH || ['/Applications/Google Chrome.app/Contents/MacOS/Google Chrome', '/usr/bin/google-chrome', '/usr/bin/chromium', '/usr/bin/chromium-browser'].find(p => fs.existsSync(p))
const BROWSER = !!CHROME && has('puppeteer-core')
test('BROWSER: every one of the 75 templates fits ONE page in portrait and in landscape with the sample content, and never below the smallest size', { skip: !BROWSER && 'no Chrome or puppeteer-core here', timeout: 600000 }, async () => {
  const pptr: any = await import('puppeteer-core')
  const browser = await (pptr.launch ? pptr : pptr.default).launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  try {
    const page = await browser.newPage()
    await page.emulateMediaType('print')
    for (const t of NEWSLETTER_TEMPLATES) for (const o of ['portrait', 'landscape'] as const) {
      await page.setViewport(o === 'landscape' ? { width: 1123, height: 794 } : { width: 794, height: 1123 })
      await page.setContent(renderNewsletterSheet({ ...input(t.id), orientation: o }, { orientation: o, fonts: embeddedFontCss() }), { waitUntil: 'load' })
      const fit = await page.evaluate('window.__nlRun()')
      assert.equal(fit.fits, true, `${t.id} ${o}: ${JSON.stringify(fit)}`); assert.equal(fit.pages, 1); assert.ok(fit.scale >= MIN_SCALE - 1e-9)
    }
  } finally { await browser.close() }
})
test('BROWSER: an over-long newsletter is flagged as not fitting (and shown uncut); with two pages allowed it flows to two and nothing is below full size', { skip: !BROWSER && 'no Chrome or puppeteer-core here', timeout: 120000 }, async () => {
  const pptr: any = await import('puppeteer-core')
  const browser = await (pptr.launch ? pptr : pptr.default).launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  try {
    const t = newsletterTemplate('employee-of-the-month-detailed')!
    const long: DesignInput = { ...input(t.id, true), body: sampleBody(t) + '\n\n## More news\n\n' + 'A long paragraph of news for the team. '.repeat(25) + '\n\n## Even more\n\n' + 'Another long paragraph of news. '.repeat(25) }
    const { htmlToPdf } = await import('./pdf-render')
    process.env.CHROME_EXECUTABLE_PATH = CHROME
    const one = await htmlToPdf(renderNewsletterSheet(long, { orientation: 'portrait', pages: 'one' }), { orientation: 'portrait' })
    assert.equal(one.fit!.fits, false); assert.equal(one.fit!.scale, MIN_SCALE)
    const two = await htmlToPdf(renderNewsletterSheet(long, { orientation: 'portrait', pages: 'two' }), { orientation: 'portrait' })
    assert.equal(two.fit!.scale, 1); assert.equal(two.fit!.fits, true); assert.ok(two.pages >= 2 && two.pages <= 3, `two pages mode made ${two.pages}`)
    const ok = await htmlToPdf(renderNewsletterSheet(input(t.id), { orientation: 'landscape' }), { orientation: 'landscape' })
    assert.equal(ok.pages, 1); assert.equal(ok.fit!.fits, true)
    assert.equal(pdfEngine(), 'auto')
  } finally { await browser.close() }
})
