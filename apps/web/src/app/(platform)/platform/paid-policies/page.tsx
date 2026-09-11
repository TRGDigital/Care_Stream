'use client'

// Paid Policies — the standalone policy shop's console.
//
// Two halves. The ORDER QUEUE at the top is shop customers only (policies_only
// accounts, no full CareStream licence); full clients' purchases live on Policy
// Gaps, next to the analysis that prompted them. Below it, the CATALOGUE: every
// policy we sell, its price, which bundle it belongs to, and the buyer details
// each policy needs before writing can start, so Len can track intake per order.

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient, type PolicyProduct, type PolicyProductBundle } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { PolicyOrders } from '@/components/platform/policy-orders'
import { Loader2, RefreshCw, Package, Tag, ClipboardList } from 'lucide-react'

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`

function ProductRow({ p }: { p: PolicyProduct }) {
  const [open, setOpen] = useState(false)
  const specific = p.intake_fields.filter(f => !f.shared)
  const shared = p.intake_fields.filter(f => f.shared)
  return (
    <li className="px-5 py-3">
      <div className="flex flex-wrap items-center gap-3">
        <button onClick={() => setOpen(v => !v)} className="min-w-0 flex-1 text-left">
          <span className="block text-sm font-medium text-neutral-dark">{p.title}</span>
          <span className="block truncate text-xs text-neutral-mid">{p.description}</span>
        </button>
        {p.taster && <span className="shrink-0 rounded-full bg-purple-50 px-2 py-0.5 text-[11px] font-semibold text-purple-700">Taster</span>}
        <span className="shrink-0 rounded-full bg-gray-100 px-2 py-0.5 text-[11px] text-neutral-mid">
          {specific.length === 0 ? 'Standard details only' : `${specific.length} extra detail${specific.length === 1 ? '' : 's'}`}
        </span>
        <span className="shrink-0 text-sm font-bold text-neutral-dark">{money(p.price_pence)}</span>
      </div>
      {open && (
        <div className="mt-2 rounded-lg bg-gray-50 px-4 py-3 text-xs">
          <p className="mb-1 font-semibold text-neutral-dark">Details required from the buyer before writing starts</p>
          <p className="mb-1 text-neutral-mid">Asked once per buyer (shared across every policy they own): {shared.map(f => f.label).join(' · ')}</p>
          {specific.length > 0 ? (
            <ul className="list-disc pl-4 text-neutral-dark">
              {specific.map(f => <li key={f.key}>{f.label}{f.help ? <span className="text-neutral-mid"> — {f.help}</span> : null}</li>)}
            </ul>
          ) : (
            <p className="text-neutral-mid">No policy-specific details beyond the shared set.</p>
          )}
        </div>
      )}
    </li>
  )
}

function Catalogue({ token }: { token: string }) {
  const [products, setProducts] = useState<PolicyProduct[] | null>(null)
  const [bundles, setBundles] = useState<PolicyProductBundle[]>([])
  const [seeding, setSeeding] = useState(false)
  const [error, setError] = useState('')

  const load = () =>
    createPlatformClient(token).policyGaps.catalogue()
      .then(r => { setProducts(r.products); setBundles(r.bundles) })
      .catch((e: Error) => setError(e.message))
  useEffect(() => { load() }, [token])

  async function seed() {
    setSeeding(true); setError('')
    try { await createPlatformClient(token).policyGaps.seedCatalogue(); await load() }
    catch (e: any) { setError(e.message) }
    finally { setSeeding(false) }
  }

  if (products === null) return error ? <p className="text-sm text-red-700">{error}</p> : null

  const COMPLETE = 'complete-library'
  const inBundle = (key: string) => products.filter(p => p.bundle_keys.includes(key))
  // Every product belongs to the Complete Library, so "individual" means no other bundle.
  const singlesOnly = products.filter(p => p.bundle_keys.filter(k => k !== COMPLETE).length === 0)
  const namedBundles = bundles.filter(b => b.key !== COMPLETE)
  const completeLibrary = bundles.find(b => b.key === COMPLETE)

  return (
    <div className="mt-8">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <Tag size={16} className="text-teal" />
          <h2 className="text-sm font-semibold text-neutral-dark">Catalogue: what the shop sells</h2>
        </div>
        <button onClick={seed} disabled={seeding}
          title="Upsert the catalogue from the seed file. Existing slugs update in place; nothing is deleted."
          className="inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-3 py-1.5 text-xs font-medium text-neutral-mid hover:bg-neutral-light hover:text-neutral-dark disabled:opacity-50">
          {seeding ? <Loader2 size={12} className="animate-spin" /> : <RefreshCw size={12} />}
          {products.length === 0 ? 'Seed the catalogue' : 'Re-seed from file'}
        </button>
      </div>

      {products.length === 0 ? (
        <p className="rounded-xl border border-dashed border-gray-200 bg-white px-5 py-8 text-center text-sm text-neutral-mid">
          The catalogue is empty. Seed it to load the agreed products, prices and intake fields.
        </p>
      ) : (
        <div className="space-y-5">
          {completeLibrary && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal/40 bg-teal-light/20 px-5 py-4">
              <div className="flex items-center gap-2">
                <Package size={16} className="text-teal" />
                <div>
                  <h3 className="text-sm font-semibold text-neutral-dark">{completeLibrary.title} <span className="font-normal text-neutral-mid">(all {products.length} policies)</span></h3>
                  <p className="text-xs text-neutral-mid">{completeLibrary.description}</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-base font-bold text-neutral-dark">{money(completeLibrary.price_pence)}</p>
                {completeLibrary.renewal_cap_pence != null && <p className="text-[11px] text-neutral-mid">updates from year 2: {money(completeLibrary.renewal_cap_pence)}/yr</p>}
              </div>
            </div>
          )}
          {namedBundles.map(b => (
            <div key={b.id} className="rounded-xl border border-gray-200 bg-white">
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-100 bg-teal-light/20 px-5 py-3">
                <div className="flex items-center gap-2">
                  <Package size={15} className="text-teal" />
                  <div>
                    <h3 className="text-sm font-semibold text-neutral-dark">{b.title} <span className="font-normal text-neutral-mid">({inBundle(b.key).length} policies)</span></h3>
                    <p className="text-xs text-neutral-mid">{b.description}</p>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-sm font-bold text-neutral-dark">{money(b.price_pence)}</p>
                  {b.renewal_cap_pence != null && <p className="text-[11px] text-neutral-mid">updates from year 2: {money(b.renewal_cap_pence)}/yr</p>}
                </div>
              </div>
              <ul className="divide-y divide-gray-50">{inBundle(b.key).map(p => <ProductRow key={p.id} p={p} />)}</ul>
            </div>
          ))}
          {singlesOnly.length > 0 && (
            <div className="rounded-xl border border-gray-200 bg-white">
              <div className="flex items-center gap-2 border-b border-gray-100 px-5 py-3">
                <ClipboardList size={15} className="text-neutral-mid" />
                <h3 className="text-sm font-semibold text-neutral-dark">Individual policies (not in a bundle)</h3>
              </div>
              <ul className="divide-y divide-gray-50">{singlesOnly.map(p => <ProductRow key={p.id} p={p} />)}</ul>
            </div>
          )}
          <p className="text-xs text-neutral-mid">
            Singles renew at £12/year from year 2; the bundle&rsquo;s renewal is capped as shown. Click a
            policy to see exactly which buyer details it needs before writing can start.
          </p>
        </div>
      )}
      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}
    </div>
  )
}

export default function PaidPoliciesPage() {
  const token = usePlatformAuth()
  return (
    <PlatformShell>
      <div className="mb-5">
        <h1 className="text-xl font-bold text-neutral-dark">Paid Policies</h1>
        <p className="mt-0.5 text-sm text-neutral-mid">
          The standalone policy shop&rsquo;s console: its order queue, and the catalogue of what we sell.
        </p>
      </div>
      <p className="mb-4 rounded-lg border border-blue-100 bg-blue-50 px-4 py-2.5 text-xs text-blue-900">
        <strong>This queue is standalone shop customers only</strong>: policies-only accounts with
        no full CareStream licence. Policies bought by full CareStream clients from their gaps
        page are on the <a href="/platform/policy-gaps" className="font-semibold underline">Policy Gaps</a> tab,
        next to the analysis that prompted the purchase.
      </p>
      {token && <PolicyOrders token={token} scope="standalone" />}
      {token && <Catalogue token={token} />}
    </PlatformShell>
  )
}
