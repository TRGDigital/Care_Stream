'use client'

// "CareStream has read your policies and you are missing these."
//
// Sits below the four analysis sections, and it is a different kind of thing from all of
// them. Those list work a home can do itself by editing what it already has. This lists
// regulations with no policy behind them at all, which cannot be fixed by editing, because
// there is nothing to edit. That is the honest reason it is a purchase rather than a task.
//
// Deliberately quiet when there is nothing to say. It renders nothing at all when the
// analysis has never run, when it is stale, or when nothing is missing. A home that has
// everything should never see a sales banner, and a home whose analysis we do not trust
// should certainly not be sold anything on the strength of it.

import { useEffect, useState } from 'react'
import { createApiClient, type MissingPolicyReport, type PolicyPurchase } from '@/lib/api-client'
import { AlertTriangle, Loader2, ShoppingCart, Check, Clock, ChevronDown } from 'lucide-react'

const money = (pence: number) => `£${(pence / 100).toFixed(pence % 100 === 0 ? 0 : 2)}`

// The count, shared by the alert at the top of the page and the banner further down. Both
// need the same answer and it is the same free read, so it is fetched once per component
// rather than twice per page.
export function useMissingCount(token: string): number | null {
  const [count, setCount] = useState<number | null>(null)
  useEffect(() => {
    const api = createApiClient(token)
    Promise.all([api.gaps.missingPolicies(), api.policyPurchases.list()])
      .then(([r, p]) => {
        if (!r.analysed || r.stale) { setCount(null); return }
        const bought = new Set(p.purchases.map(x => x.policy_title))
        setCount(r.missing.filter(m => !bought.has(m.title)).length)
      })
      .catch(() => setCount(null))
  }, [token])
  return count
}

// A line at the top of the page, because the banner that sells these sits below four analysis
// sections and a home working through their gaps may never scroll that far. This does not
// repeat the offer, it just says the policies exist and takes them to it.
export function MissingPoliciesAlert({ token }: { token: string }) {
  const count = useMissingCount(token)
  if (!count) return null
  return (
    <button
      onClick={() => document.getElementById('missing-policies')?.scrollIntoView({ behavior: 'smooth', block: 'start' })}
      className="mb-5 flex w-full items-center gap-3 rounded-card border-2 border-teal/40 bg-teal-light/25 px-5 py-3.5 text-left hover:bg-teal-light/40"
    >
      <AlertTriangle size={18} className="shrink-0 text-teal" />
      <span className="min-w-0 flex-1">
        <span className="block text-sm font-bold text-neutral-dark">
          {count === 1
            ? 'There is one policy the law requires that you do not have'
            : `There are ${count} policies the law requires that you do not have`}
        </span>
        <span className="block text-xs text-neutral-mid">
          These are not gaps to fill in your existing policies. There is no document at all. Show me
        </span>
      </span>
      <ChevronDown size={16} className="shrink-0 text-teal" />
    </button>
  )
}

