import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'fs'
import { join } from 'path'
import { validateScenario } from './scenario-validate'

const load = (slug: string) => JSON.parse(readFileSync(join(__dirname, '../../../web/src/data/scenarios', `${slug}.json`), 'utf8'))

  test('accepts a published scenario page shape (only keyword and queue rules are not checked)', () => {
    const v = validateScenario(load('face-to-face-training-follow-up'))
    assert.deepEqual(v.errors.filter(e => !/word count|external|internal links/.test(e)), [])
  })
  test('rejects dashes, other html, AI wording and missing structure', () => {
    const d = load('face-to-face-training-follow-up')
    d.lede = 'It uses AI — <script>x</script>'
    d.trail = d.trail.slice(0, 5)
    const v = validateScenario(d)
    assert.match(v.errors.join('|'), /dash character/)
    assert.match(v.errors.join('|'), /html tag <script>/)
    assert.match(v.errors.join('|'), /letters AI/)
    assert.match(v.errors.join('|'), /trail must have 8 steps/)
  })
  test('enforces the queue keywords', () => {
    const d = load('face-to-face-training-follow-up')
    const v = validateScenario(d, { expected: { primary: 'something else', secondary: ['nothing here'] } })
    assert.match(v.errors.join('|'), /primary_keyword must equal/)
    assert.match(v.errors.join('|'), /keywords not used/)
  })
  test('rejects a non object', () => { assert.equal(validateScenario(null).errors.length, 1) })
