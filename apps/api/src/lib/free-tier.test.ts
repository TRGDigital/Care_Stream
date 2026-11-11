// Free tier pure logic. Run with:  npx tsx src/lib/free-tier.test.ts
// (No database needed: only the allow list, the tier rules and the signup domain checks.)

import assert from 'node:assert/strict'
import { freeRouteAllowed } from '../middleware/freeTierGuard'
import { needsBillingFor, NO_SUBSCRIPTION_TIERS } from './tiers'
import { emailDomain, isWebmail, isDisposableDomain, freeSignupAllowed, monthKey } from './free-tier'

let n = 0
const t = (name: string, fn: () => void) => { fn(); n++; console.log('ok  ', name) }

t('free API allow list: what a free tenant may reach', () => {
  for (const p of ['/audits/templates', '/audits/runs/abc/complete', '/policies', '/policies/allowance', '/policies/bulk',
    '/analytics/gaps', '/analytics/gaps/analyse/start', '/analytics/gaps/analyse/batch', '/analytics/gaps/pipeline',
    '/analytics/gaps/REG-1/detail', '/analytics/policy-lint/scan', '/analytics/consistency/detect',
    '/analytics/wording-alignment/batch', '/users/invite', '/billing/summary', '/billing/checkout', '/me/profile',
    '/me/audit-approvals/xyz/approve', '/settings']) assert.ok(freeRouteAllowed(p), p)
})

t('free API allow list: paid features are closed', () => {
  for (const p of ['/query', '/training/modules', '/knowledge', '/onboarding/flows', '/face-to-face', '/workforce/register',
    '/cqc-questions', '/analytics', '/analytics/cqc-report', '/analytics/gaps/adopt', '/analytics/gaps/pregenerate',
    '/analytics/gaps/policy-document/p1/publish', '/analytics/gaps/policy-change/c1', '/analytics/gaps/REG-1/training-module',
    '/analytics/gaps/REG-1/onboarding', '/analytics/gaps/REG-1/saf-alignment', '/analytics/gaps/matrix',
    '/policies/intake', '/policies/p1/minor-edit', '/audits/templates/import', '/me/annual-training', '/me/tts',
    '/agent-actions', '/suggestions']) assert.ok(!freeRouteAllowed(p), p)
})

t('trailing slashes do not slip past', () => {
  assert.ok(!freeRouteAllowed('/policies/intake/'))
  assert.ok(freeRouteAllowed('/audits/'))
})

t('billing gate: free is exempt, an unsubscribed full tenant is not', () => {
  assert.ok(NO_SUBSCRIPTION_TIERS.has('free') && NO_SUBSCRIPTION_TIERS.has('training_only') && NO_SUBSCRIPTION_TIERS.has('policies_only'))
  assert.equal(needsBillingFor({ tier: 'free', subscription_status: 'active' }), false)
  assert.equal(needsBillingFor({ tier: 'full', subscription_status: 'trialling', stripe_subscription_id: null }), true)
  assert.equal(needsBillingFor({ tier: 'full', subscription_status: 'active' }), false)
  assert.equal(needsBillingFor({ tier: 'full', subscription_status: 'trialling', stripe_subscription_id: 'sub_1' }), false)
  assert.equal(needsBillingFor(null), true)
})

t('signup domains', () => {
  assert.equal(emailDomain('Jane@Sunrise-Care.CO.UK'), 'sunrise-care.co.uk')
  assert.ok(isWebmail('gmail.com') && isWebmail('btinternet.com') && !isWebmail('sunrise-care.co.uk'))
  assert.ok(isDisposableDomain('mailinator.com') && !isDisposableDomain('gmail.com'))
})

t('free signup is closed unless enabled or the preview code matches', () => {
  delete process.env.FREE_TIER_ENABLED; delete process.env.FREE_TIER_PREVIEW_CODE
  assert.equal(freeSignupAllowed('x'), false)
  process.env.FREE_TIER_PREVIEW_CODE = 'sesame'
  assert.equal(freeSignupAllowed('nope'), false)
  assert.equal(freeSignupAllowed(undefined), false)
  assert.equal(freeSignupAllowed('sesame'), true)
  process.env.FREE_TIER_ENABLED = 'true'
  assert.equal(freeSignupAllowed(undefined), true)
  delete process.env.FREE_TIER_ENABLED; delete process.env.FREE_TIER_PREVIEW_CODE
})

t('month key', () => assert.equal(monthKey(new Date(Date.UTC(2026, 10, 30))), '2026-11'))

console.log(`\n${n} groups passed`)
process.exit(0)
