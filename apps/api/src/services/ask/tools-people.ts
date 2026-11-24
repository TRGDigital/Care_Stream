// Tools for the people development agents: Training, CPD training, Staff onboarding, Compliance and Incentives. EVERY tool is read only and scoped to one account
// (every query names the tenant). Results are names, counts, dates and statuses only: never contact details, dates of birth, certificate or reference numbers, uploaded
// documents, supervision form contents or notes. The sums are done in people-calc.ts (pure, tested); a tool returns the data and a plain "method" the agent must show.
import { prisma } from '../../db/client'
import { buildTrainingMatrix } from '../../lib/training-matrix'
import { loadRoster } from '../../lib/holiday-data'
import { credentialHasContent } from '../../lib/credential-content'
import { buildCell, CREDENTIAL_TYPES, credentialStatus } from '../../routes/workforce'
import { EVENTS } from '../incentives/logic'
import { ownSource } from './sources'
import type { AskTool, ToolContext } from './tools'
import {
  type EnrolRow, type OnboardRow, type LedgerRow, type CredRow,
  latestPerPersonModule, trainingOverview, completionByModule, completionByPerson, dueAndOverdue, notStarted, completionTime, cpdHours,
  onboardingProgress, credentialExpiries, meanGapDays, probationState, pointsByPerson, pointsByEvent, claimsSummary, addDaysTo, dayDiff, round2, pctOf,
} from './people-calc'

const db = prisma as any
const OWN = (label: string, ctx: ToolContext) => ownSource(`${label} (CareStream records)`, ctx.today)
const iso = (v: any): string | null => (v ? new Date(v).toISOString().slice(0, 10) : null)
const num = (v: any, d: number) => { const n = Number(v); return Number.isFinite(n) ? n : d }
const clamp = (v: any, d: number, min: number, max: number) => Math.max(min, Math.min(max, Math.round(num(v, d))))
const has = (hay: string | null | undefined, needle: unknown) => !needle || (hay ?? '').toLowerCase().includes(String(needle).toLowerCase())

const CRED_LABEL: Record<string, string> = {
  dbs: 'DBS', right_to_work: 'Right to work', passport: 'Passport', professional_registration: 'Professional registration', reference: 'References',
  visa: 'Visa', driving_licence: 'Driving licence', business_insurance: 'Business insurance', mot: 'MOT', contract: 'Contract',
}

// ── Loaders (read only, one account) ─────────────────────────────────────────────────────────────────────────────────────────────
/** Every live training enrolment (newest per person and course) for active staff who are not shared tablets or CPD reviewers. */
export async function loadEnrolments(tenantId: string): Promise<EnrolRow[]> {
  let rows: any[] = []
  try {
    rows = await db.trainingEnrollment.findMany({
      where: { tenant_id: tenantId, user: { is_active: true, is_shared: false, is_reviewer: false } },
      select: {
        user_id: true, module_id: true, status: true, created_at: true, completed_at: true, due_date: true, expires_at: true, learn_seconds: true,
        user: { select: { name: true, job_role: true } },
        module: { select: { name: true, category: true, cpd_accredited: true, duration_minutes: true } },
      },
      take: 30000,
    })
  } catch { return [] }
  return latestPerPersonModule(rows.map(r => ({
    user_id: r.user_id, name: r.user?.name ?? 'Unknown', job_role: r.user?.job_role ?? null, module_id: r.module_id, module_name: r.module?.name ?? 'A course', category: r.module?.category ?? null,
    status: String(r.status), created_at: new Date(r.created_at).toISOString(), completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    due_date: iso(r.due_date), expires_at: iso(r.expires_at), cpd: !!r.module?.cpd_accredited, duration_minutes: r.module?.duration_minutes ?? null, learn_seconds: Number(r.learn_seconds ?? 0),
  })))
}

async function loadOnboarding(tenantId: string): Promise<OnboardRow[]> {
  let rows: any[] = []
  try {
    rows = await db.onboardingEnrollment.findMany({
      where: { tenant_id: tenantId, user: { is_active: true, is_shared: false, is_reviewer: false } },
      select: {
        enrolled_at: true, due_date: true, completed_at: true,
        user: { select: { name: true, job_role: true } },
        flow: { select: { name: true, _count: { select: { steps: true } } } },
        progress: { select: { completed_at: true } },
      },
      take: 5000,
    })
  } catch { return [] }
  return rows.map(r => ({
    name: r.user?.name ?? 'Unknown', job_role: r.user?.job_role ?? null, flow: r.flow?.name ?? 'Induction', enrolled_at: new Date(r.enrolled_at).toISOString(),
    due_date: iso(r.due_date), completed_at: r.completed_at ? new Date(r.completed_at).toISOString() : null,
    steps_total: Number(r.flow?._count?.steps ?? 0), steps_done: (r.progress ?? []).filter((p: any) => p.completed_at).length,
  }))
}

