// §10.6 — Billing routes: Customer Portal + Stripe webhook receiver.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { createPortalSession, handleWebhook, createCheckoutSession, getSubscriptionInfo, listInvoices, reconcileTenantBilling, cancelTenantSubscription } from '../services/billing/stripe'
import { requireAdmin } from '../middleware/auth'
import { ok, err } from '../lib/response'
import { getPlanFeatures } from '../lib/plan-limits'

export const billingRouter = Router()

// ─── GET /billing/plans — active plans for the subscribe chooser ──────────────
billingRouter.get('/plans', async (_req: Request, res: Response) => {
  const plans = await (prisma as any).plan.findMany({
    where:   { is_active: true, is_public: true }, // internal plans (e.g. £1 Sandbox) are hidden
    orderBy: { price_monthly_pence: 'asc' },
    select: {
      id: true, name: true, price_monthly_pence: true, price_annual_pence: true, monthly_query_limit: true,
      max_policies: true, max_staff_users: true, max_handbooks: true,
      max_manual_knowledge_entries: true, monthly_ai_credit_limit: true, monthly_annual_license_limit: true,
      has_advanced_analytics: true, has_cqc_report: true, has_gap_detection: true,
      has_face_to_face: true, has_custom_audits: true, has_effectiveness: true, has_training_impact: true,
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

// ─── POST /billing/sync — reconcile this tenant's subscription from Stripe ─────
// Called by the web app when the user returns from Checkout, so the billing gate
// releases immediately without waiting on the webhook. Returns the live needs_billing.
billingRouter.post('/sync', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  try {
    await reconcileTenantBilling(tenantId)
  } catch (e: any) {
    console.error('[billing] sync error:', e?.message)
  }
  const t = await (prisma as any).tenant.findUnique({
    where: { id: tenantId },
    select: { subscription_status: true, stripe_subscription_id: true },
  })
  const needsBilling = t ? (t.subscription_status !== 'active' && !t.stripe_subscription_id) : true
  ok(res, { needs_billing: needsBilling, subscription_status: t?.subscription_status ?? null })
})

// ─── POST /billing/cancel — cancel this tenant's subscription immediately ──────
billingRouter.post('/cancel', requireAdmin, async (req: Request, res: Response) => {
  try {
    const cancelled = await cancelTenantSubscription(req.user!.tenant_id)
    ok(res, { cancelled })
  } catch (e: any) {
    err(res, 'CANCEL_FAILED', e.message ?? 'Could not cancel subscription.', 500)
  }
})

// ─── POST /billing/close-account — request account closure ────────────────────
// Cancels the Stripe subscription, deactivates ALL logins immediately, and flags
// the tenant for permanent erasure (closure_requested_at). Recoverable by the
// CareStream team for a short window before data is erased.
billingRouter.post('/close-account', requireAdmin, async (req: Request, res: Response) => {
  const tenantId = req.user!.tenant_id
  try {
    // Best-effort Stripe cancel — don't block closure if Stripe is unreachable.
    await cancelTenantSubscription(tenantId).catch((e) => console.error('[billing] close-account stripe cancel:', e?.message))

    await (prisma as any).tenant.update({
      where: { id: tenantId },
      data:  { subscription_status: 'cancelled', closure_requested_at: new Date() },
    })
    // Deactivate every login on the account so no one can sign in.
    const { count } = await (prisma as any).user.updateMany({
      where: { tenant_id: tenantId, is_active: true },
      data:  { is_active: false },
    })

    const t = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { name: true, account_number: true } })
    console.warn(`[billing] ACCOUNT CLOSURE requested for ${t?.account_number ?? tenantId} (${t?.name ?? ''}) — ${count} logins deactivated, queued for erasure.`)

    ok(res, { closed: true, deactivated_users: count })
  } catch (e: any) {
    err(res, 'CLOSE_FAILED', e.message ?? 'Could not close the account.', 500)
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
          price_annual_pence:  true,
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
  // Plan feature flags + the monthly annual-allocation usage (for gating + the
  // dashboard licence meter).
  const features = await getPlanFeatures(tenantId)

  ok(res, {
    plan_name:           tenant.plan?.name ?? null,
    subscription_status: tenant.subscription_status as string,
    price_monthly_pence: tenant.plan?.price_monthly_pence ?? null,
    price_annual_pence:  tenant.plan?.price_annual_pence ?? null,
    monthly_query_limit: tenant.plan?.monthly_query_limit ?? null,
    has_stripe:          !!tenant.stripe_customer_id,
    next_billing_date:    sub?.next_billing_date    ?? null,
    current_period_start: sub?.current_period_start ?? null,
    current_period_end:   sub?.current_period_end   ?? null,
    billing_interval:     sub?.billing_interval     ?? null,
    cancel_at_period_end: sub?.cancel_at_period_end ?? false,
    features,
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
