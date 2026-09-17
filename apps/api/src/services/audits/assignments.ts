// Scheduled audits: an audit assigned to a named person with a due date, optionally repeating.
//
//  - Starting an audit links the run to the matching open assignment (explicitly from "Start", or
//    automatically for the same audit and subject).
//  - Completing the run completes the assignment and, if it repeats, creates the next one.
//  - A repeating assignment that is still open when its next one falls due is marked missed and the
//    next one is created, so a skipped audit is visible rather than silently rolled forward.
//  - The daily audit-reminders job sends "due soon" and "overdue" emails to the assignee, escalates
//    to managers after the home's chosen number of days, and sends the home's audit summary.

import { prisma } from '../../db/client'
import { notifyUsers } from '../../lib/notify'
import { sendAuditUpdateEmail } from '../email/outbound'
import { siteUrl } from '../../lib/urls'

export const REPEATS = ['none', 'daily', 'weekly', 'monthly', 'quarterly'] as const
const DAY = 86_400_000
const db = prisma as any

const esc = (s: any) => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string))
const fmt = (d: Date | string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })

export function startOfDayUTC(d: Date): Date {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()))
}

function addMonthsUTC(d: Date, n: number): Date {
  const y = d.getUTCFullYear(), m = d.getUTCMonth(), day = d.getUTCDate()
  const target = new Date(Date.UTC(y, m + n, 1))
  const last = new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth() + 1, 0)).getUTCDate()
  return new Date(Date.UTC(target.getUTCFullYear(), target.getUTCMonth(), Math.min(day, last)))
}

// One step on from a due date.
export function stepDue(due: Date, repeat: string): Date | null {
  const d = startOfDayUTC(due)
  if (repeat === 'daily') return new Date(d.getTime() + DAY)
  if (repeat === 'weekly') return new Date(d.getTime() + 7 * DAY)
  if (repeat === 'monthly') return addMonthsUTC(d, 1)
  if (repeat === 'quarterly') return addMonthsUTC(d, 3)
  return null
}

// The next due date after completing: keeps the cadence from the original due date, rolled forward
// past today so a late completion does not create one that is already overdue.
export function nextDueAfterCompletion(due: Date, repeat: string, today = startOfDayUTC(new Date())): Date | null {
  let next = stepDue(due, repeat)
  let guard = 0
  while (next && next.getTime() < today.getTime() && guard++ < 1000) next = stepDue(next, repeat)
  return next
}

export async function assignmentSettings(tenantId: string): Promise<{ escalate_after_days: number; summary: 'off' | 'daily' | 'weekly' }> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { organisation_details: true } })
  const od = (t?.organisation_details ?? {}) as Record<string, string>
  const days = parseInt(od.audit_escalate_after_days ?? '2', 10)
  const summary = od.audit_summary === 'off' || od.audit_summary === 'daily' ? od.audit_summary : 'weekly'
  return { escalate_after_days: Number.isFinite(days) && days >= 0 ? days : 2, summary }
}

export function isOverdue(a: { status: string; due_date: Date | string }, today = startOfDayUTC(new Date())): boolean {
  return a.status === 'open' && new Date(a.due_date).getTime() < today.getTime()
}

