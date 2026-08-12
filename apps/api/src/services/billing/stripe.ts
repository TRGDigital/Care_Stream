// §10.6 — Stripe integration: Checkout, Customer Portal, live summary/invoices,
// and webhook event handling. Card data never touches our servers — all payment
// capture happens on Stripe-hosted Checkout / Portal (PCI SAQ A).
//
// Managed Payments: subscription Checkout runs with `managed_payments.enabled`
// so Stripe acts as merchant of record and handles tax. Plan products carry a
// SaaS tax code. These two operations are pinned to the preview API version
// Managed Payments requires (`2026-02-25.preview`) per-request — the client
// itself is left un-pinned. Toggle off with STRIPE_MANAGED_PAYMENTS=false.

import Stripe from 'stripe'
import { prisma } from '../../db/client'

// API version Managed Payments requires. Applied per-request to product/price
// creation and Checkout Session creation only — NOT to the client globally.
const MANAGED_PAYMENTS_API_VERSION = '2026-02-25.preview'
// Stripe Tax product tax code: "Software as a service (SaaS) — business use".
const PLAN_TAX_CODE = 'txcd_10103100'
// Card-up-front trial: card captured at checkout, £0 due now, auto-charged after this many days.
const TRIAL_DAYS = 14

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

function managedPaymentsEnabled(): boolean {
  return (process.env.STRIPE_MANAGED_PAYMENTS ?? 'true').toLowerCase() !== 'false'
}

// Per-request options pinning the preview API version Managed Payments needs.
// Undefined when Managed Payments is off, so calls use the account default.
function managedPaymentsRequestOptions(): Stripe.RequestOptions | undefined {
  return managedPaymentsEnabled()
    ? ({ apiVersion: MANAGED_PAYMENTS_API_VERSION } as any)
    : undefined
}

// First configured WEB_URL origin (the env may hold a comma-separated CORS allowlist).
function webUrl(): string {
  return (process.env.WEB_URL || 'http://localhost:3000').split(',')[0].trim().replace(/\/$/, '')
}

// Map a Stripe subscription status → our tenant.subscription_status vocabulary.
function mapStatus(s: Stripe.Subscription.Status): string {
  switch (s) {
    case 'active':             return 'active'
    case 'trialing':           return 'trialling'
    case 'past_due':           return 'past_due'
    case 'unpaid':             return 'past_due'
    case 'canceled':           return 'cancelled'
    case 'incomplete_expired': return 'cancelled'
    default:                   return 'trialling' // incomplete / paused
  }
}

// ─── Plan → Stripe price (lazy create) ────────────────────────────────────────
// Returns the recurring price id for a plan + interval ('month'|'year'), creating
// the Stripe Product + Price on first use and persisting the id. Avoids any manual
// dashboard setup. Annual price ids are normally pre-set on the plan in the DB.
export type BillingInterval = 'month' | 'year'

async function ensurePlanPrice(plan: any, interval: BillingInterval = 'month'): Promise<string> {
  const existing = interval === 'year' ? plan.stripe_price_id_annual : plan.stripe_price_id_monthly
  if (existing) return existing

  const amount = interval === 'year' ? plan.price_annual_pence : plan.price_monthly_pence
  if (!amount) throw new Error(`No ${interval === 'year' ? 'annual' : 'monthly'} price configured for the ${plan.name} plan.`)

  const stripe = getStripe()
  const opts = managedPaymentsRequestOptions()
  const product = await stripe.products.create({
    name:     `CareStreamAI — ${plan.name}`,
    tax_code: PLAN_TAX_CODE,
    metadata: { plan_id: plan.id },
  }, opts)
  const price = await stripe.prices.create({
    product:    product.id,
    currency:   'gbp',
    unit_amount: amount,
    recurring:  { interval },
    metadata:   { plan_id: plan.id },
  }, opts)
  await (prisma as any).plan.update({
    where: { id: plan.id },
    data:  interval === 'year' ? { stripe_price_id_annual: price.id } : { stripe_price_id_monthly: price.id },
  })
  return price.id
}

