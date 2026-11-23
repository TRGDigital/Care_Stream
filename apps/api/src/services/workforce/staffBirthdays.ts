// Workforce compliance: staff birthdays (Enterprise).
//
// Daily job. For every account that has a date of birth recorded:
//   1. Seven days before a birthday, the account's admins get ONE email listing who is coming up (never the person themselves).
//      Switch: email preference staff_birthday_admin_alerts.
//   2. On the birthday, the staff member gets a happy birthday email from the company. Switch: staff_birthday_emails.
// Both default on and only ever fire for people whose date of birth an admin has entered. A log table (staff_birthday_log, unique per
// person, kind and year) means a re-run of the job on the same day sends nothing twice. Agency workers and inactive staff are skipped.
// Date of birth is personal data: the admin email gives the day and the age they turn, the staff email gives neither (and ends with the usual hub button).

import { prisma } from '../../db/client'
import { sweepTenants } from '../../lib/tenant-sweep'
import { isEmailEnabled } from '../../lib/notify'
import { sendTrainingUpdateEmail, sendStaffBirthdayEmail } from '../email/outbound'

export const ADMIN_NOTICE_DAYS = 7

const ymd = (d: Date) => d.toISOString().slice(0, 10)

/** Today's calendar date in the UK, as a UTC-midnight Date, so the job is not a day out around midnight or British Summer Time. */
export function ukToday(now = new Date()): Date {
  const [y, m, d] = new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit' }).format(now).split('-').map(Number)
  return new Date(Date.UTC(y, m - 1, d))
}

const isLeap = (y: number) => (y % 4 === 0 && y % 100 !== 0) || y % 400 === 0

/** A birthday in a given year. 29 February falls on 28 February in a year that has no 29th. */
export function birthdayIn(dob: Date, year: number): Date {
  const m = dob.getUTCMonth(), d = dob.getUTCDate()
  return new Date(Date.UTC(year, m, m === 1 && d === 29 && !isLeap(year) ? 28 : d))
}

/** The next birthday on or after `today`: its date, days away, and the age being reached. */
export function nextBirthday(dob: Date, now = new Date()): { date: string; days: number; turning: number } {
  const today = ukToday(now)
  let year = today.getUTCFullYear()
  let b = birthdayIn(dob, year)
  if (b.getTime() < today.getTime()) { year++; b = birthdayIn(dob, year) }
  return { date: ymd(b), days: Math.round((b.getTime() - today.getTime()) / 86_400_000), turning: year - dob.getUTCFullYear() }
}

const longDate = (iso: string) => new Date(iso + 'T00:00:00Z').toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', timeZone: 'UTC' })
const esc = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c] as string))

export interface BirthdayResult { admin_notices: number; staff_greetings: number; skipped?: string }
export interface BirthdayOpts { dryRun?: boolean; previewTo?: string; now?: Date }

