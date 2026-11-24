// Tests for the Tier 1 letter library. Run: npx tsx --test src/services/letters/letters.test.ts
// The PDF tests need pdfkit installed; if it is not, they are skipped (the rest still run).

import test from 'node:test'
import assert from 'node:assert/strict'
import { TEMPLATES, TIER2_PLANNED, COMMON_FIELDS, DRAFT_NOTE } from './templates'
import { fmtDate, fmtMoney, fmtNumber, fmtPercent, parseDate, parseNumber } from './format'
import { holds } from './render'
import { listTemplates, getTemplate, validate, render, renderPdf, resolveDefaults, type LetterDataSource } from './index'

const COMMON = { recipient_name: 'Aisha Rahman', recipient_role: 'Care Assistant', letter_date: '2026-11-25', service_name: 'Ferndale Nursing Home', manager_name: 'Sarah Jones', manager_role: 'Registered Manager' }

/** A full sample for each letter: every field filled in. */
const FULL: Record<string, Record<string, unknown>> = {
  'pay-review': { effective_date: '2027-04-01', old_rate: 12.71, new_rate: 13.21, reason: 'nlw', reason_note: 'Thank you for always covering extra shifts.' },
  'annual-pay-increase': { effective_date: '2027-04-01', basis: 'nlw', national_rate: 13.21, percent_rise: 3.9, old_rate: 12.71, new_rate: 13.21, note: 'Rates for senior carers are reviewed separately.' },
  'contract-hours-change': { effective_date: '2026-12-01', old_hours: 36, new_hours: 24, pattern: 'Monday, Tuesday and Friday, 8am to 8pm.', basis: 'request', agreed_on: '2026-11-10', new_holiday: 134.4, holiday_unit: 'hours' },
  'role-change': { change_type: 'promotion', effective_date: '2026-12-01', old_role: 'Care Assistant', new_role: 'Senior Carer', new_rate: 14.1, reports_to: 'the Deputy Manager', trial_period: 'three months', note: 'You will start with a day of shadowing.' },
  'annual-leave-statement': { year_start: '2026-01-01', year_end: '2026-12-31', unit: 'hours', allowance: 224, carried_in: 12, taken: 156, booked: 24, remaining: 56 },
  'holiday-carry-over': { year_end: '2026-12-31', new_year_start: '2027-01-01', unit: 'hours', carried_over: 12, new_allowance: 224, use_by: '2027-03-31', note: 'Please book it early.' },
  'holiday-pay-on-leaving': { last_day: '2026-12-18', year_start: '2026-01-01', unit: 'hours', accrued: 210.4, taken: 198, balance: 12.4, hourly_rate: 12.71, payment: 157.6, pay_date: '2026-12-31', note: 'Calculated using your average hours.' },
  'probation-passed': { probation_end: '2026-11-20', strengths: 'Your kindness with residents and your reliability have stood out.', next_steps: 'We would like you to start the senior carer training in the new year.' },
  'supervision-reminder': { due_by: '2026-12-15', last_supervision: '2026-09-10', proposed_date: '2026-12-08', proposed_time: '2pm', location: 'the office', topics: 'How you are finding your shifts\nAny training you would like' },
  'appraisal-invitation': { appraisal_date: '2026-12-10', appraisal_time: '11am', location: 'the quiet room', review_from: '2025-12-01', review_to: '2026-11-30', note: 'It should take about an hour.' },
  'overdue-training': { courses: 'Fire safety\nSafeguarding adults', was_due: '2026-10-31', complete_by: '2026-12-12', where: 'in your CareStream hub under My Training', support: 'You can do it on shift, in the office.' },
  'dbs-right-to-work-request': { request_kind: 'both', reason: 'expiring', expiry_date: '2027-01-31', needed_by: '2026-12-14', how: 'Please bring the original documents to the office.' },
  'thank-you': { reason: 'When Mrs Ahmed was unwell last Tuesday you stayed calm and kept her comfortable until help arrived.', occasion_date: '2026-11-17', gift: 'a voucher for a day out', personal_note: 'It meant a lot to her family too.' },
  'long-service': { years: 10, start_date: '2016-11-01', recognition: 'a framed certificate', event: 'There will be tea and cake for the team on Friday at 3pm.', note: 'You have trained so many of us.' },
  'resignation-acknowledged': { received_on: '2026-11-20', last_day: '2026-12-18', notice_note: 'This is in line with the four weeks in your contract.', holiday_left: 24, unit: 'hours', exit_chat: '2026-12-10', handover: 'Please spend your last week introducing the new carer to your rounds.' },
  'leaving-letter': { last_day: '2026-12-18', thanks_note: 'You will be missed by everyone.', return_items: 'Uniform\nKeys\nID badge', handover: 'Please finish the care plan reviews.', final_pay_date: '2026-12-31', holiday_summary: 'You have 12 hours of holiday that has not been taken. This will be paid with your final pay.', paperwork_note: 'Payroll will send your P45.', reference: 'yes' },
  'policy-change-notice': { policy_name: 'Medicines Policy', effective_date: '2026-12-01', summary: 'We are changing how controlled drugs are checked at handover.', changes: 'Two people now check at every handover\nThe register is signed after each check', where_found: 'in your CareStream hub under Policies', ack_required: 'yes', ack_by: '2026-12-08' },
}

