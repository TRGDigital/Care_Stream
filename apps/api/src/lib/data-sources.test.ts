import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import {
  fuelCsvUrl, parseFuel, validateFuel,
  taxYearOf, ratesPageSlug, parseStatutoryPay, validateStatutoryPay, parseEmployerNi, validateEmployerNi, employerNi, parsePensionAe, validatePensionAe, pensionEmployerMinimum,
  parseDbsFees, validateDbsFees, parseEarningsGrowth, validateEarningsGrowth, parseBankRate, validateBankRate, parseHolidayRules, validateHolidayRules,
  parseNlw, validateNlw, parseOnsRate, validateRate, parseBankHolidays, validateBankHolidays, parseSsp, validateSsp, parseMileage, validateMileage,
  validateRealLivingWage, applyCheck, applyManual, checkAll, toFigure, isStale, asOfText, sameFigure, sourceByKey, SOURCES, type Row, type Db, type RunDeps,
} from './data-sources'

const fxText = (n: string) => fs.readFileSync(path.join(__dirname, '__fixtures__', n), 'utf8')
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
  'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/d7g8/mm23/data': fx('ons-cpi-food.json'),
  'https://www.ons.gov.uk/economy/inflationandpriceindices/timeseries/l55o/mm23/data': fx('ons-cpih.json'),
  'https://www.gov.uk/bank-holidays.json': fx('gov-bank-holidays.json'),
  'https://www.gov.uk/api/content/statutory-sick-pay': fx('gov-ssp.json'),
  'https://www.gov.uk/api/content/government/statistics/weekly-road-fuel-prices': fx('gov-fuel.json'),
  'https://www.gov.uk/api/content/guidance/rates-and-thresholds-for-employers-2026-to-2027': fx('gov-rates-thresholds.json'),
  'https://www.gov.uk/api/content/workplace-pensions': fx('gov-workplace-pensions.json'),
  'https://www.gov.uk/api/content/dbs-check-applicant-criminal-record': fx('gov-dbs.json'),
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kai9/lms/data': fx('ons-kai9.json'),
  'https://www.ons.gov.uk/employmentandlabourmarket/peopleinwork/earningsandworkinghours/timeseries/kab9/lms/data': fx('ons-kab9.json'),
  'https://www.bankofengland.co.uk/boeapps/database/Bank-Rate.asp': fxText('boe-bank-rate.html'),
  'https://www.gov.uk/api/content/holiday-entitlement-rights': fx('gov-holiday-rights.json'),
  'https://assets.publishing.service.gov.uk/media/x/CSV__2018_-__.csv': fxText('fuel.csv'),
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

test('FOOD: the food inflation series reads from ONS D7G8, and the council food cost benchmark is a checked manual entry', () => {
  assert.ok(sourceByKey('cpi_food')!.fetch)
  const f = parseOnsRate({ description: { cdid: 'D7G8', title: 'food', releaseDate: '2026-11-18T00:00:00.000Z', nextRelease: '16 December 2026' }, months: [{ date: '2026 SEP', value: '1.3' }, { date: '2026 OCT', value: '0.9' }] }, 'D7G8')
  assert.equal(f.value.latest.rate, 0.9)
  const def = sourceByKey('care_food_cost')!
  assert.equal(def.fetch, null)
  assert.equal(def.validate({ low_gbp_week: 29.05, high_gbp_week: 37.73, price_year: '2022/23' }), null)
  assert.match(def.validate({ low_gbp_week: 40, high_gbp_week: 30, price_year: '2022/23' })!, /above/)
  assert.match(def.validate({ low_gbp_week: 29, high_gbp_week: 37 })!, /prices/)
})

test('FUEL: the weekly CSV is found through the page, read to the latest week, range checked, and a weekly change does not email the owner', async () => {
  assert.equal(fuelCsvUrl(fx('gov-fuel.json')), 'https://assets.publishing.service.gov.uk/media/x/CSV__2018_-__.csv')
  const f = parseFuel(fxText('fuel.csv'))
  assert.equal(f.effective_from, '2026-11-23'); assert.equal(f.value.latest.petrol, 161.96); assert.equal(f.value.previous.diesel, 196.77)
  assert.equal(validateFuel(f.value), null)
  assert.match(validateFuel({ latest: { petrol: 16.1, diesel: 190, date: '2026-11-23' } })!, /petrol/)
  assert.throws(() => parseFuel('Date,a,b\n'), /No weekly/)
  assert.equal(sourceByKey('road_fuel')!.routine, true)
  const h = harness(PAGES()); await checkAll(h.deps('2026-11-24T07:00:00Z'))
  assert.equal(h.rows.get('road_fuel')!.status, 'ok')
})
test('HOME CARE: three manual hourly figures are checked', () => {
  for (const k of ['homecare_private_rate', 'homecare_min_price', 'council_homecare_rate']) {
    const d = sourceByKey(k)!; assert.equal(d.fetch, null)
    assert.equal(d.validate({ hourly_gbp: 31, basis: 'median' }), null)
    assert.match(d.validate({ hourly_gbp: 3, basis: 'median' })!, /outside/)
    assert.match(d.validate({ hourly_gbp: 31 })!, /basis/)
  }
})

