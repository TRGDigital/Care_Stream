// Policy Change Adoption — apply an adopted gap suggestion into a tenant's editable policy.
//
// The uploaded policy stays untouched as the historical record. On first adoption we create
// a PolicyDocument whose draft_content is seeded from the extracted text, and every adopted
// suggestion is applied to draft_content AND recorded as a PolicyDocumentChange (for the
// highlighted change view, the audit trail and revert). Publishing is Phase 2.

import { randomBytes } from 'crypto'
import { prisma } from '../../db/client'
import { downloadExtractedText } from '../storage/s3'
import { republishPolicyContent } from '../rag/ingestion'
import { sendPolicyExternalReviewEmail, sendTrainingUpdateEmail } from '../email/outbound'
import { siteUrl } from '../../lib/urls'
import { formatPolicyHtml } from '../../lib/translate'
import { isEmailEnabled } from '../../lib/notify'
import { sendPushToUsers } from '../../lib/push'

// External review links expire after this many days (security hygiene + wrong-recipient recovery).
export const EXTERNAL_LINK_TTL_DAYS = 30
const linkExpired = (sentAt: any): boolean => !!sentAt && (Date.now() - new Date(sentAt).getTime() > EXTERNAL_LINK_TTL_DAYS * 86_400_000)
// All policy-approval admin emails are gated by this Settings → Email preferences key.
const APPROVAL_PREF = 'policy_approvals'

// Email the external reviewer their one-off review link, if one is set on the document.
// Best-effort: a send failure never blocks the approval transition (it is logged).
async function emailExternalReviewer(doc: any, token: string): Promise<void> {
  if (!doc?.external_email) return
  try {
    const [policy, tenant, changes] = await Promise.all([
      (prisma as any).policy.findUnique({ where: { id: doc.policy_id }, select: { name: true } }),
      (prisma as any).tenant.findUnique({ where: { id: doc.tenant_id }, select: { name: true } }),
      (prisma as any).policyDocumentChange.count({ where: { document_id: doc.id, reverted: false } }),
    ])
    await sendPolicyExternalReviewEmail({
      to: doc.external_email,
      name: doc.external_name || '',
      policyName: policy?.name ?? 'Policy',
      orgName: tenant?.name ?? '',
      link: `${siteUrl()}/policy-review/${token}`,
      changes,
    })
    if (doc.id) await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { external_sent_at: new Date() } })
  } catch (e: any) { console.error('[policy-external] email failed', e?.message) }
}

// When a policy reaches "awaiting external approval" but no external reviewer is set yet,
// email the tenant's admins so they know to open it, enter the reviewer, and send the link.
// (If a reviewer is already set, the link auto-sends and admins don't need nudging.)
async function notifyAdminsExternalReviewReady(doc: any): Promise<void> {
  if (doc?.external_email) return
  if (!(await isEmailEnabled(doc.tenant_id, APPROVAL_PREF))) return
  try {
    const [tenant, admins, policy] = await Promise.all([
      (prisma as any).tenant.findUnique({ where: { id: doc.tenant_id }, select: { name: true } }),
      (prisma as any).user.findMany({ where: { tenant_id: doc.tenant_id, role: 'admin', is_active: true }, select: { email: true, name: true } }),
      (prisma as any).policy.findUnique({ where: { id: doc.policy_id }, select: { name: true } }),
    ])
    const orgName = tenant?.name ?? 'Your service'
    const policyName = policy?.name ?? 'A policy'
    const link = `${siteUrl()}/gaps`
    const bodyHtml = `
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px"><strong>${policyName}</strong> has passed its internal approvals and is ready to send to your external reviewer for the final sign-off.</p>
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">Open the policy, enter the reviewer's name and email, and send them the one-off review link. It only goes live to your staff once they approve.</p>
      <div style="text-align:center;margin:0 0 8px"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#9B52B5;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open Policy Gaps</a></div>`
    for (const a of (admins as any[])) {
      if (!a?.email) continue
      await sendTrainingUpdateEmail({ to: a.email, name: a.name || 'there', orgName, subject: `Ready to send for external approval: ${policyName}`, bodyHtml }).catch(() => {})
    }
  } catch (e: any) { console.error('[policy-external] admin notify failed', e?.message) }
}

// Build the admin notification for an external decision — exported so previews match prod.
export function buildExternalDecisionEmail(decision: 'approved' | 'rejected', opts: { policyName: string; who: string; version: string; comment: string }): { subject: string; bodyHtml: string } {
  const { policyName, who, version, comment } = opts
  const link = `${siteUrl()}/gaps`
  const subject = decision === 'approved' ? `Approved and published: ${policyName}` : `Sent back by your external reviewer: ${policyName}`
  const bodyHtml = decision === 'approved'
    ? `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px"><strong>${who}</strong> has approved <strong>${policyName}</strong>. It is now live for your staff${version ? ` as version ${version}` : ''}, and staff Q&amp;A answers from the new version.</p>
       <div style="text-align:center;margin:16px 0 8px"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#9B52B5;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open Policy Gaps</a></div>`
    : `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 12px"><strong>${who}</strong> has sent <strong>${policyName}</strong> back for changes.</p>
       ${comment ? `<p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px;padding:12px 14px;background:#fef3c7;border-radius:8px"><em>&ldquo;${comment}&rdquo;</em></p>` : ''}
       <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 24px">Open the policy, make the changes, and re-approve to send it back through.</p>
       <div style="text-align:center;margin:0 0 8px"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#9B52B5;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open Policy Gaps</a></div>`
  return { subject, bodyHtml }
}

