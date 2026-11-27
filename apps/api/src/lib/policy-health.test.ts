// Policy clarity and policy health (pilot, CS-1001): quotes must be in the policy, the eight kinds are fixed, bands come from rules, the overall band needs three dimensions, and both are gated.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { checkBands, clarityDimBand, HEALTH_CHECKS, parseClarity, readabilityMetrics, readabilityBand, clarityBand, CLARITY_TYPES, DEFAULT_POLICY_CLARITY_PROMPT } from '../services/policy-testing/clarity'
import { scoreOf, topFixes, overallBand, coverageBand, practicalBand, HEALTH_WEIGHTS } from '../services/policy-testing/health'

const TEXT = 'Staff should ensure that residents are appropriately monitored and that any concerns are escalated where necessary. The senior carer records the checks in the care plan every hour overnight.'

test('CLARITY: a finding needs a real quote and one of the eight kinds', () => {
  const raw = JSON.stringify({ findings: [
    { quote: 'Staff should ensure that residents are appropriately monitored', type: 'vague', issue: 'Monitoring is not defined.', suggestion: 'The senior carer checks each resident [how often].' },
    { quote: 'Staff should ensure that residents are appropriately monitored', type: 'made_up_type', issue: 'x', suggestion: 'y' },
    { quote: 'This sentence is not in the policy at all', type: 'passive', issue: 'x', suggestion: 'y' },
  ], summary: 'Partly vague.' })
  const r = parseClarity(raw, TEXT)!
  assert.equal(r.findings.length, 1)
  assert.equal(r.findings[0].type_label, 'Vague wording')
  assert.equal(parseClarity('nope', TEXT), null)
  assert.equal(Object.keys(CLARITY_TYPES).length, 8)
  assert.match(DEFAULT_POLICY_CLARITY_PROMPT, /"findings"/)
  assert.doesNotMatch(DEFAULT_POLICY_CLARITY_PROMPT, /[–—]/)
})

test('READABILITY: measured by rules, and banded', () => {
  const clear = 'Call the senior carer. Stay with the resident. Write it in the care plan. Tell the manager. Check again in an hour.'
  const m = readabilityMetrics(clear)
  assert.ok(m.avg_sentence_words < 8 && m.sentences === 5)
  assert.equal(readabilityBand(m), 'strong')
  const long = ('It is the responsibility of the registered manager to ensure that all of the relevant members of the staff team have been appropriately informed of the changes that have been made to the arrangements which were previously in place. ').repeat(6)
  assert.equal(readabilityBand(readabilityMetrics(long)), 'attention')
  assert.equal(readabilityBand(readabilityMetrics('Too short.')), 'none')
})

test('BANDS: clarity, coverage and practical use come from plain rules', () => {
  assert.equal(clarityBand(1, 1000), 'strong'); assert.equal(clarityBand(4, 1000), 'good'); assert.equal(clarityBand(12, 1000), 'attention'); assert.equal(clarityBand(5, 100), 'none')
  assert.equal(coverageBand(3, 0), 'strong'); assert.equal(coverageBand(3, 1), 'good'); assert.equal(coverageBand(1, 2), 'attention'); assert.equal(coverageBand(0, 0), 'none')
  assert.equal(practicalBand(0, 8), 'strong'); assert.equal(practicalBand(1, 8), 'good'); assert.equal(practicalBand(4, 8), 'attention'); assert.equal(practicalBand(0, 0), 'none')
})

test('HEALTH: the overall band needs three assessed dimensions and weighs them', () => {
  assert.equal(overallBand([{ key: 'coverage', band: 'strong' }, { key: 'uptodate', band: 'strong' }]).band, 'none')
  assert.equal(overallBand([{ key: 'coverage', band: 'strong' }, { key: 'uptodate', band: 'strong' }, { key: 'consistency', band: 'strong' }, { key: 'clarity', band: 'none' }]).band, 'strong')
  assert.equal(overallBand([{ key: 'coverage', band: 'attention' }, { key: 'uptodate', band: 'strong' }, { key: 'consistency', band: 'good' }]).band, 'good')
  assert.equal(overallBand([{ key: 'coverage', band: 'attention' }, { key: 'clarity', band: 'attention' }, { key: 'consistency', band: 'strong' }]).band, 'attention')
  assert.equal(Object.values(HEALTH_WEIGHTS).reduce((a, b) => a + b, 0), 100)
})

