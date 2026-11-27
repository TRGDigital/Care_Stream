// CQC Well-led wording and rules: the right message per page, the banner only where it belongs, every product shown once, and no dashes in the copy.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { topicForPath, showsWellLedBanner, hubHref, STATEMENTS, PRODUCTS, PRODUCT_GROUPS } from '../../../web/src/lib/well-led'

test('WELL-LED: the message follows the page', () => {
  assert.equal(topicForPath('/scenarios/an-inspector-asks-how-you-know-policies-are-followed'), 'gov')
  assert.equal(topicForPath('/scenarios/you-found-a-gap-last-month-can-you-show-what-changed'), 'learn')
  assert.equal(topicForPath('/scenarios/staff-whose-first-language-is-not-english-and-mandatory-training'), 'edi')
  assert.equal(topicForPath('/scenarios/does-every-member-of-staff-know-what-you-are-aiming-for'), 'cult')
  assert.equal(topicForPath('/blog/monthly-care-home-audits'), 'learn')
  assert.equal(topicForPath('/care-policies/safeguarding-adults-policy'), 'gov')
  assert.equal(topicForPath('/blog/something-unrelated'), 'gov')
})

test('WELL-LED: the four statement pages end with the banner, each with its own message', () => {
  for (const [p, t] of [['/cqc-well-led/governance', 'gov'], ['/cqc-well-led/learning', 'learn'], ['/cqc-well-led/inclusion', 'edi'], ['/cqc-well-led/direction', 'cult']] as const) {
    assert.equal(showsWellLedBanner(p), true, p)
    assert.equal(topicForPath(p), t, p)
  }
  assert.equal(showsWellLedBanner('/cqc-well-led'), false)
})

test('WELL-LED: the banner shows on content pages only', () => {
  for (const p of ['/blog/a-post', '/scenarios/a-scenario', '/collection/a-collection', '/care-audits/falls-audit', '/care-policies/safeguarding', '/topics/x/y']) assert.equal(showsWellLedBanner(p), true, p)
  for (const p of ['/', '/blog', '/scenarios', '/pricing', '/cqc-well-led', '/care-policies', '/care-policies/checkout', '/care-policies/thank-you', '/care-policies/packs/x', '/staff-training/x', '/basket', '/register', '/privacy', '/demo']) assert.equal(showsWellLedBanner(p), false, p)
})

test('WELL-LED: every product appears on exactly one home card and in one banner group', () => {
  const ids = Object.keys(PRODUCTS)
  const onCards = STATEMENTS.flatMap(s => s.cardProducts)
  assert.deepEqual([...onCards].sort(), [...ids].sort())
  const inGroups = PRODUCT_GROUPS.flatMap(g => g.items)
  assert.deepEqual([...inGroups].sort(), [...ids].sort())
  for (const s of STATEMENTS) for (const k of s.key) assert.ok(PRODUCTS[k], `${s.topic} key ${k}`)
})

test('WELL-LED: links carry the source and go to the right section; no dashes in the copy', () => {
  assert.equal(hubHref('learn', 'banner'), '/cqc-well-led/learning?from=banner-learn')
  const files = ['../../../web/src/lib/well-led.ts', '../../../web/src/components/marketing/well-led-banner.tsx', '../../../web/src/components/marketing/well-led-home.tsx', '../../../web/src/app/(marketing)/cqc-well-led/page.tsx', '../../../web/src/app/(marketing)/cqc-well-led/[statement]/page.tsx', '../../../web/src/components/marketing/well-led-page.tsx', '../../../web/src/lib/well-led-pages.ts']
  for (const f of files) {
    const src = fs.readFileSync(path.resolve(__dirname, f), 'utf8')
    assert.doesNotMatch(src, /[–—]/, `${f} has a dash`)
  }
  const page = fs.readFileSync(path.resolve(__dirname, '../../../web/src/app/(marketing)/cqc-well-led/page.tsx'), 'utf8')
  assert.doesNotMatch(page.replace(/^\s*\/\/.*$/gm, ''), /CQC compliant|guarantee/i)
})

test('SCENARIO PICTURES: the editor can draw a new picture for a database page and save it', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const route = read('../routes/scenarios.ts'), panel = read('../../../web/src/app/(platform)/platform/blog/ScenariosPanel.tsx')
  assert.match(route, /scenariosAdminRouter\.patch\('\/:slug\/image'/)
  assert.match(route, /image must be a full https address/)
  assert.match(panel, /Make a new picture/)
  assert.match(panel, /generateBlogImage\(token/)
})

test('WELL-LED PAGES: four statement pages, each complete, each with its own picture, and every product named exists', () => {
  const { WL_PAGES } = require('../../../web/src/lib/well-led-pages')
  assert.deepEqual(WL_PAGES.map((p: any) => p.slug), ['governance', 'learning', 'inclusion', 'direction'])
  assert.equal(new Set(WL_PAGES.map((p: any) => p.image)).size, 4)
  for (const p of WL_PAGES) {
    assert.ok(p.meta_title.length <= 62, p.slug + ' meta title ' + p.meta_title.length)
    assert.ok(p.meta_description.length <= 156, p.slug + ' meta description ' + p.meta_description.length)
    assert.ok(p.looksFor.length >= 3 && p.evidence.length >= 3 && p.helps.length >= 4 && p.limits.length === 3 && p.faqs.length >= 3, p.slug)
    for (const h of p.helps) assert.ok(PRODUCTS[h.id], p.slug + ' ' + h.id)
    assert.ok(STATEMENTS.some(s => s.anchor === p.slug && s.topic === p.topic), p.slug + ' statement')
  }
})
