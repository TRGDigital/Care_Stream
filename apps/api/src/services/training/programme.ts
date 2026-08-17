// Programme (diploma / pathway) progress is DERIVED, never stored twice. A unit is
// complete when the learner has an ordinary completed TrainingEnrollment for that
// unit's module, so the existing player, translation, baseline, reflection,
// practical sign-off, licensing and renewal machinery all apply untouched.

import { prisma } from '../../db/client'

export type UnitState = {
  module_id:          string
  order:              number
  is_optional:        boolean
  name:               string
  duration_minutes:   number | null
  requires_practical: boolean
  cpd_accredited:     boolean
  pass_mark:          number
  enrollment_id:      string | null
  status:             'not_started' | 'in_progress' | 'complete' | 'expired'
  score:              number | null
  completed_at:       Date | null
  expires_at:         Date | null
  practical_signed:   boolean
  baseline_score:     number | null
  baseline_total:     number | null
  learn_seconds:      number
  locked:             boolean   // sequential programmes: an earlier unit is outstanding
}

export type ProgrammeState = {
  units:               UnitState[]
  units_total:         number      // required units only
  units_complete:      number
  percent:             number
  cpd_minutes_done:    number
  learn_seconds:       number
  gain_before:         number | null  // summed baseline correct across units that ran one
  gain_before_total:   number | null
  average_score:       number | null
  practical_outstanding: number
  units_ready:         boolean     // every required unit complete (+ practical if required)
  can_take_synoptic:   boolean
  complete:            boolean
  blocking:            string[]    // human-readable reasons it is not complete yet
}

function pct(part: number, whole: number): number {
  return whole > 0 ? Math.round((part / whole) * 100) : 0
}

// Score a completed enrolment the same way the single-module certificate does:
// correct answers over the module's question bank.
function scoreOf(enr: any): number | null {
  const bank = Array.isArray(enr?.module?.questions) ? enr.module.questions : []
  if (!bank.length || !Array.isArray(enr?.answers)) return null
  const correct = enr.answers.filter((a: any) => a.is_correct).length
  return Math.round((correct / bank.length) * 100)
}

/**
 * Build the derived state of one learner's run at a programme.
 *
 * `programme` must include its `units`. Pass the programme enrolment row (or null
 * if they have not been enrolled at programme level yet) to fold in the synoptic
 * result and reflective account.
 */
