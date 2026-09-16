// Shared pricing, volume-discount, duration and accreditation logic for the
// public training shop (course cards, basket, buy pages).

export const UNIT_PENCE = 2599 // £25.99 per licence (matches the API fallback)

export const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`

// Volume discount tiers applied to the TOTAL number of licences in an order
// (mixed courses count together). Highest qualifying tier wins.
export const DISCOUNT_TIERS = [
  { min: 100, pct: 40 },
  { min: 50, pct: 30 },
  { min: 20, pct: 20 },
  { min: 10, pct: 10 },
] as const

export function discountPctForQty(totalQty: number): number {
  for (const t of DISCOUNT_TIERS) if (totalQty >= t.min) return t.pct
  return 0
}

// Order maths: gross, discount and net for a given total quantity.
export function orderTotals(totalQty: number, unitPence = UNIT_PENCE) {
  const gross = totalQty * unitPence
  const pct = discountPctForQty(totalQty)
  const discount = Math.round(gross * (pct / 100))
  return { gross, pct, discount, net: gross - discount }
}

// Curated "time to complete" estimates by subject group, in minutes. These are
// sensible defaults for launch; can be replaced by real per-module durations later.
const GROUP_MINUTES: Record<string, number> = {
  core_mandatory: 45,
  health_safety: 40,
  care_clinical: 60,
  conduct_governance: 35,
  data_technology: 30,
  role_specific: 45,
}

export function estimatedMinutes(groupKey?: string | null, durationMinutes?: number | null): number {
  if (durationMinutes && durationMinutes > 0) return durationMinutes
  return (groupKey && GROUP_MINUTES[groupKey]) || 45
}

/** How often a module is refreshed, as it reads in a sentence ("refresh it every year"). Shared
 *  by the current and rebuilt module pages: the theme wrote "every year" for every module, which
 *  is wrong for the four that are not annual. */
export function refreshWord(f: string | null | undefined): string {
  return f === 'annual' ? 'every year' : f === 'biennial' ? 'every two years' : f === 'triennial' ? 'every three years'
    : f === 'once' ? 'once, usually at induction' : 'regularly'
}

export function formatDuration(minutes: number): string {
  if (minutes < 60) return `~${minutes} min`
  const h = Math.floor(minutes / 60)
  const m = minutes % 60
  return m ? `~${h} hr ${m} min` : `~${h} hr`
}

// Accreditation claim is OFF until CPD approval. Flip on per environment (or later
// per course) once the courses are approved. Never show "accredited" before then.
export const TRAINING_ACCREDITED = process.env.NEXT_PUBLIC_TRAINING_ACCREDITED === 'true'

/** Copy written ahead of approval says "CPD approved" (the theme's image descriptions, and
 *  five alt texts in the console). Until TRAINING_ACCREDITED is set the phrase is removed
 *  wherever such copy is served, so it is never claimed early; the stored words are kept, so
 *  turning the flag on restores them. */
export function claimSafe(text: string): string {
  if (TRAINING_ACCREDITED) return text
  return text
    .replace(/\s*all available for CPD approved CareStream training modules/gi,
             ' all available in CareStream')
    .replace(/\bCPD approved\s+/gi, '')
}
