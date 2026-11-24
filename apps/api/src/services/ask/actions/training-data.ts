// Read only helpers for the training actions: finding courses by name, who already has them, and who has something overdue or due soon.
import { prisma } from '../../../db/client'
import { addDays, ukToday } from '../data'
const p = () => prisma as any

/** Courses an administrator can allocate in this account (the account's own and the approved standard ones), matched by name. */
export async function findModules(tenantId: string, names: string[]): Promise<{ modules: Array<{ id: string; name: string }>; unmatched: string[]; alternatives: Record<string, string[]> }> {
  const out: Array<{ id: string; name: string }> = [], unmatched: string[] = [], alternatives: Record<string, string[]> = {}
  for (const raw of names.slice(0, 5)) {
    const n = String(raw).trim(); if (!n) continue
    const rows: any[] = await p().trainingModule.findMany({ where: { is_active: true, name: { contains: n, mode: 'insensitive' }, OR: [{ tenant_id: tenantId }, { tenant_id: null, source: 'ai_generated', approved: true }] }, select: { id: true, name: true, tenant_id: true }, take: 8, orderBy: { name: 'asc' } })
    if (!rows.length) { unmatched.push(n); continue }
    const exact = rows.find(r => String(r.name).toLowerCase() === n.toLowerCase()) ?? rows.find(r => r.tenant_id === tenantId) ?? rows[0]
    out.push({ id: String(exact.id), name: String(exact.name) })
    const alt = rows.filter(r => r.id !== exact.id).map(r => String(r.name)); if (alt.length) alternatives[n] = alt.slice(0, 4)
  }
  return { modules: out, unmatched, alternatives }
}

/** Who already has each of these courses (not expired), so the card can say who is skipped. */
export async function alreadyAllocated(tenantId: string, userIds: string[], moduleIds: string[]): Promise<Array<{ user_id: string; module_id: string }>> {
  if (!userIds.length || !moduleIds.length) return []
  const r: any[] = await p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, user_id: { in: userIds }, module_id: { in: moduleIds }, status: { not: 'expired' } }, select: { user_id: true, module_id: true } })
  return r.map(x => ({ user_id: String(x.user_id), module_id: String(x.module_id) }))
}

/** Unfinished allocations that are overdue (due date passed) or due within a number of days, for the chosen people (or everyone). */
export async function dueEnrollments(tenantId: string, scope: 'overdue' | 'due_soon', withinDays: number, userIds: string[] | null, today = ukToday()) {
  const where: any = { tenant_id: tenantId, status: { not: 'complete' }, due_date: scope === 'overdue' ? { lt: new Date(today + 'T00:00:00Z') } : { gte: new Date(today + 'T00:00:00Z'), lte: new Date(addDays(today, Math.max(1, Math.min(120, withinDays))) + 'T23:59:59Z') } }
  if (userIds) where.user_id = { in: userIds }
  const rows: any[] = await p().trainingEnrollment.findMany({ where, select: { id: true, user_id: true, due_date: true, module: { select: { name: true } }, user: { select: { is_active: true } } }, orderBy: { due_date: 'asc' }, take: 500 })
  return rows.filter(r => r.user?.is_active).map(r => ({ id: String(r.id), user_id: String(r.user_id), course: String(r.module?.name ?? 'a course'), due: r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : null }))
}
export async function enrollmentsByIds(tenantId: string, ids: string[]) {
  if (!ids.length) return []
  const rows: any[] = await p().trainingEnrollment.findMany({ where: { tenant_id: tenantId, id: { in: ids }, status: { not: 'complete' } }, select: { id: true, user_id: true, due_date: true, module: { select: { name: true } }, user: { select: { is_active: true } } } })
  return rows.filter(r => r.user?.is_active).map(r => ({ id: String(r.id), user_id: String(r.user_id), course: String(r.module?.name ?? 'a course'), due: r.due_date ? new Date(r.due_date).toISOString().slice(0, 10) : null }))
}
