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
    const base = siteUrl().replace(/\/$/, '')

    let lines: { title: string; detail: string; pence: number }[] = []
    let link = ''
    if (funnel === 'training') {
      const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { title: true } })
      const bySlug = new Map((topics as any[]).map(t => [slugify(t.title), t.title] as const))
      const items = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 25)
        .map((i: any) => ({ slug: String(i?.slug ?? ''), qty: Math.max(1, Math.min(500, Math.floor(Number(i?.qty) || 1))) }))
        .filter((i: any) => bySlug.has(i.slug))
      if (!items.length) { res.status(400).json({ error: 'The basket is empty' }); return }
      lines = items.map((i: any) => {
        const d = licenceDeal(offers, i.slug, i.qty)
        const unit = d.pct ? Math.round(TRAINING_LICENCE_PENCE * (1 - d.pct / 100)) : TRAINING_LICENCE_PENCE
        return {
          title: bySlug.get(i.slug)!,
          detail: `${i.qty + d.free} ${i.qty + d.free === 1 ? 'licence' : 'licences'}${d.free ? ` (${i.qty} paid + ${d.free} free with the ${d.offer?.label ?? 'offer'})` : ''}`,
          pence: unit * i.qty,
        }
      })
      link = `${base}/basket?items=${encodeURIComponent(items.map((i: any) => `${i.slug}:${i.qty}`).join(','))}`
    } else {
      const keys: string[] = (Array.isArray(req.body?.items) ? req.body.items : []).slice(0, 30).map((k: any) => String(k ?? '')).filter((k: string) => /^(bundle:)?[a-z0-9-]{2,80}$/.test(k))
      const slugs = keys.filter(k => !k.startsWith('bundle:'))
      const packs = keys.filter(k => k.startsWith('bundle:')).map(k => k.slice(7))
      const [products, bundles] = await Promise.all([
        (prisma as any).policyProduct.findMany({ where: { slug: { in: slugs }, active: true }, select: { slug: true, title: true, price_pence: true } }),
        (prisma as any).policyBundle.findMany({ where: { key: { in: packs }, active: true }, select: { key: true, title: true, price_pence: true } }),
      ])
      const rows = [
        ...(products as any[]).map(p => ({ kind: 'policy' as const, key: p.slug, title: p.title, pence: p.price_pence })),
        ...(bundles as any[]).map(b => ({ kind: 'bundle' as const, key: b.key, title: b.title, pence: b.price_pence })),
      ]
      if (!rows.length) { res.status(400).json({ error: 'The basket is empty' }); return }
      const deal = policyDeal(offers, rows)
      lines = rows.map((r, n) => ({
        title: r.title,
        detail: deal.free.has(n) ? `Free with the ${deal.offer?.label ?? 'offer'}` : deal.pence[n] < r.pence ? `${money(r.pence)} before the offer` : 'Written for your service',
        pence: deal.pence[n],
      }))
      link = `${base}/care-policies/checkout?items=${encodeURIComponent(rows.map(r => (r.kind === 'bundle' ? `bundle:${r.key}` : r.key)).join(','))}`
    }
    const total = lines.reduce((t, l) => t + l.pence, 0)
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
