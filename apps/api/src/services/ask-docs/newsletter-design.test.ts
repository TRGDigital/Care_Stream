import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { NEWSLETTER_TEMPLATES } from './newsletter-templates'
import { renderNewsletterHtml, renderNewsletterPdf, sampleBody, sampleDesigns, htmlToText, arrange, readSections, paletteFor, contrast, LOOKS, buildDesign } from './newsletter-design'
import { AGENTS } from '../ask/agents'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
const BRAND = { name: 'Ferndale Nursing Home', contact: ['01234 567890'] }
const EOM = `Hello everyone.\n\n## Our employee of the month\nHelen Thomas is our employee of the month.\n\n## Why they were chosen\n- Kind and calm\n- Helped new starters\n\n## A thank you\nThank you, Helen.\n\n## What colleagues said\n- "She makes every shift easier."\n- "She notices the small things."\n\n## How to nominate next month\nTell your manager by the 20th.\n\n## A little about them\nHelen loves gardening.\n\n## Previous winners\n- 12 starters\n- 8 courses`
const render = (id: string, target: 'web' | 'email' = 'web', extra: any = {}) => renderNewsletterHtml({ templateId: id, title: 'Employee of the month', body: EOM, brand: BRAND, sentBy: 'Len Burgess', monthText: 'November 2026', ...extra }, target)
let pdfkitOk = true
try { require.resolve('pdfkit') } catch { pdfkitOk = false }

