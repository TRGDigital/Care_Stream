import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { approversToNotify, submittedMessage, decidedMessage, reminderMessage, reminderDue, planReminders, notifySubmitted, notifyDecided, sendReminders, kindLabel, type NotifyDeps, type Person } from './approver-notify'

const A: Person = { id: 'a', name: 'Sam Carter' }, B: Person = { id: 'b', name: 'Priya Shah' }, C: Person = { id: 'c', name: 'Lee Wong' }
const NOW = new Date('2026-11-26T09:00:00Z')

function harness(admins: Person[], emailsOn = true) {
  const sent: any[] = []; const stamps: Array<{ id: string; patch: any }> = []
  const deps: NotifyDeps = {
    admins: async () => admins, nameOf: async (_t, u) => admins.find(a => a.id === u)?.name ?? '',
    emailsOn: async () => emailsOn,
    stamp: async (_t, id, patch) => { stamps.push({ id, patch }) },
    send: async o => { sent.push(o); return { recipients: o.toUserIds.length, emailed: o.email ? o.toUserIds.length : 0 } },
  }
  return { deps, sent, stamps }
}

test('WHO: every administrator except the author is told; the only administrator is told nothing about their own document', () => {
  assert.deepEqual(approversToNotify('a', [A, B, C]).map(x => x.id), ['b', 'c'])
  assert.deepEqual(approversToNotify('a', [A]), [])
  assert.deepEqual(approversToNotify('a', [A, B]).map(x => x.id), ['b'])
})

test('SUBMIT: one notice to the other approvers, hub always, email follows the account switch, and the submit is stamped', async () => {
  const h = harness([A, B, C])
  const r = await notifySubmitted(h.deps, { tenantId: 't', docId: 'd1', type: 'letter', authorId: 'a', now: NOW })
  assert.equal(r.notified, 2); assert.equal(h.sent.length, 1)
  assert.deepEqual(h.sent[0].toUserIds, ['b', 'c']); assert.equal(h.sent[0].fromUserId, 'a'); assert.equal(h.sent[0].email, true)
  assert.equal(h.sent[0].title, 'A letter is waiting for your approval from Sam')
  assert.equal(h.stamps[0].patch.submitted_at, NOW.toISOString()); assert.equal(h.stamps[0].patch.reminded_at, null)
  const off = harness([A, B], false); await notifySubmitted(off.deps, { tenantId: 't', docId: 'd2', type: 'newsletter', authorId: 'a', now: NOW })
  assert.equal(off.sent[0].email, false)   // the hub message still goes
})

test('SUBMIT: a sole administrator is not notified of their own document, and a re-submit after changes notifies again (one per submit)', async () => {
  const solo = harness([A]); const r = await notifySubmitted(solo.deps, { tenantId: 't', docId: 'd1', type: 'report', authorId: 'a', now: NOW })
  assert.equal(r.notified, 0); assert.equal(solo.sent.length, 0)
  const h = harness([A, B])
  await notifySubmitted(h.deps, { tenantId: 't', docId: 'd1', type: 'letter', authorId: 'a', now: NOW })
  await notifySubmitted(h.deps, { tenantId: 't', docId: 'd1', type: 'letter', authorId: 'a', now: new Date('2026-11-27T09:00:00Z') })
  assert.equal(h.sent.length, 2)
  assert.equal(h.stamps.filter(s => s.patch.reminded_at === null).length, 2)   // a new submit starts a new wait, so it can be reminded once more
})

test('SUBMIT: a failed notice never throws (the submit stands), and a type that needs no approval sends nothing', async () => {
  const h = harness([A, B]); h.deps.send = async () => { throw new Error('mail down') }
  assert.deepEqual(await notifySubmitted(h.deps, { tenantId: 't', docId: 'd', type: 'letter', authorId: 'a' }), { notified: 0, emailed: 0 })
  const g = harness([A, B]); assert.equal((await notifySubmitted(g.deps, { tenantId: 't', docId: 'd', type: 'answer', authorId: 'a' })).notified, 0); assert.equal(g.sent.length, 0)
})

test('DECISION: the author is told when someone else approves or sends it back; never about their own action', async () => {
  const h = harness([A, B])
  await notifyDecided(h.deps, { tenantId: 't', type: 'letter', authorId: 'a', deciderId: 'b', decision: 'approved' })
  await notifyDecided(h.deps, { tenantId: 't', type: 'newsletter', authorId: 'a', deciderId: 'b', decision: 'returned' })
  assert.equal(h.sent.length, 2); assert.deepEqual(h.sent[0].toUserIds, ['a']); assert.equal(h.sent[0].fromUserId, 'b')
  assert.match(h.sent[0].title, /^A letter you wrote was approved by Priya$/); assert.match(h.sent[1].title, /^A staff newsletter you wrote was sent back by Priya$/)
  assert.match(h.sent[1].body, /note/)   // points to the note, never copies it
  await notifyDecided(h.deps, { tenantId: 't', type: 'letter', authorId: 'a', deciderId: 'a', decision: 'approved' })   // the sole administrator approving their own
  await notifyDecided(h.deps, { tenantId: 't', type: 'letter', authorId: 'a', deciderId: 'a', decision: 'returned' })   // the author withdrawing it
  assert.equal(h.sent.length, 2)
})

test('REMINDER: due after 3 days, never twice, and legacy documents use the time they were last changed', () => {
  assert.equal(reminderDue({ submitted_at: '2026-11-23T08:00:00Z' }, null, NOW), true)
  assert.equal(reminderDue({ submitted_at: '2026-11-24T10:00:00Z' }, null, NOW), false)
  assert.equal(reminderDue({ submitted_at: '2026-11-20T08:00:00Z', reminded_at: '2026-11-23T08:00:00Z' }, null, NOW), false)
  assert.equal(reminderDue(null, '2026-11-22T08:00:00Z', NOW), true)
  assert.equal(reminderDue(null, null, NOW), false)
})

