import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { parseCsv, toSheet } from './sheet'
import { detect, PEOPLE_KINDS } from './columns'
import { stripSensitive } from './sensitive'
import { ingest } from './ingest'
import { namesOf } from './service'
import { compareRota, compareHolidaySheet, compareTraining, sameCourse, scrubStaffNames, letterShape, closestTemplates, newsletterShape, headingsOf } from './calc-more'
import { UPLOAD_AGENTS, UPLOAD_NEVER, uploadConfigFor, uploadPromptMeta } from '../agents-uploads'
import { AGENTS, agentById } from '../agents'
import { toolByName, TOOLS } from '../tools'
import { MORE_UPLOAD_TOOLS } from '../tools-uploads-more'
import { toolAllowed, MANAGER_TOOLS, MANAGER_MONEY_TOOLS } from '../manager-access'

const rd = (rel: string) => fs.readFileSync(path.join(__dirname, rel), 'utf8')
const sheetOf = (csv: string) => toSheet('S', parseCsv(csv))!
const staff = [
  { id: 'a', name: 'Helen Thomas', job_role: 'Care assistant', age: 30, weekday_rate: 12.71, weekend_rate: 12.71, contracted: 30 },
  { id: 'b', name: 'Sam Patel', job_role: 'Senior', age: 40, weekday_rate: 14, weekend_rate: 14, contracted: 40 },
  { id: 'c', name: 'Ola Bright', job_role: 'Cook', age: 25, weekday_rate: 13, weekend_rate: 13, contracted: 20 },
]

// ── Reading the new kinds of file ─────────────────────────────────────────────────────
test('KINDS: a rota, a holiday sheet and a training list are each recognised, and they list people (so the names are matched first)', () => {
  assert.equal(detect(sheetOf('Employee,Job role,Hours worked\nHelen Thomas,Care assistant,34\n')).kind, 'rota')
  assert.equal(detect(sheetOf('Name,Allowance,Taken,Remaining\nHelen Thomas,224,100,124\n')).kind, 'holiday')
  assert.equal(detect(sheetOf('Name,Course,Date completed,Expiry date\nHelen Thomas,Moving and handling,2026-01-01,2027-01-01\n')).kind, 'training')
  assert.equal(detect(sheetOf('Employee,Hourly rate,Hours\nHelen Thomas,12.71,160\n')).kind, 'payroll')   // payroll is unchanged
  assert.equal(detect(sheetOf('Supplier,Invoice date,Invoice total\nBidfood,2026-10-02,1200\n')).kind, 'invoice')   // so are invoices
  for (const k of ['payroll', 'rota', 'holiday', 'training']) assert.ok(PEOPLE_KINDS.includes(k as any))
})
test('KINDS: the paid hours column of a rota is not mistaken for holiday hours, and "hours left" is a holiday column', () => {
  const h = detect(sheetOf('Name,Hours allowance,Hours taken,Hours left\nA B,224,100,124\n'))
  assert.equal(h.kind, 'holiday'); assert.equal(h.roles.hours, null)
  assert.ok(h.roles.allowance != null && h.roles.taken != null && h.roles.remaining != null)
})
test('SENSITIVE: bank, NI, date of birth, sickness and notes are dropped from a training list and a holiday sheet before anything is kept', async () => {
  const t = await ingest(Buffer.from('Name,Course,Expiry date,NI Number,Date of birth,Notes,Sickness days\nHelen Thomas,Fire safety,2027-01-01,JJ123456C,1990-01-01,off with flu,5\n'), 'train.csv')
  assert.ok(t.ok); if (t.ok) { assert.equal(t.stored.doc_kind, 'training'); const all = JSON.stringify({ h: t.stored.headers, r: t.stored.rows }); for (const bad of ['JJ123456C', '1990-01-01', 'off with flu', 'Sickness days']) assert.ok(!all.includes(bad), bad); assert.ok(t.stored.dropped.length >= 3) }
  const h = await ingest(Buffer.from('Name,Allowance,Taken,Remaining,Absence reason,Email\nHelen Thomas,224,100,124,stress,h@x.com\n'), 'hol.csv')
  assert.ok(h.ok); if (h.ok) { const all = JSON.stringify({ h: h.stored.headers, r: h.stored.rows }); assert.ok(!all.includes('stress') && !all.includes('h@x.com')); assert.equal(h.stored.doc_kind, 'holiday') }
})
test('NAMES: a rota, holiday sheet or training list needs the names matched and confirmed; an invoice does not', async () => {
  const r = await ingest(Buffer.from('Name,Hours\nHelen Thomas,34\n'), 'rota.csv'); assert.ok(r.ok); if (r.ok) assert.equal(namesOf(r.stored).hasPeople, true)
  const i = await ingest(Buffer.from('Supplier,Invoice total,Invoice date\nBidfood,100,2026-10-01\n'), 'inv.csv'); assert.ok(i.ok); if (i.ok) assert.equal(namesOf(i.stored).hasPeople, false)
})

