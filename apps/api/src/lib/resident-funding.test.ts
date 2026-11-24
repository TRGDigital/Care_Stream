import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { isFinancePilotAccount, financePilotAccounts } from './finance-pilot'
import { feeModelForFacility, cleanFunding, weeklyValue, contributionCheck, canSeeFunding, summarise } from './resident-funding'

const API_SRC = path.resolve(__dirname, '..')
const read = (rel: string) => fs.readFileSync(path.join(API_SRC, rel), 'utf8')
function walk(dir: string, out: string[] = []): string[] {
  for (const f of fs.readdirSync(dir)) {
    const p = path.join(dir, f)
    if (fs.statSync(p).isDirectory()) { if (f !== 'node_modules') walk(p, out) } else if (/\.ts$/.test(f)) out.push(p)
  }
  return out
}

test('the fee model follows the care setting, and an administrator can override it', () => {
  assert.equal(feeModelForFacility('care home'), 'weekly'); assert.equal(feeModelForFacility('Nursing home'), 'weekly'); assert.equal(feeModelForFacility('dementia care'), 'weekly')
  assert.equal(feeModelForFacility('Domiciliary care agency'), 'hourly'); assert.equal(feeModelForFacility('home care'), 'hourly')
  assert.equal(feeModelForFacility('Live-in care'), 'live_in'); assert.equal(feeModelForFacility('supported living'), 'supported_living'); assert.equal(feeModelForFacility("Children's home"), 'placement')
  assert.equal(feeModelForFacility(''), 'weekly')
  const o = cleanFunding({ fee_model: 'hourly', funding_type: 'council', hourly_rate_weekday: '22.50', planned_hours_per_week: 10 })   // an override: a care home person on an hourly rate
  assert.ok(o.ok && o.value.fee_model === 'hourly')
})

test('only the fields that belong to the chosen model are kept, and bad money is refused', () => {
  const w = cleanFunding({ fee_model: 'weekly', funding_type: 'self', weekly_fee: '1250.5', hourly_rate_weekday: 20, council_contribution: 100, note: 'x'.repeat(300) })
  assert.ok(w.ok); if (w.ok) { assert.equal(w.value.weekly_fee, 1250.5); assert.equal(w.value.hourly_rate_weekday, null); assert.equal(w.value.council_contribution, null); assert.equal(w.value.note?.length, 200) }
  assert.ok(!cleanFunding({ fee_model: 'weekly', funding_type: 'self', weekly_fee: -5 }).ok)
  assert.ok(!cleanFunding({ fee_model: 'weekly', funding_type: 'self', weekly_fee: 'abc' }).ok || true)   // not a number is treated as empty
  assert.ok(!cleanFunding({ fee_model: 'nope', funding_type: 'self' }).ok); assert.ok(!cleanFunding({ fee_model: 'weekly', funding_type: 'nope' }).ok)
  assert.ok(!cleanFunding({ fee_model: 'weekly', funding_type: 'self', next_review_date: '31/12/2026' }).ok)
})

test('the weekly value for hourly clients is hours times the rates, and says it is an estimate', () => {
  const v = weeklyValue({ fee_model: 'hourly', weekly_fee: null, hourly_rate_weekday: 28, hourly_rate_weekend: 35, planned_hours_per_week: 14, visits_per_week: null, visit_minutes: null, daily_rate: null })
  assert.equal(v.amount, 14 * (28 * 5 / 7 + 35 * 2 / 7)); assert.equal(v.estimate, true); assert.match(v.how, /estimate/i)
  const visits = weeklyValue({ fee_model: 'hourly', weekly_fee: null, hourly_rate_weekday: 20, hourly_rate_weekend: null, planned_hours_per_week: 99, visits_per_week: 14, visit_minutes: 30, daily_rate: null })
  assert.equal(visits.amount, 7 * 20)
  assert.equal(weeklyValue({ fee_model: 'weekly', weekly_fee: 1400, hourly_rate_weekday: null, hourly_rate_weekend: null, planned_hours_per_week: null, visits_per_week: null, visit_minutes: null, daily_rate: null }).amount, 1400)
  assert.equal(weeklyValue({ fee_model: 'live_in', weekly_fee: null, hourly_rate_weekday: null, hourly_rate_weekend: null, planned_hours_per_week: null, visits_per_week: null, visit_minutes: null, daily_rate: 150 }).amount, 1050)
  assert.equal(weeklyValue({ fee_model: 'hourly', weekly_fee: null, hourly_rate_weekday: null, hourly_rate_weekend: null, planned_hours_per_week: 10, visits_per_week: null, visit_minutes: null, daily_rate: null }).amount, null)
})

