// Policy testing: the judge's answer is checked (every point present, quotes must be in the policy), scenarios are only approved when sourced, policies match the right scenarios,
// the pilot is CS-1001 only, and the prompts are editable on the Prompts page.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { POLICY_TYPES, betterReading, libraryGaps, parseJudge, quoteInText, gapsIn, policyMatchesType, approvalProblems, DEFAULT_STRESS_JUDGE_PROMPT, DEFAULT_SCENARIO_DRAFTER_PROMPT, type ExpectedPoint } from '../services/policy-testing/stress'
import { isPolicyTestingAccount, policyTestingAccounts } from './policy-testing-pilot'

const POINTS: ExpectedPoint[] = [
  { id: 'p1', text: 'Call emergency services when a head injury is suspected', source_label: 'NICE falls guideline', source_url: 'https://www.nice.org.uk/guidance/ng249' },
  { id: 'p2', text: 'Record the fall in the care record', source_label: 'Regulation 17', source_url: '' },
]
const POLICY = 'If a resident falls, the senior carer must call 999 if a head injury is suspected. Staff keep the resident comfortable.'

test('JUDGE: every point must be answered, and a made up quote is never accepted as covered', () => {
  const raw = JSON.stringify({ points: [
    { id: 'p1', verdict: 'covered', quote: 'the senior carer must call 999 if a head injury is suspected', note: 'Says when to call.', suggested_wording: '' },
    { id: 'p2', verdict: 'covered', quote: 'All falls are written in the care record within the hour', note: 'x', suggested_wording: 'Record it.' },
  ], summary: 'Mostly good.' })
  const r = parseJudge(raw, POINTS, POLICY)!
  assert.equal(r.points[0].verdict, 'covered')
  assert.equal(r.points[0].quote_checked, true)
  assert.equal(r.points[1].verdict, 'partly')          // the quote is not in the policy
  assert.equal(r.points[1].quote, '')
  assert.equal(gapsIn(r.points), 1)
  assert.equal(parseJudge(JSON.stringify({ points: [{ id: 'p1', verdict: 'covered', quote: '' }], summary: '' }), POINTS, POLICY), null)   // p2 missing
  assert.equal(parseJudge('not json', POINTS, POLICY), null)
  assert.equal(quoteInText('Staff keep the resident   comfortable', POLICY), true)
})

test('JUDGE: a missing point carries no quote and keeps its suggested wording', () => {
  const raw = JSON.stringify({ points: [
    { id: 'p1', verdict: 'missing', quote: 'invented words', note: 'Not said.', suggested_wording: 'Call 999 if a head injury is suspected.' },
    { id: 'p2', verdict: 'missing', quote: '', note: 'Not said.', suggested_wording: 'Record the fall.' },
  ], summary: 's' })
  const r = parseJudge(raw, POINTS, POLICY)!
  assert.deepEqual(r.points.map(p => p.verdict), ['missing', 'missing'])
  assert.equal(r.points[0].quote, '')
  assert.match(r.points[0].suggested_wording, /999/)
})

test('SCENARIOS: only a described, typed, sourced scenario can be approved', () => {
  assert.deepEqual(approvalProblems({ description: 'A resident is found on the floor overnight by a care worker.', policy_types: ['falls'], expected_points: [...POINTS, { id: 'p3', text: 'Inform the next of kin', source_label: 'Regulation 20', source_url: '' }] }), [])
  const bad = approvalProblems({ description: '', policy_types: [], expected_points: [{ id: 'p1', text: 'x'.repeat(10), source_label: '', source_url: '' }] })
  assert.equal(bad.length, 4)
})

test('MATCHING: a policy meets the scenarios for its own type only', () => {
  assert.equal(policyMatchesType({ name: 'Falls Management Policy' }, 'falls'), true)
  assert.equal(policyMatchesType({ name: 'Medication Policy' }, 'falls'), false)
  assert.equal(policyMatchesType({ name: 'Adult Protection and Safeguarding Policy' }, 'safeguarding'), true)
  assert.equal(policyMatchesType({ name: 'Policy 12', policy_type: 'Medicines Management Policy' }, 'medication'), true)
})

test('PILOT: CS-1001 only unless the switch lists more', () => {
  assert.equal(isPolicyTestingAccount('CS-1001'), true)
  assert.equal(isPolicyTestingAccount('CS-1009'), false)
  assert.equal(isPolicyTestingAccount('CS-1009', 'CS-1009'), true)
  assert.deepEqual(policyTestingAccounts(''), ['CS-1001'])
})

