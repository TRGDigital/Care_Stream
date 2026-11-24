// Part days, on the page. MUST match halfShift and dayChoices in apps/api/src/lib/holiday-math.ts (a test checks they agree).
export type PartKind = 'full' | 'am' | 'pm' | 'part'
const round2 = (n: number) => Math.round(n * 100) / 100
/** The morning or the afternoon: half a shift to the nearest half hour, never below half an hour. */
export const halfShift = (shift: number): number => Math.max(0.5, Math.round((shift / 2) * 2) / 2)
/** What each choice for a day is worth in hours, capped at what is left to book (null = no cap, for an approver). `last` is the "use my last X hours" option. */
export function dayChoices(shift: number, cap: number | null): { full: number; am: number; pm: number; last: number | null } {
  const c = cap == null ? Infinity : Math.max(0, cap)
  const half = halfShift(shift)
  return { full: Math.min(shift, c), am: Math.min(half, c), pm: Math.min(half, c), last: cap != null && c > 0 && c < shift ? round2(c) : null }
}
/** Half hour steps from half an hour up to a cap (at most 13). */
export function halfHourSteps(cap: number | null, max = 13): number[] {
  const top = Math.min(max, cap == null ? max : Math.floor(Math.max(0, cap) * 2) / 2)
  const out: number[] = []; for (let h = 0.5; h <= top + 1e-9; h += 0.5) out.push(Math.round(h * 2) / 2)
  return out
}
export const hoursText = (h: number) => `${Number.isInteger(h) ? h : round2(h)} ${h === 1 ? 'hour' : 'hours'}`
export const partLabel = (p?: string) => (p === 'am' ? 'AM' : p === 'pm' ? 'PM' : p === 'part' ? 'Part day' : '')
