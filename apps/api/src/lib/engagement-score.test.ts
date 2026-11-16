// Run: npx tsx src/lib/engagement-score.test.ts
import assert from 'node:assert/strict'
import { scoreEngagement, labelFor, type EngagementFacts } from './engagement-score'

const day = 86_400_000
const now = new Date('2026-11-20T12:00:00Z')
const at = (d: number) => new Date(now.getTime() - d * day)
const base = (o: Partial<EngagementFacts> = {}): EngagementFacts => ({ signed_up_at: at(10), email_verified: false, tier: 'free', free_limit_hits: 0, upgrade_clicks: 0, ...o })

// nothing done
let e = scoreEngagement(base(), now)
assert.equal(e.score, 0); assert.equal(e.label, 'New'); assert.equal(e.days_since_signup, 10); assert.equal(e.upsell_ready, false)

// verified and signed in once, same day: 20
e = scoreEngagement(base({ email_verified: true, first_login_at: at(9), last_login_at: at(9) }), now)
assert.equal(e.score, 20); assert.equal(e.label, 'Getting started'); assert.equal(e.milestones.find((x) => x.key === 'returned')!.done, false)

// came back another day
e = scoreEngagement(base({ email_verified: true, first_login_at: at(9), last_login_at: at(2) }), now)
assert.equal(e.score, 30); assert.equal(e.milestones.find((x) => x.key === 'returned')!.done, true)

// full set = 100
const all = base({ email_verified: true, first_login_at: at(9), last_login_at: at(1), second_user_at: at(5), audit_first_started_at: at(8), audit_first_completed_at: at(7), policy_first_uploaded_at: at(6), course_first_started_at: at(4), course_first_completed_at: at(3), question_first_at: at(2), last_active_at: at(1) })
e = scoreEngagement(all, now)
assert.equal(e.score, 100); assert.equal(e.label, 'Power user'); assert.equal(e.milestones.reduce((n, x) => n + x.points, 0), 100)

// labels at the boundaries
assert.deepEqual([0, 19, 20, 49, 50, 79, 80, 100].map(labelFor), ['New', 'New', 'Getting started', 'Getting started', 'Engaged', 'Engaged', 'Power user', 'Power user'])

// upsell ready: free + signal + active in the last 14 days
e = scoreEngagement(base({ free_limit_hits: 2, last_active_at: at(3) }), now)
assert.equal(e.upsell_ready, true); assert.deepEqual(e.upsell_signals, ['Hit a free limit 2 times'])
e = scoreEngagement(base({ upgrade_clicks: 1, last_active_at: at(30) }), now)       // signal but gone quiet
assert.equal(e.upsell_ready, false); assert.deepEqual(e.upsell_signals, ['Clicked Upgrade'])
e = scoreEngagement({ ...all, tier: 'full', free_limit_hits: 5 }, now)               // paid tenants are never flagged
assert.equal(e.upsell_ready, false); assert.deepEqual(e.upsell_signals, [])
e = scoreEngagement({ ...all, last_active_at: at(1) }, now)                          // engaged free account, active
assert.equal(e.upsell_ready, true); assert.ok(e.upsell_signals.includes('Using the free plan well'))
console.log('engagement-score tests passed')
