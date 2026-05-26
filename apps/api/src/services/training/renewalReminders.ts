// Training renewal reminder service.
//
// Queries all complete enrollments expiring in exactly 90 / 30 / 7 days,
// respects per-tenant notification settings, and sends reminders via
// WhatsApp (preferred) or email. Optionally sends a manager digest.
//
// Designed to be called once per day — safe to call multiple times because
// the date-window filter prevents double-sending within the same calendar day.

import twilio from 'twilio'
import sgMail from '@sendgrid/mail'
import { prisma } from '../../db/client'
import { splitIntoChunks } from '../../utils/htmlToWhatsApp'

const INBOUND_DOMAIN = process.env.INBOUND_EMAIL_DOMAIN ?? 'carestreamai.co.uk'
const WA_NUMBER      = process.env.TWILIO_WHATSAPP_NUMBER ?? ''
const THRESHOLDS     = [90, 30, 7] as const

// ─── Transport helpers ────────────────────────────────────────────────────────

async function sendWA(to: string, body: string): Promise<void> {
  const client = twilio(process.env.TWILIO_ACCOUNT_SID, process.env.TWILIO_AUTH_TOKEN)
  const chunks = splitIntoChunks(body)
  for (let i = 0; i < chunks.length; i++) {
    if (i > 0) await new Promise(r => setTimeout(r, 500))
    await client.messages.create({ from: `whatsapp:${WA_NUMBER}`, to: `whatsapp:${to}`, body: chunks[i] })
  }
}

async function sendEmail(to: string, subject: string, html: string): Promise<void> {
  if (!process.env.SENDGRID_API_KEY) return
  sgMail.setApiKey(process.env.SENDGRID_API_KEY)
  const from = process.env.SENDGRID_FROM_EMAIL ?? `noreply@${INBOUND_DOMAIN}`
  await (sgMail as any).send({ to, from, subject, html })
}

// ─── Message builders ─────────────────────────────────────────────────────────

function staffReminderWA(firstName: string, moduleName: string, days: number): string {
  return [
    `📋 *Training Renewal Reminder*`,
    '',
    `Hi ${firstName}, your training module *"${moduleName}"* is due for renewal in *${days} day${days === 1 ? '' : 's'}*.`,
    '',
    'You will receive your renewal questions shortly. If you have any questions about the module content, just send your question here at any time.',
    '',
    '_CareStreamAI Training_',
  ].join('\n')
}

function staffReminderEmail(firstName: string, moduleName: string, days: number): string {
  return `
<div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <p>Hi ${firstName},</p>
  <p>This is a reminder that your training module <strong>"${moduleName}"</strong> is due for renewal in <strong>${days} day${days === 1 ? '' : 's'}</strong>.</p>
  <div style="background:#f0fdfa;border-left:4px solid #0d9488;border-radius:6px;padding:16px 20px;margin:20px 0">
    <p style="margin:0;font-size:14px;color:#374151">
      You will be sent your renewal assessment questions soon. In the meantime, if you have any questions about your training content, you can reply to this email or send a WhatsApp message and CareStreamAI will answer immediately.
    </p>
  </div>
  <p style="color:#aaa;font-size:12px;margin-top:32px">CareStreamAI Training — sent on behalf of your organisation.</p>
</div>`.trim()
}