const full = (id: string) => ({ ...COMMON, ...FULL[id] })
/** Only the fields marked required (and the choices needed to make the rest of them meaningful). */
const minimal = (id: string) => {
  const t = getTemplate(id)!
  const v: Record<string, unknown> = {}
  for (const f of t.fields) if (f.required) v[f.key] = (full(id) as any)[f.key]
  return v
}

const PLACEHOLDER = /\{\{\s*([a-z0-9_]+)\s*\}\}/gi
const keysIn = (s: string) => [...s.matchAll(PLACEHOLDER)].map(m => m[1])

test('there are exactly the 17 Tier 1 letters Len approved', () => {
  const ids = TEMPLATES.map(t => t.id).sort()
  assert.deepEqual(ids, ['annual-leave-statement', 'annual-pay-increase', 'appraisal-invitation', 'contract-hours-change', 'dbs-right-to-work-request', 'holiday-carry-over', 'holiday-pay-on-leaving', 'leaving-letter', 'long-service', 'overdue-training', 'pay-review', 'policy-change-notice', 'probation-passed', 'resignation-acknowledged', 'role-change', 'supervision-reminder', 'thank-you'].sort())
  assert.equal(listTemplates().length, 17)
  assert.ok(TEMPLATES.every(t => t.approvalRequired === true), 'every letter needs approval')
  assert.ok(Object.keys(FULL).length === 17, 'a sample exists for every letter')
})

test('Tier 2 letters are not in the registry, and are only planned by title', () => {
  const banned = /sick|disciplin|capabilit|investigat|flexible|compassionate|bereave|attendance|welfare|occupational|warning|probation-extension|appeal|concern/i
  for (const t of TEMPLATES) assert.ok(!banned.test(t.id) && !banned.test(t.title), `${t.id} looks like a Tier 2 letter`)
  assert.ok(TIER2_PLANNED.length >= 10 && TIER2_PLANNED.every(x => typeof x === 'string'))
  for (const title of TIER2_PLANNED) assert.ok(!TEMPLATES.some(t => t.title.toLowerCase() === title.toLowerCase()))
})