// Tell the tenant's admins how the external approver decided: approved (now live) or sent back.
async function notifyAdminsExternalDecision(doc: any, decision: 'approved' | 'rejected', reviewerName: string, comment: string, version: string): Promise<void> {
  if (!(await isEmailEnabled(doc.tenant_id, APPROVAL_PREF))) return
  try {
    const [tenant, admins, policy] = await Promise.all([
      (prisma as any).tenant.findUnique({ where: { id: doc.tenant_id }, select: { name: true } }),
      (prisma as any).user.findMany({ where: { tenant_id: doc.tenant_id, role: 'admin', is_active: true }, select: { email: true, name: true } }),
      (prisma as any).policy.findUnique({ where: { id: doc.policy_id }, select: { name: true } }),
    ])
    const orgName = tenant?.name ?? 'Your service'
    const policyName = policy?.name ?? 'A policy'
    const who = reviewerName || doc.external_name || 'Your external reviewer'
    const { subject, bodyHtml } = buildExternalDecisionEmail(decision, { policyName, who, version, comment })
    for (const a of (admins as any[])) {
      if (!a?.email) continue
      await sendTrainingUpdateEmail({ to: a.email, name: a.name || 'there', orgName, subject, bodyHtml }).catch(() => {})
    }
  } catch (e: any) { console.error('[policy-external] decision notify failed', e?.message) }
}

// When a policy publishes on the internal-only path (care-manager approval with external off, or
// admin approving directly), admins otherwise hear nothing — send a short "now live" confirmation.
async function notifyAdminsNowLive(tenantId: string, policyId: string, version: string): Promise<void> {
  if (!(await isEmailEnabled(tenantId, APPROVAL_PREF))) return
  try {
    const [tenant, admins, policy] = await Promise.all([
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { email: true, name: true } }),
      (prisma as any).policy.findUnique({ where: { id: policyId }, select: { name: true } }),
    ])
    const orgName = tenant?.name ?? 'Your service'
    const policyName = policy?.name ?? 'A policy'
    const link = `${siteUrl()}/policies`
    const bodyHtml = `
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px"><strong>${policyName}</strong> has been approved and is now live for your staff${version ? ` as version ${version}` : ''}, including in staff Q&amp;A.</p>
      <div style="text-align:center;margin:16px 0 8px"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#9B52B5;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open Policies</a></div>`
    for (const a of (admins as any[])) {
      if (!a?.email) continue
      await sendTrainingUpdateEmail({ to: a.email, name: a.name || 'there', orgName, subject: `Now live: ${policyName}`, bodyHtml }).catch(() => {})
    }
  } catch (e: any) { console.error('[policy] now-live notify failed', e?.message) }
}

// #10 — when a policy lands for the care manager's approval, notify them (PWA push always, email
// governed by the policy_approvals preference) instead of relying on the hub badge alone.
async function notifyCareManagerPending(tenantId: string, policyId: string): Promise<void> {
  try {
    const [tenant, users, policy] = await Promise.all([
      (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true } }),
      (prisma as any).user.findMany({ where: { tenant_id: tenantId, is_active: true }, select: { id: true, email: true, name: true, job_role: true } }),
      (prisma as any).policy.findUnique({ where: { id: policyId }, select: { name: true } }),
    ])
    const managers = (users as any[]).filter(u => /care manager|registered manager/i.test(String(u.job_role ?? '')))
    if (!managers.length) return
    const orgName = tenant?.name ?? 'Your service'
    const policyName = policy?.name ?? 'A policy'
    await sendPushToUsers(managers.map(m => m.id), { title: `Policy to review: ${policyName}`, body: `${orgName} has sent you a policy to approve.`, url: '/chat', tag: 'policy-approval' }).catch(() => {})
    if (!(await isEmailEnabled(tenantId, APPROVAL_PREF))) return
    const link = `${siteUrl()}/chat`
    const bodyHtml = `
      <p style="color:#374151;font-size:15px;line-height:1.6;margin:0 0 16px"><strong>${policyName}</strong> has been sent to you for approval. Open your hub to review the change and approve it, or send it back with feedback.</p>
      <div style="text-align:center;margin:16px 0 8px"><a href="${link}" style="display:inline-block;padding:12px 28px;background:#9B52B5;color:#ffffff;font-size:15px;font-weight:600;border-radius:8px;text-decoration:none">Open your hub</a></div>`
    for (const m of managers) {
      if (!m.email) continue
      await sendTrainingUpdateEmail({ to: m.email, name: m.name || 'there', orgName, subject: `For your approval: ${policyName}`, bodyHtml }).catch(() => {})
    }
  } catch (e: any) { console.error('[policy] care manager notify failed', e?.message) }
}

// Trailing "end matter" a new section must sit ABOVE (dates, signatures, version, company).
const END_MATTER_RE = /\b(review date|policy review|next review|reviewed|dated?|signed|signature|version|approved by|authorised by|policy owner|source url|declaration|registered (office|number|charity)|company (number|registration)|telephone|\bltd\b|limited|©|copyright)\b/i

// Role-holder mapping — mirrors settings.ts so the same specialisms drive both.
const ROLE_MAP: Array<{ key: string; role: string; match: RegExp }> = [
  { key: 'safeguarding_lead',  role: 'Safeguarding lead',                   match: /safeguard/i },
  { key: 'caldicott_guardian', role: 'Caldicott Guardian',                  match: /caldicott/i },
  { key: 'ipc_lead',           role: 'Infection prevention & control lead', match: /infection|(?:^|\b)ipc\b/i },
  { key: 'fire_safety_officer',role: 'Fire safety officer',                 match: /fire/i },
  { key: 'dignity_champion',   role: 'Dignity champion',                    match: /dignity/i },
]

async function getOrInitDocument(tenantId: string, policyId: string): Promise<any> {
  const existing = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (existing) return existing
  const [text, policy] = await Promise.all([
    downloadExtractedText(tenantId, policyId).catch(() => null),
    (prisma as any).policy.findUnique({ where: { id: policyId }, select: { version: true } }),
  ])
  const base = Number(policy?.version) || 1   // the uploaded original is version 1
  return (prisma as any).policyDocument.create({
    data: { tenant_id: tenantId, policy_id: policyId, original_content: text ?? '', draft_content: text ?? '', version: `${base}.0` },
  })
}

