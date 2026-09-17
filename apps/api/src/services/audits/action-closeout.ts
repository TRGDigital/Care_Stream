// Closing audit actions properly:
//  - the person doing it says what they did (and can add photos) when marking it done;
//  - they can ask for more time, which an admin approves (moving the due date) or declines;
//  - overdue actions are reminded and escalated by the daily audit-reminders job;
//  - the next audit of the same kind shows the previous audit's actions to check they are still fixed,
//    and "not fixed" reopens the action.
// Plus drawn signatures on audit completion and manager sign-off.

import { randomUUID } from 'crypto'
import { prisma } from '../../db/client'
import { notifyUsers } from '../../lib/notify'
import { sendAuditUpdateEmail } from '../email/outbound'
import { siteUrl } from '../../lib/urls'
import { uploadAuditEvidence } from '../storage/s3'
import { assignmentSettings, startOfDayUTC } from './assignments'

const db = prisma as any
const DAY = 86_400_000
const esc = (s: any) => String(s ?? '').replace(/[<>&"]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' }[c] as string))
const fmt = (d: Date | string) => new Date(d).toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short', year: 'numeric', timeZone: 'Europe/London' })
const button = (label: string, path: string) =>
  `<p style="margin:20px 0 0"><a href="${siteUrl()}${path}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;padding:10px 18px;border-radius:8px;font-size:13px;font-weight:600">${label}</a></p>`
const para = (html: string) => `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0">${html}</p>`

// Actions are assigned to staff by name; find the matching active user ids.
export async function userIdsByName(tenantId: string, names: string[]): Promise<Map<string, string>> {
  const wanted = new Set(names.map(n => (n ?? '').trim().toLowerCase()).filter(Boolean))
  if (!wanted.size) return new Map()
  const users = await db.user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, name: true } })
  return new Map((users as any[]).filter(u => wanted.has(String(u.name).trim().toLowerCase())).map(u => [String(u.name).trim().toLowerCase(), u.id]))
}

async function adminIds(tenantId: string, exclude?: string | null): Promise<string[]> {
  const rows = await db.user.findMany({ where: { tenant_id: tenantId, is_active: true, role: 'admin' }, select: { id: true } })
  return (rows as any[]).map(r => r.id).filter(id => id !== exclude)
}

async function tenantName(tenantId: string): Promise<string> {
  const t = await db.tenant.findUnique({ where: { id: tenantId }, select: { name: true } }).catch(() => null)
  return t?.name ?? ''
}

// The action as the signed-in staff member may change it: assigned to them by name, on an approved plan.
async function ownAction(tenantId: string, staffName: string, actionId: string) {
  const name = (staffName ?? '').trim()
  if (!name) return null
  return db.auditAction.findFirst({
    where: { id: actionId, tenant_id: tenantId, assigned_to: { equals: name, mode: 'insensitive' }, run: { action_plan_status: 'approved' } },
    include: { run: { select: { template: { select: { name: true } } } } },
  })
}

export async function completeMyAction(tenantId: string, staffName: string, actionId: string, note: string | null): Promise<void> {
  const a = await ownAction(tenantId, staffName, actionId)
  if (!a) throw new Error('Action not found')
  await db.auditAction.update({
    where: { id: a.id },
    data: { status: 'done', done_at: new Date(), completion_note: note ? note.trim().slice(0, 2000) : null, verified_result: null, verified_at: null, verified_by: null, verified_run_id: null, verify_note: null },
  })
}

export async function requestExtension(tenantId: string, staffName: string, userId: string, actionId: string, until: string, reason: string): Promise<void> {
  const a = await ownAction(tenantId, staffName, actionId)
  if (!a) throw new Error('Action not found')
  if (a.status === 'done') throw new Error('This action is already done.')
  const date = new Date(until)
  if (isNaN(date.getTime())) throw new Error('Choose the date you need until.')
  if (a.due_date && startOfDayUTC(date).getTime() <= startOfDayUTC(new Date(a.due_date)).getTime()) throw new Error('Choose a date after the current due date.')
  if (!reason.trim()) throw new Error('Say why you need more time.')
  await db.auditAction.update({
    where: { id: a.id },
    data: { extension_requested_to: startOfDayUTC(date), extension_reason: reason.trim().slice(0, 1000), extension_status: 'pending', extension_decided_by: null },
  })
  const org = await tenantName(tenantId)
  await notifyUsers(tenantId, 'audit_updates', await adminIds(tenantId, userId), (email, name) => sendAuditUpdateEmail({
    to: email, name, orgName: org, subject: `More time requested: ${a.description.slice(0, 60)}`,
    bodyHtml: para(`<strong>${esc(staffName)}</strong> has asked for more time on an action from the <strong>${esc(a.run?.template?.name ?? 'audit')}</strong> audit: &ldquo;${esc(a.description)}&rdquo;.<br><br>Due ${a.due_date ? fmt(a.due_date) : 'with no date'}, requested until <strong>${fmt(date)}</strong>. Reason: ${esc(reason.trim())}`)
      + button('Review the request', `/audits/${a.run_id}`),
  })).catch(() => {})
}