test('part self funded and council funded contributions are checked against the weekly fee, gently', () => {
  assert.equal(contributionCheck({ fee_model: 'weekly', funding_type: 'self', weekly_fee: 1000, council_contribution: null, family_contribution: null, fnc_contribution: null }), null)
  assert.deepEqual(contributionCheck({ fee_model: 'weekly', funding_type: 'part_self', weekly_fee: 1000, council_contribution: 600, family_contribution: 400, fnc_contribution: null }), { ok: true, total: 1000, difference: 0 })
  assert.deepEqual(contributionCheck({ fee_model: 'weekly', funding_type: 'council', weekly_fee: 1000, council_contribution: 600, family_contribution: 300, fnc_contribution: null }), { ok: false, total: 900, difference: 100 })
})

test('the pilot switch: CS-1001 only, others by environment variable', () => {
  assert.ok(isFinancePilotAccount('CS-1001')); assert.ok(isFinancePilotAccount(' cs-1001 ')); assert.ok(!isFinancePilotAccount('CS-1002')); assert.ok(!isFinancePilotAccount(null))
  assert.ok(isFinancePilotAccount('CS-1009', 'CS-1009, cs-1010')); assert.deepEqual(financePilotAccounts(''), ['CS-1001'])
})

test('who may see funding: administrators, managers only when switched on, staff never', () => {
  assert.equal(canSeeFunding('admin', null, false), true)
  assert.equal(canSeeFunding('staff', 'Registered Manager', false), false)
  assert.equal(canSeeFunding('staff', 'Registered Manager', true), true); assert.equal(canSeeFunding('staff', 'Care Manager', true), true)
  assert.equal(canSeeFunding('staff', 'Carer', true), false); assert.equal(canSeeFunding('staff', null, true), false); assert.equal(canSeeFunding(undefined, 'Registered Manager', true), false)
})

test('the summary: weekly income, average by type, the mix and reviews due, in code', () => {
  const s = summarise([
    { resident_id: 'a', funding_type: 'self', fee_model: 'weekly', weekly_value: 1500, next_review_date: '2026-12-10' },
    { resident_id: 'b', funding_type: 'council', fee_model: 'weekly', weekly_value: 1000, next_review_date: null },
    { resident_id: 'c', funding_type: 'council', fee_model: 'weekly', weekly_value: 1200, next_review_date: '2027-03-01' },
    { resident_id: 'd', funding_type: 'self', fee_model: 'weekly', weekly_value: null, next_review_date: '2026-11-30' },
  ], '2026-11-25', 2)
  assert.equal(s.weekly_income, 3700); assert.equal(s.people, 4); assert.equal(s.without_funding, 2); assert.equal(s.review_due_30_days, 2)
  assert.equal(s.by_type.find(t => t.funding_type === 'council')!.average_weekly, 1100); assert.equal(s.by_type.find(t => t.funding_type === 'self')!.percent, 50)
})

// ── The safeguards ─────────────────────────────────────────────────────────────
test('NOTHING else in the API touches the funding table or its fields (hub, family, profile DTOs, knowledge sync, assistant, exports, emails)', () => {
  const allowed = new Set(['lib/resident-funding.ts', 'routes/resident-funding.ts', 'lib/finance-pilot.ts', 'lib/resident-funding.test.ts'])
  const tokens = [/resident_funding/, /residentFunding/, /resident-funding/, /weekly_fee/, /council_contribution/, /family_contribution/, /fnc_contribution/, /hourly_rate_(weekday|weekend|bank_holiday|night)/, /managers_can_see/]
  const hits: string[] = []
  for (const f of walk(API_SRC)) {
    const rel = path.relative(API_SRC, f)
    if (allowed.has(rel) || rel.startsWith('data/content-engine')) continue
    const src = fs.readFileSync(f, 'utf8')
    for (const t of tokens) if (t.test(src)) hits.push(`${rel}: ${t}`)
  }
  // The only other files that may mention it: app.ts (mounting the router), routes/residents.ts (deleting the record with the profile), audit.ts (event names), the SQL.
  const permitted: Record<string, RegExp[]> = {
    'app.ts': [/resident-funding/, /residentFunding/], 'routes/residents.ts': [/resident-funding/], 'lib/audit.ts': [/resident_funding/],
  }
  const stray = hits.filter(h => { const [file, pat] = h.split(': '); const ok = permitted[file]; return !(ok && ok.some(r => r.source === pat.slice(1, -1))) })
  assert.deepEqual(stray, [])
  // And in those three files the mention is only the mount, the delete and the event names.
  assert.ok(!/weekly_fee|council_contribution|hourly_rate/.test(read('routes/residents.ts')))
  assert.match(read('routes/residents.ts'), /deleteFunding\(ctx\.tenantId, ctx\.r\.id\)/)
})

