import { prisma } from '../../db/client'
import { getStripe, managedPaymentsRequestOptions } from '../billing/stripe'
import { getOffers, type Offer } from '../offers'
import { sendBasketRecoveryEmail } from '../email/outbound'
import { priceBasket } from './basket-pricing'
import { reportEmailEvent } from '../analytics/funnel-insights'

// Basket recovery. The basket page and the buy page save the basket (with the buyer's email) the
// moment a valid email is typed, into public.shop_baskets: one open row per email and shop.
// A paid order closes it (reconcile, the Stripe webhook, or the check below). If it is still
// open an hour after the buyer last touched it, stage 1 goes; the next day, stage 2. Never more,
// never to an address that has opted out, and never if Stripe shows they paid since.
//
// Sending is off unless BASKET_RECOVERY_LIVE=1, and the pg_cron job (cs-basket-recovery) is only
// scheduled once Len has approved the emails.

const API_PUBLIC = () => (process.env.API_PUBLIC_URL || 'https://api.carestreamai.com').replace(/\/$/, '')
const optOutUrl = (token: string) => `${API_PUBLIC()}/public/shop/basket-optout?t=${encodeURIComponent(token)}`
type Funnel = 'training' | 'policies'

/** Product keys from stored basket items: training [{slug}], policies ["slug" | "bundle:key"]. */
const productsOf = (items: unknown): string[] =>
  (Array.isArray(items) ? items : []).map((i: any) => (typeof i === 'string' ? i : String(i?.slug ?? ''))).filter(Boolean)

export async function saveBasket(b: {
  email: string; name: string; org: string; funnel: Funnel; items: unknown; page: string
  attribution: unknown; checkout: boolean
}): Promise<void> {
  const rows = await (prisma as any).$queryRawUnsafe(
    `insert into public.shop_baskets (email, name, org, funnel, items, page, attribution, checkout_started_at)
     values ($1, nullif($2, ''), nullif($3, ''), $4, $5::jsonb, nullif($6, ''), $7::jsonb, case when $8 then now() end)
     on conflict (lower(email), funnel) where paid_at is null do update set
       email = excluded.email,
       name = coalesce(excluded.name, shop_baskets.name),
       org = coalesce(excluded.org, shop_baskets.org),
       items = excluded.items,
       page = coalesce(excluded.page, shop_baskets.page),
       attribution = coalesce(excluded.attribution, shop_baskets.attribution),
       checkout_started_at = coalesce(excluded.checkout_started_at, shop_baskets.checkout_started_at),
       updated_at = now()
     returning id, (xmax = 0) as inserted`,
    b.email, b.name, b.org, b.funnel, JSON.stringify(b.items ?? []), b.page,
    b.attribution ? JSON.stringify(b.attribution) : null, b.checkout) as any[]
  const row = rows?.[0]
  if (row?.inserted) await reportEmailEvent({ kind: 'basket_saved', ref: String(row.id), funnel: b.funnel, products: productsOf(b.items) })
}

/** Close the open basket for this buyer: they paid. If a recovery email had gone out, the order
 *  is reported to Funnel Insights as recovered. Never throws (it sits in the payment path). */
export async function markBasketPaid(email: string | null | undefined, funnel: Funnel,
                                     sale?: { products: string[]; valuePence: number }): Promise<void> {
  const e = String(email ?? '').trim().toLowerCase()
  if (!e) return
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `update public.shop_baskets set paid_at = now() where lower(email) = $1 and funnel = $2 and paid_at is null
       returning id, items, email1_at, email2_at`, e, funnel) as any[]
    for (const r of rows ?? []) {
      if (!r.email1_at) continue
      await reportEmailEvent({
        kind: 'recovered', ref: String(r.id), stage: r.email2_at ? 2 : 1, funnel,
        products: sale?.products?.length ? sale.products : productsOf(r.items), valuePence: sale?.valuePence ?? 0,
      })
    }
  } catch { /* never in the way of a payment */ }
}

export async function optOutByToken(token: string): Promise<boolean> {
  if (!/^[a-f0-9]{32}$/.test(token)) return false
  const rows = await (prisma as any).$queryRawUnsafe(`select email from public.shop_baskets where token = $1`, token) as any[]
  if (!rows.length) return false
  await (prisma as any).$executeRawUnsafe(
    `insert into public.shop_basket_optouts (email) values (lower($1)) on conflict do nothing`, rows[0].email)
  return true
}

