// Pure helpers for the "New policies" tab on /policies: which shop policies the account already
// has, and the search, sort and "not yet owned" filtering. Kept free of React so they can be
// tested on their own (policy-shop-tab.test.ts).

export interface ShopProduct { slug: string; title: string; price_pence: number; description: string; meta?: string; taster?: boolean; image_url?: string | null }
export interface ShopPurchase { policy_title: string; product_slug?: string | null; status: string }

const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').trim()

/** What the account already has from the shop: by product slug (and by title, for older orders
 *  with no slug), ignoring refunded orders because a refunded policy can be bought again. */
export function ownedFrom(purchases: ShopPurchase[]): { slugs: Set<string>; titles: Set<string> } {
  const slugs = new Set<string>(), titles = new Set<string>()
  for (const p of purchases) {
    if (p.status === 'refunded') continue
    if (p.product_slug) slugs.add(p.product_slug)
    titles.add(norm(p.policy_title))
  }
  return { slugs, titles }
}

/** 'bought' = ordered from the shop; 'library' = a policy with this name is already in the library
 *  (uploaded or delivered); null = neither. */
export function ownership(p: ShopProduct, owned: { slugs: Set<string>; titles: Set<string> }, libraryNames: string[]): 'bought' | 'library' | null {
  if (owned.slugs.has(p.slug) || owned.titles.has(norm(p.title))) return 'bought'
  const t = norm(p.title)
  return libraryNames.some(n => norm(n) === t) ? 'library' : null
}

export type ShopSort = 'recommended' | 'price_asc' | 'price_desc' | 'title'

export function filterProducts(
  products: ShopProduct[], opts: { query: string; sort: ShopSort; notOwnedOnly: boolean; isOwned: (p: ShopProduct) => boolean },
): ShopProduct[] {
  const q = norm(opts.query)
  let out = products.filter(p => (!q || norm(`${p.title} ${p.description}`).includes(q)) && (!opts.notOwnedOnly || !opts.isOwned(p)))
  if (opts.sort === 'price_asc') out = [...out].sort((a, b) => a.price_pence - b.price_pence || a.title.localeCompare(b.title))
  else if (opts.sort === 'price_desc') out = [...out].sort((a, b) => b.price_pence - a.price_pence || a.title.localeCompare(b.title))
  else if (opts.sort === 'title') out = [...out].sort((a, b) => a.title.localeCompare(b.title))
  return out
}

export const shopMoney = (pence: number) => `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`
