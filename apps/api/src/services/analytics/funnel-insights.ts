import { prisma } from '../../db/client'
import type { Attribution } from './attribution'
import { ADDONS, type AddonKey } from '../shop/addons'
export { cleanAttribution, attributionMeta, attributionFromMeta, type Attribution } from './attribution'
import { retrieveSaleBreakdown, TRAINING_LICENCE_PENCE } from '../billing/stripe'

// Reports a confirmed sale to Funnel Insights (trg-funnel-insights.vercel.app) server to
// server, one line per product, so the dashboard's revenue matches Stripe to the penny and
// cannot be faked from a browser. Anonymous: products and money only, no customer details.
// Idempotent on the Funnel Insights side (transaction + product), so a refreshed thank-you
// page or a retry never double counts. Never throws: a reporting failure must not touch the sale.

// freeQty / freeValue: items given free under an offer (the Halloween 2 for 1), and what they
// would have cost at list. offer: the offer key the sale was made under.
type Line = { product: string; label?: string; qty: number; list: number; afterVolume: number; freeQty?: number; freeValue?: number }

const URL_ = process.env.FI_INGEST_URL || 'https://trg-funnel-insights.vercel.app/api/ingest'

/** Splits `total` across lines in proportion to `weights`; the last line takes the rounding. */
function share(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum || !total) return weights.map(() => 0)
  const out = weights.map(w => Math.floor((total * w) / sum))
  out[out.length - 1]! += total - out.reduce((a, b) => a + b, 0)
  return out
}

async function send(funnel: 'training' | 'policies', transactionId: string, code: string | null, tax: number, discount: number, lines: Line[], offer: string | null = null, attribution: Attribution | null = null) {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret || !lines.length) return
  const codeShare = share(discount, lines.map(l => l.afterVolume))
  const taxShare = share(tax, lines.map(l => l.afterVolume))
  const body = {
    site: 'carestream',
    transaction_id: transactionId,
    attribution,
    lines: lines.map((l, i) => ({
      product: l.product,
      label: l.label,
      funnel,
      qty: l.qty,
      list_pence: l.list,
      volume_discount_pence: Math.max(0, l.list - l.afterVolume),
      code_discount_pence: codeShare[i],
      code: codeShare[i] ? code : null,
      revenue_pence: Math.max(0, l.afterVolume - (codeShare[i] ?? 0)),
      tax_pence: taxShare[i],
      free_qty: l.freeQty ?? 0,
      free_value_pence: l.freeValue ?? 0,
      offer_key: offer,
    })),
  }
  await fetch(URL_, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
    body: JSON.stringify(body),
    signal: AbortSignal.timeout(4000),
  })
}

/** Training: one Stripe line at the (volume) unit price × all licences, split per course. */
export async function reportTrainingSale(sessionId: string, transactionId: string | null, items: { slug: string; qty: number; free?: number; unit?: number }[], moduleName?: string, offer?: string | null, attribution: Attribution | null = null, addons: AddonKey[] = []) {
  try {
    if (!transactionId || !items.length) return
    const b = await retrieveSaleBreakdown(sessionId)
    if (!b) return
    // Split what Stripe charged by what each course cost (an offer can price one course lower).
    const addonPence = addons.reduce((t, k) => t + ADDONS[k].pence, 0)
    const afterVolume = share(Math.max(0, b.subtotal - addonPence), items.map(i => i.qty * (i.unit ?? 1)))
    const lines: Line[] = items.map((i, n) => ({
      product: i.slug,
      label: items.length === 1 ? moduleName : undefined,
      qty: i.qty,
      list: TRAINING_LICENCE_PENCE * i.qty,
      afterVolume: afterVolume[n] ?? 0,
      freeQty: i.free ?? 0,
      freeValue: TRAINING_LICENCE_PENCE * (i.free ?? 0),
    }))
    for (const k of addons) lines.push({ product: `addon:${k}`, label: ADDONS[k].name, qty: 1, list: ADDONS[k].pence, afterVolume: ADDONS[k].pence })
    await send('training', transactionId, b.code, b.tax, b.discount, lines, offer || null, attribution)
  } catch { /* reporting never affects the sale */ }
}

