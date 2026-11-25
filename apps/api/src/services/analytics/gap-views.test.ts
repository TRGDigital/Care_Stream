// A regulation that routes its missing wording to several policies is listed once PER policy on /gaps, and each row opens ITS OWN policy: that policy as the target, only its items,
// its numbering and its highlights. (Before this, every row opened the same detail, which showed the title matched policy, a policy that often had nothing routed to it.)
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { viewOfDetail, GAP_VIEWS_VERSION } from './gap-views'
import type { GapDetail } from './gap-detail'

const req = (requirement: string, id: string | null, name: string, i: number) => ({ requirement, status: 'missing' as const, suggested_addition: `Add: ${requirement}`, target_policy_id: id, target_policy_name: name, match_index: i, placement: 'new_section' as const })
const PPM = { id: 'p1', name: 'Planned Preventive Maintenance In Care Homes Policy' }, SAF = { id: 'p2', name: 'Safety, Availability And Suitability Of Equipment Policy' }, PREM = { id: 'p0', name: 'Premises Maintenance In Care Homes Policy' }
const detail = {
  reference_key: 'electricity-at-work-regulations-1989', official_name: 'Electricity at Work Regulations 1989', views_version: GAP_VIEWS_VERSION,
  target_policy: PREM, target_policies: [{ ...PPM, count: 2 }, { ...SAF, count: 1 }], suggested_new_policy_title: null,
  requirements: [{ requirement: 'Already there', status: 'already_covered' as const }, req('Fixed wiring tested', PPM.id, PPM.name, 1), req('Isolation before work', PPM.id, PPM.name, 2), req('Portable appliance schedule', SAF.id, SAF.name, 1)],
  highlight_quotes: ['x'], highlight_placements: ['new_section'], highlight_labels: ['Fixed wiring tested'],
  policy_views: [
    { key: PPM.id, policy: PPM, requirements: [req('Fixed wiring tested', PPM.id, PPM.name, 1), req('Isolation before work', PPM.id, PPM.name, 2)], highlight_quotes: ['', ''], highlight_placements: ['new_section', 'new_section'], highlight_labels: ['a', 'b'] },
    { key: SAF.id, policy: SAF, requirements: [req('Portable appliance schedule', SAF.id, SAF.name, 1)], highlight_quotes: [''], highlight_placements: ['new_section'], highlight_labels: ['c'] },
  ],
} as unknown as GapDetail

test('each row sees its own policy: the target, its items only, and its own highlights', () => {
  const a = viewOfDetail(detail, PPM.id)
  assert.equal(a.target_policy?.name, PPM.name); assert.deepEqual(a.requirements.filter(r => r.status === 'missing').map(r => r.requirement), ['Fixed wiring tested', 'Isolation before work'])
  assert.equal(a.highlight_labels.length, 2); assert.equal(a.view_key, PPM.id)
  const b = viewOfDetail(detail, SAF.id)
  assert.equal(b.target_policy?.name, SAF.name); assert.deepEqual(b.requirements.filter(r => r.status === 'missing').map(r => r.requirement), ['Portable appliance schedule'])
  assert.equal(b.requirements.filter(r => r.status === 'missing').every(r => r.target_policy_id === SAF.id), true)
})
test('the title matched policy with nothing routed to it is never shown; with no key the first (most work) view is used; a name finds the view when the id has changed', () => {
  for (const v of [viewOfDetail(detail), viewOfDetail(detail, 'p0'), viewOfDetail(detail, 'gone', SAF.name.toUpperCase())]) assert.notEqual(v.target_policy?.id, PREM.id)
  assert.equal(viewOfDetail(detail).target_policy?.id, PPM.id); assert.equal(viewOfDetail(detail, 'gone', SAF.name.toUpperCase()).target_policy?.id, SAF.id)
  assert.equal(viewOfDetail({ ...detail, policy_views: [] } as GapDetail).view_key, null)   // nothing missing: returned as it is
})
test('a new policy needed is its own view: no target policy, the suggested title, its items only', () => {
  const d = { ...detail, policy_views: [{ key: 'new:fire door policy', policy: { id: null, name: 'Fire Door Policy' }, requirements: [req('Doors checked weekly', null, 'Fire Door Policy', 1)], highlight_quotes: [''], highlight_placements: ['new_section'], highlight_labels: ['d'] }] } as unknown as GapDetail
  const v = viewOfDetail(d, 'new:fire door policy'); assert.equal(v.target_policy, null); assert.equal(v.suggested_new_policy_title, 'Fire Door Policy')
})
test('WIRING: the generator places wording once per routed policy and rebuilds old details; the route returns the row\'s view; the list passes its row\'s policy; the window caches per view', () => {
  const s = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const gd = s('./gap-detail.ts'), rt = s('../../routes/analytics.ts'), pg = s('../../../../web/src/app/(admin)/gaps/page.tsx'), md = s('../../../../web/src/components/admin/gap-detail-modal.tsx')
  assert.match(gd, /for \(const tp of targetPolicies\)/); assert.match(gd, /views_version !== GAP_VIEWS_VERSION/); assert.match(gd, /placeMissing\(text, mine/)
  assert.match(rt, /viewOfDetail\(detail, typeof req\.query\.view/)
  assert.match(pg, /view_key: policy \? \(policy\.id \?\? `new:\$\{policy\.name\.toLowerCase\(\)\}`\)/); assert.match(pg, /viewKey=\{detailReg\.view_key\}/)
  assert.match(md, /-\$\{viewKey \?\? 'first'\}`/); assert.match(md, /gapDetail\(referenceKey, false, \{ key: viewKey, name: viewName \}\)/)
})
