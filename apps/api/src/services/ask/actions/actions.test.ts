import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { fieldsIn, renderPersonal, personalValues, hasPersonal } from './fields'
import { matchNames, revalidate, normName, type Eligible } from './recipients'
import { actionAllowed } from './settings'
import { confirmAction, type ConfirmDeps, type Actor } from './execute'
import { effectiveStatus } from './store'
import { ACTION_TYPES, DEFAULT_SETTINGS, type ActionRow, type AskSettings } from './types'
import { tierCNote, TIER_C } from './tier-c'
import { pickPeople } from './propose'
import { toolAllowed, managerMayReach, MANAGER_TOOLS, MANAGER_MONEY_TOOLS } from '../manager-access'
import { ACTION_TOOLS } from './tools-actions'
import { TOOLS } from '../tools'

const people: Eligible[] = [
  { id: 'u1', name: 'Aisha Rahman', job_role: 'Care Assistant', has_email: true }, { id: 'u2', name: 'Ben Okoro', job_role: 'Senior Carer', has_email: true },
  { id: 'u3', name: 'Chloe Bennett', job_role: 'Care Assistant', has_email: false }, { id: 'u4', name: 'Chloe Brown', job_role: 'Cook', has_email: true },
]
const on: AskSettings = { ...DEFAULT_SETTINGS, actions_enabled: true, notifications_enabled: true, training_enabled: true, emails_enabled: true }
const src = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')

// ── Personal fields ─────────────────────────────────────────────────────────
test('personal fields: only the allowed placeholders, each filled with that one person\'s own figure', () => {
  assert.deepEqual(fieldsIn('Hi {first_name}, you have {hours_left} left until {holiday_year_end}.').used.sort(), ['first_name', 'holiday_year_end', 'hours_left'])
  assert.deepEqual(fieldsIn('Hi {first_name} {boss_salary}').unknown, ['boss_salary'])
  const a = personalValues({ name: 'Aisha Rahman', unit: 'hours', remaining: 112, taken: 40, yearEnd: '2026-12-31', trainingDue: 2 })
  const b = personalValues({ name: 'Ben Okoro', unit: 'days', remaining: 1, taken: 20, yearEnd: '2026-12-31', trainingDue: 0 })
  assert.equal(renderPersonal('Hi {first_name}, {hours_left} left, {training_due}.', a), 'Hi Aisha, 112 hours left, 2 courses.')
  assert.equal(renderPersonal('Hi {first_name}, {hours_left} left, {training_due}.', b), 'Hi Ben, 1 day left, no courses.')
  assert.equal(renderPersonal('{{first_name}} {unknown_thing}', a), 'Aisha {unknown_thing}')   // anything else is left as it was
  assert.ok(hasPersonal('Hello {first_name}') && !hasPersonal('Hello team'))
  assert.match(personalValues({ name: 'X', unit: 'hours', remaining: null, taken: null, yearEnd: null, trainingDue: 0 }).holiday_year_end, /holiday year/)
})

