import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'

// The web files are plain TypeScript with no browser code in them, so they are loaded by path here (the API build must not compile them).
const web = () => import(path.resolve(__dirname, '../../../web/src/lib/ask-panel-state'))

test('width is clamped between 360 and 640 and never wider than 90 percent of a small screen', async () => {
  const { clampWidth, MIN_W, MAX_W, DEFAULT_W } = await web()
  assert.equal(clampWidth(100), MIN_W); assert.equal(clampWidth(9000), MAX_W); assert.equal(clampWidth(500), 500)
  assert.equal(clampWidth(NaN), DEFAULT_W); assert.equal(clampWidth(Infinity), DEFAULT_W === MAX_W ? MAX_W : DEFAULT_W)
  assert.equal(clampWidth(640, 700), 630)       // 90 percent of 700
  assert.equal(clampWidth(500, 300), MIN_W)     // the floor still applies
})

test('layout: phone under 640, narrow under 1280, wide from 1280', async () => {
  const { layoutFor } = await web()
  assert.equal(layoutFor(375), 'phone'); assert.equal(layoutFor(639), 'phone'); assert.equal(layoutFor(640), 'narrow')
  assert.equal(layoutFor(1279), 'narrow'); assert.equal(layoutFor(1280), 'wide'); assert.equal(layoutFor(1920), 'wide')
})

test('remembered state: round trip, bad data, blocked storage', async () => {
  const { parsePrefs, serializePrefs, loadPrefs, savePrefs, prefsKey, DEFAULT_W } = await web()
  assert.deepEqual(parsePrefs(serializePrefs({ open: true, width: 520 })), { open: true, width: 520 })
  assert.deepEqual(parsePrefs('not json'), { open: false, width: DEFAULT_W })
  assert.deepEqual(parsePrefs(null), { open: false, width: DEFAULT_W })
  assert.equal(parsePrefs(JSON.stringify({ open: 'yes', width: 5 })).open, false)
  assert.equal(parsePrefs(JSON.stringify({ open: true, width: 5 })).width, 360)
  const bad = { getItem: () => { throw new Error('blocked') }, setItem: () => { throw new Error('blocked') } }
  assert.deepEqual(loadPrefs('a@b.co', bad), { open: false, width: DEFAULT_W })
  assert.doesNotThrow(() => savePrefs('a@b.co', { open: true, width: 400 }, bad))
  const mem = new Map<string, string>(); const ok = { getItem: (k: string) => mem.get(k) ?? null, setItem: (k: string, v: string) => { mem.set(k, v) } }
  savePrefs('Admin@Home.co', { open: true, width: 480 }, ok)
  assert.deepEqual(loadPrefs('admin@home.co', ok), { open: true, width: 480 })      // keyed by person, case insensitive
  assert.notEqual(prefsKey('a@b.co'), prefsKey('c@d.co'))
})

test('the agent suggested for each page', async () => {
  const { agentForPage } = await web()
  assert.equal(agentForPage('holiday-matrix'), 'holiday'); assert.equal(agentForPage('holiday-calendar'), 'holiday'); assert.equal(agentForPage('holiday-requests'), 'holiday')
  assert.equal(agentForPage('staff-list'), 'staff'); assert.equal(agentForPage('staff-member'), 'staff')
  assert.equal(agentForPage('notifications'), 'notifications'); assert.equal(agentForPage('residents'), 'pay'); assert.equal(agentForPage('dashboard'), null)
})

test('starters fit the page, use the first name, and carry no dashes', async () => {
  const { contextStarters } = await web()
  const staff = contextStarters({ page: 'staff-member', label: 'x', staffName: 'Aisha Rahman', staffUserId: 'u' })
  assert.ok(staff[0].includes('Aisha') && !staff[0].includes('Rahman'))
  for (const page of ['holiday-matrix', 'holiday-calendar', 'holiday-requests', 'staff-list', 'staff-member', 'notifications', 'residents'] as const) {
    const list = contextStarters({ page, label: 'x', staffName: 'Sam Lee' })
    assert.ok(list.length >= 2 && list.length <= 3, page)
    for (const q of list) assert.ok(!/[–—]/.test(q), q)
  }
  assert.deepEqual(contextStarters({ page: 'dashboard', label: 'x' }), [])
})

test('what is sent to the server is ids and numbers only: no names and no labels', async () => {
  const { toWireContext } = await web()
  const w = toWireContext({ page: 'staff-member', label: 'Aisha Rahman salary', staffName: 'Aisha Rahman', staffUserId: 'user-12345678', year: 2026 })
  assert.deepEqual(w, { page: 'staff-member', staffUserId: 'user-12345678', year: 2026 })
  assert.ok(!JSON.stringify(w).includes('Aisha') && !JSON.stringify(w).includes('salary'))
  assert.equal(toWireContext(null), undefined)
})