// Assignments with the audit, assignee and linked run filled in.
export async function listAssignments(tenantId: string, opts: { ids?: string[]; userId?: string; statuses?: string[]; from?: Date; to?: Date; take?: number } = {}) {
  const rows = await db.auditAssignment.findMany({
    where: {
      tenant_id: tenantId,
      ...(opts.ids ? { id: { in: opts.ids } } : {}),
      ...(opts.userId ? { assigned_user_id: opts.userId } : {}),
      ...(opts.statuses?.length ? { status: { in: opts.statuses } } : {}),
      ...(opts.from || opts.to ? { due_date: { ...(opts.from ? { gte: opts.from } : {}), ...(opts.to ? { lte: opts.to } : {}) } } : {}),
    },
    include: { template: { select: { id: true, name: true, subject_scope: true, frequency: true } } },
    orderBy: { due_date: 'asc' },
    take: opts.take ?? 500,
  })
  const userIds = [...new Set((rows as any[]).map(r => r.assigned_user_id))]
  const runIds = (rows as any[]).map(r => r.run_id).filter(Boolean)
  const [users, runs] = await Promise.all([
    userIds.length ? db.user.findMany({ where: { id: { in: userIds } }, select: { id: true, name: true, job_role: true } }) : [],
    runIds.length ? db.auditRun.findMany({ where: { id: { in: runIds } }, select: { id: true, status: true, completed_at: true } }) : [],
  ])
  const userBy = new Map((users as any[]).map(u => [u.id, u]))
  const runBy = new Map((runs as any[]).map(r => [r.id, r]))
  const today = startOfDayUTC(new Date())
  return (rows as any[]).map(r => ({
    id: r.id, template_id: r.template_id, template_name: r.template?.name ?? 'Audit', subject_scope: r.template?.subject_scope ?? 'none',
    assigned_user_id: r.assigned_user_id, assigned_name: userBy.get(r.assigned_user_id)?.name ?? 'Former staff member',
    assigned_role: userBy.get(r.assigned_user_id)?.job_role ?? null,
    subject: r.subject, subject_room: r.subject_room, due_date: r.due_date, repeat: r.repeat, status: r.status,
    overdue: isOverdue(r, today),
    days_overdue: isOverdue(r, today) ? Math.round((today.getTime() - startOfDayUTC(new Date(r.due_date)).getTime()) / DAY) : 0,
    run_id: r.run_id, run_status: r.run_id ? (runBy.get(r.run_id)?.status ?? null) : null,
    completed_at: r.completed_at, escalated_at: r.escalated_at, notes: r.notes, created_at: r.created_at,
  }))
}

// A staff member (not an admin) can only open audits allocated to them, so assigning one allocates it.
export async function ensureAllocated(tenantId: string, userId: string, templateId: string): Promise<void> {
  const u = await db.user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { role: true, audit_template_ids: true } })
  if (!u || u.role === 'admin') return
  const ids: string[] = u.audit_template_ids ?? []
  if (!ids.includes(templateId)) await db.user.update({ where: { id: userId }, data: { audit_template_ids: [...ids, templateId] } })
}

// Link a newly started run to the open assignment it fulfils.
export async function linkRunToAssignment(tenantId: string, run: { id: string; template_id: string; room_number?: string | null }, assignmentId?: string | null): Promise<string | null> {
  let target: any = null
  if (assignmentId) {
    target = await db.auditAssignment.findFirst({ where: { id: assignmentId, tenant_id: tenantId, template_id: run.template_id, status: 'open' } })
  }
  if (!target) {
    // Otherwise the earliest open, unlinked assignment for the same audit (and subject, if it has one).
    const open = await db.auditAssignment.findMany({
      where: { tenant_id: tenantId, template_id: run.template_id, status: 'open', run_id: null },
      orderBy: { due_date: 'asc' },
    })
    target = (open as any[]).find(a => !a.subject || !run.room_number || a.subject.trim().toLowerCase() === String(run.room_number).trim().toLowerCase()) ?? null
  }
  if (!target) return null
  if (target.run_id && target.run_id !== run.id) return target.id
  await db.auditAssignment.update({ where: { id: target.id }, data: { run_id: run.id } })
  return target.id
}

// The run was completed: complete its assignment(s) and schedule the next occurrence.
export async function completeAssignmentsForRun(tenantId: string, runId: string): Promise<void> {
  const linked = await db.auditAssignment.findMany({ where: { tenant_id: tenantId, run_id: runId, status: 'open' } })
  for (const a of linked as any[]) {
    await db.auditAssignment.update({ where: { id: a.id }, data: { status: 'completed', completed_at: new Date() } })
    await createNextOccurrence(a, nextDueAfterCompletion(new Date(a.due_date), a.repeat))
  }
}

