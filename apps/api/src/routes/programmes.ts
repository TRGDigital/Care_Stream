// Tenant-facing training programmes (diplomas / pathways). A programme groups
// published standard modules behind one completion rule, one synoptic assessment
// and one certificate.
//
// Enrolling a staff member on a programme creates the ordinary TrainingEnrollment
// rows for its units, so every unit is taken in the normal hub player and counts
// towards the normal training matrix — a diploma is a *view over* the same records,
// never a parallel training system.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { requireAdmin } from '../middleware/auth'
import { buildProgrammeState, enrolOnProgramme, programmeDurationMinutes } from '../services/training/programme'
import { illustrationUrl } from '../services/training/moduleImage'
import { notifyStaffAllocation } from '../lib/notify'
import { checkAnnualLicenseLimit, PlanLimitError } from '../lib/plan-limits'
import { facilityTypeToSetting } from '../lib/care-setting'

export const programmesRouter = Router()

const PROGRAMME_INCLUDE = { units: { orderBy: { order: 'asc' as const } } }

// Published platform programmes this tenant may see. Two gates:
//  • pilot_tenant_ids — non-empty means ONLY those tenants, so a new diploma can be
//    published and piloted in a sandbox tenant without reaching real clients.
//  • care_setting — NULL means every setting; otherwise only tenants of that setting
//    (a Complex Care diploma should not appear for a dental practice).
function visibleWhere(tenantId: string, setting: string | null) {
  return {
    tenant_id: null, approved: true, is_active: true,
    AND: [
      { OR: [{ pilot_tenant_ids: { isEmpty: true } }, { pilot_tenant_ids: { has: tenantId } }] },
      { OR: [{ care_setting: null }, ...(setting ? [{ care_setting: setting }] : [])] },
    ],
  }
}

// The tenant's setting slug, derived from its facility type (same mapping the
// standard module library uses).
async function tenantSetting(tenantId: string): Promise<string | null> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { facility_type: true } }).catch(() => null)
  return t ? facilityTypeToSetting(t.facility_type) : null
}

async function publishedProgrammes(tenantId: string, setting: string | null) {
  return (prisma as any).trainingProgramme.findMany({
    where:   visibleWhere(tenantId, setting),
    orderBy: [{ sort_order: 'asc' }, { name: 'asc' }],
    include: PROGRAMME_INCLUDE,
  })
}

// GET /programmes — the catalogue plus, for each, how this tenant's staff are doing.
programmesRouter.get('/', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  try {
    const programmes = await publishedProgrammes(tenantId, await tenantSetting(tenantId))
    const ids = (programmes as any[]).map(p => p.id)

    const moduleIds = [...new Set((programmes as any[]).flatMap(p => p.units.map((u: any) => u.module_id)))]
    const modules = moduleIds.length
      ? await (prisma as any).trainingModule.findMany({ where: { id: { in: moduleIds } }, select: { id: true, duration_minutes: true } })
      : []
    const durById = new Map<string, number | null>((modules as any[]).map(m => [m.id, m.duration_minutes]))

    const counts = ids.length
      ? await (prisma as any).trainingProgrammeEnrollment.groupBy({
          by: ['programme_id', 'status'], where: { tenant_id: tenantId, programme_id: { in: ids } }, _count: { _all: true },
        }).catch(() => [])
      : []
    const byProg = new Map<string, { enrolled: number; complete: number; in_progress: number }>()
    for (const c of (counts as any[])) {
      const cur = byProg.get(c.programme_id) ?? { enrolled: 0, complete: 0, in_progress: 0 }
      cur.enrolled += c._count._all
      if (c.status === 'complete') cur.complete += c._count._all
      else if (c.status !== 'not_started') cur.in_progress += c._count._all
      byProg.set(c.programme_id, cur)
    }

    ok(res, {
      programmes: (programmes as any[]).map(p => {
        const synoptic = Array.isArray(p.synoptic_questions) ? p.synoptic_questions.length : 0
        const minutes = programmeDurationMinutes(p.units.map((u: any) => ({ duration_minutes: durById.get(u.module_id) })), synoptic)
        return {
          id: p.id, slug: p.slug, name: p.name, description: p.description, kind: p.kind,
          group_key: p.group_key, care_setting: p.care_setting, job_roles: p.job_roles,
          unit_count: p.units.length,
          required_count: p.units.filter((u: any) => !u.is_optional).length,
          synoptic_count: synoptic, synoptic_pass_mark: p.synoptic_pass_mark,
          sequential: p.sequential, require_practical: p.require_practical, require_reflection: p.require_reflection,
          duration_minutes: minutes, cpd_hours: minutes ? Math.round((minutes / 60) * 10) / 10 : null,
          outcomes: Array.isArray(p.outcomes) ? p.outcomes : [],
          standards: Array.isArray(p.standards) ? p.standards : [],
          cpd_accredited: p.cpd_accredited, independently_reviewed: p.independently_reviewed,
          attested_by_name: p.attested_by_name, attested_by_role: p.attested_by_role,
          renewal_months: p.renewal_months,
          illustration_url: illustrationUrl(p.illustration_key),
          ...(byProg.get(p.id) ?? { enrolled: 0, complete: 0, in_progress: 0 }),
        }
      }),
    })
  } catch (e: any) {
    err(res, 'FETCH_FAILED', e.message, 500)
  }
})

