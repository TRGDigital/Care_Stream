// Shared "which audits need attention" logic — used by both the email reminder
// cron and the hub nav badge so they always agree.
//
// "Due to start" = no run this period. "In progress" = runs not yet completed.
// Long-cycle audits (monthly/quarterly) are only surfaced in their deadline
// window so admins aren't nagged for the whole period:
//   • monthly   → last 10 days of the month
//   • quarterly → final month of the quarter (Mar / Jun / Sep / Dec)

import { prisma } from '../../db/client'

export interface DueAudit { id: string; name: string; frequency: string }

export async function getAuditsDue(tenantId: string): Promise<{ due: DueAudit[]; inProgress: number }> {
  const [templates, runs] = await Promise.all([
    (prisma as any).auditTemplate.findMany({
      where:  { is_active: true, OR: [{ tenant_id: null }, { tenant_id: tenantId }] },
      select: { id: true, name: true, frequency: true },
    }),
    (prisma as any).auditRun.findMany({
      where:  { tenant_id: tenantId },
      select: { template_id: true, status: true, audit_month: true },
    }),
  ])

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

  const inLastMonthOfQuarter = (M % 3) === 2
  const inLastTenOfMonth     = D >= (daysInMonth - 9)

  const due: DueAudit[] = (templates as any[]).filter(tp => {
    switch (tp.frequency) {
      case 'daily':     return !ranToday.has(tp.id)
      case 'weekly':    return !ranMonth.has(tp.id)
      case 'monthly':   return !ranMonth.has(tp.id)   && inLastTenOfMonth
      case 'quarterly': return !ranQuarter.has(tp.id) && inLastMonthOfQuarter
      default:          return false                  // periodic / unknown — no schedule
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