import { STATUTORY_WEEKS, STATUTORY_CAP_DAYS, IRREGULAR_HOURS_RATE } from './holiday-entitlement'
test('PAYROLL: the tax year changes on 6 April, and the page slug follows it', () => {
  assert.equal(taxYearOf('2027-04-05'), 2026); assert.equal(taxYearOf('2027-04-06'), 2027); assert.equal(taxYearOf('2026-11-24'), 2026); assert.equal(taxYearOf('2027-01-01'), 2026); assert.equal(taxYearOf('2026-04-05'), 2025)
  assert.equal(ratesPageSlug(2026), 'rates-and-thresholds-for-employers-2026-to-2027')
})
test('PAYROLL: statutory pay is read from the rates page, and each type is checked', () => {
  const f = parseStatutoryPay(fx('gov-rates-thresholds.json'))
  assert.equal(f.effective_from, '2026-04-06'); assert.equal(f.value.tax_year, '2026 to 2027'); assert.equal(f.value.weekly_rate_gbp, 194.32); assert.equal(f.value.earnings_share_pct, 90)
  for (const k of ['smp', 'spp', 'sap', 'shpp']) assert.equal(f.value.rates[k].weekly_gbp, 194.32, k)
  assert.equal(f.value.rates.smp.first_six_weeks_pct, 90); assert.equal(f.value.smp_applies_from, '2026-04-05')
  assert.equal(validateStatutoryPay(f.value), null)
  assert.match(validateStatutoryPay({ ...f.value, rates: { ...f.value.rates, spp: { weekly_gbp: 19.4, earnings_share_pct: 90 } } })!, /SPP/)
})
test('PAYROLL: employer National Insurance reads the rate and thresholds, refuses a rate that differs by band, and the helper works the cost out', () => {
  const f = parseEmployerNi(fx('gov-rates-thresholds.json'))
  assert.equal(f.value.secondary_rate_pct, 15); assert.deepEqual(f.value.thresholds.secondary_threshold, { week: 96, month: 417, year: 5000 })
  assert.equal(f.value.thresholds.lower_earnings_limit.year, 6708); assert.equal(f.value.thresholds.upper_earnings_limit.month, 4189); assert.equal(validateEmployerNi(f.value), null)
  assert.equal(employerNi(f.value, 2000, 'month').employer_ni, 237.45)       // (2000 - 417) x 15%
  assert.equal(employerNi(f.value, 24000, 'year').employer_ni, 2850)          // (24000 - 5000) x 15%
  assert.equal(employerNi(f.value, 300, 'week').employer_ni, 30.6)            // (300 - 96) x 15%
  assert.equal(employerNi(f.value, 400, 'month').employer_ni, 0)
  assert.equal(employerNi(f.value, 3000, 'month', 'under_21').employer_ni, 0)   // nothing up to the upper limit
  assert.equal(employerNi(f.value, 5000, 'month', 'apprentice_under_25').employer_ni, 121.65)   // (5000 - 4189) x 15%
  const odd = fx('gov-rates-thresholds.json'); odd.details.body = odd.details.body.replace('<td>A</td>\n      <td>15%</td>', '<td>A</td>\n      <td>13.8%</td>')
  assert.throws(() => parseEmployerNi(odd), /different rates/)
  assert.match(validateEmployerNi({ ...f.value, secondary_rate_pct: 1.5 })!, /outside/)
})
test('PAYROLL: the rates page is asked for by tax year, and next year is shown as upcoming only when it exists', async () => {
  const d = sourceByKey('employer_ni')!
  const asked: string[] = []
  const cur = fx('gov-rates-thresholds.json')
  const mk = (pages: Record<string, any>) => async (u: string) => { asked.push(u); if (!(u in pages)) throw new Error('HTTP 404'); return pages[u] }
  const u26 = 'https://www.gov.uk/api/content/guidance/rates-and-thresholds-for-employers-2026-to-2027', u27 = 'https://www.gov.uk/api/content/guidance/rates-and-thresholds-for-employers-2027-to-2028'
  const a = await d.fetch!(mk({ [u26]: cur }), '2027-04-05')
  assert.equal(asked[0], u26); assert.equal(a.value.upcoming, null)
  const next = JSON.parse(JSON.stringify(cur)); next.base_path = '/guidance/rates-and-thresholds-for-employers-2027-to-2028'; next.title = 'Rates and thresholds for employers 2027 to 2028'
  const b = await d.fetch!(mk({ [u26]: cur, [u27]: next }), '2027-04-05')
  assert.equal(b.value.upcoming.tax_year, '2027 to 2028'); assert.equal(b.value.upcoming.effective_from, '2027-04-06')
  asked.length = 0
  await d.fetch!(mk({ [u27]: next }), '2027-04-06')
  assert.equal(asked[0], u27)                                                    // from 6 April the new year's page is the one that counts
})
test('PAYROLL: pension auto enrolment thresholds and the employer minimum', () => {
  const f = parsePensionAe(fx('gov-workplace-pensions.json'))
  assert.equal(f.value.earnings_trigger_gbp, 10000); assert.equal(f.value.qualifying_earnings_lower_gbp, 6240); assert.equal(f.value.qualifying_earnings_upper_gbp, 50270)
  assert.equal(f.value.minimum_employer_pct, 3); assert.equal(f.value.employee_pct, 5); assert.equal(f.value.minimum_total_pct, 8); assert.equal(f.value.age_from, 22)
  assert.equal(validatePensionAe(f.value), null)
  assert.match(validatePensionAe({ ...f.value, minimum_total_pct: 9 })!, /add up/)
  assert.deepEqual(pensionEmployerMinimum(f.value, 27000), { qualifying_earnings: 20760, employer_minimum: 622.8, employer_pct: 3, enrolled_automatically: true })
  assert.equal(pensionEmployerMinimum(f.value, 9000).enrolled_automatically, false)
  assert.throws(() => parsePensionAe({ details: { parts: [{ body: '<p>nothing here</p>' }] } }), /not found/)
})
test('PAYROLL: DBS fees, with volunteers free', () => {
  const f = parseDbsFees(fx('gov-dbs.json'))
  assert.equal(f.value.basic_gbp, 20); assert.equal(f.value.standard_gbp, 20); assert.equal(f.value.enhanced_gbp, 41); assert.equal(f.value.enhanced_barred_lists_gbp, 41); assert.equal(f.value.volunteers_free, true)
  assert.equal(validateDbsFees(f.value), null); assert.match(validateDbsFees({ ...f.value, enhanced_gbp: 2 })!, /enhanced/)
  assert.throws(() => parseDbsFees({ details: { parts: [{ body: '<p>nothing</p>' }] } }), /not found/)
})
test('PAYROLL: earnings growth is the ONS headline plus total pay worked out from the levels, and Bank Rate comes from the Bank of England table', () => {
  const e = parseEarningsGrowth(fx('ons-kai9.json'), fx('ons-kab9.json'))
  assert.equal(e.value.latest.rate, 3.5); assert.equal(e.value.latest.period, '2026-09'); assert.equal(e.effective_from, '2026-09-01'); assert.equal(e.next_check_due, '2026-12-16')
  assert.equal(e.value.total_pay.weekly_gbp, 761); assert.ok(e.value.total_pay.growth_3m_pct > 0 && e.value.total_pay.growth_3m_pct < 10); assert.equal(validateEarningsGrowth(e.value), null)
  assert.throws(() => parseEarningsGrowth(fx('ons-kab9.json'), fx('ons-kab9.json')), /not KAI9|not KAB9/)
  const b = parseBankRate(fxText('boe-bank-rate.html'))
  assert.equal(b.value.rate_pct, 4); assert.equal(b.value.changed, '2026-11-05'); assert.equal(b.value.previous.rate, 3.75); assert.equal(b.effective_from, '2026-11-05'); assert.equal(validateBankRate(b.value), null)
  assert.ok(!b.value.history.some((h: any) => h.changed > '2026-12-31'))      // two digit years from the 1970s on are not read as 2099
  assert.throws(() => parseBankRate('<html></html>'), /not found/); assert.match(validateBankRate({ rate_pct: 40, changed: '2026-11-05' })!, /outside/)
})
test('PAYROLL: the holiday rules agree with the GOV.UK page and with the holiday calculator in this repo', () => {
  const h = parseHolidayRules(fx('gov-holiday-rights.json'))
  assert.equal(h.value.statutory_weeks, 5.6); assert.equal(h.value.cap_days_five_day_week, 28); assert.equal(h.value.irregular_hours_pct, 12.07); assert.equal(h.value.starters_accrue_one_twelfth_a_month, true); assert.equal(validateHolidayRules(h.value), null)
  assert.equal(h.value.statutory_weeks, STATUTORY_WEEKS); assert.equal(h.value.cap_days_five_day_week, STATUTORY_CAP_DAYS); assert.equal(Math.round(h.value.irregular_hours_pct * 100) / 10000, IRREGULAR_HOURS_RATE)
  assert.throws(() => parseHolidayRules({ details: { parts: [{ body: '<p>holiday</p>' }] } }), /not all found/)
})
test('PAYROLL: the new sources are automatic or manual as intended, and none is "routine"', () => {
  for (const k of ['statutory_pay', 'employer_ni', 'pension_ae', 'dbs_fees', 'earnings_growth', 'bank_rate', 'holiday_rules']) { const d = sourceByKey(k)!; assert.ok(d.fetch, k); assert.ok(!d.routine, k) }
})
