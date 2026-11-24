import test from 'node:test'
import assert from 'node:assert/strict'
import path from 'path'
const web = (f: string) => import(path.resolve(__dirname, '../../../../web/src', f))

test('a notification draft is read out of the fenced block and the block is removed from the answer text', async () => {
  const { parseNotificationDraft, withoutDraftBlock, notificationsLink } = await web('lib/ask-client')
  const text = 'Here is a draft.\n```notification\nTITLE: Holiday requests close Friday\nBODY:\nHello team,\n\nPlease send December requests by Friday.\n```\nLet me know.'
  const d = parseNotificationDraft(text)
  assert.equal(d.title, 'Holiday requests close Friday'); assert.match(d.body, /^Hello team,\n\nPlease send December requests by Friday\.$/)
  assert.ok(!/```/.test(withoutDraftBlock(text)))
  assert.match(notificationsLink(d), /^\/notifications\?title=Holiday%20requests%20close%20Friday&body=/)
  assert.equal(parseNotificationDraft('no block here'), null)
})

test('answers are split into paragraphs, lists and tables (and never HTML)', async () => {
  const { parseBlocks } = await web('components/ask/markdown-lite')
  const b = parseBlocks('Intro line\n\n- one\n- two\n\n1. first\n2. second\n\n| Name | Cost |\n|---|---|\n| A | 1.00 |\n\n<script>alert(1)</script>')
  assert.deepEqual(b.map((x: any) => x.kind), ['p', 'ul', 'ol', 'table', 'p'])
})
