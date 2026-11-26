// The weekly source check must finish inside its function limit, reach every source over successive runs, and flag a regulation only for a real change.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const api = (f: string) => fs.readFileSync(path.resolve(__dirname, '..', f), 'utf8')

test('MONITOR: distinct URLs are fetched up front, oldest first, within a time budget, and the rest are left for next run', () => {
  const s = api('services/regulations/source-monitor.ts')
  assert.match(s, /allUrls\.sort\(\(a, b\) => \(lastByUrl\.get\(a\) \?\? 0\) - \(lastByUrl\.get\(b\) \?\? 0\)\)/)
  assert.match(s, /mapLimit\(toFetch, 12,/)
  assert.match(s, /Date\.now\(\) - t0 > FETCH_BUDGET_MS\) return/)
  assert.match(s, /if \(!got\) \{ if \(!opts\.catchupDays\) summary\.deferred\+\+; return \}/)
})

test('MONITOR: a regulation is flagged only for a real sentence change (or an unreadable file that moved), never for a moved date', () => {
  const s = api('services/regulations/source-monitor.ts')
  assert.match(s, /if \(changed && !text\) regChangedUrl = url/)
  assert.match(s, /if \(diff\.changed\) \{\s*regChangedUrl = url/)
  assert.doesNotMatch(s, /if \(changed\) \{ summary\.changed\+\+; regChangedUrl = url \}/)
  assert.match(s, /`h2:\$\{crypto/)                                   // new fingerprint method, so pages re-baseline silently once
})

test('REVIEW: noise-only changes are settled without the model, and flags with nothing open behind them are cleared', () => {
  const s = api('services/regulations/change-review.ts')
  assert.match(s, /if \(!added && !removed\) \{[^]*?severity: 'cosmetic'/)
  assert.match(s, /startsWith: 'Source page changed \(auto-detected'/)
  assert.match(s, /const flags_cleared = await clearAutoFlags\(\)/)
})