// ─── Checkout ─────────────────────────────────────────────────────────────────
// Creates a hosted Checkout Session for a tenant to subscribe to a plan.
export async function createCheckoutSession(tenantId: string, planId: string, interval: BillingInterval = 'month'): Promise<string> {
  const stripe = getStripe()
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { stripe_customer_id: true, name: true, enterprise_discount: true } })
  if (!tenant) throw new Error('Tenant not found')
  const plan = await (prisma as any).plan.findUnique({ where: { id: planId } })
  if (!plan || !plan.is_active) throw new Error('Plan not available')

  const priceId = await ensurePlanPrice(plan, interval)

  // Per-tenant Enterprise closing discount: applied only when the platform has flagged this
  // tenant, on the Enterprise plan, monthly billing. It is never self-serve.
  const applyEnterpriseDiscount =
    tenant.enterprise_discount === true &&
    plan.name === 'Enterprise' &&
    interval === 'month' &&
    !!plan.stripe_coupon_id
  const admin = await (prisma as any).user.findFirst({
    where:   { tenant_id: tenantId, role: 'admin', is_active: true },
    orderBy: { created_at: 'asc' }, select: { email: true },
  })

  // `customer_creation` is not valid in subscription mode — Stripe always
  // creates the customer; passing only customer_email is correct.
  const params: Stripe.Checkout.SessionCreateParams = {
    mode:        'subscription',
    line_items:  [{ price: priceId, quantity: 1 }],
    ...(tenant.stripe_customer_id
      ? { customer: tenant.stripe_customer_id }
      : { customer_email: admin?.email }),
    client_reference_id:   tenantId,
    metadata:              { tenant_id: tenantId, plan_id: planId },
    // 14-day free trial with the card captured up front; Stripe auto-charges at trial end.
    subscription_data:     { metadata: { tenant_id: tenantId, plan_id: planId }, trial_period_days: TRIAL_DAYS },
    payment_method_collection: 'always',
    billing_address_collection: 'required',
    // Stripe forbids `discounts` and `allow_promotion_codes` together: pre-apply our coupon
    // for flagged Enterprise tenants, otherwise let customers enter a public promo code.
    ...(applyEnterpriseDiscount
      ? { discounts: [{ coupon: plan.stripe_coupon_id as string }] }
      : { allow_promotion_codes: true }),
    success_url: `${webUrl()}/start?checkout=success&session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${webUrl()}/start?checkout=cancelled`,
  }
  // Managed Payments: Stripe becomes merchant of record and settles tax.
  if (managedPaymentsEnabled()) (params as any).managed_payments = { enabled: true }

  const session = await stripe.checkout.sessions.create(params, managedPaymentsRequestOptions())
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}

// ─── Training licence checkout (one-off, training-only gateway tier) ───────────
// One row of the cart = one staff seat × one module (£25.99). The price is resolved
// from the configured training Product so there's no separate price-id to manage.
export const TRAINING_LICENCE_PENCE = 2599

async function trainingPriceId(): Promise<string> {
  const productId = process.env.STRIPE_TRAINING_PRODUCT_ID
  if (!productId) throw new Error('STRIPE_TRAINING_PRODUCT_ID is not configured')
  const stripe = getStripe()
  const prices = await stripe.prices.list({ product: productId, active: true, limit: 20 }, managedPaymentsRequestOptions())
  const price = prices.data.find(p => p.currency === 'gbp' && p.type === 'one_time') ?? prices.data[0]
  if (!price) throw new Error('No active price on the training product — add a £25.99 one-off GBP price in Stripe')
  return price.id
}

export interface TrainingCheckoutInput {
  moduleSlug: string
  moduleName: string
  quantity: number
  email: string
  orgName: string
}

// Hosted one-off Checkout for N training licences. Provisioning happens on return
// (reconcile-on-return) — see reconcileTrainingCheckout — not via webhook.
export async function createTrainingCheckoutSession(input: TrainingCheckoutInput): Promise<string> {
  const stripe = getStripe()
  const priceId = await trainingPriceId()
  const qty = Math.max(1, Math.min(500, Math.floor(input.quantity || 1)))
  const params: Stripe.Checkout.SessionCreateParams = {
    mode:         'payment',
    line_items:   [{ price: priceId, quantity: qty }],
    customer_email: input.email,
    metadata: {
      kind:        'training_licence',
      module_slug: input.moduleSlug,
      module_name: input.moduleName.slice(0, 250),
      quantity:    String(qty),
      org_name:    input.orgName.slice(0, 250),
      email:       input.email,
    },
    billing_address_collection: 'required',
    success_url: `${webUrl()}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${webUrl()}/staff-training/${input.moduleSlug}?buy=cancelled`,
  }
  if (managedPaymentsEnabled()) (params as any).managed_payments = { enabled: true }
  const session = await stripe.checkout.sessions.create(params, managedPaymentsRequestOptions())
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}