test('the personal values loader reads only the people who will receive the message', () => {
  const t = src('personal.ts')
  assert.match(t, /user_id: \{ in: people\.map/); assert.doesNotMatch(t, /staffDetail|date_of_birth|email/)
})

// ── Recipients ──────────────────────────────────────────────────────────────
test('names are matched exactly or by an unambiguous start; unmatched and ambiguous names are reported, never guessed', () => {
  const m = matchNames(['Aisha Rahman', 'ben', 'Chloe', 'Zed Nobody'], people)
  assert.deepEqual(m.ids.sort(), ['u1', 'u2']); assert.deepEqual(m.ambiguous, ['Chloe']); assert.deepEqual(m.unmatched, ['Zed Nobody'])
  assert.equal(normName('  Aisha   RAHMAN! '), 'aisha rahman')
})
test('revalidate drops people who left, are not in the account or have no email (for notifications)', () => {
  assert.deepEqual(revalidate(['u1', 'u3', 'gone', 'u1'], people, true), { kept: ['u1'], dropped: 2 })
  assert.deepEqual(revalidate(['u1', 'u3'], people, false), { kept: ['u1', 'u3'], dropped: 0 })
})
test('picking people: everyone, a role, or names', () => {
  assert.deepEqual(pickPeople(people, { audience: 'all', needEmail: true }).ids, ['u1', 'u2', 'u4'])
  assert.deepEqual(pickPeople(people, { job_role: 'care assistant', needEmail: false }).ids.sort(), ['u1', 'u3'])
  assert.deepEqual(pickPeople(people, { names: ['Ben Okoro'], needEmail: true }).ids, ['u2'])
})

// ── Guardrail switches ──────────────────────────────────────────────────────
test('guardrails: everything is OFF by default and needs the master switch plus the type\'s own switch', () => {
  assert.equal(DEFAULT_SETTINGS.actions_enabled, false); assert.equal(DEFAULT_SETTINGS.notifications_enabled, false); assert.equal(DEFAULT_SETTINGS.training_enabled, false); assert.equal(DEFAULT_SETTINGS.emails_enabled, false)
  assert.equal(DEFAULT_SETTINGS.max_recipients, 100); assert.equal(DEFAULT_SETTINGS.min_gap_minutes, 2); assert.equal(DEFAULT_SETTINGS.managers_can_use, false)
  assert.equal(actionAllowed(DEFAULT_SETTINGS, 'send_staff_notification').ok, false)
  assert.equal(actionAllowed({ ...on, training_enabled: false }, 'allocate_training').ok, false)
  assert.equal(actionAllowed({ ...on, notifications_enabled: false }, 'send_staff_notification').ok, false)
  assert.equal(actionAllowed({ ...on, actions_enabled: false }, 'send_staff_notification').ok, false)
  for (const t of ACTION_TYPES) assert.equal(actionAllowed(on, t).ok, true)
})

// ── Proposals do not execute ────────────────────────────────────────────────
test('proposals never execute: the propose code imports no sender and writes only the proposal', () => {
  const t = src('propose.ts')
  assert.doesNotMatch(t, /routes\/notifications|routes\/training|createAndSendNotification|enrollStaff|remindEnrollment|remindUnread|sgMail|sendStaff/)
  assert.match(t, /createProposal/); assert.doesNotMatch(t, /\.(create|update|delete|createMany|updateMany|deleteMany)\(/)
  const tools = src('tools-actions.ts'); assert.doesNotMatch(tools, /execute|confirmAction|createAndSend/)
  assert.ok(/NOTHING has been sent or changed/.test(tools))
})
test('only execute.ts runs actions, and only after a claim', () => {
  const t = src('execute.ts')
  assert.ok(t.indexOf('store.claim(') < t.indexOf('runNotification(actor') || t.indexOf('claim(actor.tenantId') < t.indexOf('const custom = deps.runners'))
  for (const f of fs.readdirSync(__dirname).filter(x => x.endsWith('.ts') && !x.endsWith('.test.ts') && x !== 'execute.ts')) assert.doesNotMatch(src(f), /createAndSendNotification\(|enrollStaff\(|remindEnrollment\(/, `${f} must not run actions`)
})

// ── Confirm: once, only for the proposer, expiry, switches, limits, gap, re-validation ────────────────
const actor: Actor = { tenantId: 't1', userId: 'admin1', role: 'admin' }
function row(over: Partial<ActionRow> = {}): ActionRow {
  return { id: 'a1', tenant_id: 't1', user_id: 'admin1', conversation_id: null, message_id: null, type: 'send_staff_notification', payload: { title: 'Hi', body: 'Body {first_name}', user_ids: ['u1', 'u2', 'gone'], suggested_ids: ['u1', 'u2'], email: false }, status: 'proposed', result: null, created_at: new Date().toISOString(), expires_at: new Date(Date.now() + 600_000).toISOString(), confirmed_at: null, confirmed_by: null, ...over }
}
function deps(a: ActionRow | null, o: { settings?: AskSettings; last?: Date | null; may?: boolean; runs?: any[] } = {}): ConfirmDeps & { finished: any[]; audits: any[] } {
  let claimed = false; const finished: any[] = [], audits: any[] = []
  return {
    finished, audits,
    store: { getProposal: async () => a, effectiveStatus, lastConfirmedAt: async () => o.last ?? null, claim: async () => { if (claimed || a?.status !== 'proposed') return false; claimed = true; return true }, finish: async (_t: string, _id: string, status: any, result: any) => { finished.push({ status, result }) } } as any,
    settings: async () => o.settings ?? on, people: async () => people, may: async () => o.may ?? true, audit: x => { audits.push(x) },
    runners: { send_staff_notification: async (_a, act, ids, ppl) => { o.runs?.push({ ids: revalidate(ids, ppl, true).kept }); return { recipients: 2, emailed: 0, email_failed: 0 } } },
  }
}
test('confirm runs the action once and drops people who are no longer eligible; a second press does nothing', async () => {
  const runs: any[] = [], d = deps(row(), { runs })
  const r1 = await confirmAction(actor, 'a1', new Date(), d)
  assert.equal(r1.ok, true); assert.deepEqual(runs, [{ ids: ['u1', 'u2'] }])
  assert.equal(d.finished[0].status, 'done')
  const r2 = await confirmAction(actor, 'a1', new Date(), d)
  assert.equal(r2.ok, false); assert.equal((r2 as any).code, 'ALREADY'); assert.equal(runs.length, 1)
  assert.ok(d.audits.some(x => x.event_type === 'ask_action_confirmed' && x.metadata.via === 'ask_carestream' && !JSON.stringify(x.metadata).includes('Body')), 'audited via Ask CareStream, with no message text')
})
test('confirm: only the proposer; expired proposals; switched off; too many; too soon', async () => {
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row(), { may: false }))) as any).code, 'NOT_ALLOWED')
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row({ expires_at: new Date(Date.now() - 1000).toISOString() })))) as any).code, 'EXPIRED')
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row(), { settings: DEFAULT_SETTINGS }))) as any).code, 'SWITCHED_OFF')
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row({ payload: { ...row().payload, user_ids: Array.from({ length: 101 }, (_, i) => 'x' + i) } })))) as any).code, 'TOO_MANY')
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row({ payload: { ...row().payload, user_ids: [] } })))) as any).code, 'NO_RECIPIENTS')
  const soon = await confirmAction(actor, 'a1', new Date(), deps(row(), { last: new Date(Date.now() - 30_000) })); assert.equal((soon as any).code, 'TOO_SOON')
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row(), { last: new Date(Date.now() - 5 * 60_000) }))) as any).ok, true)
  assert.equal(((await confirmAction(actor, 'nope', new Date(), deps(null))) as any).code, 'NOT_FOUND')
  assert.equal(((await confirmAction(actor, 'a1', new Date(), deps(row({ status: 'cancelled' })))) as any).code, 'ALREADY')
})
test('a failed run is recorded as failed and audited without content', async () => {
  const d = deps(row()); d.runners = { send_staff_notification: async () => { throw new Error('boom') } }
  const r = await confirmAction(actor, 'a1', new Date(), d)
  assert.equal((r as any).code, 'FAILED'); assert.equal(d.finished[0].status, 'failed'); assert.ok(d.audits.some(x => x.event_type === 'ask_action_failed'))
})
test('confirm checks only the proposer in the source, and the store claim is a single conditional update', () => {
  assert.match(src('execute.ts'), /a\.user_id !== actor\.userId/)
  assert.match(src('store.ts'), /status = 'proposed' and expires_at > now\(\)/)
})

