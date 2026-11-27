// The CQC Well-led strip on the pricing page: which Well-led products each plan includes.
// It is READ FROM THE LIVE COMPARISON TABLE (pricing view), never retyped, so it can never disagree with the plan cards. Each product points at the row of that table that decides it.
import { PRODUCTS } from './well-led'
import type { PricingView } from './pricing-source'

/** Product id (lib/well-led.ts) to the comparison table row that decides which plans include it. null means it is on every plan (free CPD certified courses). */
export const WELL_LED_ROWS: Record<string, string | null> = {
  roles:       'Role holder names merged into policies',
  coverage:    'Regulation coverage analysis',
  alerts:      'Regulation change tracking and alerts',
  gap:         'What to add, with example wording',
  consistency: 'Cross policy consistency checking',
  approval:    'Approval trail and automatic republish to staff',
  matrix:      'Training matrix with renewals and gaps',
  training:    'CQC evidence pack, sign in sheets and certificates',
  cpd:         null,
  audits:      'Audits linked to training',
  knowledge:   'Your own knowledge base, built automatically',
  language:    'Languages in the staff hub',
  report:      'CQC readiness report',
  analytics:   'Advanced analytics',
}

export type PlanStrip = { name: string; price: string; highlight: boolean; included: number; total: number; items: Array<{ id: string; name: string; included: boolean; limited?: string }> }

const truthy = (v: unknown) => v === true || (typeof v === 'string' && v.trim() !== '' && !/^(no|none|false)$/i.test(v.trim()))

/** One strip per plan, in the order of the plans on the page, with every Well-led product marked included or not. */
export function wellLedByPlan(view: Pick<PricingView, 'plans' | 'groups'>): PlanStrip[] {
  const rows = new Map<string, Array<unknown>>()
  for (const g of view.groups) for (const r of g.rows) rows.set(r.label, r.values as unknown[])
  const ids = Object.keys(WELL_LED_ROWS)
  return view.plans.map((p, i) => {
    const items = ids.map(id => {
      const label = WELL_LED_ROWS[id]
      const v = label === null ? true : rows.get(label)?.[i]
      // The Free plan carries text limits ("Your 5 policies", "3 examples"). Those are a taste, not the product, so they show as limited with the note. "English only" is no language support at all.
      const isFree = p.name === 'Free'
      if (isFree && typeof v === 'string' && /english only/i.test(v)) return { id, name: PRODUCTS[id].name, included: false }
      if (isFree && typeof v === 'string' && truthy(v)) return { id, name: PRODUCTS[id].name, included: true, limited: v }
      return { id, name: PRODUCTS[id].name, included: truthy(v) }
    })
    return { name: p.name, price: p.price, highlight: !!p.highlight, included: items.filter(x => x.included && !x.limited).length, total: items.length, items }
  })
}
