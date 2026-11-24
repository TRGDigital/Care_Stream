import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { effectiveDays, validateSpell, holidayOverlap, sicknessReport, bradford, csvCell, toCsv, BOM, summaryCsv, dayByDayCsv, monthCsv, dayEquivalent, type SickSpell } from './sick-math'

const spell = (o: Partial<SickSpell> = {}): SickSpell => ({ id: 's1', user_id: 'u1', first_day: '2026-11-02', last_day: '2026-11-04', note: null, kind: 'sick', certificate: null, return_to_work_done: false, hours_default: 8,
  days: [{ day: '2026-11-02', hours: 8, part: 'full' }, { day: '2026-11-03', hours: 8, part: 'full' }, { day: '2026-11-04', hours: 4, part: 'am' }], ...o })
const people = [{ id: 'u1', name: 'Ana Cruz', job_role: 'Carer' }, { id: 'u2', name: 'Ben Hall', job_role: 'Nurse' }]

test('a closed spell counts its stored days only', () => { assert.equal(effectiveDays(spell(), '2026-12-01').length, 3) })

test('an open ended spell counts each day after the last stored day up to today, at the usual hours', () => {
  const open = spell({ last_day: null, hours_default: 7.5 })
  const d = effectiveDays(open, '2026-11-07')
  assert.deepEqual(d.map(x => x.day).slice(3), ['2026-11-05', '2026-11-06', '2026-11-07'])
  assert.equal(d[3].hours, 7.5)
  assert.equal(effectiveDays(spell({ last_day: null, days: [] }), '2026-11-03').length, 2)   // from the first day
})

test('validation: today is allowed, the future is not, and the dates must make sense', () => {
  const ok = validateSpell({ first_day: '2026-11-10', last_day: '2026-11-11', days: [{ day: '2026-11-10', hours: 8 }, { day: '2026-11-11', hours: 8, part: 'pm' }] }, '2026-11-11')
  assert.equal(ok.ok, true)
  assert.equal(validateSpell({ first_day: '2026-11-12', last_day: '2026-11-12', days: [{ day: '2026-11-12', hours: 8 }] }, '2026-11-11').ok, false)
  assert.equal(validateSpell({ first_day: '2026-11-10', last_day: '2026-11-09', days: [] }, '2026-11-11').ok, false)
  assert.equal(validateSpell({ first_day: '2026-11-10', last_day: '2026-11-11', days: [] }, '2026-11-11').ok, false)   // a closed spell needs days
  assert.equal(validateSpell({ first_day: '2026-11-10', still_off: true, days: [] }, '2026-11-11').ok, true)          // open ended may start empty
  assert.equal(validateSpell({ first_day: '2026-11-10', last_day: '2026-11-11', days: [{ day: '2026-11-10', hours: 14 }] }, '2026-11-11').ok, false)
  assert.equal(validateSpell({ first_day: '2026-11-10', last_day: '2026-11-11', days: [{ day: '2026-11-10', hours: 8 }, { day: '2026-11-10', hours: 8 }] }, '2026-11-11').ok, false)
  assert.equal(validateSpell({ first_day: '2026-11-10', last_day: '2026-11-11', days: [{ day: '2026-11-15', hours: 8 }] }, '2026-11-11').ok, false)
})

test('the note is short and trimmed, and a bad kind or certificate falls back', () => {
  const v = validateSpell({ first_day: '2026-11-10', last_day: '2026-11-10', days: [{ day: '2026-11-10', hours: 8 }], note: '  ' + 'x'.repeat(500), kind: 'nonsense', certificate: 'weird' }, '2026-11-11')
  assert.ok(v.ok && v.spell.note!.length === 200 && v.spell.kind === 'sick' && v.spell.certificate === null)
})

test('overlap with approved holiday is found by day', () => {
  const o = holidayOverlap(['2026-11-02', '2026-11-03'], [{ day: '2026-11-03', request_id: 'r1', hours: 8 }, { day: '2026-11-09', request_id: 'r2', hours: 8 }])
  assert.deepEqual(o.map(x => x.request_id), ['r1'])
})