// ── The sums ──────────────────────────────────────────────────────────────────────────
test('ROTA: overtime, short hours, on target, and people on one side only', () => {
  const rows = [{ row: 0, name: 'Helen Thomas', hours: 66, contracted: null }, { row: 1, name: 'S Patel', hours: 70, contracted: null }, { row: 2, name: 'Ola', hours: 40.1, contracted: null }, { row: 3, name: 'Unknown Person', hours: 10, contracted: null }]
  const r = compareRota(rows, { '0': 'a', '1': 'b', '2': 'c', '3': null }, staff, 2)
  assert.equal(r.over_contracted[0].name, 'Helen Thomas'); assert.equal(r.over_contracted[0].overtime_hours, 6)   // 66 - 30x2
  assert.equal(r.under_contracted[0].name, 'Sam Patel'); assert.equal(r.under_contracted[0].short_by, 10)         // 80 - 70
  assert.equal(r.on_target, 1); assert.deepEqual(r.only_in_file, ['Unknown Person']); assert.equal(r.totals.overtime_hours, 6); assert.equal(r.weeks_used, 2)
  const own = compareRota([{ row: 0, name: 'H', hours: 28, contracted: 30 }], { '0': 'a' }, staff, 4)   // the file's own contracted column wins and is not multiplied
  assert.equal(own.under_contracted[0].short_by, 2)
})
test('HOLIDAY SHEET: differences per person, days are converted to hours, people on one side only', () => {
  const cs = [{ user_id: 'a', name: 'Helen Thomas', unit: 'hours', entitlement: 224, taken: 80, booked: 16, remaining: 128 }, { user_id: 'b', name: 'Sam Patel', unit: 'hours', entitlement: 224, taken: 0, booked: 0, remaining: 224 }]
  const rows = [{ row: 0, name: 'Helen T', allowance: 28, taken: 12, remaining: 16 }, { row: 1, name: 'Nobody', allowance: 20, taken: 1, remaining: 19 }]
  const r = compareHolidaySheet(rows, { '0': 'a', '1': null }, cs, 8)
  assert.equal(r.differ.length, 1); const g = r.differ[0].gaps
  assert.deepEqual(g.map((x: any) => x.what), ['taken'])   // allowance 28 days x 8 = 224 and remaining 16 x 8 = 128 agree; taken 12 x 8 = 96 against 80 does not
  assert.equal(g[0].difference, 16); assert.equal(r.agree, 0)
  assert.deepEqual(r.only_in_file, ['Nobody']); assert.deepEqual(r.only_in_carestream, ['Sam Patel'])
})
test('TRAINING: missing, expired and expiring courses, and where the file and CareStream disagree', () => {
  assert.ok(sameCourse('Moving and Handling', 'Moving & handling (annual)')); assert.ok(!sameCourse('Fire safety', 'First aid'))
  const m = { columns: [{ key: 'mh', label: 'Moving and handling' }, { key: 'fs', label: 'Fire safety' }, { key: 'sg', label: 'Safeguarding adults' }], rows: [
    { user_id: 'a', name: 'Helen Thomas', job_role: 'Care assistant', cells: { mh: { required: true, status: 'in_date' }, fs: { required: true, status: 'expired' }, sg: { required: true, status: 'in_date' } } },
    { user_id: 'b', name: 'Sam Patel', job_role: 'Senior', cells: { mh: { required: true, status: 'in_date' }, fs: { required: false, status: 'missing' }, sg: { required: false, status: 'missing' } } },
  ] }
  const rows = [
    { row: 0, name: 'Helen', course: 'Moving and handling', completed: null, expiry: '2026-12-01' },       // soon (today 2026-11-25)
    { row: 1, name: 'Helen', course: 'Fire safety', completed: null, expiry: '2028-01-01' },              // file in date, CareStream has a gap
    { row: 2, name: 'Sam', course: 'Moving and handling', completed: null, expiry: '2026-01-01' },        // expired in file
  ]
  const r = compareTraining(rows, { '0': 'a', '1': 'a', '2': 'b' }, m, '2026-11-25')
  const h = r.people_to_look_at.find((p: any) => p.name === 'Helen Thomas')!, s = r.people_to_look_at.find((p: any) => p.name === 'Sam Patel')!
  assert.deepEqual(h.required_but_not_in_file, ['Safeguarding adults']); assert.equal(h.expiring_soon_in_file[0].course, 'Moving and handling'); assert.deepEqual(h.file_says_in_date_but_carestream_has_a_gap, ['Fire safety'])
  assert.equal(s.expired_in_file[0].expired_on, '2026-01-01'); assert.equal(r.people_compared, 2)
})

