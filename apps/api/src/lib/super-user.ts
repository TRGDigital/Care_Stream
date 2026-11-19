// Super User: one champion per company (spec: ~/carestream-content/specs/super-user-spec.md). A staff member tagged by an administrator.
// CareStream thanks them with a one off £25 voucher when, over 60 days, they use the hub properly and their colleagues' use goes up.
//
//   computeSuperUser   PURE: facts in, measures and eligibility out (tested)
//   loadSuperUser      reads the facts from what is already recorded, then computes
//   setSuperUser       tag / untag, one per company
//   voucher helpers    "due" is set when they become eligible; a person at CareStream marks it sent. Nothing is paid automatically.
//
// Colleagues are counted, never named or timed. Only the Super User, who has agreed, is measured by name and by minutes.
import { prisma } from '../db/client'
import { getPlanFeatures } from './plan-limits'

export const WINDOW_DAYS = 60
export const BASELINE_DAYS = 30
// Placeholders for Len to set (spec section 10).
export const ELIGIBLE_ACTIVE_DAYS = 20
export const ELIGIBLE_PASSED_TRAINING = 1
const CHAT_PER_DAY_CAP = 3        // ten questions in a minute do not count as ten
const DAY = 86_400_000
const p = () => prisma as any

export const londonDay = (d: Date | string) => new Date(d).toLocaleDateString('en-CA', { timeZone: 'Europe/London' })

export type EventKind = 'chat' | 'cqc' | 'audit' | 'policy' | 'followup' | 'login'
export type TrainingKind = 'adhoc' | 'cpd' | 'annual'
export type SuperUserFacts = {
  now: Date
  taggedAt: Date
  consentAt: Date | null
  planActive: boolean
  tenantCreatedAt: Date
  person: { id: string; name: string; job_role: string | null }
  events: Record<EventKind, Date[]>                      // the Super User's own, since they were tagged
  training: Array<{ kind: TrainingKind; module: string; started_at: Date | null; completed_at: Date | null }>
  seconds: Array<{ day: string; seconds: number }>       // only recorded after they agreed
  colleagues: {
    staff_total: number; ever_logged_in: number; first_login_after_tag: number
    events: Array<{ user_id: string; at: Date; kind: 'chat' | 'cqc' | 'audit' | 'training' | 'login' }>   // everyone else, from 30 days before the tag
  }
}

export type Measure = { count: number; days: number }
export type SuperUserResult = {
  person: { id: string; name: string; job_role: string | null }
  tagged_at: string
  consent_at: string | null
  window: { days: number; elapsed: number; left: number; ends_on: string }
  measures: {
    active_days: number
    logins: Measure; chat: Measure & { counted: number }; cqc: Measure; audits: Measure; policies: Measure; followups: Measure
    training: Record<TrainingKind, { started: number; completed: number }> & { passed_total: number }
    minutes: { total: number; per_active_day: number; days_recorded: number }
  }
  colleagues: {
    staff_total: number; ever_logged_in: number; pct_ever_logged_in: number | null; reached: number
    baseline_per_week: number | null; window_per_week: number; trend: 'rising' | 'steady' | 'falling' | 'too_early'; trend_note: string
    training_completed: number; questions_asked: number
  }
  daily: Array<{ day: string; active: boolean; minutes: number }>   // one entry per day of the window so far, for the progress strip
  checks: Array<{ key: string; label: string; ok: boolean; detail: string }>
  status: 'awaiting_consent' | 'paused' | 'in_window' | 'eligible' | 'not_met'
}

const distinctDays = (ds: Date[]) => new Set(ds.map(londonDay))
const inRange = (d: Date | null | undefined, a: Date, b: Date) => !!d && d.getTime() >= a.getTime() && d.getTime() < b.getTime()

