// Training and supervisions, linked. Everything here is behind two checks: the account is on the plan that has supervisions
// (Enterprise: has_workforce_compliance) AND the tenant feature flag supervision_training is on. The flag lets us test on one account
// (CS-1001) before anyone else sees it.
//
//   brief      what a supervisor should know about a person's training before the meeting (rules, no AI, no credit)
//   snapshot   the same facts, a few of them, saved into the supervision record when it is completed (a point in time)
//   link       a supervision action that asked for a course, tied to that person's enrolment
//   sync       when the enrolment is complete the action is marked done (done when read, so every way of completing a course counts)
import { prisma } from '../db/client'
import { buildStaffRecord } from './staff-record'
import { getPlanFeatures } from './plan-limits'

const DAY = 86_400_000
const p = () => prisma as any
const iso = (d: any) => (d ? new Date(d).toISOString() : null)

export async function supervisionTrainingEnabled(tenantId: string): Promise<boolean> {
  try {
    const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { feature_flags: true } })
    if ((t?.feature_flags as any)?.supervision_training !== true) return false
    return !!(await getPlanFeatures(tenantId)).has_workforce_compliance
  } catch { return false }
}

// ─── The brief ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
export type BriefItem = { module_name: string; kind: 'Annual' | 'Training'; due_date: string | null; completed_at: string | null; score_pct: number | null; cpd: boolean }
export type Brief = {
  person: { id: string; name: string; job_role: string | null }
  generated_at: string
  previous: { type: string; held_on: string } | null
  since: string | null
  totals: { assigned: number; completed: number; overdue: number; avg_score: number | null; cpd_hours: number; cpd_completed: number }
  training: { overdue: BriefItem[]; due_soon: BriefItem[]; in_progress: BriefItem[]; expired: BriefItem[]; low_scores: BriefItem[]; completed_since: BriefItem[] }
  cqc: { assigned: number; answered: number; pending: number; avg_score: number | null; weak: Array<{ domain: string; score: number }> }
  knowledge_gaps: number
  actions: Array<{ id: string; description: string; status: string; module_name: string | null; set_on: string | null }>
  topics: string[]
}

const LOW_SCORE = 70
const WEAK_CQC = 60

type RecItem = { module_name?: string; source?: string; due_date?: any; completed_at?: any; score?: { pct: number } | null; cpd_accredited?: boolean; cpd_hours?: number | null; status: string; overdue: boolean; due_soon: boolean }
export type BriefInput = {
  person: { id: string; name: string; job_role: string | null }
  items: RecItem[]
  cqc: { assigned: number; answered: number; pending: number; avg_score: number | null; questions: Array<{ domain: string | null; score: number | null; status: string }> }
  knowledgeGaps90d: number
  previous: { type: string; held_on: Date } | null
  actions: Array<{ id: string; description: string; status: string; module_name: string | null; set_on: Date | null }>
  now?: Date
}

const toItem = (i: RecItem): BriefItem => ({
  module_name: i.module_name ?? 'Training', kind: i.source === 'ai_generated' ? 'Annual' : 'Training',
  due_date: iso(i.due_date), completed_at: iso(i.completed_at), score_pct: i.score?.pct ?? null, cpd: !!i.cpd_accredited,
})