/** Active non agency staff (agency workers' checks are held by their agency, as on the register). */
async function loadPeople(tenantId: string) {
  let users: any[] = []
  try { users = await db.user.findMany({ where: { tenant_id: tenantId, is_active: true, is_shared: false, is_agency: false, is_reviewer: false }, select: { id: true, name: true, job_role: true }, orderBy: { name: 'asc' }, take: 2000 }) } catch { users = [] }
  return users as Array<{ id: string; name: string; job_role: string | null }>
}

async function loadCredentialRows(tenantId: string, people: Array<{ id: string; name: string; job_role: string | null }>) {
  let creds: any[] = []
  try { creds = await db.staffCredential.findMany({ where: { tenant_id: tenantId, user_id: { in: people.map(p => p.id) } }, select: { user_id: true, type: true, expires_at: true, issued_at: true, reference: true, evidence_key: true, notes: true, registration_body: true, sponsorship_ends_at: true } }) } catch { creds = [] }
  // Keep only what an answer needs: the type, the dates and whether anything is recorded. Reference numbers, notes and documents are dropped here and never leave this function.
  return creds.map(c => ({ user_id: String(c.user_id), type: String(c.type), expires_at: c.expires_at ?? null, sponsorship_ends_at: c.sponsorship_ends_at ?? null, body: c.registration_body ? String(c.registration_body) : null, present: credentialHasContent(c) }))
}

/** Names for a set of user ids, within the account (the incentive tables hold plain user ids). */
async function namesFor(tenantId: string, ids: string[]): Promise<Map<string, { name: string; active: boolean }>> {
  if (!ids.length) return new Map()
  let users: any[] = []
  try { users = await db.user.findMany({ where: { tenant_id: tenantId, id: { in: [...new Set(ids)] } }, select: { id: true, name: true, is_active: true } }) } catch { users = [] }
  return new Map(users.map(u => [u.id, { name: String(u.name), active: u.is_active !== false }]))
}

// ── Tools ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
const courseProp = { course_contains: { type: 'string', description: 'Only courses whose name contains this text.' } }
const roleProp = { job_role: { type: 'string', description: 'Only people whose job role contains this text.' } }
const limitProp = (d: number) => ({ limit: { type: 'number', description: `How many rows to return (default ${d}, maximum 200).` } })

