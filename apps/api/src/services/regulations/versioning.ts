// Regulation change tracking. On every console edit we snapshot the new state (for
// history + diffs) and, when the change is MATERIAL (the standard's actual content,
// not internal tuning), alert every tenant that is assessed against it so they can
// review and re-check their policies.

import { prisma } from '../../db/client'

// Fields whose change means "the standard itself changed" → tenants are alerted.
const MATERIAL_FIELDS = [
  'official_name', 'summary', 'care_home_context', 'practical_meaning',
  'authoritative_requirements', 'required_elements',
] as const

// All tracked fields (for the history/diff view).
const TRACKED_FIELDS = [
  ...MATERIAL_FIELDS,
  'care_company_interaction', 'also_known_as', 'source_urls',
  'match_terms', 'distinguish_from', 'expected_policy_titles',
  'applies_to_settings', 'required_triggers', 'authority_basis', 'is_active',
] as const

const norm = (v: unknown): string => Array.isArray(v) ? JSON.stringify(v) : JSON.stringify(v ?? null)

function changedFields(before: any, after: any): string[] {
  const out: string[] = []
  for (const f of TRACKED_FIELDS) if (norm(before?.[f]) !== norm(after?.[f])) out.push(f)
  return out
}

function snapshotOf(reg: any): Record<string, unknown> {
  const snap: Record<string, unknown> = {}
  for (const f of TRACKED_FIELDS) snap[f] = reg?.[f]
  return snap
}

// Record a version and (on a material change) fan out tenant alerts. Best-effort:
// never throw into the caller's request path. `notifyTenants` false records the
// version but suppresses the tenant alerts (used during content build-out / minor
// edits, so admins aren't spammed for changes that aren't real standards updates).
export async function snapshotAndAlert(before: any, after: any, opts: { notifyTenants?: boolean } = {}): Promise<void> {
  try {
    const changed = changedFields(before, after)
    if (!changed.length) return

    const material = changed.some(f => (MATERIAL_FIELDS as readonly string[]).includes(f))

    const version = await (prisma as any).regulationVersion.create({
      data: {
        reference_key: after.reference_key,
        official_name: after.official_name,
        snapshot:      snapshotOf(after),
        changed_fields: changed,
        material,
      },
    })

    if (!material || opts.notifyTenants === false) return

    // Alert every tenant assessed against this regulation (has a cached coverage row
    // = it's in scope for them and they've run the analysis). Refresh any existing
    // undismissed alert so it reflects the latest change.
    const rows = await (prisma as any).regulationCoverage.findMany({
      where: { reference_key: after.reference_key }, select: { tenant_id: true },
    })
    const tenantIds = [...new Set((rows as any[]).map(r => r.tenant_id))]
    if (!tenantIds.length) return

    await (prisma as any).tenantRegulationAlert.deleteMany({
      where: { reference_key: after.reference_key, tenant_id: { in: tenantIds }, dismissed_at: null },
    })
    await (prisma as any).tenantRegulationAlert.createMany({
      data: tenantIds.map(tid => ({
        tenant_id: tid, reference_key: after.reference_key, official_name: after.official_name,
        version_id: version.id, changed_fields: changed,
      })),
    })
  } catch (e) {
    console.error('[regulation-versioning] snapshot/alert failed:', (e as any)?.message ?? e)
  }
}