test('WIRING: clarity and health are gated, the prompt is editable and tagged, the section and pill only show in the pilot', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const routes = read('../routes/policy-testing.ts'), admin = read('../routes/admin.ts'), prompts = read('../../../web/src/app/(platform)/platform/prompts/page.tsx')
  const gaps = read('../../../web/src/app/(admin)/gaps/page.tsx'), pill = read('../../../web/src/components/admin/policy-health-pill.tsx')
  for (const r of ["'/clarity/library'", "'/clarity/run'", "'/health'"]) assert.match(routes, new RegExp(`stressRouter\\.(get|post)\\(${r.replace(/\//g, '\\/')}`))
  assert.match(routes, /code: 'NOT_READY'|'NOT_READY'/)
  assert.match(admin, /\[POLICY_CLARITY_USAGE\]:\s+DEFAULT_POLICY_CLARITY_PROMPT/)
  assert.match(prompts, /policy_clarity: 'Policy clarity'/)
  assert.match(gaps, /stressMeta\.enabled && session\?\.accessToken && <PolicyClaritySection/)
  assert.match(pill, /if \(!enabled \|\| !h \|\| !token\) return null/)
})

test('HEALTH CHECKS: the seven checks are counted per kind and banded, and one in need of attention stops clarity being Strong', () => {
  assert.deepEqual(HEALTH_CHECKS.map(c => c.label), ['Vague or ambiguous wording', 'Unclear responsibilities', 'Passive language', 'Missing escalation routes', 'Undefined timeframes', 'Generic statements without practical instructions', 'Excessive jargon'])
  const findings = [{ type: 'vague' }, { type: 'vague' }, { type: 'vague' }, { type: 'passive' }]
  const c = checkBands(findings, 2000)
  assert.equal(c.find(x => x.key === 'vague')!.count, 3)
  assert.equal(c.find(x => x.key === 'vague')!.band, 'attention')   // 1.5 per thousand words
  assert.equal(c.find(x => x.key === 'passive')!.band, 'good')      // 0.5 per thousand
  assert.equal(c.find(x => x.key === 'jargon')!.band, 'strong')
  assert.equal(clarityDimBand('strong', c), 'good')
  assert.equal(clarityDimBand('strong', checkBands([], 2000)), 'strong')
  assert.equal(clarityDimBand('attention', c), 'attention')
})

test('SCORE: a rough score out of 100 by a fixed rule, only once three dimensions are assessed', () => {
  assert.equal(scoreOf([{ key: 'coverage', band: 'strong' }, { key: 'uptodate', band: 'strong' }]).score, null)
  // coverage 25 strong (100), uptodate 15 good (70), consistency 15 attention (30): (2500 + 1050 + 450) / 55 = 72.7
  const r = scoreOf([{ key: 'coverage', band: 'strong' }, { key: 'uptodate', band: 'good' }, { key: 'consistency', band: 'attention' }, { key: 'clarity', band: 'none' }])
  assert.equal(r.score, 73); assert.equal(r.band, 'good'); assert.equal(r.assessed, 3)
  assert.equal(scoreOf(['coverage', 'uptodate', 'consistency', 'clarity', 'practical', 'readability'].map(k => ({ key: k as any, band: 'strong' as const }))).score, 100)
})

test('FIXES: the few things that would raise the score most, biggest first, with where to fix them', () => {
  const d = (key: any, band: any, extra: any = {}) => ({ key, label: key, band, detail: '', href: '/gaps', ...extra })
  const dims = [d('coverage', 'attention'), d('uptodate', 'good'), d('consistency', 'strong'), d('clarity', 'attention', { checks: [{ key: 'vague', label: 'Vague or ambiguous wording', count: 6, band: 'attention' }, { key: 'passive', label: 'Passive language', count: 1, band: 'good' }] }), d('practical', 'none'), d('readability', 'good')]
  const f = topFixes(dims as any)
  assert.equal(f.length, 3)
  assert.equal(f[0].dim, 'coverage')                               // 25 x 70 = 1750, the biggest gain
  assert.equal(f[1].dim, 'clarity')                                // 20 x 70 = 1400
  assert.match(f[1].text, /vague or ambiguous wording \(6\)/)
  assert.ok(f.every(x => x.dim !== 'consistency' && x.dim !== 'practical'))
})

test('HEALTH CHECK: planned, run step by step from the page, then snapshotted; the badge shows the score and the button', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const routes = read('../routes/policy-testing.ts'), pill = read('../../../web/src/components/admin/policy-health-pill.tsx')
  assert.match(routes, /stressRouter\.get\('\/health\/plan'/)
  assert.match(routes, /stressRouter\.post\('\/health\/snapshot'/)
  assert.match(routes, /code|'NOT_ENOUGH'/)
  assert.match(pill, /Run health check/)
  assert.match(pill, /Fix these first/)
  assert.match(pill, /stress\.clarityRun\(token!, policyId, true\)/)
  assert.match(pill, /useState<boolean>|useState\(true\)/)
  assert.match(pill, /const \[withStress, setWithStress\] = useState\(true\)/)   // stress tests are included by default
  assert.match(pill, /It is not a compliance rating/)
})