export const PEOPLE_TOOLS: AskTool[] = [
  // ── Training ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'training_overview',
    description: 'The headline for digital training across active staff: how many courses are assigned, complete, in progress, not started, overdue and expired, and the overall completion percentage.',
    input_schema: { type: 'object', properties: { ...courseProp, ...roleProp } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      return { data: trainingOverview(rows, ctx.today), method: 'Each person and course counts once (their newest assignment). Complete means finished and not past its expiry. Overdue means not finished and past its due date. Completion percent = complete divided by assigned.', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'training_by_course',
    description: 'Completion rate for each training course: how many people were assigned it and how many completed it, are in progress, not started, overdue or expired. Lowest completion first. Use for which courses are behind.',
    input_schema: { type: 'object', properties: { ...courseProp, ...roleProp, ...limitProp(25) } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      const all = completionByModule(rows, ctx.today)
      return { data: { courses: all.length, shown: Math.min(all.length, clamp(input?.limit, 25, 1, 200)), list: all.slice(0, clamp(input?.limit, 25, 1, 200)) }, method: 'Per course: complete divided by assigned, counting each person once (newest assignment).', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'training_by_person',
    description: 'Training completion for each person: courses assigned, complete, in progress, not started, overdue and expired, and their completion percentage. Lowest completion first. Use for which staff are behind on training.',
    input_schema: { type: 'object', properties: { ...courseProp, ...roleProp, ...limitProp(40) } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      const all = completionByPerson(rows, ctx.today)
      return { data: { people: all.length, shown: Math.min(all.length, clamp(input?.limit, 40, 1, 200)), list: all.slice(0, clamp(input?.limit, 40, 1, 200)) }, method: 'Per person: complete divided by assigned (newest assignment per course).', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'training_due_overdue',
    description: 'Who is overdue or due soon on which course, and which completed courses have expired or are about to expire. Names, course and date, soonest first. Days are negative when the date has passed.',
    input_schema: { type: 'object', properties: { within_days: { type: 'number', description: 'Look ahead this many days for due soon and expiring (default 30, maximum 365).' }, kind: { type: 'string', enum: ['overdue', 'due_soon', 'expired', 'expiring'], description: 'Only this kind.' }, ...courseProp, ...roleProp, ...limitProp(80) } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      const within = clamp(input?.within_days, 30, 1, 365)
      let list = dueAndOverdue(rows, ctx.today, within)
      if (input?.kind) list = list.filter(i => i.kind === input.kind)
      const counts = { overdue: 0, due_soon: 0, expired: 0, expiring: 0 }; for (const i of list) counts[i.kind]++
      const lim = clamp(input?.limit, 80, 1, 200)
      return { data: { within_days: within, counts, total: list.length, shown: Math.min(list.length, lim), list: list.slice(0, lim) }, method: `Overdue = not finished and past its due date. Due soon = not finished and due within ${within} days. Expired = finished but past its expiry. Expiring = finished and expiring within ${within} days.`, sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'training_not_started',
    description: 'Training that has been assigned but not started, with how many days ago it was assigned. Longest waiting first. Use for who has not started their courses.',
    input_schema: { type: 'object', properties: { min_days: { type: 'number', description: 'Only those assigned at least this many days ago (default 0).' }, ...courseProp, ...roleProp, ...limitProp(60) } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      const list = notStarted(rows, ctx.today, clamp(input?.min_days, 0, 0, 3650)), lim = clamp(input?.limit, 60, 1, 200)
      return { data: { total: list.length, shown: Math.min(list.length, lim), list: list.slice(0, lim) }, method: 'Not started means the course was assigned and no progress is recorded.', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'training_completion_time',
    description: 'How long training takes people: the average and median number of days from a course being assigned to it being completed, by course, plus the average active learning minutes where recorded.',
    input_schema: { type: 'object', properties: { ...courseProp, ...roleProp } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      return { data: completionTime(rows), method: 'Days to complete = completion date minus the date the course was assigned (CareStream does not record when a person first opened a course). Learning minutes are the active time on the lesson where it was recorded.', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'training_matrix_gaps',
    description: 'The mandatory training matrix: for each job role the training that is required, and which people have gaps (missing, expired, overdue or about to expire), including the safe to work checks when the workforce register is on. Use for who is not compliant with required training, and gaps by role.',
    input_schema: { type: 'object', properties: { ...roleProp, ...limitProp(40) } },
    async run(ctx, input) {
      let m: Awaited<ReturnType<typeof buildTrainingMatrix>>
      try { m = await buildTrainingMatrix(ctx.tenantId) } catch { return { data: { error: 'The training matrix could not be read.' }, sources: [] } }
      if (!m.has_requirements) return { data: { has_requirements: false, note: 'No required training has been set up on the Training Matrix tab yet, so there is nothing to measure gaps against.' }, sources: [OWN('Training matrix', ctx)] }
      const label = new Map(m.columns.map(c => [c.key, c.label]))
      const MET = new Set(['in_date', 'due_soon'])
      const rows = m.rows.filter(r => has(r.job_role, input?.job_role) && !r.is_agency)
      const byColumn = new Map<string, number>(), byRole = new Map<string, { people: number; fully: number; pct: number[] }>()
      const people = rows.map(r => {
        const failing = Object.entries(r.cells).filter(([, c]) => c.required && !MET.has(c.status)).map(([k, c]) => ({ requirement: label.get(k) ?? k, status: c.status }))
        for (const f of failing) byColumn.set(f.requirement, (byColumn.get(f.requirement) ?? 0) + 1)
        const role = r.job_role ?? 'No job role recorded', e = byRole.get(role) ?? { people: 0, fully: 0, pct: [] }
        e.people++; if (r.required > 0 && r.gaps === 0) e.fully++; if (r.compliance_pct != null) e.pct.push(r.compliance_pct); byRole.set(role, e)
        return { name: r.name, job_role: r.job_role, required: r.required, met: r.met, gaps: r.gaps, compliance_percent: r.compliance_pct, failing }
      })
      const lim = clamp(input?.limit, 40, 1, 200)
      const withGaps = people.filter(p => p.gaps > 0).sort((a, b) => b.gaps - a.gaps || a.name.localeCompare(b.name))
      return {
        data: {
          summary: m.summary, people_checked: people.length, people_with_gaps: withGaps.length,
          by_job_role: [...byRole].map(([role, e]) => ({ role, people: e.people, fully_compliant: e.fully, average_compliance_percent: e.pct.length ? Math.round(e.pct.reduce((s, x) => s + x, 0) / e.pct.length) : null })),
          gaps_by_requirement: [...byColumn].map(([requirement, people]) => ({ requirement, people })).sort((a, b) => b.people - a.people),
          people: withGaps.slice(0, lim), features: m.features,
        },
        method: 'Same rules as the Training Matrix tab: a requirement is met when the newest completion is in date or due soon. Missing, expired and overdue count as gaps. Compliance percent = requirements met divided by requirements for the role.',
        sources: [OWN('Training matrix', ctx)],
      }
    },
  },

  // ── CPD ────────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'cpd_hours',
    description: 'CPD hours earned by each person from CPD certified courses completed in a period (default the last 12 months), and the total. Hours are the course learning time. Highest first.',
    input_schema: { type: 'object', properties: { from: { type: 'string', description: 'Start date YYYY-MM-DD (default 12 months ago).' }, to: { type: 'string', description: 'End date YYYY-MM-DD (default today).' }, ...roleProp, ...limitProp(40) } },
    async run(ctx, input) {
      const ok = (s: any) => typeof s === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(s)
      const to = ok(input?.to) ? input.to : ctx.today, from = ok(input?.from) ? input.from : addDaysTo(ctx.today, -365)
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => has(r.job_role, input?.job_role))
      const r = cpdHours(rows, from, to), lim = clamp(input?.limit, 40, 1, 200)
      return { data: { ...r, people: r.people.slice(0, lim), people_total: r.people.length }, method: 'CPD hours = the course learning time (estimated minutes divided by 60) for each CPD certified course completed in the period. Courses with no time estimate are listed and not counted.', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'cpd_by_course',
    description: 'CPD certified courses: for each, how many people were assigned it and how many completed it, are in progress, not started, overdue or expired.',
    input_schema: { type: 'object', properties: { ...courseProp, ...roleProp } },
    async run(ctx, input) {
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => r.cpd && has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      return { data: { overview: trainingOverview(rows, ctx.today), courses: completionByModule(rows, ctx.today) }, method: 'Only CPD certified courses are included. Counts as for training: newest assignment per person and course.', sources: [OWN('Training enrolments', ctx)] }
    },
  },
  {
    name: 'cpd_certificates_expiring',
    description: 'CPD certificates (from CPD certified courses) that have expired or expire within a number of days, by person and course, soonest first.',
    input_schema: { type: 'object', properties: { within_days: { type: 'number', description: 'Look ahead this many days (default 90, maximum 365).' }, ...courseProp, ...roleProp, ...limitProp(60) } },
    async run(ctx, input) {
      const within = clamp(input?.within_days, 90, 1, 365)
      const rows = (await loadEnrolments(ctx.tenantId)).filter(r => r.cpd && has(r.module_name, input?.course_contains) && has(r.job_role, input?.job_role))
      const list = dueAndOverdue(rows, ctx.today, within).filter(i => i.kind === 'expired' || i.kind === 'expiring'), lim = clamp(input?.limit, 60, 1, 200)
      return { data: { within_days: within, total: list.length, shown: Math.min(list.length, lim), list: list.slice(0, lim) }, method: `A certificate expires on the course's expiry date. Expired is before today; expiring is within ${within} days.`, sources: [OWN('Training enrolments', ctx)] }
    },
  },

  // ── Staff onboarding ──────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'onboarding_progress',
    description: 'Induction and onboarding progress for each person enrolled: the flow, steps done out of total, percent complete, and whether they are complete, on track, behind, not started or overdue. Behind and overdue first.',
    input_schema: { type: 'object', properties: { status: { type: 'string', enum: ['open', 'all', 'complete'], description: 'open (default) = not finished; all; complete.' }, enrolled_within_days: { type: 'number', description: 'Only people enrolled in the last this many days.' }, ...roleProp, ...limitProp(60) } },
    async run(ctx, input) {
      let list = onboardingProgress((await loadOnboarding(ctx.tenantId)).filter(r => has(r.job_role, input?.job_role)), ctx.today)
      const st = input?.status === 'all' ? 'all' : input?.status === 'complete' ? 'complete' : 'open'
      if (st === 'open') list = list.filter(r => r.state !== 'complete'); else if (st === 'complete') list = list.filter(r => r.state === 'complete')
      if (input?.enrolled_within_days) { const from = addDaysTo(ctx.today, -clamp(input.enrolled_within_days, 30, 1, 730)); list = list.filter(r => r.enrolled_on >= from) }
      const counts: Record<string, number> = {}; for (const r of list) counts[r.state] = (counts[r.state] ?? 0) + 1
      const lim = clamp(input?.limit, 60, 1, 200)
      return { data: { total: list.length, counts, shown: Math.min(list.length, lim), list: list.slice(0, lim) }, method: 'Percent complete = steps completed divided by steps in the flow. Overdue = past the due date and not finished. Behind = more than a quarter of the time to the due date has passed beyond the share of steps done.', sources: [OWN('Onboarding enrolments', ctx)] }
    },
  },
  {
    name: 'onboarding_new_starters',
    description: 'New starters in the last number of days (from their start date) and whether each has been enrolled in an induction and how far through they are. Use for who needs an induction or is behind.',
    input_schema: { type: 'object', properties: { within_days: { type: 'number', description: 'Started in the last this many days (default 90, maximum 365).' } } },
    async run(ctx, input) {
      const within = clamp(input?.within_days, 90, 1, 365), from = addDaysTo(ctx.today, -within)
      const roster = (await loadRoster(ctx.tenantId)).filter(r => r.start_date && r.start_date >= from && r.start_date <= ctx.today)
      const progress = onboardingProgress(await loadOnboarding(ctx.tenantId), ctx.today)
      const by = new Map<string, typeof progress>()
      for (const p of progress) { const k = p.name.toLowerCase(); by.set(k, [...(by.get(k) ?? []), p]) }
      const list = roster.map(r => { const mine = by.get(r.name.toLowerCase()) ?? []; return { name: r.name, job_role: r.job_role, start_date: r.start_date!, days_since_start: dayDiff(r.start_date!, ctx.today), inductions: mine.map(m => ({ flow: m.flow, percent_complete: m.percent_complete, state: m.state })), enrolled: mine.length > 0 } }).sort((a, b) => b.days_since_start - a.days_since_start)
      return { data: { within_days: within, new_starters: list.length, not_enrolled: list.filter(l => !l.enrolled).length, list }, method: 'New starters are people whose start date (from their holiday and pay details) is within the window. People are matched to inductions by name.', sources: [OWN('Staff start dates and onboarding enrolments', ctx)] }
    },
  },

  // ── Compliance ──────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'compliance_expiries',
    description: 'Staff checks and documents that have expired or expire in the next 30, 60 or 90 days (or a number of days), by type: DBS, right to work, passport, professional registration (NMC and others), visa sponsorship, driving licence, MOT, insurance. Names, type and date only, soonest first, with counts by type.',
    input_schema: { type: 'object', properties: { within_days: { type: 'number', description: 'Look ahead this many days (default 90, maximum 365).' }, type: { type: 'string', description: 'Only this type, for example dbs, right_to_work, professional_registration.' }, ...roleProp, ...limitProp(80) } },
    async run(ctx, input) {
      const people = (await loadPeople(ctx.tenantId)).filter(p => has(p.job_role, input?.job_role))
      const creds = await loadCredentialRows(ctx.tenantId, people)
      const by = new Map(people.map(p => [p.id, p]))
      const rows: CredRow[] = []
      for (const c of creds) {
        if (!by.has(c.user_id)) continue
        if (input?.type && String(c.type) !== String(input.type)) continue
        if (!c.present) continue
        const p = by.get(c.user_id)!
        const label = (CRED_LABEL[String(c.type)] ?? String(c.type)) + (c.type === 'professional_registration' && c.body ? ` (${c.body})` : '')
        if (c.expires_at) rows.push({ name: p.name, job_role: p.job_role, type: label, expires: iso(c.expires_at) })
        if (c.sponsorship_ends_at) rows.push({ name: p.name, job_role: p.job_role, type: 'Visa sponsorship ends', expires: iso(c.sponsorship_ends_at) })
      }
      const within = clamp(input?.within_days, 90, 1, 365), r = credentialExpiries(rows, ctx.today, within), lim = clamp(input?.limit, 80, 1, 200)
      return { data: { within_days: within, count: r.count, counts_by_type: r.counts_by_type, shown: Math.min(r.count, lim), items: r.items.slice(0, lim) }, method: `Buckets: expired (before today), within 30 days, 31 to 60, 61 to 90. Agency workers are excluded because their agency holds their checks. Only types and dates are shown.`, sources: [OWN('Workforce compliance register', ctx)] }
    },
  },
  {
    name: 'compliance_register',
    description: 'The workforce compliance register summary: for each core check (DBS, right to work, passport, professional registration, references) how many staff are valid, expiring in 30 days, expired or missing, and who is missing or expired. Use for who is missing a DBS or right to work check.',
    input_schema: { type: 'object', properties: { ...roleProp, ...limitProp(60) } },
    async run(ctx, input) {
      const people = (await loadPeople(ctx.tenantId)).filter(p => has(p.job_role, input?.job_role))
      const creds = await loadCredentialRows(ctx.tenantId, people)
      const mine = new Map<string, Map<string, any>>()
      for (const c of creds) { if (!c.present) continue; const m = mine.get(c.user_id) ?? new Map(); m.set(String(c.type), c); mine.set(c.user_id, m) }
      const summary: Record<string, Record<string, number>> = {}
      const problems: Array<{ name: string; job_role: string | null; check: string; status: string }> = []
      for (const t of CREDENTIAL_TYPES) summary[CRED_LABEL[t] ?? t] = { valid: 0, expiring: 0, expired: 0, missing: 0 }
      for (const p of people) for (const t of CREDENTIAL_TYPES) {
        const row = mine.get(p.id)?.get(t) ?? null
        const st = credentialStatus(t, !!row, row?.expires_at ?? null)
        const bucket = st === 'valid' || st === 'received' ? 'valid' : st === 'expiring' ? 'expiring' : st === 'expired' ? 'expired' : 'missing'
        summary[CRED_LABEL[t] ?? t][bucket]++
        if (bucket === 'expired' || bucket === 'missing') problems.push({ name: p.name, job_role: p.job_role, check: CRED_LABEL[t] ?? t, status: bucket })
      }
      const lim = clamp(input?.limit, 60, 1, 200)
      return { data: { people_checked: people.length, summary_by_check: summary, problems_total: problems.length, shown: Math.min(problems.length, lim), problems: problems.sort((a, b) => a.name.localeCompare(b.name)).slice(0, lim) }, method: 'Same rules as the register: missing = nothing recorded, expiring = within 30 days, expired = past its date. A professional registration only applies to people who hold one, so a missing one is not necessarily a problem.', sources: [OWN('Workforce compliance register', ctx)] }
    },
  },
  {
    name: 'supervision_status',
    description: 'Supervisions and appraisals: for each person when the last one was, when the next is booked or due, and whether it is ok, due soon, overdue or never recorded; plus the average gap in days between sessions. Overdue first. Use for who is overdue a supervision or appraisal and how often they happen.',
    input_schema: { type: 'object', properties: { kind: { type: 'string', enum: ['supervision', 'appraisal', 'both'], description: 'Default both.' }, ...roleProp, ...limitProp(60) } },
    async run(ctx, input) {
      const people = (await loadPeople(ctx.tenantId)).filter(p => has(p.job_role, input?.job_role))
      let recs: any[] = []
      try { recs = await db.staffSupervision.findMany({ where: { tenant_id: ctx.tenantId, user_id: { in: people.map(p => p.id) } }, select: { user_id: true, type: true, held_on: true, next_due: true, conducted_by: true, status: true } }) } catch { recs = [] }
      const kinds = input?.kind === 'supervision' ? ['supervision'] : input?.kind === 'appraisal' ? ['appraisal'] : ['supervision', 'appraisal']
      const out: Array<{ name: string; job_role: string | null; kind: string; status: string; last_on: string | null; next_due: string | null; next_booked: string | null; sessions_recorded: number }> = []
      const counts: Record<string, Record<string, number>> = {}, gaps: Record<string, number[]> = {}
      for (const k of kinds) { counts[k] = { ok: 0, due_soon: 0, overdue: 0, booked: 0, none: 0 }; gaps[k] = [] }
      for (const p of people) for (const k of kinds) {
        const mine = recs.filter(r => r.user_id === p.id && r.type === k)
        const cell = buildCell(mine)
        counts[k][cell.status] = (counts[k][cell.status] ?? 0) + 1
        const g = meanGapDays(mine.filter(r => r.status === 'completed' || new Date(r.held_on).getTime() <= Date.now()).map(r => iso(r.held_on)!))
        if (g != null) gaps[k].push(g)
        out.push({ name: p.name, job_role: p.job_role, kind: k, status: cell.status, last_on: iso(cell.last_on), next_due: iso(cell.next_due), next_booked: iso(cell.next_on), sessions_recorded: mine.length })
      }
      const order: Record<string, number> = { overdue: 0, none: 1, due_soon: 2, booked: 3, ok: 4 }
      const list = out.sort((a, b) => order[a.status] - order[b.status] || a.name.localeCompare(b.name)), lim = clamp(input?.limit, 60, 1, 200)
      const freq = Object.fromEntries(kinds.map(k => [k, gaps[k].length ? { average_days_between_sessions: Math.round(gaps[k].reduce((s, x) => s + x, 0) / gaps[k].length), people_with_two_or_more: gaps[k].length } : null]))
      return { data: { people_checked: people.length, counts, frequency: freq, shown: Math.min(list.length, lim), list: list.slice(0, lim) }, method: 'Same rules as the supervision register: a future session is booked; otherwise the next due date makes it overdue (past), due soon (within 30 days) or ok; no records is none. Frequency is the average days between a person\'s sessions (needs two). The content and notes of sessions are never read.', sources: [OWN('Supervision and appraisal records', ctx)] }
    },
  },
  {
    name: 'probation_status',
    description: 'Who is on probation, whose probation ends in the next 30 days, and who finished probation recently, from the probation end date on their staff record.',
    input_schema: { type: 'object', properties: { ...roleProp } },
    async run(ctx, input) {
      const people = (await loadPeople(ctx.tenantId)).filter(p => has(p.job_role, input?.job_role))
      let det: any[] = []
      try { det = await db.staffDetail.findMany({ where: { tenant_id: ctx.tenantId, user_id: { in: people.map(p => p.id) }, probation_ends_on: { not: null } }, select: { user_id: true, probation_ends_on: true } }) } catch { det = [] }
      const by = new Map(people.map(p => [p.id, p]))
      const from = addDaysTo(ctx.today, -90)
      const list = det.map(d => ({ p: by.get(d.user_id)!, ends: iso(d.probation_ends_on)! })).filter(x => x.p && (x.ends >= from)).map(x => ({ name: x.p.name, job_role: x.p.job_role, probation_ends: x.ends, days: dayDiff(ctx.today, x.ends), state: probationState(x.ends, ctx.today) })).sort((a, b) => a.days - b.days)
      const counts: Record<string, number> = {}; for (const l of list) counts[l.state] = (counts[l.state] ?? 0) + 1
      return { data: { people_with_a_probation_date: det.length, shown_window: 'on probation, ending soon, or ended in the last 90 days', counts, list }, method: 'Probation state comes from the probation end date: after today = on probation, within 30 days = ending soon, before today = ended. People with no probation date recorded are not listed.', sources: [OWN('Staff records', ctx)] }
    },
  },

  // ── Incentives ─────────────────────────────────────────────────────────────────────────────────────────────────────────────────────
  {
    name: 'incentives_overview',
    description: 'The incentive campaigns (recent first): name, month, status, the points rules, the rewards with their target points and quantity, how many staff take part, the monthly budget and the value of rewards approved or given so far.',
    input_schema: { type: 'object', properties: { limit: { type: 'number', description: 'How many campaigns (default 4, maximum 12).' } } },
    async run(ctx, input) {
      let campaigns: any[] = [], rules: any[] = [], rewards: any[] = [], parts: any[] = [], claims: any[] = [], setting: any = null
      try {
        campaigns = await db.incentiveCampaign.findMany({ where: { tenant_id: ctx.tenantId }, orderBy: { period_start: 'desc' }, take: clamp(input?.limit, 4, 1, 12), select: { id: true, name: true, month: true, status: true, period_start: true, period_end: true, everyone: true } })
        const ids = campaigns.map(c => c.id)
        ;[rules, rewards, parts, claims] = await Promise.all([
          db.incentiveRule.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: { in: ids } }, select: { campaign_id: true, event: true, points: true, max_per_month: true } }),
          db.incentiveReward.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: { in: ids } }, select: { id: true, campaign_id: true, title: true, target_points: true, quantity: true, value_pence: true } }),
          db.incentiveParticipant.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: { in: ids } }, select: { campaign_id: true } }),
          db.incentiveClaim.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: { in: ids } }, select: { campaign_id: true, reward_id: true, status: true } }),
        ])
        setting = await db.incentiveSetting.findFirst({ where: { tenant_id: ctx.tenantId }, select: { monthly_budget_pence: true } })
      } catch { return { data: { campaigns: [], note: 'Incentives are not set up for this account, or could not be read.' }, sources: [] } }
      const label = new Map(EVENTS.map(e => [e.key as string, e.label]))
      const valueOf = new Map(rewards.map(r => [r.id, (r.value_pence ?? 0) / 100]))
      const list = campaigns.map(c => ({
        name: c.name, month: c.month, status: c.status, period: { from: iso(c.period_start), to: iso(c.period_end) }, everyone: !!c.everyone,
        participants: parts.filter(p => p.campaign_id === c.id).length,
        rules: rules.filter(r => r.campaign_id === c.id).map(r => ({ event: label.get(r.event) ?? r.event, points: r.points, max_per_month: r.max_per_month })),
        rewards: rewards.filter(r => r.campaign_id === c.id).map(r => ({ title: r.title, target_points: r.target_points, quantity: r.quantity, value_pounds: r.value_pence != null ? round2(r.value_pence / 100) : null })),
        committed_value_pounds: round2(claims.filter(k => k.campaign_id === c.id && (k.status === 'approved' || k.status === 'given')).reduce((s, k) => s + (valueOf.get(k.reward_id) ?? 0), 0)),
      }))
      return { data: { monthly_budget_pounds: setting?.monthly_budget_pence != null ? round2(setting.monthly_budget_pence / 100) : null, campaigns: list }, method: 'Committed value = the value of rewards whose claims are approved or given. Held and rejected claims are not counted.', sources: [OWN('Incentives', ctx)] }
    },
  },
  {
    name: 'incentives_leaderboard',
    description: 'Points earned by each person in an incentive campaign (default the live one, else the latest), highest first, with the next reward target each person is working towards, and total points by event type.',
    input_schema: { type: 'object', properties: { campaign_name_contains: { type: 'string', description: 'Pick the campaign whose name contains this text.' }, ...limitProp(15) } },
    async run(ctx, input) {
      let camp: any = null, rewards: any[] = [], ledger: any[] = []
      try {
        const all = await db.incentiveCampaign.findMany({ where: { tenant_id: ctx.tenantId }, orderBy: { period_start: 'desc' }, take: 24, select: { id: true, name: true, month: true, status: true } })
        camp = (input?.campaign_name_contains ? all.find((c: any) => has(c.name, input.campaign_name_contains)) : null) ?? all.find((c: any) => c.status === 'live') ?? all[0] ?? null
        if (camp) {
          rewards = await db.incentiveReward.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: camp.id }, select: { title: true, target_points: true }, orderBy: { target_points: 'asc' } })
          ledger = await db.incentiveLedger.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: camp.id }, select: { user_id: true, event: true, points: true }, take: 20000 })
        }
      } catch { camp = null }
      if (!camp) return { data: { note: 'There is no incentive campaign to report on.' }, sources: [] }
      const who = await namesFor(ctx.tenantId, ledger.map(l => l.user_id))
      const rows: LedgerRow[] = ledger.filter(l => who.get(l.user_id)?.active !== false).map(l => ({ user_id: l.user_id, name: who.get(l.user_id)?.name ?? 'Unknown', event: String(l.event), points: Number(l.points) }))
      const label = new Map(EVENTS.map(e => [e.key as string, e.label]))
      const people = pointsByPerson(rows).map(p => { const next = rewards.find(r => r.target_points > p.points); return { ...p, next_reward: next ? { title: next.title, points_to_go: next.target_points - p.points } : null, rewards_reached: rewards.filter(r => r.target_points <= p.points).length } })
      const lim = clamp(input?.limit, 15, 1, 200)
      return { data: { campaign: { name: camp.name, month: camp.month, status: camp.status }, people_with_points: people.length, shown: Math.min(people.length, lim), list: people.slice(0, lim), by_event: pointsByEvent(rows).map(e => ({ ...e, event: label.get(e.event) ?? e.event })) }, method: 'Points are the sum of the points ledger for the campaign per person. Points to go = the next reward target minus their points. Only active staff are shown.', sources: [OWN('Incentives points ledger', ctx)] }
    },
  },
  {
    name: 'incentives_claims',
    description: 'Reward claims in an incentive campaign: how many are held, approved, given, missed or rejected, the value committed against the budget, and which people have claims waiting for a decision.',
    input_schema: { type: 'object', properties: { campaign_name_contains: { type: 'string', description: 'Pick the campaign whose name contains this text (default the live one, else the latest).' } } },
    async run(ctx, input) {
      let camp: any = null, claims: any[] = [], rewards: any[] = [], setting: any = null
      try {
        const all = await db.incentiveCampaign.findMany({ where: { tenant_id: ctx.tenantId }, orderBy: { period_start: 'desc' }, take: 24, select: { id: true, name: true, month: true, status: true } })
        camp = (input?.campaign_name_contains ? all.find((c: any) => has(c.name, input.campaign_name_contains)) : null) ?? all.find((c: any) => c.status === 'live') ?? all[0] ?? null
        if (camp) {
          rewards = await db.incentiveReward.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: camp.id }, select: { id: true, title: true, value_pence: true } })
          claims = await db.incentiveClaim.findMany({ where: { tenant_id: ctx.tenantId, campaign_id: camp.id }, select: { user_id: true, reward_id: true, status: true } })
          setting = await db.incentiveSetting.findFirst({ where: { tenant_id: ctx.tenantId }, select: { monthly_budget_pence: true } })
        }
      } catch { camp = null }
      if (!camp) return { data: { note: 'There is no incentive campaign to report on.' }, sources: [] }
      const r = new Map(rewards.map(x => [x.id, x]))
      const sum = claimsSummary(claims.map(c => ({ status: String(c.status), value_pence: r.get(c.reward_id)?.value_pence ?? null })))
      const who = await namesFor(ctx.tenantId, claims.map(c => c.user_id))
      const waiting = claims.filter(c => c.status === 'held').map(c => ({ name: who.get(c.user_id)?.name ?? 'Unknown', reward: r.get(c.reward_id)?.title ?? 'A reward' }))
      const budget = setting?.monthly_budget_pence != null ? round2(setting.monthly_budget_pence / 100) : null
      return { data: { campaign: { name: camp.name, month: camp.month, status: camp.status }, ...sum, monthly_budget_pounds: budget, budget_used_percent: budget ? pctOf(Math.round(sum.committed_value_pounds * 100), Math.round(budget * 100)) : null, waiting_for_decision: waiting }, method: 'Committed value = the value of rewards with approved or given claims. Budget used = committed value divided by the monthly budget.', sources: [OWN('Incentives', ctx)] }
    },
  },
]

export const PEOPLE_TOOL_NAMES = PEOPLE_TOOLS.map(t => t.name)