/** Average number of different colleagues active per week in [from, to). Partial weeks count as weeks. */
export function avgActivePerWeek(evs: Array<{ user_id: string; at: Date }>, from: Date, to: Date): number {
  const len = to.getTime() - from.getTime()
  if (len <= 0) return 0
  const weeks = Math.max(1, Math.ceil(len / (7 * DAY)))
  const buckets: Array<Set<string>> = Array.from({ length: weeks }, () => new Set())
  for (const e of evs) {
    const t = e.at.getTime()
    if (t < from.getTime() || t >= to.getTime()) continue
    buckets[Math.min(weeks - 1, Math.floor((t - from.getTime()) / (7 * DAY)))].add(e.user_id)
  }
  return Math.round((buckets.reduce((n, s) => n + s.size, 0) / weeks) * 10) / 10
}

/** Pure: everything the platform and the admin card show. No database, no clock other than facts.now. */
export function computeSuperUser(f: SuperUserFacts): SuperUserResult {
  const start = f.taggedAt
  const windowEnd = new Date(start.getTime() + WINDOW_DAYS * DAY)
  const to = new Date(Math.min(f.now.getTime(), windowEnd.getTime()))
  const elapsed = Math.max(0, Math.floor((f.now.getTime() - start.getTime()) / DAY))
  const within = (d: Date | null | undefined) => inRange(d, start, windowEnd)

  const ev = (k: EventKind) => f.events[k].filter(d => within(d))
  const m = (k: EventKind): Measure => { const e = ev(k); return { count: e.length, days: distinctDays(e).size } }
  const chatEv = ev('chat')
  const perDay = new Map<string, number>(); for (const d of chatEv) { const k = londonDay(d); perDay.set(k, (perDay.get(k) ?? 0) + 1) }
  const counted = [...perDay.values()].reduce((n, c) => n + Math.min(c, CHAT_PER_DAY_CAP), 0)

  const trn = (k: TrainingKind) => {
    const rows = f.training.filter(t => t.kind === k)
    return { started: rows.filter(t => within(t.started_at) || within(t.completed_at)).length, completed: rows.filter(t => within(t.completed_at)).length }
  }
  const training = { adhoc: trn('adhoc'), cpd: trn('cpd'), annual: trn('annual') }
  const passedTotal = training.adhoc.completed + training.cpd.completed + training.annual.completed

  // Active days: any real action on a day. Training counts on the days it was started or completed.
  const days = new Set<string>()
  for (const k of ['chat', 'cqc', 'audit', 'policy', 'followup', 'login'] as EventKind[]) for (const d of ev(k)) days.add(londonDay(d))
  for (const t of f.training) { if (within(t.started_at)) days.add(londonDay(t.started_at!)); if (within(t.completed_at)) days.add(londonDay(t.completed_at!)) }

  const secs = f.seconds.filter(s => s.seconds > 0 && within(new Date(s.day + 'T12:00:00Z')))
  const totalSecs = secs.reduce((n, s) => n + s.seconds, 0)

  // Colleagues: counts only. Compare the people active per week now with the 30 days before the tag.
  const baseFrom = new Date(start.getTime() - BASELINE_DAYS * DAY)
  const evs = f.colleagues.events
  const windowPerWeek = avgActivePerWeek(evs, start, to.getTime() > start.getTime() ? to : new Date(start.getTime() + DAY))
  // A baseline only means something if the account already existed for it.
  const hadBaseline = f.tenantCreatedAt.getTime() <= baseFrom.getTime() + 7 * DAY
  const baseline = hadBaseline ? avgActivePerWeek(evs, baseFrom, start) : null
  let trend: SuperUserResult['colleagues']['trend'] = 'too_early', note = 'Too early to tell: a few weeks of activity are needed.'
  if (baseline !== null && baseline > 0) {
    const diff = windowPerWeek - baseline
    if (elapsed < 14) { trend = 'too_early'; note = `${baseline} colleagues a week before the tag; ${windowPerWeek} so far. Too early to call.` }
    else if (diff >= 0.5 && windowPerWeek >= baseline * 1.15) { trend = 'rising'; note = `Colleagues active per week up from ${baseline} to ${windowPerWeek}.` }
    else if (diff <= -0.5 && windowPerWeek <= baseline * 0.85) { trend = 'falling'; note = `Colleagues active per week down from ${baseline} to ${windowPerWeek}.` }
    else { trend = 'steady'; note = `Colleagues active per week ${baseline} before, ${windowPerWeek} now.` }
  } else if (elapsed >= 28) {
    // No usable baseline (a new account, or nobody used it before): compare the first half of the window with the second.
    const mid = new Date(start.getTime() + Math.floor((to.getTime() - start.getTime()) / 2))
    const a = avgActivePerWeek(evs, start, mid), b = avgActivePerWeek(evs, mid, to)
    if (b - a >= 0.5 && b >= a * 1.15 && b > 0) { trend = 'rising'; note = `No earlier baseline. Colleagues active per week rose from ${a} to ${b} within the window.` }
    else if (a - b >= 0.5 && b <= a * 0.85) { trend = 'falling'; note = `No earlier baseline. Colleagues active per week fell from ${a} to ${b} within the window.` }
    else { trend = 'steady'; note = `No earlier baseline. Colleagues active per week ${a} in the first half, ${b} in the second.` }
  } else if (baseline === null || baseline === 0) { note = 'No earlier baseline yet. A few weeks of activity are needed.' }

  const colleagueTraining = evs.filter(e => e.kind === 'training' && within(e.at)).length
  const colleagueQs = evs.filter(e => e.kind === 'chat' && within(e.at)).length
  const staffTotal = f.colleagues.staff_total

  const checks: SuperUserResult['checks'] = [
    { key: 'active_days', label: `Active on at least ${ELIGIBLE_ACTIVE_DAYS} days of the ${WINDOW_DAYS}`, ok: days.size >= ELIGIBLE_ACTIVE_DAYS, detail: `${days.size} active days` },
    { key: 'training', label: `At least ${ELIGIBLE_PASSED_TRAINING} course passed`, ok: passedTotal >= ELIGIBLE_PASSED_TRAINING, detail: `${passedTotal} passed` },
    { key: 'colleagues', label: 'Colleagues using the hub more', ok: trend === 'rising', detail: note },
  ]

  // One entry per day since they were tagged (up to the 60), so progress can be seen at a glance.
  const minutesBy = new Map(secs.map(s => [s.day, Math.round(s.seconds / 60)]))
  const daily: SuperUserResult['daily'] = []
  for (let i = 0; i < Math.min(WINDOW_DAYS, elapsed + 1); i++) {
    const day = londonDay(new Date(start.getTime() + i * DAY))
    daily.push({ day, active: days.has(day), minutes: minutesBy.get(day) ?? 0 })
  }

  let status: SuperUserResult['status']
  if (!f.consentAt) status = 'awaiting_consent'
  else if (!f.planActive) status = 'paused'
  else if (elapsed < WINDOW_DAYS) status = 'in_window'
  else status = checks.every(c => c.ok) ? 'eligible' : 'not_met'

  return {
    person: f.person, tagged_at: start.toISOString(), consent_at: f.consentAt ? f.consentAt.toISOString() : null,
    window: { days: WINDOW_DAYS, elapsed: Math.min(elapsed, WINDOW_DAYS), left: Math.max(0, WINDOW_DAYS - elapsed), ends_on: windowEnd.toISOString() },
    measures: {
      active_days: days.size, logins: m('login'), chat: { ...m('chat'), counted }, cqc: m('cqc'), audits: m('audit'), policies: m('policy'), followups: m('followup'),
      training: { ...training, passed_total: passedTotal },
      minutes: { total: Math.round(totalSecs / 60), per_active_day: days.size ? Math.round(totalSecs / 60 / days.size) : 0, days_recorded: secs.length },
    },
    colleagues: {
      staff_total: staffTotal, ever_logged_in: f.colleagues.ever_logged_in,
      pct_ever_logged_in: staffTotal > 0 ? Math.round((f.colleagues.ever_logged_in / staffTotal) * 100) : null,
      reached: f.colleagues.first_login_after_tag,
      baseline_per_week: baseline, window_per_week: windowPerWeek, trend, trend_note: note,
      training_completed: colleagueTraining, questions_asked: colleagueQs,
    },
    daily, checks, status,
  }
}

