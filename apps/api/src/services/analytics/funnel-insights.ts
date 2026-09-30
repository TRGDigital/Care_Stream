import { retrieveSaleBreakdown, TRAINING_LICENCE_PENCE } from '../billing/stripe'

// Reports a confirmed sale to Funnel Insights (trg-funnel-insights.vercel.app) server to
// server, one line per product, so the dashboard's revenue matches Stripe to the penny and
// cannot be faked from a browser. Anonymous: products and money only, no customer details.
// Idempotent on the Funnel Insights side (transaction + product), so a refreshed thank-you
// page or a retry never double counts. Never throws: a reporting failure must not touch the sale.

type Line = { product: string; label?: string; qty: number; list: number; afterVolume: number }

const URL_ = process.env.FI_INGEST_URL || 'https://trg-funnel-insights.vercel.app/api/ingest'

/** Splits `total` across lines in proportion to `weights`; the last line takes the rounding. */
function share(total: number, weights: number[]): number[] {
  const sum = weights.reduce((a, b) => a + b, 0)
  if (!sum || !total) return weights.map(() => 0)
  const out = weights.map(w => Math.floor((total * w) / sum))
  out[out.length - 1]! += total - out.reduce((a, b) => a + b, 0)
  return out
}

async function send(funnel: 'training' | 'policies', transactionId: string, code: string | null, tax: number, discount: number, lines: Line[]) {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret || !lines.length) return
  const codeShare = share(discount, lines.map(l => l.afterVolume))
  const taxShare = share(tax, lines.map(l => l.afterVolume))
  const body = {
    site: 'carestream',
    transaction_id: transactionId,
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
export async function reportTrainingSale(sessionId: string, transactionId: string | null, items: { slug: string; qty: number }[], moduleName?: string) {
  try {
    if (!transactionId || !items.length) return
    const b = await retrieveSaleBreakdown(sessionId)
    if (!b) return
    const afterVolume = share(b.subtotal, items.map(i => i.qty))
    const lines: Line[] = items.map((i, n) => ({
      product: i.slug,
      label: items.length === 1 ? moduleName : undefined,
      qty: i.qty,
      list: TRAINING_LICENCE_PENCE * i.qty,
      afterVolume: afterVolume[n] ?? 0,
    }))
    await send('training', transactionId, b.code, b.tax, b.discount, lines)
  } catch { /* reporting never affects the sale */ }
}

/** Policies: one Stripe line per policy or pack, in basket order. */
export async function reportPolicySale(sessionId: string, transactionId: string | null, items: { kind: string; key: string }[]) {
  try {
    if (!transactionId || !items.length) return
    const b = await retrieveSaleBreakdown(sessionId)
    if (!b) return
    const lines: Line[] = items.map((i, n) => {
      const sl = b.lines[n]
      const amount = sl?.subtotal ?? 0
      return { product: i.kind === 'bundle' ? `bundle:${i.key}` : i.key, label: sl?.name || undefined, qty: 1, list: amount, afterVolume: amount }
    })
    await send('policies', transactionId, b.code, b.tax, b.discount, lines)
  } catch { /* reporting never affects the sale */ }
}
