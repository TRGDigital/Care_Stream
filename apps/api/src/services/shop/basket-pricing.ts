import { prisma } from '../../db/client'
import { siteUrl } from '../../lib/urls'
import { TRAINING_LICENCE_PENCE } from '../billing/stripe'
import { licenceDeal, policyDeal, type Offer } from '../offers'

// A basket as the browser holds it, priced from the catalogue and the live offers (never from
// the caller), with the link that rebuilds it on the site. Shared by the send-to-manager email
// and the basket recovery emails, so both quote the same prices.

export type BasketLine = { title: string; detail: string; pence: number }
export type PricedBasket = {
  funnel: 'training' | 'policies'
  /** The cleaned items: training [{slug, qty}], policies ["slug" | "bundle:key"]. */
  items: Array<{ slug: string; qty: number }> | string[]
  lines: BasketLine[]
  totalPence: number
  link: string
}

const slugify = (s: string): string =>
  s.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
const money = (p: number) => `£${(p / 100).toFixed(2)}`

/** Null when nothing in the basket is a real product. */
export async function priceBasket(funnel: 'training' | 'policies', raw: unknown, offers: Offer[]): Promise<PricedBasket | null> {
  const base = siteUrl().replace(/\/$/, '')
  const list = Array.isArray(raw) ? raw : []

  if (funnel === 'training') {
    const topics = await (prisma as any).trainingTopic.findMany({ where: { tenant_id: null, is_active: true }, select: { title: true } })
    const bySlug = new Map((topics as any[]).map(t => [slugify(t.title), t.title] as const))
    const items = list.slice(0, 25)
      .map((i: any) => ({ slug: String(i?.slug ?? ''), qty: Math.max(1, Math.min(500, Math.floor(Number(i?.qty) || 1))) }))
      .filter(i => bySlug.has(i.slug))
    if (!items.length) return null
    const lines = items.map(i => {
      const d = licenceDeal(offers, i.slug, i.qty)
      const unit = d.pct ? Math.round(TRAINING_LICENCE_PENCE * (1 - d.pct / 100)) : TRAINING_LICENCE_PENCE
      return {
        title: bySlug.get(i.slug)!,
        detail: `${i.qty + d.free} ${i.qty + d.free === 1 ? 'licence' : 'licences'}${d.free ? ` (${i.qty} paid + ${d.free} free with the ${d.offer?.label ?? 'offer'})` : ''}`,
        pence: unit * i.qty,
      }
    })
    return {
      funnel, items, lines, totalPence: lines.reduce((t, l) => t + l.pence, 0),
      link: `${base}/basket?items=${encodeURIComponent(items.map(i => `${i.slug}:${i.qty}`).join(','))}`,
    }
  }

  const keys: string[] = list.slice(0, 30).map((k: any) => String(k ?? '')).filter((k: string) => /^(bundle:)?[a-z0-9-]{2,80}$/.test(k))
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
  if (!rows.length) return null
  const deal = policyDeal(offers, rows)
  const lines = rows.map((r, n) => ({
    title: r.title,
    detail: deal.free.has(n) ? `Free with the ${deal.offer?.label ?? 'offer'}` : deal.pence[n] < r.pence ? `${money(r.pence)} before the offer` : 'Written for your service',
    pence: deal.pence[n],
  }))
  const items = rows.map(r => (r.kind === 'bundle' ? `bundle:${r.key}` : r.key))
  return {
    funnel, items, lines, totalPence: lines.reduce((t, l) => t + l.pence, 0),
    link: `${base}/care-policies/checkout?items=${encodeURIComponent(items.join(','))}`,
  }
}
