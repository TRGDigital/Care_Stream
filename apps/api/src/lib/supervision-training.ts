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

/** Just the tenant flag (one small query). Callers that already hold the plan features combine it with has_workforce_compliance themselves. */
export async function supervisionTrainingFlagOn(tenantId: string): Promise<boolean> {
  try { const t = await p().tenant.findUnique({ where: { id: tenantId }, select: { feature_flags: true } }); return (t?.feature_flags as any)?.supervision_training === true } catch { return false }
}

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

type RecItem = { module_id?: string; assigned_at?: any; module_name?: string; source?: string; due_date?: any; completed_at?: any; score?: { pct: number } | null; cpd_accredited?: boolean; cpd_hours?: number | null; status: string; overdue: boolean; due_soon: boolean }
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
  // One row per course: the latest. A course renewed last month has an old expired row and a new complete one; only the new one counts,
  // otherwise the brief (and the record it is saved into) would call a renewed course overdue and expired.
  const latest = new Map<string, RecItem>()
  const rows: RecItem[] = []
  for (const i of x.items) {
    if (!i.module_id) { rows.push(i); continue }
    const cur = latest.get(i.module_id)
    if (!cur || new Date(i.assigned_at ?? 0).getTime() >= new Date(cur.assigned_at ?? 0).getTime()) latest.set(i.module_id, i)
  }
  x = { ...x, items: [...rows, ...latest.values()] }
  const since = x.previous ? x.previous.held_on : new Date(now.getTime() - 90 * DAY)
  const done = x.items.filter(i => i.status === 'complete')
  const scores = x.items.map(i => i.score?.pct).filter((n): n is number => typeof n === 'number')
  const training = {
    overdue: x.items.filter(i => i.overdue && i.status !== 'expired').map(toItem),
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
    select: { id: true, enrollment_id: true, created_at: true }, take: 500,
  })
  if (!open.length) return 0
  const enr = await p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, id: { in: (open as any[]).map(a => a.enrollment_id) }, status: 'complete' }, select: { id: true, completed_at: true } })
  const doneAt = new Map((enr as any[]).map(e => [e.id, e.completed_at ?? new Date()]))
  let n = 0
  for (const a of open as any[]) {
    if (!doneAt.has(a.enrollment_id)) continue
    // Only a completion AFTER the action was added counts. A course finished months ago must not tick off a new "do this course" action.
    if (new Date(doneAt.get(a.enrollment_id)).getTime() < new Date(a.created_at).getTime() - 60_000) continue
    await p().supervisionAction.update({ where: { id: a.id }, data: { status: 'done', done_at: doneAt.get(a.enrollment_id) } })
    n++
  }
  return n
}

export type LinkResult = { user_id: string; name: string; result: 'linked' | 'already' | 'no_supervision' | 'not_enrolled' | 'already_complete'; supervision_on?: string }

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
    // The open enrolment (not started or in progress). If the only one is already complete there is nothing for the supervision to ask for.
    const enr = await p().trainingEnrollment.findFirst({ where: { tenant_id: tenantId, user_id: u.id, module_id: moduleId, status: { in: ['not_started', 'in_progress'] } }, orderBy: { created_at: 'desc' }, select: { id: true } })
    if (!enr) {
      const done = await p().trainingEnrollment.findFirst({ where: { tenant_id: tenantId, user_id: u.id, module_id: moduleId, status: 'complete' }, select: { id: true } })
      out.push({ user_id: u.id, name: u.name, result: done ? 'already_complete' : 'not_enrolled' }); continue
    }
    const sup = await p().staffSupervision.findFirst({ where: { tenant_id: tenantId, user_id: u.id, type: 'supervision', status: 'booked', held_on: { gte: startToday } }, orderBy: { held_on: 'asc' }, select: { id: true, held_on: true } })
    if (!sup) { out.push({ user_id: u.id, name: u.name, result: 'no_supervision' }); continue }
    const dup = await p().supervisionAction.findFirst({ where: { supervision_id: sup.id, tenant_id: tenantId, enrollment_id: enr.id }, select: { id: true } })
    if (dup) { out.push({ user_id: u.id, name: u.name, result: 'already', supervision_on: iso(sup.held_on) as string }); continue }
    try {
      await p().supervisionAction.create({ data: { supervision_id: sup.id, tenant_id: tenantId, user_id: u.id, description: `Complete training: ${mod.name}`.slice(0, 1000), module_id: mod.id, enrollment_id: enr.id, linked_by: 'training_assign' } })
      out.push({ user_id: u.id, name: u.name, result: 'linked', supervision_on: iso(sup.held_on) as string })
    } catch { out.push({ user_id: u.id, name: u.name, result: 'already', supervision_on: iso(sup.held_on) as string }) }   // a double click lost the race to the unique index
  }
  return out
}

