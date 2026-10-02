import { Router, Request, Response } from 'express'
import rateLimit from 'express-rate-limit'
import { prisma } from '../db/client'
import { siteUrl } from '../lib/urls'
import {
  TRAINING_LICENCE_PENCE, getStripe, managedPaymentsRequestOptions,
  createTrainingCheckoutSession, createShopCheckoutSession,
} from '../services/billing/stripe'
import { cleanAttribution } from '../services/analytics/funnel-insights'
import { getOffers, licenceDeal, policyDeal } from '../services/offers'
import { sendBasketShareEmail, sendInvoiceRequestEmail } from '../services/email/outbound'
import { priceBasket } from '../services/shop/basket-pricing'
import { saveBasket, optOutByToken } from '../services/shop/basket-recovery'
import { captureSignup, checkEmail, loadChecklist } from '../services/shop/email-capture'
import { checklistPdf } from '../services/shop/checklist-pdf'

// Shop extras that sit around the checkouts:
//   POST /public/shop/share-basket   email a basket to a manager for sign-off, with a link back
//   POST /public/shop/post-purchase  a one-time offer on the thank-you page, minutes after paying
export const shopExtrasRouter = Router()

const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const EMAIL = /^[^@\s]+@[^@\s]+\.[^@\s]+$/
const money = (p: number) => `£${(p / 100).toFixed(2)}`

// Sending an email to any address is a spam route if left open: a few a day per address is all
// a buyer needs.
const shareLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 6, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { error: 'Too many baskets sent from here. Please try again later.' },
})

shopExtrasRouter.post('/share-basket', shareLimiter, async (req: Request, res: Response) => {
  try {
    const funnel = req.body?.funnel === 'policies' ? 'policies' : 'training'
    const to = String(req.body?.to_email ?? '').trim().toLowerCase()
    const fromName = String(req.body?.from_name ?? '').trim().replace(/[<>]/g, '').slice(0, 80)
    const note = String(req.body?.note ?? '').trim().replace(/[<>]/g, '').slice(0, 500)
    if (!EMAIL.test(to)) { res.status(400).json({ error: 'Please enter a valid email address' }); return }
    if (!fromName) { res.status(400).json({ error: 'Please add your name so they know who sent it' }); return }
    const offers = await getOffers()
    const basket = await priceBasket(funnel, req.body?.items, offers)
    if (!basket) { res.status(400).json({ error: 'The basket is empty' }); return }
    const { lines, link } = basket
    const total = basket.totalPence
    const offer = offers.find(o => o.range === funnel || o.range === 'both')
    await sendBasketShareEmail({ to, fromName, note, funnel, lines, totalPence: total, link, offer: offer ? { label: offer.label ?? offer.name, headline: offer.headline ?? '', ends_on: offer.ends_on } : null })
    res.json({ data: { sent: true } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'could not send the basket' })
  }
})

// The post-purchase offer: for 30 minutes after a paid order, the buyer can add more at a better
// price without filling anything in again (email and organisation come from the order). One use:
// an order that was itself a post-purchase offer cannot start another.
const WINDOW_MS = 30 * 60 * 1000
export const POST_PURCHASE_PCT = { training: 30, policies: 30 } as const

shopExtrasRouter.post('/post-purchase', async (req: Request, res: Response) => {
  try {
    const funnel = req.body?.funnel === 'policies' ? 'policies' : 'training'
    const id = String(req.body?.session_id ?? '').trim()
    if (!/^cs_(live|test)_[A-Za-z0-9]+$/.test(id)) { res.status(400).json({ error: 'Unknown order' }); return }
    const s = await getStripe().checkout.sessions.retrieve(id, managedPaymentsRequestOptions())
    const md = (s.metadata ?? {}) as Record<string, string>
    if (s.payment_status !== 'paid') { res.status(409).json({ error: 'That order is not paid' }); return }
    if (Date.now() - s.created * 1000 > WINDOW_MS) { res.status(410).json({ error: 'This offer has expired' }); return }
    if (md.post_purchase === '1') { res.status(409).json({ error: 'This offer has already been used' }); return }
    const email = (s.customer_details?.email ?? s.customer_email ?? md.email ?? '').toLowerCase()
    const org = md.org_name || 'Your service'
    if (!EMAIL.test(email)) { res.status(400).json({ error: 'That order has no email' }); return }
    const attribution = cleanAttribution(req.body?.attribution)

    if (funnel === 'training') {
      if (!['training_licence', 'training_basket'].includes(md.kind)) { res.status(400).json({ error: 'Not a training order' }); return }
      let slug = md.module_slug || ''
      if (!slug && md.basket) { try { slug = String(JSON.parse(md.basket)?.[0]?.s ?? '') } catch { /* none */ } }
      const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { title: true } })
      const title = (topics as any[]).map(t => t.title as string).find(t => slugify(t) === slug)
      if (!title) { res.status(400).json({ error: 'Unknown course' }); return }
      const qty = Math.max(1, Math.min(500, Math.floor(Number(req.body?.quantity) || 1)))
      const url = await createTrainingCheckoutSession({ moduleSlug: slug, moduleName: title, quantity: qty, email, orgName: org, attribution, forcePct: POST_PURCHASE_PCT.training })
      res.json({ data: { url } }); return
    }
    if (md.kind !== 'policy_shop') { res.status(400).json({ error: 'Not a policy order' }); return }
    const slugs: string[] = (Array.isArray(req.body?.items) ? req.body.items : []).map((k: any) => String(k ?? '')).filter((k: string) => /^[a-z0-9-]{2,80}$/.test(k)).slice(0, 10)
    if (!slugs.length) { res.status(400).json({ error: 'Choose at least one policy' }); return }
    const { url } = await createShopCheckoutSession({ email, orgName: org, items: slugs.map(key => ({ kind: 'policy' as const, key })), attribution, forcePct: POST_PURCHASE_PCT.policies })
    res.json({ data: { url } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'could not start the offer' })
  }
})

