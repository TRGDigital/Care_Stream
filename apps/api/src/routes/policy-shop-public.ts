// Public, unauthenticated data for the policy shop's marketing pages.
//
// Serves a product with the two things the page demonstrates: the intake fields we
// collect to write the buyer's copy (labels only — this is a demo, not a form), and
// the legislation the policy is analysed against, resolved live from the regulation
// library via expected_policy_titles so the page can never drift from what the
// verification gate actually checks.

import { Router, Request, Response } from 'express'
import { prisma } from '../db/client'
import { ok, err } from '../lib/response'
import { downloadFile } from '../services/storage/s3'
import { shopImageUrl } from '../services/policy-shop/shopImage'
import { createShopCheckoutSession, retrieveShopCheckoutSession, type ShopItem } from '../services/billing/stripe'
import { createLoginLink } from '../lib/login-tokens'
import { siteUrl } from '../lib/urls'
import { hashPassword } from '../services/auth/password'
import {
  sendPolicyPurchaseConfirmation, sendPolicyPurchaseNotification, sendPasswordSetupEmail,
} from '../services/email/outbound'
import crypto from 'crypto'
import { intakeStateFor } from '../services/policy-writer/intake'

export const policyShopPublicRouter = Router()

// The curated required_elements are written as instructions to the WRITER ("Policy
// must designate a named Safeguarding Lead…"), which is right for the verification
// gate and wrong for a buyer reading a sales page. This turns each one into a
// statement about the document they are buying ("Designates a named Safeguarding
// Lead…") for DISPLAY ONLY: the stored elements are never touched, because the gate
// compares against them.
//
// Elements already written as noun phrases ("A process for…", "Definition and
// recognition criteria…") read correctly as they are and are left alone.
function thirdPerson(verb: string): string {
  const v = verb.toLowerCase()
  if (/[^aeiou]y$/.test(v)) return `${v.slice(0, -1)}ies`      // specify → specifies
  if (/(s|sh|ch|x|z)$/.test(v)) return `${v}es`                // address → addresses
  return `${v}s`                                                // require → requires
}
const cap = (s: string) => s.charAt(0).toUpperCase() + s.slice(1)
// Verbs that end in "ly" and so would otherwise be mistaken for adverbs —
// "Policy must comply with…" must not become "Comply withs…".
const LY_VERBS = new Set(['comply', 'apply', 'supply', 'imply', 'multiply', 'reply', 'rely'])

export function humaniseElement(element: string): string {
  const text = String(element ?? '').trim()
  const m = text.match(/^(?:the\s+)?polic(?:y|ies)\s+must\s+(.*)$/is)
  if (!m) return text

  // "also" and "not" appear in either order in the real data.
  let rest = m[1].trim()
  let negated = false
  for (;;) {
    const before = rest
    rest = rest.replace(/^also\s+/i, '')
    const neg = rest.match(/^not\s+/i)
    if (neg) { negated = true; rest = rest.slice(neg[0].length) }
    if (rest === before) break
  }

  const words = rest.split(/\s+/)
  let adverb = ''
  if (words.length > 1 && /ly$/i.test(words[0]) && !LY_VERBS.has(words[0].toLowerCase())) {
    adverb = (words.shift() as string).toLowerCase()
  }
  const verb = (words.shift() ?? '').toLowerCase()
  if (!/^[a-z]{2,}$/.test(verb)) return text

  // A paired verb straight after the first ("appoint or identify") is conjugated too,
  // so it does not read as "Appoints or identify".
  if (words.length > 1 && /^(or|and)$/i.test(words[0]) && /^[a-z]{2,}$/i.test(words[1])) {
    words[1] = thirdPerson(words[1])
  }

  const tail = words.join(' ')
  // A prohibition reads naturally with the bare verb: "Does not require staff to…"
  // rather than "Nots require…".
  const head = negated
    ? `Does not ${adverb ? `${adverb} ` : ''}${verb}`
    : adverb
      ? `${cap(adverb)} ${thirdPerson(verb)}`
      : cap(thirdPerson(verb))
  return `${head}${tail ? ` ${tail}` : ''}`.replace(/\s+/g, ' ').trim()
}

// Title variants a home might use for the same document, so the regulation lookup
// matches the library's expected titles.
export function titleVariants(title: string): string[] {
  const t = title.trim()
  const variants = new Set<string>([t])
  variants.add(t.replace(/ and /g, ' & '))
  variants.add(t.replace(/ & /g, ' and '))
  // "Safeguarding Adults Policy" → also try "Safeguarding Policy"
  const words = t.replace(/ Policy$/i, '').split(' ')
  if (words.length > 1) variants.add(`${words[0]} Policy`)
  return [...variants]
}

