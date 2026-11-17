// Staff incentives: the pure rules (no database). Kept separate so the fairness of "first to reach it" can be tested.

export type RuleEvent = 'training_completed' | 'training_on_time' | 'cpd_completed' | 'onboarding_completed' | 'practical_signed'

export interface RuleEventDef { key: RuleEvent; label: string; help: string; suggested_points: number }

// One place for the wording. The admin builder reads it from GET /incentives/meta.
export const EVENTS: RuleEventDef[] = [
  { key: 'training_completed', label: 'Completes a training module', help: 'Each time they finish and pass a training module.', suggested_points: 10 },
  { key: 'training_on_time', label: 'Finishes a module on or before its due date', help: 'A bonus on top of finishing, for finishing on time. Only modules with a due date count.', suggested_points: 5 },
  { key: 'cpd_completed', label: 'Completes a CPD course', help: 'Each CPD certified course they finish. This is on top of any points for completing a module.', suggested_points: 15 },
  { key: 'onboarding_completed', label: 'Completes an onboarding flow', help: 'Finishing a whole induction or onboarding flow.', suggested_points: 25 },
  { key: 'practical_signed', label: 'Has a practical sign-off recorded', help: 'When a manager records the observed practical assessment for a module.', suggested_points: 10 },
]
export const EVENT_KEYS = new Set<string>(EVENTS.map(e => e.key))

/** The UTC start and last millisecond of a YYYY-MM month, or null if it is not a valid month. */
export function periodFor(month: string): { start: Date; end: Date } | null {
  const m = /^(\d{4})-(0[1-9]|1[0-2])$/.exec(month)
  if (!m) return null
  const y = Number(m[1]), mo = Number(m[2])
  if (y < 2020 || y > 2100) return null
  return { start: new Date(Date.UTC(y, mo - 1, 1)), end: new Date(Date.UTC(y, mo, 1) - 1) }
}

export const currentMonth = (now = new Date()) => `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, '0')}`

export interface RawEvent { user_id: string; rule_id: string; source_id: string; occurred_at: Date }

/** A rule's cap: the most times it may earn for one person in the campaign. Earliest events count; later ones earn nothing. */
export function applyCaps<T extends RawEvent>(events: T[], caps: Map<string, number | null>): T[] {
  const sorted = [...events].sort((a, b) => +a.occurred_at - +b.occurred_at || a.source_id.localeCompare(b.source_id))
  const used = new Map<string, number>()
  const out: T[] = []
  for (const e of sorted) {
    const cap = caps.get(e.rule_id)
    const k = `${e.rule_id}|${e.user_id}`
    const n = used.get(k) ?? 0
    if (cap !== null && cap !== undefined && n >= cap) continue
    used.set(k, n + 1)
    out.push(e)
  }
  return out
}

/** The moment a person's running total first reached the target (the time of the entry that took them over), or null if it has not. */
export function reachedAt(entries: Array<{ occurred_at: Date; points: number }>, target: number): Date | null {
  if (target <= 0) return null
  let sum = 0
  for (const e of [...entries].sort((a, b) => +a.occurred_at - +b.occurred_at)) {
    sum += e.points
    if (sum >= target) return e.occurred_at
  }
  return null
}

export interface RankInput { user_id: string; reached_at: Date }
export interface RankOut { user_id: string; rank: number; within: boolean; tied: boolean }

/** Order claims for one reward by earliest time reached (then user id, for a stable order) and say who is inside the places available.
 *  quantity null = everyone who qualifies. tied = reached in the same second as the person on the other side of the cut off, so a care manager decides. */
export function rankClaims(claims: RankInput[], quantity: number | null): RankOut[] {
  const sorted = [...claims].sort((a, b) => +a.reached_at - +b.reached_at || a.user_id.localeCompare(b.user_id))
  const sec = (d: Date) => Math.floor(+d / 1000)
  const out: RankOut[] = sorted.map((c, i) => ({ user_id: c.user_id, rank: i + 1, within: quantity === null || i < quantity, tied: false }))
  if (quantity !== null && quantity > 0 && sorted.length > quantity) {
    const cutTime = sec(sorted[quantity - 1].reached_at)
    if (sec(sorted[quantity].reached_at) === cutTime) {
      sorted.forEach((c, i) => { if (sec(c.reached_at) === cutTime) out[i].tied = true })
    }
  }
  return out
}

export const pct = (points: number, target: number) => (target > 0 ? Math.max(0, Math.min(100, Math.round((points / target) * 100))) : 0)
