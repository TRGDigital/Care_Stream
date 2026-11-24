// Family reminders: settings per family contact, the daily job, and the stop action. The pure rules are in family-reminders-schedule.ts.
//
// A contact is a family invite (it holds the name, email and relationship). The sent link is a fresh private link: the contact's invite
// is given a new token, a new 14 day expiry and a cleared "opened" and "submitted" mark, exactly as the manager's Resend does, so the
// existing family page works. The previous link stops working, which is the same trade the manager's Resend makes.
// Everything here tolerates the resident_reminder_settings table not existing yet (the SQL is run by the owner).

import { prisma } from '../db/client'
import { writeAuditLog } from './audit'
import { siteUrl } from './urls'
import { INVITE_DAYS, residentsEnabled, newInviteToken } from './residents'
import { sendResidentFamilyReminderEmail } from '../services/email/outbound'
import {
  Cadence, londonDay, nextDueDate, decide, signStopToken, MAX_UNANSWERED,
} from './family-reminders-schedule'

const db = prisma as any

// An invite stores the inviting admin's EMAIL (created_by), not their id: look the person up so the reminder can show who it is from.
async function inviterUserId(tenantId: string, createdBy: string | null | undefined): Promise<string | null> {
  if (!createdBy) return null
  try { return (await (prisma as any).user.findFirst({ where: { tenant_id: tenantId, email: { equals: createdBy, mode: 'insensitive' }, is_active: true }, select: { id: true } }))?.id ?? null } catch { return null }
}

export async function remindersReady(): Promise<boolean> {
  try { await db.residentReminderSetting.findFirst({ select: { id: true } }); return true } catch { return false }
}

const iso = (d: Date | null | undefined) => (d ? d.toISOString() : null)
const dateOnly = (d: Date | null | undefined) => (d ? d.toISOString().slice(0, 10) : null)

export function reminderDto(s: any) {
  return {
    invite_id: s.invite_id, cadence: s.cadence as Cadence, weekday: s.weekday ?? null, paused_until: dateOnly(s.paused_until),
    next_due_at: iso(s.next_due_at), last_sent_at: iso(s.last_sent_at), last_reply_at: iso(s.last_reply_at),
    unanswered_count: s.unanswered_count, // Stalled once the job has found the 3rd reminder still unanswered when the next one fell due (it then clears next_due_at).
    stalled: s.cadence !== 'off' && s.unanswered_count >= MAX_UNANSWERED && !s.next_due_at, stopped_by_family: !!s.stopped_at,
  }
}

export async function listReminders(tenantId: string, residentId: string): Promise<any[]> {
  if (!(await remindersReady())) return []
  const rows = await db.residentReminderSetting.findMany({ where: { tenant_id: tenantId, resident_id: residentId }, take: 50 })
  return rows.map(reminderDto)
}

export interface ReminderInput { cadence: Cadence; weekday?: number | null; paused_until?: Date | null }

/** Creates or updates the settings for one contact and works out when the next reminder is due. The caller has checked the invite belongs to the resident. */
export async function saveReminder(opts: { tenantId: string; residentId: string; invite: any; input: ReminderInput; by: string; now?: Date }) {
  const now = opts.now ?? new Date()
  const today = londonDay(now)
  const existing = await db.residentReminderSetting.findUnique({ where: { invite_id: opts.invite.id } })
  const { cadence } = opts.input
  const weekday = opts.input.weekday ?? null
  const pausedUntil = opts.input.paused_until ?? null
  const lastReminder = existing?.last_sent_at ? londonDay(existing.last_sent_at) : null
  const nextDue = nextDueDate({
    cadence, weekday, today, pausedUntil, lastReminder,
    lastContact: lastReminder ?? (opts.invite.sent_at ? londonDay(opts.invite.sent_at) : today),
  })
  // Turning reminders on (or back on after they stalled or the family stopped them) starts the unanswered count again.
  const restarting = cadence !== 'off' && (!existing || existing.cadence === 'off' || existing.unanswered_count >= MAX_UNANSWERED)
  const data = {
    cadence, weekday: cadence === 'off' ? (existing?.weekday ?? null) : weekday, paused_until: pausedUntil, next_due_at: nextDue,
    ...(restarting ? { unanswered_count: 0, stopped_at: null } : {}),
  }
  const row = existing
    ? await db.residentReminderSetting.update({ where: { id: existing.id }, data })
    : await db.residentReminderSetting.create({ data: { tenant_id: opts.tenantId, resident_id: opts.residentId, invite_id: opts.invite.id, created_by: opts.by, ...data } })
  return row
}