test('WIRING: routes are gated, prompts are editable and tagged, and the prompts keep their answer shape', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const routes = read('../routes/policy-testing.ts'), admin = read('../routes/admin.ts'), prompts = read('../../../web/src/app/(platform)/platform/prompts/page.tsx'), shell = read('../../../web/src/components/admin-shell.tsx')
  assert.match(routes, /policyTestingAdminRouter\.use\(requirePlatformAdmin\)/)
  assert.match(routes, /if \(!\(await policyTestingEnabled\(tenantId\)\)\) \{ err\(res, 'NOT_AVAILABLE'/)
  assert.match(admin, /\[STRESS_JUDGE_USAGE\]:\s+DEFAULT_STRESS_JUDGE_PROMPT/)
  assert.match(admin, /\[SCENARIO_DRAFTER_USAGE\]:\s+DEFAULT_SCENARIO_DRAFTER_PROMPT/)
  assert.match(prompts, /policy_stress_judge: 'Policy testing'/)
  assert.match(shell, /stressMeta\.enabled/)
  assert.match(DEFAULT_STRESS_JUDGE_PROMPT, /"points"/)
  assert.match(DEFAULT_SCENARIO_DRAFTER_PROMPT, /"scenarios"/)
  assert.doesNotMatch(DEFAULT_STRESS_JUDGE_PROMPT + DEFAULT_SCENARIO_DRAFTER_PROMPT, /[–—]/)
})

test('POLICY TYPES: a full grouped list, unique keys, and real policy titles land on the right type', () => {
  assert.ok(POLICY_TYPES.length >= 90)
  assert.equal(new Set(POLICY_TYPES.map(t => t.key)).size, POLICY_TYPES.length)
  assert.deepEqual([...new Set(POLICY_TYPES.map(t => t.group))].length, 7)
  for (const k of ['falls', 'medication', 'safeguarding', 'infection', 'fire', 'capacity', 'complaints', 'recruitment']) assert.ok(POLICY_TYPES.some(t => t.key === k), k)   // the first eight keep their keys
  const m = (title: string, key: string) => assert.equal(policyMatchesType({ name: title }, key), true, `${title} -> ${key}`)
  m('Pressure Ulcer Prevention and Skin Integrity Policy', 'pressure_ulcer')
  m('Dysphagia, Choking and Modified Diet Policy', 'dysphagia')
  m('Water Safety and Legionella Policy', 'legionella')
  m('Whistleblowing and Freedom to Speak Up Policy', 'whistleblowing')
  m('Missed and Late Visits Policy', 'missed_visits')
  m('Duty of Candour Policy', 'candour')
  m('Resuscitation, DNACPR and ReSPECT Policy', 'resuscitation')
  m('Epilepsy and Seizure Management Policy', 'epilepsy')
  assert.equal(policyMatchesType({ name: 'Falls Prevention and Management Policy' }, 'pressure_ulcer'), false)
})

test('READING: a later part of a long policy can meet a point an earlier part did not, and a gap covered in another policy is not a library gap', () => {
  const base = { id: 'p1', text: 't', quote: '', quote_checked: true, note: '', suggested_wording: '', source_label: 'x', source_url: '' }
  const miss = { ...base, verdict: 'missing' as const }, met = { ...base, verdict: 'covered' as const, quote: 'q' }, part = { ...base, verdict: 'partly' as const, quote: 'q' }
  assert.equal(betterReading(miss, met).verdict, 'covered')
  assert.equal(betterReading(part, miss).verdict, 'partly')
  assert.equal(betterReading(met, part).verdict, 'covered')
  const here = (id: string, v: 'covered' | 'partly' | 'missing', e: Array<'covered' | 'partly'> = []) => ({ ...base, id, verdict: v, elsewhere: e.map(x => ({ policy_id: 'o', policy_name: 'Other policy', verdict: x, quote: 'q' })) })
  // covered here; missing but covered elsewhere; missing and only partly elsewhere; missing everywhere
  assert.equal(libraryGaps([here('a', 'covered'), here('b', 'missing', ['covered']), here('c', 'missing', ['partly']), here('d', 'missing')]), 2)
})

test('READING: the policy is read in full (no cut off), in parts, and the rest of the library is checked', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const svc = read('../services/policy-testing/stress.ts')
  assert.doesNotMatch(svc, /slice\(0, 80_?000\)/)
  assert.match(svc, /textWindows\(policyText, POLICY_PART_CHARS\)/)
  assert.match(svc, /if \(!r\) \{ failed = true; return \[\] \}/)
  assert.match(svc, /findElsewhere/)
  assert.match(svc, /queryVectors\(namespace, emb, 12\)/)
})
