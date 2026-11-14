// Shared "which audits need attention" logic — used by both the email reminder
// cron and the hub nav badge so they always agree.
//
// "Due to start" = no run this period. "In progress" = runs not yet completed.
// Long-cycle audits (monthly/quarterly) are only surfaced in their deadline
// window so admins aren't nagged for the whole period:
//   • monthly   → last 10 days of the month
//   • quarterly → final month of the quarter (Mar / Jun / Sep / Dec)
//   • periodic  → about 11 months after the last completed one (a yearly review)
//
// Only audits a home has ADOPTED are ever due: its own audits, any it has run before, any with an open
// assignment, and (for a staff member) the ones allocated to them. The library has 100+ built-in audits,
// so treating all of them as due would bury every home in nags.

import { prisma } from '../../db/client'

export interface DueAudit { id: string; name: string; frequency: string }

// `allowedTemplateIds` scopes the result to a "Staff + Audits" member's allocated
// templates (omit / undefined = all of the tenant's audits, i.e. the admin view).
export async function getAuditsDue(tenantId: string, allowedTemplateIds?: string[]): Promise<{ due: DueAudit[]; inProgress: number }> {
  const scope = allowedTemplateIds && allowedTemplateIds.length ? { id: { in: allowedTemplateIds } } : {}
  const runScope = allowedTemplateIds && allowedTemplateIds.length ? { template_id: { in: allowedTemplateIds } } : {}
  const [allTemplates, runs, tenant, openAssignments] = await Promise.all([
    (prisma as any).auditTemplate.findMany({
      where:  { is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }], ...scope },
      select: { id: true, name: true, frequency: true, tenant_id: true },
    }),
    (prisma as any).auditRun.findMany({
      where:  { tenant_id: tenantId, ...runScope },
      select: { template_id: true, status: true, audit_month: true, completed_at: true },
    }),
    (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { hidden_audit_templates: true } }),
    (prisma as any).auditAssignment.findMany({ where: { tenant_id: tenantId, status: 'open' }, select: { template_id: true } }).catch(() => []),
  ])
  // Built-in audits the home has hidden are never due.
  const hidden: string[] = tenant?.hidden_audit_templates ?? []
  const everRan  = new Set((runs as any[]).map(r => r.template_id))
  const assigned = new Set((openAssignments as any[]).map(a => a.template_id))
  const scoped   = !!(allowedTemplateIds && allowedTemplateIds.length)
  const templates = (allTemplates as any[])
    .filter(t => t.tenant_id || !hidden.includes(t.id))
    .filter(t => t.tenant_id || scoped || everRan.has(t.id) || assigned.has(t.id))

  const now = new Date()
  const Y = now.getUTCFullYear(), M = now.getUTCMonth(), D = now.getUTCDate()
  const q = Math.floor(M / 3)
  const daysInMonth = new Date(Date.UTC(Y, M + 1, 0)).getUTCDate()

  const sameMonth   = (d: Date) => d.getUTCFullYear() === Y && d.getUTCMonth() === M
  const sameDay     = (d: Date) => sameMonth(d) && d.getUTCDate() === D
  const sameQuarter = (d: Date) => d.getUTCFullYear() === Y && Math.floor(d.getUTCMonth() / 3) === q

  const runDates    = (runs as any[]).map(r => ({ template_id: r.template_id, status: r.status, d: new Date(r.audit_month) }))
  const ranToday    = new Set(runDates.filter(r => sameDay(r.d)).map(r => r.template_id))
  const ranMonth    = new Set(runDates.filter(r => sameMonth(r.d)).map(r => r.template_id))
  const ranQuarter  = new Set(runDates.filter(r => sameQuarter(r.d)).map(r => r.template_id))
  const inProgress  = (runs as any[]).filter(r => r.status === 'in_progress').length

  // Latest completed run per template, for the yearly (periodic) review.
  const lastDone = new Map<string, number>()
  for (const r of runs as any[]) {
    if (r.status !== 'completed') continue
    const t = new Date(r.completed_at ?? r.audit_month).getTime()
    if (!lastDone.has(r.template_id) || t > (lastDone.get(r.template_id) as number)) lastDone.set(r.template_id, t)
  }
  const ELEVEN_MONTHS = 335 * 86_400_000

  const inLastMonthOfQuarter = (M % 3) === 2
  const inLastTenOfMonth     = D >= (daysInMonth - 9)

  const due: DueAudit[] = (templates as any[]).filter(tp => {
    switch (tp.frequency) {
      case 'daily':     return !ranToday.has(tp.id)
      case 'weekly':    return !ranMonth.has(tp.id)
      case 'monthly':   return !ranMonth.has(tp.id)   && inLastTenOfMonth
      case 'quarterly': return !ranQuarter.has(tp.id) && inLastMonthOfQuarter
      case 'periodic': {
        const last = lastDone.get(tp.id)
        const open = (runs as any[]).some(r => r.template_id === tp.id && r.status === 'in_progress')
        return last !== undefined && !open && (Date.now() - last) >= ELEVEN_MONTHS   // yearly review coming round
      }
      default:          return false
    }
  }).map(tp => ({ id: tp.id, name: tp.name, frequency: tp.frequency }))

  return { due, inProgress }
}

const FREQ_LABEL: Record<string, string> = {
  daily: 'Daily', weekly: 'Weekly', monthly: 'Monthly', quarterly: 'Quarterly', periodic: 'Periodic',
}
export function frequencyLabel(freq: string): string {
  return FREQ_LABEL[freq] ?? freq
}
