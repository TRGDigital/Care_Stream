import { prisma } from '../../db/client'
import { siteUrl } from '../../lib/urls'
import type { Offer } from './offer-rules'
import { sendOfferChangeEmail } from '../email/outbound'

export * from './offer-rules'

// The offers CareStream runs, from the site_offers table. The table is filled from the Funnel
// Insights offer calendar (syncOffersFromCalendar, hourly), so the calendar is the one place
// offers are planned and edited; checkout only ever reads this table.

const ROW = `key, name, range, products, kind, params, label, headline, multi_text,
  to_char(starts_on, 'YYYY-MM-DD') as starts_on, to_char(ends_on, 'YYYY-MM-DD') as ends_on,
  starts_at, ends_at, notified_start_at, notified_end_at`

const toOffer = (r: any): Offer => ({
  key: r.key, name: r.name, range: r.range, products: r.products ?? [], kind: r.kind, params: r.params ?? {},
  label: r.label, headline: r.headline, multi_text: r.multi_text, starts_on: r.starts_on, ends_on: r.ends_on,
  starts_at: new Date(r.starts_at).toISOString(), ends_at: new Date(r.ends_at).toISOString(),
})

let cache: { at: number; offers: Offer[] } | null = null

/** Offers running now or within the next 2 days (so a page cached across midnight has the next one). */
export async function getOffers(): Promise<Offer[]> {
  if (cache && Date.now() - cache.at < 60_000) return cache.offers
  try {
    const rows = await (prisma as any).$queryRawUnsafe(
      `select ${ROW} from public.site_offers where ends_at > now() and starts_at < now() + interval '2 days' order by starts_at, key`)
    cache = { at: Date.now(), offers: (rows as any[]).map(toOffer) }
  } catch (e: any) {
    // No offers is a safe failure: full price, nothing free. Keep any last good copy.
    console.error('[offers] load failed:', e?.message ?? e)
    if (!cache) return []
  }
  return cache!.offers
}

// ─── Sync from the Funnel Insights offer calendar ─────────────────────────────

const CALENDAR_URL = process.env.FI_OFFERS_URL || 'https://trg-funnel-insights.vercel.app/api/offers?site=carestream'
const KINDS = ['free_units', 'percent_off', 'amount_off', 'group_free', 'gift', 'pack_bonus']
const RANGES = ['training', 'policies', 'both']
const DAY = /^\d{4}-\d{2}-\d{2}$/

export async function syncOffersFromCalendar(): Promise<{ synced: number; removed: number }> {
  const secret = process.env.FI_INGEST_SECRET
  if (!secret) throw new Error('FI_INGEST_SECRET is not set')
  const res = await fetch(CALENDAR_URL, { headers: { Authorization: `Bearer ${secret}` }, signal: AbortSignal.timeout(10_000) })
  if (!res.ok) throw new Error(`offer calendar returned ${res.status}`)
  const body = await res.json() as { offers?: any[] }
  const offers = (body.offers ?? []).filter(o =>
    o && typeof o.key === 'string' && KINDS.includes(o.kind) && RANGES.includes(o.range)
    && DAY.test(o.starts_on) && DAY.test(o.ends_on) && o.ends_on >= o.starts_on)

  for (const o of offers) {
    await (prisma as any).$executeRawUnsafe(
      `insert into public.site_offers (key, name, range, products, kind, params, label, headline, reason, multi_text, starts_on, ends_on, synced_at)
       values ($1, $2, $3, $4::text[], $5, $6::jsonb, $7, $8, $9, $10, $11::date, $12::date, now())
       on conflict (key) do update set name = excluded.name, range = excluded.range, products = excluded.products,
         kind = excluded.kind, params = excluded.params, label = excluded.label, headline = excluded.headline,
         reason = excluded.reason, multi_text = excluded.multi_text, starts_on = excluded.starts_on,
         ends_on = excluded.ends_on, synced_at = now()`,
      o.key, String(o.name ?? o.key), o.range, (o.products ?? []).map(String), o.kind, JSON.stringify(o.params ?? {}),
      o.label ?? null, o.headline ?? null, o.reason ?? null, o.multi_text ?? null, o.starts_on, o.ends_on)
  }
  // An offer deleted from the calendar stops running. Only when the calendar answered with a
  // list, so an empty or failed answer never wipes every offer.
  let removed = 0
  if (offers.length) {
    removed = await (prisma as any).$executeRawUnsafe(
      `delete from public.site_offers where not (key = any($1::text[]))`, offers.map(o => o.key))
  }
  cache = null
  return { synced: offers.length, removed: Number(removed) || 0 }
}

