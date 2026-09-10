// Time-boxed access for agency workers.
//
// An agency booking has an end date, and when it passes the worker should not still be able to
// read the home's policies. But the obvious implementation, revoke at midnight on the end date,
// is wrong in a way that matters: an agency nurse on a night shift would lose the medication
// policy at 3am, in the middle of the shift they were booked for, at exactly the moment they
// most need it. That is a safety problem before it is an inconvenience.
//
// So there are two steps, not one:
//
//   1. THREE DAYS BEFORE the end date, email the admins. They can extend the booking or let it
//      lapse deliberately, rather than discovering it after the fact.
//   2. TWENTY FOUR HOURS AFTER the end date, revoke access. That covers the night shift that
//      began on the last booked day and finishes the following morning.
//
// Nothing is deleted. Revoking sets is_active false, exactly as deactivating any staff member
// does, so their training record, completions and evidence survive for CQC. If the same worker
// comes back next month, the admin re-books the existing record rather than creating a second
// one, which is why extending is offered before archiving anywhere this appears in the UI.

import { prisma } from '../../db/client'
import { sendAgencyExpiryEmail } from '../email/outbound'

/** Hours after agency_end before access is actually withdrawn. Long enough to cover a night
 *  shift that started on the final booked day. */
const GRACE_HOURS = 24

/** Days before agency_end that the admins are warned. */
const WARN_DAYS = 3

export type AgencyAccessSummary = {
  checked: number
  warned: number
  revoked: number
  errors: number
  /** Named so the daily jobs email can say who, not just how many. */
  warned_staff: Array<{ name: string; agency: string; ends: string; tenant: string }>
  revoked_staff: Array<{ name: string; agency: string; tenant: string }>
}

export async function runAgencyAccess(): Promise<AgencyAccessSummary> {
  const now = new Date()
  const warnBefore = new Date(now.getTime() + WARN_DAYS * 864e5)
  const revokeBefore = new Date(now.getTime() - GRACE_HOURS * 36e5)

  const summary: AgencyAccessSummary = {
    checked: 0, warned: 0, revoked: 0, errors: 0, warned_staff: [], revoked_staff: [],
  }

  const agency = await (prisma as any).user.findMany({
    where:  { is_agency: true, is_active: true, agency_end: { not: null } },
    select: {
      id: true, tenant_id: true, name: true, email: true,
      agency_name: true, agency_end: true, agency_expiry_warned_at: true,
    },
  }).catch(() => [])

  if (!agency.length) return summary
  summary.checked = agency.length

  // Tenant names for the report, fetched once rather than per worker.
  const tenants = await (prisma as any).tenant.findMany({
    where:  { id: { in: [...new Set(agency.map((a: any) => a.tenant_id))] } },
    select: { id: true, name: true },
  }).catch(() => [])
  const tenantName = new Map<string, string>(tenants.map((t: any) => [t.id, t.name ?? '']))

  for (const worker of agency as any[]) {
    const end = new Date(worker.agency_end)
    try {
      // Past the grace period: withdraw access. Deliberately BEFORE the warning branch, so a
      // booking added in the past is revoked rather than warned about.
      if (end <= revokeBefore) {
        await (prisma as any).user.update({
          where: { id: worker.id },
          data:  { is_active: false },
        })
        summary.revoked++
        summary.revoked_staff.push({
          name: worker.name ?? '', agency: worker.agency_name ?? '',
          tenant: tenantName.get(worker.tenant_id) ?? '',
        })
        continue
      }

      // Ending soon and not yet warned for THIS booking. The stamp is cleared whenever the end
      // date is extended, so a re-booked worker gets a fresh warning rather than none.
      if (end <= warnBefore && !worker.agency_expiry_warned_at) {
        const admins = await (prisma as any).user.findMany({
          where:  { tenant_id: worker.tenant_id, role: 'admin', is_active: true },
          select: { email: true, name: true },
        }).catch(() => [])

        if (admins.length) {
          await sendAgencyExpiryEmail({
            to: admins.map((a: any) => a.email).filter(Boolean),
            workerName: worker.name ?? '',
            agencyName: worker.agency_name ?? '',
            endsOn: end,
            graceHours: GRACE_HOURS,
          }).catch(() => { summary.errors++ })
        }

        await (prisma as any).user.update({
          where: { id: worker.id },
          data:  { agency_expiry_warned_at: now },
        })
        summary.warned++
        summary.warned_staff.push({
          name: worker.name ?? '', agency: worker.agency_name ?? '',
          ends: end.toISOString().slice(0, 10),
          tenant: tenantName.get(worker.tenant_id) ?? '',
        })
      }
    } catch (e: any) {
      console.error('[agency-access] failed for', worker.id, e?.message ?? e)
      summary.errors++
    }
  }

  return summary
}

/** What a home spent on agency cover, and how much of it they used.
 *
 *  Providers avoid agency because it is expensive, so the number they actually want is not
 *  "how many agency workers do we have" but "how many days did we buy, and what did that
 *  cost". Bookings are counted in days because that is how agencies invoice. */
export type AgencySpend = {
  bookings: number
  people: number
  days: number
  /** Null when no day rate has been recorded against any booking: an unknown cost is shown as
   *  unknown rather than as zero, which would read as free. */
  cost_pence: number | null
  by_agency: Array<{ agency: string; bookings: number; days: number; cost_pence: number | null }>
  active_now: number
}

export async function agencySpend(tenantId: string, opts: { since?: Date } = {}): Promise<AgencySpend> {
  const since = opts.since ?? new Date(Date.now() - 365 * 864e5)
  const rows = await (prisma as any).user.findMany({
    where:  { tenant_id: tenantId, is_agency: true, agency_start: { not: null } },
    select: {
      id: true, name: true, is_active: true, agency_name: true,
      agency_start: true, agency_end: true, agency_day_rate_pence: true,
    },
  }).catch(() => [])

  const now = new Date()
  const out: AgencySpend = {
    bookings: 0, people: 0, days: 0, cost_pence: null, by_agency: [], active_now: 0,
  }
  if (!rows.length) return out

  const byAgency = new Map<string, { agency: string; bookings: number; days: number; cost_pence: number | null }>()
  let anyRate = false

  for (const r of rows as any[]) {
    const start = new Date(r.agency_start)
    if (start < since) continue
    const end = r.agency_end ? new Date(r.agency_end) : now
    // Inclusive of both the first and last booked day, which is how a rota reads it.
    const days = Math.max(1, Math.round((end.getTime() - start.getTime()) / 864e5) + 1)

    out.bookings++
    out.days += days
    if (r.is_active && (!r.agency_end || new Date(r.agency_end) >= now)) out.active_now++

    const rate = typeof r.agency_day_rate_pence === 'number' ? r.agency_day_rate_pence : null
    if (rate !== null) {
      anyRate = true
      out.cost_pence = (out.cost_pence ?? 0) + rate * days
    }

    const key = (r.agency_name || 'Unnamed agency').trim()
    const a = byAgency.get(key) ?? { agency: key, bookings: 0, days: 0, cost_pence: null }
    a.bookings++
    a.days += days
    if (rate !== null) a.cost_pence = (a.cost_pence ?? 0) + rate * days
    byAgency.set(key, a)
  }

  out.people = new Set((rows as any[]).map(r => r.id)).size
  out.by_agency = [...byAgency.values()].sort((a, b) => b.days - a.days)
  if (!anyRate) out.cost_pence = null
  return out
}
