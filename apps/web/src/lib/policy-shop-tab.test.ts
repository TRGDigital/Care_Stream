// Run with:  npx tsx apps/web/src/lib/policy-shop-tab.test.ts
import assert from 'node:assert/strict'
import { ownedFrom, ownership, filterProducts, type ShopProduct } from './policy-shop-tab'

const P = (slug: string, title: string, price_pence: number, description = ''): ShopProduct => ({ slug, title, price_pence, description })
const products = [P('safeguarding', 'Safeguarding Adults Policy', 7900, 'Protect people'), P('falls', 'Falls Prevention Policy', 4900), P('gdpr', 'Data Protection (GDPR) Policy', 5900), P('mca', 'Mental Capacity Act Policy', 6900)]

const owned = ownedFrom([
  { policy_title: 'Safeguarding Adults Policy', product_slug: 'safeguarding', status: 'approved' },
  { policy_title: 'Falls Prevention Policy', product_slug: 'falls', status: 'refunded' },        // refunded: can be bought again
  { policy_title: 'data protection gdpr policy', product_slug: null, status: 'paid' },            // old order, matched by title
])
assert.equal(ownership(products[0], owned, []), 'bought')
assert.equal(ownership(products[1], owned, []), null, 'refunded is not owned')
assert.equal(ownership(products[2], owned, []), 'bought', 'title match when there is no slug')
assert.equal(ownership(products[3], owned, ['Mental Capacity Act Policy']), 'library', 'already uploaded')
assert.equal(ownership(products[3], owned, ['Something else']), null)

const isOwned = (p: ShopProduct) => ownership(p, owned, []) !== null
assert.deepEqual(filterProducts(products, { query: '', sort: 'recommended', notOwnedOnly: false, isOwned }).map(p => p.slug), ['safeguarding', 'falls', 'gdpr', 'mca'])
assert.deepEqual(filterProducts(products, { query: '', sort: 'recommended', notOwnedOnly: true, isOwned }).map(p => p.slug), ['falls', 'mca'])
assert.deepEqual(filterProducts(products, { query: 'gdpr', sort: 'recommended', notOwnedOnly: false, isOwned }).map(p => p.slug), ['gdpr'])
assert.deepEqual(filterProducts(products, { query: 'protect people', sort: 'recommended', notOwnedOnly: false, isOwned }).map(p => p.slug), ['safeguarding'], 'searches the description too')
assert.deepEqual(filterProducts(products, { query: '', sort: 'price_asc', notOwnedOnly: false, isOwned }).map(p => p.slug), ['falls', 'gdpr', 'mca', 'safeguarding'])
assert.deepEqual(filterProducts(products, { query: '', sort: 'price_desc', notOwnedOnly: false, isOwned }).map(p => p.slug), ['safeguarding', 'mca', 'gdpr', 'falls'])
assert.deepEqual(filterProducts(products, { query: '', sort: 'title', notOwnedOnly: false, isOwned }).map(p => p.slug), ['gdpr', 'falls', 'mca', 'safeguarding'].sort((a, b) => products.find(p => p.slug === a)!.title.localeCompare(products.find(p => p.slug === b)!.title)))
assert.deepEqual(filterProducts(products, { query: 'zzz', sort: 'recommended', notOwnedOnly: false, isOwned }), [])
console.log('policy shop tab helpers: all passed')