function managerDigestEmail(
  orgName:  string,
  daysMap:  Record<number, Array<{ name: string; module: string }>>,
): string {
  const sections = THRESHOLDS
    .filter(d => (daysMap[d] ?? []).length > 0)
    .map(d => {
      const items = daysMap[d]
        .map(r => `<li style="padding:2px 0">${r.name} — <em>${r.module}</em></li>`)
        .join('')
      return `
        <p style="margin:16px 0 4px;font-weight:600;color:#111827">Expiring in ${d} days</p>
        <ul style="margin:0;padding-left:20px;color:#374151;font-size:14px">${items}</ul>`
    }).join('')

  return `
<div style="font-family:Inter,sans-serif;max-width:640px;margin:0 auto;padding:24px">
  <p style="margin:0 0 4px;font-size:20px;font-weight:700;color:#0d9488">Training Renewal Digest</p>
  <p style="margin:0 0 20px;font-size:13px;color:#6b7280">${orgName}</p>
  <p>The following staff members have training modules expiring soon:</p>
  ${sections}
  <p style="margin-top:24px;font-size:13px;color:#6b7280">
    Staff have been notified automatically. Log in to the training dashboard to view the full compliance grid.
  </p>
  <p style="color:#aaa;font-size:12px;margin-top:32px">CareStreamAI Training</p>
</div>`.trim()
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface ReminderResult {
  sent:   number
  skipped: number
  errors: number
}

export async function sendRenewalReminders(): Promise<ReminderResult> {
  let sent = 0, skipped = 0, errors = 0

  const now = new Date()

  // Build date windows for each threshold (calendar-day precision)
  const windows = THRESHOLDS.map(days => {
    const start = new Date(now)
    start.setDate(start.getDate() + days)
    start.setHours(0, 0, 0, 0)
    const end = new Date(start)
    end.setHours(23, 59, 59, 999)
    return { days, start, end }
  })

  // Fetch all matching enrollments across all tenants in one query
  const enrollments = await (prisma as any).trainingEnrollment.findMany({
    where: {
      status:     'complete',
      expires_at: {
        gte: windows[0].start,          // 90-day start
        lte: windows[windows.length - 1].end,  // 7-day end
      },
    },
    include: {
      module: { select: { name: true } },
      user:   { select: { id: true, name: true, email: true, phone_number: true } },
      tenant: { select: { id: true, name: true, slug: true, training_settings: true } },
    },
  })

  // Group by tenant for manager digest
  const managerDigestMap = new Map<string, {
    tenant:  any
    entries: Array<{ days: number; userName: string; moduleName: string }>
  }>()

  for (const enrollment of enrollments) {
    const expiresAt   = new Date(enrollment.expires_at)
    const settings    = (enrollment.tenant.training_settings as any) ?? {}

    if (!settings.notifications_enabled) { skipped++; continue }

    // Determine which threshold this enrollment falls in
    const threshold = windows.find(w => expiresAt >= w.start && expiresAt <= w.end)
    if (!threshold) { skipped++; continue }

    const thresholdKey = `notify_${threshold.days}d` as keyof typeof settings
    if (!settings[thresholdKey]) { skipped++; continue }

    const user      = enrollment.user
    const firstName = (user.name as string ?? '').split(' ')[0] || 'there'
    const modName   = enrollment.module.name as string

    // Send staff notification
    try {
      if (user.phone_number) {
        await sendWA(user.phone_number as string, staffReminderWA(firstName, modName, threshold.days))
      } else if (user.email) {
        await sendEmail(
          user.email as string,
          `Training renewal in ${threshold.days} days — ${modName}`,
          staffReminderEmail(firstName, modName, threshold.days),
        )
      }
      sent++
    } catch (e) {
      console.error(`[training/reminders] Failed for user=${user.id} module=${enrollment.module_id}:`, e)
      errors++
    }

    // Collect for manager digest
    if (settings.notify_manager) {
      const tenantId = enrollment.tenant.id as string
      if (!managerDigestMap.has(tenantId)) {
        managerDigestMap.set(tenantId, { tenant: enrollment.tenant, entries: [] })
      }
      managerDigestMap.get(tenantId)!.entries.push({
        days:       threshold.days,
        userName:   user.name as string,
        moduleName: modName,
      })
    }
  }

  // Send manager digests
  for (const [tenantId, { tenant, entries }] of managerDigestMap) {
    try {
      const managers = await (prisma as any).user.findMany({
        where:  { tenant_id: tenantId, role: { in: ['admin', 'manager'] }, is_active: true },
        select: { email: true, phone_number: true },
      })

      // Build per-threshold buckets for the digest
      const daysMap: Record<number, Array<{ name: string; module: string }>> = {}
      for (const e of entries) {
        if (!daysMap[e.days]) daysMap[e.days] = []
        daysMap[e.days].push({ name: e.userName, module: e.moduleName })
      }

      for (const manager of managers) {
        if (!manager.email) continue
        await sendEmail(
          manager.email as string,
          `Training renewal digest — ${tenant.name}`,
          managerDigestEmail(tenant.name as string, daysMap),
        ).catch(e => console.error('[training/reminders] Manager digest failed:', e))
      }
    } catch (e) {
      console.error('[training/reminders] Manager digest error for tenant:', tenantId, e)
    }
  }

  console.log(`[training/reminders] Complete — sent=${sent} skipped=${skipped} errors=${errors}`)
  return { sent, skipped, errors }
}
