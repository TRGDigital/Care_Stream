// The newsletter editor in the Ask panel: colours (overall and per block) and the blocks a tenant adds, moves, copies or deletes. Plain code, no database, no model.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { renderNewsletterHtml, renderNewsletterPdf, sampleBody, contrast, LOOKS, htmlToText, boldDesign, buildDesign, type CustomIn } from './newsletter-design'
import { NEWSLETTER_TEMPLATES, newsletterTemplate } from './newsletter-templates'
import { PALETTES, usablePalettes, validateAccent, cleanContent, applyOp, listItems, isHttps, MAX_CUSTOM, BLOCK_TYPES, BLOCK_IMAGE_ID, type EditState } from './newsletter-edit'
import { customBlocksOf } from './newsletter-design-doc'
import { AGENTS } from '../ask/agents'
import { toolAllowed } from '../ask/manager-access'
import { NEWSLETTER_TOOLS, lintForTemplate } from '../ask/newsletter-tools'
import { NEXT_ACTIONS } from '../../../../web/src/lib/ask-blocks'

const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')
let pdfkitOk = true
try { require.resolve('pdfkit') } catch { pdfkitOk = false }

const BODY = `Hello everyone.\n\n## Our employee of the month\nHelen Thomas is our employee of the month.\n\n## Why they were chosen\n- Kind and calm\n- Helped new starters\n\n## A thank you\nThank you, Helen.\n\n## How to nominate next month\nTell your manager by the 20th.`
const BRAND = { name: 'Ferndale Nursing Home', contact: ['01234 567890'] }
const state = (data: any = {}): EditState => ({ body: BODY, data })
const PNG = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa.png'
const SAMPLE_CUSTOM: Record<string, any> = {
  text: { heading: 'Summer fair', text: 'Join us on 14 June.\n\nBring a friend.' },
  picture_text: { heading: 'The team', text: 'A picture from last year.', alt: 'The team at the summer fair', image_id: PNG, side: 'left' },
  quote: { text: 'Best job I have had.', who: 'A colleague' },
  callout: { title: 'Fire drill', text: 'Thursday at 10am.', icon: 'megaphone' },
  button: { label: 'Open the hub', kind: 'hub' },
  numbers: { heading: '', items: [{ n: '12', label: 'new starters' }, { n: '8', label: 'courses' }] },
  list: { heading: 'Bring', style: 'ticks', items: ['A hat', 'A friend'] },
  dates: { heading: 'Diary', rows: [{ date: 'Monday 8 December', what: 'Team meeting' }, { date: 'Friday 19 December', what: 'Christmas lunch' }] },
}
const withAll = (): CustomIn[] => Object.entries(SAMPLE_CUSTOM).map(([type, content], i) => ({ id: `c${i + 1}`, type: type as any, after: i === 0 ? null : `c${i}`, content }))

test('COLOURS: every ready made palette reads on white, there are 6 to 8 of them, and the safety net keeps them all', () => {
  assert.ok(PALETTES.length >= 6 && PALETTES.length <= 8)
  for (const p of PALETTES) assert.ok(contrast(p.accent, '#FFFFFF') >= 4.5, `${p.label} reads on white`)
  assert.equal(usablePalettes().length, PALETTES.length)
  assert.equal(new Set(PALETTES.map(p => p.id)).size, PALETTES.length)
})

test('COLOURS: a pale colour is refused with a plain message, a short hex is made six digits, empty means the default', () => {
  const pale = validateAccent('#FFE08A'); assert.equal(pale.ok, false); assert.match((pale as any).message, /too pale/)
  assert.deepEqual(validateAccent('#036'), { ok: true, value: '#003366' })
  assert.deepEqual(validateAccent('1d4e89'), { ok: true, value: '#1D4E89' })
  assert.deepEqual(validateAccent(''), { ok: true, value: null })
  assert.equal(validateAccent('blue').ok, false); assert.equal(validateAccent('javascript:alert(1)').ok, false)
  const r = applyOp(state(), { op: 'accent', accent: '#036' }) as any; assert.equal(r.state.data.accent, '#003366')
  assert.equal(applyOp(state(), { op: 'accent', accent: '#FFE08A' }).ok, false)
  const set = applyOp(state(), { op: 'accent', accent: '#1D4E89' }) as any, reset = applyOp(set.state, { op: 'accent', accent: null }) as any
  assert.equal(set.state.data.accent, '#1D4E89'); assert.equal('accent' in reset.state.data, false)
})