// GET /products/:slug — one product, its intake demo and the regulations analysed.
policyShopPublicRouter.get('/products/:slug', async (req: Request, res: Response) => {
  try {
    const product = await (prisma as any).policyProduct.findFirst({
      where: { slug: String(req.params.slug), active: true },
    })
    if (!product) return err(res, 'NOT_FOUND', 'That policy was not found', 404)

    const [bundles, regs] = await Promise.all([
      (prisma as any).policyBundle.findMany({
        where: { key: { in: product.bundle_keys ?? [] }, active: true },
        select: { key: true, title: true, price_pence: true },
      }),
      (prisma as any).externalRegulation.findMany({
        where: { expected_policy_titles: { hasSome: titleVariants(product.title) } },
        select: { reference_key: true, official_name: true, summary: true, required_elements: true, image_key: true },
        orderBy: { official_name: 'asc' },
      }).catch(() => [] as any[]),
    ])

    // Related policies: siblings from the same bundles (the natural next purchases),
    // Complete Library membership excluded since everything shares it.
    const meaningfulBundles = (product.bundle_keys ?? []).filter((k: string) => k !== 'complete-library')
    const related = meaningfulBundles.length
      ? await (prisma as any).policyProduct.findMany({
          where: { active: true, slug: { not: product.slug }, bundle_keys: { hasSome: meaningfulBundles } },
          select: { slug: true, title: true, description: true, price_pence: true, taster: true, image_key: true },
          orderBy: { sort_order: 'asc' },
          take: 6,
        }).catch(() => [] as any[])
      : []

    ok(res, {
      product: {
        slug: product.slug, title: product.title, description: product.description,
        price_pence: product.price_pence, taster: product.taster,
        image_url: shopImageUrl(product.image_key),
        // Labels and help only — the page shows WHAT we ask, never anyone's answers.
        intake_fields: ((product.intake_fields as any[]) ?? []).map(f => ({
          key: f.key, label: f.label, help: f.help ?? null, shared: f.shared === true,
        })),
      },
      bundles,
      regulations: (regs as any[]).map(r => ({
        reference_key: r.reference_key,
        official_name: r.official_name,
        summary: r.summary ?? '',
        image_url: shopImageUrl(r.image_key),
        required_elements_count: Array.isArray(r.required_elements) ? r.required_elements.length : 0,
        // The curated elements are the page's bullet-point key facts, rephrased for a
        // reader rather than for the writer.
        key_facts: (Array.isArray(r.required_elements) ? r.required_elements : []).slice(0, 6).map(humaniseElement),
      })),
      related: (related as any[]).map(r => ({
        slug: r.slug, title: r.title, description: r.description,
        price_pence: r.price_pence, taster: r.taster, image_url: shopImageUrl(r.image_key),
      })),
    })
  } catch (e: any) {
    err(res, 'PRODUCT_FAILED', e?.message ?? 'could not load that policy', 500)
  }
})


// Serves a stored shop illustration. The filename is a UUID written by our own
// uploader and the pattern is strict, so it cannot be used for path traversal.
// These are generic topic illustrations with no tenant data in them.
const IMAGE_CONTENT_TYPES: Record<string, string> = {
  png: 'image/png', jpg: 'image/jpeg', jpeg: 'image/jpeg', webp: 'image/webp', gif: 'image/gif',
}

policyShopPublicRouter.get('/image/:file', async (req: Request, res: Response) => {
  const file = String(req.params.file ?? '')
  if (!/^[a-f0-9-]+\.(png|jpe?g|webp|gif)$/i.test(file)) { res.status(400).end(); return }
  const ext = file.split('.').pop()!.toLowerCase()
  try {
    const buffer = await downloadFile(`shop/images/${file}`)
    res.setHeader('Content-Type', IMAGE_CONTENT_TYPES[ext] ?? 'application/octet-stream')
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable')
    // helmet sets CORP same-origin globally; the marketing site is another origin.
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin')
    res.send(buffer)
  } catch {
    res.status(404).end()
  }
})