async function createNextOccurrence(a: any, due: Date | null): Promise<void> {
  if (!due) return
  const exists = await db.auditAssignment.findFirst({ where: { previous_id: a.id } })
  if (exists) return
  await db.auditAssignment.create({
    data: {
      tenant_id: a.tenant_id, template_id: a.template_id, assigned_user_id: a.assigned_user_id,
      subject: a.subject, subject_room: a.subject_room, due_date: due, repeat: a.repeat,
      previous_id: a.id, notes: a.notes, created_by: a.created_by,
    },
  })
}

function assignmentLine(a: any) {
  const subject = a.subject ? ` (${esc(a.subject)})` : ''
  return `<strong>${esc(a.template_name)}</strong>${subject}`
}

function button(label: string, path: string) {
  return `<p style="margin:20px 0 0"><a href="${siteUrl()}${path}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">${label}</a></p>`
}

// Daily: missed occurrences, due-soon and overdue reminders, escalation, and the summary.
export async function processAssignmentsForTenant(tenant: { id: string; name: string }): Promise<{ emails: number }> {
  const today = startOfDayUTC(new Date())
  const settings = await assignmentSettings(tenant.id)
  let emails = 0

  // 1. A repeating assignment still open when the next one falls due is missed.
  const openRepeating = await db.auditAssignment.findMany({ where: { tenant_id: tenant.id, status: 'open', repeat: { not: 'none' }, due_date: { lt: today } } })
  for (const a of openRepeating as any[]) {
    const next = stepDue(new Date(a.due_date), a.repeat)
    if (next && next.getTime() <= today.getTime()) {
      await db.auditAssignment.update({ where: { id: a.id }, data: { status: 'missed' } })
      await createNextOccurrence(a, nextDueAfterCompletion(new Date(a.due_date), a.repeat, today))
    }
  }

  const open = await listAssignments(tenant.id, { statuses: ['open'], to: new Date(today.getTime() + 3 * DAY) })
  const rows = await db.auditAssignment.findMany({ where: { id: { in: open.map(a => a.id) } }, select: { id: true, reminded_at: true, overdue_notified_at: true, escalated_at: true } })
  const flags = new Map((rows as any[]).map(r => [r.id, r]))

  // 2. Due within two days: remind the assignee once.
  for (const a of open.filter(x => !x.overdue && new Date(x.due_date).getTime() <= today.getTime() + 2 * DAY && !flags.get(x.id)?.reminded_at)) {
    await notifyUsers(tenant.id, 'audit_updates', [a.assigned_user_id], (email, name) => sendAuditUpdateEmail({
      to: email, name, orgName: tenant.name, subject: `Audit due ${fmt(a.due_date)}: ${a.template_name}`,
      bodyHtml: `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0">${assignmentLine(a)} is assigned to you and is due on <strong>${fmt(a.due_date)}</strong>.</p>${button('Open your audits', '/chat')}`,
    }))
    await db.auditAssignment.update({ where: { id: a.id }, data: { reminded_at: new Date() } })
    emails++
  }

  // 3. Overdue: tell the assignee once, then escalate to managers after the home's chosen days.
  const managers = await db.user.findMany({ where: { tenant_id: tenant.id, is_active: true, OR: [{ role: 'admin' }, { job_role: { contains: 'manager', mode: 'insensitive' } }] }, select: { id: true } })
  const managerIds = (managers as any[]).map(m => m.id)
  for (const a of open.filter(x => x.overdue)) {
    const f = flags.get(a.id)
    if (!f?.overdue_notified_at) {
      await notifyUsers(tenant.id, 'audit_updates', [a.assigned_user_id], (email, name) => sendAuditUpdateEmail({
        to: email, name, orgName: tenant.name, subject: `Overdue audit: ${a.template_name}`,
        bodyHtml: `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0">${assignmentLine(a)} was due on <strong>${fmt(a.due_date)}</strong> and has not been completed. Please complete it as soon as you can.</p>${button('Open your audits', '/chat')}`,
      }))
      await db.auditAssignment.update({ where: { id: a.id }, data: { overdue_notified_at: new Date() } })
      emails++
    }
    if (!f?.escalated_at && a.days_overdue >= settings.escalate_after_days && managerIds.length) {
      const to = managerIds.filter(id => id !== a.assigned_user_id)
      if (to.length) {
        await notifyUsers(tenant.id, 'audit_updates', to, (email, name) => sendAuditUpdateEmail({
          to: email, name, orgName: tenant.name, subject: `Escalated: ${a.template_name} is ${a.days_overdue} day${a.days_overdue === 1 ? '' : 's'} overdue`,
          bodyHtml: `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0">${assignmentLine(a)}, assigned to <strong>${esc(a.assigned_name)}</strong>, was due on <strong>${fmt(a.due_date)}</strong> and is now ${a.days_overdue} day${a.days_overdue === 1 ? '' : 's'} overdue.</p>${button('View scheduled audits', '/audits')}`,
        }))
        emails++
      }
      await db.auditAssignment.update({ where: { id: a.id }, data: { escalated_at: new Date() } })
    }
  }

  // 4. Summary for admins: daily, or weekly on Mondays.
  const isMonday = today.getUTCDay() === 1
  if (settings.summary === 'daily' || (settings.summary === 'weekly' && isMonday)) {
    const windowDays = settings.summary === 'daily' ? 1 : 7
    const [upcoming, overdue, done] = await Promise.all([
      listAssignments(tenant.id, { statuses: ['open'], from: today, to: new Date(today.getTime() + (windowDays === 1 ? 1 : 7) * DAY) }),
      listAssignments(tenant.id, { statuses: ['open'], to: new Date(today.getTime() - 1) }),
      listAssignments(tenant.id, { statuses: ['completed', 'missed'], from: new Date(today.getTime() - 120 * DAY) }),
    ])
    // Completed in the window (whenever it was due), or missed with a due date in the window.
    const since = today.getTime() - windowDays * DAY
    const completedRecently = done.filter(a => a.status === 'missed'
      ? new Date(a.due_date).getTime() >= since
      : !!a.completed_at && new Date(a.completed_at).getTime() >= since)
    if (upcoming.length || overdue.length || completedRecently.length) {
      const list = (title: string, items: any[], extra: (a: any) => string) => items.length
        ? `<p style="margin:16px 0 6px;font-weight:600;color:#111827">${title} (${items.length})</p><ul style="margin:0;padding-left:18px">${items.slice(0, 30).map(a => `<li style="font-size:14px;color:#374151;margin:0 0 4px">${assignmentLine(a)}, ${esc(a.assigned_name)}${extra(a)}</li>`).join('')}</ul>`
        : ''
      const admins = await db.user.findMany({ where: { tenant_id: tenant.id, role: 'admin', is_active: true }, select: { id: true } })
      const period = settings.summary === 'daily' ? 'today' : 'this week'
      await notifyUsers(tenant.id, 'audit_updates', (admins as any[]).map(u => u.id), (email, name) => sendAuditUpdateEmail({
        to: email, name, orgName: tenant.name, subject: `Audit summary for ${period}: ${overdue.length} overdue, ${upcoming.length} due`,
        bodyHtml: `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0">Your scheduled audits for ${period}.</p>`
          + list('Overdue', overdue, a => `, due ${fmt(a.due_date)}`)
          + list(settings.summary === 'daily' ? 'Due today' : 'Due in the next 7 days', upcoming, a => `, due ${fmt(a.due_date)}`)
          + list(settings.summary === 'daily' ? 'Completed or missed yesterday' : 'Completed or missed last week', completedRecently, a => a.status === 'missed' ? ', <strong>missed</strong>' : ', completed')
          + button('View scheduled audits', '/audits'),
      }))
      emails++
    }
  }
  return { emails }
}