test('DESIGN: every one of the 75 templates renders a designed sample for the screen and for email, with no scripts, no web fonts and no external styles', () => {
  assert.equal(NEWSLETTER_TEMPLATES.length, 75)
  for (const t of NEWSLETTER_TEMPLATES) {
    for (const target of ['web', 'email'] as const) {
      const html = renderNewsletterHtml({ templateId: t.id, title: t.type_title, body: sampleBody(t), brand: BRAND, sentBy: 'Your name', sample: true }, target)
      assert.ok(html.length > 1500, t.id)
      assert.ok(html.includes(t.type_title.replace(/&/g, '&amp;')), `${t.id} shows its title`)
      assert.ok(html.includes('SAMPLE'), `${t.id} is marked as a sample`)
      assert.ok(!/<script|javascript:|@import|@font-face|<link|fonts\.googleapis|onerror=|onclick=/i.test(html), `${t.id} ${target} has nothing active or external`)
      assert.ok(!/<img[^>]*\ssrc="https?:/i.test(html), `${t.id} ${target} pulls no picture from another site`)
      for (const sec of t.sections) assert.ok(html.includes(sec.title.replace(/&/g, '&amp;').replace(/'/g, '&#39;')), `${t.id} shows its section "${sec.title}"`)
    }
  }
})

test('DESIGN: no dashes in the words it shows, and email uses tables with inline styles only', () => {
  for (const t of NEWSLETTER_TEMPLATES) {
    const text = htmlToText(renderNewsletterHtml({ templateId: t.id, title: t.type_title, body: sampleBody(t), brand: BRAND, sentBy: 'Your name', sample: true }, 'email'))
    assert.ok(!/[–—]/.test(text) && !/ - /.test(text), `${t.id} has no dashes in its copy`)
  }
  const email = render('employee-of-the-month-detailed', 'email')
  assert.match(email, /<table role="presentation"/); assert.ok(!/<svg/i.test(email), 'email uses glyphs, not svg')
  assert.ok(/style="/.test(email) && !/<style[^>]*>[^<]*\{[^}]*\}[^<]*body\s*\{/.test(email))
})

test('DESIGN: the same draft always gives the same page, and each layout is arranged differently', () => {
  assert.equal(render('employee-of-the-month-standard'), render('employee-of-the-month-standard'))
  const shapes = (id: string) => { const t = NEWSLETTER_TEMPLATES.find(x => x.id === id)!; return arrange(readSections(EOM, t).secs, t.layout).map(r => r.kind) }
  const short = shapes('employee-of-the-month-short'), standard = shapes('employee-of-the-month-standard'), detailed = shapes('employee-of-the-month-detailed')
  assert.ok(short.every(k => k === 'hero' || k === 'full' || k === 'cta'), 'short is one column')
  assert.ok(standard.includes('pair') && standard[0] === 'hero', 'standard is a hero then a grid')
  assert.ok(detailed.includes('quote') && detailed.includes('cta') && detailed.includes('footer') && detailed.includes('pair'), 'detailed adds a pull quote band, a call to action and a footer panel')
  assert.notEqual(render('employee-of-the-month-short'), render('employee-of-the-month-standard')); assert.notEqual(render('employee-of-the-month-standard'), render('employee-of-the-month-detailed'))
  assert.equal(new Set(sampleDesigns('employee-of-the-month', BRAND).map(d => d.html)).size, 3)
})

test('DESIGN: each category has its own look, the brand colour is used only when it reads on white, and every accent is readable', () => {
  const accents = new Set(Object.values(LOOKS).map(l => l.accent)); assert.equal(accents.size, 4)
  for (const l of Object.values(LOOKS)) assert.ok(contrast(l.accent, '#FFFFFF') >= 4.5, `${l.id} accent reads on white`)
  assert.equal(paletteFor(LOOKS['whole-team'], '#0A5C36').accent, '#0A5C36')       // a good brand colour is used
  assert.equal(paletteFor(LOOKS['whole-team'], '#FFEE00').accent, LOOKS['whole-team'].accent)   // too pale to read: the category colour
  assert.equal(paletteFor(LOOKS.culture, 'not a colour').accent, LOOKS.culture.accent)
  assert.match(render('employee-of-the-month-standard', 'web', { brand: { ...BRAND, accent: '#0A5C36' } }), /#0A5C36/i)
  for (const [cat, id] of [['whole-team', 'employee-of-the-month-short'], ['compliance-care', 'safeguarding-reminder-short'], ['rota-pay', 'bank-holiday-cover-short'], ['culture', 'wellbeing-support-short']] as const) {
    const t = NEWSLETTER_TEMPLATES.find(x => x.id === id) ?? NEWSLETTER_TEMPLATES.find(x => x.category === cat)!
    assert.equal(buildDesign({ templateId: t.id, title: 'x', body: sampleBody(t), brand: BRAND }).look.id, cat)
  }
})

test('DESIGN: logo, person photo and the picture slot', () => {
  const logo = 'data:image/png;base64,iVBORw0KGgo='
  const withLogo = render('employee-of-the-month-standard', 'web', { brand: { ...BRAND, logo } })
  assert.match(withLogo, /<img src="data:image\/png[^"]*" alt="Ferndale Nursing Home logo"/)
  assert.match(render('employee-of-the-month-standard'), />Ferndale Nursing Home<\/span>/, 'no logo: the name is the masthead')
  const photo = { dataUrl: 'data:image/jpeg;base64,/9j/4AAQ', name: 'Helen Thomas' }
  const web1 = render('employee-of-the-month-standard', 'web', { photo })
  assert.match(web1, /<img src="data:image\/jpeg[^"]*" alt="Photo of Helen Thomas"/); assert.match(web1, /border-radius:50%/)
  const mail = render('employee-of-the-month-standard', 'email', { photo })
  assert.ok(!mail.includes('data:image/jpeg') && !mail.includes('Photo of'), 'email never carries a photo')
  assert.match(mail, /aria-label="Picture slot for Helen Thomas"[^>]*>HT</, 'email shows initials instead')
  assert.ok(!render('employee-of-the-month-standard').includes('Picture slot'), 'no photo chosen: no picture slot in a real newsletter')
  const sample = sampleDesigns('employee-of-the-month', BRAND)[0].html; assert.match(sample, /Picture slot/, 'a sample shows where the picture goes')
  for (const html of [withLogo, web1, mail, sample]) for (const m of html.match(/<img\b[^>]*>/g) ?? []) assert.match(m, /\balt="/, 'every picture has alt text')
})

test('DESIGN: designed pieces: stat tiles, pull quotes, dates, chips, a button only when it can go somewhere', () => {
  const html = render('employee-of-the-month-detailed')
  assert.match(html, /font-size:30px[^>]*>12</); assert.match(html, /font-style:italic[^>]*>She makes every shift easier\./)
  const noLink = render('employee-of-the-month-detailed'); assert.ok(!/<a href/.test(noLink), 'no button that goes nowhere')
  const hol = NEWSLETTER_TEMPLATES.find(t => t.type === 'holiday-booking' && t.layout === 'standard')!
  const body = `## Booking time off\nBook early.\n\n## How to book\nOpen your hub and choose Holiday.`
  const btn = renderNewsletterHtml({ templateId: hol.id, title: 'Holiday', body, brand: BRAND, links: { holiday: 'https://app.example/chat' } }, 'email')
  assert.ok(btn.includes('href="https://app.example/chat"'), 'How to book gets a real button when the hub link is known'); assert.match(btn, /Book your holiday/)
  assert.ok(!/<a href/.test(renderNewsletterHtml({ templateId: hol.id, title: 'Holiday', body, brand: BRAND }, 'email')), 'without a link there is no button')
  const bday = renderNewsletterHtml({ templateId: 'monthly-update-detailed', title: 'Update', body: '## Birthdays this month\n- Sam, 14 March\n- Priya, 22 March', brand: BRAND }, 'web')
  assert.match(bday, /border-radius:999px[^>]*>Sam, 14 March/)
})

test('PDF: every template makes a designed PDF on the same design', { skip: pdfkitOk ? false : 'pdfkit is not installed here' }, async () => {
  for (const t of NEWSLETTER_TEMPLATES) {
    const buf = await renderNewsletterPdf({ templateId: t.id, title: t.type_title, body: sampleBody(t), brand: BRAND, sentBy: 'Your name', sample: true })
    assert.equal(buf.subarray(0, 5).toString(), '%PDF-', t.id); assert.ok(buf.length > 2500, t.id)
  }
  const eom = await renderNewsletterPdf({ templateId: 'employee-of-the-month-detailed', title: 'Employee of the month', body: EOM, brand: BRAND, sentBy: 'Len', photo: { dataUrl: '', name: 'Helen Thomas' } })
  assert.equal(eom.subarray(0, 5).toString(), '%PDF-')
})

test('WIRING: the PDF, email, hub and agent all use the designed newsletter', () => {
  const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  assert.match(src('render-doc.ts'), /doc\.type === 'newsletter'[\s\S]*designedPdf/); assert.match(src('render-doc.ts'), /designed: true/)
  assert.match(src('share.ts'), /target: 'email'[\s\S]*target: 'web'[\s\S]*emailHtml, hubHtml/)
  assert.match(fs.readFileSync(path.resolve(__dirname, '../email/outbound.ts'), 'utf8'), /opts\.designedHtml \?\? notificationCardHtml/)
  assert.match(fs.readFileSync(path.resolve(__dirname, '../../routes/notifications.ts'), 'utf8'), /newsletters\/\$\{n\.id\}\.html/)
  assert.match(fs.readFileSync(path.resolve(__dirname, '../../routes/notifications.ts'), 'utf8'), /'\/:id\/designed'[\s\S]*mine\(tenantOf\(req\)/)   // only the people it was sent to
  const prompt = AGENTS.find(a => a.id === 'newsletter')!.prompt
  assert.match(prompt, /newsletter-layouts/); assert.match(prompt, /DESIGNED/); assert.match(prompt, /Designed and Text/)
  assert.ok(prompt.trim().endsWith('if a section has no data, leave it out and say so.'), 'the accuracy and tone paragraph is still last')
})

test('WEB: the layout block is read from the agent message and removed from the text', async () => {
  const { parseNewsletterLayouts, withoutLayoutsBlock } = await web('lib/ask-client')
  const text = 'Here are the layouts.\n```newsletter-layouts\ntype: employee-of-the-month\n```\nWhich one?'
  assert.equal(parseNewsletterLayouts(text), 'employee-of-the-month'); assert.ok(!/```/.test(withoutLayoutsBlock(text))); assert.equal(parseNewsletterLayouts('nothing here'), null)
  assert.equal(parseNewsletterLayouts('```newsletter-layouts\ntype: ../../etc\n```'), null)
})
