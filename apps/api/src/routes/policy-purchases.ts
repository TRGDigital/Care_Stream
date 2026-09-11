// Buying a policy we write for the client.
//
// The money side is deliberately the same as training licences, which is the one-off path
// already proven in production: hosted Stripe Checkout in payment mode, reconciled when the
// buyer returns, idempotent on the Stripe payment id. Nothing new is invented about taking
// money, and no card details ever reach us.
//
// Reconcile-on-return rather than webhook, for the same reason training does it: the webhook's
// checkout.session.completed branch only acts when the session carries a subscription, so it
// silently ignores a payment-mode session. Following the proven path is safer than adding a
// branch to a handler that guards every tenant's billing state.
//
// What a purchase does NOT do is deliver anything. A licence exists the moment it is paid for.
// A policy has to be written, read by a person and approved before a care home should put
// their name on it, so the row lands as 'paid' and the work starts from there.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import {
  createPolicyCheckoutSession,
  retrievePolicyCheckoutSession,
  POLICY_PENCE,
} from '../services/billing/stripe'
import { missingPolicies } from '../services/analytics/missing-policies'
import { sendPolicyPurchaseNotification } from '../services/email/outbound'

export const policyPurchasesRouter = Router()

// GET / — what this client has bought, newest first. Drives both their own view of where a
// document has got to and the platform queue of work owed.
policyPurchasesRouter.get('/', async (req: Request, res: Response) => {
  const user = (req as any).user
  try {
    const rows = await (prisma as any).policyPurchase.findMany({
      where: { tenant_id: user.tenant_id },
      orderBy: { purchased_at: 'desc' },
    })
    ok(res, { purchases: rows, price_pence: POLICY_PENCE })
  } catch (e: any) {
    err(res, 'PURCHASES_FAILED', e?.message ?? 'could not read your purchases', 500)
  }
})

// POST /checkout — start a hosted Checkout for one or more missing policies.
//
// The titles are NOT taken from the request. A client could otherwise ask to buy anything, or
// buy a policy they already hold. They are re-derived from the current missing-policy report,
// which reads their policies against the legislation, and the request is only allowed to
// choose from that list.
policyPurchasesRouter.post('/checkout', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can buy policies', 403)

  const asked: string[] = Array.isArray(req.body?.titles) ? req.body.titles.map(String) : []
  if (!asked.length) return err(res, 'INVALID_INPUT', 'Choose at least one policy', 400)

  try {
    const report = await missingPolicies(user.tenant_id)
    if (!report.analysed) {
      return err(res, 'NOT_ANALYSED', 'Your policies have not been analysed yet', 409)
    }
    if (report.stale) {
      // Selling against a verdict we have already decided not to trust would be indefensible.
      return err(res, 'ANALYSIS_STALE', report.stale_reason ?? 'The analysis is out of date', 409)
    }

    const offered = new Map(report.missing.map(m => [m.title, m.regulations.map(r => r.reference_key)]))
    const titles = asked.filter(t => offered.has(t))
    if (!titles.length) {
      return err(res, 'NOT_MISSING', 'Those policies are not on your missing list', 409)
    }

    // Already bought and not refunded? Do not sell it twice.
    const existing = await (prisma as any).policyPurchase.findMany({
      where: { tenant_id: user.tenant_id, policy_title: { in: titles }, status: { not: 'refunded' } },
      select: { policy_title: true },
    })
    const already = new Set(existing.map((r: any) => r.policy_title))
    const toBuy = titles.filter(t => !already.has(t))
    if (!toBuy.length) {
      return err(res, 'ALREADY_BOUGHT', 'You have already bought those policies', 409)
    }

    const refs: Record<string, string[]> = {}
    for (const t of toBuy) refs[t] = offered.get(t) ?? []

    const url = await createPolicyCheckoutSession({
      tenantId: user.tenant_id,
      email:    user.email,
      titles:   toBuy,
      referenceKeysByTitle: refs,
    })
    ok(res, { url, titles: toBuy, price_pence: POLICY_PENCE })
  } catch (e: any) {
    err(res, 'CHECKOUT_FAILED', e?.message ?? 'could not start checkout', 500)
  }
})

// POST /reconcile — called when the buyer returns from Stripe.
//
// Idempotent on (stripe_payment_id, policy_title), so refreshing the return page cannot
// record a purchase twice. Verifies payment with Stripe rather than trusting the redirect.
policyPurchasesRouter.post('/reconcile', async (req: Request, res: Response) => {
  const user = (req as any).user
  const sessionId = String(req.body?.session_id ?? '').trim()
  if (!sessionId) return err(res, 'INVALID_INPUT', 'session_id is required', 400)

  try {
    const result = await retrievePolicyCheckoutSession(sessionId)
    if (!result) return err(res, 'NOT_FOUND', 'That checkout session was not found', 404)
    if (!result.paid) return err(res, 'NOT_PAID', 'That payment has not completed', 409)
    // The session says which tenant paid. Trust that over the caller's own token, and refuse
    // when they disagree: a session id is not a licence to write rows for someone else.
    if (result.tenantId && result.tenantId !== user.tenant_id) {
      return err(res, 'FORBIDDEN', 'That purchase belongs to another account', 403)
    }

    const created: string[] = []
    for (const title of result.titles) {
      try {
        await (prisma as any).policyPurchase.create({
          data: {
            tenant_id:         user.tenant_id,
            policy_title:      title,
            reference_keys:    result.referenceKeysByTitle[title] ?? [],
            price_pence:       POLICY_PENCE,
            currency:          'gbp',
            stripe_payment_id: result.paymentId,
            status:            'paid',
          },
        })
        created.push(title)
      } catch {
        // Unique index on (stripe_payment_id, policy_title): already recorded, which is the
        // normal outcome of a refresh rather than a failure.
      }
    }

    const purchases = await (prisma as any).policyPurchase.findMany({
      where: { tenant_id: user.tenant_id, stripe_payment_id: result.paymentId },
      orderBy: { policy_title: 'asc' },
    })

    // Tell the platform team work is now owed (fire-and-forget; idempotent because
    // reconcile only reports titles created THIS call — a page refresh creates none).
    if (created.length > 0) {
      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: user.tenant_id }, select: { name: true, account_number: true },
      }).catch(() => null)
      sendPolicyPurchaseNotification({
        tenantName: tenant?.name ?? 'Unknown client',
        accountNumber: tenant?.account_number ?? null,
        titles: created,
        totalPence: created.length * POLICY_PENCE,
      }).catch(e => console.error('[policy-purchases] notify failed:', e?.message ?? e))
    }

    ok(res, { created: created.length, purchases })
  } catch (e: any) {
    err(res, 'RECONCILE_FAILED', e?.message ?? 'could not confirm that purchase', 500)
  }
})
