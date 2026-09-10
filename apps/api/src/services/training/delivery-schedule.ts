// Fires the tenant-defined scheduled question-delivery rules (Settings → Training →
// Schedule Training Questions Delivery). Until now those rules were stored but nothing
// processed them; "Send now" was the only execution path.
//
// Runs every 15 minutes via /cron/training-delivery. A rule fires on the first run at or
// after its send_time (Europe/London) on a scheduled day, at most once per day — deduped
// against its own scheduled send-log rows, so a manual "Send now" never suppresses the
// scheduled send (different trigger_type).

import { randomUUID } from 'crypto'
import { prisma } from '../../db/client'
import { sendProactiveTrainingQuestions } from './proactive'

const OUTCOME_NOTE: Record<string, string> = {
  sent_whatsapp: 'delivered by WhatsApp', sent_email: 'delivered by email',
  no_contact: 'NOT delivered: no phone or email on file',
  not_enrolled: 'NOT delivered: not enrolled in this module', no_questions: 'NOT delivered: module has no questions',
  gated: 'NOT delivered: auto-send is off', failed: 'NOT delivered: send failed',
}

function londonNow(): { dow: number; hhmm: string } {
  const now = new Date()
  const parts = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Europe/London', weekday: 'short', hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(now)
  const get = (t: string) => parts.find(p => p.type === t)?.value ?? ''
  const dow = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].indexOf(get('weekday'))
  return { dow, hhmm: `${get('hour')}:${get('minute')}` }
}

export async function runScheduledTrainingDelivery(): Promise<{ checked: number; fired: number; delivered: number; skipped_rules: string[] }> {
  const { dow, hhmm } = londonNow()
  const out = { checked: 0, fired: 0, delivered: 0, skipped_rules: [] as string[] }

  const rules = await (prisma as any).trainingDeliveryRule.findMany({
    where: { is_active: true, rule_type: 'scheduled', module_id: { not: null }, send_time: { not: null } },
  })

  for (const rule of rules as any[]) {
    out.checked++
    if (!Array.isArray(rule.days_of_week) || !rule.days_of_week.includes(dow)) continue
    if (String(rule.send_time) > hhmm) continue   // not due yet today

    // Once per day: a scheduled log row for this rule in the last 20 hours means today's
    // send already happened (20h clears midnight ambiguity and survives DST shifts).
    const recent = await (prisma as any).trainingSendLog.findFirst({
      where: { rule_id: rule.id, trigger_type: 'scheduled', sent_at: { gte: new Date(Date.now() - 20 * 3600_000) } },
      select: { id: true },
    })
    if (recent) continue

    const mod = await (prisma as any).trainingModule.findFirst({
      where: { id: rule.module_id, OR: [{ tenant_id: rule.tenant_id }, { tenant_id: null, source: 'ai_generated', approved: true }] },
    })
    const questions = ((mod?.questions as any[]) ?? [])
    if (questions.length === 0) {
      out.skipped_rules.push(`${rule.name}: module has no questions`)
      continue
    }
    const questionIds = questions.slice(0, rule.questions_per_send).map((q: any) => q.id)

    const staffFilter: Record<string, any> = { tenant_id: rule.tenant_id, is_active: true, role: 'staff' }
    if (rule.target_audience === 'day_shift')   staffFilter.shift_type = 'day'
    if (rule.target_audience === 'night_shift') staffFilter.shift_type = 'night'
    if (rule.target_audience === 'specific')    staffFilter.id = { in: rule.target_user_ids }
    const staff = await (prisma as any).user.findMany({ where: staffFilter, select: { id: true } })
    if (staff.length === 0) { out.skipped_rules.push(`${rule.name}: no matching staff`); continue }

    out.fired++
    // The rule's existence is the tenant's opt-in, so the auto-trigger gate is bypassed.
    const outcomes = await sendProactiveTrainingQuestions(rule.tenant_id, staff.map((s: any) => s.id), [rule.module_id], true)
    const byUser = new Map(outcomes.map(o => [o.user_id, o.outcome]))
    out.delivered += outcomes.filter(o => o.outcome === 'sent_whatsapp' || o.outcome === 'sent_email').length

    await (prisma as any).trainingSendLog.createMany({
      data: staff.map((s: any) => ({
        id: randomUUID(), tenant_id: rule.tenant_id, rule_id: rule.id,
        module_id: rule.module_id, user_id: s.id,
        question_ids: questionIds, trigger_type: 'scheduled',
        triggered_by: null, context: `Scheduled rule "${rule.name}" — ${OUTCOME_NOTE[byUser.get(s.id) ?? 'failed'] ?? byUser.get(s.id)}`,
      })),
    })
  }

  return out
}