export async function decideExtension(tenantId: string, actionId: string, approve: boolean, decidedBy: string): Promise<void> {
  const a = await db.auditAction.findFirst({ where: { id: actionId, tenant_id: tenantId, extension_status: 'pending' }, include: { run: { select: { template: { select: { name: true } } } } } })
  if (!a) throw new Error('No pending request for more time on this action.')
  await db.auditAction.update({
    where: { id: a.id },
    data: approve
      ? { extension_status: 'approved', extension_decided_by: decidedBy, due_date: a.extension_requested_to, reminded_at: null, overdue_notified_at: null, escalated_at: null }
      : { extension_status: 'declined', extension_decided_by: decidedBy },
  })
  if (!a.assigned_to || a.is_external) return
  const ids = await userIdsByName(tenantId, [a.assigned_to])
  const uid = ids.get(a.assigned_to.trim().toLowerCase())
  if (!uid) return
  const org = await tenantName(tenantId)
  await notifyUsers(tenantId, 'audit_updates', [uid], (email, name) => sendAuditUpdateEmail({
    to: email, name, orgName: org, subject: approve ? 'More time agreed on your action' : 'More time not agreed on your action',
    bodyHtml: para(approve
      ? `${esc(decidedBy)} agreed more time on &ldquo;${esc(a.description)}&rdquo;. It is now due on <strong>${fmt(a.extension_requested_to)}</strong>.`
      : `${esc(decidedBy)} could not agree more time on &ldquo;${esc(a.description)}&rdquo;, so it is still due on <strong>${a.due_date ? fmt(a.due_date) : 'the original date'}</strong>.`)
      + button('Open my actions', '/chat'),
  })).catch(() => {})
}

// The most recent earlier completed audit of the same kind (and same room, resident or staff member),
// with its approved action plan: the actions to check at this audit.
export async function previousActionsForRun(tenantId: string, runId: string) {
  const run = await db.auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { id: true, template_id: true, room_number: true, created_at: true } })
  if (!run) return null
  const prev = await db.auditRun.findFirst({
    where: {
      tenant_id: tenantId, template_id: run.template_id, id: { not: run.id }, status: 'completed',
      action_plan_status: 'approved', created_at: { lt: run.created_at },
      ...(run.room_number ? { room_number: run.room_number } : {}),
    },
    orderBy: { completed_at: 'desc' },
    select: { id: true, audit_month: true, completed_at: true },
  })
  if (!prev) return { previous_run: null, actions: [] }
  const actions = await db.auditAction.findMany({ where: { run_id: prev.id, tenant_id: tenantId }, include: { evidence: { select: { id: true, file_name: true } } }, orderBy: { created_at: 'asc' } })
  return {
    previous_run: prev,
    actions: (actions as any[]).map(a => ({
      id: a.id, description: a.description, priority: a.priority, status: a.status, assigned_to: a.assigned_to, external_name: a.external_name,
      due_date: a.due_date, done_at: a.done_at, completion_note: a.completion_note, evidence: a.evidence,
      verified_result: a.verified_run_id === run.id ? a.verified_result : null, verified_by: a.verified_run_id === run.id ? a.verified_by : null,
      verify_note: a.verified_run_id === run.id ? a.verify_note : null,
    })),
  }
}

export async function verifyAction(tenantId: string, actionId: string, runId: string, result: 'fixed' | 'not_fixed', note: string | null, by: string): Promise<void> {
  const a = await db.auditAction.findFirst({ where: { id: actionId, tenant_id: tenantId }, include: { run: { select: { template_id: true, template: { select: { name: true } } } } } })
  if (!a) throw new Error('Action not found')
  const run = await db.auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { id: true, template_id: true } })
  if (!run || run.template_id !== a.run.template_id) throw new Error('This action can only be checked in a later audit of the same kind.')
  const notFixed = result === 'not_fixed'
  await db.auditAction.update({
    where: { id: a.id },
    data: {
      verified_result: result, verified_at: new Date(), verified_by: by, verified_run_id: run.id, verify_note: note ? note.trim().slice(0, 1000) : null,
      // Not fixed after all: reopen it so it is worked again.
      ...(notFixed ? { status: 'open', done_at: null, reminded_at: null, overdue_notified_at: null, escalated_at: null } : {}),
    },
  })
  if (notFixed && a.assigned_to && !a.is_external) {
    const ids = await userIdsByName(tenantId, [a.assigned_to])
    const uid = ids.get(a.assigned_to.trim().toLowerCase())
    if (uid) {
      const org = await tenantName(tenantId)
      await notifyUsers(tenantId, 'audit_updates', [uid], (email, name) => sendAuditUpdateEmail({
        to: email, name, orgName: org, subject: 'An action has been reopened',
        bodyHtml: para(`At the latest <strong>${esc(a.run?.template?.name ?? 'audit')}</strong> audit, &ldquo;${esc(a.description)}&rdquo; was found not to be fixed, so it has been reopened for you.${note ? ` Note: ${esc(note)}` : ''}`) + button('Open my actions', '/chat'),
      })).catch(() => {})
    }
  }
}

