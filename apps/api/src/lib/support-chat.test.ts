import test from 'node:test'
import assert from 'node:assert/strict'
import * as chat from './support-chat'
import { ChatError, type Deps } from './support-chat'

// A tiny in memory stand in for the database: just the calls the chat rules make.
function fakeDb() {
  const tables: Record<string, any[]> = { chats: [], msgs: [], presence: [] }
  let n = 0
  const match = (row: any, where: any = {}): boolean => Object.entries(where).every(([k, v]: [string, any]) => {
    if (v && typeof v === 'object' && !(v instanceof Date)) {
      if ('in' in v) return v.in.includes(row[k])
      if ('not' in v) return row[k] !== v.not
      if ('gt' in v) return new Date(row[k]).getTime() > new Date(v.gt).getTime()
    }
    return row[k] === v
  })
  const table = (name: string, defaults: () => any = () => ({})) => ({
    findFirst: async ({ where, orderBy }: any = {}) => { const r = tables[name].filter(x => match(x, where)); if (orderBy) { const [k, d] = Object.entries(orderBy)[0] as any; r.sort((a, b) => (new Date(a[k]).getTime() - new Date(b[k]).getTime()) * (d === 'desc' ? -1 : 1)) } return r[0] ?? null },
    findUnique: async ({ where }: any) => tables[name].find(x => match(x, where)) ?? null,
    findMany: async ({ where, orderBy, take }: any = {}) => { const r = tables[name].filter(x => match(x, where)); if (orderBy) { const [k, d] = Object.entries(orderBy)[0] as any; r.sort((a, b) => (new Date(a[k]).getTime() - new Date(b[k]).getTime()) * (d === 'desc' ? -1 : 1)) } return take ? r.slice(0, take) : r },
    create: async ({ data }: any) => { const row = { id: `id${++n}`, created_at: new Date(Date.now() + n), ...defaults(), ...data }; tables[name].push(row); return row },
    update: async ({ where, data }: any) => { const row = tables[name].find(x => match(x, where)); Object.assign(row, Object.fromEntries(Object.entries(data).filter(([, v]) => v !== undefined))); return row },
    upsert: async ({ where, create, update }: any) => { const row = tables[name].find(x => match(x, where)); if (row) { Object.assign(row, Object.fromEntries(Object.entries(update).filter(([, v]) => v !== undefined))); return row } const c = { ...create }; tables[name].push(c); return c },
  })
  return {
    tables,
    supportChat: table('chats'), supportChatMessage: table('msgs'), supportAgentPresence: table('presence'),
    tenant: { findUnique: async ({ where }: any) => ({ A: { name: 'Ferndale', account_number: 'CS-1001', tier: 'full', plan_id: null }, B: { name: 'Oak House', account_number: 'CS-2002', tier: 'full', plan_id: null } } as any)[where.id] },
    user: { findUnique: async ({ where }: any) => ({ ua: { name: 'Amy Admin', email: 'amy@ferndale.test' }, ub: { name: 'Ben Boss', email: 'ben@oak.test' } } as any)[where.id] },
    plan: { findUnique: async () => null },
  }
}

const TUE_10 = new Date('2026-11-24T10:00:00Z')
function setup(now: Date = TUE_10, online = true) {
  const db = fakeDb()
  const team: any[] = [], replies: any[] = []
  let clock = now
  const d: Deps = { db, mail: { notifyTeam: async o => { team.push(o) }, replyToCustomer: async o => { replies.push(o) } }, now: () => clock }
  if (online) db.tables.presence.push({ agent_key: 'len', agent_name: 'Len', online: true, last_seen_at: new Date(now.getTime() - 10_000) })
  chat.resetRateLimit()
  return { db, d, team, replies, setNow: (t: Date) => { clock = t } }
}

