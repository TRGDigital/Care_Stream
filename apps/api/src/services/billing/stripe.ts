import Stripe from 'stripe'

// §10.6 — Stripe integration
// Checkout for sign-up; Customer Portal for self-serve management
// Webhooks update tenant subscription_status in real time
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!)

export async function createCheckoutSession(_tenantId: string, _planId: string): Promise<string> {
  throw new Error('Not implemented')
}

export async function createPortalSession(_stripeCustomerId: string): Promise<string> {
  throw new Error('Not implemented')
}

export async function handleWebhook(_payload: Buffer, _signature: string): Promise<void> {
  throw new Error('Not implemented')
}