// Insert a block at the end of the body but ABOVE any trailing dates/signatures/company info.
function insertBeforeEndMatter(content: string, block: string): string {
  const lines = content.split('\n')
  let idx = lines.length
  for (let i = lines.length - 1; i >= 0; i--) {
    const t = lines[i].trim()
    if (!t) continue
    if (t.length <= 200 && END_MATTER_RE.test(t)) { idx = i; continue }
    break
  }
  const before = lines.slice(0, idx).join('\n').replace(/\s+$/, '')
  const after  = lines.slice(idx).join('\n').replace(/^\s+/, '')
  return `${before}\n\n${block}\n\n${after}`.replace(/\n{3,}/g, '\n\n').trim() + '\n'
}

// Apply one change to the content. `applied` is false when an amend/heading anchor could
// not be located verbatim (the caller surfaces this rather than silently doing nothing).
function applyChange(content: string, placement: string, oldText: string, newText: string, sectionTitle?: string): { content: string; applied: boolean } {
  if (placement === 'amend' && oldText) {
    if (!content.includes(oldText)) return { content, applied: false }
    // Replace EVERY occurrence. For a gap amend the old text is a unique whole paragraph (one
    // occurrence), so this is unchanged; for a lint term fix it corrects all instances at once.
    return { content: content.split(oldText).join(newText), applied: true }
  }
  if (placement === 'add_under_heading' && oldText) {
    const i = content.indexOf(oldText)
    if (i >= 0) {
      const at = i + oldText.length
      return { content: `${content.slice(0, at)}\n\n${newText}${content.slice(at)}`, applied: true }
    }
    return { content, applied: false }
  }
  // new_section
  const block = [sectionTitle ? `## ${sectionTitle}` : '', newText].filter(Boolean).join('\n\n')
  return { content: insertBeforeEndMatter(content, block), applied: true }
}

export async function adoptSuggestion(tenantId: string, policyId: string, input: {
  reference_key: string; requirement: string; placement: string; old_text: string; new_text: string; section_title?: string; applied_by: string
}): Promise<{ applied: boolean; pending: number; document_id: string; change_id: string }> {
  const doc = await getOrInitDocument(tenantId, policyId)
  let { content, applied } = applyChange(doc.draft_content, input.placement, input.old_text, input.new_text, input.section_title)

  // Re-fill / re-amend: if the token/old_text is gone because it was already replaced, update the
  // PREVIOUS value in place instead of failing — so correcting a placeholder actually lands in the
  // draft. Find the latest prior fill for this reference_key + old_text whose value is still present.
  if (!applied && input.placement === 'amend' && input.old_text && input.new_text) {
    const priors = await (prisma as any).policyDocumentChange.findMany({
      where: { document_id: doc.id, reference_key: input.reference_key, old_text: input.old_text, reverted: false },
      orderBy: { applied_at: 'desc' },
    }).catch(() => [])
    for (const p of priors as any[]) {
      if (p.new_text && p.new_text !== input.new_text && doc.draft_content.includes(p.new_text)) {
        content = doc.draft_content.split(p.new_text).join(input.new_text)
        applied = true
        break
      }
    }
    // Retire the superseded fills so the change log and pending count stay clean.
    if (applied && (priors as any[]).length) {
      await (prisma as any).policyDocumentChange.updateMany({
        where: { id: { in: (priors as any[]).map(p => p.id) } }, data: { reverted: true },
      }).catch(() => {})
    }
  }

  if (applied) {
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { draft_content: content } })
  }
  // Only record a change when it actually landed in the draft, so nothing shows as pending that
  // was never placed (previously a not-found amend still recorded an orphan change).
  let changeId = ''
  if (applied) {
    const change = await (prisma as any).policyDocumentChange.create({
      data: {
        document_id: doc.id, tenant_id: tenantId, reference_key: input.reference_key,
        requirement: input.requirement.slice(0, 500), placement: input.placement,
        old_text: input.old_text.slice(0, 8000), new_text: input.new_text.slice(0, 8000),
        section_title: (input.section_title ?? '').slice(0, 200), applied_by: input.applied_by,
      },
    })
    changeId = change.id
    // New adopted changes reset the approval cycle back to draft.
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'draft' } }).catch(() => {})
  }
  const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: doc.id, published: false, reverted: false } })
  return { applied, pending, document_id: doc.id, change_id: changeId }
}

// ─── Approval workflow ────────────────────────────────────────────────────────
// draft → (admin submits) pending_manager → (manager approves) pending_external? →
// (external approves) published. A rejection at any stage returns it to draft.

async function recordApproval(documentId: string, tenantId: string, stage: string, decision: string, name: string, email = '', comment = '') {
  await (prisma as any).policyApproval.create({
    data: { document_id: documentId, tenant_id: tenantId, stage, decision, approver_name: name.slice(0, 120), approver_email: email.slice(0, 160), comment: comment.slice(0, 2000) },
  }).catch(() => {})
}

// Which approval stages are required. Manager approval defaults ON, external defaults OFF.
async function approvalToggles(tenantId: string): Promise<{ manager: boolean; external: boolean }> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { organisation_details: true } })
  const od = (t?.organisation_details ?? {}) as Record<string, string>
  return { manager: od.require_manager_approval !== 'off', external: od.require_external_approval === 'on' }
}

