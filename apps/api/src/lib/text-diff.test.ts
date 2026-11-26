// The highlight on wording being adopted: what was added or changed from the suggestion, word by word.
import test from 'node:test'
import assert from 'node:assert/strict'
import { diffAdded, hasAdditions } from '../../../web/src/lib/text-diff'

const added = (b: string, c: string) => diffAdded(b, c).filter(s => s.added).map(s => s.text)
const joined = (b: string, c: string) => diffAdded(b, c).map(s => s.text).join('')

test('HIGHLIGHT: a woven in phrase is one highlighted block, and the text itself is never altered', () => {
  const b = 'Staff will report adverse health effects to the lead.'
  const c = 'Staff will report adverse health effects to Pippa Thornley, the infection prevention and control lead.'
  assert.deepEqual(added(b, c), ['Pippa Thornley, the infection prevention and control'])
  assert.equal(joined(b, c), c)
})
test('HIGHLIGHT: a replaced name highlights the new name only, wherever it appears', () => {
  const b = 'Ishwurduth Mannick is responsible. Report to Ishwurduth Mannick.'
  const c = 'David Whitfield is responsible. Report to David Whitfield.'
  assert.deepEqual(added(b, c), ['David Whitfield', 'David Whitfield.'])
  assert.equal(joined(b, c), c)
})
test('HIGHLIGHT: unchanged wording has nothing highlighted, and editing afterwards keeps the highlight accurate', () => {
  const b = 'The manager reviews each concern.'
  assert.equal(hasAdditions(b, b), false); assert.equal(diffAdded(b, b).length, 1)
  const woven = 'The manager, Jane Smith, reviews each concern.'
  assert.deepEqual(added(b, woven), ['Jane Smith,'])
  const edited = 'The manager, Jane Smith, reviews every concern.'
  const hl = added(b, edited).join(' ')
  assert.ok(hl.includes('Jane Smith,') && hl.includes('every'))          // the admin's own edit is a change from the suggestion too (one shared word between two highlights is part of the block)
  assert.equal(added(b, 'The manager reviews every concern.').join('|'), 'every')
  assert.equal(hasAdditions(b, b + ' '), false)                          // trailing space only: nothing to highlight
})
test('HIGHLIGHT: undoing the change (back to the baseline) clears the highlight; empty text is empty; huge text is left alone', () => {
  assert.equal(hasAdditions('a b c', 'a b c'), false); assert.deepEqual(diffAdded('x', ''), [])
  const big = Array.from({ length: 1500 }, (_, i) => `w${i}`).join(' ')
  assert.deepEqual(diffAdded(big, big + ' extra'), [{ text: big + ' extra', added: false }])
})