// POST /public/shop/invoice-request: a buyer who cannot pay by card asks for an invoice from the
// basket or the buy page. Sends their details and basket to the platform owner to raise it.
shopExtrasRouter.post('/invoice-request', shareLimiter, async (req: Request, res: Response) => {
  try {
    const t = (v: unknown, n: number) => String(v ?? '').trim().replace(/[<>]/g, '').slice(0, n)
    const b = req.body ?? {}
    const f = {
      funnel: (b.funnel === 'policies' ? 'policies' : 'training') as 'training' | 'policies',
      org: t(b.org, 200), name: t(b.name, 120), email: t(b.email, 200).toLowerCase(), phone: t(b.phone, 40),
      address: t(b.address, 500), po: t(b.po, 80), note: t(b.note, 1000),
      items: (Array.isArray(b.items) ? b.items : []).slice(0, 40).map((i: unknown) => t(i, 200)).filter(Boolean),
    }
    if (!f.org || !f.name || !f.address) { res.status(400).json({ error: 'Please fill in your organisation, name and billing address' }); return }
    if (!EMAIL.test(f.email)) { res.status(400).json({ error: 'Please enter a valid email address' }); return }
    await sendInvoiceRequestEmail(f)
    res.json({ data: { sent: true } })
  } catch (e: any) {
    res.status(500).json({ error: e?.message ?? 'could not send the request' })
  }
})

// POST /public/shop/basket: the basket page and the buy page save the basket once a valid email
// is typed (and again at checkout), so a buyer who is interrupted can be sent a link back to it.
// Items are stored as sent and priced from the catalogue only when an email goes out.
const basketLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 60, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { error: 'Too many requests' },
})
shopExtrasRouter.post('/basket', basketLimiter, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {}
    const t = (v: unknown, n: number) => String(v ?? '').trim().replace(/[<>]/g, '').slice(0, n)
    const email = t(b.email, 160).toLowerCase()
    if (!EMAIL.test(email)) { res.status(400).json({ error: 'Please enter a valid email address' }); return }
    const funnel = b.funnel === 'policies' ? 'policies' : 'training'
    const items = funnel === 'training'
      ? (Array.isArray(b.items) ? b.items : []).slice(0, 25)
        .map((i: any) => ({ slug: t(i?.slug, 80), qty: Math.max(1, Math.min(500, Math.floor(Number(i?.qty) || 1))) }))
        .filter((i: any) => /^[a-z0-9-]{2,80}$/.test(i.slug))
      : (Array.isArray(b.items) ? b.items : []).slice(0, 30).map((k: any) => t(k, 90)).filter((k: string) => /^(bundle:)?[a-z0-9-]{2,80}$/.test(k))
    if (!items.length) { res.json({ data: { saved: false } }); return }
    await saveBasket({
      email, name: t(b.name, 80), org: t(b.org, 120), funnel, items, page: t(b.page, 200),
      attribution: cleanAttribution(b.attribution), checkout: b.checkout === true,
    })
    res.json({ data: { saved: true } })
  } catch (e: any) {
    res.status(500).json({ error: 'Could not save the basket' })
  }
})

