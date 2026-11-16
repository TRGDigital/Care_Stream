// Weekly training reminders: the rules, with no database and no email, so they can be tested.
//
// Every Monday morning:
//   - each staff member with training still to do gets ONE email listing what is outstanding, with a button into the hub;
//   - each account administrator gets ONE digest: how the team is getting on, who has never signed in, who has gone quiet;
//   - an admin who is also on the team gets no separate staff email (their own outstanding training is in the digest);
//   - an account with a single user (an admin on their own, or a private learner) gets the personal reminder and no digest;
//   - after STALLED_AFTER_WEEKS reminders with no activity at all, we stop emailing that person and tell the admin instead.
// The database side (who, what is outstanding, what was sent) is in weeklyReminders.ts.

export const STALLED_AFTER_WEEKS = 6
export const MAX_LISTED = 6

export type OutstandingItem = {
  module_name: string
  category: string                 // 'statutory' | 'specialist'
  source: string                   // 'ai_generated' = annual training, anything else = ordinary training
  status: string                   // 'not_started' | 'in_progress'
  due_date: Date | null
}

export type UserFacts = {
  id: string; name: string; email: string | null; role: string
  is_active: boolean; is_reviewer: boolean; is_agency: boolean; agency_end: Date | null
  first_login_at: Date | null; last_login_at: Date | null
  items: OutstandingItem[]          // not complete and not expired
  assigned_total: number; completed_total: number; completed_7d: number
  last_completed_at: Date | null
  sent_weekly: Date[]               // when earlier weekly staff reminders were sent to this person
}

export type TenantFacts = { id: string; name: string; reminders_enabled: boolean; users: UserFacts[] }

export type ListedItem = { module_name: string; category: string; due: Date | null; overdue: boolean; in_progress: boolean }
export type HubLinks = { annual?: { url: string; count: number }; training?: { url: string; count: number } }

export type StaffPlan = {
  kind: 'staff_weekly'
  user_id: string; to: string; first_name: string; org_name: string
  outstanding: number; overdue: number; assigned_total: number; completed_total: number; completed_this_week: number
  listed: ListedItem[]; more: number; links: HubLinks; never_signed_in: boolean
}
export type DigestPlan = {
  kind: 'admin_digest'
  user_id: string; to: string; first_name: string; org_name: string
  summary: { team_size: number; with_outstanding: number; outstanding_total: number; overdue_total: number; completed_7d: number }
  never_signed_in: Array<{ name: string; email: string | null; outstanding: number }>
  stalled: Array<{ name: string; weeks: number; outstanding: number }>
  top: Array<{ name: string; outstanding: number; overdue: number; last_active: Date | null }>
  own: StaffPlan | null
}
export type TenantPlan = { staff: StaffPlan[]; digests: DigestPlan[]; skipped: Array<{ user_id: string; reason: string }> }

/** The Monday (Europe/London) that starts the week `now` falls in, as YYYY-MM-DD. One send per person per kind per week. */
export function londonWeekStart(now: Date): string {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', weekday: 'short' }).formatToParts(now)
  const get = (t: string) => parts.find((p) => p.type === t)!.value
  const dow = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(get('weekday'))
  const d = new Date(Date.UTC(Number(get('year')), Number(get('month')) - 1, Number(get('day'))))
  d.setUTCDate(d.getUTCDate() - dow)
  return d.toISOString().slice(0, 10)
}

const isOverdue = (i: OutstandingItem, now: Date) => !!i.due_date && i.due_date.getTime() < now.getTime()

/** Most urgent first: overdue, then soonest due, then started before not started, then statutory before specialist, then by name. */
export function rankOutstanding(items: OutstandingItem[], now: Date): OutstandingItem[] {
  const due = (i: OutstandingItem) => (i.due_date ? i.due_date.getTime() : Number.POSITIVE_INFINITY)
  return [...items].sort((a, b) => {
    const oa = isOverdue(a, now) ? 0 : 1, ob = isOverdue(b, now) ? 0 : 1
    if (oa !== ob) return oa - ob
    if (due(a) !== due(b)) return due(a) - due(b)
    const sa = a.status === 'in_progress' ? 0 : 1, sb = b.status === 'in_progress' ? 0 : 1
    if (sa !== sb) return sa - sb
    const ca = a.category === 'statutory' ? 0 : 1, cb = b.category === 'statutory' ? 0 : 1
    if (ca !== cb) return ca - cb
    return a.module_name.localeCompare(b.module_name)
  })
}

/** Annual training and ordinary training live in different parts of the hub, so each outstanding group gets its own link. */
export function hubLinks(items: OutstandingItem[], base: string): HubLinks {
  const root = base.replace(/\/$/, '')
  const annual = items.filter((i) => i.source === 'ai_generated').length
  const training = items.length - annual
  return {
    ...(annual ? { annual: { url: `${root}/chat?view=annual`, count: annual } } : {}),
    ...(training ? { training: { url: `${root}/chat?view=training`, count: training } } : {}),
  }
}

/** When this person last did anything we can see: signed in, or completed a course. */
export function lastActivity(u: Pick<UserFacts, 'last_login_at' | 'last_completed_at'>): Date | null {
  const t = [u.last_login_at, u.last_completed_at].filter(Boolean).map((d) => (d as Date).getTime())
  return t.length ? new Date(Math.max(...t)) : null
}

