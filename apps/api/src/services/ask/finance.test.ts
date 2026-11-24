// Finance and pay, and Complaints and incidents agents: the sums with fixtures, privacy and the registration.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { staffWeeklyCost, financeOverview, breakEven, upliftIncome, weekendPremium, FINANCE_TOOLS } from './tools-finance'
import { INCIDENT_TOOLS, DATA_SITUATION, actionStats, failureTable, topicOf, TOPICS } from './tools-incidents'
import { AGENTS, agentById } from './agents'
import { TOOLS } from './tools'
import { ASK_PROMPTS } from './prompt-register'
import { reviewStats } from './funding-bridge'
import { WEEKS_PER_YEAR } from './calc'

const P = (o: any) => ({ name: 'A', job_role: 'Carer', age: 30, weekday_rate: 12, weekend_rate: 12, weekly_hours: 40, ...o })
// built from pieces so this test file does not itself match the funding safeguard test
const FUNDING_WORDS = new RegExp([['weekly', 'fee'].join('_'), ['council', 'contribution'].join('_'), ['family', 'contribution'].join('_'), ['resident', 'funding'].join('_'), ['resident', 'Funding'].join('')].join('|'))
const here = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

test('staff cost: hours x blended rate, on costs added, people without a rate or hours listed not guessed', () => {
  const a = staffWeeklyCost([P({}), P({ name: 'B', weekday_rate: null, weekend_rate: null }), P({ name: 'C', weekly_hours: null })], 0, 20)
  assert.equal(a.weekly, 12 * 40 * 1.2); assert.equal(a.counted, 1); assert.deepEqual(a.skipped, ['B', 'C'])
  const blended = staffWeeklyCost([P({ weekday_rate: 12, weekend_rate: 15 })], 2 / 7, 0)
  assert.ok(Math.abs(blended.weekly - 40 * 12.86) < 1e-9)   // the blended rate (12.857) is rounded to the penny before it is used, as everywhere in the Ask calculators
})

test('overview: income less staff cost is the gap, with the percentage, the average fee and the staff cost per resident; per year uses 365 over 7', () => {
  const o = financeOverview({ weeklyIncome: 10000, residentsWithFee: 10, residentsWithoutFee: 2, staffWeekly: 6000 })
  assert.equal(o.income.per_week, 10000); assert.equal(o.staff_cost.per_week, 6000); assert.equal(o.income_less_staff_cost.per_week, 4000)
  assert.equal(o.staff_cost_percent_of_income, 60); assert.equal(o.staff_cost_per_resident_per_week, 600); assert.equal(o.average_fee_per_resident_per_week, 1000)
  assert.equal(o.income.per_year, Math.round(10000 * WEEKS_PER_YEAR * 100) / 100); assert.equal(o.residents_without_a_fee_recorded, 2)
  assert.equal(financeOverview({ weeklyIncome: 0, residentsWithFee: 0, residentsWithoutFee: 0, staffWeekly: 100 }).staff_cost_percent_of_income, null)
})

test('break even: residents needed rounds up, shortfall is negative, occupancy only when places are given, and nothing is guessed with no fees', () => {
  const b = breakEven({ staffWeekly: 6000, weeklyIncome: 10000, residentsWithFee: 10, capacity: 12 })
  assert.equal(b.residents_needed_to_cover_staff_cost, 6); assert.equal(b.shortfall_or_surplus_residents, 4); assert.equal(b.occupancy_needed_percent, 50); assert.equal(b.current_occupancy_percent, 83.33)
  assert.equal(breakEven({ staffWeekly: 6100, weeklyIncome: 10000, residentsWithFee: 10 }).residents_needed_to_cover_staff_cost, 7)
  assert.equal(breakEven({ staffWeekly: 6100, weeklyIncome: 10000, residentsWithFee: 10 }).occupancy_needed_percent, null)
  assert.equal(breakEven({ staffWeekly: 100, weeklyIncome: 0, residentsWithFee: 0 }).residents_needed_to_cover_staff_cost, null)
  assert.ok(breakEven({ staffWeekly: 12000, weeklyIncome: 10000, residentsWithFee: 10 }).shortfall_or_surplus_residents! < 0)
})

