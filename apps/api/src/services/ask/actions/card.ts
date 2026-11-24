// The action card the panel shows: what will happen, to exactly whom, with one fully personalised preview. Built from the stored proposal each time, so it always shows
// the current state (edited recipients, expiry, result).
import { effectiveStatus } from './store'
import { ACTION_LABEL, type ActionRow, type AskSettings } from './types'
import { eligibleStaff, recipientCards, type Eligible } from './recipients'
import { loadPersonalValues } from './personal'
import { renderPersonal, fieldsIn } from './fields'
import { alreadyAllocated, enrollmentsByIds } from './training-data'

export async function buildCard(tenantId: string, a: ActionRow, settings: AskSettings, people?: Eligible[]) {
  const elig = people ?? await eligibleStaff(tenantId)
  const status = effectiveStatus(a)
  const pl = a.payload ?? {}
  const ids: string[] = Array.isArray(pl.user_ids) ? pl.user_ids : []
  const recipients = await recipientCards(tenantId, ids, elig)
  const base = { id: a.id, type: a.type, label: ACTION_LABEL[a.type], status, expires_at: a.expires_at, created_at: a.created_at, recipients, suggested: (pl.suggested_ids ?? []) as string[], max_recipients: settings.max_recipients, result: a.result ?? null, notes: [] as string[] }
  if (a.type === 'send_staff_notification') {
    const first = recipients[0]
    const vals = first ? (await loadPersonalValues(tenantId, [{ id: first.id, name: first.name }])).get(first.id) : null
    const f = fieldsIn(`${pl.title}\n${pl.body}`)
    return { ...base, title: String(pl.title ?? ''), body: String(pl.body ?? ''), email: !!pl.email, email_allowed: settings.emails_enabled, all_staff: !!pl.all_staff, personalised: f.used, unknown_fields: f.unknown,
      preview: vals && first ? { for_name: first.name, title: renderPersonal(String(pl.title ?? ''), vals), body: renderPersonal(String(pl.body ?? ''), vals) } : null, summary: `${ids.length} ${ids.length === 1 ? 'person' : 'people'} will get this in their hub${pl.email ? ' and by email' : ''}.` }
  }
  if (a.type === 'remind_unread_notification') {
    return { ...base, notification_title: String(pl.notification_title ?? ''), summary: `${ids.length} ${ids.length === 1 ? 'person has' : 'people have'} not read "${pl.notification_title}". They will be reminded in their hub and by email. A reminder can only be sent once a day for each notification.` }
  }
  if (a.type === 'allocate_training') {
    const have = await alreadyAllocated(tenantId, ids, pl.module_ids ?? [])
    const names = new Map<string, string>(recipients.map(r => [r.id, r.name]))
    const mods = new Map<string, string>((pl.module_ids ?? []).map((m: string, i: number) => [m, (pl.module_names ?? [])[i] ?? 'a course']))
    const skipped = have.map(h => ({ user_id: h.user_id, name: names.get(h.user_id) ?? 'Someone', course: mods.get(h.module_id) ?? 'a course', reason: 'already has it' }))
    const create = ids.length * (pl.module_ids ?? []).length - skipped.length
    return { ...base, courses: pl.module_names ?? [], due_date: pl.due_date ?? null, skipped, summary: `${create} new allocation${create === 1 ? '' : 's'} (${(pl.module_names ?? []).join(', ')}). ${skipped.length ? `${skipped.length} skipped because they already have it.` : 'Nobody is skipped.'}` }
  }
  // send_training_reminders
  const items = await enrollmentsByIds(tenantId, pl.enrollment_ids ?? [])
  const keep = new Set(ids)
  const per = new Map<string, string[]>()
  for (const i of items.filter(x => keep.has(x.user_id))) { const l = per.get(i.user_id) ?? []; l.push(`${i.course}${i.due ? `, due ${i.due}` : ''}`); per.set(i.user_id, l) }
  return { ...base, scope: pl.scope, within_days: pl.within_days, items: [...per].map(([user_id, list]) => ({ user_id, name: recipients.find(r => r.id === user_id)?.name ?? 'Someone', courses: list })), summary: `${items.filter(x => keep.has(x.user_id)).length} reminder${items.length === 1 ? '' : 's'} for ${ids.length} ${ids.length === 1 ? 'person' : 'people'} (${pl.scope === 'overdue' ? 'overdue' : `due in the next ${pl.within_days} days`}).` }
}