// ─── Reading the facts ────────────────────────────────────────────────────────────────────────────────────────────────────────────
export async function currentSuperUser(tenantId: string) {
  return p().user.findFirst({ where: { tenant_id: tenantId, super_user_since: { not: null } }, select: { id: true, name: true, email: true, job_role: true, role: true, is_active: true, super_user_since: true, super_user_consent_at: true } })
}

async function isPaid(tenantId: string): Promise<boolean> {
  try {
    const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { tier: true, subscription_status: true } })
    if (!t || t.tier === 'free' || t.subscription_status === 'cancelled') return false
    const f = await getPlanFeatures(tenantId)
    return (f.price_monthly_pence ?? 0) > 0
  } catch { return false }
}

export async function loadSuperUser(tenantId: string, now: Date = new Date()): Promise<SuperUserResult | null> {
  const su = await currentSuperUser(tenantId)
  if (!su || !su.super_user_since) return null
  const tagged = new Date(su.super_user_since)
  const baseFrom = new Date(tagged.getTime() - BASELINE_DAYS * DAY)
  const since = { gte: tagged }
  const [tenant, enr, chat, cqc, audits, policies, followups, logins, seconds, staff, cChat, cCqc, cAudit, cTrain, cLogin] = await Promise.all([
    p().tenant.findUnique({ where: { id: tenantId }, select: { created_at: true } }),
    p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: su.id, updated_at: since }, take: 300, select: { created_at: true, completed_at: true, status: true, learn_seconds: true, module: { select: { name: true, source: true, cpd_accredited: true } }, answers: { select: { answered_at: true }, orderBy: { answered_at: 'asc' }, take: 1 } } }),
    p().queryRecord.findMany({ where: { tenant_id: tenantId, user_id: su.id, created_at: since }, select: { created_at: true }, take: 5000 }),
    p().cqcStaffDelivery.findMany({ where: { tenant_id: tenantId, user_id: su.id, answered_at: since }, select: { answered_at: true }, take: 2000 }),
    p().auditRun.findMany({ where: { tenant_id: tenantId, completed_at: since, OR: [{ completed_by_user_id: su.id }, { completed_by_user_id: null, auditor_name: su.name }] }, select: { completed_at: true }, take: 2000 }),
    p().policyReadSession.findMany({ where: { tenant_id: tenantId, user_id: su.id, created_at: since }, select: { created_at: true }, take: 2000 }).catch(() => []),
    p().remediationAttempt.findMany({ where: { tenant_id: tenantId, user_id: su.id, created_at: since }, select: { created_at: true }, take: 2000 }).catch(() => []),
    p().auditLog.findMany({ where: { tenant_id: tenantId, user_id: su.id, event_type: 'login', created_at: since }, select: { created_at: true }, take: 2000 }).catch(() => []),
    p().userActiveSeconds.findMany({ where: { user_id: su.id, day: { gte: new Date(londonDay(tagged) + 'T00:00:00Z') } }, select: { day: true, seconds: true }, take: 400 }).catch(() => []),
    p().user.findMany({ where: { tenant_id: tenantId, is_active: true, is_agency: false, NOT: { id: su.id } }, select: { first_login_at: true } }),
    p().queryRecord.findMany({ where: { tenant_id: tenantId, user_id: { not: null, notIn: [su.id] }, created_at: { gte: baseFrom } }, select: { user_id: true, created_at: true }, take: 20000 }),
    p().cqcStaffDelivery.findMany({ where: { tenant_id: tenantId, user_id: { not: su.id }, answered_at: { gte: baseFrom } }, select: { user_id: true, answered_at: true }, take: 10000 }),
    p().auditRun.findMany({ where: { tenant_id: tenantId, completed_by_user_id: { not: null, notIn: [su.id] }, completed_at: { gte: baseFrom } }, select: { completed_by_user_id: true, completed_at: true }, take: 5000 }),
    p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: { not: su.id }, status: 'complete', completed_at: { gte: baseFrom } }, select: { user_id: true, completed_at: true }, take: 20000 }),
    p().auditLog.findMany({ where: { tenant_id: tenantId, user_id: { not: su.id }, event_type: 'login', created_at: { gte: baseFrom } }, select: { user_id: true, created_at: true }, take: 20000 }).catch(() => []),
  ])
  const kindOf = (mod: any): TrainingKind => (mod?.cpd_accredited ? 'cpd' : mod?.source === 'ai_generated' ? 'annual' : 'adhoc')
  const D = (rows: any[], k: string) => (rows as any[]).map(r => new Date(r[k])).filter(d => !Number.isNaN(d.getTime()))
  const staffRows = staff as any[]
  const events: SuperUserFacts['colleagues']['events'] = [
    ...(cChat as any[]).map(r => ({ user_id: r.user_id, at: new Date(r.created_at), kind: 'chat' as const })),
    ...(cCqc as any[]).map(r => ({ user_id: r.user_id, at: new Date(r.answered_at), kind: 'cqc' as const })),
    ...(cAudit as any[]).map(r => ({ user_id: r.completed_by_user_id, at: new Date(r.completed_at), kind: 'audit' as const })),
    ...(cTrain as any[]).map(r => ({ user_id: r.user_id, at: new Date(r.completed_at), kind: 'training' as const })),
    ...(cLogin as any[]).map(r => ({ user_id: r.user_id, at: new Date(r.created_at), kind: 'login' as const })),
  ].filter(e => e.user_id && !Number.isNaN(e.at.getTime()))
  return computeSuperUser({
    now, taggedAt: tagged, consentAt: su.super_user_consent_at ? new Date(su.super_user_consent_at) : null,
    planActive: await isPaid(tenantId), tenantCreatedAt: new Date(tenant?.created_at ?? tagged),
    person: { id: su.id, name: su.name, job_role: su.job_role ?? null },
    events: { chat: D(chat as any[], 'created_at'), cqc: D(cqc as any[], 'answered_at'), audit: D(audits as any[], 'completed_at'), policy: D(policies as any[], 'created_at'), followup: D(followups as any[], 'created_at'), login: D(logins as any[], 'created_at') },
    training: (enr as any[]).filter(e => e.module).map(e => ({
      kind: kindOf(e.module), module: e.module.name,
      started_at: e.answers?.[0]?.answered_at ? new Date(e.answers[0].answered_at) : ((e.learn_seconds ?? 0) > 0 || e.status !== 'not_started' ? new Date(e.created_at) : null),
      completed_at: e.status === 'complete' && e.completed_at ? new Date(e.completed_at) : null,
    })),
    seconds: (seconds as any[]).map(s => ({ day: new Date(s.day).toISOString().slice(0, 10), seconds: s.seconds })),
    colleagues: {
      staff_total: staffRows.length, ever_logged_in: staffRows.filter(u => u.first_login_at).length,
      first_login_after_tag: staffRows.filter(u => u.first_login_at && new Date(u.first_login_at).getTime() >= tagged.getTime()).length,
      events,
    },
  })
}