/** Policies: one Stripe line per policy or pack, in basket order. */
export async function reportPolicySale(sessionId: string, transactionId: string | null, items: { kind: string; key: string }[], freeKeys: string[] = [], offer: string | null = null, attribution: Attribution | null = null, addons: AddonKey[] = []) {
  try {
    if (!transactionId || !items.length) return
    const b = await retrieveSaleBreakdown(sessionId)
    if (!b) return
    // Free policies come last in the basket and have no Stripe line of their own (they are
    // named on the paid line they pair with), so their value is read from the catalogue.
    const free = new Set(freeKeys)
    const freeRows = free.size
      ? await (prisma as any).policyProduct.findMany({ where: { slug: { in: [...free] } }, select: { slug: true, title: true, price_pence: true } })
      : []
    const freeBy = new Map<string, any>((freeRows as any[]).map(r => [r.slug, r]))
    const paidCount = items.length - [...items].filter(i => i.kind === 'policy' && free.has(i.key)).length
    const lines: Line[] = items.map((i, n) => {
      if (i.kind === 'policy' && free.has(i.key) && n >= paidCount) {
        const p = freeBy.get(i.key)
        return { product: i.key, label: p?.title, qty: 1, list: 0, afterVolume: 0, freeQty: 1, freeValue: p?.price_pence ?? 0 }
      }
      const sl = b.lines[n]
      const amount = sl?.subtotal ?? 0
      return { product: i.kind === 'bundle' ? `bundle:${i.key}` : i.key, label: sl?.name || undefined, qty: 1, list: amount, afterVolume: amount }
    })
    for (const k of addons) lines.push({ product: `addon:${k}`, label: ADDONS[k].name, qty: 1, list: ADDONS[k].pence, afterVolume: ADDONS[k].pence })
    await send('policies', transactionId, b.code, b.tax, b.discount, lines, offer, attribution)
  } catch { /* reporting never affects the sale */ }
}

// ─── Email capture and basket recovery ──────────────────────────────────────────────────────
const FI_BASE = URL_.replace(/\/api\/ingest$/, '')

async function postFi(path: string, body: unknown): Promise<any> {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret) return null
  try {
    const r = await fetch(`${FI_BASE}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${secret}` },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(4000),
    })
    return await r.json().catch(() => null)
  } catch { return null }
}

/** A basket saved, a recovery email sent, or an order paid after one (anonymous: the basket id
 *  and its products, never the email). Never throws. */
export async function reportEmailEvent(e: {
  kind: 'basket_saved' | 'recovery_sent' | 'recovered'; ref: string; stage?: number
  funnel: 'training' | 'policies'; products: string[]; valuePence?: number
}): Promise<void> {
  await postFi('/api/email-events', {
    site: 'carestream', kind: e.kind, ref: e.ref, stage: e.stage ?? 0, funnel: e.funnel,
    products: e.products, value_pence: e.valuePence ?? 0,
  })
}

/** A buyer's review from the review request form, to Funnel Insights › Feedback for approval.
 *  Returns whether Funnel Insights saved it (the API keeps its own copy either way). */
export async function reportReview(r: {
  ref: string; funnel: 'training' | 'policies'; product: string; productTitle: string
  rating: number; body: string; displayName: string; setting: string; consent: boolean
}): Promise<boolean> {
  const out = await postFi('/api/reviews', {
    site: 'carestream', ref: r.ref, funnel: r.funnel, product: r.product, product_title: r.productTitle,
    rating: r.rating, body: r.body, display_name: r.displayName, setting: r.setting, consent: r.consent,
  })
  return out?.ok === true
}

/** A sign-up from an on-site overlay, to the Funnel Insights list. Returns the list's
 *  unsubscribe token (null if Funnel Insights could not be reached). */
export async function reportSubscriber(s: Record<string, unknown>): Promise<string | null> {
  const r = await postFi('/api/subscribers', { site: 'carestream', ...s })
  return typeof r?.unsubscribe_token === 'string' ? r.unsubscribe_token : null
}
