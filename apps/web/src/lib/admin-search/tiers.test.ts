import test from 'node:test'
import assert from 'node:assert/strict'
import { FEATURES } from './features'
import { lockFor, visibleTo, type PlanFlags, type AccountKind } from './access'

// The plan flags as they are in the plans table (checked 19 Nov 2026).
const FREE: PlanFlags = { has_gap_detection: true }
const STARTER: PlanFlags = {}
const PRO: PlanFlags = { has_advanced_analytics: true, has_cqc_report: true, has_gap_detection: true, has_face_to_face: true }
const ENT: PlanFlags = { ...PRO, has_custom_audits: true, has_effectiveness: true, has_training_impact: true, has_workforce_compliance: true }

const accounts: Record<string, { a: AccountKind; f: PlanFlags }> = {
  free: { a: { freeTier: true }, f: FREE },
  policies_only: { a: { policiesOnly: true }, f: {} },
  training_only: { a: { trainingOnly: true }, f: {} },
  starter: { a: {}, f: STARTER },
  professional: { a: {}, f: PRO },
  enterprise: { a: {}, f: ENT },
}
const lock = (acct: string, id: string) => { const e = FEATURES.find(x => x.id === id)!; const { a, f } = accounts[acct]; return lockFor(e.href, e.requires, a, f) }
const kind = (acct: string, id: string) => lock(acct, id)?.kind ?? 'open'
const plan = (acct: string, id: string) => { const l = lock(acct, id); return l && l.kind === 'plan' ? l.plan : null }

test('an Enterprise account can open everything it can see', () => {
  for (const e of FEATURES) assert.equal(lockFor(e.href, e.requires, accounts.enterprise.a, ENT), null, e.id)
})
test('Free: audits, policies, staff and gap analysis open; the paid parts show the upgrade panel', () => {
  for (const id of ['audits', 'policies', 'staff', 'gaps', 'cpd', 'billing', 'settings', 'do-add-staff', 'do-upload-policy']) assert.equal(kind('free', id), 'open', id)
  for (const id of ['incentives', 'workforce', 'supervisions', 'analytics', 'cqc-report', 'knowledge', 'onboarding', 'residents', 'queries', 'do-new-incentive']) assert.equal(kind('free', id), 'tier', id)
  assert.equal(plan('free', 'face-to-face'), 'Professional')   // the Training page is open to Free, face to face inside it is not
})
test('Starter: no paid extras, and each says which plan includes it', () => {
  assert.equal(plan('starter', 'incentives'), 'Professional')
  assert.equal(plan('starter', 'residents'), 'Professional')
  assert.equal(plan('starter', 'cqc-report'), 'Professional')
  assert.equal(plan('starter', 'analytics'), 'Professional')
  assert.equal(plan('starter', 'face-to-face'), 'Professional')
  assert.equal(plan('starter', 'do-new-f2f'), 'Professional')
  assert.equal(plan('starter', 'custom-audits'), 'Enterprise')
  assert.equal(plan('starter', 'supervisions'), 'Enterprise')
  for (const id of ['audits', 'policies', 'staff', 'knowledge', 'onboarding', 'training', 'cpd', 'do-add-staff']) assert.equal(kind('starter', id), 'open', id)
})
test('Professional: has incentives, residents, CQC reports and face to face; not the Enterprise parts', () => {
  for (const id of ['incentives', 'residents', 'cqc-report', 'analytics', 'face-to-face', 'do-new-f2f', 'do-new-incentive']) assert.equal(kind('professional', id), 'open', id)
  for (const id of ['supervisions', 'workforce', 'custom-audits', 'training-impact', 'do-build-audit']) assert.equal(plan('professional', id), 'Enterprise', id)
})
test('Training only and policies only accounts see only their own parts', () => {
  assert.equal(kind('training_only', 'training'), 'open')
  assert.equal(kind('training_only', 'staff'), 'open')
  assert.equal(kind('training_only', 'audits'), 'tier')
  assert.equal(kind('training_only', 'policies'), 'tier')
  assert.equal(kind('training_only', 'cpd'), 'tier')   // CPD is for full and free accounts; shop buyers use licences
  assert.equal(kind('policies_only', 'policies'), 'open')
  assert.equal(kind('policies_only', 'billing'), 'open')
  assert.equal(kind('policies_only', 'training'), 'tier')
  assert.equal(kind('policies_only', 'staff'), 'tier')
})
test('Benchmarking is only for multi site accounts and Licences only for training only accounts', () => {
  assert.equal(visibleTo('multisite', { multiSite: true }), true)
  assert.equal(visibleTo('multisite', {}), false)
  assert.equal(visibleTo('training_only', { trainingOnly: true }), true)
  assert.equal(visibleTo('training_only', { freeTier: true }), false)
  assert.equal(visibleTo(undefined, {}), true)
  assert.equal(FEATURES.find(f => f.id === 'benchmarking')!.only, 'multisite')
  assert.equal(FEATURES.find(f => f.id === 'licences')!.only, 'training_only')
})
test('never lock on a guess while the plan is still loading', () => {
  const e = FEATURES.find(x => x.id === 'supervisions')!
  assert.equal(lockFor(e.href, e.requires, {}, null), null)
})
test('every entry that needs a plan feature names the plan that first has it', () => {
  const firstPlan: Record<string, string> = { has_advanced_analytics: 'Professional', has_cqc_report: 'Professional', has_gap_detection: 'Professional', has_face_to_face: 'Professional', has_custom_audits: 'Enterprise', has_effectiveness: 'Enterprise', has_training_impact: 'Enterprise', has_workforce_compliance: 'Enterprise' }
  for (const e of FEATURES) if (e.requires) assert.equal(e.requires.plan, firstPlan[e.requires.feature], `${e.id}: ${e.requires.feature} first appears in ${firstPlan[e.requires.feature]}`)
})
