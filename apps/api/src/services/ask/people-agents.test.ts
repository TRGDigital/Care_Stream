import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { prisma } from '../../db/client'
import {
  enrolState, latestPerPersonModule, trainingOverview, completionByModule, completionByPerson, dueAndOverdue, notStarted, completionTime, cpdHours,
  onboardState, onboardingProgress, expiryBucket, credentialExpiries, meanGapDays, probationState, pointsByPerson, pointsByEvent, claimsSummary, median,
  type EnrolRow, type OnboardRow,
} from './people-calc'
import { TOOLS, toolByName } from './tools'
import { AGENTS, agentById } from './agents'
import { ASK_PROMPTS, ASK_USAGES, askDefault } from './prompt-register'
import { PEOPLE_AGENT_IDS } from './agents-people'
import { PEOPLE_TOOLS } from './tools-people'

const TODAY = '2026-11-24'
const E = (o: Partial<EnrolRow>): EnrolRow => ({ user_id: 'u1', name: 'Aisha Rahman', job_role: 'Carer', module_id: 'm1', module_name: 'Fire safety', category: 'statutory', status: 'not_started', created_at: '2026-10-01T09:00:00.000Z', completed_at: null, due_date: null, expires_at: null, cpd: false, duration_minutes: 60, learn_seconds: 0, ...o })
const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
const code = (f: string) => src(f).replace(/\/\/.*$/gm, '')

// ── Pure maths ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('TRAINING: states follow the matrix rules (complete past expiry is expired, past due date is overdue)', () => {
  assert.equal(enrolState({ status: 'complete', due_date: null, expires_at: '2026-11-23' }, TODAY), 'expired')
  assert.equal(enrolState({ status: 'complete', due_date: null, expires_at: '2026-11-24' }, TODAY), 'complete')
  assert.equal(enrolState({ status: 'complete', due_date: null, expires_at: null }, TODAY), 'complete')
  assert.equal(enrolState({ status: 'in_progress', due_date: '2026-11-23', expires_at: null }, TODAY), 'overdue')
  assert.equal(enrolState({ status: 'not_started', due_date: '2026-11-24', expires_at: null }, TODAY), 'not_started')
  assert.equal(enrolState({ status: 'in_progress', due_date: null, expires_at: null }, TODAY), 'in_progress')
  assert.equal(enrolState({ status: 'expired', due_date: null, expires_at: null }, TODAY), 'expired')
})

test('TRAINING: a renewal replaces the old row, so each person and course counts once', () => {
  const rows = latestPerPersonModule([E({ created_at: '2025-10-01T00:00:00.000Z', status: 'complete', completed_at: '2025-10-05T00:00:00.000Z' }), E({ created_at: '2026-10-01T00:00:00.000Z', status: 'not_started' })])
  assert.equal(rows.length, 1); assert.equal(rows[0].status, 'not_started')
})

const SAMPLE: EnrolRow[] = [
  E({ user_id: 'a', name: 'Ann', module_id: 'm1', module_name: 'Fire safety', status: 'complete', completed_at: '2026-10-11T00:00:00.000Z', expires_at: '2027-10-11' }),
  E({ user_id: 'b', name: 'Bea', module_id: 'm1', module_name: 'Fire safety', status: 'in_progress', due_date: '2026-11-01' }),       // overdue
  E({ user_id: 'c', name: 'Cal', module_id: 'm1', module_name: 'Fire safety', status: 'not_started', created_at: '2026-11-04T00:00:00.000Z', due_date: '2026-12-01' }),
  E({ user_id: 'a', name: 'Ann', module_id: 'm2', module_name: 'Moving and handling', status: 'complete', completed_at: '2026-06-01T00:00:00.000Z', created_at: '2026-05-01T00:00:00.000Z', expires_at: '2026-12-10' }),  // expiring
  E({ user_id: 'b', name: 'Bea', module_id: 'm2', module_name: 'Moving and handling', status: 'complete', completed_at: '2025-01-01T00:00:00.000Z', created_at: '2024-12-20T00:00:00.000Z', expires_at: '2026-01-01' }),  // expired
]