/** Did this email pay for anything at Stripe since `since`? Throws if Stripe cannot say. */
async function paidAtStripeSince(email: string, since: Date): Promise<boolean> {
  const gte = Math.floor(since.getTime() / 1000) - 3600
  const list = await getStripe().checkout.sessions.list({ created: { gte }, limit: 100 }, managedPaymentsRequestOptions())
  const e = email.toLowerCase()
  return list.data.some(s => s.payment_status === 'paid'
    && String(s.customer_details?.email ?? s.customer_email ?? s.metadata?.email ?? '').toLowerCase() === e)
}

/** The offer to mention: live today, for this shop, and actually applied to something in it. */
function offerFor(offers: Offer[], funnel: Funnel, lines: { detail: string }[]) {
  const today = new Date().toISOString().slice(0, 10)
  const o = offers.find(x => (x.range === funnel || x.range === 'both') && x.starts_on <= today && x.ends_on >= today)
  if (!o || !lines.some(l => /offer/i.test(l.detail))) return null
  return { label: o.label ?? o.name, headline: o.headline ?? '', ends_on: o.ends_on }
}

const DUE = `
  select b.id, b.email, b.name, b.org, b.funnel, b.items, b.token, b.created_at,
         case when b.email1_at is null then 1 else 2 end as stage
  from public.shop_baskets b
  where b.paid_at is null and b.email2_at is null
    and b.updated_at < now() - interval '1 hour'
    and b.created_at > now() - interval '7 days'
    and (b.email1_at is null or b.email1_at < now() - interval '23 hours')
    and not exists (select 1 from public.shop_basket_optouts o where o.email = lower(b.email))
  order by b.updated_at
  limit 40`

export async function runBasketRecovery(): Promise<Record<string, unknown>> {
  if (process.env.BASKET_RECOVERY_LIVE !== '1') return { disabled: true }
  const due = await (prisma as any).$queryRawUnsafe(DUE) as any[]
  const out = { due: due.length, sent1: 0, sent2: 0, paid: 0, empty: 0, stripe_unknown: 0, errors: 0 }
  if (!due.length) return out
  const offers = await getOffers()
  for (const b of due) {
    const stamp = b.stage === 1 ? 'email1_at' : 'email2_at'
    try {
      let paid: boolean
      try { paid = await paidAtStripeSince(b.email, new Date(b.created_at)) } catch { out.stripe_unknown++; continue }
      if (paid) { await markBasketPaid(b.email, b.funnel); out.paid++; continue }
      const basket = await priceBasket(b.funnel, b.items, offers)
      if (!basket) {
        await (prisma as any).$executeRawUnsafe(`update public.shop_baskets set email1_at = coalesce(email1_at, now()), email2_at = now() where id = $1::uuid`, b.id)
        out.empty++; continue
      }
      await sendBasketRecoveryEmail({
        to: b.email, stage: b.stage, name: b.name ?? '', org: b.org ?? '', funnel: b.funnel,
        lines: basket.lines, totalPence: basket.totalPence, link: basket.link,
        offer: offerFor(offers, b.funnel, basket.lines), optOutUrl: optOutUrl(b.token),
      })
      await (prisma as any).$executeRawUnsafe(`update public.shop_baskets set ${stamp} = now() where id = $1::uuid`, b.id)
      if (b.stage === 1) out.sent1++; else out.sent2++
      await reportEmailEvent({ kind: 'recovery_sent', ref: String(b.id), stage: b.stage, funnel: b.funnel, products: productsOf(basket.items), valuePence: basket.totalPence })
    } catch (e) {
      out.errors++
      console.error('[basket-recovery]', b.id, (e as Error)?.message)
    }
  }
  return out
}

/** Every basket saved in the last 60 days and where it is in the sequence, for Funnel Insights ›
 *  Recovery (server to server, Bearer FI_INGEST_SECRET). Emails leave only in this response:
 *  Funnel Insights shows them and never stores them. */