// ─── Training detail: the full picture of the courses a supervision is about ──────────────────────────────────────────────────────
export type IncorrectAnswer = { question: string; their_answer: { letter: string; text: string | null } | null; correct_answer: { letter: string; text: string | null } | null }
export type CourseDetail = {
  enrollment_id: string; module_id: string; module_name: string; kind: 'Annual' | 'Training'; cpd: boolean
  status: 'not_started' | 'started' | 'complete' | 'expired'
  allocated_at: string | null; due_date: string | null; overdue: boolean; started_at: string | null; completed_at: string | null
  answered: number; total_questions: number; correct: number; score_pct: number | null
  attempts: number; learn_minutes: number; relearn_required: boolean
  baseline: { score: number; total: number } | null; reflection: string | null
  incorrect: IncorrectAnswer[]
}
export type TrainingDetail = {
  person: { id: string; name: string; job_role: string | null }
  supervision: { id: string; type: string; held_on: string; status: string } | null
  linked: Array<{ action_id: string; description: string; action_status: string; added_on: string | null; course: CourseDetail | null }>
  others: CourseDetail[]            // allocated since the previous supervision, not tied to this one
  follow_up: Array<{ method: 'learn' | 'retry'; label: string | null; when: string }>   // gaps they went back over (lesson or retry)
  since: string | null
  generated_at: string
}

const letterIndex = (l: string) => { const c = String(l ?? '').trim().toUpperCase().charCodeAt(0) - 65; return c >= 0 && c < 26 ? c : -1 }
const optionOf = (q: any, idx: number) => (idx >= 0 && Array.isArray(q?.options) && typeof q.options[idx] === 'string' ? q.options[idx] : null)

/** Pure: one enrolment (with its module questions and answers) into what a supervisor needs to read. */
export function courseDetailOf(e: { id: string; status: string; created_at: any; due_date?: any; completed_at?: any; expires_at?: any; learn_seconds?: number | null; assessment_attempts?: number | null; relearn_required?: boolean | null; baseline_score?: number | null; baseline_total?: number | null; reflection?: string | null
  module: { id: string; name: string; source?: string | null; cpd_accredited?: boolean | null; questions?: any }
  answers: Array<{ question_id: string; question_text?: string | null; answer_text: string; is_correct: boolean; answered_at?: any }> }, now: Date = new Date()): CourseDetail {
  const qs: any[] = Array.isArray(e.module.questions) ? e.module.questions : []
  const byId = new Map(qs.map(q => [String(q?.id), q]))
  const incorrect: IncorrectAnswer[] = e.answers.filter(a => a.is_correct === false).map(a => {
    const q = byId.get(String(a.question_id))
    const gi = letterIndex(a.answer_text), ci = typeof q?.correct === 'number' ? q.correct : (typeof q?.correct === 'string' ? letterIndex(q.correct) : -1)
    return {
      question: (q?.text ?? a.question_text ?? 'Question') as string,
      their_answer: a.answer_text ? { letter: String(a.answer_text).toUpperCase(), text: optionOf(q, gi) } : null,
      correct_answer: ci >= 0 ? { letter: String.fromCharCode(65 + ci), text: optionOf(q, ci) } : null,
    }
  })
  const correct = e.answers.filter(a => a.is_correct).length
  const answered = e.answers.length
  const started = answered > 0 || (e.learn_seconds ?? 0) > 0 || e.status === 'in_progress' || e.status === 'complete'
  const expired = e.status === 'expired' || (e.status === 'complete' && !!e.expires_at && new Date(e.expires_at) < now)
  const firstAnswer = e.answers.map(a => a.answered_at).filter(Boolean).map(d => new Date(d).getTime()).sort((a, b) => a - b)[0]
  return {
    enrollment_id: e.id, module_id: e.module.id, module_name: e.module.name, kind: e.module.source === 'ai_generated' ? 'Annual' : 'Training', cpd: !!e.module.cpd_accredited,
    status: expired ? 'expired' : e.status === 'complete' ? 'complete' : started ? 'started' : 'not_started',
    allocated_at: iso(e.created_at), due_date: iso(e.due_date), overdue: !!e.due_date && new Date(e.due_date) < now && e.status !== 'complete',
    started_at: firstAnswer ? new Date(firstAnswer).toISOString() : null, completed_at: iso(e.completed_at),
    answered, total_questions: qs.length, correct, score_pct: answered > 0 ? Math.round((correct / answered) * 100) : null,
    attempts: e.assessment_attempts ?? 0, learn_minutes: Math.round((e.learn_seconds ?? 0) / 60), relearn_required: !!e.relearn_required,
    baseline: e.baseline_total ? { score: e.baseline_score ?? 0, total: e.baseline_total } : null, reflection: e.reflection ?? null,
    incorrect,
  }
}