test('every letter renders with a full sample, with nothing left unresolved', () => {
  for (const t of TEMPLATES) {
    const r = render(t.id, full(t.id))
    assert.equal(r.ok, true, `${t.id}: ${JSON.stringify({ missing: r.missing, invalid: r.invalid })}`)
    for (const text of [r.text, r.html, r.subject, ...r.blocks.map(b => b.text), r.acknowledgement ?? '']) {
      assert.ok(!/\{\{|\}\}/.test(text), `${t.id} has an unresolved placeholder`)
      assert.ok(!/undefined|null|NaN/.test(text), `${t.id} printed undefined, null or NaN`)
      assert.ok(!/\[[A-Z][A-Za-z ]+\]/.test(text), `${t.id} shows a gap marker`)
    }
    assert.ok(r.blocks.length >= 3, `${t.id} has a body`)
    assert.ok(r.text.includes('Aisha Rahman') && r.text.includes('Sarah Jones'), `${t.id} names the person and the sender`)
    assert.ok(r.text.includes('Dear Aisha,'), `${t.id} greets the person by first name`)
    assert.ok(!/ {2,}/.test(r.blocks.map(b => b.text).join('\n')), `${t.id} has double spaces`)
    assert.ok(!/\s[.,]/.test(r.blocks.map(b => b.text).join('\n')), `${t.id} has a space before punctuation`)
  }
})