// ── Letters and newsletters keep no staff names ───────────────────────────────────────
test('NAMES OUT: full names in either order and greeting names become [name]', () => {
  const names = ['Helen Thomas', 'Sam Patel']
  const t = scrubStaffNames('Dear Helen,\nThank you, Helen Thomas. Copy to Patel, Sam and Sam Patel.\nHi Sam,', names)
  assert.ok(!/Helen Thomas|Patel, Sam|Sam Patel/.test(t)); assert.match(t, /Dear \[name\]/); assert.match(t, /Hi \[name\]/)
})
test('LETTER and NEWSLETTER readings: structure, closest approved template, closest newsletter layout', () => {
  const l = letterShape('Dear [name],\n\nCongratulations, we are pleased to confirm your pay is now £13.21 an hour from 1 April 2027.\n\nYours sincerely,\nThe manager'); assert.equal(l.greeting_style, 'Dear [name],'); assert.equal(l.money_amounts, 1); assert.equal(l.tone, 'warm')
  const c = closestTemplates('pay review hourly rate increase', [{ id: 'pay-review', title: 'Pay review', text: 'a review of hourly pay rate' }, { id: 'welcome', title: 'Welcome', text: 'welcome to the team' }]); assert.equal(c[0].id, 'pay-review')
  const n = newsletterShape('## Our employee of the month\nText\n## Why they were chosen\nText\n## How to nominate next month\n- a', [{ id: 'eom', title: 'EOM', layout: 'standard', sections: ['Our employee of the month', 'Why they were chosen', 'A thank you', 'What colleagues said', 'How to nominate next month'] }, { id: 'x', title: 'X', sections: ['Winter pressures'] }])
  assert.equal(n.closest_templates[0].id, 'eom'); assert.equal(n.closest_templates[0].sections_matched, 3); assert.equal(n.bullet_points, 1)
  assert.ok(headingsOf('PURPOSE\nsome text here.\n1. Scope').length >= 2)
})

