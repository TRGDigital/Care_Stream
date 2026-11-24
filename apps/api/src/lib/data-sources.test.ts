import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import {
  parseNlw, validateNlw, parseOnsRate, validateRate, parseBankHolidays, validateBankHolidays, parseSsp, validateSsp, parseMileage, validateMileage,
  validateRealLivingWage, applyCheck, applyManual, checkAll, toFigure, isStale, asOfText, sameFigure, sourceByKey, SOURCES, type Row, type Db, type RunDeps,
} from './data-sources'

const fx = (n: string) => JSON.parse(fs.readFileSync(path.join(__dirname, '__fixtures__', n), 'utf8'))
const TODAY = '2026-11-24'

test('the National Living Wage is read from the real GOV.UK page: current row and the announced next one', () => {
  const f = parseNlw(fx('gov-nlw.json'), TODAY)
  assert.equal(f.effective_from, '2026-04-01')
  assert.deepEqual({ ...f.value.current, label: undefined }, { from: '2026-04-01', label: undefined, age21: 12.71, age18to20: 10.85, under18: 8, apprentice: 8 })
  assert.equal(f.value.upcoming.length, 1)
  assert.equal(f.value.upcoming[0].from, '2027-04-01'); assert.equal(f.value.upcoming[0].age21, 13.21)
  assert.equal(validateNlw(f.value), null)
})
test('once April 2027 arrives the upcoming row becomes the current one', () => {
  const f = parseNlw(fx('gov-nlw.json'), '2027-04-02')
  assert.equal(f.value.current.age21, 13.21); assert.equal(f.effective_from, '2027-04-01'); assert.equal(f.value.upcoming.length, 0)
})
test('a changed NLW page is refused, not guessed at', () => {
  const page = fx('gov-nlw.json')
  assert.throws(() => parseNlw({ details: { body: '<p>nothing here</p>' } }, TODAY), /Current rates/)
  assert.throws(() => parseNlw({ details: { body: page.details.body.replace('Apprentice</th>', 'Trainee</th>') } }, TODAY), /columns/)
  assert.ok(validateNlw({ current: { age21: 30, age18to20: 10, under18: 8, apprentice: 8 } }))             // out of range
  assert.ok(validateNlw({ current: { age21: 12, age18to20: 13, under18: 8, apprentice: 8 } }))             // bands out of order
})

test('CPI and CPIH are read from the ONS series and checked against the series id', () => {
  const cpi = parseOnsRate(fx('ons-cpi.json'), 'D7G7')
  assert.deepEqual(cpi.value.latest, { period: '2026-10', rate: 3.6 })
  assert.equal(cpi.effective_from, '2026-10-01'); assert.equal(cpi.next_check_due, '2026-12-17')   // the day after the next release (16 December 2026)
  assert.equal(cpi.value.series.length, 13)
  assert.equal(parseOnsRate(fx('ons-cpih.json'), 'L55O').value.latest.rate, 3.7)
  assert.throws(() => parseOnsRate(fx('ons-cpi.json'), 'L55O'), /not L55O/)
  assert.equal(validateRate(cpi.value), null)
  assert.ok(validateRate({ latest: { period: '2026-10', rate: 90 } }))
  assert.ok(validateRate({ latest: { period: 'October', rate: 3 } }))
})

test('bank holidays for England and Wales are read, and this year and next must look right', () => {
  const f = parseBankHolidays(fx('gov-bank-holidays.json'))
  assert.ok(f.value.events.length > 50)
  assert.equal(validateBankHolidays(f.value, TODAY), null)
  const noXmas = { events: f.value.events.filter((e: any) => !(e.date.startsWith('2027') && /^Christmas Day/.test(e.title))) }
  assert.ok(f.value.events.some((e: any) => e.date === '2027-12-27' && e.title === 'Christmas Day'), 'the real 2027 Christmas Day is the substitute Monday')
  assert.match(validateBankHolidays(noXmas, TODAY) ?? '', /Christmas/)
  assert.ok(validateBankHolidays({ events: f.value.events.filter((e: any) => !e.date.startsWith('2026')) }, TODAY))
  assert.throws(() => parseBankHolidays({}), /No bank holidays/)
})

test('the Statutory Sick Pay weekly rate is read from the real page text', () => {
  const f = parseSsp(fx('gov-ssp.json'))
  assert.equal(f.value.weekly_rate_gbp, 123.25); assert.equal(f.value.maximum_weeks, 28); assert.equal(f.value.earnings_share_pct, 80)
  assert.equal(f.effective_from, null)   // GOV.UK does not date it
  assert.equal(validateSsp(f.value), null)
  assert.ok(validateSsp({ weekly_rate_gbp: 5 }))
  assert.throws(() => parseSsp({ details: { parts: [{ slug: 'what-youll-get', body: '<p>Changed wording</p>' }] } }), /not found/)
})