// POST /checkout — start a hosted Stripe Checkout for a shop basket.
//
// Unauthenticated on purpose: the whole point of the standalone shop is buying without
// an account first. The account is provisioned on the way back, once Stripe confirms
// the money actually arrived.
//
// The body carries an email and a list of keys. It does NOT carry prices, and any it
// did carry would be ignored: every amount is resolved from the catalogue server-side.
policyShopPublicRouter.post('/checkout', async (req: Request, res: Response) => {
  const email = String(req.body?.email ?? '').trim().toLowerCase()
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return err(res, 'INVALID_EMAIL', 'A valid email address is required', 400)
  }

  const raw = Array.isArray(req.body?.items) ? req.body.items : []
  const items: ShopItem[] = []
  for (const entry of raw.slice(0, 30)) {
    const kind = entry?.kind === 'bundle' ? 'bundle' : 'policy'
    const key = String(entry?.key ?? '').trim()
    // Slugs and bundle keys are lowercase kebab in the catalogue; anything else is not
    // a key we issued.
    if (!/^[a-z0-9-]{2,80}$/.test(key)) {
      return err(res, 'INVALID_ITEM', 'That basket contains an item we do not recognise', 400)
    }
    items.push({ kind, key })
  }
  if (!items.length) return err(res, 'EMPTY_BASKET', 'There is nothing in the basket', 400)

  try {
    const { url, totalPence } = await createShopCheckoutSession({ email, items })
    ok(res, { url, total_pence: totalPence })
  } catch (e: any) {
    // Price lookup failures are the buyer's problem to see (a policy went inactive
    // while they browsed); everything else is ours.
    const msg = e?.message ?? 'could not start checkout'
    const known = /Unknown or unavailable item|Nothing to buy|below the minimum/.test(msg)
    err(res, known ? 'BASKET_INVALID' : 'CHECKOUT_FAILED', msg, known ? 400 : 500)
  }
})


/** Expand a basket into the policies actually bought, priced so the parts sum to the
 *  amount charged. A pack's price is apportioned across its contents rather than each
 *  policy carrying its full list price: otherwise 20 rows at list would claim £1,360
 *  against a £495 payment, and every revenue figure downstream would be wrong. */
async function expandBasket(items: ShopItem[]): Promise<Array<{
  slug: string; title: string; pence: number; reference_keys: string[]
}>> {
  const out: Array<{ slug: string; title: string; pence: number; reference_keys: string[] }> = []

  for (const item of items) {
    if (item.kind === 'policy') {
      const p = await (prisma as any).policyProduct.findUnique({
        where: { slug: item.key },
        select: { slug: true, title: true, price_pence: true, reference_keys: true },
      })
      if (p) out.push({ slug: p.slug, title: p.title, pence: p.price_pence, reference_keys: p.reference_keys ?? [] })
      continue
    }

    const bundle = await (prisma as any).policyBundle.findUnique({
      where: { key: item.key }, select: { price_pence: true },
    })
    const members = await (prisma as any).policyProduct.findMany({
      where:   { bundle_keys: { has: item.key }, active: true },
      select:  { slug: true, title: true, price_pence: true, reference_keys: true },
      orderBy: { sort_order: 'asc' },
    })
    if (!bundle || !members.length) continue

    // Integer apportionment: an even split, with the remainder pence given to the
    // first rows, so the total is exactly what Stripe took. No rounding leak.
    const base = Math.floor(bundle.price_pence / members.length)
    let remainder = bundle.price_pence - base * members.length
    for (const m of members as any[]) {
      const extra = remainder > 0 ? 1 : 0
      remainder -= extra
      out.push({ slug: m.slug, title: m.title, pence: base + extra, reference_keys: m.reference_keys ?? [] })
    }
  }

  // Buying a policy AND a pack containing it should create one order, not two — the
  // unique index on (stripe_payment_id, policy_title) would reject the second anyway.
  //
  // The prices are SUMMED rather than the larger one kept. They did pay twice, and
  // dropping a row would leave the recorded total short of the payment: standalone
  // Fire Safety plus the Health & Safety pack is £364 charged but would record
  // £341.31, and every revenue figure reading these rows would inherit the gap.
  const seen = new Map<string, typeof out[number]>()
  for (const row of out) {
    const prior = seen.get(row.slug)
    if (prior) prior.pence += row.pence
    else seen.set(row.slug, { ...row })
  }
  return [...seen.values()]
}

