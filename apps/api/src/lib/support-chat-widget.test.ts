import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'

// The web file is loaded by path at run time (the API build must not compile it).
const w = () => import(path.resolve(__dirname, '../../../web/src/lib/support-chat-widget'))

test('polling: 3 seconds open, 8 seconds minimised, never without a chat or on a hidden tab', async () => {
  const { pollIntervalMs } = await w()
  assert.equal(pollIntervalMs({ hasChat: true, open: true, tabHidden: false }), 3000)
  assert.equal(pollIntervalMs({ hasChat: true, open: false, tabHidden: false }), 8000)
  assert.equal(pollIntervalMs({ hasChat: false, open: true, tabHidden: false }), null)
  assert.equal(pollIntervalMs({ hasChat: false, open: false, tabHidden: false }), null)
  assert.equal(pollIntervalMs({ hasChat: true, open: true, tabHidden: true }), null)
})

test('unread counting: only new messages from the team count', async () => {
  const { freshMessages, countAgentMessages } = await w()
  const have = [{ id: '1', sender: 'customer' }, { id: '2', sender: 'agent' }]
  const incoming = [{ id: '2', sender: 'agent' }, { id: '3', sender: 'agent' }, { id: '4', sender: 'customer' }, { id: '5', sender: 'system' }]
  const fresh = freshMessages(have, incoming)
  assert.deepEqual(fresh.map((m: any) => m.id), ['3', '4', '5'])
  assert.equal(countAgentMessages(fresh), 1)
})

test('the widget state is remembered for the session, and a bad or blocked store is harmless', async () => {
  const { readWidgetState, writeWidgetState, readSoundOn, writeSoundOn, WIDGET_KEY } = await w()
  const mem = new Map<string, string>(); const store = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
  assert.deepEqual(readWidgetState(store), { open: false, chatId: null })
  writeWidgetState(store, { open: true, chatId: 'abc' })
  assert.deepEqual(readWidgetState(store), { open: true, chatId: 'abc' })
  mem.set(WIDGET_KEY, 'not json'); assert.deepEqual(readWidgetState(store), { open: false, chatId: null })
  assert.deepEqual(readWidgetState(null), { open: false, chatId: null })
  const blocked = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.deepEqual(readWidgetState(blocked), { open: false, chatId: null }); writeWidgetState(blocked, { open: true, chatId: 'x' })
  assert.equal(readSoundOn(store), false); writeSoundOn(store, true); assert.equal(readSoundOn(store), true)
})

test('the tab title carries the unread count and drops it again', async () => {
  const { titleWithUnread } = await w()
  assert.equal(titleWithUnread('Dashboard | CareStream', 2), '(2) Dashboard | CareStream')
  assert.equal(titleWithUnread('(2) Dashboard | CareStream', 0), 'Dashboard | CareStream')
  assert.equal(titleWithUnread('(2) Dashboard | CareStream', 3), '(3) Dashboard | CareStream')
})
