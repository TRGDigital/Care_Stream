import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))
const webSrc = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../web/src', f), 'utf8')

test('VIEWER: zoom stays between 50% and 300% in steps of 25%', async () => {
  const L = await web('lib/expand-viewer-logic')
  assert.equal(L.clampZoom(0.1), 0.5); assert.equal(L.clampZoom(9), 3); assert.equal(L.clampZoom(NaN), 1); assert.equal(L.clampZoom(1.234), 1.23)
  assert.equal(L.zoomIn(1), 1.25); assert.equal(L.zoomOut(1), 0.75)
  let z = 1; for (let i = 0; i < 30; i++) z = L.zoomIn(z); assert.equal(z, 3); assert.equal(L.canZoomIn(z), false); assert.equal(L.canZoomOut(z), true)
  for (let i = 0; i < 30; i++) z = L.zoomOut(z); assert.equal(z, 0.5); assert.equal(L.canZoomOut(z), false); assert.equal(L.canZoomIn(z), true)
  assert.equal(L.zoomLabel(1.25), '125%')
})

test('VIEWER: pages step and stop at the ends, with Previous and Next switched off there', async () => {
  const L = await web('lib/expand-viewer-logic')
  assert.equal(L.stepPage(0, 3, -1), 0); assert.equal(L.stepPage(0, 3, 1), 1); assert.equal(L.stepPage(2, 3, 1), 2); assert.equal(L.clampPage(9, 3), 2); assert.equal(L.clampPage(-4, 3), 0); assert.equal(L.clampPage(1, 0), 0)
  assert.equal(L.hasPrev(0), false); assert.equal(L.hasPrev(1), true); assert.equal(L.hasNext(2, 3), false); assert.equal(L.hasNext(1, 3), true)
  assert.equal(L.pageLabel(1, 4), 'Page 2 of 4'); assert.equal(L.pageLabel(0, 0), 'Page 1 of 1')
})

test('VIEWER: a page is scaled to fit the box and never enlarged past its own size', async () => {
  const L = await web('lib/expand-viewer-logic')
  assert.equal(L.fitScale(640, 2000, 1000, 800), 0.4); assert.equal(L.fitScale(640, 400, 1000, 800), 1); assert.equal(L.fitScale(1000, 500, 500, 800), 0.5)
  assert.equal(L.fitScale(0, 100, 100, 100), 1); assert.equal(L.fitScale(100, 100, 0, 0), 1)
})

test('VIEWER: Escape closes, the arrows step pages, plus and minus zoom, and Enter or Space opens a thumbnail', async () => {
  const L = await web('lib/expand-viewer-logic')
  assert.equal(L.viewerKey('Escape', { pages: 3, page: 1 }), 'close'); assert.equal(L.viewerKey('ArrowRight', { pages: 3, page: 1 }), 'next'); assert.equal(L.viewerKey('ArrowLeft', { pages: 3, page: 1 }), 'prev')
  assert.equal(L.viewerKey('ArrowLeft', { pages: 3, page: 0 }), null); assert.equal(L.viewerKey('ArrowRight', { pages: 3, page: 2 }), null)
  assert.equal(L.viewerKey('+', { pages: 1, page: 0 }), 'zoomIn'); assert.equal(L.viewerKey('-', { pages: 1, page: 0 }), 'zoomOut'); assert.equal(L.viewerKey('0', { pages: 1, page: 0 }), 'reset'); assert.equal(L.viewerKey('x', { pages: 1, page: 0 }), null)
  assert.equal(L.isActivateKey('Enter'), true); assert.equal(L.isActivateKey(' '), true); assert.equal(L.isActivateKey('a'), false)
})

test('VIEWER: focus stays inside: Tab wraps at the end, Shift Tab wraps at the start, and focus from outside is brought in', async () => {
  const L = await web('lib/expand-viewer-logic')
  assert.equal(L.trapTab(4, 5, false), 0); assert.equal(L.trapTab(0, 5, true), 4); assert.equal(L.trapTab(2, 5, false), null); assert.equal(L.trapTab(2, 5, true), null)
  assert.equal(L.trapTab(-1, 5, false), 0); assert.equal(L.trapTab(-1, 5, true), 4); assert.equal(L.trapTab(0, 0, false), null)
})

test('VIEWER: one shared component with a dialog, a visible Close, Print, Download, zoom, pages, a switch, focus return and a portal over everything', () => {
  const s = webSrc('components/ask/expand-viewer.tsx')
  assert.match(s, /role="dialog" aria-modal="true" aria-labelledby/); assert.match(s, /aria-label="Close the viewer"[\s\S]{0,200}Close<\/button>|>Close<\/button>/)
  assert.match(s, /returnTo\.current[\s\S]*\.focus\(\)/); assert.match(s, /trapTab\(/); assert.match(s, /createPortal\(/); assert.match(s, /z-\[95\]/); assert.match(s, /fixed inset-0/)
  assert.match(s, /aria-label="Zoom out"/); assert.match(s, /aria-label="Zoom in"/); assert.match(s, /aria-label="Previous page"/); assert.match(s, /aria-label="Next page"/)
  assert.match(s, /Print/); assert.match(s, /downloads/); assert.match(s, /switcher/); assert.match(s, /Click to enlarge/); assert.match(s, /isActivateKey\(e\.key\)/); assert.match(s, /no-scrollbar/)
  assert.match(s, /bg-neutral-100\/95/, 'a light backdrop')
  assert.ok(!/bg-black|bg-neutral-900|bg-gray-900|bg-slate-900/.test(s.split('export function useExpandViewer')[0]), 'no dark backdrop')
  assert.ok(Math.max(...[...s.matchAll(/z-\[(\d+)\]/g)].map(m => Number(m[1]))) > 75, 'above the Ask panel (z 75)')
})

test('VIEWER: it is wired to thumbnails, the designed preview, the document panel, the library, tables and the hub', () => {
  assert.match(webSrc('components/ask/layout-thumbs.tsx'), /<Expandable[\s\S]*<ExpandViewer/)
  assert.match(webSrc('components/ask/newsletter-picker.tsx'), /<LayoutThumbs/); assert.match(webSrc('components/ask/ask-overlay.tsx'), /<LayoutThumbs/)
  const dp = webSrc('components/ask/document-panel.tsx'); assert.match(dp, /<Expandable/); assert.match(dp, /<ExpandViewer/); assert.match(dp, /switcher=/); assert.match(dp, /pdf=\{/); assert.match(dp, /Expand<\/button>/)
  assert.match(webSrc('components/ask/ask-overlay.tsx'), /expandDoc\(d\)/); assert.match(webSrc('components/ask/markdown-lite.tsx'), /<Expandable label="A table"/)
  assert.match(webSrc('components/hub/views/notification-detail-view.tsx'), /<Expandable label="The newsletter"/)
})