test('the report counts spells, days (a half day is 0.5), hours, the Bradford factor and who is still off', () => {
  const r = sicknessReport({ spells: [spell(), spell({ id: 's2', first_day: '2026-11-20', last_day: null, days: [], hours_default: 8 }), spell({ id: 's3', user_id: 'u2', first_day: '2026-10-01', last_day: '2026-10-01', days: [{ day: '2026-10-01', hours: 8 }] })], people, from: '2026-11-01', to: '2026-11-30', today: '2026-11-21' })
  assert.equal(r.rows.length, 1)            // Ben's spell is outside the dates
  const a = r.rows[0]
  assert.equal(a.spells, 2); assert.equal(a.days, 2.5 + 2); assert.equal(a.hours, 20 + 16)
  assert.equal(a.still_off, true); assert.equal(a.bradford, 2 * 2 * 4.5)
  assert.equal(a.first_day, '2026-11-02'); assert.equal(a.last_day, '2026-11-21')
  assert.equal(bradford(3, 5), 45)
  assert.equal(dayEquivalent('am'), 0.5)
})

test('the report only counts days inside the dates and can be limited to one person', () => {
  const r = sicknessReport({ spells: [spell(), spell({ id: 's9', user_id: 'u2', first_day: '2026-11-03', last_day: '2026-11-03', days: [{ day: '2026-11-03', hours: 8 }] })], people, from: '2026-11-03', to: '2026-11-03', today: '2026-11-21', userId: 'u1' })
  assert.equal(r.rows.length, 1); assert.equal(r.days.length, 1); assert.equal(r.days[0].day, '2026-11-03')
})

test('CSV: byte order mark, Windows line breaks, quoting, and no formulas', () => {
  assert.equal(csvCell('a,b'), '"a,b"'); assert.equal(csvCell('say "hi"'), '"say ""hi"""')
  assert.equal(csvCell('=SUM(A1)'), "'=SUM(A1)"); assert.equal(csvCell('+44 1'), "'+44 1"); assert.equal(csvCell('@x'), "'@x"); assert.equal(csvCell(null), '')
  const out = toCsv([['a', 'b'], [1, 2]]); assert.ok(out.startsWith(BOM)); assert.ok(out.includes('\r\n'))
})

test('the files: sickness notes only when asked for, and the month file mixes holiday and sickness', () => {
  const r = sicknessReport({ spells: [spell({ note: 'hospital visit' })], people, from: '2026-11-01', to: '2026-11-30', today: '2026-11-21' })
  assert.ok(!dayByDayCsv(r, false).includes('hospital visit')); assert.ok(dayByDayCsv(r, true).includes('hospital visit'))
  assert.ok(summaryCsv(r).includes('Bradford factor'))
  const m = monthCsv('2026-11', [{ day: '2026-11-05', user_id: 'u1', name: 'Ana Cruz', job_role: 'Carer', type: 'Holiday', hours: 8, status: 'Approved' }, { day: '2026-11-02', user_id: 'u1', name: 'Ana Cruz', job_role: 'Carer', type: 'Sick', hours: 8, status: 'Recorded', note: 'secret' }, { day: '2026-12-01', user_id: 'u1', name: 'Ana Cruz', job_role: null, type: 'Holiday', hours: 8, status: 'Approved' }], false)
  assert.ok(m.includes('Holiday') && m.includes('Sick') && !m.includes('secret') && !m.includes('2026-12-01'))
  assert.ok(m.indexOf('2026-11-02') < m.indexOf('2026-11-05'))
})

test('sickness is admin only, behind the pilot gate, and never in a route a non admin can reach (source level)', () => {
  const holiday = fs.readFileSync(path.resolve(__dirname, '../routes/holiday.ts'), 'utf8')
  const mount = holiday.indexOf("holidayAdminRouter.use('/sick'")
  assert.ok(mount > holiday.indexOf('holidayAdminRouter.use(requireAdmin)') && holiday.indexOf('holidayAdminRouter.use(requireAdmin)') > holiday.indexOf('holidayAdminRouter.use(pilotGate)'))
  const hub = holiday.slice(0, holiday.indexOf('export const holidayAdminRouter'))
  assert.ok(!/sick/i.test(hub.replace(/buildSickRouter|holiday-sick/g, '')), 'no sickness in any non admin holiday route')
  const sick = fs.readFileSync(path.resolve(__dirname, '../routes/holiday-sick.ts'), 'utf8')
  assert.ok(!/tenant_id: \s*undefined/.test(sick))
  for (const fn of ['loadSpells(tenantId', 'loadSpell(tenantId', 'deleteSpell(tenantId', 'updateSpell(tenantId']) assert.ok(sick.includes(fn), `${fn} is tenant scoped`)
  const data = fs.readFileSync(path.resolve(__dirname, './sick-data.ts'), 'utf8')
  assert.ok(/where tenant_id = \$1/.test(data) && /tenant_id=\$1 and id=\$2/.test(data) && /id = \$1 and tenant_id = \$2/.test(data), 'every query is limited to the account')
})