// Admin approves the adopted changes. Routes to the next required stage: care manager,
// then external; if neither is required, it publishes straight away.
export async function submitForApproval(tenantId: string, policyId: string, adminName: string): Promise<{ status: string; version?: string; token?: string } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  await rebuildDraft(doc.id)
  // Fresh approval round: clear any per-change care manager notes (and their resolved flag)
  // from a previous send-back.
  await (prisma as any).policyDocumentChange.updateMany({ where: { document_id: doc.id, reverted: false }, data: { manager_feedback: '', feedback_resolved: false } })
  await recordApproval(doc.id, tenantId, 'admin', 'approved', adminName)
  const { manager, external } = await approvalToggles(tenantId)
  if (manager) {
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'pending_manager', stage_since: new Date() } })
    await notifyCareManagerPending(tenantId, policyId)
    return { status: 'pending_manager' }
  }
  if (external) {
    const token = doc.external_token || randomBytes(18).toString('hex')
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'pending_external', external_token: token, stage_since: new Date() } })
    await emailExternalReviewer({ ...doc, external_token: token }, token)
    await notifyAdminsExternalReviewReady({ ...doc, external_token: token })
    return { status: 'pending_external', token }
  }
  const r = await publishDocument(tenantId, policyId, adminName)
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'published' } })
  await notifyAdminsNowLive(tenantId, policyId, r?.version ?? '')
  return { status: 'published', version: r?.version }
}

// Care manager approves. If external approval is required, generate a review token and hold
// at pending_external; otherwise finalise and publish.
export async function managerApprove(tenantId: string, policyId: string, managerName: string): Promise<{ status: string; version?: string; token?: string } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  await recordApproval(doc.id, tenantId, 'manager', 'approved', managerName)
  if ((await approvalToggles(tenantId)).external) {
    const token = doc.external_token || randomBytes(18).toString('hex')
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'pending_external', external_token: token, stage_since: new Date() } })
    await emailExternalReviewer({ ...doc, external_token: token }, token)
    await notifyAdminsExternalReviewReady({ ...doc, external_token: token })
    return { status: 'pending_external', token }
  }
  const r = await publishDocument(tenantId, policyId, managerName)
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'published' } })
  await notifyAdminsNowLive(tenantId, policyId, r?.version ?? '')
  return { status: 'published', version: r?.version }
}

// #7 — the tenant's saved default external reviewer (pre-fills the per-policy form).
async function saveDefaultReviewer(tenantId: string, name: string, email: string): Promise<void> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { organisation_details: true } })
  const od = (t?.organisation_details ?? {}) as Record<string, unknown>
  await (prisma as any).tenant.update({ where: { id: tenantId }, data: { organisation_details: { ...od, default_external_name: name.slice(0, 120), default_external_email: email.slice(0, 160) } } }).catch(() => {})
}
async function getDefaultReviewer(tenantId: string): Promise<{ name: string; email: string }> {
  const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { organisation_details: true } })
  const od = (t?.organisation_details ?? {}) as Record<string, string>
  return { name: od.default_external_name ?? '', email: od.default_external_email ?? '' }
}

// Set / update who the external review link is addressed to.
export async function setExternalRecipient(tenantId: string, policyId: string, name: string, email: string): Promise<{ token: string } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  const token = doc.external_token || randomBytes(18).toString('hex')
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { external_token: token, external_name: name.slice(0, 120), external_email: email.slice(0, 160) } })
  if (email) await saveDefaultReviewer(tenantId, name, email)   // remember for next time (#7)
  // If the policy is already waiting on external approval, send (or resend) the link now.
  if (doc.approval_status === 'pending_external') {
    await emailExternalReviewer({ ...doc, external_email: email, external_name: name, external_token: token }, token)
  }
  return { token }
}

// #4 — revoke the current external link (e.g. sent to the wrong person). The reviewer can no
// longer open it; a new one must be issued.
export async function revokeExternalLink(tenantId: string, policyId: string): Promise<boolean> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return false
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { external_token: null } })
  return true
}

// #4 — issue a fresh link and resend it (resets the 30-day clock). Requires a reviewer + the
// policy to be awaiting external approval.
export async function reissueExternalLink(tenantId: string, policyId: string): Promise<{ token: string } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId || !doc.external_email || doc.approval_status !== 'pending_external') return null
  const token = randomBytes(18).toString('hex')
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { external_token: token, external_sent_at: null } })
  await emailExternalReviewer({ ...doc, external_token: token }, token)   // sets external_sent_at
  return { token }
}

// #5 — nudge whoever a policy is waiting on. Used by the manual "Send reminder" button and the
// (scheduled) stale-approval sweep. Returns false if it isn't in a stage we can nudge.
const REMIND_AFTER_DAYS = 4
export async function remindApproval(tenantId: string, policyId: string): Promise<boolean> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return false
  if (doc.approval_status === 'pending_manager') { await notifyCareManagerPending(tenantId, policyId); return true }
  if (doc.approval_status === 'pending_external' && doc.external_email && doc.external_token && !linkExpired(doc.external_sent_at)) {
    await emailExternalReviewer(doc, doc.external_token); return true
  }
  return false
}

// Sweep all policies that have been waiting longer than REMIND_AFTER_DAYS and nudge them. Wire to
// a scheduled job when crons are restored; also callable per-tenant on demand.
export async function sendStaleApprovalReminders(tenantId?: string): Promise<{ reminded: number }> {
  const cutoff = new Date(Date.now() - REMIND_AFTER_DAYS * 86_400_000)
  const docs = await (prisma as any).policyDocument.findMany({
    where: { approval_status: { in: ['pending_manager', 'pending_external'] }, stage_since: { lt: cutoff }, ...(tenantId ? { tenant_id: tenantId } : {}) },
    select: { tenant_id: true, policy_id: true },
  })
  let reminded = 0
  for (const d of docs as any[]) if (await remindApproval(d.tenant_id, d.policy_id).catch(() => false)) reminded++
  return { reminded }
}