// GET /public/shop/basket-optout?t=: the "Stop basket reminders" link in a recovery email.
shopExtrasRouter.get('/basket-optout', async (req: Request, res: Response) => {
  const done = await optOutByToken(String(req.query.t ?? '')).catch(() => false)
  const msg = done || req.query.t === 'preview'
    ? 'Done. You will not get any more basket reminders from CareStream.'
    : 'That link has expired, but you can reply to any CareStream email and we will stop them.'
  res.type('html').send(`<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><title>CareStream</title>
<body style="margin:0;font-family:system-ui,sans-serif;background:#F7F5FA;color:#1A1530;display:grid;place-items:center;min-height:100vh">
<div style="max-width:420px;margin:24px;padding:28px;background:#fff;border-radius:16px;text-align:center;box-shadow:0 8px 30px rgba(0,0,0,.06)">
<img src="https://www.carestreamai.com/logo-color.svg" alt="CareStream" style="height:34px;margin-bottom:14px">
<p style="font-size:16px;line-height:1.6;margin:0 0 16px">${msg}</p>
<a href="https://www.carestreamai.com" style="color:#7B3FBF;font-weight:600">Back to CareStream</a></div></body>`)
})

// POST /public/shop/capture: the second step of a product page overlay (Funnel Insights › Email
// capture). Checks the address, then sends the checklist or holds the offer, and adds the
// sign-up to the Funnel Insights list. An address that will not receive email is turned back
// with any suggested correction, so the visitor can fix a typo.
const captureLimiter = rateLimit({
  windowMs: 60 * 60 * 1000, max: 10, standardHeaders: true, legacyHeaders: false,
  keyGenerator: (req) => req.ip ?? 'unknown',
  message: { error: 'Too many sign-ups from here. Please try again later.' },
})
shopExtrasRouter.post('/capture', captureLimiter, async (req: Request, res: Response) => {
  try {
    const b = req.body ?? {}
    const t = (v: unknown, n: number) => String(v ?? '').trim().replace(/[<>]/g, '').slice(0, n)
    const email = t(b.email, 160).toLowerCase()
    const product = t(b.product, 90)
    if (!EMAIL.test(email)) { res.status(400).json({ error: 'Please enter a valid email address' }); return }
    if (!/^[a-z0-9-]{2,90}$/.test(product)) { res.status(400).json({ error: 'Unknown product' }); return }
    const check = await checkEmail(email)
    if (check.status === 'undeliverable') {
      res.status(400).json({ error: check.suggestion ? `That address does not look right. Did you mean ${check.suggestion}?` : 'That address cannot receive email. Please check it.', suggestion: check.suggestion ?? null })
      return
    }
    const result = await captureSignup({
      email, name: t(b.name, 80), funnel: b.funnel === 'policies' ? 'policies' : 'training', product,
      kind: b.kind === 'lockin' ? 'lockin' : 'checklist', campaign_id: t(b.campaign_id, 40), variant: t(b.variant, 2),
      consent_text: t(b.consent_text, 400), page: t(b.page, 200), attribution: cleanAttribution(b.attribution), emailStatus: check.status,
    })
    res.json({ data: result })
  } catch (e: any) {
    res.status(e?.message === 'Unknown product' ? 400 : 500).json({ error: e?.message === 'Unknown product' ? 'Unknown product' : 'Sorry, that did not go through. Please try again.' })
  }
})

// GET /public/shop/checklist-pdf?funnel=&product=: the checklist PDF exactly as the overlay sends
// it, for Funnel Insights › Email capture to open. Server to server only (Bearer FI_INGEST_SECRET),
// so the checklists never become a public download that skips the sign-up.
shopExtrasRouter.get('/checklist-pdf', async (req: Request, res: Response) => {
  const want = process.env.FI_INGEST_SECRET || ''
  const got = String(req.headers.authorization ?? '').replace(/^Bearer\s+/i, '')
  if (!want || got !== want) { res.status(401).json({ error: 'unauthorised' }); return }
  const funnel = req.query.funnel === 'policies' ? 'policies' : 'training'
  const product = String(req.query.product ?? '')
  if (!/^[a-z0-9-]{2,90}$/.test(product)) { res.status(400).json({ error: 'Unknown product' }); return }
  try {
    const data = await loadChecklist(funnel, product)
    if (!data) { res.status(404).json({ error: 'Unknown product' }); return }
    const pdf = await checklistPdf(data)
    res.setHeader('Content-Type', 'application/pdf')
    res.setHeader('Content-Disposition', `inline; filename="${product}-checklist.pdf"`)
    res.send(pdf)
  } catch {
    res.status(500).json({ error: 'Could not build the checklist' })
  }
})
