// Onboarding drip orchestration: enrol tenants, work out which email is due on a
// given working day, and send it to every active admin (idempotently) via SendGrid
// with open + click tracking. Day 1 can also be sent immediately on signup.

import sgMail from '@sendgrid/mail'
import crypto from 'crypto'
import { prisma } from '../../db/client'
import { renderOnboardingEmailHtml } from './render'

const FROM     = process.env.ONBOARDING_FROM_EMAIL ?? 'hello@carestreamai.com'
const FROM_NAME = 'CareStream'
const WEB      = process.env.WEB_PUBLIC_URL ?? 'https://www.carestreamai.com'
const API_BASE = process.env.API_PUBLIC_URL ?? 'https://api.carestreamai.com'
const UNSUB_SECRET = process.env.ONBOARDING_UNSUB_SECRET ?? process.env.NEXTAUTH_SECRET ?? 'cs-onboarding'

let sgReady = false
function ensureSg(): boolean {
  if (sgReady) return true
  if (!process.env.SENDGRID_API_KEY) return false
  sgMail.setApiKey(process.env.SENDGRID_API_KEY); sgReady = true; return true
}

// ─── UK date / working-day helpers ────────────────────────────────────────────

export function ukNow(): { dateStr: string; hour: number } {
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', hour12: false,
  }).formatToParts(new Date())
  const g = (t: string) => parts.find(p => p.type === t)?.value ?? '0'
  // hour can come back as '24' at midnight in some environments; normalise.
  const hour = (+g('hour')) % 24
  return { dateStr: `${g('year')}-${g('month')}-${g('day')}`, hour }
}

const dateFromStr = (s: string) => { const [y, m, d] = s.split('-').map(Number); return new Date(Date.UTC(y, m - 1, d)) }
const isWeekend = (dt: Date) => { const g = dt.getUTCDay(); return g === 0 || g === 6 }

// 1-based count of working days from start to today (inclusive). null if today is
// before the start or falls on a weekend (no send that day).
export function workingDayIndex(startStr: string, todayStr: string): number | null {
  const start = dateFromStr(startStr), today = dateFromStr(todayStr)
  if (today < start) return null
  if (isWeekend(today)) return null
  let idx = 0
  for (const t = new Date(start); t <= today; t.setUTCDate(t.getUTCDate() + 1)) if (!isWeekend(t)) idx++
  return idx
}

// ─── Plan + template lookups ──────────────────────────────────────────────────

export function planKeyOf(planName: string | null | undefined): 'starter' | 'professional' | 'enterprise' {
  const n = (planName ?? '').toLowerCase()
  if (n.includes('enterprise')) return 'enterprise'
  if (n.includes('professional')) return 'professional'
  return 'starter'
}

async function sequenceLength(plan: string): Promise<number> {
  const agg = await (prisma as any).onboardingEmail.aggregate({ where: { plan, is_active: true }, _max: { day_index: true } })
  return agg?._max?.day_index ?? 0
}

async function template(plan: string, day_index: number): Promise<any | null> {
  return (prisma as any).onboardingEmail.findUnique({ where: { plan_day_index: { plan, day_index } } })
}

async function activeAdmins(tenantId: string): Promise<Array<{ id: string; email: string }>> {
  return (prisma as any).user.findMany({
    where: { tenant_id: tenantId, role: 'admin', is_active: true },
    select: { id: true, email: true },
  })
}

function unsubToken(enrolmentId: string): string {
  return crypto.createHmac('sha256', UNSUB_SECRET).update(enrolmentId).digest('base64url').slice(0, 24)
}
export function verifyUnsub(enrolmentId: string, token: string): boolean {
  return token === unsubToken(enrolmentId)
}

// ─── Sending ──────────────────────────────────────────────────────────────────

async function sendToRecipient(opts: {
  tenantId: string; enrolment: any; tmpl: any; recipientEmail: string; recipientUserId?: string | null; scheduledFor: Date
}): Promise<'sent' | 'skipped' | 'failed'> {
  const { tenantId, enrolment, tmpl, recipientEmail, recipientUserId, scheduledFor } = opts

  // Idempotent: one send per (tenant, email, recipient).
  let row = await (prisma as any).onboardingSend.findFirst({ where: { tenant_id: tenantId, email_id: tmpl.id, recipient_email: recipientEmail } })
  if (row?.sent_at) return 'skipped'
  if (!row) {
    row = await (prisma as any).onboardingSend.create({ data: {
      tenant_id: tenantId, enrolment_id: enrolment?.id ?? null, email_id: tmpl.id, plan: tmpl.plan, day_index: tmpl.day_index,
      recipient_email: recipientEmail, recipient_user_id: recipientUserId ?? null, subject: tmpl.subject,
      scheduled_for: scheduledFor, status: 'scheduled',
    } }).catch(async () => (prisma as any).onboardingSend.findFirst({ where: { tenant_id: tenantId, email_id: tmpl.id, recipient_email: recipientEmail } }))
  }
  if (row?.sent_at) return 'skipped'

  if (!ensureSg()) {
    await (prisma as any).onboardingSend.update({ where: { id: row.id }, data: { status: 'failed', error: 'SENDGRID_API_KEY not set' } })
    return 'failed'
  }

  const unsubscribeUrl = `${API_BASE}/onboarding/unsubscribe?e=${enrolment?.id ?? ''}&t=${enrolment ? unsubToken(enrolment.id) : ''}`
  const html = renderOnboardingEmailHtml({ subject: tmpl.subject, preheader: tmpl.preheader, body: tmpl.body }, { unsubscribeUrl })

  try {
    const [res] = await sgMail.send({
      to: recipientEmail,
      from: { email: tmpl.from_email || FROM, name: FROM_NAME },
      replyTo: FROM,
      subject: tmpl.subject,
      html,
      customArgs: { onboarding_send_id: row.id },
      trackingSettings: { clickTracking: { enable: true, enableText: false }, openTracking: { enable: true } },
    } as any)
    const msgId = (res?.headers?.['x-message-id'] as string) ?? null
    await (prisma as any).onboardingSend.update({ where: { id: row.id }, data: { status: 'sent', sent_at: new Date(), sg_message_id: msgId } })
    return 'sent'
  } catch (e: any) {
    await (prisma as any).onboardingSend.update({ where: { id: row.id }, data: { status: 'failed', error: (e?.message ?? 'send failed').slice(0, 300) } })
    return 'failed'
  }
}