// #9 — read-only published-version history for a policy.
export async function getPolicyVersions(tenantId: string, policyId: string): Promise<Array<{ id: string; version: string; change_count: number; published_by: string; published_at: string }>> {
  const rows = await (prisma as any).policyDocumentVersion.findMany({
    where: { tenant_id: tenantId, policy_id: policyId }, orderBy: { published_at: 'desc' },
    select: { id: true, version: true, change_count: true, published_by: true, published_at: true },
  })
  return (rows as any[]).map(r => ({ ...r, published_at: new Date(r.published_at).toISOString() }))
}
export async function getPolicyVersionContent(tenantId: string, versionId: string): Promise<{ version: string; content: string; published_by: string; published_at: string } | null> {
  const r = await (prisma as any).policyDocumentVersion.findUnique({ where: { id: versionId } })
  if (!r || r.tenant_id !== tenantId) return null
  return { version: r.version, content: r.content, published_by: r.published_by, published_at: new Date(r.published_at).toISOString() }
}

// The reference_key on an adopted change tells us which feature drove the update.
function sourceOfRef(refKey: string): 'out_of_date' | 'consistency' | 'coverage' {
  if (refKey.startsWith('policy-lint:')) return 'out_of_date'
  if (refKey.startsWith('consistency:')) return 'consistency'
  return 'coverage'   // a regulation reference key (coverage + SAF wording alignment)
}

export interface MatrixRow {
  policy_id: string; name: string; version: string
  status: 'published' | 'draft' | 'pending_manager' | 'pending_external'
  updated_at: string | null
  sources: Array<'coverage' | 'out_of_date' | 'consistency'>
  last_reviewed_at: string | null
  next_review_due: string | null
  review_overdue: boolean
}

// The policy update matrix: every policy with adopted changes (published or in progress), what
// drove the update(s), when it last changed, and — once published — when it is next due for review.
export async function getPolicyMatrix(tenantId: string): Promise<{ policies: MatrixRow[] }> {
  const docs = await (prisma as any).policyDocument.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, policy_id: true, version: true, published_at: true, approval_status: true },
  })
  if (!docs.length) return { policies: [] }

  const [policies, changes] = await Promise.all([
    (prisma as any).policy.findMany({ where: { id: { in: (docs as any[]).map(d => d.policy_id) } }, select: { id: true, name: true, last_reviewed_at: true, review_interval_days: true } }),
    (prisma as any).policyDocumentChange.findMany({ where: { document_id: { in: (docs as any[]).map(d => d.id) }, reverted: false }, select: { document_id: true, reference_key: true, applied_at: true } }),
  ])
  const polById = new Map((policies as any[]).map(p => [p.id, p]))
  const sourcesByDoc = new Map<string, Set<string>>()
  const lastChangeByDoc = new Map<string, number>()
  for (const c of changes as any[]) {
    if (!sourcesByDoc.has(c.document_id)) sourcesByDoc.set(c.document_id, new Set())
    sourcesByDoc.get(c.document_id)!.add(sourceOfRef(String(c.reference_key ?? '')))
    const t = c.applied_at ? new Date(c.applied_at).getTime() : 0
    lastChangeByDoc.set(c.document_id, Math.max(lastChangeByDoc.get(c.document_id) ?? 0, t))
  }

  const rows: MatrixRow[] = (docs as any[])
    .filter(d => sourcesByDoc.has(d.id))   // only policies that actually have adopted changes
    .map(d => {
      const p = polById.get(d.policy_id)
      const status = d.approval_status as MatrixRow['status']
      const publishedAt = d.published_at ? new Date(d.published_at) : null
      const lastChange = lastChangeByDoc.get(d.id) ? new Date(lastChangeByDoc.get(d.id)!) : null
      const updatedAt = publishedAt ?? lastChange
      // A review date only makes sense once it's live.
      const reviewed = status === 'published' ? (p?.last_reviewed_at ? new Date(p.last_reviewed_at) : publishedAt) : null
      const interval = p?.review_interval_days ?? 365
      const nextDue = reviewed ? new Date(reviewed.getTime() + interval * 86_400_000) : null
      return {
        policy_id: d.policy_id, name: p?.name ?? 'Policy', version: d.version, status,
        updated_at: updatedAt?.toISOString() ?? null,
        sources: [...(sourcesByDoc.get(d.id) ?? [])] as MatrixRow['sources'],
        last_reviewed_at: reviewed?.toISOString() ?? null,
        next_review_due: nextDue?.toISOString() ?? null,
        review_overdue: nextDue ? Date.now() > nextDue.getTime() : false,
      }
    })
    .sort((a, b) => (b.updated_at ?? '').localeCompare(a.updated_at ?? ''))
  return { policies: rows }
}

// Reject at a stage (admin, manager or external) — returns to draft for amendment.
export async function rejectPolicy(tenantId: string, policyId: string, stage: string, name: string, comment: string, feedback: Array<{ change_id: string; note: string }> = []): Promise<{ status: string } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  // Per-section notes: save each on its change so the admin sees exactly what to fix,
  // and roll them into a labelled summary for the approval trail comment.
  const notes = (feedback || []).filter(f => f?.change_id && String(f?.note ?? '').trim())
  const lines: string[] = []
  if (notes.length) {
    const changes = await (prisma as any).policyDocumentChange.findMany({ where: { document_id: doc.id }, select: { id: true, section_title: true, requirement: true } })
    const byId = new Map<string, any>((changes as any[]).map(c => [c.id, c]))
    for (const f of notes) {
      const note = String(f.note).trim().slice(0, 2000)
      await (prisma as any).policyDocumentChange.updateMany({ where: { id: f.change_id, document_id: doc.id }, data: { manager_feedback: note } })
      const c = byId.get(f.change_id)
      lines.push(`${c?.section_title || c?.requirement || 'Change'}: ${note}`)
    }
  }
  const fullComment = [String(comment ?? '').trim(), ...lines].filter(Boolean).join('\n')
  await recordApproval(doc.id, tenantId, stage, 'rejected', name, '', fullComment)
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'draft', external_token: null } })
  return { status: 'draft' }
}

