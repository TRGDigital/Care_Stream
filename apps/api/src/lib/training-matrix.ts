// Training Matrix: every staff member against the training their job role requires.
//
// Reads three existing sources and adds nothing to them:
//   - digital requirements (TrainingRoleRequirement, set on the Training Matrix tab) matched
//     against the staff member's latest enrolment in that module;
//   - face-to-face requirements (FaceToFaceMandatory, set on the Face-to-face tab) matched
//     against their latest attended session, with the same renewal rules as that tab's matrix;
//   - "safe to work" credentials recorded on /workforce (Enterprise), with the register's rules.
// Shared by GET /training-matrix (the tab) and the staff record, so both always agree.

import { prisma } from '../db/client'
import { getPlanFeatures } from './plan-limits'
import { CREDENTIAL_TYPES, credentialStatus } from '../routes/workforce'

const DAY = 86_400_000
const SOON_MS = 60 * DAY
export const ALL_STAFF_ROLE = '*'

export type MatrixStatus =
  | 'in_date' | 'due_soon' | 'expired' | 'overdue' | 'practical_due'
  | 'in_progress' | 'not_started' | 'missing' | 'none' | 'agency'

export type MatrixColumn = { key: string; kind: 'digital' | 'face_to_face' | 'safe_to_work'; label: string; module_id: string | null }
export type MatrixCell = {
  status: MatrixStatus
  required: boolean
  enrollment_id?: string | null
  completed_at?: Date | null
  due_date?: Date | null
  valid_until?: Date | null
  detail?: string | null
}

// Statuses that satisfy a requirement. Due soon still counts: it is held, just renewing.
const MET = new Set<MatrixStatus>(['in_date', 'due_soon'])

function addMonthsUTC(d: Date, n: number): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate()
  const target = new Date(Date.UTC(y, m + n, 1))
  const lastDay = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, lastDay)))
}

const CREDENTIAL_LABELS: Record<string, string> = {
  dbs: 'DBS', right_to_work: 'Right to work', passport: 'Passport',
  professional_registration: 'Professional registration', reference: 'References',
}