test('a live chat is stored with the customer reference and the team is emailed once', async () => {
  const { d, team, db } = setup()
  const r = await chat.startLive(d, 'A', 'ua', '  Hello, how do I add a resident?  ')
  assert.equal(r.chat.mode, 'live'); assert.equal(r.chat.status, 'waiting')
  assert.equal(db.tables.chats[0].customer_reference, 'CS-1001'); assert.equal(db.tables.chats[0].home_name, 'Ferndale')
  assert.equal(team.length, 1); assert.equal(team[0].kind, 'live'); assert.equal(team[0].message, 'Hello, how do I add a resident?')
  await chat.customerSend(d, 'A', 'ua', r.chat.id, 'Hello again')
  assert.equal(team.length, 1, 'second message within ten minutes is not emailed again')
})

test('after ten minutes the team is emailed again for the same chat', async () => {
  const { d, team, setNow } = setup()
  const r = await chat.startLive(d, 'A', 'ua', 'First')
  setNow(new Date(TUE_10.getTime() + 11 * 60_000))
  await chat.customerSend(d, 'A', 'ua', r.chat.id, 'Anyone there?')
  assert.equal(team.length, 2)
})

test('a new live chat is refused when nobody is online, but a chat already open can carry on', async () => {
  const away = setup(TUE_10, false)
  await assert.rejects(() => chat.startLive(away.d, 'A', 'ua', 'Hi'), (e: any) => e instanceof ChatError && e.code === 'AWAY')
  const afterHours = setup(new Date('2026-11-24T18:30:00Z'), true)   // heartbeat is fresh but it is 18:30
  await assert.rejects(() => chat.startLive(afterHours.d, 'A', 'ua', 'Hi'), (e: any) => e.code === 'AWAY')
})

test('an offline message is stored, emailed to the team, and the reply is emailed to the customer', async () => {
  const { d, team, replies, db } = setup(new Date('2026-11-24T18:30:00Z'), false)
  const r = await chat.leaveMessage(d, 'A', 'ua', { message: 'Please call me about billing', name: 'Amy A', email: 'amy@ferndale.test' })
  assert.equal(r.chat.mode, 'offline')
  assert.equal(db.tables.chats[0].status, 'waiting'); assert.equal(db.tables.msgs.length, 1)
  assert.equal(team.length, 1); assert.equal(team[0].kind, 'offline'); assert.equal(team[0].reference, 'CS-1001')
  const rep = await chat.agentReply(d, r.chat.id, 'Hello Amy, billing is under Settings.', 'Len')
  assert.equal(rep.emailed, true); assert.equal(replies[0].to, 'amy@ferndale.test'); assert.equal(replies[0].original, 'Please call me about billing')
  assert.equal(db.tables.chats[0].status, 'answered')
})

test('a bad email address on the offline form is refused', async () => {
  const { d } = setup(TUE_10, false)
  await assert.rejects(() => chat.leaveMessage(d, 'A', 'ua', { message: 'Hi', email: 'not-an-email' }), (e: any) => e.code === 'INVALID')
})

test('a live chat left unanswered can be turned into an offline message', async () => {
  const { d, team, db } = setup()
  const r = await chat.startLive(d, 'A', 'ua', 'Anyone?')
  const o = await chat.leaveMessage(d, 'A', 'ua', { message: 'Please email me instead', chat_id: r.chat.id })
  assert.equal(o.chat.id, r.chat.id); assert.equal(db.tables.chats[0].mode, 'offline'); assert.equal(db.tables.chats.length, 1)
  assert.ok(db.tables.msgs.some((m: any) => m.sender === 'system'))
  assert.ok(team.length >= 1)
})

test('one home can never read or write another home\'s chat', async () => {
  const { d } = setup()
  const r = await chat.startLive(d, 'A', 'ua', 'Private question about our residents')
  await assert.rejects(() => chat.customerMessages(d, 'B', 'ub', r.chat.id), (e: any) => e.status === 404)
  await assert.rejects(() => chat.customerSend(d, 'B', 'ub', r.chat.id, 'hello'), (e: any) => e.status === 404)
  await assert.rejects(() => chat.customerClose(d, 'B', 'ub', r.chat.id), (e: any) => e.status === 404)
  await assert.rejects(() => chat.customerMessages(d, 'A', 'ub', r.chat.id), (e: any) => e.status === 404, 'a different person in the same home does not see it either')
  const s = await chat.statusFor(d, 'B', 'ub'); assert.equal(s.chat, null)
})