// The approval status + full history for a policy.
export async function getApprovalState(tenantId: string, policyId: string): Promise<{ status: string; external_name: string; external_email: string; external_token: string | null; external_sent_at: string | null; stage_since: string | null; link_expired: boolean; default_external_name: string; default_external_email: string; approvals: any[] } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  const [approvals, def] = await Promise.all([
    (prisma as any).policyApproval.findMany({ where: { document_id: doc.id }, orderBy: { created_at: 'asc' } }),
    getDefaultReviewer(tenantId),
  ])
  return {
    status: doc.approval_status, external_name: doc.external_name, external_email: doc.external_email,
    external_token: doc.external_token,
    external_sent_at: doc.external_sent_at ? new Date(doc.external_sent_at).toISOString() : null,
    stage_since: doc.stage_since ? new Date(doc.stage_since).toISOString() : null,
    link_expired: linkExpired(doc.external_sent_at),
    default_external_name: def.name, default_external_email: def.email,
    approvals,
  }
}

// ── External (public, token-gated) review ──
export async function getExternalReview(token: string): Promise<{ policy_id: string; policy_name: string; version: string; changes: any[]; home_name: string; html: string; show_role_names: boolean; role_names: Record<string, string[]> } | null> {
  const doc = await (prisma as any).policyDocument.findFirst({ where: { external_token: token } })
  if (!doc || doc.approval_status !== 'pending_external' || linkExpired(doc.external_sent_at)) return null
  const [policy, tenant, changes] = await Promise.all([
    (prisma as any).policy.findUnique({ where: { id: doc.policy_id }, select: { name: true } }),
    (prisma as any).tenant.findUnique({ where: { id: doc.tenant_id }, select: { name: true } }),
    (prisma as any).policyDocumentChange.findMany({ where: { document_id: doc.id, reverted: false }, orderBy: { applied_at: 'asc' } }),
  ])
  // Rendered policy body, from the format cache if we have it, else format + cache it.
  let html = ''
  const cached = await (prisma as any).policyTranslation.findUnique({ where: { policy_id_lang: { policy_id: doc.policy_id, lang: 'eng' } }, select: { content: true } }).catch(() => null)
  if (cached?.content) html = cached.content
  else {
    const raw = await downloadExtractedText(doc.tenant_id, doc.policy_id).catch(() => null)
    if (raw) { const h = await formatPolicyHtml(raw, 'eng'); if (h) { html = h; await (prisma as any).policyTranslation.create({ data: { tenant_id: doc.tenant_id, policy_id: doc.policy_id, lang: 'eng', content: h } }).catch(() => {}) } }
  }
  const ctx = await getAdoptionContext(doc.tenant_id)
  return { policy_id: doc.policy_id, policy_name: policy?.name ?? 'Policy', version: doc.version ?? '', changes, home_name: tenant?.name ?? '', html, show_role_names: ctx.show_role_names, role_names: ctx.role_names }
}

export async function externalDecision(token: string, name: string, comment: string, decision: 'approved' | 'rejected'): Promise<{ status: string } | null> {
  const doc = await (prisma as any).policyDocument.findFirst({ where: { external_token: token } })
  if (!doc || doc.approval_status !== 'pending_external' || linkExpired(doc.external_sent_at)) return null
  await recordApproval(doc.id, doc.tenant_id, 'external', decision, name || doc.external_name, doc.external_email, comment)
  if (decision === 'rejected') {
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'draft', external_token: null } })
    await notifyAdminsExternalDecision(doc, 'rejected', name, comment, '')
    return { status: 'draft' }
  }
  const r = await publishDocument(doc.tenant_id, doc.policy_id, name || doc.external_name || 'External approver')
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'published', external_token: null } })
  await notifyAdminsExternalDecision(doc, 'approved', name, comment, r?.version ?? '')
  return { status: 'published' }
}

// Rebuild the draft from the original + every still-active change, in order. Used after a
// revert so removing one change cleanly recomposes the document.
async function rebuildDraft(documentId: string): Promise<void> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { id: documentId } })
  if (!doc) return
  const changes = await (prisma as any).policyDocumentChange.findMany({
    where: { document_id: documentId, reverted: false }, orderBy: { applied_at: 'asc' },
  })
  let content = doc.original_content as string
  for (const c of changes as any[]) {
    content = applyChange(content, c.placement, c.old_text, c.new_text, c.section_title || undefined).content
  }
  await (prisma as any).policyDocument.update({ where: { id: documentId }, data: { draft_content: content } })
}

// Revert one adopted change and recompose the draft.
export async function revertChange(tenantId: string, changeId: string): Promise<{ pending: number } | null> {
  const change = await (prisma as any).policyDocumentChange.findUnique({ where: { id: changeId } })
  if (!change || change.tenant_id !== tenantId) return null
  await (prisma as any).policyDocumentChange.update({ where: { id: changeId }, data: { reverted: true } })
  await rebuildDraft(change.document_id)
  const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: change.document_id, published: false, reverted: false } })
  return { pending }
}

// Edit the wording (and heading, for a new section) of one adopted change, then recompose
// the draft. If the change carried care manager feedback, mark it resolved so the admin can
// see they have addressed it. Only allowed while the change is unpublished.
export async function editChange(tenantId: string, changeId: string, newText: string, sectionTitle?: string): Promise<{ pending: number } | null> {
  const change = await (prisma as any).policyDocumentChange.findUnique({ where: { id: changeId } })
  if (!change || change.tenant_id !== tenantId || change.published) return null
  const data: Record<string, unknown> = { new_text: String(newText) }
  if (typeof sectionTitle === 'string') data.section_title = sectionTitle
  if (change.manager_feedback) data.feedback_resolved = true
  await (prisma as any).policyDocumentChange.update({ where: { id: changeId }, data })
  await rebuildDraft(change.document_id)
  const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: change.document_id, published: false, reverted: false } })
  return { pending }
}

