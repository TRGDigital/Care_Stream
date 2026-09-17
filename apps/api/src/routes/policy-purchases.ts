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
} from '../services/billing/stripe'
import { missingPolicies } from '../services/analytics/missing-policies'
import { sendPolicyPurchaseNotification } from '../services/email/outbound'
import { productForTitle, purchaseIntakeState, intakeStateFor } from '../services/policy-writer/intake'

export const policyPurchasesRouter = Router()

// What a policy costs on /gaps: the policy shop's price for the same policy, matched by title,
// so a subscriber never pays more (or less) than a shop buyer. A missing policy with no shop
// page is priced at the shop's highest single-policy price, the same tier as the most
// substantial policies it sells.
async function policyPrices(): Promise<{ priceFor: (title: string) => number; byTitle: Record<string, number>; fallback: number }> {
  const products = await (prisma as any).policyProduct.findMany({
    where: { active: true }, select: { title: true, price_pence: true },
  })
  const byLower = new Map<string, number>((products as any[]).map(p => [String(p.title).trim().toLowerCase(), p.price_pence]))
  const fallback = Math.max(0, ...(products as any[]).map(p => p.price_pence)) || 7900
  const priceFor = (title: string) => byLower.get(title.trim().toLowerCase()) ?? fallback
  const byTitle = Object.fromEntries((products as any[]).map(p => [p.title, priceFor(p.title)]))
  return { priceFor, byTitle, fallback }
}

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
    const [prices, ignores] = await Promise.all([
      policyPrices(),
      (prisma as any).missingPolicyIgnore.findMany({
        where: { tenant_id: user.tenant_id }, orderBy: { ignored_at: 'desc' },
        select: { policy_title: true, ignored_at: true, ignored_by_name: true },
      }),
    ])
    // price_pence is the price for a policy with no shop page; prices holds every shop policy.
    ok(res, { purchases, price_pence: prices.fallback, prices: prices.byTitle, ignored: ignores })
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
    const { priceFor } = await policyPrices()
    const pricesByTitle: Record<string, number> = {}
    for (const t of toBuy) pricesByTitle[t] = priceFor(t)

    const url = await createPolicyCheckoutSession({
      tenantId: user.tenant_id,
      email:    user.email,
      titles:   toBuy,
      referenceKeysByTitle: refs,
      pricesByTitle,
    })
    ok(res, { url, titles: toBuy, total_pence: toBuy.reduce((n, t) => n + pricesByTitle[t], 0) })
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

      // A policy written while the tenant was still "Policy customer" has that phrase in its
      // prose, permanently: the writer is told to name the organisation and it named the one
      // it was given. Nothing re-checked it afterwards, so the document shipped looking
      // personalised while naming nobody. The identity check passed at the time and only
      // began to fail once the rename happened, which is how it surfaced at all.
      //
      // Flag every already-written draft that does not contain the real name, so it shows in
      // the queue as needing a rewrite rather than sitting quietly wrong.
      if (renaming.name) {
        const stale = await (prisma as any).policyPurchase.findMany({
          where:  { tenant_id: user.tenant_id, draft_content: { not: null } },
          select: { id: true, draft_content: true, policy_title: true },
        })
        const needsRewrite = (stale as Array<{ id: string; draft_content: string }>)
          .filter(p2 => !p2.draft_content.toLowerCase().includes(String(renaming.name).toLowerCase()))
        for (const p2 of needsRewrite) {
          await (prisma as any).policyPurchase.update({
            where: { id: p2.id },
            data:  {
              verification: {
                passed: false,
                checked_at: new Date().toISOString(),
                stale_identity: true,
                checks: {
                  substitution: { passed: true, issues: [] },
                  terminology:  { passed: true, issues: [] },
                  identity:     { passed: false, issues: [`Written before this organisation was named. The document does not say "${renaming.name}", so it must be rewritten before it is delivered.`] },
                  completeness: { passed: true, issues: [] },
                  coverage:     { passed: false, assessable: true, issues: ['Not re-checked since the organisation was named.'], regulations: [] },
                },
              },
            },
          }).catch(() => {})
        }
        if (needsRewrite.length) {
          console.warn(`[intake] tenant=${user.tenant_id} renamed to "${renaming.name}"; ${needsRewrite.length} draft(s) flagged for rewrite`)
        }
      }
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

// POST /ignore { title } and POST /unignore { title } — a tenant deciding a missing policy
// does not apply to them. Admin only, like buying. Ignoring hides it from the missing list;
// it never deletes anything and can be undone.
policyPurchasesRouter.post('/ignore', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can change this list', 403)
  const title = String(req.body?.title ?? '').trim().slice(0, 300)
  if (!title) return err(res, 'INVALID_INPUT', 'title is required', 400)
  try {
    const me = await (prisma as any).user.findUnique({ where: { id: user.sub }, select: { name: true } }).catch(() => null)
    const row = await (prisma as any).missingPolicyIgnore.upsert({
      where:  { tenant_id_policy_title: { tenant_id: user.tenant_id, policy_title: title } },
      update: {},
      create: { tenant_id: user.tenant_id, policy_title: title, ignored_by: user.sub, ignored_by_name: me?.name ?? null },
      select: { policy_title: true, ignored_at: true, ignored_by_name: true },
    })
    ok(res, { ignored: row })
  } catch (e: any) {
    err(res, 'IGNORE_FAILED', e?.message ?? 'could not ignore that policy', 500)
  }
})

policyPurchasesRouter.post('/unignore', async (req: Request, res: Response) => {
  const user = (req as any).user
  if (user.role !== 'admin') return err(res, 'FORBIDDEN', 'Only admins can change this list', 403)
  const title = String(req.body?.title ?? '').trim()
  if (!title) return err(res, 'INVALID_INPUT', 'title is required', 400)
  try {
    await (prisma as any).missingPolicyIgnore.deleteMany({ where: { tenant_id: user.tenant_id, policy_title: title } })
    ok(res, { unignored: true })
  } catch (e: any) {
    err(res, 'UNIGNORE_FAILED', e?.message ?? 'could not restore that policy', 500)
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
            // The curated mapping first, then anything the gap analysis found on top.
            //
            // A gaps order used to store only what the gap analysis produced at checkout,
            // while a shop order stored the product's curated mapping. The same policy was
            // therefore written against less law when a subscriber ordered it than when a
            // shop buyer did -- Asbestos Management came through with one regulation here
            // and two there -- and everything downstream inherited it: fewer required
            // elements, a weaker coverage check, a thinner provenance panel and a shorter
            // legislation PDF, for the customer paying more.
            //
            // Union rather than replacement, because the gap analysis can legitimately find
            // something specific to this tenant that the catalogue mapping does not carry.
            reference_keys: [...new Set([
              ...(product?.reference_keys ?? []),
              ...(result.referenceKeysByTitle[title] ?? []),
            ])],
            // What Stripe charged for this title; a session from before per-policy pricing
            // carries no prices and falls back to today's price for the same policy.
            price_pence:       result.pricesByTitle[title] ?? (await policyPrices()).priceFor(title),
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
        totalPence: created.reduce((n, t) => n + (result.pricesByTitle[t] ?? 0), 0),
      }).catch(e => console.error('[policy-purchases] notify failed:', e?.message ?? e))
    }

    ok(res, { created: created.length, purchases })
  } catch (e: any) {
    err(res, 'RECONCILE_FAILED', e?.message ?? 'could not confirm that purchase', 500)
  }
})
