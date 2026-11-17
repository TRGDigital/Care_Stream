// The full staff profile for the platform console: everything we hold about one person, one tab at a time.
//
//   overview  headline numbers for every area, risk flags, recent activity
//   training  allocated courses (annual and ordinary), CPD, required training for their role
//   audits    audits allocated to them, audits they carried out, actions assigned from audits
//   cqc       CQC staff prep questions and scores
//   onboarding induction, induction questions, face-to-face sessions and their certificates
//   supervision  supervisions, appraisals and their actions, credentials (DBS and so on)
//   chats     every chat with the AI assistant IN FULL (including chats the person deleted, marked as such), knowledge gaps, languages used
//   certificates  training, CPD and face-to-face certificates, credentials with evidence
//   access    every sign in (IP, place, device), devices and whether the hub is installed, language settings, policies read, acknowledgements
//
// Built on buildStaffRecord for what it already knows; the rest is new queries. Platform console only (see the route for logging).
import { prisma } from '../db/client'
import { buildStaffRecord } from './staff-record'
import { listAssignments } from '../services/audits/assignments'
import { describeDevice } from './client-origin'

export const PROFILE_TABS = ['overview', 'training', 'audits', 'cqc', 'onboarding', 'supervision', 'chats', 'certificates', 'access'] as const
export type ProfileTab = typeof PROFILE_TABS[number]
const DAY = 86_400_000
const p = () => prisma as any
const iso = (d: any) => (d ? new Date(d).toISOString() : null)

export async function loadHeader(tenantId: string, userId: string) {
  const user = await p().user.findFirst({
    where: { id: userId, tenant_id: tenantId },
    select: { id: true, name: true, email: true, role: true, job_role: true, phone_number: true, is_active: true, is_agency: true, agency_name: true, created_at: true, first_login_at: true, last_login_at: true, last_login_meta: true, first_language: true, second_language: true },
  })
  if (!user) return null
  const [tenant, lastQuery, lastDone, lastSignIn] = await Promise.all([
    p().tenant.findUnique({ where: { id: tenantId }, select: { name: true, account_number: true, tier: true } }),
    p().queryRecord.findFirst({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, select: { created_at: true } }),
    p().trainingEnrollment.findFirst({ where: { tenant_id: tenantId, user_id: userId, completed_at: { not: null } }, orderBy: { completed_at: 'desc' }, select: { completed_at: true } }),
    p().userSignIn.findFirst({ where: { user_id: userId, success: true }, orderBy: { at: 'desc' }, select: { at: true } }).catch(() => null),
  ])
  const times = [user.last_login_at, lastQuery?.created_at, lastDone?.completed_at, lastSignIn?.at].filter(Boolean).map((d: any) => new Date(d).getTime())
  const lastActive = times.length ? new Date(Math.max(...times)) : null
  const age = lastActive ? (Date.now() - lastActive.getTime()) / DAY : null
  const label = !user.first_login_at ? 'Never signed in' : age === null ? 'No activity' : age <= 7 ? 'Active this week' : age <= 30 ? 'Occasional' : 'Dormant'
  return {
    user: { id: user.id, name: user.name, email: user.email, role: user.role, job_role: user.job_role, phone_number: user.phone_number, is_active: user.is_active, is_agency: !!user.is_agency, agency_name: user.agency_name ?? null, created_at: iso(user.created_at), first_login_at: iso(user.first_login_at), last_login_at: iso(user.last_login_at), first_language: user.first_language, second_language: user.second_language },
    tenant: { id: tenantId, name: tenant?.name ?? '', account_number: tenant?.account_number ?? '', tier: tenant?.tier ?? '' },
    activity: { label, last_active_at: iso(lastActive) },
  }
}

const trainingItems = (list: any[], remindBy: Map<string, any>) => (list ?? []).map((i) => ({
  enrollment_id: i.enrollment_id, module_name: i.module_name, category: i.category, source: i.source, tier: i.tier, status: i.status, score: i.score ?? null,
  assigned_at: iso(i.assigned_at), completed_at: iso(i.completed_at), due_date: iso(i.due_date), expires_at: iso(i.expires_at), overdue: !!i.overdue, due_soon: !!i.due_soon,
  cpd_accredited: !!i.cpd_accredited, cpd_hours: i.cpd_hours ?? null, certificate_url: i.certificate_url ?? null, requires_practical: !!i.requires_practical, practical_signed: !!i.practical_signed, renewal_count: i.renewal_count ?? 0,
  reminders_sent: remindBy.get(i.enrollment_id)?.reminder_count ?? 0, last_reminded_at: iso(remindBy.get(i.enrollment_id)?.last_reminded_at),
}))