// Publish: snapshot the draft as the published version, bump the version, and mark every
// active pending change as published. The uploaded original is still preserved.
export async function publishDocument(tenantId: string, policyId: string, publishedBy: string): Promise<{ version: string; published: number; reindexed: boolean } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  // Recompose the draft from the original + active changes with the current placement logic,
  // so the published snapshot is always correct even if it was first applied earlier.
  await rebuildDraft(doc.id)
  const fresh = await (prisma as any).policyDocument.findUnique({ where: { id: doc.id } })
  // Publishing bumps the MAJOR version. The uploaded original is version 1, so the first
  // published set of changes is version 2, then 3, and so on.
  const policy = await (prisma as any).policy.findUnique({ where: { id: policyId }, select: { version: true, review_interval_days: true } })
  const base = Number(policy?.version) || 1
  const curMajor = parseInt(String(doc.version || '').split('.')[0], 10)
  const nextMajor = (Number.isFinite(curMajor) ? curMajor : base) + 1
  const nextVersion = `${nextMajor}.0`
  const res = await (prisma as any).policyDocumentChange.updateMany({
    where: { document_id: doc.id, published: false, reverted: false }, data: { published: true },
  })
  const publishedContent = fresh?.draft_content ?? doc.draft_content
  await (prisma as any).policyDocument.update({
    where: { id: doc.id },
    data: { published_content: publishedContent, published_at: new Date(), published_by: publishedBy, version: nextVersion },
  })
  // #9 — snapshot this published version for the read-only history.
  await (prisma as any).policyDocumentVersion.create({
    data: { tenant_id: tenantId, policy_id: policyId, version: nextVersion, content: publishedContent, change_count: res.count ?? 0, published_by: publishedBy },
  }).catch(() => {})
  // Publishing an update counts as a review — stamp it and default the next review to 12 months.
  await (prisma as any).policy.update({
    where: { id: policyId },
    data: { last_reviewed_at: new Date(), ...(policy?.review_interval_days ? {} : { review_interval_days: 365 }) },
  }).catch(() => {})
  // Swap the new content into the live policy (S3 text, format cache, Pinecone) so staff
  // Q&A and previews use it, and the old version is archived. Best-effort — a re-index
  // failure does not undo the publish (it is logged and can be retried).
  let reindexed = false
  try { await republishPolicyContent(tenantId, policyId, publishedContent); reindexed = true }
  catch (e: any) { console.error('[publish] republish failed', e?.message) }
  return { version: nextVersion, published: res.count ?? 0, reindexed }
}

// Every updated policy with its full approval timeline — CQC evidence that policy changes
// follow one consistent, signed-off process. Most recently active first.
export async function approvalsOverview(tenantId: string): Promise<{
  documents: Array<{ policy_id: string; name: string; version: string; approval_status: string; published_at: string | null; updated_at: string | null; pending: number; external_name: string; trail: Array<{ stage: string; decision: string; approver_name: string; created_at: string; comment: string }> }>
  summary: { total: number; published: number; in_progress: number }
  health: { policies_total: number; coverage_score: number | null; regs_total: number; regs_covered: number; regs_partial: number; regs_gap: number; review_tracked: number; review_due: number }
}> {
  const docs = await (prisma as any).policyDocument.findMany({
    where: { tenant_id: tenantId },
    select: { id: true, policy_id: true, version: true, approval_status: true, published_at: true, updated_at: true, external_name: true },
  })
  const documents = [] as any[]
  for (const d of docs as any[]) {
    const [policy, approvals, pending] = await Promise.all([
      (prisma as any).policy.findUnique({ where: { id: d.policy_id }, select: { name: true } }),
      (prisma as any).policyApproval.findMany({ where: { document_id: d.id }, orderBy: { created_at: 'asc' }, select: { stage: true, decision: true, approver_name: true, created_at: true, comment: true } }),
      (prisma as any).policyDocumentChange.count({ where: { document_id: d.id, published: false, reverted: false } }),
    ])
    documents.push({
      policy_id: d.policy_id,
      name: policy?.name ?? 'Policy',
      version: d.version ?? '',
      approval_status: d.approval_status ?? 'draft',
      published_at: d.published_at ? new Date(d.published_at).toISOString() : null,
      updated_at: d.updated_at ? new Date(d.updated_at).toISOString() : null,
      pending,
      external_name: d.external_name || '',
      trail: (approvals as any[]).map(a => ({ stage: a.stage, decision: a.decision, approver_name: a.approver_name || '', created_at: new Date(a.created_at).toISOString(), comment: a.comment || '' })),
    })
  }
  documents.sort((a, b) => (b.updated_at || '').localeCompare(a.updated_at || ''))
  const summary = {
    total: documents.length,
    published: documents.filter(d => d.approval_status === 'published').length,
    in_progress: documents.filter(d => d.approval_status === 'pending_manager' || d.approval_status === 'pending_external').length,
  }

  // Library health — regulation coverage + policies due for review, for the cockpit.
  const [policiesTotal, covRows, reviewRows] = await Promise.all([
    (prisma as any).policy.count({ where: { tenant_id: tenantId, status: 'active' } }),
    (prisma as any).regulationCoverage.findMany({ where: { tenant_id: tenantId }, select: { status: true } }),
    (prisma as any).policy.findMany({ where: { tenant_id: tenantId, status: 'active', review_interval_days: { not: null } }, select: { last_reviewed_at: true, review_interval_days: true } }),
  ])
  const regsTotal   = (covRows as any[]).length
  const regsCovered = (covRows as any[]).filter(c => c.status === 'covered').length
  const regsPartial = (covRows as any[]).filter(c => c.status === 'partial').length
  const regsGap     = (covRows as any[]).filter(c => c.status === 'gap').length
  const coverageScore = regsTotal > 0 ? Math.round(((regsCovered + regsPartial * 0.5) / regsTotal) * 100) : null
  const now = Date.now()
  let reviewDue = 0
  for (const p of reviewRows as any[]) {
    const interval = Number(p.review_interval_days)
    if (!interval) continue
    if (!p.last_reviewed_at) { reviewDue++; continue }
    if (new Date(p.last_reviewed_at).getTime() + interval * 86400000 < now) reviewDue++
  }
  const health = {
    policies_total: policiesTotal as number,
    coverage_score: coverageScore,
    regs_total: regsTotal, regs_covered: regsCovered, regs_partial: regsPartial, regs_gap: regsGap,
    review_tracked: (reviewRows as any[]).length,
    review_due: reviewDue,
  }

  return { documents, summary, health }
}