// ─── Tag and untag ────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type TagResult =
  | { ok: true; user_id: string; replaced?: string }
  | { ok: false; code: 'NOT_FOUND' | 'NOT_PAID' | 'INACTIVE' | 'AGENCY' | 'EXISTS'; message: string; existing?: { id: string; name: string } }

/** Make one person the company's Super User. A company has one: a second tag needs replace=true, which untags the first. */
export async function tagSuperUser(tenantId: string, userId: string, opts: { replace?: boolean } = {}): Promise<TagResult> {
  const user = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true, is_active: true, is_agency: true, super_user_since: true } })
  if (!user) return { ok: false, code: 'NOT_FOUND', message: 'Staff member not found.' }
  if (!(await isPaid(tenantId))) return { ok: false, code: 'NOT_PAID', message: 'Super Users are part of the paid plans (Starter, Professional and Enterprise).' }
  if (!user.is_active) return { ok: false, code: 'INACTIVE', message: 'That staff member is not active.' }
  if (user.is_agency) return { ok: false, code: 'AGENCY', message: 'An agency worker cannot be the Super User.' }
  if (user.super_user_since) return { ok: true, user_id: user.id }
  const existing = await currentSuperUser(tenantId)
  if (existing && !opts.replace) return { ok: false, code: 'EXISTS', message: `${existing.name} is already the Super User. A company has one.`, existing: { id: existing.id, name: existing.name } }
  try {
    await p().$transaction([
      ...(existing ? [p().user.update({ where: { id: existing.id }, data: { super_user_since: null, super_user_consent_at: null } })] : []),
      p().user.update({ where: { id: user.id }, data: { super_user_since: new Date(), super_user_consent_at: null } }),
    ])
  } catch { return { ok: false, code: 'EXISTS', message: 'A Super User was set at the same moment. Refresh and try again.' } }
  return { ok: true, user_id: user.id, replaced: existing?.name }
}

