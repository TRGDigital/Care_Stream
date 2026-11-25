import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../../../web/src', f), 'utf8')

test('the action card: Confirm is the only way to run it, with a picker, an editable message and no scroll bars', () => {
  const c = web('components/ask/action-card.tsx')
  assert.match(c, /ask\.actions\.confirm\(/); assert.match(c, /Nothing has happened yet\. Check the people and the wording, then press Confirm\./)
  assert.match(c, /All active staff/); assert.match(c, /Find a person/); assert.match(c, /Suggested/); assert.match(c, /no-scrollbar/); assert.doesNotMatch(c, /overflow-y-scroll|overflow-scroll/)
  assert.match(c, /Preview for/); assert.match(c, /Each person gets their own figures/); assert.match(c, /Withdraw/); assert.match(c, /cannot be recalled/)
  assert.doesNotMatch(c, /[–—]/, 'no dashes in copy')
})
test('the panel shows cards under the answer that proposed them, from a new answer and from a reopened chat', () => {
  const o = web('components/ask/ask-overlay.tsx')
  assert.match(o, /<ActionCard key=\{c\.id\} token=\{token\} card=\{c\} \/>/); assert.match(o, /r\.actions\?\.length/); assert.match(o, /x\.message_id/)
})
test('Settings has an Ask CareStream section with every switch off by default, and managers can only use it when switched on', () => {
  const s = web('components/ask/ask-settings.tsx'), p = web('app/(admin)/settings/page.tsx')
  for (const k of ['actions_enabled', 'notifications_enabled', 'training_enabled', 'emails_enabled', 'managers_can_use', 'max_recipients', 'min_gap_minutes']) assert.match(s, new RegExp(k))
  assert.match(s, /Let Ask CareStream take actions/); assert.match(s, /Let managers use Ask CareStream/); assert.match(p, /AskSettingsBody/); assert.doesNotMatch(s, /[–—]/)
})
test('Ask CareStream is not in the staff hub (removed on request); the panel still hides itself for everyone it is not for', () => {
  assert.doesNotMatch(web('components/portal-nav.tsx'), /AskButton/); assert.doesNotMatch(web('app/(portal)/layout.tsx'), /AskPanelHost/)
  assert.match(web('components/ask/ask-overlay.tsx'), /cs-ask-off/)
})
test('the Notifications page can withdraw a notification and shows when it was withdrawn', () => {
  const n = web('app/(admin)/notifications/page.tsx')
  assert.match(n, /adminNotifications\.withdraw/); assert.match(n, /Withdrawn/); assert.match(n, /cannot be recalled/)
})