export async function runStaffBirthdaysForTenant(tenantId: string, opts: BirthdayOpts = {}): Promise<BirthdayResult> {
  const out: BirthdayResult = { admin_notices: 0, staff_greetings: 0 }
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, plan: { select: { has_workforce_compliance: true } } } })
  if (!tenant?.plan?.has_workforce_compliance) return { ...out, skipped: 'plan' }

  const rows: any[] = await (prisma as any).staffDetail.findMany({ where: { tenant_id: tenantId, date_of_birth: { not: null } }, select: { user_id: true, date_of_birth: true } }).catch(() => [])
  if (!rows.length) return out
  const users = await (prisma as any).user.findMany({
    where: { tenant_id: tenantId, is_active: true, is_agency: false, id: { in: rows.map(r => r.user_id) } },
    select: { id: true, name: true, email: true, role: true },
  })
  const userById = new Map<string, any>(users.map((u: any) => [u.id, u]))
  const now = opts.now ?? new Date()
  const year = ukToday(now).getUTCFullYear()
  const preview = !!opts.previewTo
  // The greeting is shown as sent by the account's main administrator (the longest standing active one), so it follows the person-led layout.
  const sender = await (prisma as any).user.findFirst({ where: { tenant_id: tenantId, role: 'admin', is_active: true, is_shared: false }, orderBy: { created_at: 'asc' }, select: { id: true } }).catch(() => null)

  const already = async (userId: string, kind: string) => preview ? false : !!(await (prisma as any).staffBirthdayLog.findUnique({ where: { user_id_kind_year: { user_id: userId, kind, year } } }).catch(() => null))
  const record = (userId: string, kind: string) => preview || opts.dryRun ? Promise.resolve() : (prisma as any).staffBirthdayLog.create({ data: { tenant_id: tenantId, user_id: userId, kind, year } }).catch(() => {})

  const today: any[] = [], soon: any[] = []
  for (const r of rows) {
    const u = userById.get(r.user_id); if (!u) continue
    const nb = nextBirthday(new Date(r.date_of_birth), now)
    if (nb.days === 0) today.push({ u, nb })
    else if (nb.days === ADMIN_NOTICE_DAYS) soon.push({ u, nb })
  }

  // 1. Admin notice
  if (soon.length && await isEmailEnabled(tenantId, 'staff_birthday_admin_alerts')) {
    const fresh: typeof soon = []
    for (const s of soon) if (!(await already(s.u.id, 'admin_notice'))) fresh.push(s)
    if (fresh.length) {
      const admins: any[] = preview ? [{ id: 'preview', email: opts.previewTo, name: 'Admin' }] : await (prisma as any).user.findMany({ where: { tenant_id: tenantId, role: 'admin', is_active: true }, select: { id: true, email: true, name: true } })
      for (const a of admins) {
        const mine = fresh.filter(s => s.u.id !== a.id)   // never tell someone about their own birthday
        if (!mine.length) continue
        const items = mine.map(s => `<li style="margin:0 0 6px"><strong>${esc(s.u.name)}</strong> on ${esc(longDate(s.nb.date))}, turning ${s.nb.turning}</li>`).join('')
        const bodyHtml = `<p style="font-size:15px;margin:0 0 10px">${mine.length === 1 ? 'A member of staff has a birthday' : 'Some of your staff have birthdays'} in ${ADMIN_NOTICE_DAYS} days:</p><ul style="font-size:15px;margin:0 0 12px;padding-left:20px">${items}</ul><p style="font-size:14px;color:#666;margin:0">CareStream will send ${mine.length === 1 ? 'them' : 'each of them'} a happy birthday email from ${esc(tenant.name)} on the day, in case you would like to add a card or a word of your own.</p>`
        if (!opts.dryRun) await sendTrainingUpdateEmail({ to: a.email, name: a.name, orgName: tenant.name, subject: mine.length === 1 ? `Birthday coming up: ${mine[0].u.name}` : `${mine.length} staff birthdays coming up`, bodyHtml, buttonLabel: 'Open Workforce', buttonPath: '/workforce' }).catch(() => {})
        out.admin_notices++
      }
      for (const s of fresh) await record(s.u.id, 'admin_notice')
    }
  }

  // 2. Happy birthday to the staff member
  if (today.length && await isEmailEnabled(tenantId, 'staff_birthday_emails')) {
    for (const t of today) {
      if (await already(t.u.id, 'staff_greeting')) continue
      if (!opts.dryRun) await sendStaffBirthdayEmail({ to: preview ? opts.previewTo! : t.u.email, name: t.u.name, orgName: tenant.name, actorUserId: sender?.id ?? null, subjectPrefix: preview ? '[Preview] ' : '' }).catch(() => {})
      await record(t.u.id, 'staff_greeting')
      out.staff_greetings++
    }
  }
  return out
}

/** Cron entry: every account, resumable (see lib/tenant-sweep.ts). */
export async function runStaffBirthdaysAllTenants(): Promise<{ tenants: number; admin_notices: number; staff_greetings: number }> {
  let admin_notices = 0, staff_greetings = 0
  const swept = await sweepTenants('staff-birthdays', async (t) => {
    const r = await runStaffBirthdaysForTenant(t.id)
    admin_notices += r.admin_notices; staff_greetings += r.staff_greetings
  })
  return { tenants: swept.processed, admin_notices, staff_greetings }
}