export async function untagSuperUser(tenantId: string, userId: string): Promise<boolean> {
  const r = await p().user.updateMany({ where: { id: userId, tenant_id: tenantId, super_user_since: { not: null } }, data: { super_user_since: null, super_user_consent_at: null } })
  return (r?.count ?? 0) > 0
}

/** The person agreeing (or declining, which removes the tag). */
export async function answerConsent(tenantId: string, userId: string, accept: boolean): Promise<'accepted' | 'declined' | 'not_super_user'> {
  const u = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId, super_user_since: { not: null } }, select: { id: true } })
  if (!u) return 'not_super_user'
  if (!accept) { await untagSuperUser(tenantId, userId); return 'declined' }
  await p().user.update({ where: { id: userId }, data: { super_user_consent_at: new Date() } })
  return 'accepted'
}

// ─── Active time: seconds on the hub per day, for a Super User who has agreed ───────────────────────────────────────────────────────
const MAX_SECONDS_PER_BEAT = 60
const MAX_SECONDS_PER_DAY = 12 * 3600
export async function recordActiveSeconds(tenantId: string, userId: string, seconds: number, now: Date = new Date()): Promise<boolean> {
  const add = Math.max(0, Math.min(MAX_SECONDS_PER_BEAT, Math.floor(Number(seconds) || 0)))
  if (!add) return false
  const u = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId, super_user_since: { not: null }, super_user_consent_at: { not: null } }, select: { id: true } })
  if (!u) return false
  const day = new Date(londonDay(now) + 'T00:00:00Z')
  const cur = await p().userActiveSeconds.findUnique({ where: { user_id_day: { user_id: userId, day } }, select: { seconds: true } }).catch(() => null)
  if ((cur?.seconds ?? 0) >= MAX_SECONDS_PER_DAY) return false
  await p().userActiveSeconds.upsert({ where: { user_id_day: { user_id: userId, day } }, create: { tenant_id: tenantId, user_id: userId, day, seconds: add }, update: { seconds: { increment: add } } })
  return true
}

// ─── The voucher: due when eligible, sent by a person at CareStream ─────────────────────────────────────────────────────────────────
export async function getVoucher(tenantId: string) { return p().superUserVoucher.findUnique({ where: { tenant_id: tenantId } }).catch(() => null) }

/** Create the "due" row the first time the Super User is eligible. Never changes a voucher already marked sent. */
export async function syncVoucher(tenantId: string, result: SuperUserResult | null) {
  if (!result || result.status !== 'eligible') return getVoucher(tenantId)
  const cur = await getVoucher(tenantId)
  if (cur) return cur
  try { return await p().superUserVoucher.create({ data: { tenant_id: tenantId, user_id: result.person.id, status: 'due' } }) } catch { return getVoucher(tenantId) }
}

export async function markVoucherSent(tenantId: string, sentBy: string, note?: string | null) {
  const cur = await getVoucher(tenantId)
  if (!cur) return null
  return p().superUserVoucher.update({ where: { tenant_id: tenantId }, data: { status: 'sent', sent_at: new Date(), sent_by: sentBy, note: note?.slice(0, 500) ?? null } })
}
