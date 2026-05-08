// §10.6 — Stripe integration: Customer Portal + webhook event handling.

import Stripe from 'stripe'
import { prisma } from '../../db/client'

let _stripe: Stripe | null = null
function getStripe(): Stripe {
  if (!_stripe) {
    if (!process.env.STRIPE_SECRET_KEY) throw new Error('STRIPE_SECRET_KEY is not configured')
    _stripe = new Stripe(process.env.STRIPE_SECRET_KEY)
  }
  return _stripe
}

// ─── Customer Portal ──────────────────────────────────────────────────────────

export async function createPortalSession(stripeCustomerId: string): Promise<string> {
  const session = await getStripe().billingPortal.sessions.create({
    customer:   stripeCustomerId,
    return_url: `${process.env.WEB_URL ?? 'http://localhost:3000'}/billing`,
  })
  return session.url
}

// ─── Webhook handler ──────────────────────────────────────────────────────────
// Events handled:
//   checkout.session.completed   → set stripe_customer_id + mark active
//   invoice.paid                 → subscription_status = 'active'
//   invoice.payment_failed       → subscription_status = 'past_due'
//   customer.subscription.deleted → subscription_status = 'cancelled'

export async function handleWebhook(payload: Buffer, signature: string): Promise<void> {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) throw new Error('STRIPE_WEBHOOK_SECRET is not configured')

  const event = getStripe().webhooks.constructEvent(payload, signature, secret)

  switch (event.type) {
    case 'checkout.session.completed': {
      const session = event.data.object as Stripe.Checkout.Session
      const tenantId = session.metadata?.tenant_id
      if (tenantId && session.customer) {
        await (prisma as any).tenant.update({
          where: { id: tenantId },
          data: {
            stripe_customer_id:  String(session.customer),
            subscription_status: 'active',
          },
        })
        console.log(`[stripe] checkout.session.completed: tenant=${tenantId}`)
      }
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

    case 'customer.subscription.deleted': {
      const sub = event.data.object as Stripe.Subscription
      if (sub.customer) {
        await (prisma as any).tenant.updateMany({
          where: { stripe_customer_id: String(sub.customer) },
          data:  { subscription_status: 'cancelled' },
        })
        console.log(`[stripe] subscription.deleted: customer=${sub.customer}`)
      }
      break
    }

    default:
      // Silently ignore event types we don't handle
      break
  }
}