/** Everything a supervisor needs on the training a supervision is about: each linked course in full, other recent allocations, follow up. */
export async function buildTrainingDetail(tenantId: string, userId: string, supervisionId?: string | null): Promise<TrainingDetail | null> {
  await syncLinkedActions(tenantId, userId).catch(() => 0)
  const user = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true, job_role: true } })
  if (!user) return null
  const sup = supervisionId ? await p().staffSupervision.findFirst({ where: { id: supervisionId, tenant_id: tenantId, user_id: userId }, select: { id: true, type: true, held_on: true, status: true } }) : null
  if (supervisionId && !sup) return null
  const prev = await p().staffSupervision.findFirst({ where: { tenant_id: tenantId, user_id: userId, type: sup?.type ?? 'supervision', status: 'completed', ...(sup ? { held_on: { lt: sup.held_on } } : {}) }, orderBy: { held_on: 'desc' }, select: { held_on: true } })
  const since = prev?.held_on ?? new Date(Date.now() - 90 * DAY)
  // Light list first (no questions, no answers), then the full detail only for the few courses that will be shown: a person can have
  // hundreds of enrolments and each module carries its whole question set.
  const [light, actions, rem] = await Promise.all([
    p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, take: 300, select: { id: true, created_at: true } }),
    p().supervisionAction.findMany({ where: { tenant_id: tenantId, user_id: userId, enrollment_id: { not: null }, ...(sup ? { supervision_id: sup.id } : { status: { not: 'done' } }) }, orderBy: { created_at: 'desc' }, take: 25 }),
    p().remediationAttempt.findMany({ where: { tenant_id: tenantId, user_id: userId, created_at: { gte: since } }, orderBy: { created_at: 'desc' }, take: 20 }).catch(() => []),
  ])
  const linkedEnrIds = new Set((actions as any[]).map(a => a.enrollment_id as string))
  const otherIds = (light as any[]).filter(e => !linkedEnrIds.has(e.id) && new Date(e.created_at) >= since).slice(0, 12).map(e => e.id as string)
  const enr = await p().trainingEnrollment.findMany({
    where: { tenant_id: tenantId, user_id: userId, id: { in: [...linkedEnrIds, ...otherIds] } }, orderBy: { created_at: 'desc' },
    include: { module: { select: { id: true, name: true, source: true, cpd_accredited: true, questions: true } }, answers: { select: { question_id: true, question_text: true, answer_text: true, is_correct: true, answered_at: true } } },
  })
  const byId = new Map((enr as any[]).map(e => [e.id, e]))
  const linked = (actions as any[]).map(a => {
    const e = byId.get(a.enrollment_id)
    return { action_id: a.id, description: a.description, action_status: a.status, added_on: iso(a.created_at), course: e ? courseDetailOf(e) : null }
  })
  const others = (enr as any[]).filter(e => !linkedEnrIds.has(e.id)).map(e => courseDetailOf(e))
  return {
    person: { id: user.id, name: user.name, job_role: user.job_role ?? null },
    supervision: sup ? { id: sup.id, type: sup.type, held_on: iso(sup.held_on) as string, status: sup.status } : null,
    linked, others,
    follow_up: (rem as any[]).map(r => ({ method: r.method === 'retry' ? 'retry' as const : 'learn' as const, label: r.label ?? null, when: iso(r.created_at) as string })),
    since: iso(since), generated_at: new Date().toISOString(),
  }
}