/** How many weekly reminders have gone to this person since they last did anything. Reaching STALLED_AFTER_WEEKS pauses the emails. */
export function weeksWithoutActivity(u: Pick<UserFacts, 'last_login_at' | 'last_completed_at' | 'sent_weekly'>): number {
  const since = lastActivity(u)
  return u.sent_weekly.filter((d) => !since || d.getTime() > since.getTime()).length
}

const firstName = (name: string) => (String(name ?? '').trim().split(/\s+/)[0] || 'there')

function staffPlanFor(t: TenantFacts, u: UserFacts, base: string, now: Date): StaffPlan {
  const ranked = rankOutstanding(u.items, now)
  const listed = ranked.slice(0, MAX_LISTED).map((i) => ({ module_name: i.module_name, category: i.category, due: i.due_date, overdue: isOverdue(i, now), in_progress: i.status === 'in_progress' }))
  return {
    kind: 'staff_weekly', user_id: u.id, to: u.email as string, first_name: firstName(u.name), org_name: t.name,
    outstanding: u.items.length, overdue: u.items.filter((i) => isOverdue(i, now)).length,
    assigned_total: u.assigned_total, completed_total: u.completed_total, completed_this_week: u.completed_7d,
    listed, more: Math.max(0, ranked.length - listed.length), links: hubLinks(u.items, base), never_signed_in: !u.first_login_at,
  }
}

const eligible = (u: UserFacts, now: Date) =>
  u.is_active && !!u.email && !u.is_reviewer && !(u.is_agency && u.agency_end && u.agency_end.getTime() < now.getTime())

/** Decide, for one account, which emails go out this week. */
export function planTenant(t: TenantFacts, base: string, now: Date): TenantPlan {
  const plan: TenantPlan = { staff: [], digests: [], skipped: [] }
  if (!t.reminders_enabled) { for (const u of t.users) plan.skipped.push({ user_id: u.id, reason: 'reminders switched off for this account' }); return plan }
  const team = t.users.filter((u) => eligible(u, now))
  for (const u of t.users) if (!team.includes(u)) plan.skipped.push({ user_id: u.id, reason: !u.is_active ? 'deactivated' : u.is_reviewer ? 'reviewer account' : !u.email ? 'no email address' : 'agency access ended' })

  const admins = team.filter((u) => u.role === 'admin')
  const staff = team.filter((u) => u.role !== 'admin')
  const soloAdmin = team.length === 1 && admins.length === 1       // an admin on their own, or a private learner: a personal reminder, no digest

  const stalledWeeks = new Map<string, number>()
  const emailable = (u: UserFacts) => { const w = weeksWithoutActivity(u); if (w >= STALLED_AFTER_WEEKS) { stalledWeeks.set(u.id, w); return false } return true }

  for (const u of staff) {
    if (!u.items.length) { plan.skipped.push({ user_id: u.id, reason: 'nothing outstanding' }); continue }
    if (!emailable(u)) { plan.skipped.push({ user_id: u.id, reason: `paused after ${stalledWeeks.get(u.id)} weeks without activity` }); continue }
    plan.staff.push(staffPlanFor(t, u, base, now))
  }

  if (soloAdmin) {
    const a = admins[0]
    if (!a.items.length) plan.skipped.push({ user_id: a.id, reason: 'nothing outstanding' })
    else if (!emailable(a)) plan.skipped.push({ user_id: a.id, reason: `paused after ${stalledWeeks.get(a.id)} weeks without activity` })
    else plan.staff.push(staffPlanFor(t, a, base, now))
    return plan
  }

  // The digest: how the team is getting on. Only sent when there is something to say.
  const withOut = staff.filter((u) => u.items.length)
  const neverIn = withOut.filter((u) => !u.first_login_at).map((u) => ({ name: u.name, email: u.email, outstanding: u.items.length }))
  const stalled = withOut.filter((u) => stalledWeeks.has(u.id)).map((u) => ({ name: u.name, weeks: stalledWeeks.get(u.id)!, outstanding: u.items.length }))
  const outstandingTotal = withOut.reduce((n, u) => n + u.items.length, 0)
  const overdueTotal = withOut.reduce((n, u) => n + u.items.filter((i) => isOverdue(i, now)).length, 0)
  const top = [...withOut]
    .sort((a, b) => b.items.filter((i) => isOverdue(i, now)).length - a.items.filter((i) => isOverdue(i, now)).length || b.items.length - a.items.length)
    .slice(0, 8)
    .map((u) => ({ name: u.name, outstanding: u.items.length, overdue: u.items.filter((i) => isOverdue(i, now)).length, last_active: lastActivity(u) }))
  const completed7d = staff.reduce((n, u) => n + u.completed_7d, 0)

  for (const a of admins) {
    const own = a.items.length ? staffPlanFor(t, a, base, now) : null
    if (!withOut.length && !own) { plan.skipped.push({ user_id: a.id, reason: 'nothing outstanding for the team' }); continue }
    plan.digests.push({
      kind: 'admin_digest', user_id: a.id, to: a.email as string, first_name: firstName(a.name), org_name: t.name,
      summary: { team_size: staff.length, with_outstanding: withOut.length, outstanding_total: outstandingTotal, overdue_total: overdueTotal, completed_7d: completed7d },
      never_signed_in: neverIn, stalled, top, own,
    })
  }
  return plan
}