// ─── Basket checkout (multiple modules in one order) ──────────────────────────
// Volume discount is applied to the TOTAL number of licences in the order (mixed
// courses count together), as a computed unit price. Highest qualifying tier wins.
const TRAINING_DISCOUNT_TIERS = [
  { min: 100, pct: 40 }, { min: 50, pct: 30 }, { min: 20, pct: 20 }, { min: 10, pct: 10 },
]
export function trainingDiscountPct(totalQty: number): number {
  for (const t of TRAINING_DISCOUNT_TIERS) if (totalQty >= t.min) return t.pct
  return 0
}

export interface TrainingBasketItem { moduleSlug: string; moduleName: string; quantity: number }
export interface TrainingBasketCheckoutInput { items: TrainingBasketItem[]; email: string; orgName: string }

// Hosted one-off Checkout for a basket of training licences across several modules.
// One line item at the discounted unit price × total licences; the per-module
// breakdown travels in metadata and is provisioned on return (reconcile).
export async function createTrainingBasketCheckoutSession(input: TrainingBasketCheckoutInput): Promise<string> {
  const productId = process.env.STRIPE_TRAINING_PRODUCT_ID
  if (!productId) throw new Error('STRIPE_TRAINING_PRODUCT_ID is not configured')
  const stripe = getStripe()

  const items = input.items
    .map(i => ({ ...i, quantity: Math.max(1, Math.min(500, Math.floor(i.quantity || 1))) }))
    .filter(i => i.moduleSlug)
    .slice(0, 25)
  if (!items.length) throw new Error('Basket is empty')

  const totalQty = items.reduce((s, i) => s + i.quantity, 0)
  const pct = trainingDiscountPct(totalQty)
  const unit = Math.round(TRAINING_LICENCE_PENCE * (1 - pct / 100))

  const params: Stripe.Checkout.SessionCreateParams = {
    mode:       'payment',
    line_items: [{ price_data: { currency: 'gbp', product: productId, unit_amount: unit }, quantity: totalQty }],
    customer_email: input.email,
    metadata: {
      kind:         'training_basket',
      basket:       JSON.stringify(items.map(i => ({ s: i.moduleSlug, q: i.quantity }))).slice(0, 480),
      total_qty:    String(totalQty),
      discount_pct: String(pct),
      org_name:     input.orgName.slice(0, 250),
      email:        input.email,
    },
    billing_address_collection: 'required',
    success_url: `${webUrl()}/buy/success?session_id={CHECKOUT_SESSION_ID}`,
    cancel_url:  `${webUrl()}/basket?buy=cancelled`,
  }
  if (managedPaymentsEnabled()) (params as any).managed_payments = { enabled: true }
  const session = await stripe.checkout.sessions.create(params, managedPaymentsRequestOptions())
  if (!session.url) throw new Error('Stripe did not return a checkout URL')
  return session.url
}

export interface TrainingCheckoutResult {
  paid:         boolean
  paymentId:    string | null
  email:        string | null
  customerName: string | null
  metadata:     Record<string, string>
}

// Retrieve a training Checkout session to verify payment + read its metadata
// (used by reconcile-on-return provisioning).
export async function retrieveTrainingCheckoutSession(sessionId: string): Promise<TrainingCheckoutResult | null> {
  const stripe = getStripe()
  const session = await stripe.checkout.sessions.retrieve(sessionId, managedPaymentsRequestOptions())
  if (!session) return null
  const paymentId = typeof session.payment_intent === 'string'
    ? session.payment_intent
    : (session.payment_intent?.id ?? session.id)
  return {
    paid:         session.payment_status === 'paid',
    paymentId,
    email:        session.customer_details?.email ?? session.customer_email ?? null,
    customerName: session.customer_details?.name ?? null,
    metadata:     (session.metadata ?? {}) as Record<string, string>,
  }
}

// Best-effort Stripe receipt URL for a one-off training payment, from the
// PaymentIntent's latest charge. Returns null if unavailable (never throws), so
// the Billing "your purchases" view degrades gracefully.
export async function getTrainingReceiptUrl(paymentIntentId: string | null): Promise<string | null> {
  if (!paymentIntentId || !paymentIntentId.startsWith('pi_')) return null
  try {
    const stripe = getStripe()
    const pi = await stripe.paymentIntents.retrieve(paymentIntentId, { expand: ['latest_charge'] }, managedPaymentsRequestOptions())
    const charge = pi.latest_charge as Stripe.Charge | null
    return charge?.receipt_url ?? null
  } catch {
    return null
  }
}