test('HMRC mileage rates are read, including the date the car rate changed', () => {
  const f = parseMileage(fx('gov-mileage.json'))
  assert.deepEqual(f.value, { cars_vans_first_10000_pence: 55, cars_vans_after_10000_pence: 25, cars_vans_rate_from: '2026-04-06', cars_vans_previous_first_10000_pence: 45, motorcycle_pence: 24, bike_pence: 20 })
  assert.equal(f.effective_from, '2026-04-06')
  assert.equal(validateMileage(f.value), null)
  assert.ok(validateMileage({ ...f.value, cars_vans_after_10000_pence: 90 }))
  assert.throws(() => parseMileage({ details: { parts: [{ slug: 'rules-for-tax', body: '<p>Cars and vans rates are on another page</p>' }] } }), /could not be read|not found/)
})

test('the Real Living Wage is a manual figure with a sensible range', () => {
  assert.equal(sourceByKey('real_living_wage')!.fetch, null)
  assert.equal(validateRealLivingWage({ hourly_rate_gbp: 14.2 }), null)
  assert.ok(validateRealLivingWage({ hourly_rate_gbp: 1.4 }))
})

// ── status rules ──
const def = sourceByKey('ssp')!
const NOW = '2026-11-24T07:00:00.000Z'
const ok = (value: any, effective_from: string | null = null) => ({ ok: true as const, fetched: { effective_from, value } })

test('first check records the figure; the same figure again is "no change"; a different figure is "changed" and keeps the old one', () => {
  const a = applyCheck(def, null, ok({ weekly_rate_gbp: 123.25 }), NOW, TODAY)
  assert.equal(a.outcome.result, 'first'); assert.equal(a.row.status, 'ok'); assert.equal(a.history, true)
  const b = applyCheck(def, a.row, ok({ weekly_rate_gbp: 123.25 }), '2026-12-01T07:00:00.000Z', '2026-12-01')
  assert.equal(b.outcome.result, 'unchanged'); assert.equal(b.history, false)
  const c = applyCheck(def, b.row, ok({ weekly_rate_gbp: 130 }), '2027-04-06T07:00:00.000Z', '2027-04-06')
  assert.equal(c.outcome.result, 'changed'); assert.equal(c.row.status, 'changed'); assert.deepEqual(c.row.previous_value, { weekly_rate_gbp: 123.25 }); assert.equal(c.history, true)
  const d = applyCheck(def, c.row, ok({ weekly_rate_gbp: 130 }), '2027-04-13T07:00:00.000Z', '2027-04-13')
  assert.equal(d.row.status, 'changed')   // still marked changed for two weeks
  const e = applyCheck(def, d.row, ok({ weekly_rate_gbp: 130 }), '2027-04-27T07:00:00.000Z', '2027-04-27')
  assert.equal(e.row.status, 'ok')
})
test('a failed fetch or a weird value never replaces the last good figure', () => {
  const good = applyCheck(def, null, ok({ weekly_rate_gbp: 123.25 }), NOW, TODAY).row
  const failed = applyCheck(def, good, { ok: false, error: 'HTTP 503' }, '2026-12-01T07:00:00.000Z', '2026-12-01')
  assert.equal(failed.outcome.result, 'failed'); assert.equal(failed.row.status, 'failed'); assert.deepEqual(failed.row.value, { weekly_rate_gbp: 123.25 })
  const weird = applyCheck(def, good, ok({ weekly_rate_gbp: 5 }), '2026-12-01T07:00:00.000Z', '2026-12-01')
  assert.equal(weird.outcome.result, 'needs_review'); assert.equal(weird.row.status, 'needs_review'); assert.deepEqual(weird.row.value, { weekly_rate_gbp: 123.25 })
  assert.match(weird.row.last_error ?? '', /not accepted/)
  const recovered = applyCheck(def, weird.row, ok({ weekly_rate_gbp: 123.25 }), '2026-12-08T07:00:00.000Z', '2026-12-08')
  assert.equal(recovered.row.status, 'ok'); assert.equal(recovered.row.last_error, null)
})
test('the NLW "page updated" stamp and the repeating series do not count as the figure changing', () => {
  const f = parseNlw(fx('gov-nlw.json'), TODAY)
  assert.ok(sameFigure('nlw', f.value, { ...f.value, page_updated: '2030-01-01' }))
  const cpi = parseOnsRate(fx('ons-cpi.json'), 'D7G7').value
  assert.ok(sameFigure('cpi', cpi, { ...cpi, series: [] }))
  assert.ok(!sameFigure('cpi', cpi, { ...cpi, latest: { period: '2026-11', rate: 3.9 } }))
})