// Daily: due-soon and overdue reminders for actions on approved plans, and escalation to admins.
export async function processActionReminders(tenant: { id: string; name: string }): Promise<{ emails: number }> {
  const today = startOfDayUTC(new Date())
  const { escalate_after_days } = await assignmentSettings(tenant.id)
  const actions = await db.auditAction.findMany({
    where: { tenant_id: tenant.id, status: { not: 'done' }, due_date: { not: null, lte: new Date(today.getTime() + 2 * DAY) }, run: { action_plan_status: 'approved' } },
    include: { run: { select: { id: true, template: { select: { name: true } } } } },
  })
  if (!(actions as any[]).length) return { emails: 0 }
  const names = await userIdsByName(tenant.id, (actions as any[]).map(a => a.assigned_to).filter(Boolean))
  const admins = await adminIds(tenant.id)
  let emails = 0
  for (const a of actions as any[]) {
    const due = startOfDayUTC(new Date(a.due_date))
    const overdue = due.getTime() < today.getTime()
    const daysOver = overdue ? Math.round((today.getTime() - due.getTime()) / DAY) : 0
    const assignee = !a.is_external && a.assigned_to ? names.get(String(a.assigned_to).trim().toLowerCase()) : undefined
    const label = `&ldquo;${esc(a.description)}&rdquo; from the <strong>${esc(a.run?.template?.name ?? 'audit')}</strong> audit`
    const data: any = {}

    if (!overdue && !a.reminded_at && assignee) {
      await notifyUsers(tenant.id, 'audit_updates', [assignee], (email, name) => sendAuditUpdateEmail({
        to: email, name, orgName: tenant.name, subject: `Action due ${fmt(due)}`,
        bodyHtml: para(`${label} is due on <strong>${fmt(due)}</strong>. When it is done, mark it done and say what you did.`) + button('Open my actions', '/chat'),
      }))
      data.reminded_at = new Date(); emails++
    }
    if (overdue && !a.overdue_notified_at) {
      // Staff actions go to the assignee; external contractor actions go to the admins who track them.
      const to = assignee ? [assignee] : a.is_external ? admins : []
      if (to.length) {
        await notifyUsers(tenant.id, 'audit_updates', to, (email, name) => sendAuditUpdateEmail({
          to: email, name, orgName: tenant.name, subject: 'Overdue audit action',
          bodyHtml: para(`${label}${a.is_external && a.external_name ? `, with ${esc(a.external_name)},` : ''} was due on <strong>${fmt(due)}</strong> and is not done yet. If you need more time, ask for it from My actions.`) + button('Open my actions', '/chat'),
        }))
        emails++
      }
      data.overdue_notified_at = new Date()
    }
    if (overdue && !a.escalated_at && daysOver >= escalate_after_days && !a.is_external) {
      const to = admins.filter(id => id !== assignee)
      if (to.length) {
        await notifyUsers(tenant.id, 'audit_updates', to, (email, name) => sendAuditUpdateEmail({
          to: email, name, orgName: tenant.name, subject: `Escalated: an audit action is ${daysOver} day${daysOver === 1 ? '' : 's'} overdue`,
          bodyHtml: para(`${label}, assigned to <strong>${esc(a.assigned_to ?? 'nobody')}</strong>, was due on <strong>${fmt(due)}</strong> and is ${daysOver} day${daysOver === 1 ? '' : 's'} overdue.`) + button('View the action plan', `/audits/${a.run_id}`),
        }))
        emails++
      }
      data.escalated_at = new Date()
    }
    if (Object.keys(data).length) await db.auditAction.update({ where: { id: a.id }, data })
  }
  return { emails }
}

// Store a drawn signature (a PNG data URL) against a run. Returns the S3 key.
export async function storeSignature(tenantId: string, runId: string, dataUrl: string): Promise<string> {
  const m = /^data:image\/png;base64,([A-Za-z0-9+/=]+)$/.exec(dataUrl ?? '')
  if (!m) throw new Error('The signature was not a valid image.')
  const buffer = Buffer.from(m[1], 'base64')
  if (buffer.length < 200) throw new Error('Please sign in the box.')
  if (buffer.length > 600_000) throw new Error('The signature image is too large.')
  // PNG magic number: a data URL that claims PNG but is not one is refused.
  if (buffer.slice(0, 8).toString('hex') !== '89504e470d0a1a0a') throw new Error('The signature was not a valid image.')
  return uploadAuditEvidence({ tenantId, runId, key: `signature-${randomUUID()}.png`, buffer, mimeType: 'image/png' })
}