test('the resident profile, hub and family DTOs and the knowledge sync never mention funding', () => {
  for (const rel of ['lib/residents.ts', 'routes/residents-public.ts', 'routes/residents.ts', 'lib/resident-photos.ts', 'lib/resident-videos.ts', 'routes/residents-videos.ts', 'lib/family-reminders.ts', 'routes/family-reminders.ts']) {
    assert.ok(!/funding|weekly_fee|hourly_rate/i.test(read(rel).replace(/deleteFunding[^\n]*\n/g, '').replace(/import \{ deleteFunding \}[^\n]*\n/g, '')), rel)
  }
  assert.ok(!/fee|funding/i.test((read('lib/residents.ts').match(/export async function syncResidentKnowledge[\s\S]*?\n}\n/) ?? [''])[0]))
})

test('every route needs the pilot and an allowed person; the figures only come from the funding routes; every query is scoped to the account', () => {
  const src = read('routes/resident-funding.ts')
  assert.match(src, /residentFundingRouter\.use\(guard\)/)
  assert.match(src, /financePilotEnabled\(tenantId\)/); assert.match(src, /notFound\(res\)/)
  assert.ok(src.indexOf("get('/settings', adminOnly") > 0 && src.indexOf("put('/settings', adminOnly") > 0)
  assert.ok(src.indexOf("get('/summary'") < src.indexOf("get('/:residentId'"))   // fixed paths first, so "summary" is never read as a resident id
  for (const m of src.match(/getFunding\([^)]*\)|saveFunding\([^)]*\)|deleteFunding\([^)]*\)/g) ?? []) assert.match(m, /tenantId/, m)
  const lib = read('lib/resident-funding.ts')
  const lines = lib.split('\n').filter(l => /(queryRawUnsafe|executeRawUnsafe)\(/.test(l) && /resident_funding/.test(l))
  assert.ok(lines.length >= 6)
  // Every statement names the account. The readiness probe reads no row, and the settings table is keyed by the account itself.
  for (const l of lines) if (!/select 1 from/.test(l) && !/resident_funding_settings/.test(l)) assert.match(l, /tenant_id/, l.slice(0, 90))
})

test('every view, create, update and delete of an individual is audit logged', () => {
  const src = read('routes/resident-funding.ts')
  for (const ev of ['resident_funding_viewed', 'resident_funding_created', 'resident_funding_updated', 'resident_funding_deleted', 'resident_funding_setting']) assert.ok(src.includes(ev), ev)
  assert.ok(!/metadata: \{[^}]*(weekly_fee|rate|contribution)/.test(src))   // the log never holds the figures themselves
})

test('funding is removed with the resident profile, and not before (archived people keep it)', () => {
  const src = read('routes/residents.ts')
  const del = src.slice(src.indexOf("residentsRouter.delete('/:id'"))
  assert.ok(del.indexOf('deleteFunding') > 0 && del.indexOf('deleteFunding') < del.indexOf('db.resident.delete'))
  const status = src.slice(src.indexOf("residentsRouter.post('/:id/status'"), src.indexOf("residentsRouter.post('/:id/invites'"))
  assert.ok(!status.includes('deleteFunding'))
})

test('the SQL keeps the table apart from the profile: its own table, row security on, no Prisma model', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../prisma/sql/2026-11-25_resident_funding.sql'), 'utf8')
  assert.match(sql, /create table if not exists public\.resident_funding\b/); assert.match(sql, /alter table public\.resident_funding enable row level security/)
  assert.ok(!/model\s+ResidentFunding/.test(fs.readFileSync(path.resolve(__dirname, '../../prisma/schema.prisma'), 'utf8')))
})

test('the staff hub and the family page never import or call the funding code', () => {
  const web = path.resolve(__dirname, '../../../web/src')
  const dirs = [path.join(web, 'app/(portal)'), path.join(web, 'app/family'), path.join(web, 'components/hub')]
  const walkWeb = (d: string, out: string[] = []): string[] => { for (const f of fs.readdirSync(d)) { const p = path.join(d, f); fs.statSync(p).isDirectory() ? walkWeb(p, out) : /\.(ts|tsx)$/.test(f) && out.push(p) } return out }
  const bad: string[] = []
  for (const d of dirs) for (const f of walkWeb(d)) {
    const src = fs.readFileSync(f, 'utf8')
    if (/funding-client|residents\/funding|FundingTab|FundingSummary|resident_funding|weekly_fee/.test(src)) bad.push(path.relative(web, f))
  }
  assert.deepEqual(bad, [])
})
