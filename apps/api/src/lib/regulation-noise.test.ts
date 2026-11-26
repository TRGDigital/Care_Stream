// Dates, page numbers, cookie wording and the legislation.gov.uk currency statement must never count as a change to a regulation.
import test from 'node:test'
import assert from 'node:assert/strict'
import { isNoiseLine, meaningfulLines, diffText } from '../services/regulations/change-review'

test('NOISE: the weekly furniture is ignored', () => {
  for (const l of [
    'Changes to legislation: Safeguarding Vulnerable Groups Act 2006 is up to date with all changes known to be in force on or before 05 October 2026.',
    'Last updated 12 November 2026', 'Updated on 3 March 2026', 'Page 3 of 12 results per page', 'We use cookies to improve this service, accept all cookies',
    'This page was last reviewed on 2026-11-23', 'Latest available (Revised): 28 September 2026',
  ]) assert.equal(isNoiseLine(l), true, l)
})

test('NOISE: real wording is kept, including an update note that says what changed', () => {
  for (const l of [
    'Providers must now notify the Commission within 24 hours of the incident taking place.',
    'Published 6 October 2022. Last updated 12 November 2026. Updated the section on notifications to include new timescales.',
  ]) assert.equal(isNoiseLine(l), false, l)
})

test('NOISE: a page where only the date moved has no change to show', () => {
  const body = 'Providers must keep records of all staff training for the period the law requires. '
  const a = body + 'Changes to legislation: this Act is up to date with all changes known to be in force on or before 28 September 2026.'
  const b = body + 'Changes to legislation: this Act is up to date with all changes known to be in force on or before 05 October 2026.'
  assert.equal(diffText(a, b).changed, false)
  assert.equal(diffText(a, b + ' A new duty to report within five days now applies to every provider.').changed, true)
  assert.deepEqual(meaningfulLines(a).length, 1)
})