export async function buildProgrammeState(
  tenantId: string,
  userId: string,
  programme: any,
  progEnr: any | null,
): Promise<ProgrammeState> {
  const units: any[] = [...(programme.units ?? [])].sort((a, b) => a.order - b.order)
  const moduleIds = units.map(u => u.module_id)

  const [modules, enrolments] = await Promise.all([
    (prisma as any).trainingModule.findMany({
      where:  { id: { in: moduleIds } },
      select: { id: true, name: true, duration_minutes: true, requires_practical: true, cpd_accredited: true, pass_mark: true, questions: true },
    }),
    (prisma as any).trainingEnrollment.findMany({
      where:   { tenant_id: tenantId, user_id: userId, module_id: { in: moduleIds } },
      orderBy: { renewal_count: 'desc' },
      include: { module: { select: { questions: true } }, answers: { select: { is_correct: true } } },
    }),
  ])

  const moduleById = new Map<string, any>((modules as any[]).map(m => [m.id, m]))
  // Latest run per module (renewal_count desc, so the first hit wins).
  const enrByModule = new Map<string, any>()
  for (const e of enrolments as any[]) if (!enrByModule.has(e.module_id)) enrByModule.set(e.module_id, e)

  const now = new Date()
  const rows: UnitState[] = []
  let priorOutstanding = false

  for (const u of units) {
    const m   = moduleById.get(u.module_id)
    const enr = enrByModule.get(u.module_id)
    let status: UnitState['status'] = (enr?.status ?? 'not_started') as UnitState['status']
    // Mirror the hub's own expiry treatment (routes/training.ts).
    if (status === 'complete' && enr?.expires_at && new Date(enr.expires_at) < now) status = 'expired'

    const done = status === 'complete'
    rows.push({
      module_id:          u.module_id,
      order:              u.order,
      is_optional:        !!u.is_optional,
      name:               m?.name ?? 'Unknown unit',
      duration_minutes:   m?.duration_minutes ?? null,
      requires_practical: !!m?.requires_practical,
      cpd_accredited:     !!m?.cpd_accredited,
      pass_mark:          m?.pass_mark ?? 80,
      enrollment_id:      enr?.id ?? null,
      status,
      score:              done ? scoreOf(enr) : null,
      completed_at:       enr?.completed_at ?? null,
      expires_at:         enr?.expires_at ?? null,
      practical_signed:   !!enr?.practical_signed,
      baseline_score:     enr?.baseline_score ?? null,
      baseline_total:     enr?.baseline_total ?? null,
      learn_seconds:      enr?.learn_seconds ?? 0,
      locked:             programme.sequential ? priorOutstanding : false,
    })
    // Optional units never gate the ones after them.
    if (!u.is_optional && !done) priorOutstanding = true
  }

  const required = rows.filter(r => !r.is_optional)
  const complete = required.filter(r => r.status === 'complete')
  const scored   = rows.filter(r => r.score != null)
  const gainRows = rows.filter(r => r.baseline_score != null && r.baseline_total != null)
  const practicalOutstanding = programme.require_practical
    ? required.filter(r => r.requires_practical && !r.practical_signed).length
    : 0

  const unitsReady = required.length > 0 && complete.length === required.length && practicalOutstanding === 0
  const synopticQs = Array.isArray(programme.synoptic_questions) ? programme.synoptic_questions : []
  const synopticPassed = synopticQs.length === 0
    ? true
    : (progEnr?.synoptic_score != null && progEnr.synoptic_score >= (programme.synoptic_pass_mark ?? 80))
  const reflectionDone = programme.require_reflection ? !!progEnr?.reflection : true

  const blocking: string[] = []
  const outstanding = required.length - complete.length
  if (outstanding > 0) blocking.push(`${outstanding} unit${outstanding === 1 ? '' : 's'} still to complete`)
  if (practicalOutstanding > 0) blocking.push(`${practicalOutstanding} practical sign-off${practicalOutstanding === 1 ? '' : 's'} outstanding`)
  if (unitsReady && !synopticPassed) blocking.push('Final assessment not yet passed')
  if (unitsReady && synopticPassed && !reflectionDone) blocking.push('Reflective account not yet written')

  // Progress bar counts the units plus, where they exist, the synoptic and the
  // reflection as steps of their own — so the bar reaches 100% only when done.
  const extraSteps = (synopticQs.length ? 1 : 0) + (programme.require_reflection ? 1 : 0)
  const extraDone  = (synopticQs.length && synopticPassed ? 1 : 0) + (programme.require_reflection && reflectionDone ? 1 : 0)

  return {
    units:               rows,
    units_total:         required.length,
    units_complete:      complete.length,
    percent:             pct(complete.length + extraDone, required.length + extraSteps),
    cpd_minutes_done:    complete.reduce((n, r) => n + (r.duration_minutes ?? 0), 0),
    learn_seconds:       rows.reduce((n, r) => n + r.learn_seconds, 0),
    gain_before:         gainRows.length ? gainRows.reduce((n, r) => n + (r.baseline_score ?? 0), 0) : null,
    gain_before_total:   gainRows.length ? gainRows.reduce((n, r) => n + (r.baseline_total ?? 0), 0) : null,
    average_score:       scored.length ? Math.round(scored.reduce((n, r) => n + (r.score ?? 0), 0) / scored.length) : null,
    practical_outstanding: practicalOutstanding,
    units_ready:         unitsReady,
    can_take_synoptic:   unitsReady && synopticQs.length > 0 && !synopticPassed,
    complete:            unitsReady && synopticPassed && reflectionDone,
    blocking,
  }
}