// ── Which agents take files ───────────────────────────────────────────────────────────
test('AGENTS: exactly Pay, Finance, Staff, Holiday, Training, Letters and Newsletters take files', () => {
  const on = AGENTS.filter(a => a.uploads && a.status === 'ready').map(a => a.id).sort()
  assert.deepEqual(on, ['finance', 'holiday', 'letters', 'newsletter', 'pay', 'staff', 'training'])
  for (const id of on) assert.ok(agentById(id)!.uploads!.hint.length > 20, id)
})
test('REFUSED: no agent that handles sickness, residents, complaints, policies or the quality reports takes files, and none of their tools are on an upload agent', () => {
  for (const id of UPLOAD_NEVER) { assert.equal(uploadConfigFor(id), null, id); const a = agentById(id); if (a) assert.ok(!a.uploads, id) }
  for (const id of ['complaints', 'residents', 'knowledge', 'audits', 'cqc-prep', 'governance']) assert.ok(UPLOAD_NEVER.includes(id), id)
  for (const id of ['staff', 'holiday', 'training', 'letters', 'newsletter']) for (const t of agentById(id)!.tools) assert.doesNotMatch(t, /sick|incident|complaint|resident_profile|residents_|knowledge_|document_outline|findings_extract/i, `${id}: ${t}`)
  for (const n of ['document_outline', 'document_find', 'findings_extract']) assert.equal(toolByName(n), undefined, n)   // left out on purpose
})
test('TOOLS: every new tool exists, belongs to its agent, is read only and administrators only', async () => {
  const names = MORE_UPLOAD_TOOLS.map(t => t.name).sort()
  assert.deepEqual(names, ['holiday_sheet_compare', 'letter_upload_review', 'newsletter_upload_reuse', 'rota_hours_compare', 'training_list_compare'])
  for (const t of MORE_UPLOAD_TOOLS) { assert.ok(TOOLS.includes(t), t.name); assert.doesNotMatch(t.name, /^(save|set|update|delete|send|propose|approve)_/); assert.equal(toolAllowed('manager', true, t.name), false); assert.equal(toolAllowed('manager', false, t.name), false); assert.ok(!MANAGER_TOOLS.has(t.name) && !MANAGER_MONEY_TOOLS.has(t.name))
    const r: any = await t.run({ tenantId: 't', userId: 'u', today: '2026-11-25', role: 'manager', conversationId: null } as any, {}); assert.match(String(r.data.error), /administrators only/) }
  const own = { staff: 'rota_hours_compare', holiday: 'holiday_sheet_compare', training: 'training_list_compare', letters: 'letter_upload_review', newsletter: 'newsletter_upload_reuse' } as Record<string, string>
  for (const [a, t] of Object.entries(own)) { const tools = agentById(a)!.tools; assert.ok(tools.includes(t) && tools.includes('upload_summary'), a); assert.ok(UPLOAD_AGENTS[a].tools.includes(t)) }
})
test('NO FILES: each tool says what to do when nothing is attached', async () => {
  for (const t of MORE_UPLOAD_TOOLS) { const r: any = await t.run({ tenantId: 't', userId: 'u', today: '2026-11-25', conversationId: null, role: 'admin' } as any, {}); assert.match(String(r.data.error), /no .* in this chat|not ready/i, t.name) }
})
test('NAMES OUT is wired for letters and newsletters only', () => {
  assert.equal(UPLOAD_AGENTS.letters.scrubNames, true); assert.equal(UPLOAD_AGENTS.newsletter.scrubNames, true)
  for (const id of ['pay', 'finance', 'staff', 'holiday', 'training']) assert.ok(!UPLOAD_AGENTS[id].scrubNames, id)
  assert.match(rd('service.ts'), /scrubStoredNames\(r\.stored, o\.tenantId\)/)
})
test('PROMPTS: each new agent has its own editable prompt, no dashes in what an administrator reads, and the shared rules stay', () => {
  const meta = uploadPromptMeta(); const usages = meta.map(m => m.usage)
  for (const id of ['staff', 'holiday', 'training', 'letters', 'newsletter']) assert.ok(usages.includes(`ask_uploads_${id}`), id)
  assert.ok(usages.includes('ask_uploads_rules'))
  for (const [id, c] of Object.entries(UPLOAD_AGENTS)) { assert.doesNotMatch(c.hint, /[–—]/, id); assert.doesNotMatch(c.note ?? '', /[–—]/, id); assert.ok(c.prompt.length > 80, id) }
  assert.match(UPLOAD_AGENTS.holiday.prompt, /Never mention health or the reason for any time off/); assert.match(UPLOAD_AGENTS.staff.prompt, /Do not talk about pay, health or the reasons for time off/)
})
test('SCREENS: the paperclip comes from the agent, the hint says what suits it, and the settings name the agents and the refusals', () => {
  const panel = fs.readFileSync(path.join(__dirname, '../../../../../web/src/components/ask/upload-panel.tsx'), 'utf8')
  assert.match(panel, /if \(!agent\.uploads\) return null/); assert.match(panel, /rota: 'Rota or timesheet'/)
  const overlay = fs.readFileSync(path.join(__dirname, '../../../../../web/src/components/ask/ask-overlay.tsx'), 'utf8'); assert.match(overlay, /agent\.uploads\.hint/)
  const settings = fs.readFileSync(path.join(__dirname, '../../../../../web/src/components/ask/ask-settings.tsx'), 'utf8')
  assert.match(settings, /Pay, Finance, Staff, Holiday, Training, Letters and Staff newsletter/); assert.match(settings, /never offered for anything about sickness, residents or complaints/); assert.doesNotMatch(settings, /[–—]/)
})