test('TRAINING: overview, by course and by person use the same counting, lowest completion first', () => {
  const o = trainingOverview(SAMPLE, TODAY)
  assert.deepEqual({ assigned: o.assigned, complete: o.complete, overdue: o.overdue, not_started: o.not_started, expired: o.expired }, { assigned: 5, complete: 2, overdue: 1, not_started: 1, expired: 1 })
  assert.equal(o.completion_percent, 40); assert.equal(o.people, 3); assert.equal(o.courses, 2)
  const c = completionByModule(SAMPLE, TODAY)
  assert.equal(c[0].course, 'Fire safety'); assert.equal(c[0].completion_percent, 33); assert.equal(c.find(x => x.course === 'Moving and handling')!.completion_percent, 50)
  const p = completionByPerson(SAMPLE, TODAY)
  assert.equal(p[0].name, 'Bea'); assert.equal(p[0].completion_percent, 0); assert.equal(p.find(x => x.name === 'Ann')!.completion_percent, 100)
})

test('TRAINING: due and overdue lists overdue, due soon, expired and expiring with signed days, soonest first', () => {
  const list = dueAndOverdue(SAMPLE, TODAY, 30)
  assert.deepEqual(list.map(i => `${i.name}:${i.kind}`), ['Bea:expired', 'Bea:overdue', 'Cal:due_soon', 'Ann:expiring'])
  assert.ok(list.find(i => i.kind === 'overdue')!.days < 0); assert.equal(list.find(i => i.kind === 'due_soon')!.days, 7)
  assert.equal(dueAndOverdue(SAMPLE, TODAY, 3).some(i => i.kind === 'due_soon'), false)
})

test('TRAINING: not started shows how long ago it was assigned, longest first, and the minimum days filter works', () => {
  const rows = [E({ user_id: 'x', name: 'Xan', created_at: '2026-09-24T00:00:00.000Z' }), E({ user_id: 'y', name: 'Yas', created_at: '2026-11-20T00:00:00.000Z' }), E({ user_id: 'z', name: 'Zed', status: 'in_progress' })]
  const r = notStarted(rows, TODAY, 0)
  assert.deepEqual(r.map(x => [x.name, x.days_since_assigned]), [['Xan', 61], ['Yas', 4]])
  assert.deepEqual(notStarted(rows, TODAY, 30).map(x => x.name), ['Xan'])
})

test('TRAINING: completion time is days from assigned to completed, average and median, with learning minutes', () => {
  const r = completionTime([
    E({ module_id: 'm1', status: 'complete', created_at: '2026-10-01T00:00:00.000Z', completed_at: '2026-10-05T00:00:00.000Z', learn_seconds: 1800 }),
    E({ user_id: 'b', module_id: 'm1', status: 'complete', created_at: '2026-10-01T00:00:00.000Z', completed_at: '2026-10-11T00:00:00.000Z', learn_seconds: 3600 }),
    E({ user_id: 'c', module_id: 'm1', status: 'in_progress' }),
  ])
  assert.equal(r.by_course[0].completed, 2); assert.equal(r.by_course[0].average_days_to_complete, 7); assert.equal(r.by_course[0].median_days_to_complete, 7); assert.equal(r.by_course[0].average_learning_minutes, 45)
  assert.equal(r.overall!.average_days_to_complete, 7); assert.equal(completionTime([]).overall, null)
  assert.equal(median([3, 1, 2]), 2); assert.equal(median([1, 2, 3, 4]), 2.5)
})

