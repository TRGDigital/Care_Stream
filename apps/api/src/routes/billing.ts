// §10.6 — Billing routes: Customer Portal + Stripe webhook receiver.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { createPortalSession, handleWebhook, createCheckoutSession, getSubscriptionInfo, listInvoices } from '../services/billing/stripe'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'

export const billingRouter = Router()

// ─── GET /billing/plans — active plans for the subscribe chooser ──────────────
billingRouter.get('/plans', async (_req: Request, res: Response) => {
  const plans = await (prisma as any).plan.findMany({
    where:   { is_active: true },
    orderBy: { price_monthly_pence: 'asc' },
    select: {
      id: true, name: true, price_monthly_pence: true, monthly_query_limit: true,
      max_policies: true, max_staff_users: true, max_handbooks: true,
      max_manual_knowledge_entries: true, monthly_ai_credit_limit: true,
      has_advanced_analytics: true, has_cqc_report: true, has_gap_detection: true,
    },
  })
  ok(res, { plans })
})

// ─── POST /billing/checkout — start a hosted Stripe Checkout for a plan ────────
// Admin only. Body: { plan_id }. Returns { url } to redirect the browser to.
billingRouter.post('/checkout', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  const planId   = (req.body?.plan_id as string | undefined)?.trim()
  if (!planId) { err(res, 'VALIDATION_ERROR', 'plan_id is required.', 400); return }
  try {
    const url = await createCheckoutSession(tenantId, planId)
    ok(res, { url })
  } catch (e: any) {
    err(res, 'CHECKOUT_FAILED', e.message ?? 'Could not start checkout.', 500)
  }
})

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
      stripe_subscription_id: true,
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

  // Live subscription fields from Stripe (null if not subscribed / Stripe down).
  const sub = await getSubscriptionInfo(tenant).catch(() => null)

  ok(res, {
    plan_name:           tenant.plan?.name ?? null,
    subscription_status: tenant.subscription_status as string,
    price_monthly_pence: tenant.plan?.price_monthly_pence ?? null,
    monthly_query_limit: tenant.plan?.monthly_query_limit ?? null,
    has_stripe:          !!tenant.stripe_customer_id,
    next_billing_date:    sub?.next_billing_date    ?? null,
    current_period_start: sub?.current_period_start ?? null,
    current_period_end:   sub?.current_period_end   ?? null,
    billing_interval:     sub?.billing_interval     ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
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

  // No Stripe customer yet → no invoices. Otherwise pull the real invoice list.
  if (!tenant.stripe_customer_id) { ok(res, { invoices: [] }); return }
  try {
    const invoices = await listInvoices(tenant.stripe_customer_id)
    ok(res, { invoices })
  } catch (e: any) {
    console.error('[billing] invoices error:', e?.message)
    ok(res, { invoices: [] })
  }
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