test('COLOURS: the chosen colour is the one the design uses, and the saved order is document colour, then brand colour, then the category colour', () => {
  const html = (accent: string | null) => renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: { ...BRAND, accent }, monthText: 'November 2026' }, 'web')
  assert.ok(html('#1D4E89').includes('#1D4E89')); assert.ok(!html(null).includes('#1D4E89'))
  assert.ok(html(null).includes(LOOKS['whole-team'].accent))
  const doc = src('newsletter-design-doc.ts'); assert.match(doc, /typeof o\.doc\.data\?\.accent === 'string' && o\.doc\.data\.accent \? o\.doc\.data\.accent : \(l\.head\.brandColour \?\? null\)/)
})

test('BLOCK COLOURS: soft, bold, outline and none change the one block only, in the page and the email', () => {
  const base = renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, monthText: 'November 2026' }, 'email')
  const styled = (style: string, target: 'web' | 'email' = 'email') => renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, monthText: 'November 2026', styles: { 's-a-thank-you': style } }, target)
  const accent = LOOKS['whole-team'].accent
  const bold = styled('bold')
  assert.notEqual(bold, base)
  assert.ok(bold.includes(`background:${accent};border:1px solid ${accent}`), 'the bold block sits on the accent colour')
  const outline = styled('outline'); assert.ok(outline.includes(`border:2px solid ${accent}`))
  assert.notEqual(styled('none'), base); assert.notEqual(styled('soft'), base)
  assert.equal(styled('not-a-style'), base, 'an unknown look is ignored')
  // only that block changed: the other sections are drawn the same
  assert.ok(bold.includes('Why they were chosen'))
})

test('BLOCK COLOURS: a bold block always has words that read: white on the accent, for every palette and every category colour', () => {
  for (const c of [...PALETTES.map(p => p.accent), ...Object.values(LOOKS).map(l => l.accent)]) assert.ok(contrast('#FFFFFF', c) >= 4.5, `white on ${c} reads`)
  const d = buildDesign({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND })
  const b = boldDesign(d); assert.equal(b.ink, '#FFFFFF'); assert.equal(b.pal.tint, d.pal.accent)
  const html = renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, styles: { 's-why-they-were-chosen': 'bold' } }, 'web')
  assert.ok(/background:#[0-9A-F]{6};border:1px solid #[0-9A-F]{6}[^>]*>\s*<tr><td[^>]*>.*?color:#FFFFFF/s.test(html), 'a bold block writes its words in white')
})

test('BLOCK COLOURS: a pdf is made with styled blocks, bold included', { skip: !pdfkitOk && 'pdfkit is not installed here' }, async () => {
  const pdf = await renderNewsletterPdf({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, styles: { 's-a-thank-you': 'bold', 's-why-they-were-chosen': 'outline', gift: 'none' } })
  assert.equal(pdf.subarray(0, 4).toString(), '%PDF')
})

test('CUSTOM BLOCKS: all eight kinds are checked, and the reason is plain when one is wrong', () => {
  assert.equal(BLOCK_TYPES.length, 8)
  for (const [type, content] of Object.entries(SAMPLE_CUSTOM)) assert.equal(cleanContent(type, content).ok, true, type)
  const no = (type: string, content: any, re: RegExp) => { const r = cleanContent(type, content); assert.equal(r.ok, false, type); assert.match((r as any).message, re) }
  no('text', { heading: 'x', text: '' }, /Write the text/)
  no('picture_text', { text: 'x', alt: 'a', image_id: '' }, /Add a picture/)
  no('picture_text', { text: 'x', alt: '', image_id: PNG }, /Describe the picture/)
  no('picture_text', { text: 'x', alt: 'a', image_id: '../../etc/passwd' }, /Add a picture/)
  no('quote', { text: '' }, /Write the quote/)
  no('callout', { text: '' }, /Write the words/)
  no('numbers', { items: [{ n: '1', label: 'one' }] }, /at least two/)
  no('numbers', { items: [{ n: '1', label: '' }, { n: '2', label: 'two' }] }, /needs a label/)
  no('list', { items: ['', ' '] }, /at least one item/)
  no('dates', { rows: [{ date: '8 Dec', what: '' }] }, /date and what/)
  no('nonsense', {}, /not a kind of block/)
  assert.equal((cleanContent('numbers', { items: [1, 2, 3, 4, 5].map(n => ({ n: String(n), label: 'x' })) }) as any).content.items.length, 4, 'at most four numbers')
  assert.equal((cleanContent('callout', { text: 'x', icon: 'rocket' }) as any).content.icon, 'megaphone', 'an icon outside the set falls back')
  assert.equal((cleanContent('dates', { rows: [{ date: 'Mon: 8 Dec', what: 'x' }] }) as any).content.rows[0].date, 'Mon 8 Dec', 'a colon in a date is removed')
  assert.ok(BLOCK_IMAGE_ID.test(PNG) && !BLOCK_IMAGE_ID.test('x.svg'))
})

