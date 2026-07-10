// Policy Change Adoption — apply an adopted gap suggestion into a tenant's editable policy.
//
// The uploaded policy stays untouched as the historical record. On first adoption we create
// a PolicyDocument whose draft_content is seeded from the extracted text, and every adopted
// suggestion is applied to draft_content AND recorded as a PolicyDocumentChange (for the
// highlighted change view, the audit trail and revert). Publishing is Phase 2.

import { prisma } from '../../db/client'
import { downloadExtractedText } from '../storage/s3'

// Trailing "end matter" a new section must sit ABOVE (dates, signatures, version, company).
const END_MATTER_RE = /\b(review date|next review|reviewed|dated?|signed|signature|version|approved by|authorised by|policy owner|registered (office|number|charity)|company (number|registration)|\bltd\b|limited|©|copyright)\b/i

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
  const text = (await downloadExtractedText(tenantId, policyId).catch(() => null)) ?? ''
  return (prisma as any).policyDocument.create({
    data: { tenant_id: tenantId, policy_id: policyId, original_content: text, draft_content: text, version: '' },
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
  const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: doc.id, published: false, reverted: false } })
  return { applied, pending, document_id: doc.id, change_id: change.id }
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

// Publish: snapshot the draft as the published version, bump the version, and mark every
// active pending change as published. The uploaded original is still preserved.
export async function publishDocument(tenantId: string, policyId: string, publishedBy: string): Promise<{ version: string; published: number } | null> {
  const doc = await (prisma as any).policyDocument.findUnique({ where: { policy_id: policyId } })
  if (!doc || doc.tenant_id !== tenantId) return null
  const nextVersion = bumpVersion(doc.version as string)
  const res = await (prisma as any).policyDocumentChange.updateMany({
    where: { document_id: doc.id, published: false, reverted: false }, data: { published: true },
  })
  await (prisma as any).policyDocument.update({
    where: { id: doc.id },
    data: { published_content: doc.draft_content, published_at: new Date(), published_by: publishedBy, version: nextVersion },
  })
  return { version: nextVersion, published: res.count ?? 0 }
}

// 1.0 → 1.1 → 1.2 … starting at 1.0 when unset.
function bumpVersion(current: string): string {
  const m = /^(\d+)\.(\d+)$/.exec((current || '').trim())
  if (!m) return '1.0'
  return `${m[1]}.${Number(m[2]) + 1}`
}

// Per-policy summary for the Policies list: how many changes are waiting to be published.
export async function summariseDocuments(tenantId: string): Promise<Array<{ policy_id: string; pending: number; version: string; published_at: string | null }>> {
  const docs = await (prisma as any).policyDocument.findMany({
    where: { tenant_id: tenantId }, select: { id: true, policy_id: true, version: true, published_at: true },
  })
  const out: Array<{ policy_id: string; pending: number; version: string; published_at: string | null }> = []
  for (const d of docs as any[]) {
    const pending = await (prisma as any).policyDocumentChange.count({ where: { document_id: d.id, published: false, reverted: false } })
    out.push({ policy_id: d.policy_id, pending, version: d.version ?? '', published_at: d.published_at ? new Date(d.published_at).toISOString() : null })
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
}> {
  const tenant = await (prisma as any).tenant.findUnique({
    where: { id: tenantId }, select: { name: true, organisation_details: true, feature_flags: true },
  })
  const enabled = !!((tenant?.feature_flags ?? {}) as Record<string, unknown>).has_policy_adoption
  const od = (tenant?.organisation_details ?? {}) as Record<string, string>

  const staff = await (prisma as any).user.findMany({
    where: { tenant_id: tenantId }, select: { name: true, specialisms: true },
  }).catch(() => [])
  const derived = (m: RegExp) => (staff as any[])
    .filter(s => Array.isArray(s.specialisms) && s.specialisms.some((sp: string) => m.test(String(sp))))
    .map(s => String(s.name)).filter(Boolean)

  const role_holders = ROLE_MAP.map(m => {
    const manual = String(od[m.key] ?? '').split(',').map(s => s.trim()).filter(Boolean)
    return { key: m.key, role: m.role, candidates: manual.length ? manual : derived(m.match) }
  })

  const variables = [
    { key: 'home_name',            label: 'Home / service name', value: String(tenant?.name ?? '') },
    { key: 'registered_manager',   label: 'Registered manager',  value: od.registered_manager ?? '' },
    { key: 'nominated_individual', label: 'Nominated individual',value: od.nominated_individual ?? '' },
    { key: 'default_approver',     label: 'Approver',            value: od.default_approver ?? '' },
    { key: 'address',              label: 'Address',             value: od.address ?? '' },
  ].filter(v => v.value)

  return { enabled, variables, role_holders }
}
