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
  const { parsePrefs, serializePrefs, loadPrefs, savePrefs, prefsKey, DEFAULT_W, MIN_W } = await web()
  assert.ok(DEFAULT_W >= 640, 'the wide view is the default')
  assert.deepEqual(parsePrefs(serializePrefs({ open: true, width: 520 })), { open: true, width: 520 })
  assert.deepEqual(parsePrefs('not json'), { open: false, width: DEFAULT_W })
  assert.deepEqual(parsePrefs(null), { open: false, width: DEFAULT_W })
  assert.equal(parsePrefs(JSON.stringify({ open: 'yes', width: 5 })).open, false)
  assert.equal(parsePrefs(JSON.stringify({ open: true, width: 5 })).width, MIN_W)
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

test('page publishers: the residents screen publishes an id only, and no publisher sends pay, funding or health text (source check)', async () => {
  const fs = await import('fs')
  const root = path.resolve(__dirname, '../../../web/src')
  const res = fs.readFileSync(path.join(root, 'components/admin/residents-overlay.tsx'), 'utf8')
  const line = res.split('\n').find(l => l.includes("page: 'residents'")) ?? ''
  assert.ok(line.includes('residentId: selected'), 'publishes the id')
  assert.ok(!/name|fee|funding|£/i.test(line.replace('the residents screen', '').replace('a resident record', '')), 'no names or money')
  for (const f of ['app/(admin)/holiday/page.tsx', 'components/admin/holiday/matrix-tab.tsx', 'components/admin/holiday/calendar-tab.tsx', 'app/(admin)/staff/page.tsx', 'app/(admin)/staff/[id]/page.tsx', 'app/(admin)/notifications/page.tsx', 'app/(admin)/dashboard/page.tsx']) {
    const src = fs.readFileSync(path.join(root, f), 'utf8')
    const l = src.split('\n').filter(x => x.includes('useAskPageContext(')).join('\n')
    assert.ok(l.length > 0, `${f} publishes a context`)
    assert.ok(!/rate|salary|sick|pay\b|funding|£/i.test(l), `${f} publishes nothing about pay, health or funding`)
  }
})

test('the support chat bubble moves out of the way of a docked panel', async () => {
  const fs = await import('fs')
  const src = fs.readFileSync(path.resolve(__dirname, '../../../web/src/components/support/chat-widget.tsx'), 'utf8')
  assert.ok(src.includes('var(--ask-dock,0px)'))
})

// ── Len's rules (25 Nov 2026): the Ask panel opens OVER the page like the Orrery one, and no visible scroll bars ──────────────────────
const webSrc = async (rel: string) => (await import('fs')).readFileSync(path.resolve(__dirname, '../../../web/src', rel), 'utf8')

test('the panel is always an overlay: fixed on the right at every width, never part of the page layout', async () => {
  const src = await webSrc('components/ask/ask-overlay.tsx')
  assert.ok(src.includes('fixed bottom-0 right-0 top-0 z-[75]'), 'docked panel is fixed on the right and covers the top banner')
  assert.ok(!src.includes('relative h-full flex-shrink-0'), 'no flex child that would push the page across')
  assert.ok(!/layout === 'wide'/.test(src), 'no special wide layout')
  assert.ok(src.includes("const rootCls = expanded ? 'fixed inset-0 z-[75]") && src.includes(": 'contents'"), 'the root takes no space when docked')
  assert.ok(src.includes('ask-slide-in'))
  const css = await webSrc('app/globals.css')
  assert.ok(css.includes('.ask-slide-in') && /prefers-reduced-motion/.test(css))
  const shell = await webSrc('components/admin-shell.tsx')
  assert.ok(shell.includes('<AskPanelHost />') && /OVER the page/.test(shell))
})

test('no scroll bars: every scrolling region and text box in the Ask UI hides its bar (wheel, touch and keyboard still scroll)', async () => {
  const css = await webSrc('app/globals.css')
  assert.ok(/\.no-scrollbar::-webkit-scrollbar\s*{\s*display:\s*none/.test(css) && /\.no-scrollbar\s*{[^}]*scrollbar-width:\s*none/.test(css))
  for (const f of ['components/ask/ask-overlay.tsx', 'components/ask/document-panel.tsx', 'components/ask/markdown-lite.tsx']) {
    const src = await webSrc(f)
    for (const m of src.matchAll(/className=(\{`[^`]*`\}|"[^"]*")/g)) {
      if (/overflow-(x|y)-(auto|scroll)|overflow-auto/.test(m[1])) assert.ok(m[1].includes('no-scrollbar'), `${f}: ${m[1].slice(0, 80)}`)
    }
    for (const m of src.matchAll(/<textarea[^>]*className=(\{`[^`]*`\}|"[^"]*")/g)) assert.ok(m[1].includes('no-scrollbar'), `${f}: a text box shows a scroll bar`)
  }
})

test('the Prompts page lists Ask CareStream prompts under their own heading with the locked rules panel and no scrolling box', async () => {
  const src = await webSrc('app/(platform)/platform/prompts/page.tsx')
  assert.ok(src.includes('Locked safety rules (cannot be edited here)') && src.includes('ask?.group'))
  assert.ok(!/<pre className="overflow-x-auto/.test(src), 'prompt text wraps instead of scrolling')
})
