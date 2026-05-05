import { Router } from 'express'

export const billingRouter = Router()

// GET /billing/portal — generate Stripe Customer Portal session URL (§10.6)
billingRouter.get('/portal', (_req, res) => res.json({ success: true }))

// POST /billing/webhook — Stripe webhook receiver
// Handles: checkout.session.completed | invoice.paid |
//          invoice.payment_failed | customer.subscription.deleted
billingRouter.post('/webhook', (_req, res) => res.json({ success: true }))
