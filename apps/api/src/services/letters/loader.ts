// The real data source for letters: reads the staff record, the service, the holiday figures, pay rates and the Data sources register.
//
// ADMIN ONLY. Pay rates (holiday_staff) and holiday figures are locked from staff. Everything in here that touches them must be called from an admin guarded route, and
// fields.ts additionally refuses to use them unless the caller says adminVerified. Never call this from a hub, family or staff facing route.

import { prisma } from '../../db/client'
import type { LetterDataSource } from './fields'

const p = () => prisma as any
const ymd = (d: any) => (d ? new Date(d).toISOString().slice(0, 10) : null)

export function prismaLetterSource(): LetterDataSource {
  return {
    async staff(tenantId, userId) {
      const u = await p().user.findFirst({ where: { id: userId, tenant_id: tenantId }, select: { name: true, job_role: true } })
      if (!u) return null
      let contracted: number | null = null, start: string | null = null
      try { const d = await p().staffDetail.findUnique({ where: { user_id: userId }, select: { contract_hours_per_week: true } }); contracted = d?.contract_hours_per_week != null ? Number(d.contract_hours_per_week) : null } catch { /* table not there yet */ }
      try { const h = await p().holidayStaff.findUnique({ where: { user_id: userId }, select: { start_date: true } }); start = ymd(h?.start_date) } catch { /* table not there yet */ }
      return { name: u.name, jobRole: u.job_role ?? null, startDate: start, contractedHours: contracted }
    },

    async service(tenantId) {
      // The name used in a letter is the organisation's TRADING name from the letterhead settings (the account's display name only when none is set).
      const { loadLetterhead } = await import('./letterhead')
      const l = await loadLetterhead(tenantId)
      return l.displayName ? { name: l.head.name } : null
    },

    async actor(userId) {
      const u = await p().user.findUnique({ where: { id: userId }, select: { name: true, job_role: true } })
      return u ? { name: u.name, jobRole: u.job_role ?? null } : null
    },

    // ADMIN ONLY
    async pay(tenantId, userId) {
      try {
        const h = await p().holidayStaff.findFirst({ where: { user_id: userId, tenant_id: tenantId }, select: { weekday_rate: true, weekend_rate: true } })
        if (!h) return null
        return { weekday: h.weekday_rate != null ? Number(h.weekday_rate) : null, weekend: h.weekend_rate != null ? Number(h.weekend_rate) : null }
      } catch { return null }
    },

    // ADMIN ONLY
    async holiday(tenantId, userId, asOf) {
      try {
        const { loadRoster, loadSettings, personBalance, yearContaining } = await import('../../lib/holiday-data')
        const settings = await loadSettings(tenantId)
        const person = (await loadRoster(tenantId)).find(r => r.id === userId)
        if (!person) return null
        const year = yearContaining(asOf, settings.year_start.month, settings.year_start.day)
        const { range, balance } = await personBalance(tenantId, person, year, settings, asOf)
        return { yearStart: range.from, yearEnd: range.to, unit: person.unit, allowance: person.allowance, carriedIn: balance.carry_in, taken: balance.taken, booked: balance.booked, remaining: balance.remaining }
      } catch { return null }
    },

    async reference(key) {
      try {
        const { toFigure, sourceByKey, ymd } = await import('../../lib/data-sources')
        const { oneRow } = await import('../../lib/data-sources-db')
        const def = sourceByKey(key === 'nlw_21_plus' ? 'nlw' : key)
        if (!def) return null
        const fig = toFigure(def, await oneRow(def.key), ymd(new Date()))
        // A failed or needs review figure is never used for a letter.
        if (!fig.usable) return null
        const rate = Number(fig.value?.current?.age21)
        return isFinite(rate) ? { value: rate, asOf: fig.effective_from ?? null, stale: fig.stale } : null
      } catch { return null }   // the register may not be live yet
    },
  }
}
