// ONE source of truth for what CareStream charges and how it is described.
//
// The plans live in lib/pricing-data.ts (generated from the approved theme). Everything else that
// prints a price or a plan list reads it through here: the /pricing page schema, the home
// SoftwareApplication schema, the WebMCP pricing tool and llms.txt. Before this each had its own
// hand typed copy, and two of them still said £49 and £129 after the plans moved to £85 and £230.
//
// A Free plan is added to publicPlans() later, in one place, and appears everywhere at once.

import { PRICING, type PricingPlan, type PricingGroup, type PricingValue } from '@/lib/pricing-data'
import { FREE_LIVE } from '@/lib/free-rollout'
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

// ─── The Free plan ────────────────────────────────────────────────────────────
// Defined here, not in the generated pricing-data.ts, so a regeneration cannot remove it. It is
// added in front of Starter only when the free tier is live (lib/free-rollout.ts).

export const FREE_PLAN: PricingPlan = {
  name: 'Free',
  // "£0" has to be in the string: the price is read from it, and the schema Offer is 0.00 GBP.
  price: '£0 per month',
  annual: 'Free for ever, no card needed',
  line: 'Run every audit, check your first five policies and train your whole team with CPD courses, with no card.',
  badge: 'No card needed',
  badgeQuiet: true,
  features: [
    { text: 'Every audit template, with reports and action tracking', more: false },
    { text: 'CPD training is free: the Care Certificate and every annual refresher, for every member of staff, in English', more: false },
    { text: 'Training matrix for your CPD courses', more: false },
    { text: 'Gap analysis on your first 5 policies', more: false },
    { text: 'As many staff logins as you need', more: false },
    { text: 'Upgrade any time and keep everything', more: false },
  ],
  ctaHref: '/register?tier=free',
  ctaLabel: 'Create free account',
  highlight: false,
}

/** What the Free column shows for each comparison row, by label. A row not listed is not included. */
const FREE_VALUES: Record<string, PricingValue> = {
  'Policies stored': '5 in total',
  'Annual training allocations': 'CPD courses free, no limit',
  'Languages in the staff hub': 'English only',
  'Training matrix with renewals and gaps': 'CPD courses',
  'Staff users': 'Unlimited',
  'AI tokens': 'Free allowance',
  'Document version history': true,
  'Regulation coverage analysis': 'Your 5 policies',
  'What to add, with example wording': '3 examples',
  'Applicability by care setting and service profile': 'Your 5 policies',
  'Out of date content detection': 'Your 5 policies',
  'Cross policy consistency checking': 'Your 5 policies',
  'Wording aligned to the CQC quality statements': 'Your 5 policies',
  'Person centred rewording, in your policy voice': 'Your 5 policies',
  'Support': 'Help centre',
  'Free trial': 'Not needed',
}

/** Rows that only exist to tell the Free story: [Free, Starter, Professional, Enterprise]. */
const EXTRA_ROWS: Record<string, Array<{ label: string; values: PricingValue[] }>> = {
  'Training': [{ label: 'CPD certified training: Care Certificate and annual refreshers', values: ['Free, unlimited', 'Free, unlimited', 'Free, unlimited', 'Free, unlimited'] }],
  'Plans and limits': [{ label: 'Card needed to start', values: ['No', 'Yes, 14 day trial', 'Yes, 14 day trial', 'Yes, 14 day trial'] }],
  'Audits': [
    { label: 'Every platform audit template', values: [true, true, true, true] },
    { label: 'Audit reports, signatures and action tracking', values: [true, true, true, true] },
    { label: 'AI recommendations at the end of an audit', values: [false, true, true, true] },
  ],
}

export interface PricingView {
  plans: PricingPlan[]
  groups: PricingGroup[]
  faqs: Array<{ q: string; a: string }>
  free: boolean
}

/** The plans, comparison table and FAQs for the pricing page. With `free` the Free column, its
 *  rows and its FAQ are added in front; without it this is exactly the generated data. */
export function pricingView(free: boolean = FREE_LIVE): PricingView {
  if (!free) return { plans: PRICING.plans, groups: PRICING.groups, faqs: PRICING.faqs, free: false }
  const groups = PRICING.groups.map(g => {
    const extra = EXTRA_ROWS[g.group] ?? []
    const rows = [...extra.map(r => ({ label: r.label, values: r.values })), ...g.rows.map(r => ({ label: r.label, values: [FREE_VALUES[r.label] ?? false, ...r.values] }))]
    // Extra rows already carry the Free value first; order them ahead of the generated rows.
    return { ...g, rows }
  })
  const faqs = [
    { q: 'Is the free CPD training available in other languages?', a: 'The free plan is in English. Every translation has a real cost to produce, so training, questions and messages in 60+ languages start on the Starter plan. CPD courses stay free on every plan: upgrading adds the languages, not a charge for the courses.' },
    { q: 'Is there really a free plan?', a: 'Yes. A free account includes every audit template, with reports and action tracking, gap analysis on your first five policies, and our CPD certified training free for every member of staff. You can add as many staff logins as you need and you do not need a card. The five policies are a total for the life of the account, so deleting one does not free a place. AI recommendations at the end of an audit, more than five policies and example wording for every gap are part of the paid plans.' },
    ...PRICING.faqs.map(f => f.q === 'What counts as an annual training allocation?' ? { ...f, a: f.a + ' CPD certified courses are free on every plan and never use an allocation.' } : f.q === 'Is there a setup fee?' ? { ...f, a: 'No. Every paid plan includes a fourteen day free trial and you are not charged until day fifteen. A free account needs no card at all.' } : f),
  ]
  return { plans: [FREE_PLAN, ...PRICING.plans], groups, faqs, free: true }
}

/** The plans shown on the pricing page, in order. The only place that decides which plans exist. */
export function publicPlans(free: boolean = FREE_LIVE): PricingPlan[] {
  return pricingView(free).plans
}

/** Prices parsed from the plan strings. A plan whose monthly price cannot be read is left out
 *  rather than guessed at. */
export function planFacts(free: boolean = FREE_LIVE): PlanFact[] {
  return publicPlans(free).flatMap(p => {
    const monthly = pence(p.price)
    if (monthly === null) return []
    return [{ name: p.name, monthlyPence: monthly, annualPence: pence(p.annual), line: p.line, trial: monthly > 0 }]
  })
}

export const pounds = (pence: number): string =>
  `£${(pence / 100).toLocaleString('en-GB', { minimumFractionDigits: pence % 100 ? 2 : 0 })}`

/** "Starter £85, Professional £230 and Enterprise £385 per service per month". */
export function planSentence(free: boolean = FREE_LIVE): string {
  const f = planFacts(free).filter(p => p.monthlyPence > 0)
  const parts = f.map(p => `${p.name} ${pounds(p.monthlyPence)}`)
  const joined = parts.length > 1 ? `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}` : parts.join('')
  return `${joined} per service per month`
}