test('fee uplift income: a percentage on every funding type, and on self and part self funded income only', () => {
  const u = upliftIncome([{ funding_type: 'self', label: 'Self funded', weekly_total: 3000 }, { funding_type: 'council', label: 'Council funded', weekly_total: 5000 }, { funding_type: 'part_self', label: 'Part self funded', weekly_total: 2000 }], 5)
  assert.equal(u.if_every_fee_rises.per_week, 500); assert.equal(u.if_only_self_and_part_self_funded_rise.per_week, 250)
  assert.equal(u.by_funding_type.find(t => t.label === 'Council funded')!.extra_per_week, 250)
  assert.equal(upliftIncome([{ funding_type: 'self', label: 's', weekly_total: 1000 }], 99).rise_percent, 50)   // capped
  assert.equal(upliftIncome([{ funding_type: 'self', label: 's', weekly_total: 1000 }], -5).rise_percent, 0)
})

test('weekend premium: the extra of a higher weekend rate on the weekend share; a lower weekend rate adds nothing; missing rates are listed', () => {
  const w = weekendPremium([P({ weekday_rate: 12, weekend_rate: 14.5 }), P({ name: 'L', weekday_rate: 12, weekend_rate: 11 }), P({ name: 'M', weekend_rate: null })], 2 / 7, 0)
  assert.ok(Math.abs(w.weekly - 2.5 * 40 * (2 / 7)) < 1e-9); assert.equal(w.counted, 2); assert.deepEqual(w.skipped, ['M'])
})

test('fee reviews: overdue, due in 30 60 90 days, none set, average and longest time since the last increase, income by funding type', () => {
  const r = reviewStats([
    { funding_type: 'self', weekly_value: 1000, last_increase_date: '2026-05-25', next_review_date: '2026-11-01' },      // overdue, 184 days
    { funding_type: 'self', weekly_value: 1200, last_increase_date: '2026-08-25', next_review_date: '2026-12-10' },      // 15 days
    { funding_type: 'council', weekly_value: 900, last_increase_date: null, next_review_date: '2027-01-15' },             // 51 days
    { funding_type: 'council', weekly_value: null, last_increase_date: null, next_review_date: null },
  ], '2026-11-25')
  assert.equal(r.reviews_overdue, 1); assert.equal(r.reviews_due_30_days, 1); assert.equal(r.reviews_due_60_days, 2); assert.equal(r.reviews_due_90_days, 2); assert.equal(r.no_review_date, 1)
  assert.equal(r.no_last_increase_date, 2); assert.equal(r.longest_days_since_last_increase, 184); assert.equal(r.average_days_since_last_increase, Math.round((184 + 92) / 2))
  assert.equal(r.weekly_income_total, 3100); assert.equal(r.weekly_income_by_type.find(t => t.funding_type === 'council')!.with_fee, 1)
})

test('COMPLAINTS: the tool says plainly there is no register; fields to capture are listed; nothing claims counts of complaints or incidents', () => {
  assert.equal(DATA_SITUATION.structured_register, false)
  assert.ok(DATA_SITUATION.summary.includes('does not hold a complaints, incidents, accidents or safeguarding register'))
  assert.ok(DATA_SITUATION.recommended_fields.length >= 8); assert.ok(DATA_SITUATION.pasted_text_rule.includes('remove names'))
  const job = agentById('complaints')!.prompt
  assert.ok(/does NOT hold a register/i.test(job) && /remove them|remove names/i.test(job) && /Never invent/i.test(job))
})

