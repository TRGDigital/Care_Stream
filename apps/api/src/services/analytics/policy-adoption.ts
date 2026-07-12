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
    const i = content.indexOf(oldText)
    if (i >= 0) return { content: content.slice(0, i) + newText + content.slice(i + oldText.length), applied: true }
    return { content, applied: false }
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
  const { content, applied } = applyChange(doc.draft_content, input.placement, input.old_text, input.new_text, input.section_title)
  if (applied) {
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { draft_content: content } })
  }
  const change = await (prisma as any).policyDocumentChange.create({
    data: {
      document_id: doc.id, tenant_id: tenantId, reference_key: input.reference_key,
      requirement: input.requirement.slice(0, 500), placement: input.placement,
      old_text: input.old_text.slice(0, 8000), new_text: input.new_text.slice(0, 8000),
      section_title: (input.section_title ?? '').slice(0, 200), applied_by: input.applied_by,
    },
  })
  // New adopted changes reset the approval cycle back to draft.
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'draft' } }).catch(() => {})
  const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: doc.id, published: false, reverted: false } })
  return { applied, pending, document_id: doc.id, change_id: change.id }
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
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'pending_manager' } })
    return { status: 'pending_manager' }
  }
  if (external) {
    const token = doc.external_token || randomBytes(18).toString('hex')
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'pending_external', external_token: token } })
    await emailExternalReviewer({ ...doc, external_token: token }, token)
    await notifyAdminsExternalReviewReady({ ...doc, external_token: token })
    return { status: 'pending_external', token }
  }
  const r = await publishDocument(tenantId, policyId, adminName)
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'published' } })
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
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'pending_external', external_token: token } })
    await emailExternalReviewer({ ...doc, external_token: token }, token)
    await notifyAdminsExternalReviewReady({ ...doc, external_token: token })
    return { status: 'pending_external', token }
  }
  const r = await publishDocument(tenantId, policyId, managerName)
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'published' } })
  return { status: 'published', version: r?.version }
}

// Set / update who the external review link is addressed to.
export async function setExternalRecipient(tenantId: string, policyId: string, name: string, email: string): Promise<{ token: string } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  const token = doc.external_token || randomBytes(18).toString('hex')
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { external_token: token, external_name: name.slice(0, 120), external_email: email.slice(0, 160) } })
  // If the policy is already waiting on external approval, send (or resend) the link now.
  if (doc.approval_status === 'pending_external') {
    await emailExternalReviewer({ ...doc, external_email: email, external_name: name, external_token: token }, token)
  }
  return { token }
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
export async function getApprovalState(tenantId: string, policyId: string): Promise<{ status: string; external_name: string; external_email: string; external_token: string | null; external_sent_at: string | null; approvals: any[] } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  const approvals = await (prisma as any).policyApproval.findMany({ where: { document_id: doc.id }, orderBy: { created_at: 'asc' } })
  return { status: doc.approval_status, external_name: doc.external_name, external_email: doc.external_email, external_token: doc.external_token, external_sent_at: doc.external_sent_at ? new Date(doc.external_sent_at).toISOString() : null, approvals }
}

// ── External (public, token-gated) review ──
export async function getExternalReview(token: string): Promise<{ policy_id: string; policy_name: string; version: string; changes: any[]; home_name: string; html: string; show_role_names: boolean; role_names: Record<string, string[]> } | null> {
  const doc = await (prisma as any).policyDocument.findFirst({ where: { external_token: token } })
  if (!doc || doc.approval_status !== 'pending_external') return null
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
  if (!doc || doc.approval_status !== 'pending_external') return null
  await recordApproval(doc.id, doc.tenant_id, 'external', decision, name || doc.external_name, doc.external_email, comment)
  if (decision === 'rejected') {
    await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'draft', external_token: null } })
    return { status: 'draft' }
  }
  await publishDocument(doc.tenant_id, doc.policy_id, name || doc.external_name || 'External approver')
  await (prisma as any).policyDocument.update({ where: { id: doc.id }, data: { approval_status: 'published', external_token: null } })
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
  const policy = await (prisma as any).policy.findUnique({ where: { id: policyId }, select: { version: true } })
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
  // Swap the new content into the live policy (S3 text, format cache, Pinecone) so staff
  // Q&A and previews use it, and the old version is archived. Best-effort — a re-index
  // failure does not undo the publish (it is logged and can be retried).
  let reindexed = false
  try { await republishPolicyContent(tenantId, policyId, publishedContent); reindexed = true }
  catch (e: any) { console.error('[publish] republish failed', e?.message) }
  return { version: nextVersion, published: res.count ?? 0, reindexed }
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
    where: { id: tenantId }, select: { name: true, organisation_details: true, feature_flags: true, logo_url: true },
  })
  const enabled = !!((tenant?.feature_flags ?? {}) as Record<string, unknown>).has_policy_adoption
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