export async function listRecoveryBaskets(): Promise<Record<string, unknown>> {
  const rows = await (prisma as any).$queryRawUnsafe(
    `select b.id, b.email, b.name, b.org, b.funnel, b.items, b.created_at, b.updated_at,
            b.email1_at, b.email2_at, b.paid_at, b.checkout_started_at,
            exists (select 1 from public.shop_basket_optouts o where o.email = lower(b.email)) as opted_out
     from public.shop_baskets b
     where b.created_at > now() - interval '60 days'
     order by b.created_at desc
     limit 500`) as any[]
  let cron: boolean | null = null
  try {
    const j = await (prisma as any).$queryRawUnsafe(`select active from cron.job where jobname = 'cs-basket-recovery'`) as any[]
    cron = j.length ? !!j[0].active : false
  } catch { cron = null }
  const offers = await getOffers()
  const now = Date.now()
  const H = 3600000
  const baskets = []
  for (const b of rows) {
    let lines: { title: string; detail: string; pence: number }[] = []
    let totalPence: number | null = null
    try {
      const priced = await priceBasket(b.funnel, b.items, offers)
      if (priced) { lines = priced.lines; totalPence = priced.totalPence }
    } catch { /* show the basket without a price */ }
    const created = new Date(b.created_at).getTime()
    const updated = new Date(b.updated_at).getTime()
    const e1 = b.email1_at ? new Date(b.email1_at).getTime() : null
    let position: string
    let state: 'in_progress' | 'finished' | 'recovered' | 'paid' | 'opted_out' | 'expired'
    let next_due: string | null = null
    if (b.paid_at) {
      state = e1 ? 'recovered' : 'paid'
      position = e1 ? 'Paid (recovered)' : 'Paid before any email'
    } else if (b.opted_out) {
      state = 'opted_out'; position = 'Opted out'
    } else if (b.email2_at) {
      state = 'finished'; position = 'Finished: both emails sent'
    } else if (e1) {
      const due = Math.max(e1 + 23 * H, updated + H)
      if (created + 7 * 24 * H < now && due > created + 7 * 24 * H) { state = 'expired'; position = 'Email 1 sent, email 2 not sent (past 7 days)' }
      else { state = 'in_progress'; next_due = new Date(due).toISOString(); position = 'Email 1 sent, email 2 due' }
    } else if (created + 7 * 24 * H < now) {
      state = 'expired'; position = 'Expired (older than 7 days, not emailed)'
    } else {
      state = 'in_progress'; next_due = new Date(updated + H).toISOString(); position = 'Waiting for email 1'
    }
    baskets.push({
      id: String(b.id), email: b.email, name: b.name ?? null, org: b.org ?? null, funnel: b.funnel,
      lines: lines.map(l => ({ title: l.title, detail: l.detail })), item_count: Array.isArray(b.items) ? b.items.length : 0,
      total_pence: totalPence, saved_at: b.created_at, last_updated: b.updated_at,
      checkout_started_at: b.checkout_started_at, email1_at: b.email1_at, email2_at: b.email2_at, paid_at: b.paid_at,
      opted_out: !!b.opted_out, state, position, next_due,
    })
  }
  return { sending_live: process.env.BASKET_RECOVERY_LIVE === '1', cron_scheduled: cron, baskets }
}

/** Both stages for both shops, with sample baskets, to the platform owner for approval. */
export async function sendBasketRecoveryPreview(to: string): Promise<Record<string, unknown>> {
  const offers = await getOffers()
  const samples: Array<{ funnel: Funnel; items: unknown }> = [
    { funnel: 'training', items: [{ slug: 'care-certificate', qty: 2 }] },
    { funnel: 'policies', items: ['safeguarding-adults', 'fire-safety'] },
  ]
  const sent: string[] = []
  for (const s of samples) {
    const basket = await priceBasket(s.funnel, s.items, offers)
    if (!basket) continue
    for (const stage of [1, 2] as const) {
      await sendBasketRecoveryEmail({
        to, stage, name: 'Sam Taylor', org: 'Oakhaven Care Home', funnel: s.funnel,
        lines: basket.lines, totalPence: basket.totalPence, link: basket.link,
        offer: offerFor(offers, s.funnel, basket.lines), optOutUrl: `${API_PUBLIC()}/public/shop/basket-optout?t=preview`,
        subjectPrefix: `[Preview ${s.funnel} ${stage === 1 ? '1 hour' : 'next day'}] `,
      })
      sent.push(`${s.funnel}-${stage}`)
    }
  }
  // Prove the "did they pay since" check works against the live Stripe account.
  let stripe = 'ok'
  try { await paidAtStripeSince('preview@example.com', new Date(Date.now() - 86400000)) } catch (e) { stripe = `failed: ${(e as Error)?.message}` }
  return { sent, stripe }
}
