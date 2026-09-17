import { prisma } from '../../db/client'

// Per-finding "ignore" for the out-of-date (lint) section.
//
// This is NOT the same thing as a "mark as updated" resolution (review-resolutions.ts).
// That one says "I have reviewed this policy" and rightly lapses when the content changes
// or the review interval passes. An ignore says "this check is wrong about this document" —
// a wrong check does not become right because someone edited a paragraph, so an ignore is
// durable until a human removes it.

/** Sentinel policy_id meaning "every policy in this tenant". */
export const ALL_POLICIES = '*'

export interface LintIgnore {
  policy_id: string
  signal_key: string
  note: string | null
  ignored_by: string | null
  ignored_at: string
}

/**
 * Tells you whether a given (policy, signal) pair is ignored, honouring both scopes.
 * Built once per request and reused across every finding rather than querying per row.
 */
export interface IgnoreLookup {
  isIgnored(policyId: string, signalKey: string): boolean
  /** 'policy' when ignored for this policy alone, 'tenant' when ignored account-wide. */
  scopeFor(policyId: string, signalKey: string): 'policy' | 'tenant' | null
  readonly size: number
}

export async function loadIgnores(tenantId: string): Promise<IgnoreLookup> {
  const rows: any[] = await (prisma as any).policyLintIgnore
    .findMany({ where: { tenant_id: tenantId }, select: { policy_id: true, signal_key: true } })
    .catch(() => [])

  const perPolicy = new Set<string>()
  const tenantWide = new Set<string>()
  for (const r of rows) {
    if (r.policy_id === ALL_POLICIES) tenantWide.add(r.signal_key)
    else perPolicy.add(`${r.policy_id}::${r.signal_key}`)
  }

  return {
    size: rows.length,
    scopeFor(policyId: string, signalKey: string) {
      if (tenantWide.has(signalKey)) return 'tenant'
      if (perPolicy.has(`${policyId}::${signalKey}`)) return 'policy'
      return null
    },
    isIgnored(policyId: string, signalKey: string) {
      return tenantWide.has(signalKey) || perPolicy.has(`${policyId}::${signalKey}`)
    },
  }
}

/**
 * Ignore a finding. `policyId` may be ALL_POLICIES to silence the check account-wide.
 * Idempotent — re-ignoring refreshes who and when rather than erroring on the unique index.
 */
export async function addIgnore(
  tenantId: string,
  policyId: string,
  signalKey: string,
  opts?: { note?: string | null; by?: string | null },
): Promise<void> {
  await (prisma as any).policyLintIgnore.upsert({
    where:  { tenant_id_policy_id_signal_key: { tenant_id: tenantId, policy_id: policyId, signal_key: signalKey } },
    update: { note: opts?.note ?? null, ignored_by: opts?.by ?? null, ignored_at: new Date() },
    create: { tenant_id: tenantId, policy_id: policyId, signal_key: signalKey, note: opts?.note ?? null, ignored_by: opts?.by ?? null },
  })
}

/**
 * Undo an ignore. Removing a per-policy ignore while a tenant-wide one is in force leaves
 * the finding hidden — which is correct, and why the UI reports the scope back to the user.
 */
export async function removeIgnore(tenantId: string, policyId: string, signalKey: string): Promise<void> {
  await (prisma as any).policyLintIgnore
    .deleteMany({ where: { tenant_id: tenantId, policy_id: policyId, signal_key: signalKey } })
    .catch(() => {})
}

/** Everything this tenant has ignored, newest first — the "Ignored" list behind the undo. */
export async function listIgnores(tenantId: string): Promise<LintIgnore[]> {
  const rows: any[] = await (prisma as any).policyLintIgnore
    .findMany({ where: { tenant_id: tenantId }, orderBy: { ignored_at: 'desc' } })
    .catch(() => [])
  return rows.map(r => ({
    policy_id: r.policy_id,
    signal_key: r.signal_key,
    note: r.note ?? null,
    ignored_by: r.ignored_by ?? null,
    ignored_at: new Date(r.ignored_at).toISOString(),
  }))
}