// ── Tier C: never reachable ─────────────────────────────────────────────────
test('Tier C is unreachable: no action type, no tool, no execute path for pay, holiday decisions, removing staff, permissions, sickness or money', () => {
  for (const t of ACTION_TYPES) assert.doesNotMatch(t, /pay|salary|approve|reject|archive|remove|delete|permission|sick|fee|invoice|payment/i)
  const names = [...TOOLS.map(t => t.name), ...ACTION_TOOLS.map(t => t.name)]
  for (const n of names) if (/^(propose|set|update|change|approve|reject|delete|remove|archive|send)_/.test(n)) assert.ok(/^(propose_(staff_notification|unread_reminder|training_allocation|training_reminders)|set_share_intent)$/.test(n), `unexpected write style tool: ${n}`)
  assert.match(tierCNote('please raise Sam\'s pay')?.link ?? '', /staff/); assert.match(tierCNote('approve her holiday')?.link ?? '', /holiday/); assert.equal(tierCNote('what is the weather'), null)
  assert.ok(TIER_C.length >= 6)
  assert.doesNotMatch(src('execute.ts'), /holiday_requests|holidayRequest|holiday_staff|weekday_rate|staffDetail|sick_|archiv|is_active: false|role: 'admin'/)
})

// ── Managers ────────────────────────────────────────────────────────────────
test('managers get an allowlist: no pay, funding or other people\'s balances unless the existing switch allows pay and funding', () => {
  for (const n of ['pay_list', 'pay_summary', 'staff_cost', 'funding_summary', 'holiday_balances', 'holiday_liability', 'holiday_over_allowance', 'save_letter_draft', 'funding_for_person']) assert.equal(toolAllowed('manager', false, n), false, n)
  for (const n of ['pay_list', 'pay_summary', 'staff_cost', 'funding_summary']) assert.equal(toolAllowed('manager', true, n), true, n)
  for (const n of ['holiday_balances', 'holiday_liability', 'funding_for_person', 'save_letter_draft']) assert.equal(toolAllowed('manager', true, n), false, `${n} stays admin only`)
  for (const n of ['propose_staff_notification', 'staff_roster', 'holiday_who_is_off']) assert.equal(toolAllowed('manager', false, n), true)
  assert.equal(toolAllowed('admin', false, 'pay_list'), true); assert.equal(toolAllowed(undefined, false, 'pay_list'), true)
  assert.equal(toolAllowed('manager', false, 'a_brand_new_tool'), false)   // not listed means blocked
  for (const n of MANAGER_TOOLS) assert.ok(!MANAGER_MONEY_TOOLS.has(n))
})
test('managers reach only the chat, their conversations and the action cards; never settings, the library or approvals', () => {
  for (const p of ['/meta', '/chat', '/conversations', '/conversations/abc', '/actions/staff', '/actions/abc', '/actions/abc/confirm', '/actions/abc/cancel']) assert.ok(managerMayReach('GET', p), p)
  for (const p of ['/actions/settings', '/documents', '/documents/1', '/approvals', '/documents/1/share', '/funding']) assert.ok(!managerMayReach('GET', p), p)
})
test('the Ask guard uses the role rule, and the settings are administrator only', () => {
  assert.match(src('../../../routes/ask.ts'), /askRoleFor/)
  assert.match(src('../../../routes/ask-actions.ts'), /role !== 'admin'\) \{ notFound/)
  assert.match(src('../../../lib/ask-pilot.ts'), /managers_can_use/)
})
test('the funding safeguard still holds: only funding-bridge reaches funding', () => {
  for (const f of ['manager-access.ts', 'actions/execute.ts', 'actions/propose.ts', 'actions/tools-actions.ts']) assert.doesNotMatch(src('../' + f), new RegExp(['resident', 'funding'].join('_') + '|get' + 'Funding|ask' + 'Aggregates'), f)
})