test('every letter also renders cleanly with only its required fields', () => {
  for (const t of TEMPLATES) {
    const r = render(t.id, minimal(t.id))
    assert.equal(r.ok, true, `${t.id} minimal: ${JSON.stringify({ missing: r.missing, invalid: r.invalid })}`)
    assert.ok(!/\{\{|undefined|NaN/.test(r.text), `${t.id} minimal has unresolved text`)
    assert.ok(!/ {2,}/.test(r.blocks.map(b => b.text).join('\n')), `${t.id} minimal has double spaces`)
  }
})

test('every placeholder and condition refers to a real field, and unguarded placeholders are always available', () => {
  for (const t of TEMPLATES) {
    const declared = new Set(t.fields.map(f => f.key))
    const required = new Set(t.fields.filter(f => f.required).map(f => f.key))
    const derivedFull = new Set(Object.keys(t.derive ? t.derive(Object.fromEntries(Object.entries(full(t.id)))) : {}))
    const derivedMin = new Set(Object.keys(t.derive ? t.derive(minimal(t.id)) : {}))
    const known = new Set([...declared, ...derivedFull, 'first_name'])
    const check = (text: string, guarded: boolean, where: string) => {
      for (const k of keysIn(text)) {
        assert.ok(known.has(k), `${t.id} ${where} uses {{${k}}} which is not a field`)
        if (!guarded) assert.ok(required.has(k) || derivedMin.has(k) || k === 'first_name', `${t.id} ${where} uses {{${k}}} without a guard, but it is optional`)
      }
    }
    check(t.subject, false, 'subject')
    for (const b of t.body) {
      if (b.t === 'list') { assert.ok(declared.has(b.field) && t.fields.find(f => f.key === b.field)!.type === 'list', `${t.id} list field`); continue }
      check(b.text, !!b.when, `block "${b.text.slice(0, 30)}"`)
    }
    if (t.acknowledgement) check(t.acknowledgement.text, !!t.acknowledgement.when, 'acknowledgement')
    const conds = [...t.body.map(b => b.when), t.acknowledgement?.when, ...t.fields.map(f => f.requiredWhen)].filter(Boolean) as string[]
    for (const c of conds) for (const part of c.split('&&')) { const k = part.trim().replace(/^!/, '').split(/!?=/)[0]; assert.ok(known.has(k), `${t.id} condition "${c}" uses unknown field ${k}`) }
  }
})

test('every letter declares the common fields, typed fields have what they need, and choices have options', () => {
  for (const t of TEMPLATES) {
    for (const c of COMMON_FIELDS) assert.ok(t.fields.some(f => f.key === c.key), `${t.id} is missing ${c.key}`)
    const keys = t.fields.map(f => f.key); assert.equal(new Set(keys).size, keys.length, `${t.id} has a repeated field`)
    for (const f of t.fields) {
      if (f.type === 'choice') assert.ok(f.choices && f.choices.length >= 2, `${t.id}.${f.key} needs choices`)
      if (f.default !== undefined && f.type === 'choice') assert.ok(f.choices!.some(c => c.value === f.default), `${t.id}.${f.key} default is not a choice`)
      assert.ok(f.label.length > 2)
    }
    assert.ok(t.beforeYouSend.length >= 2, `${t.id} has a before you send checklist`)
    assert.ok(t.beforeYouSend.some(x => /legal advice/i.test(x)), `${t.id} says CareStream does not give legal advice`)
    assert.ok(/draft/i.test(DRAFT_NOTE) && /legal advice/i.test(DRAFT_NOTE))
    for (const r of t.references) assert.match(r.url, /^https:\/\/(www\.legislation\.gov\.uk|www\.gov\.uk|www\.acas\.org\.uk)\//, `${t.id} reference is a primary source`)
  }
})

test('no dashes anywhere in the words of the letters', () => {
  const bad = /[–—]|\s-\s|--/
  const strings: string[] = [DRAFT_NOTE, ...TIER2_PLANNED]
  for (const t of TEMPLATES) {
    strings.push(t.title, t.description, t.whoFor, t.subject, t.closing, ...t.beforeYouSend, ...t.references.map(r => r.label))
    if (t.acknowledgement) strings.push(t.acknowledgement.text)
    for (const b of t.body) if (b.t !== 'list') strings.push(b.text)
    for (const f of t.fields) strings.push(f.label, f.help ?? '', ...(f.choices ?? []).map(c => c.label), typeof f.default === 'string' ? f.default : '')
  }
  for (const s of strings) assert.ok(!bad.test(s), `dash found in: ${s.slice(0, 80)}`)
})

test('the law is cited only where it was checked, and the advice line is always there', () => {
  const t = getTemplate('holiday-pay-on-leaving')!
  assert.ok(t.references.some(r => r.url === 'https://www.legislation.gov.uk/uksi/1998/1833/regulation/14'))
  assert.ok(t.beforeYouSend.some(x => /regulation 14/.test(x)))
  assert.ok(getTemplate('pay-review')!.beforeYouSend.some(x => /section 4/.test(x) && /one month/.test(x)))
  assert.ok(getTemplate('pay-review')!.references.some(r => r.url === 'https://www.gov.uk/national-minimum-wage-rates'))
})

test('UK dates, money and numbers', () => {
  assert.equal(fmtDate('2026-04-01'), '1 April 2026')
  assert.equal(fmtDate('2027-12-25'), '25 December 2027')
  assert.equal(parseDate('01/04/2026'), '2026-04-01')
  assert.equal(parseDate('31/02/2026'), null)
  assert.equal(parseDate('not a date'), null)
  assert.equal(fmtMoney(12.7), '£12.70')
  assert.equal(fmtMoney(1250), '£1,250.00')
  assert.equal(fmtMoney(1234567.891), '£1,234,567.89')
  assert.equal(parseNumber('£1,250.50'), 1250.5)
  assert.equal(parseNumber('abc'), null)
  assert.equal(fmtNumber(224), '224'); assert.equal(fmtNumber(109.2), '109.2'); assert.equal(fmtNumber(2.346), '2.35')
  assert.equal(fmtPercent(4.1237), '4.1%')
})

test('values print in UK style inside a letter', () => {
  const r = render('pay-review', full('pay-review'))
  assert.ok(r.text.includes('1 April 2027'), r.text)
  assert.ok(r.text.includes('£12.71') && r.text.includes('£13.21'))
  assert.equal(r.date, '25 November 2026')
})

test('conditional blocks show and hide', () => {
  const withOld = render('pay-review', { ...full('pay-review'), old_rate: 12.21, new_rate: 12.71, reason: 'annual_review', reason_note: '' })
  assert.ok(withOld.text.includes('increase of £0.50 an hour (4.1%)'), withOld.text)
  assert.ok(withOld.text.includes('result of our annual review'))
  assert.ok(!withOld.text.includes('National Living Wage'))
  const noOld = render('pay-review', { ...COMMON, effective_date: '2027-04-01', new_rate: 12.71, reason: 'nlw' })
  assert.ok(noOld.text.includes('your hourly rate will be £12.71'), noOld.text)
  assert.ok(!noOld.text.includes('increase of'))
  assert.ok(noOld.text.includes('follows the increase in the National Living Wage'))
  const ack = render('policy-change-notice', { ...full('policy-change-notice'), ack_required: 'no', ack_by: '' })
  assert.equal(ack.acknowledgement, null)
  assert.equal(render('policy-change-notice', full('policy-change-notice')).acknowledgement?.includes('Medicines Policy'), true)
  const owed = render('holiday-pay-on-leaving', full('holiday-pay-on-leaving')); assert.ok(owed.text.includes('12.4 hours of holiday that has not been taken'))
  const over = render('holiday-pay-on-leaving', { ...full('holiday-pay-on-leaving'), balance: -6, payment: '' }); assert.ok(over.text.includes('6 hours more than you had built up') && !over.text.includes('has not been taken'))
  const none = render('holiday-pay-on-leaving', { ...full('holiday-pay-on-leaving'), balance: 0 }); assert.ok(none.text.includes('no untaken holiday'))
  const days = render('annual-leave-statement', { ...full('annual-leave-statement'), unit: 'days', carried_in: '' }); assert.ok(days.text.includes('Taken so far: 156 days') && !days.text.includes('Carried over'))
})

test('holds(): the condition language', () => {
  const c = { a: 'x', b: '', k: 'yes' }
  assert.equal(holds('a', c), true); assert.equal(holds('b', c), false); assert.equal(holds('!b', c), true); assert.equal(holds('k=yes', c), true)
  assert.equal(holds('k!=yes', c), false); assert.equal(holds('a&&!b&&k=yes', c), true); assert.equal(holds('a&&b', c), false); assert.equal(holds(undefined, c), true)
})

test('lists become bullet points', () => {
  const r = render('overdue-training', full('overdue-training'))
  assert.deepEqual(r.blocks.filter(b => b.t === 'li').map(b => b.text), ['Fire safety', 'Safeguarding adults'])
  assert.ok(r.html.includes('<ul>') && r.html.includes('<li>Fire safety</li>'))
  const r2 = render('leaving-letter', { ...full('leaving-letter'), return_items: ['Uniform', '  * Keys  ', ''] })
  assert.deepEqual(r2.blocks.filter(b => b.t === 'li').map(b => b.text), ['Uniform', 'Keys'])
})

test('values are escaped in HTML and cannot inject placeholders', () => {
  const r = render('thank-you', { ...full('thank-you'), recipient_name: '<script>alert(1)</script> & "Co"', reason: 'You were <b>great</b> {{manager_name}}.' })
  assert.ok(!r.html.includes('<script>') && !r.html.includes('<b>'), r.html)
  assert.ok(r.html.includes('&lt;script&gt;') && r.html.includes('&amp;') && r.html.includes('&quot;Co&quot;'))
  assert.ok(r.text.includes('{{manager_name}}'), 'a value that looks like a placeholder is printed as it is, not expanded')
})

test('missing and unreadable values are reported, and shown as gaps in the draft', () => {
  const r = render('pay-review', { ...COMMON, new_rate: 13.21 })
  assert.equal(r.ok, false)
  assert.ok(r.missing.includes('New rate starts on') && r.missing.includes('Reason for the change'))
  assert.ok(r.text.includes('[New rate starts on]'))
  const v = validate('pay-review', { ...full('pay-review'), effective_date: '31/02/2027', new_rate: 'lots', reason: 'bogus' })
  assert.equal(v.ok, false)
  assert.deepEqual(v.invalid.map(i => i.key).sort(), ['effective_date', 'new_rate', 'reason'])
  assert.equal(validate('pay-review', full('pay-review')).ok, true)
  assert.equal(validate('nope', {}).ok, false)
  const cond = validate('holiday-carry-over', { ...COMMON, year_end: '2026-12-31', new_year_start: '2027-01-01', unit: 'hours', carried_over: 12 })
  assert.equal(cond.ok, true)
  const cond2 = validate('contract-hours-change', { ...COMMON, effective_date: '2026-12-01', new_hours: 24, basis: 'agreed', new_holiday: 100 })
  assert.deepEqual(cond2.missing, ['Allowance is in'], 'a field required only when another is filled in')
})

test('the national living wage letter reads naturally with and without the rate', () => {
  const a = render('annual-pay-increase', full('annual-pay-increase'))
  assert.ok(a.text.includes('rises to £13.21 an hour from 1 April 2027'))
  const b = render('annual-pay-increase', { ...full('annual-pay-increase'), national_rate: '' })
  assert.ok(b.text.includes('The National Living Wage rises from 1 April 2027'))
  const c = render('annual-pay-increase', { ...full('annual-pay-increase'), basis: 'percent', percent_rise: 3.9 })
  assert.ok(c.text.includes('rising by 3.9% for everyone'))
  const d = render('annual-pay-increase', { ...full('annual-pay-increase'), basis: 'fixed' })
  assert.ok(d.text.includes('rising by £0.50 an hour for everyone'))
})

// ── fields.ts ────────────────────────────────────────────────────────────────────────────────────
const fakeSource = (calls: string[] = []): LetterDataSource => ({
  async staff() { calls.push('staff'); return { name: 'Aisha Rahman', jobRole: 'Care Assistant', startDate: '2017-02-20', contractedHours: 40 } },
  async service() { calls.push('service'); return { name: 'Ferndale Nursing Home' } },
  async actor() { calls.push('actor'); return { name: 'Sarah Jones', jobRole: 'Registered Manager' } },
  async pay() { calls.push('pay'); return { weekday: 12.71, weekend: 12.71 } },
  async holiday() { calls.push('holiday'); return { yearStart: '2026-01-01', yearEnd: '2026-12-31', unit: 'hours', allowance: 224, carriedIn: 0, taken: 156, booked: 0, remaining: 68 } },
  async reference() { calls.push('reference'); return { value: 13.21, asOf: '2027-04-01', stale: false } },
})
const who = { tenantId: 't1', userId: 'u1', actorUserId: 'a1', today: '2026-11-25' }

test('defaults fill the common fields from the staff record, the service and the sender', async () => {
  const calls: string[] = []
  const r = await resolveDefaults({ ...who, templateId: 'thank-you', adminVerified: false }, fakeSource(calls))
  assert.equal(r.values.recipient_name, 'Aisha Rahman'); assert.equal(r.values.recipient_role, 'Care Assistant'); assert.equal(r.values.service_name, 'Ferndale Nursing Home')
  assert.equal(r.values.manager_name, 'Sarah Jones'); assert.equal(r.values.letter_date, '2026-11-25')
  assert.ok(!calls.includes('pay') && !calls.includes('holiday'), 'a letter that needs no pay or holiday data does not read it')
})

test('pay and holiday figures are admin only: they are never read unless the caller is verified', async () => {
  const calls: string[] = []
  const staffView = await resolveDefaults({ ...who, templateId: 'annual-leave-statement', adminVerified: false }, fakeSource(calls))
  assert.equal(staffView.values.taken, undefined); assert.equal(staffView.values.remaining, undefined)
  assert.ok(staffView.skipped.includes('taken') && staffView.skipped.includes('allowance'))
  assert.ok(!calls.includes('holiday') && !calls.includes('pay'), `the sensitive sources were read: ${calls}`)
  const payNo = await resolveDefaults({ ...who, templateId: 'pay-review', adminVerified: false }, fakeSource(calls))
  assert.equal(payNo.values.old_rate, undefined); assert.ok(!calls.includes('pay'))
  const adm = await resolveDefaults({ ...who, templateId: 'annual-leave-statement', adminVerified: true }, fakeSource())
  assert.equal(adm.values.allowance, 224); assert.equal(adm.values.remaining, 68); assert.equal(adm.values.unit, 'hours'); assert.equal(adm.values.year_start, '2026-01-01')
  assert.equal(adm.values.carried_in, undefined, 'nothing carried in, so the line is left out')
  const pay = await resolveDefaults({ ...who, templateId: 'pay-review', adminVerified: true }, fakeSource())
  assert.equal(pay.values.old_rate, 12.71); assert.equal(pay.values.reason, 'annual_review'); assert.match(pay.notes.old_rate, /locked/i)
})

test('the National Living Wage default comes from the register, and a stale or missing figure is not used', async () => {
  const ok = await resolveDefaults({ ...who, templateId: 'annual-pay-increase', adminVerified: true }, fakeSource())
  assert.equal(ok.values.national_rate, 13.21); assert.match(ok.notes.national_rate, /Data sources register, as of 2027-04-01/)
  const stale = await resolveDefaults({ ...who, templateId: 'annual-pay-increase', adminVerified: true }, { ...fakeSource(), async reference() { return { value: 13.21, stale: true } } })
  assert.equal(stale.values.national_rate, undefined)
  const none = await resolveDefaults({ ...who, templateId: 'annual-pay-increase', adminVerified: true }, { ...fakeSource(), async reference() { return null } })
  assert.equal(none.values.national_rate, undefined)
  await assert.rejects(() => resolveDefaults({ ...who, templateId: 'bogus', adminVerified: true }, fakeSource()))
})

test('the resolved defaults render a finished letter once the admin adds what only they know', async () => {
  const r = await resolveDefaults({ ...who, templateId: 'pay-review', adminVerified: true }, fakeSource())
  const out = render('pay-review', { ...r.values, effective_date: '2027-04-01', new_rate: 13.21 })
  assert.equal(out.ok, true); assert.ok(out.text.includes('increase of £0.50'))
})

// ── The PDF ──────────────────────────────────────────────────────────────────────────────────────
let hasPdfkit = true
try { require.resolve('pdfkit') } catch { hasPdfkit = false }
const LOGO = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='

test('a letter comes out as a PDF on the letterhead', { skip: !hasPdfkit && 'pdfkit is not installed here' }, async () => {
  for (const id of ['pay-review', 'policy-change-notice', 'leaving-letter', 'annual-leave-statement']) {
    const buf = await renderPdf(id, full(id), { name: 'Ferndale Nursing Home', address: '1 Park Road, Oxford', logoDataUrl: LOGO })
    assert.ok(Buffer.isBuffer(buf)); assert.equal(buf.subarray(0, 5).toString('latin1'), '%PDF-', id)
    assert.ok(buf.length > 1500, `${id} pdf is too small`)
  }
  const noLogo = await renderPdf('thank-you', full('thank-you'), { name: 'Ferndale Nursing Home' })
  assert.equal(noLogo.subarray(0, 4).toString('latin1'), '%PDF')
})

test('the PDF refuses an unfinished letter, and copes with odd characters and a long letter', { skip: !hasPdfkit && 'pdfkit is not installed here' }, async () => {
  await assert.rejects(() => renderPdf('pay-review', { ...COMMON, new_rate: 13.21 }, { name: 'X' }), /not finished/)
  await assert.rejects(() => renderPdf('nope', {}, { name: 'X' }), /Unknown letter/)
  const long = await renderPdf('thank-you', { ...full('thank-you'), reason: ('A long sentence about the day. ' + '\u{1F600} ').repeat(400) }, { name: 'Ferndale ✓ Nursing Home', logoDataUrl: 'data:image/png;base64,not-an-image' })
  assert.equal(long.subarray(0, 4).toString('latin1'), '%PDF')
})
