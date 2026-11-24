// Admin notifications to staff: the rules that do not need a request, so they can be tested on their own.

export const MAX_RECIPIENTS = 500
export const MAX_SENDS_PER_DAY = 30
export const REMIND_EVERY_MS = 24 * 3600_000

export interface Eligible { id: string; name: string; email: string; job_role?: string | null; role?: string }

/** Who an administrator can send to: active, not a shared tablet, not an agency worker, and with an email address. */
export const ELIGIBLE_WHERE = (tenantId: string) => ({ tenant_id: tenantId, is_active: true, is_shared: false, is_agency: false })

export type AudienceInput = { audience?: unknown; user_ids?: unknown }

/** The people a send goes to: everyone eligible for 'all', or the chosen people who are still eligible for 'selected'. People who are not eligible are dropped, never errors. */
export function resolveAudience(input: AudienceInput, eligible: Eligible[]): { audience: 'all' | 'selected'; people: Eligible[]; dropped: number } | { error: string } {
  const audience = input.audience === 'selected' ? 'selected' : input.audience === 'all' ? 'all' : null
  if (!audience) return { error: 'Choose who to send it to.' }
  if (audience === 'all') {
    if (eligible.length === 0) return { error: 'There is nobody to send it to yet.' }
    if (eligible.length > MAX_RECIPIENTS) return { error: `You can send to up to ${MAX_RECIPIENTS} people at once.` }
    return { audience, people: eligible, dropped: 0 }
  }
  const ids = Array.isArray(input.user_ids) ? [...new Set(input.user_ids.map(x => String(x)))] : []
  if (ids.length === 0) return { error: 'Choose at least one person.' }
  if (ids.length > MAX_RECIPIENTS) return { error: `You can send to up to ${MAX_RECIPIENTS} people at once.` }
  const by = new Map(eligible.map(e => [e.id, e]))
  const people = ids.map(i => by.get(i)).filter(Boolean) as Eligible[]
  if (people.length === 0) return { error: 'None of those people can receive notifications.' }
  return { audience, people, dropped: ids.length - people.length }
}

export function cleanTitle(v: unknown, max = 120): string { return String(v ?? '').replace(/\s+/g, ' ').trim().slice(0, max) }
export function cleanBody(v: unknown, max = 2000): string { return String(v ?? '').replace(/\r\n?/g, '\n').replace(/\n{3,}/g, '\n\n').trim().slice(0, max) }

/** A reminder is allowed once a day for each notification. Returns the milliseconds to wait (0 when allowed). */
export function remindWaitMs(lastRemindedAt: Date | string | null | undefined, now = Date.now()): number {
  if (!lastRemindedAt) return 0
  const left = new Date(lastRemindedAt).getTime() + REMIND_EVERY_MS - now
  return left > 0 ? left : 0
}

export function progress(total: number, read: number): { total: number; read: number; unread: number; label: string } {
  return { total, read, unread: Math.max(0, total - read), label: `${read} of ${total} read` }
}
