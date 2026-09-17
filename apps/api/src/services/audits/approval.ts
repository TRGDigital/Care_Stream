// ─── Audit approval workflow ──────────────────────────────────────────────────
// Opt-in per tenant (Settings → Audits). When on, a completed audit is sent to the
// care manager in the hub for sign-off before it is final. Mirrors the policy
// approval flow: submit → pending_manager → approved / rejected (sent back).

import { prisma } from '../../db/client'
import { sendAuditUpdateEmail } from '../email/outbound'
import { siteUrl } from '../../lib/urls'

// Read the per-tenant toggle from Tenant.organisation_details (default OFF, so nothing
// changes for existing tenants until they turn it on).
export async function auditApprovalRequired(tenantId: string): Promise<boolean> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { organisation_details: true } })
  const od = (t?.organisation_details ?? {}) as Record<string, string>
  return od.require_audit_manager_approval === 'on'
}

async function record(runId: string, tenantId: string, stage: string, decision: string, name: string, role = '', comment = '') {
  await (prisma as any).auditApproval.create({
    data: { run_id: runId, tenant_id: tenantId, stage, decision, approver_name: name.slice(0, 120), approver_role: role.slice(0, 120), comment: comment.slice(0, 2000) },
  }).catch(() => {})
}

// Send a just-completed run to the care manager for approval.
export async function submitAuditForApproval(tenantId: string, runId: string, submittedBy: string): Promise<void> {
  await (prisma as any).auditRun.update({
    where: { id: runId },
    data: { approval_status: 'pending_manager', submitted_at: new Date(), submitted_by: submittedBy || null, approval_note: null },
  })
  await record(runId, tenantId, 'submitted', 'submitted', submittedBy || 'Auditor')
  await notifyManagersOfSubmission(tenantId, runId, submittedBy).catch(e => console.error('[audit approval] notify managers:', e))
}

// Email everyone who can sign audits off (a care manager or registered manager) with a link to the
// Audit sign-off view in their hub.
async function notifyManagersOfSubmission(tenantId: string, runId: string, submittedBy: string): Promise<void> {
  const db = prisma as any
  const [run, users] = await Promise.all([
    db.auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { audit_month: true, template: { select: { name: true } }, tenant: { select: { name: true } } } }),
    db.user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { email: true, name: true, job_role: true } }),
  ])
  if (!run) return
  const managers = (users as any[]).filter(u => u.email && /care manager|registered manager/i.test(String(u.job_role ?? '')))
  const esc = (s: string) => s.replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]!))
  const name = esc(run.template?.name ?? 'An audit')
  const month = new Date(run.audit_month).toLocaleDateString('en-GB', { month: 'long', year: 'numeric' })
  const link = `${siteUrl()}/chat?view=audit-approvals`
  for (const m of managers) {
    await sendAuditUpdateEmail({
      to: m.email, name: m.name || m.email, orgName: run.tenant?.name ?? '',
      subject: `Audit ready for your sign-off: ${run.template?.name ?? 'Audit'}`,
      bodyHtml: `
        <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px">
          <strong>${esc(submittedBy || 'A member of staff')}</strong> has completed the <strong>${name}</strong> audit for <strong>${month}</strong> and sent it to you to review and sign off.
        </p>
        <p style="margin:0 0 24px"><a href="${link}" style="display:inline-block;background:#0d9488;color:#fff;text-decoration:none;font-weight:600;padding:10px 18px;border-radius:8px">Review and sign off</a></p>`,
    }).catch(e => console.error('[audit approval] email:', e))
  }
}

// Manager approves — writes the approver's name + date onto the run for the audit trail.
export async function managerApproveAudit(tenantId: string, runId: string, managerName: string, managerRole = ''): Promise<{ status: string } | null> {
  const run = await (prisma as any).auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { id: true, approval_status: true } })
  if (!run || run.approval_status !== 'pending_manager') return null
  await (prisma as any).auditRun.update({
    where: { id: runId },
    data: { approval_status: 'approved', approved_by_name: managerName, approved_by_role: managerRole || null, approved_at: new Date(), approval_note: null },
  })
  await record(runId, tenantId, 'manager', 'approved', managerName, managerRole)
  return { status: 'approved' }
}

// Manager sends it back with a note — reopens the run so the auditor can amend and re-complete.
export async function rejectAudit(tenantId: string, runId: string, managerName: string, comment: string): Promise<{ status: string } | null> {
  const run = await (prisma as any).auditRun.findFirst({ where: { id: runId, tenant_id: tenantId }, select: { id: true, approval_status: true } })
  if (!run || run.approval_status !== 'pending_manager') return null
  await (prisma as any).auditRun.update({
    where: { id: runId },
    data: { approval_status: 'rejected', status: 'in_progress', approval_note: comment.slice(0, 2000), completed_at: null },
  })
  await record(runId, tenantId, 'manager', 'rejected', managerName, '', comment)
  return { status: 'rejected' }
}

export type PendingAudit = {
  run_id: string
  template_name: string
  subject: string | null
  subject_room: string | null
  subject_scope: string
  auditor_name: string
  audit_month: string
  submitted_at: string | null
}

// Audits awaiting this tenant's manager sign-off.
export async function getPendingAuditApprovals(tenantId: string): Promise<PendingAudit[]> {
  const runs = await (prisma as any).auditRun.findMany({
    where: { tenant_id: tenantId, approval_status: 'pending_manager' },
    select: { id: true, auditor_name: true, audit_month: true, submitted_at: true, room_number: true, subject_room: true, template: { select: { name: true, subject_scope: true } } },
    orderBy: { submitted_at: 'asc' },
  })
  return (runs as any[]).map(r => ({
    run_id: r.id,
    template_name: r.template?.name ?? 'Audit',
    subject: r.room_number ?? null,
    subject_room: r.subject_room ?? null,
    subject_scope: r.template?.subject_scope ?? 'none',
    auditor_name: r.auditor_name ?? '',
    audit_month: r.audit_month,
    submitted_at: r.submitted_at ? new Date(r.submitted_at).toISOString() : null,
  }))
}

// Recently approved audits — shown to the manager for visibility of the trail.
export async function getRecentApprovedAudits(tenantId: string, take = 15): Promise<Array<{ run_id: string; template_name: string; approved_by: string; approved_at: string | null; audit_month: string }>> {
  const runs = await (prisma as any).auditRun.findMany({
    where: { tenant_id: tenantId, approval_status: 'approved' },
    select: { id: true, approved_by_name: true, approved_at: true, audit_month: true, template: { select: { name: true } } },
    orderBy: { approved_at: 'desc' }, take,
  })
  return (runs as any[]).map(r => ({
    run_id: r.id,
    template_name: r.template?.name ?? 'Audit',
    approved_by: r.approved_by_name ?? '',
    approved_at: r.approved_at ? new Date(r.approved_at).toISOString() : null,
    audit_month: r.audit_month,
  }))
}
