// Starter has the gap ANALYSIS (has_gap_detection); fixing, approving and publishing need has_gap_fixing (Professional and Enterprise).
import test from 'node:test'
import assert from 'node:assert/strict'
import fs from 'fs'
import path from 'path'

const src = fs.readFileSync(path.resolve(__dirname, '../routes/analytics.ts'), 'utf8').split('\n')
function gateOf(method: string, route: string): string | null {
  for (let i = 0; i < src.length; i++) {
    const m = src[i].match(/Router\.(get|post|put|patch|delete)\(\s*'([^']+)'/)
    if (m && m[1] === method && m[2] === route) for (let j = i; j < i + 10; j++) { const g = src[j].match(/checkFeature\(tenantId, '(has_[a-z_]+)'\)/); if (g) return g[1] }
  }
  return null
}

test('PLAN GATING: the analysis routes stay open to Starter (has_gap_detection)', () => {
  for (const [m, r] of [['get', '/gaps'], ['post', '/gaps/analyse/start'], ['post', '/gaps/analyse/batch'], ['post', '/gaps/analyse'], ['post', '/gaps/detect-section'], ['get', '/policy-lint'], ['post', '/policy-lint/scan'],
    ['post', '/consistency/scan/start'], ['post', '/consistency/detect'], ['get', '/consistency'], ['post', '/wording-alignment/start'], ['post', '/gaps/:reference_key/detail']]) {
    assert.equal(gateOf(m, r), 'has_gap_detection', `${m} ${r}`)
  }
})

test('PLAN GATING: adopting, approving, publishing and gap driven training need has_gap_fixing', () => {
  for (const [m, r] of [['post', '/gaps/adopt'], ['post', '/gaps/pregenerate'], ['post', '/gaps/:reference_key/saf-alignment'], ['get', '/gaps/approvals-overview'], ['post', '/gaps/policy-change/:changeId/revert'], ['patch', '/gaps/policy-change/:changeId'],
    ['post', '/gaps/policy-document/:policyId/publish'], ['post', '/gaps/policy-document/:policyId/submit'], ['post', '/gaps/policy-document/:policyId/manager-approve'], ['get', '/gaps/matrix'], ['get', '/policies/due-for-review'], ['post', '/policies/re-review'],
    ['post', '/gaps/:reference_key/training-module'], ['post', '/gaps/:reference_key/onboarding']]) {
    assert.equal(gateOf(m, r), 'has_gap_fixing', `${m} ${r}`)
  }
})

test('PLAN GATING: the SQL sets fixing from the current gap plans first, then gives Starter the analysis only', () => {
  const sql = fs.readFileSync(path.resolve(__dirname, '../../../../docs/sql/2026-11-27_plans_has_gap_fixing.sql'), 'utf8')
  assert.ok(sql.indexOf('set has_gap_fixing = true where has_gap_detection = true') < sql.indexOf("set has_gap_detection = true, has_gap_fixing = false where name = 'Starter'"))
})