async function reminderMap(tenantId: string, userId: string) {
  const rows = await p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: userId }, select: { id: true, last_reminded_at: true, reminder_count: true } })
  return new Map<string, any>((rows as any[]).map((r) => [r.id, r]))
}

// ─── supervision / appraisal / credentials (shared with the certificates tab) ───
async function workforceAllowed(tenantId: string): Promise<boolean> {
  try { const { getPlanFeatures } = await import('./plan-limits'); const f = await (getPlanFeatures as any)(tenantId); return !!f?.has_workforce_compliance } catch { return true }
}
async function credentials(tenantId: string, userId: string) {
  const rows = await p().staffCredential.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' } })
  const now = Date.now()
  return (rows as any[]).map((c) => ({ id: c.id, type: c.type, reference: c.reference, issued_at: iso(c.issued_at), expires_at: iso(c.expires_at), expired: !!c.expires_at && new Date(c.expires_at).getTime() < now, expires_soon: !!c.expires_at && new Date(c.expires_at).getTime() >= now && new Date(c.expires_at).getTime() < now + 60 * DAY, notes: c.notes, evidence_name: c.evidence_name, evidence_type: c.evidence_type, evidence_uploaded_at: iso(c.evidence_uploaded_at) }))
}

export async function profileTab(tenantId: string, userId: string, tab: ProfileTab, opts: { page?: number } = {}): Promise<any> {
  const user = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { id: true, name: true, first_language: true, second_language: true, comms_always_first_language: true, allow_language_switching: true } })
  if (!user) return null

  if (tab === 'training' || tab === 'certificates' || tab === 'overview' || tab === 'onboarding' || tab === 'cqc') {
    const rec = await buildStaffRecord(tenantId, userId, { includeTeam: false, includeReading: true })
    if (!rec) return null
    const remindBy = await reminderMap(tenantId, userId)
    const tr = trainingItems(rec.training.items, remindBy), an = trainingItems(rec.annual_training.items, remindBy)

    if (tab === 'training') {
      const done = [...tr, ...an].filter((i) => i.status === 'complete')
      return {
        training: { summary: rec.training.summary, items: tr }, annual: { summary: rec.annual_training.summary, items: an }, required: rec.required_training,
        cpd: { completed: done.filter((i) => i.cpd_accredited).length, hours: Math.round(done.filter((i) => i.cpd_accredited).reduce((n, i) => n + (i.cpd_hours ?? 0), 0) * 10) / 10 },
        reminders: { manual_total: [...remindBy.values()].reduce((n, r) => n + (r.reminder_count ?? 0), 0) },
        reading: rec.reading ?? null,
      }
    }
    if (tab === 'cqc') return { cqc: rec.cqc_prep, follow_up: rec.follow_up ?? null }
    if (tab === 'onboarding') return { onboarding: rec.onboarding, induction_questions: rec.induction_questions ?? null, face_to_face: rec.face_to_face, face_to_face_certificates: rec.certificates }
    if (tab === 'certificates') {
      const trainingCerts = [...tr, ...an].filter((i) => i.status === 'complete').map((i) => ({ module_name: i.module_name, kind: i.source === 'ai_generated' ? 'Annual' : 'Training', completed_at: i.completed_at, expires_at: i.expires_at, score_pct: i.score?.pct ?? null, cpd_accredited: i.cpd_accredited, cpd_hours: i.cpd_hours, certificate_url: i.certificate_url }))
      return { training_certificates: trainingCerts, face_to_face_certificates: rec.certificates, credentials: await credentials(tenantId, userId) }
    }
    // overview: headline numbers for every area
    const [runs, actions, chatTotals, supCount, lastSignIn, signIns, pushCount] = await Promise.all([
      p().auditRun.count({ where: { tenant_id: tenantId, OR: [{ submitted_by: userId }, { submitted_by: user.name }, { auditor_name: { equals: user.name, mode: 'insensitive' } }] } }),
      p().auditAction.count({ where: { tenant_id: tenantId, assigned_user_id: userId, status: { not: 'done' } } }).catch(() => 0),
      p().queryRecord.aggregate({ where: { tenant_id: tenantId, user_id: userId }, _count: { _all: true } }),
      p().staffSupervision.count({ where: { tenant_id: tenantId, user_id: userId } }).catch(() => 0),
      p().userSignIn.findFirst({ where: { user_id: userId, success: true }, orderBy: { at: 'desc' } }).catch(() => null),
      p().userSignIn.count({ where: { user_id: userId } }).catch(() => 0),
      p().pushSubscription.count({ where: { tenant_id: tenantId, user_id: userId } }).catch(() => 0),
    ])
    const noMatch = await p().queryRecord.count({ where: { tenant_id: tenantId, user_id: userId, no_match: true } })
    const sign = await p().userSignIn.findMany({ where: { user_id: userId, success: true }, orderBy: { at: 'desc' }, take: 8 }).catch(() => [])
    const timeline = [...rec.timeline, ...(sign as any[]).map((s) => ({ at: iso(s.at), type: 'sign_in', label: `Signed in from ${[s.city, s.country].filter(Boolean).join(', ') || 'an unknown place'}${s.device ? ` on ${s.device}` : ''}${s.client && s.client !== 'web' && s.client !== 'unknown' ? ` (${s.client.replace('_', ' ')})` : ''}` }))]
      .filter((e) => e.at).sort((a, b) => new Date(b.at as string).getTime() - new Date(a.at as string).getTime()).slice(0, 30)
    return {
      counts: {
        training: { assigned: rec.training.summary.assigned + rec.annual_training.summary.assigned, completed: rec.training.summary.completed + rec.annual_training.summary.completed, overdue: rec.training.summary.overdue + rec.annual_training.summary.overdue },
        audits: { scheduled_open: rec.audit_assignments?.summary?.open ?? 0, scheduled_overdue: rec.audit_assignments?.summary?.overdue ?? 0, carried_out: runs, actions_open: actions },
        cqc: { assigned: rec.cqc_prep.assigned, answered: rec.cqc_prep.answered },
        onboarding: { assigned: rec.onboarding.summary.assigned ?? 0, completed: rec.onboarding.summary.completed ?? 0 },
        face_to_face: rec.face_to_face.summary,
        supervisions: supCount,
        chats: { total: chatTotals._count._all, last_30_days: rec.engagement.queries_30d, no_match: noMatch },
        certificates: { face_to_face: rec.certificates.count, training: [...tr, ...an].filter((i) => i.status === 'complete').length },
        access: { sign_ins: signIns, last_sign_in: iso(lastSignIn?.at), push_devices: pushCount },
      },
      flags: rec.flags, timeline, engagement: rec.engagement,
    }
  }

  if (tab === 'audits') {
    const [assignments, runs, actions] = await Promise.all([
      listAssignments(tenantId, { userId }).catch(() => [] as any[]),
      p().auditRun.findMany({ where: { tenant_id: tenantId, OR: [{ submitted_by: userId }, { submitted_by: user.name }, { auditor_name: { equals: user.name, mode: 'insensitive' } }] }, orderBy: { audit_month: 'desc' }, take: 200, select: { id: true, audit_month: true, status: true, completed_at: true, submitted_at: true, approval_status: true, approved_by_name: true, approved_at: true, subject_room: true, shift: true, template: { select: { name: true } } } }),
      p().auditAction.findMany({ where: { tenant_id: tenantId, assigned_user_id: userId }, orderBy: [{ status: 'asc' }, { due_date: 'asc' }], take: 300, select: { id: true, description: true, priority: true, due_date: true, status: true, done_at: true, completion_note: true, source: true, extension_status: true, verified_result: true, created_at: true, run: { select: { audit_month: true, template: { select: { name: true } } } } } }).catch(() => []),
    ])
    const now = Date.now()
    return {
      assignments: { items: (assignments as any[]).map((a) => ({ ...a, due_date: iso(a.due_date), completed_at: iso(a.completed_at) })), summary: { open: (assignments as any[]).filter((a) => a.status === 'open').length, overdue: (assignments as any[]).filter((a) => a.overdue).length, completed: (assignments as any[]).filter((a) => a.status === 'completed').length, missed: (assignments as any[]).filter((a) => a.status === 'missed').length } },
      runs: { items: (runs as any[]).map((r) => ({ id: r.id, audit: r.template?.name ?? 'Audit', month: iso(r.audit_month), status: r.status, completed_at: iso(r.completed_at), submitted_at: iso(r.submitted_at), approval_status: r.approval_status, approved_by: r.approved_by_name, approved_at: iso(r.approved_at), room: r.subject_room, shift: r.shift })), total: (runs as any[]).length },
      actions: { items: (actions as any[]).map((a) => ({ id: a.id, description: a.description, priority: a.priority, status: a.status, due_date: iso(a.due_date), overdue: a.status !== 'done' && !!a.due_date && new Date(a.due_date).getTime() < now, done_at: iso(a.done_at), completion_note: a.completion_note, source: a.source, extension_status: a.extension_status, verified_result: a.verified_result, audit: a.run?.template?.name ?? null, audit_month: iso(a.run?.audit_month) })), open: (actions as any[]).filter((a) => a.status !== 'done').length },
    }
  }

  if (tab === 'supervision') {
    const allowed = await workforceAllowed(tenantId)
    const [sups, acts, creds] = await Promise.all([
      p().staffSupervision.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { held_on: 'desc' } }).catch(() => []),
      p().supervisionAction.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' } }).catch(() => []),
      credentials(tenantId, userId),
    ])
    const map = (s: any) => ({ id: s.id, type: s.type, held_on: iso(s.held_on), conducted_by: s.conducted_by, status: s.status, completed_at: iso(s.completed_at), next_due: iso(s.next_due), notes: s.notes, form: s.form ?? null })
    const all = (sups as any[]).map(map)
    return {
      available_on_plan: allowed, workforce_url: '/workforce',
      supervisions: all.filter((s) => s.type === 'supervision'), appraisals: all.filter((s) => s.type === 'appraisal'),
      actions: (acts as any[]).map((a) => ({ id: a.id, supervision_id: a.supervision_id, description: a.description, status: a.status, done_at: iso(a.done_at), created_at: iso(a.created_at) })),
      credentials: creds,
    }
  }

  if (tab === 'chats') {
    const page = Math.max(1, opts.page ?? 1), PAGE = 150
    const [rows, total, noMatchRows, langCounts, switches] = await Promise.all([
      p().queryRecord.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, skip: (page - 1) * PAGE, take: PAGE, select: { id: true, channel: true, query_text: true, response_text: true, intent_type: true, document_category_queried: true, policy_ids_cited: true, no_match: true, language_detected: true, response_time_ms: true, chat_session_id: true, chat_deleted_at: true, feedback: true, created_at: true } }),
      p().queryRecord.count({ where: { tenant_id: tenantId, user_id: userId } }),
      p().queryRecord.findMany({ where: { tenant_id: tenantId, user_id: userId, no_match: true }, orderBy: { created_at: 'desc' }, take: 100, select: { id: true, query_text: true, document_category_queried: true, created_at: true, channel: true, chat_deleted_at: true } }),
      p().queryRecord.groupBy({ by: ['language_detected'], where: { tenant_id: tenantId, user_id: userId }, _count: { _all: true } }),
      p().languageSwitchEvent.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, take: 60 }).catch(() => []),
    ])
    const policyIds = [...new Set((rows as any[]).flatMap((r) => r.policy_ids_cited ?? []))]
    const pols = policyIds.length ? await p().policy.findMany({ where: { id: { in: policyIds }, tenant_id: tenantId }, select: { id: true, filename: true } }).catch(() => []) : []
    const title = new Map<string, string>((pols as any[]).map((x) => [x.id, String(x.filename).replace(/\.[a-z0-9]+$/i, '').replace(/[_-]+/g, ' ').trim()]))
    const messages = (rows as any[]).map((r) => ({ id: r.id, at: iso(r.created_at), channel: r.channel, question: r.query_text, answer: r.response_text, intent: r.intent_type, category: r.document_category_queried, policies: (r.policy_ids_cited ?? []).map((id: string) => title.get(id) ?? 'A policy'), no_match: !!r.no_match, language: r.language_detected, seconds: r.response_time_ms ? Math.round(r.response_time_ms / 100) / 10 : null, session: r.chat_session_id, deleted_by_staff: !!r.chat_deleted_at, deleted_at: iso(r.chat_deleted_at), feedback: r.feedback }))
    return {
      total, page, page_size: PAGE, has_more: page * PAGE < total, messages,
      deleted_count: messages.filter((m) => m.deleted_by_staff).length,
      knowledge_gaps: (noMatchRows as any[]).map((r) => ({ id: r.id, at: iso(r.created_at), question: r.query_text, category: r.document_category_queried, channel: r.channel, deleted_by_staff: !!r.chat_deleted_at })),
      languages: {
        first: user.first_language, second: user.second_language, comms_in_first_language: !!user.comms_always_first_language, switching_allowed: !!user.allow_language_switching,
        used_in_chats: (langCounts as any[]).map((l) => ({ language: l.language_detected, count: l._count._all })).sort((a, b) => b.count - a.count),
        switches: (switches as any[]).map((s) => ({ at: iso(s.created_at), area: s.area, set: s.set_name, language: s.lang_name ?? s.lang })),
      },
    }
  }

  if (tab === 'access') {
    const [signIns, push, acks, reads] = await Promise.all([
      p().userSignIn.findMany({ where: { user_id: userId }, orderBy: { at: 'desc' }, take: 300 }).catch(() => []),
      p().pushSubscription.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { created_at: 'desc' }, select: { id: true, user_agent: true, created_at: true, last_used_at: true } }).catch(() => []),
      p().legalAcknowledgement.findMany({ where: { tenant_id: tenantId, user_id: userId }, orderBy: { acknowledged_at: 'desc' }, take: 50 }).catch(() => []),
      p().policyReadSession.count({ where: { tenant_id: tenantId, user_id: userId } }).catch(() => 0),
    ])
    const rows = signIns as any[], ok = rows.filter((r) => r.success)
    const devices = new Map<string, any>()
    for (const r of ok) { const k = `${r.device ?? 'Unknown device'}|${r.client}`; const d = devices.get(k) ?? { device: r.device ?? 'Unknown device', client: r.client, first_seen: r.at, last_seen: r.at, sign_ins: 0, last_ip: r.ip, last_place: [r.city, r.country].filter(Boolean).join(', ') }; d.sign_ins++; if (new Date(r.at) < new Date(d.first_seen)) d.first_seen = r.at; devices.set(k, d) }
    const ips = new Map<string, any>(); for (const r of ok) { if (!r.ip) continue; const x = ips.get(r.ip) ?? { ip: r.ip, place: [r.city, r.country].filter(Boolean).join(', '), count: 0, last_seen: r.at }; x.count++; ips.set(r.ip, x) }
    const appSignal = ok.find((r) => r.client === 'android_app' || r.client === 'ios_app' || r.client === 'installed_web')
    return {
      summary: { sign_ins: ok.length, failed: rows.length - ok.length, distinct_ips: ips.size, distinct_devices: devices.size, first_recorded: iso(rows.length ? rows[rows.length - 1].at : null), last_sign_in: iso(ok[0]?.at) },
      hub_installed: { installed: !!appSignal || (push as any[]).length > 0, via: appSignal ? appSignal.client : (push as any[]).length ? 'push_notifications' : null, last_seen: iso(appSignal?.at ?? (push as any[])[0]?.last_used_at ?? (push as any[])[0]?.created_at), note: 'We cannot see an install directly. This is true when they have opened CareStream as an installed app, used the Android app, or switched on push notifications on a device.' },
      sign_ins: rows.slice(0, 100).map((r) => ({ at: iso(r.at), success: r.success, method: r.method, failure_reason: r.failure_reason, ip: r.ip, place: [r.city, r.region, r.country].filter(Boolean).join(', '), device: r.device, client: r.client })),
      devices: [...devices.values()].map((d) => ({ ...d, first_seen: iso(d.first_seen), last_seen: iso(d.last_seen) })),
      ips: [...ips.values()].map((i) => ({ ...i, last_seen: iso(i.last_seen) })).sort((a, b) => b.count - a.count),
      push_devices: (push as any[]).map((s) => ({ id: s.id, device: describeDevice(s.user_agent) ?? 'Unknown device', registered_at: iso(s.created_at), last_used_at: iso(s.last_used_at) })),
      acknowledgements: (acks as any[]).map((a) => ({ kind: a.kind, version: a.disclaimer_version, at: iso(a.acknowledged_at) })),
      policies_read_sessions: reads, recording_started: '16 November 2026',
    }
  }
  return null
}