/**
 * Recompute a programme enrolment's status from its derived state and persist it.
 * Called after any unit completion, synoptic submission or reflection save.
 */
export async function syncProgrammeStatus(
  tenantId: string,
  userId: string,
  programme: any,
  progEnr: any,
): Promise<{ state: ProgrammeState; enrollment: any }> {
  const state = await buildProgrammeState(tenantId, userId, programme, progEnr)

  let status = 'not_started'
  if (state.complete) status = 'complete'
  else if (state.can_take_synoptic || (state.units_ready && !state.complete)) status = 'awaiting_synoptic'
  else if (state.units_complete > 0) status = 'in_progress'

  const data: Record<string, unknown> = { status }
  if (status !== 'not_started' && !progEnr.started_at) data.started_at = new Date()
  if (state.complete && !progEnr.completed_at) {
    data.completed_at = new Date()
    if (programme.renewal_months) {
      const exp = new Date()
      exp.setMonth(exp.getMonth() + programme.renewal_months)
      data.expires_at = exp
    }
  }
  // Reopened (a unit expired or was reset) — clear the completion so it can be re-earned.
  if (!state.complete && progEnr.completed_at) { data.completed_at = null; data.expires_at = null }

  const enrollment = await (prisma as any).trainingProgrammeEnrollment.update({
    where: { id: progEnr.id },
    data,
  })
  return { state, enrollment }
}

/**
 * Enrol a learner on a programme: create the programme enrolment plus the ordinary
 * TrainingEnrollment rows for its units (skipping any they already hold). Returns
 * the programme enrolment and how many unit enrolments were newly created.
 */
export async function enrolOnProgramme(
  tenantId: string,
  userId: string,
  programme: any,
  opts: { assignedBy?: string | null; dueDate?: Date | null } = {},
): Promise<{ enrollment: any; units_created: number }> {
  const units: any[] = programme.units ?? []
  const moduleIds = units.map(u => u.module_id)

  const existingProg = await (prisma as any).trainingProgrammeEnrollment.findFirst({
    where:   { tenant_id: tenantId, user_id: userId, programme_id: programme.id },
    orderBy: { renewal_count: 'desc' },
  })
  const enrollment = existingProg ?? await (prisma as any).trainingProgrammeEnrollment.create({
    data: {
      tenant_id: tenantId, user_id: userId, programme_id: programme.id,
      status: 'not_started', assigned_by: opts.assignedBy ?? null, due_date: opts.dueDate ?? null,
    },
  })

  let units_created = 0
  if (moduleIds.length) {
    const held = await (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: userId, module_id: { in: moduleIds }, status: { not: 'expired' } },
      select: { module_id: true },
    })
    const heldIds = new Set((held as any[]).map(e => e.module_id))
    const toCreate = moduleIds.filter(id => !heldIds.has(id)).map(id => ({
      tenant_id: tenantId, user_id: userId, module_id: id,
      status: 'not_started', due_date: opts.dueDate ?? null, assigned_by: opts.assignedBy ?? null,
    }))
    if (toCreate.length) {
      const r = await (prisma as any).trainingEnrollment.createMany({ data: toCreate, skipDuplicates: true })
      units_created = r?.count ?? toCreate.length
    }
  }
  return { enrollment, units_created }
}

/** Sum of unit durations plus a synoptic allowance — the programme's CPD hours. */
export function programmeDurationMinutes(units: Array<{ duration_minutes?: number | null }>, synopticCount: number): number {
  const base = units.reduce((n, u) => n + (u.duration_minutes ?? 0), 0)
  // Allow roughly a minute per synoptic question for the final assessment sitting.
  return base + synopticCount
}