test('CPD: hours are the course learning time for CPD certified courses completed in the window; courses with no estimate are listed, not guessed', () => {
  const rows = [
    E({ user_id: 'a', name: 'Ann', module_id: 'c1', module_name: 'CPD Safeguarding', cpd: true, duration_minutes: 90, status: 'complete', completed_at: '2026-05-01T00:00:00.000Z' }),
    E({ user_id: 'a', name: 'Ann', module_id: 'c2', module_name: 'CPD Dementia', cpd: true, duration_minutes: 30, status: 'complete', completed_at: '2026-06-01T00:00:00.000Z' }),
    E({ user_id: 'b', name: 'Bea', module_id: 'c1', module_name: 'CPD Safeguarding', cpd: true, duration_minutes: 90, status: 'complete', completed_at: '2025-01-01T00:00:00.000Z' }),        // before the window
    E({ user_id: 'b', name: 'Bea', module_id: 'c3', module_name: 'CPD No time', cpd: true, duration_minutes: null, status: 'complete', completed_at: '2026-07-01T00:00:00.000Z' }),
    E({ user_id: 'c', name: 'Cal', module_id: 'x', module_name: 'Not CPD', cpd: false, status: 'complete', completed_at: '2026-07-01T00:00:00.000Z' }),
  ]
  const r = cpdHours(rows, '2026-01-01', TODAY)
  assert.equal(r.total_hours, 2); assert.deepEqual(r.people.map(p => [p.name, p.hours, p.courses]), [['Ann', 2, 2], ['Bea', 0, 1]]); assert.deepEqual(r.courses_without_time_estimate, ['CPD No time']); assert.equal(r.completions, 3)
})

test('ONBOARDING: complete, overdue, not started, behind and on track', () => {
  const R = (o: Partial<OnboardRow>): OnboardRow => ({ name: 'N', job_role: null, flow: 'Induction', enrolled_at: '2026-11-04T00:00:00.000Z', due_date: '2026-12-04', completed_at: null, steps_total: 10, steps_done: 5, ...o })
  assert.equal(onboardState(R({ steps_done: 10 }), TODAY).state, 'complete')
  assert.equal(onboardState(R({ completed_at: '2026-11-20T00:00:00.000Z' }), TODAY).state, 'complete')
  assert.equal(onboardState(R({ due_date: '2026-11-20' }), TODAY).state, 'overdue')
  assert.equal(onboardState(R({ steps_done: 0 }), TODAY).state, 'not_started')
  assert.equal(onboardState(R({ steps_done: 1 }), TODAY).state, 'behind')      // 20 of 30 days used, 10 percent done
  assert.equal(onboardState(R({ steps_done: 8 }), TODAY).state, 'on_track')
  const list = onboardingProgress([R({ name: 'Ok', steps_done: 8 }), R({ name: 'Late', due_date: '2026-11-01', steps_done: 2 }), R({ name: 'Done', steps_done: 10 })], TODAY)
  assert.deepEqual(list.map(l => l.name), ['Late', 'Ok', 'Done'])
})

test('COMPLIANCE: expiry buckets, counts by type, and gaps between sessions', () => {
  assert.equal(expiryBucket('2026-11-23', TODAY), 'expired'); assert.equal(expiryBucket('2026-11-24', TODAY), 'within_30'); assert.equal(expiryBucket('2026-12-24', TODAY), 'within_30')
  assert.equal(expiryBucket('2026-12-25', TODAY), 'days_31_to_60'); assert.equal(expiryBucket('2027-02-22', TODAY), 'days_61_to_90'); assert.equal(expiryBucket('2027-03-10', TODAY), 'later')
  const r = credentialExpiries([
    { name: 'A', job_role: null, type: 'DBS', expires: '2026-11-01' }, { name: 'B', job_role: null, type: 'DBS', expires: '2026-12-10' },
    { name: 'C', job_role: null, type: 'Right to work', expires: '2027-02-01' }, { name: 'D', job_role: null, type: 'DBS', expires: '2028-01-01' }, { name: 'E', job_role: null, type: 'DBS', expires: null },
  ], TODAY, 90)
  assert.equal(r.count, 3); assert.deepEqual(r.items.map(i => i.name), ['A', 'B', 'C']); assert.equal(r.counts_by_type['DBS'].expired, 1); assert.equal(r.counts_by_type['DBS'].within_30, 1); assert.equal(r.counts_by_type['Right to work'].days_61_to_90, 1)
  assert.equal(meanGapDays(['2026-01-01', '2026-03-02', '2026-05-01']), 60); assert.equal(meanGapDays(['2026-01-01']), null)
  assert.equal(probationState('2026-11-23', TODAY), 'ended'); assert.equal(probationState('2026-12-01', TODAY), 'ending_within_30_days'); assert.equal(probationState('2027-02-01', TODAY), 'on_probation')
})