// ─── Which pages an offer changes ─────────────────────────────────────────────

export async function offerPages(o: Offer): Promise<{ label: string; url: string }[]> {
  const base = siteUrl().replace(/\/$/, '')
  const out: { label: string; url: string }[] = []
  const policies = await (prisma as any).policyProduct.findMany({ where: { active: true }, select: { slug: true, title: true }, orderBy: { title: 'asc' } })
  const titleOf = new Map<string, string>((policies as any[]).map(p => [p.slug, p.title]))
  const p = o.products ?? []

  if (o.range !== 'policies') {
    for (const slug of p.filter(s => s !== 'all-policies' && s !== 'all-packs' && !s.startsWith('bundle:') && !titleOf.has(s))) {
      out.push({ label: `Course page: ${slug}`, url: `${base}/staff-training/${slug}` })
      out.push({ label: `Buy page: ${slug}`, url: `${base}/buy/${slug}` })
    }
    if (out.length) out.push({ label: 'Training basket', url: `${base}/basket` })
  }
  if (o.range !== 'training') {
    const named = new Set<string>(p.filter(s => titleOf.has(s)))
    if (o.kind === 'gift') {
      for (const s of (o.params.requires ?? [])) named.add(s)
      if (o.params.gift) named.add(o.params.gift)
    }
    const all = p.includes('all-policies') || (o.kind === 'gift' && !(o.params.requires ?? []).length)
    const list = all ? (policies as any[]).map(x => x.slug) : [...named]
    for (const s of list) out.push({ label: titleOf.get(s) ?? s, url: `${base}/care-policies/${s}` })
    if (p.includes('all-packs') || p.some(s => s.startsWith('bundle:')) || o.kind === 'pack_bonus') {
      out.push({ label: 'Policy packs (policies page)', url: `${base}/care-policies` })
    }
    out.push({ label: 'Policy basket', url: `${base}/care-policies/checkout` })
  }
  return out
}

// ─── Hourly: sync, then tell Len what started and what ended ──────────────────

export async function runOfferChanges(): Promise<Record<string, unknown>> {
  const sync = await syncOffersFromCalendar().catch((e: any) => ({ error: e?.message ?? String(e) }))
  const rows = await (prisma as any).$queryRawUnsafe(`select ${ROW} from public.site_offers order by starts_at, key`) as any[]
  const now = Date.now()
  const started = rows.filter(r => !r.notified_start_at && Date.parse(r.starts_at) <= now && now < Date.parse(r.ends_at))
  // Ended: only offers we announced (or that ended within the last 2 days), so a first sync
  // never reports a year of history.
  const ended = rows.filter(r => !r.notified_end_at && Date.parse(r.ends_at) <= now
    && (r.notified_start_at || now - Date.parse(r.ends_at) < 2 * 86400_000))
  const upcoming = rows.filter(r => Date.parse(r.starts_at) > now).slice(0, 4).map(toOffer)

  if (started.length || ended.length) {
    const withPages = async (r: any) => ({ offer: toOffer(r), pages: await offerPages(toOffer(r)) })
    await sendOfferChangeEmail({
      started: await Promise.all(started.map(withPages)),
      ended: await Promise.all(ended.map(withPages)),
      upcoming,
    })
    if (started.length) await (prisma as any).$executeRawUnsafe(`update public.site_offers set notified_start_at = now() where key = any($1::text[])`, started.map(r => r.key))
    if (ended.length) await (prisma as any).$executeRawUnsafe(`update public.site_offers set notified_end_at = now() where key = any($1::text[])`, ended.map(r => r.key))
  }
  return { sync, started: started.map(r => r.key), ended: ended.map(r => r.key) }
}