// Send a one-off test of a template to any address (platform-admin only). Not
// logged to onboarding_sends and no tracking, so it never pollutes the stats.
export async function sendTestEmail(to: string, tmpl: { subject: string; preheader: string; body: any }): Promise<void> {
  if (!ensureSg()) throw new Error('SENDGRID_API_KEY is not set')
  const html = renderOnboardingEmailHtml({ subject: tmpl.subject, preheader: tmpl.preheader, body: tmpl.body }, { unsubscribeUrl: '#' })
  await sgMail.send({ to, from: { email: FROM, name: FROM_NAME }, replyTo: FROM, subject: `[TEST] ${tmpl.subject}`, html } as any)
}

// Enrol a tenant into the drip (one active enrolment per tenant).
export async function enrolTenant(tenantId: string, planName: string | null, startStr: string): Promise<any> {
  const plan = planKeyOf(planName)
  const existing = await (prisma as any).onboardingEnrolment.findUnique({ where: { tenant_id: tenantId } })
  if (existing) {
    // Keep the existing start date; just refresh the plan (e.g. once billing resolves).
    if (existing.plan !== plan && existing.status === 'active') {
      return (prisma as any).onboardingEnrolment.update({ where: { id: existing.id }, data: { plan } })
    }
    return existing
  }
  return (prisma as any).onboardingEnrolment.create({ data: { tenant_id: tenantId, plan, start_date: new Date(startStr), status: 'active' } })
}

// Send day 1 right away (used on signup). Safe to call repeatedly.
export async function sendDayOneNow(tenantId: string, recipientEmail: string, recipientUserId?: string | null): Promise<void> {
  const enrolment = await (prisma as any).onboardingEnrolment.findUnique({ where: { tenant_id: tenantId } })
  if (!enrolment || enrolment.status !== 'active') return
  const tmpl = await template(enrolment.plan, 1)
  if (!tmpl) return
  await sendToRecipient({ tenantId, enrolment, tmpl, recipientEmail, recipientUserId, scheduledFor: new Date() }).catch(() => {})
}

// The daily cron entry point. force=true bypasses the 10am-UK gate (for testing);
// tenantId scopes the run to a single tenant (used by the manual "Run drip now").
export async function dispatchDue(opts: { force?: boolean; tenantId?: string } = {}): Promise<any> {
  const { dateStr, hour } = ukNow()
  if (!opts.force && hour !== 10) return { skipped: true, reason: `not 10am UK (currently ${hour}:00)`, dateStr }

  const enrolments = await (prisma as any).onboardingEnrolment.findMany({
    where: { status: 'active', ...(opts.tenantId ? { tenant_id: opts.tenantId } : {}) },
  })
  const summary = { dateStr, enrolments: enrolments.length, sent: 0, skipped: 0, failed: 0, completed: 0, due: [] as any[] }

  for (const enr of enrolments) {
    const startStr = new Date(enr.start_date).toISOString().slice(0, 10)
    const dayIndex = workingDayIndex(startStr, dateStr)
    if (dayIndex == null) continue

    const len = await sequenceLength(enr.plan)
    if (dayIndex > len) {
      await (prisma as any).onboardingEnrolment.update({ where: { id: enr.id }, data: { status: 'completed' } })
      summary.completed++
      continue
    }
    const tmpl = await template(enr.plan, dayIndex)
    if (!tmpl) continue

    const recipients = await activeAdmins(enr.tenant_id)
    summary.due.push({ tenant_id: enr.tenant_id, plan: enr.plan, day: dayIndex, recipients: recipients.length })
    for (const r of recipients) {
      const outcome = await sendToRecipient({ tenantId: enr.tenant_id, enrolment: enr, tmpl, recipientEmail: r.email, recipientUserId: r.id, scheduledFor: new Date() })
      summary[outcome]++
    }
  }
  return summary
}