test('INCENTIVES: points by person and event, claims and committed value', () => {
  const rows = [{ user_id: 'a', name: 'Ann', event: 'training_completed', points: 10 }, { user_id: 'a', name: 'Ann', event: 'cpd_completed', points: 20 }, { user_id: 'b', name: 'Bea', event: 'training_completed', points: 10 }]
  assert.deepEqual(pointsByPerson(rows).map(p => [p.name, p.points]), [['Ann', 30], ['Bea', 10]])
  assert.deepEqual(pointsByEvent(rows).map(e => [e.event, e.points]), [['training_completed', 20], ['cpd_completed', 20]])
  const c = claimsSummary([{ status: 'approved', value_pence: 2500 }, { status: 'given', value_pence: 1000 }, { status: 'held', value_pence: 9900 }, { status: 'rejected', value_pence: 500 }])
  assert.equal(c.committed_value_pounds, 35); assert.equal(c.by_status.held.count, 1); assert.equal(c.total_claims, 4)
})

// ── Registration ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
test('the five agents are ready, have four starters, an editable prompt, and every tool they list exists', () => {
  assert.deepEqual(PEOPLE_AGENT_IDS, ['training', 'cpd', 'onboarding', 'compliance', 'incentives'])
  for (const id of PEOPLE_AGENT_IDS) {
    const a = agentById(id)!
    assert.equal(a.status, 'ready', id); assert.equal(a.starters.length, 4, id); assert.ok(a.prompt.length > 200, id); assert.ok(a.tools.length > 0, id)
    for (const t of a.tools) assert.ok(toolByName(t), `${id} lists ${t}`)
    assert.ok(ASK_USAGES.includes(`ask_agent_${id}`), `${id} has an editable prompt`)
    assert.equal(askDefault(`ask_agent_${id}`), a.prompt)
    assert.ok(ASK_PROMPTS.find(p => p.usage === `ask_agent_${id}`)!.note.length > 20)
  }
  assert.equal(new Set(AGENTS.map(a => a.id)).size, AGENTS.length)          // nothing registered twice
  assert.equal(PEOPLE_TOOLS.length, new Set(PEOPLE_TOOLS.map(t => t.name)).size)
  for (const t of PEOPLE_TOOLS) assert.ok(TOOLS.includes(t), `${t.name} is in the tool list`)
  assert.equal(TOOLS.length, new Set(TOOLS.map(t => t.name)).size)           // no clashing names with other tools
})

test('prompts and starters contain no dashes and the people tools are all used by an agent', () => {
  for (const id of PEOPLE_AGENT_IDS) { const a = agentById(id)!; assert.ok(!/[–—]/.test(a.prompt + a.starters.join(' ')), id) }
  const used = new Set(PEOPLE_AGENT_IDS.flatMap(id => agentById(id)!.tools))
  for (const t of PEOPLE_TOOLS) assert.ok(used.has(t.name), `${t.name} is attached to an agent`)
})