/** A family member submitted something: the unanswered count starts again and the next reminder is worked out from the last one. */
export async function noteFamilyReply(inviteId: string, now = new Date()): Promise<void> {
  try {
    const s = await db.residentReminderSetting.findUnique({ where: { invite_id: inviteId } })
    if (!s) return
    const today = londonDay(now)
    const last = s.last_sent_at ? londonDay(s.last_sent_at) : null
    await db.residentReminderSetting.update({
      where: { id: s.id },
      data: {
        unanswered_count: 0, last_reply_at: now,
        next_due_at: nextDueDate({ cadence: s.cadence, weekday: s.weekday, today, pausedUntil: s.paused_until, lastContact: last ?? today, lastReminder: last }),
      },
    })
  } catch { /* table not created yet, or nothing to update */ }
}

/** Switch every reminder for a resident off at once (used when a resident is deleted or moves on). */
export async function cancelResidentReminders(tenantId: string, residentId: string, remove = false): Promise<void> {
  try {
    if (remove) await db.residentReminderSetting.deleteMany({ where: { tenant_id: tenantId, resident_id: residentId } })
    else await db.residentReminderSetting.updateMany({ where: { tenant_id: tenantId, resident_id: residentId }, data: { cadence: 'off', next_due_at: null } })
  } catch { /* table not created yet */ }
}

/** The family member pressed "Stop these reminders". Idempotent. Returns names for the confirmation page, or null when the setting is gone. */
export async function stopByFamily(settingId: string): Promise<{ resident_name: string; home_name: string } | null> {
  if (!(await remindersReady())) return null
  const s = await db.residentReminderSetting.findUnique({ where: { id: settingId } })
  if (!s) return null
  if (s.cadence !== 'off') {
    await db.residentReminderSetting.update({ where: { id: s.id }, data: { cadence: 'off', next_due_at: null, stopped_at: new Date() } })
    void writeAuditLog({ tenant_id: s.tenant_id, user_id: null, event_type: 'resident_reminders_stopped', entity_type: 'resident', entity_id: s.resident_id, metadata: { by: 'family', invite_id: s.invite_id } })
  }
  const [r, t] = await Promise.all([
    db.resident.findFirst({ where: { id: s.resident_id, tenant_id: s.tenant_id }, select: { first_name: true, preferred_name: true } }),
    db.tenant.findUnique({ where: { id: s.tenant_id }, select: { name: true } }),
  ])
  return { resident_name: r ? (r.preferred_name || r.first_name) : 'them', home_name: t?.name ?? 'the home' }
}

// ─── The daily job ─────────────────────────────────────────────────────────────
export interface RunSummary {
  ready: boolean; checked: number; sent: number; stalled: number; scheduled: number; skipped: number; failed: number
}
const MAX_PER_RUN = 1000

