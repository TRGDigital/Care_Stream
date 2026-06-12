'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import { createApiClient } from '@/lib/api-client'
import { KeyRound, CheckCircle2, Circle, Loader2, UserPlus, X, ShoppingCart } from 'lucide-react'
import Link from 'next/link'

const gbp = (pence: number) => `£${(pence / 100).toFixed(2)}`
const fmtDate = (d?: string | null) => {
  if (!d) return '—'
  try { return new Date(d).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' }) } catch { return '—' }
}

type Licence = { id: string; module_slug: string; module_name: string; price_pence: number; currency: string; purchased_at: string; renewal_due_at: string; status: string; allocated_to: { id: string; name: string; email: string } | null }
type Staff = { id: string; name: string; email: string }

export default function LicencesPage() {
  const { data: session } = useSession()
  const api = session?.accessToken ? createApiClient(session.accessToken) : null
  const [licences, setLicences] = useState<Licence[]>([])
  const [staff, setStaff] = useState<Staff[]>([])
  const [summary, setSummary] = useState({ total: 0, allocated: 0, available: 0, spent_pence: 0 })
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState<string | null>(null)
  const [picking, setPicking] = useState<string | null>(null) // licence id being allocated

  function load() {
    if (!api) return
    setLoading(true)
    api.training.licences().then(d => { setLicences(d.licences); setStaff(d.staff); setSummary(d.summary) }).catch(() => {}).finally(() => setLoading(false))
  }
  useEffect(() => { load() }, [session?.accessToken]) // eslint-disable-line react-hooks/exhaustive-deps

  async function allocate(id: string, userId: string) {
    if (!api || busy) return
    setBusy(id)
    try { await api.training.allocateLicence(id, userId); setPicking(null); load() }
    catch (e: any) { alert(e?.message ?? 'Could not allocate.') } finally { setBusy(null) }
  }
  async function deallocate(id: string) {
    if (!api || busy) return
    if (!confirm('Return this licence to the pool? The staff member will no longer have this module assigned.')) return
    setBusy(id)
    try { await api.training.deallocateLicence(id); load() }
    catch (e: any) { alert(e?.message ?? 'Could not deallocate.') } finally { setBusy(null) }
  }

  // Group by module for display.
  const byModule = Object.values(
    licences.reduce((acc: Record<string, { name: string; slug: string; items: Licence[] }>, l) => {
      (acc[l.module_slug] ??= { name: l.module_name, slug: l.module_slug, items: [] }).items.push(l)
      return acc
    }, {}),
  )

  return (
    <div className="mx-auto max-w-content">
      <div className="mb-1 flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-neutral-dark">Training Licences</h1>
        <Link href="/staff-training" className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-3 py-1.5 text-xs font-semibold text-white hover:bg-blue-700">
          <ShoppingCart size={13} /> Buy more licences
        </Link>
      </div>
      <p className="mb-6 mt-1 max-w-3xl text-sm text-neutral-mid">
        Each licence is one staff member on one training module. Allocate a licence to a staff member to assign them the module in the hub. Add staff on the <Link href="/staff" className="font-semibold text-teal hover:underline">Staff</Link> page first.
      </p>

      {/* Summary */}
      <div className="mb-7 grid grid-cols-2 gap-3 sm:grid-cols-4">
        {[
          { label: 'Licences', value: summary.total },
          { label: 'Allocated', value: summary.allocated },
          { label: 'Available', value: summary.available },
          { label: 'Total spent', value: gbp(summary.spent_pence) },
        ].map(s => (
          <div key={s.label} className="rounded-xl border border-gray-100 bg-white p-4 shadow-card">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">{s.label}</p>
            <p className="mt-1 text-2xl font-extrabold text-neutral-dark">{s.value}</p>
          </div>
        ))}
      </div>

      {loading ? (
        <div className="space-y-3">{[1, 2].map(i => <div key={i} className="h-20 animate-pulse rounded-xl bg-gray-100" />)}</div>
      ) : licences.length === 0 ? (
        <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-6 py-12 text-center">
          <KeyRound size={28} className="mx-auto mb-3 text-gray-300" />
          <p className="text-sm font-medium text-neutral-dark">No licences yet</p>
          <p className="mx-auto mt-1 max-w-md text-xs text-neutral-mid">Buy training licences and they&apos;ll appear here to allocate to your staff.</p>
        </div>
      ) : (
        <div className="space-y-6">
          {byModule.map(group => (
            <div key={group.slug}>
              <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-neutral-mid">{group.name} <span className="text-neutral-mid/60">· {group.items.length}</span></h2>
              <div className="overflow-hidden rounded-xl border border-gray-200 bg-white">
                {group.items.map((l, i) => (
                  <div key={l.id} className={`flex flex-wrap items-center gap-3 px-4 py-3 ${i > 0 ? 'border-t border-gray-50' : ''}`}>
                    {l.allocated_to ? <CheckCircle2 size={16} className="shrink-0 text-green-500" /> : <Circle size={16} className="shrink-0 text-gray-300" />}
                    <div className="min-w-0 flex-1">
                      {l.allocated_to ? (
                        <p className="text-sm font-medium text-neutral-dark">{l.allocated_to.name} <span className="font-normal text-neutral-mid">· {l.allocated_to.email}</span></p>
                      ) : (
                        <p className="text-sm font-medium text-neutral-mid">Available to allocate</p>
                      )}
                      <p className="mt-0.5 text-[11px] text-gray-400">Purchased {fmtDate(l.purchased_at)} · Renews {fmtDate(l.renewal_due_at)}</p>
                    </div>
                    {l.allocated_to ? (
                      <button onClick={() => deallocate(l.id)} disabled={busy === l.id} className="flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-mid hover:border-red-300 hover:text-red-600 disabled:opacity-50">
                        {busy === l.id ? <Loader2 size={13} className="animate-spin" /> : <X size={13} />} Unassign
                      </button>
                    ) : picking === l.id ? (
                      <select
                        autoFocus
                        defaultValue=""
                        onChange={(e) => e.target.value && allocate(l.id, e.target.value)}
                        className="rounded-lg border border-gray-200 px-2 py-1.5 text-xs"
                      >
                        <option value="" disabled>Choose staff…</option>
                        {staff.map(s => <option key={s.id} value={s.id}>{s.name} ({s.email})</option>)}
                      </select>
                    ) : (
                      <button
                        onClick={() => (staff.length ? setPicking(l.id) : alert('Add staff on the Staff page first.'))}
                        disabled={busy === l.id}
                        className="flex items-center gap-1 rounded-lg bg-teal px-3 py-1.5 text-xs font-semibold text-white hover:bg-teal-dark disabled:opacity-50"
                      >
                        <UserPlus size={13} /> Allocate
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
