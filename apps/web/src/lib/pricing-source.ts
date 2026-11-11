// ONE source of truth for what CareStream charges and how it is described.
//
// The plans live in lib/pricing-data.ts (generated from the approved theme). Everything else that
// prints a price or a plan list reads it through here: the /pricing page schema, the home
// SoftwareApplication schema, the WebMCP pricing tool and llms.txt. Before this each had its own
// hand typed copy, and two of them still said £49 and £129 after the plans moved to £85 and £230.
//
// A Free plan is added to publicPlans() later, in one place, and appears everywhere at once.

import { PRICING, type PricingPlan } from '@/lib/pricing-data'
import { UNIT_PENCE } from '@/lib/training-commerce'
import { COURSE_LANGUAGES } from '@/lib/languages'

/** The language claim used in all copy. COURSE_LANGUAGES has 70 entries, so "60+" is true. */
export const LANGUAGES_CLAIM = '60+'
export const LANGUAGE_COUNT = COURSE_LANGUAGES.length

/** £25.99 per staff member per course, as a display string and in pence. */
export const MODULE_PRICE_PENCE = UNIT_PENCE
export const MODULE_PRICE = `£${(UNIT_PENCE / 100).toFixed(2)}`

export interface PlanFact {
  name: string
  monthlyPence: number
  /** Null when the plan has no annual price. */
  annualPence: number | null
  line: string
  trial: boolean
}

const money = /£\s?([\d,]+(?:\.\d{2})?)/
const pence = (s: string | undefined): number | null => {
  const m = money.exec(s ?? '')
  return m ? Math.round(parseFloat(m[1].replace(/,/g, '')) * 100) : null
}

/** The plans shown on the pricing page, in order. The only place that decides which plans exist. */
export function publicPlans(): PricingPlan[] {
  return PRICING.plans
}

/** Prices parsed from the plan strings. A plan whose monthly price cannot be read is left out
 *  rather than guessed at. */
export function planFacts(): PlanFact[] {
  return publicPlans().flatMap(p => {
    const monthly = pence(p.price)
    if (monthly === null) return []
    return [{ name: p.name, monthlyPence: monthly, annualPence: pence(p.annual), line: p.line, trial: monthly > 0 }]
  })
}

export const pounds = (pence: number): string =>
  `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: pence % 100 ? 2 : 0 })}`

/** "Starter £85, Professional £230 and Enterprise £385 per service per month". */
export function planSentence(): string {
  const f = planFacts().filter(p => p.monthlyPence > 0)
  const parts = f.map(p => `${p.name} ${pounds(p.monthlyPence)}`)
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('')
  return `${joined} per service per month`
}
