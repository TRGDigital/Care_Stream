// Free tier against a REAL Postgres (never production). Run with:
//   createdb cs_test && psql cs_test -c 'create sequence tenant_account_seq start 1001'
//   DATABASE_URL=postgresql://localhost/cs_test DATABASE_DIRECT_URL=$DATABASE_URL npx prisma db push --skip-generate
//   (then run prisma/sql/2026-11-12_free_tier.sql so the Free plan exists)
//   DATABASE_URL=postgresql://localhost/cs_test npx tsx src/lib/free-tier.integration.test.ts
// Covers the atomic policy allowance (8 parallel uploads, limit 5), refunds, the AI budget, the
// re-run rule, downgrade and upgrade.
process.env.FREE_TIER_ENABLED = 'true'
import assert from 'node:assert/strict'
import { prisma } from '../db/client'
import * as F from '../lib/free-tier'
import { assertFreeRerun } from '../services/analytics/free-gates'

const p: any = prisma
async function mk(name: string, free: boolean) {
  const freePlan = await p.plan.findUnique({ where: { name: 'Free' } })
  const t = await p.tenant.create({ data: { name, slug: name, email_domain: name, tier: free ? 'free' : 'full', plan_id: free ? freePlan.id : null,
    subscription_status: 'active', ...(free ? { policies_lifetime_limit: 5, free_since: new Date() } : {}) } })
  const u = await p.user.create({ data: { tenant_id: t.id, email: `${name}@x.test`, name, role: 'admin', password_hash: 'x' } })
  return { t, u }
}
;(async () => {
  const { t, u } = await mk('freeco', true)
  // 1. race: 8 parallel distinct files, limit 5
  const res = await Promise.allSettled(Array.from({ length: 8 }, (_, i) => F.claimPolicySlot(t.id, { contentHash: 'h' + i, name: 'p' + i })))
  const okN = res.filter(r => r.status === 'fulfilled' && (r as any).value.counted).length
  const bad = res.filter(r => r.status === 'rejected')
  assert.equal(okN, 5); assert.equal(bad.length, 3)
  assert.ok(bad.every((r: any) => r.reason instanceof F.FreePolicyLimitError && r.reason.code === 'FREE_POLICY_LIMIT_REACHED'))
  let a = await F.getPolicyAllowance(t.id); assert.deepEqual([a.used, a.limit, a.remaining], [5, 5, 0])
  const led = await p.policyCreationLedger.count({ where: { tenant_id: t.id } }); assert.equal(led, 5)   // rejected ones rolled back
  console.log('ok race: exactly 5 of 8 admitted, ledger 5')
  // 2. same file again: not counted, no error, even at the limit
  const first = (await p.policyCreationLedger.findFirst({ where: { tenant_id: t.id }, orderBy: { created_at: 'asc' } })).content_hash
  assert.deepEqual(await F.claimPolicySlot(t.id, { contentHash: first }), { counted: false })
  // 3. delete never refunds an active/archived policy; processing/failed refunds
  await F.releasePolicySlot(t.id, { id: 'x', status: 'active', content_hash: first })
  await F.releasePolicySlot(t.id, { id: 'x', status: 'archived', content_hash: first })
  a = await F.getPolicyAllowance(t.id); assert.equal(a.used, 5)
  await F.releasePolicySlot(t.id, { id: 'x', status: 'failed', content_hash: first })
  a = await F.getPolicyAllowance(t.id); assert.equal(a.used, 4)
  assert.deepEqual(await F.claimPolicySlot(t.id, { contentHash: first }), { counted: true })   // same file can be uploaded again
  console.log('ok identical file free, refund only for never-usable')
  // 4. paid tenant untouched
  const paid = await mk('paidco', false)
  assert.deepEqual(await F.claimPolicySlot(paid.t.id, { contentHash: 'z' }), { counted: false })
  assert.equal(await p.policyCreationLedger.count({ where: { tenant_id: paid.t.id } }), 0)
  console.log('ok paid tenant: no ledger, no counter')
  // 5. counters
  const takes = await Promise.all(Array.from({ length: 6 }, () => F.counterTake(t.id, 'gap_detail_taster', 3)))
  assert.equal(takes.filter(Boolean).length, 3)
  console.log('ok counter cap 3 under concurrency')
  // 6. AI budget
  await F.checkFreeAiBudget(t.id)
  await p.aiUsageEvent.create({ data: { tenant_id: t.id, model: 'm', cost_usd: 10.5, feature: 'x' } })
  await assert.rejects(() => F.checkFreeAiBudget(t.id), (e: any) => e.code === 'FREE_AI_BUDGET_REACHED')
  await F.checkFreeAiBudget(paid.t.id)  // paid: no throw
  console.log('ok $10 budget stops free, not paid')
  // 7. rerun rule
  const f2 = await mk('freeco2', true)
  await assertFreeRerun(f2.t.id, 'wording')                                  // never ran: allowed
  await p.gapsSectionRun.create({ data: { tenant_id: f2.t.id, section: 'wording', ran_at: new Date(Date.now() - 86400000) } })
  await assertFreeRerun(f2.t.id, 'wording')                                  // nothing changed: the one forced run this month
  await assert.rejects(() => assertFreeRerun(f2.t.id, 'wording'), (e: any) => e.code === 'FREE_NOTHING_CHANGED')
  await p.policy.create({ data: { tenant_id: f2.t.id, name: 'n', filename: 'f', s3_key: 'k', status: 'active', uploaded_by: f2.u.id } })
  await assertFreeRerun(f2.t.id, 'wording')                                  // policy added since: allowed
  await assertFreeRerun(paid.t.id, 'wording')                                // paid: no rule
  console.log('ok re-run rule')
  // 8. downgrade: paid tenant with 8 policies cancels
  for (let i = 0; i < 8; i++) await p.policy.create({ data: { tenant_id: paid.t.id, name: 'n' + i, filename: 'f', s3_key: 'k' + i, status: i === 7 ? 'archived' : 'active', uploaded_by: paid.u.id } })
  assert.equal(await F.downgradeToFree(paid.t.id), true)
  const d = await p.tenant.findUnique({ where: { id: paid.t.id } })
  assert.deepEqual([d.tier, d.policies_lifetime_limit, d.policies_created_lifetime, d.subscription_status], ['free', 5, 7, 'active'])
  assert.equal(await p.policy.count({ where: { tenant_id: paid.t.id } }), 8)                // nothing deleted
  await assert.rejects(() => F.claimPolicySlot(paid.t.id, { contentHash: 'new' }), (e: any) => e.code === 'FREE_POLICY_LIMIT_REACHED')
  console.log('ok downgrade keeps all 8 policies, cannot add more')
  // 9. upgrade lifts limits and swaps drip
  await F.liftFreeLimits(paid.t.id)
  const up = await p.tenant.findUnique({ where: { id: paid.t.id } })
  assert.deepEqual([up.tier, up.policies_lifetime_limit], ['full', null])
  assert.deepEqual(await F.claimPolicySlot(paid.t.id, { contentHash: 'new' }), { counted: false })
  console.log('ok upgrade lifts limits')
  // 11. funnel events: real free tenants write them, test tenants never do
  const { freeEvent } = await import('./free-events')
  const real = await mk('realfree', true)
  const test = await p.tenant.create({ data: { name: 'TEST x', slug: 'testx', email_domain: 'testx', tier: 'free', subscription_status: 'active', feature_flags: { is_test: true } } })
  await freeEvent(real.t.id, 'free_signup', { domain_class: 'webmail' }); await freeEvent(test.id, 'free_signup', {})
  await F.claimPolicySlot(real.t.id, { contentHash: 'ev1' })
  await new Promise(r => setTimeout(r, 400))
  assert.equal(await p.auditLog.count({ where: { tenant_id: real.t.id, event_type: { startsWith: 'free_' } } }), 2)   // signup + slot claimed
  assert.equal(await p.auditLog.count({ where: { tenant_id: test.id } }), 0)
  console.log('ok free events written for real tenants, never for test tenants')
  // 10. signup checks and test tenants
  const dom = 'orreryx.test'
  await mk('first', true)                       // creates first@x.test (not on the domain), so make a domain admin:
  const t0 = await p.tenant.create({ data: { name: 'dom', slug: 'domco', email_domain: 'domco', tier: 'free', subscription_status: 'active', feature_flags: { is_test: true } } })
  await p.user.create({ data: { tenant_id: t0.id, email: `a@${dom}`, name: 'a', role: 'admin', password_hash: 'x' } })
  const blocked = await F.checkFreeSignup(`b@${dom}`, '1.1.1.1')
  assert.equal((blocked as any).code, 'DOMAIN_HAS_FREE_ACCOUNT')
  assert.equal((await F.checkFreeSignup(`b@${dom}`, '1.1.1.1', null, { preview: true })).ok, true)     // test signup skips the domain rule
  assert.equal((await F.checkFreeSignup('x@mailinator.com', '1.1.1.1', null, { preview: true }) as any).code, 'DISPOSABLE_EMAIL')   // still blocks disposable
  assert.equal((await F.checkFreeSignup(`c@${dom}`, '1.1.1.1', 'spam', { preview: true }) as any).code, 'SIGNUP_REJECTED')            // still honeypot
  for (let i = 0; i < 5; i++) assert.equal((await F.checkFreeSignup(`p${i}@${dom}`, '2.2.2.2', null, { preview: true })).ok, true)      // no IP limit for tests
  await assert.rejects(() => F.retireTestTenant(paid.t.id), /Not a test tenant/)
  const r = await F.retireTestTenant(t0.id)
  assert.equal(r.users, 1)
  const closed = await p.tenant.findUnique({ where: { id: t0.id } })
  assert.ok(closed.name.startsWith('CLOSED ') && closed.closure_requested_at && closed.subscription_status === 'cancelled')
  assert.equal(await p.user.count({ where: { email: `a@${dom}` } }), 0)       // address freed for a new signup
  assert.equal((await p.user.findFirst({ where: { tenant_id: t0.id } })).is_active, false)
  console.log('ok test signups repeatable, disposable and honeypot still blocked, retire frees addresses')
  process.exit(0)
})().catch(e => { console.error('FAIL', e); process.exit(1) })
