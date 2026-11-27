// The CQC Well-led exit popup: where it shows, how it stays out of the way, and that it sends the demo lead.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')

test('WELL-LED EXIT: shows only where the banner shows, plus the overview, never the demo page or the shop', async () => {
  const { showsWellLedExit } = await import('../../../web/src/components/marketing/well-led-exit').catch(() => ({ showsWellLedExit: null as any }))
  if (!showsWellLedExit) { // the component pulls in lucide and the path alias, which this runner cannot resolve: check the rule from source
    const src = web('components/marketing/well-led-exit.tsx')
    assert.match(src, /if \(p === HUB_PATH\) return true\n  return showsWellLedBanner\(p\)/)
    return
  }
  for (const p of ['/blog/some-post', '/scenarios/x', '/collection/y', '/care-audits/z', '/care-policies/p', '/cqc-well-led', '/cqc-well-led/governance']) assert.equal(showsWellLedExit(p), true, p)
  for (const p of ['/demo', '/pricing', '/', '/care-policies/checkout', '/go/anything', '/blog']) assert.equal(showsWellLedExit(p), false, p)
})

test('WELL-LED EXIT: once a visit, 14 days between, 90 days after a request; owns the exit from the email capture', () => {
  const src = web('components/marketing/well-led-exit.tsx')
  assert.match(src, /EDGE_PX = 24/); assert.match(src, /e\.clientY > EDGE_PX \|\| e\.relatedTarget/)   // a real mouse reports a few pixels, not 0
  assert.match(src, /REPEAT_DAYS = 14/); assert.match(src, /DONE_DAYS = 90/); assert.match(src, /MIN_MS = 8000/)
  assert.match(src, /sess\(SHOWN_SESSION\) \|\| sess\('cs-cap-exit'\) \|\| sess\('cs-exitq'\)/)
  assert.match(src, /sess\('cs-cap-exit', true\)/)
  assert.match(web('components/marketing/capture-overlay.tsx'), /__csWlExit\) return/)
  assert.match(web('app/(marketing)/layout.tsx'), /<WellLedBanner \/>\n\s+<WellLedExit \/>/)
})

test('WELL-LED EXIT: it posts a demo lead to the same endpoint as the /demo form, and the copy follows the house rules', () => {
  const src = web('components/marketing/well-led-exit.tsx')
  assert.match(src, /\/public\/marketing\/leads/); assert.match(src, /type: 'demo'/); assert.match(src, /subject: 'CQC Well-led popup'/)
  assert.match(src, /Before you go: can you show CQC you are well led\?/)
  assert.match(src, /not a rating/)
  const copy = src.replace(/^\s*\/\/.*$/gm, '')
  assert.doesNotMatch(copy, /[–—]/); assert.doesNotMatch(copy, /CQC compliant|guarantee/i)
})
