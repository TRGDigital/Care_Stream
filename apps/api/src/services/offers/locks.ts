import { prisma } from '../../db/client'
import { getOffers } from './index'
import { isLive, type Offer } from './offer-rules'

// Offers held for a buyer on a personal link (email capture's lock-in): public.shop_offer_locks.

/** The live offers, plus a locked one held on a personal link (still valid, and no longer
 *  running on its own). Used by checkout and by the site's display of offers. */
export async function offersWithLock(token: unknown): Promise<Offer[]> {
  const offers = await getOffers()
  const t = String(token ?? '')
  if (!/^[a-f0-9]{32}$/.test(t)) return offers
  const lock = await lockOffer(t)
  if (!lock || offers.some(o => o.key === lock.key && isLive(o))) return offers
  return [...offers, lock]
}

/** The locked offer, re-dated to run from now until the lock expires. */
export async function lockOffer(token: string): Promise<Offer | null> {
  const rows = await (prisma as any).$queryRawUnsafe(
    `select offer, expires_at from public.shop_offer_locks where token = $1 and expires_at > now()`, token) as any[]
  if (!rows.length) return null
  const o = rows[0].offer as Offer
  const ends = new Date(rows[0].expires_at)
  return { ...o, starts_at: new Date(Date.now() - 60_000).toISOString(), ends_at: ends.toISOString(), ends_on: ends.toISOString().slice(0, 10) }
}

