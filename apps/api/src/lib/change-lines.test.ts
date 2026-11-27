// A recorded change is shown as clean sentences: HTML codes decoded, cookie banners and date stamps dropped, and a rebuilt page flagged.
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'
import { decodeEntities, diffLines } from '../services/regulations/change-review'

test('LINES: HTML codes become characters and the cookie banner is dropped, the policy wording is kept', () => {
  const stored = [
    'NHS England &raquo; Confidentiality policy Skip to main content Cookies on the NHS England website We\'ve put some small files called cookies on your device to make our site work.',
    'We\'d also like to use analytics cookies.',
    'Date published : 24 February, 2026 Date last updated : 24 February, 2026',
    'It is critical that NHS England protects and respects all confidential information for which it is responsible.&nbsp; That duty is reflected in our contracts.',
  ].join('\n')
  const lines = diffLines(stored)
  assert.equal(lines.length, 1)
  assert.match(lines[0], /^It is critical that NHS England protects/)
  assert.doesNotMatch(lines[0], /&nbsp;|&raquo;/)
  assert.equal(decodeEntities('Health an d &amp; care &rsquo;s &#8217;'), 'Health an d & care ’s ’')
})

test('LINES: the changes list and the page use clean lines, a short list with Show all, and the Explain this change button', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const admin = read('../routes/admin.ts'), page = read('../../../web/src/app/(platform)/platform/regulation-changes/page.tsx')
  assert.match(admin, /added_lines, removed_lines, whole_page: added_lines\.length >= 25 && removed_lines\.length <= 2/)
  assert.match(admin, /adminRouter\.post\('\/regulations\/changes\/:id\/review'/)
  assert.match(page, /Explain this change/)
  assert.match(page, /lines\.slice\(0, 6\)/)
  assert.match(page, /The whole page shows as new/)
})

test('RELEVANCE: each sentence is judged, kept apart from the rest, and nothing relevant means cosmetic', () => {
  const read = (f: string) => fs.readFileSync(path.resolve(__dirname, f), 'utf8')
  const svc = read('../services/regulations/change-review.ts'), page = read('../../../web/src/app/(platform)/platform/regulation-changes/page.tsx'), admin = read('../routes/admin.ts')
  assert.match(svc, /LINE_RELEVANCE_RULES/)
  assert.match(svc, /A\$\{i \+ 1\}\./)
  assert.match(svc, /relevant_added\.length === 0 && relevant_removed\.length === 0\) \{ severity = 'cosmetic'; affects = false/)
  assert.match(svc, /return base \+ LINE_RELEVANCE_RULES/)
  assert.match(admin, /line_review: true/)
  assert.match(page, /Nothing here is relevant to policies/)
  assert.match(page, /Not relevant \(/)
  assert.match(page, /Check what matters/)
})
