// A simple, explainable activation score for a client account: which of the steps that matter have they actually done?
// Pure (no database), so the rules are tested. The facts come from lib/engagement.ts, which reads what is already recorded.
//
//   Verified their email      10     Started an audit          10     Started a course        5
//   Signed in                 10     Completed an audit        15     Completed a course     10
//   Came back another day     10     Uploaded a policy         15     Invited a colleague    10
//   Asked a question (AI)      5                                                       total  100
//
// 0 to 19 New, 20 to 49 Getting started, 50 to 79 Engaged, 80 and over Power user.

export type EngagementFacts = {
  signed_up_at: Date
  email_verified_at?: Date | null            // when we know they verified (any admin verified, dated by their first login)
  email_verified: boolean
  first_login_at?: Date | null
  last_login_at?: Date | null
  second_user_at?: Date | null               // when a second person was added to the account
  audit_first_started_at?: Date | null
  audit_first_completed_at?: Date | null
  policy_first_uploaded_at?: Date | null
  course_first_started_at?: Date | null
  course_first_completed_at?: Date | null
  question_first_at?: Date | null
  /** latest evidence of a person doing something (any of the above, plus later activity), see loadEngagement */
  last_active_at?: Date | null
  tier: string
  free_limit_hits: number
  upgrade_clicks: number
}

export type Milestone = { key: string; label: string; points: number; done: boolean; at: string | null }
export type Engagement = {
  score: number
  label: 'New' | 'Getting started' | 'Engaged' | 'Power user'
  last_active_at: string | null
  days_since_signup: number
  milestones: Milestone[]
  upsell_ready: boolean
  upsell_signals: string[]
}

const iso = (d?: Date | null) => (d ? d.toISOString() : null)
export const labelFor = (score: number): Engagement['label'] => (score >= 80 ? 'Power user' : score >= 50 ? 'Engaged' : score >= 20 ? 'Getting started' : 'New')

export function scoreEngagement(f: EngagementFacts, now: Date = new Date()): Engagement {
  const returned = !!(f.first_login_at && f.last_login_at && f.last_login_at.getTime() - f.first_login_at.getTime() >= 24 * 3600_000)
  const m = (key: string, label: string, points: number, done: boolean, at?: Date | null): Milestone => ({ key, label, points, done, at: done ? iso(at) : null })
  const milestones: Milestone[] = [
    m('verified', 'Verified their email', 10, f.email_verified, f.email_verified_at ?? f.first_login_at),
    m('signed_in', 'Signed in', 10, !!f.first_login_at, f.first_login_at),
    m('returned', 'Came back on another day', 10, returned, f.last_login_at),
    m('audit_started', 'Started an audit', 10, !!f.audit_first_started_at, f.audit_first_started_at),
    m('audit_completed', 'Completed an audit', 15, !!f.audit_first_completed_at, f.audit_first_completed_at),
    m('policy', 'Uploaded a policy', 15, !!f.policy_first_uploaded_at, f.policy_first_uploaded_at),
    m('question', 'Asked a question (AI)', 5, !!f.question_first_at, f.question_first_at),
    m('course_started', 'Started a course', 5, !!f.course_first_started_at, f.course_first_started_at),
    m('course_completed', 'Completed a course', 10, !!f.course_first_completed_at, f.course_first_completed_at),
    m('team', 'Invited a colleague', 10, !!f.second_user_at, f.second_user_at),
  ]
  const score = milestones.reduce((n, x) => n + (x.done ? x.points : 0), 0)
  const days = Math.max(0, Math.floor((now.getTime() - f.signed_up_at.getTime()) / 86_400_000))
  const activeRecently = !!f.last_active_at && now.getTime() - f.last_active_at.getTime() <= 14 * 86_400_000
  // Ready for an upsell email: a FREE account that is clearly using it (or has bumped into the limits / looked at upgrading) and is still active.
  const signals: string[] = []
  if (f.tier === 'free') {
    if (score >= 50) signals.push('Using the free plan well')
    if (f.free_limit_hits > 0) signals.push(`Hit a free limit ${f.free_limit_hits === 1 ? 'once' : `${f.free_limit_hits} times`}`)
    if (f.upgrade_clicks > 0) signals.push(`Clicked Upgrade${f.upgrade_clicks > 1 ? ` ${f.upgrade_clicks} times` : ''}`)
  }
  return { score, label: labelFor(score), last_active_at: iso(f.last_active_at), days_since_signup: days, milestones, upsell_ready: f.tier === 'free' && signals.length > 0 && activeRecently, upsell_signals: signals }
}