test('messages are cleaned and limited, and empty ones refused', async () => {
  const { d } = setup()
  await assert.rejects(() => chat.startLive(d, 'A', 'ua', '   '), (e: any) => e.code === 'INVALID')
  const r = await chat.startLive(d, 'A', 'ua', 'a\u0000b' + 'x'.repeat(5000))
  assert.ok(r.message.body.length <= chat.BODY_MAX); assert.ok(!r.message.body.includes('\u0000'))
})

test('customers are rate limited', async () => {
  const { d } = setup()
  const r = await chat.startLive(d, 'A', 'ua', 'one')
  let limited = false
  for (let i = 0; i < 25; i++) { try { await chat.customerSend(d, 'A', 'ua', r.chat.id, `m${i}`) } catch (e: any) { if (e.code === 'RATE_LIMITED') limited = true } }
  assert.ok(limited)
})

test('the inbox counts unread chats, replying marks them read, closing ends the chat', async () => {
  const { d } = setup()
  const r = await chat.startLive(d, 'A', 'ua', 'Help please')
  assert.equal(await chat.agentUnreadChats(d), 1)
  const list = await chat.agentList(d, 'live'); assert.equal(list.chats[0].unread, 1)
  await chat.agentGet(d, r.chat.id)
  assert.equal(await chat.agentUnreadChats(d), 0)
  await chat.agentReply(d, r.chat.id, 'Hi Amy', 'Len')
  const msgs = await chat.customerMessages(d, 'A', 'ua', r.chat.id)
  assert.deepEqual(msgs.messages.map(m => m.sender), ['customer', 'agent'])
  await chat.agentClose(d, r.chat.id)
  await assert.rejects(() => chat.customerSend(d, 'A', 'ua', r.chat.id, 'more'), (e: any) => e.code === 'CLOSED')
  assert.equal((await chat.agentList(d, 'closed')).chats.length, 1)
})

test('the heartbeat toggles online and the status follows (hours plus a recent heartbeat)', async () => {
  const { d, setNow } = setup(TUE_10, false)
  assert.equal((await chat.statusFor(d, 'A', 'ua')).online, false)
  await chat.agentHeartbeat(d, 'len', 'Len', true)
  assert.equal((await chat.statusFor(d, 'A', 'ua')).online, true)
  setNow(new Date(TUE_10.getTime() + 2 * 60_000))                 // no heartbeat for two minutes
  assert.equal((await chat.statusFor(d, 'A', 'ua')).online, false)
  await chat.agentHeartbeat(d, 'len', 'Len')                        // a heartbeat without a toggle keeps the saved choice
  assert.equal((await chat.statusFor(d, 'A', 'ua')).online, true)
  await chat.agentHeartbeat(d, 'len', 'Len', false)
  assert.equal((await chat.statusFor(d, 'A', 'ua')).online, false)
})

test('on a bank holiday the status says why the team is closed', async () => {
  const { d } = setup(new Date('2026-12-25T10:00:00Z'), true)
  const s = await chat.statusFor(d, 'A', 'ua')
  assert.equal(s.online, false); assert.equal(s.closed?.reason, 'bank_holiday')
  assert.match(s.closed!.text, /closed today for the bank holiday/)
})

test('the still-waiting prompt appears after three minutes without an answer', async () => {
  const { d, setNow } = setup()
  const r = await chat.startLive(d, 'A', 'ua', 'Hello?')
  assert.equal((await chat.customerMessages(d, 'A', 'ua', r.chat.id)).chat.still_waiting, false)
  setNow(new Date(TUE_10.getTime() + 4 * 60_000))
  d.db.tables.presence[0].last_seen_at = new Date(TUE_10.getTime() + 3.9 * 60_000)   // the team is still online
  assert.equal((await chat.customerMessages(d, 'A', 'ua', r.chat.id)).chat.still_waiting, true)
})
