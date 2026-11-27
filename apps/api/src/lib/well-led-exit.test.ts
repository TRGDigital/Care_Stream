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
  assert.match(src, /watchTopExit\(/)   // the shared rule, not a private one
  assert.match(src, /REPEAT_DAYS = 14/); assert.match(src, /DONE_DAYS = 90/); assert.match(src, /MIN_MS = 8000/)
  assert.match(src, /sess\(SHOWN_SESSION\) \|\| sess\('cs-cap-exit'\) \|\| sess\('cs-exitq'\)/)
  assert.match(src, /sess\('cs-cap-exit', true\)/)
  assert.match(web('components/marketing/capture-overlay.tsx'), /__csWlExit\) return/)
  assert.match(web('components/marketing/capture-overlay.tsx'), /watchTopExit\(/)   // the email capture exit uses the same rule
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

test('EXIT INTENT: a fast real mouse stops reporting well below the edge, and the rule still catches it', async () => {
  const { isTopExit, watchTopExit, TOP_EDGE_PX, UP_ZONE_PX } = await import('../../../web/src/lib/exit-intent')
  assert.equal(isTopExit(0, false), true); assert.equal(isTopExit(TOP_EDGE_PX, false), true)
  assert.equal(isTopExit(60, true), true)                  // moving up fast, last seen 60px down
  assert.equal(isTopExit(UP_ZONE_PX, true), true)
  assert.equal(isTopExit(60, false), false)                // not moving up: not an exit
  assert.equal(isTopExit(UP_ZONE_PX + 1, true), false)     // too far down to be heading for the tabs
  // the real wiring, with a stub document
  const handlers: Record<string, Array<(e: any) => void>> = {}
  const on = (k: string) => (n: string, f: any) => { (handlers[k + n] ||= []).push(f) }
  ;(globalThis as any).document = { addEventListener: on('d:'), removeEventListener: () => {}, documentElement: { addEventListener: on('h:'), removeEventListener: () => {} } }
  let fired = 0
  const stop = watchTopExit(() => { fired++ })
  const fire = (k: string, e: any) => (handlers[k] || []).forEach(f => f(e))
  fire('d:mousemove', { clientY: 400 }); fire('d:mousemove', { clientY: 250 }); fire('d:mousemove', { clientY: 90 })
  fire('d:mouseout', { clientY: 90, relatedTarget: null }); assert.equal(fired, 1, 'a fast upward exit stopping at 90px')
  fire('d:mouseout', { clientY: 90, relatedTarget: {} }); assert.equal(fired, 1, 'moving onto another element is not leaving')
  fire('d:mousemove', { clientY: 90 }); fire('d:mousemove', { clientY: 200 })
  fire('d:mouseout', { clientY: 90, relatedTarget: null }); assert.equal(fired, 1, 'moving down is not an exit')
  fire('h:mouseleave', { clientY: -2, relatedTarget: null }); assert.equal(fired, 2, 'the page edge leave also counts')
  stop()
})
