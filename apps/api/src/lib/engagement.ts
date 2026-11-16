// Reads what is already recorded about each account and turns it into "last active" and an activation score (rules in engagement-score.ts).
// Derived at read time from existing tables, so nothing extra is written during normal use of the app and it works for accounts created before this existed.
// Batched: one set of grouped queries for all the accounts asked for, whether that is one client page or the whole clients list.
import { prisma } from '../db/client'
import { scoreEngagement, type Engagement } from './engagement-score'

const FREE_EVENTS = ['free_limit_hit', 'free_upgrade_click', 'free_audit_completed', 'free_gap_run', 'free_policy_slot_claimed']
const maxDate = (...ds: Array<Date | null | undefined>): Date | null => { const v = ds.filter(Boolean).map((d) => new Date(d as Date).getTime()); return v.length ? new Date(Math.max(...v)) : null }
const minDate = (...ds: Array<Date | null | undefined>): Date | null => { const v = ds.filter(Boolean).map((d) => new Date(d as Date).getTime()); return v.length ? new Date(Math.min(...v)) : null }

export async function loadEngagement(tenantIds: string[], now: Date = new Date()): Promise<Map<string, Engagement>> {
  const out = new Map<string, Engagement>()
  if (!tenantIds.length) return out
  const p = prisma as any
  const scope = { in: tenantIds }
  const [tenants, users, runsAll, runsDone, policies, enrolled, enrolDone, questions, events] = await Promise.all([
    p.tenant.findMany({ where: { id: scope }, select: { id: true, tier: true, created_at: true } }),
    p.user.findMany({ where: { tenant_id: scope }, select: { tenant_id: true, created_at: true, email_verified: true, first_login_at: true, last_login_at: true }, orderBy: { created_at: 'asc' } }),
    p.auditRun.groupBy({ by: ['tenant_id'], where: { tenant_id: scope }, _min: { created_at: true }, _max: { updated_at: true } }),
    p.auditRun.groupBy({ by: ['tenant_id'], where: { tenant_id: scope, status: 'completed' }, _min: { completed_at: true }, _max: { completed_at: true } }),
    p.policy.groupBy({ by: ['tenant_id'], where: { tenant_id: scope }, _min: { created_at: true }, _max: { created_at: true } }),
    p.trainingEnrollment.groupBy({ by: ['tenant_id'], where: { tenant_id: scope, status: { in: ['in_progress', 'complete'] } }, _min: { created_at: true }, _max: { updated_at: true } }),
    p.trainingEnrollment.groupBy({ by: ['tenant_id'], where: { tenant_id: scope, status: 'complete' }, _min: { completed_at: true }, _max: { completed_at: true } }),
    p.queryRecord.groupBy({ by: ['tenant_id'], where: { tenant_id: scope }, _min: { created_at: true }, _max: { created_at: true } }),
    p.auditLog.groupBy({ by: ['tenant_id', 'event_type'], where: { tenant_id: scope, event_type: { in: FREE_EVENTS } }, _count: { _all: true }, _max: { created_at: true } }),
  ])
  const by = <T extends { tenant_id: string }>(rows: T[]) => new Map<string, T>((rows ?? []).map((r) => [r.tenant_id, r]))
  const mRunsAll = by(runsAll), mRunsDone = by(runsDone), mPol = by(policies), mEnr = by(enrolled), mDone = by(enrolDone), mQ = by(questions)
  const usersBy = new Map<string, any[]>(); for (const u of users as any[]) { if (!usersBy.has(u.tenant_id)) usersBy.set(u.tenant_id, []); usersBy.get(u.tenant_id)!.push(u) }
  const evBy = new Map<string, Record<string, { n: number; at: Date | null }>>()
  for (const e of events as any[]) { const m = evBy.get(e.tenant_id) ?? {}; m[e.event_type] = { n: e._count._all, at: e._max.created_at }; evBy.set(e.tenant_id, m) }

  for (const t of tenants as any[]) {
    const us = usersBy.get(t.id) ?? [], ev = evBy.get(t.id) ?? {}
    const ra = mRunsAll.get(t.id) as any, rd = mRunsDone.get(t.id) as any, po = mPol.get(t.id) as any, en = mEnr.get(t.id) as any, ed = mDone.get(t.id) as any, qu = mQ.get(t.id) as any
    const lastLogin = maxDate(...us.map((u) => u.last_login_at)), firstLogin = minDate(...us.map((u) => u.first_login_at))
    const lastActive = maxDate(lastLogin, ra?._max?.updated_at, rd?._max?.completed_at, po?._max?.created_at, en?._max?.updated_at, ed?._max?.completed_at, qu?._max?.created_at,
      ...Object.entries(ev).filter(([k]) => k !== 'free_signup').map(([, v]) => v.at))
    out.set(t.id, scoreEngagement({
      signed_up_at: new Date(t.created_at), tier: t.tier,
      email_verified: us.some((u) => u.email_verified), first_login_at: firstLogin, last_login_at: lastLogin,
      second_user_at: us.length > 1 ? new Date(us[1].created_at) : null,
      audit_first_started_at: ra?._min?.created_at ?? null, audit_first_completed_at: rd?._min?.completed_at ?? null,
      policy_first_uploaded_at: po?._min?.created_at ?? null,
      course_first_started_at: en?._min?.created_at ?? null, course_first_completed_at: ed?._min?.completed_at ?? null,
      question_first_at: qu?._min?.created_at ?? null,
      last_active_at: lastActive, free_limit_hits: ev.free_limit_hit?.n ?? 0, upgrade_clicks: ev.free_upgrade_click?.n ?? 0,
    }, now))
  }
  return out
}

/** The short form shown in the clients list. */
export const engagementBrief = (e?: Engagement | null) => (e ? { score: e.score, label: e.label, last_active_at: e.last_active_at, upsell_ready: e.upsell_ready } : null)
