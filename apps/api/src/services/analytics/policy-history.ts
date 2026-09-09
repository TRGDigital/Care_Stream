// The history of a home's policies: what changed, when, why, and who signed it off.
//
// Everything here already existed in the database and was simply never surfaced. Published
// versions keep their FULL CONTENT, so "what did our medication policy actually say in March"
// is answerable, which for an inspection, a complaint or a coroner is the whole point of a
// history. The rest of the tab is metadata about a change; that is the change itself.
//
// Only policies that have a history appear. History is created by the adoption and approval
// flow, not by uploading a file, so most of a library has none, and a home reading an empty
// row would reasonably think we had lost it rather than that nothing has happened yet.

import { prisma } from '../../db/client'

export type HistoryApproval = {
  stage: 'admin' | 'manager' | 'external' | string
  decision: 'approved' | 'rejected' | string
  approver_name: string | null
  comment: string | null
  at: string
}

export type HistoryChange = {
  requirement: string
  section_title: string | null
  /** What the policy now says. The requirement alone ("Refers to Primary Care Trusts") names
   *  the problem but never shows the fix, which is the thing a reader wants to check. */
  new_text: string
  /** What it said before, empty for a new section that replaced nothing. */
  old_text: string
  /** The regulation that drove it, which is the answer to "why did this change?". */
  reference_key: string | null
  regulation: string | null
  reverted: boolean
}

export type HistoryVersion = {
  version_id: string
  version: string
  published_at: string
  published_by: string | null
  change_count: number
  changes: HistoryChange[]
  approvals: HistoryApproval[]
}

export type PolicyHistory = {
  policy_id: string
  policy_name: string
  carestream_written: boolean
  versions: HistoryVersion[]
}

export async function policyHistory(tenantId: string): Promise<PolicyHistory[]> {
  const versions = await (prisma as any).policyDocumentVersion.findMany({
    where:   { tenant_id: tenantId },
    orderBy: { published_at: 'desc' },
    // Content is deliberately NOT selected. A library's worth of full policy text would be
    // megabytes on a page that only needs to list what happened; it is fetched one version at
    // a time when somebody actually opens one.
    select: {
      id: true, policy_id: true, version: true, published_at: true,
      published_by: true, change_count: true,
    },
  })
  if (!versions.length) return []

  const policyIds = [...new Set(versions.map((v: any) => v.policy_id))]
  const [policies, docs] = await Promise.all([
    (prisma as any).policy.findMany({
      where:  { id: { in: policyIds } },
      select: { id: true, name: true, carestream_written: true },
    }),
    (prisma as any).policyDocument.findMany({
      where:  { tenant_id: tenantId, policy_id: { in: policyIds } },
      select: { id: true, policy_id: true },
    }),
  ])
  const nameById = new Map<string, { id: string; name: string; carestream_written: boolean }>(
    policies.map((p: any) => [p.id, p]))
  const docIdByPolicy = new Map<string, string>(docs.map((d: any) => [d.policy_id, d.id]))
  const docIds = [...docIdByPolicy.values()]

  const [changes, approvals] = await Promise.all([
    docIds.length
      ? (prisma as any).policyDocumentChange.findMany({
          where:   { document_id: { in: docIds } },
          orderBy: { applied_at: 'asc' },
          select: {
            document_id: true, requirement: true, section_title: true,
            reference_key: true, reverted: true, applied_at: true, published: true,
            old_text: true, new_text: true, placement: true,
          },
        })
      : [],
    docIds.length
      ? (prisma as any).policyApproval.findMany({
          where:   { document_id: { in: docIds } },
          orderBy: { created_at: 'asc' },
          select: {
            document_id: true, stage: true, decision: true,
            approver_name: true, comment: true, created_at: true,
          },
        })
      : [],
  ])

  // Turn a regulation key into its published name, so a change reads "Regulation 12: safe
  // care and treatment" rather than a slug.
  const refKeys = [...new Set(changes.map((c: any) => c.reference_key).filter(Boolean))]
  const regs = refKeys.length
    ? await (prisma as any).externalRegulation.findMany({
        where:  { reference_key: { in: refKeys } },
        select: { reference_key: true, official_name: true },
      })
    : []
  const regName = new Map<string, string>(regs.map((r: any) => [r.reference_key, r.official_name]))

  const byDoc = <T extends { document_id: string }>(rows: T[]) => {
    const m = new Map<string, T[]>()
    for (const r of rows) {
      if (!m.has(r.document_id)) m.set(r.document_id, [])
      m.get(r.document_id)!.push(r)
    }
    return m
  }
  const changesByDoc = byDoc(changes)
  const approvalsByDoc = byDoc(approvals)

  // Group versions under their policy, newest first.
  const out = new Map<string, PolicyHistory>()
  for (const v of versions) {
    const p = nameById.get(v.policy_id)
    if (!p) continue   // the policy was deleted; its versions are orphans
    if (!out.has(v.policy_id)) {
      out.set(v.policy_id, {
        policy_id: v.policy_id,
        policy_name: p.name,
        carestream_written: !!p.carestream_written,
        versions: [],
      })
    }
    const docId = docIdByPolicy.get(v.policy_id)
    // Changes and approvals are recorded against the document rather than the version, so a
    // version cannot claim a precise set. Attaching them to the newest version is honest for
    // the common case of one published round, and the date on each row keeps it truthful.
    const isNewest = out.get(v.policy_id)!.versions.length === 0
    out.get(v.policy_id)!.versions.push({
      version_id:   v.id,
      version:      v.version,
      published_at: v.published_at.toISOString(),
      published_by: v.published_by ?? null,
      change_count: v.change_count ?? 0,
      changes: isNewest
        ? (changesByDoc.get(docId ?? '') ?? []).map((c: any) => ({
            requirement:   c.requirement,
            section_title: c.section_title || null,
            // Capped: a history page lists what happened, and a reader who wants the whole
            // thing opens the version itself, which carries the full text.
            new_text:      String(c.new_text ?? '').slice(0, 1200),
            old_text:      String(c.old_text ?? '').slice(0, 1200),
            reference_key: c.reference_key || null,
            regulation:    c.reference_key ? (regName.get(c.reference_key) ?? null) : null,
            reverted:      !!c.reverted,
          }))
        : [],
      approvals: isNewest
        ? (approvalsByDoc.get(docId ?? '') ?? []).map((a: any) => ({
            stage:         a.stage,
            decision:      a.decision,
            approver_name: a.approver_name || null,
            comment:       a.comment || null,
            at:            a.created_at.toISOString(),
          }))
        : [],
    })
  }

  return [...out.values()].sort((a, b) =>
    (b.versions[0]?.published_at ?? '').localeCompare(a.versions[0]?.published_at ?? ''))
}

/** One stored version's full text, for reading a policy as it was on a given date. */
export async function policyVersionContent(tenantId: string, versionId: string) {
  const v = await (prisma as any).policyDocumentVersion.findUnique({ where: { id: versionId } })
  if (!v || v.tenant_id !== tenantId) return null
  const policy = await (prisma as any).policy.findUnique({
    where: { id: v.policy_id }, select: { name: true },
  })
  return {
    policy_name:  policy?.name ?? 'Policy',
    version:      v.version,
    published_at: v.published_at.toISOString(),
    published_by: v.published_by ?? null,
    content:      v.content ?? '',
  }
}