test('CUSTOM BLOCKS: a button opens only an https address or the staff hub, never any other kind of link', () => {
  for (const bad of ['javascript:alert(1)', 'http://example.com', 'data:text/html,hi', '//evil.com', 'https://', 'https://user:pw@x', 'ftp://x.com/a', 'https://a b.com', ' vbscript:x']) assert.equal(cleanContent('button', { label: 'Go', kind: 'url', url: bad }).ok, false, bad)
  assert.equal(cleanContent('button', { label: 'Go', kind: 'url', url: 'https://www.carestreamai.com/chat' }).ok, true)
  assert.equal(isHttps('https://example.com/a?b=1'), true); assert.equal(isHttps('https://example'), false)
  const hub = (links: any) => renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, custom: [{ id: 'c1', type: 'button', after: null, content: { label: 'Open the hub', kind: 'hub' } }], links }, 'email')
  assert.ok(hub({ hub: 'https://www.carestreamai.com/chat' }).includes('href="https://www.carestreamai.com/chat"'))
  assert.ok(!/<a [^>]*href="(?!https:)/.test(hub({ hub: 'javascript:alert(1)' })), 'a hub address that is not https is never linked')
  const url = renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, custom: [{ id: 'c1', type: 'button', after: null, content: { label: 'Go', kind: 'url', url: 'javascript:alert(1)' } }] }, 'web')
  assert.ok(!/javascript:/i.test(url), 'even a stored bad address is dropped when drawn')
})

test('CUSTOM BLOCKS: add, edit, copy, move and delete keep the order, the text and the looks together', () => {
  let r = applyOp(state(), { op: 'add', type: 'text', content: SAMPLE_CUSTOM.text, after: 's-why-they-were-chosen' }) as any
  assert.equal(r.ok, true); assert.equal(r.id, 'c1')
  assert.deepEqual(listItems(r.state.body, r.state.data).map(i => i.id), ['s-our-employee-of-the-month', 's-why-they-were-chosen', 'c1', 's-a-thank-you', 's-how-to-nominate-next-month'])
  r = applyOp(r.state, { op: 'add', type: 'quote', content: SAMPLE_CUSTOM.quote, after: null }) as any
  assert.equal(listItems(r.state.body, r.state.data)[0].id, 'c2', 'after nothing means the very top')
  r = applyOp(r.state, { op: 'move', id: 'c1', dir: 'down' }) as any
  assert.deepEqual(listItems(r.state.body, r.state.data).map(i => i.id), ['c2', 's-our-employee-of-the-month', 's-why-they-were-chosen', 's-a-thank-you', 'c1', 's-how-to-nominate-next-month'])
  r = applyOp(r.state, { op: 'move', id: 's-a-thank-you', dir: 'up' }) as any   // a template section moves too, and the body text is rewritten
  assert.ok(r.state.body.indexOf('## A thank you') < r.state.body.indexOf('## Why they were chosen'))
  r = applyOp(r.state, { op: 'update', id: 'c1', content: { heading: 'Fair', text: 'New words.' } }) as any
  assert.equal(r.state.data.custom_blocks.find((c: any) => c.id === 'c1').content.text, 'New words.')
  r = applyOp(r.state, { op: 'style', id: 'c1', style: 'bold' }) as any
  r = applyOp(r.state, { op: 'duplicate', id: 'c1' }) as any
  assert.equal(r.state.data.block_styles.c3, 'bold', 'a copy keeps the look')
  const ids = listItems(r.state.body, r.state.data).map(i => i.id); assert.equal(ids[ids.indexOf('c1') + 1], 'c3', 'the copy sits right after')
  r = applyOp(r.state, { op: 'delete', id: 'c1' }) as any
  assert.ok(!('c1' in (r.state.data.block_styles ?? {})) && !listItems(r.state.body, r.state.data).some(i => i.id === 'c1'))
  r = applyOp(r.state, { op: 'delete', id: 's-a-thank-you' }) as any   // deleting a template section removes it from the words as well
  assert.ok(!r.state.body.includes('A thank you')); assert.ok(r.state.body.includes('## Our employee of the month'))
  assert.equal(applyOp(r.state, { op: 'delete', id: 'nope' }).ok, false); assert.equal(applyOp(r.state, { op: 'move', id: 'nope', dir: 'up' }).ok, false)
})