// ─── Cancel ───────────────────────────────────────────────────────────────────
// Cancel a tenant's Stripe subscription immediately and mark the tenant cancelled.
// Used for in-app cancellation and for cleaning up test accounts before deletion.
export async function cancelTenantSubscription(tenantId: string): Promise<boolean> {
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { stripe_subscription_id: true } })
  if (!tenant?.stripe_subscription_id) return false
  await getStripe().subscriptions.cancel(String(tenant.stripe_subscription_id)).catch((e: any) => {
    // Already cancelled or gone — fine to proceed.
    console.warn('[stripe] cancel subscription:', e?.message)
  })
  await (prisma as any).tenant.update({ where: { id: tenantId }, data: { subscription_status: 'cancelled' } })
  return true
}

// ─── Reconcile (source of truth = Stripe) ─────────────────────────────────────
// Pulls a tenant's current subscription straight from Stripe and writes it onto
// the tenant. This is the primary way the billing gate releases after checkout —
// we do NOT rely on the webhook arriving (it can be delayed or misconfigured).
// Finds the customer by stored id, else by the admin's email, matching on the
// subscription's tenant_id metadata. Returns true if a subscription was synced.
export async function reconcileTenantBilling(tenantId: string): Promise<boolean> {
  const stripe = getStripe()
  const tenant = await (prisma as any).tenant.findUnique({ where: { id: tenantId }, select: { id: true, stripe_customer_id: true } })
  if (!tenant) return false

  let customerId: string | null = tenant.stripe_customer_id ?? null
  if (!customerId) {
    const admin = await (prisma as any).user.findFirst({
      where: { tenant_id: tenantId, role: 'admin', is_active: true },
      orderBy: { created_at: 'asc' }, select: { email: true },
    })
    if (admin?.email) {
      const customers = await stripe.customers.list({ email: admin.email, limit: 10 })
      for (const c of customers.data) {
        const subs = await stripe.subscriptions.list({ customer: c.id, status: 'all', limit: 10 })
        if (subs.data.some(s => s.metadata?.tenant_id === tenantId)) { customerId = c.id; break }
      }
      if (!customerId && customers.data.length === 1) customerId = customers.data[0].id
    }
  }
  if (!customerId) return false

  const subs = await stripe.subscriptions.list({ customer: customerId, status: 'all', limit: 10 })
  const sub = subs.data.find(s => s.metadata?.tenant_id === tenantId) ?? subs.data[0]
  if (!sub) {
    await (prisma as any).tenant.update({ where: { id: tenantId }, data: { stripe_customer_id: customerId } })
    return false
  }

  await (prisma as any).tenant.update({
    where: { id: tenantId },
    data: {
      stripe_customer_id:     customerId,
      stripe_subscription_id: sub.id,
      subscription_status:    mapStatus(sub.status),
      trial_ends_at:          sub.trial_end ? new Date(sub.trial_end * 1000) : null,
      ...(sub.metadata?.plan_id ? { plan_id: sub.metadata.plan_id } : {}),
    },
  })
  console.log(`[stripe] reconciled tenant=${tenantId} customer=${customerId} sub=${sub.id} status=${sub.status}`)
  return true
}

// ─── Customer Portal ──────────────────────────────────────────────────────────
export async function createPortalSession(stripeCustomerId: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: `${webUrl()}/billing`,
  })
  return session.url
}

// ─── Live billing summary (Stripe subscription fields) ────────────────────────
export interface StripeSubInfo {
  next_billing_date:    string | null
  current_period_start: string | null
  current_period_end:   string | null
  billing_interval:     string | null
  cancel_at_period_end: boolean
}

export async function getSubscriptionInfo(tenant: { stripe_customer_id: string | null; stripe_subscription_id: string | null }): Promise<StripeSubInfo | null> {
  if (!tenant.stripe_customer_id) return null
  const stripe = getStripe()
  try {
    let sub: Stripe.Subscription | null = null
    if (tenant.stripe_subscription_id) {
      sub = await stripe.subscriptions.retrieve(tenant.stripe_subscription_id).catch(() => null)
    }
    if (!sub) {
      const list = await stripe.subscriptions.list({ customer: tenant.stripe_customer_id, status: 'all', limit: 1 })
      sub = list.data[0] ?? null
    }
    if (!sub) return null
    const interval = sub.items.data[0]?.price?.recurring?.interval ?? null
    const iso = (n: number | null | undefined) => (n ? new Date(n * 1000).toISOString() : null)
    return {
      next_billing_date:    iso((sub as any).current_period_end),
      current_period_start: iso((sub as any).current_period_start),
      current_period_end:   iso((sub as any).current_period_end),
      billing_interval:     interval,
      cancel_at_period_end: !!sub.cancel_at_period_end,
    }
  } catch (e: any) {
    console.error('[stripe] getSubscriptionInfo error:', e?.message)
    return null
  }
}

