// Weekly training reminders: loads who has training outstanding, applies the rules in weeklyReminderLogic.ts, sends, and logs.
// Scheduled every Monday through the same pg_cron scheduler as the other jobs (GET /cron/training-weekly-reminders).
//
// Modes (all authenticated by the cron secret):
//   live      the scheduled run: sends to staff and admins, writes a log row per email (the unique key stops a second send in the same week)
//   preview   renders everything for ONE account and sends it only to `previewTo`, with the real recipient named in the subject.
//             Writes no log rows and creates no sign in links, so it can be repeated without affecting anyone
//   dryRun    works out who would get what and sends nothing
import { prisma } from '../../db/client'
import sgMail from '@sendgrid/mail'
import '../../lib/email-guard'   // never email reserved fictional domains (example.com and similar)
import { siteUrl } from '../../lib/urls'
import { createLoginLink } from '../../lib/login-tokens'
import { londonWeekStart, planTenant, type TenantFacts, type UserFacts, type StaffPlan, type DigestPlan, type OutstandingItem } from './weeklyReminderLogic'
import { renderStaffEmail, renderAdminDigest, type Rendered } from './weeklyReminderEmails'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const MAGIC_TTL_MS = 7 * 24 * 3600_000
const LOG_WINDOW_DAYS = 120

export type RunOptions = { now?: Date; tenantId?: string; previewTo?: string; dryRun?: boolean; previewStaffLimit?: number; previewUserIds?: string[] }
export type RunResult = {
  mode: 'live' | 'preview' | 'dry'; week_start: string; tenants: number
  staff_sent: number; digests_sent: number; skipped: number; failed: number; paused: number
  errors: string[]; sample: Array<{ kind: string; to: string; subject: string }>
}

async function send(to: string, r: Rendered, prefix = ''): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) throw new Error('Email is not configured')
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const from = process.env.SENDGRID_FROM_ADDRESS ?? process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  await (sgMail as any).send({ to, from, subject: `${prefix}${r.subject}`, html: r.html, text: r.text })
}

/** Everything the rules need, for the accounts asked for. Batched: a handful of queries however many accounts there are. */
async function loadFacts(tenantId?: string, now: Date = new Date()): Promise<TenantFacts[]> {
  const p = prisma as any
  const tenants: any[] = await p.tenant.findMany({
    where: { ...(tenantId ? { id: tenantId } : {}), subscription_status: { not: 'cancelled' }, closure_requested_at: null },
    select: { id: true, name: true, email_preferences: true, feature_flags: true },
  })
  const live = tenants.filter((t) => !(t.feature_flags as any)?.is_test)
  const ids = live.map((t) => t.id)
  if (!ids.length) return []
  const since = new Date(now.getTime() - LOG_WINDOW_DAYS * 86_400_000)
  const week = new Date(now.getTime() - 7 * 86_400_000)
  const [users, enrolments, logs] = await Promise.all([
    p.user.findMany({ where: { tenant_id: { in: ids } }, select: { id: true, tenant_id: true, name: true, email: true, role: true, is_active: true, is_reviewer: true, is_agency: true, agency_end: true, first_login_at: true, last_login_at: true } }),
    p.trainingEnrollment.findMany({ where: { tenant_id: { in: ids } }, select: { user_id: true, status: true, due_date: true, completed_at: true, module: { select: { name: true, category: true, source: true, is_active: true } } } }),
    p.trainingReminderLog.findMany({ where: { tenant_id: { in: ids }, kind: 'staff_weekly', created_at: { gte: since } }, select: { user_id: true, created_at: true } }),
  ])
  const byUser = new Map<string, UserFacts>()
  for (const u of users as any[]) byUser.set(u.id, { id: u.id, name: u.name, email: u.email, role: u.role, is_active: u.is_active !== false, is_reviewer: !!u.is_reviewer, is_agency: !!u.is_agency, agency_end: u.agency_end ? new Date(u.agency_end) : null, first_login_at: u.first_login_at ? new Date(u.first_login_at) : null, last_login_at: u.last_login_at ? new Date(u.last_login_at) : null, items: [], assigned_total: 0, completed_total: 0, completed_7d: 0, last_completed_at: null, sent_weekly: [] })
  for (const e of enrolments as any[]) {
    const u = byUser.get(e.user_id); if (!u) continue
    if (e.module && e.module.is_active === false) continue
    u.assigned_total++
    if (e.status === 'complete') {
      u.completed_total++
      const c = e.completed_at ? new Date(e.completed_at) : null
      if (c) { if (c >= week) u.completed_7d++; if (!u.last_completed_at || c > u.last_completed_at) u.last_completed_at = c }
    } else if (e.status === 'not_started' || e.status === 'in_progress') {
      u.items.push({ module_name: e.module?.name ?? 'Training module', category: e.module?.category ?? 'statutory', source: e.module?.source ?? 'manual', status: e.status, due_date: e.due_date ? new Date(e.due_date) : null } as OutstandingItem)
    }
  }
  for (const l of logs as any[]) byUser.get(l.user_id)?.sent_weekly.push(new Date(l.created_at))
  const byTenant = new Map<string, UserFacts[]>(); for (const u of users as any[]) { if (!byTenant.has(u.tenant_id)) byTenant.set(u.tenant_id, []); byTenant.get(u.tenant_id)!.push(byUser.get(u.id)!) }
  return live.map((t) => ({ id: t.id, name: t.name, reminders_enabled: (t.email_preferences as any)?.weekly_training_reminders !== false, users: byTenant.get(t.id) ?? [] }))
}