// ── staleness and the words agents use ──
test('staleness: not fetched within its cadence, or the figure itself is old at the source', () => {
  const nlw = sourceByKey('nlw')!, cpi = sourceByKey('cpi')!
  const row = (o: Partial<Row>): Row => ({ key: 'x', name: 'x', publisher: 'p', source_url: 'u', update_frequency: '', effective_from: null, value: {}, previous_value: null, fetched_at: '2026-11-20T07:00:00Z', last_checked_at: null, last_changed_at: null, next_check_due: null, status: 'ok', last_error: null, note: null, ...o })
  assert.equal(isStale(nlw, row({ effective_from: '2026-04-01' }), TODAY), false)
  assert.equal(isStale(nlw, row({ effective_from: '2025-04-01' }), TODAY), true)         // still showing last year's rates
  assert.equal(isStale(nlw, row({ fetched_at: '2025-09-01T00:00:00Z', effective_from: '2026-04-01' }), TODAY), true)   // not confirmed for over 13 months
  assert.equal(isStale(cpi, row({ effective_from: '2026-10-01' }), TODAY), false)
  assert.equal(isStale(cpi, row({ effective_from: '2026-07-01' }), TODAY), true)         // the latest month is more than 75 days old
  assert.equal(isStale(cpi, row({ fetched_at: '2026-08-01T00:00:00Z', effective_from: '2026-10-01' }), TODAY), true)  // not confirmed for over 2 months
  assert.equal(isStale(cpi, row({ fetched_at: null }), TODAY), true)
})
test('getFigure style output: a failed or needs-review figure is never "usable"; a stale one is usable with a warning; "as of" is always said', () => {
  const d = sourceByKey('nlw')!
  const base: Row = { key: 'nlw', name: d.name, publisher: 'GOV.UK', source_url: d.source_url, update_frequency: '', effective_from: '2026-04-01', value: { current: { age21: 12.71 } }, previous_value: null, fetched_at: '2026-11-20T07:00:00Z', last_checked_at: '2026-11-24T07:00:00Z', last_changed_at: null, next_check_due: null, status: 'ok', last_error: null, note: null }
  const good = toFigure(d, base, TODAY); assert.equal(good.usable, true); assert.equal(good.warning, null); assert.match(asOfText(good), /^Source: GOV.UK, as of 2026-04-01\.$/)
  const failed = toFigure(d, { ...base, status: 'failed' }, TODAY); assert.equal(failed.usable, false); assert.match(failed.warning ?? '', /could not be confirmed/)
  const review = toFigure(d, { ...base, status: 'needs_review' }, TODAY); assert.equal(review.usable, false)
  const stale = toFigure(d, { ...base, fetched_at: '2025-01-01T00:00:00Z' }, TODAY); assert.equal(stale.usable, true); assert.equal(stale.stale, true); assert.match(asOfText(stale), /may be out of date/)
  const none = toFigure(d, null, TODAY); assert.equal(none.usable, false); assert.equal(none.value, null)
  const manual = toFigure(d, { ...base, status: 'manual', note: 'GOV.UK page changed layout' }, TODAY); assert.equal(manual.usable, true); assert.match(manual.warning ?? '', /entered by hand/)
})

// ── manual entries ──
test('a manual figure must pass the same checks, and an auto source needs a reason', () => {
  const nlw = sourceByKey('nlw')!
  assert.ok('error' in applyManual(nlw, null, { value: { current: { age21: 99, age18to20: 1, under18: 1, apprentice: 1 } }, note: 'x' }, NOW))
  assert.match((applyManual(sourceByKey('ssp')!, null, { value: { weekly_rate_gbp: 130 } }, NOW) as any).error, /why/)
  const r = applyManual(sourceByKey('ssp')!, null, { value: { weekly_rate_gbp: 130 }, effective_from: '2027-04-06', note: 'Parser broke' }, NOW) as { row: Row }
  assert.equal(r.row.status, 'manual'); assert.equal(r.row.value.weekly_rate_gbp, 130)
  const rlw = applyManual(sourceByKey('real_living_wage')!, null, { value: { hourly_rate_gbp: 14.2 }, effective_from: '2026-10-20' }, NOW) as { row: Row }
  assert.equal(rlw.row.status, 'manual')   // the manual only source does not need a reason
  assert.match((applyManual(sourceByKey('real_living_wage')!, null, { value: { hourly_rate_gbp: 14.2 }, effective_from: 'tomorrow' }, NOW) as any).error, /effective date/)
})

