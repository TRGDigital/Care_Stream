// The colours on the holiday matrix, in one place so the legend and the cells can never disagree. A colour is never the only signal: each state also has a word.
export type RemainingState = 'ok' | 'low' | 'used' | 'over'
export type PercentState = 'start' | 'mid' | 'high' | 'full' | 'over'

/** How much is left: more than 20% is normal, 20% or less is running low, exactly 0 is used up, below 0 is over the allowance. */
export function remainingState(entitlement: number, remaining: number): RemainingState {
  if (remaining < 0) return 'over'
  if (remaining === 0) return 'used'
  if (entitlement > 0 && remaining / entitlement <= 0.2) return 'low'
  return 'ok'
}

/** How much of the allowance is taken: under 50, 50 to 89, 90 to 99, exactly 100 (fully used), above 100 (over). */
export function percentState(percent: number): PercentState {
  if (percent > 100) return 'over'
  if (percent === 100) return 'full'
  if (percent >= 90) return 'high'
  if (percent >= 50) return 'mid'
  return 'start'
}

export const REMAINING_STYLE: Record<RemainingState, { cls: string; label: string; tip: (over: string) => string }> = {
  ok:   { cls: '', label: '', tip: () => 'Plenty left.' },
  low:  { cls: 'bg-amber-100 text-amber-900', label: 'Low', tip: () => 'Running low: 20% or less of the allowance is left.' },
  used: { cls: 'bg-gray-200 text-gray-800', label: 'Used up', tip: () => 'All of the allowance is used.' },
  over: { cls: 'bg-red-100 text-red-800', label: 'Over', tip: o => `Over the allowance by ${o}.` },
}
export const PERCENT_STYLE: Record<PercentState, { cls: string; label: string }> = {
  start: { cls: 'bg-green-100 text-green-900', label: 'Under 50%' },
  mid:   { cls: 'bg-teal/15 text-teal-900', label: '50 to 89%' },
  high:  { cls: 'bg-amber-100 text-amber-900', label: '90 to 99%' },
  full:  { cls: 'bg-emerald-200 text-emerald-950', label: 'Exactly 100%: fully used' },
  over:  { cls: 'bg-red-100 text-red-800', label: 'Over 100%' },
}
