// The Well-led strip on /pricing reads the live comparison table: every row it points at must exist, the plans must differ the way the table says, and the copy follows the house rules.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { WELL_LED_ROWS, wellLedByPlan } from '../../../web/src/lib/well-led-pricing'
import { PRICING } from '../../../web/src/lib/pricing-data'
import { PRODUCTS } from '../../../web/src/lib/well-led'

test('PRICING WELL-LED: every product points at a real row of the comparison table', () => {
  const view = { plans: PRICING.plans, groups: PRICING.groups }
  const labels = new Set(view.groups.flatMap(g => g.rows.map(r => r.label)))
  for (const [id, label] of Object.entries(WELL_LED_ROWS)) { assert.ok(PRODUCTS[id], id); if (label !== null) assert.ok(labels.has(label), `${id}: row "${label}" is not in the comparison table`) }
  assert.deepEqual(Object.keys(WELL_LED_ROWS).sort(), Object.keys(PRODUCTS).sort())   // all 14 products, none missed
})

test('PRICING WELL-LED: the plans differ exactly as the comparison table says', () => {
  const strips = wellLedByPlan({ plans: PRICING.plans, groups: PRICING.groups })
  const byName = Object.fromEntries(strips.map(s => [s.name, s]))
  assert.equal(strips.length, 3)
  assert.ok(byName.Starter && byName.Professional && byName.Enterprise)
  assert.ok(byName.Starter.included < byName.Professional.included, 'Starter has fewer than Professional')
  assert.ok(byName.Professional.included < byName.Enterprise.included, 'Enterprise adds audits linked to training')
  const pro = Object.fromEntries(byName.Professional.items.map(i => [i.id, i.included]))
  assert.equal(pro.approval, true); assert.equal(pro.report, true); assert.equal(pro.audits, false)
  const ent = Object.fromEntries(byName.Enterprise.items.map(i => [i.id, i.included]))
  assert.equal(ent.audits, true)
  const starter = Object.fromEntries(byName.Starter.items.map(i => [i.id, i.included]))
  assert.equal(starter.approval, false); assert.equal(starter.coverage, false); assert.equal(starter.cpd, true); assert.equal(starter.knowledge, true)
  assert.ok(strips.every(s => s.total === 14))
  // with the Free plan in front, the columns shift by one and the strips still follow the table
  const withFree = wellLedByPlan({ plans: [{ name: 'Free', price: 'Free' } as any, ...PRICING.plans], groups: PRICING.groups.map(g => ({ ...g, rows: g.rows.map(r => ({ ...r, values: [false, ...r.values] })) })) })
  assert.equal(withFree.length, 4); assert.equal(withFree[0].name, 'Free'); assert.equal(withFree[2].name, 'Professional')
  assert.equal(withFree[2].items.find(i => i.id === 'approval')!.included, true)
})

test('PRICING WELL-LED: the banner copy is the agreed headline, evidence not a rating, no dashes, and it sits at the top of the page', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const comp = read('../../../web/src/components/marketing/pricing-well-led.tsx'), page = read('../../../web/src/components/marketing/pricing-page-v2.tsx'), lib = read('../../../web/src/lib/well-led-pricing.ts')
  assert.match(comp, /What does it cost to show CQC you are well led\?/)
  assert.match(comp, /Evidence for Well-led, not a rating/)
  assert.doesNotMatch(comp + lib, /[–—]/)
  assert.doesNotMatch(comp.replace(/^\s*\/\/.*$/gm, ''), /CQC compliant|guarantee/i)
  assert.match(page, /<div className="ppage-v2">\n      <PricingWellLed view=\{view\} \/>\n      <section className="phero">/)
  assert.match(page, /<section className="pplans" id="plans">/)
})