test('REMINDER: one message per approver however many items, nobody is reminded about their own item, and a sole administrator gets none', () => {
  const plan = planReminders([{ id: 'd1', created_by: 'a' }, { id: 'd2', created_by: 'a' }, { id: 'd3', created_by: 'b' }], [A, B, C])
  assert.equal(plan.length, 3)
  assert.deepEqual(plan.find(p => p.approver.id === 'a')!.docIds, ['d3']); assert.deepEqual(plan.find(p => p.approver.id === 'b')!.docIds, ['d1', 'd2']); assert.deepEqual(plan.find(p => p.approver.id === 'c')!.docIds, ['d1', 'd2', 'd3'])
  assert.deepEqual(planReminders([{ id: 'd1', created_by: 'a' }], [A]), [])
})

test('REMINDER RUN: documents are stamped BEFORE sending, only overdue ones are reminded, and a second run sends nothing', async () => {
  const h = harness([A, B, C])
  const pending: any[] = [
    { id: 'old', created_by: 'a', updated_at: '2026-11-20T08:00:00Z', approval: { submitted_at: '2026-11-20T08:00:00Z' } },
    { id: 'fresh', created_by: 'a', updated_at: '2026-11-26T08:00:00Z', approval: { submitted_at: '2026-11-26T08:00:00Z' } },
    { id: 'done', created_by: 'b', updated_at: '2026-11-18T08:00:00Z', approval: { submitted_at: '2026-11-18T08:00:00Z', reminded_at: '2026-11-21T08:00:00Z' } },
  ]
  const r = await sendReminders(h.deps, { tenantId: 't', pending, now: NOW })
  assert.equal(r.reminded_docs, 1); assert.equal(r.messages, 2)   // b and c; a wrote it
  assert.deepEqual(h.sent.map(s => s.toUserIds[0]).sort(), ['b', 'c'])
  assert.deepEqual(h.stamps.map(s => s.id), ['old']); assert.ok(h.stamps[0].patch.reminded_at)
  assert.match(h.sent[0].title, /^One item from Sam has been waiting 3 days for your approval$/)
  const again = await sendReminders(h.deps, { tenantId: 't', pending: pending.map(p => p.id === 'old' ? { ...p, approval: { ...p.approval, reminded_at: NOW.toISOString() } } : p), now: NOW })
  assert.equal(again.reminded_docs, 0); assert.equal(h.sent.length, 2)
  const g = harness([A, B, C]); g.deps.send = async () => { throw new Error('mail down') }
  await sendReminders(g.deps, { tenantId: 't', pending: [pending[0]], now: NOW }); assert.equal(g.stamps.length, 1)   // stamped even when the send fails: no second reminder
})

test('NO LEAKS: the messages carry only the kind of document and a first name, never a title, a staff name, content or a note, and have no dashes', () => {
  const all = [submittedMessage('letter', 'Sam Carter'), submittedMessage('newsletter', 'Sam Carter'), submittedMessage('report', 'Sam Carter'), decidedMessage('letter', 'approved', 'Priya Shah'), decidedMessage('report', 'returned', 'Priya Shah'), reminderMessage(1, 'Sam Carter'), reminderMessage(4, null)]
  for (const m of all) { const t = `${m.title} ${m.body}`; assert.doesNotMatch(t, /[–—-]/, t); assert.doesNotMatch(t, /Carter|Shah/); assert.ok(m.title.length < 100) }
  assert.equal(kindLabel('newsletter'), 'A staff newsletter')
  const src = fs.readFileSync(path.join(__dirname, 'approver-notify.ts'), 'utf8')
  assert.doesNotMatch(src, /\.title\b|\.body\b|review_note|\.note\b/)   // the module never reads a document's title, body or note
})

test('WIRING: submit, approve and return call the notifiers, the audit never holds content, the reminder is a pilot-gated cron, and the SQL is safe to repeat', () => {
  const r = fs.readFileSync(path.join(__dirname, '../../routes/ask.ts'), 'utf8')
  assert.match(r, /notifySubmitted\(approverDeps/); assert.match(r, /notifyDecided\(approverDeps[^)]*decision: 'approved'/); assert.match(r, /notifyDecided\(approverDeps[^)]*decision: 'returned'/)
  assert.match(r, /waiting_for_me/); assert.match(r, /can_approve/)
  const c = fs.readFileSync(path.join(__dirname, '../../routes/cron.ts'), 'utf8')
  assert.match(c, /ask-approval-reminders/); assert.match(c, /askPilotEnabled/)
  const d = fs.readFileSync(path.join(__dirname, 'approver-deps.ts'), 'utf8')
  assert.match(d, /skipDailyLimit: true/); assert.match(d, /via: 'ask_approval'/); assert.match(d, /approver_emails !== false/)   // default on, hub always
  const sql = fs.readFileSync(path.join(__dirname, '../../../prisma/sql/2026-11-26_ask_approver_notifications.sql'), 'utf8')
  assert.match(sql, /add column if not exists approver_emails boolean not null default true/); assert.match(sql, /carestream_cron\('ask-approval-reminders'\)/)
  const web = fs.readFileSync(path.join(__dirname, '../../../../web/src/components/ask/ask-overlay.tsx'), 'utf8')
  assert.match(web, /Awaiting approval/); assert.match(web, /waiting for your approval/)
})
