import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { GENERAL_LINES, linesFor, nextLine } from '../../../web/src/lib/thinking-lines'
import { AGENTS } from '../services/ask/agents'

test('THINKING LINES: plenty to rotate, short, British, no dashes, and every agent has its own and the general ones', () => {
  assert.ok(GENERAL_LINES.length >= 20)
  for (const a of AGENTS) {
    const lines = linesFor(a.id)
    assert.ok(lines.length >= GENERAL_LINES.length, a.id)
    for (const l of lines) { assert.ok(l.length > 3 && l.length <= 45, l); assert.doesNotMatch(l, /[–—‒-]|\.\.\.|!/, l) }
    assert.equal(new Set(lines).size, lines.length, `no repeats for ${a.id}`)
  }
  assert.ok(linesFor('newsletter').includes('Laying out the page')); assert.ok(linesFor('letters').includes('Drafting your letter')); assert.ok(linesFor('pay').includes('Crunching the numbers'))
  assert.ok(!linesFor('newsletter').includes('Crunching the numbers'))   // a draft is never "working out from your records"
})

test('THINKING LINES: never the same line twice in a row, and a new wait does not start on the last line', () => {
  const pool = linesFor('staff')
  let last: string | null = null
  for (let i = 0; i < 300; i++) { const l = nextLine(pool, last); assert.notEqual(l, last); last = l }
  assert.equal(nextLine(['only'], 'only'), 'only')   // a pool of one still answers
  const seen = new Set<string>(); for (let i = 0; i < 200; i++) seen.add(nextLine(pool, null))
  assert.ok(seen.size > 8, 'the choice varies')
})

test('THINKING LINES: the panel uses the rotating line, the old fixed sentence is gone, and screen readers hear one steady status', () => {
  const web = (f: string) => fs.readFileSync(path.resolve(__dirname, '../../../web/src', f), 'utf8')
  assert.match(web('components/ask/ask-overlay.tsx'), /<ThinkingLine agentId=\{agent\?\.id\} \/>/)
  assert.doesNotMatch(web('components/ask/ask-overlay.tsx'), /Working it out from your records<\/p>/)
  const t = web('components/ask/thinking-line.tsx')
  assert.match(t, /Working on your request/); assert.match(t, /aria-hidden="true">\{line\}/)
})
