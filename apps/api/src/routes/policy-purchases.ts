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
import { productForTitle, purchaseIntakeState, intakeStateFor } from '../services/policy-writer/intake'

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
    // Enrich each purchase with its intake state so the client sees exactly which
    // details we still need before writing can start.
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: user.tenant_id }, select: { organisation_details: true },
    })
    const od = (tenant?.organisation_details ?? {}) as Record<string, unknown>
    const productSlugs = [...new Set(rows.map((r: any) => r.product_slug).filter(Boolean))]
    const products = productSlugs.length
      ? await (prisma as any).policyProduct.findMany({ where: { slug: { in: productSlugs } }, select: { slug: true, intake_fields: true } })
      : []
    const fieldsBySlug = new Map(products.map((p: any) => [p.slug, p.intake_fields]))
    const purchases = rows.map((r: any) => ({
      ...r,
      intake: intakeStateFor(
        (fieldsBySlug.get(r.product_slug) as any) ?? null,
        od,
        (r.intake_data ?? {}) as Record<string, unknown>,
      ),
    }))
    ok(res, { purchases, price_pence: POLICY_PENCE })
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

// POST /:id/intake — the buyer supplies the details their policy needs.
//
// Shared identity answers are written to the tenant's organisation details, so they
// are asked once and reused for every later purchase (and by the rest of CareStream).
// Per-policy answers live on the purchase. When everything required is present, an
// awaiting_details order becomes ready to write.
policyPurchasesRouter.post('/:id/intake', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can supply policy details', 403)
  const values = (req.body?.values ?? {}) as Record<string, unknown>
  if (typeof values !== 'object' || Array.isArray(values)) return err(res, 'INVALID_INPUT', 'values must be an object', 400)

  try {
    const purchase = await (prisma as any).policyPurchase.findFirst({
      where: { id: String(req.params.id), tenant_id: user.tenant_id },
    })
    if (!purchase) return err(res, 'NOT_FOUND', 'That order was not found', 404)
    if (purchase.status === 'approved' || purchase.status === 'refunded') {
      return err(res, 'CLOSED', 'That order is closed', 409)
    }

    // Only keys the order's field list declares are accepted; anything else is dropped.
    const state = await purchaseIntakeState(purchase)
    const allowed = new Map(state.fields.map(f => [f.key, f]))
    const sharedUpdates: Record<string, string> = {}
    const specificUpdates: Record<string, string> = {}
    for (const [key, raw] of Object.entries(values)) {
      const field = allowed.get(key)
      if (!field) continue
      const value = String(raw ?? '').trim().slice(0, 500)
      if (!value) continue
      if (field.shared) sharedUpdates[key] = value
      else specificUpdates[key] = value
    }

    if (Object.keys(sharedUpdates).length) {
      const tenant = await (prisma as any).tenant.findUnique({
        where: { id: user.tenant_id }, select: { organisation_details: true, name: true },
      })
      const mergedDetails = { ...((tenant?.organisation_details ?? {}) as any), ...sharedUpdates }
      // A shop buyer's tenant is created as "Policy customer" because at payment we do
      // not know who they are. The moment they tell us, use it — otherwise the clients
      // list fills with identical placeholders. Only ever renames the placeholder.
      const realName = mergedDetails.company_legal_name || mergedDetails.trading_name || null
      const renaming = realName && tenant?.name === 'Policy customer'
        ? { name: String(realName).slice(0, 120) }
        : {}
      await (prisma as any).tenant.update({
        where: { id: user.tenant_id },
        data: { organisation_details: mergedDetails, ...renaming },
      })
    }
    let updated = purchase
    if (Object.keys(specificUpdates).length) {
      updated = await (prisma as any).policyPurchase.update({
        where: { id: purchase.id },
        data: { intake_data: { ...((purchase.intake_data ?? {}) as object), ...specificUpdates } },
      })
    }

    const after = await purchaseIntakeState(updated)
    if (after.complete && updated.status === 'awaiting_details') {
      updated = await (prisma as any).policyPurchase.update({
        where: { id: purchase.id },
        data: { status: 'paid', intake_completed_at: new Date() },
      })
    }
    ok(res, { purchase: updated, intake: after })
  } catch (e: any) {
    err(res, 'INTAKE_FAILED', e?.message ?? 'could not save those details', 500)
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
    const buyerTenant = await (prisma as any).tenant.findUnique({
      where: { id: user.tenant_id }, select: { organisation_details: true },
    })
    const od = (buyerTenant?.organisation_details ?? {}) as Record<string, unknown>
    for (const title of result.titles) {
      try {
        // Map the order to a catalogue product where one exists (exact title match), so
        // its intake fields apply. Bespoke gap titles fall back to the shared identity
        // set. If required details are missing, the order starts at awaiting_details:
        // writing cannot begin on facts we do not have.
        const product = await productForTitle(title)
        const intake = intakeStateFor(product?.intake_fields ?? null, od, {})
        await (prisma as any).policyPurchase.create({
          data: {
            tenant_id:         user.tenant_id,
            policy_title:      title,
            reference_keys:    result.referenceKeysByTitle[title] ?? [],
            price_pence:       POLICY_PENCE,
            currency:          'gbp',
            stripe_payment_id: result.paymentId,
            status:            intake.complete ? 'paid' : 'awaiting_details',
            product_slug:      product?.slug ?? null,
            intake_completed_at: intake.complete ? new Date() : null,
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