// ── the weekly run and the email ──
function harness(pages: Record<string, any>) {
  const rows = new Map<string, Row>(); const hist: string[] = []; const mails: Array<{ subject: string; lines: string[] }> = []
  const db: Db = { all: async () => [...rows.values()], save: async r => { rows.set(r.key, { ...r }) }, history: async (k, _r, s) => { hist.push(`${k}:${s}`) } }
  const deps = (now: string): RunDeps => ({
    db, now: () => new Date(now),
    get: async url => { const p = pages[url]; if (p === undefined) throw new Error('HTTP 404'); if (p instanceof Error) throw p; return p },
    notify: async o => { mails.push(o) },
  })
  return { rows, hist, mails, deps }
}
const PAGES = () => ({
  'https://www.gov.uk/api/content/national-minimum-wage-rates': fx('gov-nlw.json'),
  'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g7/mm23/data': fx('ons-cpi.json'),
  'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data': fx('ons-cpih.json'),
  'https://www.gov.uk/bank-holidays.json': fx('gov-bank-holidays.json'),
  'https://www.gov.uk/api/content/statutory-sick-pay': fx('gov-ssp.json'),
  'https://www.gov.uk/api/content/expenses-and-benefits-business-travel-mileage': fx('gov-mileage.json'),
})
test('the first run fills the register and sends no email; a quiet week sends no email', async () => {
  const h = harness(PAGES())
  const first = await checkAll(h.deps('2026-11-24T07:00:00Z'))
  assert.equal(first.failed, 0); assert.equal(first.needs_review, 0); assert.equal(first.emailed, false); assert.equal(h.mails.length, 0)
  assert.equal(h.rows.size, SOURCES.length); assert.equal(h.rows.get('real_living_wage')!.status, 'manual')
  assert.equal(h.rows.get('nlw')!.status, 'ok'); assert.equal(h.rows.get('cpi')!.next_check_due, '2026-12-17')
  const quiet = await checkAll(h.deps('2026-12-01T07:00:00Z'))
  assert.equal(quiet.changed, 0); assert.equal(quiet.emailed, false); assert.equal(h.mails.length, 0)
  // CPI is monthly: it is skipped until its next release is out, then checked again
  assert.ok(quiet.outcomes.find(o => o.key === 'cpi')!.result === 'skipped_not_due')
})
test('a change, a failure and a weird value each produce ONE email for the run', async () => {
  const pages = PAGES() as Record<string, any>
  const h = harness(pages)
  await checkAll(h.deps('2026-11-24T07:00:00Z'))
  const ssp = fx('gov-ssp.json'); ssp.details.parts[1].body = ssp.details.parts[1].body.replace('123.25', '130.00')
  pages['https://www.gov.uk/api/content/statutory-sick-pay'] = ssp
  pages['https://www.gov.uk/bank-holidays.json'] = new Error('HTTP 503')
  const mileage = fx('gov-mileage.json'); mileage.details.parts[0].body = mileage.details.parts[0].body.replace('55p from', '555p from')
  pages['https://www.gov.uk/api/content/expenses-and-benefits-business-travel-mileage'] = mileage
  const run = await checkAll(h.deps('2026-12-01T07:00:00Z'))
  assert.equal(run.changed, 1); assert.equal(run.failed, 1); assert.equal(run.needs_review, 1); assert.equal(run.emailed, true)
  assert.equal(h.mails.length, 1); assert.equal(h.mails[0].lines.length, 3)
  assert.match(h.mails[0].lines.join('\n'), /£123\.25 a week.*£130 a week|123.25.*130/)
  assert.equal(h.rows.get('ssp')!.status, 'changed'); assert.equal(h.rows.get('bank_holidays')!.status, 'failed'); assert.equal(h.rows.get('mileage')!.status, 'needs_review')
  assert.equal(h.rows.get('mileage')!.value.cars_vans_first_10000_pence, 55)   // the last good figure was kept
  assert.ok(h.hist.includes('ssp:changed'))
})
test('a manual figure is left alone by the weekly run, and the notify failure does not break the run', async () => {
  const h = harness(PAGES())
  await checkAll(h.deps('2026-11-24T07:00:00Z'))
  const m = applyManual(sourceByKey('ssp')!, h.rows.get('ssp')!, { value: { weekly_rate_gbp: 140 }, note: 'Held while the parser is fixed' }, '2026-11-25T00:00:00Z') as { row: Row }
  h.rows.set('ssp', m.row)
  const run = await checkAll(h.deps('2026-12-01T07:00:00Z'))
  assert.equal(h.rows.get('ssp')!.value.weekly_rate_gbp, 140); assert.equal(run.outcomes.find(o => o.key === 'ssp')!.result, 'skipped_manual')
  const bad = harness({}); const d = bad.deps('2026-11-24T07:00:00Z'); d.notify = async () => { throw new Error('mail down') }
  const r = await checkAll(d)
  assert.ok(r.failed >= 5); assert.equal(r.emailed, false)   // everything failed (no pages), the email also failed, and the run still finished
})