// ─── Invoices ─────────────────────────────────────────────────────────────────
export async function listInvoices(stripeCustomerId: string) {
  const stripe = getStripe()
  const res = await stripe.invoices.list({ customer: stripeCustomerId, limit: 24 })
  return res.data
    .filter(inv => inv.status !== 'draft')
    .map(inv => ({
      id:           inv.id,
      date:         new Date(inv.created * 1000).toISOString(),
      description:  inv.lines.data[0]?.description ?? 'CareStreamAI subscription',
      amount_pence: inv.amount_paid || inv.amount_due,
      status:       inv.status ?? 'open',
      pdf_url:      inv.invoice_pdf ?? null,
      hosted_url:   inv.hosted_invoice_url ?? null,
    }))
}

// ─── Webhook handler ──────────────────────────────────────────────────────────
// Subscribe these events on the live endpoint:
//   checkout.session.completed, customer.subscription.created/updated/deleted,
//   invoice.paid, invoice.payment_failed
export async function handleWebhook(payload: Buffer, signature: string): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')

  const event = getStripe().webhooks.constructEvent(payload, signature, secret)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id || session.client_reference_id || undefined
      if (tenantId && session.subscription) {
        // Use the subscription's real status (trialing → trialling) rather than
        // assuming 'active' — a card-up-front trial completes as 'trialing'.
        const sub = await getStripe().subscriptions.retrieve(String(session.subscription)).catch(() => null)
        await (prisma as any).tenant.update({
          where: { id: tenantId },
          data: {
            ...(session.customer ? { stripe_customer_id: String(session.customer) } : {}),
            stripe_subscription_id: String(session.subscription),
            subscription_status:    sub ? mapStatus(sub.status) : 'trialling',
            ...(sub?.trial_end ? { trial_ends_at: new Date(sub.trial_end * 1000) } : {}),
            ...(session.metadata?.plan_id ? { plan_id: session.metadata.plan_id } : {}),
          },
        })
        console.log(`[stripe] checkout.session.completed: tenant=${tenantId} status=${sub?.status}`)
      } else if (tenantId) {
        await reconcileTenantBilling(tenantId).catch(() => {})
      }
      break
    }

    case 'customer.subscription.created':
    case 'customer.subscription.updated': {
      const sub = event.data.object as Stripe.Subscription
      const tenantId = sub.metadata?.tenant_id
      const where = tenantId ? { id: tenantId } : { stripe_customer_id: String(sub.customer) }
      await (prisma as any).tenant.updateMany({
        where,
        data: {
          stripe_customer_id:     String(sub.customer),
          stripe_subscription_id: sub.id,
          subscription_status:    mapStatus(sub.status),
          trial_ends_at:          sub.trial_end ? new Date(sub.trial_end * 1000) : null,
          ...(sub.metadata?.plan_id ? { plan_id: sub.metadata.plan_id } : {}),
        },
      })
      console.log(`[stripe] ${event.type}: customer=${sub.customer} status=${sub.status}`)
      break
    }

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      await (prisma as any).tenant.updateMany({
        where: { stripe_customer_id: String(sub.customer) },
        data:  { subscription_status: 'cancelled' },
      })
      console.log(`[stripe] subscription.deleted: customer=${sub.customer}`)
      break
    }

    case 'invoice.paid': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.customer) {
        await (prisma as any).tenant.updateMany({
          where: { stripe_customer_id: String(invoice.customer) },
          data:  { subscription_status: 'active' },
        })
      }
      break
    }

    case 'invoice.payment_failed': {
      const invoice = event.data.object as Stripe.Invoice
      if (invoice.customer) {
        await (prisma as any).tenant.updateMany({
          where: { stripe_customer_id: String(invoice.customer) },
          data:  { subscription_status: 'past_due' },
        })
        console.log(`[stripe] invoice.payment_failed: customer=${invoice.customer}`)
      }
      break
    }

    default:
      break // ignore unhandled event types
  }
}