test('CUSTOM BLOCKS: editing a section keeps its look when its heading changes, and a block can never be the last one removed', () => {
  let r = applyOp(state(), { op: 'style', id: 's-a-thank-you', style: 'bold' }) as any
  r = applyOp(r.state, { op: 'add', type: 'text', content: SAMPLE_CUSTOM.text, after: 's-a-thank-you' }) as any
  r = applyOp(r.state, { op: 'update_section', id: 's-a-thank-you', title: 'Many thanks', text: 'Thank you all.\n- One\n- Two' }) as any
  assert.equal(r.ok, true); assert.equal(r.id, 's-many-thanks')
  assert.equal(r.state.data.block_styles['s-many-thanks'], 'bold'); assert.equal('s-a-thank-you' in r.state.data.block_styles, false)
  assert.equal(r.state.data.custom_blocks[0].after, 's-many-thanks', 'a block that followed it follows it still')
  assert.ok(r.state.body.includes('## Many thanks\nThank you all.\n- One\n- Two'))
  assert.equal(applyOp(r.state, { op: 'update_section', id: 's-many-thanks', title: '  ' }).ok, false)
  assert.equal(applyOp({ body: '## Only\nWords here.', data: {} }, { op: 'delete', id: 's-only' }).ok, false)
})

test('CUSTOM BLOCKS: the number of blocks of your own is limited, and a block that follows a deleted block is not lost', () => {
  let s = state(); for (let i = 0; i < MAX_CUSTOM; i++) s = (applyOp(s, { op: 'add', type: 'text', content: { text: `Block ${i}` }, after: null }) as any).state
  const over = applyOp(s, { op: 'add', type: 'text', content: { text: 'one more' }, after: null }); assert.equal(over.ok, false); assert.match((over as any).message, /up to 12/)
  const orphan = listItems(BODY, { custom_blocks: [{ id: 'c1', type: 'text', after: 'gone', content: SAMPLE_CUSTOM.text }] })
  assert.ok(orphan.some(i => i.id === 'c1'), 'a block whose place has gone is kept, at the end')
})