export async function runWeeklyTrainingReminders(opts: RunOptions = {}): Promise<RunResult> {
  const now = opts.now ?? new Date()
  const preview = !!opts.previewTo
  const res: RunResult = { mode: opts.dryRun ? 'dry' : preview ? 'preview' : 'live', week_start: londonWeekStart(now), tenants: 0, staff_sent: 0, digests_sent: 0, skipped: 0, failed: 0, paused: 0, errors: [], sample: [] }
  if (preview && !opts.tenantId) throw new Error('A preview needs a tenantId, so it cannot be sent for every account at once.')
  const base = siteUrl()
  const facts = await loadFacts(opts.tenantId, now)
  res.tenants = facts.length
  let staffShown = 0, digestsShown = 0

  const deliver = async (kind: 'staff_weekly' | 'admin_digest', plan: StaffPlan | DigestPlan, tenantId: string): Promise<void> => {
    const isStaff = kind === 'staff_weekly'
    // a person who has never signed in gets a one tap link (never in a preview: no token is created)
    let magicUrl: string | undefined
    if (isStaff && (plan as StaffPlan).never_signed_in && !preview && !opts.dryRun) magicUrl = await createLoginLink(plan.user_id, tenantId, MAGIC_TTL_MS).catch(() => undefined)
    const r = isStaff ? renderStaffEmail(plan as StaffPlan, { magicUrl }) : renderAdminDigest(plan as DigestPlan)
    res.sample.push({ kind, to: plan.to, subject: r.subject })
    if (opts.dryRun) { isStaff ? res.staff_sent++ : res.digests_sent++; return }
    if (preview) { await send(opts.previewTo as string, r, `[Preview for ${plan.first_name} <${plan.to}>] `); isStaff ? res.staff_sent++ : res.digests_sent++; return }
    // claim this person's slot for the week first: if another run got there already, the unique key refuses and nothing is sent twice
    try {
      await (prisma as any).trainingReminderLog.create({ data: { tenant_id: tenantId, user_id: plan.user_id, kind, week_start: new Date(`${res.week_start}T00:00:00Z`), email_to: plan.to, outstanding: isStaff ? (plan as StaffPlan).outstanding : (plan as DigestPlan).summary.outstanding_total, overdue: isStaff ? (plan as StaffPlan).overdue : (plan as DigestPlan).summary.overdue_total, never_signed_in: isStaff ? (plan as StaffPlan).never_signed_in : false } })
    } catch (e: any) { if (e?.code === 'P2002') { res.skipped++; return } throw e }
    try { await send(plan.to, r); isStaff ? res.staff_sent++ : res.digests_sent++ }
    catch (e: any) {
      // release the slot so a rerun can try again, and report it
      await (prisma as any).trainingReminderLog.deleteMany({ where: { user_id: plan.user_id, kind, week_start: new Date(`${res.week_start}T00:00:00Z`) } }).catch(() => {})
      res.failed++; res.errors.push(`${kind} to ${plan.to}: ${String(e?.message ?? e).slice(0, 120)}`)
    }
  }

  for (const t of facts) {
    const plan = planTenant(t, base, now)
    res.skipped += plan.skipped.length
    res.paused += plan.skipped.filter((s) => /^paused/.test(s.reason)).length
    for (const s of plan.staff) {
      // a preview can be narrowed to named people (?users=id1,id2); otherwise it shows the first few
      if (preview && opts.previewUserIds?.length && !opts.previewUserIds.includes(s.user_id)) { res.skipped++; continue }
      if (preview && staffShown >= (opts.previewStaffLimit ?? 3)) { res.skipped++; continue }
      staffShown++
      try { await deliver('staff_weekly', s, t.id) } catch (e: any) { res.failed++; res.errors.push(`staff ${s.to}: ${String(e?.message ?? e).slice(0, 120)}`) }
    }
    for (const d of plan.digests) {
      // a preview shows one digest, not one per administrator
      if (preview && digestsShown >= 1) { res.skipped++; continue }
      digestsShown++
      try { await deliver('admin_digest', d, t.id) } catch (e: any) { res.failed++; res.errors.push(`digest ${d.to}: ${String(e?.message ?? e).slice(0, 120)}`) }
    }
  }
  return res
}