// GET /programmes/:id/staff — every enrolled staff member and their derived progress.
programmesRouter.get('/:id/staff', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const programme = await (prisma as any).trainingProgramme.findFirst({
    where: { id: req.params.id, ...visibleWhere(tenantId, await tenantSetting(tenantId)) }, include: PROGRAMME_INCLUDE,
  })
  if (!programme) { err(res, 'NOT_FOUND', 'Programme not found', 404); return }

  const enrolments = await (prisma as any).trainingProgrammeEnrollment.findMany({
    where: { tenant_id: tenantId, programme_id: programme.id },
  })
  const users = enrolments.length
    ? await (prisma as any).user.findMany({ where: { id: { in: enrolments.map((e: any) => e.user_id) } }, select: { id: true, name: true, job_role: true } })
    : []
  const userById = new Map<string, any>((users as any[]).map(u => [u.id, u]))

  const rows = await Promise.all((enrolments as any[]).map(async (e) => {
    const state = await buildProgrammeState(tenantId, e.user_id, programme, e)
    return {
      enrollment_id: e.id,
      user_id: e.user_id,
      name: userById.get(e.user_id)?.name ?? '—',
      job_role: userById.get(e.user_id)?.job_role ?? null,
      status: e.status,
      due_date: e.due_date,
      completed_at: e.completed_at,
      expires_at: e.expires_at,
      synoptic_score: e.synoptic_score,
      has_reflection: !!e.reflection,
      units_complete: state.units_complete,
      units_total: state.units_total,
      percent: state.percent,
      cpd_minutes_done: state.cpd_minutes_done,
      average_score: state.average_score,
      practical_outstanding: state.practical_outstanding,
      blocking: state.blocking,
    }
  }))

  ok(res, { programme: { id: programme.id, name: programme.name, kind: programme.kind }, staff: rows })
})

// POST /programmes/:id/enrol — enrol staff on a programme. Creates the programme
// enrolment plus the ordinary unit enrolments they do not already hold.
programmesRouter.post('/:id/enrol', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const actorId  = (req as any).user.sub
  const userIds  = Array.isArray(req.body?.user_ids) ? req.body.user_ids.map((u: any) => String(u)) : []
  const dueDate  = req.body?.due_date ? new Date(req.body.due_date) : null
  if (!userIds.length) { err(res, 'VALIDATION_ERROR', 'user_ids required'); return }

  const programme = await (prisma as any).trainingProgramme.findFirst({
    where: { id: req.params.id, ...visibleWhere(tenantId, await tenantSetting(tenantId)) }, include: PROGRAMME_INCLUDE,
  })
  if (!programme) { err(res, 'NOT_FOUND', 'Programme not found or not published', 404); return }
  if (!programme.units.length) { err(res, 'NO_UNITS', 'This programme has no units yet.', 422); return }

  // Only this tenant's own staff.
  const members = await (prisma as any).user.findMany({ where: { id: { in: userIds }, tenant_id: tenantId }, select: { id: true } })
  const validIds = (members as any[]).map(m => m.id)
  if (!validIds.length) { err(res, 'INVALID', 'No valid recipients for this organisation.', 400); return }

  try {
    // Each new (staff × unit) pairing consumes an annual-training allocation, exactly
    // as a direct module assignment does. Count the genuinely new ones first so a
    // diploma cannot quietly bypass the plan quota.
    const moduleIds = programme.units.map((u: any) => u.module_id)
    const held = await (prisma as any).trainingEnrollment.findMany({
      where:  { tenant_id: tenantId, user_id: { in: validIds }, module_id: { in: moduleIds }, status: { not: 'expired' } },
      select: { user_id: true, module_id: true },
    })
    const heldKeys = new Set((held as any[]).map(e => `${e.user_id}:${e.module_id}`))
    const newPairs = validIds.reduce((n, uid) => n + moduleIds.filter((mid: string) => !heldKeys.has(`${uid}:${mid}`)).length, 0)
    if (newPairs > 0) {
      try { await checkAnnualLicenseLimit(tenantId, newPairs) }
      catch (e: any) { if (e instanceof PlanLimitError) { err(res, e.code, e.message, 402); return } throw e }
    }

    let unitsCreated = 0
    const enrolled: string[] = []
    for (const uid of validIds) {
      const r = await enrolOnProgramme(tenantId, uid, programme, { assignedBy: actorId, dueDate })
      unitsCreated += r.units_created
      enrolled.push(uid)
    }

    ok(res, { enrolled: enrolled.length, units_created: unitsCreated })

    // Tell staff there is something waiting, using the existing annual-training email.
    notifyStaffAllocation(tenantId, enrolled, 'annual_training')
      .catch(e => console.error('[programmes/enrol] staff email error:', e))
  } catch (e: any) {
    console.error('[programmes/enrol] failed:', e?.message ?? e)
    err(res, 'ENROL_FAILED', e.message, 500)
  }
})

// DELETE /programmes/enrolments/:id — remove a staff member from a programme.
// Leaves their unit enrolments alone: those are ordinary training records and may
// be required in their own right.
programmesRouter.delete('/enrolments/:id', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = (req as any).user.tenant_id
  const enr = await (prisma as any).trainingProgrammeEnrollment.findFirst({ where: { id: req.params.id, tenant_id: tenantId }, select: { id: true } })
  if (!enr) { err(res, 'NOT_FOUND', 'Enrolment not found', 404); return }
  await (prisma as any).trainingProgrammeEnrollment.delete({ where: { id: enr.id } })
  ok(res, { removed: true, note: 'Unit training records were kept.' })
})
