'use client'

import { useEffect, useState } from 'react'
import { usePlatformAuth } from '@/hooks/use-platform-auth'
import { createPlatformClient } from '@/lib/platform-api'
import { PlatformShell } from '@/components/platform-shell'
import { AlertCircle, Loader2, ShoppingCart, CreditCard, GraduationCap, PoundSterling } from 'lucide-react'

// Public training-shop funnel: how often each course is added to the basket,
// how many checkouts are started, and what actually sells.

type Data = {
  modules: Array<{ module_slug: string; adds: number; adds_30d: number; add_qty: number; checkouts: number; purchased: number; revenue_pence: number }>
  totals: { adds: number; adds_30d: number; checkouts: number; purchased: number; revenue_pence: number }
}

const gbp = (p: number) => new Intl.NumberFormat('en-GB', { style: 'currency', currency: 'GBP', minimumFractionDigits: 0 }).format(p / 100)
const titleise = (slug: string) => slug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')

function Card({ label, value, sub, Icon }: { label: string; value: string; sub?: string; Icon: any }) {
  return (
    <div className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-center gap-2 text-xs font-medium uppercase tracking-wide text-neutral-mid"><Icon size={14} className="text-teal" /> {label}</div>
      <div className="mt-1 text-2xl font-bold text-neutral-dark">{value}</div>
      {sub && <div className="text-xs text-neutral-mid">{sub}</div>}
    </div>
  )
}

export default function BasketAnalyticsPage() {
  const token = usePlatformAuth()
  const [data, setData]     = useState<Data | null>(null)
  const [error, setError]   = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!token) return
    createPlatformClient(token).basketAnalytics()
      .then(setData)
      .catch((e: any) => setError(e.message ?? 'Could not load basket analytics.'))
      .finally(() => setLoading(false))
  }, [token])

  return (
    <PlatformShell>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-neutral-dark">Basket Analytics</h1>
        <p className="mt-1 text-sm text-neutral-mid">The public training shop funnel: added to basket → checkout started → licences sold. Add events are counted from the moment tracking went live.</p>
      </div>

      {loading && <div className="flex items-center gap-2 text-neutral-mid"><Loader2 size={16} className="animate-spin" /> Loading…</div>}
      {error && <p className="flex items-center gap-2 rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700"><AlertCircle size={15} /> {error}</p>}

      {data && (
        <>
          <div className="mb-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <Card label="Added to basket" value={String(data.totals.adds)} sub={`${data.totals.adds_30d} in the last 30 days`} Icon={ShoppingCart} />
            <Card label="Checkouts started" value={String(data.totals.checkouts)} Icon={CreditCard} />
            <Card label="Licences sold" value={String(data.totals.purchased)} Icon={GraduationCap} />
            <Card label="Revenue" value={gbp(data.totals.revenue_pence)} Icon={PoundSterling} />
          </div>

          <div className="overflow-x-auto rounded-xl border border-gray-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100 text-left text-xs uppercase tracking-wide text-neutral-mid">
                  <th className="px-4 py-3 font-medium">Course</th>
                  <th className="px-4 py-3 text-right font-medium">Adds (all)</th>
                  <th className="px-4 py-3 text-right font-medium">Adds (30d)</th>
                  <th className="px-4 py-3 text-right font-medium">Checkouts</th>
                  <th className="px-4 py-3 text-right font-medium">Licences sold</th>
                  <th className="px-4 py-3 text-right font-medium">Revenue</th>
                </tr>
              </thead>
              <tbody>
                {data.modules.map(m => (
                  <tr key={m.module_slug} className="border-b border-gray-50 last:border-0 hover:bg-gray-50/60">
                    <td className="px-4 py-2.5 font-medium text-neutral-dark">{titleise(m.module_slug)}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.adds}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.adds_30d}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{m.checkouts}</td>
                    <td className="px-4 py-2.5 text-right font-semibold tabular-nums">{m.purchased}</td>
                    <td className="px-4 py-2.5 text-right tabular-nums">{gbp(m.revenue_pence)}</td>
                  </tr>
                ))}
                {data.modules.length === 0 && (
                  <tr><td colSpan={6} className="px-4 py-6 text-center text-neutral-mid">No basket activity yet — events appear as soon as visitors add courses to the basket.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </>
      )}
    </PlatformShell>
  )
}