export function MissingPoliciesBanner({ token }: { token: string }) {
  const [report, setReport] = useState<MissingPolicyReport | null>(null)
  const [purchases, setPurchases] = useState<PolicyPurchase[]>([])
  const [pricePence, setPricePence] = useState(12000)
  const [chosen, setChosen] = useState<Set<string>>(new Set())
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const api = createApiClient(token)
    Promise.all([api.gaps.missingPolicies(), api.policyPurchases.list()])
      .then(([r, p]) => {
        setReport(r)
        setPurchases(p.purchases)
        setPricePence(p.price_pence)
      })
      .catch(() => { /* the banner simply does not appear; it is never the main event */ })
  }, [token])

  // Reconcile on return from Stripe. The redirect is not evidence of payment, so the server
  // asks Stripe directly; this only tells it which session to check.
  useEffect(() => {
    const url = new URL(window.location.href)
    const session = url.searchParams.get('policy_purchase')
    if (!session || session === 'cancelled') return
    setBusy(true)
    createApiClient(token).policyPurchases.reconcile(session)
      .then(r => setPurchases(r.purchases))
      .catch((e: Error) => setError(e.message))
      .finally(() => {
        setBusy(false)
        url.searchParams.delete('policy_purchase')
        window.history.replaceState({}, '', url.toString())
      })
  }, [token])

  if (!report || !report.analysed || report.stale) return null

  const bought = new Map(purchases.map(p => [p.policy_title, p]))
  const toBuy = report.missing.filter(m => !bought.has(m.title))
  if (toBuy.length === 0 && purchases.length === 0) return null

  const toggle = (title: string) =>
    setChosen(prev => {
      const next = new Set(prev)
      if (next.has(title)) next.delete(title); else next.add(title)
      return next
    })

  async function buy() {
    if (!chosen.size) return
    setBusy(true); setError('')
    try {
      const { url } = await createApiClient(token).policyPurchases.checkout([...chosen])
      window.location.href = url
    } catch (e: any) {
      setError(e?.message ?? 'Could not start checkout')
      setBusy(false)
    }
  }

  const statusLabel = (p: PolicyPurchase) =>
    p.status === 'approved' ? 'Ready in your policies'
      : p.status === 'drafted' ? 'Written, with us for final checks'
        : p.status === 'drafting' ? 'Being written'
          : 'Paid, we have started'

  return (
    <div id="missing-policies" className="mb-6 scroll-mt-4 overflow-hidden rounded-card border-2 border-teal/40 bg-white shadow-card">
      <div className="border-b border-gray-100 bg-teal-light/25 px-6 py-5">
        <h2 className="text-base font-bold text-neutral-dark">
          We have read your policies against the law, and you are missing{' '}
          {toBuy.length === 1 ? 'one policy' : `${toBuy.length} policies`}
        </h2>
        <p className="mt-1 text-sm text-neutral-mid">
          Every regulation below applies to your service and has no policy behind it at all.
          This is not wording to improve, it is a document you do not have. We will write each
          one for your home, using your name and your named leads, and check it before it
          reaches you.
        </p>
      </div>

      {toBuy.length > 0 && (
        <div className="divide-y divide-gray-100">
          {toBuy.map(m => (
            <label key={m.title} className="flex cursor-pointer items-start gap-3 px-6 py-3.5 hover:bg-neutral-light/40">
              <input
                type="checkbox"
                checked={chosen.has(m.title)}
                onChange={() => toggle(m.title)}
                className="mt-1 h-4 w-4 shrink-0 accent-teal"
              />
              <span className="min-w-0 flex-1">
                <span className="block text-sm font-semibold text-neutral-dark">{m.title}</span>
                {/* Naming the regulations is the answer to "why do I need this?", and it is
                    the only honest justification for the price. */}
                <span className="mt-0.5 block text-xs text-neutral-mid">
                  Required by {m.regulations.map(r => r.official_name).join(' · ')}
                </span>
              </span>
              <span className="shrink-0 text-sm font-semibold text-neutral-dark">{money(pricePence)}</span>
            </label>
          ))}
        </div>
      )}

      {purchases.length > 0 && (
        <div className="border-t border-gray-100 bg-neutral-light/30 px-6 py-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-mid">Policies you have ordered</p>
          <ul className="mt-2 space-y-1.5">
            {purchases.map(p => (
              <li key={p.id} className="flex items-center gap-2 text-sm text-neutral-dark">
                {p.status === 'approved'
                  ? <Check size={14} className="shrink-0 text-green-600" />
                  : <Clock size={14} className="shrink-0 text-amber-600" />}
                <span className="font-medium">{p.policy_title}</span>
                <span className="text-xs text-neutral-mid">{statusLabel(p)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {toBuy.length > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-gray-100 px-6 py-4">
          <p className="text-sm text-neutral-mid">
            {chosen.size === 0
              ? `${money(pricePence)} per policy`
              : `${chosen.size} selected · ${money(pricePence * chosen.size)}`}
          </p>
          <button
            onClick={buy}
            disabled={busy || chosen.size === 0}
            className="inline-flex items-center gap-2 rounded-btn bg-teal px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal/90 disabled:opacity-40"
          >
            {busy ? <Loader2 size={15} className="animate-spin" /> : <ShoppingCart size={15} />}
            {busy ? 'One moment…' : chosen.size > 1 ? `Order ${chosen.size} policies` : 'Order this policy'}
          </button>
        </div>
      )}

      {error && (
        <p className="flex items-start gap-2 border-t border-gray-100 bg-red-50 px-6 py-3 text-sm text-red-800">
          <AlertTriangle size={15} className="mt-0.5 shrink-0" /> {error}
        </p>
      )}
    </div>
  )
}