export async function buildTrainingMatrix(tenantId: string, opts: { userId?: string } = {}) {
  const now = Date.now()
  const features = await getPlanFeatures(tenantId).catch(() => null)
  const hasWorkforce = !!features?.has_workforce_compliance
  const hasF2F = !!features?.has_face_to_face

  const [users, requirements, f2fMandatory] = await Promise.all([
    (prisma as any).user.findMany({
      where:   { tenant_id: tenantId, is_active: true, is_reviewer: false, ...(opts.userId ? { id: opts.userId } : {}) },
      select:  { id: true, name: true, job_role: true, is_agency: true },
      orderBy: { name: 'asc' },
    }),
    (prisma as any).trainingRoleRequirement.findMany({ where: { tenant_id: tenantId }, orderBy: { module_name: 'asc' } }),
    hasF2F ? (prisma as any).faceToFaceMandatory.findMany({ where: { tenant_id: tenantId }, orderBy: { module_name: 'asc' } }) : Promise.resolve([]),
  ])
  const userIds = (users as any[]).map(u => u.id)

  // Columns: only what some role requires, so the grid is the requirement, not the library.
  const columns: MatrixColumn[] = []
  const digitalIds = new Map<string, string>()
  for (const r of requirements as any[]) if (!digitalIds.has(r.module_id)) digitalIds.set(r.module_id, r.module_name)
  for (const [id, name] of digitalIds) columns.push({ key: `d:${id}`, kind: 'digital', label: name, module_id: id })
  const f2fIds = new Map<string, string>()
  for (const m of f2fMandatory as any[]) if (!f2fIds.has(m.module_id)) f2fIds.set(m.module_id, m.module_name)
  for (const [id, name] of f2fIds) columns.push({ key: `f:${id}`, kind: 'face_to_face', label: name, module_id: id })
  if (hasWorkforce) columns.push({ key: 'safe_to_work', kind: 'safe_to_work', label: 'Safe to work', module_id: null })

  const [enrollments, sessions, credentials] = await Promise.all([
    digitalIds.size && userIds.length
      ? (prisma as any).trainingEnrollment.findMany({
          where:   { tenant_id: tenantId, user_id: { in: userIds }, module_id: { in: [...digitalIds.keys()] } },
          select:  { id: true, user_id: true, module_id: true, status: true, completed_at: true, due_date: true, expires_at: true, practical_signed: true, created_at: true, module: { select: { requires_practical: true } } },
          orderBy: { created_at: 'asc' },
        })
      : Promise.resolve([]),
    f2fIds.size
      ? (prisma as any).faceToFaceSession.findMany({
          where:  { tenant_id: tenantId, module_id: { in: [...f2fIds.keys()] } },
          select: { module_id: true, session_date: true, renews_after_months: true, attendance: { where: { status: 'attended' }, select: { user_id: true } } },
        })
      : Promise.resolve([]),
    hasWorkforce && userIds.length
      ? (prisma as any).staffCredential.findMany({ where: { tenant_id: tenantId, user_id: { in: userIds } }, select: { user_id: true, type: true, expires_at: true } })
      : Promise.resolve([]),
  ])

  // Latest enrolment per user+module (renewals create new rows; the newest is the live one).
  const latestEnrol = new Map<string, any>()
  for (const e of enrollments as any[]) latestEnrol.set(`${e.user_id}:${e.module_id}`, e)

  // Latest attended face-to-face session per user+module.
  const latestF2F = new Map<string, { date: Date; renews: number | null }>()
  for (const s of sessions as any[]) {
    for (const a of s.attendance ?? []) {
      const k = `${a.user_id}:${s.module_id}`
      const cur = latestF2F.get(k)
      if (!cur || new Date(s.session_date) > cur.date) latestF2F.set(k, { date: new Date(s.session_date), renews: s.renews_after_months ?? null })
    }
  }

  const credsByUser = new Map<string, Map<string, any>>()
  for (const c of credentials as any[]) {
    let m = credsByUser.get(c.user_id); if (!m) { m = new Map(); credsByUser.set(c.user_id, m) }
    m.set(c.type, c)
  }

  const reqByRole = new Map<string, Set<string>>()
  for (const r of requirements as any[]) {
    let s = reqByRole.get(r.job_role); if (!s) { s = new Set(); reqByRole.set(r.job_role, s) }
    s.add(r.module_id)
  }
  const f2fByRole = new Map<string, Set<string>>()
  for (const m of f2fMandatory as any[]) {
    let s = f2fByRole.get(m.job_role); if (!s) { s = new Set(); f2fByRole.set(m.job_role, s) }
    s.add(m.module_id)
  }

  function digitalCell(userId: string, moduleId: string, required: boolean): MatrixCell {
    const e = latestEnrol.get(`${userId}:${moduleId}`)
    if (!e) return { status: required ? 'missing' : 'none', required }
    const base = { required, enrollment_id: e.id, completed_at: e.completed_at, due_date: e.due_date, valid_until: e.expires_at }
    if (e.status === 'expired') return { ...base, status: 'expired' }
    if (e.status === 'complete') {
      const exp = e.expires_at ? new Date(e.expires_at).getTime() : null
      if (exp !== null && exp < now) return { ...base, status: 'expired' }
      if (e.module?.requires_practical && !e.practical_signed) return { ...base, status: 'practical_due', detail: 'Practical sign-off outstanding' }
      return { ...base, status: exp !== null && exp - now <= SOON_MS ? 'due_soon' : 'in_date' }
    }
    if (e.due_date && new Date(e.due_date).getTime() < now) return { ...base, status: 'overdue' }
    return { ...base, status: e.status === 'in_progress' ? 'in_progress' : 'not_started' }
  }

  function f2fCell(userId: string, moduleId: string, required: boolean): MatrixCell {
    const rec = latestF2F.get(`${userId}:${moduleId}`)
    if (!rec) return { status: required ? 'missing' : 'none', required }
    if (rec.renews == null) return { status: 'in_date', required, completed_at: rec.date, valid_until: null }
    const until = addMonthsUTC(rec.date, rec.renews)
    const t = until.getTime()
    return { status: t < now ? 'expired' : (t - now <= SOON_MS ? 'due_soon' : 'in_date'), required, completed_at: rec.date, valid_until: until }
  }

  function safeToWorkCell(u: any): MatrixCell {
    // Agency workers' checks are held by their agency, as on the /workforce register.
    if (u.is_agency) return { status: 'agency', required: false, detail: 'Checks held by the agency' }
    const held = credsByUser.get(u.id)
    const missing: string[] = [], expired: string[] = [], expiring: string[] = []
    for (const type of CREDENTIAL_TYPES) {
      const row = held?.get(type) ?? null
      const st = credentialStatus(type, !!row, row?.expires_at ?? null)
      if (st === 'missing' || st === 'outstanding') missing.push(CREDENTIAL_LABELS[type] ?? type)
      else if (st === 'expired') expired.push(CREDENTIAL_LABELS[type] ?? type)
      else if (st === 'expiring') expiring.push(CREDENTIAL_LABELS[type] ?? type)
    }
    const parts = [
      expired.length ? `Expired: ${expired.join(', ')}` : '',
      missing.length ? `Missing: ${missing.join(', ')}` : '',
      expiring.length ? `Expiring: ${expiring.join(', ')}` : '',
    ].filter(Boolean)
    const status: MatrixStatus = expired.length ? 'expired' : missing.length ? 'missing' : expiring.length ? 'due_soon' : 'in_date'
    return { status, required: true, detail: parts.join('. ') || 'All checks in date' }
  }

  const summary = { staff: 0, fully_compliant: 0, missing: 0, expired_or_overdue: 0, due_soon: 0, no_requirements: 0 }
  const rows = (users as any[]).map(u => {
    const role = (u.job_role ?? '').trim()
    const roleReq = new Set([...(reqByRole.get(ALL_STAFF_ROLE) ?? []), ...(role ? reqByRole.get(role) ?? [] : [])])
    const roleF2F = role ? f2fByRole.get(role) ?? new Set<string>() : new Set<string>()
    const cells: Record<string, MatrixCell> = {}
    for (const c of columns) {
      if (c.kind === 'digital') cells[c.key] = digitalCell(u.id, c.module_id!, roleReq.has(c.module_id!))
      else if (c.kind === 'face_to_face') cells[c.key] = f2fCell(u.id, c.module_id!, roleF2F.has(c.module_id!))
      else cells[c.key] = safeToWorkCell(u)
    }
    const training = Object.entries(cells).filter(([k, c]) => k !== 'safe_to_work' && c.required)
    const met = training.filter(([, c]) => MET.has(c.status)).length
    const stw = cells.safe_to_work
    const stwOk = !stw || stw.status === 'agency' || MET.has(stw.status)
    const gaps = Object.values(cells).filter(c => c.required && !MET.has(c.status)).length

    summary.staff++
    if (training.length === 0) summary.no_requirements++
    if (training.length > 0 && met === training.length && stwOk) summary.fully_compliant++
    for (const c of Object.values(cells)) {
      if (!c.required) continue
      if (c.status === 'missing') summary.missing++
      else if (c.status === 'expired' || c.status === 'overdue') summary.expired_or_overdue++
      else if (c.status === 'due_soon') summary.due_soon++
    }
    return {
      user_id: u.id, name: u.name, job_role: u.job_role ?? null, is_agency: !!u.is_agency,
      required: training.length, met, gaps,
      compliance_pct: training.length ? Math.round((met / training.length) * 100) : null,
      safe_to_work_ok: stw ? stwOk : null,
      cells,
    }
  })

  return {
    columns, rows, summary,
    features: { face_to_face: hasF2F, workforce: hasWorkforce },
    has_requirements: (requirements as any[]).length > 0 || (f2fMandatory as any[]).length > 0,
  }
}