test('audit topics, action counts and most failed checks are worked out right, and the outputs carry no free text', () => {
  assert.equal(topicOf('Accident & Incident Book Audit'), 'accidents_incidents'); assert.equal(topicOf('Complaints and Concerns Audit'), 'complaints'); assert.equal(topicOf('Safeguarding Log Review'), 'safeguarding')
  assert.equal(topicOf('Duty of Candour and CQC Notifications Audit'), 'duty_of_candour'); assert.equal(topicOf('Kitchen Audit'), null); assert.equal(TOPICS.length, 4)
  const a = actionStats([
    { status: 'open', priority: 'immediate', due_date: '2026-11-01', done_at: null, created_at: '2026-10-01T00:00:00Z' },
    { status: 'in_progress', priority: 'priority', due_date: '2026-12-15', done_at: null, created_at: '2026-11-01T00:00:00Z' },
    { status: 'done', priority: 'monitor', due_date: '2026-10-30', done_at: '2026-10-20T00:00:00Z', created_at: '2026-10-10T00:00:00Z' },
    { status: 'done', priority: 'monitor', due_date: null, done_at: '2026-04-01T00:00:00Z', created_at: '2026-03-01T00:00:00Z' },
  ], '2026-11-25')
  assert.equal(a.open, 2); assert.equal(a.in_progress, 1); assert.equal(a.overdue, 1); assert.equal(a.done_in_last_90_days, 1); assert.equal(a.open_by_priority.immediate, 1)
  assert.equal(a.average_days_to_complete, Math.round((10 + 31) / 2)); assert.deepEqual(Object.keys(a).sort(), ['average_days_to_complete', 'done_in_last_90_days', 'in_progress', 'open', 'open_by_priority', 'overdue', 'raised_in_period'])
  const f = failureTable([{ questions: [{ text: 'Was it reported?', section: 'A', outcome: 'fail' }, { text: 'Was it logged?', section: 'A', outcome: 'pass' }] }, { questions: [{ text: 'Was it reported?', section: 'A', outcome: 'fail' }, { text: 'Was it logged?', section: 'A', outcome: 'na' }] }])
  assert.equal(f.length, 1); assert.deepEqual(f[0], { question: 'Was it reported?', section: 'A', times_failed: 2, times_asked: 2, fail_percent: 100 })
})

test('REGISTRATION: both agents are ready with four starters, every tool they list exists, the old incidents entry is replaced, and the prompts are editable on the Prompts page', () => {
  for (const id of ['finance', 'complaints']) {
    const a = agentById(id)!
    assert.equal(a.status, 'ready'); assert.equal(a.starters.length, 4); assert.ok(a.prompt.length > 200)
    for (const n of a.tools) assert.ok(TOOLS.some(t => t.name === n), `${id} -> ${n}`)
    assert.ok(ASK_PROMPTS.some(p => p.usage === `ask_agent_${id}` && p.default === a.prompt), id)
  }
  assert.ok(!AGENTS.some(a => a.id === 'incidents')); assert.equal(AGENTS.filter(a => a.id === 'finance').length, 1)
  assert.equal(AGENTS.length, 18)
  for (const t of [...FINANCE_TOOLS, ...INCIDENT_TOOLS]) { assert.ok(t.description.length > 40, t.name); assert.equal(t.input_schema.type, 'object'); assert.ok(TOOLS.includes(t), t.name) }
})

test('PRIVACY: the new files are read only, scoped to the account, never touch funding fields or health or the people audits were about, and the wording says locked', () => {
  const a = here('tools-finance.ts'), b = here('tools-incidents.ts')
  for (const t of [a, b]) {
    assert.ok(!/\.(create|update|updateMany|upsert|delete|deleteMany)\(|\$executeRaw|insert into/i.test(t.replace(/\/\/.*$/gm, '')), 'writes')
    assert.ok(!/sick_spells|sick_days|sickness/i.test(t.replace(/\/\/.*$/gm, '')), 'sickness')
    assert.ok(!FUNDING_WORDS.test(t), 'funding fields')
  }
  assert.ok(!/room_number|auditor_name|outcome_text|actions_text|subject_room|\.description\b/.test(b.replace(/\/\/.*$/gm, '')), 'incident tools must not read names, rooms or free text')
  for (const m of b.matchAll(/db\.(auditRun|auditAction|auditTemplate)\.findMany\(\{([^]*?)\}\)/g)) assert.ok(/tenant_id/.test(m[2]), `${m[1]} query is not scoped to the account`)
  assert.ok(/scoreRuns\(\[ctx\.tenantId\]/.test(b))
  assert.ok(a.includes("const LOCKED = 'Locked data: administrators only. Staff never see it.'")); assert.ok(/NOT profit/.test(a))
  assert.ok(/NEVER call income less staff cost/.test(agentById('finance')!.prompt)); assert.ok(/Locked: administrators only\./.test(agentById('finance')!.prompt))
})

test('ADMIN ONLY: the whole Ask feature is behind the pilot and the administrator check, and the funding for one person is only for a named resident', () => {
  const route = here('../../routes/ask.ts')
  assert.ok(/role !== 'admin'|role === 'admin'|askRoleFor/.test(route))   // the guard is now askRoleFor: administrators, and managers only when the account allows it
  assert.ok(/funding_for_person/.test(agentById('finance')!.prompt) && /names that person/.test(agentById('finance')!.prompt))
})
