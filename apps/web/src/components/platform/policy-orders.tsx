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
import { Loader2, Check, PenLine, AlertTriangle, FileText, X } from 'lucide-react'

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
  // The draft being read before approval. Nothing is delivered unread.
  const [reading, setReading] = useState<{ id: string; title: string; draft: string } | null>(null)
  const [error, setError] = useState('')

  const load = () =>
    createPlatformClient(token).policyGaps.orders()
      .then(r => setOrders(r.orders))
      .catch((e: Error) => setError(e.message))

  useEffect(() => { load() }, [token])

  async function write(o: PolicyOrder) {
    if (!window.confirm(
      `Write "${o.policy_title}" for ${o.tenant?.name ?? 'this client'}?\n\nThis spends Anthropic credit. Nothing reaches the client until you approve it.`
    )) return
    setBusy(o.id); setError('')
    try {
      await createPlatformClient(token).policyGaps.writeOrder(o.id)
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setBusy(null) }
  }

  async function read(o: PolicyOrder) {
    setBusy(o.id); setError('')
    try {
      const r = await createPlatformClient(token).policyGaps.orderDraft(o.id)
      if (!r.draft) { setError('Nothing has been written for that order yet.'); return }
      setReading({ id: o.id, title: r.title, draft: r.draft })
    } catch (e: any) { setError(e.message) }
    finally { setBusy(null) }
  }

  async function deliver(o: PolicyOrder) {
    if (!window.confirm(
      `Approve "${o.policy_title}" and put it in ${o.tenant?.name ?? 'the client'}'s policy library?\n\nThey will see it immediately.`
    )) return
    setBusy(o.id); setError('')
    try {
      await createPlatformClient(token).policyGaps.deliverOrder(o.id)
      setReading(null)
      await load()
    } catch (e: any) { setError(e.message) }
    finally { setBusy(null) }
  }


  if (!orders) {
    if (!error) return null
    return (
      <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-5 py-3 text-sm text-red-800">
        <AlertTriangle size={15} className="mt-0.5 shrink-0" />
        <span>Could not load the order queue: {error}. Clients may have paid for policies that are not shown here.</span>
      </div>
    )
  }

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
                {(o.status === 'paid' || o.status === 'drafting') && (
                  <button onClick={() => write(o)} disabled={busy === o.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-amber-300 bg-amber-50 px-2.5 py-1.5 text-xs font-medium text-amber-900 hover:bg-amber-100 disabled:opacity-40"
                    title="Writes the policy. Spends Anthropic credit. Nothing reaches the client until you approve it.">
                    {busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <PenLine size={12} />} Write
                  </button>
                )}
                {o.status === 'drafted' && (
                  <button onClick={() => read(o)} disabled={busy === o.id}
                    className="inline-flex items-center gap-1 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-neutral-dark hover:bg-neutral-light disabled:opacity-40">
                    {busy === o.id ? <Loader2 size={12} className="animate-spin" /> : <FileText size={12} />} Read it
                  </button>
                )}
              </span>
            </li>
          ))}
        </ul>
      )}

      {reading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={() => setReading(null)}>
          <div className="flex max-h-[85vh] w-full max-w-3xl flex-col rounded-xl bg-white shadow-xl" onClick={e => e.stopPropagation()}>
            <div className="flex items-center gap-3 border-b border-gray-100 px-5 py-3">
              <FileText size={16} className="text-teal" />
              <h3 className="flex-1 text-sm font-semibold text-neutral-dark">{reading.title}</h3>
              <button onClick={() => setReading(null)} className="text-neutral-mid hover:text-neutral-dark"><X size={16} /></button>
            </div>
            {/* Deliberately the raw markdown. This is the last read before a care home's name
                goes on it, and rendered prose hides things a plain read catches: a stray
                placeholder, a heading that never got filled in, a name that should not be there. */}
            <pre className="flex-1 overflow-auto whitespace-pre-wrap px-5 py-4 text-[13px] leading-relaxed text-neutral-dark">{reading.draft}</pre>
            <div className="flex items-center justify-between gap-3 border-t border-gray-100 px-5 py-3">
              <p className="text-xs text-neutral-mid">{reading.draft.split(/\s+/).length} words. Approving puts this in the client's library.</p>
              <button
                onClick={() => { const o = orders?.find(x => x.id === reading.id); if (o) deliver(o) }}
                disabled={busy === reading.id}
                className="inline-flex items-center gap-1.5 rounded-lg bg-teal px-4 py-2 text-xs font-semibold text-white hover:bg-teal/90 disabled:opacity-40">
                {busy === reading.id ? <Loader2 size={13} className="animate-spin" /> : <Check size={13} />} Approve and deliver
              </button>
            </div>
          </div>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 border-t border-gray-100 bg-red-50 px-5 py-2.5 text-sm text-red-800">
          <AlertTriangle size={14} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
