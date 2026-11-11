'use client'

// "New policies": every policy CareStream sells, inside /policies, for every account type.
//
// The catalogue is the public policy shop (GET /public/policy-shop/catalogue) and Buy goes into the
// shop's existing checkout (POST /public/policy-shop/checkout) with the account's own email, so the
// purchase joins this tenant and is written, checked and delivered into the library by the same
// process as any shop order. No second checkout. A policy bought here does NOT use one of a free
// account's 5 places: those count files the home uploads itself.

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Loader2, Search, ShoppingCart, CheckCircle2, Library, RefreshCw } from 'lucide-react'
import { createApiClient, type PolicyPurchase } from '@/lib/api-client'
import { ownedFrom, ownership, filterProducts, shopMoney, type ShopProduct, type ShopSort } from '@/lib/policy-shop-tab'

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000'
const TIMEOUT_MS = 15_000

interface Bundle { key: string; title: string; description: string; price_pence: number }

function withTimeout<T>(p: Promise<T>): Promise<T> {
  return Promise.race([p, new Promise<never>((_, rej) => setTimeout(() => rej(new Error('This is taking too long.')), TIMEOUT_MS))])
}

export function NewPoliciesTab({ token, email, orgName, name, libraryNames, isFree }: {
  token: string; email: string; orgName?: string; name?: string; libraryNames: string[]; isFree: boolean
}) {
  const [products, setProducts] = useState<ShopProduct[] | null>(null)
  const [bundles, setBundles] = useState<Bundle[]>([])
  const [purchases, setPurchases] = useState<PolicyPurchase[]>([])
  const [error, setError] = useState('')
  const [query, setQuery] = useState('')
  const [sort, setSort] = useState<ShopSort>('recommended')
  const [notOwnedOnly, setNotOwnedOnly] = useState(false)
  const [buying, setBuying] = useState<string | null>(null)
  const [buyError, setBuyError] = useState('')

  const load = useCallback(() => {
    setError(''); setProducts(null)
    const cat = withTimeout(fetch(`${API_URL}/public/policy-shop/catalogue`).then(r => r.json()))
      .then((b: any) => {
        if (!b?.success) throw new Error(b?.error?.message ?? 'The catalogue is not available.')
        setProducts(b.data.products ?? []); setBundles(b.data.bundles ?? [])
      })
    // Orders are only used to mark what is already owned; if they cannot be read the list still shows.
    const own = withTimeout(createApiClient(token).policyPurchases.list()).then(r => setPurchases(r.purchases)).catch(() => {})
    return Promise.all([cat, own]).catch((e: Error) => { setProducts([]); setError(e.message || 'We could not load the policies.') })
  }, [token])

  useEffect(() => { load() }, [load])

  const owned = useMemo(() => ownedFrom(purchases), [purchases])
  const isOwned = useCallback((p: ShopProduct) => ownership(p, owned, libraryNames) !== null, [owned, libraryNames])
  const shown = useMemo(() => filterProducts(products ?? [], { query, sort, notOwnedOnly, isOwned }), [products, query, sort, notOwnedOnly, isOwned])

  async function buy(item: { kind: 'policy' | 'bundle'; key: string }) {
    setBuying(`${item.kind}:${item.key}`); setBuyError('')
    try {
      const res = await withTimeout(fetch(`${API_URL}/public/policy-shop/checkout`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, items: [item], org_name: orgName, name }),
      }).then(r => r.json()))
      if (!res?.success || !res.data?.url) throw new Error(res?.error?.message ?? 'Could not start checkout.')
      window.location.href = res.data.url
    } catch (e: any) { setBuyError(e?.message ?? 'Could not start checkout.'); setBuying(null) }
  }

  if (products === null) {
    return <div className="flex items-center gap-2 py-10 text-sm text-neutral-mid"><Loader2 size={14} className="animate-spin" /> Loading the policy shop…</div>
  }
  if (error) {
    return (
      <div className="flex flex-wrap items-center gap-3 rounded-md border border-red-100 bg-red-50 px-4 py-3 text-sm text-red-700">
        <span className="min-w-0 flex-1">We could not load the policies. {error}</span>
        <button onClick={() => load()} className="inline-flex items-center gap-1 rounded-md border border-red-200 bg-white px-3 py-1 text-xs font-semibold text-red-700 hover:bg-red-100"><RefreshCw size={12} /> Try again</button>
      </div>
    )
  }

  return (
    <div>
      <p className="mb-4 max-w-3xl text-sm text-neutral-mid">
        Policies written for your service from the current legislation, checked by a person and added to your library. {isFree && <>They do not use your {5} free places. </>}After you pay, we ask for the few details each policy needs.
      </p>

      <div className="mb-4 flex flex-wrap items-center gap-3">
        <div className="relative w-full max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-mid" />
          <input value={query} onChange={e => setQuery(e.target.value)} placeholder="Search policies"
            className="w-full rounded-lg border border-gray-200 py-2 pl-9 pr-3 text-sm focus:border-teal focus:outline-none" />
        </div>
        <select value={sort} onChange={e => setSort(e.target.value as ShopSort)} className="rounded-lg border border-gray-200 px-3 py-2 text-sm">
          <option value="recommended">Recommended order</option>
          <option value="price_asc">Price, low to high</option>
          <option value="price_desc">Price, high to low</option>
          <option value="title">A to Z</option>
        </select>
        <label className="flex items-center gap-2 text-sm text-neutral-dark">
          <input type="checkbox" checked={notOwnedOnly} onChange={e => setNotOwnedOnly(e.target.checked)} /> Not yet owned
        </label>
        <span className="text-xs text-neutral-mid">{shown.length} of {products.length}</span>
      </div>

      {buyError && <p className="mb-3 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs text-red-700">{buyError}</p>}

      {bundles.length > 0 && !query && (
        <div className="mb-6">
          <h2 className="mb-2 text-sm font-semibold text-neutral-dark">Packs</h2>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {bundles.map(b => (
              <div key={b.key} className="flex flex-col rounded-card border border-teal/20 bg-teal-light/10 p-4">
                <p className="text-sm font-bold text-neutral-dark">{b.title}</p>
                <p className="mt-1 flex-1 text-xs text-neutral-mid">{b.description}</p>
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-extrabold text-neutral-dark">{shopMoney(b.price_pence)}</span>
                  <BuyButton busy={buying === `bundle:${b.key}`} disabled={!!buying} onClick={() => buy({ kind: 'bundle', key: b.key })} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {shown.length === 0 ? (
        <p className="rounded-card bg-white px-6 py-8 text-center text-sm text-neutral-mid shadow-card">
          {products.length === 0 ? 'No policies are for sale just now.' : 'No policies match that. Clear the search or the "Not yet owned" filter.'}
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {shown.map(p => {
            const own = ownership(p, owned, libraryNames)
            return (
              <div key={p.slug} className="flex flex-col rounded-card bg-white p-4 shadow-card">
                <div className="flex items-start justify-between gap-2">
                  <p className="text-sm font-bold text-neutral-dark">{p.title}</p>
                  {own === 'bought' && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-[10px] font-semibold text-green-700"><CheckCircle2 size={10} /> Owned</span>}
                  {own === 'library' && <span className="inline-flex shrink-0 items-center gap-1 rounded-full bg-gray-100 px-2 py-0.5 text-[10px] font-semibold text-neutral-mid"><Library size={10} /> In your library</span>}
                </div>
                {p.description && <p className="mt-1 line-clamp-3 flex-1 text-xs text-neutral-mid">{p.description}</p>}
                {p.meta && <p className="mt-1 text-[11px] text-neutral-mid">{p.meta}</p>}
                <div className="mt-3 flex items-center justify-between">
                  <span className="text-base font-extrabold text-neutral-dark">{shopMoney(p.price_pence)}</span>
                  {own === 'bought'
                    ? <a href="#orders" onClick={e => { e.preventDefault(); window.scrollTo({ top: 0, behavior: 'smooth' }) }} className="text-xs font-semibold text-teal hover:underline">See your orders</a>
                    : <BuyButton busy={buying === `policy:${p.slug}`} disabled={!!buying} label={own === 'library' ? 'Buy a written version' : 'Buy'} onClick={() => buy({ kind: 'policy', key: p.slug })} />}
                </div>
              </div>
            )
          })}
        </div>
      )}
      <p className="mt-4 text-xs text-neutral-mid">Categories and care setting filters are coming. Prices include everything; VAT is handled at checkout.</p>
    </div>
  )
}

function BuyButton({ busy, disabled, onClick, label = 'Buy' }: { busy: boolean; disabled: boolean; onClick: () => void; label?: string }) {
  return (
    <button onClick={onClick} disabled={disabled}
      className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-60">
      {busy ? <Loader2 size={12} className="animate-spin" /> : <ShoppingCart size={12} />} {busy ? 'Opening checkout…' : label}
    </button>
  )
}
