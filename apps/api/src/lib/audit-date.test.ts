import test from 'node:test'
import assert from 'node:assert/strict'
import { parseAuditDate, periodFor } from './audit-date'

const now = new Date('2026-11-19T12:00:00Z')
test('audit date: today and earlier are fine, future and nonsense are not', () => {
  assert.ok('date' in parseAuditDate('2026-11-19', now))
  assert.ok('date' in parseAuditDate('2026-10-02', now))
  assert.equal((parseAuditDate('2026-11-20', now) as any).code, 'FUTURE_DATE')
  assert.equal((parseAuditDate('2026-02-31', now) as any).code, 'BAD_DATE')
  assert.equal((parseAuditDate('19/11/2026', now) as any).code, 'BAD_DATE')
  assert.equal((parseAuditDate(null, now) as any).code, 'BAD_DATE')
})
test('audit date: up to two years back, not beyond', () => {
  assert.ok('date' in parseAuditDate('2024-11-20', now))
  assert.equal((parseAuditDate('2024-11-01', now) as any).code, 'DATE_TOO_OLD')
})
test('audit date: the period is the month, or the day for daily audits', () => {
  const d = new Date(Date.UTC(2026, 9, 14))
  assert.equal(periodFor('monthly', d).getUTCDate(), 1)
  assert.equal(periodFor('quarterly', d).getUTCMonth(), 9)
  assert.equal(periodFor('daily', d).getUTCDate(), 14)
})