// ── Tool selection: the starter questions resolve to the intended tool by description ─────────────────────────────────────────────────
const words = (s: string) => new Set(s.toLowerCase().replace(/[^a-z0-9 ]/g, ' ').split(/\s+/).filter(w => w.length > 3))
function pick(agentId: string, question: string): string {
  const q = words(question); let best = '', score = -1
  for (const name of agentById(agentId)!.tools) {
    const t = toolByName(name)!; const d = words(`${t.name.replace(/_/g, ' ')} ${t.description}`)
    let s = 0; for (const w of q) if (d.has(w)) s++
    if (s > score) { score = s; best = name }
  }
  return best
}
test('TOOL SELECTION: the key starter questions reach the right tool', () => {
  assert.equal(pick('training', 'Which courses have the lowest completion?'), 'training_by_course')
  assert.equal(pick('training', 'Who is overdue on their training?'), 'training_due_overdue')
  assert.equal(pick('training', 'Who has not started the courses they were assigned?'), 'training_not_started')
  assert.equal(pick('training', 'Which people have gaps against the mandatory training matrix, by job role?'), 'training_matrix_gaps')
  assert.equal(pick('cpd', 'How many CPD hours has each person earned in the last 12 months?'), 'cpd_hours')
  assert.equal(pick('cpd', 'Which CPD certificates expire in the next 90 days?'), 'cpd_certificates_expiring')
  assert.equal(pick('onboarding', 'How are our new starters getting on with induction progress?'), 'onboarding_progress')
  assert.equal(pick('onboarding', 'Which new starters in the last 90 days have not been enrolled in an induction?'), 'onboarding_new_starters')
  assert.equal(pick('compliance', 'Whose DBS, right to work or registration expires in the next 30, 60 and 90 days?'), 'compliance_expiries')
  assert.equal(pick('compliance', 'Who is missing a DBS or right to work check?'), 'compliance_register')
  assert.equal(pick('compliance', 'Who is overdue a supervision or appraisal, and how often do we hold them?'), 'supervision_status')
  assert.equal(pick('compliance', 'Who is on probation and when does it end?'), 'probation_status')
  assert.equal(pick('incentives', 'Who has earned the most points, and who is close to a reward?'), 'incentives_leaderboard')
  assert.equal(pick('incentives', 'Which claims are waiting for a decision and how much of the budget have rewards used?'), 'incentives_claims')
})

