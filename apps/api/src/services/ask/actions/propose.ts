// The action tools PROPOSE. Each one checks the guardrail switches, works out who it would reach, stores a proposal and returns it as a card. Nothing here sends, allocates or
// changes anything: that only happens in execute.ts after a person presses Confirm.
import { prisma } from '../../../db/client'
import { cleanTitle, cleanBody } from '../../../lib/staff-notifications'
import { NOTIFICATION_TITLE_MAX, NOTIFICATION_BODY_MAX } from '../../email/notification-content'
import { createProposal } from './store'
import { loadAskSettings, actionAllowed } from './settings'
import { eligibleStaff, matchNames, revalidate, type Eligible } from './recipients'
import { fieldsIn } from './fields'
import { findModules, dueEnrollments } from './training-data'
import { ukToday } from '../data'
import { writeAuditLog } from '../../../lib/audit'
import type { ActionType, ActionRow } from './types'
const p = () => prisma as any

export interface ProposeCtx { tenantId: string; userId: string; conversationId?: string | null }
export type ProposeResult = { ok: true; action: ActionRow; notes: string[] } | { ok: false; error: string }

const YMD = /^\d{4}-\d{2}-\d{2}$/
async function gate(ctx: ProposeCtx, type: ActionType) {
  const s = await loadAskSettings(ctx.tenantId)
  const a = actionAllowed(s, type)
  return { s, a }
}
const audit = (ctx: ProposeCtx, a: ActionRow, count: number) => void writeAuditLog({ tenant_id: ctx.tenantId, user_id: ctx.userId, event_type: 'ask_action_proposed', entity_type: 'ask_action', entity_id: a.id, metadata: { type: a.type, recipients: count } })

/** Resolve who: everyone eligible, a job role, and/or named people. Returns the ids plus anything that could not be matched. */
export function pickPeople(people: Eligible[], o: { audience?: string; names?: string[]; job_role?: string; needEmail: boolean }) {
  const pool = o.needEmail ? people.filter(x => x.has_email) : people
  const notes: string[] = []
  let ids: string[] = []
  if (o.names?.length) {
    const m = matchNames(o.names, pool)
    ids = m.ids
    if (m.unmatched.length) notes.push(`These names did not match anyone who can be reached: ${m.unmatched.join(', ')}.`)
    if (m.ambiguous.length) notes.push(`These names matched more than one person, so they were left out: ${m.ambiguous.join(', ')}. Choose them on the card.`)
  }
  if (o.job_role) { const t = o.job_role.toLowerCase(); ids = [...new Set([...ids, ...pool.filter(x => (x.job_role ?? '').toLowerCase().includes(t)).map(x => x.id)])] }
  const all = o.audience === 'all' && !o.names?.length && !o.job_role
  if (all) ids = pool.map(x => x.id)
  return { ids, all, notes }
}

export async function proposeNotification(ctx: ProposeCtx, input: any): Promise<ProposeResult> {
  const { s, a } = await gate(ctx, 'send_staff_notification'); if (!a.ok) return { ok: false, error: a.reason }
  const title = cleanTitle(input?.title, NOTIFICATION_TITLE_MAX), body = cleanBody(input?.message ?? input?.body, NOTIFICATION_BODY_MAX)
  if (!title) return { ok: false, error: 'A title is needed.' }
  if (!body) return { ok: false, error: 'The message is needed.' }
  const f = fieldsIn(`${title}\n${body}`)
  if (f.unknown.length) return { ok: false, error: `These placeholders are not allowed: ${f.unknown.join(', ')}. Use only {first_name}, {hours_left}, {hours_taken}, {holiday_year_end} and {training_due}.` }
  const people = await eligibleStaff(ctx.tenantId)
  const pick = pickPeople(people, { audience: input?.audience, names: Array.isArray(input?.staff_names) ? input.staff_names : [], job_role: input?.job_role, needEmail: true })
  if (!pick.ids.length) return { ok: false, error: `Nobody was chosen.${pick.notes.length ? ' ' + pick.notes.join(' ') : ' Say who it is for (everyone, a job role, or names).'}` }
  const notes = [...pick.notes]
  let ids = pick.ids
  if (ids.length > s.max_recipients) { notes.push(`That is ${ids.length} people, and the limit for one action is ${s.max_recipients}, so only the first ${s.max_recipients} are ticked. Change the limit in Settings or split it.`); ids = ids.slice(0, s.max_recipients) }
  const action = await createProposal({ ...ctx, type: 'send_staff_notification', payload: { title, body, user_ids: ids, suggested_ids: ids, all_staff: pick.all, email: s.emails_enabled && input?.email !== false, reason: String(input?.reason ?? '').slice(0, 200) } })
  audit(ctx, action, ids.length)
  return { ok: true, action, notes }
}

