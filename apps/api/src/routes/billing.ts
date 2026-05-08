// §10.6 — Billing routes: Customer Portal + Stripe webhook receiver.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { createPortalSession, handleWebhook } from '../services/billing/stripe'
import { ok, err } from '../lib/response'

export const billingRouter = Router()

// GET /billing/portal — generate a Stripe Customer Portal session for the current tenant.
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