// ── Privacy, tenant isolation, read only ──────────────────────────────────────────────────────────────────────────────────────────────
test('PRIVACY: the new files never touch health, contact details, dates of birth, funding, writes or reference numbers in their output', () => {
  for (const f of ['tools-people.ts', 'people-calc.ts', 'agents-people.ts']) {
    const t = code(f)
    assert.ok(!/sick|health_note|medical/i.test(t), `${f} mentions sickness or health`)
    assert.ok(!/\.email\b|\bphone\b|phone_number|date_of_birth|\bdob\b/i.test(t), `${f} reads contact details or dates of birth`)
    assert.ok(!new RegExp([['weekly', 'fee'].join('_'), ['council', 'contribution'].join('_'), ['resident', 'funding'].join('_'), ['resident', 'funding'].join('-')].join('|')).test(t), `${f} mentions funding fields`)
    assert.ok(!/\.(create|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|\binsert into\b/i.test(t), `${f} writes`)
  }
  const t = code('tools-people.ts')
  assert.ok(!/\bform\b\s*:\s*true|select:\s*\{[^}]*\bform\b/.test(t), 'supervision form contents are never selected')
  assert.ok(!/evidence_name|evidence_type|certificate_url/.test(t), 'documents are never read')
  // reference numbers and notes are read only to decide whether a credential is recorded, and are dropped straight away
  const loader = t.slice(t.indexOf('async function loadCredentialRows'), t.indexOf('async function namesFor'))
  assert.match(loader, /return creds\.map\(c => \(\{ user_id/); assert.ok(!/reference|notes/.test(loader.slice(loader.indexOf('return creds.map'))), 'reference and notes are dropped before anything leaves the loader')
  const outs = t.slice(t.indexOf('export const PEOPLE_TOOLS'))
  assert.ok(!/\.reference\b|\.notes\b/.test(outs), 'no tool returns a reference number or notes')
})

test('TENANT ISOLATION: every database read in the new tools names the account', () => {
  const t = code('tools-people.ts')
  const re = /db\.(\w+)\.(findMany|findFirst|findUnique|groupBy|aggregate|count)\(/g
  let m: RegExpExecArray | null, n = 0
  while ((m = re.exec(t))) { n++; const call = t.slice(m.index, m.index + 420); assert.match(call, /tenant_id|tenantId/, `${m[1]}.${m[2]} is scoped to the account`) }
  assert.ok(n >= 15, `found ${n} reads`)
  // the incentive tables hold plain user ids, so names are looked up in a separate, account scoped query
  assert.match(t, /namesFor\(tenantId: string/); assert.match(t, /db\.user\.findMany\(\{ where: \{ tenant_id: tenantId, id: \{ in:/)
})

// ── Running the tools against stubbed data (no database) ──────────────────────────────────────────────────────────────────────────────
function stub(models: Record<string, (args: any) => any>) {
  const calls: Array<{ model: string; args: any }> = []
  const saved = new Map<string, any>()
  for (const [model, fn] of Object.entries(models)) {
    saved.set(model, Object.getOwnPropertyDescriptor(prisma as any, model))
    Object.defineProperty(prisma as any, model, { configurable: true, get: () => ({ findMany: async (args: any) => { calls.push({ model, args }); return fn(args) }, findFirst: async (args: any) => { calls.push({ model, args }); const r = fn(args); return Array.isArray(r) ? r[0] ?? null : r } }) })
  }
  return { calls, restore() { for (const [model, d] of saved) { if (d) Object.defineProperty(prisma as any, model, d); else delete (prisma as any)[model] } } }
}
const ctx = { tenantId: 'T1', userId: 'admin', today: TODAY }

test('TOOL RUN: training tools read only this account and return names, counts and dates', async () => {
  const rows = [
    { user_id: 'a', module_id: 'm1', status: 'complete', created_at: new Date('2026-10-01'), completed_at: new Date('2026-10-05'), due_date: null, expires_at: new Date('2027-10-05'), learn_seconds: 600, user: { name: 'Ann', job_role: 'Carer' }, module: { name: 'Fire safety', category: 'statutory', cpd_accredited: false, duration_minutes: 60 } },
    { user_id: 'b', module_id: 'm1', status: 'in_progress', created_at: new Date('2026-10-01'), completed_at: null, due_date: new Date('2026-11-01'), expires_at: null, learn_seconds: 0, user: { name: 'Bea', job_role: 'Senior' }, module: { name: 'Fire safety', category: 'statutory', cpd_accredited: false, duration_minutes: 60 } },
  ]
  const s = stub({ trainingEnrollment: () => rows })
  try {
    const o: any = await toolByName('training_overview')!.run(ctx, {})
    assert.equal(o.data.assigned, 2); assert.equal(o.data.complete, 1); assert.equal(o.data.overdue, 1); assert.equal(o.data.completion_percent, 50)
    assert.match(o.method, /newest assignment/); assert.equal(o.sources[0].as_of, TODAY)
    const d: any = await toolByName('training_due_overdue')!.run(ctx, { kind: 'overdue' })
    assert.deepEqual(d.data.list.map((x: any) => x.name), ['Bea'])
    const bySenior: any = await toolByName('training_by_person')!.run(ctx, { job_role: 'senior' })
    assert.deepEqual(bySenior.data.list.map((x: any) => x.name), ['Bea'])
    assert.ok(s.calls.length >= 3); for (const c of s.calls) assert.equal(c.args.where.tenant_id, 'T1')
    assert.ok(!JSON.stringify([o, d, bySenior]).match(/@|phone|birth/i))
  } finally { s.restore() }
})

test('TOOL RUN: compliance tools return types and dates only, never reference numbers, and leave agency workers out', async () => {
  const users = [{ id: 'a', name: 'Ann', job_role: 'Nurse' }, { id: 'b', name: 'Bea', job_role: 'Carer' }]
  const creds = [
    { user_id: 'a', type: 'dbs', expires_at: new Date('2026-12-10'), issued_at: null, reference: 'SECRET-123456', evidence_key: 'k', notes: 'private note', registration_body: null, sponsorship_ends_at: null },
    { user_id: 'a', type: 'professional_registration', expires_at: new Date('2027-01-15'), issued_at: null, reference: '99A1234E', evidence_key: null, notes: null, registration_body: 'NMC', sponsorship_ends_at: null },
    { user_id: 'b', type: 'right_to_work', expires_at: new Date('2026-11-01'), issued_at: null, reference: 'RTW-555', evidence_key: null, notes: null, registration_body: null, sponsorship_ends_at: null },
  ]
  const s = stub({ user: () => users, staffCredential: () => creds })
  try {
    const r: any = await toolByName('compliance_expiries')!.run(ctx, { within_days: 90 })
    assert.equal(r.data.count, 3); assert.deepEqual(r.data.items.map((i: any) => i.type), ['Right to work', 'DBS', 'Professional registration (NMC)'])
    const text = JSON.stringify(r)
    assert.ok(!/SECRET|99A1234E|RTW-555|private note/.test(text), 'no reference numbers or notes')
    const reg: any = await toolByName('compliance_register')!.run(ctx, {})
    assert.equal(reg.data.people_checked, 2); assert.ok(reg.data.problems.some((p: any) => p.name === 'Bea' && p.check === 'DBS' && p.status === 'missing'))
    assert.ok(!/SECRET|99A1234E|RTW-555|private note/.test(JSON.stringify(reg)))
    for (const c of s.calls) assert.equal(c.args.where.tenant_id, 'T1')
    const userCall = s.calls.find(c => c.model === 'user')!; assert.equal(userCall.args.where.is_agency, false)
  } finally { s.restore() }
})

test('TOOL RUN: supervision status reads dates only (never the form or notes) and reports overdue first', async () => {
  const users = [{ id: 'a', name: 'Ann', job_role: 'Carer' }, { id: 'b', name: 'Bea', job_role: 'Carer' }]
  const recs = [
    { user_id: 'a', type: 'supervision', held_on: new Date('2026-06-01'), next_due: new Date('2026-08-01'), conducted_by: 'Len', status: 'completed' },
    { user_id: 'b', type: 'supervision', held_on: new Date('2026-10-01'), next_due: new Date('2027-01-01'), conducted_by: 'Len', status: 'completed' },
  ]
  const s = stub({ user: () => users, staffSupervision: () => recs })
  try {
    const r: any = await toolByName('supervision_status')!.run(ctx, { kind: 'supervision' })
    assert.equal(r.data.list[0].name, 'Ann'); assert.equal(r.data.list[0].status, 'overdue'); assert.equal(r.data.counts.supervision.overdue, 1)
    const sel = s.calls.find(c => c.model === 'staffSupervision')!.args.select
    assert.ok(!('form' in sel) && !('notes' in sel), 'the content of sessions is never selected')
  } finally { s.restore() }
})

test('TOOL RUN: incentives resolve names in a separate account scoped query and only show active people', async () => {
  const s = stub({
    incentiveCampaign: () => [{ id: 'c1', name: 'November', month: '2026-11', status: 'live' }],
    incentiveReward: () => [{ title: 'Voucher', target_points: 50 }, { title: 'Day off', target_points: 100 }],
    incentiveLedger: () => [{ user_id: 'a', event: 'training_completed', points: 30 }, { user_id: 'a', event: 'cpd_completed', points: 30 }, { user_id: 'b', event: 'training_completed', points: 10 }, { user_id: 'gone', event: 'training_completed', points: 99 }],
    user: () => [{ id: 'a', name: 'Ann', is_active: true }, { id: 'b', name: 'Bea', is_active: true }, { id: 'gone', name: 'Left', is_active: false }],
  })
  try {
    const r: any = await toolByName('incentives_leaderboard')!.run(ctx, {})
    assert.deepEqual(r.data.list.map((p: any) => [p.name, p.points]), [['Ann', 60], ['Bea', 10]])
    assert.equal(r.data.list[0].next_reward.title, 'Day off'); assert.equal(r.data.list[0].next_reward.points_to_go, 40); assert.equal(r.data.list[0].rewards_reached, 1)
    for (const c of s.calls) assert.equal(c.args.where.tenant_id, 'T1')
  } finally { s.restore() }
})