test('RENDER: all eight kinds of block draw in the short, standard and detailed layouts, on screen and in email, with nothing active', () => {
  const layouts = ['employee-of-the-month-short', 'employee-of-the-month-standard', 'employee-of-the-month-detailed']
  for (const id of layouts) for (const target of ['web', 'email'] as const) {
    const html = renderNewsletterHtml({ templateId: id, title: 'T', body: BODY, brand: BRAND, custom: withAll(), links: { hub: 'https://www.carestreamai.com/chat' }, customImages: { c2: { dataUrl: 'data:image/png;base64,iVBORw0KGgo=' } } }, target)
    const text = htmlToText(html)
    for (const needle of ['Summer fair', 'Join us on 14 June.', 'Bring a friend.', 'The team', 'Best job I have had.', 'A colleague', 'Fire drill', 'Thursday at 10am.', 'Open the hub', 'new starters', 'A hat', 'Monday 8 December', 'Christmas lunch']) assert.ok(text.includes(needle), `${id} ${target} shows "${needle}"`)
    assert.ok(!/<script|javascript:|onerror=|onclick=|@import|@font-face|<link/i.test(html), `${id} ${target} is safe`)
    assert.ok(!/<img[^>]*\ssrc="https?:/i.test(html), 'no picture from another site')
    if (target === 'email') { assert.ok(!/<img[^>]*src="data:/i.test(html), 'email carries no picture of yours'); assert.ok(text.includes('The picture is in the hub and the PDF.')) }
    else { assert.ok(/<img[^>]*src="data:image\/png[^>]*alt="The team at the summer fair"/.test(html), 'the picture block shows with its description') }
  }
  // the order: block c1 (after nothing) comes before the first template section
  const html = renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, custom: withAll() }, 'web')
  assert.ok(html.indexOf('Summer fair') < html.indexOf('Our employee of the month'))
})

test('RENDER: layouts differ, drafts without any new data are drawn exactly as before, and an unknown block type is left out', () => {
  const plain = (extra: any = {}) => renderNewsletterHtml({ templateId: 'employee-of-the-month-standard', title: 'T', body: BODY, brand: BRAND, monthText: 'November 2026', ...extra }, 'web')
  assert.equal(plain({ custom: [], styles: {}, customImages: {} }), plain())
  assert.equal(plain({ custom: undefined, styles: undefined }), plain())
  assert.equal(customBlocksOf({ custom_blocks: [{ id: 'c1', type: 'script', after: null, content: { text: 'x' } }, { id: 'zz', type: 'text', content: { text: 'x' } }, { id: 'c2', type: 'text', after: null, content: { text: 'ok' } }] }).length, 1)
  assert.equal(customBlocksOf({ custom_blocks: [{ id: 'c1', type: 'button', after: null, content: { label: 'x', kind: 'url', url: 'javascript:1' } }] }).length, 0, 'a stored bad block is not drawn')
  assert.equal(customBlocksOf(undefined).length, 0)
  const a = renderNewsletterHtml({ templateId: 'employee-of-the-month-short', title: 'T', body: BODY, brand: BRAND, custom: withAll() }, 'web'), b = renderNewsletterHtml({ templateId: 'employee-of-the-month-detailed', title: 'T', body: BODY, brand: BRAND, custom: withAll() }, 'web')
  assert.notEqual(a, b)
})

test('RENDER: a pdf is made with every kind of block, in every layout', { skip: !pdfkitOk && 'pdfkit is not installed here' }, async () => {
  const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==', 'base64')
  for (const id of ['employee-of-the-month-short', 'employee-of-the-month-standard', 'employee-of-the-month-detailed']) {
    const pdf = await renderNewsletterPdf({ templateId: id, title: 'T', body: BODY, brand: BRAND, custom: withAll(), links: { hub: 'https://www.carestreamai.com/chat' }, customImages: { c2: { dataUrl: '', buffer: png } }, styles: { c1: 'bold', c3: 'outline', c6: 'none' } })
    assert.equal(pdf.subarray(0, 4).toString(), '%PDF', id); assert.ok(pdf.length > 4000)
  }
})

test('RULES: the words of a block go through the newsletter house rules, and nothing in the screen text uses a dash', async () => {
  assert.ok((await lintForTemplate('We pay £12 an hour', 'employee-of-the-month-standard')).length > 0, 'pay figures are refused')
  assert.ok((await lintForTemplate('Aged 34 and best in class', 'employee-of-the-month-standard')).length > 0, 'ages and superlatives are refused')
  assert.ok((await lintForTemplate('A day out on Friday', 'employee-of-the-month-standard')).length === 0)
  const route = src('../../routes/ask-docs.ts'); assert.match(route, /lintForTemplate\(r\.texts/)
  const ui = webSrc('components/ask/newsletter-editor.tsx'); assert.ok(!/[–—]/.test(ui), 'no dashes in the editor')
})

test('AGENT: the two tools exist, only for administrators, the newsletter agent has them, and the prompt says when to use them', () => {
  for (const n of ['set_newsletter_style', 'add_newsletter_block']) {
    assert.ok(NEWSLETTER_TOOLS.some(t => t.name === n), n)
    assert.equal(toolAllowed('manager', false, n), false, `${n} stays administrator only`); assert.equal(toolAllowed('manager', true, n), false)
    assert.equal(toolAllowed('admin', false, n), true)
  }
  const a = AGENTS.find(x => x.id === 'newsletter')!
  assert.ok(a.tools.includes('set_newsletter_style') && a.tools.includes('add_newsletter_block'))
  assert.match(a.prompt, /set_newsletter_style/); assert.match(a.prompt, /add_newsletter_block/); assert.match(a.prompt, /Change colours/)
  const t = src('../ask/newsletter-tools.ts'); assert.match(t, /canEdit\(d as any, ctx\.userId\)/); assert.match(t, /picture cannot be added from the chat/)
  assert.match(t, /make it blue[\s\S]*ocean/)
})

test('AGENT: the tools use the same checks as the panel, so a pale colour or a bad link is refused the same way', () => {
  const t = src('../ask/newsletter-tools.ts')
  assert.match(t, /applyOp\(state, op\)/); assert.match(t, /applyOp\(\{ body: d\.body as string/)
  assert.equal(applyOp(state(), { op: 'accent', accent: PALETTES.find(p => p.id === 'ocean')!.accent }).ok, true)
  assert.equal(applyOp(state(), { op: 'add', type: 'button', content: { label: 'Go', kind: 'url', url: 'http://x.com' } }).ok, false)
})

test('PANEL: the editor is in the document panel, saves each change, shows the reason when refused, and the next step buttons can open it', () => {
  const panel = webSrc('components/ask/document-panel.tsx'); assert.match(panel, /<NewsletterEditor token=\{token\} docId=\{d\.id\}/); assert.match(panel, /focus=\{focus\}/)
  const ed = webSrc('components/ask/newsletter-editor.tsx')
  for (const w of ['Colours', 'Blocks', 'Add a block here', 'Brand colour', 'Category colour', 'Reset to default', 'Reset all blocks', 'Your own colour', 'Move ', 'Copy', 'Delete', 'Describe the picture']) assert.ok(ed.includes(w), w)
  assert.match(ed, /newsletterOp\(token, docId, \{ op: 'accent'/); assert.match(ed, /role="alert"/)
  assert.ok(!/overflow-y-auto|overflow-auto|overflow-scroll/.test(ed), 'the editor adds no scroll bars')
  assert.ok((NEXT_ACTIONS as readonly string[]).includes('colours') && (NEXT_ACTIONS as readonly string[]).includes('add_block'))
  const ov = webSrc('components/ask/ask-overlay.tsx'); assert.match(ov, /action === 'colours' \|\| action === 'add_block'/)
  const rules = src('../ask/house-rules-forms.ts'); assert.match(rules, /colours \(opens the newsletter's Colours control\)/)
  const cli = webSrc('lib/ask-client.ts'); assert.match(cli, /newsletterEdit:/); assert.match(cli, /blockImage:/)
})

test('ROUTES: reading and changing need the draft to be editable, the picture upload checks the real bytes, and every change is audited without content', () => {
  const r = src('../../routes/ask-docs.ts')
  assert.match(r, /askDocsRouter\.get\('\/:id\/newsletter-edit'/); assert.match(r, /askDocsRouter\.post\('\/:id\/newsletter-edit'/); assert.match(r, /askDocsRouter\.post\('\/block-image', giftImageMiddleware/)
  assert.match(r, /canEdit\(d, u\)[\s\S]{0,200}applyOp|const ed = canEdit\(d, u\)[\s\S]{0,400}const r = applyOp/)
  assert.match(r, /detectGiftImage\(file\.buffer\)[\s\S]{0,400}blockImageKey\(t, image_id\)/)
  assert.match(r, /event_type: 'ask_newsletter_edited'[\s\S]{0,160}metadata: \{ op: op\.op, type:/); assert.ok(!/metadata: \{[^}]*content/.test(r.slice(r.indexOf("'/:id/newsletter-edit'"))), 'no words in the audit log')
  assert.match(src('../../lib/audit.ts'), /'ask_newsletter_edited'/)
  assert.ok(NEWSLETTER_TEMPLATES.length === 75 && !!newsletterTemplate('employee-of-the-month-standard'))
})