/** Sends the reminders that are due today. dryRun works everything out and writes nothing. */
export async function runFamilyReminders(opts: { now?: Date; dryRun?: boolean } = {}): Promise<RunSummary> {
  const now = opts.now ?? new Date()
  const today = londonDay(now)
  const out: RunSummary = { ready: false, checked: 0, sent: 0, stalled: 0, scheduled: 0, skipped: 0, failed: 0 }
  if (!(await remindersReady())) return out
  out.ready = true

  const rows = await db.residentReminderSetting.findMany({ where: { cadence: { not: 'off' } }, orderBy: { next_due_at: 'asc' }, take: MAX_PER_RUN })
  const planOk = new Map<string, boolean>()
  const homeName = new Map<string, string>()

  for (const s of rows) {
    out.checked++
    try {
      // Everything that ends reminders at once: resident gone, left or deceased; contact cancelled or without an email; plan lapsed.
      const [resident, invite] = await Promise.all([
        db.resident.findFirst({ where: { id: s.resident_id, tenant_id: s.tenant_id } }),
        db.residentInvite.findFirst({ where: { id: s.invite_id, tenant_id: s.tenant_id, resident_id: s.resident_id } }),
      ])
      if (!resident || resident.status !== 'living' || !invite || invite.revoked_at || !invite.email) { out.skipped++; continue }
      if (!planOk.has(s.tenant_id)) planOk.set(s.tenant_id, await residentsEnabled(s.tenant_id))
      if (!planOk.get(s.tenant_id)) { out.skipped++; continue }

      // Did they reply to the last reminder? The invite's submitted mark is cleared when a fresh link is made, so check what they sent since.
      let replied = false
      let repliedAt: Date | null = null
      if (s.last_sent_at) {
        if (invite.submitted_at && invite.submitted_at > s.last_sent_at) { replied = true; repliedAt = invite.submitted_at }
        else {
          const c = await db.residentContribution.findFirst({ where: { invite_id: invite.id, submitted_at: { gt: s.last_sent_at } }, orderBy: { submitted_at: 'desc' }, select: { submitted_at: true } })
          if (c) { replied = true; repliedAt = c.submitted_at }
        }
      }

      const d = decide({ cadence: s.cadence, nextDueAt: s.next_due_at, pausedUntil: s.paused_until, lastSentAt: s.last_sent_at, unanswered: s.unanswered_count, replied, today })
      const last = s.last_sent_at ? londonDay(s.last_sent_at) : null
      const reschedule = () => nextDueDate({ cadence: s.cadence, weekday: s.weekday, today, pausedUntil: s.paused_until, lastContact: last ?? londonDay(invite.sent_at), lastReminder: last })

      if (d.action === 'stalled') {
        out.stalled++
        if (!opts.dryRun && s.next_due_at) await db.residentReminderSetting.update({ where: { id: s.id }, data: { next_due_at: null } })
        continue
      }
      if (d.action === 'schedule') {
        out.scheduled++
        if (!opts.dryRun) await db.residentReminderSetting.update({ where: { id: s.id }, data: { next_due_at: reschedule(), unanswered_count: d.unanswered, ...(repliedAt ? { last_reply_at: repliedAt } : {}) } })
        continue
      }
      if (d.action === 'wait') {
        if (replied && !opts.dryRun) await db.residentReminderSetting.update({ where: { id: s.id }, data: { unanswered_count: 0, last_reply_at: repliedAt } })
        continue
      }
      if (opts.dryRun) { out.sent++; continue }

      // Claim the send first (only if nobody else has since the row was read), so a second run of the job cannot send it again.
      const claimed = await db.residentReminderSetting.updateMany({ where: { id: s.id, last_sent_at: s.last_sent_at }, data: { last_sent_at: now } })
      if (claimed.count !== 1) { out.skipped++; continue }
      const stopToken = signStopToken(s.id)
      if (!stopToken) { await db.residentReminderSetting.update({ where: { id: s.id }, data: { last_sent_at: s.last_sent_at } }); out.failed++; continue }

      if (!homeName.has(s.tenant_id)) homeName.set(s.tenant_id, (await db.tenant.findUnique({ where: { id: s.tenant_id }, select: { name: true } }))?.name ?? 'the home')
      const { token, hash } = newInviteToken()
      try {
        await sendResidentFamilyReminderEmail({
          to: invite.email, inviteeName: invite.name, residentName: resident.preferred_name || resident.first_name, homeName: homeName.get(s.tenant_id)!,
          tenantId: s.tenant_id, senderUserId: await inviterUserId(s.tenant_id, invite.created_by), link: `${siteUrl()}/family/${token}`, stopLink: `${siteUrl()}/family/stop/${stopToken}`, days: INVITE_DAYS,
        })
      } catch (e: any) {
        await db.residentReminderSetting.update({ where: { id: s.id }, data: { last_sent_at: s.last_sent_at } }).catch(() => undefined)   // try again tomorrow
        console.error('[family-reminders] send failed for a reminder:', String(e?.message ?? e).slice(0, 120))   // never log the address or links
        out.failed++; continue
      }
      await db.residentInvite.update({ where: { id: invite.id }, data: { token_hash: hash, sent_at: now, expires_at: new Date(now.getTime() + INVITE_DAYS * 86400000), opened_at: null, submitted_at: null } })
      const next = nextDueDate({ cadence: s.cadence, weekday: s.weekday, today, pausedUntil: s.paused_until, lastContact: today, lastReminder: today })
      await db.residentReminderSetting.update({
        where: { id: s.id }, data: { unanswered_count: d.unanswered + 1, next_due_at: next, ...(repliedAt ? { last_reply_at: repliedAt } : {}) },
      })
      void writeAuditLog({ tenant_id: s.tenant_id, user_id: null, event_type: 'resident_reminder_sent', entity_type: 'resident', entity_id: s.resident_id, metadata: { invite_id: invite.id, unanswered: d.unanswered + 1 } })
      out.sent++
    } catch (e: any) {
      out.failed++
      console.error('[family-reminders] contact failed:', String(e?.message ?? e).slice(0, 160))
    }
  }
  return out
}