// POST /reconcile — called when the buyer returns from Stripe.
//
// Unauthenticated, because a shop buyer has no account until this runs. That is safe
// because the session id is only a lookup key: payment is verified with Stripe, and
// every fact recorded (what was bought, what it cost) is read from the catalogue, not
// from the caller.
//
// Idempotent on (stripe_payment_id, policy_title), so refreshing the thank-you page
// cannot double-order or send a second email.
policyShopPublicRouter.post('/reconcile', async (req: Request, res: Response) => {
  const sessionId = String(req.body?.session_id ?? '').trim()
  if (!sessionId) return err(res, 'INVALID_INPUT', 'session_id is required', 400)

  try {
    const result = await retrieveShopCheckoutSession(sessionId)
    if (!result) return err(res, 'NOT_FOUND', 'That checkout session was not found', 404)
    if (!result.paid) return err(res, 'NOT_PAID', 'That payment has not completed', 409)
    const email = (result.email ?? '').toLowerCase()
    if (!email) return err(res, 'NO_EMAIL', 'That payment carries no email address', 400)

    const lines = await expandBasket(result.items)
    if (!lines.length) return err(res, 'NOTHING_TO_DO', 'That payment had nothing we could fulfil', 400)

    // ── the account ──────────────────────────────────────────────────────────
    // An email that already bought joins the SAME account, so a second purchase next
    // month sits beside the first rather than starting a parallel one.
    let user = await (prisma as any).user.findUnique({
      where: { email }, select: { id: true, tenant_id: true, name: true },
    })
    let isNewAccount = false
    let tenantId = user?.tenant_id ?? ''

    if (!tenantId) {
      isNewAccount = true
      const orgName = 'Policy customer'
      const base = `policies-${crypto.randomBytes(4).toString('hex')}`
      const tenant = await (prisma as any).tenant.create({
        data: {
          name: orgName, slug: base, email_domain: base,
          tier: 'policies_only', subscription_status: 'active',
          branding_signoff: 'The CareStream Team',
        },
      })
      // Passwordless: the random hash satisfies the non-null column. They arrive via
      // the sign-in link in the confirmation email and can set a password after.
      const tempHash = await hashPassword(crypto.randomBytes(12).toString('base64url'))
      user = await (prisma as any).user.create({
        data: {
          tenant_id: tenant.id, email,
          // Stripe's billing name if we have it; the email prefix only as a last resort
          name: (result.name ?? '').trim() || email.split('@')[0],
          role: 'admin',
          email_verified: true, password_hash: tempHash,
        },
      })
      tenantId = tenant.id

      // A one-time link can be consumed by an email security scanner, so give them a
      // second way in that survives that.
      const setupToken = crypto.randomBytes(24).toString('base64url')
      await (prisma as any).user.update({
        where: { id: user.id },
        data: {
          password_reset_token: setupToken,
          password_reset_token_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
      }).catch(() => {})
      await sendPasswordSetupEmail(email, user.name, `${siteUrl()}/reset-password?token=${setupToken}`)
        .catch((e: any) => console.error('[policy-shop] password setup email failed:', e?.message ?? e))
    }

    // Save the Stripe customer the invoice was raised against. /billing lists invoices
    // for tenant.stripe_customer_id, so without this the buyer sees no invoice at all
    // for something they have just paid for. Only set when absent: never repoint a
    // tenant that already has one.
    if (result.customerId) {
      await (prisma as any).tenant.updateMany({
        where: { id: tenantId, stripe_customer_id: null },
        data:  { stripe_customer_id: result.customerId },
      }).catch(() => {})
    }

    // ── the orders ───────────────────────────────────────────────────────────
    const tenant = await (prisma as any).tenant.findUnique({
      where: { id: tenantId }, select: { name: true, account_number: true, organisation_details: true },
    })
    const od = (tenant?.organisation_details ?? {}) as Record<string, unknown>
    const created: string[] = []
    for (const line of lines) {
      try {
        const product = await (prisma as any).policyProduct.findUnique({
          where: { slug: line.slug }, select: { intake_fields: true },
        })
        const intake = intakeStateFor((product?.intake_fields as any) ?? null, od, {})
        await (prisma as any).policyPurchase.create({
          data: {
            tenant_id:           tenantId,
            policy_title:        line.title,
            reference_keys:      line.reference_keys,
            price_pence:         line.pence,
            currency:            'gbp',
            stripe_payment_id:   result.paymentId,
            status:              intake.complete ? 'paid' : 'awaiting_details',
            product_slug:        line.slug,
            intake_completed_at: intake.complete ? new Date() : null,
          },
        })
        created.push(line.title)
      } catch {
        // Unique on (stripe_payment_id, policy_title): already recorded. That is what a
        // refresh looks like, not a failure.
      }
    }

    // ── the emails, only for work actually created ───────────────────────────
    if (created.length && user) {
      const ttlMs = 14 * 24 * 60 * 60 * 1000
      const link = await createLoginLink(user.id, tenantId, ttlMs)
      await sendPolicyPurchaseConfirmation({
        to: email, name: user.name, titles: created,
        totalPence: result.amountTotalPence, link,
        expiresMins: ttlMs / 60000, isNewAccount,
      }).catch((e: any) => console.error('[policy-shop] confirmation email failed:', e?.message ?? e))

      sendPolicyPurchaseNotification({
        tenantName: tenant?.name ?? 'Policy customer',
        accountNumber: tenant?.account_number ?? null,
        titles: created,
        totalPence: result.amountTotalPence,
      }).catch((e: any) => console.error('[policy-shop] platform notify failed:', e?.message ?? e))
    }

    ok(res, { created: created.length, new_account: isNewAccount, email })
  } catch (e: any) {
    err(res, 'RECONCILE_FAILED', e?.message ?? 'could not confirm that purchase', 500)
  }
})
