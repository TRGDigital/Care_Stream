// The ONLY place the Ask CareStream agents reach resident funding. Aggregates (counts, totals, averages) are always allowed for administrators. One person's own
// figures are returned only when the administrator NAMES that person, and every such read is audit logged (the log holds who and which resident, never the amounts).
// This file is on the funding safeguard test's short allow list; nothing else under services/ask may mention funding fields.
import { prisma } from '../../db/client'
import { writeAuditLog } from '../../lib/audit'
import { askAggregates, getFunding, fundingTablesReady } from '../../lib/resident-funding'

const db = prisma as any

export async function fundingAggregate(tenantId: string, today: string) {
  if (!(await fundingTablesReady())) return { ready: false as const }
  return { ready: true as const, ...(await askAggregates(tenantId, today)) }
}

export async function fundingForNamedPerson(o: { tenantId: string; userId: string; name: string }) {
  if (!(await fundingTablesReady())) return { ready: false as const }
  const words = o.name.trim().split(/\s+/).filter(Boolean)
  if (!words.length) return { ready: true as const, found: false as const, reason: 'No name was given.' }
  const all = await db.resident.findMany({ where: { tenant_id: o.tenantId, status: 'living' }, select: { id: true, first_name: true, last_name: true, preferred_name: true } })
  const hit = all.filter((r: any) => { const hay = `${r.first_name} ${r.last_name} ${r.preferred_name ?? ''}`.toLowerCase(); return words.every(w => hay.includes(w.toLowerCase())) })
  if (hit.length === 0) return { ready: true as const, found: false as const, reason: 'No current resident matches that name.' }
  if (hit.length > 1) return { ready: true as const, found: false as const, reason: `More than one person matches (${hit.length}). Ask the administrator for the full name.` }
  const r = hit[0]
  const f = await getFunding(o.tenantId, r.id)
  void writeAuditLog({ tenant_id: o.tenantId, user_id: o.userId, event_type: 'ask_funding_named_viewed', entity_type: 'resident', entity_id: r.id, metadata: { via: 'ask_carestream' } })
  if (!f) return { ready: true as const, found: true as const, name: `${r.first_name} ${r.last_name}`, recorded: false as const }
  return { ready: true as const, found: true as const, recorded: true as const, name: `${r.first_name} ${r.last_name}`, funding: f }
}
