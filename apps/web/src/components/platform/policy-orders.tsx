'use client'

// The queue of policies clients have paid for.
//
// A client pays and from that moment we owe them a document. This is the list of those debts
// and how far each has got, so nothing quietly sits unwritten after someone has been charged.
//
// Approval is a person's decision, never automatic. Pressing Approve is what puts the policy
// in front of the care home, so it records who did it and when. If a document carrying a
// home's name turns out to be wrong, that answer needs to exist.

import { useEffect, useState } from 'react'
import { createPlatformClient, type PolicyOrder } from '@/lib/platform-api'
import { Loader2, Check, Clock, PenLine, AlertTriangle } from 'lucide-react'

const money = (p: number) => `£${(p / 100).toFixed(p % 100 === 0 ? 0 : 2)}`
const when = (iso: string) => new Date(iso).toLocaleDateString('en-GB')

const STATUS: Record<PolicyOrder['status'], { label: string; cls: string }> = {
  paid:     { label: 'Paid, not started', cls: 'bg-red-50 text-red-700' },
  drafting: { label: 'Being written',     cls: 'bg-amber-50 text-amber-800' },
  drafted:  { label: 'Needs our read',    cls: 'bg-indigo-50 text-indigo-700' },
  approved: { label: 'Delivered',         cls: 'bg-green-50 text-green-700' },
  refunded: { label: 'Refunded',          cls: 'bg-neutral-light text-neutral-mid' },
}

export function PolicyOrders({ token }: { token: string }) {
  const [orders, setOrders] = useState<PolicyOrder[] | null>(null)
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const load = () =>
    createPlatformClient(token).policyGaps.orders()
      .then(r => setOrders(r.orders))
      .catch((e: Error) => setError(e.message))

  useEffect(() => { load() }, [token])

  async function move(o: PolicyOrder, status: string) {
    // Approving is the step a client feels, so it asks first.
    if (status === 'approved' &&
        !window.confirm(`Approve "${o.policy_title}" for ${o.tenant?.name ?? 'this client'}?\n\nThis puts the policy in front of them.`)) return
    setBusy(o.id); setError('')
    try {
      await createPlatformClient(token).policyGaps.setOrderStatus(o.id, status)
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setBusy(null) }
  }

  if (!orders) return null

  const owed = orders.filter(o => o.status !== 'approved' && o.status !== 'refunded')

  return (
    <div className="mb-5 rounded-xl border border-gray-200 bg-white">
      <div className="flex flex-wrap items-baseline justify-between gap-2 border-b border-gray-100 px-5 py-3">
        <h2 className="text-sm font-semibold text-neutral-dark">
          Policies clients have paid for
          {owed.length > 0 && <span className="ml-1.5 font-normal text-red-600">({owed.length} owed)</span>}
        </h2>
        <p className="text-xs text-neutral-mid">
          {orders.length === 0 ? 'Nothing ordered yet.' : `${orders.length} order${orders.length === 1 ? '' : 's'}`}
        </p>
      </div>

      {orders.length === 0 ? (
        <p className="px-5 py-6 text-sm text-neutral-mid">
          When a client orders a policy from their gaps page it appears here, and stays until
          somebody has written it and approved it.
        </p>
      ) : (
        <ul className="divide-y divide-gray-100">
          {orders.map(o => (
            <li key={o.id} className="flex flex-wrap items-center gap-3 px-5 py-3">
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-medium text-neutral-dark">{o.policy_title}</span>
                <span className="block text-xs text-neutral-mid">
                  {o.tenant ? `${o.tenant.account_number} · ${o.tenant.name}` : o.tenant_id}
                  {' · '}{money(o.price_pence)}{' · '}ordered {when(o.purchased_at)}
                  {o.approved_by ? ` · approved by ${o.approved_by}` : ''}
                </span>
              </span>
              <span className={`shrink-0 rounded-full px-2.5 py-1 text-[11px] font-semibold ${STATUS[o.status].cls}`}>
                {STATUS[o.status].label}
              </span>
              <span className="flex shrink-0 gap-1.5">
                {o.status === 'paid' && (
                  <button onClick={() => move(o, 'drafting')} disabled={busy === o.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-40">
                    {busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <PenLine size={12} />} Start
                  </button>
                )}
                {o.status === 'drafting' && (
                  <button onClick={() => move(o, 'drafted')} disabled={busy === o.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-40">
                    {busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <Clock size={12} />} Mark written
                  </button>
                )}
                {o.status === 'drafted' && (
                  <button onClick={() => move(o, 'approved')} disabled={busy === o.id}
                    className="inline-flex items-center gap-1 rounded-lg bg-teal px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-40">
                    {busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <Check size={12} />} Approve
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {error && (
        <p className="flex items-start gap-2 border-t border-gray-100 bg-red-50 px-5 py-2.5 text-sm text-red-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