/** Pure: facts in, brief out. The rules for "what to raise" live here so they can be tested. */
export function composeBrief(x: BriefInput): Brief {
  const now = x.now ?? new Date()
  const since = x.previous ? x.previous.held_on : new Date(now.getTime() - 90 * DAY)
  const done = x.items.filter(i => i.status === 'complete')
  const scores = x.items.map(i => i.score?.pct).filter((n): n is number => typeof n === 'number')
  const training = {
    overdue: x.items.filter(i => i.overdue).map(toItem),
    due_soon: x.items.filter(i => i.due_soon && !i.overdue).map(toItem),
    in_progress: x.items.filter(i => i.status === 'in_progress' && !i.overdue).map(toItem),
    expired: x.items.filter(i => i.status === 'expired').map(toItem),
    low_scores: done.filter(i => (i.score?.pct ?? 100) < LOW_SCORE).map(toItem),
    completed_since: done.filter(i => i.completed_at && new Date(i.completed_at) >= since).map(toItem),
  }
  const weak = x.cqc.questions.filter(q => q.status === 'evaluated' && typeof q.score === 'number' && q.score < WEAK_CQC && q.domain).map(q => ({ domain: q.domain as string, score: q.score as number }))
  const weakDomains = [...new Map(weak.map(w => [w.domain, w])).values()]

  const topics: string[] = []
  const names = (l: BriefItem[]) => l.slice(0, 3).map(i => i.module_name).join(', ') + (l.length > 3 ? ` and ${l.length - 3} more` : '')
  if (x.items.length === 0) topics.push('No training has been allocated to this person yet.')
  if (training.overdue.length) topics.push(`${training.overdue.length} ${training.overdue.length === 1 ? 'course is' : 'courses are'} overdue: ${names(training.overdue)}.`)
  if (training.expired.length) topics.push(`${training.expired.length === 1 ? 'A course has expired and needs' : `${training.expired.length} courses have expired and need`} renewing: ${names(training.expired)}.`)
  if (training.low_scores.length) topics.push(`Scored under ${LOW_SCORE}% on: ${training.low_scores.slice(0, 3).map(i => `${i.module_name} (${i.score_pct}%)`).join(', ')}.`)
  if (training.due_soon.length) topics.push(`Due in the next 30 days: ${names(training.due_soon)}.`)
  if (weakDomains.length) topics.push(`Struggled with CQC prep questions in: ${weakDomains.slice(0, 3).map(w => w.domain).join(', ')}.`)
  if (x.cqc.pending > 0) topics.push(`${x.cqc.pending} CQC prep ${x.cqc.pending === 1 ? 'question is' : 'questions are'} still unanswered.`)
  if (x.knowledgeGaps90d >= 3) topics.push(`Asked ${x.knowledgeGaps90d} questions in the last 90 days that the policies could not answer. Worth asking what is unclear.`)
  const open = x.actions.filter(a => a.status !== 'done')
  if (open.length) topics.push(`${open.length} action${open.length === 1 ? '' : 's'} from earlier supervisions ${open.length === 1 ? 'is' : 'are'} still open.`)
  if (training.completed_since.length) topics.push(`Completed ${training.completed_since.length} ${training.completed_since.length === 1 ? 'course' : 'courses'} since ${x.previous ? 'the last supervision' : 'the last 90 days'}: ${names(training.completed_since)}. Ask how they have used it.`)

  return {
    person: x.person, generated_at: now.toISOString(),
    previous: x.previous ? { type: x.previous.type, held_on: x.previous.held_on.toISOString() } : null,
    since: since.toISOString(),
    totals: {
      assigned: x.items.length, completed: done.length, overdue: training.overdue.length,
      avg_score: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : null,
      cpd_hours: Math.round(done.filter(i => i.cpd_accredited).reduce((n, i) => n + (i.cpd_hours ?? 0), 0) * 10) / 10,
      cpd_completed: done.filter(i => i.cpd_accredited).length,
    },
    training,
    cqc: { assigned: x.cqc.assigned, answered: x.cqc.answered, pending: x.cqc.pending, avg_score: x.cqc.avg_score, weak: weakDomains.slice(0, 5) },
    knowledge_gaps: x.knowledgeGaps90d,
    actions: x.actions.map(a => ({ id: a.id, description: a.description, status: a.status, module_name: a.module_name, set_on: iso(a.set_on) })),
    topics,
  }
}

/** Load the facts for one person and compose their brief. Closes any linked actions whose course is done first, so the brief is current. */
export async function buildBrief(tenantId: string, userId: string, type: 'supervision' | 'appraisal' = 'supervision'): Promise<Brief | null> {
  await syncLinkedActions(tenantId, userId).catch(() => 0)
  const rec = await buildStaffRecord(tenantId, userId, { includeTeam: false, includeReading: false } as any)
  if (!rec) return null
  const user = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true, job_role: true } })
  if (!user) return null
  const [prev, acts, gaps] = await Promise.all([
    p().staffSupervision.findFirst({ where: { tenant_id: tenantId, user_id: userId, type, status: 'completed' }, orderBy: { held_on: 'desc' }, select: { type: true, held_on: true } }),
    p().supervisionAction.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, take: 30 }),
    p().queryRecord.count({ where: { tenant_id: tenantId, user_id: userId, no_match: true, created_at: { gte: new Date(Date.now() - 90 * DAY) } } }).catch(() => 0),
  ])
  const supIds = [...new Set((acts as any[]).map(a => a.supervision_id))]
  const sups = supIds.length ? await p().staffSupervision.findMany({ where: { id: { in: supIds } }, select: { id: true, held_on: true } }) : []
  const heldOn = new Map((sups as any[]).map(s => [s.id, s.held_on]))
  const mods = [...new Set((acts as any[]).map(a => a.module_id).filter(Boolean))]
  const modRows = mods.length ? await p().trainingModule.findMany({ where: { id: { in: mods } }, select: { id: true, name: true } }) : []
  const modName = new Map((modRows as any[]).map(m => [m.id, m.name]))
  return composeBrief({
    person: { id: user.id, name: user.name, job_role: user.job_role ?? null },
    items: [...(rec.training.items as any[]), ...(rec.annual_training.items as any[])],
    cqc: rec.cqc_prep as any,
    knowledgeGaps90d: gaps as number,
    previous: prev ? { type: prev.type, held_on: new Date(prev.held_on) } : null,
    actions: (acts as any[]).map(a => ({ id: a.id, description: a.description, status: a.status, module_name: a.module_id ? (modName.get(a.module_id) ?? null) : null, set_on: heldOn.get(a.supervision_id) ?? a.created_at })),
  })
}