// Per-policy summary for the Policies list: how many changes are waiting to be published.
export async function summariseDocuments(tenantId: string): Promise<Array<{ policy_id: string; pending: number; version: string; published_at: string | null; approval_status: string; external_name: string; external_sent_at: string | null }>> {
  const docs = await (prisma as any).policyDocument.findMany({
    where: { tenant_id: tenantId }, select: { id: true, policy_id: true, version: true, published_at: true, approval_status: true, external_name: true, external_email: true, external_sent_at: true },
  })
  const out: Array<{ policy_id: string; pending: number; version: string; published_at: string | null; approval_status: string; external_name: string; external_sent_at: string | null }> = []
  for (const d of docs as any[]) {
    const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: d.id, published: false, reverted: false } })
    out.push({ policy_id: d.policy_id, pending, version: d.version ?? '', published_at: d.published_at ? new Date(d.published_at).toISOString() : null, approval_status: d.approval_status ?? 'draft', external_name: d.external_name || d.external_email || '', external_sent_at: d.external_sent_at ? new Date(d.external_sent_at).toISOString() : null })
  }
  return out
}

export async function getPolicyDocument(tenantId: string, policyId: string): Promise<{ document: any; changes: any[] } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  const changes = await (prisma as any).policyDocumentChange.findMany({ where: { document_id: doc.id, reverted: false }, orderBy: { applied_at: 'desc' } })
  return { document: doc, changes }
}

// Variables + role-holders offered as quick-insert chips at adoption. Role-holders resolve
// to the manual org-detail value if set (comma-separated = multiple candidates), else the
// staff-derived names, so a shared role offers every candidate for the tenant to pick.
export async function getAdoptionContext(tenantId: string): Promise<{
  enabled: boolean
  variables: Array<{ key: string; label: string; value: string }>
  role_holders: Array<{ key: string; role: string; candidates: string[] }>
  role_names: Record<string, string[]>
  show_role_names: boolean
  logo_url: string | null
  home_name: string
  address: string
  registered_manager: string
  default_approver: string
  review_cycle_months: string
  version_scheme: string
  require_manager_approval: boolean
  require_external_approval: boolean
}> {
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { name: true, organisation_details: true, logo_url: true, plan: { select: { has_gap_detection: true } } },
  })
  // Policy adoption is available to any gap-detection tenant (the feature that surfaces it),
  // no longer gated behind a separate per-tenant flag.
  const enabled = !!tenant?.plan?.has_gap_detection
  const od = (tenant?.organisation_details ?? {}) as Record<string, string>

  const staff = await (prisma as any).user.findMany({
    where: { tenant_id: tenantId }, select: { name: true, job_role: true, specialisms: true },
  }).catch(() => [])
  const bySpec = (m: RegExp) => (staff as any[])
    .filter(s => Array.isArray(s.specialisms) && s.specialisms.some((sp: string) => m.test(String(sp))))
    .map(s => String(s.name)).filter(Boolean)
  const byPos = (m: RegExp) => (staff as any[])
    .filter(s => m.test(String(s.job_role ?? ''))).map(s => String(s.name)).filter(Boolean)
  const manualOf = (key: string) => String(od[key] ?? '').split(',').map(s => s.trim()).filter(Boolean)
  const union = (a: string[], b: string[]) => [...new Set([...a, ...b])]

  const MANAGER_RE = /care manager|registered manager/i
  const role_holders = [
    { key: 'registered_manager',  role: 'Registered manager',                  candidates: union(manualOf('registered_manager'), byPos(MANAGER_RE)) },
    ...ROLE_MAP.map(m => ({ key: m.key, role: m.role, candidates: union(manualOf(m.key), bySpec(m.match)) })),
  ]

  const variables = [
    { key: 'home_name',            label: 'Home / service name', value: String(tenant?.name ?? '') },
    { key: 'nominated_individual', label: 'Nominated individual',value: od.nominated_individual ?? '' },
    { key: 'default_approver',     label: 'Approver',            value: od.default_approver ?? '' },
    { key: 'address',              label: 'Address',             value: od.address ?? '' },
  ].filter(v => v.value)

  // Role phrase → the current holder names, used to append "(Name)" on first mention in a
  // policy (when the tenant has the toggle on). Always current — resolved from staff + manual.
  const role_names: Record<string, string[]> = {}
  for (const r of role_holders) if (r.candidates.length) role_names[r.key] = r.candidates

  return {
    enabled, variables, role_holders, role_names,
    show_role_names: od.show_role_names !== 'off',
    logo_url: (tenant?.logo_url as string) ?? null,
    home_name: String(tenant?.name ?? ''),
    address: od.address ?? '',
    registered_manager: manualOf('registered_manager')[0] || byPos(MANAGER_RE)[0] || '',
    default_approver: od.default_approver ?? '',
    review_cycle_months: od.review_cycle_months ?? '',
    version_scheme: od.version_scheme ?? '',
    require_manager_approval: od.require_manager_approval !== 'off',
    require_external_approval: od.require_external_approval === 'on',
  }
}