export async function proposeUnreadReminder(ctx: ProposeCtx, input: any): Promise<ProposeResult> {
  const { a } = await gate(ctx, 'remind_unread_notification'); if (!a.ok) return { ok: false, error: a.reason }
  let n: any = null
  if (input?.notification_id) n = await p().staffNotification.findFirst({ where: { id: String(input.notification_id), tenant_id: ctx.tenantId } })
  else if (input?.title_contains) n = await p().staffNotification.findFirst({ where: { tenant_id: ctx.tenantId, title: { contains: String(input.title_contains), mode: 'insensitive' } }, orderBy: { created_at: 'desc' } })
  else n = await p().staffNotification.findFirst({ where: { tenant_id: ctx.tenantId }, orderBy: { created_at: 'desc' } })
  if (!n) return { ok: false, error: 'No matching notification was found.' }
  const unread: any[] = await p().staffNotificationRecipient.findMany({ where: { notification_id: n.id, tenant_id: ctx.tenantId, read_at: null }, select: { user_id: true } })
  const people = await eligibleStaff(ctx.tenantId)
  const { kept } = revalidate(unread.map(x => String(x.user_id)), people, true)
  if (!kept.length) return { ok: false, error: 'Everyone who can read it has read it.' }
  const action = await createProposal({ ...ctx, type: 'remind_unread_notification', payload: { notification_id: String(n.id), notification_title: String(n.title), user_ids: kept, suggested_ids: kept } })
  audit(ctx, action, kept.length)
  return { ok: true, action, notes: [] }
}

export async function proposeTrainingAllocation(ctx: ProposeCtx, input: any): Promise<ProposeResult> {
  const { s, a } = await gate(ctx, 'allocate_training'); if (!a.ok) return { ok: false, error: a.reason }
  const names: string[] = Array.isArray(input?.course_names) ? input.course_names.map(String) : input?.course_name ? [String(input.course_name)] : []
  if (!names.length) return { ok: false, error: 'Which course should be allocated?' }
  const mods = await findModules(ctx.tenantId, names)
  if (!mods.modules.length) return { ok: false, error: `No course matched ${names.join(', ')}.` }
  const notes: string[] = []
  if (mods.unmatched.length) notes.push(`No course matched: ${mods.unmatched.join(', ')}.`)
  for (const [k, v] of Object.entries(mods.alternatives)) notes.push(`For "${k}" I chose the best match. Other matches: ${v.join(', ')}.`)
  const people = await eligibleStaff(ctx.tenantId)
  const pick = pickPeople(people, { audience: input?.audience, names: Array.isArray(input?.staff_names) ? input.staff_names : [], job_role: input?.job_role, needEmail: false })
  if (!pick.ids.length) return { ok: false, error: `Nobody was chosen.${pick.notes.length ? ' ' + pick.notes.join(' ') : ' Say who it is for (everyone, a job role, or names).'}` }
  notes.push(...pick.notes)
  let ids = pick.ids
  if (ids.length > s.max_recipients) { notes.push(`The limit for one action is ${s.max_recipients} people, so only the first ${s.max_recipients} are ticked.`); ids = ids.slice(0, s.max_recipients) }
  const due = YMD.test(String(input?.due_date ?? '')) ? String(input.due_date) : null
  if (due && due < ukToday()) notes.push('That due date is in the past.')
  const action = await createProposal({ ...ctx, type: 'allocate_training', payload: { module_ids: mods.modules.map(m => m.id), module_names: mods.modules.map(m => m.name), user_ids: ids, suggested_ids: ids, due_date: due } })
  audit(ctx, action, ids.length)
  return { ok: true, action, notes }
}

export async function proposeTrainingReminders(ctx: ProposeCtx, input: any): Promise<ProposeResult> {
  const { s, a } = await gate(ctx, 'send_training_reminders'); if (!a.ok) return { ok: false, error: a.reason }
  const scope = input?.scope === 'due_soon' ? 'due_soon' : 'overdue'
  const within = Math.max(1, Math.min(120, Math.round(Number(input?.within_days) || 14)))
  const people = await eligibleStaff(ctx.tenantId)
  let only: string[] | null = null
  const notes: string[] = []
  if (Array.isArray(input?.staff_names) && input.staff_names.length || input?.job_role) { const pick = pickPeople(people, { names: input.staff_names ?? [], job_role: input.job_role, needEmail: false }); only = pick.ids; notes.push(...pick.notes) }
  const rows = await dueEnrollments(ctx.tenantId, scope, within, only)
  const allowed = new Set(people.map(x => x.id))
  const use = rows.filter(r => allowed.has(r.user_id))
  if (!use.length) return { ok: false, error: scope === 'overdue' ? 'Nothing is overdue for those people.' : `Nothing is due in the next ${within} days for those people.` }
  let ids = [...new Set(use.map(r => r.user_id))]
  if (ids.length > s.max_recipients) { notes.push(`The limit for one action is ${s.max_recipients} people, so only the first ${s.max_recipients} are included.`); ids = ids.slice(0, s.max_recipients) }
  const keep = new Set(ids)
  const action = await createProposal({ ...ctx, type: 'send_training_reminders', payload: { scope, within_days: within, user_ids: ids, suggested_ids: ids, enrollment_ids: use.filter(r => keep.has(r.user_id)).map(r => r.id) } })
  audit(ctx, action, ids.length)
  return { ok: true, action, notes }
}