/** The few facts saved into the record when a supervision is completed. A point in time: it does not change afterwards. */
export function snapshotOf(b: Brief) {
  return {
    taken_at: b.generated_at,
    assigned: b.totals.assigned, completed: b.totals.completed, overdue: b.totals.overdue, avg_score: b.totals.avg_score, cpd_hours: b.totals.cpd_hours,
    overdue_courses: b.training.overdue.map(i => i.module_name), due_soon_courses: b.training.due_soon.map(i => i.module_name),
    completed_since: b.training.completed_since.map(i => ({ name: i.module_name, score_pct: i.score_pct })),
    cqc_pending: b.cqc.pending, knowledge_gaps_90d: b.knowledge_gaps,
  }
}

// ─── Actions tied to training ──────────────────────────────────────────────────────────────────────────────────────────────────────
/** Mark done every supervision action whose linked enrolment is complete. Returns how many were closed. Cheap when nothing is linked. */
export async function syncLinkedActions(tenantId: string, userId?: string): Promise<number> {
  const open = await p().supervisionAction.findMany({
    where: { tenant_id: tenantId, ...(userId ? { user_id: userId } : {}), enrollment_id: { not: null }, status: { not: 'done' } },
    select: { id: true, enrollment_id: true }, take: 500,
  })
  if (!open.length) return 0
  const enr = await p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, id: { in: (open as any[]).map(a => a.enrollment_id) }, status: 'complete' }, select: { id: true, completed_at: true } })
  const doneAt = new Map((enr as any[]).map(e => [e.id, e.completed_at ?? new Date()]))
  let n = 0
  for (const a of open as any[]) {
    if (!doneAt.has(a.enrollment_id)) continue
    await p().supervisionAction.update({ where: { id: a.id }, data: { status: 'done', done_at: doneAt.get(a.enrollment_id) } })
    n++
  }
  return n
}

export type LinkResult = { user_id: string; name: string; result: 'linked' | 'already' | 'no_supervision' | 'not_enrolled'; supervision_on?: string }

/**
 * The "also add to their next supervision" button on the assign screens. For each person: their next BOOKED supervision (not an
 * appraisal, not past), and their enrolment on the course; one action is added to that supervision, tied to the enrolment.
 * Safe to repeat: the same course is never added twice to the same supervision. Never creates a supervision or an enrolment.
 */
export async function linkTrainingToNextSupervision(tenantId: string, userIds: string[], moduleId: string): Promise<LinkResult[]> {
  const mod = await p().trainingModule.findFirst({ where: { id: moduleId, is_active: true, OR: [{ tenant_id: tenantId }, { tenant_id: null }] }, select: { id: true, name: true } })
  if (!mod) return []
  const users = await p().user.findMany({ where: { id: { in: userIds }, tenant_id: tenantId, is_active: true }, select: { id: true, name: true } })
  const startToday = new Date(); startToday.setHours(0, 0, 0, 0)
  const out: LinkResult[] = []
  for (const u of users as any[]) {
    const enr = await p().trainingEnrollment.findFirst({ where: { tenant_id: tenantId, user_id: u.id, module_id: moduleId, status: { not: 'expired' } }, orderBy: { created_at: 'desc' }, select: { id: true } })
    if (!enr) { out.push({ user_id: u.id, name: u.name, result: 'not_enrolled' }); continue }
    const sup = await p().staffSupervision.findFirst({ where: { tenant_id: tenantId, user_id: u.id, type: 'supervision', status: 'booked', held_on: { gte: startToday } }, orderBy: { held_on: 'asc' }, select: { id: true, held_on: true } })
    if (!sup) { out.push({ user_id: u.id, name: u.name, result: 'no_supervision' }); continue }
    const dup = await p().supervisionAction.findFirst({ where: { supervision_id: sup.id, tenant_id: tenantId, enrollment_id: enr.id }, select: { id: true } })
    if (dup) { out.push({ user_id: u.id, name: u.name, result: 'already', supervision_on: iso(sup.held_on) as string }); continue }
    await p().supervisionAction.create({ data: { supervision_id: sup.id, tenant_id: tenantId, user_id: u.id, description: `Complete training: ${mod.name}`.slice(0, 1000), module_id: mod.id, enrollment_id: enr.id, linked_by: 'training_assign' } })
    out.push({ user_id: u.id, name: u.name, result: 'linked', supervision_on: iso(sup.held_on) as string })
  }
  return out
}
