// §10.6 — Billing routes: Customer Portal + Stripe webhook receiver.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { createPortalSession, handleWebhook } from '../services/billing/stripe'
import { ok, err } from '../lib/response'

export const billingRouter = Router()

// ─── GET /billing/summary ─────────────────────────────────────────────────────
// Returns current plan + subscription info.
// DB fields are available now; Stripe fields (next_billing_date, etc.) are
// stubs returning null — replace with Stripe API calls when integrating.

billingRouter.get('/summary', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: {
      subscription_status: true,
      stripe_customer_id:  true,
      plan: {
        select: {
          name:               true,
          price_monthly_pence: true,
          monthly_query_limit: true,
        },
      },
    },
  })

  if (!tenant) {
    err(res, 'NOT_FOUND', 'Tenant not found.', 404)
    return
  }

  ok(res, {
    plan_name:           tenant.plan?.name ?? null,
    subscription_status: tenant.subscription_status as string,
    price_monthly_pence: tenant.plan?.price_monthly_pence ?? null,
    monthly_query_limit: tenant.plan?.monthly_query_limit ?? null,
    has_stripe:          !!tenant.stripe_customer_id,
    // ── Stripe fields — wire these up during Stripe integration ──────────────
    next_billing_date:    null as string | null,   // from Stripe subscription.current_period_end
    current_period_start: null as string | null,   // from Stripe subscription.current_period_start
    current_period_end:   null as string | null,   // from Stripe subscription.current_period_end
    billing_interval:     null as string | null,   // 'month' | 'year' from Stripe price.recurring.interval
  })
})

// ─── GET /billing/invoices ────────────────────────────────────────────────────
// Returns invoice history.
// Returns empty array until Stripe is integrated — replace stub with:
//   await stripe.invoices.list({ customer: tenant.stripe_customer_id, limit: 24 })

billingRouter.get('/invoices', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { stripe_customer_id: true },
  })

  if (!tenant) {
    err(res, 'NOT_FOUND', 'Tenant not found.', 404)
    return
  }

  // ── Stripe integration point ──────────────────────────────────────────────
  // Replace the empty array below with:
  //   const stripeInvoices = await stripe.invoices.list({
  //     customer: tenant.stripe_customer_id,
  //     limit: 24,
  //     status: 'paid',
  //   })
  //   const invoices = stripeInvoices.data.map(inv => ({
  //     id:          inv.id,
  //     date:        new Date(inv.created * 1000).toISOString(),
  //     description: inv.lines.data[0]?.description ?? 'CareStreamAI subscription',
  //     amount_pence: inv.amount_paid,
  //     status:      inv.status,          // 'paid' | 'open' | 'void' | 'uncollectible'
  //     pdf_url:     inv.invoice_pdf,
  //     hosted_url:  inv.hosted_invoice_url,
  //   }))
  const invoices: Array<{
    id:           string
    date:         string
    description:  string
    amount_pence: number
    status:       string
    pdf_url:      string | null
    hosted_url:   string | null
  }> = []

  ok(res, { invoices })
})

// ─── GET /billing/portal — generate a Stripe Customer Portal session for the current tenant.
// requireAuth + tenantGuard are applied in app.ts before this router.
billingRouter.get('/portal', async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id

  const tenant = await (prisma as any).tenant.findUnique({
    where:  { id: tenantId },
    select: { stripe_customer_id: true },
  })

  if (!tenant?.stripe_customer_id) {
    err(res, 'NO_SUBSCRIPTION', 'No Stripe customer found for this tenant.', 404)
    return
  }

  const url = await createPortalSession(tenant.stripe_customer_id)
  ok(res, { url })
})

// ─── Stripe webhook (raw body) ────────────────────────────────────────────────
// Mounted in app.ts with express.raw({ type: 'application/json' }) BEFORE
// express.json() so the raw buffer is preserved for signature verification.

export async function stripeWebhookHandler(req: Request, res: Response): Promise<void> {
  const signature = req.headers['stripe-signature']

  if (!signature || typeof signature !== 'string') {
    res.status(400).json({ success: false, error: 'Missing stripe-signature header' })
    return
  }

  try {
    await handleWebhook(req.body as Buffer, signature)
    res.status(200).json({ received: true })
  } catch (e: any) {
    console.error('[stripe] webhook error:', e?.message)
    res.status(400).json({ success: false, error: e?.message })
  }
}
